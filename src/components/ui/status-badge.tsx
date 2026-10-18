import React from "react";
import type { ComplaintStatus } from "@/types/complaint";
import { COMPLAINT_STATUS_LABELS } from "@/types/complaint";
import { cn } from "@/lib/utils";
import {
  Clock,
  Search,
  AlertCircle,
  UserCheck,
  Hammer,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  // Solid color badge mapping - no gradients, high contrast civic styling
  const config: Record<
    ComplaintStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    submitted: {
      bg: "bg-[#F1F5F9]",
      text: "text-[#334155]",
      border: "border-[#CBD5E1]",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    analyzing: {
      bg: "bg-[#EFF6FF]",
      text: "text-[#1E40AF]",
      border: "border-[#BFDBFE]",
      icon: <Search className="w-3.5 h-3.5 animate-pulse" />,
    },
    needs_review: {
      bg: "bg-[#FEF3C7]",
      text: "text-[#92400E]",
      border: "border-[#FDE68A]",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    assigned: {
      bg: "bg-[#F0FDF4]",
      text: "text-[#166534]",
      border: "border-[#BBF7D0]",
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
    in_progress: {
      bg: "bg-[#E0F2FE]",
      text: "text-[#0369A1]",
      border: "border-[#BAE6FD]",
      icon: <Hammer className="w-3.5 h-3.5" />,
    },
    resolved: {
      bg: "bg-[#DCFCE7]",
      text: "text-[#15803D]",
      border: "border-[#86EFAC]",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    closed: {
      bg: "bg-[#F3F4F6]",
      text: "text-[#4B5563]",
      border: "border-[#D1D5DB]",
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    rejected: {
      bg: "bg-[#FEE2E2]",
      text: "text-[#991B1B]",
      border: "border-[#FECACA]",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = config[status] || config.submitted;
  const label = COMPLAINT_STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border",
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      {showIcon && current.icon}
      <span>{label}</span>
    </span>
  );
}
