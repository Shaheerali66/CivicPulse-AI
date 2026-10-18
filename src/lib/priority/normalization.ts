/**
 * src/lib/priority/normalization.ts
 *
 * PRD-03 §9.2 — Input normalization functions for the priority formula.
 * Pure functions — no side effects, fully testable.
 *
 * All normalization functions return a value in [0, 100] range
 * to be weighted by PRIORITY_WEIGHTS in score.ts.
 */

import {
  RELATED_REPORT_CAP,
  MAX_AGE_HOURS_FOR_TIME_SCORE,
} from "./config";

// ---------------------------------------------------------------------------
// V — Severity normalization (PRD-03 §9.2)
// Handled directly via SEVERITY_SCORES map in config.ts
// No further normalization needed — already 0–100 scale
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// I — Public impact score normalization (PRD-03 §9.2)
// "Estimated effect on public access or services"
// Input: raw impact value 0–100 from officer assessment or derived rule
// ---------------------------------------------------------------------------
export function normalizePublicImpact(rawImpact: number): number {
  // Clamp to [0, 100] — nahi chahiye ke out-of-range value formula bigade
  return Math.max(0, Math.min(100, rawImpact));
}

// ---------------------------------------------------------------------------
// D — Related-report count normalization (PRD-03 §9.2)
// "Normalized count of independent related reports (capped to avoid
//  unbounded inflation)" — PRD-03 §9.2
//
// Formula: D = min(count, CAP) / CAP * 100
// ---------------------------------------------------------------------------
export function normalizeRelatedReports(count: number): number {
  if (count <= 0) return 0;
  const capped = Math.min(count, RELATED_REPORT_CAP);
  return (capped / RELATED_REPORT_CAP) * 100;
}

// ---------------------------------------------------------------------------
// T — Time-unresolved score normalization (PRD-03 §9.2)
// "Normalized time curve since submission"
// Linear growth 0 → 100 over MAX_AGE_HOURS_FOR_TIME_SCORE hours
//
// submittedAt: ISO timestamp string of complaint creation
// resolvedAt:  ISO timestamp if resolved (pass undefined for open complaints)
// ---------------------------------------------------------------------------
export function normalizeTimeUnresolved(
  submittedAt: string,
  resolvedAt?: string
): number {
  const from = new Date(submittedAt).getTime();

  // Agar resolved hai toh age stop hoti hai at resolution time
  const until = resolvedAt
    ? new Date(resolvedAt).getTime()
    : Date.now();

  const elapsedMs = Math.max(0, until - from);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const score = (elapsedHours / MAX_AGE_HOURS_FOR_TIME_SCORE) * 100;
  return Math.min(100, score); // cap at 100 — no unbounded values
}

// ---------------------------------------------------------------------------
// Public impact estimation from AI analysis (when officer hasn't overridden)
// Derives a heuristic I-score from severity + safetyConcern
// Officers can override this with a manual assessment
// ---------------------------------------------------------------------------
export function estimatePublicImpactFromSeverity(params: {
  severity: "low" | "medium" | "high" | "critical";
  safetyConcern: boolean;
}): number {
  const BASE_IMPACT: Record<string, number> = {
    low:      15,
    medium:   40,
    high:     70,
    critical: 90,
  };

  let impact = BASE_IMPACT[params.severity] ?? 40;

  // Safety concern adds urgency to public impact estimate
  if (params.safetyConcern) {
    impact = Math.min(100, impact + 15);
  }

  return impact;
}
