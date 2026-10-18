import React from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Search,
  Clock,
  HelpCircle
} from "lucide-react";

export default function ReportHubPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-900 font-bold hover:text-blue-900 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
              CP
            </div>
            <div>
              <span className="block text-sm font-bold leading-tight">CivicPulse AI</span>
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">Hyderabad Municipal Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/track" className="text-slate-600 hover:text-blue-900 inline-flex items-center gap-1.5 transition-colors">
              <Search className="w-3.5 h-3.5" />
              Track Complaint
            </Link>
            <Link href="/auth/login" className="text-blue-900 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              Officer Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Public Portal
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-full text-xs font-semibold mb-4">
            <Building2 className="w-3.5 h-3.5" />
            Official Grievance Registration · Government of Sindh
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            File a Civic Complaint
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Select your preferred submission method below. Both options register directly with the relevant Hyderabad municipal authority and generate a verified tracking number.
          </p>
        </div>

        {/* Dual Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: AI-Assisted Report (Primary) */}
          <div className="bg-white border-2 border-blue-900 rounded-xl p-6 sm:p-8 shadow-md flex flex-col justify-between relative hover:shadow-lg transition-shadow">
            <div className="absolute -top-3 right-6 bg-blue-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
              Recommended
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 font-semibold text-xs rounded-full border border-blue-200 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                Fastest Triage & Routing
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                AI-Assisted Report
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Describe the problem in everyday language using English or Roman Urdu. The Gemini AI engine extracts key details, assigns severity, and dispatches directly to the responsible authority.
              </p>
              
              <div className="border-t border-slate-100 pt-5 mb-8">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Included Features
                </div>
                <ul className="text-xs text-slate-600 space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Automatic department classification (HMC, HWASA, HESCO)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multilingual parsing (English, Urdu, and Roman Urdu)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Optional photo evidence and geolocation tagging</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Instant generation of verified tracking code</span>
                  </li>
                </ul>
              </div>
            </div>

            <Link
              href="/report/ai"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm py-3.5 px-6 rounded-lg transition-colors shadow-sm"
            >
              <span>Start AI Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Manual Form */}
          <div className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between transition-all">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 font-semibold text-xs rounded-full border border-slate-200 mb-5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                Standard Manual Entry
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2.5">
                Manual Form
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Prefer to select your exact category yourself? Choose from official municipal grievance classifications without automated AI interpretation.
              </p>

              <div className="border-t border-slate-100 pt-5 mb-8">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Included Features
                </div>
                <ul className="text-xs text-slate-600 space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <span>Direct selection from official department service lists</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <span>Standardized municipal form fields and categories</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <span>Operates independently of AI service availability</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <span>Identical verified tracking code for follow-ups</span>
                  </li>
                </ul>
              </div>
            </div>

            <Link
              href="/report/manual"
              className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm py-3.5 px-6 rounded-lg border border-slate-300 transition-colors shadow-xs"
            >
              <span>Use Manual Form</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Existing Complaint Tracking Banner */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Already filed a complaint?</div>
              <div className="text-xs text-slate-500">Check current officer reviews, site inspections, and resolution status with your tracking ID.</div>
            </div>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            Track Status
          </Link>
        </div>

        {/* Department Overview Strip */}
        <div className="mt-10 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Official Municipal Authorities: <span className="font-semibold text-slate-700">HMC</span> (Sanitation & Roads) · <span className="font-semibold text-slate-700">HWASA</span> (Water & Drainage) · <span className="font-semibold text-slate-700">HESCO</span> (Power & Grids) · <span className="font-semibold text-slate-700">PWD Sindh</span> · <span className="font-semibold text-slate-700">TMC</span>
          </p>
        </div>
      </main>
    </div>
  );
}
