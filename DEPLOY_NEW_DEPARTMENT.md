# 运营中台 · 新部门独立部署手册

> 适用场景：另一个部门需要一套自己的运营中台，使用自己的 GitHub 仓库、自己的 Supabase 项目和自己的网页地址。  
> 目标结果：新部门的数据、账号、处理记录、任务和网站名称都与原部门完全隔离。

---

## 一、开始前准备

请先准备：

- [ ] 一个 GitHub 账号
- [ ] 一个 Supabase 账号
- [ ] 一台可以打开终端并安装 Node.js 的电脑
- [ ] 新部门的英文或拼音项目名，例如 `sales-ops`
- [ ] 新部门第一位创作者的真实姓名

建议预留 30–60 分钟完成首次部署。

---

## 二、部署架构

每个部门使用一套独立服务：

```text
部门 A
├─ GitHub 仓库 A
├─ GitHub Pages 地址 A
├─ Supabase 项目 A
└─ 数据与账号 A

部门 B
├─ GitHub 仓库 B
├─ GitHub Pages 地址 B
├─ Supabase 项目 B
└─ 数据与账号 B
```

不同 Supabase 项目之间不会共享数据，也不会共享登录账号。

---

## 三、复制 GitHub 项目

1. 打开原项目：

   <https://github.com/leifarun/yunying-portal>

2. 点击右上角 **Fork**，将仓库复制到新部门自己的 GitHub 账号下。

3. 建议把仓库名称改成新部门自己的名称，例如：

   ```text
   sales-ops
   ```

4. 如果使用本地终端，也可以执行：

   ```bash
   git clone https://github.com/原仓库账号/yunying-portal.git sales-ops
   cd sales-ops
   git remote set-url origin https://github.com/新部门账号/sales-ops.git
   git push -u origin main
   ```

不要复制旧项目的 `.git` 目录后再覆盖远端地址，优先使用 Fork 或重新关联远端。

---

## 四、创建新的 Supabase 项目

1. 登录 <https://supabase.com/dashboard>。
2. 点击 **New project**。
3. 填写：
   - Project name：新部门名称
   - Database password：使用强密码并妥善保存
   - Region：选择离团队较近的区域
4. 创建完成后，记录以下信息：

```text
Project reference: ____________________
Project URL: https://<project-ref>.supabase.co
Publishable Key: sb_publishable_____________________
```

说明：

- `Publishable Key` 可以放到前端。
- **不要**把 `Service Role Key` 写入网页、README、GitHub 或聊天记录。
- 数据库密码不要告诉普通组员。

---

## 五、执行数据库迁移

进入新 Supabase 项目的 **SQL Editor**。

按以下顺序，每次复制一个文件的完整内容并点击 **Run**：

1. `supabase/migrations/001_team_workflow.sql`
2. `supabase/migrations/002_harden_public_signup.sql`
3. `supabase/migrations/003_seed_thresholds.sql`
4. `supabase/migrations/004_weekly_task_assignments.sql`
5. `supabase/migrations/005_creator_permissions.sql`
6. `supabase/migrations/006_split_slow_task_boards.sql`
7. `supabase/migrations/007_team_shared_data.sql`
8. `supabase/migrations/008_app_settings.sql`
9. `supabase/migrations/009_product_week_snapshots.sql`

注意：

- 必须按编号顺序执行。
- 每次执行时检查结果是否为 `Success. No rows returned` 或创建成功。
- `005_creator_permissions.sql` 末尾包含原项目的账号升级语句，对新项目通常不会匹配任何账号，这是正常现象。
- 后续还需要手动把新项目的第一位用户设为 `创作者`。

验证表是否已创建：

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
```

至少应看到：

```text
actions
app_settings
import_batches
product_week_snapshots
products
profiles
thresholds
weekly_issue_stats
weekly_task_assignments
```

---

## 六、创建第一位创作者

新 Supabase 项目没有初始账号，必须先创建第一位创作者。

### 6.1 创建登录用户

1. 进入 Supabase Dashboard → **Authentication** → **Users**。
2. 点击 **Add user** → **Create new user**。
3. 填写创作者真实邮箱和初始密码，并开启邮箱确认。
4. 创建后，触发 `handle_new_user()` 会在 `profiles` 表中生成一条资料。

### 6.2 设为创作者

进入 SQL Editor，执行：

```sql
select id, email
from auth.users
order by created_at;
```

找到刚刚创建的用户 ID，然后执行：

```sql
update public.profiles
set name = '创作者姓名',
    role = '创作者',
    active = true,
    archived_at = null,
    archived_by = null
