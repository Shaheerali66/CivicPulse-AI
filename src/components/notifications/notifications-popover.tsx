/**
 * src/components/notifications/notifications-popover.tsx
 *
 * PRD-04 :: Notifications — In-app notification popover.
 * Fetches user's own notifications only via GET /api/notifications.
 * Allows marking notifications as read via PATCH /api/notifications/[id]/read.
 * Displays honest empty, loading, and error states.
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, Check, Loader2, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  complaint_id: string | null;
  created_at: string;
}

export function NotificationsPopover({
  onSelectComplaint,
}: {
  onSelectComplaint?: (complaintId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        if (res.status === 401) return; // not logged in
        throw new Error("Failed to load notifications");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unread_count || 0);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn("Failed to mark notification read", err);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-md bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-xs text-rose-600">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No notifications found.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 transition-colors ${
                    !n.is_read ? "bg-blue-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.body}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    {n.complaint_id && onSelectComplaint ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectComplaint(n.complaint_id!);
                          if (!n.is_read) markAsRead(n.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Complaint
                      </button>
                    ) : (
                      <span />
                    )}
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
