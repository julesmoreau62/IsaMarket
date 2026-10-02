-- CURRENT schema regression checks; run with BEGIN + proposed patch + this file + ROLLBACK.
-- Synthetic Auth rows do not send emails. Assertions abort the transaction on failure.
create function pg_temp.audit_expect_error(statement text,expected text) returns void language plpgsql as $$
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
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); admin_id uuid;
  m uuid; banned uuid; expired uuid; refund uuid; request uuid:=gen_random_uuid(); receipt jsonb; retry jsonb;
  opts jsonb:='[{"id":"yes","label":"Oui","odds":2},{"id":"no","label":"Non","odds":2}]';
  before_balance bigint;
begin
  select id into admin_id from auth.users where lower(email)='tanguypavat8@gmail.com';
  if admin_id is null then
    admin_id:=gen_random_uuid();
    insert into auth.users(id,email,email_confirmed_at) values(admin_id,'tanguypavat8@gmail.com',clock_timestamp());
  end if;
  insert into auth.users(id,email,email_confirmed_at) values
    (a,'audit-'||a||'@example.invalid',clock_timestamp()),(b,'audit-'||b||'@example.invalid',clock_timestamp());
  perform set_config('request.jwt.claim.sub',a::text,true); perform public.complete_registration(null);
  perform public.complete_registration(null);
  assert (select balance=1000 from public.wallets where user_id=a),'Duplicate initial grant';
  perform set_config('request.jwt.claim.sub',b::text,true); perform public.complete_registration(null);
  insert into public.subjects(creator_id,title,category,closes_at,outcomes,banned_users)
  values(b,'Exclusion temporaire audit','Cours',clock_timestamp()+interval '1 day',opts,array[a]) returning id into banned;
  insert into public.subjects(creator_id,title,category,closes_at,outcomes)
  values(b,'Échéance temporaire audit','Cours',clock_timestamp()+interval '100 milliseconds',opts) returning id into expired;
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  perform pg_temp.audit_expect_error(format('select public.create_subject(%L,%L,null,clock_timestamp()+interval ''1 day'',%L::jsonb)', 'Résultats invalides audit','Cours','[]'),'résultats requis');
  perform pg_temp.audit_expect_error(format('select public.create_subject(%L,%L,null,clock_timestamp()+interval ''1 day'',%L::jsonb)', 'Doublons invalides audit','Cours','[{"id":"yes","label":"A","odds":2},{"id":"yes","label":"B","odds":2}]'),'uniques');
  m:=public.create_subject('Sujet temporaire audit','Cours',null,clock_timestamp()+interval '1 day',opts);
  perform pg_temp.audit_expect_error(format('select public.create_subject(%L,%L,null,clock_timestamp()+interval ''1 day'',%L::jsonb)','Deuxième sujet audit','Cours',opts),'déjà créé');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1.5,%L)',m,gen_random_uuid()),'entier positif');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',0,%L)',m,gen_random_uuid()),'entier positif');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',-1,%L)',m,gen_random_uuid()),'entier positif');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',''NaN''::numeric,%L)',m,gen_random_uuid()),'entier positif');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1,null)',m),'Identifiant de mise');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1,%L)',gen_random_uuid(),gen_random_uuid()),'introuvable');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''unknown'',1,%L)',m,gen_random_uuid()),'invalide');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1001,%L)',m,gen_random_uuid()),'Solde insuffisant');
  assert not exists(select 1 from public.subjects where id=banned),'Excluded user sees subject';
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1,%L)',banned,gen_random_uuid()),'interdit');
  receipt:=public.place_wager(m,'yes',50,request);
  retry:=public.place_wager(m,'yes',50,request);
  assert receipt->>'wager_id'=retry->>'wager_id','Idempotent receipt differs';
  assert (select balance=950 from public.wallets where user_id=a),'Repeated wager debited twice';
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''no'',50,%L)',m,request),'déjà utilisé');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',51,%L)',m,request),'déjà utilisé');
  perform pg_sleep(0.2);
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1,%L)',expired,gen_random_uuid()),'mises sont closes');
  perform pg_temp.audit_expect_error('update public.wallets set balance=99999','permission denied');
  perform pg_temp.audit_expect_error(format('select public.resolve_subject(%L,''yes'',%L)',m,'Justification valide audit'),'administrateur');
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',admin_id::text,true); perform public.complete_registration(null);
  execute 'set local role authenticated';
  perform pg_temp.audit_expect_error(format('select public.resolve_subject(%L,null,%L)',m,'Justification valide audit'),'invalide');
  perform pg_temp.audit_expect_error(format('select public.resolve_subject(%L,''yes'',''court'')',m),'Justification');
  perform public.resolve_subject(m,'yes','Justification valide audit');
  before_balance:=(select balance from public.wallets where user_id=a);
  assert before_balance=1050,'Fixed odds payout differs';
  retry:=public.resolve_subject(m,'yes','Justification valide audit');
  assert (retry->>'already_settled')::boolean,'Settlement retry failed';
  assert (select balance=before_balance from public.wallets where user_id=a),'Paid twice';
  perform pg_temp.audit_expect_error(format('select public.resolve_subject(%L,''no'',%L)',m,'Justification valide audit'),'autre résultat');
  refund:=public.create_subject('Remboursement temporaire audit','Cours',null,clock_timestamp()+interval '1 day',opts);
  perform public.place_wager(refund,'no',17,gen_random_uuid());
  perform public.close_subject(refund,'Clôture temporaire pour audit');
  perform pg_temp.audit_expect_error(format('select public.place_wager(%L,''yes'',1,%L)',refund,gen_random_uuid()),'mises sont closes');
  perform public.resolve_subject(refund,'cancelled','Annulation temporaire pour audit');
  assert (select result='refunded' and payout=amount from public.wagers where subject_id=refund),'Refund differs';
  execute 'reset role';
  assert not exists(select 1 from public.wallets w join public.wallet_transactions t on t.user_id=w.user_id where w.user_id in(a,b) group by w.user_id,w.balance having sum(t.amount)<>w.balance),'Wallet ledger differs';
end $qa$;
