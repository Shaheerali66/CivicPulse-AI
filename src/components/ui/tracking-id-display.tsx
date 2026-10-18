import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingIdDisplayProps {
  trackingId: string;
  className?: string;
}

export function TrackingIdDisplay({ trackingId, className }: TrackingIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy tracking id", err);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] px-3 py-1.5 rounded font-mono text-sm font-bold text-[#0F3F6E]",
        className
      )}
    >
      <span>{trackingId}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy Tracking ID"
        className="p-1 hover:bg-[#E2E8F0] rounded text-[#475569] transition-colors"
        title="Copy Tracking ID"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#0D7A57]" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
