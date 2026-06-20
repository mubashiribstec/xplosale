import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import OfferButton from "@/components/shared/OfferButton";
import EscrowWidget from "@/components/shared/EscrowWidget";
import MessageSellerButton from "@/components/shared/marketplace/MessageSellerButton";
import ShareButton from "@/components/shared/ShareButton";
import SaveListingButton from "@/components/shared/marketplace/SaveListingButton";
import ReportListingButton from "@/components/shared/marketplace/ReportListingButton";
import ListingQA from "@/components/shared/marketplace/ListingQA";
import SimilarListings from "@/components/shared/marketplace/SimilarListings";
import ViewTracker from "@/components/shared/marketplace/ViewTracker";
import ListingGallery from "@/components/shared/marketplace/ListingGallery";
import { serializeJsonLd } from "@/lib/json-ld";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ listingId: string }> }
): Promise<Metadata> {
  const { listingId } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      title: true, description: true, price: true, currency: true, status: true,
      images: { select: { url: true }, take: 1, orderBy: { order: "asc" } },
      region: { select: { name: true, city: true } },
    },
  });
  if (!listing) return { title: "Listing not found" };

  const price = `${listing.currency} ${Number(listing.price).toLocaleString("en-PK")}`;
  const description = `${price} · ${listing.region.city}, ${listing.region.name} · ${listing.description?.slice(0, 150) ?? ""}`;
  const imageUrl = listing.images[0]?.url ? getPublicUrl(listing.images[0].url) : undefined;
  const indexable = listing.status === "ACTIVE";

  return {
    title: `${listing.title} — ${price} | Xplosale`,
    description,
    alternates: { canonical: `/m/${listingId}` },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: { card: "summary_large_image", title: listing.title, description },
  };
}

const CARD: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  padding: 20,
};

