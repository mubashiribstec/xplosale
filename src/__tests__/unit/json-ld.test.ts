import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("produces valid JSON", () => {
    const data = { "@type": "Product", name: "Test" };
    expect(() => JSON.parse(serializeJsonLd(data))).not.toThrow();
  });

  it("escapes </script> to prevent XSS script tag injection", () => {
    const data = { description: "</script><script>alert(1)</script>" };
    const result = serializeJsonLd(data);
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003C");
  });

  it("escapes < and > characters", () => {
    const data = { name: "<test>" };
    const result = serializeJsonLd(data);
    expect(result).not.toContain("<test>");
    expect(result).toContain("\\u003C");
    expect(result).toContain("\\u003E");
  });

  it("escapes ampersands", () => {
    const data = { name: "Cats & Dogs" };
    const result = serializeJsonLd(data);
    expect(result).not.toContain("& ");
    expect(result).toContain("\\u0026");
  });

  it("handles nested objects", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Senior <Engineer>",
      description: "</script>attack",
      hiringOrganization: { "@type": "Organization", name: "ACME & Co" },
    };
    const result = serializeJsonLd(data);
    expect(result).not.toContain("</script>");
    expect(result).not.toContain("<Engineer>");
    expect(result).not.toContain("& Co");
    // Still valid JSON after escaping
    const parsed = JSON.parse(result);
    expect(parsed["@type"]).toBe("JobPosting");
  });
});
