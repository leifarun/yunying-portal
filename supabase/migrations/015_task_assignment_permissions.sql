-- 任务分配编辑权限：
-- 创作者/主管：全部人员
-- 组长：本部门 + 本小组内成员
-- 组员：仅自己

create or replace function public.can_manage_task_owner(p_owner text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.active = true
        and me.archived_at is null
        and (
          (me.role = '组员' and me.name = p_owner)
          or (me.role = '组长' and exists (
            select 1
            from public.profiles target
            where target.name = p_owner
              and target.department = me.department
              and target.team_group = me.team_group
          ))
        )
    );
$$;

revoke all on function public.can_manage_task_owner(text) from public;
revoke all on function public.can_manage_task_owner(text) from anon;
grant execute on function public.can_manage_task_owner(text) to authenticated;

drop policy if exists weekly_assignments_admin on public.weekly_task_assignments;
create policy weekly_assignments_write on public.weekly_task_assignments
  for all to authenticated
  using (public.can_manage_task_owner(owner))
  with check (public.can_manage_task_owner(owner));
