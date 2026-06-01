import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { searchClient } from "@/core/search/postgres";

const schema = z.object({
  q:          z.string().max(200).default(""),
  regionId:   z.string().cuid().optional(),
  remoteType: z.enum(["ONSITE","HYBRID","REMOTE"]).optional(),
  salaryMin:  z.coerce.number().optional(),
  salaryMax:  z.coerce.number().optional(),
  sort:       z.enum(["relevance","newest","salary_asc","salary_desc"]).default("relevance"),
  cursor:     z.string().optional(),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = schema.safeParse(params);
    if (!parsed.success) return err("Invalid params", 400);

    const { q, sort, cursor, limit, ...filters } = parsed.data;
    const result = await searchClient.search({
      vertical: "jobs",
      query: q,
      filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)),
      sort,
      cursor,
      limit,
    });
    return ok(result);
  } catch (e) {
    return parseError(e);
  }
}
