/**
 * src/lib/validation/api-schemas.ts
 *
 * PRD-04 :: Validation — Zod schemas for all API input validation.
 * Single source of truth for request body shapes used in Route Handlers.
 *
 * Har ek API route ka Zod schema yahan define hoga.
 * Inhe server-side request parsing mein use karo.
 */

import { z } from "zod";
import { COMPLAINT_STATUSES, COMPLAINT_CATEGORIES, PRIORITY_BANDS, DUPLICATE_REVIEW_STATES } from "@/types/database";

// ---------------------------------------------------------------------------
// Complaint creation — POST /api/complaints
// ---------------------------------------------------------------------------
export const CreateComplaintSchema = z.object({
  title: z
    .string()
    .max(200, "Title must not exceed 200 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters")
    .trim(),
  category: z.string().optional(),
  reportingMode: z.string().optional(),
  location: z
    .object({
      addressDescription: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  location_label: z.string().max(200).trim().optional().nullable(),
  contactEmail: z.string().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  department_id: z.string().uuid().optional().nullable(),
});

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

// ---------------------------------------------------------------------------
// Complaint list filters — GET /api/complaints
// ---------------------------------------------------------------------------
export const ComplaintListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  priority: z.enum(PRIORITY_BANDS).optional(),
  department_id: z.string().uuid().optional(),
  officer_id: z.string().uuid().optional(),
  needs_review: z.coerce.boolean().optional(),
  is_duplicate: z.coerce.boolean().optional(),
  date_from: z.string().datetime({ offset: true }).optional(),
  date_to: z.string().datetime({ offset: true }).optional(),
  search: z.string().max(200).trim().optional(),
});

export type ComplaintListFilters = z.infer<typeof ComplaintListFiltersSchema>;

// ---------------------------------------------------------------------------
// Status update — PATCH /api/complaints/[id]/status
// ---------------------------------------------------------------------------
export const UpdateStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  resolution_notes: z.string().max(2000).trim().optional(),
  note: z.string().max(1000).trim().optional(),
});

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

// ---------------------------------------------------------------------------
// Assignment — POST /api/complaints/[id]/assign
// ---------------------------------------------------------------------------
export const AssignComplaintSchema = z.object({
  department_id: z.string().uuid("Department ID must be a valid UUID"),
  officer_id: z.string().uuid("Officer ID must be a valid UUID").optional().nullable(),
  note: z.string().max(500).trim().optional(),
});

export type AssignComplaintInput = z.infer<typeof AssignComplaintSchema>;

// ---------------------------------------------------------------------------
// Human review decision — POST /api/complaints/[id]/review
// ---------------------------------------------------------------------------
export const ReviewDecisionSchema = z.object({
  action: z.enum([
    "accept_classification",
    "change_category",
    "change_department",
    "mark_needs_info",
    "return_to_workflow",
  ]),
  new_category: z.enum(COMPLAINT_CATEGORIES).optional(),
  new_department_id: z.string().uuid().optional(),
  notes: z.string().max(1000).trim().optional(),
  duplicate_action: z
    .object({
      relationship_id: z.string().uuid(),
      decision: z.enum(DUPLICATE_REVIEW_STATES),
    })
    .optional(),
});

export type ReviewDecisionInput = z.infer<typeof ReviewDecisionSchema>;

// ---------------------------------------------------------------------------
// Duplicate review — PATCH /api/complaints/[id]/duplicate
// ---------------------------------------------------------------------------
export const DuplicateReviewSchema = z.object({
  relationship_id: z.string().uuid(),
  decision: z.enum(DUPLICATE_REVIEW_STATES),
  notes: z.string().max(500).trim().optional(),
});

export type DuplicateReviewInput = z.infer<typeof DuplicateReviewSchema>;

// ---------------------------------------------------------------------------
// Department create/update — POST/PATCH /api/admin/departments
// ---------------------------------------------------------------------------
export const DepartmentUpsertSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .trim(),
  description: z.string().max(500).trim().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type DepartmentUpsertInput = z.infer<typeof DepartmentUpsertSchema>;

// ---------------------------------------------------------------------------
// Membership management — POST /api/admin/members
// ---------------------------------------------------------------------------
export const MembershipAddSchema = z.object({
  user_id: z.string().uuid("User ID must be a valid UUID"),
  department_id: z.string().uuid("Department ID must be a valid UUID"),
  role: z.enum(["officer", "reviewer", "head"]),
});

export type MembershipAddInput = z.infer<typeof MembershipAddSchema>;

export const MembershipRevokeSchema = z.object({
  membership_id: z.string().uuid("Membership ID must be a valid UUID"),
});

export type MembershipRevokeInput = z.infer<typeof MembershipRevokeSchema>;

// ---------------------------------------------------------------------------
// Notification read — PATCH /api/notifications/[id]/read
// ---------------------------------------------------------------------------
export const MarkNotificationReadSchema = z.object({
  is_read: z.boolean().default(true),
});
