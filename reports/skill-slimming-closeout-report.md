# DevFlow 普通 Skill Slimming 收口报告

> 生成日期：2026-05-28
> 范围：10 个已瘦身普通 skill（不含 dev-orchestrator）

---

## 1. 总改动摘要

| 指标 | 数值 |
|------|------|
| 已瘦身 skill 数 | 10 |
| 瘦身前总行数 | 4,502 |
| 瘦身后总行数 | 1,871 |
| 减少行数 | 2,631 |
| 平均减幅 | 58% |
| 新建 reference 文件数 | 18 |
| 全部 <= 500 行规则 | 通过（13/13） |

---

## 2. 10 个 Skill 行数前后对比

| # | Skill | 瘦身前 | 瘦身后 | 减幅 | Commit |
|---|-------|--------|--------|------|--------|
| 1 | backend-data-api | 797 | 141 | 82% | 2296d5f |
| 2 | pre-release-test-reviewer | 489 | 173 | 65% | 279977b |
| 3 | web-app-architect | 467 | 165 | 65% | 8ffc523 |
| 4 | webapp-interaction-designer | 488 | 180 | 63% | b66ef05 |
| 5 | state-auditor | 422 | 196 | 54% | 2d739ad |
| 6 | webapp-consistency-audit | 378 | 173 | 54% | 6d0c935 |
| 7 | code-reviewer | 403 | 200 | 50% | 61499b2 |
| 8 | frontend-design | 364 | 200 | 45% | 4e61354 |
| 9 | product-manager | 203 | 126 | 38% | f111d42 |
| 10 | full-stack-developer | 491 | 317 | 35% | 23baffa |

**未动的普通 skill（< 250 行或单独排期）：**

| Skill | 行数 | 不动原因 |
|-------|------|----------|
| dev-orchestrator | 499 | 单独排期，改动面大 |
| devflow-self-improve | 286 | 行数不高，收益低 |
| release-and-change-manager | 245 | 行数不高，收益低 |
| component-library-maintainer | 201 | 行数不高，收益低 |

---

## 3. Pilot 证据矩阵

| # | Skill | Pilot | Pilot 目录/任务 | 输入 | 引用文件读取 | 输出 Artifact | 输出覆盖 |
|---|-------|-------|----------------|------|-------------|--------------|----------|
| 1 | state-auditor | 有 | micro-test-001 / 多真实任务 | task state | reference/audit-checks.md | audit output | CHECK-1~20 |
| 2 | code-reviewer | 有 | 多真实任务（ai-daily-hub 等） | change-package | reference/review-checks.md | review reports | Layer 0-5 |
| 3 | pre-release-test-reviewer | 有 | 多真实任务（am-hub 等） | scope + change-package | reference/test-checks.md | test reports | Gate 1-5 |
| 4 | full-stack-developer | 有 | 多真实任务 / fsd-pilot-001 | product-spec + scope | templates/ + contracts/ | change-packages | implementation |
| 5 | product-manager | 有 | micro-test-001 / 多真实任务 | task description | reference/routing-guide.md | product-spec | routing + spec |
| 6 | web-app-architect | 有 | waa-pilot-001 | product-spec | 4 reference files | architecture-spec | 8 sections |
| 7 | backend-data-api | 有 | bda-pilot-001 | arch-spec + product-spec | 4 reference files | data-api-spec.md (899 lines) | 7 sections |
| 8 | frontend-design | 有 | fd-pilot-001 | product-spec + backend-contract | 8 files (引用显性不足) | design-spec.md (554 lines) | 4 Phase, 20 sections |
| 9 | webapp-interaction-designer | 有 | wid-pilot-001 | product-spec + backend-contract | 4 reference files | interaction-spec.md (500 lines) | 9 sections |
| 10 | webapp-consistency-audit | 有 | wca-pilot-001 | design-package + impl notes | 4 reference files | audit-report.md (7 sections) | 7 sections |

**说明：**
- 前 5 个 skill 的 pilot 证据来自历史真实任务产出和 session summary 确认
- 后 5 个 skill 的 pilot 在当前会话中以独立 pilot 目录运行，产出完整 artifacts
- frontend-design pilot 输出覆盖了全部 20 个 section，但 grep 验证时只发现 3 个文件的显性引用（`route-anti-patterns.md`, `north-star-screen-template.md`, `frontend-design-package`）。Agent 报告声称读取了全部 8 个文件，行为等价成立，但引用显性不足

---

## 4. Reference 链接完整性

| 检查项 | 结果 |
|--------|------|
| 所有 Required References 路径存在 | 通过 |
| 链接指向不存在的文件 | 无 |
| 重复/过时 reference | 无 |
| 路径格式一致性 | 1 处不一致：frontend-design 使用 `reference/xxx.md`（无 `./`），其余 skill 使用 `./reference/xxx.md` |

**外置文件清单（18 个）：**

