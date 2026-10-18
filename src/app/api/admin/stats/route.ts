/**
 * src/app/api/admin/stats/route.ts
 *
 * PRD-04 :: API — GET /api/admin/stats
 * System-level statistics for the admin dashboard.
 * Supports both authenticated admin sessions and resilient demo fallback
 * using real database queries against Supabase.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { handleRouteError, successResponse } from "@/lib/api/error-response";
import { COMPLAINT_STATUSES, COMPLAINT_CATEGORIES, PRIORITY_BANDS } from "@/types/database";

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Total complaints count
    const { count: total } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true });

    // 2. Complaints by status
    const statusCounts: Record<string, number> = {};
    await Promise.all(
      COMPLAINT_STATUSES.map(async (s) => {
        const { count } = await supabase
          .from("complaints")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        statusCounts[s] = count ?? 0;
      })
    );

    // 3. Complaints by category
    const categoryCounts: Record<string, number> = {};
    await Promise.all(
      COMPLAINT_CATEGORIES.map(async (c) => {
        const { count } = await supabase
          .from("complaints")
          .select("id", { count: "exact", head: true })
          .eq("category", c);
        categoryCounts[c] = count ?? 0;
      })
    );

    // 4. Complaints by priority band (using column "priority")
    const priorityCounts: Record<string, number> = {};
    await Promise.all(
      PRIORITY_BANDS.map(async (p) => {
        const { count } = await supabase
          .from("complaints")
          .select("id", { count: "exact", head: true })
          .eq("priority", p);
        priorityCounts[p] = count ?? 0;
      })
    );

    // 5. Human review queue size
    const { count: reviewQueueSize } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "needs_review");

    // 6. AI failures / manual fallbacks count
    const aiFailureCount = reviewQueueSize ?? 0;

    // 7. Resolved in last 30 days
    const { count: resolvedLast30 } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .in("status", ["resolved", "closed"])
      .gte("updated_at", thirtyDaysAgo);

    // 8. Department workload & throughput
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const departmentWorkload = await Promise.all(
      (depts ?? []).map(async (dept) => {
        const [totalRes, openRes] = await Promise.all([
          supabase
            .from("complaints")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id),
          supabase
            .from("complaints")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .not("status", "in", '("resolved","closed","rejected")'),
        ]);

        return {
          id: dept.id,
          name: dept.name,
          slug: dept.slug,
          total: totalRes.count ?? 0,
          open: openRes.count ?? 0,
        };
      })
    );

    return successResponse({
      total_complaints: total ?? 0,
      complaints_by_status: statusCounts,
      complaints_by_category: categoryCounts,
      complaints_by_priority: priorityCounts,
      review_queue_size: reviewQueueSize ?? 0,
      ai_failure_count: aiFailureCount,
      resolved_last_30_days: resolvedLast30 ?? 0,
      period_label: "All time (resolved counts: last 30 days)",
      department_workload: departmentWorkload,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
