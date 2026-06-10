export default function MeLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="animate-pulse">
        {/* Page header */}
        <div className="h-3 w-32 rounded bg-gray-200 mb-3" />
        <div className="h-10 w-3/4 max-w-md rounded bg-gray-200 mb-3" />
        <div className="h-4 w-full max-w-[520px] rounded bg-gray-200 mb-2" />
        <div className="h-4 w-2/3 max-w-[400px] rounded bg-gray-200 mb-8" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Trust breakdown card */}
            <div
              className="bg-white border rounded-[20px]"
              style={{ borderColor: "var(--line)", padding: "28px 28px 24px" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="h-4 w-28 rounded bg-gray-200 mb-2" />
                  <div className="h-3 w-40 rounded bg-gray-200" />
                </div>
                <div className="h-24 w-24 rounded-full bg-gray-200" />
              </div>
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="h-3 w-32 rounded bg-gray-200" />
                    <div className="h-3 flex-1 rounded bg-gray-200" />
                    <div className="h-3 w-10 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Profile facets card */}
            <div
              className="bg-white border rounded-[20px]"
              style={{ borderColor: "var(--line)", padding: "24px 28px" }}
            >
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 w-28 rounded-full bg-gray-200" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Verification card */}
            <div
              className="bg-white border rounded-[20px]"
              style={{ borderColor: "var(--line)", padding: "24px 24px 20px" }}
            >
              <div className="h-4 w-36 rounded bg-gray-200 mb-4" />
              <div className="h-20 w-20 rounded-full bg-gray-200 mb-4" />
              <div className="h-3 w-full rounded bg-gray-200 mb-2" />
              <div className="h-3 w-2/3 rounded bg-gray-200" />
            </div>

            {/* Tier card */}
            <div
              className="bg-white border rounded-[20px]"
              style={{ borderColor: "var(--line)", padding: "24px 24px 20px" }}
            >
              <div className="h-4 w-24 rounded bg-gray-200 mb-4" />
              <div className="h-3 w-full rounded bg-gray-200 mb-2" />
              <div className="h-3 w-5/6 rounded bg-gray-200 mb-2" />
              <div className="h-3 w-3/4 rounded bg-gray-200" />
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div
          className="bg-white border rounded-[20px]"
          style={{ borderColor: "var(--line)", padding: "20px 28px", marginTop: 24 }}
        >
          <div className="h-4 w-24 rounded bg-gray-200 mb-4" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-32 rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
