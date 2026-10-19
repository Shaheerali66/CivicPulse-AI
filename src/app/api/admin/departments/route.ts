/**
 * src/app/api/admin/departments/route.ts
 *
 * PRD-04 :: API — GET /api/admin/departments — list all departments with active status and complaint counts (admin)
 *                  POST /api/admin/departments — create a department (admin)
 * Uses SUPABASE_SERVICE_ROLE_KEY to reliably query departments and calculate in-progress complaints.
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

export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Fetch all departments with member count
    const { data: deptList, error: deptErr } = await supabase
      .from("departments")
      .select("*, member_count:department_members(count)")
      .order("name", { ascending: true });

    if (deptErr) {
      console.error("[CivicPulse Admin] Fetch departments error:", deptErr.message);
      return errorResponse("Failed to fetch departments.", 500, "DB_ERROR");
    }

    // 2. Fetch active/in-progress complaints to aggregate by department
    const { data: activeComplaints } = await supabase
      .from("complaints")
      .select("id, department_id, status")
      .in("status", ["submitted", "needs_review", "analyzing", "assigned", "in_progress"]);

    const inProgressMap: Record<string, number> = {};
    if (activeComplaints) {
      for (const comp of activeComplaints) {
        if (comp.department_id) {
          inProgressMap[comp.department_id] = (inProgressMap[comp.department_id] || 0) + 1;
        }
      }
    }

    // 3. Format clean JSON response
    const departments = (deptList ?? []).map((dept: any) => {
      const staffCount = Array.isArray(dept.member_count)
        ? dept.member_count[0]?.count ?? 0
        : typeof dept.member_count === "number"
        ? dept.member_count
        : 0;

      const inProgressCount = inProgressMap[dept.id] ?? 0;

      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        code: dept.slug,
        description: dept.description || "",
        is_active: dept.is_active ?? true,
        status: dept.is_active ? "Active" : "Inactive",
        in_progress_complaints: inProgressCount,
        active_complaints_count: inProgressCount,
        staff_count: staffCount,
        member_count: staffCount,
        created_at: dept.created_at,
        updated_at: dept.updated_at,
      };
    });

    return successResponse(departments);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
