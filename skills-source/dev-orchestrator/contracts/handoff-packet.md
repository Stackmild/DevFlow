# Handoff Packet Schema

> 每次 spawn sub-agent 前，orchestrator 必须构造并写入。不生成就不能 spawn。

---

## Schema

```yaml
handoff_id: "handoff-{stage}-{skill}-{seq}"
supersedes_handoff_id: null       # re-spawn 时指向被取代的旧 packet
packet_created_at: "ISO 8601"
task_id: "{task_id}"
run_id: "{run_id}"
stage: "{A|B|C|D.1|D.2|F}"
skill_name: "{skill}"
objective: "{这次 spawn 的具体目标（1-2 句）}"
required_inputs:
  - type: artifact | file | state
    ref: "artifact:{artifact_id}"
    version: "{created_at 时间戳}"
    purpose: "{为什么需要}"
input_artifacts:
  - artifact_id: "{id}"
    path: "artifacts/{filename}"
    generated_at: "ISO 8601"
    consumed_for: "{消费目的}"
input_freshness_checked: true
constraints:
  - "{硬性约束}"
expected_outputs:
  - artifact_id: "{预期产出 id}"
    format: "{格式}"
open_issues:
  - issue_id: "{从上游带入的未解决问题}"
    summary: "{摘要}"
known_gaps:
  - gap_id: "{已知但接受的缺口}"
    summary: "{摘要}"
exit_checks:
  - check: "{完成条件}"
    verification: "{怎么验证}"
# --- 可选字段 ---
project_design_context:           # 可选；相关文件不存在时省略此字段
  design_standards_ref: "{devflow_root}/reference/design-standards-template.md"
  visual_system_ref: "{devflow_root}/projects/{project_id}/VISUAL-SYSTEM.md"   # 如存在
  components_ref: "{devflow_root}/projects/{project_id}/COMPONENTS.md"          # 如存在
```

## project_design_context 使用规则

- **消费方**：frontend-design（Phase C）、component-library-maintainer（Phase C 条件）、webapp-consistency-audit（Phase D.2 条件）
- **文件不存在时**：省略对应子字段（不填 null，直接不写）；sub-agent 按"无设计规范约束"执行
- **orchestrator 在构造 handoff 前**：检查上述文件是否存在，将存在的文件路径填入，并读取内容作为 sub-agent 的上下文输入

## 规则

- 写入 `handoffs/handoff-{stage}-{skill}-{seq}.yaml`
- events.jsonl 写入 `skill_dispatched`（related_handoff_id = handoff_id）
- Re-spawn 时：新 handoff_id + supersedes_handoff_id 指向旧 packet + open_issues 包含触发 rework 的 finding

## 版本/新鲜度

- `input_artifacts[].generated_at`：确保 sub-agent 消费的是最新版本
- `input_freshness_checked`：orchestrator 确认过所有输入是最新版
- Re-spawn 的 packet 必须引用最新的 change-package 和 review finding
