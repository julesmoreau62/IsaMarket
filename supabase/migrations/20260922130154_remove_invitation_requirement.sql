create or replace function private.complete_registration(p_invite_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users%rowtype;
  v_role text := 'player';
  v_username text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select *
  into v_user
  from auth.users
  where id = auth.uid()
  for update;

  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Confirme ton adresse e-mail avant de continuer';
  end if;

  if exists (select 1 from public.memberships where user_id = v_user.id) then
    return jsonb_build_object('ok', true, 'already_member', true);
  end if;

  if lower(v_user.email) = 'tanguypavat8@gmail.com' then
    v_role := 'admin';
  end if;

  v_username := left(split_part(v_user.email, '@', 1), 20)
    || '-'
    || left(replace(v_user.id::text, '-', ''), 5);

  insert into public.memberships(user_id, role)
  values (v_user.id, v_role);

  insert into public.profiles(user_id, username)
  values (v_user.id, v_username);

  insert into public.wallets(user_id, balance)
  values (v_user.id, 1000);

  insert into public.wallet_transactions(user_id, kind, amount, balance_after, event_key)
  values (v_user.id, 'initial_grant', 1000, 1000, 'initial:' || v_user.id::text);

  return jsonb_build_object('ok', true, 'role', v_role);
end;
$$;
