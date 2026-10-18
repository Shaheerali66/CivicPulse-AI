/**
 * tests/storage-security.test.ts
 *
 * PRD-02 :: Private Storage Security Tests.
 * Verifies that complaint evidence is stored in private object paths,
 * unguessable paths prevent enumeration, and file upload validations block abuse.
 * All comments use Roman English or Roman Urdu.
 */

import { describe, it, expect } from "vitest";
import {
  generateSafeStoragePath,
  validatePhotoFile,
  STORAGE_BUCKET_NAME,
} from "@/lib/storage/complaint-storage";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/validation/complaint";

describe("PRD-02 :: Storage Security & File Uploads", () => {
  it("uses private bucket identifier", () => {
    expect(STORAGE_BUCKET_NAME).toBe("complaint-photos");
  });

  describe("generateSafeStoragePath", () => {
    it("generates unguessable, non-sequential storage paths", () => {
      const complaintId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const path1 = generateSafeStoragePath(complaintId, "image/jpeg");
      const path2 = generateSafeStoragePath(complaintId, "image/jpeg");

      expect(path1).not.toBe(path2);
      expect(path1.startsWith(`private/complaints/${complaintId}/`)).toBe(true);
      expect(path1.endsWith(".jpg")).toBe(true);
    });

    it("SEC-11: does not leak original filename or permit directory traversal", () => {
      const complaintId = "c-123";
      const path = generateSafeStoragePath(complaintId, "image/png");

      // Verify no path traversal indicators
      expect(path).not.toContain("..");
      expect(path).not.toContain("etc/passwd");
      expect(path.endsWith(".png")).toBe(true);
    });
  });

  describe("validatePhotoFile", () => {
    it("accepts valid JPEG, PNG, and WebP images within 10MB limit", () => {
      expect(
        validatePhotoFile({ size: 2 * 1024 * 1024, type: "image/jpeg" }).valid
      ).toBe(true);
      expect(
        validatePhotoFile({ size: 5 * 1024 * 1024, type: "image/png" }).valid
      ).toBe(true);
      expect(
        validatePhotoFile({ size: 8 * 1024 * 1024, type: "image/webp" }).valid
      ).toBe(true);
    });

    it("SEC-13: rejects files exceeding maximum 10MB limit", () => {
      const oversized = validatePhotoFile({
        size: MAX_PHOTO_SIZE_BYTES + 500,
        type: "image/jpeg",
      });
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain("exceeds the 10MB limit");
    });

    it("SEC-13: rejects dangerous or unsupported media types (SVG, HTML, EXE, PDF)", () => {
      const svg = validatePhotoFile({ size: 1024, type: "image/svg+xml" });
      expect(svg.valid).toBe(false);
      expect(svg.error).toContain("Unsupported file type");

      const exe = validatePhotoFile({ size: 1024, type: "application/x-msdownload" });
      expect(exe.valid).toBe(false);

      const html = validatePhotoFile({ size: 1024, type: "text/html" });
      expect(html.valid).toBe(false);

      const pdf = validatePhotoFile({ size: 1024, type: "application/pdf" });
      expect(pdf.valid).toBe(false);
    });
  });
});
