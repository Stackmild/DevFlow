---
name: pre-release-test-reviewer
description: 上线前测试审阅者。面向内部 Web App / 管理工具 / AI-native 工具，在发布前系统发现代码逻辑冲突、接口契约不一致、用户视角差异、同步/回填数据缺口、状态初始化漏洞、回归风险、边界条件缺陷、视觉破坏与明显可访问性问题。默认采用"代码—接口—数据—用户视角—关键路径"五层发布前闸门，强调小而硬的测试资产与明确的人工验收矩阵。
triggers:
  - 上线前测试
  - 发布前测试
  - pre release testing
  - 回归测试
  - 边界测试
  - 关键路径测试
  - 冒烟测试
  - 逻辑冲突检测
  - 测试计划
  - 测试审阅
  - Storybook 测试
  - Playwright
  - 测试基线
  - 测试覆盖
  - 测试用例设计
  - 发布闸门
  - release gate
---

# Pre-Release Test Reviewer Skill

## A. Skill 使命

在 **版本发布前**，系统性发现那些**本来不必等到真实用户使用才暴露**的问题：
- 前后端接口路径、参数、返回结构不一致
- 同一页面在不同用户/不同项目子集下表现不一致
- sync、初始化、回填作业未完成，导致页面"看似正常、实际无数据"
- Dashboard / 列表页依赖的聚合字段缺失，导致分组、摘要、状态展示异常
- 页面能渲染，但关键字段、关键动作、状态切换已经坏掉
- 发布前测试资产存在，但没有形成真正的发布闸门

目标不是追求测试数量，而是用 **最少但最硬的测试资产**，拦住最不该上线后才发现的问题。

## B. 适用场景

**适合：**
- 内部 Web App / 管理后台 / 工作流工具 / AI-native 工具
- 小团队 / solo builder / 高度依赖 AI 协作开发
- 企业统一登录 / 多用户可见性差异 / 按项目子集展示的产品
- 依赖 sync、初始化、回填、状态生成的系统
- 页面和功能仍在快速迭代，但不希望每次发版都出现基础问题

**不适合：**
- 只讨论上线后的监控与告警
- 只做性能压测
- 只做安全渗透测试
- 只修一个已知 bug 的代码实现
- 只做产品功能优先级判断

## C. 本 Skill 的新增默认立场

| # | 立场 | 核心要求 |
|---|------|---------|
| C1 | **必须**五层并验 | 代码静态 · 接口契约 · 数据就绪 · 用户视角 · 关键路径；只测第 5 层很容易漏问题 |
| C2 | 用户差异是一级风险 | 至少测：管理者/成员 · 不同项目 owner · 完整数据用户 · 新同步/字段缺失用户；不能把同页异常当偶发现象 |
| C3 | 区分"数据空值"与"逻辑异常" | 发布前明确：页面逻辑坏了 vs 正常 fallback vs sync/backfill/init-state 未执行 vs 数据源缺值；**禁止**把"数据没准备好"误判成"页面没问题" |
| C4 | Dashboard/列表聚合字段是高风险面 | 分组/摘要/聚合统计/状态对象 → 默认专项检查；这类页面易"能渲染但内容全错" |
| C5 | **必须**有小型人工验收矩阵 | 至少：2–3 关键用户 · 3–5 关键页面 · 1–2 关键动作 · 1 轮字段正确性检查 |

## D. 发布前五层闸门（Release Gates）

执行顺序：Gate 1 → 2 → 3 → 4 → 5。不跳层。

| 层 | 目的 | 一句话 |
|---|------|--------|
| **Gate 1** | 代码静态层 | TypeScript / ESLint / schema 校验 / 共享类型漂移 / dead code |
| **Gate 2** | 接口契约层 | 前端请求 A，后端是否提供 A？route / param / response shape 是否一致？ |
| **Gate 3** | 数据就绪层 | 代码没坏，但数据没准备好？sync / init-state / backfill 是否已完成？ |
| **Gate 4** | 用户视角层 | 我这里正常、同事那里全坏？至少 3 类 persona 验证 |
| **Gate 5** | 关键路径层 | 真实验证最有价值的用户流程：Dashboard / 列表 / 详情 / 状态切换 |
| **Gate 5b** | iframe/Embed 专项 | 条件触发：scope 含 iframe / embed / WebView 时必须额外验证 |

