/**
 * src/lib/ai/analyze-complaint.ts
 *
 * PRD-03 §3.2, §5, §6, §11 — Main server-side complaint analysis function.
 *
 * Public API:
 *   analyzeComplaint(description: string, imageUrl?: string): Promise<AnalyzeComplaintResult>
 *
 * Design principles (PRD-03):
 *   - Never throw on AI failure — return fallback so complaint persistence succeeds (§11)
 *   - Validate every field with Zod — never assume JSON is valid (§4.1)
 *   - Apply deterministic business rules after AI validation (§6.1)
 *   - Record model name and processing timestamp (§4.1)
 *   - Keep AI credentials server-side only (§3.3)
 */

import "server-only";

import { ZodError } from "zod";
import { callGemini, type GeminiImageInput } from "./client";
import { CIVIC_COMPLAINT_SYSTEM_PROMPT, buildComplaintUserMessage } from "./prompts";
import { AIAnalysisSchema, AI_ANALYSIS_FALLBACK, type AIAnalysis } from "./schema";

// ---------------------------------------------------------------------------
// PRD-03 §6 confidence thresholds — configurable for future tuning
// ---------------------------------------------------------------------------
const CONFIDENCE_THRESHOLDS = {
  /** Below this: always require human review */
  humanReview: 0.60,
  /** Below this but above humanReview: flag review if routing is ambiguous */
  flagForReview: 0.80,
} as const;

