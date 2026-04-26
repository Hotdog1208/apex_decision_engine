-- Migration 001: Core tables for Apex Decision Engine
-- Run in Supabase SQL editor or via CLI: supabase db push

-- ============================================================
-- PUBLIC.USERS — extends auth.users with ADE-specific fields
-- ============================================================
create table if not exists public.users (
  user_id                uuid references auth.users(id) on delete cascade primary key,
  email                  text not null,
  tier                   text not null default 'free'
                           check (tier in ('free', 'edge', 'alpha', 'apex')),
  stripe_customer_id     text,
  subscription_status    text default 'inactive',
  current_period_end     timestamptz,
  risk_acknowledged      boolean not null default false,
  acknowledged_at        timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own record"
  on public.users for select
  using (auth.uid() = user_id);

create policy "Users can update own record"
  on public.users for update
  using (auth.uid() = user_id);

-- Service role inserts the row (via webhook / trigger)
create policy "Service role can insert"
  on public.users for insert
  with check (true);  -- restricted further by service-role key requirement

-- Auto-create a users row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, email, tier, risk_acknowledged)
  values (new.id, new.email, 'free', false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- PUBLIC.SIGNAL_LOG — every signal verdict written on generation
-- ============================================================
create table if not exists public.signal_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  symbol          text not null,
  verdict         text not null,
  confidence      int,
  composite_score numeric,
  tier            text,
  generated_at    timestamptz not null default now()
);

alter table public.signal_log enable row level security;

create policy "Users can view own signals"
  on public.signal_log for select
  using (auth.uid() = user_id);

create policy "Service role can insert signals"
  on public.signal_log for insert
  with check (true);


-- ============================================================
-- PUBLIC.SIGNAL_ACCURACY — outcome tracking (1d, 3d)
-- ============================================================
create table if not exists public.signal_accuracy (
  id              uuid primary key default gen_random_uuid(),
  signal_id       uuid references public.signal_log(id) on delete cascade,
  symbol          text not null,
  verdict         text not null,
  entry_price     numeric,
  eval_1d_price   numeric,
  eval_3d_price   numeric,
  correct_1d      boolean,
  correct_3d      boolean,
  evaluated_at    timestamptz not null default now()
);

alter table public.signal_accuracy enable row level security;

create policy "Anyone authenticated can view accuracy"
  on public.signal_accuracy for select
  using (auth.role() = 'authenticated');

create policy "Service role can insert accuracy"
  on public.signal_accuracy for insert
  with check (true);


-- ============================================================
-- PUBLIC.AGENT_BRIEFS — morning brief storage for APEX users
-- ============================================================
create table if not exists public.agent_briefs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  brief_date   date not null,
  content      text not null,
  delivered_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, brief_date)
);

alter table public.agent_briefs enable row level security;

create policy "Users can view own briefs"
  on public.agent_briefs for select
  using (auth.uid() = user_id);

create policy "Service role can insert briefs"
  on public.agent_briefs for insert
  with check (true);


-- ============================================================
-- PUBLIC.ANALYTICS_EVENTS — internal usage tracking
-- ============================================================
create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  properties jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create policy "Service role can insert events"
  on public.analytics_events for insert
  with check (true);
