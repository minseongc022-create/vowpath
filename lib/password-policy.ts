/**
 * Shared password rules for signup + reset.
 * Strong enough for shop dashboards without being painful.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

export type PasswordPolicyResult = {
  ok: boolean;
  error: string | null;
  checks: {
    minLength: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
  score: number;
  level: PasswordStrengthLevel;
  label: string;
};

const SPECIAL_RE = /[^A-Za-z0-9]/;

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const checks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_RE.test(password),
  };

  const met = Object.values(checks).filter(Boolean).length;
  let score = met;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  let level: PasswordStrengthLevel = "empty";
  let label = "";
  if (!password) {
    level = "empty";
    label = "";
  } else if (met <= 2 || !checks.minLength) {
    level = "weak";
    label = "Weak — not safe";
  } else if (met === 3) {
    level = "fair";
    label = "Fair — add more variety";
  } else if (met === 4) {
    level = "good";
    label = "Good — almost there";
  } else {
    level = "strong";
    label = "Strong — looks safe";
  }

  let error: string | null = null;
  if (!checks.minLength) {
    error = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (!checks.upper || !checks.lower || !checks.number || !checks.special) {
    error =
      "Use upper & lower case letters, a number, and a special character (!@#$…).";
  }

  return {
    ok: error === null,
    error,
    checks,
    score,
    level,
    label,
  };
}

/** Server-side validation message (English API). */
export function passwordPolicyError(password: string): string | null {
  return evaluatePasswordPolicy(password).error;
}
