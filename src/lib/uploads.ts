import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const LOCAL_UPLOAD_ROOT = process.env.LOCAL_UPLOAD_ROOT || '/app/uploads';
const LOCAL_UPLOAD_PREFIX = '/api/uploads';

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

function resolveS3PublicUrl(key: string): string {
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (publicBase) return `${publicBase}/${key}`;

  const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, '');
  const bucket = process.env.S3_BUCKET;
  if (endpoint && bucket) return `${endpoint}/${bucket}/${key}`;
  return key;
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

export async function saveStaffProfileImage({ staffId, file }: { staffId: string; file: File }) {
  await validateProfileImage(file);

  const timestamp = Date.now();
  const safeFilename = sanitizeFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isS3Configured()) {
    const key = `partime/staff-profiles/${staffId}/${timestamp}-${safeFilename}`;
    await s3Client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
    return { key, url: resolveS3PublicUrl(key) };
  }

  const key = `staff-profiles/${staffId}/${timestamp}-${randomUUID()}-${safeFilename}`;
  const absolute = resolveLocalUploadPath(key);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);
  return { key, url: localUploadUrl(key) };
}

export async function deleteStoredProfileImage(key: string | null | undefined) {
  if (!key) return;

  if (key.startsWith('partime/') && isS3Configured()) {
    await s3Client().send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })).catch(() => undefined);
    return;
  }

  const absolute = resolveLocalUploadPath(key);
  await unlink(absolute).catch(() => undefined);
}

export async function readLocalUpload(key: string): Promise<{ data: Buffer; size: number }> {
  const absolute = resolveLocalUploadPath(key);
  const [data, info] = await Promise.all([readFile(absolute), stat(absolute)]);
  return { data, size: info.size };
}

export async function removeLocalUploadRoot() {
  await rm(LOCAL_UPLOAD_ROOT, { recursive: true, force: true });
}