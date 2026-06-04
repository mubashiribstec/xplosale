import SearchResults from "@/components/shared/SearchResults";
import GlobalSearchBar from "@/components/shared/GlobalSearchBar";
import SaveSearchButton from "@/components/shared/SaveSearchButton";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

interface SearchApiResponse {
  ok: boolean;
  data?: {
    q: string;
    listings: {
      id: string;
      title: string;
      price: string;
      currency: string;
      region: { name: string; city: string };
      imageKey: string | null;
      propertyType: string | null;
      type: "listing";
    }[];
    jobs: {
      id: string;
      title: string;
      company: { id: string; name: string; verifiedEmployer: boolean };
      region: { name: string; city: string };
      remoteType: string;
      salaryMin: number | null;
      salaryMax: number | null;
      currency: string;
      type: "job";
    }[];
    profiles: {
      id: string;
      handle: string;
      headline: string | null;
      profilePhotoUrl: string | null;
      name: string | null;
      location: string | null;
      type: "profile";
    }[];
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = sp.type ?? "all";

  if (!q || q.length < 2) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Search</h1>
          <GlobalSearchBar placeholder="Search properties, jobs, people..." />
          <p className="text-gray-400 mt-6 text-center">Enter at least 2 characters to search.</p>
        </div>
      </main>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const apiUrl = `${base}/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&limit=9`;

  let listings: SearchApiResponse["data"]["listings"] = [];
  let jobs: SearchApiResponse["data"]["jobs"] = [];
  let profiles: SearchApiResponse["data"]["profiles"] = [];

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as SearchApiResponse;
      if (json.ok && json.data) {
        listings = json.data.listings;
        jobs = json.data.jobs;
        profiles = json.data.profiles;
      }
    }
  } catch {
    // Gracefully degrade — show empty results
  }

  const total = listings.length + jobs.length + profiles.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <GlobalSearchBar placeholder="Search properties, jobs, people..." initialQ={q} />
        </div>

        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-gray-500 text-sm">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>
          <SaveSearchButton
            vertical="search"
            queryJson={{ q, type }}
            defaultName={q}
          />
        </div>

        <SearchResults q={q} listings={listings} jobs={jobs} profiles={profiles} />
      </div>
    </main>
  );
}
