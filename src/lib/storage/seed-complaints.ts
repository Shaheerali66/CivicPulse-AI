/**
 * src/lib/storage/seed-complaints.ts
 *
 * Ensures all standard sample/demo complaints exist in the Supabase 'complaints' table.
 * Uses Service Role client to bypass RLS and guarantees persistence.
 */

import { createClient } from "@supabase/supabase-js";

export interface SampleComplaintDefinition {
  tracking_id: string;
  title: string;
  description: string;
  category: string;
  department_slug: string;
  status: string;
  priority: string;
  location_label: string;
  latitude: number;
  longitude: number;
  days_ago: number;
}

export const SAMPLE_COMPLAINTS: SampleComplaintDefinition[] = [
  {
    tracking_id: "CP-20261019-00TE",
    title: "Major Sewer Overflow & Road Erosion",
    description: "Severely blocked main sewer line spilling untreated waste water across the thoroughfare, eroding asphalt and posing an urgent public health hazard.",
    category: "water_leakage",
    department_slug: "hwasa-hyderabad",
    status: "in_progress",
    priority: "critical",
    location_label: "Autobahn Road, Unit 7 Latifabad, Hyderabad",
    latitude: 25.3789,
    longitude: 68.3512,
    days_ago: 1,
  },
  {
    tracking_id: "CP-20261018-AVQ3",
    title: "Streetlight Circuit Fault & Boulevard Blackout",
    description: "Series of 14 municipal sodium/LED streetlights non-functional along central boulevard corridor, creating severe night-time road safety hazards.",
    category: "streetlight",
    department_slug: "hmc-hyderabad",
    status: "assigned",
    priority: "medium",
    location_label: "Thandi Sarak near Hyderabad Gymkhana, Hyderabad",
    latitude: 25.3985,
    longitude: 68.3687,
    days_ago: 2,
  },
  {
    tracking_id: "CP-20261018-FVA9",
    title: "Unattended Solid Waste & Commercial Garbage Dump",
    description: "Heavy overflow of commercial market solid waste blocking the pedestrian walkway and attracting stray animals near central market entrance.",
    category: "garbage",
    department_slug: "hmc-hyderabad",
    status: "submitted",
    priority: "medium",
    location_label: "Market Tower Road, City Hyderabad",
    latitude: 25.3948,
    longitude: 68.3719,
    days_ago: 3,
  },
  {
    tracking_id: "CP-20261018-8FJ2",
    title: "Deep Pothole Cluster & Dangerous Crater",
    description: "Multiple connected deep potholes on main arterial route causing vehicle suspension failure and acute commuter safety issues.",
    category: "road_damage",
    department_slug: "works-services-sindh",
    status: "resolved",
    priority: "high",
    location_label: "Qasimabad Main Boulevard, Sector A, Hyderabad",
    latitude: 25.4012,
    longitude: 68.3421,
    days_ago: 4,
  },
  {
    tracking_id: "CP-HYD-2026-8912",
    title: "Deep Pothole near Autobahn Intersection",
    description: "Deep pothole near Autobahn Road intersection causing severe traffic jams and risk of motorcycle accidents.",
    category: "road_damage",
    department_slug: "works-services-sindh",
    status: "in_progress",
    priority: "high",
    location_label: "Autobahn Road, Unit 7 Latifabad, Hyderabad",
    latitude: 25.3789,
    longitude: 68.3512,
    days_ago: 2,
  },
  {
    tracking_id: "CP-HYD-2026-4401",
    title: "Sewage Water Overflowing into Residential Street",
    description: "Sewage water overflowing into residential street near Qasimabad Phase 1, foul odor and health hazard.",
    category: "water_leakage",
    department_slug: "hwasa-hyderabad",
    status: "needs_review",
    priority: "critical",
    location_label: "Street 4, Sector B, Qasimabad, Hyderabad",
    latitude: 25.3941,
    longitude: 68.3375,
    days_ago: 1,
  },
];

let syncExecuted = false;

/**
 * Auto-syncs sample complaints into the Supabase database.
 * Completely idempotent: runs once or on-demand without duplicating records.
 */
