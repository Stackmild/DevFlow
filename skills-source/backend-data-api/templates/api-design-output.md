# {模块名} 后端 / 数据 / API 设计

> 由 `backend-data-api` skill 生成。
> 前置输入：`web-app-architect` 的模块地图、页面模式、权限边界。

---

## A. 问题定义

**当前产品目标**：

**核心业务对象**：

**主要页面类型**：Dashboard / List / Detail / Edit / Review

**主要写操作**：

**是否有 AI / 导入 / 审核链路**：Y / N

**引用自 `web-app-architect` 的已知边界**：
-

---

## B. 模块上下文

**所属模块**：

**与其他模块的依赖**：

**是否为 canonical resource 还是 page view model**：

---

## C. 数据模型

### 实体表清单

| 表名 | 类型 | 职责 | 关键字段 |
|------|------|------|---------|
| entities | 主实体表 | ... | id, status, created_at, ... |
| entity_status_history | 状态/版本表 | 历史记录 | entity_id, old_status, new_status, changed_by |
| import_batches | 原始输入表 | 导入批次 | source, payload, status |
| review_items | 审核表 | 待审项 | entity_id, decision, reviewer_id |

### 关键字段说明

**实体：{实体名}**

| 字段 | 类型 | 说明 | 可空 | 可更新 |
|------|------|------|------|-------|
| id | uuid | 系统主键 | N | N |
| status | enum | 业务状态 | N | 受状态机约束 |
| created_at | timestamp | 创建时间 | N | N |
| updated_at | timestamp | 最后更新时间 | N | Y（系统写） |
| created_by | uuid | 创建人 | N | N |
| updated_by | uuid | 最后修改人 | Y | Y（系统写） |

---

## D. 真相层级

| 层 | 说明 | 对应表 | 可变性 |
|----|------|-------|-------|
| raw | 原始输入，未经确认 | raw_records | 不可变 |
| extracted | 解析/抽取结果 | extracted_fields | 可重跑 |
| review | 待人工/规则审核 | review_items | 审核期可更新 |
| canonical | 当前正式采用的真相 | entities（canonical 字段） | 受规则/review 控制 |
| derived | 推导/展示/统计 | dashboard_snapshots | 可重建 |

---

## E. API 草案

### 资源列表

| 端点 | 方法 | 说明 |
|------|------|------|
| /entities | GET | 列表查询 |
| /entities/:id | GET | 详情 |
| /entities | POST | 创建 |
| /entities/:id | PATCH | 部分更新 |
| /entities/:id | DELETE | 软删除 |
| /entities/:id:approve | POST | 审批（命令型） |

### 列表查询参数

```
GET /entities?page=1&page_size=20&sort=created_at&order=desc&status=draft&q=keyword
```

### 响应结构

**列表**：
```json
{
  "items": [...],
  "page": 1,
  "page_size": 20,
  "total": 100,
  "has_next": true
}
```

**详情**：
```json
{
  "id": "uuid",
  "status": "draft",
  ...
}
```

**错误**：
```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "用户可读消息",
    "details": {},
    "request_id": "req_123"
  }
}
```

---

## F. 写操作规则

**幂等策略**：
-

**并发保护**：
-

**审核前置条件**：
-

**发布前置条件**：
-

---

## G. 状态机

```
draft → pending_review → approved → published → archived
                    ↓
                 rejected
```

| 状态 | 允许操作 | 允许迁移到 | 触发条件 |
|------|---------|---------|---------|
| draft | 编辑 | pending_review | 提交审核 |
| pending_review | 审阅 | approved, rejected | 审核决策 |
| approved | 查看 | published | 发布 |
| published | 查看 | archived | 归档 |
| rejected | 编辑 | pending_review | 重新提交 |

---

## H. 演进方案

**schema migration 顺序**：

1. 先扩展 schema（加新字段/表）
2. 兼容新旧读写
3. 执行 backfill
4. 切换读路径
5. 切换写路径
6. 观察稳定后删除旧结构

**风险点**：
-

---

## I. 反模式提醒

- [ ] 确认没有把页面结构当数据结构
- [ ] 确认 AI / 导入结果进入 raw/extracted，不直接 canonical
- [ ] 确认不是所有扩展都塞 JSON
- [ ] 确认列表接口有统一查询规范
- [ ] 确认状态有显式状态机，不能自由跳转
- [ ] 确认更新接口是白名单式，不自由覆盖对象

---

*此模板由 `backend-data-api` skill 提供。*
