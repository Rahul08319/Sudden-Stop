
-- Global leaderboard table
CREATE TABLE public.global_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  mode TEXT NOT NULL,
  daily_challenge_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_scores_mode_score ON public.global_scores (mode, score DESC);
CREATE INDEX idx_global_scores_daily ON public.global_scores (daily_challenge_id, score DESC);

ALTER TABLE public.global_scores ENABLE ROW LEVEL SECURITY;

-- Validation trigger for inserts
CREATE OR REPLACE FUNCTION public.validate_score_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF length(trim(NEW.player_name)) < 1 OR length(NEW.player_name) > 12 THEN
    RAISE EXCEPTION 'player_name must be 1-12 chars';
  END IF;
  IF NEW.score < 0 OR NEW.score > 999999 THEN
    RAISE EXCEPTION 'score out of range';
  END IF;
  IF NEW.mode NOT IN ('classic','survival','timeattack','daily') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_score_insert
BEFORE INSERT ON public.global_scores
FOR EACH ROW EXECUTE FUNCTION public.validate_score_insert();

-- Public read
CREATE POLICY "Anyone can view scores"
ON public.global_scores FOR SELECT
USING (true);

-- Public insert (validation enforced by trigger)
CREATE POLICY "Anyone can submit scores"
ON public.global_scores FOR INSERT
WITH CHECK (true);

-- Daily challenges table
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL UNIQUE,
  modifier TEXT NOT NULL,
  bonus_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  seed INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily challenges"
ON public.daily_challenges FOR SELECT
USING (true);

-- Function to get or create today's challenge (UTC)
CREATE OR REPLACE FUNCTION public.get_today_challenge()
RETURNS public.daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'UTC')::date;
  modifiers TEXT[] := ARRAY['double_speed','tiny_zone','reverse_combo','silent_mode','mirror_track','one_shot'];
  picked TEXT;
  picked_seed INTEGER;
  result public.daily_challenges;
BEGIN
  SELECT * INTO result FROM public.daily_challenges WHERE challenge_date = today;
  IF FOUND THEN
    RETURN result;
  END IF;

  picked_seed := abs(hashtext(today::text)) % 1000000;
  picked := modifiers[1 + (picked_seed % array_length(modifiers,1))];

  INSERT INTO public.daily_challenges(challenge_date, modifier, bonus_multiplier, seed)
  VALUES (today, picked, 2.0, picked_seed)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_challenge() TO anon, authenticated;
