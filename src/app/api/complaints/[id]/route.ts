/**
 * src/app/api/complaints/[id]/route.ts
 *
 * PRD-01 :: Tracking and Detail API Route.
 * Fetches citizen-safe details for a complaint by trackingId or internal ID.
 * Strict data minimization: no officer internal notes or sensitive data exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { complaintStore } from "@/lib/storage/mock-db";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_LABELS, type PublicTrackingResponse } from "@/types/complaint";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queryId = params.id.trim();

    // Look up by tracking ID or internal ID
    let record = complaintStore.get(queryId);
    if (!record) {
      record = complaintStore.getById(queryId);
    }

    if (!record) {
      return NextResponse.json(
        { error: "Complaint not found for the provided identifier.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const catObj = COMPLAINT_CATEGORIES.find((c) => c.id === record?.category);
    const categoryLabel = catObj ? catObj.label : record.category;

    // Build strictly sanitized citizen-safe response (§14.3)
    const publicData: PublicTrackingResponse = {
      trackingId: record.trackingId,
      status: record.status,
      statusLabel: COMPLAINT_STATUS_LABELS[record.status] || record.status,
      category: record.category,
      categoryLabel,
      department: record.department,
      summary: record.aiSummary || record.description.slice(0, 200),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      needsHumanReview: record.needsHumanReview,
      history: record.history,
    };

    return NextResponse.json(publicData);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to retrieve complaint tracking data.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
