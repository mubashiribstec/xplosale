import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kvGet, kvSet } from "@/core/adapters/kv";
import type {
  SearchClient, SearchInput, SearchResult,
  SuggestInput, SuggestResult, Suggestion,
  UniversalInput, UniversalResult,
} from "./adapter";
import { buildTsQuery, encodeCursor, decodeCursor, andConditions } from "./query";

const SUGGEST_TTL = parseInt(process.env.SEARCH_AUTOSUGGEST_CACHE_TTL_SECONDS ?? "300", 10);

// ─── Hit types ────────────────────────────────────────────────────────────────

export interface ListingHit {
  id: string; title: string; title_hl: string;
  price: unknown; currency: string; category: string;
  regionId: string; status: string; createdAt: Date;
  propertyType: string | null; beds: number | null;
  rank: number;
}

export interface JobHit {
  id: string; title: string; title_hl: string;
  companyId: string; companyName: string;
  regionId: string; remoteType: string;
  salaryMin: number | null; salaryMax: number | null; currency: string;
  status: string; createdAt: Date; rank: number;
}

export interface NetworkHit {
  id: string; handle: string; handle_hl: string;
  userId: string; headline: string | null;
  currentRole: string | null; verifiedProfessional: boolean;
  rank: number;
}

export interface CompanyHit {
  id: string; name: string; name_hl: string;
  industry: string | null; logoUrl: string | null;
  regionId: string; verifiedEmployer: boolean;
  rank: number;
}

// ─── PostgresSearchClient ────────────────────────────────────────────────────

export class PostgresSearchClient implements SearchClient {

  async search<T>(input: SearchInput): Promise<SearchResult<T>> {
    const start = Date.now();
    const { vertical, query = "", filters = {}, sort = "relevance", cursor, limit = 20 } = input;
    const offset = decodeCursor(cursor);

    const hits = await this.queryVertical(vertical, query, filters, sort, offset, limit + 1);
    const hasMore = hits.length > limit;

    return {
      hits: hits.slice(0, limit) as T[],
      nextCursor: hasMore ? encodeCursor(offset + limit) : undefined,
      took_ms: Date.now() - start,
    };
  }

  async suggest(input: SuggestInput): Promise<SuggestResult> {
    const { vertical, prefix, limit = 6 } = input;
    if (!prefix.trim()) return { suggestions: [] };

    const cacheKey = `suggest:${vertical}:${prefix.toLowerCase().slice(0, 40)}`;
    const cached = await kvGet(cacheKey);
    if (cached) return JSON.parse(cached) as SuggestResult;

    const suggestions = await this.querySuggest(vertical, prefix, limit);
    const result: SuggestResult = { suggestions };
    await kvSet(cacheKey, JSON.stringify(result), SUGGEST_TTL);
    return result;
  }

  async universal(input: UniversalInput): Promise<UniversalResult> {
    const start = Date.now();
    const { query, limitPerVertical = 4 } = input;

    const [marketplace, jobs, network, companies] = await Promise.all([
      this.searchListings(query, {}, "relevance", 0, limitPerVertical),
      this.searchJobs(query, {}, "relevance", 0, limitPerVertical),
      this.searchProfiles(query, {}, "relevance", 0, limitPerVertical),
      this.searchCompanies(query, {}, "relevance", 0, limitPerVertical),
    ]);

    return { marketplace, jobs, network, companies, took_ms: Date.now() - start };
  }

  // ─── Per-vertical dispatchers ──────────────────────────────────────────────

  private queryVertical(
    vertical: string, query: string, filters: Record<string, unknown>,
    sort: string, offset: number, limit: number
  ) {
    switch (vertical) {
      case "marketplace": return this.searchListings(query, filters, sort, offset, limit);
      case "jobs":        return this.searchJobs(query, filters, sort, offset, limit);
      case "network":     return this.searchProfiles(query, filters, sort, offset, limit);
      case "companies":   return this.searchCompanies(query, filters, sort, offset, limit);
      default:            return Promise.resolve([]);
    }
  }

