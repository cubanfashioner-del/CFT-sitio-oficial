alter table public.profiles
  alter column username drop not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_phone text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  if requested_username = '' then
    requested_username := 'u_' || left(replace(new.id::text, '-', ''), 28);
  elsif requested_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'A valid username is required to create a profile.';
  end if;

  if requested_phone is not null
    and requested_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'A valid international phone number is required to create a profile.';
  end if;

  insert into public.profiles (
    id,
    username,
    phone,
    terms_accepted_at,
    privacy_notice_version
  )
  values (
    new.id,
    requested_username,
    requested_phone,
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'privacy_notice_version', '')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
