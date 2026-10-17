/**
 * src/app/api/complaints/route.ts
 *
 * PRD-01 & PRD-03 :: Complaints API Route Handler.
 * Supports:
 *   - POST /api/complaints : Submit a new complaint (AI-assisted or manual)
 *   - GET /api/complaints : List authorized complaints for current session
 *
 * Comments in Roman Urdu / Roman English per project rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeComplaint } from "@/lib/ai/analyze-complaint";
import {
  resolveDepartmentFromAnalysis,
  getDepartmentForCategory,
  type Department,
} from "@/lib/routing/department-mapping";
import { complaintStore } from "@/lib/storage/mock-db";
import type {
  CitizenComplaintRecord,
  ComplaintStatus,
  SubmitComplaintResponse,
} from "@/types/complaint";
import { ComplaintCategoryEnum, type ComplaintCategory, type Severity } from "@/lib/ai/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      description,
      reportingMode,
      category: manualCategory,
      imageBase64,
      imageMimeType,
      location,
      contactEmail,
    } = body;

    // 1. Validation check
    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Description must be at least 10 characters long.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: "Description must not exceed 2000 characters.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    let finalCategory: ComplaintCategory = (manualCategory as ComplaintCategory) || "unknown";
    let finalDepartment: Department = "Municipal Services / Human Review";
    let finalSummary = description.slice(0, 150);
    let severity: Severity = "medium";
    let needsHumanReview = false;
    let initialStatus: ComplaintStatus = "submitted";

    // 2. Handle AI-assisted vs Manual Mode
    if (reportingMode === "ai_assisted") {
      initialStatus = "analyzing";
      try {
        const aiResult = await analyzeComplaint({
          text: description,
          imageBase64,
          imageMimeType,
        });

        finalCategory = aiResult.analysis.category;
        finalSummary = aiResult.analysis.summary;
        severity = aiResult.analysis.severity;
        needsHumanReview = aiResult.analysis.needsHumanReview;

        finalDepartment = resolveDepartmentFromAnalysis({
          category: finalCategory,
          needsHumanReview,
        });

        initialStatus = needsHumanReview ? "needs_review" : "submitted";
      } catch (aiErr) {
        console.warn("[CivicPulse API] AI triage degraded, applying deterministic fallback", aiErr);
        finalCategory = "unknown";
        finalDepartment = "Municipal Services / Human Review";
        needsHumanReview = true;
        initialStatus = "needs_review";
      }
    } else {
      // Manual reporting path - completely independent of AI availability
      const parsedCat = ComplaintCategoryEnum.safeParse(manualCategory);
      if (!parsedCat.success) {
        return NextResponse.json(
          { error: "Valid category is required for manual reporting.", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }
      finalCategory = parsedCat.data;
      finalDepartment = getDepartmentForCategory(finalCategory);
      needsHumanReview = finalCategory === "unknown" || finalCategory === "other";
      initialStatus = needsHumanReview ? "needs_review" : "submitted";
    }

    // 3. Generate authoritative server tracking ID
    const trackingId = complaintStore.generateTrackingId();
    const complaintId = `cp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: CitizenComplaintRecord = {
      id: complaintId,
      trackingId,
      userId: "demo-user-1", // In demo mode, scoped to active user
      description: description.trim(),
      category: finalCategory,
      department: finalDepartment,
      severity,
      status: initialStatus,
      reportingMode,
      location: location || null,
      aiSummary: finalSummary,
      aiSuggestedDepartment: finalDepartment,
      needsHumanReview,
      history: [
        {
          status: "submitted",
          label: "Complaint Submitted",
          timestamp: nowIso,
          notes: "Complaint successfully received and assigned tracking ID.",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 4. Commit to storage
    complaintStore.save(record);

    const responsePayload: SubmitComplaintResponse = {
      success: true,
      trackingId,
      complaintId,
      status: initialStatus,
      category: finalCategory,
      department: finalDepartment,
      aiSummary: finalSummary,
      needsHumanReview,
      createdAt: nowIso,
    };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error("[CivicPulse API] Complaint submission failed:", error);
    return NextResponse.json(
      { error: "Unable to record complaint at this time.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Return authorized complaints for the current user
    const records = complaintStore.listForUser("demo-user-1");
    return NextResponse.json({ complaints: records });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch complaints", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
