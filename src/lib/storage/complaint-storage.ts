/**
 * src/lib/storage/complaint-storage.ts
 *
 * PRD-02 :: Private Complaint Photo Storage Engine.
 * Manages secure file uploads, safe path generation, and short-lived signed URLs.
 * Public bucket access is disabled; all downloads require signed URL validation.
 * Includes automatic bucket safeguard and default placeholder fallbacks.
 * All comments use Roman English or Roman Urdu.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
} from "@/lib/validation/complaint";

export const STORAGE_BUCKET_NAME = "complaint-photos";

// Standard fallback placeholder when storage bucket is uninitialized or fails
export const DEFAULT_PHOTO_PLACEHOLDER =
  "placeholder:complaint-photos/default-placeholder.jpg";

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
 * Ensures bucket exists in Supabase. Tries to create if missing.
 */
async function ensureBucketExists(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: buckets, error: listErr } = await admin.storage.listBuckets();
    if (!listErr && buckets) {
      const exists = buckets.some((b) => b.name === STORAGE_BUCKET_NAME);
      if (exists) return true;
    }

    // Attempt to create bucket if missing
    const { error: createErr } = await admin.storage.createBucket(STORAGE_BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    if (createErr) {
      console.warn(
        `[CivicPulse Storage] Note: Could not auto-create '${STORAGE_BUCKET_NAME}' bucket (${createErr.message}). Safe placeholder will be used.`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[CivicPulse Storage] Bucket check/creation skipped:", err);
    return false;
  }
}

/**
 * Uploads a photo buffer to the private storage bucket with bucket missing safeguard.
 * If the Supabase bucket is not created yet or fails during upload, catches the error
 * gracefully and falls back to a default image placeholder string so complaint submission
 * completes successfully.
 */
export async function uploadComplaintPhotoSafely(
  complaintId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ photoPath: string; isPlaceholder: boolean }> {
  try {
    const admin = createAdminClient();
    const storagePath = generateSafeStoragePath(complaintId, mimeType);

    // Ensure bucket is available
    await ensureBucketExists();

    const { error: uploadErr } = await admin.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadErr) {
      console.warn(
        `[CivicPulse Storage] Upload to '${STORAGE_BUCKET_NAME}' failed: ${uploadErr.message}. Falling back to default placeholder string.`
      );
      return { photoPath: DEFAULT_PHOTO_PLACEHOLDER, isPlaceholder: true };
    }

    return { photoPath: storagePath, isPlaceholder: false };
  } catch (err: any) {
    console.warn(
      `[CivicPulse Storage] Exception uploading photo: ${err?.message || err}. Falling back to default placeholder string.`
    );
    return { photoPath: DEFAULT_PHOTO_PLACEHOLDER, isPlaceholder: true };
  }
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
  if (!storagePath) return null;

  // If this is a placeholder or external link, return fallback
  if (storagePath.startsWith("placeholder:") || storagePath.startsWith("http")) {
    return storagePath.startsWith("http") ? storagePath : null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(
        `[CivicPulse Storage] Failed to create signed URL for '${storagePath}': ${error?.message}`
      );
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn("[CivicPulse Storage] Exception creating signed URL:", err);
    return null;
  }
}

/**
 * Cleans up orphaned or rejected storage objects if database insertion fails.
 */
export async function cleanupStorageObject(storagePath: string): Promise<void> {
  if (!storagePath || storagePath.startsWith("placeholder:")) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.storage.from(STORAGE_BUCKET_NAME).remove([storagePath]);
    if (error) {
      console.warn("[CivicPulse Storage] Failed to delete orphaned object:", storagePath, error.message);
    }
  } catch (err) {
    console.warn("[CivicPulse Storage] Cleanup exception:", err);
  }
}
