# 运营三部 · 内部运营中台（网页版）

这是基于原 `运营中台原型.html` 改造的团队网页版最小可用版本。前端使用原生 HTML/CSS/JavaScript，数据、登录和处理记录存储在 Supabase。

当前线上版本：`v=42`
正式网址：`https://leifarun.github.io/yunying-portal/`
数据库迁移：`001`–`009`、`011`、`012` 已应用；`010` 待执行

## 当前发布摘要

- 左侧优化板块改为纯文字折叠导航，移除板块编号和装饰图标
- 侧栏采用深色高对比配色，当前板块使用蓝色背景，层级依靠缩进和分组底色表达
- 滞销品导航调整为 `中低潜力 → 低潜力 / 中潜力` 与 `高潜力`
- 每周处理进度新增“中低潜力”任务，低潜力或中潜力商品被处理时合并计数
- 处理记录批量导入模板新增“中低潜力”优化板块
- 处理记录表头改为“优化板块”，批量导入模板新增优化板块下拉列并强制校验
- 总数据看板改为周批次汇总视图，按“人 × 周”存储指标快照，不保存逐 ASIN 看板汇总
- 总数据看板新增“所有人 / 成员”筛选、团队指标对比表、四组指标趋势和点击放大历史趋势
- 看板设计参考领星排行榜：连续白色面板、浅灰表头、细分隔线、数字右对齐
- 总 Listing 导入模板从 31 列扩展为 34 列，新增订单量、FBA不可售数量、订单毛利润额
- 新增订单毛利率、平均单个利润、FBA不可售款数等派生指标
- 团队指标对比支持默认销量降序、表头排序、列配置和自定义模板

- 处理记录按 ASIN、MSKU、FNSKU、店铺四列展示商品信息，并将处理动作拆分为“处理类型”和“具体动作”
- 处理记录页支持批量导入，模板固定为 ASIN、MSKU、FNSKU、店铺、优化板块、处理类型、具体动作七列，优化板块和处理类型均提供下拉选择
- 总 Listing 导入模板保留派生指标自动计算，退款率、CTR、ROAS、ACOS、ACoAS 等无需手工填写
- 每周任务完成数按提交处理时选择的优化板块计数，不再按商品全部问题标签重复计数
- 主管和创作者可按具体动作逐条清理处理记录，并同步刷新任务完成进度
- 商品处理概览扩展为 12 项指标，新增价格和评分，并按 6 列 × 2 行展示
- 数据表支持表头吸顶、底部固定横向滑块和升序/降序排序
- 商品表列宽按表头文字与排序控件自适应，全部表头、文字和数字指标统一居中
- 阈值与公式页的锁定项、只读项可正常显示阈值或“—”
- 创作者可在“账号与权限”中自定义网站名称，更新浏览器标签和品牌显示
- 启动页缓存自定义名称，刷新时不会先显示旧的固定名称
- 处理记录以时间线进度卡片显示指标改善/变差，指标周期快照仅来自实际处理记录
- 每周导入不生成处理动作快照；看板周汇总单独保存，未处理过的商品仍没有处理周期指标

## 已实现

- Supabase 用户名 + 密码登录，角色区分创作者、主管、组员
- 总数据看板：所有人/成员筛选、团队对比表、四组指标、周趋势图、点击放大历史数据；数据按人 × 周保存汇总快照
- 总 Listing、8 个优化板块及滞销潜力分组
- 左侧优化板块支持三级折叠导航，一级板块默认折叠，单级板块不显示折叠按钮
- 滞销品优化按中低潜力、低潜力、中潜力、高潜力分组展示，中低潜力显示合并数量
- 每周任务新增中低潜力分配列，低潜力或中潜力任一处理动作均计入，同一商品只算 1 个
- 原型式筛选栏：ASIN/MSKU/FNSKU 精确或模糊搜索、批量搜索、国家/店铺/负责人、问题定位、滞销类型、库龄、退款等级、库存与在售标签、列配置、分页、CSV 导出
- 8 个优化板块列顺序与原型一致：ASIN、MSKU、FNSKU 开头，前三列冻结、右侧操作列冻结
- 所有数据表支持滚动时表头吸顶，底部横向滑块固定在浏览器窗口底部
- 商品指标表头支持升序/降序排序，筛选、分页和其他板块共用同一套排序逻辑
- 商品表列宽按表头文字和排序控件自适应，长指标名完整可读
- “阈值与公式”页：26 项指标可直接修改，保存后当前批次立即重新计算，历史周快照保持不变
- 单一“处理”入口：当前判定链路、历史处理记录、处理当时 → 当前指标变化、处理类型与具体动作填写
- 处理类型用于归类，具体动作用于记录实际执行内容；处理状态统一为“已处理”，不再设置待复核、已完成、已关闭
- 处理记录保留操作人和处理时的完整指标快照，并按 ASIN、MSKU、FNSKU、店铺、优化板块、处理类型、具体动作分列展示
- 组员可下载处理记录模板并批量导入；系统优先按“店铺 + MSKU”匹配当前商品，并用 ASIN、FNSKU 校验后写入完整指标快照
- 处理指标周期快照只在商品实际处理时生成，可对比相邻两次处理的指标变化
- 处理历史对比和“处理指标周期快照”同步加入价格、评分，指标顺序与商品处理概览保持一致
- 主管和创作者可在处理记录中逐条清理记录；创作者仍可清理全部历史记录，删除后周任务进度立即重新计算
- 处理记录永久保留，不随每周产品数据导入而删除
- 每周任务分配：主管按组员、按板块设置目标数量，低潜力、中潜力、高潜力分别独立，完成进度按处理商品数统计
- 团队协作：所有在职成员可查看全团队数据，并可协助处理其他人的商品；完成数计入商品负责人
- 任务分配和完成进度表格共用固定列宽，表头、输入框和进度单元格对齐
- 阈值锁定项和只读项可正常显示阈值或“—”，阈值页不会因显示函数缺失而报错
- 任务完成数按提交处理时选择的优化板块计数；同一板块重复动作只计 1 个商品
- 导航数量使用完整千分位显示，不缩写为“万”
- 页面字体统一为 Arial，商品编码使用清晰的等宽字体
- 主管导入中心：34 列原始数据模板、派生指标自动计算、XLSX/CSV 校验、分批写入、临时批次、原子切换
- 账号权限页：创作者管理全部账号，主管只能维护组员，状态使用在职/离职
- 演示模式：`?demo=1`，只用于预览界面，不读写数据库

