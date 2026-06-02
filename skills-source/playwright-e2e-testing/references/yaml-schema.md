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
  Q13_coverage_trace: "PASS | FAIL | N/A"
  Q14_untested_targets: "PASS | FAIL"
  Q15_missing_count: "PASS | FAIL"
  Q16_expected_targets: "PASS | FAIL"

merge_recommendation: "ALLOW | BLOCK"
merge_block_reason: ""
html_report_path: ""

# Coverage Gate v1.0 additions
# Populated by playwright-e2e-testing skill from visual-test-scope.yaml input.
# Gate 3 validates completeness via coverage_trace, untested_targets, coverage_summary.

expected_visual_targets:
  - target_id: "login-form"
    surface_id: "login-form"          # refs visual-test-scope.yaml surface_id
    viewports_required: ["desktop", "mobile"]
    states_required: ["default", "error"]
    interactions_required: ["submit-success"]

coverage_trace:
  - target_id: "login-form"
    test_files: ["tests/login.spec.ts"]
    screenshots: ["tests/snapshots/login-form-desktop-default.png"]
    baselines: ["tests/snapshots/login-form-desktop-default-baseline.png"]
    viewports_covered: ["desktop"]
    states_covered: ["default"]
    interactions_covered: ["submit-success"]
    result: "PASS" | "FAIL" | "NOT_COVERED"

untested_targets: []
  # - target_id: "login-form"
  #   missing_viewports: ["mobile"]
  #   missing_states: ["error"]
  #   missing_interactions: []
  #   reason: "mobile viewport not yet implemented"

coverage_summary:
  expected_count: 4       # total required (sum of targets * viewports * states)
  covered_count: 2
  missing_count: 0        # Gate 3 BLOCKs if > 0
  coverage_percent: 50
```

## Surface ↔ Target Contract

One `changed_surfaces[].surface_id` may correspond to multiple `expected_visual_targets[].target_id` entries (e.g., split by viewport or state). Reconciliation uses **set union by surface_id**:

- **R2 (presence)**: every `changed_surfaces[].surface_id` must appear in at least one `expected_visual_targets[].surface_id`.
- **R3 (target coverage)**: every `expected_visual_targets[].target_id` must have a matching `coverage_trace[].target_id` entry whose `result !== "NOT_COVERED"`.
- **R4 (is_new completeness)**: for `is_new: true` surfaces, the union of `viewports_required` / `states_required` / `interactions_required` across **all** matching `expected_visual_targets` entries must cover the surface's effective required set:
  - `effective_viewports = surface.required_viewports ?? root.required_viewports`
  - `effective_states = surface.required_states ?? root.required_states`
  - `effective_interactions = surface.interactions_to_test ?? []`
  - The union of corresponding `coverage_trace` entries (for all targets sharing the surface_id) must cover each effective item.
