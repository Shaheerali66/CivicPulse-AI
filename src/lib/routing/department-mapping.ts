/**
 * src/lib/routing/department-mapping.ts
 *
 * PRD-03 §7 — Deterministic category-to-department configuration.
 * Single source of truth for all routing mappings.
 *
 * PRD-03 §7.3 rules:
 *   - Do not use model-generated dept names as DB IDs directly
 *   - Mappings must be configurable (not scattered throughout app)
 *   - Routing must be deterministic for same category + config version
 *   - Unknown category routes to human review per configured policy
 *
 * Server-safe (no server-only import) — department names may be shared
 * with shared utilities. Add "server-only" if DB calls are added here.
 */

import type { ComplaintCategory } from "@/lib/ai/schema";

// ---------------------------------------------------------------------------
// Active department registry — mirrors the departments table in the database.
// PRD-03 §7.2 step 3: confirm target department exists and is active.
// Update this list whenever a department row is added/removed in Supabase.
// ---------------------------------------------------------------------------
export const ACTIVE_DEPARTMENTS = [
  "Roads & Works",
  "Sanitation",
  "Water & Sewerage",
  "Electrical & Streetlights",
  "Municipal Services",
] as const;

export type Department = (typeof ACTIVE_DEPARTMENTS)[number];

// ---------------------------------------------------------------------------
// PRD-03 §7.1 — Initial demo mapping (Hyderabad, Sindh, Pakistan)
// Category → Department (verified against controlled ACTIVE_DEPARTMENTS list)
// ---------------------------------------------------------------------------
export const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, Department> = {
  // Sadak aur footpath — Roads & Works department
  road_damage:      "Roads & Works",
  footpath_damage:  "Roads & Works",

  // Kachra / safai — Sanitation department
  garbage:          "Sanitation",
  waste_collection: "Sanitation",

  // Pani aur sewerage — Water & Sewerage department
  water_leakage:    "Water & Sewerage",
  blocked_drain:    "Water & Sewerage",

  // Bijli aur streetlights — Electrical & Streetlights department
  streetlight:      "Electrical & Streetlights",
  electrical_hazard:"Electrical & Streetlights",

  // Unmapped — Municipal Services + human review per PRD-03 §7.1
  other:            "Municipal Services",
  unknown:          "Municipal Services",   // routed with human review flag
};

// ---------------------------------------------------------------------------
// Validate mapping integrity — every mapped dept must be in ACTIVE_DEPARTMENTS.
// PRD-03 §7.2 step 3: catches config drift between this file and the DB.
// Call this in server startup / CI checks. Throws on mismatch.
// ---------------------------------------------------------------------------
export function validateDepartmentMapping(): void {
  const activeSet = new Set<string>(ACTIVE_DEPARTMENTS);
  const errors: string[] = [];

  for (const [category, dept] of Object.entries(CATEGORY_TO_DEPARTMENT)) {
    if (!activeSet.has(dept)) {
      errors.push(
        `Category "${category}" → "${dept}" is NOT in ACTIVE_DEPARTMENTS.`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[CivicPulse Routing] Department mapping validation failed:\n${errors.join("\n")}`
    );
  }

  console.info(
    `[CivicPulse Routing] OK — ${Object.keys(CATEGORY_TO_DEPARTMENT).length} categories mapped to ${ACTIVE_DEPARTMENTS.length} departments.`
  );
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Get the department for a single validated category (O(1) lookup). */
export function getDepartmentForCategory(category: ComplaintCategory): Department {
  return CATEGORY_TO_DEPARTMENT[category];
}

/** Get all categories that map to a given department (for dashboard filtering). */
export function getCategoriesForDepartment(dept: Department): ComplaintCategory[] {
  return (
    Object.entries(CATEGORY_TO_DEPARTMENT) as [ComplaintCategory, Department][]
  )
    .filter(([, d]) => d === dept)
    .map(([cat]) => cat);
}
