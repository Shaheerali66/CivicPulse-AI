/**
 * src/app/api/departments/route.ts
 *
 * PRD-04 :: API — GET /api/departments
 * Returns list of departments accessible to the current user.
 * Active departments returned for all authenticated users.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, slug, description, is_active, created_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[CivicPulse API] departments GET error:", error.message);
      return errorResponse("Failed to fetch departments.", 500, "DB_ERROR");
    }

    return successResponse(data ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}
