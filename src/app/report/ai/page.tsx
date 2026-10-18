"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aiComplaintSchema, type AIComplaintFormValues } from "@/lib/validation/complaint";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/forms/image-upload";
import { LocationField } from "@/components/forms/location-field";
import { SubmissionConfirmation } from "@/components/complaints/submission-confirmation";
import { ErrorState } from "@/components/ui/error-state";
import { Sparkles, Info, ShieldAlert } from "lucide-react";
import { COMPLAINT_CATEGORIES } from "@/types/complaint";

export default function AIComplaintPage() {
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [imageMimeType, setImageMimeType] = useState<string | undefined>();
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AIComplaintFormValues>({
    resolver: zodResolver(aiComplaintSchema),
    defaultValues: {
      description: "",
      locationDescription: "",
      contactEmail: "",
    },
  });

  const locationDescValue = watch("locationDescription") || "";

  const onSubmit = async (data: AIComplaintFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        description: data.description,
        reportingMode: "ai_assisted",
        imageBase64,
        imageMimeType,
        location: {
          addressDescription: data.locationDescription || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
        contactEmail: data.contactEmail || undefined,
      };

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit complaint.");
      }

      setSubmissionResult(resData);
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    const cat = COMPLAINT_CATEGORIES.find((c) => c.id === submissionResult.category);
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <SubmissionConfirmation
          trackingId={submissionResult.trackingId}
          status={submissionResult.status}
          categoryLabel={cat ? cat.label : submissionResult.category}
          department={submissionResult.department}
          aiSummary={submissionResult.aiSummary}
          needsHumanReview={submissionResult.needsHumanReview}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] text-[#0F3F6E] text-xs font-semibold rounded mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Assisted Intake Form
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
          Report with AI Assistance
        </h1>
        <p className="mt-1 text-sm text-[#475569]">
          Describe the problem naturally. Our civic triage assistant will extract necessary categories and departmental routing.
        </p>
      </div>

      {serverError && (
        <div className="mb-6">
          <ErrorState message={serverError} onRetry={() => setServerError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 sm:p-8 border border-[#CBD5E1] rounded">
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[#1E293B]">
            Complaint Description <span className="text-[#B91C1C]">*</span>
          </label>
          <p className="text-xs text-[#64748B] mt-0.5 mb-2">
            Please provide details about what happened, hazard level, and exact location markers. (Roman Urdu or English accepted)
          </p>
          <textarea
            id="description"
            rows={5}
            {...register("description")}
            placeholder="E.g., Autobahn road par sewerage ka ganda pani jama ho raha hai, smell bohot ziada hai aur bikes phisal rahi hain..."
            className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
          />
          {errors.description && (
            <p className="text-xs text-[#B91C1C] mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Optional Image Upload */}
        <ImageUpload
          onImageSelected={(base64, mimeType) => {
            setImageBase64(base64);
            setImageMimeType(mimeType);
          }}
        />

        {/* Optional Location */}
        <LocationField
          locationDescription={locationDescValue}
          onDescriptionChange={(val) => setValue("locationDescription", val)}
          coordinates={coordinates}
          onCoordinatesChange={setCoordinates}
        />

        {/* Optional Contact Email */}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-semibold text-[#1E293B]">
            Notification Email <span className="text-xs font-normal text-[#64748B]">(Optional)</span>
          </label>
          <input
            id="contactEmail"
            type="email"
            {...register("contactEmail")}
            placeholder="your-email@example.com"
            className="mt-1 w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
          />
          {errors.contactEmail && (
            <p className="text-xs text-[#B91C1C] mt-1">{errors.contactEmail.message}</p>
          )}
        </div>

        {/* Privacy Note */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#0F3F6E] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#64748B] leading-relaxed">
            Your complaint will be recorded with a secure tracking ID. Internal model reasoning is kept private and only verified classifications are surfaced.
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Analyzing & Recording..." : "Submit AI-Assisted Complaint"}
        </Button>
      </form>
    </div>
  );
}
