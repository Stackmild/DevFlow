# Skills — 全局 Skill 资产目录

本目录包含为 Web App 开发全流程设计的一套 Skill 资产，覆盖从架构设计、后端数据、前端设计、交互设计、全栈实现、代码审查、一致性审计、发布前测试到变更管理的完整链路，并由 Dev Orchestrator 统一编排"设计 → 实现 → 审查"闭环。

每个 skill 都有：
- `SKILL.md`：主 Skill 定义（frontmatter + 完整规则）
- `templates/`：可直接复用的输出模板（按需添加）
- `reference/`：辅助参考文档（按需添加）

---

## Skill 清单

### 编排层

| Skill | 目录 | 简介 | 优先级 |
|-------|------|------|-------|
| `dev-orchestrator` | `dev-orchestrator/` | 设计+实现+审查闭环编排器：任务路由、artifact 传递、implementation loop、issue 回流、Human Gate、handoff 生成 | ⭐⭐⭐ 核心 |

### 架构层（Layer A）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `web-app-architect` | `web-app-architect/` | 高层架构蓝图：模块边界、路由、渲染策略、状态边界、目录结构、ADR | ⭐⭐⭐ 高 |
| `backend-data-api` | `backend-data-api/` | 后端/数据/API 设计：表结构、状态机、API 契约、真相层级（纯设计，不负责编码） | ⭐⭐⭐ 高 |

### 前端层（Layer A）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `frontend-design` | `frontend-design/` | 视觉系统：Design Tokens、页面骨架、数据型界面规则、组件视觉规范 | ⭐⭐ 中 |
| `webapp-interaction-designer` | `webapp-interaction-designer/` | 交互设计：任务流、状态系统、异常恢复、AI 不确定性管理、Persona 差异 | ⭐⭐ 中 |

### 执行层（Layer IMPL）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `full-stack-developer` | `full-stack-developer/` | **执行型全栈开发**：读取设计 artifact 落地代码（前端/后端/脚本/schema），可被反复调用响应 review，遵守 execute/generate_handoff 模式 | ⭐⭐⭐ 高 |

### 质量层（Layer B）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `code-reviewer` | `code-reviewer/` | **实现质量审查**：改动最小性、实现结构、hook/async/state 安全、技术债、契约遵守 | ⭐⭐⭐ 高 |
| `webapp-consistency-audit` | `webapp-consistency-audit/` | 一致性审计：代码逻辑/Contract/UI/Persona 四类问题审计 | ⭐⭐ 中 |
| `pre-release-test-reviewer` | `pre-release-test-reviewer/` | 发布前测试：五层闸门（代码/接口/数据/用户视角/关键路径） | ⭐⭐⭐ 高 |

### 发布与维护层（Layer C）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `release-and-change-manager` | `release-and-change-manager/` | 发布与变更管理：影响评估、发布顺序、兼容期、rollback 方案 | ⭐⭐⭐ 高 |
| `component-library-maintainer` | `component-library-maintainer/` | 组件库治理：分层模型、tokens、组件 API、测试基线、弃用机制 | ⭐⭐ 中 |

### 可选上游（Layer 0）

| Skill | 目录 | 简介 | Orchestrator 优先级 |
|-------|------|------|-------------------|
| `product-manager` | `product-manager/` | PM 编排主入口：问题澄清→指标定义→PRD 写作路由（仅在需求模糊时由 orchestrator 调用） | ⭐⭐ 中 |
| ↳ `problem-framing` | `product-manager/skills/problem-framing/` | 问题定义与机会判断 | - |
| ↳ `outcome-definition` | `product-manager/skills/outcome-definition/` | 成功指标定义 | - |
| ↳ `prd-writing` | `product-manager/skills/prd-writing/` | PRD 写作（需先满足前置条件） | - |
| ↳ `assumption-mapping` | `product-manager/skills/assumption-mapping/` | 假设识别与风险排序 | - |
| ↳ `experiment-design` | `product-manager/skills/experiment-design/` | 实验设计与验证规划 | - |
| ↳ `prioritization` | `product-manager/skills/prioritization/` | 优先级排序 | - |
| ↳ `discovery-synthesis` | `product-manager/skills/discovery-synthesis/` | 用户研究综合 | - |
| ↳ `roadmap-reality-check` | `product-manager/skills/roadmap-reality-check/` | Roadmap 现实性检查 | - |
| ↳ `launch-review` | `product-manager/skills/launch-review/` | 发布决策审查 | - |

---

## Skill 间依赖关系

```
product-manager（可选上游，仅在需求模糊时调用）
    └─► web-app-architect  ◄──────────────────────────┐
            │                                          │
            ▼                                          │
    backend-data-api                          (反推 / 修正)
            │
            ▼
    webapp-interaction-designer ◄── frontend-design
            │
            ▼
    component-library-maintainer
            │
            ▼
    full-stack-developer ◄─── (审查发现问题 → 回流修改) ──┐
            │                                              │
            ▼                                              │
    code-reviewer ──────────────────────────────────────────┤
            │                                              │
            ▼                                              │
    webapp-consistency-audit ───────────────────────────────┤
            │                                              │
            ▼                                              │
    pre-release-test-reviewer ─────────────────────────────┘
            │
            ▼
    release-and-change-manager
```

**标准调用顺序（新功能开发）：**

设计阶段：
1. `product-manager` → 澄清需求（可选）
2. `web-app-architect` → 高层架构方案
3. `backend-data-api` → 后端/API 设计
4. `webapp-interaction-designer` → 交互方案
5. `frontend-design` → 视觉系统
6. `component-library-maintainer` → 组件沉淀（按需）

