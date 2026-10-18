/**
 * src/lib/ai/schema.ts
 *
 * PRD-03 §4.1 — Zod validation schema for structured AI output.
 * Server-side only. Do NOT import this from any client component.
 *
 * Sab categories civic complaints ke liye defined hain.
 * "unknown" tab use hoga jab AI confident na ho.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Category enum — har ek civic complaint type map hota hai ek department se
// PRD-03 §4: controlled category list to avoid inconsistent free-text
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
  "other",              // koi aur masla jo list mein nahi
  "unknown",            // AI ko samajh nahi aaya — human review needed
]);

export type ComplaintCategory = z.infer<typeof ComplaintCategoryEnum>;

// ---------------------------------------------------------------------------
// Severity enum — kitna urgent hai masla (PRD-03 §9.2)
// Low(20) / Medium(45) / High(75) / Critical(100) — used in priority formula
// ---------------------------------------------------------------------------
export const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);

export type Severity = z.infer<typeof SeverityEnum>;

// ---------------------------------------------------------------------------
// Core AI Analysis Schema — exactly as specified in PRD-03 §4.1
// Yeh schema Gemini/LLM response validate karta hai Zod se
// ---------------------------------------------------------------------------
export const AIAnalysisSchema = z.object({
  /**
   * Standardized issue classification (PRD-03 §4.2).
   * Use "unknown" when insufficient evidence to distinguish categories.
   */
  category: ComplaintCategoryEnum,

  /**
   * Short, neutral summary of the reported issue (PRD-03 §4.2).
   * Based only on supported facts — model must not invent details.
   */
  summary: z.string().min(5).max(500),

  /**
   * Estimated impact severity for review and prioritization (PRD-03 §4.2).
   */
  severity: SeverityEnum,

  /**
   * Model-reported confidence indicator 0–1 (PRD-03 §4.2, §6).
   * >=0.80: may auto-proceed | 0.60–0.79: flag review | <0.60: human review.
   * Treated as an indicator — not a calibrated probability.
   */
  confidence: z.number().min(0).max(1),

  /**
   * Category/routing key for department mapping — max 100 chars (PRD-03 §4.1).
   * AI suggestion only; validated server-side by department-mapping.ts.
   * Must not be used as a DB ID directly (PRD-03 §7.3).
   */
  suggestedDepartmentCategory: z.string().max(100),

  /**
   * Indicates a potential safety-related issue requiring attention (PRD-03 §4.2).
   * Triggers safety-review escalation per PRD-03 §9.4.
   */
  safetyConcern: z.boolean(),

  /**
   * Signals that result should be reviewed by an authorized officer (PRD-03 §4.2, §6.1).
   * Required when: confidence < 0.60, category unknown, safety concern, etc.
   */
  needsHumanReview: z.boolean(),

  /**
   * Short, user-safe explanation based on available evidence (PRD-03 §4.2).
   * Not hidden chain-of-thought. Max 500 chars. No raw user text echoed.
   */
  reasoning: z.string().max(500),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ---------------------------------------------------------------------------
// Fallback state — jab AI call fail ho jaye
// PRD-03 §11: original complaint must be preserved; analysis marked pending/failed
// ---------------------------------------------------------------------------
export const AI_ANALYSIS_FALLBACK = {
  category: "unknown" as ComplaintCategory,
  summary: "Unable to analyze complaint at this time.",
  severity: "medium" as Severity,
  confidence: 0,
  suggestedDepartmentCategory: "Municipal Services",
  safetyConcern: false,
  needsHumanReview: true,
  reasoning: "AI analysis failed or timed out. Manual review required.",
} satisfies AIAnalysis;
