/**
 * src/lib/duplicates/similarity.ts
 *
 * PRD-03 §8.2, §8.3 — Similarity scoring utilities.
 * Pure functions — no DB calls. Used to interpret candidate scores
 * returned from candidate-search.ts and classify relationships.
 *
 * PRD-03 §8.4: similarity must NOT auto-delete complaints.
 * PRD-03 §8.5: candidate relationships stored separately from complaint record.
 */

import { SIMILARITY_THRESHOLDS } from "./candidate-search";

// ---------------------------------------------------------------------------
// Relationship type — PRD-03 §8.5
// ---------------------------------------------------------------------------
export type RelationshipType =
  | "possible_duplicate"   // strong score — likely same physical issue
  | "related_issue"        // moderate score — possibly related
  | null;                  // below minimum threshold — keep separate

// ---------------------------------------------------------------------------
// Classify a composite score into a relationship type — PRD-03 §8.3
// ---------------------------------------------------------------------------
export function classifyRelationship(compositeScore: number): RelationshipType {
  if (compositeScore >= SIMILARITY_THRESHOLDS.strongDuplicate) {
    return "possible_duplicate";
  }
  if (compositeScore >= SIMILARITY_THRESHOLDS.possibleRelationship) {
    return "related_issue";
  }
  // PRD-03 §8.3: below 0.65 — keep separate unless other evidence justifies review
  return null;
}

// ---------------------------------------------------------------------------
// Determine initial relationship state — PRD-03 §8.5
// "pending" is the default — officers must confirm or reject
// ---------------------------------------------------------------------------
export type RelationshipState = "pending" | "confirmed" | "rejected";

export function initialRelationshipState(): RelationshipState {
  // PRD-03 §8.4: always starts as pending — never auto-confirmed
  return "pending";
}

// ---------------------------------------------------------------------------
// Summarize candidate batch for officer review display
// Returns only non-null relationship candidates above minimum threshold
// ---------------------------------------------------------------------------
export interface ScoredRelationship {
  candidateComplaintId: string;
  compositeScore: number;
  relationshipType: RelationshipType;
  state: RelationshipState;
  reason: string;
}

export function buildScoredRelationships(
  candidates: Array<{
    candidateComplaintId: string;
    compositeScore: number;
    reason: string;
  }>
): ScoredRelationship[] {
  return candidates
    .map((c) => ({
      candidateComplaintId: c.candidateComplaintId,
      compositeScore: c.compositeScore,
      relationshipType: classifyRelationship(c.compositeScore),
      state: initialRelationshipState(),
      reason: c.reason,
    }))
    .filter((r) => r.relationshipType !== null); // drop below-threshold entries
}
