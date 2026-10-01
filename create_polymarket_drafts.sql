
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_category_check;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_category_check CHECK (category in ('Cours', 'Sport', 'Vie de classe', 'Culture', 'Autre', 'Polymarket'));

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_check;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_check1;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_check2;

-- Recreate proper constraints
ALTER TABLE public.subjects ADD CONSTRAINT subjects_closes_at_check CHECK (closes_at > created_at);
ALTER TABLE public.subjects ADD CONSTRAINT subjects_status_resolved_check CHECK ((status IN ('open', 'draft') and resolved_at is null) or (status IN ('resolved', 'cancelled') and resolved_at is not null));

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT user_id INTO v_admin_id FROM public.memberships WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Aucun admin trouvé pour être le créateur des paris.';
  END IF;


  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '561251') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Presidential Election Winner 2028',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/presidential-election-winner-2024-afdda358-219d-448a-abb5-ba4d14118d71.png',
      '2028-11-08T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '561251',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '559687') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Democratic Presidential Nominee 2028',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/democrats+2028+donkey.png',
      '2028-11-08T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '559687',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '561986') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Republican Presidential Nominee 2028',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/republicans+2028.png',
      '2028-11-08T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '561986',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '567621') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Will China invade Taiwan by end of 2026?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/china-invades-taiwan-in-2025-CCSd9dX2mrea.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":31.75},{"id":"non","label":"Non","odds":1.03}]'::jsonb,
      '567621',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '560317') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Putin out as President of Russia by...?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/putin-out-as-president-of-russia-in-2025-nWuurkC8qfbi.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":36.36},{"id":"non","label":"Non","odds":1.03}]'::jsonb,
      '560317',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '601825') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Brazil Presidential Election',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/brazil-presidential-election-37lx5Jgvkbr8.png',
      '2026-10-05T03:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '601825',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '559651') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Xi Jinping out before 2027?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/xi-jinping-out-in-2025-EjF4SM20eaa3.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":29.85},{"id":"non","label":"Non","odds":1.03}]'::jsonb,
      '559651',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '616902') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'How many Fed rate cuts in 2026?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/how-many-fed-rate-cuts-in-2025-9qstZkSL1dn0.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":1.04},{"id":"non","label":"Non","odds":28.99}]'::jsonb,
      '616902',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '629035') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Los Angeles Mayoral Election',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/los-angeles-mayoral-election-117-lQx0FWLF3whu.jpg',
      '2026-12-31T23:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '629035',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '628955') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'California Governor Election Winner',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/california-governor-election-2026-4b5HcLPNupez.png',
      '2026-11-04T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":100},{"id":"non","label":"Non","odds":1.01}]'::jsonb,
      '628955',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '608547') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Ballon d''Or Winner 2026',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/ballon-dor-winner-2025-vTCj-1ZkJzga.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":2.16},{"id":"non","label":"Non","odds":1.86}]'::jsonb,
      '608547',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '562831') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Balance of Power: 2026 Midterms',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/balance-of-power-2024-election-r-Fp-y4ONJBS.jpg',
      '2026-11-04T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":13.33},{"id":"non","label":"Non","odds":1.08}]'::jsonb,
      '562831',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '567689') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Zelenskyy out as Ukraine president by end of 2026?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/zelenskyy-out-as-ukraine-president-by-october-31-vvfzvJSdhPij.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":15.38},{"id":"non","label":"Non","odds":1.07}]'::jsonb,
      '567689',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '2374271') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Will Ukraine recapture Crimean territory by...?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/will-ukraine-recapture-crimean-territory-by-june-30-2026--xNOyR0lcMvz.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":25},{"id":"non","label":"Non","odds":1.04}]'::jsonb,
      '2374271',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '1057349') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Jeffrey Epstein foul play confirmed by...?',
      'Polymarket',
      'https://polymarket-upload.s3.us-east-2.amazonaws.com/jeffrey-epstein-foul-play-confirmed-in-2025-UrxmkWMmuZ8V.jpg',
      '2027-01-01T04:59:00Z',
      '[{"id":"oui","label":"Oui","odds":36.36},{"id":"non","label":"Non","odds":1.03}]'::jsonb,
      '1057349',
      'draft'
    );
  END IF;

END $$;
