/**
 * src/components/complaints/detail-modal.tsx
 *
 * PRD-04 :: Complaint Detail & Operations Modal
 * Comprehensive operational view for authorized staff:
 * - Tracking ID, description, sanitized AI summary
 * - Priority scoring formula components & safety alerts
 * - Authorized photo preview & location
 * - Duplicate candidates review panel (Confirm, Reject, Distinct)
 * - Status transition actions (server-validated)
 * - Department/Officer assignment controls
 * - Full audit timeline history
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  RotateCw,
  UserCheck,
  Building2,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ShieldAlert,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";
import type {
  ComplaintWithRelations,
  ComplaintStatus,
  DbDepartment,
  DbProfile,
} from "@/types/database";
import { STATUS_TRANSITIONS } from "@/types/database";
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
  SafetyBadge,
  ReviewNeededBadge,
} from "@/components/ui/badges";
import { formatDateTime, getCategoryLabel, getStatusLabel } from "@/lib/utils";

interface DetailModalProps {
  complaintId: string;
  onClose: () => void;
  onUpdated?: () => void;
  userRole?: string;
}

export function ComplaintDetailModal({
  complaintId,
  onClose,
  onUpdated,
  userRole = "officer",
}: DetailModalProps) {
  const [complaint, setComplaint] = useState<ComplaintWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus | "">("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Assignment state
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // AI re-analyze state
  const [analyzing, setAnalyzing] = useState(false);

  // Duplicate action state
  const [reviewingDupId, setReviewingDupId] = useState<string | null>(null);

  // Fetch complaint details
  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/complaints/${complaintId}`);
      if (!res.ok) {
        throw new Error("Failed to load complaint details");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setComplaint(json.data);
        setSelectedDeptId(json.data.department_id || "");
      } else {
        throw new Error(json.error || "Complaint not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments for assignment dropdown
  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDepartments(json.data || []);
      }
    } catch (e) {
      console.warn("Could not load departments", e);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchDepartments();
  }, [complaintId]);

  // Handle status update
  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus || !complaint) return;

    try {
      setStatusUpdating(true);
      setStatusFeedback(null);
      const payload: Record<string, unknown> = {
        status: targetStatus,
        note: statusNote.trim() || undefined,
      };
      if (targetStatus === "resolved") {
        if (!resolutionNotes.trim()) {
          setStatusFeedback({ type: "error", msg: "Resolution notes are required when marking resolved." });
          setStatusUpdating(false);
          return;
        }
        payload.resolution_notes = resolutionNotes.trim();
      }

      const res = await fetch(`/api/complaints/${complaint.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status");
      }

      setStatusFeedback({ type: "success", msg: `Status successfully changed to ${getStatusLabel(targetStatus)}` });
      setTargetStatus("");
      setResolutionNotes("");
      setStatusNote("");
      await fetchDetail();
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      setStatusFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Error updating status",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle assignment
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !complaint) return;

    try {
      setAssigning(true);
      setAssignFeedback(null);

      const res = await fetch(`/api/complaints/${complaint.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_id: selectedDeptId,
          note: assignNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to assign department");
      }

      setAssignFeedback({ type: "success", msg: "Complaint assigned successfully" });
      setAssignNote("");
      await fetchDetail();
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      setAssignFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Error assigning complaint",
      });
    } finally {
      setAssigning(false);
    }
  };

  // Trigger AI re-analysis
  const handleReanalyze = async () => {
    if (!complaint) return;
    try {
      setAnalyzing(true);
      const res = await fetch(`/api/complaints/${complaint.id}/analyze`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "AI analysis failed");
      }
      await fetchDetail();
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error running AI analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle duplicate review decision
  const handleDuplicateDecision = async (
    relationshipId: string,
    decision: "confirmed_duplicate" | "rejected_duplicate" | "related_distinct"
  ) => {
    if (!complaint) return;
    try {
      setReviewingDupId(relationshipId);
      const res = await fetch(`/api/complaints/${complaint.id}/duplicate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationship_id: relationshipId,
          decision,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit duplicate decision");
      }
      await fetchDetail();
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating duplicate");
    } finally {
      setReviewingDupId(null);
    }
  };

  const allowedTransitions = complaint ? STATUS_TRANSITIONS[complaint.status] || [] : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {complaint?.tracking_id || "Loading..."}
            </span>
            {complaint && (
              <>
                <StatusBadge status={complaint.status} />
                <PriorityBadge band={complaint.priority_band} score={complaint.priority_score} />
                {complaint.safety_concern && <SafetyBadge />}
                {complaint.needs_human_review && <ReviewNeededBadge />}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">Fetching complaint record & audit history...</p>
            </div>
          ) : error || !complaint ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-md text-center">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-rose-900">{error || "Complaint not found"}</p>
              <button
                type="button"
                onClick={fetchDetail}
                className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Complaint Title & Meta Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{complaint.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Submitted: {formatDateTime(complaint.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Dept: {complaint.department?.name || "Unassigned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Officer: {complaint.assigned_officer?.full_name || "Unassigned"}
                  </span>
                  {complaint.location_label && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {complaint.location_label}
                    </span>
                  )}
                </div>
              </div>

              {/* Two Column Layout: Description & AI Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Citizen Description */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Citizen Description
                    </h4>
                    <CategoryBadge category={complaint.category} />
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {complaint.description}
                  </p>

                  {complaint.photo_url && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <span className="text-xs font-medium text-slate-500 block mb-1">Attached Evidence:</span>
                      <a
                        href={complaint.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Evidence Photo
                      </a>
                    </div>
                  )}
                </div>

                {/* Sanitized AI Analysis Card */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Sanitized AI Analysis
                    </h4>
                    <button
                      type="button"
                      onClick={handleReanalyze}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-medium disabled:opacity-50"
                      title="Re-run AI Analysis"
                    >
                      <RotateCw className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} />
                      {analyzing ? "Analyzing..." : "Re-run"}
                    </button>
                  </div>

                  {complaint.ai_analysis ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-blue-950 block">AI Summary:</span>
                        <p className="text-slate-700 mt-0.5">{complaint.ai_analysis.summary}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100">
                        <div>
                          <span className="text-slate-500 block">AI Category:</span>
                          <span className="font-medium text-slate-800">
                            {getCategoryLabel(complaint.ai_analysis.category)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Confidence:</span>
                          <span className="font-medium text-slate-800">
                            {(complaint.ai_analysis.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Suggested Dept:</span>
                          <span className="font-medium text-slate-800">
                            {complaint.ai_analysis.suggested_department_category}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Safety Concern:</span>
                          <span className={`font-semibold ${complaint.ai_analysis.safety_concern ? "text-rose-600" : "text-slate-700"}`}>
                            {complaint.ai_analysis.safety_concern ? "Yes — Hazard" : "None detected"}
                          </span>
                        </div>
                      </div>

                      {complaint.ai_analysis.reasoning && userRole !== "citizen" && (
                        <div className="pt-2 border-t border-blue-100">
                          <span className="text-slate-500 block">Staff AI Reasoning:</span>
                          <p className="text-slate-600 italic mt-0.5">{complaint.ai_analysis.reasoning}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No AI analysis recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Duplicate Candidates Review Panel */}
              {complaint.duplicate_candidates && complaint.duplicate_candidates.length > 0 && (
                <div className="border border-purple-200 rounded-md bg-purple-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Copy className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Duplicate Candidates ({complaint.duplicate_candidates.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {complaint.duplicate_candidates.map((dup) => (
                      <div
                        key={dup.relationship_id}
                        className="bg-white border border-purple-200 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                            <span>{dup.tracking_id}</span>
                            <span className="text-purple-700 text-[11px] font-sans font-semibold bg-purple-100 px-1.5 py-0.5 rounded">
                              {(dup.similarity_score * 100).toFixed(0)}% Match
                            </span>
                            <span className="text-slate-500 text-[11px] font-sans">
                              State: {dup.review_state}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-1">{dup.summary || "No summary available"}</p>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            Submitted: {formatDateTime(dup.created_at)}
                          </span>
                        </div>

                        {/* Duplicate actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDuplicateDecision(dup.relationship_id, "confirmed_duplicate")}
                            disabled={reviewingDupId === dup.relationship_id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
                          >
                            Confirm Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateDecision(dup.relationship_id, "related_distinct")}
                            disabled={reviewingDupId === dup.relationship_id}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-medium disabled:opacity-50"
                          >
                            Distinct
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateDecision(dup.relationship_id, "rejected_duplicate")}
                            disabled={reviewingDupId === dup.relationship_id}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Assignment Operations (Staff Only) */}
              {userRole !== "citizen" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
                  {/* Status Transition Form */}
                  <div className="bg-white border border-slate-200 rounded-md p-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Update Complaint Status
                    </h4>
                    {statusFeedback && (
                      <div
                        className={`p-2.5 rounded text-xs font-medium mb-3 ${
                          statusFeedback.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {statusFeedback.msg}
                      </div>
                    )}

                    {allowedTransitions.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        This complaint is in terminal status ({getStatusLabel(complaint.status)}). No further transitions allowed.
                      </p>
                    ) : (
                      <form onSubmit={handleStatusChange} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Next Status Transition:
                          </label>
                          <select
                            value={targetStatus}
                            onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            required
                          >
                            <option value="">Select permitted transition...</option>
                            {allowedTransitions.map((st) => (
                              <option key={st} value={st}>
                                {getStatusLabel(st)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {targetStatus === "resolved" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Resolution Notes <span className="text-rose-600">*</span>:
                            </label>
                            <textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Detail how the issue was resolved..."
                              rows={2}
                              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Audit Note (optional):
                          </label>
                          <input
                            type="text"
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            placeholder="Optional remark for timeline..."
                            className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!targetStatus || statusUpdating}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          {statusUpdating ? "Applying Transition..." : "Confirm Status Transition"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Department Assignment Form */}
                  <div className="bg-white border border-slate-200 rounded-md p-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Department Assignment
                    </h4>
                    {assignFeedback && (
                      <div
                        className={`p-2.5 rounded text-xs font-medium mb-3 ${
                          assignFeedback.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {assignFeedback.msg}
                      </div>
                    )}

                    <form onSubmit={handleAssign} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Target Department:
                        </label>
                        <select
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          required
                        >
                          <option value="">Select active department...</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Assignment Note (optional):
                        </label>
                        <input
                          type="text"
                          value={assignNote}
                          onChange={(e) => setAssignNote(e.target.value)}
                          placeholder="Routing instructions or dispatch note..."
                          className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedDeptId || assigning}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {assigning ? "Assigning..." : "Assign Department"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Status Timeline / Audit History */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Audit Timeline & Event History
                </h4>

                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
                  {complaint.events && complaint.events.length > 0 ? (
                    complaint.events.map((ev) => (
                      <div key={ev.id} className="relative text-xs">
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-slate-900 capitalize">
                            {ev.event_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(ev.created_at)}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          {ev.actor ? (
                            <span>By: {ev.actor.full_name || "Staff"} ({ev.actor.role})</span>
                          ) : (
                            <span className="text-slate-400">By: System Automation</span>
                          )}
                          {ev.from_status && ev.to_status && (
                            <span className="ml-2 font-mono text-[11px]">
                              [{ev.from_status} &rarr; {ev.to_status}]
                            </span>
                          )}
                        </div>
                        {ev.metadata && (
                          <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 font-mono">
                            {JSON.stringify(ev.metadata)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No events logged yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
