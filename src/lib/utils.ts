import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(input: string): string {
  return input.replace(/\s+/g, '').replace(/-/g, '');
}

export function normalizeAlias(input: string): string {
  return input.trim().toUpperCase();
}
