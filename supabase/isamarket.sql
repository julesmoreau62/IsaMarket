begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('player', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  joined_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower_key on public.profiles (lower(username));

create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 1000 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_by uuid unique references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check ((used_by is null and used_at is null) or (used_by is not null and used_at is not null))
);
create index invitations_email_idx on public.invitations (lower(email)) where email is not null;
create index invitations_created_by_idx on public.invitations (created_by);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 8 and 120),
  description text not null check (char_length(description) between 20 and 2000),
  category text not null check (category in ('Cours', 'Sport', 'Vie de classe', 'Culture', 'Autre')),
  image_url text,
  closes_at timestamptz not null,
  resolution_criteria text not null check (char_length(resolution_criteria) between 20 and 1200),
  conditions_locked boolean not null default false,
  status text not null default 'open' check (status in ('open', 'yes', 'no', 'cancelled')),
  resolution_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  creation_day date not null default (timezone('Europe/Paris', now())::date),
  created_at timestamptz not null default now(),
  check (closes_at > created_at),
  check ((status = 'open' and resolved_at is null) or (status <> 'open' and resolved_at is not null))
);
create unique index subjects_one_per_creator_day on public.subjects (creator_id, creation_day);
create index subjects_status_closes_idx on public.subjects (status, closes_at);
create index subjects_category_idx on public.subjects (category);
create index subjects_resolved_by_idx on public.subjects (resolved_by) where resolved_by is not null;

create table public.wagers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  user_id uuid not null references auth.users(id),
  side text not null check (side in ('yes', 'no')),
  amount bigint not null check (amount > 0),
  payout bigint,
  result text not null default 'open' check (result in ('open', 'won', 'lost', 'refunded')),
  placed_at timestamptz not null default now(),
  check (payout is null or payout >= 0)
);
create index wagers_subject_idx on public.wagers (subject_id);
create index wagers_user_idx on public.wagers (user_id, placed_at desc);

create table public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('initial_grant', 'wager', 'payout', 'refund')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  subject_id uuid references public.subjects(id),
  wager_id uuid references public.wagers(id),
  event_key text not null unique,
  created_at timestamptz not null default now()
);
create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);
create index wallet_transactions_subject_idx on public.wallet_transactions (subject_id) where subject_id is not null;
create index wallet_transactions_wager_idx on public.wallet_transactions (wager_id) where wager_id is not null;

