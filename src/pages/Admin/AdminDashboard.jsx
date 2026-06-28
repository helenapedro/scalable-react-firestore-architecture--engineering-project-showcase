import React, { useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { deleteDoc, deleteField, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import useData from "../../Hooks/useData";
import db from "../../config/firebase";
import { getLanguageFromPath } from "../../i18n/routes";
import { getLocalizedValue } from "../../i18n/localizedValue";
import { createCacheKey, invalidateCache } from "../../utils/cacheStore";
import mainStyles from "../../components/Main.module.css";
import styles from "./AdminDashboard.module.css";
import { useAdminAuth } from "./useAdminAuth";

const hasCoordinates = (project) => {
  const coordinates = project.location?.coordinates || project.coordinates || project.geo;
  if (!coordinates || typeof coordinates !== "object") return false;
  const lat = coordinates.lat ?? coordinates.latitude;
  const lng = coordinates.lng ?? coordinates.lon ?? coordinates.longitude;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
};

const hasModelAsset = (project) =>
  Boolean(project.modelAsset?.url || project.media?.model?.url || project.modelAssets?.[0]?.url);

const valueForLanguage = (value, lang) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value[lang] || value.en || value.pt || "";
  return "";
};

const localizedPair = (en, pt) => ({
  en: en.trim(),
  pt: pt.trim() || en.trim(),
});

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const serializeImageRef = (imageRef) => {
  if (!imageRef) return "";
  if (typeof imageRef === "string") return imageRef;
  if (typeof imageRef === "object") return JSON.stringify(imageRef);
  return String(imageRef);
};

const parseImageRefLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("{")) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : trimmed;
  } catch (error) {
    return trimmed;
  }
};

const parseImageRefs = (value) =>
  value
    .split(/\r?\n/)
    .map(parseImageRefLine)
    .filter(Boolean);

const serializeActivity = (activity) => {
  if (!activity) return "";
  if (typeof activity === "string") return activity;
  if (typeof activity === "object") return JSON.stringify(activity);
  return String(activity);
};

const parseActivityLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("{")) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : trimmed;
  } catch (error) {
    return trimmed;
  }
};

const parseActivities = (value) =>
  value
    .split(/\r?\n/)
    .map(parseActivityLine)
    .filter(Boolean);

const s3UploadEndpoint = process.env.REACT_APP_S3_UPLOAD_ENDPOINT || "";