function chip(bg: string, color: string): React.CSSProperties {
  return { fontSize: 12, fontWeight: 600, padding: "3px 11px", borderRadius: 99, background: bg, color };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { listingId } = await params;
  const session = await getSession();

  const [listing, savedEntry] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { order: "asc" } },
        region: { select: { id: true, name: true, slug: true, city: true } },
        sellerProfile: {
          select: {
            id: true,
            agentTier: true,
            bio: true,
            sellerRatingAvg: true,
            sellerRatingCount: true,
            responseRate: true,
            badges: true,
            user: {
              select: {
                id: true, name: true, image: true, verificationStatus: true, isPartner: true,
                phone: true, secondaryPhone: true, whatsapp: true,
              },
            },
          },
        },
        reviews: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        escrowTransactions: {
          where: { status: { in: ["HELD", "DISPUTED"] } },
          take: 1,
          select: { id: true, status: true, amount: true, buyerId: true, sellerId: true },
        },
        questions: {
          orderBy: { createdAt: "asc" },
          include: { asker: { select: { id: true, name: true } } },
        },
        priceHistory: { orderBy: { changedAt: "desc" }, take: 10 },
      },
    }),
    session
      ? prisma.savedListing.findUnique({
          where: {
            userId_listingId: {
              userId: (session.user as { id: string }).id,
              listingId,
            },
          },
          select: { id: true },
        })
      : null,
  ]);

  if (!listing) notFound();

  const userId = session ? (session.user as { id: string }).id : null;
  const isOwner = userId === listing.sellerProfile.user.id;
  const isAdmin = session && (session.user as { role: string }).role === "ADMIN";

  if (listing.status !== "ACTIVE" && !isOwner && !isAdmin) notFound();

  const price = Number(listing.price).toLocaleString("en-PK");
  const activeEscrow = listing.escrowTransactions[0] ?? null;
  const activeEscrowSerialized = activeEscrow
    ? {
        id: activeEscrow.id,
        status: activeEscrow.status,
        amount: activeEscrow.amount.toString(),
        buyerId: activeEscrow.buyerId,
        sellerId: activeEscrow.sellerId,
      }
    : null;

  const initialSaved = !!savedEntry;
  const initialSavedCount = listing.savedCount;
  const isSold = listing.status === "SOLD";

  const serializedQuestions = listing.questions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    answeredAt: q.answeredAt?.toISOString() ?? null,
    asker: { name: q.asker.name },
  }));

  const galleryImages = listing.images.map((img) => ({ url: getPublicUrl(img.url), id: img.id }));

  const BADGE: Record<string, [string, string]> = {
    TRUSTED: ["rgba(50,122,214,.12)", "var(--blue)"],
    TOP_RATED: ["rgba(217,119,6,.12)", "#d97706"],
    QUICK_RESPONDER: ["rgba(15,184,126,.12)", "var(--green)"],
  };
  const CONDITION: Record<string, [string, string]> = {
    NEW: ["rgba(15,184,126,.12)", "var(--green)"],
    USED: ["rgba(217,119,6,.12)", "#d97706"],
    REFURBISHED: ["rgba(50,122,214,.12)", "var(--blue)"],
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "var(--body)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description,
            ...(galleryImages.length > 0 ? { image: galleryImages.map((i) => i.url) } : {}),
            offers: {
              "@type": "Offer",
              price: Number(listing.price),
              priceCurrency: listing.currency,
              availability: isSold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
              seller: { "@type": "Person", name: listing.sellerProfile?.user?.name ?? "Seller" },
            },
          }),
        }}
      />

      <ViewTracker listingId={listing.id} />

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "clamp(16px,4vw,32px) clamp(16px,4vw,24px)", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Link href="/m" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>Marketplace</Link>
          <span>›</span>
          {listing.category && (
            <>
              <Link href={`/m?category=${encodeURIComponent(listing.category)}`} style={{ color: "var(--ink-faint)", textDecoration: "none", textTransform: "capitalize" }}>
                {listing.category.replace(/_/g, " ")}
              </Link>
              <span>›</span>
            </>
          )}
          <span style={{ color: "var(--ink-soft)" }}>{listing.title}</span>
        </nav>

        {listing.status !== "ACTIVE" && (
          <div style={{ ...CARD, padding: "12px 16px", background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.3)", color: "#b45309", fontSize: 14 }}>
            This listing is <strong>{listing.status.toLowerCase().replace("_", " ")}</strong>{isOwner ? " and only visible to you." : "."}
          </div>
        )}

        {listing.urgent && listing.status === "ACTIVE" && (
          <div style={{ ...CARD, padding: "12px 16px", background: "rgba(160,78,55,.08)", border: "1px solid rgba(160,78,55,.3)", color: "var(--clay)", fontSize: 14, fontWeight: 600 }}>
            🔴 Urgent — seller wants to sell quickly
          </div>
        )}

        <div className="ld-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "start" }}>

          {/* Left — gallery + details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <ListingGallery images={galleryImages} alt={listing.title} sold={isSold} />

            <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(20px,3.5vw,28px)", color: "var(--ink)", margin: 0, lineHeight: 1.15 }}>
                  {listing.title}
                </h1>
                <div style={{ flexShrink: 0 }}>
                  {isOwner ? (
                    <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>👁 {listing.viewCount} views</span>
                  ) : userId ? (
                    <SaveListingButton
                      listingId={listing.id}
                      initialSaved={initialSaved}
                      initialCount={initialSavedCount}
                      sellerUserId={listing.sellerProfile.user.id}
                    />
                  ) : null}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <p className="mono" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 800, color: "var(--clay)", margin: 0 }}>
                  {listing.currency} {price}
                </p>
                {listing.negotiable
                  ? <span style={chip("rgba(50,122,214,.1)", "var(--blue)")}>Negotiable</span>
                  : <span style={chip("var(--paper-2)", "var(--ink-soft)")}>Fixed price</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--ink-faint)", flexWrap: "wrap" }}>
                <span>👁 {listing.viewCount} views</span>
                <span>♡ {listing.savedCount} watching</span>
                {listing.sellerType === "BUSINESS" && <span>🏢 Business seller</span>}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {listing.condition && (
                  <span style={chip(...(CONDITION[listing.condition] ?? ["var(--paper-2)", "var(--ink-soft)"]))}>{listing.condition}</span>
                )}
                {listing.propertyType && (
                  <span style={{ ...chip("rgba(50,122,214,.1)", "var(--blue)"), textTransform: "capitalize" }}>{listing.propertyType.toLowerCase()}</span>
                )}
                {listing.beds && <span style={chip("var(--paper-2)", "var(--ink-soft)")}>{listing.beds} beds</span>}
                {listing.baths && <span style={chip("var(--paper-2)", "var(--ink-soft)")}>{listing.baths} baths</span>}
                {listing.areaValue && listing.areaUnit && (
                  <span style={chip("var(--paper-2)", "var(--ink-soft)")}>{listing.areaValue} {listing.areaUnit}</span>
                )}
                {listing.deliveryAvailable && (
                  <span style={chip("rgba(144,37,179,.1)", "var(--purple)")}>
                    🚚 Delivery{listing.deliveryCost ? ` · ${listing.currency} ${Number(listing.deliveryCost).toLocaleString("en-PK")}` : " (free)"}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>📍 {listing.region.city} — {listing.region.name}</p>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>Description</h2>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.65, whiteSpace: "pre-line" }}>{listing.description}</p>
              </div>

              {listing.priceHistory.length > 0 && (
                <details style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <summary style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", cursor: "pointer" }}>
                    Price history ({listing.priceHistory.length} change{listing.priceHistory.length > 1 ? "s" : ""})
                  </summary>
                  <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {listing.priceHistory.map((ph) => (
                      <li key={ph.id} style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                        {new Date(ph.changedAt).toLocaleDateString("en-PK")} — {listing.currency} {Number(ph.oldPrice).toLocaleString("en-PK")} → {listing.currency} {Number(ph.newPrice).toLocaleString("en-PK")}
                        {Number(ph.newPrice) < Number(ph.oldPrice) && (
                          <span style={{ marginLeft: 5, color: "var(--green)", fontWeight: 600 }}>▼ {Math.round((1 - Number(ph.newPrice) / Number(ph.oldPrice)) * 100)}% off</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {userId && !isOwner && (
                <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <ReportListingButton listingId={listing.id} />
                </div>
              )}
            </div>

            {listing.reviews.length > 0 && (
              <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Reviews</h2>
                {listing.reviews.map((review) => (
                  <div key={review.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>{review.author.name ?? "User"}</span>
                      <span style={{ color: "#f59e0b", fontSize: 13 }}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    {review.body && <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>{review.body}</p>}
                  </div>
                ))}
              </div>
            )}

            <div style={CARD}>
              <ListingQA
                listingId={listing.id}
                sellerUserId={listing.sellerProfile.user.id}
                initialQuestions={serializedQuestions}
              />
            </div>

            <SimilarListings
              category={listing.category}
              regionId={listing.regionId}
              excludeId={listing.id}
            />
          </div>

          {/* Right — seller card */}
          <div className="ld-side" style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: "calc(62px + 18px)" }}>
            <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {listing.sellerProfile.user.image ? (
                  <Image
                    src={listing.sellerProfile.user.image}
                    alt={listing.sellerProfile.user.name ?? "Seller"}
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(50,122,214,.12)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {(listing.sellerProfile.user.name ?? "S")[0].toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {listing.sellerProfile.user.name ?? "Seller"}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    {listing.sellerProfile.agentTier !== "NONE" && (
                      <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>{listing.sellerProfile.agentTier} Agent</span>
                    )}
                    {listing.sellerProfile.user.verificationStatus === "VERIFIED" && (
                      <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>✓ Verified</span>
                    )}
                  </div>
                </div>
              </div>

              {listing.sellerProfile.sellerRatingCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#f59e0b", fontSize: 14 }}>{"★".repeat(Math.round(listing.sellerProfile.sellerRatingAvg))}{"☆".repeat(5 - Math.round(listing.sellerProfile.sellerRatingAvg))}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{listing.sellerProfile.sellerRatingAvg.toFixed(1)} ({listing.sellerProfile.sellerRatingCount})</span>
                </div>
              )}

              {listing.sellerProfile.responseRate != null && (
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>Response rate: {Math.round(listing.sellerProfile.responseRate * 100)}%</p>
              )}

              {listing.sellerProfile.badges.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {listing.sellerProfile.badges.map((badge) => (
                    <span key={badge} style={chip(...(BADGE[badge] ?? ["var(--paper-2)", "var(--ink-soft)"]))}>{badge.replace("_", " ")}</span>
                  ))}
                </div>
              )}

              {listing.sellerProfile.bio && (
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{listing.sellerProfile.bio}</p>
              )}

              <Link href={`/sellers/${listing.sellerProfile.id}`} style={{ fontSize: 12, color: "var(--clay)", fontWeight: 600, textDecoration: "none" }}>
                View all listings by this seller →
              </Link>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {listing.status === "ACTIVE" && userId && !isOwner && (
                  <>
                    {listing.negotiable
                      ? <OfferButton listingId={listing.id} sellerName={listing.sellerProfile.user.name ?? "Seller"} currency={listing.currency} />
                      : <p style={{ fontSize: 12, textAlign: "center", color: "var(--ink-faint)", margin: 0 }}>This listing has a fixed price.</p>}
                    <MessageSellerButton listingId={listing.id} sellerUserId={listing.sellerProfile.user.id} />
                    {(listing.sellerProfile.user.phone ?? listing.sellerProfile.user.secondaryPhone) && (
                      <a
                        href={`tel:${listing.sellerProfile.user.phone ?? listing.sellerProfile.user.secondaryPhone}`}
                        style={{ display: "block", width: "100%", textAlign: "center", padding: "11px 0", background: "var(--white)", border: "1.5px solid var(--line)", color: "var(--ink)", fontWeight: 700, borderRadius: 11, textDecoration: "none", fontSize: 14, boxSizing: "border-box" }}
                      >
                        Call seller
                      </a>
                    )}
                    {(listing.sellerProfile.user.whatsapp ?? listing.sellerProfile.user.phone) && (
                      <a
                        href={`https://wa.me/${(listing.sellerProfile.user.whatsapp ?? listing.sellerProfile.user.phone ?? "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block", width: "100%", textAlign: "center", padding: "11px 0", background: "#25D366", color: "var(--white)", fontWeight: 700, borderRadius: 11, textDecoration: "none", fontSize: 14, boxSizing: "border-box" }}
                      >
                        WhatsApp seller
                      </a>
                    )}
                  </>
                )}

                {!userId && listing.status === "ACTIVE" && (
                  <Link
                    href={`/login?callbackUrl=/m/${listing.id}`}
                    style={{ display: "block", width: "100%", textAlign: "center", padding: "12px 0", background: "var(--clay)", color: "var(--white)", fontWeight: 700, borderRadius: 11, textDecoration: "none", fontSize: 14 }}
                  >
                    Sign in to contact seller
                  </Link>
                )}

                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <ShareButton url={`/m/${listing.id}`} title={listing.title} text={`${listing.currency} ${price} — ${listing.title}`} />
                </div>

                {listing.status === "ACTIVE" && (
                  <EscrowWidget
                    listingId={listing.id}
                    listingPrice={price}
                    currency={listing.currency}
                    sellerId={listing.sellerProfile.user.id}
                    currentUserId={userId}
                    existingEscrow={activeEscrowSerialized}
                  />
                )}

                {isOwner && (
                  <Link
                    href={`/me/listings/${listing.id}/edit`}
                    style={{ display: "block", width: "100%", textAlign: "center", padding: "10px 0", border: "1px solid var(--line)", color: "var(--ink-soft)", fontSize: 13, fontWeight: 600, borderRadius: 11, textDecoration: "none" }}
                  >
                    Edit listing
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ld-grid { grid-template-columns: 1fr !important; }
          .ld-side { position: static !important; }
        }
      `}</style>
    </main>
  );
}
