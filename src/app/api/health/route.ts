/**
 * src/app/api/health/route.ts
 *
 * PRD-02 :: Health Check Endpoint.
 * Reports minimal deployment availability.
 * Never exposes env vars, DB credentials, internal host details, or stack traces.
 * All comments use Roman English or Roman Urdu.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Minimal availability response — no internal topology or secrets exposed
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "CivicPulse AI",
    },
    { status: 200 }
  );
}
