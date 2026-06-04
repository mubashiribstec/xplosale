// Safe JSON-LD serialization for <script type="application/ld+json">.
// JSON.stringify alone is insufficient: `</script>` inside a string value
// terminates the enclosing script element in the HTML parser.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\u003C")
    .replace(/>/g, "\u003E")
    .replace(/&/g, "\u0026");
}
