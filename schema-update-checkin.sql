-- Add check-in columns to match_players
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Add in_progress status to matches
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('open','pending','confirmed','in_progress','completed','cancelled'));
