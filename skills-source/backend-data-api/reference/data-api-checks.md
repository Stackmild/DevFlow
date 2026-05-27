# Backend Data API — Detailed Checks & Rules

> 外置自 `SKILL.md` §7–§13。
> 执行数据建模、API 设计、错误模型、并发/幂等、真相层级、状态流、migration 时参考本文件。

---

## 1. 数据建模规范

### 1.1 表的类型分层

| 类型 | 用途 | 示例 |
|------|------|------|
| 主实体表 | 长期业务对象 | `projects`, `companies`, `review_items` |
| 关联表 | 多对多关系 | `project_members`, `company_tags` |
| 状态/版本表 | 历史记录与版本 | `project_status_history`, `ai_result_versions` |
| 原始输入表 | 原始 payload、导入批次 | `import_batches`, `raw_records` |
| 审核表 | 待审、结论、证据 | `review_queues`, `review_decisions` |
| 派生/缓存表 | 性能、汇总、搜索 | 必须可重建，不是 source of truth |

### 1.2 主键与外键

- 统一使用 UUID / ULID / bigserial 中的一种
- 关联字段用真实外键或至少逻辑外键约束
- 不要用"名称"或"编码字符串"做主键
- 外部系统数据区分：`id`（内部）、`external_id`（外部）、`source_system`（来源）

### 1.3 审计字段

建议包含：`id`, `created_at`, `updated_at`, `created_by`, `updated_by`。

视情况加入：`deleted_at`（软删）、`deleted_by`、`version`、`status`、`source_system`、`source_record_id`、`review_status`、`published_at`。

### 1.4 软删除 vs 硬删除

- 用户误操作可能多的主实体：优先软删除
- 敏感历史、审核记录、操作日志：不应直接硬删除
- 纯缓存、临时表、可重建派生结果：可硬删除

软删时需明确：列表默认是否排除、唯一索引处理、恢复逻辑。

### 1.5 状态字段

- 使用有限枚举，禁止自由文本
- 定义合法状态迁移与推动权限
- 状态机复杂时单独写出，不埋藏在描述中

示例：`draft -> pending_review -> approved -> published -> archived`

---

## 2. API 设计规范

### 2.1 URL 与资源命名

- 名词复数：`/projects`, `/review-items`
- 路径层级不过深，不把前端页面结构硬编码进 URL
- 优先：`/projects/{id}/todos`
- 避免：`/dashboard/project-management/project-list/detail/info`

### 2.2 请求方法

| 方法 | 用途 |
|------|------|
| GET | 读取 |
| POST | 创建 / 提交命令 / 异步入口 |
| PATCH | 部分更新（默认优先） |
| PUT | 整体替换（仅在确需完整替换时） |
| DELETE | 删除（软删也可对外表现为此） |

### 2.3 统一列表查询参数

`page`, `page_size`, `sort`, `order`, `q`（全文搜索）, `status`, `created_from`, `created_to`, `updated_from`, `updated_to`。

不要混用 `pageNo` / `current` / `offset`。

### 2.4 分页

- 中小型内部工具：先 `page` / `page_size`
- 数据量大、翻页稳定性要求高：再切 cursor

返回：`items`, `page`, `page_size`, `total`, `has_next`（cursor 时换 `next_cursor`）。

### 2.5 字段更新规则

- 白名单式字段更新，不自由覆盖整个对象
- 明确：哪些可更新、哪些仅系统写、哪些特定状态下可改、哪些 publish 后不可改

### 2.6 批量操作

明确：全成功还是部分成功、部分成功明细返回、单次上限、是否异步、幂等键。

推荐返回：`accepted_count`, `success_count`, `failed_count`, `errors`, `job_id`（异步）。

### 2.7 页面聚合查询

- 是读取优化，不是新 canonical entity
- 聚合失败时允许部分返回策略、缓存策略
- 写操作仍回到 canonical resources 或 command endpoints

---

## 3. 错误模型

统一错误响应结构：

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Review item cannot be approved from current status.",
    "details": { "current_status": "draft", "allowed_statuses": ["pending_review"] },
    "request_id": "req_123"
  }
}
```

必须区分：校验错误、认证错误、授权错误、资源不存在、状态冲突、并发冲突、幂等冲突、外部依赖失败、服务器内部错误。

---

## 4. 并发与幂等

### 4.1 幂等场景

默认考虑幂等：创建导入批次、发起同步任务、提交审批、批量更新、外部回调、支付/扣减类操作。

可选方案：`Idempotency-Key`、业务去重键、唯一约束 + 冲突处理。

### 4.2 并发保护

可选策略：乐观锁（`version`）、`updated_at` 比较、ETag / If-Match、事务与锁。

用户必须能看到明确提示（如"该记录已被他人更新，请刷新后重试"），而非悄悄覆盖。

---

## 5. AI / 导入 / 审核型产品的真相层级

| 层级 | 内容 | 要求 |
|------|------|------|
| Raw | 原始文件、原始记录、原始 API 返回 | 尽量不可变，允许重跑解析，可追溯来源 |
| Extracted | parser 抽取、OCR、LLM 结构化结果 | 标明 extraction method / model / version / 置信度；不直接视为 canonical |
| Review | 待审项目、审核意见、决策结果 | 若需人类反馈反哺模型，必须结构化保存 |
| Canonical | 当前正式采用的字段与状态 | 页面默认读取的正式来源；AI/导入结果进入 canonical 必须通过规则或 review 明确控制 |
| Derived | dashboard 聚合、展示计算字段、搜索索引、缓存 | 出错时支持重建，不影响 canonical truth |

---

## 6. 状态流与发布边界

有审核的对象建议区分：`draft` → `pending_review` → `approved` → `rejected` → `published` → `archived`。

- `approved` 不一定等于 `published`
- `published` 意味着"进入正式读取路径"
- publish 权应收口，不要多个路径都能写入 canonical

---

## 7. Migration 与演进规则

### 7.1 先 migration，后代码切换

1. 先加新字段 / 新表 / 新索引
2. 兼容旧读写
3. 回填数据
4. 切读路径
5. 切写路径
6. 观察稳定后删除旧结构

### 7.2 Expand and contract

不要一次发布直接：改字段名、改字段类型、删除旧字段、改 API 响应结构。

更稳方式：expand（新增兼容结构）→ dual read/write → contract（确认无旧引用后收缩）。

### 7.3 数据迁移必须可回滚或可重跑

复杂 backfill / migration 明确：输入范围、幂等性、可重复执行、结果验证、失败恢复。
