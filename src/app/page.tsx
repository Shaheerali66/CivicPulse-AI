import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  Search,
  CheckCircle,
  FileCheck,
  AlertTriangle,
  MapPin,
  Cpu,
  Layers,
  HelpCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPLAINT_CATEGORIES } from "@/types/complaint";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-[#CBD5E1] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-xs font-semibold text-[#0F3F6E] mb-6">
              <ShieldAlert className="w-4 h-4 text-[#0F3F6E]" />
              Civic Engagement & Grievance Redressal Platform
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-[#0A2540] tracking-tight leading-[1.15] max-w-4xl">
              Report civic issues in your neighborhood with clarity and confidence.
            </h1>

            {/* Subheading / Description */}
            <p className="mt-6 text-base sm:text-lg text-[#475569] leading-relaxed max-w-3xl">
              CivicPulse AI enables citizens of Hyderabad to report damaged roads, sanitation failures,
              water leaks, and municipal hazards. Receive a verified tracking ID and follow live updates on every report.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/report" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="shadow-none w-full sm:w-auto px-8">
                  Report an Issue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/track" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                  <Search className="w-4 h-4 mr-2" />
                  Track Complaint by ID
                </Button>
              </Link>
            </div>

            {/* Honest disclaimer notice */}
            <div className="mt-10 p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded max-w-3xl w-full text-left flex items-start gap-3">
              <Info className="w-5 h-5 text-[#0F3F6E] flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                <strong className="text-[#1E293B]">Demonstration & Transparency Notice:</strong> CivicPulse AI records reports directly into
                our triage pipeline. A tracking ID confirms that your complaint is logged and mapped to the appropriate department.
                Emergency hazards should immediately be phoned to 1122 or local helpline services.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-[#F8FAFC] border-b border-[#CBD5E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
              How CivicPulse AI Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64748B]">
              A transparent four-step process connecting citizen complaints to civic action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 border border-[#CBD5E1] rounded text-left">
              <div className="w-8 h-8 bg-[#0F3F6E] text-white rounded font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-semibold text-[#0A2540] mb-2">
                Describe the Issue
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Provide details in Roman Urdu or English. Optionally attach a clear photo and mark the location.
              </p>
            </div>

            <div className="bg-white p-6 border border-[#CBD5E1] rounded text-left">
              <div className="w-8 h-8 bg-[#0F3F6E] text-white rounded font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-semibold text-[#0A2540] mb-2">
                AI Triage or Manual Mode
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Choose AI-assisted category suggestions or pick your category manually without relying on AI services.
              </p>
            </div>

            <div className="bg-white p-6 border border-[#CBD5E1] rounded text-left">
              <div className="w-8 h-8 bg-[#0F3F6E] text-white rounded font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-semibold text-[#0A2540] mb-2">
                Get Real Tracking ID
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Once saved to the database, a unique tracking code (e.g., CP-HYD-2026-XXXX) is provided for verification.
              </p>
            </div>

            <div className="bg-white p-6 border border-[#CBD5E1] rounded text-left">
              <div className="w-8 h-8 bg-[#0F3F6E] text-white rounded font-bold flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-semibold text-[#0A2540] mb-2">
                Follow Resolution Progress
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                Check status anytime via tracking ID or view your authenticated history of past submissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Categories Section */}
      <section className="py-16 bg-white border-b border-[#CBD5E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
              Supported Civic Categories
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64748B]">
              Standardized issue classifications mapped deterministically to responsible local municipal departments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMPLAINT_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="p-4 border border-[#E2E8F0] bg-[#F8FAFC] rounded hover:border-[#CBD5E1] transition-colors"
              >
                <div className="font-semibold text-sm text-[#0A2540]">{cat.label}</div>
                <p className="text-xs text-[#64748B] mt-1">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency & Governance Section */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto bg-white border border-[#CBD5E1] p-8 sm:p-10 rounded">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A2540] mb-4">
              Our Principles of Civic Trust
            </h2>
            <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
              <p>
                <strong>No Fake Statistics:</strong> We do not display fabricated resolution counts, exaggerated response times, or fictional citizen reviews.
              </p>
              <p>
                <strong>Data Minimization:</strong> You do not need to upload your CNIC or disclose sensitive private details to file a complaint. Location coordinates and photographs are entirely optional.
              </p>
              <p>
                <strong>AI as Assistant, Not Gatekeeper:</strong> AI suggestions are transparent advisory classifications. Any citizen can file manually at any time without AI participation.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Ready to submit a report?</span>
              <Link href="/report">
                <Button variant="primary" size="md">
                  Start Complaint
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
