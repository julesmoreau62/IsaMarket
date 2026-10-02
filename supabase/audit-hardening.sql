-- Prepared on 2026-10-02 for the CURRENT multi-outcome, fixed-odds schema.
-- Deployed as migration 20261002062810 on 2026-10-02. Do not use on the old pool schema.
begin;

create or replace function private.create_subject(
  p_title text, p_category text, p_image_url text, p_closes_at timestamptz,
  p_outcomes jsonb, p_banned_users uuid[] default array[]::uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_day date;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  -- Serialize quota checks even when two requests have different titles.
  perform pg_advisory_xact_lock(hashtextextended('create_subject:' || auth.uid()::text, 0));
  v_day := timezone('Europe/Paris', clock_timestamp())::date;
  if not private.is_admin() and exists (
    select 1 from public.subjects where creator_id = auth.uid() and creation_day = v_day
  ) then raise exception 'Tu as déjà créé un sujet aujourd’hui.'; end if;
  if p_closes_at is null or p_closes_at <= clock_timestamp() then raise exception 'La clôture doit être future'; end if;
  if p_outcomes is null or jsonb_typeof(p_outcomes) <> 'array' then raise exception 'Résultats invalides'; end if;
  if jsonb_array_length(p_outcomes) < 2 or jsonb_array_length(p_outcomes) > 20 then raise exception 'Entre 2 et 20 résultats requis'; end if;
  if exists (select 1 from jsonb_array_elements(p_outcomes) o where
    jsonb_typeof(o) <> 'object' or coalesce(length(trim(o->>'id')),0) = 0
    or o->>'id' in ('cancelled','close') or coalesce(length(trim(o->>'label')),0) = 0
    or jsonb_typeof(o->'odds') is distinct from 'number'
  ) then raise exception 'Résultats invalides'; end if;
  if exists (select 1 from jsonb_array_elements(p_outcomes) o where
    (o->>'odds')::numeric <= 1 or (o->>'odds')::numeric > 100
  ) then raise exception 'Cotes invalides (supérieures à 1 et au plus 100)'; end if;
  if (select count(distinct o->>'id') from jsonb_array_elements(p_outcomes) o) <> jsonb_array_length(p_outcomes) then
    raise exception 'Identifiants de résultat uniques requis';
  end if;
  if array_position(coalesce(p_banned_users,array[]::uuid[]), null) is not null
    or auth.uid() = any(coalesce(p_banned_users,array[]::uuid[])) then
    raise exception 'Liste des exclusions invalide';
  end if;
  insert into public.subjects(creator_id,title,category,image_url,closes_at,outcomes,banned_users,creation_day)
  values(auth.uid(),trim(p_title),p_category,nullif(trim(p_image_url),''),p_closes_at,p_outcomes,coalesce(p_banned_users,array[]::uuid[]),v_day)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_subject(
  p_title text, p_category text, p_image_url text, p_closes_at timestamptz,
  p_outcomes jsonb, p_banned_users uuid[] default array[]::uuid[]
) returns uuid language sql security invoker set search_path = '' as $$
  select private.create_subject(p_title,p_category,p_image_url,p_closes_at,p_outcomes,p_banned_users);
$$;
revoke execute on function public.create_subject(text,text,text,timestamptz,jsonb,uuid[]),
  private.create_subject(text,text,text,timestamptz,jsonb,uuid[]) from public,anon;
grant execute on function public.create_subject(text,text,text,timestamptz,jsonb,uuid[]),
  private.create_subject(text,text,text,timestamptz,jsonb,uuid[]) to authenticated;

create or replace function private.place_wager(p_subject_id uuid,p_side text,p_amount numeric,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subject public.subjects; v_wallet public.wallets; v_existing public.wagers;
  v_odds numeric; v_id uuid;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  if p_subject_id is null or p_side is null then raise exception 'Choix invalide'; end if;
  if p_request_id is null then raise exception 'Identifiant de mise requis'; end if;
  if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
    or p_amount <= 0 or p_amount > 9007199254740991 or p_amount <> trunc(p_amount) then
    raise exception 'La mise doit être un entier positif';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_request_id::text,0));
  select * into v_existing from public.wagers where user_id=auth.uid() and request_id=p_request_id;
  if found then
    if v_existing.subject_id <> p_subject_id or v_existing.side <> p_side or v_existing.amount <> p_amount then
      raise exception 'Identifiant déjà utilisé pour une autre mise';
    end if;
    return jsonb_build_object('wager_id',v_existing.id,'already_placed',true);
  end if;
  select * into v_subject from public.subjects where id=p_subject_id for update;
  if not found then raise exception 'Sujet introuvable'; end if;
  if auth.uid() = any(coalesce(v_subject.banned_users,array[]::uuid[])) then raise exception 'Accès à ce sujet interdit'; end if;
  select * into v_wallet from public.wallets where user_id=auth.uid() for update;
  if not found then raise exception 'Portefeuille introuvable'; end if;
  -- Wall clock AFTER both lock waits, rather than transaction start time.
  if v_subject.status <> 'open' or v_subject.betting_closed_at is not null or v_subject.closes_at <= clock_timestamp() then
    raise exception 'Les mises sont closes';
  end if;
  select (o->>'odds')::numeric into v_odds from jsonb_array_elements(v_subject.outcomes) o where o->>'id'=p_side;
  if not found or v_odds is null or v_odds::text in ('NaN','Infinity','-Infinity') or v_odds <= 1 or v_odds > 100 then
    raise exception 'Choix ou cote invalide';
  end if;
  if v_wallet.balance < p_amount then raise exception 'Solde insuffisant'; end if;
  insert into public.wagers(subject_id,user_id,side,amount,odds,request_id)
  values(p_subject_id,auth.uid(),p_side,p_amount::bigint,v_odds,p_request_id) returning id into v_id;
  update public.wallets set balance=balance-p_amount::bigint,updated_at=clock_timestamp() where user_id=auth.uid();
  insert into public.wallet_transactions(user_id,kind,amount,balance_after,subject_id,wager_id,event_key)
  values(auth.uid(),'wager',-p_amount::bigint,v_wallet.balance-p_amount::bigint,p_subject_id,v_id,'wager:'||v_id::text);
  update public.subjects set conditions_locked=true where id=p_subject_id and not conditions_locked;
  return jsonb_build_object('wager_id',v_id,'balance',v_wallet.balance-p_amount::bigint);
