ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 5000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_credit_grant date;

CREATE OR REPLACE FUNCTION public.claim_daily_credits(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits integer;
  _last date;
BEGIN
  SELECT credits, last_credit_grant INTO _credits, _last FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF _last IS DISTINCT FROM CURRENT_DATE AND _credits < 5000 THEN
    UPDATE public.profiles
      SET credits = 5000, last_credit_grant = CURRENT_DATE, updated_at = now()
      WHERE id = _user_id
      RETURNING credits INTO _credits;

    INSERT INTO public.credits_ledger (user_id, amount, kind, description)
    VALUES (_user_id, 5000 - COALESCE(_credits, 0), 'grant', 'Daily free credits');
  ELSIF _last IS DISTINCT FROM CURRENT_DATE THEN
    UPDATE public.profiles SET last_credit_grant = CURRENT_DATE WHERE id = _user_id;
  END IF;

  RETURN _credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_credits(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_credits(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, credits, last_credit_grant)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, 'creator'), '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    5000,
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credits_ledger (user_id, amount, kind, description)
  VALUES (NEW.id, 5000, 'grant', 'Daily free credits');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;