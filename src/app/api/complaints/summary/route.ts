/**
 * src/app/api/complaints/summary/route.ts
 *
 * PRD-04 :: API — GET /api/complaints/summary
 * Live operational summary counts for the Officer Dashboard.
 *
 * Every single number is calculated from real DB queries scoped strictly
 * to the authenticated user's department/role. No hardcoded or fake numbers.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import type { DashboardSummary } from "@/types/database";

export async function GET(_request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user, profile } = auth;
    const supabase = await createSupabaseServerClient();

    let deptIds: string[] = [];
    if (profile.role === "officer" || profile.role === "reviewer") {
      deptIds = await getUserDepartmentIds(user.id);
      if (deptIds.length === 0) {
        // Officer belongs to no department yet
        const emptySummary: DashboardSummary = {
          total: 0,
          submitted: 0,
          needs_review: 0,
          assigned: 0,
          in_progress: 0,
          resolved: 0,
          high_critical: 0,
          my_assigned: 0,
        };
        return successResponse(emptySummary);
      }
    }

    // Helper to build scoped query
    const buildScopedQuery = () => {
      let q = supabase.from("complaints").select("id", { count: "exact", head: true });
      if (profile.role === "citizen") {
        q = q.eq("user_id", user.id);
      } else if (profile.role === "officer" || profile.role === "reviewer") {
        q = q.in("department_id", deptIds);
      }
      return q;
    };

    const [
      totalRes,
      submittedRes,
      needsReviewRes,
      assignedRes,
      inProgressRes,
      resolvedRes,
      highCriticalRes,
      myAssignedRes,
    ] = await Promise.all([
      buildScopedQuery(),
      buildScopedQuery().eq("status", "submitted"),
      buildScopedQuery().or("status.eq.needs_review,needs_human_review.eq.true"),
      buildScopedQuery().eq("status", "assigned"),
      buildScopedQuery().eq("status", "in_progress"),
      buildScopedQuery().eq("status", "resolved"),
      buildScopedQuery().in("priority_band", ["high", "critical"]),
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("assigned_officer_id", user.id)
        .not("status", "in", '("resolved","closed","rejected")'),
    ]);

    const summary: DashboardSummary = {
      total: totalRes.count ?? 0,
      submitted: submittedRes.count ?? 0,
      needs_review: needsReviewRes.count ?? 0,
      assigned: assignedRes.count ?? 0,
      in_progress: inProgressRes.count ?? 0,
      resolved: resolvedRes.count ?? 0,
      high_critical: highCriticalRes.count ?? 0,
      my_assigned: myAssignedRes.count ?? 0,
    };

    return successResponse(summary);
  } catch (err) {
    return handleRouteError(err);
  }
}
