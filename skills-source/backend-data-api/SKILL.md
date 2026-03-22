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

本 Skill 负责把一个 Web App 的业务需求，翻译成 **可维护的数据结构、API 契约、写入规则与演进策略**。

它不是为了追求"复杂架构"，而是为了让一个内部产品满足以下目标：

- 数据结构清楚，不会越做越乱
- API 行为可预测，不同页面不会各写各的规则
- 写入、更新、删除、导入、审核都有统一约束
- 后续新增页面时，能在原有结构上扩展，而不是推倒重来
- AI / 导入 / 手工编辑进入系统后，有明确的 truth boundary（真相边界）

默认适用场景：

- 小团队 / solo builder
- 内部工具
- 企业统一登录已存在
- Web App 以模块化单体为主
- 关系型数据库优先
- 前端页面较多，数据结构中等复杂
- 有导入、AI 生成、人工 review、列表筛选、状态流转等需求

---

## 2. 与 `web-app-architect` 的边界

这份 Skill 负责的是**后端/数据/API 落地细化**，不是高层应用拓扑设计。

### 本 Skill 负责
- 领域对象与表结构
- 关联关系与审计字段
- 真相层级（raw / extracted / review / canonical / derived）
- 资源导向 API
- 请求/响应/错误结构
- 列表查询协议
- 幂等、并发、状态机
- migration / backfill / expand-contract

### `web-app-architect` 负责
- 应用拓扑与模块边界
- 路由树与页面模式
- 渲染/数据获取策略
- 状态边界
- 目录结构与代码边界
- ADR 与 phased architecture plan

### 交接规则
- 本 Skill 默认把 `web-app-architect` 的**模块地图、页面模式、权限边界、聚合 view model 需求**当作输入。
- 本 Skill 可以对数据/API 设计提出反推意见，但**不静默改写整体拓扑**。
- 如果发现模块划分本身导致 schema 或 API 必然扭曲，应明确回抛给 `web-app-architect`。

---

## 3. 不负责什么

本 Skill **不负责**：
- UI 视觉设计
- 交互稿与页面布局
- 高层应用拓扑与渲染策略
- 复杂分布式系统 / 微服务拆分
- 高并发专项调优
- 底层云基础设施细节
- 公网级攻防安全方案
- 产品分析埋点体系

这些应交给其他 Skill：
- `interaction designer`
- `frontend-design`
- `web-app-consistency`
- `web-app-architect`
- `release-and-change-manager`
- `data-quality-reviewer`（如果有）

---

## 4. 核心原则

### 原则 1：关系型数据库优先
内部工具默认先使用 **关系型数据库**（如 Postgres）。

原因：
- 业务对象之间通常有关联
- 列表、筛选、排序、聚合是高频动作
- 状态机、审核记录、操作日志、配置表更适合结构化建模
- 后续加页面与报表时更稳定

JSON / JSONB 只用于：
- 原始导入 payload
- 外部系统返回的半结构化数据
- 未稳定的扩展字段
- 调试与追踪用途的原始快照

不要把关键业务字段长期埋在 JSON 里。

### 原则 2：资源导向 API，少造动作型接口
默认优先设计成资源，而不是无穷无尽的"doXxx / syncXxx / processXxx"接口。

优先：
- `GET /projects`
- `GET /projects/{id}`
- `POST /projects`
- `PATCH /projects/{id}`
- `POST /imports`
- `GET /reviews`

谨慎使用动作型端点，仅在真正是"命令"时使用：
- `POST /imports/{id}:submit`
- `POST /reviews/{id}:approve`
- `POST /jobs/{id}:retry`

动作型端点必须：
- 语义清晰
- 只做一件事
- 有明确前置状态
- 有明确结果状态
- 不与普通更新混在一起

### 原则 3：先定义契约，再写实现
先定义：
- 资源对象
- 字段含义
- 可为空规则
- 列表参数
- 错误结构
- 写接口行为
- 状态流转

再开始写后端与前端。

能用 OpenAPI 表达的部分，尽量先表达清楚。

