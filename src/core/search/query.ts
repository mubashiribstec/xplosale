import { Prisma } from "@prisma/client";

/**
 * Sanitize and wrap user input into a parameterized websearch_to_tsquery call.
 * websearch_to_tsquery('simple', $input) never throws on malformed input
 * (unlike to_tsquery) and supports quoted phrases, OR, negation.
 * We always use the 'simple' dictionary (no stemming — works for EN + Urdu transliteration).
 */
export function buildTsQuery(userInput: string): Prisma.Sql {
  // Strip NUL bytes and control characters that could cause issues
  const safe = userInput.replace(/\x00/g, "").trim();
  return Prisma.sql`websearch_to_tsquery('simple', ${safe})`;
}

/**
 * Encode a pagination cursor from offset.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

/**
 * Decode a pagination cursor to offset. Returns 0 on invalid input.
 */
export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString()) as { offset?: number };
    return typeof parsed.offset === "number" && parsed.offset >= 0 ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

/**
 * Build a Prisma.sql join of conditions with AND.
 * Filters out falsy fragments.
 */
export function andConditions(conditions: (Prisma.Sql | false | null | undefined)[]): Prisma.Sql {
  const valid = conditions.filter((c): c is Prisma.Sql => Boolean(c));
  if (valid.length === 0) return Prisma.sql`TRUE`;
  return valid.reduce((acc, cond) => Prisma.sql`${acc} AND ${cond}`);
}
