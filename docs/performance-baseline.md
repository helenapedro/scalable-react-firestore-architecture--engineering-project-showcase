# Performance Baseline

## Purpose

This document captures the performance baseline for the Engineering Project Showcase and defines the measurement process for future regressions. The main known performance win is the move from a media path that could make image-heavy project pages take around one minute to load, to an S3 + CloudFront + progressive gallery strategy that loads comparable pages in seconds.

The goal is to turn that observed improvement into repeatable evidence:

- what was measured
- where it was measured
- which route was tested
- what changed
- whether future changes preserve the same performance standard

## Current Known Baseline

| Area | Before CDN / Gallery Improvements | Current Target |
| --- | --- | --- |
| Image-heavy project detail load | Around 1 minute for some pages | A few seconds for comparable pages |
| Media delivery path | Slower origin path with large assets competing for bandwidth | S3 origin with CloudFront delivery |
| Gallery rendering | Too many images could compete during initial load | Initial batch of 6 images, then "Show More Images" |
| Browser image behavior | More eager media pressure | `loading="lazy"` and `decoding="async"` |
| Metadata delivery | Firestore-backed reads | Firestore reads with TTL cache and paginated listing |

The current baseline should be validated with fresh measurements before using the numbers in external technical claims.

## Initial Production Audit: 2026-06-26

This audit is a first baseline pass using repository data and production HTTP checks. It is not a full Lighthouse/WebPageTest run yet.

### Local Media Inventory

Source: `projects-normalized-export.json`.

| Metric | Value |
| --- | --- |
| Project count | 16 |
| Total project images | 141 |
| Image reference shape | 141 relative paths, 0 absolute URLs |
| Direct S3 URLs in export | 0 |
| CloudFront URLs in export | 0 |

The exported data uses relative image references, which supports the recommended URL strategy: resolve media paths at runtime through `REACT_APP_CDN_BASE_URL`.

Largest galleries in the current export:

| Project | Image Count |
| --- | ---: |
| Renovation and Expansion of a 2-Story Residence | 15 |
| Trainee Program STARTME @2021_8th Edition | 15 |
| 3-Story Multifunctional Building | 12 |
| Construction of Access Roads to the New Bridge Over the Lucola River | 12 |
| Construction of the New Bridge Over the Lucola River | 12 |
| Architectural Project - Single-Family Home T5 | 9 |
| Construction of 120 Social Apartments in Buco-Zau | 9 |
| Executive and Structural Project of a T4 Single-Family Home | 9 |

### Production HTTP Checks

Base URL: `https://zepedro-portfolio.hmpedro.com/`

| URL | Status | Content Type | Size | Server / Platform | Cache-Control |
| --- | ---: | --- | ---: | --- | --- |
| `/` | 200 | `text/html` | 5,999 chars | LiteSpeed / Hostinger | Not set |
| `/projects/renovation-and-expansion-of-a-2-story-residence` | 200 | `text/html` | 5,999 chars | LiteSpeed / Hostinger | Not set |
| `/asset-manifest.json` | 200 | `application/json` | 2,179 chars | LiteSpeed / Hostinger | Not set |
| `/asset-manifest.en.json` | 200 | `application/json` | 185 chars | LiteSpeed / Hostinger | Not set |

Primary build assets from `asset-manifest.json`:

| Asset | Size | Content Type | Cache-Control |
| --- | ---: | --- | --- |
| `/static/js/main.96d7d1b9.js` | 3,109,835 chars | `application/x-javascript` | `public, max-age=604800` |
| `/static/css/main.51a3669d.css` | 388,460 chars | `text/css` | `public, max-age=604800` |
| `/static/media/bg0.623f559fde2521cca5d6.webp` | 808,526 chars | `image/webp` | `public, max-age=604800` |

Initial observations:

