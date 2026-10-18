"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, X, PlusCircle, Search, List, Shield, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/report", label: "Report Issue", icon: PlusCircle },
    { href: "/track", label: "Track Status", icon: Search },
    { href: "/my-complaints", label: "My Complaints", icon: List },
    { href: "/contact", label: "Contact", icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#CBD5E1] bg-white">
      {/* Top emergency / pilot notice bar */}
      <div className="bg-[#0A2540] text-white text-xs py-1.5 px-4 text-center">
        <span className="font-semibold text-amber-300 mr-2">Pilot Demonstration</span>
        Target Area: Hyderabad, Sindh. For emergency life-threats call 1122.
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-[#0F3F6E] rounded flex items-center justify-center text-white font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-[#0A2540] leading-none">
              CivicPulse <span className="text-[#0F3F6E]">AI</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase mt-0.5">
              Citizen Reporting System
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                  isActive
                    ? "bg-[#F1F5F9] text-[#0F3F6E] font-semibold"
                    : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F3F6E]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/report">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              File Report
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded text-[#334155] hover:bg-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#CBD5E1] bg-white px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded ${
                  isActive
                    ? "bg-[#F1F5F9] text-[#0F3F6E] font-semibold"
                    : "text-[#334155] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className="w-5 h-5 text-[#64748B]" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
            <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="md" className="w-full">
                Sign In / Citizen Account
              </Button>
            </Link>
            <Link href="/report" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" />
                Report an Issue
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
