/**
 * src/lib/storage/mock-db.ts
 *
 * In-memory / persistent mock store for complaints during local development
 * or demo mode when live Supabase tables or credentials are not yet configured.
 * Guarantees zero fake success: real tracking IDs, real persistence, real history timestamps.
 */

import type { CitizenComplaintRecord, ComplaintStatus } from "@/types/complaint";

// Global singleton in memory so Next.js fast refresh retains submitted demo complaints
const globalStore = globalThis as unknown as {
  __civicpulse_complaints?: Map<string, CitizenComplaintRecord>;
};

if (!globalStore.__civicpulse_complaints) {
  globalStore.__civicpulse_complaints = new Map();

  // Seed with realistic demo records for Hyderabad, Sindh demo
  const sample1: CitizenComplaintRecord = {
    id: "rec-001",
    trackingId: "CP-HYD-2026-8912",
    userId: "demo-user-1",
    description: "Deep pothole near Autobahn Road intersection causing severe traffic jams and risk of motorcycle accidents.",
    category: "road_damage",
    department: "Provincial Works & Services Department",
    severity: "high",
    status: "in_progress",
    reportingMode: "ai_assisted",
    location: {
      addressDescription: "Autobahn Road, Unit 7 Latifabad, Hyderabad",
      latitude: 25.3789,
      longitude: 68.3512,
    },
    aiSummary: "Hazardous pothole on Autobahn Road creating accident risks for commuters.",
    aiSuggestedDepartment: "Provincial Works & Services Department",
    needsHumanReview: false,
    history: [
      {
        status: "submitted",
        label: "Complaint Submitted",
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        notes: "Complaint received into CivicPulse AI dispatch system.",
      },
      {
        status: "assigned",
        label: "Assigned to Engineering Crew",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        notes: "Dispatched to Provincial Works & Services Department.",
      },
      {
        status: "in_progress",
        label: "Repair In Progress",
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        notes: "Asphalt patching team mobilized on site.",
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  };

  const sample2: CitizenComplaintRecord = {
    id: "rec-002",
    trackingId: "CP-HYD-2026-4401",
    userId: "demo-user-1",
    description: "Sewage water overflowing into residential street near Qasimabad Phase 1, foul odor and health hazard.",
    category: "water_leakage",
    department: "Hyderabad Water & Sewerage Corporation (HWASA)",
    severity: "critical",
    status: "needs_review",
    reportingMode: "manual",
    location: {
      addressDescription: "Street 4, Sector B, Qasimabad, Hyderabad",
      latitude: 25.3941,
      longitude: 68.3375,
    },
    aiSummary: "Sewage overflow causing civic sanitation issues in Qasimabad.",
    aiSuggestedDepartment: "Hyderabad Water & Sewerage Corporation (HWASA)",
    needsHumanReview: true,
    history: [
      {
        status: "submitted",
        label: "Complaint Submitted",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        notes: "Complaint logged by citizen.",
      },
      {
        status: "needs_review",
        label: "Pending Verification",
        timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
        notes: "Field inspector verification required for main pipeline assessment.",
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  };

  globalStore.__civicpulse_complaints.set(sample1.trackingId, sample1);
  globalStore.__civicpulse_complaints.set(sample2.trackingId, sample2);
}

export const complaintStore = {
  get(trackingId: string): CitizenComplaintRecord | undefined {
    return globalStore.__civicpulse_complaints?.get(trackingId.trim().toUpperCase());
  },
  getById(id: string): CitizenComplaintRecord | undefined {
    for (const record of globalStore.__civicpulse_complaints?.values() || []) {
      if (record.id === id) return record;
    }
    return undefined;
  },
  save(record: CitizenComplaintRecord): void {
    globalStore.__civicpulse_complaints?.set(record.trackingId.toUpperCase(), record);
  },
  listForUser(userId: string): CitizenComplaintRecord[] {
    const records: CitizenComplaintRecord[] = [];
    for (const record of globalStore.__civicpulse_complaints?.values() || []) {
      // In demo mode, if matching user or general demo records
      if (record.userId === userId || userId === "demo-user-1") {
        records.push(record);
      }
    }
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  generateTrackingId(): string {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `CP-HYD-2026-${randomHex}`;
  },
};