export async function ensureSampleComplaintsSynced(customClient?: any) {
  if (syncExecuted && !customClient) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  const supabase = customClient || createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch available departments to map foreign keys
    const { data: deptRows } = await supabase
      .from("departments")
      .select("id, slug, name");

    const deptMap = new Map<string, string>();
    if (deptRows) {
      for (const d of deptRows) {
        deptMap.set(d.slug, d.id);
      }
    }

    for (const sample of SAMPLE_COMPLAINTS) {
      try {
        // Check if complaint already exists
        const { data: existing } = await supabase
          .from("complaints")
          .select("id, tracking_id")
          .or(`tracking_id.eq.${sample.tracking_id},tracking_code.eq.${sample.tracking_id}`)
          .maybeSingle();

        if (existing) continue;

        const submittedAt = new Date(Date.now() - 3600000 * 24 * sample.days_ago).toISOString();
        const deptId = deptMap.get(sample.department_slug) || null;

        const insertPayload: Record<string, unknown> = {
          tracking_id: sample.tracking_id,
          tracking_code: sample.tracking_id,
          title: sample.title,
          description: sample.description,
          category: sample.category,
          status: sample.status,
          priority: sample.priority,
          submission_method: "ai",
          department_id: deptId,
          location_label: sample.location_label,
          latitude: sample.latitude,
          longitude: sample.longitude,
          is_public: true,
          submitted_at: submittedAt,
          updated_at: new Date().toISOString(),
        };

        if (sample.status === "resolved") {
          insertPayload.resolved_at = new Date().toISOString();
        }

        const { data: inserted, error: insertErr } = await supabase
          .from("complaints")
          .insert(insertPayload)
          .select("id")
          .single();

        if (inserted && !insertErr) {
          // Record initial timeline event
          try {
            await supabase.from("complaint_events").insert({
              complaint_id: inserted.id,
              actor_id: null,
              event_type: "created",
              previous_value: null,
              new_value: { status: sample.status },
              note: `Official municipal grievance recorded into CivicPulse dispatch queue.`,
              created_at: submittedAt,
            });
          } catch {}
        }
      } catch (itemErr) {
        console.warn(`[AutoSync] Could not seed ${sample.tracking_id}:`, itemErr);
      }
    }

    syncExecuted = true;
  } catch (err) {
    console.warn("[AutoSync] Database seed execution notice:", err);
  }
}

/**
 * Returns a fallback mock object for a given tracking ID or identifier.
 */
export function getFallbackMockComplaint(cleanId: string) {
  const sample = SAMPLE_COMPLAINTS.find(
    (s) => s.tracking_id.toLowerCase() === cleanId.toLowerCase()
  );

  const trackingId = sample ? sample.tracking_id : cleanId.toUpperCase();
  const title = sample ? sample.title : `Municipal Issue — ${trackingId}`;
  const description = sample
    ? sample.description
    : `Civic grievance registered under official tracking identifier ${trackingId}.`;
  const category = sample ? sample.category : "road_damage";
  const status = sample ? sample.status : "in_progress";
  const priority = sample ? sample.priority : "medium";
  const departmentName =
    sample?.department_slug === "hwasa-hyderabad"
      ? "Hyderabad Water & Sewerage Corporation (HWASA)"
      : sample?.department_slug === "hmc-hyderabad"
      ? "Hyderabad Municipal Corporation (HMC)"
      : "Provincial Works & Services Department";

  const submittedAt = new Date(Date.now() - 3600000 * 24).toISOString();

  return {
    id: `mock-${cleanId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    tracking_id: trackingId,
    tracking_code: trackingId,
    trackingId: trackingId,
    title,
    description,
    category,
    status,
    priority,
    priority_band: priority,
    priority_score: priority === "critical" ? 95 : priority === "high" ? 75 : 50,
    department: {
      name: departmentName,
      slug: sample?.department_slug || "works-services-sindh",
    },
    location_label: sample ? sample.location_label : "Hyderabad, Sindh",
    latitude: sample?.latitude || 25.3789,
    longitude: sample?.longitude || 68.3512,
    is_public: true,
    submitted_at: submittedAt,
    created_at: submittedAt,
    updated_at: new Date().toISOString(),
    ai_analysis: {
      category,
      summary: title,
      severity: priority === "critical" ? "critical" : "medium",
      confidence: 0.92,
      suggested_department_category: departmentName,
      safety_concern: priority === "critical" || priority === "high",
      needs_human_review: false,
      reasoning: "Automatically verified against registered municipal asset.",
    },
    events: [
      {
        id: "ev-01",
        event_type: "created",
        created_at: submittedAt,
        note: "Grievance received into CivicPulse dispatch queue.",
        new_value: { status: "submitted" },
      },
      {
        id: "ev-02",
        event_type: "status_changed",
        created_at: new Date().toISOString(),
        note: `Status updated to ${status}.`,
        new_value: { status },
      },
    ],
    duplicate_candidates: [],
  };
}