where id = '这里替换为刚刚创建的用户ID';
```

再次验证：

```sql
select id, name, role, login_name, active, archived_at
from public.profiles
where id = '这里替换为刚刚创建的用户ID';
```

应看到：

```text
role   = 创作者
active = true
```

### 6.3 首次登录

等 GitHub Pages 和 Edge Function 都部署完成后，先使用创作者的真实邮箱 + 密码登录网页。

此时应先确认：

- 能进入“账号与权限”
- 角色显示为“创作者”
- 能看到“网站名称”设置卡片
- 能打开“新建账号”

用户名修改放到第十一步、确认 Edge Function 正常后再操作。

---

## 七、关闭公开注册并配置 Auth 地址

进入 Supabase Dashboard → **Authentication**：

1. 打开 **Providers → Email**。
2. 关闭 **Allow new users to sign up**。
3. 进入 **URL Configuration**，设置：
   - Site URL：新部门的 GitHub Pages 正式地址
   - Redirect URLs：`新部门正式地址/**`

例如：

```text
Site URL:
https://new-department.github.io/sales-ops/

Redirect URLs:
https://new-department.github.io/sales-ops/**
```

如果先部署网页、后配置 URL，也可以稍后回来补填。

---

## 八、部署 admin-users Edge Function

该函数负责账号创建、密码重置、用户名修改和账号归档。

### 8.1 安装 Node.js

确认终端能运行：

```bash
node --version
npm --version
```

### 8.2 登录并关联 Supabase

在项目根目录执行：

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <你的ProjectRef>
```

执行 `link` 时可能需要输入数据库密码。

### 8.3 部署函数

```bash
npx supabase@latest functions deploy admin-users --project-ref <你的ProjectRef>
```

### 8.4 检查函数环境变量

函数运行时会读取：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

这些变量只能在 Supabase 服务端环境或 Edge Function 密钥中使用。

再次强调：

- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 写入 `assets/config.js`
- 不要把 Service Role Key 提交到 GitHub
- 不要把它发给组员

---

## 九、修改前端 Supabase 配置

打开：

`assets/config.js`

替换成新项目自己的地址和 Publishable Key：

```js
window.APP_CONFIG = {
  supabaseUrl: "https://<你的ProjectRef>.supabase.co",
  supabaseKey: "<你的Publishable Key>",
  appName: "<新部门名称> · 内部运营中台"
};
```

注意：

- `supabaseUrl` 必须和新 Supabase 项目的 Project URL 完全一致。
- `supabaseKey` 必须是 Publishable Key。
- `appName` 仅作为代码中的名称参考；登录后请在“账号与权限 → 网站名称”中设置正式显示名称。

---

## 十、部署 GitHub Pages

1. 将修改后的代码提交到新部门自己的 GitHub 仓库：

   ```bash
   git add .
   git commit -m "Configure new department deployment"
   git push
   ```

2. 打开新仓库的 **Settings → Pages**。
3. Source 选择：
   - Branch：`main`
   - Folder：`/ (root)`
4. 保存并等待 1–3 分钟。
5. 记录生成的正式网址，例如：

   ```text
   https://new-department.github.io/sales-ops/
   ```

6. 回到 Supabase → Authentication → URL Configuration，确认 Site URL 和 Redirect URLs 已填写该网址。

---

## 十一、首次使用配置

### 11.1 登录创作者账号

使用第六步创建的创作者账号登录。首次可以使用真实邮箱 + 密码。

如需把登录名改成 `创作者`：

1. 进入“账号与权限”
2. 找到当前账号
3. 点击“改用户名”
4. 输入 `创作者`
5. 保存后退出登录
6. 再使用“创作者 + 密码”登录

只有 `admin-users` Edge Function 部署成功后，“改用户名”才会正常工作。

### 11.2 设置网站名称

进入：

`账号与权限 → 网站名称`

输入新部门名称，例如：

```text
销售二部 · 内部运营中台
```

保存后：

- 浏览器标签名称更新
- 登录页品牌更新
- 侧边栏品牌更新
- 团队刷新后同步显示

网站名称只有创作者可以修改，主管和组员只能查看。

### 11.3 创建团队成员

进入“账号与权限”：

1. 点击“新建账号”
2. 填写姓名、用户名、初始密码和角色
3. 姓名必须与导入 Excel 的“负责人”列完全一致

例如：

```text
Excel 负责人：王丹
账号姓名：王丹
```

如果两边不一致，该成员可能看不到对应产品，导入时也可能被负责人校验拦截。

### 11.4 导入第一周数据

进入“导入中心”：

1. 下载标准模板
2. 填写产品数据
3. 上传 XLSX/CSV
4. 检查负责人和表头校验结果
5. 确认导入并切换当前批次

第一周导入后，主管可以在“每周处理进度”页给组员分配任务。

---

## 十二、上线验收清单

- [ ] 新 Supabase 项目的 9 个迁移都执行成功
- [ ] `app_settings` 表存在
- [ ] `admin-users` Edge Function 部署成功
- [ ] `assets/config.js` 已换成新项目 URL 和 Publishable Key
- [ ] GitHub Pages 已成功打开
- [ ] Supabase Site URL 和 Redirect URLs 已填写正式网址
- [ ] 公开注册已关闭
- [ ] 首位账号已设为“创作者”
- [ ] 创作者可以创建组员账号
- [ ] 创作者可以修改网站名称
- [ ] 组员刷新后能看到同一网站名称
- [ ] 组员能查看全团队数据并协助处理
- [ ] 导入模板能正常上传并切换批次
- [ ] 主管可以分配周任务
- [ ] 处理记录里的 ASIN、MSKU、FNSKU、店铺正常显示
- [ ] 进度完成后刷新页面，网站名称不会回到旧名称

---

## 十三、常见问题

### 问题 1：登录时提示账号或密码错误

检查：

- 是否使用了正确的 Supabase 项目
- 首次创作者账号是否使用真实邮箱登录
- 是否已经把 `profiles.role` 改成 `创作者`
- 是否已经退出旧账号后重新登录

### 问题 2：账号创建按钮没有反应

检查：

- `admin-users` Edge Function 是否部署成功
- 当前账号是否为“创作者”
- Supabase 项目是否已执行全部迁移
- Edge Function 是否缺少服务端环境变量

### 问题 3：组员登录后看不到数据

检查：

- `profiles.active` 是否为 `true`
- 账号姓名是否与产品负责人完全一致
- `007_team_shared_data.sql` 是否执行
- 当前批次是否已经生效

### 问题 4：网站名称刷新后又变回旧名称

检查：

- 当前线上版本是否为 `v=21` 或更高
- 是否曾在“账号与权限”中成功保存过名称
- 是否使用了无痕模式导致本地缓存没有保留
- 浏览器是否仍缓存了旧版 JS，按 `Ctrl + F5` 强制刷新

### 问题 5：导入时报负责人不存在

检查：

- Excel 的“负责人”列是否与 `profiles.name` 完全一致
- 是否存在多余空格、括号或全角半角差异
- 对应账号是否处于“在职”状态

### 问题 6：GitHub Pages 打开是旧页面

检查：

- 正确仓库的 `main` 分支是否包含最新提交
- GitHub Pages 是否使用 `main / (root)`
- Actions/Pages 构建是否成功
- 是否遇到浏览器缓存，强制刷新

---

## 十四、安全与数据保留

- 每个部门必须使用独立 Supabase 项目。
- Publishable Key 可以公开。
- Service Role Key 只能放在 Supabase Edge Function 环境变量中。
- GitHub Pages 源码可以公开；业务数据由 Supabase Auth + RLS 保护。
- 免费版没有自动数据库备份，重大导入或结构调整前建议手工导出数据。
- 每周导入只替换产品明细，历史处理记录和周统计保留。
- 删除账号优先使用“归档账号”，不要直接删除历史归属。
- 不建议多个部门共用一个 Supabase 项目；如果需要统一多租户平台，应单独设计部门字段、角色和 RLS。

---

## 十五、可以直接发给同事的开场话术

```text
这是运营中台的独立部署手册。请不要直接使用原部门网址，也不要使用原部门的 Supabase Key。

请按照手册：
1. Fork 你自己的 GitHub 仓库
2. 创建自己的 Supabase 项目
3. 按顺序执行 001–009 迁移
4. 部署 admin-users Edge Function
5. 修改 assets/config.js
6. 部署 GitHub Pages
7. 创建第一位创作者
8. 配置网站名称和团队成员

完整步骤和验收清单见：DEPLOY_NEW_DEPARTMENT.md
```
