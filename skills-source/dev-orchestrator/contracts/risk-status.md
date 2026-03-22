# Risk Status Schema — Issue / Risk / Override

> 三类语义不同的对象，统一存储在 issues/ 目录，通过 object_family 字段区分。

---

## 语义区分

| 对象族 | 语义 | 典型示例 | 生命周期 |
|--------|------|---------|---------|
| **issue** | 待处理问题，有路由和解决流程 | review finding, code bug, contract 偏差 | open → route → resolve / known_gap |
| **risk** | 被识别并接受/延后的未决风险 | "FTS5 中文分词不佳但有降级", "迁移可能遗漏旧格式" | open → accepted / deferred / resolved |
| **override** | 人类或 Gate 的特殊决策事件 | "用户跳过 automation 验证", "Gate A 推翻 PM 不做清单" | recorded（一次性事件） |

## Schema

写入 `issues/{object_family}-{seq}.yaml`：

```yaml
id: "{object_family}-{seq}"       # e.g. "issue-001", "risk-001", "override-001"
object_family: "issue" | "risk" | "override"
type: "review_finding" | "code_bug" | "contract_deviation" | "accepted_risk" | "known_gap" | "deferred_fix" | "blocked_by_platform" | "human_override"
summary: "{描述}"
raised_at: "ISO 8601"
raised_by: "{skill name}" | "human"
severity: "critical" | "high" | "medium" | "low"
decision: "{为什么接受/推迟}"      # risk/override 类必填
decision_by: "human" | "orchestrator"
expected_resolution: "{什么时候/怎么解决}"
task_id: "{task_id}"
run_id: "{run_id}"
status: "open" | "resolved" | "superseded"
related_finding_id: "{如果是从 review finding 转来}"
```

## 规则

- Gate 3 展示时必须列出所有 open 的条目
- task.yaml 的 open_issues 和 known_gaps 从 issues/ 实时聚合
- Gate 3 open_issues_count 必须 = issues/ 中 object_family:issue + status:open 的数量
- 后续 Stage 3 可拆为 issues/ + risks/ + overrides/ 三个目录
