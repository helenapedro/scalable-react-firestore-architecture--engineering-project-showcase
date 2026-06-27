import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Col, Modal, CardHeader } from "react-bootstrap";
import * as iconsfa from "react-icons/fa";
import { wrapNumbersWithClass } from "../../utils/WrapNumbers";
import styles from "../../pages/projects/Project.module.css";
import numberstyles from "../../components/ui/Number.module.css";
import imagestyles from "../../components/ui/Image.module.css";
import prodetailsstyles from "../../components/ui/ProjectDetails.module.css";
import containerstyles from "../../components/ui/Container.module.css";
import cardstyles from "../../components/ui/card.module.css";
import ProjectMetrics from "./ProjectMetrics";
import ProjectTextSection from "./ProjectTextSection";
import ProjectMediaGallery from "./ProjectMediaGallery";
import {
  buildImageItems,
  buildProjectStats,
} from "./projectDetailsUtils";

const ProjectDetails = ({
  title,
  organization,
  location,
  period,
  context,
  responsibilities = [],
  results = [],
  projectOutcome = "",
  media = {},
}) => {
  const [showModal, setShowModal] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const placeAndPeriod = [location, period?.label].filter(Boolean).join(" ~ ");

  const resolveUrl = (url) => {
    const baseUrl = process.env.REACT_APP_CDN_BASE_URL;
    return url.startsWith("http") ? url : `${baseUrl}${url}`;
  };

  const stats = useMemo(
    () =>
      buildProjectStats({
        context,
        responsibilities,
        results,
        projectOutcome,
      }),
    [context, responsibilities, results, projectOutcome]
  );
  const imageItems = useMemo(
    () =>
      buildImageItems({
        imageRefs: media.images,
        imageThumbRefs: media.thumbnails,
        resolveUrl,
      }),
    [media.images, media.thumbnails]
  );

  const handleImageClick = (imageUrl) => {
    setCurrentImage(imageUrl);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentImage("");
  };

  return (
    <div className={containerstyles.cardContainer}>
      <Col className={containerstyles.panel} aria-labelledby={`project-title-${title}`}>
        <div className={cardstyles.cardContainer}>
          <CardHeader className={`${cardstyles.cardHeader} text-center`}>
            <h2 className={prodetailsstyles.title} id={`project-title-${title}`}>
              {wrapNumbersWithClass(title, numberstyles.proDetailsNumber)}
            </h2>
            <Card.Subtitle className={prodetailsstyles.subtitle}>
              <div className={prodetailsstyles.organization}>
                <span className={prodetailsstyles.orgTitle}>{organization}</span>
              </div>
              <div className={prodetailsstyles.place}>
                <iconsfa.FaMapMarkerAlt className={prodetailsstyles.icon} />{" "}
                {wrapNumbersWithClass(placeAndPeriod, numberstyles.proDetailsNumber)}
              </div>
            </Card.Subtitle>
          </CardHeader>

          <ProjectMetrics stats={stats} numberClassName={numberstyles.proDetailsNumber} />

          <section className={prodetailsstyles.contentSection}>
            <h3 className={prodetailsstyles.sectionTitle}>Context</h3>
            <p className={`${styles.projectdescription} number`}>
              <b>{wrapNumbersWithClass(context, numberstyles.proDetailsNumber)}</b>
            </p>
          </section>

          <ProjectTextSection
            title="Responsibilities"
            items={responsibilities}
          />
          <ProjectTextSection title="Results" items={results} />

          {projectOutcome && (
            <section className={prodetailsstyles.contentSection}>
              <h3 className={prodetailsstyles.sectionTitle}>Project Outcome</h3>
              <p className={styles.projectdescription}>
                <b>{wrapNumbersWithClass(projectOutcome, numberstyles.proDetailsNumber)}</b>
              </p>
            </section>
          )}

          <ProjectMediaGallery imageItems={imageItems} onImageClick={handleImageClick} />
        </div>
      </Col>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <img src={currentImage} alt="Project preview" className={imagestyles.modalImage} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

ProjectDetails.propTypes = {
  title: PropTypes.string.isRequired,
  organization: PropTypes.string.isRequired,
  location: PropTypes.string,
  period: PropTypes.shape({
    startYear: PropTypes.number,
    endYear: PropTypes.number,
    label: PropTypes.string,
  }),
  context: PropTypes.string.isRequired,
  responsibilities: PropTypes.arrayOf(PropTypes.string),
  results: PropTypes.arrayOf(PropTypes.string),
  projectOutcome: PropTypes.string,
  media: PropTypes.shape({
    mainImage: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    thumbnails: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default ProjectDetails;
