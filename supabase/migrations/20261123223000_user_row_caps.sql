create or replace function public.enforce_watchlist_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  if exists (
    select 1
    from public.watchlist
    where user_id = new.user_id and url_name = new.url_name
  ) then
    return new;
  end if;

  select count(*) into current_count
  from public.watchlist
  where user_id = new.user_id;

  if current_count >= 50 then
    raise exception 'Watchlist limit reached (max 50 pins per account).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger watchlist_enforce_cap
  before insert on public.watchlist
  for each row
  execute function public.enforce_watchlist_cap();

create or replace function public.enforce_mod_stash_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  if exists (
    select 1
    from public.mod_stash
    where user_id = new.user_id and url_name = new.url_name
  ) then
    return new;
  end if;

  select count(*) into current_count
  from public.mod_stash
  where user_id = new.user_id;

  if current_count >= 200 then
    raise exception 'Mod stash limit reached (max 200 mods per account).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger mod_stash_enforce_cap
  before insert on public.mod_stash
  for each row
  execute function public.enforce_mod_stash_cap();
