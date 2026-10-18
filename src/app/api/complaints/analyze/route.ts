/**
 * src/app/api/complaints/analyze/route.ts
 *
 * PRD-03 / PRD-04 :: AI Analysis Endpoint — POST /api/complaints/analyze
 * Allows on-the-fly civic complaint analysis using Gemini AI.
 * Authentication is optional for triage preview or guest reporting.
 *
 * Resilience: ALWAYS returns a valid response — AI failure returns
 * fallback analysis (needsHumanReview=true), never a 500.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { successResponse, handleRouteError } from "@/lib/api/error-response";
import { analyzeComplaint } from "@/lib/ai/analyze-complaint";
import {
  resolveDepartmentFromAnalysis,
  resolveDepartmentSlugFromAnalysis,
} from "@/lib/routing/department-mapping";
import { calculatePriorityScore } from "@/lib/priority/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Auth is optional — triage preview works for anonymous users
    let isAuthenticated = false;
    try {
      const auth = await getCurrentUserWithProfile();
      isAuthenticated = !!auth?.user;
    } catch {
      // Auth failure is non-fatal here
    }

    // Parse body safely
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body.",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const text = ((body.text || body.description || "") as string).trim();
    const imageUrl = (body.imageUrl as string) || undefined;

    if (!text || text.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide a complaint description of at least 5 characters for analysis.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Run AI analysis — always returns a result (fallback on failure)
    let aiResult;
    try {
      aiResult = await analyzeComplaint({
        description: text,
        imageUrl,
        timeoutMs: 25_000,
      });
    } catch (aiErr) {
      console.error("[CivicPulse Analyze API] analyzeComplaint threw:", aiErr);
      // Return graceful degraded response
      return NextResponse.json({
        success: true,
        data: {
          analysis: {
            category: "unknown",
            summary: "Could not analyze complaint at this time.",
            severity: "medium",
            confidence: 0,
            suggestedDepartment: "Municipal Services",
            suggestedDepartmentCategory: "Municipal Services",
            safetyConcern: false,
            needsHumanReview: true,
            reasoning: "AI analysis is temporarily unavailable. A human officer will review your complaint.",
          },
          priority: { band: "medium", score: 0.25 },
          fromAI: false,
          authenticated: isAuthenticated,
          fallback: true,
        },
      });
    }

    const analysis = aiResult.analysis;

    // Calculate priority
    const priorityResult = calculatePriorityScore({
      severity: analysis.severity,
      safetyConcern: analysis.safetyConcern,
      relatedCount: 0,
      submittedAt: new Date().toISOString(),
    });

    // Resolve target municipal department
    let departmentName = resolveDepartmentFromAnalysis({
      category: analysis.category,
      needsHumanReview: analysis.needsHumanReview,
    });
    const targetSlug = resolveDepartmentSlugFromAnalysis(analysis.category);

    let departmentId: string | null = null;
    try {
      const admin = createAdminClient();
      let { data: dept } = await admin
        .from("departments")
        .select("id, name, slug")
        .eq("slug", targetSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (!dept) {
        const res = await admin
          .from("departments")
          .select("id, name, slug")
          .eq("name", departmentName)
          .eq("is_active", true)
          .maybeSingle();
        dept = res.data;
      }

      if (dept) {
        departmentId = dept.id;
        departmentName = dept.name;
      }
    } catch (e) {
      console.warn("[CivicPulse AI] Department lookup in analyze route:", e);
    }

    return successResponse({
      analysis: {
        category: analysis.category,
        summary: analysis.summary,
        severity: analysis.severity,
        confidence: analysis.confidence,
        suggestedDepartment: departmentName,
        suggestedDepartmentSlug: targetSlug,
        suggestedDepartmentId: departmentId,
        suggestedDepartmentCategory: analysis.suggestedDepartmentCategory,
        safetyConcern: analysis.safetyConcern,
        needsHumanReview: analysis.needsHumanReview,
        reasoning: analysis.reasoning,
      },
      priority: priorityResult,
      fromAI: aiResult.fromAI,
      authenticated: isAuthenticated,
      fallback: false,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
