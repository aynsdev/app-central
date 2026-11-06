/**
 * App Central client. One file, no dependencies: copy it into any JS/TS app
 * (React Native, Expo, web, Electron, Node).
 *
 * - Events are queued and sent in batches.
 * - The queue is persisted, so offline apps keep events until they reconnect.
 * - Each event carries a message_id, so retried batches are never double-counted.
 * - Without identify(), a random anonymous id is generated and stored per install.
 */

export type StorageLike = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
};

export type AppCentralOptions = {
  /** Base URL of your App Central instance, e.g. https://central.example.com */
  endpoint: string;
  /** The project's ingest key from Settings. */
  key: string;
  appVersion?: string;
  platform?: string;
  /** Where the user id and offline queue live. Defaults to localStorage, else memory. Pass AsyncStorage in React Native. */
  storage?: StorageLike;
  /** Flush every N ms. Default 10s. */
  flushInterval?: number;
  /** Flush as soon as this many events are queued. Default 20. */
  flushAt?: number;
  /** Cap on stored events while offline; the oldest are dropped. Default 1000. */
  maxQueueSize?: number;
  /** Set false to disable sending (e.g. in development). */
  enabled?: boolean;
  /** Log errors to the console. */
  debug?: boolean;
};

type QueuedEvent = {
  event: string;
  user_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
  session_id: string;
  app_version?: string;
  platform?: string;
  message_id: string;
};

const USER_KEY = "app_central:user_id";
const QUEUE_KEY = "app_central:queue";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function defaultStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_central:test", "1");
      return localStorage;
    }
  } catch {
    // Private mode or no DOM.
  }
  return memoryStorage();
}

function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createAppCentral(options: AppCentralOptions) {
  const endpoint = options.endpoint.replace(/\/$/, "");
  const storage = options.storage ?? defaultStorage();
  const flushAt = options.flushAt ?? 20;
  const maxQueue = options.maxQueueSize ?? 1000;
  const enabled = options.enabled ?? true;
  const sessionId = uuid();

  let userId: string | null = null;
  let queue: QueuedEvent[] = [];
  let flushing: Promise<void> | null = null;

  const log = (...args: unknown[]) => options.debug && console.warn("[app-central]", ...args);

  const ready = (async () => {
    try {
      userId = await storage.getItem(USER_KEY);
      if (!userId) {
        userId = uuid();
        await storage.setItem(USER_KEY, userId);
      }
      const saved = await storage.getItem(QUEUE_KEY);
      if (saved) queue = [...(JSON.parse(saved) as QueuedEvent[]), ...queue];
    } catch (e) {
      log("could not read storage", e);
      userId ??= uuid();
    }
  })();

  const persist = async () => {
    try {
      await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      log("could not persist queue", e);
    }
  };

  async function post(path: string, body: unknown) {
    const res = await fetch(`${endpoint}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status < 500) {
      // 4xx won't succeed on retry; surface it and drop the payload.
      log(`${path} rejected`, res.status, await res.text().catch(() => ""));
      return true;
    }
    return res.ok;
  }

  async function flushOnce() {
    await ready;
    if (!enabled || queue.length === 0) return;
    const batch = queue.slice(0, 500);
    try {
      const done = await post("/api/v1/events", { events: batch });
      if (done) {
        // Remove only what was sent; new events may have been queued meanwhile.
        const sent = new Set(batch.map((e) => e.message_id));
        queue = queue.filter((e) => !sent.has(e.message_id));
        await persist();
      }
    } catch (e) {
      log("offline, will retry", e);
    }
  }

  /** Sends queued events now. Safe to call often; concurrent calls share one request. */
  function flush(): Promise<void> {
    flushing ??= flushOnce().finally(() => {
      flushing = null;
    });
    return flushing;
  }

  const timer = setInterval(flush, options.flushInterval ?? 10_000);
  (timer as { unref?: () => void }).unref?.();

  return {
    /** Records an event. Never throws; queued until it can be sent. */
    track(event: string, properties: Record<string, unknown> = {}) {
      void ready.then(async () => {
        queue.push({
          event,
          user_id: userId!,
          properties,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          app_version: options.appVersion,
          platform: options.platform,
          message_id: uuid(),
        });
        if (queue.length > maxQueue) queue = queue.slice(-maxQueue);
        await persist();
        if (queue.length >= flushAt) void flush();
      });
    },

    /** Switches to a known user id (e.g. after sign-in) and merges traits into their profile. */
    async identify(id: string, traits: Record<string, unknown> = {}) {
      await ready;
      userId = id;
      await storage.setItem(USER_KEY, id);
      if (!enabled) return;
      try {
        await post("/api/v1/identify", { user_id: id, traits, app_version: options.appVersion, platform: options.platform });
      } catch (e) {
        log("identify failed", e);
      }
    },

    /** Generates a fresh anonymous id, e.g. on sign-out. */
    async reset() {
      await ready;
      userId = uuid();
      await storage.setItem(USER_KEY, userId);
    },

    async getUserId() {
      await ready;
      return userId!;
    },

    flush,

    /** Stops the background timer. */
    shutdown() {
      clearInterval(timer);
      return flush();
    },
  };
}

export type AppCentral = ReturnType<typeof createAppCentral>;
