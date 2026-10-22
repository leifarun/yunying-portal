# 运营三部内部运营中台 · 项目交接状态

最后更新：2026-10-22

当前线上版本：`v=21`  
状态：已发布，GitHub Pages 构建成功  
最近发布：处理记录商品字段拆分、表头吸顶/排序/自适应列宽、阈值页修复  
数据库迁移：`001`–`008` 均已应用并验证

## 一、如果这是新的 Codex 对话

先阅读本文件，再检查代码。不要根据旧聊天猜测，以本文件和当前代码为准。

核心信息：

- 前端源码：`C:\Users\lenovo\Documents\Codex\2026-10-21\n-h\outputs\yunying-portal`
- GitHub 仓库：`https://github.com/leifarun/yunying-portal`
- 正式网址：`https://leifarun.github.io/yunying-portal/`
- 当前静态资源版本：`v=21`
- Supabase 项目引用：`ofwvjfshnnajnfkxexno`
- Supabase URL：`https://ofwvjfshnnajnfkxexno.supabase.co`
- 前端配置：`assets/config.js`，只允许使用 Publishable Key
- 部署目录应直接包含 `index.html`、`assets`、`vendor`、`supabase`
- 新部门复制部署手册：`DEPLOY_NEW_DEPARTMENT.md`

## 二、业务目标

把原型改造成团队可用的网页版运营中台：

- 组员登录后使用同一套 Supabase 数据
- 主管每周导入 Listing 数据
- 全员可查看团队数据，并协助处理任何负责人的商品，完成数归属商品负责人
- 主管能追踪每周每个人的任务和完成进度
- 处理记录永久保留
- 每周导入只替换产品明细，不删除动作历史

## 三、当前已实现功能

### 数据看板

- 规模与销售、效率与质量、状态与风险三组指标
- FBA 八段库龄饼图
- 各板块款数和货值饼图
- 在售/停售占比
- 国家/站点占比
- 店铺分布可展开全部
- 人效表

### 优化板块

- 展示量差
- 需开广告
- 点击率差
- 转化率差
- 自然流量偏低
- 低潜力滞销
- 中潜力滞销
- 高潜力滞销
- 广告无效花费
- 高退货率
- 低评分优化

产品表列顺序以 ASIN、MSKU、FNSKU 开头，前三列冻结，右侧操作列冻结；纵向滚动后表头自动吸顶，表格底部横向滑块固定在浏览器底部。

所有商品指标表头均支持升序/降序排序，排序在筛选和分页状态下保持。列宽会按表头文字实际宽度和排序控件动态计算，长指标名不会被挤压。

### 处理动作

- 每行只有一个“处理”按钮
- 同一个弹窗展示：当前判定链路、历史处理记录、处理当时到当前的指标变化、本次处理填写
- 处理状态统一为“已处理”
- 不再采集预期结果、跟进日期、待复核、已完成、已关闭
- 新动作保存完整指标快照
- 处理记录表按 ASIN、MSKU、FNSKU、店铺四列展示商品信息

### 每周任务分配

每周处理进度页面支持主管给组员按任务板块分配目标数量。

任务板块：

- 展示量差
- 需开广告
- 点击率差
- 转化率差
- 自然流量偏低
- 低潜力滞销
- 中潜力滞销
- 高潜力滞销
- 广告无效花费
- 高退货率
- 低评分优化

- 任务分配表和完成进度表共用同一套列宽 `colgroup`，表头、输入框、进度格与合计列逐列对齐。
- 当前静态资源缓存版本为 `v=21`，部署后不会继续加载旧的“低/中潜力合并”任务表。

计数规则：

- 同一个商品属于多个任务板块时，处理该商品后各板块分别算完成 1
- 同一个板块内重复提交动作，仍只算 1 个商品
- 完成进度使用当前批次动作快照中的 `issue_keys`，旧快照缺失时用当前产品或动作板块回退
- 任何组员协助处理其他负责人的商品，完成数仍计入商品负责人
- 所有在职成员可查看全团队任务分配和完成进度

### 阈值与公式

网页“阈值与公式”页面共有 26 项配置。

- 主管或创作者可修改
- 保存后当前批次数据立即重新计算
- 历史周统计保持快照不变
- 锁定项为自动推导或固定规则
- 锁定项和只读项通过 `thresholdDisplayValue()` 正常显示阈值或“—”，不会再触发页面初始化错误

### 账号与权限

角色层级：

`创作者 > 主管 > 组员`

权限：

- 创作者：管理所有账号、创建账号、改用户名、重置密码、归档账号，可使用所有数据管理功能
- 主管：只能维护组员的姓名、在职/离职状态和密码；不能修改创作者或其他主管；不能创建账号
- 组员：可查看全团队产品、处理记录和周任务，可协助处理其他负责人的商品；不能管理账号或任务分配

网站名称：

