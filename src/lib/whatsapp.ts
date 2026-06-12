// WhatsApp deep-link helpers (wa.me). Pakistan-first phone normalization.

/**
 * Normalize a Pakistani phone number to international digits for wa.me.
 * "0300 1234567" → "923001234567"; "+92 300 1234567" → "923001234567".
 * Returns null when the number can't plausibly be dialled.
 */
export function normalizePkPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  // Already international (non-PK) or local without trunk prefix
  return digits;
}

/** Chat link to a specific number with a prefilled message. */
export function waChatUrl(phone: string, text: string): string | null {
  const normalized = normalizePkPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Share link (user picks the recipient). */
export function waShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
