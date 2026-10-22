# 运营三部 · 内部运营中台（网页版）

这是基于原 `运营中台原型.html` 改造的团队网页版最小可用版本。前端使用原生 HTML/CSS/JavaScript，数据、登录和处理记录存储在 Supabase。

当前线上版本：`v=18`  
正式网址：`https://leifarun.github.io/yunying-portal/`

## 已实现

- Supabase 用户名 + 密码登录，角色区分创作者、主管、组员
- 总表看板与原型对齐：规模与销售、效率与质量、状态与风险、FBA 库龄饼图、各板块款数/货值、在售停售占比、国家站点、可展开店铺分布、人效表
- 总 Listing、8 个优化板块及滞销潜力分组
- 原型式筛选栏：ASIN/MSKU/FNSKU 精确或模糊搜索、批量搜索、国家/店铺/负责人、问题定位、滞销类型、库龄、退款等级、库存与在售标签、列配置、分页、CSV 导出
- 8 个优化板块列顺序与原型一致：ASIN、MSKU、FNSKU 开头，前三列冻结、右侧操作列冻结
- 所有数据表支持滚动时表头吸顶，底部横向滑块固定在浏览器窗口底部
- 商品指标表头支持升序/降序排序，筛选、分页和其他板块共用同一套排序逻辑
- 商品表列宽按表头文字和排序控件自适应，长指标名完整可读
- “阈值与公式”页：26 项指标可直接修改，保存后当前批次立即重新计算，历史周快照保持不变
- 单一“处理”入口：当前判定链路、历史处理记录、处理当时 → 当前指标变化、继续写本次动作
- 处理动作和动作类型统一记录为“已处理”，不再设置待复核、已完成、已关闭等状态
- 处理记录保留操作人和处理时的完整指标快照
- 处理记录永久保留，不随每周产品数据导入而删除
- 每周任务分配：主管按组员、按板块设置目标数量，低潜力、中潜力、高潜力分别独立，完成进度按处理商品数统计
- 团队协作：所有在职成员可查看全团队数据，并可协助处理其他人的商品；完成数计入商品负责人
- 任务分配和完成进度表格共用固定列宽，表头、输入框和进度单元格对齐
- 阈值锁定项和只读项可正常显示阈值或“—”，阈值页不会因显示函数缺失而报错
- 同一商品多板块分别计数；同一板块重复动作只计 1 个商品
- 导航数量使用完整千分位显示，不缩写为“万”
- 页面字体统一为 Arial，商品编码使用清晰的等宽字体
- 主管导入中心：XLSX/CSV 校验、分批写入、临时批次、原子切换
- 账号权限页：创作者管理全部账号，主管只能维护组员，状态使用在职/离职
- 演示模式：`?demo=1`，只用于预览界面，不读写数据库

## Supabase 项目

- Project URL: `https://ofwvjfshnnajnfkxexno.supabase.co`
- 前端只使用 Publishable Key，已写入 `assets/config.js`
- **不要把 Service Role Key 写入前端或发给组员**

数据库迁移文件：

`supabase/migrations/001_team_workflow.sql`

`supabase/migrations/002_harden_public_signup.sql`

`supabase/migrations/003_seed_thresholds.sql`

`supabase/migrations/004_weekly_task_assignments.sql`

`supabase/migrations/005_creator_permissions.sql`

`supabase/migrations/006_split_slow_task_boards.sql`

`supabase/migrations/007_team_shared_data.sql`

`001`–`007` 均已应用到当前项目，后续重建时请按文件名顺序执行。

迁移已经应用到当前项目，并验证了：

- `weekly_issue_stats` 表存在
- `activate_import_batch` 事务函数存在
- 产品表新增 14 个字段存在
- 周统计表已开启 RLS
- 全团队产品、处理记录、周统计和周任务共 4 条读取策略已确认为 `is_active_user()`

## 数据保留规则

导入确认后会执行以下流程：

1. 创建临时导入批次，`is_current = false`
2. 产品按每批 450 行写入临时批次
3. 全部写入成功后调用 `activate_import_batch`
4. 只保留新批次产品明细，删除旧批次产品明细
5. 处理记录 `actions`、动作快照、历史批次和周统计不删除

