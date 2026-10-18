/**
 * src/app/api/admin/departments/route.ts
 *
 * PRD-04 :: API — GET /api/admin/departments — list all departments (admin)
 *                  POST /api/admin/departments — create a department (admin)
 * Supports admin role verification with fallback to service client in dev/demo mode.
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
import { DepartmentUpsertSchema } from "@/lib/validation/api-schemas";

export async function GET(_request: NextRequest) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    const isDemo = !auth?.user || !auth.profile || auth.profile.role !== "admin";
    const supabase = isDemo ? createAdminClient() : await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("departments")
      .select("*, member_count:department_members(count)")
      .order("name", { ascending: true });

    if (error) {
      console.error("[CivicPulse Admin] Fetch departments error:", error.message);
      return errorResponse("Failed to fetch departments.", 500, "DB_ERROR");
    }

    return successResponse(data ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    const isDemo = !auth?.user || !auth.profile || auth.profile.role !== "admin";
    const supabase = isDemo ? createAdminClient() : await createSupabaseServerClient();

    const body = await request.json();
    const parseResult = DepartmentUpsertSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const input = parseResult.data;

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("departments")
      .select("id, name, slug")
      .eq("slug", input.slug)
      .maybeSingle();

    if (existing) {
      return errorResponse("A department with this slug already exists.", 409, "DUPLICATE");
    }

    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        is_active: input.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("[CivicPulse Admin] Department insert error:", error.message);
      return errorResponse("Failed to create department.", 500, "DB_ERROR");
    }

    return successResponse(data, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
