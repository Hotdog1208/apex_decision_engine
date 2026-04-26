-- ============================================================
-- 002_preferences.sql — CIPHER Agent user preferences + brief cache
-- ============================================================

-- user_preferences: CIPHER personalization per user
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist           text[]  DEFAULT '{}',
  alert_types         text[]  DEFAULT '{}',
  brief_time          text    DEFAULT '09:00',
  voice_mode          boolean DEFAULT false,
  voice_name          text    DEFAULT 'default',
  onboarding_complete boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- agent_briefs: cached CIPHER intelligence briefs
CREATE TABLE IF NOT EXISTS public.agent_briefs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      text NOT NULL,
  symbols      text[] DEFAULT '{}',
  generated_at timestamptz DEFAULT now()
);

-- Index for fast latest-brief lookup
CREATE INDEX IF NOT EXISTS agent_briefs_user_ts
  ON public.agent_briefs (user_id, generated_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_briefs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_prefs_read"   ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_prefs_insert" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_prefs_update" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "svc_prefs"        ON public.user_preferences FOR ALL    USING (auth.role() = 'service_role');

CREATE POLICY "own_briefs_read"  ON public.agent_briefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "svc_briefs"       ON public.agent_briefs FOR ALL    USING (auth.role() = 'service_role');

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_prefs_ts
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
