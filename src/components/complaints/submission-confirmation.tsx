import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackingIdDisplay } from "@/components/ui/tracking-id-display";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ComplaintStatus } from "@/types/complaint";
import type { Department } from "@/lib/routing/department-mapping";

interface SubmissionConfirmationProps {
  trackingId: string;
  status: ComplaintStatus;
  categoryLabel: string;
  department: Department;
  aiSummary?: string;
  needsHumanReview: boolean;
}

export function SubmissionConfirmation({
  trackingId,
  status,
  categoryLabel,
  department,
  aiSummary,
  needsHumanReview,
}: SubmissionConfirmationProps) {
  return (
    <div className="bg-white border border-[#CBD5E1] p-6 sm:p-8 rounded max-w-2xl mx-auto text-left">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#DCFCE7] text-[#15803D] rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0A2540]">
            Complaint Recorded Successfully
          </h2>
          <p className="text-xs text-[#64748B]">
            Your submission has been securely committed to CivicPulse AI.
          </p>
        </div>
      </div>

      {/* Tracking ID Box */}
      <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-5 rounded mb-6">
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
          Your Official Tracking ID
        </span>
        <TrackingIdDisplay trackingId={trackingId} />
        <p className="text-xs text-[#64748B] mt-2">
          Save this tracking ID. You can use it anytime to check the status of this report without logging in.
        </p>
      </div>

      {/* Details Summary */}
      <div className="space-y-3 border-t border-[#E2E8F0] pt-4 mb-6 text-sm">
        <div className="flex justify-between items-center py-1">
          <span className="text-[#64748B]">Current Status:</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[#64748B]">Category:</span>
          <span className="font-semibold text-[#1E293B]">{categoryLabel}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[#64748B]">Assigned Department:</span>
          <span className="font-semibold text-[#0F3F6E]">{department}</span>
        </div>
        {aiSummary && (
          <div className="pt-2">
            <span className="block text-xs font-semibold text-[#64748B] mb-1">
              Issue Summary:
            </span>
            <p className="bg-[#F1F5F9] p-3 rounded text-xs text-[#334155] leading-relaxed">
              {aiSummary}
            </p>
          </div>
        )}
        {needsHumanReview && (
          <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded text-xs text-[#92400E]">
            Note: This issue has been flagged for human officer triage and review.
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#E2E8F0]">
        <Link href={`/track?id=${trackingId}`} className="flex-1">
          <Button variant="primary" size="md" className="w-full">
            <Search className="w-4 h-4 mr-2" />
            Track This Report
          </Button>
        </Link>
        <Link href="/report" className="flex-1">
          <Button variant="outline" size="md" className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            Submit Another
          </Button>
        </Link>
      </div>
    </div>
  );
}
