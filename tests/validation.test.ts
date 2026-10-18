/**
 * tests/validation.test.ts
 *
 * PRD-02 :: Zod Input Validation Suite.
 * Verifies that untrusted client inputs are strictly validated and
 * unexpected privileged fields are rejected.
 * All comments use Roman English or Roman Urdu.
 */

import { describe, it, expect } from "vitest";
import {
  CreateComplaintSchema,
  UpdateStatusSchema,
  AssignComplaintSchema,
  ListComplaintsQuerySchema,
  UpdateProfileSchema,
  AdminRoleUpdateSchema,
  AdminMembershipSchema,
  PhotoUploadMetadataSchema,
  MAX_PHOTO_SIZE_BYTES,
} from "@/lib/validation/complaint";

describe("PRD-02 :: Input Validation Schemas", () => {
  describe("CreateComplaintSchema", () => {
    it("should accept valid complaint data", () => {
      const valid = {
        title: "Pothole on Main Road",
        description: "Large dangerous pothole causing vehicular damage near street 4.",
        category: "road_damage",
        latitude: 25.396,
        longitude: 68.357,
        location_label: "Qasimabad, Hyderabad",
        submission_method: "manual",
        is_public: false,
      };

      const result = CreateComplaintSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Pothole on Main Road");
        expect(result.data.category).toBe("road_damage");
      }
    });

    it("should reject short title (< 3 chars) or short description (< 10 chars)", () => {
      const invalid = {
        title: "No",
        description: "Too short",
      };

      const result = CreateComplaintSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.title).toBeDefined();
        expect(errors.description).toBeDefined();
      }
    });

    it("should reject coordinates outside geographic ranges", () => {
      const invalidCoords = {
        title: "Broken Streetlight",
        description: "Streetlight fixture is loose and sparking during wind.",
        latitude: 95.0, // Invalid: > 90
        longitude: -195.0, // Invalid: < -180
      };

      const result = CreateComplaintSchema.safeParse(invalidCoords);
      expect(result.success).toBe(false);
    });

    it("SEC-03 & SEC-27: should strictly reject injected privileged fields like citizen_id or status", () => {
      const maliciousPayload = {
        title: "Garbage Pile Up",
        description: "Waste collection has been delayed for three consecutive days.",
        citizen_id: "00000000-0000-0000-0000-000000000001", // Injected
        status: "resolved", // Injected
        role: "admin", // Injected
        department_id: "a0000000-0000-0000-0000-000000000001", // Injected
      };

      const result = CreateComplaintSchema.safeParse(maliciousPayload);
      // Schema uses .strict(), so extra keys fail validation
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateStatusSchema", () => {
    it("should accept valid status and reject invalid enum values", () => {
      const valid = UpdateStatusSchema.safeParse({ status: "in_progress", note: "Started work" });
      expect(valid.success).toBe(true);

      const invalid = UpdateStatusSchema.safeParse({ status: "super_resolved" });
      expect(invalid.success).toBe(false);
    });
  });

  describe("AssignComplaintSchema", () => {
    it("should validate department UUID and optional officer UUID", () => {
      const valid = AssignComplaintSchema.safeParse({
        department_id: "a0000000-0000-0000-0000-000000000001",
        assigned_to: "b0000000-0000-0000-0000-000000000002",
        note: "Assigned to Roads team lead.",
      });
      expect(valid.success).toBe(true);

      const invalid = AssignComplaintSchema.safeParse({
        department_id: "not-a-uuid",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("ListComplaintsQuerySchema", () => {
    it("should coerce numbers and bound pagination limits", () => {
      const parsed = ListComplaintsQuerySchema.parse({
        page: "2",
        limit: "50",
      });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);

      // Over 100 limit is rejected
      const overLimit = ListComplaintsQuerySchema.safeParse({ limit: "500" });
      expect(overLimit.success).toBe(false);
    });
  });

  describe("UpdateProfileSchema", () => {
    it("SEC-04: should reject any attempt to pass role in profile update", () => {
      const malicious = {
        display_name: "John Doe",
        role: "admin", // Malicious escalation attempt
      };

      const result = UpdateProfileSchema.safeParse(malicious);
      expect(result.success).toBe(false);
    });

    it("should accept valid display_name and phone", () => {
      const valid = UpdateProfileSchema.safeParse({
        display_name: "Ahmed Khan",
        phone: "+923001234567",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("PhotoUploadMetadataSchema", () => {
    it("SEC-13: should reject unsupported file formats and oversized files", () => {
      // Valid JPEG within limit
      const valid = PhotoUploadMetadataSchema.safeParse({
        file_name: "damage.jpg",
        content_type: "image/jpeg",
        size_bytes: 4 * 1024 * 1024,
      });
      expect(valid.success).toBe(true);

      // Invalid format (.exe, .pdf, .svg)
      const invalidType = PhotoUploadMetadataSchema.safeParse({
        file_name: "payload.exe",
        content_type: "application/x-msdownload",
        size_bytes: 1024,
      });
      expect(invalidType.success).toBe(false);

      // Oversized (> 10MB)
      const oversized = PhotoUploadMetadataSchema.safeParse({
        file_name: "giant_photo.png",
        content_type: "image/png",
        size_bytes: MAX_PHOTO_SIZE_BYTES + 1024,
      });
      expect(oversized.success).toBe(false);
    });
  });

  describe("AdminRoleUpdateSchema & AdminMembershipSchema", () => {
    it("should require valid UUIDs and recognized roles", () => {
      const validRole = AdminRoleUpdateSchema.safeParse({
        target_user_id: "00000000-0000-0000-0000-000000000001",
        role: "officer",
      });
      expect(validRole.success).toBe(true);

      const invalidRole = AdminRoleUpdateSchema.safeParse({
        target_user_id: "00000000-0000-0000-0000-000000000001",
        role: "super_admin",
      });
      expect(invalidRole.success).toBe(false);

      const validMembership = AdminMembershipSchema.safeParse({
        department_id: "a0000000-0000-0000-0000-000000000001",
        user_id: "00000000-0000-0000-0000-000000000001",
        membership_role: "lead",
        is_active: true,
      });
      expect(validMembership.success).toBe(true);
    });
  });
});
