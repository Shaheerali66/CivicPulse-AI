import React from "react";
import Link from "next/link";
import {
  Building2,
  Droplets,
  Zap,
  HardHat,
  MapPin,
  Bot,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileText,
  Clock,
  Activity,
  PhoneCall,
  ExternalLink
} from "lucide-react";

/**
 * src/app/page.tsx
 * CivicPulse AI — Official Hyderabad Municipal Platform
 * Clean, professional, human-designed government portal aesthetic.
 */
export default function HomePage() {
  const departments = [
    {
      abbr: "HMC",
      name: "Hyderabad Municipal Corporation",
      jurisdiction: "Municipal & City Services",
      issues: "Sanitation, local asphalt roads, solid waste disposal, street lighting & parks",
      icon: Building2,
      accent: "text-blue-900 bg-blue-50 border-blue-200",
    },
    {
      abbr: "HWASA",
      name: "Hyderabad Water & Sewerage Authority",
      jurisdiction: "Water Supply & Wastewater",
      issues: "Potable water supply pipelines, sewer line blockages, drainage overflow & pumping stations",
      icon: Droplets,
      accent: "text-cyan-900 bg-cyan-50 border-cyan-200",
    },
    {
      abbr: "HESCO",
      name: "Hyderabad Electric Supply Company",
      jurisdiction: "Electrical Power Distribution",
      issues: "Transformer outages, hazardous live wires, neighborhood load faults & voltage spikes",
      icon: Zap,
      accent: "text-amber-900 bg-amber-50 border-amber-200",
    },
    {
      abbr: "PWD Sindh",
      name: "Provincial Works & Services Department",
      jurisdiction: "Provincial Infrastructure",
      issues: "Inter-district highways, main arterial roadways, bridge maintenance & public works",
      icon: HardHat,
      accent: "text-emerald-900 bg-emerald-50 border-emerald-200",
    },
    {
      abbr: "TMC",
      name: "Town Municipal Corporation",
      jurisdiction: "Local Town Councils",
      issues: "Latifabad, Qasimabad, Hyderabad City & Rural town-level municipal services",
      icon: MapPin,
      accent: "text-indigo-900 bg-indigo-50 border-indigo-200",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Citizen Lodges Grievance",
      desc: "Report your civic issue in plain English or Roman Urdu. Optionally attach geotagged coordinates and photographic evidence.",
      icon: FileText,
    },
    {
      step: "02",
      title: "Automated AI Triage",
      desc: "Google Gemini AI analyzes problem severity, extracts hazard alerts, and accurately maps the issue to the competent municipal agency.",
      icon: Bot,
    },
    {
      step: "03",
      title: "Field Action & Verified Resolution",
      desc: "Authorized municipal officers inspect, assign crews, and update ticket progress with live public tracking for complete transparency.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* ── TOP GOVERNMENT BANNER & NAVBAR ─────────────────────────────── */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Government of Sindh · Official Hyderabad Municipal Grievance Redressal System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Toll-Free Civic Helpline: 1122</span>
            <span>·</span>
            <Link href="/track" className="hover:text-white transition-colors">Public Tracking</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              CP
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight block leading-tight">
                CivicPulse AI
              </span>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                Hyderabad Smart Municipal Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-700">
            <Link href="#departments" className="hover:text-blue-900 transition-colors">
              Departments
            </Link>
            <Link href="#how-it-works" className="hover:text-blue-900 transition-colors">
              How It Works
            </Link>
            <Link href="/track" className="hover:text-blue-900 transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4 text-slate-500" />
              Track Status
            </Link>
            <Link href="/report" className="hover:text-blue-900 transition-colors">
              File Complaint
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              Officer Portal
            </Link>
          </nav>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/report"
              className="bg-blue-900 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
            >
              Report
            </Link>
            <Link
              href="/auth/login"
              className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50/50 pt-16 pb-20 px-6 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          
          {/* Official Verification Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 shadow-xs mb-8">
            <Building2 className="w-3.5 h-3.5 text-blue-800" />
            <span>Official Municipal Resolution Portal · Hyderabad, Sindh</span>
          </div>

          {/* Hyderabad Landmark Skyline Vector Graphic */}
          <div className="w-full max-w-2xl mx-auto mb-8 select-none">
            <svg
              viewBox="0 0 800 140"
              className="w-full h-auto text-slate-300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Baseline ground border */}
              <line x1="10" y1="139" x2="790" y2="139" stroke="#94A3B8" strokeWidth="1.5" />
              
              {/* Pacco Qillo Fort Bastions & Walls */}
              <rect x="50" y="70" width="90" height="69" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="60" y="52" width="20" height="18" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="110" y="52" width="20" height="18" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <polygon points="95,30 80,52 110,52" fill="#DBEAFE" stroke="#94A3B8" strokeWidth="1.2" />
              
              {/* Clock Tower / Minaret Landmark */}
              <rect x="180" y="40" width="28" height="99" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <circle cx="194" cy="55" r="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
              <polygon points="194,15 178,40 210,40" fill="#BFDBFE" stroke="#94A3B8" strokeWidth="1.2" />
              <line x1="194" y1="6" x2="194" y2="15" stroke="#94A3B8" strokeWidth="1.5" />

              {/* Hyderabad Municipal Corporation Hall */}
              <rect x="245" y="65" width="130" height="74" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="270" y="78" width="80" height="61" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.2" />
              {/* Columns */}
              <line x1="285" y1="78" x2="285" y2="139" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="300" y1="78" x2="300" y2="139" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="315" y1="78" x2="315" y2="139" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="330" y1="78" x2="330" y2="139" stroke="#CBD5E1" strokeWidth="2" />
              <polygon points="310,48 260,65 360,65" fill="#DBEAFE" stroke="#94A3B8" strokeWidth="1.2" />

              {/* Sindhi Windcatchers (Mangh) Architectural Silhouette */}
              <rect x="415" y="55" width="26" height="84" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <polygon points="415,55 428,32 441,55" fill="#BFDBFE" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="460" y="70" width="85" height="69" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="475" y="82" width="22" height="25" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
              <rect x="510" y="82" width="22" height="25" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />

              {/* Modern Grid & Infrastructure Tower */}
              <rect x="580" y="35" width="30" height="104" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <polygon points="595,12 578,35 612,35" fill="#DBEAFE" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="635" y="80" width="115" height="59" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="650" y="92" width="25" height="47" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
              <rect x="685" y="92" width="25" height="47" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            </svg>
          </div>

          {/* Hero Headings */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight">
            Hyderabad Municipal Civic Grievance & Redressal Platform
          </h1>

          <p className="mt-6 text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed">
            Integrated municipal coordination connecting citizens directly with <span className="font-semibold text-slate-900">HMC</span>, <span className="font-semibold text-slate-900">HWASA</span>, and <span className="font-semibold text-slate-900">HESCO</span>. Powered by Google Gemini AI for automated triage, rapid dispatch, and verifiable tracking.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center">
            <Link
              href="/report"
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm px-7 py-3.5 rounded-lg transition-all shadow-sm hover:shadow"
            >
              <span>File a Civic Complaint</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm px-7 py-3.5 rounded-lg border border-slate-300 transition-all shadow-xs"
            >
              <Search className="w-4 h-4 text-slate-600" />
              <span>Track Complaint Status</span>
            </Link>

            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm px-6 py-3.5 rounded-lg border border-slate-200 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>Officer Portal</span>
            </Link>
          </div>

          {/* Key Public Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl text-left">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">5</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Connected Departments
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">HMC, HWASA, HESCO, PWD, TMC</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="text-2xl font-bold text-blue-900">Gemini AI</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Automated Triage
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Instant severity & route mapping</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="text-2xl font-bold text-slate-900">24 / 7</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Citizen Reporting
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">English & Roman Urdu input</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="text-2xl font-bold text-emerald-700">100%</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Public Tracking
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Unique verified tracking ID</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MUNICIPAL AUTHORITIES DIRECTORY ─────────────────────────── */}
      <section id="departments" className="py-20 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5 text-blue-900" />
              Integrated Civic Agencies
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Connected Hyderabad Municipal Departments
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              CivicPulse AI automatically dispatches grievances to the appropriate municipal entity based on the nature, location, and hazard level of your reported issue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => {
              const IconComponent = dept.icon;
              return (
                <div
                  key={dept.abbr}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        {dept.abbr}
                      </span>
                      <div className={`p-2 rounded-lg border ${dept.accent}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {dept.name}
                    </h3>
                    <div className="text-xs font-medium text-blue-900 mb-3">
                      {dept.jurisdiction}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {dept.issues}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Direct API Integration</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Active Queue
                    </span>
                  </div>
                </div>
              );
            })}

            {/* AI Assistance Card */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 text-white rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-blue-200 bg-blue-800/80 px-2.5 py-1 rounded border border-blue-700">
                    GEMINI AI
                  </span>
                  <div className="p-2 rounded-lg bg-blue-800/80 border border-blue-700">
                    <Bot className="w-4 h-4 text-blue-200" />
                  </div>
                </div>
                <h3 className="font-bold text-white text-base mb-1">
                  Unsure which department?
                </h3>
                <div className="text-xs font-medium text-blue-300 mb-3">
                  Automatic AI Department Detection
                </div>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Simply describe the condition in plain words. Google Gemini AI evaluates the description and accurately selects the responsible department.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-blue-800/80">
                <Link
                  href="/report/ai"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-950 font-semibold text-xs py-2.5 px-4 rounded-lg transition-colors"
                >
                  <span>Launch AI Reporting</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold mb-3">
              <Activity className="w-3.5 h-3.5 text-blue-900" />
              Standard Operating Procedure
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              From Citizen Report to Verified Resolution
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              Every filed grievance is systematically tracked through verified municipal stages until field resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((st, idx) => {
              const IconComp = st.icon;
              return (
                <div
                  key={st.step}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-6 relative flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl font-extrabold text-blue-900/40">
                        {st.step}
                      </span>
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-900 shadow-2xs">
                        <IconComp className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">
                      {st.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Stage {st.step} of 03
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/report"
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm px-7 py-3.5 rounded-lg transition-colors shadow-sm"
            >
              <span>File a Complaint Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PUBLIC TRANSPARENCY NOTICE ──────────────────────────────── */}
      <section className="py-12 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Citizen Privacy & Public Accountability
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                All complaint data is routed securely. Personal contact details are protected under Sindh Government public records regulations while resolution statuses remain publicly verifiable.
              </p>
            </div>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            Track Any Code
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                CP
              </div>
              <span className="font-bold text-white text-base tracking-tight">CivicPulse AI</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm">
              Hyderabad Municipal Grievance & Redressal Redirection Portal. Connecting residents with public utilities for faster resolution.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-xs font-medium">
            <div className="flex flex-col gap-2">
              <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Services</span>
              <Link href="/report" className="hover:text-white transition-colors">File Complaint</Link>
              <Link href="/report/ai" className="hover:text-white transition-colors">AI Report Assistant</Link>
              <Link href="/track" className="hover:text-white transition-colors">Track Status</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Departments</span>
              <span className="text-slate-400">HMC Hyderabad</span>
              <span className="text-slate-400">HWASA Water</span>
              <span className="text-slate-400">HESCO Electric</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Staff Access</span>
              <Link href="/auth/login" className="hover:text-white transition-colors">Officer Portal Login</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} CivicPulse AI · Hyderabad, Sindh, Pakistan. All rights reserved.
          </div>
          <div>
            Official Civic Services Platform · Government of Sindh
          </div>
        </div>
      </footer>
    </div>
  );
}
