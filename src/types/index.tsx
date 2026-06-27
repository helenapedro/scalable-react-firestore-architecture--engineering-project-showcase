import { Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export type Activity =
  | string
  | {
      header: string;
      items: string[];
    };

export type LocalizedText =
  | string
  | {
      en?: string;
      pt?: string;
      [locale: string]: string | undefined;
    };

export interface ProjectImageAsset {
  id?: string;
  order?: number;
  alt?: LocalizedText;
  originalUrl?: string;
  url?: string;
  fullUrl?: string;
  src?: string;
  thumbUrl?: string;
  thumbnailUrl?: string;
  largeUrl?: string;
  width?: number;
  height?: number;
  contentType?: string;
  sizeBytes?: number;
  createdAt?: string;
}

export type ProjectImageRef = string | ProjectImageAsset;

export interface Project {
  id: string; // doc id (slug)
  title: string;
  organization: string;
  placeandyear: string;
  description: string;
  activities: Activity[];
  finalDescription: string;
  mainImageUrl: string;
  imageRefs: ProjectImageRef[];
  media?: {
    mainImage?: ProjectImageRef;
    images?: ProjectImageRef[];
    thumbnails?: string[];
    model?: ProjectModelAsset;
  };
  slug: string;
  isVisible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  skillsShowcased?: string[];
  client?: string;
  modelAsset?: ProjectModelAsset;
  modelAssets?: ProjectModelAsset[];
}

export interface ProjectModelAsset {
  url: string;
  title?: string;
  format?: string;
  sizeLabel?: string;
  source?: string;
  previewImage?: string;
}


export interface ProjectsPage {
  projects: Project[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}
