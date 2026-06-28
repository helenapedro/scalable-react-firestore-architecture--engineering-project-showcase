import type { LocalizedText, ProjectImageAsset, ProjectImageRef } from '../../types';

export interface NormalizedProjectImage {
  id: string;
  fullRef: string;
  displayRef: string;
  alt: string;
  width?: number;
  height?: number;
  source: 'legacy-string' | 'media-object';
}

interface NormalizeProjectImagesOptions {
  imageRefs?: ProjectImageRef[];
  mediaImages?: ProjectImageRef[];
  language?: string;
  fallbackAlt?: string;
}

const isProjectImageAsset = (image: ProjectImageRef): image is ProjectImageAsset =>
  typeof image === 'object' && image !== null;

const getLocalizedText = (value: LocalizedText | undefined, language = 'en') => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[language] || value.en || value.pt || '';
};

const getFullRef = (image: ProjectImageAsset) =>
  image.originalUrl || image.url || image.fullUrl || image.src || image.largeUrl || image.thumbUrl || image.thumbnailUrl || '';

const getDisplayRef = (image: ProjectImageAsset, fullRef: string) =>
  image.thumbUrl || image.thumbnailUrl || image.largeUrl || fullRef;

const getActiveImages = (imageRefs: ProjectImageRef[] = [], mediaImages: ProjectImageRef[] = []) => {
  if (Array.isArray(mediaImages) && mediaImages.length > 0) return mediaImages;
  if (Array.isArray(imageRefs) && imageRefs.length > 0) return imageRefs;
  return [];
};

export const normalizeProjectImages = ({
  imageRefs = [],
  mediaImages = [],
  language = 'en',
  fallbackAlt = 'Project image',
}: NormalizeProjectImagesOptions): NormalizedProjectImage[] =>
  getActiveImages(imageRefs, mediaImages)
    .map((imageRef, index): NormalizedProjectImage | null => {
      if (!imageRef) return null;

      if (typeof imageRef === 'string') {
        const trimmedRef = imageRef.trim();
        if (!trimmedRef) return null;

        return {
          id: trimmedRef,
          fullRef: trimmedRef,
          displayRef: trimmedRef,
          alt: `${fallbackAlt} ${index + 1}`,
          source: 'legacy-string',
        };
      }

      if (!isProjectImageAsset(imageRef)) return null;

      const fullRef = getFullRef(imageRef).trim();
      const displayRef = getDisplayRef(imageRef, fullRef).trim();
      if (!fullRef && !displayRef) return null;

      return {
        id: imageRef.id || fullRef || displayRef || `project-image-${index + 1}`,
        fullRef: fullRef || displayRef,
        displayRef: displayRef || fullRef,
        alt: getLocalizedText(imageRef.alt, language) || `${fallbackAlt} ${index + 1}`,
        width: imageRef.width,
        height: imageRef.height,
        source: 'media-object',
      };
    })
    .filter((image): image is NormalizedProjectImage => Boolean(image));

export const getProjectImageFullRef = (imageRef?: ProjectImageRef | null) => {
  if (!imageRef) return '';
  if (typeof imageRef === 'string') return imageRef;
  return getFullRef(imageRef);
};
