-- Run after the patch, inside BEGIN / ROLLBACK. No retained users or emails.
create function pg_temp.activity_expect_error(statement text,expected text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlerrm not ilike '%'||expected||'%' then raise exception 'Unexpected error: % (expected %)',sqlerrm,expected; end if;
    return;
  end;
  raise exception 'Expected rejection: %',expected;
end $$;

do $qa$
declare a uuid:=gen_random_uuid(); absent uuid:=gen_random_uuid(); admin_id uuid;
  receipt jsonb; today date; original_key text; before_balance bigint;
  markets uuid[]:='{}'; m uuid; i integer; ticket uuid; selections jsonb;
  opts jsonb:='[{"id":"yes","label":"Oui","odds":2},{"id":"no","label":"Non","odds":3}]';
begin
  select user_id into admin_id from public.memberships where role='admin' and status='active' limit 1;
  assert admin_id is not null,'Active admin required for settlement test';
  insert into auth.users(id,email,email_confirmed_at) values
    (a,'activity-qa-'||a||'@example.invalid',clock_timestamp()),
    (absent,'activity-qa-'||absent||'@example.invalid',clock_timestamp());
  perform set_config('request.jwt.claim.sub',a::text,true); perform public.complete_registration(null);
  perform set_config('request.jwt.claim.sub',absent::text,true); perform public.complete_registration(null);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  receipt:=public.claim_daily_login_reward();
  today:=(clock_timestamp() at time zone 'Europe/Paris')::date;
  assert (receipt->>'claimed')::boolean and (receipt->>'amount')::bigint=1000,'First daily visit not rewarded';
  assert (receipt->>'day')::date=today,'Wrong reward date';
  assert (select balance=2000 from public.wallets where user_id=a),'Wrong reward balance';
  receipt:=public.claim_daily_login_reward();
  assert not (receipt->>'claimed')::boolean,'Repeated visit rewarded twice';
  execute 'reset role';
  assert (select balance=1000 from public.wallets where user_id=absent),'Absent member received reward';
  assert not exists(select 1 from public.wallet_transactions where user_id=absent and kind='daily_login_reward'),'Reward given without a visit';
  assert (select net_profit=0 and settled_wagers=0 from public.leaderboard where user_id=a),'Reward counted as betting profit';

  -- A browser/session timezone change cannot grant another reward on the same Paris day.
  perform set_config('TimeZone','Pacific/Kiritimati',true);
  execute 'set local role authenticated';
  receipt:=public.claim_daily_login_reward();
  assert not (receipt->>'claimed')::boolean and (receipt->>'day')::date=today,'Timezone granted a duplicate reward';
  execute 'reset role';
  perform set_config('TimeZone','UTC',true);

  -- Simulate a reward from three days ago: return visits receive 1000, not missed-day catch-up.
  original_key:='daily-login:'||a::text||':'||today::text;
  update public.wallet_transactions set event_key='daily-login:'||a::text||':'||(today-3)::text
    where event_key=original_key;
  execute 'set local role authenticated';
  receipt:=public.claim_daily_login_reward();
  assert (receipt->>'claimed')::boolean and (receipt->>'balance')::bigint=3000,'Return visit incorrect';
  assert not (public.claim_daily_login_reward()->>'claimed')::boolean,'Retry paid twice';
  perform pg_temp.activity_expect_error('insert into public.wallet_transactions(user_id,kind,amount,balance_after,event_key) values(auth.uid(),''daily_login_reward'',1000,4000,''forged'')','permission denied');
  execute 'reset role';
  update public.memberships set status='suspended' where user_id=a;
  execute 'set local role authenticated';
  perform pg_temp.activity_expect_error('select public.claim_daily_login_reward()','Membre actif');
  execute 'reset role';
  update public.memberships set status='active' where user_id=a;
  update auth.users set email_confirmed_at=null where id=a;
  execute 'set local role authenticated';
  perform pg_temp.activity_expect_error('select public.claim_daily_login_reward()','Membre actif');
  execute 'reset role';
  update auth.users set email_confirmed_at=clock_timestamp() where id=a;
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role authenticated';
  perform pg_temp.activity_expect_error('select public.claim_daily_login_reward()','Membre actif');
  execute 'reset role'; execute 'set local role anon';
  perform pg_temp.activity_expect_error('select public.claim_daily_login_reward()','permission denied');
  execute 'reset role';

  for i in 1..4 loop
    insert into public.subjects(creator_id,title,category,closes_at,outcomes)
      values(a,'Ordre annulation test '||i,'Cours',clock_timestamp()+interval '1 day',opts) returning id into m;
    markets:=array_append(markets,m);
  end loop;
  perform set_config('request.jwt.claim.sub',a::text,true); execute 'set local role authenticated';
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[1],'side','yes','odds',2),jsonb_build_object('subject_id',markets[2],'side','yes','odds',2));
  ticket:=(public.place_combined_wager(selections,25,gen_random_uuid())->>'wager_id')::uuid;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.resolve_subject(markets[1],'no','Résultat perdant pour test.');
  assert (select result='lost' from public.combined_wagers where id=ticket),'Loss should settle immediately';
  perform public.resolve_subject(markets[2],'cancelled','Sujet annulé pour test.');
  assert (select result='refunded' and payout=25 from public.combined_wagers where id=ticket),'Cancellation after loss did not refund';
  before_balance:=(select balance from public.wallets where user_id=a);
  perform public.resolve_subject(markets[2],'cancelled','Sujet annulé pour test.');
  assert (select balance=before_balance from public.wallets where user_id=a),'Repeated cancellation paid twice';

  perform set_config('request.jwt.claim.sub',a::text,true);
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[3],'side','yes','odds',2),jsonb_build_object('subject_id',markets[4],'side','yes','odds',2));
  ticket:=(public.place_combined_wager(selections,25,gen_random_uuid())->>'wager_id')::uuid;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.resolve_subject(markets[3],'cancelled','Sujet annulé pour test.');
  perform public.resolve_subject(markets[4],'no','Résultat perdant pour test.');
  assert (select result='refunded' and payout=25 from public.combined_wagers where id=ticket),'Loss after cancellation changed refund';
  execute 'reset role';
  assert (select balance=3000 from public.wallets where user_id=a),'Wallet differs after full refunds';
  assert (select sum(amount)=3000 from public.wallet_transactions where user_id=a),'Reward ledger differs';
  assert (select net_profit=0 and settled_wagers=0 from public.leaderboard where user_id=a),'Refunds or rewards changed leaderboard';
end $qa$;
select 'PASS: active visits, absent users, once per Paris day, retries, permissions, no catch-up, leaderboard, ledger, cancellation before/after loss' as verification;
