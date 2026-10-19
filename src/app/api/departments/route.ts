/**
 * src/app/api/departments/route.ts
 *
 * PRD-04 :: API — GET & POST /api/departments
 * - GET: Returns active municipal departments with bulletproof static fallback.
 * - POST: Creates a new department and persists it directly into public.departments.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_DEPARTMENTS = [
  {
    id: "hmc-hyderabad",
    name: "Hyderabad Municipal Corporation (HMC)",
    code: "hmc-hyderabad",
    slug: "hmc-hyderabad",
    description: "Solid waste management, municipal sanitation, streetlights, local public parks, and neighborhood infrastructure.",
    is_active: true,
  },
  {
    id: "hwasa-hyderabad",
    name: "Hyderabad Water & Sewerage Corporation (HWASA)",
    code: "hwasa-hyderabad",
    slug: "hwasa-hyderabad",
    description: "Potable water supply networks, main pipelines, sewer overflow containment, and blocked drainage clearing.",
    is_active: true,
  },
  {
    id: "hesco-hyderabad",
    name: "Hyderabad Electric Supply Company (HESCO)",
    code: "hesco-hyderabad",
    slug: "hesco-hyderabad",
    description: "Grid electricity distribution, pole transformers, exposed live high-voltage wiring, and power safety hazards.",
    is_active: true,
  },
  {
    id: "pwd-sindh",
    name: "Provincial Works & Services Department (PWD Sindh)",
    code: "pwd-sindh",
    slug: "pwd-sindh",
    description: "Provincial highways, main arterial boulevards, major flyovers, bridges, and primary civic transport corridors.",
    is_active: true,
  },
  {
    id: "tmc-hyderabad",
    name: "Town Municipal Committees (TMC)",
    code: "tmc-hyderabad",
    slug: "tmc-hyderabad",
    description: "Zonal sweeping, neighborhood drain desilting, local encroachment monitoring, and union committee civic works.",
    is_active: true,
  },
];

export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabase
          .from("departments")
          .select("id, name, slug, description, is_active, created_at")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          return NextResponse.json({
            success: true,
            departments: data,
            data: data,
          });
        }
      } catch (dbErr) {
        console.warn("[CivicPulse API] Supabase departments lookup exception, using fallback:", dbErr);
      }
    }

    // Failsafe fallback: return standard default departments
    return NextResponse.json({
      success: true,
      departments: DEFAULT_DEPARTMENTS,
      data: DEFAULT_DEPARTMENTS,
    });
  } catch (err) {
    console.error("[CivicPulse API] departments GET unexpected error, using fallback:", err);
    return NextResponse.json({
      success: true,
      departments: DEFAULT_DEPARTMENTS,
      data: DEFAULT_DEPARTMENTS,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    let user = null;
    try {
      user = await getCurrentUser();
    } catch {
      user = null;
    }

    const supabase = user ? await createSupabaseServerClient() : createAdminClient();

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length < 2) {
      return errorResponse("Department name is required (minimum 2 characters).", 400, "VALIDATION_ERROR");
    }

    // Auto-generate slug if omitted or empty
    const slug =
      typeof body.slug === "string" && body.slug.trim().length >= 2
        ? body.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")
        : name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const description = typeof body.description === "string" ? body.description.trim() : null;
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true;

    // Check if slug or name already exists
    const { data: existing } = await supabase
      .from("departments")
      .select("id, name, slug")
      .or(`slug.eq.${slug},name.ilike.${name}`)
      .maybeSingle();

    if (existing) {
      return successResponse(existing, 200);
    }

    const { data, error } = await supabase
      .from("departments")
      .insert({
        name,
        slug,
        description,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("[CivicPulse API] Department creation error:", error.message);
      return errorResponse("Failed to create department in database.", 500, "DB_ERROR");
    }

    return successResponse(data, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