这样即使每周约 2.5 万行，免费版 500MB 也不会因为无限累积产品明细很快占满。

## 本地预览

在本目录执行：

```powershell
python -m http.server 8124
```

浏览器打开：

- 正式登录页：`http://localhost:8124/`
- 演示模式：`http://localhost:8124/?demo=1`

## 上线部署

Supabase 提供的是数据库、认证和存储，不会自动托管这个静态网页。前端可以免费部署到：

- Cloudflare Pages（推荐，直接拖拽整个目录）
- GitHub Pages
- Netlify
- Vercel

部署时上传本目录全部内容，入口为 `index.html`。部署完成后，到 Supabase Dashboard → Authentication → URL Configuration，把正式网址加入：

- Site URL
- Redirect URLs

## 团队账号

当前创作者账号：

- 登录用户名：`创作者`
- 账号资料姓名：`elfredariffon`
- 密码不保存在本文件或源码中

原邮箱认证身份已替换为系统内部认证邮箱。以后创作者使用“创作者 + 密码”登录。

新增组员：

1. 只有“创作者”可以创建账号。进入“账号与权限” → “新建账号”，填写姓名、自定义用户名、初始密码和角色。组员直接在登录页输入用户名和密码，不需要真实邮箱

系统由已部署的 Supabase Edge Function `admin-users` 在服务端创建内部认证账号。Service Role Key 只存在于 Edge Function 环境变量中，不会进入前端。

**姓名必须与导入表里的「负责人」完全一致**，否则该组员看不到对应产品，导入校验也会拦截该负责人。例如负责人列是“王丹”，账号姓名也必须是“王丹”。

创作者可以重置所有账号密码；主管只能重置组员密码。创作者还可以修改用户名、归档账号。

角色权限：

- 创作者：修改所有人、创建账号、改用户名、重置密码、归档账号
- 主管：只能维护组员姓名、在职/离职状态和密码
- 组员：只读自己的账号信息；可查看全团队运营数据并协助处理其他负责人的商品，但不能管理账号或任务分配

## 导入模板

网页的“导入中心 → 下载标准模板”会生成：

`总Listing数据_导入模板.xlsx`

支持 36 列标准字段。至少需要：

`ASIN / MSKU / 店铺 / 负责人 / 销量 / 销售额 / 退款量 / FBA-可售数量 / 广告花费 / 广告订单量 / 展示 / 点击 / 状态`

其余字段可留空，系统会按公式自动计算。

## 重要安全提醒

- 通过网页创建的账号默认在职，由创作者填写姓名和角色
- Supabase 自助注册的新账号默认停用，不能直接读取数据
- 注册时传入的 name 元数据不会被信任，姓名只从邮箱 @ 前面的登录名生成
- 所有在职成员可读取全团队产品、处理记录、周统计和任务分配
- 处理记录中的操作人仍是实际提交人，指标快照中的 `owner` 保留商品负责人，用于任务完成归属
- 创作者可查看全团队和管理所有账号，主管可查看全团队并维护组员
- 主管、组员不能创建账号；账号归档只有创作者可以操作
- RLS 已开启，普通组员无法伪造 `user_name` 写处理记录
- 处理动作会记录操作人和当时的指标快照，避免换周后丢失上下文
- Publishable Key 可以公开；Service Role Key 绝对不要出现在网页源码中
- 当前项目仍开着 Supabase 公开注册开关。新注册账号默认停用，不会直接看到数据；仍建议在 Authentication → Providers → Email 中关闭 Allow new users to sign up

## 文件结构

```text
yunying-portal/
├─ index.html
├─ assets/
│  ├─ app.js
│  ├─ config.js
│  └─ styles.css
├─ vendor/
│  ├─ supabase.js
│  └─ xlsx.full.min.js
├─ supabase/functions/admin-users/index.ts
├─ supabase/
│  └─ migrations/
│     ├─ 001_team_workflow.sql
│     ├─ 002_harden_public_signup.sql
│     ├─ 003_seed_thresholds.sql
│     ├─ 004_weekly_task_assignments.sql
│     ├─ 005_creator_permissions.sql
│     ├─ 006_split_slow_task_boards.sql
│     └─ 007_team_shared_data.sql
├─ README.md
├─ CHANGELOG.md
└─ PROJECT_STATE.md
```