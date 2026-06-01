import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { searchClient } from "@/core/search/postgres";

const schema = z.object({
  q: z.string().max(200).default(""),
  limit: z.coerce.number().int().min(1).max(10).default(4),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = schema.safeParse(params);
    if (!parsed.success) return err("Invalid params", 400);

    const result = await searchClient.universal({
      query: parsed.data.q,
      limitPerVertical: parsed.data.limit,
    });
    return ok(result);
  } catch (e) {
    return parseError(e);
  }
}
