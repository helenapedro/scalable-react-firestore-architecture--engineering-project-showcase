# Scalable React-Firestore Architecture: Engineering Project Showcase

A high-performance single-page application architected to showcase complex civil engineering projects through a scalable React frontend, optimized Firestore querying, multilingual presentation, and offline-ready content delivery.

The platform is more than a portfolio site: it is a technical case study in building a resilient project showcase for infrastructure work, including social housing, bridges, drainage systems, airport pavement rehabilitation, and multimedia engineering documentation.

## Design Documentation

- [`docs/high-level-system-design.md`](docs/high-level-system-design.md): high-level system design covering the current React, Firestore, S3, CloudFront, admin upload, caching, and media delivery architecture, plus recommended rollout and technical decisions.
- [`docs/performance-baseline.md`](docs/performance-baseline.md): performance measurement plan, budgets, route checklist, and before/after evidence template for the CDN and gallery-loading case study.
- [`docs/media-architecture.md`](docs/media-architecture.md): media storage, URL, caching, upload, rendering, and migration rules for project images and future assets.
- [`docs/operations-runbook.md`](docs/operations-runbook.md): operational checks and incident procedures for deployments, image delivery, admin uploads, CDN behavior, and Firestore usage.

## Core Technical Achievements

## Current Implementation Status

- Phase 1 complete: multilingual routing, Firestore localization adapters, Portuguese fallback coverage, PWA manifest, service worker, and offline shell.
- Phase 2 active: interactive Leaflet/OpenStreetMap project map, coordinate intake template, Three.js GLTF/GLB model viewer, 3D/BIM model asset schema, and model intake template.
- Phase 3 foundation active: Firebase Auth protected admin area, admin allow-list support, project inventory, and Firestore metadata editing.
- Still pending: remaining verified project GPS coordinates, production tile/provider policy decisions, validated optimized model assets, and authenticated media/model upload policy hardening.

### Multi-Tier Caching System

The application implements a TTL-based caching engine in [`src/utils/cacheStore.js`](src/utils/cacheStore.js) with two layers:

- In-memory cache for fast repeated reads during the active browser session.
- `localStorage` persistence for cross-session reuse of query results.
- One-hour default TTL expiration through `DEFAULT_CACHE_TTL_MS`.
- Fail-open resilience when browser storage is unavailable, allowing the app to continue with memory-only caching.

This strategy reduces redundant Firestore reads while keeping project data fresh enough for a live portfolio.

### Server-Side Query Strategy

Project listing is handled by [`src/Hooks/useProjectsServer.js`](src/Hooks/useProjectsServer.js), which avoids loading the full `projects` collection into the browser.

The data layer uses:

- Firestore `where("categoryId", "in", [...])` filtering.
- Cursor-based pagination with `orderBy(documentId())`, `startAfter(...)`, and `limit(pageSize)`.
- Cached cursor metadata to support page navigation without repeatedly walking every previous page.
- Defensive handling for Firestore's 10-value `in` filter limit.

### Optimized Data Metadata

The platform uses Firestore aggregate reads through `getCountFromServer(...)` for:

- Total project count per selected filter set.
- Category count metadata in the filter dropdown.

This avoids full document reads when the UI only needs totals.

### Globalization and Offline-First Delivery

Phase 1 of the technical roadmap adds:

- Runtime internationalization with `i18next` and `react-i18next`.
- English and Portuguese route support, including `/pt`, `/pt/projetos/:id`, `/pt/formacao`, and `/pt/sobre`.
- Compatibility localization for current flat Firestore strings, plus support for future map fields like `{ en, pt }`.
- PWA manifest, service worker, offline fallback, and persistent shell/media caching.

### Global Asset Delivery

The architecture is designed for high-resolution engineering assets delivered through AWS S3 and CloudFront. Project images, technical media, and video references can be served globally with low-latency CDN delivery while Firestore remains focused on metadata and queryable project structure.

## Tech Stack and Infrastructure

- Frontend: React 18, React Router v6, TypeScript, React-Bootstrap, CSS Modules.
- Internationalization: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- GIS and 3D: Leaflet, OpenStreetMap tiles, Three.js, GLTFLoader, OrbitControls.
- Backend and Database: Firebase Firestore.
- Storage and CDN: AWS S3, AWS CloudFront-ready asset delivery.
- PWA: Custom service worker, web manifest, offline fallback, installable shell.
- Development: Node.js 20.x compatible workflow, Create React App / `react-scripts`.

## Architectural Deep Dive

### Data Layer Abstraction

- [`src/Hooks/useProjectsServer.js`](src/Hooks/useProjectsServer.js): server-side Firestore filtering, cursor pagination, count aggregation, and cached cursor metadata.
- [`src/Hooks/fetchProjectsByCategory.tsx`](src/Hooks/fetchProjectsByCategory.tsx): category-based Firestore reads.
- [`src/Hooks/useData.ts`](src/Hooks/useData.ts): generic document/collection access through a reusable hook.
- [`src/Hooks/homeData.ts`](src/Hooks/homeData.ts): cached profile/home document reads.

### State and Cache Management

