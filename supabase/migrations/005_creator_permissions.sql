-- 角色层级与账号归档
alter table public.profiles
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('主管', '组员', '创作者'));

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = '创作者' and active = true and archived_at is null
  );
$$;

create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = '主管' and active = true and archived_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('主管', '创作者') and active = true and archived_at is null
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and archived_at is null
  );
$$;

create or replace function public.protect_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Edge Function / service role has no end-user auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  if public.is_creator() then
    return new;
  end if;

  if public.is_supervisor() and old.role = '组员' and old.archived_at is null then
    -- Supervisors may maintain member name/status/stores, but cannot escalate role,
    -- change login identity or archive the account.
    new.role := old.role;
    new.login_name := old.login_name;
    new.archived_at := old.archived_at;
    new.archived_by := old.archived_by;
    return new;
  end if;

  raise exception '当前账号没有修改该账号的权限';
end;
$$;

drop trigger if exists trg_protect_profile_updates on public.profiles;
create trigger trg_protect_profile_updates
  before update on public.profiles
  for each row execute function public.protect_profile_updates();

drop policy if exists profiles_admin on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_update on public.profiles
  for update to authenticated
  using (
    public.is_creator()
    or (public.is_supervisor() and role = '组员' and archived_at is null)
  )
  with check (
    public.is_creator()
    or (public.is_supervisor() and role = '组员' and archived_at is null)
  );

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_creator());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_creator() and id <> auth.uid());

-- 将当前主管账号升级为创作者并修改用户名。
update public.profiles
set role = '创作者', login_name = '创作者'
where login_name = 'elfredariffon';