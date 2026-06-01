export type SearchVertical = "marketplace" | "jobs" | "network" | "companies";

export interface SearchInput {
  vertical: SearchVertical;
  query?: string;
  filters?: Record<string, unknown>;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "salary_asc" | "salary_desc";
  cursor?: string;
  limit?: number;
}

export interface SearchResult<T> {
  hits: T[];
  nextCursor?: string;
  total?: number;
  took_ms: number;
}

export interface SuggestInput {
  vertical: SearchVertical | "universal";
  prefix: string;
  limit?: number;
}

export interface Suggestion {
  text: string;
  type: string;
  id?: string;
}

export interface SuggestResult {
  suggestions: Suggestion[];
}

export interface UniversalInput {
  query: string;
  limitPerVertical?: number;
}

export interface UniversalResult {
  marketplace: unknown[];
  jobs: unknown[];
  network: unknown[];
  companies: unknown[];
  took_ms: number;
}

export interface SearchClient {
  search<T>(input: SearchInput): Promise<SearchResult<T>>;
  suggest(input: SuggestInput): Promise<SuggestResult>;
  universal(input: UniversalInput): Promise<UniversalResult>;
}
