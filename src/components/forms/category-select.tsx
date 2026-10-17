import React from "react";
import type { ComplaintCategory } from "@/lib/ai/schema";
import { COMPLAINT_CATEGORIES } from "@/types/complaint";

interface CategorySelectProps {
  value: ComplaintCategory;
  onChange: (category: ComplaintCategory) => void;
  error?: string;
}

export function CategorySelect({ value, onChange, error }: CategorySelectProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="categorySelect" className="block text-sm font-semibold text-[#1E293B]">
        Issue Category <span className="text-[#B91C1C]">*</span>
      </label>
      <select
        id="categorySelect"
        value={value}
        onChange={(e) => onChange(e.target.value as ComplaintCategory)}
        className="block w-full px-3 py-2.5 border border-[#CBD5E1] bg-white rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
      >
        {COMPLAINT_CATEGORIES.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#B91C1C] mt-1">{error}</p>}
    </div>
  );
}
