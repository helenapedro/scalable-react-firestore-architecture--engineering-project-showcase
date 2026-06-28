import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import { wrapNumbersWithClass } from '../../utils/WrapNumbers';
import styles from './Project.module.css';
import imagestyles from '../../components/ui/Image.module.css';
import { resolveAssetUrl } from '../../utils/assetUrl';

const Project = ({
  title,
  organization,
  location,
  period,
  context,
  responsibilities = [],
  results = [],
  projectOutcome = '',
  media = {}
}) => {
  const placeAndPeriod = [location, period?.label].filter(Boolean).join(' ~ ');

  const [showModal, setShowModal] = useState(false);
  const [currentImage, setCurrentImage] = useState('');

  const handleImageClick = (imageUrl) => {
    setCurrentImage(imageUrl);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentImage('');
  };


  const resolveUrl = resolveAssetUrl;

  return (
    <div className={styles.project}>
      <article className={styles.panel} aria-labelledby={`project-title-${title}`}>
        <header className={styles.header}>
          <h2 className={styles.title} id={`project-title-${title}`}>
            {wrapNumbersWithClass(title, styles.number)}
          </h2>
          <div className={styles.info}>
            <p className={`${styles.organization} number`}>
              <FaBuilding className={styles.icon} /> {organization}
            </p>
            <p className={`${styles.placeandyear} number`}>
              <FaMapMarkerAlt className={styles.icon} /> {wrapNumbersWithClass(placeAndPeriod, styles.number)}
            </p>
          </div>
        </header>

        <p className={styles.projectdescription}><b>{wrapNumbersWithClass(context, styles.number)}</b></p>
        {Array.isArray(responsibilities) && responsibilities.length > 0 && (
          <ul className={`${styles.ulItems} ${styles['ulItems--tick']}`}>
            {responsibilities.map((item, itemIndex) => (
              <li className={styles.projectActivityItem} key={itemIndex}>
                {wrapNumbersWithClass(item, styles.number)}
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(results) && results.length > 0 && (
          <ul className={`${styles.ulItems} ${styles['ulItems--tick']}`}>
            {results.map((item, itemIndex) => (
              <li className={styles.projectActivityItem} key={itemIndex}>
                {wrapNumbersWithClass(item, styles.number)}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.projectdescription}>
          <b>{wrapNumbersWithClass(projectOutcome, styles.number)}</b>
        </p>
        {Array.isArray(media.images) && media.images.length > 0 && (
          <section aria-label="Project images">
            <div className={imagestyles.row}>
              {media.images.map((image, imgIndex) => {
                const imageUrl = resolveUrl(image);
                return (
                  <div className={imagestyles.imageContainer} key={imgIndex}>
                    <button
                      className={imagestyles.imageButton}
                      onClick={() => handleImageClick(imageUrl)}
                    >
                      <img src={imageUrl} alt={`Project ${imgIndex}`} className={imagestyles.image} />
                      <div className={imagestyles.overlay}>View Image</div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </article>

      {/* Modal for displaying images */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <img src={currentImage} alt="Project" className={imagestyles.modalImage} />
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

Project.propTypes = {
  title: PropTypes.string.isRequired,
  organization: PropTypes.string.isRequired,
  location: PropTypes.string,
  period: PropTypes.shape({
    startYear: PropTypes.number,
    endYear: PropTypes.number,
    label: PropTypes.string
  }),
  context: PropTypes.string.isRequired,
  responsibilities: PropTypes.arrayOf(PropTypes.string),
  results: PropTypes.arrayOf(PropTypes.string),
  projectOutcome: PropTypes.string,
  media: PropTypes.shape({
    images: PropTypes.arrayOf(PropTypes.string)
  })
};

export default Project;
