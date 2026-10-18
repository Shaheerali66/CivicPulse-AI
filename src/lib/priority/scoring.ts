/**
 * src/lib/priority/scoring.ts
 *
 * PRD-04 :: Priority Engine — implements the priority scoring formula:
 *   S = 0.40 * V + 0.25 * I + 0.20 * D + 0.15 * T
 *
 * Where:
 *   V = Severity (kitna serious hai — 0 to 1)
 *   I = Public Impact (kitne logon ko affect karta hai — 0 to 1)
 *   D = Duplicate density (normalized related report count — 0 to 1)
 *   T = Time factor (kitna time ho gaya unresolved — 0 to 1)
 *
 * Frontend ke liye bhi safe hai (no server-only imports).
 * Backend is the authoritative source for the score stored in DB.
 */

import type { PriorityBand } from "@/types/database";

// ---------------------------------------------------------------------------
// Weight constants — same as backend, never change them in frontend
// ---------------------------------------------------------------------------
const W_SEVERITY = 0.40;
const W_IMPACT   = 0.25;
const W_DENSITY  = 0.20;
const W_TIME     = 0.15;

// ---------------------------------------------------------------------------
// Severity → normalized numeric score
// ---------------------------------------------------------------------------
const SEVERITY_SCORES: Record<string, number> = {
  low:      0.1,
  medium:   0.4,
  high:     0.75,
  critical: 1.0,
};

// ---------------------------------------------------------------------------
// Convert raw score (0-1) to a priority band
// ---------------------------------------------------------------------------
export function scoreToPriorityBand(score: number): PriorityBand {
  if (score >= 0.75) return "critical";
  if (score >= 0.5)  return "high";
  if (score >= 0.25) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Input for the scoring function
// ---------------------------------------------------------------------------
export interface PriorityScoreInput {
  severity: "low" | "medium" | "high" | "critical";
  safetyConcern: boolean;
  /** Number of related/duplicate complaints (raw count, will be normalized) */
  relatedCount: number;
  /** Timestamp of complaint submission (ISO string) */
  submittedAt: string;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
export interface PriorityScoreResult {
  score: number;        // 0.0 to 1.0
  band: PriorityBand;
  components: {
    severity: number;
    impact: number;
    density: number;
    time: number;
  };
  /** Short human-readable explanation for the score */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Normalize related-complaint density (0–10+ complaints → 0–1)
// ---------------------------------------------------------------------------
function normalizeDensity(count: number): number {
  // Cap at 10 — diminishing returns beyond that
  return Math.min(count / 10, 1.0);
}

// ---------------------------------------------------------------------------
// Time-decay factor: older complaints get a higher urgency score
// 0 to 1 over 7 days, capped at 1.0
// ---------------------------------------------------------------------------
function normalizeTimeFactor(submittedAt: string): number {
  const ageMs = Date.now() - new Date(submittedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.min(ageDays / 7, 1.0);
}

// ---------------------------------------------------------------------------
// Public impact estimate based on category severity and safety
// ---------------------------------------------------------------------------
function estimatePublicImpact(params: {
  severity: string;
  safetyConcern: boolean;
}): number {
  const base = SEVERITY_SCORES[params.severity] ?? 0.1;
  // Safety concerns add 0.25 impact boost, capped at 1.0
  return Math.min(base + (params.safetyConcern ? 0.25 : 0), 1.0);
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------
export function calculatePriorityScore(
  input: PriorityScoreInput
): PriorityScoreResult {
  const V = SEVERITY_SCORES[input.severity] ?? 0.1;
  const I = estimatePublicImpact({
    severity: input.severity,
    safetyConcern: input.safetyConcern,
  });
  const D = normalizeDensity(input.relatedCount);
  const T = normalizeTimeFactor(input.submittedAt);

  const score = Math.min(
    W_SEVERITY * V + W_IMPACT * I + W_DENSITY * D + W_TIME * T,
    1.0
  );

  const band = scoreToPriorityBand(score);

  const components = { severity: V, impact: I, density: D, time: T };

  // Short plain-text explanation for UI
  const parts: string[] = [];
  if (V >= 0.75) parts.push("high severity");
  if (input.safetyConcern) parts.push("safety concern");
  if (D >= 0.3) parts.push("multiple related reports");
  if (T >= 0.5) parts.push("pending for over 3 days");

  const explanation =
    parts.length > 0
      ? `Priority elevated due to: ${parts.join(", ")}.`
      : "Standard priority based on severity and age.";

  return { score, band, components, explanation };
}

// ---------------------------------------------------------------------------
// Display helpers for UI components
// ---------------------------------------------------------------------------
export function getPriorityLabel(band: PriorityBand): string {
  return {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  }[band];
}

export function getPriorityColorClass(band: PriorityBand): string {
  return {
    low: "priority-low",
    medium: "priority-medium",
    high: "priority-high",
    critical: "priority-critical",
  }[band];
}
