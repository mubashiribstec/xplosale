/**
 * Open-redirect guard.
 *
 * Returns `input` only when it is a safe same-origin *relative* path:
 *   - starts with a single "/" (not "//" or "/\" which browsers treat as a
 *     protocol-relative URL -> off-site navigation)
 *   - contains no backslashes or ASCII control characters (defeats tricks like
 *     "/\evil.com", tab/newline smuggling, etc.)
 *
 * Anything else (absolute URLs, "javascript:", missing/non-string values)
 * falls back to the provided in-app default.
 */
export function safeInternalPath(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (!value.startsWith("/")) return fallback; // must be relative
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback; // protocol-relative

  // Reject backslashes and ASCII control characters (0x00-0x1F and 0x7F).
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return fallback;
    if (value[i] === "\\") return fallback;
  }
  return value;
}
