/**
 * src/lib/auth/session.ts
 *
 * PRD-04 :: Auth — Server-side session and permission helpers.
 * Ye module authentication aur authorization ke liye hai.
 *
 * Design:
 * - getCurrentUser() — returns the authenticated user or null
 * - requireAuth() — throws/redirects if not authenticated
 * - getProfile() — fetches the user's role and department from profiles table
 * - requireRole() — enforces role-based access control
 */

import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DbProfile, UserRole } from "@/types/database";

// ---------------------------------------------------------------------------
// Get current authenticated user (server-side)
// Returns null if not authenticated — never throws on auth failure.
// ---------------------------------------------------------------------------
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Require authentication — redirect to login if not signed in
// Use at the top of protected Server Components and Route Handlers.
// ---------------------------------------------------------------------------
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Get user profile with role and department information
// ---------------------------------------------------------------------------
export async function getProfile(userId: string): Promise<DbProfile | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)   // profiles PK is "id", not "user_id"
      .single();

    if (error || !data) return null;
    return data as DbProfile;
  } catch (err) {
    console.error("[CivicPulse Auth] getProfile error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Get current user + their profile in one call
// ---------------------------------------------------------------------------
export async function getCurrentUserWithProfile(): Promise<{
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  profile: DbProfile | null;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  return { user, profile };
}

// ---------------------------------------------------------------------------
// Require a specific role — redirect or throw 403 if insufficient
// ---------------------------------------------------------------------------
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo = "/unauthorized"
): Promise<{ userId: string; profile: DbProfile }> {
  const user = await requireAuth();
  const profile = await getProfile(user.id);

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(redirectTo);
  }

  return { userId: user.id, profile };
}

// ---------------------------------------------------------------------------
// Check if a user is a member of a specific department
// ---------------------------------------------------------------------------
export async function isUserInDepartment(
  userId: string,
  departmentId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("department_members")
    .select("id")
    .eq("user_id", userId)
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .single();

  if (error || !data) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Get all departments a user belongs to
// ---------------------------------------------------------------------------
export async function getUserDepartmentIds(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("department_members")
    .select("department_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !data) return [];
  return data.map((m: { department_id: string }) => m.department_id);
}
