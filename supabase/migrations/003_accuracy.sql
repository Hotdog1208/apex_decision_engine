-- ============================================================
-- 003_accuracy.sql — Signal accuracy tracking + schema fixes
-- ============================================================

-- ── signal_log additions ──────────────────────────────────────────────────────
ALTER TABLE public.signal_log
  ADD COLUMN IF NOT EXISTS entry_price     numeric,
  ADD COLUMN IF NOT EXISTS primary_timeframe text DEFAULT 'swing',
  ADD COLUMN IF NOT EXISTS lead_signal     text;

-- ── signal_accuracy additions ─────────────────────────────────────────────────
ALTER TABLE public.signal_accuracy
  ADD COLUMN IF NOT EXISTS pct_change_1d numeric,
  ADD COLUMN IF NOT EXISTS pct_change_3d numeric;

-- Service role needs UPDATE to fill in 3d price after 1d was already written
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'signal_accuracy' AND policyname = 'svc_accuracy_update'
  ) THEN
    CREATE POLICY "svc_accuracy_update"
      ON public.signal_accuracy FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- ── agent_briefs — fix for CIPHER on-demand (column additions) ────────────────
-- brief_date already has NOT NULL in 001 — give it a default so CIPHER can omit it
ALTER TABLE public.agent_briefs
  ALTER COLUMN brief_date SET DEFAULT current_date;

ALTER TABLE public.agent_briefs
  ADD COLUMN IF NOT EXISTS symbols text[] DEFAULT '{}';

-- Drop the one-per-day uniqueness: CIPHER is on-demand, not once-a-day
ALTER TABLE public.agent_briefs
  DROP CONSTRAINT IF EXISTS agent_briefs_user_id_brief_date_key;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS signal_log_generated_at_idx
  ON public.signal_log (generated_at DESC);

CREATE INDEX IF NOT EXISTS signal_log_symbol_idx
  ON public.signal_log (symbol);

CREATE INDEX IF NOT EXISTS signal_accuracy_signal_id_idx
  ON public.signal_accuracy (signal_id);
