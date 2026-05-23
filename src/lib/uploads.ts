import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PORTFOLIO_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const PORTFOLIO_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);
const LOCAL_UPLOAD_ROOT = process.env.LOCAL_UPLOAD_ROOT || '/app/uploads/partime';
const LOCAL_UPLOAD_PREFIX = '/api/uploads';
const ALLOWED_UPLOAD_PREFIXES = ['partime/', 'part-timer-profiles/', 'partime/staff-profiles/'];

export type StoredUploadResult = {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'IMAGE' | 'VIDEO';
};

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
  );
}

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const forcePathStyle = Boolean(endpoint && !/amazonaws\.com/i.test(endpoint));
  return new S3Client({
    endpoint,
    region: process.env.S3_REGION,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  });
}

function ensureSafeRelativeKey(key: string): string {
  const normalized = key.replace(/^\/+/, '');
  const resolved = path.posix.normalize(normalized);
  if (resolved.startsWith('..')) throw new Error('Invalid upload key');
  return resolved;
}

function resolveLocalUploadPath(key: string): string {
  const relative = ensureSafeRelativeKey(key);
  const absolute = path.resolve(LOCAL_UPLOAD_ROOT, relative);
  const root = path.resolve(LOCAL_UPLOAD_ROOT);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new Error('Invalid upload path');
  }
  return absolute;
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename || '').toLowerCase();
  const base = path.basename(filename || 'upload', ext).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'upload'}${ext || '.bin'}`;
}

function isAllowedUploadKey(key: string): boolean {
  return ALLOWED_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function resolveS3PublicUrl(key: string): string {
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (publicBase) return `${publicBase}/${key}`;
  return localUploadUrl(key);
}

export function localUploadUrl(key: string): string {
  const relative = ensureSafeRelativeKey(key);
  return `${LOCAL_UPLOAD_PREFIX}/${relative.split('/').map(encodeURIComponent).join('/')}`;
}

export async function validateProfileImage(file: File | null | undefined): Promise<void> {
  if (!file || file.size === 0) return;
  if (!PROFILE_IMAGE_TYPES.has(file.type)) throw new Error('Profile image must be JPG, PNG, or WEBP');
  if (file.size > PROFILE_IMAGE_MAX_BYTES) throw new Error('Profile image must be 2MB or smaller');
}

export async function validateMarketplaceMedia(file: File | null | undefined): Promise<'IMAGE' | 'VIDEO'> {
  if (!file || file.size === 0) throw new Error('File is required');
  if (!PORTFOLIO_MEDIA_TYPES.has(file.type)) throw new Error('Only JPG, PNG, WEBP, MP4, or WEBM files are supported');
  const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
  const maxBytes = mediaType === 'VIDEO' ? PORTFOLIO_VIDEO_MAX_BYTES : PORTFOLIO_IMAGE_MAX_BYTES;
  if (file.size > maxBytes) throw new Error(mediaType === 'VIDEO' ? 'Video must be 50MB or smaller' : 'Image must be 5MB or smaller');
  return mediaType;
}

async function saveUploadToKey(file: File, key: string): Promise<StoredUploadResult> {
  const safeFilename = sanitizeFilename(file.name);
  const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isS3Configured()) {
    await s3Client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
  } else {
    const absolute = resolveLocalUploadPath(key);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, buffer);
  }

  return {
    key,
    url: isS3Configured() ? resolveS3PublicUrl(key) : localUploadUrl(key),
    filename: safeFilename,
    mimeType: file.type,
    sizeBytes: file.size,
    mediaType,
  };
}

export async function saveStaffProfileImage({ staffId, file }: { staffId: string; file: File }) {
  await validateProfileImage(file);

  const timestamp = Date.now();
  const safeFilename = sanitizeFilename(file.name);
  const key = `partime/part-timers/${staffId}/profile/${timestamp}-${isS3Configured() ? '' : `${randomUUID()}-`}${safeFilename}`;
  const result = await saveUploadToKey(file, key);
  return { key: result.key, url: result.url };
}

export async function savePartTimerPortfolioMedia({ partTimerId, file, mediaId = randomUUID() }: { partTimerId: string; file: File; mediaId?: string }): Promise<StoredUploadResult> {
  await validateMarketplaceMedia(file);
  const key = `partime/part-timers/${partTimerId}/portfolio/${mediaId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return saveUploadToKey(file, key);
}

export async function saveEmployerLogo({ tenantId, file }: { tenantId: string; file: File }): Promise<StoredUploadResult> {
  await validateProfileImage(file);
  const key = `partime/employers/${tenantId}/logo/${Date.now()}-${sanitizeFilename(file.name)}`;
  return saveUploadToKey(file, key);
}

export async function saveJobMedia({ jobId, file, role = 'gallery' }: { jobId: string; file: File; role?: 'cover' | 'gallery' }): Promise<StoredUploadResult> {
  await validateMarketplaceMedia(file);
  const key = `partime/jobs/${jobId}/${role}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return saveUploadToKey(file, key);
}

export async function deleteStoredProfileImage(key: string | null | undefined) {
  if (!key) return;

  if (!isAllowedUploadKey(key)) {
    return;
  }

  if (isS3Configured()) {
    await s3Client().send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })).catch(() => undefined);
    return;
  }

  const absolute = resolveLocalUploadPath(key);
  await unlink(absolute).catch(() => undefined);
}

export async function readStoredUpload(key: string): Promise<{ data: Buffer; size: number }> {
  const safeKey = ensureSafeRelativeKey(key);
  if (!isAllowedUploadKey(safeKey)) throw new Error('Invalid upload key');
  if (isS3Configured()) {
    const result = await s3Client().send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: safeKey,
    }));
    const bytes = await result.Body?.transformToByteArray();
    const data = Buffer.from(bytes || []);
    return { data, size: data.length };
  }

  return readLocalUpload(safeKey);
}

export async function readLocalUpload(key: string): Promise<{ data: Buffer; size: number }> {
  const absolute = resolveLocalUploadPath(key);
  const [data, info] = await Promise.all([readFile(absolute), stat(absolute)]);
  return { data, size: info.size };
}

export async function removeLocalUploadRoot() {
  await rm(LOCAL_UPLOAD_ROOT, { recursive: true, force: true });
}