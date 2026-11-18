-- 新增“组长”职位：位于主管与组员之间。
-- 组长可查看全团队数据、协助处理商品，但不参与账号管理与任务分配。

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('主管', '组长', '组员', '创作者'));

-- 主管可以维护组员和组长的姓名、在职/离职状态和密码，但不能修改角色或提升权限。
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

  if public.is_supervisor() and old.role in ('组员', '组长') and old.archived_at is null then
    new.role := old.role;
    new.login_name := old.login_name;
    new.department := old.department;
    new.team_group := old.team_group;
    new.archived_at := old.archived_at;
    new.archived_by := old.archived_by;
    return new;
  end if;

  raise exception '当前账号没有修改该账号的权限';
end;
$$;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    public.is_creator()
    or (public.is_supervisor() and role in ('组员', '组长') and archived_at is null)
  )
  with check (
    public.is_creator()
    or (public.is_supervisor() and role in ('组员', '组长') and archived_at is null)
  );

-- 按当前团队设置：3.1 组组长王丹，3.2 组组长胡昕怡。
update public.profiles
set role = '组长'
where name in ('王丹', '胡昕怡') and role = '组员';
