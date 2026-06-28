import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { FaEnvelope, FaFileAlt } from "react-icons/fa";
import { SiWhatsapp } from "react-icons/si";
import StatusBadge from "./StatusBadge";
import { PROFILE } from "../../constants/profile";
import { wrapNumbersWithClass } from "../../utils/WrapNumbers";
import herostyles from "../../components/ui/Hero.module.css";
import imagestyles from "../../components/ui/Image.module.css";
import containerstyles from "../../components/ui/Container.module.css";
import styles from "./OwnerIntroduction.module.css";

const OwnerIntroduction = ({ ownerData }) => {
  const { t } = useTranslation();
  const ownerName = ownerData.name || PROFILE.displayName;
  const resumeUrl = ownerData.resumeUrl || PROFILE.resumeUrl;
  const whatsappUrl = ownerData.whatsappUrl || PROFILE.whatsappUrl;
  const email = ownerData.email || PROFILE.email;
  const headline = ownerData.headline || PROFILE.roleLabel;
  const oneLineSummary = ownerData.homeSummary
    || t("owner.fallbackSummary", { years: ownerData.qhseExperienceYears || 2 });
  const highlightClassName = `${herostyles.experienceYear} ${herostyles.colorTwo}`;

  return (
    <Card className={`${containerstyles.container} ${styles.rootCard} mb-4`}>
      <Card.Body className="p-4">
        <Row className="align-items-center">
          <Col md={4} className={styles.leftCol}>
            {ownerData.mainImage && (
              <img
                src={ownerData.mainImage}
                alt={ownerName}
                className={imagestyles.heroImage}
                width="180"
                height="180"
                decoding="async"
              />
            )}
            <Card.Title as="h2" className={`${herostyles.fullName} ${styles.name} fw-bold`}>
              {ownerName}
            </Card.Title>

            <div className={styles.actions}>
              <StatusBadge Icon={FaEnvelope} href={`mailto:${email}`} />
              <StatusBadge Icon={SiWhatsapp} href={whatsappUrl} />
              <StatusBadge Icon={FaFileAlt} href={resumeUrl} />
            </div>
          </Col>

          <Col md={8}>
            <h3 className={styles.rightHeadline}>
              {wrapNumbersWithClass(headline, highlightClassName)}
            </h3>
            <div className={styles.summaryPanel}>
              <Card.Text className={styles.summaryText}>
                {wrapNumbersWithClass(oneLineSummary, highlightClassName)}
              </Card.Text>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default OwnerIntroduction;
