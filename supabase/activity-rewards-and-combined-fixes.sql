-- Patch for the deployed multi-outcome, fixed-odds schema (5 October 2026).
-- Test inside BEGIN / ROLLBACK before deployment. Historical tickets are unchanged.

create or replace view public.subject_market_stats with (security_invoker=true) as
with stakes as (
  select w.subject_id,w.side,w.amount,false as is_combined from public.wagers w
  union all
  select l.subject_id,l.side,c.amount,true from public.combined_wager_legs l
    join public.combined_wagers c on c.id=l.combined_wager_id
), totals as (
  select subject_id,count(*) as wager_count,sum(amount)::bigint as total_pool,
    count(*) filter(where is_combined) as combined_wager_count
  from stakes group by subject_id
), outcome_totals as (
  select subject_id,side,sum(amount)::bigint as pool from stakes group by subject_id,side
)
select s.id,s.creator_id,s.title,s.description,s.category,s.image_url,s.closes_at,
  s.conditions_locked,s.status,s.resolution_note,s.resolved_by,s.resolved_at,
  s.creation_day,s.created_at,s.betting_closed_at,s.close_note,s.initial_yes_odds,
  s.outcomes,s.banned_users,s.winning_outcome_id,
  coalesce(t.wager_count,0::bigint) as wager_count,
  coalesce(t.total_pool,0::bigint) as total_pool,
  (select jsonb_agg(jsonb_build_object('id',o->>'id','label',o->>'label',
    'odds',(o->>'odds')::numeric,'pool',coalesce(ot.pool,0::bigint)) order by ord)
    from jsonb_array_elements(s.outcomes) with ordinality as options(o,ord)
    left join outcome_totals ot on ot.subject_id=s.id and ot.side=o->>'id'
  ) as outcomes_stats,
  coalesce(t.combined_wager_count,0::bigint) as combined_wager_count
from public.subjects s left join totals t on t.subject_id=s.id;
revoke all on public.subject_market_stats from anon,authenticated;
grant select on public.subject_market_stats to authenticated;

-- Callers hold the common settlement lock and lock affected wallets in user order.
-- A cancellation can refund a ticket previously marked lost, so resolution order
-- does not change the final result. A refunded ticket cannot receive another payment.
create or replace function private.settle_combined_wagers(p_subject_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_ticket public.combined_wagers; v_leg record; v_total numeric;
  v_lost boolean; v_pending boolean; v_void boolean;
  v_result text; v_payout bigint; v_balance bigint;
begin
  for v_ticket in select c.* from public.combined_wagers c
    where (c.result='open' or (c.result='lost' and exists
      (select 1 from public.subjects s where s.id=p_subject_id and s.status='cancelled'))) and exists
      (select 1 from public.combined_wager_legs l
       where l.combined_wager_id=c.id and l.subject_id=p_subject_id)
    order by c.user_id,c.id for update loop
    v_total:=1; v_lost:=false; v_pending:=false; v_void:=false;
    for v_leg in select l.odds,l.side,s.status,s.winning_outcome_id
      from public.combined_wager_legs l join public.subjects s on s.id=l.subject_id
      where l.combined_wager_id=v_ticket.id loop
      if v_leg.status='cancelled' then v_void:=true;
      elsif v_leg.status='resolved' then
        if v_leg.side<>v_leg.winning_outcome_id then v_lost:=true; end if;
        v_total:=v_total*v_leg.odds;
      else v_pending:=true; end if;
    end loop;
    if v_void then v_result:='refunded'; v_payout:=v_ticket.amount;
    elsif v_ticket.result='lost' then continue;
    elsif v_lost then v_result:='lost'; v_payout:=0;
    elsif v_pending then continue;
    else v_result:='won'; v_payout:=floor(v_ticket.amount*v_total)::bigint; end if;
    update public.combined_wagers set result=v_result,payout=v_payout,
      settled_at=clock_timestamp() where id=v_ticket.id;
    if v_payout>0 then
      update public.wallets set balance=balance+v_payout,updated_at=clock_timestamp()
        where user_id=v_ticket.user_id returning balance into v_balance;
      insert into public.wallet_transactions(user_id,kind,amount,balance_after,combined_wager_id,event_key)
        values(v_ticket.user_id,case when v_result='refunded' then 'refund' else 'payout' end,
          v_payout,v_balance,v_ticket.id,'combined-settlement:'||v_ticket.id::text);
    end if;
  end loop;
end $$;
revoke all on function private.settle_combined_wagers(uuid) from public,anon,authenticated;

alter table public.wallet_transactions drop constraint wallet_transactions_kind_check;
alter table public.wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('initial_grant','wager','payout','refund','daily_login_reward'));

create or replace function private.claim_daily_login_reward()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_day date; v_key text; v_balance bigint;
begin
  if not private.is_active_member() then raise exception 'Membre actif requis'; end if;
  -- The wallet lock serializes visits from multiple tabs, devices and retries.
  select balance into v_balance from public.wallets where user_id=v_user for update;
  if not found then raise exception 'Portefeuille introuvable'; end if;
  v_day:=(clock_timestamp() at time zone 'Europe/Paris')::date;
  v_key:='daily-login:'||v_user::text||':'||v_day::text;
  if exists(select 1 from public.wallet_transactions where event_key=v_key) then
    return jsonb_build_object('claimed',false,'amount',0,'day',v_day,'balance',v_balance);
  end if;
  v_balance:=v_balance+1000;
  update public.wallets set balance=v_balance,updated_at=clock_timestamp() where user_id=v_user;
  insert into public.wallet_transactions(user_id,kind,amount,balance_after,event_key)
    values(v_user,'daily_login_reward',1000,v_balance,v_key);
  return jsonb_build_object('claimed',true,'amount',1000,'day',v_day,'balance',v_balance);
end $$;
create or replace function public.claim_daily_login_reward()
returns jsonb language sql security invoker set search_path='' as $$
  select private.claim_daily_login_reward();
$$;
revoke all on function private.claim_daily_login_reward(),public.claim_daily_login_reward() from public,anon;
grant execute on function private.claim_daily_login_reward(),public.claim_daily_login_reward() to authenticated;

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
  perform w.user_id from public.wallets w where w.user_id in (select user_id from public.wagers where subject_id=p_subject_id union select c.user_id from public.combined_wagers c join public.combined_wager_legs l on l.combined_wager_id=c.id where l.subject_id=p_subject_id and (c.result='open' or (p_outcome='cancelled' and c.result='lost')))
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

notify pgrst, 'reload schema';
