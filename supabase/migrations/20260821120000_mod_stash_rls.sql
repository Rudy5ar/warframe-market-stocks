-- Match initial_schema: RLS on, no anon policies (service role bypasses).
alter table public.mod_stash enable row level security;
