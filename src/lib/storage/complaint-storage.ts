/**
 * src/lib/storage/complaint-storage.ts
 *
 * PRD-02 :: Private Complaint Photo Storage Engine.
 * Manages secure file uploads, safe path generation, and short-lived signed URLs.
 * Public bucket access is disabled; all downloads require signed URL validation.
 * All comments use Roman English or Roman Urdu.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
} from "@/lib/validation/complaint";

export const STORAGE_BUCKET_NAME = "complaint-photos";

// Mapping MIME types to safe extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Generates an unguessable, safe storage object path.
 * Path pattern: private/complaints/{complaintId}/{randomUUID}.{ext}
 * Never uses raw client-supplied filenames to prevent traversal or PII leakage.
 */
export function generateSafeStoragePath(complaintId: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] || "bin";
  const randomSuffix = crypto.randomUUID();
  return `private/complaints/${complaintId}/${randomSuffix}.${ext}`;
}

/**
 * Validates file headers and size before upload.
 */
export function validatePhotoFile(file: {
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10MB limit (provided: ${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Unsupported file type '${file.type}'. Permitted formats: JPEG, PNG, WebP.`,
    };
  }

  return { valid: true };
}

/**
 * Generates a short-lived signed URL for an authorized caller.
 * Default expiration: 300 seconds (5 minutes).
 * Never logged or stored as a permanent public link.
 */
export async function getSignedPhotoUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("[CivicPulse Storage] Failed to create signed URL:", error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Cleans up orphaned or rejected storage objects if database insertion fails.
 */
export async function cleanupStorageObject(storagePath: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(STORAGE_BUCKET_NAME).remove([storagePath]);
  if (error) {
    console.warn("[CivicPulse Storage] Failed to delete orphaned object:", storagePath, error.message);
  }
}
