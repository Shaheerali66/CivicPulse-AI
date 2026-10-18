/**
 * src/components/admin/department-config.tsx
 *
 * PRD-04 :: Administrator Department Configuration
 * Create, edit, and deactivate municipal departments.
 * Server-side validated with audit logging.
 * Soft deactivation preserves all complaint history.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Power,
  RotateCw,
  AlertTriangle,
  Check,
  X,
  Users,
} from "lucide-react";
import type { DbDepartment } from "@/types/database";

export function DepartmentConfig() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DbDepartment | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error("Failed to load departments.");
      const json = await res.json();
      if (json.success && json.data) {
        setDepartments(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch departments.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormName("");
    setFormSlug("");
    setFormDesc("");
    setFormActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: DbDepartment) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormSlug(dept.slug);
    setFormDesc(dept.description || "");
    setFormActive(dept.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase(),
        description: formDesc.trim() || undefined,
        is_active: formActive,
      };

      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments";
      const method = editingDept ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save department.");
      }

      setIsModalOpen(false);
      await fetchDepartments();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error saving department.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActiveStatus = async (dept: DbDepartment) => {
    const actionName = dept.is_active ? "deactivate" : "activate";
    if (
      !confirm(
        `Are you sure you want to ${actionName} "${dept.name}"? Existing complaint history will remain preserved.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !dept.is_active }),
      });
      if (res.ok) {
        await fetchDepartments();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to update department status.");
      }
    } catch (err) {
      alert("Network error updating department.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-md p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Municipal Department Configuration
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hyderabad, Sindh, Pakistan demo jurisdiction mapping. Deactivation preserves complaint history.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Department Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Department Name</th>
              <th className="py-3 px-4">Slug Identifier</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Staff Count</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading departments...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((dept) => {
                const memberCount = Array.isArray(dept.member_count)
                  ? dept.member_count[0]?.count ?? 0
                  : dept.member_count ?? 0;

                return (
                  <tr key={dept.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {dept.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{dept.slug}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {dept.description || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          dept.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-slate-700 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {memberCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                          title="Edit department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActiveStatus(dept)}
                          className={`p-1 rounded hover:bg-slate-100 ${
                            dept.is_active ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                          }`}
                          title={dept.is_active ? "Deactivate department" : "Activate department"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingDept ? "Edit Department" : "Create New Department"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Department Name <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingDept) {
                      setFormSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "")
                      );
                    }
                  }}
                  placeholder="e.g. Hyderabad Water & Sewerage Board"
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Slug (lowercase alphanumeric with hyphens) <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. water-sewerage"
                  pattern="^[a-z0-9-]+$"
                  className="w-full font-mono border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description (optional):</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Responsibilities, scope, jurisdiction note..."
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dept-active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="dept-active" className="font-medium text-slate-700">
                  Active (Receives new complaint routing)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
