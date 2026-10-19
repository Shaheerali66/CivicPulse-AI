"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Clock,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  UserCheck,
  Wrench,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrackingIdDisplay } from "@/components/ui/tracking-id-display";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { PublicTrackingResponse, ComplaintStatus } from "@/types/complaint";

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [trackingInput, setTrackingInput] = useState(initialId);
  const [complaint, setComplaint] = useState<PublicTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingData = async (idToSearch: string) => {
    const cleanId = (idToSearch || "").trim();
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setComplaint(null);

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No complaint found with this Tracking ID.");
      }

      const comp = data.complaint || data.data || data;

      // Safely format a date string, returning fallback on invalid dates
      const safeDate = (val: any): string => {
        if (!val) return new Date().toISOString();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      };

      // Map DB event rows to UI shape
      const mapEvents = (events: any[]) =>
        events.map((ev: any) => ({
          label:
            ev.label ||
            (ev.event_type
              ? ev.event_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
              : "Status Update"),
          timestamp: safeDate(ev.timestamp || ev.created_at),
          notes: ev.notes || ev.note || (typeof ev.new_value === "string" ? ev.new_value : ev.new_value?.status) || undefined,
        }));

      const rawCategory = data.category || comp.category || "General";
      const categoryLabel = String(rawCategory)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const rawHistory = data.history || comp.events || [];
      const history =
        Array.isArray(rawHistory) && rawHistory.length > 0
          ? mapEvents(rawHistory)
          : [
              {
                label: "Complaint Submitted & Recorded",
                timestamp: safeDate(comp.created_at || comp.submitted_at),
                notes: undefined,
              },
            ];

      const normalized = {
        ...comp,
        ...data,
        trackingId:
          data.trackingId || comp.tracking_code || comp.tracking_id || comp.id || cleanId,
        status: (data.status || comp.status || "submitted") as ComplaintStatus,
        category: rawCategory,
        categoryLabel,
        department:
          typeof data.department === "string"
            ? data.department
            : comp.department?.name || (typeof comp.department === "string" ? comp.department : null) || "Municipal Services",
        summary:
          data.summary || comp.summary || comp.description || comp.title || "Complaint filed.",
        // Map created_at → createdAt for UI display
        createdAt: safeDate(comp.created_at || comp.submitted_at || comp.createdAt),
        history,
      };

      setComplaint(normalized as any);
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

  // Normalize status string and map to step index
  const getStepStatus = (currentStatus: string, stepIndex: number) => {
    const normalized = String(currentStatus || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const statusOrder: Record<string, number> = {
      submitted: 1,
      needs_review: 1,
      pending: 1,
      under_review: 2,
      assigned: 2,
      in_progress: 3,
      resolved: 4,
      closed: 4,
      rejected: 0,
    };
    const currentStep = statusOrder[normalized] ?? 1;
    if (currentStep > stepIndex) return "completed";
    if (currentStep === stepIndex) return "current";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-slate-900 font-bold hover:text-blue-900 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              CP
            </div>
            <div>
              <span className="block text-sm font-bold leading-tight">CivicPulse AI</span>
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">Hyderabad Municipal Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/report" className="text-slate-600 hover:text-blue-900 inline-flex items-center gap-1.5 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              File Complaint
            </Link>
            <Link href="/auth/login" className="text-blue-900 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              Officer Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Public Portal
          </Link>
        </div>

        {/* Hero Card for Tracking Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-full mb-3 shadow-2xs">
            <Search className="w-3.5 h-3.5" />
            Public Civic Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Complaint Status
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Enter your unique civic tracking code to check real-time departmental assignment, officer inspection status, and resolution history.
          </p>

          {/* Search Form with inside icon */}
          <form onSubmit={handleSearchSubmit} className="mt-8 flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="e.g. CP-HYD-2026-8912"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 uppercase font-mono tracking-wider transition-all shadow-2xs"
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-xs"
            >
              <span>Track Status</span>
            </Button>
          </form>

          {/* Sample Clickable Chips in Soft Blue */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Sample tracking codes:</span>
            <button
              type="button"
              onClick={() => {
                setTrackingInput("CP-HYD-2026-8912");
                fetchTrackingData("CP-HYD-2026-8912");
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              CP-HYD-2026-8912
            </button>
            <button
              type="button"
              onClick={() => {
                setTrackingInput("CP-HYD-2026-4401");
                fetchTrackingData("CP-HYD-2026-4401");
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              CP-HYD-2026-4401
            </button>
          </div>
        </div>

        {loading && <LoadingState message="Fetching official municipal complaint status..." />}

        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <ErrorState message={error} onRetry={() => fetchTrackingData(trackingInput)} />
          </div>
        )}

        {/* Complaint Result Detail Card */}
        {complaint && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-8 animate-fade-in">
            {/* Header / ID & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  Official Municipal Tracking Code
                </span>
                <TrackingIdDisplay trackingId={complaint.trackingId} />
              </div>
              <div className="flex flex-col sm:items-end">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Status</span>
                <StatusBadge status={complaint.status} />
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                Resolution Lifecycle
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { step: 1, label: "Received", icon: FileText },
                  { step: 2, label: "Assigned", icon: UserCheck },
                  { step: 3, label: "In Progress", icon: Wrench },
                  { step: 4, label: "Resolved", icon: CheckCircle2 },
                ].map((s) => {
                  const state = getStepStatus(complaint.status, s.step);
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border transition-colors ${
                          state === "completed"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : state === "current"
                            ? "bg-blue-900 border-blue-900 text-white shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          state === "current"
                            ? "text-blue-900"
                            : state === "completed"
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Core Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Category
                </span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {(complaint as any).categoryLabel || String((complaint as any).category || "General").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Responsible Agency
                </span>
                <span className="font-bold text-blue-900 flex items-center gap-1.5 mt-1">
                  <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
                  {typeof complaint.department === "object" && complaint.department !== null
                    ? (complaint.department as any)?.name || "Municipal Services"
                    : complaint.department || "Municipal Services"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Lodged On
                </span>
                <span className="text-slate-800 flex items-center gap-1.5 mt-1 font-medium">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                  {(() => {
                    const raw = (complaint as any).createdAt || (complaint as any).created_at;
                    if (!raw) return "—";
                    const d = new Date(raw);
                    return isNaN(d.getTime())
                      ? "—"
                      : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                  })()}
                </span>
              </div>
            </div>

            {/* Citizen-safe summary */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Verified Issue Summary
              </h3>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed">
                {complaint.summary}
              </p>
            </div>

            {/* Timeline Steps Card */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Status History &amp; Official Actions</span>
              </h3>
              <div className="space-y-4">
                {complaint.history && complaint.history.length > 0 ? (
                  complaint.history.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3.5">
                      <div className="w-3 h-3 rounded-full bg-blue-900 ring-4 ring-blue-100 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 bg-white border border-slate-200 p-4 rounded-xl text-xs shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{event.label}</span>
                          <span className="text-slate-500 font-mono">
                            {(() => {
                              const d = new Date(event.timestamp);
                              return isNaN(d.getTime())
                                ? "—"
                                : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
                            })()}
                          </span>
                        </div>
                        {event.notes && <p className="text-slate-600 mt-1 leading-relaxed">{event.notes}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    Grievance received and registered. Pending municipal assignment.
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-slate-700 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-900 flex-shrink-0" />
              <span>
                Citizen Privacy Protected: Personal telephone numbers, caller IDs, and exact street coordinates are redacted from public queries in compliance with Sindh government data protection standards.
              </span>
            </div>
          </div>
        )}
      </main>
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
