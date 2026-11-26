/**
 * "jane.doe@example.com" → "j***@example.com". Shows people which address received the email
 * without displaying it in full on screen (shoulder surfing, screenshots).
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return email;
  return `${email.charAt(0)}***${email.slice(at)}`;
}
