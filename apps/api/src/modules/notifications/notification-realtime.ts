// Realtime contract shared by the API gateway (holds sockets) and the worker (emits through Redis).
export const NOTIFICATIONS_NAMESPACE = "/notifications";
export const NOTIFICATION_CREATED_EVENT = "notification.created";

export function accountRoom(accountId: string) {
  return `account:${accountId}`;
}
