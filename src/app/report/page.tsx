import React from "react";
import Link from "next/link";
import { Sparkles, Edit3, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportHubPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
          File a Civic Complaint
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#475569]">
          Choose the reporting method that best fits your preference. Both methods create an official complaint in our system and generate a verified tracking ID.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Assisted Card */}
        <div className="bg-white border-2 border-[#CBD5E1] hover:border-[#0F3F6E] transition-colors duration-200 p-6 rounded flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] text-[#0F3F6E] font-semibold text-xs rounded mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#0F3F6E]" />
              Recommended for fast reporting
            </div>
            <h2 className="text-lg font-bold text-[#0A2540] mb-2">
              AI-Assisted Report
            </h2>
            <p className="text-sm text-[#475569] mb-4 leading-relaxed">
              Describe the issue in your own words (Roman Urdu or English). Our civic AI model will extract key details, summarize the issue, and suggest the responsible municipal department.
            </p>
            <ul className="text-xs text-[#64748B] space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Auto-summarizes and assigns severity
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Optional photo and GPS attachment
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Human review safeguard for safety concerns
              </li>
            </ul>
          </div>
          <Link href="/report/ai">
            <Button variant="primary" size="lg" className="w-full">
              Start with AI Assistance
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Manual Card */}
        <div className="bg-white border-2 border-[#CBD5E1] hover:border-[#0F3F6E] transition-colors duration-200 p-6 rounded flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] text-[#475569] font-semibold text-xs rounded border border-[#E2E8F0] mb-4">
              <Edit3 className="w-3.5 h-3.5" />
              Standard manual form
            </div>
            <h2 className="text-lg font-bold text-[#0A2540] mb-2">
              Manual Form
            </h2>
            <p className="text-sm text-[#475569] mb-4 leading-relaxed">
              Prefer to choose your own category directly? Select from standard civic classifications without running AI model queries. Fully functional even during offline or degraded AI connectivity.
            </p>
            <ul className="text-xs text-[#64748B] space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Select from official categories
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Zero dependency on external AI providers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D7A57]" />
                Generates identical verified tracking code
              </li>
            </ul>
          </div>
          <Link href="/report/manual">
            <Button variant="outline" size="lg" className="w-full">
              Use Manual Form
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
