/**
 * src/lib/routing/department-mapping.ts
 *
 * PRD-03 :: Department Routing — Deterministic category → department mapper.
 * This is the authoritative single source of truth for routing logic.
 *
 * Design decisions:
 *  - Uses a typed Record (not a switch/if-chain) for O(1) lookup and easy extensibility.
 *  - ACTIVE_DEPARTMENTS defines the valid department set — acts as a runtime registry.
 *  - validateDepartmentMapping() can be called at startup to catch config drift early.
 *
 * Server-safe: this file has no server-only import because department definitions
 * may also be needed in shared utilities. If you add DB calls here, add "server-only".
 */

import type { ComplaintCategory } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// Active department registry — mirrors the departments table in the database.
// Update this list whenever a new department row is added to Supabase.
// ---------------------------------------------------------------------------
export const ACTIVE_DEPARTMENTS = [
  "Roads & Works",
  "Sanitation",
  "Water & Sewerage",
  "Electrical & Streetlights",
  "Municipal Services / Human Review",
] as const;

export type Department = (typeof ACTIVE_DEPARTMENTS)[number];

// ---------------------------------------------------------------------------
// Category → Department mapping (deterministic, no AI involved)
// ---------------------------------------------------------------------------
export const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, Department> = {
  // Sadak aur footpath — Roads & Works department
  road_damage: "Roads & Works",
  footpath_damage: "Roads & Works",

  // Kachra / safai — Sanitation department
  garbage: "Sanitation",
  waste_collection: "Sanitation",

  // Pani aur sewerage — Water & Sewerage department
  water_leakage: "Water & Sewerage",
  blocked_drain: "Water & Sewerage",

  // Bijli aur batti — Electrical & Streetlights department
  streetlight: "Electrical & Streetlights",
  electrical_hazard: "Electrical & Streetlights",

  // Unclassified — routed to human review queue
  other: "Municipal Services / Human Review",
  unknown: "Municipal Services / Human Review",
};

// ---------------------------------------------------------------------------
// Public API: get department for a given complaint category
// ---------------------------------------------------------------------------
export function getDepartmentForCategory(category: ComplaintCategory): Department {
  return CATEGORY_TO_DEPARTMENT[category];
}

// ---------------------------------------------------------------------------
// Validation function — call at app startup or in a server bootstrap check
// to ensure every mapped department exists in the active department registry.
// Throws if there is a mismatch — catches config drift before it hits production.
// ---------------------------------------------------------------------------
export function validateDepartmentMapping(): void {
  const activeDeptSet = new Set<string>(ACTIVE_DEPARTMENTS);
  const errors: string[] = [];

  for (const [category, department] of Object.entries(CATEGORY_TO_DEPARTMENT)) {
    if (!activeDeptSet.has(department)) {
      errors.push(
        `Category "${category}" maps to department "${department}" which is NOT in ACTIVE_DEPARTMENTS.`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[CivicPulse Routing] Department mapping validation failed:\n${errors.join("\n")}`
    );
  }

  console.info(
    `[CivicPulse Routing] Department mapping validated — ${Object.keys(CATEGORY_TO_DEPARTMENT).length} categories → ${ACTIVE_DEPARTMENTS.length} departments.`
  );
}

// ---------------------------------------------------------------------------
// Helper: resolve department from a full AI analysis result
// Uses the AI's category as ground truth, ignoring suggestedDepartmentCategory
// to ensure deterministic routing not dependent on model phrasing.
// ---------------------------------------------------------------------------
export function resolveDepartmentFromAnalysis(params: {
  category: ComplaintCategory;
  needsHumanReview: boolean;
}): Department {
  // If human review is flagged, always route to human review queue regardless of category
  if (params.needsHumanReview) {
    return "Municipal Services / Human Review";
  }
  return getDepartmentForCategory(params.category);
}

// ---------------------------------------------------------------------------
// Helper: get all categories for a specific department (useful for filtering UI)
// ---------------------------------------------------------------------------
export function getCategoriesForDepartment(department: Department): ComplaintCategory[] {
  return (Object.entries(CATEGORY_TO_DEPARTMENT) as [ComplaintCategory, Department][])
    .filter(([, dept]) => dept === department)
    .map(([cat]) => cat);
}