### 原则 4：系统里必须有真相层级
尤其是有 AI、导入、外部同步时，必须区分不同层：
- **raw**：原始输入，未经系统确认
- **parsed / extracted**：解析或抽取结果
- **review**：待人工或规则审核
- **canonical**：当前系统正式采用的真相
- **derived**：由 canonical 推导出的展示/统计结果

禁止把"AI 猜测结果"直接当 canonical，除非业务明确允许。

### 原则 5：写操作默认要求幂等思维
任何可能被重复提交的写操作，都要考虑：
- 用户连点两次
- 页面重试
- 网络抖动导致重复请求
- job 重跑
- webhook / callback 重试

如果是创建、提交、导入、批量处理类写操作，默认考虑幂等键或去重规则。

### 原则 6：变更优先演进，不直接暴力替换
数据结构和 API 都会变化。默认策略不是"直接重写"，而是：
- schema migration
- expand and contract
- 旧字段兼容过渡
- 分阶段切换读写路径
- 清理前先验证无引用

### 原则 7：聚合 view model 可以有，但不能替代 canonical resources
为了对齐 `web-app-architect` 的页面模式，本 Skill 允许两类读取面并存：

#### A. Canonical resources
用于真正的业务对象读写，例如：
- `/projects`
- `/projects/{id}`
- `/review-items/{id}`

#### B. View model / aggregate queries
用于 Dashboard、Detail、Review 页面聚合读取，例如：
- `/dashboard/overview`
- `/projects/{id}/detail-view`
- `/review-items/{id}/review-view`

规则：
- view model 主要服务于页面读取，不承担核心写入真相
- view model 可以组合多个 canonical resources
- 不要因为页面方便，就只保留聚合接口、丢失底层资源语义
- 单一 Web 客户端场景下，这些聚合查询通常可以保留在 modular monolith 内部，不必单独拆 BFF 服务

### 原则 8：认证和授权分开考虑
即使企业登录已经存在，仍要明确：
- **authentication**：用户是谁
- **authorization**：此用户能看什么、改什么、approve 什么、publish 什么

不要因为"已经飞书登录了"就跳过产品内权限边界。

---

## 5. 输出目标

当用户调用本 Skill 时，理想输出应包含以下一部分或全部：

1. 输入前提（引用 `web-app-architect` 的模块/页面约束）
2. 领域对象清单
3. 数据表设计
4. 字段说明
5. 关联关系
6. 状态机 / 状态流转
7. API 端点草案
8. 请求 / 响应结构
9. 错误模型
10. 查询参数规范
11. 审计与日志字段
12. 导入 / AI / review / publish 的数据路径
13. migration 与演进建议
14. 反模式与风险提示

---

## 6. 先问自己的判断顺序

### Step A. 先确认来自 `web-app-architect` 的输入
先确认：
- 模块地图是什么
- 主要页面模式是什么
- 哪些页面需要聚合 view model
- 权限边界是否已有定义
- 是否存在导入 / AI / review / publish 流程

如果这些缺失，应先补最小假设，并显式标注。

### Step B. 识别业务对象
问：系统里真正长期存在的对象是什么？

示例：
- project
- portfolio_company
- todo
- report
- import_batch
- review_item
- ai_result
- dashboard_snapshot
- user_preference

不要把页面名直接当数据模型名。

### Step C. 识别对象之间的关系
问：
- 一对一？
- 一对多？
- 多对多？
- 是否存在版本？
- 是否存在"当前有效"与"历史记录"？

常见错误：
- 把一对多硬塞成 JSON 数组
- 用字符串字段弱引用其他对象
- 没有 history table，结果后来无法追溯谁改了什么

### Step D. 判断哪部分是 canonical truth
问：
- 这个字段的正式值来源是什么？
- AI 生成的是建议、草稿，还是正式结果？
- 人工修改是否覆盖系统同步结果？
- 外部同步是否可以回写已人工确认的数据？

如果这里不清楚，后面几乎一定会出问题。

### Step E. 判断哪些是列表型核心页面
列表页通常最暴露后端设计质量。

