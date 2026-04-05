# Change Package Schema

> full-stack-developer（或任何产出代码/配置变更的 skill）的标准化变更包。

---

## Schema

```yaml
task_id: "{task_id}"
run_id: "{run_id}"
stage: "impl" | "revision"
revision_seq: 0                    # 0=首轮实现，1+=review 后修改
files_touched:
  - path: "{文件路径}"
    action: "created" | "modified" | "deleted"
    lines_changed: {N}
diff_summary: "{简要描述改了什么}"
tests_run:
  - test_name: "{测试名}"
    result: "pass" | "fail" | "skip"
    notes: "{备注}"
self_review:
  - check: "{检查项}"
    result: "ok" | "concern" | "not_applicable"
    notes: "{备注}"
upstream_contract_checks:          # 对照上游 artifact 的检查
  - contract_source: "artifact:{artifact_id}"
    check: "{检查了什么}"
    result: "aligned" | "deviated" | "no_contract"
    deviation_reason: "{如果 deviated}"
unresolved_risks:
  - risk: "{风险描述}"
    severity: "high" | "medium" | "low"
    mitigation: "{缓解措施}"
rollback_notes: "{如何回滚这次变更}"
involves_external_sources: true | false   # V4.3 新增：是否涉及外部数据源
scope_flags:                              # Phase 2 新增：供 D.2 reviewer selector config 消费
  ui: true | false                        # 改动涉及 UI / 前端视觉
  interaction: true | false               # 改动涉及交互行为 / 状态模型
  data_model: true | false                # 改动涉及数据模型 / 数据库结构
  schema: true | false                    # 改动涉及 schema 变更
  api: true | false                       # 改动涉及 API endpoint / 接口
# delivery_readiness — 条件字段（V4.5 新增）
# 当 task scope 包含 deploy / publish / public access / release / 上线 / 部署 / 可对外访问 时必须填写
# 缺失且 scope 包含上述关键词 → D.1 判定 INCOMPLETE；PG3-12/13 在 Gate 3 前检查
delivery_readiness:
  target_type: "vercel" | "netlify" | "self-hosted" | "npm" | "other"
  repo_topology: "existing_repo" | "monorepo_subdir" | "standalone_repo_needed"
  env_template:
    example_file_present: true | false
    local_secret_created: true | false
  manual_steps:
    - step: "{可直接复制粘贴执行的步骤}"
      copy_paste_ready: true | false
  blockers: []                            # 有 blockers → PG3-12 BLOCK
  verification:
    install: "pass" | "fail" | "not_run"
    typecheck: "pass" | "fail" | "not_run" | "n/a"
    build: "pass" | "fail" | "not_run" | "n/a"
    local_smoke: "pass" | "fail" | "not_run"
```

### `scope_flags` 填写规则（MANDATORY — Phase 2 新增）

fsd 必须显式填写每个 boolean。

**质量约束**：
- 每个 boolean 必须基于实际变更内容填写，不得随手填占位值
- 若全部 scope_flags 为 `false`，fsd 必须在 `diff_summary` 中显式说明原因（如"纯文案替换，不涉及 UI/data/API"）
- reviewer 若发现 `files_touched` 与 `scope_flags` 明显不一致（如改了 UI 文件但 `scope_flags.ui = false`），应在 review 中标为 finding

**⚠️ scope_flags 是 D.1 NORMAL 质量门槛的必检字段**：5 个 boolean 全部缺失或 null → D.1 判定为 INCOMPLETE。此规则与 files_touched、diff_summary 等字段同级。

### `involves_external_sources` 判定条件（fsd 对照勾选）

fsd 必须显式填写此字段。满足以下任一条件 → `true`：
1. 代码中有 URL fetch / HTTP 请求 / API 调用外部服务
2. 代码读取或展示来自非项目目录的外部数据文件
3. 代码涉及 RSS / scraping / content aggregation pipeline

不满足任何条件 → `false`。不允许留空。

### Canonical 字段名规范（V4.3 新增）

⚠️ 以下字段名是 canonical name，orchestrator / fsd / reviewer / auditor 必须使用这些名称：

| Canonical Name | 禁止的别名 |
|---------------|-----------|
| `files_touched` | files_changed, files_modified |
| `diff_summary` | summary, change_summary |
| `tests_run` | tests, test_results |
| `upstream_contract_checks` | contract_checks, checks |
| `unresolved_risks` | risks, open_risks |