const requestPresignedUploads = async ({ user, projectId, files }) => {
  if (!s3UploadEndpoint) {
    throw new Error("Missing REACT_APP_S3_UPLOAD_ENDPOINT.");
  }

  const token = await user.getIdToken();
  const response = await fetch(s3UploadEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      projectId,
      files: files.map((file) => ({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`S3 upload signing failed (${response.status}).`);
  }

  const payload = await response.json();
  return Array.isArray(payload.uploads) ? payload.uploads : [payload];
};

const uploadFileWithSignedRequest = async (file, signedUpload) => {
  if (signedUpload.fields) {
    const formData = new FormData();
    Object.entries(signedUpload.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    const response = await fetch(signedUpload.url || signedUpload.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error(`S3 POST upload failed for ${file.name}.`);
    return signedUpload.publicUrl || signedUpload.fileUrl || signedUpload.url;
  }

  const response = await fetch(signedUpload.uploadUrl || signedUpload.url, {
    method: signedUpload.method || "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) throw new Error(`S3 PUT upload failed for ${file.name}.`);
  return signedUpload.publicUrl || signedUpload.fileUrl || signedUpload.key || signedUpload.url;
};

const makeEditForm = (project) => {
  const location = project.location && typeof project.location === "object" ? project.location : null;
  const locationValue = location?.label || location?.name || project.location;
  const coordinates = project.location?.coordinates || project.coordinates || project.geo || {};
  const modelAsset = project.modelAsset || project.media?.model || project.modelAssets?.[0] || {};
  const activities =
    Array.isArray(project.activities) && project.activities.length > 0
      ? project.activities
      : [
          ...(Array.isArray(project.responsibilities) ? project.responsibilities : []),
          ...(Array.isArray(project.results) ? project.results : []),
        ];
  const imageRefs =
    Array.isArray(project.media?.images) && project.media.images.length > 0
      ? project.media.images
      : project.imageRefs || [];

  return {
    projectId: project.id || project.slug || "",
    titleEn: valueForLanguage(project.title, "en"),
    titlePt: valueForLanguage(project.title, "pt"),
    organizationEn: valueForLanguage(project.organization, "en"),
    organizationPt: valueForLanguage(project.organization, "pt"),
    locationEn: valueForLanguage(locationValue, "en"),
    locationPt: valueForLanguage(locationValue, "pt"),
    contextEn: valueForLanguage(project.context || project.description, "en"),
    contextPt: valueForLanguage(project.context || project.description, "pt"),
    activities: activities.map(serializeActivity).filter(Boolean).join("\n"),
    outcomeEn: valueForLanguage(project.projectOutcome || project.finalDescription, "en"),
    outcomePt: valueForLanguage(project.projectOutcome || project.finalDescription, "pt"),
    latitude: String(coordinates.lat ?? coordinates.latitude ?? ""),
    longitude: String(coordinates.lng ?? coordinates.lon ?? coordinates.longitude ?? ""),
    imageRefs: Array.isArray(imageRefs) ? imageRefs.map(serializeImageRef).filter(Boolean).join("\n") : "",
    modelUrl: modelAsset.url || "",
    modelTitle: modelAsset.title || "",
    modelFormat: modelAsset.format || "",
    modelSize: modelAsset.sizeLabel || "",
    modelSource: modelAsset.source || "",
    modelPreview: modelAsset.previewImage || "",
    isVisible: project.isVisible !== false,
  };
};

const makeCreateForm = () => ({
  projectId: "",
  titleEn: "",
  titlePt: "",
  organizationEn: "",
  organizationPt: "",
  locationEn: "",
  locationPt: "",
  contextEn: "",
  contextPt: "",
  activities: "",
  outcomeEn: "",
  outcomePt: "",
  latitude: "",
  longitude: "",
  imageRefs: "",
  modelUrl: "",
  modelTitle: "",
  modelFormat: "",
  modelSize: "",
  modelSource: "",
  modelPreview: "",
  isVisible: false,
});

const getProjectLocationLabel = (project, language) => {
  const location = project.location;
  if (!location || typeof location === "string") return getLocalizedValue(location, language);
  if (typeof location !== "object") return "";

  const directLabel = getLocalizedValue(location.label || location.name, language);
  if (directLabel) return directLabel;

  return [location.municipality, location.province, location.country]
    .map((value) => getLocalizedValue(value, language))
    .filter(Boolean)
    .join(", ");
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const language = getLanguageFromPath(window.location.pathname);
  const { user, loading: authLoading, authError, isAllowedAdmin, signIn, signOutAdmin } = useAdminAuth();
  const { data, loading: projectsLoading, error: projectsError } = useData("projects");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [formMode, setFormMode] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [localUpdates, setLocalUpdates] = useState({});
  const [localDeletes, setLocalDeletes] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const projects = useMemo(() => {
    const records = Array.isArray(data) ? data : [];
    const recordIds = new Set(records.map((project) => project.id));
    const locallyCreated = Object.entries(localUpdates)
      .filter(([id]) => !recordIds.has(id) && !localDeletes[id])
      .map(([id, project]) => ({ id, ...project }));

    const combinedRecords = [...records, ...locallyCreated];

    return combinedRecords
      .filter((project) => !localDeletes[project.id])
      .map((project) => ({ ...project, ...(localUpdates[project.id] || {}) }))
      .map((project) => {
        const locationText = getProjectLocationLabel(project, language);
        return {
          ...project,
          localizedTitle: getLocalizedValue(project.title, language),
          localizedLocation: locationText,
          hasCoordinates: hasCoordinates(project),
          hasModelAsset: hasModelAsset(project),
        };
      })
      .sort((a, b) => String(a.localizedTitle).localeCompare(String(b.localizedTitle)));
  }, [data, language, localUpdates, localDeletes]);

  const visibleCount = projects.filter((project) => project.isVisible !== false).length;
  const gpsCount = projects.filter((project) => project.hasCoordinates).length;
  const modelCount = projects.filter((project) => project.hasModelAsset).length;

  const handleSubmit = (event) => {
    event.preventDefault();
    signIn(email, password);
  };

  const startEditing = (project) => {
    setEditingProject(project);
    setEditForm(makeEditForm(project));
    setFormMode("edit");
    setSaveError(null);
    setSaveMessage("");
  };

  const startCreating = () => {
    setEditingProject({ id: "", media: {} });
    setEditForm(makeCreateForm());
    setFormMode("create");
    setSaveError(null);
    setSaveMessage("");
    setUploadError(null);
    setSelectedFiles([]);
  };

  const updateForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditForm(null);
    setSaveError(null);
    setUploadError(null);
    setSelectedFiles([]);
  };

  const uploadSelectedImages = async () => {
    if (!editingProject || !user || !selectedFiles.length) return;

    setUploading(true);
    setUploadError(null);
    setSaveMessage("");

    try {
      const files = Array.from(selectedFiles);
      const signedUploads = await requestPresignedUploads({
        user,
        projectId: editingProject.id || slugify(editForm.projectId || editForm.titleEn),
        files,
      });

      const uploadedUrls = [];
      for (let index = 0; index < files.length; index += 1) {
        const url = await uploadFileWithSignedRequest(files[index], signedUploads[index] || signedUploads[0]);
        if (url) uploadedUrls.push(url);
      }

      const existingRefs = parseImageRefs(editForm.imageRefs);
      updateForm("imageRefs", [...existingRefs, ...uploadedUrls].map(serializeImageRef).filter(Boolean).join("\n"));
      setSelectedFiles([]);
      setSaveMessage(t("admin.uploadComplete", { count: uploadedUrls.length }));
    } catch (error) {
      setUploadError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setUploading(false);
    }
  };

  const saveProject = async (event) => {
    event.preventDefault();
    if (!editingProject || !editForm) return;

    const lat = Number(editForm.latitude);
    const lng = Number(editForm.longitude);
    const hasValidCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    const activities = parseActivities(editForm.activities);
    const imageRefs = parseImageRefs(editForm.imageRefs);
    const modelAsset = editForm.modelUrl.trim()
      ? {
          url: editForm.modelUrl.trim(),
          title: editForm.modelTitle.trim(),
          format: editForm.modelFormat.trim(),
          sizeLabel: editForm.modelSize.trim(),
          source: editForm.modelSource.trim(),
          previewImage: editForm.modelPreview.trim(),
        }
      : null;

    const payload = {
      slug: formMode === "create" ? slugify(editForm.projectId || editForm.titleEn) : editingProject.slug || editingProject.id,
      title: localizedPair(editForm.titleEn, editForm.titlePt),
      organization: localizedPair(editForm.organizationEn, editForm.organizationPt),
      location: localizedPair(editForm.locationEn, editForm.locationPt),
      context: localizedPair(editForm.contextEn, editForm.contextPt),
      activities,
      projectOutcome: localizedPair(editForm.outcomeEn, editForm.outcomePt),
      coordinates: hasValidCoordinates ? { lat, lng } : null,
      media: {
        ...(editingProject.media || {}),
        images: imageRefs,
        mainImage: editingProject.media?.mainImage || imageRefs[0] || null,
        model: modelAsset,
      },
      modelAsset,
      isVisible: Boolean(editForm.isVisible),
      updatedAt: serverTimestamp(),
    };

    const writePayload =
      formMode === "create"
        ? payload
        : {
            ...payload,
            imageRefs: deleteField(),
            responsibilities: deleteField(),
            results: deleteField(),
          };

    if (formMode === "create") {
      writePayload.createdAt = serverTimestamp();
    }

    setSaving(true);
    setSaveError(null);
    setSaveMessage("");

    try {
      const projectId = formMode === "create"
        ? slugify(editForm.projectId || editForm.titleEn)
        : editingProject.id;

      if (!projectId) {
        throw new Error("Project ID is required.");
      }

      if (formMode === "create") {
        await setDoc(doc(db, "projects", projectId), writePayload);
      } else {
        await updateDoc(doc(db, "projects", projectId), writePayload);
      }

      invalidateCache(createCacheKey("collection", "projects"));
      invalidateCache(createCacheKey("doc", `projects/${projectId}`));
      setLocalUpdates((current) => ({
        ...current,
        [projectId]: {
          id: projectId,
          ...payload,
          updatedAt: new Date().toISOString(),
        },
      }));
      setSaveMessage(t(formMode === "create" ? "admin.created" : "admin.saved"));
      setEditingProject(null);
      setEditForm(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (project) => {
    const confirmation = window.prompt(`${t("admin.deleteProject")}: ${project.localizedTitle}\n${t("admin.deleteConfirm")}`);
    if (confirmation !== "DELETE") return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage("");

    try {
      await deleteDoc(doc(db, "projects", project.id));
      invalidateCache(createCacheKey("collection", "projects"));
      invalidateCache(createCacheKey("doc", `projects/${project.id}`));
      setLocalDeletes((current) => ({ ...current, [project.id]: true }));
      setLocalUpdates((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      if (editingProject?.id === project.id) cancelEditing();
      setSaveMessage(t("admin.deleted"));
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <p>{t("common.loading")}</p>;

  return (
    <section className={`${mainStyles.panel} ${styles.panel}`} aria-labelledby="admin-title">
      <header className={styles.header}>
        <div>
          <h1 id="admin-title" className={styles.title}>{t("admin.title")}</h1>
          <p className={styles.subtitle}>{t("admin.subtitle")}</p>
        </div>
        {user && (
          <Button variant="secondary" className={styles.signOut} onClick={signOutAdmin}>
            {t("admin.signOut")}
          </Button>
        )}
      </header>

      {!user && (
        <form className={styles.loginCard} onSubmit={handleSubmit}>
          <h2>{t("admin.signInTitle")}</h2>
          <label className={styles.field}>
            <span>{t("admin.email")}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>{t("admin.password")}</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {authError && <p className={styles.error}>{authError.message}</p>}
          <Button type="submit" variant="primary">{t("admin.signIn")}</Button>
          <p className={styles.note}>{t("admin.authNote")}</p>
        </form>
      )}

      {user && !isAllowedAdmin && (
        <div className={styles.loginCard}>
          <p className={styles.error}>{t("admin.restricted")}</p>
          <p className={styles.note}>{t("admin.authNote")}</p>
        </div>
      )}

      {user && isAllowedAdmin && (
        <>
          <p className={styles.note}>{t("admin.readOnly")}</p>
          {saveMessage && <p className={styles.success}>{saveMessage}</p>}
          {projectsLoading && <p>{t("common.loading")}</p>}
          {projectsError && <p className={styles.error}>{t("common.error")}: {projectsError.message}</p>}
          {!projectsLoading && !projectsError && (
            <>
              <div className={styles.metrics}>
                <span className={styles.metric}>{t("admin.totalProjects", { count: projects.length })}</span>
                <span className={styles.metric}>{t("admin.visibleProjects", { count: visibleCount })}</span>
                <span className={styles.metric}>{t("admin.gpsReady", { count: gpsCount })}</span>
                <span className={styles.metric}>{t("admin.modelReady", { count: modelCount })}</span>
              </div>

              <div className={styles.toolbar}>
                <Button type="button" variant="primary" onClick={startCreating}>
                  {t("admin.create")}
                </Button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption>{t("admin.dashboard")}</caption>
                  <thead>
                    <tr>
                      <th>{t("admin.tableProject")}</th>
                      <th>{t("admin.tableLocation")}</th>
                      <th>{t("admin.tableGps")}</th>
                      <th>{t("admin.tableModel")}</th>
                      <th>{t("admin.tableStatus")}</th>
                      <th>{t("admin.tableActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.localizedTitle}</strong>
                          <span className={styles.projectId}>{project.id}</span>
                        </td>
                        <td>{project.localizedLocation || t("map.unknownLocation")}</td>
                        <td>
                          <span className={project.hasCoordinates ? styles.statusReady : styles.statusPending}>
                            {project.hasCoordinates ? t("admin.ready") : t("admin.pending")}
                          </span>
                        </td>
                        <td>
                          <span className={project.hasModelAsset ? styles.statusReady : styles.statusPending}>
                            {project.hasModelAsset ? t("admin.ready") : t("admin.pending")}
                          </span>
                        </td>
                        <td>
                          <span className={project.isVisible !== false ? styles.statusVisible : styles.statusHidden}>
                            {project.isVisible !== false ? t("admin.visible") : t("admin.hidden")}
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Button size="sm" variant="outline-primary" onClick={() => startEditing(project)}>
                              {t("admin.edit")}
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => deleteProject(project)} disabled={saving}>
                              {t("admin.delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editingProject && editForm && (
                <form className={styles.editPanel} onSubmit={saveProject}>
                  <div className={styles.editHeader}>
                    <div>
                      <h2>{t(formMode === "create" ? "admin.createProject" : "admin.editProject")}</h2>
                      <span>{formMode === "create" ? editForm.projectId || t("admin.projectId") : editingProject.id}</span>
                    </div>
                    <Button type="button" variant="secondary" onClick={cancelEditing}>
                      {t("admin.cancel")}
                    </Button>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.projectId")}</span>
                      <input
                        value={editForm.projectId}
                        onChange={(event) => updateForm("projectId", slugify(event.target.value))}
                        disabled={formMode !== "create"}
                        required={formMode === "create"}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.titleEn")}</span>
                      <input value={editForm.titleEn} onChange={(event) => updateForm("titleEn", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.titlePt")}</span>
                      <input value={editForm.titlePt} onChange={(event) => updateForm("titlePt", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.organizationEn")}</span>
                      <input value={editForm.organizationEn} onChange={(event) => updateForm("organizationEn", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.organizationPt")}</span>
                      <input value={editForm.organizationPt} onChange={(event) => updateForm("organizationPt", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.locationEn")}</span>
                      <input value={editForm.locationEn} onChange={(event) => updateForm("locationEn", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.locationPt")}</span>
                      <input value={editForm.locationPt} onChange={(event) => updateForm("locationPt", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.latitude")}</span>
                      <input value={editForm.latitude} onChange={(event) => updateForm("latitude", event.target.value)} inputMode="decimal" />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.longitude")}</span>
                      <input value={editForm.longitude} onChange={(event) => updateForm("longitude", event.target.value)} inputMode="decimal" />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.projectOverviewEn")}</span>
                      <textarea value={editForm.contextEn} onChange={(event) => updateForm("contextEn", event.target.value)} rows={4} />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.projectOverviewPt")}</span>
                      <textarea value={editForm.contextPt} onChange={(event) => updateForm("contextPt", event.target.value)} rows={4} />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.technicalScope")}</span>
                      <textarea value={editForm.activities} onChange={(event) => updateForm("activities", event.target.value)} rows={6} />
                      <small>{t("admin.technicalScopeHelp")}</small>
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.roleOutcomeEn")}</span>
                      <textarea value={editForm.outcomeEn} onChange={(event) => updateForm("outcomeEn", event.target.value)} rows={4} />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.roleOutcomePt")}</span>
                      <textarea value={editForm.outcomePt} onChange={(event) => updateForm("outcomePt", event.target.value)} rows={4} />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>{t("admin.projectGallery")}</span>
                      <textarea value={editForm.imageRefs} onChange={(event) => updateForm("imageRefs", event.target.value)} rows={5} />
                      <small>{t("admin.imageRefsHelp")}</small>
                    </label>
                    <div className={`${styles.uploadPanel} ${styles.fullWidth}`}>
                      <div>
                        <strong>{t("admin.s3Upload")}</strong>
                        <p>{s3UploadEndpoint ? t("admin.s3UploadHelp") : t("admin.s3EndpointMissing")}</p>
                      </div>
                      <label className={styles.filePicker}>
                        <span>{t("admin.chooseImages")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                          disabled={!s3UploadEndpoint || uploading}
                        />
                      </label>
                      {selectedFiles.length > 0 && (
                        <span className={styles.fileCount}>{selectedFiles.length} selected</span>
                      )}
                      <Button
                        type="button"
                        variant="outline-primary"
                        onClick={uploadSelectedImages}
                        disabled={!s3UploadEndpoint || uploading || selectedFiles.length === 0}
                      >
                        {uploading ? t("common.loading") : t("admin.uploadImages")}
                      </Button>
                      {uploadError && <p className={styles.error}>{uploadError.message}</p>}
                    </div>
                    <label className={styles.field}>
                      <span>{t("admin.modelUrl")}</span>
                      <input value={editForm.modelUrl} onChange={(event) => updateForm("modelUrl", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.modelTitle")}</span>
                      <input value={editForm.modelTitle} onChange={(event) => updateForm("modelTitle", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.modelFormat")}</span>
                      <input value={editForm.modelFormat} onChange={(event) => updateForm("modelFormat", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.modelSize")}</span>
                      <input value={editForm.modelSize} onChange={(event) => updateForm("modelSize", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.modelSource")}</span>
                      <input value={editForm.modelSource} onChange={(event) => updateForm("modelSource", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>{t("admin.modelPreview")}</span>
                      <input value={editForm.modelPreview} onChange={(event) => updateForm("modelPreview", event.target.value)} />
                    </label>
                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        checked={editForm.isVisible}
                        onChange={(event) => updateForm("isVisible", event.target.checked)}
                      />
                      <span>{t("admin.isVisible")}</span>
                    </label>
                  </div>

                  {saveError && <p className={styles.error}>{saveError.message}</p>}
                  <div className={styles.editActions}>
                    <Button type="submit" variant="primary" disabled={saving}>
                      {saving ? t("common.loading") : t(formMode === "create" ? "admin.createSave" : "admin.save")}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};

export default AdminDashboard;
