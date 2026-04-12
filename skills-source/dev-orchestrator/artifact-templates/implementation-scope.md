<!-- source_skill: dev-orchestrator -->
<!-- created_at: {timestamp} -->

# Implementation Scope

## 设计规范参考（UI scope 时必填）

<!-- planner 在产出 implementation-scope 时，从 handoff-packet project_design_context.must_read_refs 
     抄入已存在的文件路径。FSD 在 Step 1a 逐个阅读这些文件，并在 change-package 输出消费回执。
     如 project_design_context 无 must_read_refs 或为空，标注"项目无设计约束"并删除此表。 -->

| 文件 | 路径 | FSD 需关注的内容 |
|------|------|-----------------|
| {DESIGN-SPEC.md} | {project_path}/DESIGN-SPEC.md | {token 体系、页面规范} |
| {implementation-governance.md} | {project_path}/design/implementation-governance.md | {开发自检规则} |

## 基于设计 artifact 的实现范围

### 采纳（直接实现）
| 设计 Artifact | 采纳内容 |
|--------------|---------|
| {artifact} | {具体内容} |

### 降级（简化实现）
| 设计 Artifact | 原始设计 | 降级为 | 降级理由 |
|--------------|---------|--------|---------|
| {artifact} | {原始} | {降级后} | {理由} |

### 跳过（本次不实现）
| 设计 Artifact | 跳过内容 | 跳过理由 |
|--------------|---------|---------|
| {artifact} | {内容} | {理由} |

### 新增（设计中未包含但实现需要）
| 新增内容 | 理由 |
|---------|------|
| {内容} | {理由} |
