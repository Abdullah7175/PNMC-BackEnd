/**
 * Shared security validation rules (OWASP-aligned input constraints).
 */

/** Letters, digits, and only `.` / `@` — e.g. admin@admin.com, admin@pnmc.gov.pk */
export const STRICT_EMAIL_REGEX =
  /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/;

export const STRICT_EMAIL_MESSAGE =
  'Email may only contain letters, numbers, @ and . (e.g. admin@admin.com)';

/** Min 8 chars, upper, lower, digit, special */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be 8–128 characters and include uppercase, lowercase, a number, and a special character';

export const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s.,'\-/()&+#@:]+$/u;

export const SAFE_TEXT_MESSAGE =
  'Contains invalid characters. Use letters, numbers, and common punctuation only.';
