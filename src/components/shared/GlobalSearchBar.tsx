'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ListingHit {
  id: string;
  title: string;
  price: string;
  currency: string;
  region: { name: string; city: string };
  imageKey: string | null;
  propertyType: string | null;
  type: 'listing';
}

interface JobHit {
  id: string;
  title: string;
  company: { id: string; name: string; verifiedEmployer: boolean };
  region: { name: string; city: string };
  remoteType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  type: 'job';
}

interface ProfileHit {
  id: string;
  handle: string;
  headline: string | null;
  profilePhotoUrl: string | null;
  name: string;
  location: string | null;
  type: 'profile';
}

interface SearchData {
  q: string;
  listings: ListingHit[];
  jobs: JobHit[];
  profiles: ProfileHit[];
}

interface GlobalSearchBarProps {
  placeholder?: string;
  initialQ?: string;
}

export default function GlobalSearchBar({ placeholder = "Search...", initialQ = "" }: GlobalSearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQ);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=4`);
      const json = await res.json() as { ok: boolean; data: SearchData };
      if (json.ok) {
        setData(json.data);
        setOpen(true);
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchResults(value);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchResults]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && value.trim().length >= 2) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  }

  const hasResults =
    data && (data.listings.length > 0 || data.jobs.length > 0 || data.profiles.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (data && value.length >= 2) setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg
              className="w-4 h-4 text-gray-400 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          {!hasResults && !loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results for &ldquo;{value}&rdquo;
            </div>
          )}

          {data && data.listings.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Properties
              </p>
              {data.listings.map((item) => (
                <Link
                  key={item.id}
                  href={`/m/${item.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-semibold shrink-0">
                    P
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.currency} {parseFloat(item.price).toLocaleString("en-PK")} &middot; {item.region.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data && data.jobs.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Jobs
              </p>
              {data.jobs.map((item) => (
                <Link
                  key={item.id}
                  href={`/jobs/${item.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    J
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.company.name} &middot; {item.region.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data && data.profiles.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                People
              </p>
              {data.profiles.map((item) => (
                <Link
                  key={item.id}
                  href={`/n/${item.handle}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    {item.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      @{item.handle}{item.headline ? ` · ${item.headline}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {value.trim().length >= 2 && (
            <div className="border-t border-gray-100">
              <Link
                href={`/search?q=${encodeURIComponent(value.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                See all results for &ldquo;{value}&rdquo; →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
