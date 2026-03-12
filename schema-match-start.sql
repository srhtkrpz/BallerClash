-- ════════════════════════════════════════════════════════════════════
-- BallerClash — Full Schema Migration
-- Covers: match start voting, result votes, ratings, stats triggers
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS)
-- ════════════════════════════════════════════════════════════════════


-- ── 1. matches: start-vote columns ─────────────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS start_vote_challenger BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS start_vote_opponent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS match_started_at      TIMESTAMPTZ;


-- ── 2. match_result_votes ──────────────────────────────────────────
--  One row per team per match; captains upsert their agreed score here.
CREATE TABLE IF NOT EXISTS public.match_result_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID    NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_role        TEXT    NOT NULL CHECK (team_role IN ('challenger', 'opponent')),
  score_challenger INT     NOT NULL,
  score_opponent   INT     NOT NULL,
  winner_team_id   UUID,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, team_role)
);

ALTER TABLE public.match_result_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "result_vote_read"   ON public.match_result_votes;
DROP POLICY IF EXISTS "result_vote_insert" ON public.match_result_votes;
DROP POLICY IF EXISTS "result_vote_update" ON public.match_result_votes;

CREATE POLICY "result_vote_read"
  ON public.match_result_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "result_vote_insert"
  ON public.match_result_votes FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "result_vote_update"
  ON public.match_result_votes FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');


-- ── 3. ratings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID     NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rated_user_id UUID     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_by      UUID     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score         SMALLINT NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, rated_user_id, rated_by)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rating_insert" ON public.ratings;
DROP POLICY IF EXISTS "rating_read"   ON public.ratings;

CREATE POLICY "rating_insert" ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = rated_by
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = ratings.match_id AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "rating_read" ON public.ratings
  FOR SELECT TO authenticated
  USING (true);


-- ── 4. Trigger: recalculate avg_rating on new rating ───────────────
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


-- ── 5. Trigger: update wins/losses/streaks on match completion ──────
CREATE OR REPLACE FUNCTION public.update_stats_on_match_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    -- Profile stats — challenger team members
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

    -- Profile stats — opponent team members
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

    -- Team stats — challenger
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

    -- Team stats — opponent
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


-- ── 6. Realtime publications ────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_result_votes;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;


-- ════════════════════════════════════════════════════════════════════
-- Summary of active triggers:
--   on_rating_inserted  → recalculate_profile_avg_rating  (ratings)
--   on_match_completed  → update_stats_on_match_complete  (matches)
--
-- Tables added/modified:
--   matches             + start_vote_challenger, start_vote_opponent, match_started_at
--   match_result_votes  (new) — captain score agreement
--   ratings             (new) — per-player match ratings
-- ════════════════════════════════════════════════════════════════════
