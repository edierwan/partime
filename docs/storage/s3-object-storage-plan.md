# Partime S3 Object Storage

## Production Service

- Provider: GetTouch SeaweedFS S3 gateway
- S3 API endpoint: `https://s3api.getouch.co`
- Browser console: `https://s3.getouch.co`
- Internal service: `seaweed-s3:8333` on the `getouch-edge` Docker network
- Bucket: `partime-prod`
- App identity: `partime_prod_app`
- Scope: `Read:partime-prod`, `List:partime-prod`, `Tagging:partime-prod`, `Write:partime-prod`

The root/admin SeaweedFS credential remains only in the SeaweedFS `s3.json` config and must not be copied into Partime, Coolify, commits, screenshots, or logs.

## Partime Environment

Use these keys in Coolify for the Partime app:

```dotenv
S3_ENDPOINT=https://s3api.getouch.co
S3_REGION=us-east-1
S3_BUCKET=partime-prod
S3_ACCESS_KEY_ID=partime_prod_app
S3_SECRET_ACCESS_KEY=<dedicated Partime secret from VPS secure env file>
S3_PUBLIC_BASE_URL=
LOCAL_UPLOAD_ROOT=/app/uploads/partime
```

Leave `S3_PUBLIC_BASE_URL` blank for private buckets. Partime stores profile image keys under `part-timer-profiles/...` and serves them through `/api/uploads/*` using the app credentials.

## VPS Notes

The dedicated Partime env file is stored on the VPS at:

```text
/home/deploy/apps/getouch.co/infra/seaweedfs/partime-prod.env
```

It is mode `600` and contains the dedicated secret. Copy only the Partime env values into Coolify; do not reuse or expose the SeaweedFS admin credential.

## Verification

A signed S3 smoke test has been run against `partime-prod` using only `partime_prod_app`:

- `ListBucket` on `partime-prod`
- `PutObject` to `temp-uploads/healthcheck.txt`
- `GetObject` for the healthcheck body
- `ListBucket` with healthcheck prefix
- `DeleteObject` for cleanup

The temporary object was deleted after verification.
