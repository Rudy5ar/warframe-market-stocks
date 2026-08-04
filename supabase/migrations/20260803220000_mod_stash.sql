-- Personal excess-mod stash for keep-vs-dissolve decisions.
-- No FK to items: pins may exist before manifest sync (same as watchlist).

create table if not exists public.mod_stash (
  url_name text primary key,
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now()
);

comment on table public.mod_stash is
  'User-pinned excess mods to evaluate list-vs-dissolve; orphans allowed until items sync.';
