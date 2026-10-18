import React from "react";
import Link from "next/link";
import { Building2, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#CBD5E1] bg-[#0A2540] text-[#CBD5E1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>CivicPulse AI</span>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Transparent, AI-assisted municipal grievance intake and tracking platform for citizens.
            </p>
            <div className="text-xs text-[#94A3B8] pt-2">
              Demonstration prototype built for NYLP AI Hackathon 2026.
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Citizen Services
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/report" className="hover:text-white transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link href="/report/ai" className="hover:text-white transition-colors">
                  AI-Assisted Reporting
                </Link>
              </li>
              <li>
                <Link href="/report/manual" className="hover:text-white transition-colors">
                  Manual Reporting
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track by ID
                </Link>
              </li>
              <li>
                <Link href="/my-complaints" className="hover:text-white transition-colors">
                  My Complaint History
                </Link>
              </li>
            </ul>
          </div>

          {/* Transparency & Legal */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Disclosures & Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy & Data Security
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Support & Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Notice & Limitations */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Platform Disclaimers
            </h3>
            <div className="text-xs text-[#94A3B8] space-y-2 leading-relaxed">
              <p>
                CivicPulse AI records citizen complaints and provides structured triage. A tracking ID verifies platform receipt.
              </p>
              <p>
                Direct municipal forwarding is subject to authorized integration. No CNIC or sensitive personal credentials are required.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#1E3A5F] flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-4">
          <p>© 2026 CivicPulse AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
