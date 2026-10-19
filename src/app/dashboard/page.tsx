/**
 * src/app/dashboard/page.tsx
 *
 * PRD-04 :: Officer Dashboard (DASH-01, DASH-02, DASH-03, DASH-05)
 * Operational view for municipal officers and reviewers.
 * - Live summary metrics (Total, New, Needs Review, Assigned, In-Progress, Resolved, High/Critical)
 * - Server-side paginated queue with comprehensive filtering
 * - Dedicated Human-Review Queue tab for low confidence, unknown categories, and safety hazards
 * - OpenStreetMap Leaflet integration with accessible fallback list
 * - Complaint detail modal with status transitions, assignment, and duplicate candidate review
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  AlertTriangle,
  MapPin,
  RotateCw,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { AppHeader } from "@/components/navigation/header";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { ComplaintQueue, type QueueFilters } from "@/components/dashboard/complaint-queue";
import { ComplaintMap } from "@/components/maps/complaint-map";
import { ComplaintDetailModal } from "@/components/complaints/detail-modal";
import { HumanReviewModal } from "@/components/complaints/human-review-modal";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  DbComplaint,
  DbDepartment,
  DashboardSummary,
} from "@/types/database";

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"queue" | "review" | "map">("queue");
  const [currentRole, setCurrentRole] = useState<"officer" | "reviewer" | "admin" | "citizen">("officer");
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    async function verifyOfficerAccess() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
          // Hard redirect — no data should ever be visible without a session
          window.location.replace("/auth/login?redirect=/dashboard");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "citizen") {
          window.location.replace("/my-complaints");
          return;
        }

        if (profile?.role) {
          setCurrentRole(profile.role as any);
        }

        setAuthChecking(false);
      } catch (err) {
        console.error("Dashboard auth error — redirecting to login:", err);
        window.location.replace("/auth/login?redirect=/dashboard");
      }
    }

    verifyOfficerAccess();
  }, [router]);

  // Summary Metrics State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Queue State
  const [complaints, setComplaints] = useState<DbComplaint[]>([]);
  const [total, setTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<QueueFilters>({
    page: 1,
    pageSize: 20,
  });
  const [activeMetricFilter, setActiveMetricFilter] = useState<{ key: string; value: any } | undefined>();

  // Departments list for filter dropdowns
  const [departments, setDepartments] = useState<DbDepartment[]>([]);

  // Selected complaint for Detail Modal
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<DbComplaint | null>(null);

  // Selected complaint for Human Review Modal
  const [reviewComplaint, setReviewComplaint] = useState<DbComplaint | null>(null);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch("/api/complaints/summary", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSummary(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch summary metrics", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDepartments(json.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch departments", err);
    }
  }, []);

  // Fetch Complaints with Filters
  const fetchComplaints = useCallback(async () => {
    try {
      setQueueLoading(true);
      setQueueError(null);

      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.category) params.set("category", filters.category);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.department_id) params.set("department_id", filters.department_id);
      if (filters.needs_review !== undefined) params.set("needs_review", String(filters.needs_review));
      if (filters.is_duplicate !== undefined) params.set("is_duplicate", String(filters.is_duplicate));
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      // If in review tab, force needs_review = true
      if (activeTab === "review") {
        params.set("needs_review", "true");
      }

      const res = await fetch(`/api/complaints?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Authentication required. Please sign in.");
        }
        throw new Error("Failed to load complaints queue.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setComplaints(json.data.items || []);
        setTotal(json.data.total || 0);
      } else {
        throw new Error(json.error || "Failed to fetch complaints.");
      }
    } catch (err: unknown) {
      setQueueError(err instanceof Error ? err.message : "Error loading queue.");
    } finally {
      setQueueLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    fetchSummary();
    fetchDepartments();
  }, [fetchSummary, fetchDepartments]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle metric card click to filter
  const handleMetricCardClick = (key: string, value: any) => {
    setActiveMetricFilter({ key, value });
    if (key === "needs_review") {
      setActiveTab("review");
      setFilters((prev) => ({ ...prev, page: 1, needs_review: true, status: undefined, priority: undefined }));
    } else if (key === "my_queue") {
      setFilters((prev) => ({ ...prev, page: 1, status: undefined, priority: undefined, needs_review: undefined }));
    } else {
      setActiveTab("queue");
      setFilters((prev) => ({
        ...prev,
        page: 1,
        [key]: value,
        needs_review: undefined,
      }));
    }
  };

  const handleFilterChange = (newFilters: Partial<QueueFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setActiveMetricFilter(undefined);
    setFilters({
      page: 1,
      pageSize: 20,
    });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Verifying Officer Security Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader
        onSelectComplaint={(id) => setSelectedComplaintId(id)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dashboard Title & Scope Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Officer Operations Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hyderabad Municipal Corporation operational triage, human review, and dispatch view.
            </p>
          </div>

          {/* Actions & Tab Selector */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                fetchSummary();
                fetchComplaints();
              }}
              disabled={queueLoading || summaryLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors disabled:opacity-50"
              title="Refresh complaints queue and metrics"
            >
              <RotateCw className={`w-3.5 h-3.5 ${queueLoading || summaryLoading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              Refresh
            </button>

            {/* Tab Selector */}
            <div className="flex items-center bg-white border border-slate-300 rounded-md p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("queue");
                if (filters.needs_review) handleFilterChange({ needs_review: undefined });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "queue"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Operational Queue
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("review");
                handleFilterChange({ needs_review: true });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "review"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Human-Review Queue
              {summary && summary.needs_review > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "review"
                      ? "bg-amber-800 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {summary.needs_review}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "map"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Geographic Map
            </button>
          </div>
        </div>
      </div>

        {/* Operational Metrics Cards (Click to Filter) */}
        <MetricsCards
          summary={summary}
          loading={summaryLoading}
          onFilterClick={handleMetricCardClick}
          activeFilter={activeMetricFilter}
        />

        {/* Main Content Area based on Active Tab */}
        {activeTab === "map" ? (
          <ComplaintMap
            complaints={complaints}
            onSelectComplaint={(c) => {
              setSelectedComplaintId(c.id);
              setSelectedComplaint(c);
            }}
          />
        ) : (
          <ComplaintQueue
            complaints={complaints}
            total={total}
            page={filters.page}
            pageSize={filters.pageSize}
            loading={queueLoading}
            error={queueError}
            filters={filters}
            departments={departments}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onSelectComplaint={(c) => {
              setSelectedComplaintId(c.id);
              setSelectedComplaint(c);
            }}
            onReviewComplaint={(c) => setReviewComplaint(c)}
            onRefresh={() => {
              fetchSummary();
              fetchComplaints();
            }}
          />
        )}
      </main>

      {/* Complaint Detail Modal */}
      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          complaint={
            selectedComplaint ||
            complaints.find(
              (c) => c.id === selectedComplaintId || c.tracking_id === selectedComplaintId
            )
          }
          onClose={() => {
            setSelectedComplaintId(null);
            setSelectedComplaint(null);
          }}
          onUpdated={() => {
            fetchSummary();
            fetchComplaints();
          }}
          userRole={currentRole}
        />
      )}

      {/* Human Review Modal */}
      {reviewComplaint && (
        <HumanReviewModal
          complaint={reviewComplaint}
          onClose={() => setReviewComplaint(null)}
          onSuccess={() => {
            fetchSummary();
            fetchComplaints();
          }}
        />
      )}
    </div>
  );
}
