"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { formatDateTime } from "@/components/auth/login-history-table";
import {
  loadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItem
} from "@/lib/notification-actions";
import { Bell } from "@/lib/icons";

const CREATED_EVENT = "notification.created";
const MAX_ITEMS = 15;

// The session lives in httpOnly cookies, so the socket gets its access token from a same-origin
// route; socket.io calls this again on every reconnect (the server drops sockets at token expiry).
async function socketAuth(callback: (data: { token?: string }) => void) {
  try {
    const response = await fetch("/api/auth/socket-token", { cache: "no-store" });
    const body = response.ok ? ((await response.json()) as { token?: string }) : {};
    callback({ token: body.token });
  } catch {
    callback({});
  }
}

// NT-04: header bell with unread badge, a dropdown of recent notifications, and live updates.
export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    let socket: Socket | null = null;

    void loadNotificationsAction().then((data) => {
      if (!active || !data) return;
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    });

    void fetch("/api/auth/socket-token", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ url: string }>) : null))
      .then((config) => {
        if (!active || !config?.url) return;
        socket = io(config.url, { auth: socketAuth, transports: ["websocket"] });
        socket.on(CREATED_EVENT, (notification: NotificationItem) => {
          setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, MAX_ITEMS));
          setUnreadCount((count) => count + 1);
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen]);

  const openItem = async (item: NotificationItem) => {
    if (!item.readAt) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)));
      setUnreadCount((count) => Math.max(0, count - 1));
      await markNotificationReadAction(item.id);
    }
    if (item.link) window.location.assign(item.link);
  };

  const markAll = async () => {
    setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  };

  const label = unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo";

  return (
    <div className="notification-bell" ref={wrapRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label}
        className={unreadCount > 0 ? "icon-button has-badge" : "icon-button"}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={18} weight="duotone" aria-hidden="true" />
        {unreadCount > 0 ? <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="dialog" aria-label="Thông báo">
          <header>
            <strong>Thông báo</strong>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAll}>Đánh dấu đã đọc tất cả</button>
            ) : null}
          </header>
          {items.length === 0 ? (
            <p className="notification-empty">Chưa có thông báo nào.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button className={item.readAt ? "notification-item" : "notification-item is-unread"} type="button" onClick={() => void openItem(item)}>
                    <strong>{item.title}</strong>
                    {item.body ? <span>{item.body}</span> : null}
                    <small>{formatDateTime(item.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
