import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Col, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as iconsfa from 'react-icons/fa';
import { wrapProjectFields } from '../../utils/wrapProjectFields';
import { wrapNumbersWithClass } from '../../utils/WrapNumbers';
import styles from '../../pages/projects/Project.module.css';
import numberstyles from '../../components/ui/Number.module.css';
import imagestyles from '../../components/ui/Image.module.css';
import prodetailsstyles from '../../components/ui/ProjectDetails.module.css';
import containerstyles from '../../components/ui/Container.module.css';
import cardstyles from '../../components/ui/card.module.css';
import { resolveAssetUrl } from '../../utils/assetUrl';
import BimModelViewer, { type BimModelAsset } from './BimModelViewer';
import type { ProjectImageRef } from '../../types';
import { getProjectImageFullRef, normalizeProjectImages } from './projectMedia';

const GALLERY_BATCH_SIZE = 6;

export interface ProjectDetailsProps {
    title: string;
    organization: string;
    placeandyear: string;
    description: string;
    activities: (string | { header: string; items: string[] })[];
    finalDescription: string;
    mainImageUrl: string;
    mainImageRef?: ProjectImageRef | null;
    imageRefs?: ProjectImageRef[];
    mediaImages?: ProjectImageRef[];
    language?: string;
    modelAsset?: BimModelAsset | null;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
    title,
    organization,
    placeandyear,
    description,
    activities = [],
    finalDescription = '',
    mainImageUrl,
    mainImageRef = null,
    imageRefs = [],
    mediaImages = [],
    language = 'en',
    modelAsset = null,
}) => {
    const { t } = useTranslation();
    const wrappedProject = wrapProjectFields(
        {
            title,
            placeandyear,
            description,
            activities,
            finalDescription,
        },
        numberstyles.proDetailsNumber
    );

    const [showModal, setShowModal] = useState(false);
    const [currentImage, setCurrentImage] = useState('');
    const [visibleImageCount, setVisibleImageCount] = useState(GALLERY_BATCH_SIZE);
    const [locationLabel, periodLabel] = placeandyear
        ? placeandyear.split(/\s[|~]\s/).map((item) => item.trim())
        : ['', ''];

    const galleryImages = useMemo(
        () =>
            normalizeProjectImages({
                imageRefs,
                mediaImages,
                language,
                fallbackAlt: title || t("common.projectImage"),
            }),
        [imageRefs, mediaImages, language, title, t]
    );
    const visibleGalleryImages = useMemo(
        () => galleryImages.slice(0, visibleImageCount),
        [galleryImages, visibleImageCount]
    );
    const hasMoreGalleryImages = visibleImageCount < galleryImages.length;

    useEffect(() => {
        setVisibleImageCount(GALLERY_BATCH_SIZE);
    }, [galleryImages]);

    const handleImageClick = (imageUrl: string) => {
        setCurrentImage(imageUrl);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentImage('');
    };

    const resolveUrl = resolveAssetUrl;

    const mainImage = resolveUrl(mainImageUrl || getProjectImageFullRef(mainImageRef) || galleryImages[0]?.fullRef || '');

    const renderActivitySection = (
        activitySection: string | { header: string; items: string[] },
        sectionIndex: number
    ) => {
        if (typeof activitySection === 'string') {
            return (
                <li className={styles.projectActivityItem} key={`activity-${sectionIndex}`}>
                    {wrapNumbersWithClass(activitySection, 'number')}
                </li>
            );
        }

        return (
            <li className={styles.projectActivityGroup} key={`activity-${sectionIndex}`}>
                {activitySection.header && (
                    <strong className={prodetailsstyles.activityGroupTitle}>
                        {wrapNumbersWithClass(activitySection.header, styles.number)}
                    </strong>
                )}
                {Array.isArray(activitySection.items) && activitySection.items.length > 0 && (
                    <ul className={`${styles.ulItems} ${styles['ulItems--tick']} ${prodetailsstyles.nestedActivityList}`}>
                        {activitySection.items.map((item, itemIndex) => (
                            <li className={styles.projectActivityItem} key={`activity-${sectionIndex}-${itemIndex}`}>
                                {wrapNumbersWithClass(item, styles.number)}
                            </li>
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <div className={`${containerstyles.cardContainer} ${prodetailsstyles.detailShell}`}>
            <Col className={`${containerstyles.panel} ${prodetailsstyles.detailPanel}`} aria-labelledby={`project-title-${title}`}>
                <div className={`${cardstyles.cardContainer} ${prodetailsstyles.technicalSheet}`}>
                    <section className={prodetailsstyles.technicalHero} aria-label="Project technical sheet">
                        {mainImage ? (
                            <button
                                type="button"
                                className={prodetailsstyles.heroImageButton}
                                onClick={() => handleImageClick(mainImage)}
                                aria-label={t("common.viewImage")}
                            >
                                <img
                                    src={mainImage}
                                    alt={`${title} main`}
                                    className={prodetailsstyles.heroImage}
                                    decoding="async"
                                />
                                <span className={prodetailsstyles.blueprintOverlay} aria-hidden="true" />
                            </button>
                        ) : (
                            <div className={prodetailsstyles.blueprintFallback} aria-hidden="true">
                                <div className={prodetailsstyles.fallbackFrame}>
                                    <iconsfa.FaDraftingCompass className={prodetailsstyles.fallbackPrimaryIcon} />
                                    <div className={prodetailsstyles.fallbackCopy}>
                                        <span>{t("projects.technicalRecord")}</span>
                                        <strong>{t("projects.mediaUnavailable")}</strong>
                                    </div>
                                    <div className={prodetailsstyles.fallbackPlan}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                    <div className={prodetailsstyles.fallbackTools}>
                                        <iconsfa.FaRulerCombined />
                                        <iconsfa.FaHardHat />
                                        <iconsfa.FaBuilding />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={prodetailsstyles.heroContent}>
                            <span className={prodetailsstyles.eyebrow}>Civil Engineering Project Record</span>
                            <h2 className={prodetailsstyles.title} id={`project-title-${title}`}>
                                {wrappedProject.title}
                            </h2>
                            <div className={prodetailsstyles.heroChips} aria-label="Project classifications">
                                <span><iconsfa.FaHardHat className={prodetailsstyles.icon} /> Construction</span>
                                <span><iconsfa.FaDraftingCompass className={prodetailsstyles.icon} /> Technical scope</span>
                                <span><iconsfa.FaClipboardCheck className={prodetailsstyles.icon} /> Site record</span>
                            </div>

                            <Card.Subtitle className={`${prodetailsstyles.subtitle} ${prodetailsstyles.specGrid}`}>
                                <div className={prodetailsstyles.specCard}>
                                    <span className={prodetailsstyles.specLabel}>Organization</span>
                                    <strong className={`${prodetailsstyles.specValue} ${prodetailsstyles.orgTitle}`}>
                                        {organization}
                                    </strong>
                                </div>
                                <div className={prodetailsstyles.specCard}>
                                    <span className={prodetailsstyles.specLabel}>Location</span>
                                    <strong className={prodetailsstyles.specValue}>
                                        <iconsfa.FaMapMarkerAlt className={prodetailsstyles.icon} />
                                        {locationLabel || placeandyear}
                                    </strong>
                                </div>
                                {periodLabel && (
                                    <div className={prodetailsstyles.specCard}>
                                        <span className={prodetailsstyles.specLabel}>Period</span>
                                        <strong className={prodetailsstyles.specValue}>
                                            <iconsfa.FaCalendarAlt className={prodetailsstyles.icon} />
                                            {periodLabel}
                                        </strong>
                                    </div>
                                )}
                                <div className={prodetailsstyles.specCard}>
                                    <span className={prodetailsstyles.specLabel}>Discipline</span>
                                    <strong className={prodetailsstyles.specValue}>Civil / Construction Engineering</strong>
                                </div>
                            </Card.Subtitle>
                        </div>
                    </section>

                    <div className={prodetailsstyles.detailContentGrid}>
                        <section className={`${prodetailsstyles.contentSection} ${prodetailsstyles.overviewPanel}`}>
                            <span className={prodetailsstyles.sectionKicker}>Project Overview</span>
                            <p className={`${styles.projectdescription} number`}>
                                <b>{wrappedProject.description}</b>
                            </p>
                        </section>

                        {Array.isArray(activities) && activities.length > 0 && (
                            <section className={`${prodetailsstyles.contentSection} ${prodetailsstyles.activityPanel}`}>
                                <span className={prodetailsstyles.sectionKicker}>Technical Scope & Responsibilities</span>
                                <ul className={`${styles.ulItems} ${styles['ulItems--tick']} ${prodetailsstyles.activityList}`}>
                                    {activities.map(renderActivitySection)}
                                </ul>
                            </section>
                        )}

                        {wrappedProject.finalDescription && (
                            <section className={`${prodetailsstyles.contentSection} ${prodetailsstyles.outcomePanel}`}>
                                <span className={prodetailsstyles.sectionKicker}>Role & Outcome</span>
                                <p className={styles.projectdescription}>
                                    <b>{wrappedProject.finalDescription}</b>
                                </p>
                            </section>
                        )}
                    </div>

                    <section className={prodetailsstyles.mediaSection} aria-label={t("projects.imagesLabel")}>
                        <span className={prodetailsstyles.sectionKicker}>Project Gallery</span>
                        {galleryImages.length > 0 ? (
                            <>
                                <div className={imagestyles.detailGalleryGrid}>
                                    {visibleGalleryImages.map((image, imgIndex) => {
                                    const imageUrl = resolveUrl(image.fullRef);
                                    const displayUrl = resolveUrl(image.displayRef);
                                    return (
                                        <div className={imagestyles.detailGalleryItem} key={`${image.id}-${imgIndex}`}>
                                            <button
                                                type="button"
                                                className={imagestyles.imageButton}
                                                onClick={() => handleImageClick(imageUrl)}
                                            >
                                                <img
                                                    src={displayUrl}
                                                    alt={image.alt}
                                                    className={imagestyles.detailGalleryImage}
                                                    loading="lazy"
                                                    decoding="async"
                                                    width={image.width}
                                                    height={image.height}
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                                </div>
                                {hasMoreGalleryImages && (
                                    <div className={prodetailsstyles.galleryActions}>
                                        <Button
                                            type="button"
                                            variant="outline-secondary"
                                            onClick={() =>
                                                setVisibleImageCount((count) =>
                                                    Math.min(count + GALLERY_BATCH_SIZE, galleryImages.length)
                                                )
                                            }
                                        >
                                            {t("projects.showMoreImages", "Show More Images")}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={prodetailsstyles.emptyGalleryState}>
                                <iconsfa.FaImages className={prodetailsstyles.emptyGalleryIcon} />
                                <div>
                                    <strong>{t("projects.noImagesAvailable")}</strong>
                                    <span>{t("projects.noImagesTechnicalRecord")}</span>
                                </div>
                            </div>
                        )}
                    </section>

                    <BimModelViewer asset={modelAsset} resolveUrl={resolveUrl} />
                </div>
            </Col>

            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t("common.imagePreview")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <img
                        src={currentImage}
                        alt={t("common.projectImage")}
                        className={imagestyles.modalImage}
                        decoding="async"
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        {t("common.close")}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ProjectDetails;