## 新部门独立部署

如需复制给其他部门，请使用独立 GitHub 仓库和独立 Supabase 项目。完整步骤见：

[`DEPLOY_NEW_DEPARTMENT.md`](./DEPLOY_NEW_DEPARTMENT.md)

手册包含建库、8 个迁移、首位创作者初始化、Edge Function、Auth 地址、GitHub Pages、验收清单和常见问题。

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

`supabase/migrations/008_app_settings.sql`

`supabase/migrations/009_clear_action_history.sql`

`supabase/migrations/010_clear_action_history_safe_delete.sql`

`supabase/migrations/011_weekly_metric_snapshots.sql`

`supabase/migrations/012_order_count_snapshot.sql`

`001`–`009`、`011`、`012` 已应用到当前项目；`010_clear_action_history_safe_delete.sql` 仍需在 SQL Editor 执行。后续重建时请按文件名顺序执行。

迁移已经应用到当前项目，并验证了：

- `weekly_issue_stats` 表存在
- `activate_import_batch` 事务函数存在
- 产品表新增 14 个字段存在
- 周统计表已开启 RLS
- 全团队产品、处理记录、周统计和周任务共 4 条读取策略已确认为 `is_active_user()`
- `weekly_metric_snapshots` 表存在，当前批次已回填人员周汇总
- `products.fba_unavail`、`products.order_gross_profit`、`products.order_qty` 字段存在
- `weekly_metric_snapshots.order_count` 字段存在，当前批次汇总已重建

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
- 网站名称：仅创作者可修改；主管和组员只能查看应用后的名称

## 处理记录批量导入

“处理记录”页右上角提供：

- `导入记录`：上传已填写的处理记录文件，先校验、预览，再确认写入
- `导入模板`：下载 `处理记录_批量导入模板.xlsx`

模板固定七列：

`ASIN / MSKU / FNSKU / 店铺 / 优化板块 / 处理类型 / 具体动作`

填写规则：

1. 一行一条处理记录，同一商品允许导入多条不同类型或不同动作的记录
2. 系统优先按“店铺 + MSKU”匹配当前批次商品
3. 匹配后继续校验 ASIN、FNSKU 和店铺，任何一项不一致都会阻止确认导入
4. “优化板块”必须从下拉列表选择，系统按该板块写入处理记录并统计任务完成进度
5. “中低潜力”可用于导入低潜力或中潜力处理记录，周任务中的中低潜力列会合并统计
6. 操作人自动记录为当前登录账号，处理时间按提交时间写入
7. 导入时会自动保存当前商品指标快照

## 导入模板

网页的“导入中心 → 下载标准模板”会生成：

`总Listing数据_导入模板.xlsx`

支持 34 列标准字段。模板不再要求填写派生指标，新增原始字段：

`净销售额 / 广告销售额 / 订单量 / FBA不可售数量 / 订单毛利润额`

系统会自动计算：

- 退款率 = 退款量 ÷ 销量
- 广告订单占比 = 广告订单量 ÷ 销量
- CTR = 点击 ÷ 展示
- 广告CVR = 广告订单量 ÷ 点击
- ROAS = 广告销售额 ÷ 广告花费
- ACOS = 广告花费 ÷ 广告销售额
- ACoAS = 广告花费 ÷ 净销售额

其余非关键字段可留空。

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
│  ├─ styles.css
│  ├─ summary-dashboard.js
│  └─ summary-dashboard.css
├─ vendor/
│  ├─ supabase.js
│  ├─ xlsx.full.min.js
│  └─ exceljs.min.js
├─ supabase/functions/admin-users/index.ts
├─ supabase/
│  └─ migrations/
│     ├─ 001_team_workflow.sql
│     ├─ 002_harden_public_signup.sql
│     ├─ 003_seed_thresholds.sql
│     ├─ 004_weekly_task_assignments.sql
│     ├─ 005_creator_permissions.sql
│     ├─ 006_split_slow_task_boards.sql
│     ├─ 007_team_shared_data.sql
│     ├─ 008_app_settings.sql
│     ├─ 009_clear_action_history.sql
│     ├─ 010_clear_action_history_safe_delete.sql
│     ├─ 011_weekly_metric_snapshots.sql
│     └─ 012_order_count_snapshot.sql
├─ DEPLOY_NEW_DEPARTMENT.md
├─ README.md
├─ CHANGELOG.md
└─ PROJECT_STATE.md
```
