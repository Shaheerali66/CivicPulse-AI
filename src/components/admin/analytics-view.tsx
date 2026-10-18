/**
 * src/components/admin/analytics-view.tsx
 *
 * PRD-04 :: Administrator Dashboard — Real System Analytics View
 * System-level metrics, status distribution, workload breakdown,
 * review queue size, and AI failure diagnostics.
 */

"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Building2,
  TrendingUp,
  Flame,
  Clock,
  ShieldAlert,
} from "lucide-react";
import type { AdminStats } from "@/types/database";
import { getCategoryLabel, getStatusLabel } from "@/lib/utils";

export function AdminAnalyticsView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin access required.");
        throw new Error("Failed to load admin statistics.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch stats.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm">Calculating real-time database analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-md text-center">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-rose-900">{error || "Failed to load analytics"}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total System Complaints</span>
            <Layers className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total_complaints}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">{stats.period_label}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Human Review Queue</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">{stats.review_queue_size}</div>
          <span className="text-[11px] text-amber-600 mt-1 block">Awaiting human decision</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Resolved (Last 30 Days)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">
            {stats.resolved_last_30_days}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Successfully resolved</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AI Provider Fallbacks</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-2">{stats.ai_failure_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Triaged manually safely</span>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            Status Distribution
          </h4>
          <div className="space-y-2 text-xs">
            {Object.entries(stats.complaints_by_status).map(([st, count]) => {
              const pct = stats.total_complaints > 0 ? (count / stats.total_complaints) * 100 : 0;
              return (
                <div key={st}>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>{getStatusLabel(st)}</span>
                    <span className="text-slate-900 font-semibold">
                      {count} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Top Issue Categories
          </h4>
          <div className="space-y-2 text-xs">
            {Object.entries(stats.complaints_by_category).map(([cat, count]) => {
              const pct = stats.total_complaints > 0 ? (count / stats.total_complaints) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>{getCategoryLabel(cat)}</span>
                    <span className="text-slate-900 font-semibold">
                      {count} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-600" />
            Priority Breakdown (S-Formula)
          </h4>
          <div className="space-y-3 text-xs">
            {Object.entries(stats.complaints_by_priority).map(([band, count]) => {
              const colors: Record<string, string> = {
                critical: "bg-rose-600 text-rose-800",
                high: "bg-orange-500 text-orange-800",
                medium: "bg-amber-500 text-amber-800",
                low: "bg-emerald-600 text-emerald-800",
              };
              const pct = stats.total_complaints > 0 ? (count / stats.total_complaints) * 100 : 0;
              return (
                <div key={band}>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="capitalize font-semibold text-slate-800">{band}</span>
                    <span className="text-slate-900 font-semibold">
                      {count} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${colors[band] || "bg-blue-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Workload Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Departmental Workload & Throughput
          </h4>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold">
              <th className="py-2.5 px-4">Department</th>
              <th className="py-2.5 px-4">Total Assigned</th>
              <th className="py-2.5 px-4">Open / In Progress</th>
              <th className="py-2.5 px-4">Resolved</th>
              <th className="py-2.5 px-4">Resolution Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {stats.department_workload.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No active department records found.
                </td>
              </tr>
            ) : (
              stats.department_workload.map((d: any) => {
                const total = Array.isArray(d.total) ? d.total[0]?.count ?? 0 : d.total ?? 0;
                const open = Array.isArray(d.open) ? d.open[0]?.count ?? 0 : d.open ?? 0;
                const resolved = Math.max(0, total - open);
                const rate = total > 0 ? ((resolved / total) * 100).toFixed(0) : "0";

                return (
                  <tr key={d.id || d.department_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {d.name || d.department_name}
                    </td>
                    <td className="py-3 px-4 font-mono">{total}</td>
                    <td className="py-3 px-4 font-mono text-amber-700 font-medium">{open}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-medium">{resolved}</td>
                    <td className="py-3 px-4 font-mono">{rate}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
