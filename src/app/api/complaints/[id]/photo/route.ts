/**
 * src/app/api/complaints/[id]/photo/route.ts
 *
 * PRD-02 :: Private Photo Storage API (GET / POST /api/complaints/[id]/photo).
 * Manages private uploads, validates MIME & size, and issues short-lived signed URLs.
 * Direct public access is disabled; unauthorized callers are denied.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewComplaint, canModifyComplaint } from "@/lib/auth/permissions";
import {
  STORAGE_BUCKET_NAME,
  generateSafeStoragePath,
  validatePhotoFile,
  getSignedPhotoUrl,
  cleanupStorageObject,
  uploadComplaintPhotoSafely,
} from "@/lib/storage/complaint-storage";

/**
 * GET /api/complaints/[id]/photo
 * Returns a short-lived signed URL for an authorized caller.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view complaint evidence." },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    const { data: complaint, error } = await supabase
      .from("complaints")
      .select("id, citizen_id, department_id, photo_path, is_public")
      .eq("id", complaintId)
      .single();

    if (error || !complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // Load active departments for officer scope
    const { data: memberships } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const activeDeptIds = (memberships ?? []).map((m) => m.department_id);

    const isAuthorized = canViewComplaint(
      { userId: user.id, role, activeDepartmentIds: activeDeptIds },
      complaint
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    if (!complaint.photo_path) {
      return NextResponse.json({ error: "No photo attached to this complaint." }, { status: 404 });
    }

    const signedUrl = await getSignedPhotoUrl(complaint.photo_path, 300);
    if (!signedUrl) {
      return NextResponse.json({ error: "Failed to generate signed download link." }, { status: 500 });
    }

    return NextResponse.json(
      {
        signed_url: signedUrl,
        expires_in_seconds: 300,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Error in GET /api/complaints/[id]/photo:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/complaints/[id]/photo
 * Securely uploads an image to the private storage bucket.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to upload evidence." },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    // 1. Verify complaint ownership and edit permission
    const { data: complaint, error: fetchErr } = await supabase
      .from("complaints")
      .select("id, citizen_id, department_id, status")
      .eq("id", complaintId)
      .single();

    if (fetchErr || !complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // Active departments check
    const { data: memberships } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const activeDeptIds = (memberships ?? []).map((m) => m.department_id);

    const canEdit = canModifyComplaint(
      { userId: user.id, role, activeDepartmentIds: activeDeptIds },
      complaint
    );

    if (!canEdit) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot attach photo to this complaint." },
        { status: 403 }
      );
    }

    // 2. Parse uploaded file from formData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    // 3. Validate file size and MIME type (max 10MB, JPEG/PNG/WebP)
    const fileValidation = validatePhotoFile({ size: file.size, type: file.type });
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 415 });
    }

    // 4. Upload to private Supabase storage bucket with safe fallback
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { photoPath: storagePath } = await uploadComplaintPhotoSafely(
      complaint.id,
      fileBuffer,
      file.type
    );

    // 6. Update complaint photo_path
    const { error: updateErr } = await supabase
      .from("complaints")
      .update({ photo_path: storagePath, updated_at: new Date().toISOString() })
      .eq("id", complaint.id);

    if (updateErr) {
      // Clean up orphaned upload on DB failure
      await cleanupStorageObject(storagePath);
      return NextResponse.json({ error: "Failed to link photo with complaint." }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Photo uploaded and attached successfully.",
        photo_path: storagePath,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Error in POST /api/complaints/[id]/photo:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
