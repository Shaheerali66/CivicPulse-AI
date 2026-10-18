import React from "react";
import { Shield, Lock, EyeOff, Server } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white border border-[#CBD5E1] p-8 rounded space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] text-[#0F3F6E] text-xs font-semibold rounded mb-3">
            <Shield className="w-3.5 h-3.5" />
            Civic Privacy Standards
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Last updated: October 2026 | Demonstration Governance Notice
          </p>
        </div>

        <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              1. Data Minimization Principles
            </h2>
            <p>
              CivicPulse AI adheres to strict data minimization. We do not require or collect National Identity Card (CNIC) numbers, biometric identifiers, or residential registry details to lodge a public civic complaint.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              2. Optional Photographic & Geolocation Information
            </h2>
            <p>
              Citizens may report civic issues with or without providing photographs or exact coordinates. Geolocation requests are only triggered upon direct user interaction, never automatically on page load. All uploaded issue photographs are stored in private storage containers and are never exposed via unauthenticated public directories.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              3. AI Model Processing Safeguards
            </h2>
            <p>
              Complaint descriptions sent to our AI triage engine are sanitized. Model internal deliberation, chain-of-thought tokens, and raw embeddings are kept strictly server-side and are never returned to client browsers or unverified actors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              4. Public Tracking Shield
            </h2>
            <p>
              When a citizen checks a report using its Tracking ID, the system surfaces only non-sensitive attributes: category, status history, assigned municipal department, and civic summary. Contact phone numbers, email addresses, and personal notes remain confidential.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
