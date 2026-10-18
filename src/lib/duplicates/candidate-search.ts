/**
 * src/lib/duplicates/candidate-search.ts
 *
 * PRD-03 §8.2 — Duplicate candidate generation using PostgreSQL pg_trgm.
 * Implements the 4-stage candidate pipeline from PRD-03 §8.2.
 *
 * Yeh module sirf server side pe chalta hai — Supabase service role use karta hai.
 * Client complaints ko directly search nahi karna chahiye (PRD-03 §3.3).
 *
 * Stage 1: Eligibility filter (time, category, status, exclude self)
 * Stage 2: Text similarity via pg_trgm word_similarity()
 * Stage 3: Optional pgvector semantic search (stub — extend when ready)
 * Stage 4: Additional signals — category match, time proximity, score merge
 */

import "server-only";

import type { ComplaintCategory } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// PRD-03 §8.3 — Initial similarity thresholds
// ---------------------------------------------------------------------------
export const SIMILARITY_THRESHOLDS = {
  /** Strong duplicate candidate — very likely same physical issue */
  strongDuplicate: 0.85,
  /** Possible relationship — needs closer review by officer */
  possibleRelationship: 0.65,
  /** Below this: keep complaints separate (PRD-03 §8.3) */
  minimum: 0.65,
} as const;

// ---------------------------------------------------------------------------
// Eligibility filter config — PRD-03 §8.2 Stage 1
// ---------------------------------------------------------------------------
/** Max age (days) of complaints to search for duplicates */
const MAX_LOOKBACK_DAYS = 30;

/** Status values considered "active" for duplicate search */
const ACTIVE_STATUSES = ["pending", "open", "in_review", "in_progress"];

// ---------------------------------------------------------------------------
// Candidate result type returned by candidate search
// ---------------------------------------------------------------------------
export interface DuplicateCandidate {
  /** ID of the potentially related existing complaint */
  candidateComplaintId: string;
  /** pg_trgm similarity score 0–1 */
  textSimilarityScore: number;
  /** Whether categories match (additional signal per PRD-03 §8.2 Stage 4) */
  categoryMatch: boolean;
  /** Composite score combining text similarity + category match bonus */
  compositeScore: number;
  /** Human-readable reason for flagging (for officer review queue) */
  reason: string;
}

// ---------------------------------------------------------------------------
// Input parameters for candidate search
// ---------------------------------------------------------------------------
export interface CandidateSearchParams {
  /** ID of the newly submitted complaint — always excluded from results */
  complaintId: string;
  /** AI-determined category of the new complaint */
  category: ComplaintCategory;
  /** Text to search against — complaint description or AI summary */
  searchText: string;
  /** Supabase Admin client (server-side only — service role key) */
  // Using `unknown` here to avoid importing the Supabase type directly,
  // allowing this module to work without a full Supabase type dependency.
  // Caller passes supabaseAdmin from @supabase/supabase-js createClient().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
}

// ---------------------------------------------------------------------------
// Stage 2: pg_trgm text similarity search via Supabase RPC
// PRD-03 §8.2: uses word_similarity() on description + AI summary fields
//
// Requires this PostgreSQL function to exist (create via Supabase migration):
//
//   CREATE OR REPLACE FUNCTION search_duplicate_candidates(
//     p_exclude_id    uuid,
//     p_category      text,
//     p_search_text   text,
//     p_min_similarity float,
//     p_max_age_days  int,
//     p_active_statuses text[]
//   )
//   RETURNS TABLE (
//     complaint_id        uuid,
//     text_similarity     float,
//     category_match      boolean
//   )
//   LANGUAGE sql STABLE
//   AS $$
//     SELECT
//       c.id AS complaint_id,
//       GREATEST(
//         word_similarity(p_search_text, c.description),
//         word_similarity(p_search_text, COALESCE(ca.summary, ''))
//       ) AS text_similarity,
//       (c.category = p_category) AS category_match
//     FROM complaints c
//     LEFT JOIN complaint_analyses ca ON ca.complaint_id = c.id
//     WHERE
//       c.id            <> p_exclude_id
//       AND c.status    = ANY(p_active_statuses)
//       AND c.created_at >= NOW() - (p_max_age_days || ' days')::interval
//       AND GREATEST(
//         word_similarity(p_search_text, c.description),
//         word_similarity(p_search_text, COALESCE(ca.summary, ''))
//       ) >= p_min_similarity
//     ORDER BY text_similarity DESC
//     LIMIT 20;
//   $$;
// ---------------------------------------------------------------------------
export async function findDuplicateCandidates(
  params: CandidateSearchParams
): Promise<DuplicateCandidate[]> {
  const { complaintId, category, searchText, supabaseAdmin } = params;

  // Stage 1 + Stage 2: eligibility filter + pg_trgm similarity via DB RPC
  const { data, error } = await supabaseAdmin.rpc(
    "search_duplicate_candidates",
    {
      p_exclude_id:       complaintId,
      p_category:         category,
      p_search_text:      searchText.slice(0, 1000), // PRD-03 §13: bound input
      p_min_similarity:   SIMILARITY_THRESHOLDS.minimum,
      p_max_age_days:     MAX_LOOKBACK_DAYS,
      p_active_statuses:  ACTIVE_STATUSES,
    }
  );

  if (error) {
    // PRD-03 §11: duplicate detection failure must not block complaint save
    console.error("[CivicPulse Duplicates] candidate search RPC failed:", error.message);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Stage 4: Compute composite score = text similarity + category bonus
  const candidates: DuplicateCandidate[] = data.map(
    (row: {
      complaint_id: string;
      text_similarity: number;
      category_match: boolean;
    }) => {
      const textScore = Number(row.text_similarity) ?? 0;
      // Category match gives +0.10 bonus (capped at 1.0) — PRD-03 §8.2 Stage 4
      const compositeScore = Math.min(1.0, textScore + (row.category_match ? 0.10 : 0));

      let reason = "";
      if (compositeScore >= SIMILARITY_THRESHOLDS.strongDuplicate) {
        reason = `Strong duplicate candidate (score: ${compositeScore.toFixed(2)})`;
      } else {
        reason = `Possible related complaint (score: ${compositeScore.toFixed(2)})`;
      }

      return {
        candidateComplaintId: row.complaint_id,
        textSimilarityScore: textScore,
        categoryMatch: row.category_match,
        compositeScore,
        reason,
      };
    }
  );

  // Sort by composite score descending
  return candidates.sort((a, b) => b.compositeScore - a.compositeScore);
}
