/**
 * src/lib/ai/schema.ts
 *
 * PRD-03 :: AI Engine — Zod validation schema for structured AI output.
 * Server-side only. Do NOT import this from any client component.
 *
 * Sab categories civic complaints ke liye defined hain.
 * "unknown" tab use hoga jab AI confident na ho.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Category enum — har ek civic complaint type map hota hai ek department se
// ---------------------------------------------------------------------------
export const ComplaintCategoryEnum = z.enum([
  "road_damage",        // sadak toot gayi / road broken
  "footpath_damage",    // paidal rasta damaged
  "garbage",            // kachra / litter issue
  "waste_collection",   // kachra collection nahi hui
  "water_leakage",      // pani ka rissav / pipe burst
  "blocked_drain",      // nali band / choked drain
  "streetlight",        // bijli ki batti kharab
  "electrical_hazard",  // bijli ka khatarnak masla
  "other",              // koi aur masla
  "unknown",            // AI ko samajh nahi aaya — human review needed
]);

export type ComplaintCategory = z.infer<typeof ComplaintCategoryEnum>;

// ---------------------------------------------------------------------------
// Severity enum — kitna urgent hai masla
// ---------------------------------------------------------------------------
export const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);

export type Severity = z.infer<typeof SeverityEnum>;

// ---------------------------------------------------------------------------
// Core AI Analysis Schema — Gemini/LLM response ka structured output
// ---------------------------------------------------------------------------
export const AIAnalysisSchema = z.object({
  /**
   * Detected civic complaint category.
   * Must match a strict enum value. Use "unknown" when ambiguous.
   */
  category: ComplaintCategoryEnum,

  /**
   * Short human-readable summary of the complaint.
   * Min 5 chars (non-trivial), max 500 chars (concise).
   */
  summary: z
    .string()
    .min(5, "Summary must be at least 5 characters")
    .max(500, "Summary must not exceed 500 characters"),

  /**
   * Urgency level of the complaint.
   * "critical" = immediate safety risk, "low" = minor inconvenience.
   */
  severity: SeverityEnum,

  /**
   * AI confidence score between 0 (no confidence) and 1 (fully confident).
   * Below 0.5 → needsHumanReview should generally be true.
   */
  confidence: z
    .number()
    .min(0, "Confidence must be >= 0")
    .max(1, "Confidence must be <= 1"),

  /**
   * Human-readable department category suggestion.
   * E.g., "Roads & Works", "Sanitation", etc.
   * This is AI's suggestion — final mapping is done by department-mapping.ts.
   */
  suggestedDepartmentCategory: z.string().min(1),

  /**
   * True if the issue poses an immediate safety risk to citizens.
   * Triggers priority escalation in the routing layer.
   */
  safetyConcern: z.boolean(),

  /**
   * True if a human agent should review before automatic routing.
   * Always true when confidence < 0.5 or category === "unknown".
   */
  needsHumanReview: z.boolean(),

  /**
   * AI's internal reasoning for its classification.
   * Max 500 chars — used for audit trails and human review queue.
   * Must NOT echo back user-supplied text verbatim to prevent data leakage.
   */
  reasoning: z
    .string()
    .max(500, "Reasoning must not exceed 500 characters"),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ---------------------------------------------------------------------------
// Fallback / error state — jab AI call fail ho jaye
// ---------------------------------------------------------------------------
export const AI_ANALYSIS_FALLBACK = {
  category: "unknown" as ComplaintCategory,
  summary: "Unable to analyze complaint at this time.",
  severity: "medium" as Severity,
  confidence: 0,
  suggestedDepartmentCategory: "Municipal Services / Human Review",
  safetyConcern: false,
  needsHumanReview: true,
  reasoning: "AI analysis failed or timed out. Routed to human review queue.",
} satisfies AIAnalysis;
