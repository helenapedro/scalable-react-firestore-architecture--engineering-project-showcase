# Operations Runbook

## Purpose

This runbook documents routine operations and incident handling for the Engineering Project Showcase. It focuses on content/media operations, performance verification, CDN behavior, Firestore metadata, and admin upload workflows.

## Routine Checks

Run these checks after deployments, content imports, or media-heavy updates.

- Open the production homepage.
- Open the project listing page.
- Open at least one heavy project detail page.
- Confirm images load from the configured CDN domain.
- Confirm the first gallery batch renders before additional gallery images.
- Click "Show More Images" and confirm additional media loads.
- Open one image modal and confirm the full image displays.
- Switch to Portuguese routes and confirm localized content still renders.
- Check the browser console for runtime errors.
- Check the Network tab for failed image requests.

## Deployment Verification

### Frontend

1. Confirm environment variables are configured.
2. Build the application.
3. Deploy the build output.
4. Confirm route rewrites are active for React Router.
5. Confirm `manifest.json`, favicon, and service worker files are served.
6. Confirm the latest static assets are served after deployment.
7. Hard-refresh the browser and test homepage/listing/detail routes.

### CDN / Media

1. Open a known image URL.
2. Confirm the URL uses the CDN domain or configured media domain.
3. Confirm the image returns `200`.
4. Confirm `Content-Type` matches the image.
5. Confirm cache headers are present for immutable media.
6. Confirm a project page does not request every gallery image immediately.

### Admin Upload

1. Sign in as an authorized admin.
2. Open the admin dashboard.
3. Select a test image under the upload size limit.
4. Request upload through the UI.
5. Confirm the presign endpoint returns an upload URL.
6. Confirm the browser uploads the file successfully.
7. Confirm the returned public URL is appended to the project image references.
8. Save the project.
9. Open the public project page and confirm the image renders.

## Common Incidents

### Incident: Image Does Not Load

Symptoms:

- Broken image icon.
- 403/404 image request.
- Modal opens with missing image.

Checks:

1. Inspect the image URL in the browser Network tab.
2. Confirm whether the URL is absolute or relative.
3. Confirm `REACT_APP_CDN_BASE_URL` is set if relative paths are used.
4. Open the image URL directly in the browser.
5. Check whether the object exists in S3.
6. Check whether CloudFront can access the S3 origin.
7. Check whether the object key contains unsafe or unexpected characters.
8. Check Firestore metadata for malformed image references.

Resolution:

- Fix the Firestore image reference if the path is wrong.
- Re-upload the image if the object does not exist.
- Fix CloudFront origin permissions if the object exists but CDN returns 403.
- Use a new immutable key rather than overwriting an existing cached object.

### Incident: Project Page Loads Slowly

Symptoms:

- Project detail takes too long to become usable.
- Network tab shows many image requests at once.
- Large images download before user interaction.

Checks:

1. Confirm the gallery still starts with the expected batch size.
2. Confirm images include `loading="lazy"`.
3. Confirm images include `decoding="async"`.
4. Confirm large images are not imported into the JS bundle.
5. Confirm media URLs are served through CloudFront.
6. Check image sizes.
7. Check if thumbnails are unavailable and full images are used for grid rendering.

Resolution:

- Restore progressive gallery rendering.
- Optimize oversized images.
- Add or regenerate thumbnails.
- Confirm CDN cache behavior.
- Capture a new performance baseline after the fix.

### Incident: Admin Upload Fails

Symptoms:

- Upload button returns an error.
- S3 upload signing fails.
- Browser upload to S3 returns 403 or 400.

Checks:

1. Confirm `REACT_APP_S3_UPLOAD_ENDPOINT` is configured.
2. Confirm the admin user is signed in.
3. Confirm the Firebase ID token is included in the request.
4. Confirm the user exists in `admins/{uid}`.
5. Confirm the file type starts with `image/`.
6. Confirm the file size is under `MAX_UPLOAD_BYTES`.
7. Confirm serverless environment variables are set:
   - `AWS_REGION`
   - `S3_BUCKET`
   - `PUBLIC_ASSET_BASE_URL`
   - `FIREBASE_PROJECT_ID`
8. Check serverless logs for validation or permission errors.

Resolution:

