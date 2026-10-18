/**
 * src/lib/utils.ts
 *
 * Shared utility functions — clsx + tailwind-merge shorthand.
 * Standard shadcn/ui pattern.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Date formatting helpers
// ---------------------------------------------------------------------------
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

// ---------------------------------------------------------------------------
// Category label helpers
// ---------------------------------------------------------------------------
export const CATEGORY_LABELS: Record<string, string> = {
  road_damage: "Road Damage",
  footpath_damage: "Footpath Damage",
  garbage: "Garbage",
  waste_collection: "Waste Collection",
  water_leakage: "Water Leakage",
  blocked_drain: "Blocked Drain",
  streetlight: "Streetlight",
  electrical_hazard: "Electrical Hazard",
  other: "Other",
  unknown: "Unknown",
};

export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Uncategorized";
  return CATEGORY_LABELS[category] ?? category;
}

export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  analyzing: "Analyzing",
  needs_review: "Needs Review",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// Truncate text safely
// ---------------------------------------------------------------------------
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
