-- Per-user watchlist and mod stash. Shared pins cannot be attributed; drop them.

delete from public.watchlist;
delete from public.mod_stash;

alter table public.watchlist drop constraint watchlist_pkey;
alter table public.watchlist
  add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.watchlist add primary key (user_id, url_name);
create index watchlist_url_name_idx on public.watchlist (url_name);

comment on table public.watchlist is
  'Per-user priority pins scanned first each cycle; cron unions all users.';

alter table public.mod_stash drop constraint mod_stash_pkey;
alter table public.mod_stash
  add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.mod_stash add primary key (user_id, url_name);
create index mod_stash_url_name_idx on public.mod_stash (url_name);

comment on table public.mod_stash is
  'Per-user excess mods for list-vs-dissolve; orphans allowed until items sync.';

create policy "own watchlist"
  on public.watchlist
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own mod stash"
  on public.mod_stash
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
