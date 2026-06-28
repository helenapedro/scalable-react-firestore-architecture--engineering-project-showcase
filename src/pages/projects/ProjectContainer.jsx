import React, { useMemo, useState } from "react";
import { Button, Modal, Row } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import useHomeData from "../../Hooks/homeData";
import useData from "../../Hooks/useData";
import useProjectsServer from "../../Hooks/useProjectsServer";
import useCategoryCounts from "../../Hooks/useCategoryCounts";
import OwnerIntroduction from "../Home/OwnerIntroduction";
import renderPagination from "../../utils/Pagination/renderPagination";
import CategoryFilterDropdown from "../../utils/CategoryFilterDropdown";
import FeaturedMediaCard from "./components/FeaturedMediaCard";
import ProjectCard from "./components/ProjectCard";
import styles from "./ProjectContainer.module.css";
import mainStyles from "../../components/Main.module.css";
import containerstyles from "../../components/ui/Container.module.css";
import { getLanguageFromPath, routePath } from "../../i18n/routes";
import { localizeCategory, localizeOwner, localizeProject } from "../../i18n/localizedValue";
import { resolveAssetUrl } from "../../utils/assetUrl";

const FEATURED_PROJECT_TITLE = "Construction of 120 Social Apartments in Buco-Zau";
const FEATURED_VIDEO_URL = "https://www.tiktok.com/@tpaonline/video/7607846826837953800";
const FEATURED_VIDEO_EMBED_URL = "https://drive.google.com/file/d/13DcdDBES0ICsrer3pWLAh4SfFrkg36uF/preview#t=58";

const getCategoryName = (categories, categoryId) => {
  const category = categories.find((item) => item.id === categoryId);
  return category ? category.name : "Unknown Category";
};

const ProjectsContainer = () => {
  const { t } = useTranslation();
  const language = getLanguageFromPath(window.location.pathname);
  const {
    projects,
    totalCount,
    loading: projectsLoading,
    error: projectsError,
    currentPage,
    pageSize,
    selectedCategories,
    handlePageChange,
    handleCategoryChange,
  } = useProjectsServer({ pageSize: 8 });
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useData(
    "category"
  );
  const { data: ownerData, loading: ownerLoading, error: ownerError } = useHomeData(
    "home",
    "homeInfo"
  );

  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const localizedCategories = useMemo(
    () => (Array.isArray(categories) ? categories.map((category) => localizeCategory(category, language)) : []),
    [categories, language]
  );
  const localizedProjects = useMemo(
    () => projects.map((project) => localizeProject(project, language)),
    [projects, language]
  );
  const localizedOwnerData = useMemo(
    () => (ownerData ? localizeOwner(ownerData, language) : ownerData),
    [ownerData, language]
  );
  const categoryCounts = useCategoryCounts(categories);

  const categoryNameMap = useMemo(
    () => Object.fromEntries(localizedCategories.map((category) => [category.id, category.name])),
    [localizedCategories]
  );

  const openModal = (image) => {
    setModalImage(resolveAssetUrl(image));
    setShowModal(true);
  };

  if (projectsLoading || categoriesLoading || ownerLoading) return <p>{t("common.loading")}</p>;
  if (projectsError) return <p>{t("common.error")}: {projectsError.message}</p>;
  if (categoriesError) return <p>{t("common.error")}: {categoriesError.message}</p>;
  if (ownerError) return <p>{t("common.error")}: {ownerError.message}</p>;

  return (
    <div className={`${mainStyles.panel} ${styles.panel}`}>
      {localizedOwnerData && <OwnerIntroduction ownerData={localizedOwnerData} />}

      <FeaturedMediaCard
        projectTitle={FEATURED_PROJECT_TITLE}
        projectPath={routePath("projects", language, { id: "construction-of-120-social-apartments-in-buco-zau" })}
        videoUrl={FEATURED_VIDEO_URL}
        embedUrl={FEATURED_VIDEO_EMBED_URL}
      />

      <Row className={containerstyles.container}>
        <CategoryFilterDropdown
          categories={localizedCategories}
          selectedCategories={selectedCategories}
          categoryCounts={categoryCounts}
          onCategoryChange={handleCategoryChange}
        />

        {localizedProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            categoryName={
              categoryNameMap[project.categoryId] ||
              getCategoryName(localizedCategories, project.categoryId) ||
              t("filters.unknownCategory")
            }
            onOpenImage={openModal}
          />
        ))}

        <div className={styles.pagination}>
          {renderPagination(
            totalCount,
            pageSize,
            currentPage,
            handlePageChange,
            styles.paginationContainer
          )}
        </div>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Body>
          <img src={modalImage} alt={t("common.projectImage")} className="img-fluid" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            {t("common.close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProjectsContainer;
