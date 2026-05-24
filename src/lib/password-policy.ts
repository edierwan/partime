export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordValidationResult {
  ok: boolean;
  message?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { ok: false, message: 'Password must include letters and numbers.' };
  }
  return { ok: true };
}

export function passwordsMatch(password: string, confirmPassword: string): PasswordValidationResult {
  const validation = validatePassword(password);
  if (!validation.ok) return validation;
  if (password !== confirmPassword) return { ok: false, message: 'Passwords do not match.' };
  return { ok: true };
}
