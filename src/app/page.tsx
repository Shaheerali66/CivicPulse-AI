import Link from "next/link";

/**
 * src/app/page.tsx
 *
 * Landing / home page — redirects to the citizen reporting flow.
 * Professional presentation for the hackathon demo.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-lg">CivicPulse AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/track" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Track Complaint
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Officer Login
            </Link>
            <Link href="/report" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
              Report Issue
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-sm text-blue-700 font-medium">NYLP AI Hackathon 2026 Demo</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
            Report civic issues in<br />Hyderabad, Sindh
          </h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            CivicPulse AI uses artificial intelligence to classify and route your
            civic complaints to the right municipal department — roads, sanitation,
            water, electrical — for faster resolution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/report"
              className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors text-base"
            >
              Report an Issue
            </Link>
            <Link
              href="/track"
              className="bg-white text-slate-700 border border-slate-300 px-8 py-3 rounded-md font-semibold hover:bg-slate-50 transition-colors text-base"
            >
              Track My Complaint
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="bg-white border-t border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-600" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-4.82.806a15.98 15.98 0 01-5.23 0l-4.82-.806c-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              ),
              title: "AI Classification",
              desc: "Gemini AI analyzes your complaint and routes it to the correct department automatically.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-600" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              ),
              title: "Priority Scoring",
              desc: "Complaints are scored by severity, public impact, and urgency for prioritized response.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-600" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: "Human Review",
              desc: "Uncertain or sensitive cases go to a human review queue before any automated action.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-3">
              <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm">
        <p>CivicPulse AI — NYLP AI Hackathon 2026 Demo. Hyderabad, Sindh, Pakistan.</p>
        <p className="mt-1 text-slate-500">
          This is a demonstration platform. Complaints are not officially transmitted to government departments.
        </p>
      </footer>
    </main>
  );
}
