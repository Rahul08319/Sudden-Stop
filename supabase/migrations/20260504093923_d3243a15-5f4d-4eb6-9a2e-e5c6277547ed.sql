
-- Fix search_path on validation trigger function
CREATE OR REPLACE FUNCTION public.validate_score_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- Allow public insert of today's challenge (only if it matches today's UTC date)
CREATE POLICY "Anyone can create today's challenge"
ON public.daily_challenges FOR INSERT
WITH CHECK (challenge_date = (now() AT TIME ZONE 'UTC')::date);

-- Convert to SECURITY INVOKER so it runs under caller's permissions (RLS applies)
CREATE OR REPLACE FUNCTION public.get_today_challenge()
RETURNS public.daily_challenges
LANGUAGE plpgsql
SECURITY INVOKER
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
  ON CONFLICT (challenge_date) DO NOTHING
  RETURNING * INTO result;

  IF result IS NULL THEN
    SELECT * INTO result FROM public.daily_challenges WHERE challenge_date = today;
  END IF;

  RETURN result;
END;
$$;
