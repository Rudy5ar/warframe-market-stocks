-- Warframe Market Stocks — initial schema
-- Personal platinum flip / price-drop monitor (free-tier Supabase)

-- ---------------------------------------------------------------------------
-- items — cached WFM manifest (refresh infrequently, not per scan batch)
-- ---------------------------------------------------------------------------
create table public.items (
  id text primary key,
  url_name text not null unique,
  item_name text not null,
  thumb text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index items_item_name_idx on public.items (item_name);

comment on table public.items is 'Cached item manifest from GET /v1/items';

-- ---------------------------------------------------------------------------
-- scan_cursor — singleton row tracking sharded catalog scan progress
-- ---------------------------------------------------------------------------
create table public.scan_cursor (
  id integer primary key default 1 check (id = 1),
  "offset" integer not null default 0,
  last_run_at timestamptz,
  status text not null default 'idle'
    check (status in ('idle', 'running', 'error')),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.scan_cursor is 'Single-row scan progress; id is always 1';

insert into public.scan_cursor (id, "offset", status)
values (1, 0, 'idle')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- item_snapshots — latest market tick per item (one row per url_name)
-- ---------------------------------------------------------------------------
create table public.item_snapshots (
  url_name text primary key references public.items (url_name) on delete cascade,
  lowest_sell integer,
  highest_buy integer,
  spread integer,
  roi_pct numeric(10, 2),
  median_48h numeric(12, 2),
  volume_48h integer,
  scanned_at timestamptz not null default timezone('utc', now())
);

create index item_snapshots_scanned_at_idx on public.item_snapshots (scanned_at desc);
create index item_snapshots_spread_idx on public.item_snapshots (spread desc nulls last);
create index item_snapshots_roi_pct_idx on public.item_snapshots (roi_pct desc nulls last);

comment on table public.item_snapshots is 'Latest order-derived metrics per item';

-- ---------------------------------------------------------------------------
-- item_snapshot_history — thin history; app prunes rows older than ~7 days
-- ---------------------------------------------------------------------------
create table public.item_snapshot_history (
  id bigint generated always as identity primary key,
  url_name text not null references public.items (url_name) on delete cascade,
  lowest_sell integer,
  highest_buy integer,
  spread integer,
  roi_pct numeric(10, 2),
  median_48h numeric(12, 2),
  volume_48h integer,
  scanned_at timestamptz not null default timezone('utc', now())
);

create index item_snapshot_history_scanned_at_idx
  on public.item_snapshot_history (scanned_at);

create index item_snapshot_history_url_name_scanned_at_idx
  on public.item_snapshot_history (url_name, scanned_at desc);

comment on table public.item_snapshot_history is 'Append-only history; prune scanned_at older than 7 days in app';

-- ---------------------------------------------------------------------------
-- alerts — spread and price_drop notifications
-- alert_day supports one alert per (type, url_name) per UTC calendar day
-- ---------------------------------------------------------------------------
create table public.alerts (
  id bigint generated always as identity primary key,
  type text not null check (type in ('spread', 'price_drop')),
  url_name text not null references public.items (url_name) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  alert_day date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now()),
  notified_discord_at timestamptz
);

create unique index alerts_dedupe_day_idx
  on public.alerts (type, url_name, alert_day);

create index alerts_url_name_idx on public.alerts (url_name);
create index alerts_created_at_idx on public.alerts (created_at desc);
create index alerts_type_created_at_idx on public.alerts (type, created_at desc);
create index alerts_pending_discord_idx
  on public.alerts (created_at)
  where notified_discord_at is null;

comment on column public.alerts.alert_day is 'UTC calendar day for dedupe; app may set explicitly or use ON CONFLICT DO NOTHING';
comment on column public.alerts.notified_discord_at is 'Null until Discord webhook phase';

-- ---------------------------------------------------------------------------
-- watchlist — personal pins scanned before the general catalog rotation
-- ---------------------------------------------------------------------------
create table public.watchlist (
  url_name text primary key,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.watchlist is 'Priority items scanned first each cycle';

-- ---------------------------------------------------------------------------
-- RLS — enabled; service role bypasses. Anon read policies added in app phase.
-- ---------------------------------------------------------------------------
alter table public.items enable row level security;
alter table public.scan_cursor enable row level security;
alter table public.item_snapshots enable row level security;
alter table public.item_snapshot_history enable row level security;
alter table public.alerts enable row level security;
alter table public.watchlist enable row level security;
