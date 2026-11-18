-- profiles 表新增部门和小组字段
alter table public.profiles
  add column if not exists department text,
  add column if not exists team_group text;

comment on column public.profiles.department is '所属部门，如：运营三部';
comment on column public.profiles.team_group is '所属小组，如：3.1 / 3.2；主管和创作者留空';
