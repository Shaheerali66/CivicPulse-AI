/**
 * src/lib/supabase/admin.ts
 *
 * PRD-02 :: Privileged Server-Only Supabase Client.
 * Strictly server-side using SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import this file from any client component or browser code.
 * All comments use Roman English or Roman Urdu.
 */

import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database, UserRole, Tables, InsertTables } from "@/types/database";

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[CivicPulse Admin] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. " +
        "Privileged operations require server configuration."
    );
  }

  // Privileged client with service-role permissions
  _adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

// ----------------------------------------------------------------------------
// Trusted Audit Logging Workflow (PRD-02 Section 12)
// ----------------------------------------------------------------------------
export interface RecordAuditEventParams {
  complaintId: string;
  actorId?: string | null;
  eventType: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  note?: string | null;
}

/**
 * Records an immutable audit event in complaint_events.
 * Trusted server function. Never logs sensitive tokens or passwords.
 */
export async function recordAuditEvent(params: RecordAuditEventParams) {
  const admin = createAdminClient();

  // Strip any accidental sensitive keys from audit payloads
  const sanitize = (val: Record<string, unknown> | null | undefined) => {
    if (!val) return null;
    const sanitized = { ...val };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    return sanitized;
  };

  const { data, error } = await admin.from("complaint_events").insert({
    complaint_id: params.complaintId,
    actor_id: params.actorId ?? null,
    event_type: params.eventType,
    previous_value: sanitize(params.previousValue) as any,
    new_value: sanitize(params.newValue) as any,
    note: params.note ?? null,
  }).select().single();

  if (error) {
    console.error("[CivicPulse Audit] Failed to record audit event:", error.message);
  }

  return data;
}

// ----------------------------------------------------------------------------
// Trusted Notification Workflow (PRD-02 Section 5.9)
// ----------------------------------------------------------------------------
export interface CreateNotificationParams {
  userId: string;
  complaintId?: string | null;
  type: "status_update" | "assignment" | "ai_complete" | "review_required" | "system";
  title: string;
  message: string;
}

/**
 * Creates an in-app notification scoped to a specific recipient.
 * Only called after the underlying operational change has actually succeeded.
 */
export async function createNotification(params: CreateNotificationParams) {
  const admin = createAdminClient();

  const { data, error } = await admin.from("notifications").insert({
    user_id: params.userId,
    complaint_id: params.complaintId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
  }).select().single();

  if (error) {
    console.error("[CivicPulse Notifications] Failed to create notification:", error.message);
  }

  return data;
}

// ----------------------------------------------------------------------------
// Trusted AI Analysis Persistence (PRD-02 Section 5.5)
// ----------------------------------------------------------------------------
export async function saveTrustedAIAnalysis(
  analysisData: InsertTables<"ai_analyses">
): Promise<Tables<"ai_analyses">> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ai_analyses")
    .insert(analysisData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[CivicPulse AI Storage] Failed to store AI analysis: ${error?.message}`);
  }

  return data;
}

// ----------------------------------------------------------------------------
// Administrative Role Management (PRD-02 Section 7.3)
// ----------------------------------------------------------------------------
export async function updateUserRole(
  adminUserId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<Tables<"profiles">> {
  const admin = createAdminClient();

  // 1. Verify acting user is indeed an administrator
  const { data: actingUser, error: actingErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", adminUserId)
    .single();

  if (actingErr || actingUser?.role !== "admin") {
    throw new Error("[CivicPulse Security] Unauthorized: Only administrators can modify roles.");
  }

  // 2. Prevent self-demotion or self-escalation bypass
  if (adminUserId === targetUserId && newRole !== "admin") {
    throw new Error("[CivicPulse Security] Cannot revoke your own administrator privileges.");
  }

  // 3. Get existing target profile for audit trail
  const { data: targetUser, error: targetErr } = await admin
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (targetErr || !targetUser) {
    throw new Error(`[CivicPulse Security] Target user ${targetUserId} not found.`);
  }

  const previousRole = targetUser.role;

  // 4. Update the role
  const { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`[CivicPulse Security] Role update failed: ${updateErr?.message}`);
  }

  // 5. Audit the role change
  console.info(
    `[CivicPulse Audit] Admin ${adminUserId} changed user ${targetUserId} role from ${previousRole} to ${newRole}.`
  );

  return updated;
}
