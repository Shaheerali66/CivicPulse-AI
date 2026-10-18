/**
 * src/lib/notifications/service.ts
 *
 * PRD-04 :: Notifications — In-app notification service.
 * Notifications sirf backend server se create hoti hain.
 * Client sirf read aur mark-as-read kar sakta hai.
 *
 * IMPORTANT: External notifications (email/SMS) yahan claim nahi ki gayi.
 * Jab tak actual provider configure nahi hota, in-app only hai.
 */

import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

export interface CreateNotificationParams {
  user_id: string;
  complaint_id?: string;
  type: NotificationType;
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Create a notification for a user (server-side only)
// A failed notification MUST NOT undo the triggering operation.
// ---------------------------------------------------------------------------
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from("notifications").insert({
      user_id: params.user_id,
      complaint_id: params.complaint_id ?? null,
      type: params.type,
      title: params.title,
      body: params.body,
      is_read: false,
    });

    if (error) {
      console.error("[CivicPulse Notifications] Insert failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CivicPulse Notifications] Unexpected error:", message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Notification templates — consistent messaging for common events
// ---------------------------------------------------------------------------

export async function notifyComplaintAssigned(params: {
  officer_id: string;
  complaint_id: string;
  tracking_id: string;
  department_name: string;
}): Promise<void> {
  await createNotification({
    user_id: params.officer_id,
    complaint_id: params.complaint_id,
    type: "complaint_assigned",
    title: "New complaint assigned",
    body: `Complaint ${params.tracking_id} has been assigned to you in ${params.department_name}.`,
  });
}

export async function notifyStatusChanged(params: {
  citizen_user_id: string;
  complaint_id: string;
  tracking_id: string;
  new_status: string;
}): Promise<void> {
  const statusLabels: Record<string, string> = {
    assigned: "has been assigned to a department",
    in_progress: "is now being worked on",
    resolved: "has been resolved",
    closed: "has been closed",
    rejected: "could not be processed",
    needs_review: "is under review",
  };

  const label = statusLabels[params.new_status] ?? `status changed to ${params.new_status}`;

  await createNotification({
    user_id: params.citizen_user_id,
    complaint_id: params.complaint_id,
    type: "status_changed",
    title: "Complaint status updated",
    body: `Your complaint ${params.tracking_id} ${label}.`,
  });
}

export async function notifyReviewRequired(params: {
  reviewer_user_id: string;
  complaint_id: string;
  tracking_id: string;
  reason: string;
}): Promise<void> {
  await createNotification({
    user_id: params.reviewer_user_id,
    complaint_id: params.complaint_id,
    type: "review_requested",
    title: "Review required",
    body: `Complaint ${params.tracking_id} needs human review: ${params.reason}`,
  });
}