- React routes return the same SPA shell HTML, which is expected for the current client-rendered deployment.
- Static build assets are served by Hostinger/LiteSpeed, not CloudFront.
- The main JavaScript bundle is large enough to track as a secondary performance concern after the media baseline.
- Static build assets use a 7-day cache TTL; hashed asset names could support longer cache TTLs if the hosting platform allows it.

### CDN Media Checks

Configured local CDN base URL: `https://dh09x5tu10bt3.cloudfront.net/`

Sample media responses:

| Image | Status | Size | Content Type | Delivery Signal | Cache-Control |
| --- | ---: | ---: | --- | --- | --- |
| `rl1.jpg` | 200 | 66,681 chars | `image/jpeg` | `Via: ... cloudfront.net (CloudFront)`, `Server: AmazonS3` | Not set |
| `rl2.jpg` | 200 | 80,314 chars | `image/jpeg` | `Via: ... cloudfront.net (CloudFront)`, `Server: AmazonS3` | Not set |
| `rl3.jpg` | 200 | 69,018 chars | `image/jpeg` | `Via: ... cloudfront.net (CloudFront)`, `Server: AmazonS3` | Not set |
| `1.jpg` | 200 | 97,600 chars | `image/jpeg` | `Via: ... cloudfront.net (CloudFront)`, `Server: AmazonS3` | Not set |
| `m0.jpeg` | 200 | 68,540 chars | `image/jpeg` | `Via: ... cloudfront.net (CloudFront)`, `Server: AmazonS3` | Not set |

Initial observations:

- Sample project images are correctly delivered through CloudFront with S3 as origin.
- Existing sampled objects do not expose explicit `Cache-Control` headers.
- The current presigned upload handler sets `Cache-Control: public, max-age=31536000, immutable` for new uploads, but older objects may need a metadata review or replacement strategy.
- Sampled image sizes are already relatively small, which suggests the current performance win came from both delivery path and controlled loading behavior, not only raw compression.

### Current Limitations

- This pass did not capture Lighthouse, WebPageTest, FCP, LCP, TBT, CLS, or browser waterfall timings.
- Browser automation was unavailable during this pass because the in-app browser webview did not attach.
- The next baseline pass should use Chrome DevTools or Lighthouse to confirm user-facing timing metrics.

## Formal Production Measurement: 2026-06-27

Method:

- Tooling: local Chrome headless through Chrome DevTools Protocol.
- Script: `scripts/measure-production-performance.mjs`.
- Reports:
  - `docs/performance-reports/production-performance-summary.json`
  - `docs/performance-reports/production-performance-cdp.json`
- Cache: browser cache disabled through CDP.
- Notes: TBT is approximated from observed long tasks. Metrics may differ from Lighthouse because this is a direct CDP run, not a Lighthouse audit with Lighthouse throttling/scoring.

### Route Summary

| Route | FCP | LCP | TBT Approx. | CLS | Requests | Transfer | Image Requests | DOM Images | Lazy Images | Async Images |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 1,148 ms | 2,672 ms | 287 ms | 0.8605 | 106 | 11,140,560 bytes | 74 | 73 | 0 | 0 |
| `/projects/renovation-and-expansion-of-a-2-story-residence` | 772 ms | 1,544 ms | 117 ms | 0.8126 | 31 | 1,171,841 bytes | 17 | 16 | 0 | 0 |
| `/projects/trainee-program-startme-2021-8th-edition` | 692 ms | 2,084 ms | 402 ms | 0.8126 | 31 | 1,154,883 bytes | 17 | 16 | 0 | 0 |

### Host Breakdown

Homepage:

- `zepedro-portfolio.hmpedro.com`: 9 requests.
- `firestore.googleapis.com`: 22 requests.
- `dh09x5tu10bt3.cloudfront.net`: 73 requests.
- `fonts.googleapis.com`: 1 request.
- `drive.google.com`: 1 request.

Renovation project route:

