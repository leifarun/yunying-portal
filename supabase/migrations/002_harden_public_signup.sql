-- 加固公开注册场景：新账号默认停用，由主管在网页启用。
-- 姓名只取邮箱 @ 前的登录名，不接受注册时传入的 name 元数据。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, login_name, active)
  values (
    new.id,
    split_part(new.email, '@', 1),
    case when not exists (select 1 from public.profiles) then '主管' else '组员' end,
    split_part(new.email, '@', 1),
    case when not exists (select 1 from public.profiles) then true else false end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_admin()
      or owner = (select name from public.profiles where id = auth.uid())
    )
  );

drop policy if exists actions_read on public.actions;
create policy actions_read on public.actions
  for select to authenticated
  using (public.is_active_user() and (public.is_admin() or user_id = auth.uid()));

drop policy if exists actions_update on public.actions;
create policy actions_update on public.actions
  for update to authenticated
  using (public.is_active_user() and (public.is_admin() or user_id = auth.uid()))
  with check (public.is_active_user() and (public.is_admin() or user_id = auth.uid()));

drop policy if exists weekly_stats_read on public.weekly_issue_stats;
create policy weekly_stats_read on public.weekly_issue_stats
  for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_admin()
      or owner = (select name from public.profiles where id = auth.uid())
    )
  );