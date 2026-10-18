import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    // Solid colors only per PRD-01 §4.2 — strictly NO gradients!
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded";

    const variantStyles = {
      primary: "bg-[#0F3F6E] text-white hover:bg-[#0A2D50] active:bg-[#071E36]",
      secondary: "bg-[#E2E8F0] text-[#1E293B] hover:bg-[#CBD5E1] active:bg-[#94A3B8]",
      outline: "border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC]",
      danger: "bg-[#B91C1C] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D]",
      ghost: "text-[#1E293B] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
