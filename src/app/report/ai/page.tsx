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
import {
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
  Camera,
  MapPin,
  Mail,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Search,
  Bot
} from "lucide-react";
import { COMPLAINT_CATEGORIES } from "@/types/complaint";
import Link from "next/link";

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
    defaultValues: { description: "", locationDescription: "", contactEmail: "" },
  });

  const locationDescValue = watch("locationDescription") || "";

  const onSubmit = async (data: AIComplaintFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        description: data.description.trim(),
        reportingMode: "ai_assisted",
        imageBase64: imageBase64 || undefined,
        imageMimeType: imageMimeType || undefined,
        location: {
          addressDescription: data.locationDescription?.trim() || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
        contactEmail: data.contactEmail?.trim() || undefined,
      };
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || resData.message || "Failed to submit complaint. Please try again.");
      const result = resData.data ?? resData;
      setSubmissionResult(result);
    } catch (err: any) {
      console.error("[CivicPulse Intake] Submission error:", err);
      setServerError(err.message || "An unexpected error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    const trackingId = submissionResult.trackingId || submissionResult.tracking_id || "CP-PENDING";
    const status = submissionResult.status || "submitted";
    const category = submissionResult.category || "unknown";
    const cat = COMPLAINT_CATEGORIES.find((c) => c.id === category);
    const deptName =
      typeof submissionResult.department === "object" && submissionResult.department !== null
        ? submissionResult.department.name || submissionResult.department.slug || "Municipal Services"
        : typeof submissionResult.department === "string"
        ? submissionResult.department
        : "Municipal Services";
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <SubmissionConfirmation
            trackingId={trackingId}
            status={status}
            categoryLabel={cat ? cat.label : category}
            department={deptName}
            aiSummary={submissionResult.aiSummary}
            needsHumanReview={Boolean(submissionResult.needsHumanReview)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-slate-900 font-bold hover:text-blue-900 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              CP
            </div>
            <div>
              <span className="block text-sm font-bold leading-tight">CivicPulse AI</span>
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">Hyderabad Municipal Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/track" className="text-slate-600 hover:text-blue-900 inline-flex items-center gap-1.5 transition-colors">
              <Search className="w-3.5 h-3.5" />
              Track Status
            </Link>
            <Link href="/auth/login" className="text-blue-900 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              Officer Portal
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/report"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Report Selection
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-full mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            Gemini AI-Assisted Civic Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Report a Civic Grievance
          </h1>
          <p className="mt-2 text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
            Describe the civic failure naturally in English or Roman Urdu. Google Gemini AI evaluates urgency, hazard factors, and directly routes your report to the responsible authority.
          </p>
        </div>

        {/* Department routing badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { abbr: "HMC", label: "Roads & Sanitation" },
            { abbr: "HWASA", label: "Water & Drainage" },
            { abbr: "HESCO", label: "Power & Outages" },
            { abbr: "PWD Sindh", label: "Provincial Roads" },
            { abbr: "TMC", label: "Town Councils" },
          ].map((d) => (
            <span
              key={d.abbr}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs"
            >
              <span className="font-bold">{d.abbr}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 text-[11px]">{d.label}</span>
            </span>
          ))}
        </div>

        {/* Submitting banner */}
        {isSubmitting && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 shadow-xs">
            <Loader2 className="w-5 h-5 text-blue-700 animate-spin flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <span className="font-bold block text-sm text-blue-950">Analyzing & Dispatching with Gemini AI…</span>
              Classifying severity, parsing hazards, and routing directly to the municipal queue.
            </div>
          </div>
        )}

        {/* Error banner */}
        {serverError && (
          <div className="mb-6">
            <ErrorState message={serverError} onRetry={() => setServerError(null)} />
          </div>
        )}

        {/* Form Container Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit, (validationErrors) => {
              console.warn("[CivicPulse Intake] Form validation failed:", validationErrors);
              if (validationErrors.description) {
                setServerError(validationErrors.description.message || "Please provide at least 10 characters in your description.");
              }
            })(e);
          }}
          noValidate
          className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden"
        >
          {/* Card Header Stripe */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-100 rounded-md text-blue-900">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Official AI Intake Form</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-700" />
              Gemini AI Active
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-900 mb-1">
                Grievance Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2.5">
                Detail the problem clearly: location, hazard level, and neighborhood impact. English, Urdu, or Roman Urdu accepted.
              </p>
              <textarea
                id="description"
                rows={5}
                {...register("description")}
                placeholder="E.g., Autobahn road par sewerage ka ganda pani jama ho raha hai, smell bohot ziada hai aur bikes phisal rahi hain..."
                className="w-full px-4 py-3 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all resize-none shadow-2xs"
              />
              {errors.description && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* AI Preview hint */}
            <div className="flex items-start gap-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed">
                After submission, Gemini AI generates a verified <span className="font-semibold text-blue-950">Department Assignment</span>,{" "}
                <span className="font-semibold text-blue-950">Urgency Assessment</span>, and a secure{" "}
                <span className="font-semibold text-blue-950">Public Tracking Code</span>.
              </p>
            </div>

            {/* Image Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                <Camera className="w-4 h-4 text-slate-600" />
                <span>Evidence Photo (Optional)</span>
              </div>
              <ImageUpload
                onImageSelected={(base64, mimeType) => {
                  setImageBase64(base64);
                  setImageMimeType(mimeType);
                }}
              />
              {imageBase64 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Evidence photo attached ({imageMimeType || "image"}) — will be inspected by Gemini Vision triage.</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-slate-600" />
                <span>Location & Geotagging (Optional)</span>
              </div>
              <LocationField
                locationDescription={locationDescValue}
                onDescriptionChange={(val) => setValue("locationDescription", val)}
                coordinates={coordinates}
                onCoordinatesChange={setCoordinates}
              />
            </div>

            {/* Contact Email */}
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Notification Email</span>
                <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <input
                id="contactEmail"
                type="email"
                {...register("contactEmail")}
                placeholder="citizen@example.com"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all shadow-2xs"
              />
              {errors.contactEmail && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.contactEmail.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
            >
              {isSubmitting ? (
                "Analyzing & Recording…"
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Submit AI-Assisted Complaint</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Your complaint is recorded directly into the official municipal registry. Internal triage logic and officer notes remain protected.
        </p>
      </div>
    </div>
  );
}
