# Code Review Report

## 概要
- 审查范围：{文件/模块列表 或 artifact 列表}
- 审查模式：{代码模式 / 方案模式}
- 改动规模：{新增 N 行 / 修改 N 行 / 删除 N 行}（代码模式）或 {涉及 N 个 artifact}（方案模式）
- 整体评价：{APPROVE / APPROVE_WITH_NOTES / REQUEST_CHANGES}

## 发现

### [P0 - Must Fix]
| # | 位置 | 问题 | 建议修复 | 层 |
|---|------|------|---------|---|
| 1 | `file:line` | ... | ... | Layer N |

### [P1 - Should Fix]
| # | 位置 | 问题 | 建议修复 | 层 |
|---|------|------|---------|---|

### [P2 - Nice to Have]
| # | 位置 | 问题 | 建议修复 | 层 |
|---|------|------|---------|---|

## 技术债记录
- [DEBT] {描述} — 建议在 {时机} 之前偿还

## Upstream Issues
- [ISSUE→{target_skill}] {问题描述}

## ACTION
[ACTION: APPROVE]              — 可以继续推进
[ACTION: APPROVE_WITH_NOTES]   — 可以继续但请注意 P1 项
[ACTION: REQUEST_CHANGES]      — 需要修改后重新 review