必须提前明确：
- 默认排序
- 支持哪些筛选
- 是否支持全文搜索
- 是否支持分页
- 是否允许批量操作
- 是否有统计摘要

### Step F. 判断写操作语义
问：
- 这是 create 还是 upsert？
- 这是 patch 还是命令？
- 这是立即完成还是异步任务？
- 失败后是否可重试？
- 是否要记录操作人和原因？

---

## 7. 数据建模规范

### 7.1 表的类型分层
建议至少区分以下表类型：

#### A. 主实体表（entity tables）
存储系统长期存在的业务对象。
如：
- `projects`
- `companies`
- `todos`
- `review_items`

#### B. 关联表（join tables）
处理多对多关系。
如：
- `project_members`
- `company_tags`

#### C. 状态/版本表（status / version tables）
用于历史记录与版本管理。
如：
- `project_status_history`
- `ai_result_versions`

#### D. 原始输入表（raw ingestion tables）
保存原始 payload、原始文件元数据、导入批次。
如：
- `import_batches`
- `raw_records`
- `source_snapshots`

#### E. 审核表（review / adjudication tables）
保存待审、结论、评论、证据链接。
如：
- `review_queues`
- `review_decisions`

#### F. 派生/缓存表（derived / materialized tables）
仅用于性能、汇总、搜索或展示便利。

注意：
- 派生表不是 source of truth
- 派生表必须可重建

### 7.2 主键与外键
默认建议：
- 使用稳定主键（UUID / ULID / bigserial 任选其一，但要统一）
- 所有关联字段使用真实外键或至少逻辑外键约束
- 不要用"名称"或"编码字符串"承担主键角色，除非它们是稳定业务键

如果存在来自外部系统的业务唯一键，应明确区分：
- `id`：系统内部主键
- `external_id`：外部系统标识
- `source_system`：来源系统

### 7.3 审计字段
大多数实体表建议包含：
- `id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

视情况加入：
- `deleted_at`（软删除）
- `deleted_by`
- `version`
- `status`
- `source_system`
- `source_record_id`
- `review_status`
- `published_at`

不要等到以后再补审计字段。内部工具同样需要可追溯。

### 7.4 软删除 vs 硬删除
默认：
- 用户误操作可能较多的主实体，优先软删除
- 敏感历史、审核记录、操作日志通常不应直接硬删除
- 纯缓存、临时表、可重建派生结果可硬删除

软删除时要明确：
- 列表查询默认是否排除
- 唯一索引如何处理
- 恢复逻辑是否支持

### 7.5 状态字段
状态不要随意写成自由文本。

应：
- 使用有限枚举
- 定义合法状态迁移
- 明确谁可以推动状态迁移
- 明确每个状态的业务含义

示例：
`draft -> pending_review -> approved -> published -> archived`

状态机复杂时，应单独写出来，不要埋在描述文字里。

---

## 8. API 设计规范

### 8.1 URL 与资源命名
建议：
- 使用名词复数：`/projects`, `/review-items`
- 路径层级不超过必要深度
- 尽量避免把前端页面结构硬编码进 URL

优先：
- `/projects/{projectId}/todos`
- `/import-batches/{batchId}/records`

谨慎：
- `/dashboard/project-management/project-list/detail/info`

### 8.2 请求方法
- `GET`：读取
- `POST`：创建 / 提交命令 / 异步处理入口
- `PATCH`：部分更新
- `PUT`：整体替换（仅在确实是完整替换时）
- `DELETE`：删除（软删也可对外表现为 delete）

默认优先 `PATCH`，不要为了"规范感"滥用 `PUT`。

### 8.3 统一列表查询规范
列表型接口建议统一支持以下参数约定：
- `page`
- `page_size`
- `sort`
- `order`
- `q`（全文搜索）
- `status`
- `created_from`
- `created_to`
- `updated_from`
- `updated_to`

如果筛选很多，允许使用结构化 filter，但要统一格式。

不要一个列表用 `pageNo`，另一个用 `current`，第三个用 `offset`。

### 8.4 分页
默认用最简单、最可理解的分页方式：
- 中小型内部工具：可先用 page / page_size
- 数据量大、翻页稳定性要求高时：再切 cursor pagination

返回建议包含：
- `items`
- `page`
- `page_size`
- `total`
- `has_next`

如果用了 cursor，返回：
- `items`
- `next_cursor`
- `has_next`

不要混用两套分页语义。

### 8.5 字段更新规则
更新接口必须明确：
- 哪些字段可更新
- 哪些字段只允许系统写
- 哪些字段只允许特定状态下修改
- 哪些字段一旦 publish 后不可改

推荐使用白名单式字段更新，而不是直接把整个对象自由覆盖。

### 8.6 批量操作
批量接口只在确有业务需求时设计。

必须明确：
- 是全成功还是部分成功
- 部分成功如何返回明细
- 单次批量上限
- 是否异步处理
- 是否需要幂等键

推荐返回：
- `accepted_count`
- `success_count`
- `failed_count`
- `errors`
- `job_id`（如果异步）

### 8.7 页面聚合查询规则
如果为 Dashboard、Detail、Review 页面设计聚合查询，应明确：
- 这是读取优化，不是新的 canonical entity
- 聚合结果中的字段来源是什么
- 聚合失败时是否允许部分返回
- 聚合结果是否缓存
- 页面写操作仍然回到 canonical resources 或 command endpoints

---

## 9. 错误模型

整个系统必须统一错误响应结构。

至少包括：
- 错误类型
- 用户可读消息
- 开发排障码
- 详情对象
- trace / request id

推荐结构：

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Review item cannot be approved from current status.",
    "details": {
      "current_status": "draft",
      "allowed_statuses": ["pending_review"]
    },
    "request_id": "req_123"
  }
}
```