- [`src/utils/cacheStore.js`](src/utils/cacheStore.js): memory-first cache with persistent fallback and TTL invalidation.
- [`src/Hooks/useCachedAsyncData.js`](src/Hooks/useCachedAsyncData.js): hook abstraction that lets Firestore-backed UI reuse cached data without duplicating fetch lifecycle logic.

### Globalization Layer

- [`src/i18n/index.ts`](src/i18n/index.ts): i18next initialization and browser language detection.
- [`src/i18n/routes.ts`](src/i18n/routes.ts): localized route generation and language-aware path translation.
- [`src/i18n/localizedValue.ts`](src/i18n/localizedValue.ts): Firestore localization adapter for both current flat strings and future localized map fields.
- [`src/i18n/firestoreFallbacks.ts`](src/i18n/firestoreFallbacks.ts): Portuguese compatibility translations for existing Firestore content.

### PWA Layer

- [`public/service-worker.js`](public/service-worker.js): shell and media caching, offline navigation fallback, and cache cleanup.
- [`public/manifest.json`](public/manifest.json): installable application metadata.
- [`public/offline.html`](public/offline.html): offline fallback screen.
- [`src/pwa/registerServiceWorker.ts`](src/pwa/registerServiceWorker.ts): production service worker registration.

### Phase 2 Interactive GIS

- [`src/pages/Map/ProjectMap.jsx`](src/pages/Map/ProjectMap.jsx): interactive Leaflet/OpenStreetMap project location view with real map panning, zooming, numbered markers, popups, localized project links, and a fallback list for projects still missing coordinates.
- [`project-locations.template.json`](project-locations.template.json): coordinate intake template for collecting verified GPS data before updating Firestore.

### Phase 2 3D/BIM Viewer

- [`src/components/project/BimModelViewer.tsx`](src/components/project/BimModelViewer.tsx): Three.js-powered project detail viewer for optional `.glb` / `.gltf` model assets, with orbit controls, lighting, responsive resizing, metadata, and preview fallback handling.
- [`project-model-assets.template.json`](project-model-assets.template.json): intake template for collecting optimized `.glb` / `.gltf` model URLs, source metadata, file size labels, and preview images.

### Phase 3 Admin/CMS Foundation

- [`src/pages/Admin/AdminDashboard.jsx`](src/pages/Admin/AdminDashboard.jsx): protected Firebase Auth admin shell with project inventory and metadata editing.
- [`src/pages/Admin/useAdminAuth.ts`](src/pages/Admin/useAdminAuth.ts): Firebase Authentication listener, email/password sign-in, sign-out, and optional admin email allow-list.
- The current CMS slice supports project creation with `setDoc`, metadata updates with `updateDoc`, and explicit-confirmation deletion with `deleteDoc`.
- Admin writes are expected to be protected by Firestore rules using an `admins/{uid}` allow-list model.
- [`serverless/s3-presign/handler.mjs`](serverless/s3-presign/handler.mjs): AWS Lambda handler that verifies Firebase admins and returns temporary S3 upload URLs for high-resolution project images.

## Real-World Engineering Context

The application presents infrastructure and architecture work with direct connection to field delivery, public works, and technical coordination.

- Social Housing Infrastructure: the 120 social apartments project in Buco-Zau, funded by PIIM, including media coverage and construction progress context.
- Public Works and Access Infrastructure: the New Bridge over the Lucola River and its access roads.
- Urban Systems: stormwater drainage rehabilitation in Cabinda City.
- Aviation Infrastructure: pavement rehabilitation at Maria Mambo Café Airport.
- Multimedia Engineering Documentation: TV interview clips, high-resolution project galleries, and electronic model references such as the Mamaland / Tchiela Farm project.

## Installation

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

Create `.env.local` in the project root and provide Firebase/Web asset configuration:

```bash
GENERATE_SOURCEMAP=false
REACT_APP_BASE_URL=http://localhost:3000/
REACT_APP_FIREBASE_STORAGE_BASE_URL=...

REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_FIREBASE_MEASUREMENT_ID=...
REACT_APP_ADMIN_EMAILS=admin@example.com,second-admin@example.com
REACT_APP_S3_UPLOAD_ENDPOINT=https://your-api.example.com/admin/s3-presign
```

`REACT_APP_ADMIN_EMAILS` is optional but recommended. It gates the client admin UI to specific authenticated Firebase users. It is not a replacement for Firestore Security Rules.

`REACT_APP_S3_UPLOAD_ENDPOINT` should point to the protected Lambda/API Gateway endpoint in [`serverless/s3-presign`](serverless/s3-presign). It verifies the Firebase ID token and returns presigned S3 upload instructions. Do not expose AWS access keys in the React app.

## App Routes

- `/`: English project showcase.
- `/projects/:id`: English project details.
- `/map`: English GIS-ready project map.
- `/admin`: protected admin/CMS foundation.
- `/education`: education and certificates.
- `/about`: profile/about page.
- `/pt`: Portuguese project showcase.
- `/pt/projetos/:id`: Portuguese project details.
- `/pt/mapa`: Portuguese GIS-ready project map.
- `/pt/admin`: protected Portuguese admin/CMS foundation.
- `/pt/formacao`: Portuguese education route.
- `/pt/sobre`: Portuguese about route.

