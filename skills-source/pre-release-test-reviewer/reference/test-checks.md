# Pre-Release Test Reviewer — 详细检查清单与报告模板

本文件是 `pre-release-test-reviewer` 的**唯一权威检查清单**。执行审查时，必须按 Gate 1 → 2 → 3 → 4 → 5 顺序逐项执行。

---

## Severity 分级

| 级别 | 含义 | 判定标准 |
|------|------|----------|
| **Blocker** | 不能发布 | 会导致线上故障、数据丢失、安全漏洞、关键路径中断 |
| **High** | 必须修复后才能发布 | 接口契约不一致、数据就绪缺口、关键页面损坏、回归风险 |
| **Medium** | 带风险发布，需明确记录 | 次要页面异常、非关键路径缺陷、有 fallback 但体验差 |
| **Low** | 建议改进 | 文案/样式问题、非阻塞优化 |

---

## Gate 1：代码静态层

目标：拦住最便宜、最明显的问题。

至少包括：
- TypeScript
- ESLint
- 基础 schema / contract 校验
- 共享类型是否漂移
- obvious dead code / wrong imports / missing exports

若这一层失败，不应继续以浏览器测试来"碰运气"。

---

## Gate 2：接口契约层（API / Route Contract Smoke）

目标：拦住"前端请求 A，后端提供 B"这类基础问题。

发布前必须核对：
- 页面实际调用的 route 是否存在
- query 参数是否被后端支持
- response shape 是否与前端读取一致
- 是否需要 alias / backward compatibility
- controller / service / shared types 是否一致

### 专项关注
- `GET /path`
- `POST /path`
- alias 路由
- response key 如 `items` / `records`
- `projectId` / `userId` / filter 参数
- 详情页聚合接口与页面依赖字段是否一致

### 最低要求
对每个关键页面，至少列出：
- 页面依赖的 API 清单
- 每个 API 的：path / method / query/body / 关键 response 字段
- 前端实际读取字段名

---

## Gate 3：数据就绪层（Data Readiness）

目标：拦住"代码没坏，但数据没准备好"的问题。

发布前必须检查：
- 是否需要 sync 才能显示
- 是否需要 init-state 才能展示 dashboard / status
- 是否需要 backfill 才能显示关键字段
- 关键摘要字段的非空率是否足够
- 新同步项目是否会自动进入正确状态
- 空值时是否是预期 fallback，而不是脏状态

### 必查对象
- `state` 表是否齐全
- `bitableRecordId` / 外部主键是否存在
- `headquartersCity` / status / owner / date 等关键字段完整度
- 新项目是否自动初始化
- 回填接口是否真实可调用，路径是否准确

### 必须输出
对关键字段做字段完整度统计：
- 项目总数
- 非空数量
- 空值数量
- 非空率
- 是否达发布门槛

---

## Gate 4：用户视角层（Persona Matrix）

目标：拦住"我这里正常、同事那里全坏"的问题。

默认至少定义 3 类 persona：
1. **主验证用户**：产品 owner / 管理员 / 全量视角
2. **普通业务用户**：项目子集不同、权限较窄
3. **新同步/弱数据用户**：数据刚进来、字段缺失概率高

### 每个 persona 至少验证
- 登录成功
- Dashboard / 首页
- 列表页
- 详情页
- 1 个关键动作
- 关键字段展示是否正确

### 特别要求
不要只比"项目有没有重叠"，而要比较：
- 同一张表的同一关键字段，在各自项目子集上的完整度
- 是否只是数据缺值导致 fallback
- 还是用户视角下拿到的 payload / state / aggregation 有异常

---

## Gate 5：关键路径层（Critical Path）

目标：真实验证最有价值的用户流程。

默认先覆盖：
- 打开应用并进入核心模块
- Dashboard / 列表 / 详情
- 关键读路径 1–2 条
- 关键写路径 1–2 条
- 至少一个状态切换
- 至少一个"空值 fallback"场景

### 关键路径不只是"页面打开"
还必须验证：
- 核心字段存在
- 分组/聚合正确
- 详情不报错
- 常用动作按钮有效
- 页面之间数据一致

### Gate 5b：Embeds / iframe / WebView（条件触发）

⚠️ **触发条件**：scope 中包含 iframe / embed / WebView / 就地阅读窗格 / 第三方内容嵌入

**P0 检查**

| 检查项 | 操作 | 失败处理 |
|--------|------|---------|
| change-package 中是否有 iframe/embed 可行性验证记录 | 检查 `self_review` 或 `upstream_contract_checks` 中是否包含"iframe 跨域可行性" | 无记录 → P0 blocker |
| 降级方案是否已实现 | 检查代码中是否有 iframe load error fallback | 无 fallback → P0 blocker |

**P1 检查**
- 加载失败时是否有可见 fallback UI（不是空白）
- 是否有"打开原文"后备外链按钮
- sandbox 属性是否过宽
- 站内阅读与外跳逻辑是否冲突

---

## 必测专项清单

### E1. Dashboard / Copilot 专项
至少验证：
- bucket 分组是否正确
- `未分类` 是否是合理 fallback，不是大面积脏数据
- count 与项目集合一致
- 摘要字段（城市、上次拜访、状态）显示正常
- 不同 persona 下 bucket 不应出现明显逻辑异常

### E2. 列表 → 详情 专项
至少验证：
- 列表能打开详情
- 详情页依赖的聚合接口真实存在
- worklog / related records / status 能显示
- 前端读取字段名与后端返回一致
- 详情页不依赖"碰巧存在的字段"

### E3. 同步 / 初始化 / 回填 专项
至少验证：
- 新同步项目是否自动生成所需 state
- 缺字段项目是否能被 backfill 修复
- backfill 接口路径真实可用
- 回填后页面无需改代码即可正确显示

### E4. 字段完整度专项
对以下字段做发布前检查：
- 分组字段
- 详情摘要字段
- 关键状态字段
- 时间字段
- 外部主键 / 回填依赖字段

输出：空值率 / 风险等级 / 是否阻断发布

---

## 报告模板（人类可读版）

```markdown
# Pre-Release Test Review

## 0. 上下文与 Contract 检查
### 上下文来源（context_pulled）
- {看了什么，为什么}

### Contract 检查（contracts_checked）
- {检查了什么 contract，结果，证据}

### 审查盲区（repo_context_needed_but_missing）
- {需要但缺失的上下文 + 影响}

## 1. Scope
- Covered:
- Not covered:

## 2. Change Risk Summary
- High-risk areas:
- Shared components affected:
- API/routes affected:
- Data/state jobs affected:
- Personas affected:

## 3. Contract Smoke
- Page → API mapping:
- Route / param mismatches:
- Response shape mismatches:

## 4. Data Readiness
- Required sync/init/backfill:
- Critical field completeness:
- Blocking data gaps:

## 5. Persona Matrix
| Persona | Dashboard | List | Detail | Key Fields | Key Action | Result |
|---------|-----------|------|--------|------------|------------|--------|

## 6. Findings（每条 Blocker/High 附 evidence）
### Blocker
| # | 问题 | 证据 |
### High
| # | 问题 | 证据 |
### Medium
### Low

## 7. 缺失测试路径（missing_tests）
- {应测但未测 + 原因}

## 8. Recommended Tests / Fixes

## 9. Release Recommendation
- Decision: Go / Go with risk / No-Go
- Reasoning:
- Manual checks before release:
- Required data jobs before release:
- Known gaps if accepted:
```
