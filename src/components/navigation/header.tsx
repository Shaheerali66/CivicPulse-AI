/**
 * src/components/navigation/header.tsx
 *
 * PRD-04 :: Navigation & Application Header
 * Consistent navigation across Officer, Admin, and Citizen surfaces.
 * Solid colors only (no gradients), Lucide icons, role indicators,
 * and integrated in-app notifications.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Layers,
  AlertTriangle,
  MapPin,
  Settings,
  FilePlus,
  Search,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";

interface AppHeaderProps {
  currentRole?: "officer" | "reviewer" | "admin" | "citizen";
  onRoleSwitch?: (role: "officer" | "reviewer" | "admin" | "citizen") => void;
  onSelectComplaint?: (complaintId: string) => void;
}

export function AppHeader({
  currentRole = "officer",
  onRoleSwitch,
  onSelectComplaint,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navLinks = [
    {
      href: "/dashboard",
      label: "Officer Operations",
      icon: <Layers className="w-4 h-4" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/admin",
      label: "Administrator",
      icon: <Settings className="w-4 h-4" />,
      active: pathname.startsWith("/admin"),
    },
    {
      href: "/report",
      label: "Report Issue",
      icon: <FilePlus className="w-4 h-4" />,
      active: pathname === "/report",
    },
    {
      href: "/track",
      label: "Track Complaint",
      icon: <Search className="w-4 h-4" />,
      active: pathname === "/track",
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                CP
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight block leading-none">
                  CivicPulse AI
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-none">
                  Hyderabad Municipal
                </span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    link.active
                      ? "bg-slate-100 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right actions: Role indicator/switcher & Notifications */}
          <div className="flex items-center gap-3">
            {/* Notifications Popover */}
            <NotificationsPopover onSelectComplaint={onSelectComplaint} />

            {/* Role Badge / Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                aria-expanded={roleMenuOpen}
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="capitalize">{currentRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Active Role
                  </div>
                  {(["officer", "reviewer", "admin", "citizen"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        if (onRoleSwitch) onRoleSwitch(r);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between capitalize ${
                        currentRole === r ? "font-bold text-blue-600 bg-blue-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{r} View</span>
                      {currentRole === r && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <form method="POST" action="/api/auth/signout">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
