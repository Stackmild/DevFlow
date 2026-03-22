# {产品/项目名} Web App 架构方案

> 由 `web-app-architect` skill 生成。此文档定义高层蓝图，后端/数据/API 细化交给 `backend-data-api` skill。

---

## 1. Executive Summary

**产品类型**：SaaS / Dashboard / Workspace / 内部工具 / AI App
**推荐架构拓扑**：Modular Monolith / ...
**核心设计原则**：
**当前最重要的 3–5 个决定**：

1. ...
2. ...
3. ...

---

## 2. Assumptions & Constraints

### 已知条件
- ...

### 未知条件（默认假设）
- ...

### 风险点
- ...

---

## 3. Architecture Blueprint

### 3.1 应用拓扑

```
[前端 SPA / SSR]
       │
[应用层 / BFF（若有）]
       │
[Modular Monolith 后端]
  ├─ Module A
  ├─ Module B
  └─ Module C
       │
[数据库 / 外部服务]
```

### 3.2 模块地图（Module Map）

| 模块 | 职责 | 关键实体（候选） | 依赖模块 |
|------|------|----------------|---------|
| Auth | 认证/会话 | User, Session | - |
| ... | ... | ... | ... |

### 3.3 路由树 + 页面模式映射

| 路由 | 页面模式 | 数据来源 | 渲染策略 |
|------|---------|---------|---------|
| /dashboard | Dashboard | 聚合 view model | Server fetch |
| /list | List | 资源列表 API | Server fetch + client refetch |
| /detail/:id | Detail | 聚合 view model | Server fetch |
| /new | Edit/Create | - | Client |

---

## 4. Data / API Skeleton

### 4.1 候选实体表

| 实体 | 业务含义 | 关键状态 | 备注 |
|------|---------|---------|------|
| ... | ... | ... | ... |

### 4.2 API 面分类

- **Canonical resources**（核心增删改查）：...
- **View model / aggregate queries**（页面读取聚合）：...
- **Command endpoints**（明确命令型操作）：...

### 4.3 应交给 `backend-data-api` 继续细化的点

- [ ] 表结构与字段规范
- [ ] 状态机与状态流转
- [ ] 幂等/并发策略
- [ ] Migration 计划

---

## 5. Rendering & State Strategy

### 5.1 路由渲染矩阵

| 路由 | 渲染方式 | 数据获取 | Loading 策略 |
|------|---------|---------|-------------|
| ... | ... | ... | ... |

### 5.2 状态归属表

| 状态类型 | 例子 | 应放位置 |
|---------|------|---------|
| Local UI state | 弹窗开关、当前 tab | 组件本地 |
| Screen state | 筛选器、表单草稿 | 页面级 reducer |
| Shared client state | 当前 workspace | 受控共享状态 |
| Server state | 列表/详情数据 | 查询层/缓存层 |

---

## 6. Code Organization

```
src/
├── app/          # 路由/页面入口
├── features/     # 业务模块
│   ├── module-a/
│   └── module-b/
├── shared/
│   ├── ui/       # 共享 UI 组件
│   └── lib/      # 工具函数
└── data/         # API 客户端/查询层
```

---

## 7. ADRs

- [ADR-001](../adrs/ADR-001-topology.md)：为什么选 Modular Monolith
- [ADR-002](../adrs/ADR-002-rendering.md)：渲染策略选择
- ...

---

## 8. Phase Plan

### Phase 1：最小但不乱的骨架
- ...

### Phase 2：随模块增加的抽象
- ...

### Phase 3：用户量/复杂度上来后引入
- ...

---

*此模板由 `web-app-architect` skill 提供。*
