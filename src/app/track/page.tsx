"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Clock, Building2, AlertTriangle, ShieldCheck, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrackingIdDisplay } from "@/components/ui/tracking-id-display";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { PublicTrackingResponse } from "@/types/complaint";

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [trackingInput, setTrackingInput] = useState(initialId);
  const [complaint, setComplaint] = useState<PublicTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingData = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;

    setLoading(true);
    setError(null);
    setComplaint(null);

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(idToSearch.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No complaint found with this Tracking ID.");
      }

      setComplaint(data);
    } catch (err: any) {
      setError(err.message || "Unable to retrieve tracking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchTrackingData(initialId);
    }
  }, [initialId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingData(trackingInput);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
          Track Complaint Status
        </h1>
        <p className="mt-2 text-sm text-[#475569]">
          Enter your unique Tracking ID below to view official status, departmental assignment, and resolution timeline.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="e.g. CP-HYD-2026-8912"
            className="flex-1 px-4 py-2.5 border border-[#CBD5E1] rounded text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E] uppercase font-mono"
            required
          />
          <Button type="submit" variant="primary" size="md" isLoading={loading}>
            <Search className="w-4 h-4 mr-1.5" />
            Track Status
          </Button>
        </form>

        <p className="text-xs text-[#64748B] mt-2">
          Demo sample tracking codes: <code className="bg-[#E2E8F0] px-1 py-0.5 rounded cursor-pointer" onClick={() => { setTrackingInput("CP-HYD-2026-8912"); fetchTrackingData("CP-HYD-2026-8912"); }}>CP-HYD-2026-8912</code>, <code className="bg-[#E2E8F0] px-1 py-0.5 rounded cursor-pointer" onClick={() => { setTrackingInput("CP-HYD-2026-4401"); fetchTrackingData("CP-HYD-2026-4401"); }}>CP-HYD-2026-4401</code>
        </p>
      </div>

      {loading && <LoadingState message="Fetching official complaint status..." />}

      {error && (
        <div className="max-w-2xl mx-auto mb-8">
          <ErrorState message={error} onRetry={() => fetchTrackingData(trackingInput)} />
        </div>
      )}

      {complaint && (
        <div className="bg-white border border-[#CBD5E1] rounded p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#CBD5E1]">
            <div>
              <span className="text-xs uppercase font-semibold text-[#64748B] tracking-wider block mb-1">
                Official Tracking ID
              </span>
              <TrackingIdDisplay trackingId={complaint.trackingId} />
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-[#64748B] mb-1">Status</span>
              <StatusBadge status={complaint.status} />
            </div>
          </div>

          {/* Core attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-sm">
            <div>
              <span className="text-xs text-[#64748B] block">Category</span>
              <span className="font-semibold text-[#1E293B]">{complaint.categoryLabel}</span>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Assigned Department</span>
              <span className="font-semibold text-[#0F3F6E] flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {complaint.department}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Recorded On</span>
              <span className="text-[#1E293B] flex items-center gap-1.5 mt-0.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                {new Date(complaint.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Citizen-safe summary */}
          <div>
            <h3 className="text-sm font-semibold text-[#1E293B] mb-2">
              Issue Summary
            </h3>
            <p className="text-sm text-[#475569] bg-[#F1F5F9] p-4 rounded leading-relaxed">
              {complaint.summary}
            </p>
          </div>

          {/* Status Timeline (§14.5) */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#0A2540] mb-4">
              Status History & Activity
            </h3>
            <div className="space-y-4">
              {complaint.history && complaint.history.length > 0 ? (
                complaint.history.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0F3F6E] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 bg-white border border-[#E2E8F0] p-3 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#0A2540]">{event.label}</span>
                        <span className="text-[#64748B]">
                          {new Date(event.timestamp).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {event.notes && <p className="text-[#475569]">{event.notes}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#64748B]">No additional timeline events recorded.</div>
              )}
            </div>
          </div>

          {/* Privacy disclosure */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-[#64748B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F3F6E] flex-shrink-0" />
            <span>
              Citizen privacy protected: Contact numbers, personal addresses, and internal dispatch notes are shielded from public tracking endpoints.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading tracking lookup..." />}>
      <TrackContent />
    </Suspense>
  );
}

