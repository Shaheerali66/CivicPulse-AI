/**
 * src/types/database.ts
 *
 * PRD-04 :: Shared Types — Authoritative TypeScript types for the
 * CivicPulse AI database schema. These types mirror the Supabase
 * PostgreSQL tables exactly and are the single source of truth
 * for all data contracts across the application.
 *
 * Yahan par sab database tables ke types defined hain.
 * Inhe import karo — dobara define mat karo kisi aur jagah.
 */

// ---------------------------------------------------------------------------
// Complaint Status Machine — valid status transitions are enforced server-side
// ---------------------------------------------------------------------------
export const COMPLAINT_STATUSES = [
  "submitted",
  "analyzing",
  "needs_review",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

// Valid status transitions — key: current status, value: allowed next statuses
export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ["analyzing", "needs_review", "rejected"],
  analyzing: ["needs_review", "assigned", "rejected"],
  needs_review: ["assigned", "rejected"],
  assigned: ["in_progress", "needs_review", "rejected"],
  in_progress: ["resolved", "needs_review", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: [],
  rejected: [],
};

// ---------------------------------------------------------------------------
// Priority Bands — derived from the priority score S = 0.40V + 0.25I + 0.20D + 0.15T
// ---------------------------------------------------------------------------
export const PRIORITY_BANDS = ["low", "medium", "high", "critical"] as const;
export type PriorityBand = (typeof PRIORITY_BANDS)[number];

// ---------------------------------------------------------------------------
// Complaint Categories — must match ai/schema.ts ComplaintCategoryEnum
// ---------------------------------------------------------------------------
export const COMPLAINT_CATEGORIES = [
  "road_damage",
  "footpath_damage",
  "garbage",
  "waste_collection",
  "water_leakage",
  "blocked_drain",
  "streetlight",
  "electrical_hazard",
  "other",
  "unknown",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Duplicate Review States
// ---------------------------------------------------------------------------
export const DUPLICATE_REVIEW_STATES = [
  "pending",
  "confirmed_duplicate",
  "rejected_duplicate",
  "related_distinct",
] as const;

export type DuplicateReviewState = (typeof DUPLICATE_REVIEW_STATES)[number];

// ---------------------------------------------------------------------------
// User Roles
// ---------------------------------------------------------------------------
export const USER_ROLES = ["citizen", "officer", "reviewer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Complaint Event Types — for the audit trail / history timeline
// ---------------------------------------------------------------------------
export const COMPLAINT_EVENT_TYPES = [
  "created",
  "status_changed",
  "assigned",
  "unassigned",
  "ai_analyzed",
  "human_reviewed",
  "duplicate_flagged",
  "duplicate_confirmed",
  "duplicate_rejected",
  "priority_updated",
  "note_added",
  "photo_uploaded",
  "closed",
  "reopened",
] as const;

export type ComplaintEventType = (typeof COMPLAINT_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Notification Types
// ---------------------------------------------------------------------------
export const NOTIFICATION_TYPES = [
  "complaint_assigned",
  "status_changed",
  "review_requested",
  "reclassified",
  "resolved",
  "closed",
  "duplicate_detected",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// Database Row Types — mirror Supabase table schema exactly
// ---------------------------------------------------------------------------

export interface DbProfile {
  id: string;
  display_name: string | null;  // actual DB column name (not full_name)
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  // Backward-compatibility and convenience aliases
  full_name?: string | null;
  user_id?: string;  // not in DB, kept for backward-compat with old code
  department_id?: string | null;  // not in DB, kept for backward-compat
}

export interface DbDepartment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbDepartmentMember {
  id: string;
  user_id: string;
  department_id: string;
  role: "officer" | "reviewer" | "head";
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface DbAIAnalysis {
  category: ComplaintCategory;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  suggested_department_category: string;
  safety_concern: boolean;
  needs_human_review: boolean;
  reasoning: string;
}

export interface DbComplaint {
  // Core columns matching 001_initial_schema.sql exactly
  id: string;
  tracking_id: string;
  citizen_id?: string | null;       // FK to profiles(id)
  title: string;
  description: string;
  category: ComplaintCategory | null;
  status: ComplaintStatus;
  priority?: PriorityBand;           // TEXT column, not priority_band
  submission_method?: "ai" | "manual";
  department_id: string | null;
  assigned_to?: string | null;       // FK to profiles(id), not assigned_officer_id
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  photo_path: string | null;
  is_public?: boolean;
  submitted_at?: string;             // actual timestamp column
  created_at: string;               // canonical timestamp for UI
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;

  // Compatibility fields expected by UI components & API layers
  user_id?: string;
  priority_score?: number | null;
  priority_band?: PriorityBand | null;
  assigned_officer_id?: string | null;
  photo_url?: string | null;
  ai_analysis?: DbAIAnalysis | null;
  ai_from_model?: boolean;
  ai_processed_at?: string | null;
  needs_human_review?: boolean;
  safety_concern?: boolean;
  is_duplicate?: boolean;
  duplicate_of_id?: string | null;
  resolution_notes?: string | null;
}

export interface DbComplaintEvent {
  id: string;
  complaint_id: string;
  actor_id: string | null;
  event_type: ComplaintEventType | string;
  from_status: ComplaintStatus | null;
  to_status: ComplaintStatus | null;
  metadata: Record<string, unknown> | null;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  note?: string | null;
  created_at: string;
}

export interface DbComplaintDuplicate {
  id: string;
  complaint_id: string;
  duplicate_of_id: string;
  similarity_score: number;
  review_state: DuplicateReviewState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  complaint_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Extended / Joined Types — used in API responses (joins resolved)
// ---------------------------------------------------------------------------

export interface ComplaintWithRelations extends DbComplaint {
  department: Pick<DbDepartment, "id" | "name" | "slug"> | null;
  assigned_officer: (Pick<DbProfile, "id" | "display_name"> & { full_name?: string | null }) | null;
  submitter: (Pick<DbProfile, "id" | "display_name"> & { full_name?: string | null }) | null;
  duplicate_candidates: DuplicateCandidate[];
  events: ComplaintEventWithActor[];
}

export interface DuplicateCandidate {
  relationship_id: string;
  complaint_id: string;
  tracking_id: string;
  category: ComplaintCategory | null;
  summary: string | null;
  location_label: string | null;
  created_at: string;
  similarity_score: number;
  review_state: DuplicateReviewState;
}

export interface ComplaintEventWithActor extends DbComplaintEvent {
  actor: (Pick<DbProfile, "id" | "display_name" | "role"> & { full_name?: string | null }) | null;
}

// ---------------------------------------------------------------------------
// API Response Types — what Route Handlers return to clients
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Officer Dashboard — summary metric types
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  total: number;
  submitted: number;
  needs_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  high_critical: number;
  my_assigned: number;
}

// ---------------------------------------------------------------------------
// Admin Dashboard — system analytics types
// ---------------------------------------------------------------------------

export interface AdminStats {
  total_complaints: number;
  complaints_by_status: Record<ComplaintStatus, number>;
  complaints_by_category: Record<ComplaintCategory, number>;
  complaints_by_priority: Record<PriorityBand, number>;
  department_workload: DepartmentWorkload[];
  review_queue_size: number;
  ai_failure_count: number;
  resolved_last_30_days: number;
  period_label: string;
}

export interface DepartmentWorkload {
  department_id: string;
  department_name: string;
  total: number;
  open: number;
  resolved: number;
}

// ---------------------------------------------------------------------------
// Supabase Generic Database Schema mapping
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: { Row: DbProfile; Insert: Partial<DbProfile>; Update: Partial<DbProfile> };
      departments: { Row: DbDepartment; Insert: Partial<DbDepartment>; Update: Partial<DbDepartment> };
      department_members: { Row: DbDepartmentMember; Insert: Partial<DbDepartmentMember>; Update: Partial<DbDepartmentMember> };
      complaints: { Row: DbComplaint; Insert: Partial<DbComplaint>; Update: Partial<DbComplaint> };
      complaint_events: { Row: DbComplaintEvent; Insert: Partial<DbComplaintEvent>; Update: Partial<DbComplaintEvent> };
      complaint_duplicates: { Row: DbComplaintDuplicate; Insert: Partial<DbComplaintDuplicate>; Update: Partial<DbComplaintDuplicate> };
      notifications: { Row: DbNotification; Insert: Partial<DbNotification>; Update: Partial<DbNotification> };
      ai_analyses: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any> };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
