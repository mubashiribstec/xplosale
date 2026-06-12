import { describe, it, expect } from "vitest";
import { normalizePkPhone, waChatUrl, waShareUrl } from "@/lib/whatsapp";

describe("normalizePkPhone", () => {
  it("converts local 0-prefix to 92", () => {
    expect(normalizePkPhone("0300 1234567")).toBe("923001234567");
  });

  it("passes through +92 numbers", () => {
    expect(normalizePkPhone("+92 300 1234567")).toBe("923001234567");
  });

  it("rejects too-short numbers", () => {
    expect(normalizePkPhone("12345")).toBeNull();
  });
});

describe("waChatUrl", () => {
  it("builds a wa.me link with encoded text", () => {
    const url = waChatUrl("03001234567", "Hi there & hello");
    expect(url).toBe("https://wa.me/923001234567?text=Hi%20there%20%26%20hello");
  });

  it("returns null for invalid phones", () => {
    expect(waChatUrl("abc", "x")).toBeNull();
  });
});

describe("waShareUrl", () => {
  it("builds a recipient-less share link", () => {
    expect(waShareUrl("check this")).toBe("https://wa.me/?text=check%20this");
  });
});
