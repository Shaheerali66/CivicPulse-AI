"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, List, ArrowRight, Building2, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrackingIdDisplay } from "@/components/ui/tracking-id-display";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import type { CitizenComplaintRecord } from "@/types/complaint";

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<CitizenComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await fetch("/api/complaints");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load complaints");
        }
        setComplaints(data.complaints || []);
      } catch (err: any) {
        setError(err.message || "Failed to retrieve citizen records.");
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#CBD5E1]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
            My Complaint History
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Authenticated dashboard showing civic reports filed under your citizen session.
          </p>
        </div>
        <Link href="/report">
          <Button variant="primary" size="md">
            <PlusCircle className="w-4 h-4 mr-2" />
            File New Complaint
          </Button>
        </Link>
      </div>

      {loading && <LoadingState message="Loading your submitted complaints..." />}

      {error && <ErrorState message={error} />}

      {!loading && !error && complaints.length === 0 && (
        <EmptyState
          title="No complaints filed yet"
          description="You have not submitted any civic complaints under this account. Click below to file your first report."
          actionText="File a Complaint"
          actionHref="/report"
        />
      )}

      {!loading && !error && complaints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#CBD5E1] rounded p-5 flex flex-col justify-between hover:border-[#0F3F6E] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <TrackingIdDisplay trackingId={item.trackingId} />
                  <StatusBadge status={item.status} />
                </div>

                <h2 className="text-sm font-semibold text-[#0A2540] mb-2 line-clamp-2">
                  {item.aiSummary || item.description}
                </h2>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#64748B] mb-4">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#0F3F6E]" />
                    {item.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs uppercase font-medium text-[#64748B]">
                  Mode: {item.reportingMode === "ai_assisted" ? "AI Assisted" : "Manual"}
                </span>
                <Link href={`/track?id=${item.trackingId}`}>
                  <Button variant="ghost" size="sm">
                    View Tracking
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
