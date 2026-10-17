/**
 * src/lib/ai/analyze-complaint.ts
 *
 * PRD-03 :: AI Engine — Main public entry point for complaint analysis.
 * Orchestrates: prompt building → AI call → Zod validation → fallback.
 *
 * This module is SERVER-ONLY. It does not throw on AI failures; instead
 * it returns the fallback `AIAnalysis` so complaint persistence always
 * succeeds even when the AI service is degraded.
 *
 * Usage (from a Next.js Server Action or API Route):
 *   const analysis = await analyzeComplaint({ text, imageBase64, imageMimeType });
 */

import "server-only";

import { ZodError } from "zod";
import { callAIModel, type AIClientImagePart } from "./client";
import { CIVIC_COMPLAINT_SYSTEM_PROMPT, buildComplaintUserMessage } from "./prompts";
import {
  AIAnalysisSchema,
  AI_ANALYSIS_FALLBACK,
  type AIAnalysis,
} from "./schema";

// ---------------------------------------------------------------------------
// Input params for the public analyzeComplaint function
// ---------------------------------------------------------------------------
export interface AnalyzeComplaintParams {
  /** Raw citizen complaint text. Will be sanitized and truncated internally. */
  text: string;
  /**
   * Optional base64-encoded image (do NOT include the "data:image/...;base64," prefix).
   * If provided, mimeType must also be supplied.
   */
  imageBase64?: string;
  /** MIME type of the attached image, e.g., "image/jpeg", "image/png", "image/webp" */
  imageMimeType?: string;
  /**
   * AI request timeout in milliseconds.
   * Default: 25_000ms (25 seconds) — slightly under typical server timeout limits.
   */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Result envelope — consumer always gets back a typed AIAnalysis
// ---------------------------------------------------------------------------
export interface AnalyzeComplaintResult {
  analysis: AIAnalysis;
  /**
   * True if the analysis came from the AI model (may still have needsHumanReview).
   * False if we fell back to the default (AI call failed or validation failed).
   */
  fromAI: boolean;
  /** Raw model output text — useful for debugging and audit logs. Undefined on fallback. */
  rawModelOutput?: string;
  /** Error message if AI failed — useful for logging but should NOT be surfaced to users. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Attempt to parse raw JSON from the model into a validated AIAnalysis
// ---------------------------------------------------------------------------
function parseAndValidate(rawText: string): AIAnalysis {
  // Strip any accidental markdown code fences the model might produce
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Parse JSON — may throw SyntaxError
  const parsed: unknown = JSON.parse(cleaned);

  // Zod validation — may throw ZodError
  return AIAnalysisSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Post-processing: enforce business rules that the model might miss
// ---------------------------------------------------------------------------
function enforceBusinessRules(analysis: AIAnalysis): AIAnalysis {
  const enforced = { ...analysis };

  // Rule 1: If confidence < 0.5, always require human review
  if (enforced.confidence < 0.5) {
    enforced.needsHumanReview = true;
  }

  // Rule 2: "unknown" category always needs human review
  if (enforced.category === "unknown") {
    enforced.needsHumanReview = true;
  }

  // Rule 3: electrical_hazard is always a safety concern
  if (enforced.category === "electrical_hazard") {
    enforced.safetyConcern = true;
  }

  // Rule 4: critical severity always needs human review confirmation
  if (enforced.severity === "critical") {
    enforced.needsHumanReview = true;
  }

  return enforced;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------
export async function analyzeComplaint(
  params: AnalyzeComplaintParams
): Promise<AnalyzeComplaintResult> {
  const { text, imageBase64, imageMimeType, timeoutMs = 25_000 } = params;

  const hasImage = Boolean(imageBase64 && imageMimeType);

  // 1. Build structured prompt parts
  const userMessage = buildComplaintUserMessage({
    complaintText: text,
    hasImage,
  });

  let image: AIClientImagePart | undefined;
  if (hasImage && imageBase64 && imageMimeType) {
    image = { base64Data: imageBase64, mimeType: imageMimeType };
  }

  // 2. Call the AI model
  const aiResult = await callAIModel({
    systemInstruction: CIVIC_COMPLAINT_SYSTEM_PROMPT,
    userMessage,
    image,
    timeoutMs,
  });

  if (!aiResult.success) {
    // AI call failed (timeout, API error, etc.)
    // Return fallback — complaint will still be saved, just unrouted
    console.warn("[CivicPulse AI] analyzeComplaint: AI call failed.", aiResult.error);
    return {
      analysis: AI_ANALYSIS_FALLBACK,
      fromAI: false,
      errorMessage: aiResult.error,
    };
  }

  // 3. Parse & validate the raw model output
  try {
    const rawAnalysis = parseAndValidate(aiResult.rawText);

    // 4. Enforce deterministic business rules on top of AI output
    const analysis = enforceBusinessRules(rawAnalysis);

    return {
      analysis,
      fromAI: true,
      rawModelOutput: aiResult.rawText,
    };
  } catch (err) {
    // JSON parse error or Zod validation failure
    let errorMessage = "Unknown parse error";

    if (err instanceof SyntaxError) {
      errorMessage = `JSON parse error: ${err.message}`;
    } else if (err instanceof ZodError) {
      // Log Zod validation issues for debugging — do NOT expose to client
      const issues = err.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      errorMessage = `Schema validation failed: ${issues}`;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    console.error("[CivicPulse AI] analyzeComplaint: validation failed.", errorMessage);
    console.error("[CivicPulse AI] Raw model output was:", aiResult.rawText);

    return {
      analysis: AI_ANALYSIS_FALLBACK,
      fromAI: false,
      rawModelOutput: aiResult.rawText,
      errorMessage,
    };
  }
}
