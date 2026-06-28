import React from "react";
import PropTypes from "prop-types";
import { Card, Button, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as iconsfa from "react-icons/fa";
import { getProjectImageFullRef } from "../../../components/project/projectMedia";
import { wrapNumbersWithClass } from "../../../utils/WrapNumbers";
import { resolveAssetUrl } from "../../../utils/assetUrl";
import styles from "../ProjectContainer.module.css";
import prodetailsstyles from "../../../components/ui/ProjectDetails.module.css";
import { getLanguageFromPath, routePath } from "../../../i18n/routes";

const ProjectCard = ({ project, categoryName, onOpenImage }) => {
  const { t } = useTranslation();
  const language = getLanguageFromPath(window.location.pathname);
  const previewRef =
    getProjectImageFullRef(project.media?.mainImage) ||
    getProjectImageFullRef(project.media?.images?.[0]);
  const previewUrl = resolveAssetUrl(previewRef);

  return (
    <Col md={6} style={{ marginBottom: "1rem" }}>
      <Card className={`${styles.cardContainer} shadow-sm`}>
        <Card.Header className={`${styles.cardHeader} text-center`}>
          <h5 className={`${prodetailsstyles.title} number mb-0`}>{project.title}</h5>
          <Card.Subtitle className={prodetailsstyles.subtitle}>
            <div className={prodetailsstyles.organization}>
              <iconsfa.FaBuilding className={prodetailsstyles.icon} /> {project.organization}{" "}
              <span className={`${prodetailsstyles.year} number`}>
                <iconsfa.FaCalendarAlt className={prodetailsstyles.icon} /> {project.period?.label || ""}
              </span>
            </div>
            <div className={prodetailsstyles.place}>
              <iconsfa.FaMapMarkerAlt className={prodetailsstyles.icon} />{" "}
              {wrapNumbersWithClass(project.location || "", "number")}
            </div>
            <div className={prodetailsstyles.category}>
              <iconsfa.FaTags className={prodetailsstyles.icon} /> {categoryName}
            </div>
          </Card.Subtitle>
        </Card.Header>

        {previewUrl && (
          <button
            type="button"
            className={styles.cardImageButton}
            onClick={() => onOpenImage(previewRef)}
            aria-label={t("common.viewImage")}
          >
            <img
              src={previewUrl}
              alt={`${project.title} preview`}
              className={styles.cardPreviewImage}
              loading="lazy"
              decoding="async"
            />
          </button>
        )}

        <Card.Body>
          <div className="text-center">
            <Link to={routePath("projects", language, { id: project.id })}>
              <Button variant="primary">{t("projects.viewDetails")}</Button>
            </Link>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    organization: PropTypes.string,
    location: PropTypes.string,
    period: PropTypes.shape({
      label: PropTypes.string,
    }),
    media: PropTypes.shape({
      mainImage: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      images: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
    }),
  }).isRequired,
  categoryName: PropTypes.string.isRequired,
  onOpenImage: PropTypes.func.isRequired,
};

export default ProjectCard;
