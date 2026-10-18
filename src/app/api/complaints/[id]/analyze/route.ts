/**
 * src/app/api/complaints/[id]/analyze/route.ts
 *
 * PRD-04 :: API — POST /api/complaints/[id]/analyze
 * Retry or trigger AI analysis for a specific complaint.
 * Authorized officers/admins can use this to re-run analysis.
 * The complaint is NEVER deleted if AI fails.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";
import { analyzeComplaint } from "@/lib/ai/analyze-complaint";
import { resolveDepartmentFromAnalysis } from "@/lib/routing/department-mapping";
import { calculatePriorityScore } from "@/lib/priority/scoring";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user, profile } = auth;
    const { id } = await params;

    // Only staff can trigger re-analysis
    if (profile.role === "citizen") {
      return errorResponse("Insufficient permissions.", 403, "FORBIDDEN");
    }

    const supabase = await createSupabaseServerClient();

    // Fetch the complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, description, status")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Run AI analysis
    const aiResult = await analyzeComplaint({
      text: complaint.description,
      timeoutMs: 25_000,
    });

    const analysis = aiResult.analysis;

    // Calculate priority
    const priorityResult = calculatePriorityScore({
      severity: analysis.severity,
      safetyConcern: analysis.safetyConcern,
      relatedCount: 0,
      submittedAt: new Date().toISOString(),
    });

    // Resolve department
    const departmentName = resolveDepartmentFromAnalysis({
      category: analysis.category,
      needsHumanReview: analysis.needsHumanReview,
    });

    const { data: dept } = await supabase
      .from("departments")
      .select("id")
      .eq("name", departmentName)
      .eq("is_active", true)
      .single();

    // Update complaint
    await supabase
      .from("complaints")
      .update({
        category: analysis.category,
        status: analysis.needsHumanReview ? "needs_review" : "analyzing",
        priority_score: priorityResult.score,
        priority_band: priorityResult.band,
        department_id: dept?.id ?? null,
        ai_analysis: {
          category: analysis.category,
          summary: analysis.summary,
          severity: analysis.severity,
          confidence: analysis.confidence,
          suggested_department_category: analysis.suggestedDepartmentCategory,
          safety_concern: analysis.safetyConcern,
          needs_human_review: analysis.needsHumanReview,
          reasoning: analysis.reasoning,
        },
        ai_from_model: aiResult.fromAI,
        ai_processed_at: new Date().toISOString(),
        needs_human_review: analysis.needsHumanReview,
        safety_concern: analysis.safetyConcern,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Record event
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: user.id,
      event_type: "ai_analyzed",
      metadata: {
        triggered_by: "manual",
        from_ai: aiResult.fromAI,
        category: analysis.category,
        confidence: analysis.confidence,
      },
    });

    return successResponse({
      fromAI: aiResult.fromAI,
      category: analysis.category,
      priority_band: priorityResult.band,
      needs_review: analysis.needsHumanReview,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