- Add the admin user to the allow-list if appropriate.
- Reduce image size if it exceeds upload limits.
- Fix missing serverless environment variables.
- Fix IAM permissions for S3 `PutObject`.
- Retry with a new presigned URL because old URLs expire.

### Incident: Stale Image or Old App Version

Symptoms:

- Browser displays an old image.
- New deployment does not appear.
- Different users see different versions.

Checks:

1. Confirm whether the object key changed.
2. Confirm CloudFront cache behavior.
3. Confirm service worker cache status.
4. Hard-refresh the page.
5. Test in an incognito/private window.

Resolution:

- Prefer uploading a replacement image under a new key.
- Update Firestore to point to the new key.
- Invalidate CloudFront only if the same URL must be reused.
- Bump service worker cache version when shell assets change significantly.

### Incident: Firestore Reads Spike

Symptoms:

- Higher-than-expected Firestore usage.
- Listing pages feel slower.
- Repeated reads for the same routes.

Checks:

1. Confirm listing still uses `useProjectsServer`.
2. Confirm query cache is active.
3. Confirm TTL has not been set too low.
4. Confirm code is not loading full project collections unnecessarily.
5. Check category filter behavior.

Resolution:

- Restore paginated query behavior.
- Use count aggregation for totals.
- Re-enable TTL caching where appropriate.
- Avoid fetching detail documents in listing cards unless needed.

## Performance Measurement Procedure

Use this process when updating `docs/performance-baseline.md`.

1. Open Chrome DevTools.
2. Disable cache in the Network tab.
3. Select a network profile, preferably fast 4G and slow 4G.
4. Hard reload the route.
5. Capture total transferred bytes, total requests, image requests, and load time.
6. Run Lighthouse for desktop and mobile.
7. Save screenshots or exported reports.
8. Record results in the measurement template.
9. Compare against performance budgets.

## Firestore Content Operations

### Update Project Metadata

1. Sign in to the admin dashboard.
2. Select the project.
3. Edit localized title, organization, location, context, outcome, coordinates, media references, or model metadata.
4. Save changes.
5. Confirm public page renders correctly.
6. Confirm cache invalidation occurs for edited project records.

### Delete Project

Deletion should be rare.

1. Confirm the project is no longer needed.
2. Export or back up metadata if required.
3. Use the explicit confirmation flow.
4. Confirm listing and detail routes no longer expose the project.
5. Decide whether media objects should remain archived in S3 or be removed separately.

## CDN Operations

### When to Invalidate CloudFront

Use invalidation only when:

- the same URL must serve new content immediately
- an incorrect asset was published at a public URL
- cache headers make waiting impractical

Prefer not to invalidate when:

- a new asset can be uploaded under a new immutable key
- Firestore can simply point to the new key
- the cached asset is still valid

### CDN Verification

Check:

- status code
- `Content-Type`
- cache headers
- response domain
- whether repeated loads become faster
- whether image URLs are direct S3 URLs by mistake

## Security Checklist

- [ ] AWS keys are not present in frontend environment variables.
- [ ] Uploads require Firebase authentication.
- [ ] Uploads require admin authorization.
- [ ] Presigned URLs have short TTLs.
- [ ] Upload size limit is enforced.
- [ ] MIME type validation is enforced.
- [ ] Firestore write rules protect admin-only records.
- [ ] Public reads expose only intended project data.
- [ ] CORS is restricted to expected origins where practical.

## Release Checklist

- [ ] Build passes.
- [ ] Homepage loads.
- [ ] Project listing loads.
- [ ] Heavy project detail page loads in seconds.
- [ ] Images are delivered through CDN.
- [ ] Gallery renders first batch only.
- [ ] "Show More Images" works.
- [ ] Admin auth still works.
- [ ] Admin upload endpoint behavior is known: enabled, disabled, or intentionally unconfigured.
- [ ] Portuguese routes still render.
- [ ] Browser console has no critical errors.
- [ ] Performance baseline updated if media behavior changed.

## Contacts and Ownership

| Area | Owner |
| --- | --- |
| Frontend application | Project maintainer |
| Firestore metadata | Project maintainer |
| AWS S3 / CloudFront | Project maintainer |
| Admin authorization | Project maintainer |
| Performance baseline | Project maintainer |
| Content updates | Project maintainer / approved admin |

