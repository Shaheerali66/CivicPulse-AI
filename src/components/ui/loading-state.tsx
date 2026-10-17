import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-[#CBD5E1] bg-[#F8FAFC] rounded",
        className
      )}
    >
      <Loader2 className="w-8 h-8 text-[#0F3F6E] animate-spin mb-3" />
      <p className="text-sm font-medium text-[#475569]">{message}</p>
    </div>
  );
}
