import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import imagestyles from "../../components/ui/Image.module.css";
import prodetailsstyles from "../../components/ui/ProjectDetails.module.css";

const IMAGE_BATCH_SIZE = 6;

const ProjectMediaGallery = ({ imageItems, onImageClick }) => {
  const [visibleImageCount, setVisibleImageCount] = useState(IMAGE_BATCH_SIZE);

  useEffect(() => {
    setVisibleImageCount(IMAGE_BATCH_SIZE);
  }, [imageItems]);

  const visibleImages = useMemo(
    () => imageItems.slice(0, visibleImageCount),
    [imageItems, visibleImageCount]
  );

  const hasMoreImages = imageItems.length > 0 && visibleImageCount < imageItems.length;
  if (!imageItems.length) return null;

  return (
    <section aria-label="Project images">
      <h3 className={prodetailsstyles.sectionTitle}>Media</h3>
      <div className={imagestyles.row}>
        {visibleImages.map((image, imgIndex) => (
          <div className={imagestyles.imageContainer} key={`${image.full}-${imgIndex}`}>
            <button className={imagestyles.imageButton} onClick={() => onImageClick(image.full)}>
              <img
                src={image.thumb}
                alt={image.alt || `Project ${imgIndex + 1}`}
                className={imagestyles.image}
                loading="lazy"
                decoding="async"
                width={image.width}
                height={image.height}
              />
            </button>
          </div>
        ))}
      </div>

      {hasMoreImages && (
        <div className={prodetailsstyles.galleryActions}>
          <Button
            variant="outline-secondary"
            onClick={() => setVisibleImageCount((count) => count + IMAGE_BATCH_SIZE)}
          >
            Show More Images
          </Button>
        </div>
      )}
    </section>
  );
};

ProjectMediaGallery.propTypes = {
  imageItems: PropTypes.arrayOf(
    PropTypes.shape({
      full: PropTypes.string.isRequired,
      thumb: PropTypes.string.isRequired,
      alt: PropTypes.string,
      width: PropTypes.number,
      height: PropTypes.number,
    })
  ).isRequired,
  onImageClick: PropTypes.func.isRequired,
};

export default ProjectMediaGallery;
