/**
 * src/lib/ai/client.ts
 *
 * PRD-03 :: AI Engine — Server-side LLM client wrapper (Google Gemini).
 * Uses the official @google/generative-ai SDK with vision support.
 *
 * "server-only" import ensures this module CANNOT be bundled into client code.
 * Next.js will throw a build error if any client component imports this.
 *
 * Env vars required (set in .env.local, never committed):
 *   AI_API_KEY  — your Google AI Studio API key
 *   AI_MODEL    — model name, e.g., "gemini-1.5-pro" (default)
 */

import "server-only"; // Hard guard: client bundle build fails if imported

import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type GenerativeModel,
  type InlineDataPart,
  type TextPart,
} from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Environment validation — fail loudly at startup on the server, not at
// request time, so misconfiguration is caught before deployment.
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[CivicPulse AI] Missing required environment variable: ${name}. ` +
        `Check your .env.local file and server environment.`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Lazy singleton — model is instantiated once per server cold start.
// We defer validation to the first call so the server can boot even without
// the key set during local development if AI features are not exercised.
// ---------------------------------------------------------------------------
let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (_model) return _model;

  const apiKey = requireEnv("AI_API_KEY");
  const modelName = process.env["AI_MODEL"] ?? "gemini-1.5-pro";

  const genAI = new GoogleGenerativeAI(apiKey);

  _model = genAI.getGenerativeModel({
    model: modelName,
    // Safety settings — block harmful content, allow civic complaints
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
// Public types for call-site usage
// ---------------------------------------------------------------------------
export interface AIClientImagePart {
  /** Base64-encoded image data (without the data: prefix) */
  base64Data: string;
  /** MIME type of the image, e.g., "image/jpeg", "image/png" */
  mimeType: string;
}

export interface AIClientRequestParams {
  systemInstruction: string;
  userMessage: string;
  image?: AIClientImagePart;
  /** Request timeout in milliseconds. Default: 30_000 (30 seconds) */
  timeoutMs?: number;
}

export interface AIClientResponse {
  /** Raw JSON string from the model */
  rawText: string;
  /** True if the call succeeded without errors */
  success: true;
}

export interface AIClientError {
  success: false;
  error: string;
}

export type AIClientResult = AIClientResponse | AIClientError;

// ---------------------------------------------------------------------------
// Core function — calls Gemini with optional image, returns raw JSON text
// ---------------------------------------------------------------------------
export async function callAIModel(
  params: AIClientRequestParams
): Promise<AIClientResult> {
  const { systemInstruction, userMessage, image, timeoutMs = 30_000 } = params;

  // Build the content parts array (text + optional image)
  const parts: (TextPart | InlineDataPart)[] = [];

  if (image) {
    parts.push({
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    } satisfies InlineDataPart);
  }

  parts.push({ text: userMessage } satisfies TextPart);

  try {
    const model = getModel();

    // Race between the AI request and a manual timeout
    const result = await Promise.race([
      model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts }],
        generationConfig: {
          // Force JSON output mode — reduces hallucinated markdown wrapping
          responseMimeType: "application/json",
          temperature: 0.1,   // Low temperature for deterministic classification
          topP: 0.8,
          maxOutputTokens: 1024,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`AI request timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);

    const rawText = result.response.text().trim();

    if (!rawText) {
      return {
        success: false,
        error: "AI returned an empty response.",
      };
    }

    return { success: true, rawText };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CivicPulse AI] callAIModel error:", message);
    return { success: false, error: message };
  }
}
