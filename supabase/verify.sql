-- Transactional regression suite. All fixtures are rolled back.
begin;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlerrm not ilike '%' || expected || '%' then raise exception 'Unexpected error: % (expected %)', sqlerrm, expected; end if;
    return;
  end;
  raise exception 'Expected rejection: %', expected;
end $$;
do $$
declare
  admin_id uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  unverified uuid := gen_random_uuid(); market uuid; refund_market uuid; no_winner uuid; timed uuid;
  invite record; receipt jsonb; retry jsonb; req uuid := gen_random_uuid(); before_total bigint; after_total bigint;
begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    (admin_id,'tanguypavat8@gmail.com',clock_timestamp(),'{}'),
    (a,'qa-a@isamarket.invalid',clock_timestamp(),'{"role":"admin"}'),
    (b,'qa-b@isamarket.invalid',clock_timestamp(),'{}'),
    (outsider,'qa-outside@isamarket.invalid',clock_timestamp(),'{"role":"admin"}'),
    (unverified,'qa-unverified@isamarket.invalid',null,'{}');
  perform set_config('request.jwt.claim.sub',unverified::text,true);
  perform pg_temp.expect_error('select public.complete_registration(null)','Confirme');
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  execute 'set local role authenticated';
  perform public.complete_registration(null);
  perform public.complete_registration(null);
  assert (select balance=1000 from public.wallets where user_id=admin_id), 'Initial grant duplicated';
  select * into invite from public.create_invitation('qa-a@isamarket.invalid',14);
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform pg_temp.expect_error(format('select public.complete_registration(%L)',invite.invitation_code),'autre adresse');
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.complete_registration(invite.invitation_code);
  assert not private.is_admin(), 'Editable metadata granted admin';
  perform pg_temp.expect_error('select public.create_invitation(null,14)','administrateur');
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform pg_temp.expect_error(format('select public.complete_registration(%L)',invite.invitation_code),'invalide');
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  select * into invite from public.create_invitation(null,14);
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.complete_registration(invite.invitation_code);
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  assert (select count(*)=0 from public.subjects), 'Outsider reads subjects';
  assert (select count(*)=0 from public.profiles), 'Outsider reads profiles';
  perform pg_temp.expect_error('select public.complete_registration(null)','Invitation');
  perform pg_temp.expect_error('select public.create_subject(''Un sujet test ?'',''Contexte assez long pour le test.'',''Cours'',null,now()+interval ''1 day'',''Critères assez longs pour le test.'')','Membre actif');
  perform set_config('request.jwt.claim.sub',a::text,true);
  select id into market from public.create_subject('Un sujet de test ?', 'Contexte assez long pour le test.', 'Cours', null, clock_timestamp()+interval '1 day','Critères assez longs pour le test.');
  assert (select creation_day=timezone('Europe/Paris',clock_timestamp())::date from public.subjects where id=market), 'Paris quota day';
  perform pg_temp.expect_error('select public.create_subject(''Deuxième sujet test ?'',''Contexte assez long pour le test.'',''Cours'',null,now()+interval ''1 day'',''Critères assez longs pour le test.'')','déjà créé');
  assert (select yes_odds is null and no_odds is null from public.subject_market_stats where id=market), 'Invented liquidity';
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',0,%L)',market,gen_random_uuid()),'entier positif');
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',1.5,%L)',market,gen_random_uuid()),'entier positif');
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',1001,%L)',market,gen_random_uuid()),'Solde insuffisant');
  receipt := public.place_wager(market,'yes',1,req);
  retry := public.place_wager(market,'yes',1,req);
  assert receipt->>'wager_id'=retry->>'wager_id', 'Retry created another wager';
  assert (select balance=999 from public.wallets where user_id=a), 'Retry debited twice';
  assert (select yes_odds=1 and no_odds is null from public.subject_market_stats where id=market), 'One-sided odds';
  perform pg_temp.expect_error(format('select public.place_wager(%L,''no'',1,%L)',market,req),'déjà utilisé');
  perform pg_temp.expect_error('update public.wallets set balance=99999','permission denied');
  perform pg_temp.expect_error('update public.memberships set role=''admin''','permission denied');
  perform pg_temp.expect_error('update public.subjects set status=''yes''','permission denied');
  perform pg_temp.expect_error(format('select public.resolve_subject(%L,''yes'',''Décision de test précise.'')',market),'administrateur');
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.place_wager(market,'yes',2,gen_random_uuid());
  perform public.place_wager(market,'no',7,gen_random_uuid());
  assert (select abs(yes_odds-10.0/3)<0.0001 and abs(no_odds-10.0/7)<0.0001 from public.subject_market_stats where id=market), 'Pool odds incorrect';
  execute 'reset role';
  perform pg_temp.expect_error(format('update public.subjects set title=''Conditions changées ?'' where id=%L',market),'Conditions verrouillées');
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  before_total := (select sum(balance) from public.wallets);
  perform public.resolve_subject(market,'yes','Justification détaillée du test.');
  assert (select sum(payout)=10 from public.wagers where subject_id=market), 'Rounding lost Squids';
  assert (select sum(balance)=before_total+10 from public.wallets), 'Settlement total';
  assert (select payout=3 from public.wagers where subject_id=market and user_id=a), 'Proportional allocation';
  assert (select payout=7 from public.wagers where subject_id=market and user_id=b and side='yes'), 'Largest remainder';
  after_total := (select sum(balance) from public.wallets);
  perform public.resolve_subject(market,'yes','Repeated settlement justification.');
  assert (select sum(balance)=after_total from public.wallets), 'Double payment';
  perform pg_temp.expect_error(format('select public.resolve_subject(%L,''no'',''Autre résultat refusé.'')',market),'autre résultat');
  assert (select net_profit=2 from public.leaderboard where user_id=a), 'Leaderboard includes initial grant';
  assert (select net_profit=-2 and success_rate=50 from public.leaderboard where user_id=b), 'Leaderboard results';
  select id into refund_market from public.create_subject('Sujet à annuler ?', 'Contexte assez long pour le test.', 'Cours', null, clock_timestamp()+interval '1 day','Critères assez longs pour le test.');
  perform public.place_wager(refund_market,'yes',19,gen_random_uuid());
  perform public.resolve_subject(refund_market,'cancelled','Sujet annulé pour les tests.');
  assert (select result='refunded' and payout=amount from public.wagers where subject_id=refund_market), 'Cancellation refund';
  perform pg_temp.expect_error('select public.create_subject(''Quota reste utilisé ?'',''Contexte assez long pour le test.'',''Cours'',null,now()+interval ''1 day'',''Critères assez longs pour le test.'')','déjà créé');
  perform set_config('request.jwt.claim.sub',b::text,true);
  select id into no_winner from public.create_subject('Sujet sans gagnant ?', 'Contexte assez long pour le test.', 'Cours', null, clock_timestamp()+interval '1 day','Critères assez longs pour le test.');
  perform public.place_wager(no_winner,'yes',17,gen_random_uuid());
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.close_subject(no_winner,'Clôture anticipée pour test.');
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',1,%L)',no_winner,gen_random_uuid()),'mises sont closes');
  perform public.resolve_subject(no_winner,'no','Aucune mise sur le résultat.');
  assert (select payout=amount and result='refunded' from public.wagers where subject_id=no_winner), 'No-winner refund';
  assert (select net_profit=-2 and settled_wagers=2 from public.leaderboard where user_id=b), 'Refund changed leaderboard';
  perform public.set_member_status(a,'suspended');
  perform set_config('request.jwt.claim.sub',a::text,true);
  assert (select count(*)=0 from public.subjects), 'Suspended user reads subjects';
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',1,%L)',market,gen_random_uuid()),'Membre actif');
  execute 'reset role';
  insert into public.subjects(creator_id,title,description,category,closes_at,resolution_criteria,creation_day)
    values (admin_id,'Sujet clôture horaire ?', 'Contexte assez long pour le test.', 'Cours', clock_timestamp()+interval '100 milliseconds', 'Critères assez longs pour le test.',timezone('Europe/Paris',clock_timestamp())::date-1) returning id into timed;
  perform pg_sleep(0.2);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform pg_temp.expect_error(format('select public.place_wager(%L,''yes'',1,%L)',timed,gen_random_uuid()),'mises sont closes');
  assert (select sum(balance)=3000 from public.wallets), 'Squid supply not conserved';
  assert (select count(*)=3 from public.wallet_transactions where kind='initial_grant'), 'Grant count';
  execute 'reset role';
end $$;
select 'PASS: invitation, verified admin, metadata rejection, RLS, Paris quota, cancellation quota, integer amounts, overdraft, retry, odds, immutable rules, rounding, conservation, settlement replay, refunds, leaderboard, suspension, wall-clock closure' as verification;
rollback;
