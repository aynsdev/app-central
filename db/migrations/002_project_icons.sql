-- Project logos. Kept in their own table so `select * from projects` never drags image bytes along.
create table project_icons (
  project_id uuid primary key references projects(id) on delete cascade,
  data bytea not null,
  content_type text not null,
  updated_at timestamptz not null default now()
);

-- Version stamp for cache-busting icon URLs; null when the project has no icon.
alter table projects add column icon_updated_at timestamptz;
