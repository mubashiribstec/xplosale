import { prisma } from "@/lib/prisma";
import SearchResults from "@/components/shared/SearchResults";
import GlobalSearchBar from "@/components/shared/GlobalSearchBar";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
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

  const limit = 9;
  const runListings = type === "listing" || type === "all";
  const runJobs = type === "job" || type === "all";
  const runProfiles = type === "profile" || type === "all";

  const [rawListings, rawJobs, rawProfiles] = await Promise.all([
    runListings
      ? prisma.listing.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          include: {
            images: { take: 1, orderBy: { order: "asc" } },
            region: { select: { name: true, city: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    runJobs
      ? prisma.jobPosting.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          include: {
            company: { select: { id: true, name: true, verifiedEmployer: true } },
            region: { select: { name: true, city: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    runProfiles
      ? prisma.networkProfile.findMany({
          where: {
            visibility: "PUBLIC",
            OR: [
              { handle: { contains: q, mode: "insensitive" } },
              { headline: { contains: q, mode: "insensitive" } },
              { currentRole: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: {
            user: { select: { name: true } },
          },
          take: limit,
        })
      : Promise.resolve([]),
  ]);

  const listings = rawListings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price.toString(),
    currency: listing.currency,
    region: { name: listing.region.name, city: listing.region.city },
    imageKey: listing.images[0]?.url ?? null,
    propertyType: listing.propertyType as string | null,
    type: "listing" as const,
  }));

  const jobs = rawJobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: {
      id: job.company.id,
      name: job.company.name,
      verifiedEmployer: job.company.verifiedEmployer,
    },
    region: { name: job.region.name, city: job.region.city },
    remoteType: job.remoteType as string,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    type: "job" as const,
  }));

  const profiles = rawProfiles.map((profile) => ({
    id: profile.id,
    handle: profile.handle,
    headline: profile.headline,
    profilePhotoUrl: profile.profilePhotoUrl,
    name: profile.user.name,
    location: profile.location,
    type: "profile" as const,
  }));

  const total = listings.length + jobs.length + profiles.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <GlobalSearchBar placeholder="Search properties, jobs, people..." initialQ={q} />
        </div>

        <div className="mb-6">
          <p className="text-gray-500 text-sm">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>
        </div>

        <SearchResults q={q} listings={listings} jobs={jobs} profiles={profiles} />
      </div>
    </main>
  );
}
