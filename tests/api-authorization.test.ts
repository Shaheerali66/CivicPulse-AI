/**
 * tests/api-authorization.test.ts
 *
 * PRD-02 :: Authorization & RBAC Test Suite.
 * Validates role-based boundaries, complaint ownership, cross-department isolation,
 * status transition state machines, and public data filters.
 * All comments use Roman English or Roman Urdu.
 */

import { describe, it, expect } from "vitest";
import {
  canViewComplaint,
  canModifyComplaint,
  isValidStatusTransition,
  validateDepartmentAssignment,
  filterPublicComplaint,
  filterCitizenAuditEvents,
} from "@/lib/auth/permissions";
import type { Tables } from "@/types/database";

describe("PRD-02 :: Authorization & Permission Tests", () => {
  const citizenA = {
    userId: "11111111-1111-1111-1111-111111111111",
    role: "citizen" as const,
    activeDepartmentIds: [],
  };

  const citizenB = {
    userId: "22222222-2222-2222-2222-222222222222",
    role: "citizen" as const,
    activeDepartmentIds: [],
  };

  const roadsOfficer = {
    userId: "33333333-3333-3333-3333-333333333333",
    role: "officer" as const,
    activeDepartmentIds: ["dept-roads-001"],
  };

  const sanitationOfficer = {
    userId: "44444444-4444-4444-4444-444444444444",
    role: "officer" as const,
    activeDepartmentIds: ["dept-sanitation-002"],
  };

  const adminUser = {
    userId: "99999999-9999-9999-9999-999999999999",
    role: "admin" as const,
    activeDepartmentIds: [],
  };

  describe("canViewComplaint", () => {
    const complaintA = {
      citizen_id: citizenA.userId,
      department_id: "dept-roads-001",
      is_public: false,
    };

    it("SEC-01: Citizen A CAN view own complaint", () => {
      expect(canViewComplaint(citizenA, complaintA)).toBe(true);
    });

    it("SEC-01: Citizen B CANNOT view Citizen A's complaint", () => {
      expect(canViewComplaint(citizenB, complaintA)).toBe(false);
    });

    it("SEC-05: Roads Officer CAN view complaint assigned to Roads department", () => {
      expect(canViewComplaint(roadsOfficer, complaintA)).toBe(true);
    });

    it("SEC-05: Sanitation Officer CANNOT view complaint assigned to Roads department", () => {
      expect(canViewComplaint(sanitationOfficer, complaintA)).toBe(false);
    });

    it("Admin CAN view any complaint across all departments", () => {
      expect(canViewComplaint(adminUser, complaintA)).toBe(true);
    });
  });

  describe("canModifyComplaint", () => {
    it("SEC-02: Citizen A can modify own complaint when status is 'submitted'", () => {
      const complaintSubmitted = {
        citizen_id: citizenA.userId,
        department_id: null,
        status: "submitted" as const,
      };
      expect(canModifyComplaint(citizenA, complaintSubmitted)).toBe(true);
    });

    it("SEC-02: Citizen A CANNOT modify complaint once assigned or in_progress", () => {
      const complaintAssigned = {
        citizen_id: citizenA.userId,
        department_id: "dept-roads-001",
        status: "in_progress" as const,
      };
      expect(canModifyComplaint(citizenA, complaintAssigned)).toBe(false);
    });

    it("SEC-02: Citizen B CANNOT modify Citizen A's complaint", () => {
      const complaint = {
        citizen_id: citizenA.userId,
        department_id: null,
        status: "submitted" as const,
      };
      expect(canModifyComplaint(citizenB, complaint)).toBe(false);
    });

    it("SEC-05: Officer can modify complaints only within their active department scope", () => {
      const roadsComplaint = {
        citizen_id: citizenA.userId,
        department_id: "dept-roads-001",
        status: "assigned" as const,
      };
      expect(canModifyComplaint(roadsOfficer, roadsComplaint)).toBe(true);
      expect(canModifyComplaint(sanitationOfficer, roadsComplaint)).toBe(false);
    });
  });

  describe("isValidStatusTransition (State Machine)", () => {
    it("allows legal progression: submitted -> assigned -> in_progress -> resolved -> closed", () => {
      expect(isValidStatusTransition("submitted", "assigned", "officer").valid).toBe(true);
      expect(isValidStatusTransition("assigned", "in_progress", "officer").valid).toBe(true);
      expect(isValidStatusTransition("in_progress", "resolved", "officer").valid).toBe(true);
      expect(isValidStatusTransition("resolved", "closed", "officer").valid).toBe(true);
    });

    it("SEC-16: rejects invalid jumps like submitted -> closed or resolved -> submitted", () => {
      const invalidJump = isValidStatusTransition("submitted", "closed", "officer");
      expect(invalidJump.valid).toBe(false);

      const backwardsJump = isValidStatusTransition("resolved", "submitted", "officer");
      expect(backwardsJump.valid).toBe(false);
    });

    it("rejects citizen role from altering status", () => {
      const citizenAttempt = isValidStatusTransition("submitted", "in_progress", "citizen");
      expect(citizenAttempt.valid).toBe(false);
      expect(citizenAttempt.reason).toContain("Citizens cannot alter");
    });

    it("requires admin to re-open closed complaints", () => {
      const officerReopen = isValidStatusTransition("closed", "in_progress", "officer");
      expect(officerReopen.valid).toBe(false);

      const adminReopen = isValidStatusTransition("closed", "in_progress", "admin");
      expect(adminReopen.valid).toBe(true);
    });
  });

  describe("validateDepartmentAssignment", () => {
    it("SEC-15: rejects assignment when officer does not belong to target department", () => {
      const result = validateDepartmentAssignment({
        targetDepartment: { id: "dept-roads-001", is_active: true },
        assignedOfficerId: sanitationOfficer.userId,
        officerActiveMemberships: [
          {
            department_id: "dept-sanitation-002",
            user_id: sanitationOfficer.userId,
            is_active: true,
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not have an active membership");
    });

    it("accepts assignment when officer is active member of target department", () => {
      const result = validateDepartmentAssignment({
        targetDepartment: { id: "dept-roads-001", is_active: true },
        assignedOfficerId: roadsOfficer.userId,
        officerActiveMemberships: [
          {
            department_id: "dept-roads-001",
            user_id: roadsOfficer.userId,
            is_active: true,
          },
        ],
      });

      expect(result.valid).toBe(true);
    });

    it("rejects assignment to an inactive department", () => {
      const result = validateDepartmentAssignment({
        targetDepartment: { id: "dept-archived-003", is_active: false },
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("inactive department");
    });
  });

  describe("filterPublicComplaint & filterCitizenAuditEvents", () => {
    it("strips sensitive PII and private coordinates from public complaint views", () => {
      const rawComplaint: Tables<"complaints"> = {
        id: "c-001",
        tracking_id: "CP-20261017-ABC123",
        citizen_id: "secret-citizen-uuid",
        title: "Broken Water Pipe",
        description: "Fresh water flooding residential lane.",
        category: "water_leakage",
        status: "in_progress",
        priority: "high",
        submission_method: "manual",
        department_id: "dept-water-001",
        assigned_to: "secret-officer-uuid",
        latitude: 25.396,
        longitude: 68.357,
        location_label: "Latifabad Unit 7",
        photo_path: "private/complaints/c-001/uuid.jpg",
        is_public: true,
        submitted_at: "2026-10-17T12:00:00Z",
        updated_at: "2026-10-17T12:30:00Z",
        resolved_at: null,
        closed_at: null,
      };

      const publicView = filterPublicComplaint(rawComplaint);

      expect((publicView as any).citizen_id).toBeUndefined();
      expect((publicView as any).photo_path).toBeUndefined();
      expect((publicView as any).latitude).toBeUndefined();
      expect((publicView as any).longitude).toBeUndefined();
      expect((publicView as any).assigned_to).toBeUndefined();
      expect(publicView.tracking_id).toBe("CP-20261017-ABC123");
      expect(publicView.location_label).toBe("Latifabad Unit 7");
    });

    it("excludes internal officer notes and internal security alerts from citizen timeline", () => {
      const events: Tables<"complaint_events">[] = [
        {
          id: "e-1",
          complaint_id: "c-001",
          actor_id: "citizen-1",
          event_type: "complaint_submitted",
          previous_value: null,
          new_value: { status: "submitted" },
          note: null,
          created_at: "2026-10-17T12:00:00Z",
        },
        {
          id: "e-2",
          complaint_id: "c-001",
          actor_id: "officer-1",
          event_type: "internal_discussion", // Internal event
          previous_value: null,
          new_value: { comment: "Suspicious report, check contractor invoice" },
          note: "Secret internal note",
          created_at: "2026-10-17T12:15:00Z",
        },
        {
          id: "e-3",
          complaint_id: "c-001",
          actor_id: "officer-1",
          event_type: "status_changed",
          previous_value: { status: "submitted" },
          new_value: { status: "in_progress" },
          note: null,
          created_at: "2026-10-17T12:30:00Z",
        },
      ];

      const citizenEvents = filterCitizenAuditEvents(events);
      expect(citizenEvents.length).toBe(2);
      expect(citizenEvents.map((e) => e.event_type)).toEqual([
        "complaint_submitted",
        "status_changed",
      ]);
    });
  });
});
