import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "p-6 border border-[#FECACA] bg-[#FEF2F2] rounded text-left flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#991B1B]">{title}</h3>
          <p className="text-sm text-[#7F1D1D] mt-1">{message}</p>
        </div>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button variant="danger" size="sm" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