详细检查项、专项关注、最低要求见 `skills-source/pre-release-test-reviewer/reference/test-checks.md`。

## E. Required References

执行审查前**必须**读取以下文件：

| 路径 | 级别 | 说明 |
|------|------|------|
| `skills-source/pre-release-test-reviewer/reference/test-checks.md` | Always | **Gate 1~5 详细检查项、必测专项 E1~E4、Severity 分级、报告模板** |
| `skills-source/dev-orchestrator/contracts/change-package.md` | Conditional | 验证 `verification_boundary` / `delivery_readiness` 时用 |

未读取 `test-checks.md` → 不得产出 test report。

## F. 反模式

**你容易犯的错误：**
1. **只测"我自己的账号"** → owner 正常，普通同事大量异常
2. **只看页面能打开，不看关键字段对不对** → UI 在，数据错
3. **把"未分类"当作安全 fallback，不检查其占比** → 真实数据缺口被掩盖
4. **修了 sync/backfill 代码，但不验证旧数据是否已补齐** → 代码看似正确，线上数据仍旧脏
5. **接口加了 alias，但前端仍在读旧字段结构** → 页面局部继续空白
6. **报告只写"已修复"，不做 persona 实测** → 开发自测通过，真实用户仍出问题

## G. 发布前默认工作流

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 读取本次变更，列出影响面 | 改动模块 / 影响页面 / API / 数据表 / persona |
| 2 | 跑静态检查 | typecheck / lint / shared types |
| 3 | 做接口契约核对 | 页面→API 映射 / path/method/params/response keys |
| 4 | 做数据就绪检查 | sync/init/backfill 需求 / 关键字段完整度 |
| 5 | 做 persona matrix 验证 | 至少 2–3 个用户的 Dashboard/列表/详情/字段/动作 |
| 6 | 跑关键路径 E2E / 人工冒烟 | Dashboard / 列表→详情 / 状态切换 / 空值 fallback |
| 7 | 做变更驱动回归 | 旧页面 / 共享组件 / 数据聚合 / 详情页依赖接口 |
| 8 | 输出发布结论 | 已验证范围 / 未验证范围 / 数据准备 / persona 结果 / Blocker→Low / Go/Go with risk/No-Go |

## H. 输出契约（Review Contract v2）

```yaml
reviewer: "pre-release-test-reviewer"
review_type: "pre_release_test"
context_pulled:
  - source: "artifact:{id}"
    purpose: "{为什么}"
contracts_checked:
  - contract: "{contract 名称}"
    source_artifact: "artifact:{id}"
    result: "aligned" | "deviated" | "no_contract_available"
    evidence: "{证据}"
risks_by_severity:
  blocker: []
  high: []
  medium: []
  low: []
missing_tests:
  - test: "{应测但未测}"
    reason_missing: "{原因}"
repo_context_needed_but_missing:
  - context: "{需要但缺失}"
    impact: "{影响}"
evidence:
  - finding_id: "{Blocker-1 等}"
    evidence_type: "code_ref" | "artifact_ref" | "behavior_observation"
    evidence: "{证据}"
verdict: "go" | "go_with_risk" | "no_go"
known_gaps_if_accepted:
  - gap: "{gap}"
    risk: "{风险}"
completion_status: "done"
completion_note: ""
```

**硬条件：**
- `context_pulled` 必填且非空
- `contracts_checked` 必填且非空
- `evidence` 必须覆盖所有 blocker/high finding
- `missing_tests` 必填（即使为空也显式标注）
- verdict 必须和 findings/risk 一致

**同时输出人类可读版**（`artifacts/pre-release-test-report.md`），模板见 `reference/test-checks.md` §报告模板。

## I. 针对你当前团队的默认最低门槛

适用于：3 人左右小团队 / 内部工具 / 企业统一登录 / 多 persona / 有 sync/backfill/init-state / AI 协作开发较多

每次发版前最低门槛：
1. **静态检查通过**
2. **关键页面的 API contract smoke 过一遍**
3. **关键数据字段完整度统计出一版**
4. **至少 2 个用户做 persona 冒烟**
5. **Dashboard / 列表 / 详情 走一轮**
6. **若依赖 sync / init / backfill，必须确认作业已执行**
7. **发布结论必须写 Go / Go with risk / No-Go**

## J. 一句话原则

> 不只是测试"页面能不能打开"，而是要在发布前确认：代码、接口、数据、用户视角和关键路径这五层都没有明显破口。
