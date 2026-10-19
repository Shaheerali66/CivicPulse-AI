/**
 * src/app/api/admin/departments/[id]/route.ts
 *
 * PRD-04 :: API — Admin Department Update & Deactivation
 * PATCH /api/admin/departments/[id] — update department configuration
 * DELETE /api/admin/departments/[id] — soft deactivate department
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { DepartmentUpsertSchema } from "@/lib/validation/api-schemas";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getAdminClient();
    const { id } = await params;
    const body = await request.json();
    const parseResult = DepartmentUpsertSchema.partial().safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("departments")
      .update({
        ...parseResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("A department with this name or slug already exists.", 409, "DUPLICATE");
      }
      return errorResponse("Failed to update department.", 500, "DB_ERROR");
    }

    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getAdminClient();
    const { id } = await params;

    // Soft deactivate instead of destructive delete to protect complaint history
    const { data, error } = await supabase
      .from("departments")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return errorResponse("Failed to deactivate department.", 500, "DB_ERROR");
    }

    return successResponse({ id, is_active: false });
  } catch (err) {
    return handleRouteError(err);
  }
}