create table public.odds_history (
  id bigint generated always as identity primary key,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  yes_pool bigint not null check (yes_pool >= 0),
  no_pool bigint not null check (no_pool >= 0),
  yes_odds numeric(14,4),
  no_odds numeric(14,4),
  created_at timestamptz not null default now(),
  check (yes_odds is null or yes_odds >= 1),
  check (no_odds is null or no_odds >= 1)
);
create index odds_history_subject_idx on public.odds_history (subject_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  reporter_id uuid not null references auth.users(id),
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create index reports_subject_idx on public.reports (subject_id) where subject_id is not null;
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_resolved_by_idx on public.reports (resolved_by) where resolved_by is not null;

create or replace function private.is_active_member(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user_id is not null and exists (
    select 1 from public.memberships m where m.user_id = p_user_id and m.status = 'active'
  );
$$;

create or replace function private.is_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user_id is not null and exists (
    select 1 from public.memberships m
    where m.user_id = p_user_id and m.status = 'active' and m.role = 'admin'
  );
$$;

create or replace function private.complete_registration(p_invite_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user auth.users%rowtype;
  v_invitation public.invitations%rowtype;
  v_role text := 'player';
  v_username text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select * into v_user from auth.users where id = auth.uid() for update;
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Confirme ton adresse e-mail avant de continuer';
  end if;
  if exists (select 1 from public.memberships where user_id = v_user.id) then
    return jsonb_build_object('ok', true, 'already_member', true);
  end if;
  if lower(v_user.email) = 'tanguypavat8@gmail.com' then
    v_role := 'admin';
  else
    if coalesce(trim(p_invite_code), '') = '' then raise exception 'Invitation requise'; end if;
    select * into v_invitation
      from public.invitations
      where token_hash = encode(extensions.digest(convert_to(upper(trim(p_invite_code)), 'UTF8'), 'sha256'), 'hex')
        and used_by is null and expires_at > now()
      for update;
    if v_invitation.id is null then raise exception 'Invitation invalide ou expirée'; end if;
    if v_invitation.email is not null and lower(v_invitation.email) <> lower(v_user.email) then
      raise exception 'Cette invitation est réservée à une autre adresse';
    end if;
    update public.invitations set used_by = v_user.id, used_at = now() where id = v_invitation.id;
  end if;
  v_username := left(split_part(v_user.email, '@', 1), 20) || '-' || left(replace(v_user.id::text, '-', ''), 5);
  insert into public.memberships(user_id, role) values (v_user.id, v_role);
  insert into public.profiles(user_id, username) values (v_user.id, v_username);
  insert into public.wallets(user_id, balance) values (v_user.id, 1000);
  insert into public.wallet_transactions(user_id, kind, amount, balance_after, event_key)
    values (v_user.id, 'initial_grant', 1000, 1000, 'initial:' || v_user.id::text);
  return jsonb_build_object('ok', true, 'role', v_role);
end;
$$;

create or replace function public.complete_registration(p_invite_code text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.complete_registration(p_invite_code);
$$;

create or replace function private.create_invitation(p_email text default null, p_valid_days integer default 14)
returns table(invitation_id uuid, invitation_code text, invitation_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_code text; v_id uuid; v_expires timestamptz;
begin
  if not private.is_admin() then raise exception 'Droits administrateur requis'; end if;
  if p_valid_days < 1 or p_valid_days > 90 then raise exception 'Durée invalide'; end if;
  v_code := upper(encode(extensions.gen_random_bytes(9), 'hex'));
  v_expires := now() + make_interval(days => p_valid_days);
  insert into public.invitations(token_hash, email, created_by, expires_at)
    values (encode(extensions.digest(convert_to(v_code, 'UTF8'), 'sha256'), 'hex'), nullif(lower(trim(p_email)), ''), auth.uid(), v_expires)
    returning id into v_id;
  return query select v_id, v_code, v_expires;
end;
$$;

create or replace function public.create_invitation(p_email text default null, p_valid_days integer default 14)
returns table(invitation_id uuid, invitation_code text, invitation_expires_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.create_invitation(p_email, p_valid_days);
$$;

create or replace function private.create_subject(
  p_title text, p_description text, p_category text, p_image_url text,
  p_closes_at timestamptz, p_resolution_criteria text
)
returns public.subjects language plpgsql security definer set search_path = '' as $$
declare v_subject public.subjects;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  if p_closes_at <= now() then raise exception 'La clôture doit être future'; end if;
  insert into public.subjects(creator_id, title, description, category, image_url, closes_at, resolution_criteria)
    values (auth.uid(), trim(p_title), trim(p_description), p_category, nullif(trim(p_image_url), ''), p_closes_at, trim(p_resolution_criteria))
    returning * into v_subject;
  return v_subject;
exception when unique_violation then
  raise exception 'Tu as déjà créé un sujet aujourd’hui (heure de Paris)';
end;
$$;

create or replace function public.create_subject(
  p_title text, p_description text, p_category text, p_image_url text,
  p_closes_at timestamptz, p_resolution_criteria text
)
returns public.subjects language sql security invoker set search_path = '' as $$
  select * from private.create_subject(p_title, p_description, p_category, p_image_url, p_closes_at, p_resolution_criteria);
$$;

create or replace function private.place_wager(p_subject_id uuid, p_side text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subject public.subjects;
  v_wallet public.wallets;
  v_wager_id uuid;
  v_yes bigint;
  v_no bigint;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  if p_side not in ('yes', 'no') then raise exception 'Choix invalide'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'La mise doit être un entier positif'; end if;
  select * into v_subject from public.subjects where id = p_subject_id for update;
  if v_subject.id is null then raise exception 'Sujet introuvable'; end if;
  if v_subject.status <> 'open' or v_subject.closes_at <= now() then raise exception 'Les mises sont closes'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid() for update;
  if v_wallet.balance < p_amount then raise exception 'Solde insuffisant'; end if;
  insert into public.wagers(subject_id, user_id, side, amount)
    values (p_subject_id, auth.uid(), p_side, p_amount) returning id into v_wager_id;
  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = auth.uid();
  insert into public.wallet_transactions(user_id, kind, amount, balance_after, subject_id, wager_id, event_key)
    values (auth.uid(), 'wager', -p_amount, v_wallet.balance - p_amount, p_subject_id, v_wager_id, 'wager:' || v_wager_id::text);
  update public.subjects set conditions_locked = true where id = p_subject_id;
  select coalesce(sum(amount) filter (where side = 'yes'), 0), coalesce(sum(amount) filter (where side = 'no'), 0)
    into v_yes, v_no from public.wagers where subject_id = p_subject_id;
  insert into public.odds_history(subject_id, yes_pool, no_pool, yes_odds, no_odds)
    values (p_subject_id, v_yes, v_no,
      case when v_yes = 0 then null else (v_yes + v_no)::numeric / v_yes end,
      case when v_no = 0 then null else (v_yes + v_no)::numeric / v_no end);
  return jsonb_build_object('wager_id', v_wager_id, 'balance', v_wallet.balance - p_amount, 'yes_pool', v_yes, 'no_pool', v_no);
end;
$$;

create or replace function public.place_wager(p_subject_id uuid, p_side text, p_amount bigint)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.place_wager(p_subject_id, p_side, p_amount);
$$;

create or replace function private.resolve_subject(p_subject_id uuid, p_outcome text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subject public.subjects;
  v_pool bigint;
  v_winning_pool bigint;
  v_refund boolean;
begin
  if not private.is_admin() then raise exception 'Droits administrateur requis'; end if;
  if p_outcome not in ('yes', 'no', 'cancelled') then raise exception 'Résultat invalide'; end if;
  if char_length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Une justification précise est requise'; end if;
  select * into v_subject from public.subjects where id = p_subject_id for update;
  if v_subject.id is null then raise exception 'Sujet introuvable'; end if;
  if v_subject.status <> 'open' then
    return jsonb_build_object('ok', true, 'already_settled', true, 'status', v_subject.status);
  end if;
  select coalesce(sum(amount), 0), coalesce(sum(amount) filter (where side = p_outcome), 0)
    into v_pool, v_winning_pool from public.wagers where subject_id = p_subject_id;
  v_refund := p_outcome = 'cancelled' or v_winning_pool = 0;
  if v_refund then
    update public.wagers set payout = amount, result = 'refunded'
      where subject_id = p_subject_id and result = 'open';
  else
    with winning as (
      select w.id,
        floor((v_pool::numeric * w.amount) / v_winning_pool)::bigint as base_payout,
        ((v_pool::numeric * w.amount) / v_winning_pool) - floor((v_pool::numeric * w.amount) / v_winning_pool) as fraction
      from public.wagers w where w.subject_id = p_subject_id and w.side = p_outcome
    ), ranked as (
      select winning.*,
        row_number() over (order by fraction desc, id) as remainder_rank,
        v_pool - sum(base_payout) over () as remainder_units
      from winning
    )
    update public.wagers w
      set payout = r.base_payout + case when r.remainder_rank <= r.remainder_units then 1 else 0 end,
          result = 'won'
      from ranked r where w.id = r.id;
    update public.wagers set payout = 0, result = 'lost'
      where subject_id = p_subject_id and side <> p_outcome and result = 'open';
  end if;
  with credits as (
    select user_id, sum(payout)::bigint as total from public.wagers
    where subject_id = p_subject_id and payout > 0 group by user_id
  )
  update public.wallets w set balance = w.balance + c.total, updated_at = now()
    from credits c where w.user_id = c.user_id;
  insert into public.wallet_transactions(user_id, kind, amount, balance_after, subject_id, wager_id, event_key)
    select wg.user_id,
      case when v_refund then 'refund' else 'payout' end,
      wg.payout,
      wa.balance,
      p_subject_id,
      wg.id,
      'settlement:' || wg.id::text
    from public.wagers wg join public.wallets wa on wa.user_id = wg.user_id
    where wg.subject_id = p_subject_id and wg.payout > 0
    on conflict (event_key) do nothing;
  update public.subjects set status = p_outcome, resolution_note = trim(p_note),
    resolved_by = auth.uid(), resolved_at = now() where id = p_subject_id;
  return jsonb_build_object('ok', true, 'status', p_outcome, 'pool', v_pool, 'refunded', v_refund);
end;
$$;

create or replace function public.resolve_subject(p_subject_id uuid, p_outcome text, p_note text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.resolve_subject(p_subject_id, p_outcome, p_note);
$$;

create or replace function private.set_member_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Droits administrateur requis'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'Statut invalide'; end if;
  if p_user_id = auth.uid() and p_status = 'suspended' then raise exception 'Impossible de suspendre ton propre compte'; end if;
  update public.memberships set status = p_status where user_id = p_user_id;
  if not found then raise exception 'Membre introuvable'; end if;
end;
$$;

create or replace function public.set_member_status(p_user_id uuid, p_status text)
returns void language sql security invoker set search_path = '' as $$
  select private.set_member_status(p_user_id, p_status);
$$;

create or replace view public.subject_market_stats with (security_invoker = true) as
select s.*,
  coalesce(sum(w.amount) filter (where w.side = 'yes'), 0)::bigint as yes_pool,
  coalesce(sum(w.amount) filter (where w.side = 'no'), 0)::bigint as no_pool,
  coalesce(sum(w.amount), 0)::bigint as total_pool,
  count(w.id)::bigint as wager_count,
  case when coalesce(sum(w.amount) filter (where w.side = 'yes'), 0) = 0 then null
    else sum(w.amount)::numeric / sum(w.amount) filter (where w.side = 'yes') end as yes_odds,
  case when coalesce(sum(w.amount) filter (where w.side = 'no'), 0) = 0 then null
    else sum(w.amount)::numeric / sum(w.amount) filter (where w.side = 'no') end as no_odds
from public.subjects s left join public.wagers w on w.subject_id = s.id
group by s.id;

create or replace view public.leaderboard with (security_invoker = true) as
select p.user_id, p.username, p.avatar_url,
  coalesce(sum(case when s.status in ('yes', 'no') then w.payout - w.amount else 0 end), 0)::bigint as net_profit,
  count(*) filter (where w.result in ('won', 'lost'))::bigint as settled_wagers,
  count(*) filter (where w.result = 'won')::bigint as won_wagers,
  case when count(*) filter (where w.result in ('won', 'lost')) = 0 then 0
    else round(100.0 * count(*) filter (where w.result = 'won') / count(*) filter (where w.result in ('won', 'lost')), 1) end as success_rate
from public.profiles p
left join public.wagers w on w.user_id = p.user_id
left join public.subjects s on s.id = w.subject_id
group by p.user_id, p.username, p.avatar_url;

alter table public.memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.invitations enable row level security;
alter table public.subjects enable row level security;
alter table public.wagers enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.odds_history enable row level security;
alter table public.reports enable row level security;

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_select on public.profiles for select to authenticated
  using ((select private.is_active_member()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_member()))
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));
create policy wallets_select on public.wallets for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy invitations_admin on public.invitations for select to authenticated
  using ((select private.is_admin()));
create policy subjects_select on public.subjects for select to authenticated
  using ((select private.is_active_member()));
create policy wagers_select on public.wagers for select to authenticated
  using ((select private.is_active_member()));
create policy wallet_transactions_select on public.wallet_transactions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy odds_history_select on public.odds_history for select to authenticated
  using ((select private.is_active_member()));
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_active_member()));
create policy reports_admin_update on public.reports for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.memberships, public.profiles, public.wallets, public.invitations,
  public.subjects, public.wagers, public.wallet_transactions, public.odds_history,
  public.reports, public.subject_market_stats, public.leaderboard to authenticated;
grant update (username, avatar_url, updated_at) on public.profiles to authenticated;
grant insert on public.reports to authenticated;
grant update (status, admin_note, resolved_by, resolved_at) on public.reports to authenticated;

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_member(uuid), private.is_admin(uuid) to authenticated;
grant execute on function private.complete_registration(text), private.create_invitation(text, integer),
  private.create_subject(text, text, text, text, timestamptz, text),
  private.place_wager(uuid, text, bigint), private.resolve_subject(uuid, text, text),
  private.set_member_status(uuid, text) to authenticated;
grant execute on function public.complete_registration(text), public.create_invitation(text, integer),
  public.create_subject(text, text, text, text, timestamptz, text),
  public.place_wager(uuid, text, bigint), public.resolve_subject(uuid, text, text),
  public.set_member_status(uuid, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subjects') then
    alter publication supabase_realtime add table public.subjects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wagers') then
    alter publication supabase_realtime add table public.wagers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'odds_history') then
    alter publication supabase_realtime add table public.odds_history;
  end if;
end $$;

commit;