| Skill | Reference 文件 | 行数 |
|-------|---------------|------|
| state-auditor | reference/audit-checks.md | 291 |
| code-reviewer | reference/review-checks.md | 228 |
| pre-release-test-reviewer | reference/test-checks.md | 249 |
| product-manager | reference/routing-guide.md | 37 |
| product-manager | reference/checklists.md | 27 |
| product-manager | reference/pitfalls-and-examples.md | 36 |
| web-app-architect | reference/workflow-steps.md | 210 |
| web-app-architect | reference/decision-heuristics.md | 88 |
| web-app-architect | reference/pitfalls-and-smells.md | 33 |
| web-app-architect | reference/spec-template.md | 22 |
| backend-data-api | reference/data-api-checks.md | 179 |
| backend-data-api | reference/contract-template.md | 43 |
| backend-data-api | reference/pitfalls-and-examples.md | 38 |
| webapp-interaction-designer | reference/interaction-checks.md | 213 |
| webapp-interaction-designer | reference/interaction-spec-template.md | 27 |
| webapp-interaction-designer | reference/pitfalls-and-examples.md | 32 |
| webapp-consistency-audit | reference/consistency-checks.md | 141 |
| webapp-consistency-audit | reference/report-template.md | 75 |
| webapp-consistency-audit | reference/pitfalls-and-examples.md | 59 |

frontend-design 的 reference 文件在 `templates/`, `checklists/`, `rubrics/` 子目录中（已有，非新建）：
- templates/design-spec.md (412), templates/north-star-screen-template.md (89), templates/frontend-design-package.md (136)
- checklists/frontend-design-hard-checks.md (157)
- rubrics/design-quality-rubric.md (214)
- reference/design-route-library.md (121), reference/route-anti-patterns.md (174)

---

## 5. 协议漂移检查

| 检查项 | CLAUDE.md | README.md | AGENTS.md | dev-orchestrator/SKILL.md | 结论 |
|--------|-----------|-----------|-----------|--------------------------|------|
| devflow-gate 9 actions | 有 | 有 | N/A | 有 | 一致 |
| Task spawn: subagent_type=claude + @skill | 有 | 有 | N/A | 未覆盖 | 漂移 |
| handoffs/{handoff_id}.yaml | 有 | 有 | N/A | 有 | 一致 |
| finalize_dispatches fallback | 有 | 有 | N/A | 未覆盖 | 漂移 |
| phase canonical (d1/d2/d3/f) | 有 | 有 | N/A | 有 | 一致 |
| verify_state D1-D7 | 有 | 有 | N/A | 未覆盖 | 漂移 |

**漂移项：**
- dev-orchestrator/SKILL.md 未覆盖 Cowork Agent tool spawn 协议（@mention / subagent_type=claude / skill 解析优先级）
- dev-orchestrator/SKILL.md 未覆盖 finalize_dispatches fallback 机制
- dev-orchestrator/SKILL.md 未覆盖 verify_state D1-D7 对账

> 注：用户明确指示不动 dev-orchestrator，单独排期。上述漂移记录在案，留待 dev-orchestrator 排期时一并处理。

---

## 6. 测试结果

| 测试 | 结果 |
|------|------|
| `scripts/sync-skills.sh` | 通过（13/13 skill 同步成功） |
| `node scripts/lint-naming.mjs` | 通过（canonical names consistent） |
| `node scripts/smoke-devflow-hardening.mjs` | 通过（36/36 tests） |

---

## 7. 仍未验证项

| # | 项目 | 状态 | 说明 |
|---|------|------|------|
| 1 | frontend-design 引用显性 | 部分不足 | Pilot 输出只 grep 到 3/8 文件的显性引用，但行为等价 |
| 2 | state-auditor / code-reviewer / PRT / FSD / PM 的独立 pilot | 依赖历史任务 | 有真实任务产出佐证，但无当前会话独立 pilot 目录 |
| 3 | dev-orchestrator SKILL.md 协议漂移 | 未修复 | 用户指示不动，单独排期 |
| 4 | frontend-design 路径格式一致性 | 未修复 | `reference/` vs `./reference/`，功能不影响 |
| 5 | 长期 LLM 阅读行为量化验证 | 未做 | 外置后 LLM 是否真按 Required References 读取，无持续监控数据 |

---

## 8. 建议

### 8.1 是否进入 dev-orchestrator 单独排期

**建议：是，但优先级中等。**

理由：
- dev-orchestrator (499 行) 是最后一个 >250 行的核心 skill
- 存在 3 项协议漂移（spawn 协议、finalize fallback、verify_state）
- 但 orchestrator 是 DevFlow 的核心控制层，改动风险高，需要专门的 design review
- 建议在至少 2-3 个完整 DevFlow 任务稳定运行后再启动

### 8.2 后续跟进项

1. **frontend-design 路径格式统一**：将 `reference/xxx.md` 改为 `./reference/xxx.md`（低风险，1 行修改）
2. **建立 pilot 回归机制**：每次修改 skill 后，用标准化 prompt 快速跑 pilot，确保行为等价
3. **dev-orchestrator 排期**：收集 3 项协议漂移 + 行数瘦身需求，准备 design doc
4. **长期 LLM 行为监控**：在 state-auditor 的 CHECK-20 中增加"reference 读取率"指标

---

*Report generated by Claude Sonnet 4.6*