Legacy English routes remain available so existing links continue to work.

## Firestore Requirements

The app expects readable Firestore collections for:

- `projects`
- `category`
- `home`

For filtered project queries, Firestore may request composite indexes depending on production query shape. If Firestore returns an index link at runtime, create the suggested index in the Firebase console.

Firestore rules must allow the public read operations required by the portfolio:

- Project listing and detail reads.
- Category reads and count aggregation.
- Home/profile document reads.

Admin/CMS writes must be protected separately. A production Phase 3 deployment should enforce custom claims or an `admins/{uid}` allow-list in Firestore rules before enabling create, update, delete, or upload features.

Recommended admin allow-list shape:

```text
admins/{firebaseAuthUid}
```

Example admin document:

```json
{
  "email": "mbeua@outlook.com",
  "role": "admin"
}
```

The current CMS flow can create, update, and delete project metadata. Image upload UI is prepared for a presigned S3 endpoint, but it remains inactive until `REACT_APP_S3_UPLOAD_ENDPOINT` is configured.

## Admin Editable Fields

The protected admin dashboard can update:

- project records through create, update, and delete workflows
- localized title, organization, location, description, and outcome fields
- latitude and longitude metadata
- public visibility through `isVisible`
- image references stored as paths or URLs
- optional 3D/BIM model metadata through `modelAsset`
- high-resolution project image references after uploading through a secure presigned S3 endpoint

## S3 Upload Contract

The admin dashboard sends this request to `REACT_APP_S3_UPLOAD_ENDPOINT`:

```json
{
  "projectId": "construction-of-120-social-apartments-in-buco-zau",
  "files": [
    {
      "fileName": "site-photo.jpg",
      "contentType": "image/jpeg",
      "size": 2400000
    }
  ]
}
```

The request includes the Firebase ID token:

```text
Authorization: Bearer <firebase-id-token>
```

The endpoint should return either one upload object or an `uploads` array. PUT-style response:

```json
{
  "uploads": [
    {
      "method": "PUT",
      "uploadUrl": "https://s3-presigned-upload-url",
      "publicUrl": "https://cdn.example.com/projects/project-id/site-photo.jpg"
    }
  ]
}
```

POST-style response with S3 form fields is also supported:

```json
{
  "uploads": [
    {
      "url": "https://bucket.s3.amazonaws.com",
      "fields": {
        "key": "projects/project-id/site-photo.jpg",
        "policy": "...",
        "x-amz-signature": "..."
      },
      "publicUrl": "https://cdn.example.com/projects/project-id/site-photo.jpg"
    }
  ]
}
```

After upload, the returned `publicUrl` values are appended to the project image refs and saved to Firestore with the project metadata.

## Localized Content Model

The current application supports two Firestore content shapes.

Current flat string schema:

```json
{
  "title": "Construction of 120 Social Apartments in Buco-Zau"
}
```

Future localized map schema:

```json
{
  "title": {
    "en": "Construction of 120 Social Apartments in Buco-Zau",
    "pt": "Construção de 120 Apartamentos Sociais no Buco-Zau"
  }
}
```

The compatibility layer translates known flat English values today and will automatically prefer localized Firestore maps as the database schema evolves.

## 3D/BIM Content Model

Project detail pages support an optional model asset field. If this field is missing, the 3D section is not rendered.

```json
{
  "modelAsset": {
    "url": "models/tchiela-farm.glb",
    "title": "Tchiela Farm Electronic Model",
    "format": "GLB",
    "sizeLabel": "18 MB",
    "source": "SketchUp / Lumion",
    "previewImage": "models/tchiela-farm-preview.webp"
  }
}
```

When a valid `.glb` or `.gltf` URL is provided, the project detail page renders the model in-browser with Three.js orbit controls. If loading fails, the viewer falls back to the configured preview image when one exists.

## Future Technical Roadmap

- GIS Integration: interactive Leaflet/OpenStreetMap mapping is in place; next step is adding the remaining verified coordinates to Firestore from `project-locations.template.json`.
- 3D BIM Visualization: Three.js rendering is in place; next step is attaching production-optimized `.glb` / `.gltf` assets from `project-model-assets.template.json`.
- Enterprise Admin CMS: authenticated content management with Firebase Auth, Firestore rules, and controlled S3 uploads.
- Phase 3 first slice: Firebase Auth protected admin shell, project inventory, project create/update/delete workflows, metadata editing, and presigned S3 image upload integration are in place; storage policy hardening and operational audit safeguards remain future work.
- AI/LLM Assistant: RAG-based search over project documents, site reports, and technical specifications.
- Computer Vision: automated tagging and progress verification for QHSE and construction milestone tracking.

## Why This Repository Matters

This project demonstrates how frontend engineering, cloud data modeling, construction-domain knowledge, and performance architecture can come together in a practical technical showcase. The result is a portfolio system that communicates both engineering delivery experience and full-stack implementation judgment.
