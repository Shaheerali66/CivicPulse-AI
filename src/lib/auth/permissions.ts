/**
 * src/lib/auth/permissions.ts
 *
 * PRD-02 :: Role-Based Access Control & Permission Engine.
 * Authoritative single source of truth for authorization logic.
 * Enforces least-privilege access across citizens, officers, and administrators.
 * All comments use Roman English or Roman Urdu.
 */

import type {
  UserRole,
  ComplaintStatus,
  Tables,
} from "@/types/database";

// ----------------------------------------------------------------------------
// 1. Role Hierarchy & Capability Verification
// ----------------------------------------------------------------------------
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  citizen: 1,
  reviewer: 2,
  officer: 2,
  admin: 3,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isOfficer(role: UserRole): boolean {
  return role === "officer" || role === "admin";
}

export function isCitizen(role: UserRole): boolean {
  return role === "citizen";
}

// ----------------------------------------------------------------------------
// 2. Complaint Access Authorization
// ----------------------------------------------------------------------------
export interface ComplaintAccessContext {
  userId: string;
  role: UserRole;
  activeDepartmentIds: string[]; // Departments jahan user active officer hai
}

/**
 * Checks if a caller has permission to view a specific complaint record.
 * - Citizens: strictly own complaints (citizen_id === userId)
 * - Officers: complaints assigned to active departments they belong to
 * - Admins: system-wide visibility
 */
export function canViewComplaint(
  context: ComplaintAccessContext,
  complaint: Pick<Tables<"complaints">, "citizen_id" | "department_id" | "is_public">
): boolean {
  if (context.role === "admin") {
    return true;
  }

  // Citizen can view their own complaint
  if (complaint.citizen_id && complaint.citizen_id === context.userId) {
    return true;
  }

  // Officer can view complaints for their authorized departments
  if (
    context.role === "officer" &&
    complaint.department_id &&
    context.activeDepartmentIds.includes(complaint.department_id)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a caller has permission to modify a complaint record.
 * - Citizens: can only edit non-triage fields while status is 'submitted'
 * - Officers: can update complaints in their active departments
 * - Admins: can update any complaint
 */
export function canModifyComplaint(
  context: ComplaintAccessContext,
  complaint: Pick<Tables<"complaints">, "citizen_id" | "department_id" | "status">
): boolean {
  if (context.role === "admin") {
    return true;
  }

  if (context.role === "citizen") {
    return complaint.citizen_id === context.userId && complaint.status === "submitted";
  }

  if (context.role === "officer") {
    return Boolean(
      complaint.department_id &&
      context.activeDepartmentIds.includes(complaint.department_id)
    );
  }

  return false;
}

// ----------------------------------------------------------------------------
// 3. Status Transition State Machine (PRD-02 Section 8 & 10.6)
// ----------------------------------------------------------------------------

/**
 * Permitted status transitions table.
 * Har status ke valid next transitions defined hain.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ["analyzing", "needs_review", "assigned", "rejected"],
  analyzing: ["needs_review", "assigned", "submitted"],
  needs_review: ["assigned", "rejected", "in_progress"],
  assigned: ["in_progress", "needs_review", "rejected"],
  in_progress: ["resolved", "needs_review", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: ["in_progress"], // Re-opening closed complaint requires admin
  rejected: ["needs_review"], // Re-evaluating rejected complaint requires admin
};

/**
 * Validates whether a status transition is permissible for the caller's role.
 */
export function isValidStatusTransition(
  fromStatus: ComplaintStatus,
  toStatus: ComplaintStatus,
  role: UserRole
): { valid: boolean; reason?: string } {
  // Same status transition is a no-op
  if (fromStatus === toStatus) {
    return { valid: true };
  }

  // Citizens cannot transition complaint statuses directly
  if (role === "citizen") {
    return {
      valid: false,
      reason: "Citizens cannot alter complaint lifecycle status.",
    };
  }

  // Check state machine transitions
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    return {
      valid: false,
      reason: `Illegal state transition from '${fromStatus}' to '${toStatus}'.`,
    };
  }

  // Re-opening closed/rejected complaints is strictly reserved for administrators
  if ((fromStatus === "closed" || fromStatus === "rejected") && role !== "admin") {
    return {
      valid: false,
      reason: `Re-evaluating or re-opening a '${fromStatus}' complaint requires administrator authority.`,
    };
  }

  return { valid: true };
}

// ----------------------------------------------------------------------------
// 4. Department & Officer Assignment Validation (PRD-02 Section 10.5)
// ----------------------------------------------------------------------------
export interface AssignmentValidationInput {
  targetDepartment: {
    id: string;
    is_active: boolean;
  };
  assignedOfficerId?: string | null;
  officerActiveMemberships?: {
    department_id: string;
    user_id: string;
    is_active: boolean;
  }[];
}

/**
 * Validates department assignment and ensures assigned officer belongs to the target department.
 * Inconsistent department + officer combinations are strictly rejected.
 */
export function validateDepartmentAssignment(
  input: AssignmentValidationInput
): { valid: boolean; reason?: string } {
  // 1. Target department must be active
  if (!input.targetDepartment.is_active) {
    return {
      valid: false,
      reason: "Cannot assign complaint to an inactive department.",
    };
  }

  // 2. If assigning to a specific officer, verify their active membership in target department
  if (input.assignedOfficerId) {
    const hasMembership = input.officerActiveMemberships?.some(
      (m) =>
        m.user_id === input.assignedOfficerId &&
        m.department_id === input.targetDepartment.id &&
        m.is_active
    );

    if (!hasMembership) {
      return {
        valid: false,
        reason:
          "Assigned officer does not have an active membership in the target department.",
      };
    }
  }

  return { valid: true };
}

// ----------------------------------------------------------------------------
// 5. Public Data Sanitization (PRD-02 Section 13.2)
// ----------------------------------------------------------------------------

/**
 * Filters complaint fields for public presentation.
 * Strips citizen identity, contact information, private photo paths, and internal notes.
 */
export function filterPublicComplaint(complaint: Tables<"complaints">) {
  return {
    id: complaint.id,
    tracking_id: complaint.tracking_id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    location_label: complaint.location_label,
    submitted_at: complaint.submitted_at,
    updated_at: complaint.updated_at,
    resolved_at: complaint.resolved_at,
    closed_at: complaint.closed_at,
    // Sensitive fields explicitly omitted:
    // citizen_id, photo_path, latitude, longitude, assigned_to
  };
}

/**
 * Filters audit events for citizen visibility.
 * Hides internal staff notes, security alerts, and private triage discussions.
 */
export function filterCitizenAuditEvents(events: Tables<"complaint_events">[]) {
  const citizenSafeEventTypes = new Set([
    "complaint_submitted",
    "department_assigned",
    "status_changed",
    "resolution_recorded",
    "complaint_closed",
  ]);

  return events
    .filter((e) => citizenSafeEventTypes.has(e.event_type))
    .map((e) => ({
      id: e.id,
      event_type: e.event_type,
      new_status: (e.new_value as any)?.status || null,
      created_at: e.created_at,
      // note and previous_value stripped if internal
    }));
}
