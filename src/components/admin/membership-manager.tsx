/**
 * src/components/admin/membership-manager.tsx
 *
 * PRD-04 :: Administrator Department Membership Manager
 * Onboard staff officers with login credentials, department assignment,
 * and role management (officer, reviewer, head).
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  UserX,
  RotateCw,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
  Mail,
  User,
} from "lucide-react";
import type { DbDepartment } from "@/types/database";

export function MembershipManager() {
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onboardTab, setOnboardTab] = useState<"onboard" | "assign">("onboard");

  // Onboard new officer fields
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPassword, setOfficerPassword] = useState("Officer@123");
  const [officerPhone, setOfficerPhone] = useState("");

  // Assign existing UUID field
  const [userIdInput, setUserIdInput] = useState("");

  // Common fields
  const [targetDeptId, setTargetDeptId] = useState("");
  const [targetRole, setTargetRole] = useState<"officer" | "reviewer" | "head">("officer");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedDeptFilter
        ? `/api/admin/members?department_id=${selectedDeptFilter}`
        : "/api/admin/members";

      const [membersRes, deptsRes] = await Promise.all([
        fetch(url),
        fetch("/api/admin/departments"),
      ]);

      const membersJson = await membersRes.json();
      const deptsJson = await deptsRes.json();

      if (membersJson.success) setMembers(membersJson.data || []);
      if (deptsJson.success) setDepartments(deptsJson.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading membership data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeptFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);
      setSuccessMsg(null);

      if (onboardTab === "onboard") {
        // Direct Staff Onboarding with Supabase Auth credentials
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: officerName.trim(),
            email: officerEmail.trim(),
            password: officerPassword.trim() || "Officer@123",
            phone: officerPhone.trim() || undefined,
            department_id: targetDeptId,
            role: targetRole,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to onboard staff officer.");
        }

        setSuccessMsg(`Officer ${officerName} successfully created & assigned!`);
      } else {
        // Assign existing user by UUID
        const res = await fetch("/api/admin/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userIdInput.trim(),
            department_id: targetDeptId,
            role: targetRole,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to assign membership.");
        }

        setSuccessMsg("Member successfully assigned to department!");
      }

      // Reset and refresh
      setTimeout(() => {
        setIsModalOpen(false);
        setOfficerName("");
        setOfficerEmail("");
        setOfficerPassword("Officer@123");
        setOfficerPhone("");
        setUserIdInput("");
        setTargetDeptId("");
        setSuccessMsg(null);
      }, 1200);

      await fetchData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error processing request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to revoke membership for ${memberName}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_id: membershipId }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to revoke membership.");
      }
    } catch {
      alert("Error revoking membership.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-md p-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Filter by Department:
          </label>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError(null);
            setSuccessMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Onboard / Assign Officer
        </button>
      </div>

      {/* Membership Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Staff Name / ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading memberships...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No department memberships found for current filter.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const name = m.profile?.display_name || m.profile?.full_name || "Staff Member";
                const deptName = m.department?.name || "Unknown Department";

                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{m.user_id}</div>
                    </td>
                    <td className="py-3 px-4 flex items-center gap-1.5 text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {deptName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                        <Shield className="w-3 h-3 text-indigo-500" />
                        {m.role || m.membership_role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          m.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {m.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.is_active && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(m.id, name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-xs font-semibold"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Onboard / Assign Staff Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Officer Onboarding & Access</h3>
                <p className="text-[11px] text-slate-500">Create login credentials or assign an existing account</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/60 p-1">
              <button
                type="button"
                onClick={() => setOnboardTab("onboard")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                  onboardTab === "onboard"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Onboard New Officer
              </button>
              <button
                type="button"
                onClick={() => setOnboardTab("assign")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                  onboardTab === "assign"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assign by User UUID
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {onboardTab === "onboard" ? (
                <>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Full Name / Display Name <span className="text-rose-600">*</span>:
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        placeholder="e.g. Officer Tariq Ahmed"
                        className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Official Email <span className="text-rose-600">*</span>:
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="email"
                          value={officerEmail}
                          onChange={(e) => setOfficerEmail(e.target.value)}
                          placeholder="officer@civicpulse.gov"
                          className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Temporary Password <span className="text-rose-600">*</span>:
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={officerPassword}
                          onChange={(e) => setOfficerPassword(e.target.value)}
                          placeholder="Officer@123"
                          className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-[11px]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    User UUID <span className="text-rose-600">*</span>:
                  </label>
                  <input
                    type="text"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                    className="w-full font-mono border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Target Department <span className="text-rose-600">*</span>:
                  </label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  >
                    <option value="">Select department...</option>
                    {departments
                      .filter((d) => d.is_active)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Department Role <span className="text-rose-600">*</span>:
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  >
                    <option value="officer">Field / Operations Officer</option>
                    <option value="reviewer">Triage / Human Reviewer</option>
                    <option value="head">Department Head</option>
                  </select>
                </div>
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
                  {submitting ? "Processing..." : onboardTab === "onboard" ? "Onboard Officer" : "Assign Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
