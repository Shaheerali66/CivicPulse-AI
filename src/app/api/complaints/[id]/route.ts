/**
 * src/app/api/complaints/[id]/route.ts
 *
 * PRD-04 :: API — GET /api/complaints/[id]
 *
 * Supports BOTH:
 * 1. Public Tracking Lookup: Anyone with a tracking ID (e.g. CP-20261018-XXXX)
 *    can view official public status without requiring authentication.
 * 2. Officer / Admin Operational Lookup: Provides full detail relations, events,
 *    and AI analysis for DetailModal and staff workflow.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { errorResponse, handleRouteError } from "@/lib/api/error-response";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_LABELS, type ComplaintStatus } from "@/types/complaint";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const queryId = decodeURIComponent(rawId || "").trim();

    if (!queryId) {
      return errorResponse("Tracking ID or Complaint ID is required.", 400, "BAD_REQUEST");
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);

    // Optional user session (non-blocking for public tracking)
    let authUser = null;
    let authProfile = null;
    try {
      const auth = await getCurrentUserWithProfile();
      authUser = auth?.user ?? null;
      authProfile = auth?.profile ?? null;
    } catch {
      // Unauthenticated access is allowed for tracking
      authUser = null;
      authProfile = null;
    }

    // Always use admin client for resilient public status lookup
    const admin = createAdminClient();

    // Query complaint record
    let query = admin
      .from("complaints")
      .select(
        `
        id, tracking_id, citizen_id, title, description, category,
        status, priority, submission_method, department_id,
        assigned_to, latitude, longitude, location_label, photo_path,
        is_public, submitted_at, updated_at, resolved_at, closed_at,
        department:departments(id, name, slug)
        `
      );

    if (isUuid) {
      query = query.eq("id", queryId);
    } else {
      query = query.eq("tracking_id", queryId);
    }

    const { data: complaint, error: fetchErr } = await query.maybeSingle();

    if (fetchErr) {
      console.error("[CivicPulse API] Complaint query error:", fetchErr.message);
      return errorResponse("Failed to query complaint record.", 500, "DB_ERROR");
    }

    if (!complaint) {
      return errorResponse(
        `No complaint found with identifier "${queryId}". Please verify your Tracking ID.`,
        404,
        "NOT_FOUND"
      );
    }

    // Load AI analysis record if available
    const { data: aiRecord } = await admin
      .from("ai_analyses")
      .select("*")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load timeline events
    const { data: events } = await admin
      .from("complaint_events")
      .select("id, complaint_id, actor_id, event_type, previous_value, new_value, note, created_at")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true });

    // Load assigned officer profile if assigned
    let assignedOfficer: { id: string; display_name: string | null; full_name?: string | null; role?: string } | null = null;
    if (complaint.assigned_to) {
      const { data: officer } = await admin
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", complaint.assigned_to)
        .maybeSingle();
      if (officer) {
        assignedOfficer = {
          id: officer.id,
          display_name: officer.display_name,
          full_name: officer.display_name,
          role: officer.role,
        };
      }
    }

    // Resolve department representation
    const deptObj = Array.isArray(complaint.department)
      ? complaint.department[0]
      : complaint.department;
    const departmentName = deptObj?.name || "Municipal Services";

    // Category label
    const catEntry = COMPLAINT_CATEGORIES.find((c) => c.id === complaint.category);
    const categoryLabel = catEntry ? catEntry.label : complaint.category || "General";

    // AI summary
    const summaryText =
      aiRecord?.summary ||
      complaint.title ||
      complaint.description.slice(0, 140);

    // Formatted history for PublicTrackingResponse
    const historyList = (events ?? []).map((ev: any) => ({
      status: (ev.new_value?.status as ComplaintStatus) || (complaint.status as ComplaintStatus),
      label: formatEventLabel(ev.event_type),
      timestamp: ev.created_at,
      notes: ev.note || (ev.new_value?.notes as string) || undefined,
    }));

    // If no events exist yet, provide default initial submission event
    if (historyList.length === 0) {
      historyList.push({
        status: (complaint.status as ComplaintStatus) || "submitted",
        label: "Complaint Submitted & Recorded",
        timestamp: complaint.submitted_at || new Date().toISOString(),
        notes: "Received into CivicPulse AI intake queue.",
      });
    }

    // Full relation object for DetailModal
    const fullDetail = {
      id: complaint.id,
      tracking_id: complaint.tracking_id,
      trackingId: complaint.tracking_id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      categoryLabel,
      status: complaint.status as ComplaintStatus,
      priority: complaint.priority,
      priority_band: complaint.priority,
      priority_score: aiRecord?.confidence ? Math.round(aiRecord.confidence * 100) : 50,
      submission_method: complaint.submission_method,
      department_id: complaint.department_id,
      department: deptObj || { id: complaint.department_id || "dept", name: departmentName, slug: "dept" },
      assigned_to: complaint.assigned_to,
      assigned_officer: assignedOfficer,
      submitter: null,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      location_label: complaint.location_label,
      photo_path: complaint.photo_path,
      photo_url: complaint.photo_path?.startsWith("http") ? complaint.photo_path : null,
      is_public: complaint.is_public,
      submitted_at: complaint.submitted_at,
      created_at: complaint.submitted_at,
      updated_at: complaint.updated_at,
      resolved_at: complaint.resolved_at,
      closed_at: complaint.closed_at,
      ai_analysis: aiRecord
        ? {
            category: aiRecord.category,
            summary: aiRecord.summary,
            severity: aiRecord.severity,
            confidence: Number(aiRecord.confidence) || 0.8,
            suggested_department_category: aiRecord.suggested_department_category || departmentName,
            safety_concern: Boolean(aiRecord.safety_concern),
            needs_human_review: Boolean(aiRecord.needs_human_review),
            reasoning: aiRecord.reasoning_summary || "",
          }
        : null,
      safety_concern: Boolean(aiRecord?.safety_concern),
      needs_human_review: Boolean(aiRecord?.needs_human_review),
      events: events ?? [],
      duplicate_candidates: [],
    };

    // Response satisfies BOTH PublicTrackingResponse (flat) AND ApiResponse (nested under data)
    return NextResponse.json(
      {
        success: true,
        trackingId: complaint.tracking_id,
        status: complaint.status as ComplaintStatus,
        statusLabel: COMPLAINT_STATUS_LABELS[complaint.status as ComplaintStatus] || complaint.status,
        category: complaint.category,
        categoryLabel,
        department: departmentName,
        summary: summaryText,
        createdAt: complaint.submitted_at,
        updatedAt: complaint.updated_at,
        needsHumanReview: Boolean(aiRecord?.needs_human_review),
        history: historyList,
        data: fullDetail,
      },
      { status: 200 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const queryId = decodeURIComponent(rawId || "").trim();

    if (!queryId) {
      return errorResponse("Tracking ID or Complaint ID is required.", 400, "BAD_REQUEST");
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);

    let authUser = null;
    try {
      const auth = await getCurrentUserWithProfile();
      authUser = auth?.user ?? null;
    } catch {
      authUser = null;
    }

    const admin = createAdminClient();

    // 1. Fetch current complaint
    let query = admin
      .from("complaints")
      .select("id, tracking_id, status, department_id, priority, category, assigned_to");

    if (isUuid) {
      query = query.eq("id", queryId);
    } else {
      query = query.eq("tracking_id", queryId);
    }

    const { data: complaint, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !complaint) {
      return errorResponse(`Complaint "${queryId}" not found.`, 404, "NOT_FOUND");
    }

    const body = await request.json();
    const newStatus = body.status ? String(body.status).toLowerCase().trim() : undefined;
    const newDeptId = body.department_id ? String(body.department_id).trim() : undefined;
    const newAssignedTo = body.assigned_to || body.officer_id || undefined;
    const newPriority = body.priority ? String(body.priority).toLowerCase().trim() : undefined;
    const newCategory = body.category ? String(body.category).trim() : undefined;
    const noteText = body.note || body.notes || body.resolution_notes || null;

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updated_at: now,
    };

    if (newStatus) {
      updatePayload.status = newStatus;
      if (newStatus === "resolved") {
        updatePayload.resolved_at = now;
      } else if (newStatus === "closed") {
        updatePayload.closed_at = now;
      }
    }

    if (newDeptId) updatePayload.department_id = newDeptId;
    if (newAssignedTo) updatePayload.assigned_to = newAssignedTo;
    if (newPriority) updatePayload.priority = newPriority;
    if (newCategory) updatePayload.category = newCategory;

    // 2. Persist updates to public.complaints
    const { data: updatedComplaint, error: updateErr } = await admin
      .from("complaints")
      .update(updatePayload)
      .eq("id", complaint.id)
      .select()
      .single();

    if (updateErr) {
      console.error("[CivicPulse API] Complaint PATCH update error:", updateErr.message);
      return errorResponse("Failed to update complaint.", 500, "DB_ERROR");
    }

    // 3. Record timeline event in public.complaint_events
    const eventType =
      newStatus === "resolved"
        ? "resolved"
        : newStatus === "closed"
        ? "closed"
        : newDeptId && !newStatus
        ? "assigned"
        : newAssignedTo && !newStatus
        ? "assigned"
        : "status_changed";

    await admin.from("complaint_events").insert({
      complaint_id: complaint.id,
      actor_id: authUser?.id ?? null,
      event_type: eventType,
      previous_value: {
        status: complaint.status,
        department_id: complaint.department_id,
        priority: complaint.priority,
      },
      new_value: {
        status: updatedComplaint.status,
        department_id: updatedComplaint.department_id,
        priority: updatedComplaint.priority,
      },
      note: noteText || `Complaint updated to ${updatedComplaint.status}`,
      created_at: now,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedComplaint,
        message: `Complaint ${complaint.tracking_id} successfully updated.`,
      },
      { status: 200 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

function formatEventLabel(eventType: string): string {
  switch (eventType) {
    case "created":
      return "Complaint Submitted";
    case "ai_analyzed":
      return "AI Triage Completed";
    case "status_changed":
      return "Status Updated";
    case "assigned":
      return "Officer Assigned";
    case "human_reviewed":
      return "Human Review Completed";
    case "resolved":
      return "Resolved by Field Department";
    case "closed":
      return "Case Closed";
    default:
      return eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
