-- ============================================================
-- 005_cipher_trade_log.sql — CIPHER trade log table
-- Auto-logged on every CIPHER trade recommendation.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cipher_trade_log (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  trade_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  ticker                 VARCHAR(20) NOT NULL,
  strategy_type          VARCHAR(60) NOT NULL,
  instrument_description TEXT NOT NULL,
  aggression_level       INTEGER NOT NULL DEFAULT 3 CHECK (aggression_level BETWEEN 1 AND 5),
  entry_zone_low         DECIMAL(12,4),
  entry_zone_high        DECIMAL(12,4),
  entry_actual           DECIMAL(12,4),
  target                 DECIMAL(12,4),
  stop_loss              DECIMAL(12,4),
  exit_deadline          TIMESTAMPTZ,
  risk_reward_ratio      DECIMAL(5,2),
  full_cipher_brief      TEXT NOT NULL DEFAULT '',
  status                 VARCHAR(20) DEFAULT 'pending'
                           CHECK (status IN ('pending', 'win', 'loss', 'cancelled', 'expired')),
  exit_price             DECIMAL(12,4),
  exit_date              TIMESTAMPTZ,
  pnl_per_contract       DECIMAL(12,4),
  pnl_percent            DECIMAL(8,4),
  notes                  TEXT,
  validation_warnings    TEXT[],
  CONSTRAINT valid_pnl CHECK (
    (status IN ('pending', 'cancelled') AND exit_price IS NULL)
    OR (status IN ('win', 'loss', 'expired'))
  )
);

CREATE INDEX IF NOT EXISTS idx_cipher_log_user_date
  ON public.cipher_trade_log (user_id, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_cipher_log_status
  ON public.cipher_trade_log (user_id, status);

CREATE INDEX IF NOT EXISTS idx_cipher_log_aggression
  ON public.cipher_trade_log (user_id, aggression_level, status);

CREATE INDEX IF NOT EXISTS idx_cipher_log_deadline
  ON public.cipher_trade_log (status, exit_deadline)
  WHERE status = 'pending';

ALTER TABLE public.cipher_trade_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own trades"
  ON public.cipher_trade_log FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.cipher_trade_log FOR ALL
  USING (auth.role() = 'service_role');
