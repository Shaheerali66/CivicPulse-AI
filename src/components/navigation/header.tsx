/**
 * src/components/navigation/header.tsx
 *
 * PRD-04 :: Navigation & Application Header
 * Officer / Admin surface header with Log Out button.
 * Uses Supabase browser client to clear auth session, then redirects to login.
 */

"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, Settings, FilePlus, Search, LogOut } from "lucide-react";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { createClient } from "@/lib/supabase/client";

interface AppHeaderProps {
  onSelectComplaint?: (complaintId: string) => void;
}

export function AppHeader({ onSelectComplaint }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

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

  const handleLogOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // session may already be invalid — still redirect
    }
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
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

          {/* Right: Notifications + Log Out */}
          <div className="flex items-center gap-3">
            <NotificationsPopover onSelectComplaint={onSelectComplaint} />

            <button
              type="button"
              onClick={handleLogOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