- `zepedro-portfolio.hmpedro.com`: 9 requests.
- `firestore.googleapis.com`: 6 requests.
- `dh09x5tu10bt3.cloudfront.net`: 15 requests.
- `fonts.googleapis.com`: 1 request.

STARTME project route:

- `zepedro-portfolio.hmpedro.com`: 9 requests.
- `firestore.googleapis.com`: 6 requests.
- `dh09x5tu10bt3.cloudfront.net`: 15 requests.
- `fonts.googleapis.com`: 1 request.

### Largest Waterfall Entries

Homepage:

| Type | Path | Host | Transfer | Duration |
| --- | --- | --- | ---: | ---: |
| Image | `/120-Apart-BZ-01.jpg` | `dh09x5tu10bt3.cloudfront.net` | 3,577,446 bytes | 3,665 ms |
| Image | `/120-Apart-BZ-02.jpg` | `dh09x5tu10bt3.cloudfront.net` | 1,637,082 bytes | 3,191 ms |
| Image | `/120-Apart-BZ-04.jpg` | `dh09x5tu10bt3.cloudfront.net` | 1,122,706 bytes | 4,198 ms |
| Script | `/static/js/main.ab474a8d.js` | `zepedro-portfolio.hmpedro.com` | 934,470 bytes | 763 ms |
| Image | `/static/media/bg0.623f559fde2521cca5d6.webp` | `zepedro-portfolio.hmpedro.com` | 809,467 bytes | 952 ms |

Renovation project route:

| Type | Path | Host | Transfer | Duration |
| --- | --- | --- | ---: | ---: |
| Image | `/cd6.jpg` | `dh09x5tu10bt3.cloudfront.net` | 178,865 bytes | 182 ms |
| Image | `/cd8.jpg` | `dh09x5tu10bt3.cloudfront.net` | 117,469 bytes | 224 ms |
| Image | `/cd10.jpg` | `dh09x5tu10bt3.cloudfront.net` | 108,622 bytes | 314 ms |
| Image | `/cd9.jpg` | `dh09x5tu10bt3.cloudfront.net` | 92,494 bytes | 291 ms |
| Image | `/cd4.jpg` | `dh09x5tu10bt3.cloudfront.net` | 88,910 bytes | 197 ms |

STARTME project route:

| Type | Path | Host | Transfer | Duration |
| --- | --- | --- | ---: | ---: |
| Image | `/st9.jpg` | `dh09x5tu10bt3.cloudfront.net` | 130,716 bytes | 240 ms |
| Image | `/st7.jpg` | `dh09x5tu10bt3.cloudfront.net` | 107,045 bytes | 230 ms |
| Image | `/st4.jpg` | `dh09x5tu10bt3.cloudfront.net` | 102,988 bytes | 202 ms |
| Image | `/st12.jpg` | `dh09x5tu10bt3.cloudfront.net` | 97,667 bytes | 274 ms |
| Image | `/st8.jpg` | `dh09x5tu10bt3.cloudfront.net` | 76,515 bytes | 321 ms |

### Findings

1. CloudFront delivery is active for project media. The measured heavy project routes each made 15 requests to `dh09x5tu10bt3.cloudfront.net`.
2. Image-heavy project detail pages are currently in the "seconds, not minutes" target range. The measured detail routes transferred about 1.15-1.17 MB and reached LCP between 1.54s and 2.08s in the latest run.
3. The homepage is heavier than the detail pages: 11.14 MB transferred and 74 image requests in the latest run. This should be treated as a follow-up optimization target.
4. The measured production DOM reported 0 images with `loading="lazy"` and 0 with `decoding="async"` on all measured routes. This suggests the deployed route/component path may not be using the newer lazy/progressive gallery implementation, or those attributes are not present in the production build currently deployed.
5. The two heavy project routes loaded 15 CloudFront image requests each during the measurement. That means current production behavior is still loading the full measured galleries, not only a first batch of 6 images.
6. The JavaScript bundle and static visual assets are secondary performance targets. The main script and homepage background are among the largest non-gallery resources.

