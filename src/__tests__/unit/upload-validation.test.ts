import { describe, it, expect } from "vitest";

// Replicated MIME detection logic from src/core/media/pipeline.ts
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
const BLOCKED_EXTENSIONS = [".svg", ".html", ".js", ".php", ".exe", ".zip", ".sh", ".py"];

function isAllowedImageMime(mime: string): boolean {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

function hasBlockedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

describe("Upload MIME validation", () => {
  it("allows jpeg", () => expect(isAllowedImageMime("image/jpeg")).toBe(true));
  it("allows png", () => expect(isAllowedImageMime("image/png")).toBe(true));
  it("allows webp", () => expect(isAllowedImageMime("image/webp")).toBe(true));
  it("blocks svg", () => expect(isAllowedImageMime("image/svg+xml")).toBe(false));
  it("blocks html", () => expect(isAllowedImageMime("text/html")).toBe(false));
  it("blocks javascript", () => expect(isAllowedImageMime("application/javascript")).toBe(false));
  it("blocks php", () => expect(isAllowedImageMime("application/x-php")).toBe(false));
  it("blocks pdf", () => expect(isAllowedImageMime("application/pdf")).toBe(false));
  it("blocks zip", () => expect(isAllowedImageMime("application/zip")).toBe(false));
});

describe("Upload extension validation", () => {
  it("flags .svg extension", () => expect(hasBlockedExtension("logo.svg")).toBe(true));
  it("flags .html extension", () => expect(hasBlockedExtension("page.html")).toBe(true));
  it("flags .js extension", () => expect(hasBlockedExtension("shell.js")).toBe(true));
  it("flags .php extension", () => expect(hasBlockedExtension("shell.php")).toBe(true));
  it("flags .exe extension", () => expect(hasBlockedExtension("virus.exe")).toBe(true));
  it("flags .zip extension", () => expect(hasBlockedExtension("files.zip")).toBe(true));
  it("flags .sh extension", () => expect(hasBlockedExtension("script.sh")).toBe(true));
  it("allows .jpg", () => expect(hasBlockedExtension("photo.jpg")).toBe(false));
  it("allows .png", () => expect(hasBlockedExtension("photo.png")).toBe(false));
  it("allows .webp", () => expect(hasBlockedExtension("photo.webp")).toBe(false));
  it("allows .pdf", () => expect(hasBlockedExtension("resume.pdf")).toBe(false));
  it("is case-insensitive", () => expect(hasBlockedExtension("SHELL.PHP")).toBe(true));
});

describe("listingId path traversal prevention", () => {
  const CUID_PATTERN = /^c[a-z0-9]{24}$/;

  it("accepts a valid cuid", () => expect(CUID_PATTERN.test("cld4qg1g400003b6h2c8o5l2b")).toBe(true));
  it("rejects path traversal attempt", () =>
    expect(CUID_PATTERN.test("../../etc/passwd")).toBe(false));
  it("rejects null bytes", () =>
    expect(CUID_PATTERN.test("abc\x00xyz")).toBe(false));
  it("rejects long strings", () =>
    expect(CUID_PATTERN.test("a".repeat(200))).toBe(false));
});
