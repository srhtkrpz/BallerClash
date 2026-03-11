-- ════════════════════════════════════════════════════════════════════
-- BallerClash — Ratings & Stats Trigger System
-- Run this in Supabase SQL Editor (safe to re-run)
-- ════════════════════════════════════════════════════════════════════

-- ── Ratings table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rated_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score         smallint NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Each user can only be rated once per match by the same person
  UNIQUE (match_id, rated_user_id, rated_by)
);

-- ── RLS: ratings ───────────────────────────────────────────────────
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone in the match can insert a rating for an opponent
DROP POLICY IF EXISTS "rating_insert" ON public.ratings;
CREATE POLICY "rating_insert" ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = rated_by
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = ratings.match_id AND mp.user_id = auth.uid()
    )
  );

-- Users can read all ratings (for leaderboard display)
DROP POLICY IF EXISTS "rating_read" ON public.ratings;
CREATE POLICY "rating_read" ON public.ratings
  FOR SELECT TO authenticated
  USING (true);

-- ── Function: recalculate_profile_avg_rating ───────────────────────
-- Fires after every INSERT on ratings.
-- Recalculates the rated player's average across ALL their match ratings.
CREATE OR REPLACE FUNCTION public.recalculate_profile_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET avg_rating = (
    SELECT ROUND(AVG(score)::numeric, 2)
    FROM public.ratings
    WHERE rated_user_id = NEW.rated_user_id
  )
  WHERE id = NEW.rated_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_rating_inserted ON public.ratings;
CREATE TRIGGER on_rating_inserted
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_profile_avg_rating();

-- ── Function: update_stats_on_match_complete ───────────────────────
-- Fires after UPDATE on matches when status transitions to 'completed'.
-- Updates total_matches, wins, losses, win_streak on both profiles and teams.
CREATE OR REPLACE FUNCTION public.update_stats_on_match_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when transitioning TO 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    -- ── Profile stats: challenger team members ──────────────────────
    UPDATE public.profiles
    SET
      total_matches = total_matches + 1,
      wins          = wins   + CASE WHEN NEW.winner_team_id = NEW.challenger_team_id THEN 1 ELSE 0 END,
      losses        = losses + CASE WHEN NEW.winner_team_id != NEW.challenger_team_id THEN 1 ELSE 0 END,
      win_streak    = CASE
                        WHEN NEW.winner_team_id = NEW.challenger_team_id THEN win_streak + 1
                        ELSE 0
                      END
    WHERE id IN (
      SELECT user_id FROM public.match_players
      WHERE match_id = NEW.id AND team_id = NEW.challenger_team_id
    );

    -- ── Profile stats: opponent team members ───────────────────────
    UPDATE public.profiles
    SET
      total_matches = total_matches + 1,
      wins          = wins   + CASE WHEN NEW.winner_team_id = NEW.opponent_team_id THEN 1 ELSE 0 END,
      losses        = losses + CASE WHEN NEW.winner_team_id != NEW.opponent_team_id THEN 1 ELSE 0 END,
      win_streak    = CASE
                        WHEN NEW.winner_team_id = NEW.opponent_team_id THEN win_streak + 1
                        ELSE 0
                      END
    WHERE id IN (
      SELECT user_id FROM public.match_players
      WHERE match_id = NEW.id AND team_id = NEW.opponent_team_id
    );

    -- ── Team stats: challenger ──────────────────────────────────────
    UPDATE public.teams
    SET
      total_matches = total_matches + 1,
      wins          = wins   + CASE WHEN NEW.winner_team_id = NEW.challenger_team_id THEN 1 ELSE 0 END,
      losses        = losses + CASE WHEN NEW.winner_team_id != NEW.challenger_team_id THEN 1 ELSE 0 END,
      win_streak    = CASE
                        WHEN NEW.winner_team_id = NEW.challenger_team_id THEN win_streak + 1
                        ELSE 0
                      END
    WHERE id = NEW.challenger_team_id;

    -- ── Team stats: opponent ────────────────────────────────────────
    UPDATE public.teams
    SET
      total_matches = total_matches + 1,
      wins          = wins   + CASE WHEN NEW.winner_team_id = NEW.opponent_team_id THEN 1 ELSE 0 END,
      losses        = losses + CASE WHEN NEW.winner_team_id != NEW.opponent_team_id THEN 1 ELSE 0 END,
      win_streak    = CASE
                        WHEN NEW.winner_team_id = NEW.opponent_team_id THEN win_streak + 1
                        ELSE 0
                      END
    WHERE id = NEW.opponent_team_id;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_stats_on_match_complete();

-- ── Realtime: ratings ──────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- Done. Triggers active:
--   • on_rating_inserted    → recalculate_profile_avg_rating
--   • on_match_completed    → update_stats_on_match_complete
-- ════════════════════════════════════════════════════════════════════
