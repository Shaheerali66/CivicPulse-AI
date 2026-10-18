/**
 * src/types/complaint.ts
 *
 * PRD-01 :: Citizen Experience Types.
 * Strict type contracts for complaints, tracking, status, and categories.
 * Comments use Roman Urdu / Roman English per team policy.
 */

import type { ComplaintCategory, Severity } from "@/lib/ai/schema";
import type { Department } from "@/lib/routing/department-mapping";

// Valid citizen-safe statuses mapped strictly to PRD-01 §14.4
export type ComplaintStatus =
  | "submitted"
  | "analyzing"
  | "needs_review"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "rejected";

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: "Submitted",
  analyzing: "Being analyzed",
  needs_review: "Needs review",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

export const COMPLAINT_CATEGORIES: { id: ComplaintCategory; label: string; description: string }[] = [
  { id: "road_damage", label: "Road damage or pothole", description: "Damaged road surfaces, cracks, potholes" },
  { id: "footpath_damage", label: "Broken footpath or sidewalk", description: "Broken pavers, obstructed walking paths" },
  { id: "garbage", label: "Garbage or illegal dumping", description: "Accumulated trash, open heaps in public areas" },
  { id: "waste_collection", label: "Missed waste collection", description: "Scheduled municipal trash pickup missed" },
  { id: "water_leakage", label: "Water leakage", description: "Burst pipeline, continuous potable water loss" },
  { id: "blocked_drain", label: "Blocked drain or standing water", description: "Clogged stormwater sewer or gutter overflow" },
  { id: "streetlight", label: "Broken streetlight", description: "Dark streetlights, non-functional light poles" },
  { id: "electrical_hazard", label: "Electrical hazard", description: "Hanging live wires, spark risks, open transformers" },
  { id: "other", label: "Other civic issue", description: "General municipal services not listed above" },
  { id: "unknown", label: "Not sure", description: "Uncertain category, requires human review" },
];

export interface StatusHistoryEvent {
  status: ComplaintStatus;
  label: string;
  timestamp: string; // ISO string
  notes?: string; // Citizen-safe sanitized public notes
}

export interface ComplaintLocation {
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
}

export interface CitizenComplaintRecord {
  id: string; // Internal UUID
  trackingId: string; // Server-generated citizen tracking ID (e.g. CP-HYD-2026-XXXX)
  userId?: string | null; // Nullable for anonymous submissions if permitted
  description: string;
  category: ComplaintCategory;
  department: Department;
  severity?: Severity;
  status: ComplaintStatus;
  reportingMode: "ai_assisted" | "manual";
  imageUrl?: string | null;
  location?: ComplaintLocation | null;
  aiSummary?: string | null;
  aiSuggestedDepartment?: string | null;
  needsHumanReview: boolean;
  history: StatusHistoryEvent[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface SubmitComplaintRequest {
  description: string;
  reportingMode: "ai_assisted" | "manual";
  category?: ComplaintCategory; // Required if manual, optional/suggested if ai_assisted
  imageUrl?: string;
  location?: ComplaintLocation;
  contactEmail?: string;
}

export interface SubmitComplaintResponse {
  success: boolean;
  trackingId: string;
  complaintId: string;
  status: ComplaintStatus;
  category: ComplaintCategory;
  department: Department;
  aiSummary?: string;
  needsHumanReview: boolean;
  createdAt: string;
}

export interface PublicTrackingResponse {
  trackingId: string;
  status: ComplaintStatus;
  statusLabel: string;
  category: ComplaintCategory;
  categoryLabel: string;
  department: Department;
  summary: string;
  createdAt: string;
  updatedAt: string;
  needsHumanReview: boolean;
  history: StatusHistoryEvent[];
}
