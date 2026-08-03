-- Store WFM v2 item tags (e.g. "mod", "prime") for feature detection
alter table public.items
  add column if not exists tags text[] not null default '{}';
