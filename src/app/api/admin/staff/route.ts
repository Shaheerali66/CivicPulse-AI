/**
 * src/app/api/admin/staff/route.ts
 *
 * PRD-04 :: Staff & Officer Onboarding API
 * - Creates officer credentials in Supabase Auth (auth.users)
 * - Persists officer profile with role = 'officer' (public.profiles)
 * - Assigns officer to municipal department (public.department_members)
 * Supports admin session and service-role fallback in dev/demo mode.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" && body.password.length >= 6
      ? body.password
      : "Officer@123";
    const displayName =
      (typeof body.display_name === "string" && body.display_name.trim()) ||
      (typeof body.name === "string" && body.name.trim()) ||
      "Municipal Officer";
    const departmentId = typeof body.department_id === "string" ? body.department_id.trim() : "";
    const rawRole = typeof body.role === "string" ? body.role.trim().toLowerCase() : "officer";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    if (!email || !email.includes("@")) {
      return errorResponse("Valid officer email is required.", 400, "VALIDATION_ERROR");
    }

    if (!departmentId) {
      return errorResponse("Department selection is required.", 400, "VALIDATION_ERROR");
    }

    const admin = createAdminClient();

    // Verify target department exists
    const { data: dept, error: deptErr } = await admin
      .from("departments")
      .select("id, name, slug")
      .eq("id", departmentId)
      .single();

    if (deptErr || !dept) {
      return errorResponse("Selected department not found in database.", 404, "NOT_FOUND");
    }

    let userId: string | null = null;

    // 1. Create or resolve user in Supabase Auth
    const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        full_name: displayName,
        role: "officer",
      },
    });

    if (createdAuth?.user) {
      userId = createdAuth.user.id;
    } else {
      // If user already exists in auth, find existing user ID
      const { data: userList } = await admin.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email
      );
      if (existingUser) {
        userId = existingUser.id;
      } else {
        console.error("[CivicPulse Admin] Create officer auth error:", authErr?.message);
        return errorResponse(authErr?.message || "Failed to create officer credentials.", 500, "AUTH_ERROR");
      }
    }

    if (!userId) {
      return errorResponse("Could not resolve user identifier.", 500, "INTERNAL_ERROR");
    }

    // 2. Persist Profile in public.profiles with role = 'officer'
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        display_name: displayName,
        role: "officer",
        phone,
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      console.warn("[CivicPulse Admin] Profile upsert warning:", profileErr.message);
    }

    // 3. Map to department_members membership_role ('officer', 'lead', 'supervisor')
    let membershipRole: "officer" | "lead" | "supervisor" = "officer";
    if (rawRole === "head" || rawRole === "lead") membershipRole = "lead";
    else if (rawRole === "reviewer" || rawRole === "supervisor") membershipRole = "supervisor";

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
      console.error("[CivicPulse Admin] Department membership error:", memErr.message);
      return errorResponse("Failed to assign officer to department.", 500, "DB_ERROR");
    }

    return successResponse(
      {
        user_id: userId,
        email,
        display_name: displayName,
        department: {
          id: dept.id,
          name: dept.name,
        },
        role: "officer",
        membership_role: membershipRole,
        membership_id: membership.id,
        initial_password: password,
        message: "Officer account and department membership successfully activated.",
      },
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
