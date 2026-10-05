-- Additive update to the existing ISAMARKET schema. Apply once after isamarket.sql.
begin;

alter table public.wagers add column request_id uuid;
create unique index wagers_request_once on public.wagers(user_id, request_id);
alter table public.subjects add column betting_closed_at timestamptz;
alter table public.subjects add column close_note text;
alter table public.subjects alter column creation_day set default (timezone('Europe/Paris', clock_timestamp())::date);
alter table public.profiles add constraint profiles_avatar_https check (avatar_url is null or (length(avatar_url) <= 2048 and avatar_url ~ '^https://[^[:space:]]+$'));
alter table public.subjects add constraint subjects_image_https check (image_url is null or (length(image_url) <= 2048 and image_url ~ '^https://[^[:space:]]+$'));

create or replace function private.is_active_member(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_user_id = auth.uid() and exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
    where m.user_id = p_user_id and m.status = 'active' and u.email_confirmed_at is not null
  );
$$;

create or replace function private.is_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_user_id = auth.uid() and exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
    where m.user_id = p_user_id and m.status = 'active' and m.role = 'admin'
      and lower(u.email) = 'tanguypavat8@gmail.com' and u.email_confirmed_at is not null
  );
$$;

-- SQL numeric is intentional: a bigint argument would round fractional JSON inputs.
drop function public.place_wager(uuid, text, bigint);
drop function private.place_wager(uuid, text, bigint);
create function private.place_wager(p_subject_id uuid, p_side text, p_amount numeric, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subject public.subjects;
  v_wallet public.wallets;
  v_existing public.wagers;
  v_wager_id uuid;
  v_yes bigint;
  v_no bigint;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  if p_side is null or p_side not in ('yes', 'no') then raise exception 'Choix invalide'; end if;
  if p_request_id is null then raise exception 'Identifiant de mise requis'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 9007199254740991 or p_amount <> trunc(p_amount) or p_amount::text in ('NaN','Infinity','-Infinity') then
    raise exception 'La mise doit être un entier positif';
  end if;
  -- Same request serializes even if a faulty client changes its subject.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_request_id::text, 0));
  select * into v_existing from public.wagers where user_id = auth.uid() and request_id = p_request_id;
  if found then
    if v_existing.subject_id <> p_subject_id or v_existing.side <> p_side or v_existing.amount <> p_amount then
      raise exception 'Identifiant déjà utilisé pour une autre mise';
    end if;
    return jsonb_build_object('wager_id', v_existing.id, 'already_placed', true);
  end if;
  select * into v_subject from public.subjects where id = p_subject_id for update;
  if not found then raise exception 'Sujet introuvable'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid() for update;
  if not found then raise exception 'Portefeuille introuvable'; end if;
  -- Wall-clock check AFTER all waits; now() is the transaction's start time.
  if v_subject.status <> 'open' or v_subject.betting_closed_at is not null or v_subject.closes_at <= clock_timestamp() then
    raise exception 'Les mises sont closes';
  end if;
  if v_wallet.balance < p_amount then raise exception 'Solde insuffisant'; end if;
  insert into public.wagers(subject_id, user_id, side, amount, request_id)
    values (p_subject_id, auth.uid(), p_side, p_amount::bigint, p_request_id) returning id into v_wager_id;
  update public.wallets set balance = balance - p_amount::bigint, updated_at = clock_timestamp() where user_id = auth.uid();
  insert into public.wallet_transactions(user_id, kind, amount, balance_after, subject_id, wager_id, event_key)
    values (auth.uid(), 'wager', -p_amount::bigint, v_wallet.balance - p_amount::bigint, p_subject_id, v_wager_id, 'wager:' || v_wager_id::text);
  update public.subjects set conditions_locked = true where id = p_subject_id;
  select coalesce(sum(amount) filter (where side = 'yes'), 0), coalesce(sum(amount) filter (where side = 'no'), 0)
    into v_yes, v_no from public.wagers where subject_id = p_subject_id;
  insert into public.odds_history(subject_id, yes_pool, no_pool, yes_odds, no_odds)
    values (p_subject_id, v_yes, v_no,
      case when v_yes = 0 then null else (v_yes + v_no)::numeric / v_yes end,
      case when v_no = 0 then null else (v_yes + v_no)::numeric / v_no end);
  return jsonb_build_object('wager_id', v_wager_id, 'balance', v_wallet.balance - p_amount::bigint);
