import React, { useState } from 'react';
import { Carousel } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import imagestyles from '../../components/ui/Image.module.css';
import { resolveAssetUrl } from '../../utils/assetUrl';
import type { ProjectImageRef } from '../../types';
import { getProjectImageFullRef } from './projectMedia';

interface ProjectCarouselProps {
     images: ProjectImageRef[];
     title: string;
     onImageClick: (image: string) => void;
}

const ProjectCarousel: React.FC<ProjectCarouselProps> = ({ images, title, onImageClick }) => {
     const { t } = useTranslation();
     const [activeSlide, setActiveSlide] = useState<number>(0);
     const [hovered, setHovered] = useState<number | null>(null);
     const ChevronLeft = FaChevronLeft as React.ComponentType<{ size?: number }>;
     const ChevronRight = FaChevronRight as React.ComponentType<{ size?: number }>;

     return (
          <div>
               <Carousel
                    interval={null}
                    controls
                    indicators={false}
                    onSelect={(selectedIndex) => setActiveSlide(selectedIndex)}
                    prevIcon={
                         <div className={imagestyles.customArrow} style={{ left: '10px' }}>
                              {React.createElement(ChevronLeft, { size: 24 })}
                         </div>
                    }
                    nextIcon={
                         <div className={imagestyles.customArrow} style={{ right: '10px' }}>
                              {React.createElement(ChevronRight, { size: 24 })}
                         </div>
                    }
                    className={imagestyles.imageCarousel}
               >
                    {images.map((image, index) => {
                         const imageRef = getProjectImageFullRef(image);
                         const imageUrl = resolveAssetUrl(imageRef);
                         return (
                         <Carousel.Item key={`${imageRef}-${index}`}>
                              <div
                                   className={imagestyles.imageWrapper}
                                   onMouseEnter={() => setHovered(index)}
                                   onMouseLeave={() => setHovered(null)}
                                   onClick={() => onImageClick(imageRef)}
                              >
                                   <img
                                        src={imageUrl}
                                        alt={`${title} ${index + 1}`}
                                        className={imagestyles.imageContainer}
                                   />
                                   {hovered === index && <div className={imagestyles.viewImageOverlay}>{t("common.viewImage")}</div>}
                              </div>
                         </Carousel.Item>
                         );
                    })}
               </Carousel>

               <div className={imagestyles.slideCounter}>
                    {activeSlide + 1} / {images.length}
               </div>
          </div>
     );
};

export default ProjectCarousel;
