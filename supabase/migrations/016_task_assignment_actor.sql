-- 任务分配的操作人由数据库强制为当前登录账号，防止前端伪造。
create or replace function public.set_task_assignment_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.assigned_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_task_assignment_actor on public.weekly_task_assignments;
create trigger trg_set_task_assignment_actor
  before insert or update on public.weekly_task_assignments
  for each row execute function public.set_task_assignment_actor();
