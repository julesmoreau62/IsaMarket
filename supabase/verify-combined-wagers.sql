-- Run inside BEGIN / ROLLBACK. Synthetic users; no emails or retained test data.
create function pg_temp.combo_expect_error(statement text,expected text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlerrm not ilike '%'||expected||'%' then raise exception 'Unexpected error: % (expected %)',sqlerrm,expected; end if;
    return;
  end;
  raise exception 'Expected rejection: %',expected;
end $$;
do $qa$
declare
  a uuid:=gen_random_uuid(); admin_id uuid; markets uuid[]:='{}'; m uuid; companion uuid; i integer;
  selections jsonb; req uuid:=gen_random_uuid(); receipt jsonb; retry jsonb;
  win uuid; loss uuid; partial_void uuid; all_void uuid; balance_before bigint;
  opts jsonb:='[{"id":"yes","label":"Oui","odds":2},{"id":"no","label":"Non","odds":3}]';
begin
  select id into admin_id from auth.users where lower(email)='tanguypavat8@gmail.com';
  if admin_id is null then admin_id:=gen_random_uuid(); insert into auth.users(id,email,email_confirmed_at) values(admin_id,'tanguypavat8@gmail.com',clock_timestamp()); end if;
  insert into auth.users(id,email,email_confirmed_at) values(a,'combo-qa-'||a||'@example.invalid',clock_timestamp());
  perform set_config('request.jwt.claim.sub',admin_id::text,true); perform public.complete_registration(null);
  perform set_config('request.jwt.claim.sub',a::text,true); perform public.complete_registration(null);
  for i in 1..8 loop
    insert into public.subjects(creator_id,title,category,closes_at,outcomes)
    values(a,'Combiné test '||i,'Cours',clock_timestamp()+interval '1 day',opts) returning id into m;
    markets:=array_append(markets,m);
  end loop;
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[1],'side','yes','odds',2),jsonb_build_object('subject_id',markets[2],'side','no','odds',3));
  execute 'set local role authenticated';
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1.5,%L)',selections,gen_random_uuid()),'entier positif');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,0,%L)',selections,gen_random_uuid()),'entier positif');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,''NaN''::numeric,%L)',selections,gen_random_uuid()),'entier positif');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,null)',selections),'Identifiant de mise');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1001,%L)',selections,gen_random_uuid()),'Solde insuffisant');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,20000,%L)',selections,gen_random_uuid()),'Retour maximal');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)','[]',gen_random_uuid()),'2 et 5');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',jsonb_build_array(selections->0),gen_random_uuid()),'2 et 5');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',selections||selections||selections,gen_random_uuid()),'2 et 5');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',jsonb_build_array(selections->0,selections->0),gen_random_uuid()),'Une seule');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',jsonb_set(selections,'{0,odds}','4'),gen_random_uuid()),'cote a changé');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',jsonb_set(selections,'{0,side}','"absent"'),gen_random_uuid()),'invalide');
  perform pg_temp.combo_expect_error('insert into public.combined_wagers(user_id) values(auth.uid())','permission denied');
  perform pg_temp.combo_expect_error('update public.combined_wager_legs set odds=100','permission denied');
  perform pg_temp.combo_expect_error('select private.settle_combined_wagers(null)','permission denied');
  receipt:=public.place_combined_wager(selections,10,req); win:=(receipt->>'wager_id')::uuid;
  retry:=public.place_combined_wager(jsonb_build_array(selections->1,selections->0),10,req);
  assert receipt->>'wager_id'=retry->>'wager_id','Retry created another ticket';
  assert (select balance=990 from public.wallets where user_id=a),'Retry debited twice';
  assert (select odds=6 from public.combined_wagers where id=win),'Wrong total odds';
  assert (select count(*)=2 from public.combined_wager_legs where combined_wager_id=win),'Wrong leg count';
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,11,%L)',selections,req),'déjà utilisé');
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,10,%L)',jsonb_set(selections,'{0,side}','"no"'),req),'déjà utilisé');
  perform public.place_wager(markets[1],'yes',7,gen_random_uuid());
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[3],'side','yes','odds',2),jsonb_build_object('subject_id',markets[4],'side','yes','odds',2));
  receipt:=public.place_combined_wager(selections,10,gen_random_uuid()); loss:=(receipt->>'wager_id')::uuid;
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[5],'side','yes','odds',2),jsonb_build_object('subject_id',markets[6],'side','no','odds',3));
  receipt:=public.place_combined_wager(selections,10,gen_random_uuid()); partial_void:=(receipt->>'wager_id')::uuid;
  selections:=jsonb_build_array(jsonb_build_object('subject_id',markets[7],'side','yes','odds',2),jsonb_build_object('subject_id',markets[8],'side','yes','odds',2));
  receipt:=public.place_combined_wager(selections,10,gen_random_uuid()); all_void:=(receipt->>'wager_id')::uuid;
  assert (select count(*)=4 from public.combined_wagers where user_id=a),'Read policy failed';
  perform pg_temp.combo_expect_error(format('select public.resolve_subject(%L,''yes'',''Décision de test combiné.'')',markets[1]),'administrateur');
  execute 'reset role';
  perform pg_temp.combo_expect_error(format('update public.subjects set outcomes=''[]'' where id=%L',markets[1]),'verrouillées');
  perform set_config('request.jwt.claim.sub',admin_id::text,true); execute 'set local role authenticated';
  perform public.resolve_subject(markets[1],'yes','Décision de test combiné.');
  assert (select result='open' and payout is null from public.combined_wagers where id=win),'Paid before every leg resolved';
  assert (select payout=14 from public.wagers where subject_id=markets[1]),'Simple wager regression';
  perform public.resolve_subject(markets[2],'no','Décision de test combiné.');
  assert (select result='won' and payout=60 from public.combined_wagers where id=win),'Wrong winning payout';
  balance_before:=(select balance from public.wallets where user_id=a);
  perform public.resolve_subject(markets[2],'no','Décision de test combiné.');
  assert (select balance=balance_before from public.wallets where user_id=a),'Repeated settlement paid twice';
  perform public.resolve_subject(markets[3],'no','Décision de test combiné.');
  assert (select result='lost' and payout=0 from public.combined_wagers where id=loss),'Loss not immediate';
  perform public.resolve_subject(markets[4],'yes','Décision de test combiné.');
  assert (select result='lost' and payout=0 from public.combined_wagers where id=loss),'Lost ticket changed';
  perform public.resolve_subject(markets[5],'cancelled','Décision de test combiné.');
  assert (select result='open' from public.combined_wagers where id=partial_void),'Void settled prematurely';
  perform public.resolve_subject(markets[6],'no','Décision de test combiné.');
  assert (select result='won' and payout=30 from public.combined_wagers where id=partial_void),'Void leg not odds 1';
  perform public.resolve_subject(markets[7],'cancelled','Décision de test combiné.');
  perform public.resolve_subject(markets[8],'cancelled','Décision de test combiné.');
  assert (select result='refunded' and payout=10 from public.combined_wagers where id=all_void),'All-void refund incorrect';
  assert (select net_profit=67 and settled_wagers=4 and won_wagers=3 and success_rate=75 from public.leaderboard where user_id=a),'Leaderboard incorrect';
  execute 'reset role';
  assert (select balance=1067 from public.wallets where user_id=a),'Final balance incorrect';
  assert (select sum(amount)=1067 from public.wallet_transactions where user_id=a),'Ledger mismatch';
  assert (select count(*)=1 from public.wallet_transactions where combined_wager_id=win and kind='payout'),'Duplicate payout movement';
  -- A fresh ticket must reject excluded, expired and missing subjects atomically.
  insert into public.subjects(creator_id,title,category,closes_at,outcomes)
    values(a,'Sujet compagnon combiné','Cours',clock_timestamp()+interval '1 day',opts) returning id into companion;
  insert into public.subjects(creator_id,title,category,closes_at,outcomes,banned_users)
    values(a,'Sujet exclu combiné','Cours',clock_timestamp()+interval '1 day',opts,array[a]) returning id into m;
  selections:=jsonb_build_array(jsonb_build_object('subject_id',m,'side','yes','odds',2),jsonb_build_object('subject_id',companion,'side','yes','odds',2));
  perform set_config('request.jwt.claim.sub',a::text,true); execute 'set local role authenticated';
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',selections,gen_random_uuid()),'interdit');
  execute 'reset role';
  update public.subjects set banned_users='{}',closes_at=clock_timestamp()+interval '50 milliseconds' where id=m;
  perform pg_sleep(0.1);
  execute 'set local role authenticated';
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',selections,gen_random_uuid()),'mises sont closes');
  selections:=jsonb_set(selections,'{0,subject_id}',to_jsonb(gen_random_uuid()::text));
  perform pg_temp.combo_expect_error(format('select public.place_combined_wager(%L::jsonb,1,%L)',selections,gen_random_uuid()),'introuvable');
  assert (select balance=1067 from public.wallets where user_id=a),'Rejected ticket debited wallet';
  retry:=public.place_combined_wager(jsonb_build_array(jsonb_build_object('subject_id',markets[1],'side','yes','odds',2),jsonb_build_object('subject_id',markets[2],'side','no','odds',3)),10,req);
  assert (retry->>'already_placed')::boolean,'Retry after settlement failed';
  execute 'reset role'; execute 'set local role anon';
  perform pg_temp.combo_expect_error('select public.place_combined_wager(''[]'',1,null)','permission denied');
  execute 'reset role';
end $qa$;
select 'PASS: validation, odds, atomic debit, retry, permissions, frozen conditions, pending, won, immediate loss, partial/all cancellation, single payout, simple wagers, leaderboard, ledger' as verification;
