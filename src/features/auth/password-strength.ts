export interface PasswordStrength {
  /** 0 (empty) to 4 (strong) */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const labels = ["", "Yếu", "Trung bình", "Khá", "Mạnh"];

/** Rough guidance for the register form; the server only enforces 8–72 characters. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: labels[0] };
  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  const score = (
    password.length < 8 ? 1 : Math.min(4, Math.max(1, points - 1))
  ) as PasswordStrength["score"];
  return { score, label: labels[score] };
}