要区分：
- 校验错误
- 认证错误
- 授权错误
- 资源不存在
- 状态冲突
- 并发冲突
- 幂等冲突
- 外部依赖失败
- 服务器内部错误

不要所有失败都只返回"操作失败"。

---

## 10. 并发与幂等

### 10.1 幂等场景
以下场景默认考虑幂等：
- 创建导入批次
- 发起同步任务
- 提交审批
- 批量更新
- 外部回调
- 支付/扣减/记账类操作（如果未来有）

可选方案：
- `Idempotency-Key`
- 业务去重键
- 唯一约束 + 冲突处理

### 10.2 并发保护
多人同时编辑或后台任务覆盖时，要考虑并发冲突。

可选策略：
- 乐观锁（`version` 字段）
- `updated_at` 比较
- ETag / If-Match
- 关键流程下的事务与锁

用户层面要能看到：
- "该记录已被他人更新，请刷新后重试"

而不是悄悄覆盖。

---

## 11. AI / 导入 / 审核型产品的特殊规则

如果产品里存在 AI 或导入流程，默认采用以下分层：

### 11.1 Raw 层
保存：
- 原始文件元数据
- 原始记录
- 原始 API 返回
- 原始文本
- 原始截图/附件引用

要求：
- 尽量不可变
- 允许重跑解析
- 可追溯来源

### 11.2 Extracted 层
保存：
- parser 抽取字段
- OCR 结果
- LLM 结构化结果
- 清洗后的中间结果

要求：
- 标明 extraction method / model / version
- 标明置信度（如有）
- 不直接视为 canonical

### 11.3 Review 层
保存：
- 待审项目
- 审核意见
- 决策结果
- 决策人
- 决策时间
- 引用证据

如果你希望人类反馈未来能反哺规则或模型，这一层必须结构化保存。

### 11.4 Canonical 层
保存：
- 当前正式采用的字段
- 当前正式状态
- 当前业务主视图

这层才是页面默认读取的正式来源。

AI 与导入结果是否进入 canonical，必须通过规则或 review 明确控制。

### 11.5 Derived 层
保存：
- dashboard 聚合
- 展示用计算字段
- 搜索索引
- 缓存结果

Derived 层出错时，原则上应支持重建，而不影响 canonical truth。

---

## 12. 状态流与发布边界

