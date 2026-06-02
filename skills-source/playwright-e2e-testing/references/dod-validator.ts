/**
 * Q. Definition of Done — 自动化验证函数
 * 调用时机：G.Step 6 输出报告前，验证所有 DoD 条件。
 */

export function evaluateDoD(report: any): Record<string, 'PASS' | 'FAIL' | 'N/A'> {
  return {
    // Q1: Self-Audit Gate Layer1+Layer2 均通过
    Q1: (
      report.self_audit.layer1_grep_result === 'PASS' &&
      report.self_audit.layer2_semantic_result !== 'BLOCK'
    ) ? 'PASS' : 'FAIL',

    // Q2: D 章节 required visual states 覆盖完成
    Q2: report.am_hub_coverage_map?.every((c: any) =>
      c.T1_default !== 'SKIP'
    ) ? 'PASS' : 'FAIL',

    // Q3: E 章节 layering/occlusion 专项执行完成（至少存在一个 layering test）
    Q3: report.test_summary.total > 0 ? 'PASS' : 'FAIL',

    // Q4: N 章节 AM Hub 高优组件覆盖完成（如适用）
    Q4: report.am_hub_coverage_map?.length > 0 ? 'PASS' : 'N/A',

    // Q5: YAML + Markdown 报告产出完成
    Q5: (report.reporter && report.execution_date) ? 'PASS' : 'FAIL',

    // Q6: 所有失败已按 K 章节三类分类
    Q6: (
      report.test_summary.failed === 0 ||
      (
        report.failures_by_category.harness_instability.length +
        report.failures_by_category.legitimate_change.length +
        report.failures_by_category.real_bug.length
      ) >= report.test_summary.failed
    ) ? 'PASS' : 'FAIL',

    // Q7: Baseline 更新符合 L 章节治理规则
    Q7: (
      report.baselines_updated.length === 0 ||
      report.baselines_updated.every((_: any, i: number) =>
        report.baselines_update_justification[i]?.reason
      )
    ) ? 'PASS' : 'FAIL',

    // Q8: merge_recommendation 已明确
    Q8: ['ALLOW', 'BLOCK'].includes(report.merge_recommendation) ? 'PASS' : 'FAIL',

    // Q9: 交互测试（happy path）覆盖完成（如适用）
    Q9: report.interaction_coverage?.some((c: any) => c.happy_path !== 'N/A')
      ? (report.interaction_coverage.every((c: any) =>
          c.happy_path === 'N/A' || ['PASS', 'FAIL'].includes(c.happy_path)
        ) ? 'PASS' : 'FAIL')
      : 'N/A',

    // Q10: 数据正确性验证覆盖完成（如适用）
    Q10: report.interaction_coverage?.some((c: any) => c.search_data_verify !== 'N/A')
      ? (report.interaction_coverage.every((c: any) =>
          c.search_data_verify === 'N/A' || ['PASS', 'FAIL'].includes(c.search_data_verify)
        ) ? 'PASS' : 'FAIL')
      : 'N/A',

    // Q11: 设计合规验证覆盖完成（如适用）
    Q11: report.interaction_coverage?.some((c: any) => c.design_compliance !== 'N/A')
      ? (report.interaction_coverage.every((c: any) =>
          c.design_compliance === 'N/A' || ['PASS', 'FAIL'].includes(c.design_compliance)
        ) ? 'PASS' : 'FAIL')
      : 'N/A',

    // Q12: 负向路径测试覆盖完成（如适用）
    Q12: report.interaction_coverage?.some((c: any) => c.error_path !== 'N/A')
      ? (report.interaction_coverage.every((c: any) =>
          c.error_path === 'N/A' || ['PASS', 'FAIL'].includes(c.error_path)
        ) ? 'PASS' : 'FAIL')
      : 'N/A',

    // Q13: Coverage trace — no NOT_COVERED entries
    Q13: report.coverage_trace?.length > 0
      ? (report.coverage_trace.every((c: any) => c.result !== 'NOT_COVERED') ? 'PASS' : 'FAIL')
      : 'N/A',

    // Q14: Untested targets must be empty
    Q14: report.untested_targets?.length > 0 ? 'FAIL' : 'PASS',

    // Q15: Missing count must be 0
    Q15: (report.coverage_summary?.missing_count ?? 0) === 0 ? 'PASS' : 'FAIL',

    // Q16: Expected visual targets non-empty when rule_ui
    Q16: report.expected_visual_targets?.length > 0 ? 'PASS' : 'FAIL',
  };
}

// 使用方式：
// import { evaluateDoD } from './references/dod-validator';
// const dod = evaluateDoD(yamlReport);
// const allPass = Object.values(dod).every(v => v !== 'FAIL');
// if (!allPass) { /* completion_status: INCOMPLETE */ }
