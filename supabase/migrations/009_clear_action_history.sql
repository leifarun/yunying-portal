-- 仅创作者可以清理全部历史处理记录。
create or replace function public.clear_action_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if not public.is_creator() then
    raise exception '只有创作者可以清理历史处理记录';
  end if;

  delete from public.actions;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.clear_action_history() to authenticated;
