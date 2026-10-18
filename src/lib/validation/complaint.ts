/**
 * src/lib/validation/complaint.ts
 *
 * PRD-02 :: Zod Input Validation Schemas.
 * Server-side validation for all write and read query endpoints.
 * Strict schemas reject unexpected privileged fields.
 * All comments use Roman English or Roman Urdu.
 */

import { z } from "zod";

// ----------------------------------------------------------------------------
// Enums matching database constraints
// ----------------------------------------------------------------------------
export const ComplaintCategoryEnum = z.enum([
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
]);

export const ComplaintStatusEnum = z.enum([
  "submitted",
  "analyzing",
  "needs_review",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
]);

export const ComplaintPriorityEnum = z.enum(["low", "medium", "high", "critical"]);

export const SubmissionMethodEnum = z.enum(["ai", "manual"]);

export const UserRoleEnum = z.enum(["citizen", "officer", "admin"]);

export const DepartmentMembershipRoleEnum = z.enum(["officer", "lead", "supervisor"]);

// ----------------------------------------------------------------------------
// 1. Complaint Submission Schema (POST /api/complaints)
// Strict mode prevents client-side forgery of citizen_id, status, or assignments.
// ----------------------------------------------------------------------------
export const CreateComplaintSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must not exceed 200 characters")
      .trim(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description must not exceed 5000 characters")
      .trim(),
    category: ComplaintCategoryEnum.default("unknown"),
    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .nullable()
      .optional(),
    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .nullable()
      .optional(),
    location_label: z
      .string()
      .max(200, "Location label must not exceed 200 characters")
      .nullable()
      .optional(),
    photo_path: z
      .string()
      .max(500, "Photo path must not exceed 500 characters")
      .nullable()
      .optional(),
    submission_method: SubmissionMethodEnum.default("manual"),
    is_public: z.boolean().default(false),
  })
  .strict(); // Disallows unexpected fields like citizen_id, department_id, assigned_to, etc.

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

// ----------------------------------------------------------------------------
// 2. Complaint Status Transition Schema (PATCH /api/complaints/[id]/status)
// ----------------------------------------------------------------------------
export const UpdateStatusSchema = z
  .object({
    status: ComplaintStatusEnum,
    note: z.string().max(1000, "Note must not exceed 1000 characters").optional(),
  })
  .strict();

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

// ----------------------------------------------------------------------------
// 3. Complaint Assignment Schema (POST /api/complaints/[id]/assign)
// ----------------------------------------------------------------------------
export const AssignComplaintSchema = z
  .object({
    department_id: z.string().uuid("Invalid department UUID format"),
    assigned_to: z.string().uuid("Invalid officer UUID format").nullable().optional(),
    note: z.string().max(1000, "Note must not exceed 1000 characters").optional(),
  })
  .strict();

export type AssignComplaintInput = z.infer<typeof AssignComplaintSchema>;

// ----------------------------------------------------------------------------
// 4. Complaint Listing & Pagination Query Schema (GET /api/complaints)
// ----------------------------------------------------------------------------
export const ListComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ComplaintStatusEnum.optional(),
  category: ComplaintCategoryEnum.optional(),
  priority: ComplaintPriorityEnum.optional(),
  department_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export type ListComplaintsQuery = z.infer<typeof ListComplaintsQuerySchema>;

// ----------------------------------------------------------------------------
// 5. User Profile Update Schema (PATCH /api/auth/profile)
// Prevents users from escalating their own role.
// ----------------------------------------------------------------------------
export const UpdateProfileSchema = z
  .object({
    display_name: z
      .string()
      .min(1, "Display name cannot be empty")
      .max(150, "Display name must not exceed 150 characters")
      .trim()
      .optional(),
    phone: z
      .string()
      .max(30, "Phone number must not exceed 30 characters")
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ----------------------------------------------------------------------------
// 6. Admin Role Update Schema (POST /api/admin/roles)
// ----------------------------------------------------------------------------
export const AdminRoleUpdateSchema = z
  .object({
    target_user_id: z.string().uuid("Invalid target user UUID"),
    role: UserRoleEnum,
  })
  .strict();

export type AdminRoleUpdateInput = z.infer<typeof AdminRoleUpdateSchema>;

// ----------------------------------------------------------------------------
// 7. Admin Department Membership Schema (POST/PATCH /api/admin/memberships)
// ----------------------------------------------------------------------------
export const AdminMembershipSchema = z
  .object({
    department_id: z.string().uuid("Invalid department UUID"),
    user_id: z.string().uuid("Invalid user UUID"),
    membership_role: DepartmentMembershipRoleEnum.default("officer"),
    is_active: z.boolean().default(true),
  })
  .strict();

export type AdminMembershipInput = z.infer<typeof AdminMembershipSchema>;

// ----------------------------------------------------------------------------
// 8. Photo Upload Validation (PRD-02 Section 11)
// ----------------------------------------------------------------------------
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PhotoUploadMetadataSchema = z.object({
  file_name: z.string().min(1).max(255),
  content_type: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({ message: "Only JPEG, PNG, and WebP images are permitted." }),
  }),
  size_bytes: z
    .number()
    .max(MAX_PHOTO_SIZE_BYTES, "Image size exceeds 10MB limit."),
});
