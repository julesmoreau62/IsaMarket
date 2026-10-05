-- Additive feature for the current multi-outcome, fixed-odds schema.
create table public.combined_wagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  selections jsonb not null,
  amount bigint not null check (amount between 1 and 100000),
  odds numeric not null check (odds > 1),
  payout bigint check (payout between 0 and 100000),
  result text not null default 'open' check (result in ('open','won','lost','refunded')),
  placed_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  unique(user_id,request_id),
  check ((result='open' and payout is null and settled_at is null) or
    (result<>'open' and payout is not null and settled_at is not null)),
  check (jsonb_array_length(selections) between 2 and 5)
);
create table public.combined_wager_legs (
  id uuid primary key default gen_random_uuid(),
  combined_wager_id uuid not null references public.combined_wagers(id),
  subject_id uuid not null references public.subjects(id),
  side text not null,
  odds numeric not null check (odds > 1 and odds <= 100),
  unique(combined_wager_id,subject_id)
);
create index combined_wagers_open on public.combined_wagers(user_id,placed_at desc) where result='open';
create index combined_wager_legs_subject on public.combined_wager_legs(subject_id,combined_wager_id);
alter table public.wallet_transactions add column combined_wager_id uuid references public.combined_wagers(id);
create index wallet_transactions_combined on public.wallet_transactions(combined_wager_id) where combined_wager_id is not null;
alter table public.combined_wagers enable row level security;
alter table public.combined_wager_legs enable row level security;
-- Same active-member read model as wagers, needed by the security-invoker leaderboard.
create policy combined_wagers_read on public.combined_wagers for select to authenticated using ((select private.is_active_member()));
create policy combined_wager_legs_read on public.combined_wager_legs for select to authenticated using ((select private.is_active_member()));
revoke all on public.combined_wagers,public.combined_wager_legs from anon,authenticated;
grant select on public.combined_wagers,public.combined_wager_legs to authenticated;

create function private.place_combined_wager(p_selections jsonb,p_amount numeric,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_existing public.combined_wagers; v_subject public.subjects; v_wallet public.wallets;
  v_selection jsonb; v_normalized jsonb; v_odds numeric; v_total numeric:=1; v_id uuid;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  if p_request_id is null then raise exception 'Identifiant de mise requis'; end if;
  if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<>trunc(p_amount) or p_amount<=0 then
    raise exception 'La mise doit être un entier positif'; end if;
  if p_amount>100000 then raise exception 'Retour maximal de 100 000 Squids'; end if;
  if p_selections is null or jsonb_typeof(p_selections)<>'array' then raise exception 'Sélections invalides'; end if;
  if jsonb_array_length(p_selections) not between 2 and 5 then raise exception 'Entre 2 et 5 sélections requises'; end if;
  if exists(select 1 from jsonb_array_elements(p_selections) s where jsonb_typeof(s)<>'object'
    or coalesce(s->>'subject_id','')='' or coalesce(s->>'side','')='' or jsonb_typeof(s->'odds') is distinct from 'number') then
    raise exception 'Sélections invalides'; end if;
  if (select count(distinct (s->>'subject_id')::uuid) from jsonb_array_elements(p_selections) s)<>jsonb_array_length(p_selections) then
    raise exception 'Une seule sélection par sujet'; end if;
  select jsonb_agg(jsonb_build_object('subject_id',(s->>'subject_id')::uuid,'side',s->>'side','odds',(s->>'odds')::numeric) order by (s->>'subject_id')::uuid)
    into v_normalized from jsonb_array_elements(p_selections) s;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_request_id::text,0));
  select * into v_existing from public.combined_wagers where user_id=auth.uid() and request_id=p_request_id;
  if found then
    if v_existing.amount<>p_amount or v_existing.selections<>v_normalized then raise exception 'Identifiant déjà utilisé pour une autre mise'; end if;
    return jsonb_build_object('wager_id',v_existing.id,'already_placed',true);
  end if;
  -- Settlement and combined placement use the same lock before subjects then wallets.
  perform pg_advisory_xact_lock(hashtextextended('isamarket:combined-settlement',0));
  perform id from public.subjects where id in (select (s->>'subject_id')::uuid from jsonb_array_elements(v_normalized) s) order by id for update;
  select * into v_wallet from public.wallets where user_id=auth.uid() for update;
  if not found then raise exception 'Portefeuille introuvable'; end if;
  for v_selection in select * from jsonb_array_elements(v_normalized) loop
    select * into v_subject from public.subjects where id=(v_selection->>'subject_id')::uuid;
    if not found then raise exception 'Sujet introuvable'; end if;
    if auth.uid()=any(v_subject.banned_users) then raise exception 'Accès à ce sujet interdit'; end if;
    if v_subject.status<>'open' or v_subject.betting_closed_at is not null or v_subject.closes_at<=clock_timestamp() then raise exception 'Les mises sont closes'; end if;
    select (o->>'odds')::numeric into v_odds from jsonb_array_elements(v_subject.outcomes) o where o->>'id'=v_selection->>'side';
    if not found or v_odds is null or v_odds::text in ('NaN','Infinity','-Infinity') or v_odds<=1 or v_odds>100 then raise exception 'Choix ou cote invalide'; end if;
    if v_odds<>(v_selection->>'odds')::numeric then raise exception 'Une cote a changé. Actualise ton combiné avant de valider.'; end if;
    v_total:=v_total*v_odds;
  end loop;
  if floor(p_amount*v_total)>100000 then raise exception 'Retour maximal de 100 000 Squids : réduis la mise ou les sélections'; end if;
  if v_wallet.balance<p_amount then raise exception 'Solde insuffisant'; end if;
  insert into public.combined_wagers(user_id,request_id,selections,amount,odds) values(auth.uid(),p_request_id,v_normalized,p_amount::bigint,v_total) returning id into v_id;
  insert into public.combined_wager_legs(combined_wager_id,subject_id,side,odds)
    select v_id,(s->>'subject_id')::uuid,s->>'side',(s->>'odds')::numeric from jsonb_array_elements(v_normalized) s;
  update public.wallets set balance=balance-p_amount::bigint,updated_at=clock_timestamp() where user_id=auth.uid();
  insert into public.wallet_transactions(user_id,kind,amount,balance_after,combined_wager_id,event_key)
    values(auth.uid(),'wager',-p_amount::bigint,v_wallet.balance-p_amount::bigint,v_id,'combined-wager:'||v_id::text);
  update public.subjects set conditions_locked=true where id in (select subject_id from public.combined_wager_legs where combined_wager_id=v_id) and not conditions_locked;
  return jsonb_build_object('wager_id',v_id,'odds',v_total,'balance',v_wallet.balance-p_amount::bigint);