// ---------------------------------------------------------------------------
// Allowed image MIME types — PRD-03 §5.4: validate before sending
// ---------------------------------------------------------------------------
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ---------------------------------------------------------------------------
// Result type — consumer always receives a typed AIAnalysis
// ---------------------------------------------------------------------------
export interface AnalyzeComplaintResult {
  /** Validated and business-rule-enforced AI analysis */
  analysis: AIAnalysis;
  /** True if result came from the AI model; false if fallback was used */
  fromAI: boolean;
  /** Model identifier — for audit logging per PRD-03 §4.1 */
  modelName?: string;
  /** ISO timestamp of processing — for audit logging per PRD-03 §4.1 */
  processedAt?: string;
  /** Raw model JSON text — for debugging, never sent to client */
  rawModelOutput?: string;
  /** Server-side error description — log only, do NOT surface to users */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Image URL fetch and validation — PRD-03 §5.4
// imageUrl is a Supabase Storage URL for the complaint photo
// ---------------------------------------------------------------------------
async function fetchImageForGemini(
  imageUrl: string
): Promise<GeminiImageInput | null> {
  try {
    const response = await fetch(imageUrl, { cache: "no-store" });

    if (!response.ok) {
      console.warn(
        `[CivicPulse AI] Image fetch failed: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    // Normalize MIME to base type without charset parameters
    const mimeType = contentType.split(";")[0].trim().toLowerCase();

    // PRD-03 §5.4: validate file type before processing
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      console.warn(`[CivicPulse AI] Unsupported image MIME type: "${mimeType}"`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // PRD-03 §13: enforce size limit — 4 MB max to control cost/latency
    const MAX_BYTES = 4 * 1024 * 1024;
    if (buffer.byteLength > MAX_BYTES) {
      console.warn(
        `[CivicPulse AI] Image too large (${buffer.byteLength} bytes). Skipping.`
      );
      return null;
    }

    const base64Data = Buffer.from(buffer).toString("base64");

    return {
      base64Data,
      mimeType: mimeType as GeminiImageInput["mimeType"],
    };
  } catch (err) {
    console.warn("[CivicPulse AI] Image fetch error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse and validate raw model output — PRD-03 §4.1
// "Never assume that requesting JSON guarantees valid JSON"
// ---------------------------------------------------------------------------
function parseAndValidate(rawText: string): AIAnalysis {
  // Strip accidental markdown fences the model may produce despite JSON mode
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // May throw SyntaxError
  const parsed: unknown = JSON.parse(cleaned);

  // May throw ZodError — validates all fields per PRD-03 §4.1
  return AIAnalysisSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Enforce deterministic business rules — PRD-03 §6.1 human review triggers
// Applied AFTER Zod validation so rules cannot be bypassed by model output
// ---------------------------------------------------------------------------
function enforceReviewRules(analysis: AIAnalysis): AIAnalysis {
  const result = { ...analysis };

  // Rule 1 (PRD-03 §6): confidence < threshold → require human review
  if (result.confidence < CONFIDENCE_THRESHOLDS.humanReview) {
    result.needsHumanReview = true;
  }

  // Rule 2 (PRD-03 §6.1): category unknown → require review
  if (result.category === "unknown") {
    result.needsHumanReview = true;
  }

  // Rule 3 (PRD-03 §6.1, §9.4): safety concern → require review
  if (result.safetyConcern) {
    result.needsHumanReview = true;
  }

  // Rule 4 (PRD-03 §9.4): electrical_hazard is always a safety concern
  if (result.category === "electrical_hazard") {
    result.safetyConcern = true;
    result.needsHumanReview = true;
  }

  // Rule 5 (PRD-03 §6.1): critical severity — human must confirm before finalizing
  if (result.severity === "critical") {
    result.needsHumanReview = true;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main exported function — PRD-03 §3.2 processing flow steps 3–9
//
// analyzeComplaint(description, imageUrl?)
//   description: citizen complaint text
//   imageUrl:    optional Supabase Storage URL for the photo (PRD-03 §5.4)
// ---------------------------------------------------------------------------
export async function analyzeComplaint(
  description: string,
  imageUrl?: string
): Promise<AnalyzeComplaintResult> {
  // Step 3: Prepare minimum necessary input (PRD-03 §3.2, §5.2)
  let image: GeminiImageInput | undefined;
  if (imageUrl) {
    const fetched = await fetchImageForGemini(imageUrl);
    if (fetched) {
      image = fetched;
    }
    // If fetch failed, proceed text-only — PRD-03 §5.4: system must still support
    // manual reporting when image analysis is unavailable
  }

  const hasImage = image !== undefined;
  const userMessage = buildComplaintUserMessage({ description, hasImage });

  // Step 4: Call AI provider (PRD-03 §3.2)
  const geminiResult = await callGemini({
    systemInstruction: CIVIC_COMPLAINT_SYSTEM_PROMPT,
    userMessage,
    image,
    timeoutMs: 25_000, // PRD-03 §11: timeout must not lose original complaint
  });

  if (!geminiResult.success) {
    // PRD-03 §11: AI failure — mark as failed, preserve complaint with fallback
    console.warn(
      "[CivicPulse AI] analyzeComplaint: provider call failed.",
      geminiResult.error
    );
    return {
      analysis: AI_ANALYSIS_FALLBACK,
      fromAI: false,
      errorMessage: geminiResult.error,
    };
  }

  // Step 5: Validate result against AIAnalysisSchema (PRD-03 §3.2, §4.1)
  try {
    const rawAnalysis = parseAndValidate(geminiResult.rawText);

    // Steps 6–9: Apply routing rules, review triggers, safety overrides
    const analysis = enforceReviewRules(rawAnalysis);

    return {
      analysis,
      fromAI: true,
      modelName: geminiResult.modelName,
      processedAt: geminiResult.processedAt,
      rawModelOutput: geminiResult.rawText,
    };
  } catch (err) {
    // PRD-03 §4.1: reject invalid/incomplete output — log and use fallback
    let errorMessage = "Unknown validation error";

    if (err instanceof SyntaxError) {
      errorMessage = `JSON parse error: ${err.message}`;
    } else if (err instanceof ZodError) {
      // Log Zod issues server-side only — never expose to client
      const issues = err.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      errorMessage = `Schema validation failed: ${issues}`;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    console.error(
      "[CivicPulse AI] analyzeComplaint: validation failed.",
      errorMessage
    );

    return {
      analysis: AI_ANALYSIS_FALLBACK,
      fromAI: false,
      rawModelOutput: geminiResult.rawText,
      errorMessage,
    };
  }
}
