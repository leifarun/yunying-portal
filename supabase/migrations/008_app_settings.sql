-- 网站级显示配置。当前用于自定义浏览器标签名称和登录/侧边栏品牌名称。
create table if not exists public.app_settings (
  key text primary key,
  value text not null check (char_length(btrim(value)) between 2 and 60),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('site_name', '运营三部 · 内部运营中台')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_public_read on public.app_settings;
drop policy if exists app_settings_insert on public.app_settings;
drop policy if exists app_settings_update on public.app_settings;

create policy app_settings_public_read on public.app_settings
  for select to anon, authenticated
  using (key = 'site_name');

create policy app_settings_insert on public.app_settings
  for insert to authenticated
  with check (public.is_creator());

create policy app_settings_update on public.app_settings
  for update to authenticated
  using (public.is_creator())
  with check (public.is_creator());

grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
