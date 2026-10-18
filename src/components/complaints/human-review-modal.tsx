/**
 * src/components/complaints/human-review-modal.tsx
 *
 * PRD-04 :: Human-Review Queue — Specialized Review & Override Dialog
 * Allows authorized reviewers to:
 * - Accept AI classification
 * - Override category or department
 * - Mark for additional information
 * - Confirm/reject duplicate relationships
 * - Record reviewer identity & timestamps for auditing
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Building2,
  Tag,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import type { DbComplaint, DbDepartment, ComplaintCategory } from "@/types/database";
import { COMPLAINT_CATEGORIES } from "@/types/database";
import { getCategoryLabel } from "@/lib/utils";
import { CategoryBadge, PriorityBadge } from "@/components/ui/badges";

interface HumanReviewModalProps {
  complaint: DbComplaint;
  onClose: () => void;
  onSuccess: () => void;
}

export function HumanReviewModal({ complaint, onClose, onSuccess }: HumanReviewModalProps) {
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [action, setAction] = useState<
    "accept_classification" | "change_category" | "change_department" | "mark_needs_info" | "return_to_workflow"
  >("accept_classification");

  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory>(
    (complaint.category as ComplaintCategory) || "other"
  );
  const [selectedDeptId, setSelectedDeptId] = useState<string>(complaint.department_id || "");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await fetch("/api/departments");
        if (res.ok) {
          const json = await res.json();
          if (json.success) setDepartments(json.data || []);
        }
      } catch (e) {
        console.warn("Failed loading departments", e);
      }
    }
    loadDepts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        action,
        notes: reviewNotes.trim() || undefined,
      };

      if (action === "change_category") {
        payload.new_category = selectedCategory;
      }
      if (action === "change_department") {
        if (!selectedDeptId) {
          setError("Please select a target department");
          setSubmitting(false);
          return;
        }
        payload.new_department_id = selectedDeptId;
      }

      const res = await fetch(`/api/complaints/${complaint.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit review decision");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-bold text-amber-950">
              Human Review & Triage — {complaint.tracking_id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
              {error}
            </div>
          )}

          {/* AI vs Original Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2">
            <div>
              <span className="font-semibold text-slate-700">Citizen Report:</span>
              <p className="text-slate-900 font-medium mt-0.5">{complaint.title}</p>
              <p className="text-slate-600 mt-1 line-clamp-3">{complaint.description}</p>
            </div>

            {complaint.ai_analysis && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-blue-900">AI Assessment:</span>
                <p className="text-slate-700 mt-0.5">{complaint.ai_analysis.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Confidence: {(complaint.ai_analysis.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    Category: {getCategoryLabel(complaint.ai_analysis.category)}
                  </span>
                  {complaint.safety_concern && (
                    <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Safety Flagged
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Select Review Decision:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: "accept_classification", label: "Accept AI Classification", desc: "Confirm suggested category and route to workflow" },
                { id: "change_category", label: "Override Category", desc: "Correct category classification" },
                { id: "change_department", label: "Re-route Department", desc: "Send to different municipal department" },
                { id: "mark_needs_info", label: "Needs More Info", desc: "Flag for citizen follow-up" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex flex-col p-3 rounded border cursor-pointer transition-colors ${
                    action === opt.id
                      ? "bg-blue-50 border-blue-600 text-blue-950 ring-1 ring-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="review_action"
                      checked={action === opt.id}
                      onChange={() => setAction(opt.id as any)}
                      className="text-blue-600"
                    />
                    {opt.label}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 pl-5">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional inputs */}
          {action === "change_category" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ComplaintCategory)}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === "change_department" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Department:
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reviewer Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Justification / Notes (Audited):
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Reason for decision, overrides, or instructions for field officer..."
              rows={2}
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving Decision..." : "Submit Review Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
