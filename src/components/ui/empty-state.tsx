import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-[#E2E8F0] bg-white rounded",
        className
      )}
    >
      <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center text-[#475569] mb-4">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#1E293B] mb-1">{title}</h3>
      <p className="text-sm text-[#64748B] max-w-sm mb-6">{description}</p>
      {actionText && actionHref && (
        <Link href={actionHref}>
          <Button variant="primary" size="md">
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );
}