  // ─── Listings ─────────────────────────────────────────────────────────────

  private async searchListings(
    query: string, filters: Record<string, unknown>,
    sort: string, offset: number, limit: number
  ): Promise<ListingHit[]> {
    const conditions: (Prisma.Sql | false | null | undefined)[] = [
      Prisma.sql`l.status = 'ACTIVE'`,
    ];
    if (filters.regionId) conditions.push(Prisma.sql`l."regionId" = ${String(filters.regionId)}`);
    if (filters.category) conditions.push(Prisma.sql`l.category = ${String(filters.category)}`);
    if (filters.propertyType) conditions.push(Prisma.sql`l."propertyType" = ${String(filters.propertyType)}::"PropertyType"`);
    if (filters.priceMin != null) conditions.push(Prisma.sql`l.price >= ${Number(filters.priceMin)}`);
    if (filters.priceMax != null) conditions.push(Prisma.sql`l.price <= ${Number(filters.priceMax)}`);
    if (filters.beds != null) conditions.push(Prisma.sql`l.beds = ${Number(filters.beds)}`);
    const where = andConditions(conditions);

    const orderBy = this.listingOrderBy(sort);

    if (query.trim()) {
      const q = buildTsQuery(query);
      const results = await prisma.$queryRaw<ListingHit[]>`
        SELECT
          l.id, l.title,
          ts_headline('simple', l.title, ${q}, 'MaxWords=6,MinWords=1') AS title_hl,
          l.price, l.currency, l.category, l."regionId", l.status, l."createdAt",
          l."propertyType", l.beds,
          ts_rank_cd(l."searchVector", ${q}) AS rank
        FROM "Listing" l
        WHERE ${where} AND l."searchVector" @@ ${q}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `;
      if (results.length > 0) return results;

      // trgm fallback for typo tolerance
      return prisma.$queryRaw<ListingHit[]>`
        SELECT
          l.id, l.title, l.title AS title_hl,
          l.price, l.currency, l.category, l."regionId", l.status, l."createdAt",
          l."propertyType", l.beds,
          similarity(l.title, ${query}) AS rank
        FROM "Listing" l
        WHERE ${where} AND similarity(l.title, ${query}) > 0.1
        ORDER BY rank DESC, l."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // No query — browse/filter
    return prisma.$queryRaw<ListingHit[]>`
      SELECT
        l.id, l.title, l.title AS title_hl,
        l.price, l.currency, l.category, l."regionId", l.status, l."createdAt",
        l."propertyType", l.beds,
        0::float AS rank
      FROM "Listing" l
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private listingOrderBy(sort: string): Prisma.Sql {
    switch (sort) {
      case "price_asc":  return Prisma.sql`l.price ASC, l."createdAt" DESC`;
      case "price_desc": return Prisma.sql`l.price DESC, l."createdAt" DESC`;
      case "newest":     return Prisma.sql`l."createdAt" DESC`;
      default:           return Prisma.sql`rank DESC, l."createdAt" DESC`;
    }
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  private async searchJobs(
    query: string, filters: Record<string, unknown>,
    sort: string, offset: number, limit: number
  ): Promise<JobHit[]> {
    const conditions: (Prisma.Sql | false | null | undefined)[] = [
      Prisma.sql`j.status = 'ACTIVE'`,
      Prisma.sql`(j."expiresAt" IS NULL OR j."expiresAt" > now())`,
    ];
    if (filters.regionId)   conditions.push(Prisma.sql`j."regionId" = ${String(filters.regionId)}`);
    if (filters.remoteType) conditions.push(Prisma.sql`j."remoteType" = ${String(filters.remoteType)}::"RemoteType"`);
    if (filters.salaryMin != null) conditions.push(Prisma.sql`j."salaryMax" >= ${Number(filters.salaryMin)}`);
    if (filters.salaryMax != null) conditions.push(Prisma.sql`j."salaryMin" <= ${Number(filters.salaryMax)}`);
    const where = andConditions(conditions);

    const orderBy = sort === "newest"
      ? Prisma.sql`j."createdAt" DESC`
      : Prisma.sql`rank DESC, j."createdAt" DESC`;

    if (query.trim()) {
      const q = buildTsQuery(query);
      const results = await prisma.$queryRaw<JobHit[]>`
        SELECT
          j.id, j.title,
          ts_headline('simple', j.title, ${q}, 'MaxWords=6,MinWords=1') AS title_hl,
          j."companyId", c.name AS "companyName",
          j."regionId", j."remoteType",
          j."salaryMin", j."salaryMax", j.currency,
          j.status, j."createdAt",
          ts_rank_cd(j."searchVector", ${q}) AS rank
        FROM "JobPosting" j
        JOIN "Company" c ON c.id = j."companyId"
        WHERE ${where} AND j."searchVector" @@ ${q}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `;
      if (results.length > 0) return results;

      return prisma.$queryRaw<JobHit[]>`
        SELECT
          j.id, j.title, j.title AS title_hl,
          j."companyId", c.name AS "companyName",
          j."regionId", j."remoteType",
          j."salaryMin", j."salaryMax", j.currency,
          j.status, j."createdAt",
          similarity(j.title, ${query}) AS rank
        FROM "JobPosting" j
        JOIN "Company" c ON c.id = j."companyId"
        WHERE ${where} AND similarity(j.title, ${query}) > 0.1
        ORDER BY rank DESC, j."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return prisma.$queryRaw<JobHit[]>`
      SELECT
        j.id, j.title, j.title AS title_hl,
        j."companyId", c.name AS "companyName",
        j."regionId", j."remoteType",
        j."salaryMin", j."salaryMax", j.currency,
        j.status, j."createdAt",
        0::float AS rank
      FROM "JobPosting" j
      JOIN "Company" c ON c.id = j."companyId"
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // ─── Network Profiles ─────────────────────────────────────────────────────

  private async searchProfiles(
    query: string, filters: Record<string, unknown>,
    _sort: string, offset: number, limit: number
  ): Promise<NetworkHit[]> {
    const conditions: (Prisma.Sql | false | null | undefined)[] = [
      Prisma.sql`np.visibility = 'PUBLIC'`,
    ];
    const where = andConditions(conditions);

    if (query.trim()) {
      const q = buildTsQuery(query);
      const results = await prisma.$queryRaw<NetworkHit[]>`
        SELECT
          np.id, np.handle,
          ts_headline('simple', np.handle, ${q}, 'MaxWords=4,MinWords=1') AS handle_hl,
          np."userId", np.headline, np."currentRole", np."verifiedProfessional",
          ts_rank_cd(np."searchVector", ${q}) AS rank
        FROM "NetworkProfile" np
        WHERE ${where} AND np."searchVector" @@ ${q}
        ORDER BY rank DESC, np."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      if (results.length > 0) return results;

      return prisma.$queryRaw<NetworkHit[]>`
        SELECT
          np.id, np.handle, np.handle AS handle_hl,
          np."userId", np.headline, np."currentRole", np."verifiedProfessional",
          similarity(np.handle, ${query}) AS rank
        FROM "NetworkProfile" np
        WHERE ${where} AND similarity(np.handle, ${query}) > 0.1
        ORDER BY rank DESC, np."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return prisma.$queryRaw<NetworkHit[]>`
      SELECT
        np.id, np.handle, np.handle AS handle_hl,
        np."userId", np.headline, np."currentRole", np."verifiedProfessional",
        0::float AS rank
      FROM "NetworkProfile" np
      WHERE ${where}
      ORDER BY np."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // ─── Companies ───────────────────────────────────────────────────────────

  private async searchCompanies(
    query: string, _filters: Record<string, unknown>,
    _sort: string, offset: number, limit: number
  ): Promise<CompanyHit[]> {
    if (query.trim()) {
      const q = buildTsQuery(query);
      const results = await prisma.$queryRaw<CompanyHit[]>`
        SELECT
          c.id, c.name,
          ts_headline('simple', c.name, ${q}, 'MaxWords=4,MinWords=1') AS name_hl,
          c.industry, c."logoUrl", c."regionId", c."verifiedEmployer",
          ts_rank_cd(c."searchVector", ${q}) AS rank
        FROM "Company" c
        WHERE c."searchVector" @@ ${q}
        ORDER BY rank DESC, c."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      if (results.length > 0) return results;

      return prisma.$queryRaw<CompanyHit[]>`
        SELECT
          c.id, c.name, c.name AS name_hl,
          c.industry, c."logoUrl", c."regionId", c."verifiedEmployer",
          similarity(c.name, ${query}) AS rank
        FROM "Company" c
        WHERE similarity(c.name, ${query}) > 0.1
        ORDER BY rank DESC, c."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return prisma.$queryRaw<CompanyHit[]>`
      SELECT
        c.id, c.name, c.name AS name_hl,
        c.industry, c."logoUrl", c."regionId", c."verifiedEmployer",
        0::float AS rank
      FROM "Company" c
      ORDER BY c."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // ─── Suggest ─────────────────────────────────────────────────────────────

  private async querySuggest(
    vertical: string, prefix: string, limit: number
  ): Promise<Suggestion[]> {
    const safe = prefix.slice(0, 60);

    if (vertical === "universal" || vertical === "marketplace") {
      const rows = await prisma.$queryRaw<{ title: string; id: string }[]>`
        SELECT title, id FROM "Listing"
        WHERE status = 'ACTIVE' AND title ILIKE ${safe + "%"}
        ORDER BY similarity(title, ${safe}) DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;
      const suggestions: Suggestion[] = rows.map((r) => ({ text: r.title, type: "listing", id: r.id }));
      if (vertical !== "universal") return suggestions;

      const jobRows = await prisma.$queryRaw<{ title: string; id: string }[]>`
        SELECT title, id FROM "JobPosting"
        WHERE status = 'ACTIVE' AND title ILIKE ${safe + "%"}
        ORDER BY similarity(title, ${safe}) DESC
        LIMIT ${Math.ceil(limit / 2)}
      `;
      return [
        ...suggestions,
        ...jobRows.map((r) => ({ text: r.title, type: "job", id: r.id })),
      ].slice(0, limit);
    }

    if (vertical === "jobs") {
      const rows = await prisma.$queryRaw<{ title: string; id: string }[]>`
        SELECT title, id FROM "JobPosting"
        WHERE status = 'ACTIVE' AND title ILIKE ${safe + "%"}
        ORDER BY similarity(title, ${safe}) DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ text: r.title, type: "job", id: r.id }));
    }

    if (vertical === "network") {
      const rows = await prisma.$queryRaw<{ handle: string; id: string }[]>`
        SELECT handle, id FROM "NetworkProfile"
        WHERE visibility = 'PUBLIC' AND handle ILIKE ${safe + "%"}
        ORDER BY similarity(handle, ${safe}) DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ text: r.handle, type: "profile", id: r.id }));
    }

    if (vertical === "companies") {
      const rows = await prisma.$queryRaw<{ name: string; id: string }[]>`
        SELECT name, id FROM "Company"
        WHERE name ILIKE ${safe + "%"}
        ORDER BY similarity(name, ${safe}) DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ text: r.name, type: "company", id: r.id }));
    }

    return [];
  }
}

// Singleton instance — import this everywhere
export const searchClient: SearchClient = new PostgresSearchClient();
