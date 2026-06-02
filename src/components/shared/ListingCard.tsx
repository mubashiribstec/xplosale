"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Home, Car, Smartphone, Monitor, Sofa, Shirt, Gamepad, Tag, Zap } from "lucide-react";
import { getPublicUrl } from "@/core/adapters/storage";
import { KhatamPattern } from "@/components/ui/XplosaleUI";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number | string;
    currency: string;
    category: string;
    propertyType?: string | null;
    areaValue?: number | null;
    areaUnit?: string | null;
    beds?: number | null;
    baths?: number | null;
    createdAt?: Date | string;
    region: { name: string; city: string };
    images: { url: string; width: number; height: number }[];
    sellerProfile?: { agentTier: string; user?: { id: string; name: string | null } } | null;
  };
}

/** Pick a gradient + icon based on category or propertyType */
function getCategoryTheme(category: string, propertyType?: string | null, title?: string): {
  gradient: string;
  icon: React.ReactNode;
} {
  const cat = (category + " " + (propertyType ?? "") + " " + (title ?? "")).toLowerCase();

  if (cat.includes("propert") || cat.includes("house") || cat.includes("apartment") || cat.includes("plot") || cat.includes("real estate")) {
    return {
      gradient: "linear-gradient(135deg, #c17f6a 0%, #8B4513 100%)",
      icon: <Home size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("vehicle") || cat.includes("car") || cat.includes("auto") || cat.includes("bike") || cat.includes("motor")) {
    return {
      gradient: "linear-gradient(135deg, #3a7bd5 0%, #1a3a6b 100%)",
      icon: <Car size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("mobile") || cat.includes("phone") || cat.includes("smartphone")) {
    return {
      gradient: "linear-gradient(135deg, #6c3fd0 0%, #3a1a7a 100%)",
      icon: <Smartphone size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("electron") || cat.includes("computer") || cat.includes("laptop")) {
    return {
      gradient: "linear-gradient(135deg, #2b7dc4 0%, #0a3d6e 100%)",
      icon: <Monitor size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("home") || cat.includes("living") || cat.includes("furniture") || cat.includes("decor")) {
    return {
      gradient: "linear-gradient(135deg, #b07d4b 0%, #6b4520 100%)",
      icon: <Sofa size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("appliance") || cat.includes("kitchen")) {
    return {
      gradient: "linear-gradient(135deg, #3aaa7f 0%, #1a5c44 100%)",
      icon: <Zap size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("fashion") || cat.includes("cloth") || cat.includes("wear")) {
    return {
      gradient: "linear-gradient(135deg, #d45fa5 0%, #7a1a5a 100%)",
      icon: <Shirt size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  if (cat.includes("gaming") || cat.includes("game") || cat.includes("console")) {
    return {
      gradient: "linear-gradient(135deg, #4b3fd0 0%, #1a0a7a 100%)",
      icon: <Gamepad size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
    };
  }
  // default
  return {
    gradient: "linear-gradient(135deg, #7A7167 0%, #3D362F 100%)",
    icon: <Tag size={40} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />,
  };
}

function timeAgo(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const firstImage = listing.images[0];
  const price = Number(listing.price).toLocaleString("en-PK");
  const ago = timeAgo(listing.createdAt);
  const isVerified = listing.sellerProfile?.agentTier === "PRO" || listing.sellerProfile?.agentTier === "ELITE";
  const { gradient, icon } = getCategoryTheme(listing.category, listing.propertyType, listing.title);

  return (
    <Link href={`/m/${listing.id}`} className="group block" style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "var(--white)",
          borderRadius: 16,
          border: "1px solid var(--line)",
          overflow: "hidden",
          transition: "transform 0.22s ease, box-shadow 0.22s ease",
          cursor: "pointer",
        }}
        className="lc-card"
      >
        {/* Image section */}
        <div style={{ position: "relative", width: "100%", height: 192, overflow: "hidden" }}>
          {firstImage ? (
            <Image
              src={getPublicUrl(firstImage.url)}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ transition: "transform 0.3s ease" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <KhatamPattern opacity={0.12} />
              {icon}
            </div>
          )}

          {/* Top-left: condition pill (placeholder — no condition field in DB yet) */}
          {listing.propertyType && (
            <span
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "rgba(251,250,245,0.92)",
                border: "1px solid rgba(219,213,200,0.5)",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "3px 8px",
                color: "var(--ink-soft)",
                fontFamily: "var(--body)",
                backdropFilter: "blur(4px)",
                lineHeight: 1.4,
                textTransform: "capitalize",
              }}
            >
              {listing.propertyType.toLowerCase()}
            </span>
          )}

          {/* Top-right badges */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            {isVerified && <VerifiedBadge size="sm" />}
            {/* Escrow badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(28,24,21,0.82)",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px 3px 6px",
                color: "var(--green-bright)",
                fontFamily: "var(--body)",
                backdropFilter: "blur(4px)",
                lineHeight: 1.4,
              }}
            >
              <svg width={10} height={11} viewBox="0 0 16 18" fill="none" aria-hidden="true">
                <path
                  d="M8 1L14 3.5V9C14 12.3 11.4 15.3 8 17C4.6 15.3 2 12.3 2 9V3.5L8 1Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  fill="rgba(22,197,136,.2)"
                />
              </svg>
              Escrow
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Title */}
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 17,
              lineHeight: 1.3,
              color: "var(--ink)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 44,
            }}
          >
            {listing.title}
          </h3>

          {/* Price */}
          <p
            style={{
              margin: 0,
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 23,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {listing.currency} {price}
          </p>

          {/* Bottom row: location + time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--ink-faint)",
                fontFamily: "var(--body)",
              }}
            >
              <MapPin size={12} strokeWidth={2} />
              {listing.region.city}, {listing.region.name}
            </span>
            {ago && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--ink-faint)",
                  fontFamily: "var(--body)",
                }}
              >
                <Clock size={12} strokeWidth={2} />
                {ago}
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .lc-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </Link>
  );
}
