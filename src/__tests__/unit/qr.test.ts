import { describe, it, expect } from "vitest";
import { qrMatrix, qrSvg } from "@/lib/qr";

// QR version sizes: size = version * 4 + 17
const V1 = 21;
const V2 = 25;

describe("qrMatrix", () => {
  it("selects version 1 (21×21) for short text", () => {
    // Byte mode ECC-M v1 capacity = 14 bytes
    const m = qrMatrix("xplosale.com");
    expect(m.length).toBe(V1);
    expect(m.every((row) => row.length === V1)).toBe(true);
  });

  it("selects version 2 (25×25) when v1 capacity is exceeded", () => {
    const m = qrMatrix("a".repeat(20)); // 20 bytes > 14, ≤ 26
    expect(m.length).toBe(V2);
  });

  it("fits a typical shop URL well within version 10", () => {
    const url = "https://app.xplosale.com/shops/ahmads-electronics-m4x2k1";
    expect(() => qrMatrix(url)).not.toThrow();
    expect(qrMatrix(url).length).toBeLessThanOrEqual(10 * 4 + 17);
  });

  it("throws for text beyond version 10 capacity (213 bytes)", () => {
    expect(() => qrMatrix("a".repeat(214))).toThrow(/too long/i);
  });

  it("handles multi-byte UTF-8 (Urdu) by byte length", () => {
    const m = qrMatrix("دکان"); // 8 UTF-8 bytes
    expect(m.length).toBe(V1);
  });

  it("renders the three finder patterns", () => {
    const m = qrMatrix("test");
    const size = m.length;
    // Finder pattern outer ring is dark: corners of each 7×7 pattern
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      expect(m[cy][cx]).toBe(true); // center
      expect(m[cy - 3][cx - 3]).toBe(true); // outer corner
      expect(m[cy - 2][cx - 2]).toBe(false); // white ring
      expect(m[cy - 1][cx - 1]).toBe(true); // inner block edge
    }
  });

  it("places the timing patterns (alternating, row/col 6)", () => {
    const m = qrMatrix("timing");
    const size = m.length;
    for (let i = 8; i < size - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
  });

  it("sets the dark module at (8, size-8)", () => {
    const m = qrMatrix("dark");
    expect(m[m.length - 8][8]).toBe(true);
  });

  it("is deterministic", () => {
    const a = qrMatrix("https://app.xplosale.com/shops/test");
    const b = qrMatrix("https://app.xplosale.com/shops/test");
    expect(a).toEqual(b);
  });

  it("keeps dark-module balance within spec-plausible range (20–80%)", () => {
    const m = qrMatrix("https://app.xplosale.com/shops/some-shop-slug-12345");
    let dark = 0;
    let total = 0;
    for (const row of m) for (const cell of row) { total++; if (cell) dark++; }
    const ratio = dark / total;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.8);
  });
});

describe("qrSvg", () => {
  it("produces a well-formed SVG with white background and dark path", () => {
    const svg = qrSvg("https://app.xplosale.com/shops/test");
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain('fill="#1A1613"');
    expect(svg).toContain("</svg>");
  });

  it("scales with moduleSize and margin options", () => {
    const m = qrMatrix("abc");
    const size = m.length;
    const svg = qrSvg("abc", { moduleSize: 10, margin: 2 });
    const dim = (size + 4) * 10;
    expect(svg).toContain(`viewBox="0 0 ${dim} ${dim}"`);
  });
});