### Follow-Up Actions

- Confirm which project detail component is active in production and align it with `ProjectMediaGallery` progressive rendering.
- Add or restore `loading="lazy"` and `decoding="async"` in the active production image paths.
- Re-run this measurement after frontend hardening to confirm image request count drops on first load.
- Optimize homepage image strategy separately from project detail pages.
- Consider code splitting or bundle analysis for the main JavaScript bundle.
- Reduce CLS on homepage and the renovation detail route by reserving stable image/container dimensions.

## Bridge Verification: Local Build Gallery Hardening

Method:

- Built locally with `npm run build`.
- Served the production build at `http://localhost:4173`.
- Re-ran `scripts/measure-production-performance.mjs` with `PERF_BASE_URL=http://localhost:4173` and `PERF_REPORT_LABEL=local-bridge`.
- Reports:
  - `docs/performance-reports/local-bridge-performance-summary.json`
  - `docs/performance-reports/local-bridge-performance-cdp.json`

### Production vs Local Bridge Detail Routes

| Route | Environment | Requests | Transfer | Image Requests | DOM Images | Lazy Images | Async Images |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Renovation detail | Current production | 31 | 1,171,841 bytes | 17 | 16 | 0 | 0 |
| Renovation detail | Local bridge build | 17 | 249,384 bytes | 6 | 7 | 6 | 7 |
| STARTME detail | Current production | 31 | 1,154,883 bytes | 17 | 16 | 0 | 0 |
| STARTME detail | Local bridge build | 20 | 264,186 bytes | 6 | 7 | 6 | 7 |

### UI Verification

Local build verification on `/projects/renovation-and-expansion-of-a-2-story-residence`:

- Initial gallery render: 6 gallery images.
- Initial gallery lazy images: 6.
- Initial async images: 7, including the hero image.
- "Show More Images" button present: yes.
- After clicking "Show More Images": 12 gallery images, all lazy.
- Gallery modal preview: opens with 1 image.

### Bridge Result

The bridge hardening validates the intended architecture on the built app:

- The active project detail route now renders only the first gallery batch.
- Gallery images include `loading="lazy"` and `decoding="async"`.
- Full gallery rendering is deferred until user action.
- Existing `imageRefs` / `media.images` compatibility is preserved.

## Routes to Measure

Use one homepage route, one listing route, and at least two image-heavy project detail routes.

| Route Type | URL | Reason |
| --- | --- | --- |
| Home | `https://zepedro-portfolio.hmpedro.com/` | Measures shell, profile/media, and first impression. |
| Project listing | `https://zepedro-portfolio.hmpedro.com/projects` | Measures project query, listing rendering, and pagination behavior. |
| Heavy project detail 1 | `TBD` | Should represent one of the largest galleries. |
| Heavy project detail 2 | `TBD` | Should represent another large gallery or mobile-sensitive page. |
| Portuguese route | `https://zepedro-portfolio.hmpedro.com/pt` | Confirms localized route behavior. |

Suggested large-gallery candidates from the exported dataset:

- Renovation and Expansion of a 2-Story Residence: 15 images.
- Trainee Program STARTME @2021_8th Edition: 15 images.
- 3-Story Multifunctional Building: 12 images.
- Construction of Access Roads to the New Bridge Over the Lucola River: 12 images.
- Construction of the New Bridge Over the Lucola River: 12 images.

## Measurement Tools

Use at least two tools when capturing baseline evidence.

### Chrome DevTools

Use the Network and Performance tabs.

Capture:

- total load time
- transferred bytes
- resource count
- image request count
- largest image files
- whether images are served from CloudFront
- waterfall shape before and after scrolling/clicking "Show More Images"

Recommended conditions:

- hard reload
- cache disabled
- fast 4G or slow 4G throttling
- desktop viewport and mobile viewport

