import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useData from '../../Hooks/useData';
import LoadingError from '../comon/LoadingError';
import styles from '../../pages/projects/Project.module.css';
import ProjectDetails from './ProjectDetails';
import type { Project, ProjectImageRef, ProjectModelAsset } from '../../types/index';
import { getLanguageFromPath } from '../../i18n/routes';
import { localizeProject } from '../../i18n/localizedValue';

type NormalizedProject = Project & {
  location?: string;
  context?: string;
  projectOutcome?: string;
  responsibilities?: string[];
  results?: string[];
  period?: {
    label?: string;
  };
  media?: {
    mainImage?: ProjectImageRef;
    images?: ProjectImageRef[];
    model?: ProjectModelAsset;
  };
  modelAsset?: ProjectModelAsset;
  modelAssets?: ProjectModelAsset[];
};

const ProjectCard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const language = getLanguageFromPath(window.location.pathname);
  const { data, loading, error } = useData<Project>('projects', id);
  const project = data && !Array.isArray(data) ? localizeProject(data as NormalizedProject, language) : null;
  const detailProject = project
    ? {
        title: project.title,
        organization: project.organization,
        placeandyear:
          project.placeandyear ||
          [project.location, project.period?.label].filter(Boolean).join(" | "),
        description: project.description || project.context || "",
        activities:
          project.activities ||
          [
            ...(Array.isArray(project.responsibilities) ? project.responsibilities : []),
            ...(Array.isArray(project.results) ? project.results : []),
          ],
        finalDescription: project.finalDescription || project.projectOutcome || "",
        mainImageUrl: project.mainImageUrl || "",
        mainImageRef: project.media?.mainImage || null,
        imageRefs: project.imageRefs || project.media?.images || [],
        mediaImages: project.media?.images || [],
        modelAsset: project.modelAsset || project.media?.model || project.modelAssets?.[0] || null,
      }
    : null;

  return (
    <div className={`${styles.project} ${styles.panel}`}>
      <LoadingError loading={loading} error={error} />
      {!loading && !error && detailProject && (
        <ProjectDetails
          title={detailProject.title}
          organization={detailProject.organization}
          placeandyear={detailProject.placeandyear}
          description={detailProject.description}
          activities={detailProject.activities}
          finalDescription={detailProject.finalDescription}
          mainImageUrl={detailProject.mainImageUrl}
          mainImageRef={detailProject.mainImageRef}
          imageRefs={detailProject.imageRefs}
          mediaImages={detailProject.mediaImages}
          language={language}
          modelAsset={detailProject.modelAsset}
        />
      )}
      {!loading && !error && !detailProject && <p>{t("projects.notFound")}</p>}
    </div>
  );
};

export default ProjectCard;
