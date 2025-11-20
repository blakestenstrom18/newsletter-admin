import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  isPasswordStrong,
  normalizeEmail,
  sanitizeRole,
} from '@/lib/auth/validation';

describe('auth validation helpers', () => {
  it('normalizes email by trimming and lowercasing', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });

  it('validates password strength using minimum length', () => {
    expect(isPasswordStrong('x'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isPasswordStrong('short-pass')).toBe(false);
  });

  it('sanitizes roles and defaults to user', () => {
    expect(sanitizeRole('ADMIN')).toBe('admin');
    expect(sanitizeRole('User')).toBe('user');
    expect(sanitizeRole(undefined)).toBe('user');
  });
});

