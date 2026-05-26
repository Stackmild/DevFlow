# Code Reviewer — 详细审查清单与报告模板

本文件是 `code-reviewer` 的**唯一权威审查清单**。执行审查时，必须按 Layer 0 → Layer 1→2→3→4→5 顺序执行。

---

## Severity 分级

| 级别 | 含义 | 判定标准 |
|------|------|----------|
| **P0 / Critical** | 必须修复，否则不能合并/推进 | 会导致 bug、安全漏洞、数据丢失、部署失败、严重维护问题 |
| **P1 / High** | 应该修复，但允许带 gap 推进 | 明显的设计缺陷、违反契约、测试缺失关键路径、技术债无收口计划 |
| **P2 / Medium-Low** | 建议改进 | 命名/风格问题、轻微重复、可优化的实现方式 |

---

## Layer 0：Build Evidence & Compile Safety

在 Layer 1-5 之前执行。目的：确认 change-package 声称的验证结果有证据支撑。

### 0.1 验证证据检查

1. 读取 `change-package.tests_run`：每项是否有 `pass/fail/skip/not_run` 状态？`not_run` 是否有 reason？全部 `not_run` 且无 reason → P2 concern。

2. 如果 `change-package.delivery_readiness` 存在，读取 `delivery_readiness.verification`：
   - **task scope 包含 deploy / publish / public access**：
     - `typecheck = not_run` → P1
     - `build = not_run` → P1
     - `typecheck = fail` 或 `build = fail` → P0 blocker
   - **task scope 不包含部署目标**：
     - `typecheck = fail` → P1；其余 → P2 observation

### 0.2 Compile-Risk Pattern Check（TypeScript 项目）

如果 `change-package.files_touched` 包含 `.ts` / `.tsx`，检查高频编译错误 pattern：
- `useRef<T>()` 未提供初始值（strict mode 要求 `useRef<T>(null)`）
- `useState` 类型推断缺失导致隐式 any
- Server/Client Component 边界违规（Next.js `'use client'` 缺失或错位）
- import 路径别名与 tsconfig.json paths 是否一致
- async Server Component 返回类型是否 JSX 兼容

发现疑似问题 → P1 finding。

### 0.3 Layer 0 输出

```yaml
build_evidence:
  tests_run_coverage: "all_explicit" | "partial_not_run" | "no_tests"
  delivery_verification:
    typecheck: "pass" | "fail" | "not_run" | "n/a"
    build: "pass" | "fail" | "not_run" | "n/a"
  compile_risk_patterns_found: []   # 如有：["useRef_no_init", "missing_use_client", ...]
  layer_0_verdict: "clean" | "concerns_found"
```

### 0.4 Verdict Floor

| Layer 0 发现 | 最终 verdict 上限 |
|-------------|-------------------|
| `typecheck = fail` 或 `build = fail` | `request_changes`（不允许 accept） |
| deploy task 且 `typecheck = not_run` 或 `build = not_run` | `accept_with_known_gaps` |
| `compile_risk_patterns_found` 非空 | `accept_with_known_gaps`（must 在 known_gaps 中注明） |
| 以上均无 | 无限制，Layer 1-5 verdict 正常判定 |

---

## Layer 1：改动范围与最小性

**检查项：**
- 改动是否只做了该做的事？有没有顺手"改进"不相关代码？
- 是否有可以不改但改了的文件？
- 新增代码量是否与任务复杂度匹配？
- 是否有"顺手重构"混在功能改动里？

**判断标准：**
- 如果把功能改动和重构拆开后，功能改动本身是否更清晰？→ 是的话说明应该拆
- 删除的代码是否确实不再被引用？

---

## Layer 2：实现结构

**检查项：**
- 命名是否与 codebase 现有约定一致（大小写、前缀、后缀、缩写规则）？
- 函数/模块职责是否单一？
- 是否引入重复逻辑（已有 utility/helper 可复用但没用）？
- 是否违反模块边界（跨模块直接引用内部实现、绕过公共 API）？
- 文件组织是否遵循目录结构约定？

**常见问题：**
- 把本该是 utility 的逻辑写在了业务组件里
- 新建了一个 helper 但已有的 helper 能覆盖
- 把两个不相关的职责放在同一个函数里

---

## Layer 3：运行时健康

### Hook 使用（React / 类 React 框架）
- useEffect 依赖数组是否正确？是否遗漏了变化的依赖？
- cleanup 函数是否存在？是否处理了 unmount 场景？
- useMemo / useCallback 是否有必要？是否过度使用？
- 自定义 hook 是否有内存泄漏风险？

### Async 处理
- 是否有竞态条件（多个并发请求，后发先到覆盖先发后到）？
- 是否有取消机制（AbortController / 版本号）？
- 超时处理是否存在？
- 错误边界是否覆盖 async 失败？

