// Safe JSON-LD serialization for <script type="application/ld+json">.
// JSON.stringify alone is insufficient: `</script>` inside a string value
// terminates the enclosing script element in the HTML parser.
export function serializeJsonLd(data: unknown): string {
  // Emit the literal 6-character escape sequences (e.g. <) into the JSON
  // output. Writing "<" as a JS string literal would BE the character "<"
  // (a no-op replace); the doubled backslash keeps the escape in the output so
  // the JSON parser decodes it back to "<" while the HTML parser never sees a
  // raw "<". This is what neutralizes a value like `</script>`.
  return JSON.stringify(data)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}
