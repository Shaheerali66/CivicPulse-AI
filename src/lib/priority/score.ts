/**
 * src/lib/priority/score.ts
 *
 * PRD-03 §9 — Priority scoring engine.
 * Implements the formula: S = 0.40V + 0.25I + 0.20D + 0.15T
 *
 * PRD-03 §9.5: implemented deterministically in a server-side module
 * with configurable weights (all weights live in config.ts).
 *
 * PRD-03 §9.4: safety override — a credible urgent hazard may escalate
 * independently of the calculated score. The underlying numerical score
 * is always preserved and the override reason is logged.
 *
 * Inputs are normalized to [0, 100] by normalization.ts before weighting.
 * Output score S is in [0, 100]; mapped to a priority band by getPriorityBand().
 */

import {
  PRIORITY_WEIGHTS,
  SEVERITY_SCORES,
  PRIORITY_BANDS,
  type PriorityBand,
} from "./config";
import {
  normalizePublicImpact,
  normalizeRelatedReports,
  normalizeTimeUnresolved,
  estimatePublicImpactFromSeverity,
} from "./normalization";
import type { Severity } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// Input to the scoring function
// ---------------------------------------------------------------------------
export interface PriorityScoreInput {
  /** AI-determined or officer-confirmed severity */
  severity: Severity;
  /**
   * Public impact score 0–100.
   * If undefined, estimated from severity + safetyConcern via normalization.ts.
   */
  publicImpact?: number;
  /** Whether a safety concern is flagged — used for impact estimation */
  safetyConcern: boolean;
  /**
   * Count of independent related complaints (from duplicate detection).
   * Used as D in formula. Normalized and capped internally per §9.2.
   */
  relatedReportCount: number;
  /** ISO timestamp when complaint was submitted — for T calculation */
  submittedAt: string;
  /** ISO timestamp when resolved, if applicable — for T calculation */
  resolvedAt?: string;
}

// ---------------------------------------------------------------------------
// Scoring result — always includes the underlying numerical score
// PRD-03 §9.4: safety override must preserve the underlying score
// ---------------------------------------------------------------------------
export interface PriorityScoreResult {
  /** Final weighted score S in [0, 100] — may be the same as rawScore */
  score: number;
  /** Raw computed score before any override — always preserved per §9.4 */
  rawScore: number;
  /** Mapped priority band per PRD-03 §9.3 */
  band: PriorityBand;
  /** Whether a safety override was applied per PRD-03 §9.4 */
  safetyOverrideApplied: boolean;
  /** Reason for override (if applied) — for audit trail per §9.4 */
  overrideReason?: string;
  /** Breakdown of normalized inputs for explainability (PRD-03 §12) */
  breakdown: {
    V: number;  // severity score (0–100)
    I: number;  // public impact (0–100)
    D: number;  // related reports normalized (0–100)
    T: number;  // time unresolved normalized (0–100)
  };
}

// ---------------------------------------------------------------------------
// Safety override threshold — PRD-03 §9.4
// When a safety concern exists and score < this, elevate to "critical" band
// ---------------------------------------------------------------------------
const SAFETY_OVERRIDE_MIN_SCORE = 75;

// ---------------------------------------------------------------------------
// Map a score to a priority band — PRD-03 §9.3
// ---------------------------------------------------------------------------
export function getPriorityBand(score: number): PriorityBand {
  for (const band of PRIORITY_BANDS) {
    if (score >= band.min && score <= band.max) {
      return band.label;
    }
  }
  // Fallback for edge cases (score exactly 100, etc.)
  return "critical";
}

// ---------------------------------------------------------------------------
// Main scoring function — PRD-03 §9.1 formula implementation
// S = 0.40V + 0.25I + 0.20D + 0.15T
// ---------------------------------------------------------------------------
export function calculatePriorityScore(
  input: PriorityScoreInput
): PriorityScoreResult {
  // --- Normalize all inputs to [0, 100] ---

  // V: severity score (PRD-03 §9.2) — directly from config map
  const V = SEVERITY_SCORES[input.severity];

  // I: public impact (PRD-03 §9.2)
  const rawI =
    input.publicImpact !== undefined
      ? input.publicImpact
      : estimatePublicImpactFromSeverity({
          severity: input.severity,
          safetyConcern: input.safetyConcern,
        });
  const I = normalizePublicImpact(rawI);

  // D: related-report count, normalized + capped (PRD-03 §9.2)
  const D = normalizeRelatedReports(input.relatedReportCount);

  // T: time-unresolved score (PRD-03 §9.2)
  const T = normalizeTimeUnresolved(input.submittedAt, input.resolvedAt);

  // --- Apply weighted formula: S = 0.40V + 0.25I + 0.20D + 0.15T ---
  const rawScore =
    PRIORITY_WEIGHTS.severity      * V +
    PRIORITY_WEIGHTS.publicImpact  * I +
    PRIORITY_WEIGHTS.relatedReports * D +
    PRIORITY_WEIGHTS.timeUnresolved * T;

  // Round to 2 decimal places for display / storage
  const roundedRaw = Math.round(rawScore * 100) / 100;

  // --- PRD-03 §9.4: Safety override ---
  // A credible urgent hazard requires escalation regardless of calculated score.
  // The underlying numerical score is preserved; only the effective score changes.
  let finalScore = roundedRaw;
  let safetyOverrideApplied = false;
  let overrideReason: string | undefined;

  if (input.safetyConcern && roundedRaw < SAFETY_OVERRIDE_MIN_SCORE) {
    finalScore = SAFETY_OVERRIDE_MIN_SCORE;
    safetyOverrideApplied = true;
    overrideReason = `Safety override applied: complaint flagged as safety concern. Score elevated from ${roundedRaw} to ${SAFETY_OVERRIDE_MIN_SCORE} (minimum for critical band).`;
  }

  const band = getPriorityBand(finalScore);

  return {
    score: finalScore,
    rawScore: roundedRaw,
    band,
    safetyOverrideApplied,
    overrideReason,
    breakdown: { V, I, D, T },
  };
}