对有审核的对象，建议至少区分：
- `draft`
- `pending_review`
- `approved`
- `rejected`
- `published`
- `archived`

注意：
- `approved` 不一定等于 `published`
- `published` 应意味着"进入正式读取路径"
- publish 权应尽量收口，不要多个路径都能把数据写进 canonical

---

## 13. Migration 与演进规则

### 13.1 先 migration，后代码切换
涉及 schema 变更时，通常顺序应是：
1. 先加新字段 / 新表 / 新索引
2. 兼容旧读写
3. 回填数据
4. 切读路径
5. 切写路径
6. 观察稳定后删除旧结构

### 13.2 Expand and contract
不要在一次发布里直接：
- 改字段名
- 改字段类型
- 删除旧字段
- 改 API 响应结构

更稳的方式：
- expand：先新增兼容结构
- dual read / dual write：必要时短期双读双写
- contract：确认没有旧引用后再收缩

### 13.3 数据迁移必须可回滚或可重跑
复杂 backfill / migration 要明确：
- 输入范围
- 幂等性
- 是否可重复执行
- 如何验证结果
- 失败后如何恢复

---

## 14. 推荐输出模板

当用户要求你设计后端 / 数据 / API 时，优先按以下结构输出：

### A. 问题定义
- 当前产品目标
- 核心业务对象
- 主要页面类型
- 主要写操作
- 是否有 AI / 导入 / 审核
- 引用自 `web-app-architect` 的已知边界

### B. 模块上下文
- 属于哪个模块
- 与其他模块的依赖
- 是否为 canonical resource 还是 page view model

### C. 数据模型
- 表名
- 主键
- 关键字段
- 关联关系
- 状态字段
- 审计字段

### D. 真相层级
- raw
- extracted
- review
- canonical
- derived

### E. API 草案
- 端点
- 方法
- 请求参数
- 响应体
- 错误场景

### F. 写操作规则
- 幂等策略
- 并发策略
- 审核前置条件
- 发布前置条件

### G. 演进方案
- migration
- backfill
- expand / contract
- 风险点

### H. 反模式提醒
- 当前方案最可能出的问题
- 不应采用的 shortcut

---

## 15. 必须主动指出的反模式

看到以下情况时，应主动提醒：

### 反模式 1：把页面结构当数据结构
比如"驾驶舱表""主页数据表""详情页表"。

### 反模式 2：把 AI 输出直接写进正式层
没有 review、没有版本、没有来源。

### 反模式 3：所有扩展都塞 JSON
短期快，长期几乎必乱。

### 反模式 4：列表接口各写各的查询规则
后面前端和维护都会痛苦。

### 反模式 5：状态自由跳转
没有状态机与前置条件。

### 反模式 6：更新接口自由覆盖整个对象
容易误改系统字段、审计字段和只读字段。

### 反模式 7：schema breaking change 一步到位
没有兼容期，没有 backfill，没有验证。

### 反模式 8：没有 source-of-truth 说明
最后没人知道哪个字段才算正式。

### 反模式 9：聚合 view model 反客为主
为了页面方便，把聚合结果当成底层真相对象，导致写入和追溯混乱。

### 反模式 10：把认证当成授权
只校验"是否登录"，却不校验"是否有资格编辑 / approve / publish"。

---

## 16. 面向内部工具的默认立场

在你的典型使用场景下，本 Skill 默认采取以下立场：
- 优先 Postgres / 关系型模型
- 优先模块化单体，不为"专业感"硬拆微服务
- 优先资源导向 API
- 优先统一列表查询协议
- 优先白名单更新
- 优先显式审计字段
- 优先 migration 演进，不直接暴力改表
- AI / 导入结果默认先进入 raw / extracted / review，而不是直接 canonical
- 页面聚合读取可以存在，但不替代 canonical resources
- 只有明确需要时，才做复杂异步编排与事件驱动

---

## 17. 一句话工作方式

> 先继承 `web-app-architect` 给出的模块与页面约束，再定义对象、关系、真相层与状态流，随后细化 API 契约与写入规则；任何会影响长期可维护性的结构问题，都优先于"先把页面跑起来"。