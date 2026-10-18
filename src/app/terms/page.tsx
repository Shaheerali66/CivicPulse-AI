import React from "react";
import { FileText, AlertCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white border border-[#CBD5E1] p-8 rounded space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] text-[#0F3F6E] text-xs font-semibold rounded mb-3">
            <FileText className="w-3.5 h-3.5" />
            Terms of Use & Limitations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
            Terms of Service & Demonstration Notice
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Last updated: October 2026 | NYLP AI Hackathon Pilot
          </p>
        </div>

        <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              1. Platform Nature and Pilot Scope
            </h2>
            <p>
              CivicPulse AI is an experimental civic grievance triage platform developed for demonstration and municipal pilot testing in Hyderabad, Sindh. Generating a tracking ID confirms that an issue was recorded into the CivicPulse AI triage pipeline. It does not constitute a legal or contractual guarantee of government dispatch or specific resolution turnaround.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              2. Emergency Situations
            </h2>
            <p className="font-semibold text-[#B91C1C]">
              CivicPulse AI is NOT an emergency response dispatch service. For life-threatening emergencies, fires, live fallen electric wires, or violent incidents, immediately contact Emergency Services at 1122 or the relevant emergency authority.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#0A2540]">
              3. Citizen Conduct and Truthful Reporting
            </h2>
            <p>
              Citizens agree to provide genuine observations without spamming or knowingly fabricating municipal hazards. Malicious spamming of public systems wastes public safety resources and is subject to local cybercrime regulations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
