/**
 * src/app/api/health/route.ts
 *
 * PRD-04 :: Health — GET /api/health
 * Minimal application health endpoint.
 * Returns only availability information — NEVER exposes secrets, env vars, or DB details.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "CivicPulse AI",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
