"use client";

import React, { useState } from "react";
import { UploadCloud, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelected: (base64: string | undefined, mimeType: string | undefined) => void;
  maxSizeMB?: number;
}

export function ImageUpload({ onImageSelected, maxSizeMB = 5 }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      // Extract clean base64 data without prefix for backend safety
      const base64Data = result.split(",")[1];
      onImageSelected(base64Data, file.type);
    };
    reader.onerror = () => {
      setError("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onImageSelected(undefined, undefined);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-[#1E293B]">
        Photo of Issue <span className="text-xs font-normal text-[#64748B]">(Optional)</span>
      </label>

      {preview ? (
        <div className="relative border border-[#CBD5E1] rounded p-2 bg-[#F8FAFC] max-w-sm">
          <img
            src={preview}
            alt="Complaint preview"
            className="w-full h-48 object-cover rounded"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-4 right-4 bg-[#B91C1C] text-white p-1 rounded-full shadow hover:bg-[#991B1B] focus:outline-none"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0F3F6E] bg-white rounded p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <UploadCloud className="w-8 h-8 text-[#64748B] mb-2" />
          <span className="text-sm font-medium text-[#1E293B]">
            Click to upload or drag photo here
          </span>
          <span className="text-xs text-[#64748B] mt-1">
            JPG, PNG or WebP up to {maxSizeMB}MB. Never made public.
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-[#B91C1C]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
