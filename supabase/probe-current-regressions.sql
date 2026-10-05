-- Observe current regressions; all synthetic data is rolled back.
begin;
create temporary table audit_observations (test text, accepted boolean, detail text);
create function pg_temp.audit_probe(label text, statement text) returns void language plpgsql as $$
begin
  begin execute statement; insert into audit_observations values(label,true,'Accepté');
  exception when others then insert into audit_observations values(label,false,sqlerrm); end;
end $$;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); m uuid; banned uuid; expired uuid; request uuid:=gen_random_uuid();
opts jsonb:='[{"id":"yes","label":"Oui","odds":2},{"id":"no","label":"Non","odds":2}]';
begin
insert into auth.users(id,email,email_confirmed_at) values (a,'probe-'||a||'@example.invalid',clock_timestamp()),(b,'probe-'||b||'@example.invalid',clock_timestamp());
perform set_config('request.jwt.claim.sub',a::text,true); perform public.complete_registration(null);
perform set_config('request.jwt.claim.sub',b::text,true); perform public.complete_registration(null);
insert into public.subjects(creator_id,title,category,closes_at,outcomes) values(b,'Sujet de contrôle temporaire','Cours',clock_timestamp()+interval '1 day',opts) returning id into m;
insert into public.subjects(creator_id,title,category,closes_at,outcomes,banned_users) values(b,'Sujet exclusion temporaire','Cours',clock_timestamp()+interval '1 day',opts,array[a]) returning id into banned;
insert into public.subjects(creator_id,title,category,closes_at,outcomes) values(b,'Sujet échéance temporaire','Cours',clock_timestamp()+interval '150 milliseconds',opts) returning id into expired;
perform set_config('request.jwt.claim.sub',a::text,true);
perform pg_temp.audit_probe('Mise décimale 1.5',format('select public.place_wager(%L,''yes'',1.5,%L)',m,gen_random_uuid()));
perform pg_temp.audit_probe('Mise par utilisateur exclu',format('select public.place_wager(%L,''yes'',1,%L)',banned,gen_random_uuid()));
perform public.place_wager(m,'yes',5,request);
perform pg_temp.audit_probe('Même identifiant pour un autre choix',format('select public.place_wager(%L,''no'',5,%L)',m,request));
perform pg_sleep(0.2);
perform pg_temp.audit_probe('Mise après échéance dans transaction ancienne',format('select public.place_wager(%L,''yes'',1,%L)',expired,gen_random_uuid()));
end $$;
select * from audit_observations;
rollback;
