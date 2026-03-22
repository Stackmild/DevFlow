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

## 规则

- 写入 `artifacts/change-package-{seq}.yaml`
- revision 后生成新 change-package（seq 递增）
- reviewer 必须基于 change-package 做审查
- `upstream_contract_checks` 是消费回执链 1 的关键证据（adopted + deviation_reason）
- `unresolved_risks` 应进入 issues/ 中的 risk 对象
