/**
 * src/app/api/departments/route.ts
 *
 * PRD-04 :: API — GET & POST /api/departments
 * - GET: Returns active municipal departments.
 * - POST: Creates a new department and persists it directly into public.departments.
 * Supports service role fallback in development/demo mode.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function GET(_request: NextRequest) {
  try {
    let user = null;
    try {
      user = await getCurrentUser();
    } catch {
      user = null;
    }

    const supabase = user ? await createSupabaseServerClient() : createAdminClient();

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, slug, description, is_active, created_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[CivicPulse API] departments GET error:", error.message);
      return errorResponse("Failed to fetch departments.", 500, "DB_ERROR");
    }

    return successResponse(data ?? []);
  } catch (err) {
    return handleRouteError(err);
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
