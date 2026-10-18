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
// Environment validation — startup mein fail karo taake deploy se pehle pata chale
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[CivicPulse AI] Missing required server env variable: "${name}". ` +
        `Set it in .env.local — never expose to client.`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Lazy singleton — model instance per server cold start
// Defer key validation so server boots even without key in non-AI dev modes
// ---------------------------------------------------------------------------
let _model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (_model) return _model;

  const apiKey = requireEnv("AI_API_KEY");
  const modelName = process.env["AI_MODEL"] ?? "gemini-1.5-pro";

  const genAI = new GoogleGenerativeAI(apiKey);

  _model = genAI.getGenerativeModel({
    model: modelName,
    // PRD-03 §5.3: block harmful content; allow civic complaint descriptions
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

  return _model;
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
  /** Request timeout ms. Default 30_000. PRD-03 §11: must not lose complaint on timeout. */
  timeoutMs?: number;
}

export type GeminiResult =
  | { success: true; rawText: string; modelName: string; processedAt: string }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Core client call — returns raw text for schema validation upstream
// PRD-03 §4.1: validate provider response with Zod (done in analyze-complaint.ts)
// ---------------------------------------------------------------------------
export async function callGemini(params: GeminiRequestParams): Promise<GeminiResult> {
  const { systemInstruction, userMessage, image, timeoutMs = 30_000 } = params;

  // Build multimodal content parts — image first if present (PRD-03 §5.4)
  const parts: (TextPart | InlineDataPart)[] = [];

  if (image) {
    parts.push({
      inlineData: { data: image.base64Data, mimeType: image.mimeType },
    } satisfies InlineDataPart);
  }

  parts.push({ text: userMessage } satisfies TextPart);

  try {
    const model = getGeminiModel();
    const modelName = process.env["AI_MODEL"] ?? "gemini-1.5-pro";

    // Race AI call against timeout — PRD-03 §11: timeouts must not lose complaint
    const result = await Promise.race([
      model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json", // structured output mode
          temperature: 0.1,    // low temp for deterministic classification
          topP: 0.8,
          maxOutputTokens: 1024, // PRD-03 §13: bound output size
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);

    const rawText = result.response.text().trim();

    if (!rawText) {
      return { success: false, error: "Gemini returned an empty response." };
    }

    return {
      success: true,
      rawText,
      modelName,
      processedAt: new Date().toISOString(), // PRD-03 §4.1: record processing timestamp
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // PRD-03 §13: log metadata, not raw prompts or images
    console.error("[CivicPulse AI] callGemini error:", message);
    return { success: false, error: message };
  }
}