### State 管理
- 是否有容易漂移的 state（多个 state 应该是同一个 derived state）？
- state 是否放在了正确的层级（该提升还是该下沉）？
- 是否有 stale closure 风险？

### Error Handling
- 是否只做了 happy path？
- catch 后是否 swallow 了错误（catch + 空 handler）？
- 用户是否能看到有意义的错误信息？
- loading / empty / error 三态是否完整？

---

## Layer 4：技术债评估

**检查项：**
- 临时补丁（workaround / hack / TODO）是否应该升级为正式实现？
- alias / fallback / 兼容逻辑是否有明确的收口计划或到期时间？
- 是否有硬编码（magic number、固定 URL、嵌入的配置值）？
- 是否有隐式依赖（依赖执行顺序、依赖全局状态、依赖特定环境）？
- 是否留下了未来很难维护的逻辑分叉（if/else 嵌套过深、条件互斥不完整）？

**判断标准：**
- 如果这个补丁再过 3 个月没人改，会不会变成"没人敢动的代码"？
- 如果换一个人来维护，能看懂这段逻辑吗？

---

## Layer 5：与上下游契约遵守

**检查项：**
- 是否遵守 architect 定义的模块边界？
- 是否遵守 backend 定义的 API contract（endpoint、params、response shape）？
- 是否遵守 interaction 定义的状态模型（状态枚举、转换规则）？
- 是否遵守 frontend-design 定义的 design tokens / 组件规则？

**注意：** 只检查"改动是否违反了已定义的契约"，不检查契约本身是否合理（那是 consistency-audit 的职责）。

### Layer 5a：Data/Source Authenticity（V4.3 — content-source 任务）

⚠️ 仅当 handoff-packet 中 `data_source_authenticity_required: true` 时执行。

- URL 引用是否指向真实、可达的外部源？（非 placeholder / localhost / 测试 URL）
- 测试数据残留：是否有硬编码的 mock 数据被当作生产数据使用？
- 来源可追溯性：每条外部内容是否可追溯到具体的 fetch / API 调用？
- 内容新鲜度：是否有机制确保外部内容的时效性？

不检查内容本身的准确性（产品层面问题，非 code review 职责）。

### Layer 5b：Design Consumption Receipt 验证（must_read_refs 非空时）

⚠️ 仅当 handoff-packet `project_design_context.must_read_refs` 非空时执行。

**前置**：检查 change-package 是否包含 `design_consumption_receipt`。
- 缺失 → **P1 finding**（"must_read_refs 非空但 FSD 未输出设计消费回执"）

**逐条检查 receipt：**
- 每个 ref 的 `status` 是否合理？（`not_found` + `not_applicable` 占全部 = 疑似未真正阅读）
- `key_constraints` 是否为空占位？（如"无"或单个字→ P2 finding）
- `status: aligned` 的 ref 所声称的约束是否在代码中得到体现？
  - 抽检：新页面是否使用了 page-patterns 中声称的容器模式
  - 抽检：Token 是否来自 CSS 变量 / design-spec 而非硬编码
  - 抽检：中文 label/caption 是否错用英文排版
- `status: conflict` 是否有 `conflict_detail`？detail 是否说明了 deviation 理由？

产出：在 `contracts_checked` 中增加 `design-consumption-receipt` 条目，result 为 `aligned` / `deviated` / `no_contract_available`。

---

## 报告模板（人类可读版）

```markdown
# Code Review Report

## 概要
- 审查范围：{文件/模块列表 或 artifact 列表}
- 审查模式：{代码模式 / 方案模式}
- 改动规模：{新增 N 行 / 修改 N 行 / 删除 N 行}
- 整体评价：{APPROVE / APPROVE_WITH_NOTES / REQUEST_CHANGES}

## 上下文来源
- {我看了什么文件/artifact，为什么}

## Contract 检查
- {检查了哪些 contract，结果如何，证据是什么}
- 如果无 design contract 可查：⚠️ no_contract_available — {说明审查盲区}

## 发现

### [P0 - Must Fix]
| # | 位置 | 问题 | 建议修复 | 层 | 证据 |
|---|------|------|---------|---|------|

### [P1 - Should Fix]
| # | 位置 | 问题 | 建议修复 | 层 | 证据 |
|---|------|------|---------|---|------|

### [P2 - Nice to Have]
| # | 位置 | 问题 | 建议修复 | 层 |
|---|------|------|---------|---|

## 缺失测试路径
- {应测但未测的路径 + 原因}

## 审查盲区
- {需要但缺失的上下文 + 影响}

## 技术债记录
- [DEBT] {描述} — 建议在 {时机} 之前偿还

## Upstream Issues（如有）
- [ISSUE→{target_skill}] {问题描述}

## ACTION
[ACTION: APPROVE]              — 可以继续推进
[ACTION: APPROVE_WITH_NOTES]   — 可以继续但请注意 P1 项
[ACTION: REQUEST_CHANGES]      — 需要修改后重新 review
```
