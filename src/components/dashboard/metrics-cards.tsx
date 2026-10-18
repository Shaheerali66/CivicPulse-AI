/**
 * src/components/dashboard/metrics-cards.tsx
 *
 * PRD-04 :: Officer Dashboard Metrics Cards
 * Operational summary cards drawn from real database queries (/api/complaints/summary).
 * No hardcoded or fake numbers.
 * Supports click-to-filter to quickly jump into specific queues.
 */

"use client";

import React from "react";
import {
  Inbox,
  AlertTriangle,
  FileCheck,
  RotateCw,
  CheckCircle2,
  Flame,
  UserCheck,
  Layers,
} from "lucide-react";
import type { DashboardSummary } from "@/types/database";

interface MetricsCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onFilterClick?: (filterKey: string, value: string | boolean | undefined) => void;
  activeFilter?: { key: string; value: any };
}

export function MetricsCards({
  summary,
  loading,
  onFilterClick,
  activeFilter,
}: MetricsCardsProps) {
  const cards = [
    {
      id: "total",
      label: "Total Complaints",
      count: summary?.total ?? 0,
      icon: <Layers className="w-5 h-5 text-slate-700" />,
      color: "border-slate-300 bg-white",
      filterKey: "status",
      filterValue: undefined,
    },
    {
      id: "submitted",
      label: "New / Submitted",
      count: summary?.submitted ?? 0,
      icon: <Inbox className="w-5 h-5 text-blue-600" />,
      color: "border-blue-200 bg-blue-50/50",
      filterKey: "status",
      filterValue: "submitted",
    },
    {
      id: "needs_review",
      label: "Needs Review",
      count: summary?.needs_review ?? 0,
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      color: "border-amber-200 bg-amber-50/50",
      filterKey: "needs_review",
      filterValue: true,
    },
    {
      id: "assigned",
      label: "Assigned",
      count: summary?.assigned ?? 0,
      icon: <FileCheck className="w-5 h-5 text-indigo-600" />,
      color: "border-indigo-200 bg-indigo-50/50",
      filterKey: "status",
      filterValue: "assigned",
    },
    {
      id: "in_progress",
      label: "In Progress",
      count: summary?.in_progress ?? 0,
      icon: <RotateCw className="w-5 h-5 text-cyan-600" />,
      color: "border-cyan-200 bg-cyan-50/50",
      filterKey: "status",
      filterValue: "in_progress",
    },
    {
      id: "resolved",
      label: "Resolved",
      count: summary?.resolved ?? 0,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      color: "border-emerald-200 bg-emerald-50/50",
      filterKey: "status",
      filterValue: "resolved",
    },
    {
      id: "high_critical",
      label: "High / Critical",
      count: summary?.high_critical ?? 0,
      icon: <Flame className="w-5 h-5 text-rose-600" />,
      color: "border-rose-200 bg-rose-50/50",
      filterKey: "priority",
      filterValue: "critical",
    },
    {
      id: "my_assigned",
      label: "My Active Queue",
      count: summary?.my_assigned ?? 0,
      icon: <UserCheck className="w-5 h-5 text-purple-600" />,
      color: "border-purple-200 bg-purple-50/50",
      filterKey: "my_queue",
      filterValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((c) => {
        const isActive =
          activeFilter &&
          activeFilter.key === c.filterKey &&
          activeFilter.value === c.filterValue;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onFilterClick && onFilterClick(c.filterKey, c.filterValue)}
            className={`p-3.5 rounded-md border text-left transition-all ${c.color} ${
              isActive ? "ring-2 ring-blue-600 shadow-sm" : "hover:shadow-sm hover:border-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-1 rounded bg-white/80 border border-slate-100">{c.icon}</span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {loading ? <span className="inline-block w-8 h-5 bg-slate-200 animate-pulse rounded" /> : c.count}
              </div>
              <div className="text-[11px] font-medium text-slate-600 truncate mt-0.5" title={c.label}>
                {c.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
