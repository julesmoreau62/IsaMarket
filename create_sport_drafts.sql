
-- Fix permissions pour valider/rejeter les brouillons
GRANT DELETE ON public.subjects TO authenticated;
DROP POLICY IF EXISTS subjects_admin_update ON public.subjects;
DROP POLICY IF EXISTS subjects_admin_delete ON public.subjects;

CREATE POLICY subjects_admin_update ON public.subjects FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY subjects_admin_delete ON public.subjects FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT user_id INTO v_admin_id FROM public.memberships WHERE role = 'admin' LIMIT 1;


  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '0fc933670b2cf487a5ac2878f500492f') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Azerbaijan vs Liechtenstein',
      'Sport',
      NULL,
      '2026-10-01T16:00:00Z',
      '[{"id":"azerbaijan","label":"Azerbaijan","odds":1.16},{"id":"liechtenstein","label":"Liechtenstein","odds":24},{"id":"match_nul","label":"Match Nul","odds":7.95}]'::jsonb,
      '0fc933670b2cf487a5ac2878f500492f',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '0db832b7346f766521d9e67cd5ab1687') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Republic of Ireland vs Austria',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"austria","label":"Austria","odds":2.04},{"id":"republic_of_ireland","label":"Republic of Ireland","odds":3.35},{"id":"match_nul","label":"Match Nul","odds":3.05}]'::jsonb,
      '0db832b7346f766521d9e67cd5ab1687',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = 'd4cee9aa708870095e23599afb35bce0') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Denmark vs Portugal',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"denmark","label":"Denmark","odds":3.3},{"id":"portugal","label":"Portugal","odds":2},{"id":"match_nul","label":"Match Nul","odds":3.4}]'::jsonb,
      'd4cee9aa708870095e23599afb35bce0',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '546150d4747a3a5108c7e9860426bf36') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Germany vs Serbia',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"germany","label":"Germany","odds":1.22},{"id":"serbia","label":"Serbia","odds":11},{"id":"match_nul","label":"Match Nul","odds":5.5}]'::jsonb,
      '546150d4747a3a5108c7e9860426bf36',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = 'a2b54d223ce491ac52af34a462de0140') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Malta vs Gibraltar',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"gibraltar","label":"Gibraltar","odds":12.8},{"id":"malta","label":"Malta","odds":1.3},{"id":"match_nul","label":"Match Nul","odds":5.35}]'::jsonb,
      'a2b54d223ce491ac52af34a462de0140',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '6321b7d465a21274f0da7a5e50dbf5ef') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Greece vs Netherlands',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"greece","label":"Greece","odds":3.25},{"id":"netherlands","label":"Netherlands","odds":1.98},{"id":"match_nul","label":"Match Nul","odds":3.55}]'::jsonb,
      '6321b7d465a21274f0da7a5e50dbf5ef',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = 'adc5517ae91bb43f3406d577b489abc0') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Israel vs Kosovo',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"israel","label":"Israel","odds":3.05},{"id":"kosovo","label":"Kosovo","odds":2.1},{"id":"match_nul","label":"Match Nul","odds":3.2}]'::jsonb,
      'adc5517ae91bb43f3406d577b489abc0',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '16d310e835713f3457023deb98fb9f74') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Wales vs Norway',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"norway","label":"Norway","odds":1.4},{"id":"wales","label":"Wales","odds":6},{"id":"match_nul","label":"Match Nul","odds":4.4}]'::jsonb,
      '16d310e835713f3457023deb98fb9f74',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '7583f2e5f52107921d6e38a7c1961dab') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Hapoel Tel Aviv vs Real Madrid',
      'Sport',
      NULL,
      '2026-10-01T16:00:00Z',
      '[{"id":"hapoel_tel_aviv","label":"Hapoel Tel Aviv","odds":2.09},{"id":"real_madrid","label":"Real Madrid","odds":1.71}]'::jsonb,
      '7583f2e5f52107921d6e38a7c1961dab',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = '392a93eaf1ea0b908993ca97f7805539') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'KK Crvena zvezda vs Anadolu Efes',
      'Sport',
      NULL,
      '2026-10-01T18:00:00Z',
      '[{"id":"anadolu_efes","label":"Anadolu Efes","odds":2.38},{"id":"kk_crvena_zvezda","label":"KK Crvena zvezda","odds":1.57}]'::jsonb,
      '392a93eaf1ea0b908993ca97f7805539',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = 'b317d475532739fa45af483e4a6b017f') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Virtus Segafredo Bologna vs Olympiacos',
      'Sport',
      NULL,
      '2026-10-01T18:30:00Z',
      '[{"id":"olympiacos","label":"Olympiacos","odds":1.24},{"id":"virtus_segafredo_bologna","label":"Virtus Segafredo Bologna","odds":4.02}]'::jsonb,
      'b317d475532739fa45af483e4a6b017f',
      'draft'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE external_id = 'bc61cf4b9f34c324c42c6e9b6b3082a6') THEN
    INSERT INTO public.subjects (creator_id, title, category, image_url, closes_at, outcomes, external_id, status)
    VALUES (
      v_admin_id,
      'Paris Basketball vs Žalgiris',
      'Sport',
      NULL,
      '2026-10-01T18:45:00Z',
      '[{"id":"paris_basketball","label":"Paris Basketball","odds":2.41},{"id":"_algiris","label":"Žalgiris","odds":1.59}]'::jsonb,
      'bc61cf4b9f34c324c42c6e9b6b3082a6',
      'draft'
    );
  END IF;

END $$;
