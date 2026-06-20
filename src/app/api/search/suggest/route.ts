import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { searchClient } from "@/core/search/postgres";

const schema = z.object({
  vertical: z.enum(["universal", "marketplace", "jobs", "companies"]).default("universal"),
  prefix: z.string().max(60).default(""),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = schema.safeParse(params);
    if (!parsed.success) return err("Invalid params", 400);

    const result = await searchClient.suggest(parsed.data);
    return ok(result);
  } catch (e) {
    return parseError(e);
  }
}