- 仅创作者可在“账号与权限”页修改
- 保存后同步更新浏览器标签、登录页品牌和侧边栏品牌
- 启动页通过 localStorage + Cookie 预先读取缓存名称，刷新时不会先显示旧的固定名称
- 支持“主名称 · 副名称”格式，最多 60 个字符
- 主管和组员只读；全团队共享配置已通过 `008_app_settings.sql` 启用

账号状态使用“在职/离职”。

账号登录：

- 组员不需要真实邮箱
- 主管创建自定义用户名 + 密码
- 后台通过内部邮箱映射到 Supabase Auth
- 内部邮箱对用户不可见
- 当前创作者账号的用户名是 `创作者`
- 密码不保存在本文件或源码中

归档：

- 仅创作者可归档账号
- 归档采用 `active=false + archived_at`
- 历史处理记录保留
- 不能归档当前登录账号

## 四、Supabase 关键对象

### 表

- `profiles`
- `import_batches`
- `products`
- `actions`
- `thresholds`
- `weekly_issue_stats`
- `weekly_task_assignments`

### Edge Function

- `admin-users`

支持：

- `create`
- `reset_password`
- `rename_username`
- `archive_account`

Edge Function 使用服务端 Service Role，只允许创作者/主管按各自权限调用。

### 迁移文件

- `supabase/migrations/001_team_workflow.sql`
- `supabase/migrations/002_harden_public_signup.sql`
- `supabase/migrations/003_seed_thresholds.sql`
- `supabase/migrations/004_weekly_task_assignments.sql`
- `supabase/migrations/005_creator_permissions.sql`
- `supabase/migrations/006_split_slow_task_boards.sql`
- `supabase/migrations/007_team_shared_data.sql`（已应用并验证 4 条团队读取策略）
- `supabase/migrations/008_app_settings.sql`（已应用并验证创作者写入）

## 五、导入与存储策略

导入流程：

1. 主管上传 XLSX/CSV
2. 前端校验表头和负责人
3. 创建临时导入批次
4. 分批写入产品
5. 全部成功后切换当前批次
6. 删除旧产品明细
7. 保留 `actions`、`import_batches` 和周统计

免费版 500MB 下，不建议累计每周全部产品明细，因此只保留当前批次明细。

## 六、部署

GitHub 仓库使用 GitHub Pages：

- Branch：`main`
- Folder：`/ (root)`
- 自定义域名已移除
- 正式网址：`https://leifarun.github.io/yunying-portal/`

Supabase Auth URL 配置：

- Site URL：`https://leifarun.github.io/yunying-portal/`
- Redirect URL：`https://leifarun.github.io/yunying-portal/**`
- 本地开发：`http://localhost:8124/**`

本地预览：

```powershell
cd C:\Users\lenovo\Documents\Codex\2026-10-21\n-h\outputs\yunying-portal
python -m http.server 8124
```

## 七、修改与发布流程

用户提出修改时：

1. 修改本地 `outputs/yunying-portal`
2. 执行 `node --check assets/app.js`
3. 本地打开并验证关键页面
4. 更新 `README.md` 和本交接文件（如功能/架构变化）
5. 如有数据库变化，新增编号迁移，不直接改生产数据
6. 提交并推送到 GitHub `leifarun/yunying-portal`
7. GitHub Pages 自动重新部署，等待约 1–3 分钟
8. 用户刷新正式网址验证

如果当前目录未连接 GitHub，先检查 `git remote -v`，不要重复初始化或覆盖仓库。

## 八、注意事项

- 不把 Service Role Key 写入前端、README、GitHub 或聊天输出
- 不把用户密码写入文件
- 普通前端更新不影响 Supabase 数据
- 数据库结构修改必须先给迁移文件；Free Plan 没有自动备份，生产数据变更需谨慎
- 当前没有自动 Realtime 刷新，多人操作后通过刷新查看最新数据
- GitHub Pages 源码公开，但业务数据受 Supabase Auth + RLS 保护
- 如果用户要求删除账号，优先使用“归档账号”，避免处理记录失去账号归属

## 九、新对话建议开场

用户可直接说：

> 继续运营中台项目，源码在 `C:\Users\lenovo\Documents\Codex\2026-10-21\n-h\outputs\yunying-portal`，先读 `outputs/PROJECT_STATE.md` 和项目 README。现在要改：……

## 十、文档同步规则

- 每次发布必须更新 `outputs/CHANGELOG.md` 和源码目录内的 `CHANGELOG.md`
- 每次发布同步更新本文件的状态、功能、权限、数据库或部署变化
- `README.md` 只在安装、部署、账号使用、权限、功能清单或操作流程变化时更新
- 纯文字、样式微调或内部重构：更新 CHANGELOG 和本文件即可，不必重写 README
- 不创建多份历史副本，历史版本以 GitHub commit 为准
- 数据库结构变化必须新增编号 migration
