// Queue names shared by the API (producer) and the worker process (consumer).
export const NOTIFICATIONS_QUEUE = "notifications";
export const EMAIL_QUEUE = "email";

export const QUEUE_PREFIX = "helios";

// The worker refreshes this key; /health reports the worker as down once it expires.
export const WORKER_HEARTBEAT_KEY = `${QUEUE_PREFIX}:worker:heartbeat`;
export const WORKER_HEARTBEAT_INTERVAL_MS = 15_000;
export const WORKER_HEARTBEAT_TTL_SECONDS = 45;

export const DEFAULT_REDIS_URL = "redis://localhost:6379";
