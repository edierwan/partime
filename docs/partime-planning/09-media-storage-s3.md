# Media Storage + S3

## Storage Modes

Partime stores uploads through `src/lib/uploads.ts`.

- S3-compatible mode when all `S3_*` variables are configured.
- Local mode under `LOCAL_UPLOAD_ROOT`, served through `/api/uploads/*`, for development or single-node deployments.

SeaweedFS production values:

```text
S3_ENDPOINT=https://s3api.getouch.co
S3_BUCKET=partime-prod
```

The browser console is `https://s3.getouch.co`; app traffic should use the S3 API endpoint.

## Supported Media

| Use | Types | Max size |
|---|---|---|
| Profile image | JPEG, PNG, WEBP | 2MB |
| Portfolio image | JPEG, PNG, WEBP | 5MB |
| Portfolio video | MP4, WEBM | 50MB |
| Employer logo | JPEG, PNG, WEBP | 2MB |
| Job image/video | JPEG, PNG, WEBP, MP4, WEBM | 5MB image, 50MB video |

SVG is intentionally not accepted.

## Object Key Layout

```text
partime/part-timers/{partTimerId}/profile/{filename}
partime/part-timers/{partTimerId}/portfolio/{mediaId}/{filename}
partime/employers/{tenantId}/logo/{filename}
partime/jobs/{jobId}/cover/{filename}
partime/jobs/{jobId}/gallery/{filename}
partime/temp/{uuid}/{filename}
```

The upload proxy still allows legacy `part-timer-profiles/*` keys so previously uploaded profile photos remain readable.

## Admin Monitoring

`/admin/media` lists part-timer portfolio media, job media, and tenant logos. Media objects remain private when `S3_PUBLIC_BASE_URL` is blank and are served through the app proxy.