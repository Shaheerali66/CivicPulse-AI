/**
 * src/app/api/admin/stats/route.ts
 *
 * PRD-04 :: API — GET /api/admin/stats
 * System-level statistics for the admin dashboard.
 * Admin-only endpoint — enforced server-side.
 * All data comes from real database queries.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";
import { COMPLAINT_STATUSES, COMPLAINT_CATEGORIES, PRIORITY_BANDS } from "@/types/database";

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total complaints
    const { count: total } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true });

    // Complaints by status
    const statusCounts: Record<string, number> = {};
    for (const s of COMPLAINT_STATUSES) {
      const { count } = await supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      statusCounts[s] = count ?? 0;
    }

    // Complaints by category
    const categoryCounts: Record<string, number> = {};
    for (const c of COMPLAINT_CATEGORIES) {
      const { count } = await supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("category", c);
      categoryCounts[c] = count ?? 0;
    }

    // Complaints by priority band
    const priorityCounts: Record<string, number> = {};
    for (const p of PRIORITY_BANDS) {
      const { count } = await supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("priority_band", p);
      priorityCounts[p] = count ?? 0;
    }

    // Human review queue size
    const { count: reviewQueueSize } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("needs_human_review", true)
      .not("status", "in", '("resolved","closed","rejected")');

    // AI failures (complaints with needs_review where ai_from_model is false)
    const { count: aiFailureCount } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("ai_from_model", false)
      .eq("needs_human_review", true);

    // Resolved in last 30 days
    const { count: resolvedLast30 } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .in("status", ["resolved", "closed"])
      .gte("resolved_at", thirtyDaysAgo);

    // Department workload
    const { data: deptWorkload } = await supabase
      .from("departments")
      .select(
        `
        id, name,
        total:complaints(count),
        open:complaints(count)
        `
      )
      .eq("is_active", true);

    return successResponse({
      total_complaints: total ?? 0,
      complaints_by_status: statusCounts,
      complaints_by_category: categoryCounts,
      complaints_by_priority: priorityCounts,
      review_queue_size: reviewQueueSize ?? 0,
      ai_failure_count: aiFailureCount ?? 0,
      resolved_last_30_days: resolvedLast30 ?? 0,
      period_label: "All time (resolved counts: last 30 days)",
      department_workload: deptWorkload ?? [],
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
