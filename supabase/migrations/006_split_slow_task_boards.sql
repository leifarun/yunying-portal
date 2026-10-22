-- 将旧的“低/中潜力滞销”合并任务拆分为两个独立板块。
-- 旧合并任务：向上取整分配给低潜力，剩余分配给中潜力；已有独立任务则累加。
with legacy as (
  select * from public.weekly_task_assignments where board_key = 'slow_low_mid'
), expanded as (
  select batch_id, week_no, week_start, week_end, owner,
         'sl_low'::text as board_key,
         ceil(target_count / 2.0)::integer as target_count,
         assigned_by
  from legacy
  union all
  select batch_id, week_no, week_start, week_end, owner,
         'sl_mid'::text as board_key,
         floor(target_count / 2.0)::integer as target_count,
         assigned_by
  from legacy
)
insert into public.weekly_task_assignments
  (batch_id, week_no, week_start, week_end, owner, board_key, target_count, assigned_by, updated_at)
select batch_id, week_no, week_start, week_end, owner, board_key, target_count, assigned_by, now()
from expanded
where target_count > 0
on conflict (batch_id, owner, board_key)
do update set
  target_count = public.weekly_task_assignments.target_count + excluded.target_count,
  updated_at = now();

delete from public.weekly_task_assignments where board_key = 'slow_low_mid';