# App Central

Self-hosted monitoring for every app you ship. Point your apps at one API and get, per app:

- **Users & activity**: daily/weekly/monthly actives, new users, retention cohorts, versions and platforms.
- **Onboarding analytics**: an ordered funnel with drop-off per step, and a breakdown of what people answered.
- **Suggestions**: rule-based insights such as "25% drop off before the reminders step" or "No events in 3 days".
- **Weekly reports**: stored in the dashboard and posted to Slack, Discord or any webhook.
- **Offline-friendly ingest**: batch uploads with client timestamps and idempotent retries. Even a device id ping is enough to count a user.

Built with Next.js, PostgreSQL and the [aynsdev/ui](https://ui.ayns.dev) design system.

---

## Quick start

Requirements: Node 22+, and Docker (or any PostgreSQL 14+).

```bash
git clone <this repo> app-central && cd app-central
npm install
cp .env.example .env            # edit DB_* / CRON_SECRET if needed
docker compose up -d db         # Postgres on localhost:5433
npm run db:migrate
npm run db:seed                 # optional: a demo project with 60 days of fake data
npm run dev
```

Open http://localhost:3000. The first visit asks you to create the admin account.

### Run everything in Docker

```bash
CRON_SECRET=$(openssl rand -hex 24) docker compose --profile app up -d --build
```

The app container runs pending migrations on start.

### Deploy on Laravel Forge

See [docs/deploy-forge.md](docs/deploy-forge.md).

### Environment

| Variable | Required | Description |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | yes* | Postgres connection (Laravel/Forge style) |
| `DATABASE_URL` | yes* | Postgres connection string; overrides the `DB_*` settings |
| `APP_URL` | no | Public URL of the dashboard, used in snippets and report links |
| `CRON_SECRET` | for reports | Bearer token for `POST /api/cron/reports` |
| `DATABASE_POOL_SIZE` | no | Connection pool size (default 10) |

\* Set either the `DB_*` variables or `DATABASE_URL`.

---

## Sending data

Create a project in the dashboard to get its **ingest key**. The key can only write events for that project, so it is safe to embed in a mobile or desktop app.

Send the key in any of these ways: `Authorization: Bearer <key>`, an `X-App-Key: <key>` header, or a `?key=<key>` query parameter.

### TypeScript SDK (React Native, Expo, web, Electron, Node)

Copy [`sdk/app-central.ts`](sdk/app-central.ts) into your app. It has no dependencies.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAppCentral } from "./app-central";

export const analytics = createAppCentral({
  endpoint: "https://central.example.com",
  key: "ac_...",
  appVersion: "1.4.0",
  platform: Platform.OS,
  storage: AsyncStorage, // persists the anonymous id and the offline queue
});

analytics.track("onboarding_started");
analytics.track("onboarding_step", { step: "goals", goal: ["sleep", "focus"] });
analytics.track("onboarding_completed");

// Once you know who the user is (optional):
analytics.identify("user_123", { plan: "pro" });
```

Events queue locally and upload in batches every 10 seconds. If the device is offline they stay queued, across restarts, until a request succeeds. Each event carries a `message_id`, so a batch that is retried after a timeout is never counted twice.

### HTTP API

All endpoints accept JSON and allow any origin (CORS).

#### `POST /api/v1/events`

Accepts one event, an array, or `{ "events": [...] }`, up to 500 per request.

```bash
curl -X POST https://central.example.com/api/v1/events \
  -H "Authorization: Bearer ac_..." \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event":"onboarding_step","user_id":"device-abc","properties":{"step":"goals"}}]}'
```

| Field | | |
| --- | --- | --- |
| `event` (or `name`) | required | Event name |
| `user_id` (or `anonymous_id`) | required | Your user id, or a random id generated per install |
| `properties` | | Any JSON object (16 KB max) |
| `timestamp` | | ISO 8601 string or unix seconds/ms. Defaults to now. Future times are clamped to now. |
| `app_version`, `platform` | | Used for the version and platform breakdowns |
| `session_id` | | Optional grouping id |
| `message_id` | | Unique per event; duplicates are dropped |

Response: `202 {"ok":true,"accepted":2,"duplicates":0,"rejected":0}`. Invalid events in a batch are reported in `errors` and the valid ones are still stored.

#### `POST /api/v1/identify`

`{ "user_id": "...", "traits": { ... }, "app_version": "...", "platform": "..." }` merges traits into the user's profile.

#### `GET|POST /api/v1/ping`

The smallest integration: one request per launch records an `app_open` event.

```
GET /api/v1/ping?key=ac_...&user_id=DEVICE_ID&app_version=1.0.0&platform=android
```

#### `POST /api/v1/webhook?key=...[&event=name]`

Stores any JSON payload as one event, for backends, payment providers or form tools. The event name comes from `?event=`, else the payload's `event`/`type`/`name`. The user comes from `user_id`/`userId`/`app_user_id`/`customer_id`/`email`.

---

## Onboarding analytics

On a project's **Onboarding** tab, list the funnel steps one per line. A step is an event name, optionally narrowed by one property:

```
onboarding_started
onboarding_step step=goals
onboarding_step step=reminders
onboarding_completed
```

A user counts for a step only if they did it after the previous step and within the completion window. Every property sent with those events (for example the answers to onboarding questions) is summarized as a breakdown. Array values count each item, so multi-select answers work.

## Reports and suggestions

Suggestions are computed live on the Overview tab. They cover tracking health, week-over-week growth, stickiness, onboarding drop-off, week-2 retention and version adoption. Each rule only fires once there is enough data behind it.

To get weekly reports, set a webhook URL in project Settings, then schedule:

```bash
curl -X POST https://central.example.com/api/cron/reports -H "Authorization: Bearer $CRON_SECRET"
```

You can schedule it with cron, a GitHub Actions schedule, or Vercel Cron (`GET` is accepted too). Slack and Discord webhook URLs receive a formatted message. Any other URL receives the full report as JSON (`type: "app_central.report"`).

## Project layout

```
app/api/v1/*        ingest API (events, identify, ping, webhook)
app/api/cron/*      scheduled report generation
app/(dashboard)/*   dashboard pages
lib/ingest.ts       validation + idempotent writes
lib/analytics.ts    all reporting queries (funnels, retention, breakdowns)
lib/insights.ts     suggestion rules
db/migrations/*.sql schema (applied by npm run db:migrate)
sdk/app-central.ts  drop-in client
```

## License

MIT
