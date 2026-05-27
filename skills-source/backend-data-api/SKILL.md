---
name: backend-data-api
description: 面向内部 Web App 的后端 / 数据 / API 架构 Skill。用于把产品需求落成稳定的数据模型、资源导向 API、查询与写入规则、迁移策略、审计字段、AI/导入数据的真相边界与 review 流程。默认适用于小团队、模块化单体、关系型数据库优先的内部工具。
triggers:
  - backend data api
  - 后端架构
  - 数据模型
  - API 设计
  - 表结构设计
  - schema 设计
  - CRUD 设计
  - 内部工具后端
  - OpenAPI
  - migration
  - 幂等
  - 审计字段
  - 数据真相层
---

# Backend / Data / API Skill

## 1. Skill 使命

本 Skill 负责把 Web App 业务需求翻译成**可维护的数据结构、API 契约、写入规则与演进策略**。

目标：数据结构清楚、API 行为可预测、写入/更新/删除/导入/审核有统一约束、后续新增页面能扩展而非推倒重来、AI/导入/手工编辑有明确的 truth boundary。

默认适用：小团队 / 内部工具 / 企业统一登录已存在 / 模块化单体 / 关系型数据库优先。

---

## 2. 边界

### 本 Skill 负责
领域对象与表结构、关联关系与审计字段、真相层级（raw / extracted / review / canonical / derived）、资源导向 API、请求/响应/错误结构、列表查询协议、幂等/并发/状态机、migration / backfill / expand-contract。

### `web-app-architect` 负责
应用拓扑与模块边界、路由树与页面模式、渲染/数据获取策略、状态边界、目录结构与代码边界、ADR 与演进路线。

### 交接规则
- 本 Skill 默认把 `web-app-architect` 的**模块地图、页面模式、权限边界、聚合 view model 需求**当作输入
- 可对数据/API 设计提出反推意见，但**不静默改写整体拓扑**
- 若模块划分导致 schema 或 API 必然扭曲，应明确回抛

### 不负责
UI 视觉设计、交互稿与页面布局、高层应用拓扑与渲染策略、复杂分布式系统/微服务拆分、高并发专项调优、底层云基础设施、公网级攻防安全、产品分析埋点体系。

---

## 3. 核心原则

| # | 原则 | 要点 |
|---|------|------|
| P1 | 关系型数据库优先 | 内部工具默认 Postgres；JSON 仅用于原始 payload、外部半结构化数据、未稳定扩展字段、调试快照。不把关键业务字段长期埋在 JSON 里 |
| P2 | 资源导向 API | 优先 `GET/POST/PATCH /projects`；动作型端点（`:submit`、`:approve`、`:retry`）仅在真正是"命令"时使用，必须语义清晰、只做一事、有明确前置/结果状态 |
| P3 | 先定义契约，再写实现 | 先定资源对象、字段含义、nullable 规则、列表参数、错误结构、写接口行为、状态流转；能用 OpenAPI 表达的尽量先表达 |
| P4 | 系统里必须有真相层级 | raw → parsed/extracted → review → canonical → derived；禁止把"AI 猜测结果"直接当 canonical |
| P5 | 写操作默认要求幂等思维 | 考虑用户连点、页面重试、网络抖动、job 重跑、webhook 重试；创建/提交/导入/批量处理默认考虑幂等键或去重规则 |
| P6 | 变更优先演进，不直接暴力替换 | schema migration、expand and contract、旧字段兼容过渡、分阶段切换读写路径、清理前验证无引用 |
| P7 | 聚合 view model 可存在，但不能替代 canonical resources | view model 服务页面读取、可组合多个 canonical resource，不因为页面方便就丢失底层资源语义；单一 Web 客户端下保留在 modular monolith 内部，不拆 BFF |
| P8 | 认证和授权分开考虑 | 明确 authentication（用户是谁）与 authorization（能看什么/改什么/approve 什么/publish 什么）；不因"已飞书登录"就跳过产品内权限边界 |

---

## 4. 输出目标

理想输出包含：

1. 输入前提（引用 `web-app-architect` 约束）
2. 领域对象清单
3. 数据表设计与字段说明
4. 关联关系
5. 状态机 / 状态流转
6. API 端点草案、请求/响应结构
7. 错误模型与查询参数规范
8. 审计与日志字段
9. 导入 / AI / review / publish 的数据路径
10. migration 与演进建议
11. 反模式与风险提示

---

## 5. 判断顺序

执行前按以下顺序自洽：

| Step | 问题 | 关键动作 |
|------|------|----------|
| A | `web-app-architect` 输入是否完整 | 确认模块地图、页面模式、view model 需求、权限边界、导入/AI/review/publish 流程；缺失则补最小假设并标注 |
| B | 业务对象是什么 | 识别真正长期存在的对象（project、company、todo、import_batch、review_item 等），不把页面名当数据模型名 |
| C | 对象间关系 | 一对一 / 一对多 / 多对多 / 版本 / 当前有效 vs 历史记录；不把一对多硬塞成 JSON，不用字符串弱引用 |
| D | 哪部分是 canonical truth | 字段正式值来源、AI 生成的是建议还是正式结果、人工修改是否覆盖系统同步、外部同步是否回写已人工确认数据 |
| E | 列表型核心页面 | 默认排序、筛选、全文搜索、分页、批量操作、统计摘要 |
| F | 写操作语义 | create vs upsert、patch vs 命令、同步 vs 异步、失败后是否可重试、是否记录操作人和原因 |

---

## 6. 必须主动报警的反模式

看到以下情况时主动提醒：

1. **把页面结构当数据结构**（"驾驶舱表""主页数据表"）
2. **把 AI 输出直接写进正式层**（无 review、无版本、无来源）
3. **所有扩展都塞 JSON**（短期快，长期必乱）
4. **列表接口各写各的查询规则**（分页参数名/筛选格式/排序语法不统一）
5. **状态自由跳转**（无状态机与前置条件）
6. **更新接口自由覆盖整个对象**（误改系统字段、审计字段、只读字段）
7. **schema breaking change 一步到位**（无兼容期、无 backfill、无验证）
8. **没有 source-of-truth 说明**（没人知道哪个字段算正式）
9. **聚合 view model 反客为主**（聚合结果当成底层真相对象，写入追溯混乱）
10. **把认证当成授权**（只校验登录，不校验编辑/approve/publish 资格）

详细说明与示例见 `./reference/pitfalls-and-examples.md`。

---

## 7. 默认立场

- 优先 Postgres / 关系型模型
- 优先模块化单体，不为"专业感"硬拆微服务
- 优先资源导向 API、统一列表查询协议、白名单更新、显式审计字段
- 优先 migration 演进，不直接暴力改表
- AI / 导入结果默认先进入 raw / extracted / review，不直接 canonical
- 页面聚合读取可存在，但不替代 canonical resources
- 只有明确需要时，才做复杂异步编排与事件驱动

---

## 8. 一句话工作方式

> 先继承 `web-app-architect` 给出的模块与页面约束，再定义对象、关系、真相层与状态流，随后细化 API 契约与写入规则；任何会影响长期可维护性的结构问题，都优先于"先把页面跑起来"。

---

## 外置参考

| 文件 | 使用时机 | 分级 |
|------|----------|------|
| `./reference/data-api-checks.md` | 数据建模、API 设计、错误模型、并发/幂等、真相层级、状态流、migration | Always read |
| `./reference/contract-template.md` | 输出最终 architecture-spec 时 | Template-only |
| `./reference/pitfalls-and-examples.md` | 输出前自检 + 发现异常时 | Conditional read |
