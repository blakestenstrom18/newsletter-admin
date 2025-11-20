export const MIN_PASSWORD_LENGTH = 12;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isPasswordStrong(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function sanitizeRole(roleInput?: string | null) {
  return roleInput?.toLowerCase() === 'admin' ? 'admin' : 'user';
}

