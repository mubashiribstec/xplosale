"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ListingCard from "@/components/shared/ListingCard";
import SaveSearchButton from "@/components/shared/SaveSearchButton";

interface ListingItem {
  id: string;
  title: string;
  price: string;
  currency: string;
  category: string;
  propertyType?: string | null;
  areaValue?: number | null;
  areaUnit?: string | null;
  beds?: number | null;
  baths?: number | null;
  createdAt?: string;
  region: { name: string; city: string };
  images: { url: string; width: number; height: number }[];
  sellerProfile?: { agentTier: string; user?: { id: string; name: string | null } } | null;
}

interface Props {
  categories: string[];
  listings: ListingItem[];
  total: number;
  pages: number;
  currentPage: number;
  currentSort: string;
  searchParams: Record<string, string>;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function MarketplaceShell({
  categories,
  listings,
  total,
  pages,
  currentPage,
  currentSort,
  searchParams,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Local sidebar state (drives URL params on apply/change)
  const [verified, setVerified] = useState(searchParams.verified === "1");
  const [condition, setCondition] = useState(searchParams.condition ?? "all");
  const [minPrice, setMinPrice] = useState(searchParams.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice ?? "");
  const [searchQ, setSearchQ] = useState(searchParams.q ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeCategory = searchParams.category ?? "All";

  function buildParams(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined && v !== "") {
        p.set(k, v);
      } else {
        p.delete(k);
      }
    }
    p.delete("page");
    return p.toString();
  }

  function navigate(overrides: Record<string, string | undefined>) {
    router.push(`${pathname}?${buildParams(overrides)}`);
  }

  function handleCategoryClick(cat: string) {
    navigate({ category: cat === "All" ? undefined : cat });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: searchQ || undefined });
  }

  function applyFilters() {
    navigate({
      verified: verified ? "1" : undefined,
      condition: condition !== "all" ? condition : undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
    });
    setMobileSidebarOpen(false);
  }

  function resetFilters() {
    setVerified(false);
    setCondition("all");
    setMinPrice("");
    setMaxPrice("");
    navigate({
      verified: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  }

  const hasActiveFilters = verified || condition !== "all" || !!minPrice || !!maxPrice;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--line)",
          padding: "40px 24px 32px",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <p
            className="eyebrow"
            style={{ color: "var(--ink-faint)", marginBottom: 8 }}
          >
            Marketplace
          </p>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(32px, 5vw, 52px)",
              color: "var(--ink)",
              margin: "0 0 10px",
              lineHeight: 1.1,
            }}
          >
            Buy &amp; sell anything.
          </h1>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 16,
              color: "var(--ink-faint)",
              margin: "0 0 24px",
            }}
          >
            Millions of listings across Pakistan — verified sellers, secure escrow.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: 0,
              maxWidth: 600,
              background: "var(--paper-2)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                paddingLeft: 14,
                color: "var(--ink-faint)",
              }}
            >
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                padding: "12px 14px",
                fontFamily: "var(--body)",
                fontSize: 15,
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "var(--ink)",
                color: "var(--white)",
                border: "none",
                padding: "0 20px",
                fontFamily: "var(--body)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            <SaveSearchButton
              vertical="marketplace"
              queryJson={searchParams}
              defaultName={searchParams.q ? searchParams.q : searchParams.category ? searchParams.category : "Marketplace search"}
            />
          </div>
        </div>
      </div>

      {/* ── Category rail ── */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--white)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            gap: 8,
            paddingTop: 12,
            paddingBottom: 12,
            whiteSpace: "nowrap",
          }}
        >
          {categories.map((cat) => {
            const active = cat === activeCategory || (cat === "All" && !searchParams.category);
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  border: active ? "1.5px solid var(--ink)" : "1.5px solid var(--line)",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--white)" : "var(--ink-soft)",
                  fontFamily: "var(--body)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body: sidebar + feed ── */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 24px",
          display: "grid",
          gridTemplateColumns: "256px 1fr",
          gap: 28,
          alignItems: "start",
        }}
        className="mp-body"
      >
        {/* ── Sidebar ── */}
        <aside
          className={`mp-sidebar${mobileSidebarOpen ? " mp-sidebar-open" : ""}`}
          style={{
            background: "var(--white)",
            borderRadius: 18,
            border: "1px solid var(--line)",
            padding: "20px",
            position: "sticky",
            top: "calc(62px + 24px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: 16,
                color: "var(--ink)",
              }}
            >
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  fontSize: 12,
                  fontFamily: "var(--body)",
                  color: "var(--clay)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Verified toggle */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                }}
              >
                Verified sellers only
              </span>
              <button
                role="switch"
                aria-checked={verified}
                onClick={() => setVerified(!verified)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 999,
                  border: "none",
                  background: verified ? "var(--green)" : "var(--paper-3)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: verified ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--white)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </label>
          </div>

          {/* Condition chips */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontFamily: "var(--body)",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: 8,
              }}
            >
              Condition
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", "new", "used"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border: condition === c ? "1.5px solid var(--ink)" : "1.5px solid var(--line)",
                    background: condition === c ? "var(--ink)" : "transparent",
                    color: condition === c ? "var(--white)" : "var(--ink-soft)",
                    fontFamily: "var(--body)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s",
                  }}
                >
                  {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontFamily: "var(--body)",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: 8,
              }}
            >
              Price range (PKR)
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  background: "var(--paper-2)",
                  color: "var(--ink)",
                  outline: "none",
                  minWidth: 0,
                }}
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  background: "var(--paper-2)",
                  color: "var(--ink)",
                  outline: "none",
                  minWidth: 0,
                }}
              />
            </div>
          </div>

          {/* Apply button */}
          <button
            onClick={applyFilters}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--ink)",
              color: "var(--white)",
              border: "none",
              borderRadius: 10,
              fontFamily: "var(--body)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            Apply filters
          </button>
        </aside>

        {/* ── Feed ── */}
        <section>
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  color: "var(--ink-faint)",
                }}
              >
                {total.toLocaleString()} listing{total !== 1 ? "s" : ""}
              </span>
              {/* Mobile filter toggle — hidden on md+ */}
              <button
                className="flex items-center gap-1.5 md:hidden"
                onClick={() => setMobileSidebarOpen((v) => !v)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: mobileSidebarOpen ? "1.5px solid var(--ink)" : "1.5px solid var(--line)",
                  background: mobileSidebarOpen ? "var(--ink)" : "transparent",
                  color: mobileSidebarOpen ? "var(--white)" : "var(--ink-soft)",
                  fontFamily: "var(--body)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {mobileSidebarOpen ? <X size={13} /> : <SlidersHorizontal size={13} />}
                {mobileSidebarOpen ? "Hide filters" : "Filters"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={`${pathname}?${buildParams({ sort: opt.value })}`}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border:
                      currentSort === opt.value
                        ? "1.5px solid var(--ink)"
                        : "1.5px solid var(--line)",
                    background: currentSort === opt.value ? "var(--ink)" : "transparent",
                    color: currentSort === opt.value ? "var(--white)" : "var(--ink-soft)",
                    fontFamily: "var(--body)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Grid */}
          {listings.length === 0 ? (
            <div
              style={{
                background: "var(--white)",
                borderRadius: 18,
                border: "1px solid var(--line)",
                padding: "64px 32px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: 22,
                  color: "var(--ink)",
                  margin: "0 0 10px",
                }}
              >
                No listings found
              </p>
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  color: "var(--ink-faint)",
                  margin: 0,
                }}
              >
                Try adjusting your filters or search terms, or{" "}
                <Link href="/m" style={{ color: "var(--clay)", textDecoration: "none", fontWeight: 600 }}>
                  clear all
                </Link>
                .
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 18,
              }}
              className="lc-grid"
            >
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{
                    ...listing,
                    createdAt: listing.createdAt ? new Date(listing.createdAt) : undefined,
                  }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 36,
              }}
            >
              {currentPage > 1 && (
                <Link
                  href={`${pathname}?${buildParams({ page: String(currentPage - 1) })}`}
                  style={{
                    padding: "8px 18px",
                    border: "1.5px solid var(--line)",
                    borderRadius: 10,
                    fontFamily: "var(--body)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    textDecoration: "none",
                    background: "var(--white)",
                  }}
                >
                  Previous
                </Link>
              )}
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13.5,
                  color: "var(--ink-faint)",
                }}
              >
                Page {currentPage} of {pages}
              </span>
              {currentPage < pages && (
                <Link
                  href={`${pathname}?${buildParams({ page: String(currentPage + 1) })}`}
                  style={{
                    padding: "8px 18px",
                    border: "1.5px solid var(--line)",
                    borderRadius: 10,
                    fontFamily: "var(--body)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    textDecoration: "none",
                    background: "var(--white)",
                  }}
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mp-body {
            grid-template-columns: 1fr !important;
          }
          .lc-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          /* Sidebar hidden by default on mobile; shown when toggle is active */
          .mp-sidebar {
            display: none;
          }
          .mp-sidebar.mp-sidebar-open {
            display: block;
          }
        }
        @media (max-width: 480px) {
          .lc-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
