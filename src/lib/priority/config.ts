/**
 * src/lib/priority/config.ts
 *
 * PRD-03 §9 — Priority scoring configuration.
 * All weights, score maps, and bands in one place so they can be
 * tuned without touching formula logic (PRD-03 §9.5: configurable weights).
 *
 * Weights formula: S = 0.40V + 0.25I + 0.20D + 0.15T  (PRD-03 §9.1)
 */

import type { Severity } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// Formula weights — PRD-03 §9.1
// Pehle change yahaan karo, score.ts automatically use karega
// ---------------------------------------------------------------------------
export const PRIORITY_WEIGHTS = {
  /** V — Severity weight */
  severity: 0.40,
  /** I — Public impact weight */
  publicImpact: 0.25,
  /** D — Related-report count weight */
  relatedReports: 0.20,
  /** T — Time-unresolved weight */
  timeUnresolved: 0.15,
} as const;

// Sanity check: weights must sum to 1.0
const weightSum =
  PRIORITY_WEIGHTS.severity +
  PRIORITY_WEIGHTS.publicImpact +
  PRIORITY_WEIGHTS.relatedReports +
  PRIORITY_WEIGHTS.timeUnresolved;

if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(
    `[CivicPulse Priority] PRIORITY_WEIGHTS must sum to 1.0, got ${weightSum}`
  );
}

// ---------------------------------------------------------------------------
// Severity score map — PRD-03 §9.2
// V values: Low(20) / Medium(45) / High(75) / Critical(100)
// ---------------------------------------------------------------------------
export const SEVERITY_SCORES: Record<Severity, number> = {
  low:      20,
  medium:   45,
  high:     75,
  critical: 100,
};

// ---------------------------------------------------------------------------
// Priority bands — PRD-03 §9.3
// ---------------------------------------------------------------------------
export const PRIORITY_BANDS = [
  { label: "low",      min: 0,  max: 24  },
  { label: "medium",   min: 25, max: 49  },
  { label: "high",     min: 50, max: 74  },
  { label: "critical", min: 75, max: 100 },
] as const;

export type PriorityBand = (typeof PRIORITY_BANDS)[number]["label"];

// ---------------------------------------------------------------------------
// Related-report normalization cap — PRD-03 §9.2
// Capped to avoid unbounded score inflation from duplicate counts
// ---------------------------------------------------------------------------
export const RELATED_REPORT_CAP = 20;

// ---------------------------------------------------------------------------
// Time-unresolved normalization — PRD-03 §9.2
// Score grows from 0 → 100 over MAX_AGE_HOURS hours (linear curve)
// ---------------------------------------------------------------------------
export const MAX_AGE_HOURS_FOR_TIME_SCORE = 168; // 7 days
