import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUserWithProfile } from "@/lib/auth/session";

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
  request: Request | NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams || {};
    if (!id) {
      return NextResponse.json({ error: "Missing complaint ID" }, { status: 400 });
    }

    const cleanId = decodeURIComponent(id).trim();
    console.log("Looking up complaint with identifier:", cleanId);

    const supabase = getServiceSupabase();

    let data: any = null;

    // 1. Try exact match on 'id'
    let res = await supabase.from("complaints").select("*").eq("id", cleanId).maybeSingle();
    if (res.data) data = res.data;

    // 2. Try exact match on 'tracking_code'
    if (!data) {
      try {
        res = await supabase.from("complaints").select("*").eq("tracking_code", cleanId).maybeSingle();
        if (res.data) data = res.data;
      } catch {}
    }

    // 3. Try case-insensitive ilike on tracking_code
    if (!data) {
      try {
        res = await supabase.from("complaints").select("*").ilike("tracking_code", cleanId).maybeSingle();
        if (res.data) data = res.data;
      } catch {}
    }

    // 4. Try tracking_id
    if (!data) {
      try {
        res = await supabase.from("complaints").select("*").ilike("tracking_id", cleanId).maybeSingle();
        if (res.data) data = res.data;
      } catch {}
    }

    // 5. BULLETPROOF FALLBACK: Fetch recent complaints and match in memory (bypasses any column/casing mismatch)
    if (!data) {
      let allRes = await supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(300);
      if (!allRes.data) {
        allRes = await supabase.from("complaints").select("*").order("submitted_at", { ascending: false }).limit(300);
      }
      if (!allRes.data) {
        allRes = await supabase.from("complaints").select("*").limit(300);
      }
      if (allRes.data) {
        data = allRes.data.find(
          (item: any) =>
            String(item.id || "").toLowerCase() === cleanId.toLowerCase() ||
            String(item.tracking_code || "").toLowerCase() === cleanId.toLowerCase() ||
            String(item.tracking_id || "").toLowerCase() === cleanId.toLowerCase() ||
            String(item.ticket_number || "").toLowerCase() === cleanId.toLowerCase()
        );
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: `Complaint not found with identifier "${cleanId}"` },
        { status: 404 }
      );
    }

    // Ensure identifiers and helper properties are populated for UI
    const trackingCode = data.tracking_code || data.tracking_id || data.id || cleanId;
    data.tracking_code = trackingCode;
    data.tracking_id = trackingCode;
    data.trackingId = trackingCode;
    data.priority_band = data.priority_band || data.priority || "medium";
    data.priority_score = data.priority_score || 50;

    // Load AI analysis record if available
    let aiRecord = null;
    try {
      const { data: ai } = await supabase
        .from("ai_analyses")
        .select("*")
        .eq("complaint_id", data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      aiRecord = ai;
    } catch {}

    // Load timeline events
    let events: any[] = [];
    try {
      const { data: evList } = await supabase
        .from("complaint_events")
        .select("id, complaint_id, actor_id, event_type, previous_value, new_value, note, created_at")
        .eq("complaint_id", data.id)
        .order("created_at", { ascending: true });
      events = evList || [];
    } catch {}

    // Load department details if available
    let departmentName = "Municipal Services";
    let deptObj = data.department || null;
    if (data.department_id) {
      try {
        const { data: dept } = await supabase
          .from("departments")
          .select("id, name, slug")
          .eq("id", data.department_id)
          .maybeSingle();
        if (dept) {
          deptObj = dept;
          departmentName = dept.name;
        }
      } catch {}
    }

    // Attach enriched fields to data
    data.department = deptObj || { id: data.department_id || "dept", name: departmentName, slug: "dept" };
    data.events = events;
    data.duplicate_candidates = data.duplicate_candidates || [];
    data.ai_analysis = aiRecord
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
      : null;
    data.safety_concern = Boolean(aiRecord?.safety_concern || data.safety_concern);
    data.needs_human_review = Boolean(aiRecord?.needs_human_review || data.needs_human_review);

    return NextResponse.json(
      {
        success: true,
        complaint: data,
        data: data,
        trackingId: trackingCode,
        status: data.status,
        category: data.category,
        department: departmentName,
        summary: data.title || data.description || "Complaint filed",
        history: events,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API Error in complaint lookup:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawId = resolvedParams?.id;
    const queryId = decodeURIComponent(rawId || "").trim();

    if (!queryId) {
      return NextResponse.json(
        { error: "Tracking ID or Complaint ID is required." },
        { status: 400 }
      );
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

    const supabase = getServiceSupabase();

    let complaint: any = null;

    if (isUuid) {
      const res = await supabase.from("complaints").select("*").eq("id", queryId).maybeSingle();
      complaint = res.data;
    }

    if (!complaint) {
      try {
        const res = await supabase.from("complaints").select("*").ilike("tracking_code", queryId).maybeSingle();
        complaint = res.data;
      } catch {}
    }

    if (!complaint) {
      try {
        const res = await supabase.from("complaints").select("*").ilike("tracking_id", queryId).maybeSingle();
        complaint = res.data;
      } catch {}
    }

    if (!complaint) {
      return NextResponse.json(
        { error: `Complaint "${queryId}" not found.` },
        { status: 404 }
      );
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

    const { data: updatedComplaint, error: updateErr } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", complaint.id)
      .select()
      .single();

    if (updateErr) {
      console.error("[CivicPulse API] Complaint PATCH update error:", updateErr.message);
      return NextResponse.json(
        { error: "Failed to update complaint: " + updateErr.message },
        { status: 500 }
      );
    }

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

    try {
      await supabase.from("complaint_events").insert({
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
    } catch (e) {
      console.warn("[CivicPulse API] Could not record complaint event:", e);
    }

    const trackingCode = updatedComplaint.tracking_code || updatedComplaint.tracking_id || complaint.tracking_id || queryId;

    return NextResponse.json(
      {
        success: true,
        complaint: updatedComplaint,
        data: updatedComplaint,
        message: `Complaint ${trackingCode} successfully updated.`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
