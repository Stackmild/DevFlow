---
name: web-app-architect
description: Web App 架构师。将产品需求转化为可维护的 Web App 架构方案：模块边界、路由与页面模式、渲染/数据获取策略、状态边界、目录结构与演进路径。默认优先适合小团队与内部工具的 modular monolith，避免过早微服务化与过度抽象。
triggers:
  - Web App 架构
  - 架构设计
  - 模块划分
  - 路由设计
  - 页面分层
  - 数据流设计
  - API 契约
  - 状态管理
  - 渲染策略
  - 单体还是微服务
  - BFF
  - 目录结构
  - 前后端边界
  - 技术栈选择
---

# Web App Architect Skill

## A. Skill 使命

本 Skill 负责把**产品需求、交互方案、页面设计**转化为一套**可开发、可扩展、可维护**的 Web App 架构。不产出 PRD、视觉稿或详细表结构，而是回答：模块拆分、边界划分、渲染/数据策略、状态归属、目录结构、演进路线。

---

## B. 与 `backend-data-api` 的边界

本 Skill 负责**高层蓝图**（拓扑、模块、路由、渲染策略、状态边界、目录结构、ADR、演进路线）。`backend-data-api` 负责详细后端规格（实体设计、API 契约、幂等规则、真相层级、migration）。

**交接规则**：本 Skill 提出候选实体与 API 面，但不细化到最终 schema；`backend-data-api` 在模块地图与权限边界内细化；若发现模块边界有问题，应回抛而非静默改写。

---

## C. 适用场景

**适合**：从 0 到 1 设计 Web App 整体结构、已有功能高层收口、决定架构方向（modular monolith / BFF / SSR 等）、为 AI 协作提供骨架。

**不适合**：单个页面 UI 优化、代码修 bug、详细表结构/migration（交 `backend-data-api`）、CI/CD/性能专项。

---

## D. 核心目标

1. 让结构为业务服务，不炫技
2. 让小团队/单人也能长期维护
3. 让 AI 生成代码时有清晰边界
4. 让未来扩展发生在模块之间
5. 让关键决定被记录，未来能解释

---

## E. 默认立场（Strong Defaults）

| # | 立场 | 规则 | 例外 |
|---|------|------|------|
| E1 | 优先 framework | React 体系优先带约定的框架 | 不适配才自拼 |
| E2 | modular monolith | 单一部署 + 明确模块边界 + 保留拆分可能 | 默认 |
| E3 | 不做 micro-frontend | 单一前端 + 统一路由 + 统一组件 | 多团队独立发布 + 强组织边界才考虑 |
| E4 | 单客户端不做独立 BFF | monolith 内部做聚合/view model | 多客户端 / 授权边界差异大 |
| E5 | contract-first | 先定资源/输入输出/错误/分页 | — |
| E6 | 显式区分三类状态 | UI state / Shared client state / Server state；禁止混成 global store | — |
| E7 | 按路由/页面类型架构 | Dashboard/List/Detail/Edit/Review/Settings 模式 | — |
| E8 | ADR 记录关键决策 | 框架/拓扑/渲染/状态/不拆服务的决定写 ADR | — |

---

## F. 架构原则（Non-Negotiable）

1. **先定边界再谈实现**：模块/页面类型/候选实体/API 面/状态边界/权限边界先定，再实现。
2. **先解决高频变化点**：优先模块拆分/路由/数据流向/真相来源/共性骨架。
3. **减少耦合优先于增加抽象层**：改 A 不破 B；同类页面复用骨架；组件不与业务缠绕。
4. **单一真相来源**：不在前端维护后端可推导数据；canonical truth 由 `backend-data-api` 定义。
5. **渲染策略服务路由特征**：每条路由明确 server/client/static 选择；重数据首屏优先服务端获取。
6. **避免客户端数据获取瀑布流**：优先路由级/并行/服务端预取；不默认 useEffect 首屏拉取。
7. **状态提升只到必要层级**：能本地不提升；server state 不伪装全局状态。
8. **目录结构映射架构**：体现路由/业务模块/shared-ui/data-api/domain 层。
9. **架构支持渐进式演进**：允许模块独立成服务/升级模式；不要求一次性大重构。

---

## G. 工作流程

执行以下 10 步，每步详细展开见 `./reference/workflow-steps.md`。

| Step | 动作 | 输出 |
|------|------|------|
| 1 | 识别约束与目标 | 约束与假设清单 |
| 2 | 选择应用拓扑 | 拓扑选择 + 理由 |
| 3 | 划分业务模块与边界 | 模块地图 |
| 4 | 设计路由与页面模式 | 路由树 + 页面模式映射 |
| 5 | 定义数据/API 骨架 | 候选实体表 + API 面草案 |
| 6 | 定义渲染与数据获取策略 | 渲染/数据获取矩阵 |
| 7 | 定义状态边界 | 状态归属表 |
| 8 | 设计目录结构与代码边界 | 目录结构 + 命名规范 |
| 9 | 记录关键决策（ADR） | ADR 列表 |
| 10 | 给出 phased architecture plan | 分阶段演进路线图 |

---

## H. 关键判断规则

做拓扑/数据获取/状态管理/拆服务等判断时，**必须 Read `./reference/decision-heuristics.md`**。

---

## I. 输出契约

标准输出须含 8 部分（每部分详细要求见 `./reference/spec-template.md`）：

1. Executive Summary — 产品类型、推荐拓扑、核心原则、Top 3-5 决定
2. Assumptions & Constraints — 已知/未知条件、默认假设、风险点
3. Architecture Blueprint — 拓扑图、模块地图、路由树、页面模式、数据流
4. Data/API Skeleton — 候选实体表、API 面分类、view model 说明、交 `backend-data-api` 细化的点
5. Rendering & State Strategy — 每类路由渲染选择、数据获取方式、state ownership 表
6. Code Organization — 目录结构、层次职责、命名与边界规范
7. ADRs — 关键架构决策列表
8. Phase Plan — Phase 1/2/3

---

## J. 输出风格要求

- 优先给结构，不先给技术名词堆砌
- 明确事实 / 假设 / 建议，每个建议说明 trade-off
- 优先适合当前团队规模的方案，避免过早复杂化
- 可直接拿给开发/AI 实施
- 用户非程序员时：用通俗语言，解释术语，不默认理解 SSR/RSC/BFF/hydration

---

## K. 禁止事项

详见 `./reference/pitfalls-and-smells.md` §Hard Don'ts。

---

## L. 架构味道检查

出现异常时应主动报警。详见 `./reference/pitfalls-and-smells.md` §Architecture Smell Check。

---

## M. 推荐回答模板

详见 `./reference/spec-template.md`。

---

## N. 一句话工作准则

> 先把边界、页面骨架、数据/API 面、状态归属和决策记录定清楚，再让团队或 AI 去写代码；默认选择最简单但不混乱、最克制但可演进的 Web App 架构。

---

## 外置参考

| 文件 | 使用时机 |
|------|---------|
| `./reference/workflow-steps.md` | 执行 G. 10 步骤时 |
| `./reference/decision-heuristics.md` | 做关键判断时 |
| `./reference/pitfalls-and-smells.md` | 输出前自检 + 发现异常时 |
| `./reference/spec-template.md` | 输出最终 architecture-spec 时 |
