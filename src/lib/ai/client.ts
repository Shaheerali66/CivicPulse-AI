/**
 * src/lib/ai/client.ts
 *
 * PRD-03 §3.1, §3.3 — Server-side Google Gemini client wrapper.
 * Vision-capable LLM integration using @google/generative-ai SDK.
 *
 * "server-only" import is a hard build-time guard — any client component
 * importing this will fail at Next.js build time (PRD-03 §3.3).
 *
 * Required environment variables (never expose to client):
 *   AI_API_KEY  — Google AI Studio API key
 *   AI_MODEL    — model name (default: "gemini-1.5-pro")
 */

import "server-only"; // PRD-03 §3.3: AI credentials must remain server-only

import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type GenerativeModel,
  type InlineDataPart,
  type TextPart,
} from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Environment validation — soft warning only, never crash server boot
// ---------------------------------------------------------------------------
function getEnvOrWarn(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    console.warn(
      `[CivicPulse AI] Missing env variable: "${name}". AI calls will fail gracefully.`
    );
    return null;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Lazy singleton — model instance per server cold start
// Defer key validation so server boots even without key in non-AI dev modes
// ---------------------------------------------------------------------------
let _model: GenerativeModel | null = null;

export function getGeminiModel(customModel?: string): GenerativeModel {
  if (_model && !customModel) return _model;

  // Try keys in order of preference — never throw at module level
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    null;

  if (!apiKey) {
    throw new Error(
      "[CivicPulse AI] No Gemini API key found. Set GEMINI_API_KEY in .env.local."
    );
  }

  // Primary: gemini-2.5-flash (fast, state of the art)
  // Fallbacks: gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-pro
  const modelName =
    customModel ||
    process.env["AI_MODEL"] ||
    process.env["GEMINI_MODEL"] ||
    "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);

  const modelInstance = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  if (!customModel) {
    _model = modelInstance;
  }

  return modelInstance;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export interface GeminiImageInput {
  /** Base64-encoded image bytes — do NOT include the data URI prefix */
  base64Data: string;
  /** MIME type validated before sending, e.g., "image/jpeg" (PRD-03 §5.4) */
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface GeminiRequestParams {
  systemInstruction: string;
  userMessage: string;
  image?: GeminiImageInput;
  /** Request timeout ms. Default 25_000. PRD-03 §11: must not lose complaint on timeout. */
  timeoutMs?: number;
}

export type GeminiResult =
  | { success: true; rawText: string; modelName: string; processedAt: string }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Core client call — returns raw text for schema validation upstream
// Cascades across models to ensure maximum availability
// ---------------------------------------------------------------------------
export async function callGemini(params: GeminiRequestParams): Promise<GeminiResult> {
  const { systemInstruction, userMessage, image, timeoutMs = 25_000 } = params;

  // Build multimodal content parts — image first if present (PRD-03 §5.4)
  const parts: (TextPart | InlineDataPart)[] = [];

  if (image) {
    parts.push({
      inlineData: { data: image.base64Data, mimeType: image.mimeType },
    } satisfies InlineDataPart);
  }

  parts.push({ text: userMessage } satisfies TextPart);

  // Model cascade: try gemini-2.5-flash first, then gemini-2.0-flash / gemini-1.5-flash
  const preferredModel =
    process.env["AI_MODEL"] || process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
  const candidateModels = Array.from(
    new Set([preferredModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"])
  );

  let lastError = "AI model call failed";

  for (const modelCandidate of candidateModels) {
    try {
      const model = getGeminiModel(modelCandidate);

      const result = await Promise.race([
        model.generateContent({
          systemInstruction,
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini request timed out after ${timeoutMs}ms on ${modelCandidate}`)),
            timeoutMs
          )
        ),
      ]);

      const rawText = result.response.text().trim();

      if (rawText) {
        return {
          success: true,
          rawText,
          modelName: modelCandidate,
          processedAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[CivicPulse AI] Candidate ${modelCandidate} failed: ${lastError}`);
      // If error indicates invalid API key itself, don't try other models with same key
      if (
        lastError.includes("API key not valid") ||
        lastError.includes("API_KEY_INVALID") ||
        lastError.includes("No Gemini API key")
      ) {
        break;
      }
    }
  }

  return { success: false, error: lastError };
}
