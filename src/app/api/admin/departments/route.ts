/**
 * src/app/api/admin/departments/route.ts
 *
 * PRD-04 :: API — GET /api/admin/departments — list all departments (admin only)
 *                  POST /api/admin/departments — create a department (admin only)
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { DepartmentUpsertSchema } from "@/lib/validation/api-schemas";

export async function GET(_request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (auth.profile.role !== "admin") {
      return errorResponse("Admin access required.", 403, "FORBIDDEN");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("departments")
      .select("*, member_count:department_members(count)")
      .order("name", { ascending: true });

    if (error) {
      return errorResponse("Failed to fetch departments.", 500, "DB_ERROR");
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
    const parseResult = DepartmentUpsertSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const input = parseResult.data;
    const supabase = await createSupabaseServerClient();

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
      if (error.code === "23505") {
        return errorResponse("A department with this name or slug already exists.", 409, "DUPLICATE");
      }
      return errorResponse("Failed to create department.", 500, "DB_ERROR");
    }

    // Audit the creation
    console.info(`[CivicPulse Admin] Department created: ${input.name} by user ${auth.user.id}`);

    return successResponse(data, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
