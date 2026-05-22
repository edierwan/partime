import crypto from 'node:crypto';

export function generateScanToken(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
}