实现阶段：
7. `full-stack-developer` → 代码落地（execute 写代码 / generate_handoff 产出交接文件）

审查阶段（发现问题 → 回流 full-stack-developer → 重新审查）：
8. `code-reviewer` → 实现质量审查
9. `webapp-consistency-audit` → 一致性审计
9. `pre-release-test-reviewer` → 发布前测试
10. `release-and-change-manager` → 发布变更管理

---

## 快速触发指南

| 我想做的事 | 调用的 Skill |
|---------|-----------|
| 编排一个完整的开发工作流 | `@dev-orchestrator` |
| 设计一个 Web App 的整体结构 | `@web-app-architect` |
| 设计数据库表和 API | `@backend-data-api` |
| 设计页面交互流程和状态 | `@webapp-interaction-designer` |
| 设计产品视觉风格和 Design Tokens | `@frontend-design` |
| 治理/扩展组件库 | `@component-library-maintainer` |
| 基于设计方案落地代码 | `@full-stack-developer` |
| 审查代码改动质量 / 技术债 | `@code-reviewer` |
| 审计页面/代码/数据一致性 | `@webapp-consistency-audit` |
| 发布前系统测试评审 | `@pre-release-test-reviewer` |
| 制定发布计划、回滚方案 | `@release-and-change-manager` |
| 写 PRD / 澄清需求 / 定义指标 | `@product-manager` |

---

## Templates 目录

各 Skill 的 `templates/` 目录提供开箱即用的输出模板：

| Skill | 模板文件 | 用途 |
|-------|---------|------|
| `dev-orchestrator` | `artifact-templates/*.md` | 全套 artifact 模板（task-brief, architecture-spec, backend-contract, interaction-spec, design-spec, implementation-report, audit-report, feishu-handoff） |
| `dev-orchestrator` | `task-template.yaml` | 任务状态模板 |
| `code-reviewer` | `templates/code-review-report.md` | 代码审查报告模板 |
| `full-stack-developer` | `templates/implementation-report.md` | 实现报告模板 |
| `web-app-architect` | `templates/adr-template.md` | 架构决策记录（ADR）模板 |
| `web-app-architect` | `templates/architecture-output.md` | 架构方案输出模板 |
| `backend-data-api` | `templates/api-design-output.md` | API/数据设计输出模板 |
| `component-library-maintainer` | `templates/component-definition.md` | 组件规范定义模板 |
| `pre-release-test-reviewer` | `templates/release-gate-report.md` | 发布前测试报告模板 |
| `release-and-change-manager` | `templates/release-packet.md` | 发布包模板 |
| `release-and-change-manager` | `templates/release-checklist.md` | 发布 checklist 模板 |
| `webapp-consistency-audit` | `templates/audit-report.md` | 一致性审计报告模板 |
| `frontend-design` | `templates/design-spec.md` | 前端设计说明模板 |
| `webapp-interaction-designer` | `templates/interaction-spec.md` | 交互设计说明模板 |

---

## Skill 成熟度评估

| Skill | 成熟度 | 说明 |
|-------|-------|------|
| `dev-orchestrator` | ✅ Stable | Phase-Driven v4 骨架稳定；Schema Signal Patch 新增 completion_status / debug_closure / verification_boundary 三项 schema 信号 |
| `full-stack-developer` | ✅ Stable | change-package 产出规范升级（Schema Signal Patch 三项新字段） |
| `code-reviewer` | 🆕 MVP | 首版，待试点验证 |
| `web-app-architect` | ✅ Stable | 内容完整，结构系统，有 ADR 机制 |
| `backend-data-api` | ✅ Stable | 覆盖全，原则清晰，有真相层级模型 |
| `frontend-design` | ✅ Stable | 完整视觉系统设计规范 |
| `webapp-interaction-designer` | ✅ Stable | 覆盖任务流/状态/异常/Persona 差异 |
| `component-library-maintainer` | ✅ Stable | 组件治理体系完整 |
| `pre-release-test-reviewer` | ✅ Stable | 五层闸门机制完整，有输出模板 |
| `release-and-change-manager` | ✅ Stable | 变更管理全流程完整，有模板 |
| `webapp-consistency-audit` | ✅ Stable | 四类问题审计完整 |
| `product-manager` | ✅ Stable | 有完整子 Skill 生态，编排逻辑清晰 |
| `product-manager` 子 Skills | ⚠️ Beta | 各子 Skill 仍为 v1，可持续打磨 |

---

## 历史遗留文件说明

以下文件是安装前的旧版散落文件，已被规范化为对应的 folder 形式。旧文件暂保留：

| 旧文件 | 已规范为 | 说明 |
|-------|---------|------|
| `web-app-architect-skill-aligned.md` | `web-app-architect/SKILL.md` | `-aligned` 后缀已移除 |
| `backend-data-api-skill-aligned.md` | `backend-data-api/SKILL.md` | `-aligned` 后缀已移除 |
| `component-library-maintainer-skill.md` | `component-library-maintainer/SKILL.md` | `-skill` 后缀已移除 |
| `pre-release-test-reviewer-skill.md` | `pre-release-test-reviewer/SKILL.md` | `-skill` 后缀已移除 |
| `release_and_change_manager_skill_v_2.md` | `release-and-change-manager/SKILL.md` | 下划线命名 + `_v_2` 后缀已移除，改为 kebab-case |
| `webapp_consistency_audit_skill_v_2.md` | `webapp-consistency-audit/SKILL.md` | 下划线命名 + `_v_2` 后缀已移除，改为 kebab-case |

---

*最后更新：2026-04-05（Schema Signal Patch）*
