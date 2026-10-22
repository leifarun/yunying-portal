-- 团队协作模式：所有在职成员可查看全团队运营数据，并可协助处理其他负责人的商品。
-- 写账号、导入、修改阈值和分配任务的管理权限保持不变。

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select to authenticated
  using (public.is_active_user());

drop policy if exists actions_read on public.actions;
create policy actions_read on public.actions
  for select to authenticated
  using (public.is_active_user());

drop policy if exists weekly_stats_read on public.weekly_issue_stats;
create policy weekly_stats_read on public.weekly_issue_stats
  for select to authenticated
  using (public.is_active_user());

drop policy if exists weekly_assignments_read on public.weekly_task_assignments;
create policy weekly_assignments_read on public.weekly_task_assignments
  for select to authenticated
  using (public.is_active_user());
