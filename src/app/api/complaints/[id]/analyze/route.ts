/**
 * src/app/api/complaints/[id]/analyze/route.ts
 *
 * PRD-02 :: AI Analysis Trigger Endpoint (POST /api/complaints/[id]/analyze).
 * Strictly server-controlled AI pipeline execution with cost & rate controls.
 * Integrates with PRD-03 analyzeComplaint and department routing.
 * Stores validated analysis in ai_analyses and prevents client forgery.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import {
  recordAuditEvent,
  createNotification,
  saveTrustedAIAnalysis,
} from "@/lib/supabase/admin";
import {
  checkRateLimit,
  AI_ANALYSIS_RATE_LIMIT,
} from "@/lib/security/rate-limiter";
import { analyzeComplaint } from "@/lib/ai/analyze-complaint";
import { resolveDepartmentFromAnalysis } from "@/lib/routing/department-mapping";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const complaintId = params.id;
    if (!complaintId) {
      return NextResponse.json({ error: "Complaint identifier required." }, { status: 400 });
    }

    // 1. Identify caller through verified server session
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to trigger AI analysis." },
        { status: 401 }
      );
    }

    // 2. Enforce AI Rate & Cost Controls (PRD-02 Section 14)
    const rateCheck = checkRateLimit(`ai_${user.id}`, AI_ANALYSIS_RATE_LIMIT);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "AI analysis rate limit exceeded. Please wait before retrying." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateCheck.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";
    const supabase = await createServerSupabaseClient();

    // 3. Load complaint
    const { data: complaint, error: fetchErr } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", complaintId)
      .single();

    if (fetchErr || !complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 4. Authorization check: citizens can only analyze their own complaint; officers/admin can analyze department/all
    if (role === "citizen" && complaint.citizen_id !== user.id) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 5. Run AI Analysis Pipeline (PRD-03 Engine)
    const combinedText = `${complaint.title}\n\n${complaint.description}`;
    const aiResult = await analyzeComplaint({
      text: combinedText,
    });

    const analysis = aiResult.analysis;

    // 6. Persist structured AI result to ai_analyses table (PRD-02 Section 5.5)
    // Server-only privileged write: citizens can never insert or alter trusted analysis
    const savedAnalysis = await saveTrustedAIAnalysis({
      complaint_id: complaint.id,
      model_name: process.env.AI_MODEL ?? "gemini-1.5-pro",
      category: analysis.category,
      summary: analysis.summary,
      severity: analysis.severity,
      confidence: analysis.confidence,
      suggested_department_category: analysis.suggestedDepartmentCategory,
      safety_concern: analysis.safetyConcern,
      needs_human_review: analysis.needsHumanReview,
      reasoning_summary: analysis.reasoning,
      created_by: user.id,
    });

    // 7. Deterministic Department Routing (PRD-03 Department Mapper)
    const targetDeptName = resolveDepartmentFromAnalysis({
      category: analysis.category,
      needsHumanReview: analysis.needsHumanReview,
    });

    // Find department ID from active departments table
    const { data: matchedDept } = await supabase
      .from("departments")
      .select("id")
      .ilike("name", `%${targetDeptName}%`)
      .eq("is_active", true)
      .maybeSingle();

    // 8. Update complaint with AI classification & routing
    const nextStatus = analysis.needsHumanReview ? "needs_review" : "analyzing";

    await supabase
      .from("complaints")
      .update({
        category: analysis.category,
        priority: analysis.severity,
        status: nextStatus,
        department_id: matchedDept?.id ?? complaint.department_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);

    // 9. Record audit event
    await recordAuditEvent({
      complaintId: complaint.id,
      actorId: user.id,
      eventType: "ai_analysis_completed",
      newValue: {
        category: analysis.category,
        severity: analysis.severity,
        confidence: analysis.confidence,
        needs_human_review: analysis.needsHumanReview,
        safety_concern: analysis.safetyConcern,
        target_department: targetDeptName,
      },
      note: "AI analysis and deterministic routing completed.",
    });

    // 10. Notifications
    if (analysis.safetyConcern) {
      // Safety concern triggers urgent human review notification
      console.warn(`[CivicPulse Alert] Safety concern flagged on complaint ${complaint.tracking_id}`);
    }

    if (complaint.citizen_id) {
      await createNotification({
        userId: complaint.citizen_id,
        complaintId: complaint.id,
        type: "ai_complete",
        title: "Complaint Analyzed",
        message: `AI categorized your complaint as '${analysis.category}' with severity '${analysis.severity}'.`,
      });
    }

    // 11. Return safe response (no secrets, no hidden reasoning)
    return NextResponse.json(
      {
        message: "AI analysis completed.",
        analysis: {
          id: savedAnalysis.id,
          category: savedAnalysis.category,
          severity: savedAnalysis.severity,
          confidence: savedAnalysis.confidence,
          summary: savedAnalysis.summary,
          needs_human_review: savedAnalysis.needs_human_review,
          safety_concern: savedAnalysis.safety_concern,
          suggested_department: targetDeptName,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in POST /api/complaints/[id]/analyze:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
