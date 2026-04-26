-- 004: Persistent analytics event log
-- Replaces in-memory event_log that wipes on every Render restart.

create table if not exists public.event_log (
  id          bigserial      primary key,
  user_id     text           not null default 'anonymous',
  symbol      text           not null default '',
  action      text           not null,
  created_at  timestamptz    not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_event_log_user_id    on public.event_log(user_id);
create index if not exists idx_event_log_action     on public.event_log(action);
create index if not exists idx_event_log_created_at on public.event_log(created_at desc);

-- RLS: only service_role writes/reads (internal analytics only)
alter table public.event_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'event_log' and policyname = 'service_role_all_event_log'
  ) then
    execute 'create policy "service_role_all_event_log" on public.event_log
             for all to service_role using (true) with check (true)';
  end if;
end$$;
