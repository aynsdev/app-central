-- App Central: initial schema

create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table sessions (
  id text primary key, -- sha256(token), the raw token only lives in the cookie
  admin_id uuid not null references admins(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_admin_idx on sessions (admin_id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  platform text not null default 'other',
  timezone text not null default 'UTC',
  ingest_key text not null unique,
  onboarding_steps text[] not null default '{}',
  onboarding_window_days integer not null default 7,
  report_webhook_url text,
  created_at timestamptz not null default now()
);

-- One row per end user (or anonymous device) of a tracked app.
create table app_users (
  project_id uuid not null references projects(id) on delete cascade,
  id text not null,
  traits jsonb not null default '{}',
  app_version text,
  platform text,
  event_count integer not null default 0,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  primary key (project_id, id)
);
create index app_users_last_seen_idx on app_users (project_id, last_seen_at desc);
create index app_users_first_seen_idx on app_users (project_id, first_seen_at);

create table events (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null,
  name text not null,
  properties jsonb not null default '{}',
  session_id text,
  app_version text,
  platform text,
  message_id text, -- client-generated id, makes offline retries idempotent
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index events_project_time_idx on events (project_id, occurred_at desc);
create index events_project_name_time_idx on events (project_id, name, occurred_at desc);
create index events_project_user_time_idx on events (project_id, user_id, occurred_at);
create unique index events_dedupe_idx on events (project_id, message_id) where message_id is not null;

create table reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb not null,
  insights jsonb not null,
  delivered_at timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);
create index reports_project_idx on reports (project_id, created_at desc);
