# I. 输出契约（YAML 固定 Schema）

输出到 `artifacts/e2e-visual-test-report.yaml`（所有字段必须存在，空值填 `null` 或 `[]`）：

```yaml
reporter: "playwright-e2e-testing"
execution_date: "YYYY-MM-DD"

run_target:
  app_url: ""
  dev_server_command: ""
pages_tested: []
components_tested: []
viewport_matrix:
  - { name: "desktop", width: 1440, height: 900 }
  - { name: "mobile", width: 390, height: 844 }

tests_added: []            # {file, test_count}[]
tests_modified: []         # {file, changes_description}[]
baselines_added: []        # string[]
baselines_updated: []      # string[] — 只有 legitimate change 才出现
baselines_update_justification: []  # {file, reason}[]

self_audit:
  layer1_grep_result: "PASS | BLOCK"
  layer1_hits: []          # {file, line, pattern}[]
  layer2_semantic_result: "PASS | WARN | BLOCK"
  layer2_notes: []

test_summary:
  total: 0
  passed: 0
  failed: 0
  skipped: 0
  flaky: 0

failures_by_category:
  harness_instability: []  # {test, evidence, action}[]
  legitimate_change: []    # {test, evidence, justification}[]
  real_bug: []             # {test, evidence, severity, suggested_fix}[]

am_hub_coverage_map:
  - component: ""
    T1_default: "PASS | FAIL | NEW | N/A"
    T2_contrast: "PASS | FAIL | NEW | N/A"
    T3_scroll: "PASS | FAIL | NEW | N/A"
    T4_mobile: "PASS | FAIL | NEW | N/A"
    T5_desktop: "PASS | FAIL | NEW | N/A"
    T6_overlay: "PASS | FAIL | NEW | N/A"

interaction_coverage:
  - component: ""
    happy_path: "PASS | FAIL | NEW | N/A"
    error_path: "PASS | FAIL | NEW | N/A"
    search_data_verify: "PASS | FAIL | NEW | N/A"
    design_compliance: "PASS | FAIL | NEW | N/A"

visual_diff_artifacts: []  # {test, expected_path, actual_path, diff_path}[]
masked_regions: []         # {selector, reason}[] — J3 mask 规则要求

completion_status: "COMPLETE | INCOMPLETE"
definition_of_done:
  Q1_self_audit: "PASS | FAIL"
  Q2_visual_states: "PASS | FAIL"
  Q3_layering_occlusion: "PASS | FAIL"
  Q4_am_hub_coverage: "PASS | FAIL | N/A"
  Q5_reports_generated: "PASS | FAIL"
  Q6_failures_classified: "PASS | FAIL"
  Q7_baseline_governance: "PASS | FAIL"
  Q8_merge_recommendation: "PASS | FAIL"
  Q9_interaction_happy_path: "PASS | FAIL | N/A"
  Q10_search_data_verify: "PASS | FAIL | N/A"
  Q11_design_compliance: "PASS | FAIL | N/A"
  Q12_negative_path: "PASS | FAIL | N/A"

merge_recommendation: "ALLOW | BLOCK"
merge_block_reason: ""
html_report_path: ""
```
