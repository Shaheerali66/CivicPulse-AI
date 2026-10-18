/**
 * src/components/ui/badges.tsx
 *
 * PRD-04 :: UI Badges — Accessible status, priority, category, and safety badges.
 * Solid colors only, Lucide icons, no emojis.
 */

import React from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
  RotateCw,
  ShieldAlert,
  Flame,
  AlertCircle,
  Info,
} from "lucide-react";
import type { ComplaintStatus, PriorityBand, ComplaintCategory } from "@/types/database";
import { getCategoryLabel, getStatusLabel } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
export function StatusBadge({ status }: { status: ComplaintStatus | string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    submitted: {
      label: "Submitted",
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    analyzing: {
      label: "Analyzing",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <RotateCw className="w-3.5 h-3.5 animate-spin" />,
    },
    needs_review: {
      label: "Needs Review",
      bg: "bg-amber-100",
      text: "text-amber-800",
      border: "border-amber-300",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    assigned: {
      label: "Assigned",
      bg: "bg-indigo-100",
      text: "text-indigo-800",
      border: "border-indigo-300",
      icon: <FileCheck className="w-3.5 h-3.5" />,
    },
    in_progress: {
      label: "In Progress",
      bg: "bg-cyan-100",
      text: "text-cyan-800",
      border: "border-cyan-300",
      icon: <RotateCw className="w-3.5 h-3.5" />,
    },
    resolved: {
      label: "Resolved",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      border: "border-emerald-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    closed: {
      label: "Closed",
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    rejected: {
      label: "Rejected",
      bg: "bg-rose-100",
      text: "text-rose-800",
      border: "border-rose-300",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const style = config[status] ?? {
    label: getStatusLabel(status),
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Priority Badge
// ---------------------------------------------------------------------------
export function PriorityBadge({
  band,
  score,
}: {
  band: PriorityBand | string | null | undefined;
  score?: number | null;
}) {
  const normalized = (band ?? "low") as PriorityBand;
  const config: Record<
    PriorityBand,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    low: {
      label: "Low",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <Info className="w-3.5 h-3.5" />,
    },
    medium: {
      label: "Medium",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    high: {
      label: "High",
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    critical: {
      label: "Critical",
      bg: "bg-rose-100",
      text: "text-rose-800",
      border: "border-rose-300",
      icon: <Flame className="w-3.5 h-3.5" />,
    },
  };

  const style = config[normalized] ?? config.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
      title={score !== undefined && score !== null ? `Priority score: ${score.toFixed(2)}` : undefined}
    >
      {style.icon}
      {style.label}
      {score !== undefined && score !== null && (
        <span className="opacity-75 text-[10px]">({score.toFixed(2)})</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Category Badge
// ---------------------------------------------------------------------------
export function CategoryBadge({ category }: { category: ComplaintCategory | string | null | undefined }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
      {getCategoryLabel(category)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Safety Hazard Badge
// ---------------------------------------------------------------------------
export function SafetyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white"
      title="Safety Hazard Flagged"
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      SAFETY HAZARD
    </span>
  );
}

// ---------------------------------------------------------------------------
// Human Review Needed Badge
// ---------------------------------------------------------------------------
export function ReviewNeededBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white"
      title="Awaiting Human Verification"
    >
      <AlertTriangle className="w-3 h-3" />
      REVIEW REQUIRED
    </span>
  );
}

// ---------------------------------------------------------------------------
// Duplicate Flag Badge
// ---------------------------------------------------------------------------
export function DuplicateBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
      title="Potential Duplicate Identified"
    >
      Duplicate Candidate
    </span>
  );
}
