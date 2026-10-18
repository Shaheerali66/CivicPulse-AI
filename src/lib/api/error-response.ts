/**
 * src/lib/api/error-response.ts
 *
 * PRD-04 :: API Helpers — Consistent error response factory.
 * Ensures no internal details, stack traces, or DB errors leak to clients.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}) },
    { status }
  );
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const issues = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
  }

  console.error("[CivicPulse API] Unhandled error:", err);

  // Never expose internal error details to clients
  return errorResponse("An internal error occurred. Please try again.", 500, "INTERNAL_ERROR");
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(params: {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      items: params.items,
      total: params.total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(params.total / params.pageSize),
    },
  });
}
