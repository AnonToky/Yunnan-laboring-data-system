# 云南省企业就业失业数据采集系统 Demo（MVP）

本仓库实现了一个“可运行、可演示、可连接数据库”的最小可用系统，覆盖：登录、企业备案、企业月报、市级审核、省级审核与上报、通知发布与浏览、基础查询筛选。

## 0. 近期主要更改

- 计划变更二（2026-04-10）：
  - 新增手机端关键流程可操作性改造（企业上报、市级审核、省级审核）。
  - 采用最小可运行方式，仅前端响应式与操作路径优化，不改后端接口。
  - 项目计划周期由“2个月”调整为“2个月+2周”。

- 登录会话改为数据库持久化：
  - 使用 `express-session + @quixo3/prisma-session-store`。
  - Prisma 新增 `Session` 表，登录态可跨服务重启保留（直到过期或主动退出）。
- 注册流程从“最小账号”升级为“常见注册字段”：
  - 企业注册支持 `确认密码`、`组织机构代码`、`联系人`、`联系电话`、`联系地址`。
  - 注册时校验用户名唯一、密码长度、两次密码一致。
  - 注册成功后自动创建 `User + Enterprise` 并登录。
- 增加省级管理员账号管理能力：
  - 新增 `GET /api/admin/users`（查看账号列表，仅省级）。
  - 新增 `POST /api/admin/users`（创建市级/省级账号，仅省级）。
  - 管理员创建账号同样使用 bcrypt 加密密码并落库。
- 页面交互同步更新：
  - 登录页支持更完整的注册字段输入。
  - 省级仪表盘新增“账号管理（创建市级/省级）”面板。

## 1. 环境要求

- Node.js 18+
- 无需安装 MySQL（默认使用 SQLite 本地文件库）

## 2. 数据库准备

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 默认无需修改 `.env`（已配置 SQLite）：

```env
DATABASE_URL="file:./prisma/dev.db"
```

> 如需改为其他数据库（例如 MySQL），可修改 `prisma/schema.prisma` 的 `provider` 与 `.env` 中 `DATABASE_URL`。

## 3. 启动步骤

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

服务默认启动在：`http://localhost:3000`

### 一键启动（Windows）

- 双击项目根目录下 `start-dev.bat`
- 或命令行执行：

```bash
npm run dev:oneclick
```

一键脚本会自动完成：
- 检查并创建 `.env`
- 首次安装依赖（若 `node_modules` 不存在）
- `prisma:generate`
- `db:push`
- 首次创建数据库时自动 `db:seed`（已有数据库会跳过，避免覆盖数据）
- 启动 `npm run dev`

> 说明：
> - `db:push` 会自动建表（基于 Prisma Schema）。
> - SQLite 数据文件会自动生成在 `prisma/dev.db`。
> - 登录页支持企业账号注册，注册会直接写入数据库。

## 4. 默认账号（密码统一为 `123456`）

- 省级：
  - `province_admin`
- 市级（2个地市）：
  - `city_km`（昆明，530100）
  - `city_qj`（曲靖，530300）
- 企业（3个）：
  - `ent_km_1`（昆明企业1）
  - `ent_km_2`（昆明企业2）
  - `ent_qj_1`（曲靖企业1）

## 4.1 注册说明

- 目前只开放企业账号自助注册。
- 注册时会同时创建 `User` 和一条基础 `Enterprise` 记录，方便后续直接进入备案维护流程。
- 市级、省级账号仍然建议由管理员或种子数据统一管理。

## 5. 演示路径（推荐）

### 路径A：完整通过流程

1. 企业登录（`ent_qj_1`）维护备案并提交。
2. 省级登录（`province_admin`）在“企业备案审核”通过该企业。
3. 企业提交月报（调查期如 `2026-03`）。
  - 2026 年规则：1-3 月使用半月报（如 `2026-03-H1`），4-12 月使用整月报（如 `2026-04`）。
4. 市级登录（`city_qj`）审核通过。
5. 省级登录（`province_admin`）终审通过。
6. 省级执行“模拟上报部委”（状态变为 `reported`）。

### 路径B：退回后重提

1. 企业提交月报。
2. 市级或省级执行“退回”并填写原因。
3. 企业修改后重新提交。
4. 再次审核通过。

## 6. 主要功能与接口说明

统一返回结构：

```json
{ "code": 0, "message": "success", "data": {} }
```

- 登录/登出：`/api/auth/login`, `/api/auth/logout`
- 注册（企业）：`POST /api/auth/register`
- 省级账号管理：
  - 查询账号：`GET /api/admin/users`（仅省级）
  - 创建市级/省级账号：`POST /api/admin/users`（仅省级）
- 企业备案：
  - 查询：`GET /api/enterprise/profile`
  - 保存草稿：`POST /api/enterprise/profile/save`
  - 提交：`POST /api/enterprise/profile/submit`
  - 省级审核：`POST /api/province/filings/:id/review`
- 月报：
  - 企业保存：`POST /api/enterprise/reports/save`
  - 企业提交：`POST /api/enterprise/reports/submit`
  - 市级待审：`GET /api/city/reports`
  - 市级审核：`POST /api/city/reports/:id/review`
  - 省级终审：`POST /api/province/reports/:id/review`
  - 省级上报：`POST /api/province/reports/:id/report`
- 通知：
  - 发布：`POST /api/notices`（省级/市级）
  - 浏览：`GET /api/notices`（按角色可见）
- 审核日志：`GET /api/audit-logs/:reportId`

## 7. 关键业务规则（已实现）

- 角色权限：enterprise / city / province
- 备案状态：`draft / pending_province / approved / rejected`
- 同一企业 + 同一调查期唯一报告
- 报告校验：当 `currentEmployees < initialEmployees` 时，`decreaseType`、`mainReason`、`mainReasonDesc` 必填
- 市级、省级退回必须填写原因
- 审核与上报操作写入 `ReportAuditLog`
- 密码使用 bcrypt 加密存储
- 企业备案保存、月报保存、审核、通知发布都会持久化到数据库。
- 登录态通过 `express-session + PrismaSessionStore` 持久化在数据库 `Session` 表中（服务重启后会话可继续生效，直到过期或登出）。
- 企业注册支持更常见的字段补全（确认密码、组织机构代码、联系人、电话、地址），仍可后续在备案模块继续完善。

## 8. 最小页面

- 登录页：`/`
- 统一仪表盘：`/dashboard`
  - 按角色展示企业填报、市级审核、省级审核与上报、通知模块

## 9. 前后端结构说明

- 这是一个 **Node.js 单体项目**（不是前后端分离仓库）。
- 后端：`Express + Prisma`（API、鉴权、业务流程都在 `src/server.js`）。
- 前端：`EJS` 服务端渲染模板（`src/views/*.ejs`）+ 浏览器端脚本（`src/public` 静态资源由 `/static` 提供）。
- 结论：技术栈整体是 Node.js 生态，但前端不是 React/Vue 这类独立 SPA 项目。
