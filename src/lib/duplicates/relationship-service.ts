/**
 * src/lib/duplicates/relationship-service.ts
 *
 * PRD-03 §8.4, §8.5 — Duplicate relationship persistence service.
 * Stores candidate relationships in `complaint_links` table per PRD-02 schema.
 *
 * Key PRD-03 §8.4 rules enforced here:
 *   - Similarity NEVER auto-deletes a complaint
 *   - Every new report gets its own tracking ID (handled upstream)
 *   - Candidate relationships stored SEPARATELY from complaint records
 *   - Authorized reviewer may mark: pending → confirmed / rejected
 *   - Original reports preserved; private data not exposed across complaints
 */

import "server-only";

import {
  buildScoredRelationships,
  type ScoredRelationship,
  type RelationshipState,
} from "./similarity";
import type { DuplicateCandidate } from "./candidate-search";

// ---------------------------------------------------------------------------
// PRD-03 §8.5 — complaint_links row shape (mirrors PRD-02 DB schema)
// ---------------------------------------------------------------------------
export interface ComplaintLinkInsert {
  complaint_id:        string;  // newly submitted complaint
  related_complaint_id: string; // candidate existing complaint
  relationship_type:   "possible_duplicate" | "related_issue";
  state:               RelationshipState;
  similarity_score:    number;
  reason:              string;
  created_by:          "system";  // system-created; officer overrides logged separately
}

// ---------------------------------------------------------------------------
// Persist scored relationships into complaint_links table
// PRD-03 §8.4: store separately from complaint record (no mutation of complaints)
// Returns count of links inserted, or 0 on failure (never throws — PRD-03 §11)
// ---------------------------------------------------------------------------
export async function persistRelationships(params: {
  complaintId: string;
  candidates: DuplicateCandidate[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
}): Promise<{ insertedCount: number; errorMessage?: string }> {
  const { complaintId, candidates, supabaseAdmin } = params;

  const scored: ScoredRelationship[] = buildScoredRelationships(candidates);

  if (scored.length === 0) {
    return { insertedCount: 0 };
  }

  const rows: ComplaintLinkInsert[] = scored
    .filter((r) => r.relationshipType !== null)
    .map((r) => ({
      complaint_id:         complaintId,
      related_complaint_id: r.candidateComplaintId,
      relationship_type:    r.relationshipType as "possible_duplicate" | "related_issue",
      state:                r.state,
      similarity_score:     r.compositeScore,
      reason:               r.reason,
      created_by:           "system",
    }));

  if (rows.length === 0) {
    return { insertedCount: 0 };
  }

  const { error, count } = await supabaseAdmin
    .from("complaint_links")
    .insert(rows)
    .select("id", { count: "exact", head: true });

  if (error) {
    // PRD-03 §11: failure must not block original complaint persistence
    console.error(
      "[CivicPulse Duplicates] Failed to persist relationship links:",
      error.message
    );
    return { insertedCount: 0, errorMessage: error.message };
  }

  console.info(
    `[CivicPulse Duplicates] Inserted ${count ?? rows.length} complaint_links for complaint ${complaintId}.`
  );

  return { insertedCount: count ?? rows.length };
}

// ---------------------------------------------------------------------------
// Officer review: update relationship state (confirm / reject)
// PRD-03 §8.4: authorized reviewer may mark pending → confirmed / rejected
// Records who made the decision and when (PRD-03 §6.2)
// ---------------------------------------------------------------------------
export async function updateRelationshipState(params: {
  linkId: string;
  newState: "confirmed" | "rejected";
  officerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const { linkId, newState, officerId, supabaseAdmin } = params;

  const { error } = await supabaseAdmin
    .from("complaint_links")
    .update({
      state:           newState,
      reviewed_by:     officerId,      // PRD-03 §6.2: record who decided
      reviewed_at:     new Date().toISOString(), // PRD-03 §6.2: and when
    })
    .eq("id", linkId);

  if (error) {
    console.error(
      "[CivicPulse Duplicates] Failed to update relationship state:",
      error.message
    );
    return { success: false, errorMessage: error.message };
  }

  return { success: true };
}
