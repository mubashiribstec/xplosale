import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { searchClient } from "@/core/search/postgres";

const schema = z.object({
  q:      z.string().max(200).default(""),
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = schema.safeParse(params);
    if (!parsed.success) return err("Invalid params", 400);

    const { q, cursor, limit } = parsed.data;
    const result = await searchClient.search({ vertical: "companies", query: q, cursor, limit });
    return ok(result);
  } catch (e) {
    return parseError(e);
  }
}
