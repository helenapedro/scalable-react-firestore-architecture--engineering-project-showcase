import React, { useState } from 'react';
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
import BimModelViewer, { type BimModelAsset } from './BimModelViewer';

export interface ProjectDetailsProps {
    title: string;
    organization: string;
    placeandyear: string;
    description: string;
    activities: (string | { header: string; items: string[] })[];
    finalDescription: string;
    mainImageUrl: string;
    imageRefs: string[];
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
    imageRefs = [],
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
    const [locationLabel, periodLabel] = placeandyear
        ? placeandyear.split(/\s[|~]\s/).map((item) => item.trim())
        : ['', ''];

    const handleImageClick = (imageUrl: string) => {
        setCurrentImage(imageUrl);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentImage('');
    };

    const resolveUrl = (imageRef: string) => {
        if (!imageRef) return '';
        if (/^https?:\/\//i.test(imageRef)) return imageRef;

        const cdnBaseUrl =
            process.env.REACT_APP_CDN_BASE_URL ||
            process.env.REACT_APP_BASE_URL ||
            process.env.REACT_APP_FIREBASE_STORAGE_BASE_URL;

        if (!cdnBaseUrl) return imageRef;

        const normalizedBase = cdnBaseUrl.endsWith('/') ? cdnBaseUrl : `${cdnBaseUrl}/`;
        return `${normalizedBase}${imageRef.replace(/^\/+/, '')}`;
    };

    const mainImage = resolveUrl(mainImageUrl || imageRefs[0] || '');

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
                                <img src={mainImage} alt={`${title} main`} className={prodetailsstyles.heroImage} />
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
                        {Array.isArray(imageRefs) && imageRefs.length > 0 ? (
                            <div className={imagestyles.detailGalleryGrid}>
                                {imageRefs.map((imageRef, imgIndex) => {
                                    const imageUrl = resolveUrl(imageRef);
                                    return (
                                        <div className={imagestyles.detailGalleryItem} key={imgIndex}>
                                            <button
                                                className={imagestyles.imageButton}
                                                onClick={() => handleImageClick(imageUrl)}
                                            >
                                                <img src={imageUrl} alt={`${t("common.projectImage")} ${imgIndex + 1}`} className={imagestyles.detailGalleryImage} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
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
                    <img src={currentImage} alt={t("common.projectImage")} className={imagestyles.modalImage} />
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
