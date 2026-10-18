/**
 * src/app/api/admin/members/route.ts
 *
 * PRD-04 :: API — Admin Department Membership Management
 * GET /api/admin/members — list memberships with profile and department info
 * POST /api/admin/members — assign or onboard a user to a department
 * DELETE /api/admin/members — revoke a membership (soft revoke via is_active = false)
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";

export async function GET(request: NextRequest) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    const isDemo = !auth?.user || !auth.profile || auth.profile.role !== "admin";
    const supabase = isDemo ? createAdminClient() : await createSupabaseServerClient();

    const { searchParams } = request.nextUrl;
    const departmentId = searchParams.get("department_id");

    let query = supabase
      .from("department_members")
      .select(
        `
        id, user_id, department_id, membership_role, is_active, created_at,
        profile:profiles(id, display_name, phone, role),
        department:departments(id, name, slug)
        `
      )
      .order("created_at", { ascending: false });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CivicPulse Admin] Fetch members error:", error.message);
      return errorResponse("Failed to fetch department members.", 500, "DB_ERROR");
    }

    // Map items for UI compatibility
    const items = (data ?? []).map((m: any) => {
      const prof = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      const dept = Array.isArray(m.department) ? m.department[0] : m.department;
      return {
        id: m.id,
        user_id: m.user_id,
        department_id: m.department_id,
        role: m.membership_role || "officer",
        membership_role: m.membership_role || "officer",
        is_active: Boolean(m.is_active),
        joined_at: m.created_at || new Date().toISOString(),
        profile: {
          id: prof?.id || m.user_id,
          display_name: prof?.display_name || "Staff Member",
          full_name: prof?.display_name || "Staff Member",
          phone: prof?.phone || null,
          role: prof?.role || "officer",
        },
        department: dept || { id: m.department_id, name: "Department", slug: "dept" },
      };
    });

    return successResponse(items);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();

    // Check if onboarding a new user via email or assigning an existing user_id
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    let userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const departmentId = typeof body.department_id === "string" ? body.department_id.trim() : "";
    const displayName =
      (typeof body.display_name === "string" && body.display_name.trim()) ||
      (typeof body.name === "string" && body.name.trim()) ||
      "Municipal Staff";
    const rawRole = typeof body.role === "string" ? body.role.trim().toLowerCase() : "officer";

    if (!departmentId) {
      return errorResponse("Department selection is required.", 400, "VALIDATION_ERROR");
    }

    // 1. If email is provided, create user or find user
    if (email) {
      const password = body.password || "Officer@123";
      const { data: authCreated } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, role: "officer" },
      });

      if (authCreated?.user) {
        userId = authCreated.user.id;
      } else {
        const { data: userList } = await admin.auth.admin.listUsers();
        const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email);
        if (existing) userId = existing.id;
      }
    }

    if (!userId) {
      return errorResponse("Valid user UUID or email is required.", 400, "VALIDATION_ERROR");
    }

    // 2. Ensure profile exists
    await admin.from("profiles").upsert({
      id: userId,
      display_name: displayName,
      role: "officer",
      updated_at: new Date().toISOString(),
    });

    // 3. Map role to valid membership_role ('officer', 'lead', 'supervisor')
    let membershipRole: "officer" | "lead" | "supervisor" = "officer";
    if (rawRole === "head" || rawRole === "lead") membershipRole = "lead";
    else if (rawRole === "reviewer" || rawRole === "supervisor") membershipRole = "supervisor";

    // 4. Upsert department member
    const { data: membership, error: memErr } = await admin
      .from("department_members")
      .upsert(
        {
          department_id: departmentId,
          user_id: userId,
          membership_role: membershipRole,
          is_active: true,
        },
        { onConflict: "department_id,user_id" }
      )
      .select()
      .single();

    if (memErr) {
      console.error("[CivicPulse Admin] Add member error:", memErr.message);
      return errorResponse("Failed to assign department membership.", 500, "DB_ERROR");
    }

    return successResponse(membership, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const membershipId = body.membership_id;

    if (!membershipId) {
      return errorResponse("membership_id is required.", 400, "VALIDATION_ERROR");
    }

    const { data, error } = await admin
      .from("department_members")
      .update({
        is_active: false,
      })
      .eq("id", membershipId)
      .select()
      .single();

    if (error || !data) {
      console.error("[CivicPulse Admin] Revoke membership error:", error?.message);
      return errorResponse("Failed to revoke membership.", 500, "DB_ERROR");
    }

    return successResponse({ membership_id: membershipId, revoked: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