end;
$$;
create function public.place_wager(p_subject_id uuid, p_side text, p_amount numeric, p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.place_wager(p_subject_id, p_side, p_amount, p_request_id);
$$;

create or replace function private.resolve_subject(p_subject_id uuid, p_outcome text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subject public.subjects;
  v_pool bigint;
  v_winning_pool bigint;
  v_refund boolean;
  v_credit record;
  v_balance bigint;
begin
  if not private.is_admin() then raise exception 'Droits administrateur requis'; end if;
  if p_outcome is null or p_outcome not in ('yes', 'no', 'cancelled') then raise exception 'Résultat invalide'; end if;
  if char_length(trim(coalesce(p_note, ''))) not between 10 and 2000 then raise exception 'Une justification de 10 à 2 000 caractères est requise'; end if;
  select * into v_subject from public.subjects where id = p_subject_id for update;
  if not found then raise exception 'Sujet introuvable'; end if;
  if v_subject.status <> 'open' then
    if v_subject.status <> p_outcome then raise exception 'Ce sujet a déjà été réglé avec un autre résultat'; end if;
    return jsonb_build_object('ok', true, 'already_settled', true, 'status', v_subject.status);
  end if;
  select coalesce(sum(amount), 0), coalesce(sum(amount) filter (where side = p_outcome), 0)
    into v_pool, v_winning_pool from public.wagers where subject_id = p_subject_id;
  v_refund := p_outcome = 'cancelled' or v_winning_pool = 0;
  -- Same wallet lock order for settlements of different subjects.
  perform w.user_id from public.wallets w where w.user_id in
    (select user_id from public.wagers where subject_id = p_subject_id)
    order by w.user_id for update;
  if v_refund then
    update public.wagers set payout = amount, result = 'refunded' where subject_id = p_subject_id and result = 'open';
  else
    with winning as (
      select w.id, floor(v_pool::numeric * w.amount / v_winning_pool)::bigint as base_payout,
        mod(v_pool::numeric * w.amount, v_winning_pool) as remainder
      from public.wagers w where w.subject_id = p_subject_id and w.side = p_outcome
    ), ranked as (
      select winning.*, row_number() over (order by remainder desc, id) as remainder_rank,
        v_pool - sum(base_payout) over () as remainder_units from winning
    ) update public.wagers w set payout = r.base_payout + case when r.remainder_rank <= r.remainder_units then 1 else 0 end,
      result = 'won' from ranked r where w.id = r.id;
    update public.wagers set payout = 0, result = 'lost' where subject_id = p_subject_id and side <> p_outcome and result = 'open';
  end if;
  for v_credit in select * from public.wagers where subject_id = p_subject_id and payout > 0 order by user_id, id loop
    update public.wallets set balance = balance + v_credit.payout, updated_at = clock_timestamp()
      where user_id = v_credit.user_id returning balance into v_balance;
    insert into public.wallet_transactions(user_id, kind, amount, balance_after, subject_id, wager_id, event_key)
      values (v_credit.user_id, case when v_refund then 'refund' else 'payout' end,
        v_credit.payout, v_balance, p_subject_id, v_credit.id, 'settlement:' || v_credit.id::text);
  end loop;
  update public.subjects set status = p_outcome, resolution_note = trim(p_note),
    resolved_by = auth.uid(), resolved_at = clock_timestamp() where id = p_subject_id;
  return jsonb_build_object('ok', true, 'status', p_outcome, 'pool', v_pool, 'refunded', v_refund);
end;
$$;

create function private.close_subject(p_subject_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Droits administrateur requis'; end if;
  if char_length(trim(coalesce(p_note, ''))) not between 10 and 2000 then raise exception 'Justification de 10 à 2 000 caractères requise'; end if;
  update public.subjects set betting_closed_at = clock_timestamp(), close_note = trim(p_note)
    where id = p_subject_id and status = 'open' and betting_closed_at is null;
end;
$$;
create function public.close_subject(p_subject_id uuid, p_note text)
returns void language sql security invoker set search_path = '' as $$ select private.close_subject(p_subject_id, p_note); $$;

create function private.protect_subject_conditions()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.creator_id, new.creation_day, new.created_at) is distinct from row(old.creator_id, old.creation_day, old.created_at) then
    raise exception 'Auteur et quota immuables';
  end if;
  if old.conditions_locked and row(new.title,new.description,new.category,new.image_url,new.closes_at,new.resolution_criteria,new.conditions_locked)
    is distinct from row(old.title,old.description,old.category,old.image_url,old.closes_at,old.resolution_criteria,old.conditions_locked) then
    raise exception 'Conditions verrouillées depuis la première mise';
  end if;
  return new;
end;
$$;
create trigger subjects_immutable before update on public.subjects for each row execute function private.protect_subject_conditions();

-- Retain the existing view column order, append the newly introduced fields.
create or replace view public.subject_market_stats with (security_invoker = true) as
select s.id,s.creator_id,s.title,s.description,s.category,s.image_url,s.closes_at,s.resolution_criteria,s.conditions_locked,s.status,
  s.resolution_note,s.resolved_by,s.resolved_at,s.creation_day,s.created_at,
  coalesce(sum(w.amount) filter (where w.side = 'yes'),0)::bigint yes_pool,
  coalesce(sum(w.amount) filter (where w.side = 'no'),0)::bigint no_pool,
  coalesce(sum(w.amount),0)::bigint total_pool, count(w.id)::bigint wager_count,
  sum(w.amount)::numeric / nullif(sum(w.amount) filter (where w.side = 'yes'),0) yes_odds,
  sum(w.amount)::numeric / nullif(sum(w.amount) filter (where w.side = 'no'),0) no_odds,
  s.betting_closed_at,s.close_note
from public.subjects s left join public.wagers w on w.subject_id=s.id group by s.id;

revoke insert on public.reports from authenticated;
grant insert(subject_id,reporter_id,reason) on public.reports to authenticated;
revoke execute on function public.place_wager(uuid,text,numeric,uuid), public.close_subject(uuid,text) from public, anon;
revoke execute on function private.place_wager(uuid,text,numeric,uuid), private.close_subject(uuid,text), private.protect_subject_conditions() from public, anon, authenticated;
grant execute on function public.place_wager(uuid,text,numeric,uuid), private.place_wager(uuid,text,numeric,uuid), public.close_subject(uuid,text), private.close_subject(uuid,text) to authenticated;

commit;
