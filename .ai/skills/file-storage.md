---
name: "file-storage"
description: "File uploads and storage in NestJS (AWS S3, DigitalOcean Spaces, Cloudinary, local filesystem): validation, signed URLs, metadata records. Use when implementing uploads, downloads, avatars or attachments."
---

# File Storage Skill

Provider comes from `state.stack.storageProvider` (Discovery Q8).

## Architecture

- `StorageModule` exposes a `StorageService` (`upload`, `getSignedUrl`, `delete`) over a `StorageProvider` interface with adapters `s3` (also Spaces via `S3_ENDPOINT`), `cloudinary`, `local`. Business modules never import SDKs.
- Persist a `FileAsset` record for each upload: `id`, `tenantId?`, `ownerId`, `key`, `originalName`, `mimeType`, `size`, `checksum`, `createdAt`. The database stores keys/metadata only — never file bytes.
- Object keys are generated server-side: `<tenantId?>/<yyyy>/<mm>/<uuid>.<ext>`. Never use the client's file name in a path.

## Upload paths

- **Preferred (S3/Spaces/Cloudinary)**: client requests a pre-signed upload URL from the API (API validates mime type, size limit, and quota) → uploads directly → calls a confirm endpoint (or storage event) → API verifies the object and creates the `FileAsset`.
- **Proxy upload (local, or small files)**: `FileInterceptor` with `multer` limits (`fileSize`), memory/disk storage.

## Validation (mandatory)

- Allow-list mime types and extensions per use case; verify magic bytes (`file-type`), not just the extension.
- Enforce max size at the interceptor *and* at the signed URL policy; scan for malware if the PRD handles untrusted documents.
- Images: strip EXIF, generate thumbnails in a queue job.

## Access control

- Buckets are **private**; serve via short-lived signed URLs (5–15 min) after an authorization check on the `FileAsset`. Public assets only via an explicit `public/` prefix.
- Local provider: files outside the web root, served through a guarded controller that streams with `Content-Disposition` and correct `Content-Type`; protect against path traversal by resolving the key within `UPLOAD_DIR`.
- Deleting an owner/tenant deletes or archives its files in a job.

## Config

S3/Spaces: `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Cloudinary: `CLOUDINARY_URL`. Local: `UPLOAD_DIR`. CORS on the bucket allows only `CORS_ORIGINS`.

## Testing

Provider stubbed with an in-memory adapter; test oversize, wrong mime/spoofed extension, cross-tenant access, expired signed URL behavior.
