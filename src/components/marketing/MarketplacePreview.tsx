import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import ListingCard from "@/components/shared/ListingCard";
import Reveal from "@/components/marketing/Reveal";

export default async function MarketplacePreview() {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 8,
    include: {
      images: { take: 1, orderBy: { order: "asc" } },
      region: { select: { name: true, city: true } },
      sellerProfile: { select: { agentTier: true } },
    },
  });

  const serialised = listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: String(l.price),
    currency: l.currency,
    category: l.category,
    propertyType: l.propertyType ?? null,
    createdAt: l.createdAt.toISOString(),
    region: { name: l.region.name, city: l.region.city },
    images: l.images[0] ? [{ url: getPublicUrl(l.images[0].url), width: 0, height: 0 }] : [],
    sellerProfile: { agentTier: l.sellerProfile?.agentTier ?? "NONE" },
  }));

  return (
    <section
      style={{
        background: "var(--paper-2)",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
      }}
    >
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow" style={{ color: "var(--blue)", marginBottom: 12 }}>
                Marketplace
              </p>
              <h2 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.03em", margin: 0 }}>
                Fresh listings from verified sellers.
              </h2>
            </div>
            <Link href="/m" style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)", textDecoration: "none", whiteSpace: "nowrap" }}>
              View all listings →
            </Link>
          </div>
        </Reveal>

        {serialised.length === 0 ? (
          <Reveal>
            <div
              style={{
                textAlign: "center",
                padding: "56px 20px",
                background: "var(--white)",
                border: "1px dashed var(--line)",
                borderRadius: 20,
              }}
            >
              <p style={{ fontSize: 16, color: "var(--ink-soft)", margin: "0 0 16px" }}>
                No listings yet — be the first to post on the marketplace.
              </p>
              <Link
                href="/m/new"
                style={{
                  display: "inline-flex",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--white)",
                  background: "var(--blue)",
                  borderRadius: 10,
                  padding: "10px 22px",
                  textDecoration: "none",
                }}
              >
                Post the first listing
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="x-grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
            {serialised.map((listing, i) => (
              <Reveal key={listing.id} delay={Math.min(i, 4) * 0.06}>
                <ListingCard listing={listing} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
