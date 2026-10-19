/**
 * src/app/admin/page.tsx
 *
 * PRD-04 :: Administrator Dashboard (DASH-04)
 * System-level operational control center:
 * - Real system metrics & analytics (status, category, priority, workload, AI fallback counts)
 * - Department configuration management (create, edit, soft deactivation)
 * - Staff membership & role management (officer, reviewer, head)
 */

"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Building2,
  Users,
  Settings,
  Shield,
  Layers,
  Info,
} from "lucide-react";
import { AppHeader } from "@/components/navigation/header";
import { AdminAnalyticsView } from "@/components/admin/analytics-view";
import { DepartmentConfig } from "@/components/admin/department-config";
import { MembershipManager } from "@/components/admin/membership-manager";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "departments" | "members">("analytics");
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-slate-900 text-white">
                <Shield className="w-4 h-4" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                System Administration
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Platform telemetry, municipal department configuration, and staff access controls.
            </p>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center bg-white border border-slate-300 rounded-md p-1 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "analytics"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics & Telemetry
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("departments")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "departments"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Departments
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === "members"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Staff Membership
            </button>
          </div>
        </div>

        {/* Demo Environment Notice Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Demo Environment Notice:</span> All administrative metrics,
            status changes, and membership assignments are validated server-side and recorded in audit logs.
            Jurisdiction mappings reflect the Hyderabad, Sindh demonstration configuration.
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "analytics" && <AdminAnalyticsView />}
        {activeTab === "departments" && <DepartmentConfig />}
        {activeTab === "members" && <MembershipManager />}
      </main>
    </div>
  );
}
