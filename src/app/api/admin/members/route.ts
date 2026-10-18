/**
 * src/app/api/admin/members/route.ts
 *
 * PRD-04 :: API — Admin Department Membership Management
 * GET /api/admin/members — list memberships with profile and department info
 * POST /api/admin/members — assign a user to a department
 * DELETE /api/admin/members — revoke a membership (soft revoke via is_active = false)
 *
 * Strict server-side permission checks (admin only) and audit logging.
 * Membership revocation takes effect immediately on subsequent access checks.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import {
  MembershipAddSchema,
  MembershipRevokeSchema,
} from "@/lib/validation/api-schemas";

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (auth.profile.role !== "admin") {
      return errorResponse("Admin access required.", 403, "FORBIDDEN");
    }

    const { searchParams } = request.nextUrl;
    const departmentId = searchParams.get("department_id");

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("department_members")
      .select(
        `
        id, user_id, department_id, role, is_active, joined_at, left_at,
        profile:profiles!user_id(id, full_name, phone, role),
        department:departments!department_id(id, name, slug)
        `
      )
      .order("joined_at", { ascending: false });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CivicPulse Admin] Fetch members error:", error.message);
      return errorResponse("Failed to fetch department members.", 500, "DB_ERROR");
    }

    return successResponse(data ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (auth.profile.role !== "admin") {
      return errorResponse("Admin access required.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = MembershipAddSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { user_id, department_id, role } = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Verify department exists and is active
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id, name, is_active")
      .eq("id", department_id)
      .single();

    if (deptError || !dept || !dept.is_active) {
      return errorResponse("Department does not exist or is inactive.", 422, "INVALID_DEPARTMENT");
    }

    // Insert or reactivate membership
    const { data, error } = await supabase
      .from("department_members")
      .upsert(
        {
          user_id,
          department_id,
          role,
          is_active: true,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        { onConflict: "user_id,department_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[CivicPulse Admin] Add membership error:", error.message);
      return errorResponse("Failed to assign department membership.", 500, "DB_ERROR");
    }

    // Also sync the profile role if user was a citizen
    await supabase
      .from("profiles")
      .update({
        role: role === "reviewer" ? "reviewer" : "officer",
        department_id,
      })
      .eq("user_id", user_id);

    console.info(
      `[CivicPulse Admin] Membership added: User ${user_id} -> Dept ${department_id} (${role}) by Admin ${auth.user.id}`
    );

    return successResponse(data, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (auth.profile.role !== "admin") {
      return errorResponse("Admin access required.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = MembershipRevokeSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { membership_id } = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Soft revoke to maintain auditability
    const { data, error } = await supabase
      .from("department_members")
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq("id", membership_id)
      .select()
      .single();

    if (error || !data) {
      console.error("[CivicPulse Admin] Revoke membership error:", error?.message);
      return errorResponse("Failed to revoke membership.", 500, "DB_ERROR");
    }

    console.info(
      `[CivicPulse Admin] Membership revoked: ID ${membership_id} by Admin ${auth.user.id}`
    );

    return successResponse({ membership_id, revoked: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
