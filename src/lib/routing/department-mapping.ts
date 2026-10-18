/**
 * src/lib/routing/department-mapping.ts
 *
 * Real-World Municipal Routing Table: Hyderabad, Sindh, Pakistan
 * Deterministic category-to-department configuration and slug resolution.
 */

import type { ComplaintCategory } from "@/lib/ai/schema";

export const HYDERABAD_DEPARTMENTS = [
  "Hyderabad Municipal Corporation (HMC)",
  "Hyderabad Water & Sewerage Corporation (HWASA)",
  "Hyderabad Electric Supply Company (HESCO)",
  "Provincial Works & Services Department",
  "Town Municipal Corporation (Latifabad/Qasimabad)",
] as const;

export const ACTIVE_DEPARTMENTS = HYDERABAD_DEPARTMENTS;

export type Department = (typeof HYDERABAD_DEPARTMENTS)[number];

export const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, Department> = {
  // Provincial roads and civil corridors
  road_damage: "Provincial Works & Services Department",

  // Local municipal walkways and parks
  footpath_damage: "Hyderabad Municipal Corporation (HMC)",

  // Solid waste management and municipal sanitation
  garbage: "Hyderabad Municipal Corporation (HMC)",
  waste_collection: "Hyderabad Municipal Corporation (HMC)",

  // Water supply and sewerage network
  water_leakage: "Hyderabad Water & Sewerage Corporation (HWASA)",
  blocked_drain: "Hyderabad Water & Sewerage Corporation (HWASA)",

  // Streetlights
  streetlight: "Hyderabad Municipal Corporation (HMC)",

  // High voltage power, pole transformers, exposed wires
  electrical_hazard: "Hyderabad Electric Supply Company (HESCO)",

  // General & Zonal issues
  other: "Town Municipal Corporation (Latifabad/Qasimabad)",
  unknown: "Town Municipal Corporation (Latifabad/Qasimabad)",
};

export const CATEGORY_TO_SLUG: Record<ComplaintCategory, string> = {
  road_damage: "works-services-sindh",
  footpath_damage: "hmc-hyderabad",
  garbage: "hmc-hyderabad",
  waste_collection: "hmc-hyderabad",
  water_leakage: "hwasa-hyderabad",
  blocked_drain: "hwasa-hyderabad",
  streetlight: "hmc-hyderabad",
  electrical_hazard: "hesco-hyderabad",
  other: "tmc-zonal",
  unknown: "tmc-zonal",
};

export function getDepartmentForCategory(category: ComplaintCategory): Department {
  return CATEGORY_TO_DEPARTMENT[category] ?? "Hyderabad Municipal Corporation (HMC)";
}

export function getDepartmentSlugForCategory(category: ComplaintCategory): string {
  return CATEGORY_TO_SLUG[category] ?? "hmc-hyderabad";
}

export function resolveDepartmentFromAnalysis(input: {
  category: ComplaintCategory;
  needsHumanReview?: boolean;
}): Department {
  return CATEGORY_TO_DEPARTMENT[input.category] ?? "Hyderabad Municipal Corporation (HMC)";
}

export function resolveDepartmentSlugFromAnalysis(category: ComplaintCategory): string {
  return CATEGORY_TO_SLUG[category] ?? "hmc-hyderabad";
}
