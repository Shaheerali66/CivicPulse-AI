/**
 * src/lib/routing/route-complaint.ts
 *
 * PRD-03 §7.2 — Full routing algorithm implementation.
 * Maps a validated AIAnalysis to an active department, enforces safety rules,
 * and returns a structured routing decision for persistence.
 *
 * PRD-03 §7.2 algorithm steps:
 *   1. Validate the category
 *   2. Look up category-to-department in trusted configuration
 *   3. Confirm target department exists and is active
 *   4. If no valid mapping, mark for review
 *   5. If safety concern flagged, apply safety-review rule (§9.4)
 *   6. Return routing outcome for storage
 *   7. Authorized officers may override (tracked in audit history)
 */

import {
  CATEGORY_TO_DEPARTMENT,
  ACTIVE_DEPARTMENTS,
  type Department,
} from "./department-mapping";
import type { AIAnalysis } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// Routing decision — persisted alongside the AI analysis result
// PRD-03 §7.2 step 6: store recommendation and routing outcome
// ---------------------------------------------------------------------------
export interface RoutingDecision {
  /** Assigned active department from trusted configuration */
  assignedDepartment: Department;
  /** Whether a human officer must review before finalizing routing */
  requiresHumanReview: boolean;
  /** Reason for routing decision — for audit trail (PRD-03 §7.2 step 8) */
  routingReason: string;
  /**
   * Safety override applied per PRD-03 §9.4.
   * True when a credible urgent hazard escalates independently of score.
   */
  safetyOverrideApplied: boolean;
}

// PRD-03 §7.3: active department set for O(1) membership check
const ACTIVE_DEPT_SET = new Set<string>(ACTIVE_DEPARTMENTS);

// ---------------------------------------------------------------------------
// Main routing function — PRD-03 §7.2 full algorithm
// Call this after analyzeComplaint() returns a validated AIAnalysis.
// ---------------------------------------------------------------------------
export function routeComplaint(analysis: AIAnalysis): RoutingDecision {
  const { category, safetyConcern, needsHumanReview, confidence } = analysis;

  // Step 1: Validate category — Zod already did this in analyzeComplaint,
  // but defensive check here in case routing is called independently
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_TO_DEPARTMENT, category)) {
    return {
      assignedDepartment: "Hyderabad Municipal Corporation (HMC)",
      requiresHumanReview: true,
      routingReason: `Unrecognized category "${category}" — defaulted to Hyderabad Municipal Corporation (HMC).`,
      safetyOverrideApplied: false,
    };
  }

  // Step 2: Look up department from trusted configuration
  const mappedDept = CATEGORY_TO_DEPARTMENT[category];

  // Step 3: Confirm target department is active in DB config
  if (!ACTIVE_DEPT_SET.has(mappedDept)) {
    // PRD-03 §7.2 step 4: no valid mapping → mark for review
    return {
      assignedDepartment: "Hyderabad Municipal Corporation (HMC)",
      requiresHumanReview: true,
      routingReason: `Mapped department "${mappedDept}" is not currently active. Routed to HMC for review.`,
      safetyOverrideApplied: false,
    };
  }

  // Step 4: Special handling for unmapped/unknown categories
  if (category === "unknown" || category === "other") {
    return {
      assignedDepartment: mappedDept,
      requiresHumanReview: true,
      routingReason:
        category === "unknown"
          ? "Category could not be determined. Manual classification required."
          : 'Category is "other" — officer must confirm appropriate department.',
      safetyOverrideApplied: false,
    };
  }

  // Step 5: Safety-review rule — PRD-03 §9.4
  // Credible urgent hazard escalates independently of calculated score
  if (safetyConcern) {
    return {
      assignedDepartment: mappedDept,
      requiresHumanReview: true,
      routingReason: `Safety concern detected (${category}). Routed to "${mappedDept}" with mandatory safety review. Safety override applied per PRD-03 §9.4.`,
      safetyOverrideApplied: true,
    };
  }

  // Combine PRD-03 §6 confidence threshold with AI's needsHumanReview flag
  const requiresReview = needsHumanReview || confidence < 0.60;

  return {
    assignedDepartment: mappedDept,
    requiresHumanReview: requiresReview,
    routingReason: requiresReview
      ? `Routed to "${mappedDept}". Review required: ${
          confidence < 0.60
            ? `confidence ${confidence.toFixed(2)} below threshold (0.60)`
            : "AI flagged for human review"
        }.`
      : `Routed to "${mappedDept}" (confidence: ${confidence.toFixed(2)}).`,
    safetyOverrideApplied: false,
  };
}