非 canonical 名称 → D.1 NORMAL 判定视为字段缺失 → INCOMPLETE。

## verification_boundary（Schema Signal Patch 新增）

**触发条件**（满足任一即条件必填）：
- `execution_plan` 中任一 scope 的 `host_target` 非空，或
- `execution_plan` 中任一 scope 的 `cloud_validation_required: true`，或
- 本 change-package 中 `delivery_readiness` 字段存在

纯 review-only 任务、纯 documentation 任务不出现此块。

> **触发条件设计说明（防语义漂移）**：
> 这三个条件的共同语义是"这次改动存在本地验证边界之外的交付面"——
> `host_target` 非空意味着有宿主平台依赖（如飞书妙搭），本地无法完整验证；
> `cloud_validation_required` 意味着 Phase A 已明确标注云端验证必要性；
> `delivery_readiness` 存在意味着任务有对外交付意图（deploy/publish）。
> 三者都指向同一个问题：Gate 3 时用户需要知道"哪些验证还没做"才能做出合理决策。
> 不应随意扩展触发条件——如果一个纯本地 repo 改动、无宿主依赖、无对外交付，
> FSD 只需填 `tests_run`，不需要 `verification_boundary`。

```yaml
verification_boundary:
  verified:
    - "TS 编译"                        # ≤ 3 条，每条 ≤ 15 字
  unverified:
    - "飞书数据对象映射"                # ≤ 3 条，每条 ≤ 15 字
  unverified_reason: "本地无飞书沙箱"  # 1 句，≤ 40 字；若 unverified 为空则留空
```

**设计约束**：
- 这是 Gate 3 用的汇总声明，不是验证报告
- `verified` = "我做了且通过"，`unverified` = "没做或无法做"，不细分原因
- 字段数量和字符数限制是强制约束，不是建议——超出即要求合并或缩短
- 与 `tests_run` 是 summary-detail 关系：`tests_run` 是明细（每个测试 pass/fail），`verified` 是汇总（"单测全过"）
- `unverified` 内容不得重复已在 `delivery_readiness.blockers` 列出的阻塞项

## debug_closure（Schema Signal Patch 新增）

条件出现：`task_type in [bugfix, hotfix]`。其他任务类型不填写此块。
  all_symptoms_explained: true       # 本次修复是否解释了全部已知症状（true | false）
  secondary_root_cause_checked: true # 是否排查了第二成因可能（true | false）
  adjacent_impact_checked: true      # 是否检查了相邻模块 / 相似路径（true | false）
  verification_scope: "local"        # local | cloud | both
```

**设计约束**：此块是 closure check，不是 investigation 协议。4 个字段固定，不扩展。回答"修复到底覆盖了多少"，而不是"你是怎么调查的"。

**填写要求**：
- 所有字段必须显式填写（不留空），但不需要额外说明文字
- `false` 本身是合法答案——如实填写，reviewer 会在 review 中跟进
- `verification_scope: cloud` 或 `both` 时，建议在 `completion_note` 中简述云端待验项

## completion_status（Schema Signal Patch 新增）

```yaml
completion_status: "done"            # done | done_with_concerns | needs_context | blocked
completion_note: ""                  # ≤ 2 句，空 = 无补充
```

**填写规则**：
- `done`：实现完成，无保留意见
- `done_with_concerns`：实现完成，但 FSD 对某项有保留，见 completion_note
- `needs_context`：缺少执行所需信息，FSD 无法继续，见 completion_note
- `blocked`：遭遇外部阻塞（平台限制、依赖缺失），无法继续，见 completion_note

**Truth-source 规则（ORC 读取时遵循）**：
- `blocked` / `needs_context`：ORC 直接接收，不进入 artifact 完整性推断，立即暂停并向用户说明
- `done` / `done_with_concerns`：ORC 仍执行现有 artifact 完整性兜底检查（字段是否齐全）
- 字段缺失：完全走现有 artifact 推断逻辑，向后兼容

> **completion_status = 提前暴露状态；artifact/gate 检查 = 客观兜底。不是两套并行判断系统。**

## 规则

- 写入 `artifacts/change-package-{seq}.yaml`
- revision 后生成新 change-package（seq 递增）
- reviewer 必须基于 change-package 做审查
- `upstream_contract_checks` 是消费回执链 1 的关键证据（adopted + deviation_reason）
- `unresolved_risks` 应进入 issues/ 中的 risk 对象