end $$;

-- Keep fixed-odds payouts. Restore input validation and identical-request retries.
create or replace function private.resolve_subject(p_subject_id uuid,p_outcome text,p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_subject public.subjects; v_credit record; v_balance bigint;
begin
  if not private.is_admin() then raise exception 'Accès administrateur requis'; end if;
  if char_length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'Justification de 10 à 2 000 caractères requise'; end if;
  if p_outcome is null then raise exception 'Résultat invalide'; end if;
  select * into v_subject from public.subjects where id=p_subject_id for update;
  if not found then raise exception 'Sujet introuvable'; end if;
  if v_subject.status in ('resolved','cancelled') then
    if (v_subject.status='cancelled' and p_outcome='cancelled') or
       (v_subject.status='resolved' and v_subject.winning_outcome_id=p_outcome) then
      return jsonb_build_object('ok',true,'already_settled',true);
    end if;
    raise exception 'Ce sujet a déjà été réglé avec un autre résultat';
  end if;
  if v_subject.status <> 'open' then raise exception 'Ce sujet n’est pas ouvert'; end if;
  if p_outcome <> 'cancelled' and not exists (select 1 from jsonb_array_elements(v_subject.outcomes) o where o->>'id'=p_outcome) then
    raise exception 'Résultat invalide';
  end if;
  perform w.user_id from public.wallets w where w.user_id in (select user_id from public.wagers where subject_id=p_subject_id)
  order by w.user_id for update;
  if p_outcome='cancelled' then
    update public.wagers set payout=amount,result='refunded' where subject_id=p_subject_id and result='open';
  else
    update public.wagers set payout=floor(amount*odds)::bigint,result='won' where subject_id=p_subject_id and side=p_outcome and result='open';
    update public.wagers set payout=0,result='lost' where subject_id=p_subject_id and side<>p_outcome and result='open';
  end if;
  for v_credit in select * from public.wagers where subject_id=p_subject_id and payout>0 order by user_id,id loop
    update public.wallets set balance=balance+v_credit.payout,updated_at=clock_timestamp() where user_id=v_credit.user_id returning balance into v_balance;
    insert into public.wallet_transactions(user_id,kind,amount,balance_after,subject_id,wager_id,event_key)
    values(v_credit.user_id,case when p_outcome='cancelled' then 'refund' else 'payout' end,v_credit.payout,v_balance,p_subject_id,v_credit.id,'settlement:'||v_credit.id::text);
  end loop;
  update public.subjects set status=case when p_outcome='cancelled' then 'cancelled' else 'resolved' end,
    winning_outcome_id=case when p_outcome='cancelled' then null else p_outcome end,resolution_note=trim(p_note),resolved_by=auth.uid(),resolved_at=clock_timestamp()
  where id=p_subject_id;
  return jsonb_build_object('ok',true,'status',p_outcome);
end $$;
commit;