### Lighthouse

Capture:

- Performance score
- First Contentful Paint
- Largest Contentful Paint
- Total Blocking Time
- Cumulative Layout Shift
- Speed Index
- Opportunities related to images and caching

Run separate reports for:

- desktop
- mobile
- homepage
- one image-heavy detail page

### WebPageTest

Use WebPageTest when possible to capture more realistic network conditions and filmstrip behavior.

Capture:

- first view
- repeat view
- fully loaded time
- LCP
- bytes by content type
- CDN/cache behavior where visible

## Metrics to Track

### Page-Level Metrics

| Metric | Target |
| --- | --- |
| Largest Contentful Paint | Under 2.5s on good connection; under 4s on constrained mobile where practical. |
| First Contentful Paint | Under 1.8s on good connection. |
| Total Blocking Time | Under 200ms where practical. |
| Cumulative Layout Shift | Under 0.1. |
| Initial transferred bytes on project detail | Should stay small enough that only first-batch media loads initially. |
| Fully loaded time for heavy gallery | Seconds, not one minute. |

### Media-Specific Metrics

| Metric | Target |
| --- | --- |
| Initial gallery image count | 6 visible images by default. |
| Initial full-resolution image downloads | Avoid downloading all gallery originals on first render. |
| Image delivery domain | CloudFront or configured CDN domain. |
| Largest image size | Flag anything above the agreed upload budget. |
| Cache headers | Long-lived immutable headers for versioned media. |
| CDN cache hit ratio | Track in CloudFront after enough traffic exists. |

## Performance Budgets

These budgets should guide implementation and code review.

| Budget | Rule |
| --- | --- |
| Gallery initial render | Render no more than 6 media items initially unless a product requirement changes. |
| Image loading | Gallery images must use lazy loading and async decoding unless deliberately excluded. |
| Original image use | Use originals for modal/full preview, not for every thumbnail grid when thumbnails exist. |
| Upload size | Default maximum should remain at or below the serverless `MAX_UPLOAD_BYTES` setting. Current handler default is 15 MB. |
| Firestore listing | Project list must use paginated queries, not full collection load. |
| Firestore cache | Public query results should use TTL caching where freshness allows. |
| CDN path | Public project media should resolve through CloudFront/CDN, not direct S3 URLs, unless explicitly documented. |

## Measurement Template

Use this template for each measurement run.

```md
## Measurement: <route name>

- Date:
- Tester:
- URL:
- Git commit / deployment:
- Browser:
- Device:
- Network profile:
- Cache state:
- Tool:

### Results

- FCP:
- LCP:
- TBT:
- CLS:
- Speed Index:
- Fully loaded:
- Total transferred:
- Number of requests:
- Image requests:
- Largest image:
- CDN domain confirmed:

### Notes

- What loaded first:
- Whether all gallery images loaded immediately:
- Whether "Show More Images" triggered additional requests:
- Issues found:
- Follow-up action:
```

## Before / After Evidence

Add screenshots or exported reports here when available.

| Evidence | Location |
| --- | --- |
| Before optimization screenshot | `TBD` |
| After optimization screenshot | `TBD` |
| Lighthouse report | `TBD` |
| DevTools waterfall | `TBD` |
| WebPageTest report | `TBD` |

## Regression Checklist

Run this checklist before media or gallery changes are released.

- [ ] Project listing still uses Firestore pagination.
- [ ] Project detail does not render all gallery images immediately.
- [ ] Gallery images still use `loading="lazy"`.
- [ ] Gallery images still use `decoding="async"`.
- [ ] Project media resolves through the CDN base URL or absolute CDN URLs.
- [ ] Large images are not imported into the React bundle.
- [ ] Service worker does not cache stale shell/media in a way that hides new deployments.
- [ ] Admin upload still enforces file type and size validation.
- [ ] Lighthouse or DevTools check was captured for at least one heavy project page.
