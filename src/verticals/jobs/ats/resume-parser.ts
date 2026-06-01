/**
 * Deterministic resume text extraction from PDF bytes using pdf-parse.
 * Regex pass extracts structural signals (email, phone, section headers).
 * No AI — all extraction is pattern-based and transparent.
 */

import type { Buffer } from "node:buffer";

export interface ExtractedFields {
  emails: string[];
  phones: string[];
  sections: string[];
}

export interface ParseResult {
  rawText: string;
  extracted: ExtractedFields;
}

const SECTION_HEADERS = [
  "experience", "education", "skills", "summary", "objective",
  "work history", "employment", "projects", "certifications",
  "languages", "awards", "publications", "references",
];

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d[\d\s\-().]{7,}\d)/g;

type PdfParseResult = { text: string };
type PdfParseFn = (buf: Buffer) => Promise<PdfParseResult>;

export async function parseResumePdf(buf: Buffer): Promise<ParseResult> {
  // Dynamic import keeps pdf-parse out of the Edge bundle.
  // pdf-parse has inconsistent ESM/CJS exports; normalize here.
  const mod = await import("pdf-parse");
  const pdfParse = ((mod as { default?: unknown }).default ?? mod) as unknown as PdfParseFn;
  const data = await pdfParse(buf);
  const rawText = data.text ?? "";

  const lower = rawText.toLowerCase();
  const emailMatches: string[] = (rawText.match(EMAIL_RE) ?? []) as string[];
  const phoneMatches: string[] = (rawText.match(PHONE_RE) ?? []) as string[];
  const emails = [...new Set(emailMatches)];
  const phones = [...new Set(phoneMatches)].map((p) => p.trim());
  const sections = SECTION_HEADERS.filter((h) => lower.includes(h));

  return { rawText, extracted: { emails, phones, sections } };
}
