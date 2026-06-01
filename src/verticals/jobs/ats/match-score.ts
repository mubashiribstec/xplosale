/**
 * Deterministic skill/keyword match scoring.
 *
 * score = round(0.70 × required% + 0.20 × niceToHave% + 0.10 × keyword%)
 *
 * Each list is matched as case-insensitive whole-word substrings against the
 * resume rawText. If a list is empty its weight component is treated as 1.0
 * (i.e. empty lists don't penalise the candidate).
 */

export interface MatchInput {
  rawText: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  requiredKeywords: string[];
}

export interface MatchResult {
  score: number;
  requiredMatched: number;
  requiredTotal: number;
  niceToHaveMatched: number;
  niceToHaveTotal: number;
  keywordMatched: number;
  keywordTotal: number;
  matchedTerms: string[];
  missedTerms: string[];
}

function matchList(terms: string[], rawText: string): { matched: string[]; missed: string[] } {
  const lower = rawText.toLowerCase();
  const matched: string[] = [];
  const missed: string[] = [];
  for (const term of terms) {
    const t = term.trim().toLowerCase();
    if (!t) continue;
    // Whole-word match: the term may be surrounded by non-alphanumeric chars or string boundaries
    const re = new RegExp(`(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i");
    if (re.test(lower)) {
      matched.push(term.trim());
    } else {
      missed.push(term.trim());
    }
  }
  return { matched, missed };
}

function listPct(matched: number, total: number): number {
  if (total === 0) return 1.0; // empty list → full credit
  return matched / total;
}

export function computeMatchScore(input: MatchInput): MatchResult {
  const { rawText, requiredSkills, niceToHaveSkills, requiredKeywords } = input;

  const req = matchList(requiredSkills, rawText);
  const nice = matchList(niceToHaveSkills, rawText);
  const kw = matchList(requiredKeywords, rawText);

  const reqPct = listPct(req.matched.length, requiredSkills.length);
  const nicePct = listPct(nice.matched.length, niceToHaveSkills.length);
  const kwPct = listPct(kw.matched.length, requiredKeywords.length);

  const score = Math.round(0.70 * reqPct * 100 + 0.20 * nicePct * 100 + 0.10 * kwPct * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    requiredMatched: req.matched.length,
    requiredTotal: requiredSkills.length,
    niceToHaveMatched: nice.matched.length,
    niceToHaveTotal: niceToHaveSkills.length,
    keywordMatched: kw.matched.length,
    keywordTotal: requiredKeywords.length,
    matchedTerms: [...req.matched, ...nice.matched, ...kw.matched],
    missedTerms: [...req.missed, ...nice.missed, ...kw.missed],
  };
}
