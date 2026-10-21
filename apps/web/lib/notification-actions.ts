"use server";

import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// NT-04: the signed-in user's inbox for the header bell. New ones arrive over the socket; these
// actions load the initial list and mark items read.

export type NotificationItem = {
  id: string;
  event: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function loadNotificationsAction() {
  const [list, unread] = await Promise.all([
    request<{ items: NotificationItem[] }>("/notifications?limit=15"),
    request<{ count: number }>("/notifications/unread-count")
  ]);

  return list && unread ? { items: list.items, unreadCount: unread.count } : null;
}

export async function markNotificationReadAction(id: string) {
  return Boolean(await request(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }));
}

export async function markAllNotificationsReadAction() {
  return Boolean(await request("/notifications/read-all", { method: "POST" }));
}
