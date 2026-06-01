import { Prisma } from "@prisma/client";

/**
 * Build a ts_headline expression for a given column and tsquery.
 * Options: MaxWords=6, MinWords=1 — short snippets for cards.
 * Returns a Prisma.Sql fragment suitable for embedding in SELECT.
 */
export function headline(column: Prisma.Sql, tsQuery: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`ts_headline('simple', ${column}, ${tsQuery}, 'MaxWords=6,MinWords=1,StartSel=<mark>,StopSel=</mark>')`;
}

/**
 * Strip HTML tags from a ts_headline result for plain-text use.
 * Use only when rendering in a non-HTML context.
 */
export function stripHighlightTags(text: string): string {
  return text.replace(/<\/?mark>/g, "");
}
