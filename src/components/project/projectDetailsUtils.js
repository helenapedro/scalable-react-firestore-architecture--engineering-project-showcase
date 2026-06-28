const WORD_TO_NUMBER = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const normalizeNumber = (value) => value.replace(",", ".");

const toMetricValue = (rawValue, unit = "") => {
  if (!rawValue) return "";
  return `${normalizeNumber(rawValue)}${unit}`;
};

const parseNumberWord = (text) => {
  const lower = text.toLowerCase();
  const match = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!match) return null;
  return WORD_TO_NUMBER[match[1]] || null;
};

export const buildProjectStats = ({
  context = "",
  responsibilities = [],
  results = [],
  projectOutcome = "",
}) => {
  const extracted = [];
  const sourceLines = [
    context,
    ...responsibilities,
    ...results,
    projectOutcome,
  ].filter(Boolean);

  const physicalLine = sourceLines.find((line) => /physical/i.test(line) && /%/.test(line));
  const financialLine = sourceLines.find((line) => /financial/i.test(line) && /%/.test(line));
  const physicalPercents = physicalLine
    ? [...physicalLine.matchAll(/(\d+(?:[.,]\d+)?)%/g)].map((m) => normalizeNumber(m[1]))
    : [];
  const financialPercents = financialLine
    ? [...financialLine.matchAll(/(\d+(?:[.,]\d+)?)%/g)].map((m) => normalizeNumber(m[1]))
    : [];

  if (physicalPercents.length > 0) {
    extracted.push({
      label: "Physical Progress",
      value:
        physicalPercents.length >= 2
          ? `${physicalPercents[0]}% -> ${physicalPercents[physicalPercents.length - 1]}%`
          : `${physicalPercents[0]}%`,
    });
  }

  if (financialPercents.length > 0) {
    extracted.push({
      label: "Financial Progress",
      value:
        financialPercents.length >= 2
          ? `${financialPercents[0]}% -> ${financialPercents[financialPercents.length - 1]}%`
          : `${financialPercents[0]}%`,
    });
  }

  const workersLine = sourceLines.find((line) => /workers?/i.test(line));
  if (workersLine) {
    const workersDigits = workersLine.match(/(\d+)\s+workers?/i);
    if (workersDigits) {
      extracted.push({
        label: "Peak Workforce",
        value: `${workersDigits[1]} workers`,
      });
    }
  }

  const subcontractorLine = sourceLines.find((line) => /subcontractors?/i.test(line));
  if (subcontractorLine) {
    const subcontractorDigits = subcontractorLine.match(/(\d+)\s*\+?\s*subcontractors?/i);
    const subcontractorWord = parseNumberWord(subcontractorLine);
    const subcontractorValue = subcontractorDigits
      ? Number(subcontractorDigits[1])
      : subcontractorWord;
    if (subcontractorValue) {
      extracted.push({
        label: "Subcontractors",
        value: `${subcontractorValue}+ on site`,
      });
    }
  }

  const piecesLine = sourceLines.find((line) => /pieces?|slabs?|units?/i.test(line));
  if (piecesLine) {
    const piecesDigits = piecesLine.match(/(\d+)\s*(pieces?|slabs?|units?)/i);
    if (piecesDigits) {
      extracted.push({
        label: "Structural Units",
        value: `${piecesDigits[1]} ${piecesDigits[2]}`,
      });
    }
  }

  const tonsLine = sourceLines.find((line) => /tons?/i.test(line));
  if (tonsLine) {
    const tonsDigits = tonsLine.match(/(\d+(?:[.,]\d+)?)\s*tons?/i);
    if (tonsDigits) {
      extracted.push({
        label: "Average Load",
        value: toMetricValue(tonsDigits[1], " tons"),
      });
    }
  }

  const genericPercentLine = sourceLines.find((line) => /%/.test(line));
  if (!physicalPercents.length && !financialPercents.length && genericPercentLine) {
    const genericPercent = genericPercentLine.match(/(\d+(?:[.,]\d+)?)%/);
    if (genericPercent) {
      extracted.push({
        label: "Current Progress",
        value: toMetricValue(genericPercent[1], "%"),
      });
    }
  }

  const promotionLine = sourceLines.find((line) => /promoted|appointed|project director/i.test(line));
  if (promotionLine) {
    extracted.push({
      label: "Career Track",
      value: "Quality -> Deputy PM -> Director",
    });
  }

  return extracted.slice(0, 5);
};

const isImageObject = (imageRef) =>
  imageRef && typeof imageRef === "object" && !Array.isArray(imageRef);

const getFullImageRef = (imageRef) => {
  if (typeof imageRef === "string") return imageRef;
  if (!isImageObject(imageRef)) return "";
  return (
    imageRef.originalUrl ||
    imageRef.url ||
    imageRef.fullUrl ||
    imageRef.src ||
    imageRef.largeUrl ||
    imageRef.thumbUrl ||
    imageRef.thumbnailUrl ||
    ""
  );
};

const getDisplayImageRef = (imageRef, fullRef) => {
  if (!isImageObject(imageRef)) return fullRef;
  return imageRef.thumbUrl || imageRef.thumbnailUrl || imageRef.largeUrl || fullRef;
};

const getLocalizedAlt = (alt) => {
  if (!alt) return "";
  if (typeof alt === "string") return alt;
  if (typeof alt === "object") return alt.en || alt.pt || "";
  return "";
};

export const buildImageItems = ({
  imageRefs = [],
  imageThumbRefs = [],
  resolveUrl,
}) => {
  if (!Array.isArray(imageRefs)) return [];
  return imageRefs.map((imageRef, index) => {
    const full = getFullImageRef(imageRef);
    if (!full) return null;
    const thumb = Array.isArray(imageThumbRefs)
      ? imageThumbRefs[index]
      : getDisplayImageRef(imageRef, full);
    return {
      alt: getLocalizedAlt(imageRef?.alt) || `Project ${index + 1}`,
      full: resolveUrl(full),
      thumb: thumb ? resolveUrl(thumb) : resolveUrl(full),
      width: imageRef?.width,
      height: imageRef?.height,
    };
  }).filter(Boolean);
};
