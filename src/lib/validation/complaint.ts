/**
 * src/lib/validation/complaint.ts
 *
 * PRD-01 :: Zod schemas for complaint validation.
 * Client and server validation alignment.
 * Comments in Roman Urdu / Roman English.
 */

import { z } from "zod";
import { ComplaintCategoryEnum } from "@/lib/ai/schema";

// Form validation schema for AI-assisted complaint
export const aiComplaintSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Complaint description must be at least 10 characters long")
    .max(2000, "Description must not exceed 2000 characters"),
  locationDescription: z
    .string()
    .trim()
    .max(300, "Location details should be under 300 characters")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email("Please provide a valid email").optional().or(z.literal("")),
});

export type AIComplaintFormValues = z.infer<typeof aiComplaintSchema>;

// Form validation schema for manual complaint
export const manualComplaintSchema = z.object({
  category: ComplaintCategoryEnum,
  description: z
    .string()
    .trim()
    .min(10, "Complaint description must be at least 10 characters long")
    .max(2000, "Description must not exceed 2000 characters"),
  locationDescription: z
    .string()
    .trim()
    .max(300, "Location details should be under 300 characters")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email("Please provide a valid email").optional().or(z.literal("")),
});

export type ManualComplaintFormValues = z.infer<typeof manualComplaintSchema>;

// Schema for tracking ID lookup
export const trackingIdSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(5, "Tracking ID must be valid")
    .max(50, "Invalid tracking ID format")
    .regex(/^[A-Za-z0-9-_]+$/, "Tracking ID can only contain letters, numbers, and dashes"),
});

export type TrackingIdFormValues = z.infer<typeof trackingIdSchema>;

// Schema for contact form (§16)
export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(100),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
