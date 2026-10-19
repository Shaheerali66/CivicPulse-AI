"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manualComplaintSchema, type ManualComplaintFormValues } from "@/lib/validation/complaint";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/forms/image-upload";
import { LocationField } from "@/components/forms/location-field";
import { CategorySelect } from "@/components/forms/category-select";
import { SubmissionConfirmation } from "@/components/complaints/submission-confirmation";
import { ErrorState } from "@/components/ui/error-state";
import {
  FileText,
  Info,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Search,
  Camera,
  MapPin,
  Mail,
  CheckCircle2,
  ListFilter,
  Building2,
  ChevronDown,
  Loader2
} from "lucide-react";
import { COMPLAINT_CATEGORIES } from "@/types/complaint";
import type { ComplaintCategory } from "@/lib/ai/schema";
import Link from "next/link";

interface Department {
  id: string;
  name: string;
  slug: string;
  code?: string;
  description?: string | null;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "hmc-hyderabad", name: "Hyderabad Municipal Corporation (HMC)", slug: "hmc-hyderabad", code: "hmc-hyderabad" },
  { id: "hwasa-hyderabad", name: "Hyderabad Water & Sewerage Corporation (HWASA)", slug: "hwasa-hyderabad", code: "hwasa-hyderabad" },
  { id: "hesco-hyderabad", name: "Hyderabad Electric Supply Company (HESCO)", slug: "hesco-hyderabad", code: "hesco-hyderabad" },
  { id: "pwd-sindh", name: "Provincial Works & Services Department (PWD Sindh)", slug: "pwd-sindh", code: "pwd-sindh" },
  { id: "tmc-hyderabad", name: "Town Municipal Committees (TMC)", slug: "tmc-hyderabad", code: "tmc-hyderabad" },
];

export default function ManualComplaintPage() {
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [imageMimeType, setImageMimeType] = useState<string | undefined>();
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department state pre-populated with standard municipal departments so it never fails
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [deptLoading, setDeptLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(DEFAULT_DEPARTMENTS[0].id);

  // Fetch live departments on mount relative to origin
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/departments", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const json = await res.json();
          const list: Department[] = json.departments || json.data || (Array.isArray(json) ? json : []);
          if (Array.isArray(list) && list.length > 0) {
            setDepartments(list);
            setSelectedDeptId((prev) => (list.some((d) => d.id === prev) ? prev : list[0].id));
            return;
          }
        }
        // Fallback default
        setDepartments(DEFAULT_DEPARTMENTS);
        setSelectedDeptId((prev) => (DEFAULT_DEPARTMENTS.some((d) => d.id === prev) ? prev : DEFAULT_DEPARTMENTS[0].id));
      } catch (e) {
        console.warn("[ManualReport] Department fetch error, using static fallback:", e);
        setDepartments(DEFAULT_DEPARTMENTS);
        setSelectedDeptId((prev) => (DEFAULT_DEPARTMENTS.some((d) => d.id === prev) ? prev : DEFAULT_DEPARTMENTS[0].id));
      }
    })();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualComplaintFormValues>({
    resolver: zodResolver(manualComplaintSchema),
    defaultValues: {
      category: "road_damage",
      description: "",
      locationDescription: "",
      contactEmail: "",
    },
  });

  const categoryValue = watch("category");
  const locationDescValue = watch("locationDescription") || "";

  const onSubmit = async (data: ManualComplaintFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: Record<string, unknown> = {
        description: data.description,
        reportingMode: "manual",
        category: data.category,
        imageBase64,
        imageMimeType,
        location: {
          addressDescription: data.locationDescription || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
        contactEmail: data.contactEmail || undefined,
      };

      // Include selected department_id only if it is a valid UUID (matching DB column type)
      if (selectedDeptId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedDeptId);
        if (isUUID) {
          payload.department_id = selectedDeptId;
        }
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || resData.message || "Failed to submit complaint.");
      }

      const result = resData.data ?? resData;
      setSubmissionResult(result);
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred during submission.");
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

  // Find the selected department object for display
  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full mb-3 shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            Standard Municipal Grievance Filing
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manual Complaint Submission
          </h1>
          <p className="mt-2 text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
            Select the responsible municipal authority and your civic classification directly. Your complaint routes instantly to the chosen department without AI analysis.
          </p>
        </div>

        {serverError && (
          <div className="mb-6">
            <ErrorState message={serverError} onRetry={() => setServerError(null)} />
          </div>
        )}

        {/* Structured Form Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)(e);
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden"
        >
          {/* Card Header Stripe */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-200 rounded-md text-slate-700">
                <ListFilter className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Official Municipal Form</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Direct Agency Routing
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* ── Department Selection ─────────────────────────────────── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-900" />
                  Target Department <span className="text-red-500">*</span>
                </span>
              </label>
              <p className="text-xs text-slate-500 mb-2.5">
                Select the Hyderabad municipal authority responsible for your type of civic issue.
              </p>

              <div className="relative">
                <select
                  id="department_id"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all shadow-2xs pr-10 cursor-pointer"
                >
                  <option value="" disabled>— Select a municipal authority —</option>
                  {(departments.length > 0 ? departments : DEFAULT_DEPARTMENTS).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Selected department badge */}
              {selectedDept && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-full">
                  <Building2 className="w-3.5 h-3.5 text-blue-800" />
                  {selectedDept.name}
                  <span className="ml-1 text-blue-600 font-mono text-[10px]">({selectedDept.slug})</span>
                </div>
              )}
            </div>

            {/* ── Category selector ────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                Issue Category <span className="text-red-500">*</span>
              </label>
              <CategorySelect
                value={categoryValue}
                onChange={(cat: ComplaintCategory) => setValue("category", cat)}
                error={errors.category?.message}
              />
            </div>

            {/* ── Description ──────────────────────────────────────────── */}
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-900 mb-1">
                Complaint Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Provide clear specifics: location marks, duration of the issue, and public safety impact.
              </p>
              <textarea
                id="description"
                rows={5}
                {...register("description")}
                placeholder="Please detail the location, severity, and nature of the civic failure..."
                className="w-full px-4 py-3 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all resize-none shadow-2xs"
              />
              {errors.description && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* ── Evidence Photo ───────────────────────────────────────── */}
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
                  <span>Evidence photo attached ({imageMimeType || "image"}).</span>
                </div>
              )}
            </div>

            {/* ── Location ─────────────────────────────────────────────── */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-slate-600" />
                <span>Location Details (Optional)</span>
              </div>
              <LocationField
                locationDescription={locationDescValue}
                onDescriptionChange={(val) => setValue("locationDescription", val)}
                coordinates={coordinates}
                onCoordinatesChange={setCoordinates}
              />
            </div>

            {/* ── Notification Email ───────────────────────────────────── */}
            <div>
              <label htmlFor="contactEmail" className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
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

            {/* ── Routing info notice ──────────────────────────────────── */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedDept
                  ? <>Your complaint will be <span className="font-semibold text-blue-950">directly routed to {selectedDept.name}</span> without AI processing, and a verified tracking ID will be generated immediately.</>
                  : "Upon submission, your complaint will be registered and assigned a verified municipal tracking ID."}
              </p>
            </div>

            {/* ── Submit ───────────────────────────────────────────────── */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting || (!selectedDeptId && !deptLoading)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
            >
              {isSubmitting ? (
                "Submitting Official Report..."
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Submit Official Complaint</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Official Municipal Grievance Redressal System · Hyderabad, Sindh
        </p>
      </main>
    </div>
  );
}