end $$;
create function public.place_combined_wager(p_selections jsonb,p_amount numeric,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.place_combined_wager(p_selections,p_amount,p_request_id); $$;
revoke execute on function private.place_combined_wager(jsonb,numeric,uuid),public.place_combined_wager(jsonb,numeric,uuid) from public,anon;
grant execute on function private.place_combined_wager(jsonb,numeric,uuid),public.place_combined_wager(jsonb,numeric,uuid) to authenticated;

-- Internal only; callers already hold the settlement lock and all affected wallets.
create function private.settle_combined_wagers(p_subject_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_ticket public.combined_wagers; v_leg record; v_total numeric; v_lost boolean; v_pending boolean; v_all_void boolean; v_result text; v_payout bigint; v_balance bigint;
begin
  for v_ticket in select c.* from public.combined_wagers c where c.result='open' and exists
    (select 1 from public.combined_wager_legs l where l.combined_wager_id=c.id and l.subject_id=p_subject_id) order by c.user_id,c.id for update loop
    v_total:=1; v_lost:=false; v_pending:=false; v_all_void:=true;
    for v_leg in select l.odds,l.side,s.status,s.winning_outcome_id from public.combined_wager_legs l join public.subjects s on s.id=l.subject_id where l.combined_wager_id=v_ticket.id loop
      if v_leg.status='cancelled' then continue; end if;
      v_all_void:=false;
      if v_leg.status='resolved' then
        if v_leg.side<>v_leg.winning_outcome_id then v_lost:=true; end if;
        v_total:=v_total*v_leg.odds;
      else v_pending:=true; end if;
    end loop;
    if v_lost then v_result:='lost'; v_payout:=0;
    elsif v_pending then continue;
    elsif v_all_void then v_result:='refunded'; v_payout:=v_ticket.amount;
    else v_result:='won'; v_payout:=floor(v_ticket.amount*v_total)::bigint; end if;
    update public.combined_wagers set result=v_result,payout=v_payout,settled_at=clock_timestamp() where id=v_ticket.id;
    if v_payout>0 then
      update public.wallets set balance=balance+v_payout,updated_at=clock_timestamp() where user_id=v_ticket.user_id returning balance into v_balance;
      insert into public.wallet_transactions(user_id,kind,amount,balance_after,combined_wager_id,event_key)
        values(v_ticket.user_id,case when v_result='refunded' then 'refund' else 'payout' end,v_payout,v_balance,v_ticket.id,'combined-settlement:'||v_ticket.id::text);
    end if;
  end loop;
end $$;
revoke all on function private.settle_combined_wagers(uuid) from public,anon,authenticated;

create or replace function private.resolve_subject(p_subject_id uuid,p_outcome text,p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_subject public.subjects; v_credit record; v_balance bigint;
begin
  if not private.is_admin() then raise exception 'Accès administrateur requis'; end if;
  if char_length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'Justification de 10 à 2 000 caractères requise'; end if;
  if p_outcome is null then raise exception 'Résultat invalide'; end if;
  perform pg_advisory_xact_lock(hashtextextended('isamarket:combined-settlement',0));
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
  perform w.user_id from public.wallets w where w.user_id in (select user_id from public.wagers where subject_id=p_subject_id union select c.user_id from public.combined_wagers c join public.combined_wager_legs l on l.combined_wager_id=c.id where l.subject_id=p_subject_id and c.result='open')
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
  perform private.settle_combined_wagers(p_subject_id);
  return jsonb_build_object('ok',true,'status',p_outcome);
end $$;


create or replace view public.leaderboard with (security_invoker=true) as
with tickets as (
  select w.id,w.user_id,w.amount,w.payout,w.result from public.wagers w
  union all select c.id,c.user_id,c.amount,c.payout,c.result from public.combined_wagers c
)
select p.user_id,p.username,p.avatar_url,
  coalesce(sum(t.payout-t.amount) filter(where t.result in ('won','lost')),0)::bigint as net_profit,
  count(t.id) filter(where t.result in ('won','lost')) as settled_wagers,
  count(t.id) filter(where t.result='won') as won_wagers,
  case when count(t.id) filter(where t.result in ('won','lost'))=0 then 0::numeric
    else round(100.0*count(t.id) filter(where t.result='won')/count(t.id) filter(where t.result in ('won','lost')),1) end as success_rate
from public.profiles p left join tickets t on t.user_id=p.user_id group by p.user_id,p.username,p.avatar_url;
alter publication supabase_realtime add table public.combined_wagers;
notify pgrst, 'reload schema';
