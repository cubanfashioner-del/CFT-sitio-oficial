create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,30}$'
  ),
  phone text check (
    phone is null
    or phone ~ '^\+[1-9][0-9]{7,14}$'
  ),
  terms_accepted_at timestamptz,
  privacy_notice_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username, phone) on public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profile_updated_at();

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
  requested_phone := trim(coalesce(new.raw_user_meta_data ->> 'phone', ''));

  if requested_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'A valid username is required to create a profile.';
  end if;

  if requested_phone !~ '^\+[1-9][0-9]{7,14}$' then
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

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

insert into public.profiles (id, username, phone)
select
  users.id,
  'u_' || left(replace(users.id::text, '-', ''), 28),
  null
from auth.users as users
on conflict (id) do nothing;
