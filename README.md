# 云南省企业就业失业数据采集系统 Demo（MVP）

本仓库实现了一个“可运行、可演示、可连接数据库”的最小可用系统，覆盖：登录、企业备案、企业月报、市级审核、省级审核与上报、通知发布与浏览、基础查询筛选。

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

> 说明：
> - `db:push` 会自动建表（基于 Prisma Schema）。
> - SQLite 数据文件会自动生成在 `prisma/dev.db`。

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

## 5. 演示路径（推荐）

### 路径A：完整通过流程

1. 企业登录（`ent_qj_1`）维护备案并提交。
2. 省级登录（`province_admin`）在“企业备案审核”通过该企业。
3. 企业提交月报（调查期如 `2026-03`）。
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

## 8. 最小页面

- 登录页：`/`
- 统一仪表盘：`/dashboard`
  - 按角色展示企业填报、市级审核、省级审核与上报、通知模块

## 9. 前后端结构说明

- 这是一个 **Node.js 单体项目**（不是前后端分离仓库）。
- 后端：`Express + Prisma`（API、鉴权、业务流程都在 `src/server.js`）。
- 前端：`EJS` 服务端渲染模板（`src/views/*.ejs`）+ 浏览器端脚本（`src/public` 静态资源由 `/static` 提供）。
- 结论：技术栈整体是 Node.js 生态，但前端不是 React/Vue 这类独立 SPA 项目。

## 10. 技术选型表（与当前仓库实现一致）

| 资源类型 | 选型方案 | 用途 |
| :--- | :--- | :--- |
| 操作系统 | Linux / macOS / Windows（Node.js 18+） | 应用运行环境 |
| 数据库系统 | SQLite（Prisma，默认 `prisma/dev.db`） | 业务数据存储 |
| 缓存系统 | 未使用独立缓存中间件 | 暂无（按需可扩展） |
| 消息队列 | 未使用消息队列 | 暂无（当前流程为同步处理） |
| 前端框架 | EJS 模板引擎 + 原生 JavaScript | 页面渲染与交互 |
| 后端框架 | Node.js + Express 4 + Prisma ORM | API、鉴权与业务逻辑 |
| 接口文档 | README 中维护接口清单（未集成 Swagger/OpenAPI） | 接口说明 |
| 版本控制 | Git + GitHub | 源代码管理与协作 |
| 项目管理 | GitHub Issues / Projects（仓库侧管理） | 任务跟踪 |
| 持续集成 | 未配置 CI 工作流（`.github/workflows` 为空） | 暂无自动化流水线 |
