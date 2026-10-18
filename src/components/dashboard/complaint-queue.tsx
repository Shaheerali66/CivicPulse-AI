/**
 * src/components/dashboard/complaint-queue.tsx
 *
 * PRD-04 :: Officer Dashboard Complaint Queue
 * Paginated queue with server-side filtering, honest loading/empty states,
 * and responsive table/mobile card layouts.
 */

"use client";

import React from "react";
import {
  Search,
  Filter,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Inbox,
  ShieldAlert,
  Copy,
  Calendar,
  X,
} from "lucide-react";
import type { DbComplaint, DbDepartment, ComplaintCategory, ComplaintStatus, PriorityBand } from "@/types/database";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, PRIORITY_BANDS } from "@/types/database";
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
  SafetyBadge,
  ReviewNeededBadge,
  DuplicateBadge,
} from "@/components/ui/badges";
import { formatRelativeTime, formatDateTime, getCategoryLabel, getStatusLabel, truncate } from "@/lib/utils";

export interface QueueFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  priority?: PriorityBand;
  department_id?: string;
  needs_review?: boolean;
  is_duplicate?: boolean;
  date_from?: string;
  date_to?: string;
}

interface ComplaintQueueProps {
  complaints: DbComplaint[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  filters: QueueFilters;
  departments: DbDepartment[];
  onFilterChange: (newFilters: Partial<QueueFilters>) => void;
  onResetFilters: () => void;
  onSelectComplaint: (complaint: DbComplaint) => void;
  onReviewComplaint?: (complaint: DbComplaint) => void;
  onRefresh: () => void;
}

export function ComplaintQueue({
  complaints,
  total,
  page,
  pageSize,
  loading,
  error,
  filters,
  departments,
  onFilterChange,
  onResetFilters,
  onSelectComplaint,
  onReviewComplaint,
  onRefresh,
}: ComplaintQueueProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.status) ||
    Boolean(filters.category) ||
    Boolean(filters.priority) ||
    Boolean(filters.department_id) ||
    filters.needs_review !== undefined ||
    filters.is_duplicate !== undefined ||
    Boolean(filters.date_from) ||
    Boolean(filters.date_to);

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col">
      {/* Search and Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title or tracking ID (e.g. CP-)..."
              value={filters.search || ""}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined, page: 1 })}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900"
            />
          </div>

          {/* Quick toggles & actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Needs review quick toggle */}
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  needs_review: filters.needs_review ? undefined : true,
                  page: 1,
                })
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                filters.needs_review
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Human Review Only
            </button>

            {/* Duplicate quick toggle */}
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  is_duplicate: filters.is_duplicate ? undefined : true,
                  page: 1,
                })
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                filters.is_duplicate
                  ? "bg-purple-100 border-purple-300 text-purple-900"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-purple-600" />
              Duplicates Only
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 bg-white border border-slate-300 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh queue"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Detailed Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-xs pt-2 border-t border-slate-200">
          {/* Status */}
          <select
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange({ status: (e.target.value as ComplaintStatus) || undefined, page: 1 })
            }
            className="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Statuses</option>
            {COMPLAINT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {getStatusLabel(st)}
              </option>
            ))}
          </select>

          {/* Category */}
          <select
            value={filters.category || ""}
            onChange={(e) =>
              onFilterChange({ category: (e.target.value as ComplaintCategory) || undefined, page: 1 })
            }
            className="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Categories</option>
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={filters.priority || ""}
            onChange={(e) =>
              onFilterChange({ priority: (e.target.value as PriorityBand) || undefined, page: 1 })
            }
            className="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Priorities</option>
            {PRIORITY_BANDS.map((p) => (
              <option key={p} value={p}>
                Priority: {p.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={filters.department_id || ""}
            onChange={(e) =>
              onFilterChange({ department_id: e.target.value || undefined, page: 1 })
            }
            className="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={filters.pageSize}
            onChange={(e) => onFilterChange({ pageSize: Number(e.target.value), page: 1 })}
            className="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Main Table View (Desktop & Tablet) */}
      <div className="hidden md:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Tracking ID</th>
              <th className="py-3 px-4">Complaint Title & Location</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-48 mb-1" /><div className="h-3 bg-slate-100 rounded w-32" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-rose-600">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold">{error}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-2 text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded text-slate-800"
                  >
                    Retry loading
                  </button>
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <Inbox className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-700">No complaints found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {hasActiveFilters
                      ? "Try clearing some filters to expand your search."
                      : "There are currently no complaints in your authorized operational queue."}
                  </p>
                </td>
              </tr>
            ) : (
              complaints.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectComplaint(c)}
                >
                  {/* Tracking ID */}
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600 group-hover:underline">
                    {c.tracking_id}
                  </td>

                  {/* Title & Location */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {truncate(c.title, 48)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{c.location_label || "No location label"}</span>
                      {c.safety_concern && <SafetyBadge />}
                      {c.needs_human_review && <ReviewNeededBadge />}
                      {c.is_duplicate && <DuplicateBadge />}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <CategoryBadge category={c.category} />
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4">
                    <PriorityBadge band={c.priority_band} score={c.priority_score} />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 text-slate-600">
                    {(c as any).department?.name || "Unassigned"}
                  </td>

                  {/* Submitted */}
                  <td className="py-3 px-4 text-slate-500" title={formatDateTime(c.created_at)}>
                    {formatRelativeTime(c.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {c.needs_human_review && onReviewComplaint && (
                        <button
                          type="button"
                          onClick={() => onReviewComplaint(c)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold"
                          title="Review AI classification"
                        >
                          Review
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectComplaint(c)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Structured Card List (Phones & Small Screens) */}
      <div className="md:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-xs">Loading queue...</div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No complaints found.</div>
        ) : (
          complaints.map((c) => (
            <div
              key={c.id}
              className="p-4 space-y-2 hover:bg-slate-50 transition-colors"
              onClick={() => onSelectComplaint(c)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600">{c.tracking_id}</span>
                <StatusBadge status={c.status} />
              </div>

              <h4 className="text-sm font-semibold text-slate-900 leading-snug">{c.title}</h4>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <CategoryBadge category={c.category} />
                <PriorityBadge band={c.priority_band} score={c.priority_score} />
                {c.safety_concern && <SafetyBadge />}
                {c.needs_human_review && <ReviewNeededBadge />}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span>{c.location_label || "No location label"}</span>
                <span>{formatRelativeTime(c.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {total === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(page * pageSize, total)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{total}</span> complaints
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterChange({ page: Math.max(1, page - 1) })}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <span className="px-2 font-medium">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onFilterChange({ page: Math.min(totalPages, page + 1) })}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
