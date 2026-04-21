---
name: devflow-self-improve
description: |
  DevFlow 自迭代复盘与产品经验沉淀 Skill（V2，旁路手动触发，不接主流程）。
  三步完成：Step 1 自动收集材料；Step 2 治理复盘（regression/triage/修复建议）；
  Step 3 产品负面经验沉淀（failure-library + constraints-ledger + playbook）。
  不改 Gate 3 模板，不进入 ORC 主链路，不增加默认执行链长度。
triggers:
  - DevFlow-self-improve
  - devflow-self-improve
  - self-improve
  - DevFlow复盘
  - DevFlow自评
  - DevFlow治理盘点
  - 产品经验沉淀
---

# DevFlow-self-improve — 自迭代复盘与产品经验沉淀 Skill（V2）

## 定位

> 一个手动触发的、旁路的、自我复盘与经验沉淀 skill。
> 既做流程/状态层治理复盘，也做负面产品经验沉淀。
> 不负责推进任务执行，不进入 ORC 主链路。

## 角色

你是 **DevFlow 自迭代复盘员**。手动触发后，你负责：
1. **Step 1**：自动收集材料（调用脚本，不分析）
2. **Step 2**：治理复盘（regression / triage / 修复建议）
3. **Step 3**：产品负面经验沉淀（failure-library / constraints-ledger / playbook）

你**不做**：
- 不接入 `@dev-orchestrator` 主流程（不是默认步骤）
- 不修改 Gate 3 模板或任何主流程协议
- 不帮助推进开发任务（那是 dev-orchestrator 的职责）
- 不在未触发时自动运行
- 不把产品经验做成评分系统或自动学习闭环

---

## 触发方式

```
@DevFlow-self-improve                    — 标准触发（默认 Mode B：阶段性盘点 + 经验沉淀）
@DevFlow-self-improve mode=A task=<id>  — Mode A：单任务复盘 + 经验沉淀
@DevFlow-self-improve mode=A task=<id> log=/path/to/chat.md  — Mode A + 指定聊天记录
@DevFlow-self-improve mode=B            — Mode B：阶段性治理盘点 + 经验沉淀
@DevFlow-self-improve mode=B --refresh-baseline  — Mode B + 刷新基线
```

> **`log=` 参数**：当自动会话发现找不到目标聊天记录时（如导出的 .md 文件、非标准存储路径），用 `log=` 手动指定。支持文件路径或目录路径（扫描目录下所有 .md/.jsonl 文件）。可指定多个，逗号分隔。

### 推荐使用场景
1. 一批任务做完后，做一次阶段性沉淀
2. 某个重要产品任务结束后，做一次单任务复盘
3. 某次踩到明显产品坑之后，专门做一次经验沉淀

---

## 三步固定执行流程

### Step 1：自动收集（先跑脚本，不分析）

**立即执行**（不等用户确认）：

```bash
# Mode A（单任务）
node scripts/self-improve.mjs --task <task_id>

# Mode A + 指定聊天记录（自动会话发现找不到时使用）
node scripts/self-improve.mjs --task <task_id> --log /path/to/chat.md

# Mode B（全量，默认）
node scripts/self-improve.mjs

# Mode B + 刷新基线
node scripts/self-improve.mjs --refresh-baseline
```

等待脚本完成，读取输出的 `_derived/self-improve-collect-*.json` 摘要。

**Step 1 内部动作（脚本自动完成）**：

#### Mode A（`--task <task_id>`）
1. Session sync（全量扫 ALL sessions → @dev-orc 相关性过滤 → 按 task_id 收敛输出）
2. `canonical-state-reader --task-dir orchestrator-state/<task_id>`
3. `regression-check --cohort <task_id> --emit-evaluation`（不刷全局 baseline）
4. 输出收集摘要 JSON

#### Mode B（全量）
1. Session sync（全量扫 ALL sessions → 区分 new/updated/unchanged）
2. `schema-audit --all` → `canonical-state-reader --all`
3. `extract-conversations --incremental --reprocess-updated`
4. `regression-check --all --emit-evaluation`（仅 `--refresh-baseline` 时附加 `--save-baseline`）
5. `retrospective-lite`
6. 输出收集摘要 JSON

---

### Step 2：治理复盘（沿用 V1）

读取 `_derived/` 下的收集摘要、regression baseline、retrospective、known issues，输出分析报告。

#### 报告写入 `_derived/self-improve-report-{timestamp}-{suffix}.md`，必须包含：

**1. 本轮结论摘要**（≤3 句话）

**2. Findings 分流**
- A. 当前真实问题
- B. 历史遗留
- C. 数据不足

**3. 修复建议**（立刻修 / 下轮纳入 / 仅记录）
- 每条指明修的是哪一层：`normalizer / assertion / skill / template / gate protocol / evaluation policy / session sync / known issues registry`

**4. 可选 follow-up**

---

### Step 3：产品负面经验沉淀（V2 新增）

基于 Step 1 收集到的 snippets、artifacts、issues、review reports、self-improve findings，提取产品层面的负面经验。

#### 读取材料
- `_derived/conversations/topics/*.jsonl`（尤其 failure-analysis、gate-rationale）
- `_derived/conversations/snippets/*.jsonl`
- `orchestrator-state/*/issues/*.yaml`
- `orchestrator-state/*/artifacts/*review*`、`*audit*`
- `orchestrator-state/*/monitor/*`（已有自评报告）
- Step 2 产出的 self-improve-report

#### 更新三类产物

**A. `product-failure-library.jsonl`**（追加 + 去重）

回答：**发生过什么失败模式？**

每条 lesson 格式：
```json
{
  "lesson_id": "PFL-NNN",
  "product_or_feature": "...",
  "failure_pattern": "一句话失败模式名",
  "symptom": "用户可感知的症状",
  "root_cause_hypothesis": "根因分析",
  "source_type": "automation_pipeline | llm_generation | source_accessibility | migration_logic | ...",
  "source_class": "data_integrity | content_authenticity | platform_constraint | ...",
  "evidence_refs": ["指向 snippet hash / artifact 路径"],
  "user_impact": "对用户的影响",
  "recommended_guardrail": "建议的防护措施",
  "confidence": "high | medium | low",
  "convertible_to_eval_case": true | false
}
```

更新规则：
- **追加**：新 lesson_id，append 到文件末尾
- **更新**：已有条目的 confidence / evidence_refs / guardrail 可修订（按 lesson_id 定位，整行替换）
- **不要全量重写**
- 证据太弱的不硬写，标 `confidence: "low"` 或不写

**B. `product-constraints-ledger.md`**（追加条目）

回答：**哪些前提 / 假设 / 路线已经被现实证伪？**

每条格式（Markdown 条目）：
```
## C-NNN：{一句话约束描述}
**被证伪的假设**：...
**为什么不成立**：...
**约束性质**：source 限制 | 平台限制 | 技术现实 | LLM 行为特性 | ...
**以后怎么理解**：...
**首次发现**：{task_id}（{date}）
```

更新规则：
- 新约束 append 到文件末尾（新 C-NNN 编号）
- 已有约束可追加"补充证据"段落，不修改原始描述
- 不要全量重写

**C. `product-playbook.md`**（轻量更新）

回答：**以后再遇到类似情况，最实用的处理建议？**

每个 Play 格式：
```
## Play N：{场景标题}
### 识别信号
### 风险判断
### 推荐做法
### 推荐降级（如有）
### 不该承诺什么
```

更新规则：
- **只吸收重复出现、已相对稳定的经验**——不要把所有 failure-library 条目都写成 Play
- 新 Play 追加到文件末尾
- 已有 Play 可追加"补充"段落
- 保持薄——如果写到 10 个 Play 以上，应考虑合并或删除低价值条目

#### 三类产物边界（不要混）

| 产物 | 核心问题 | 侧重点 | 不要写的 |
|------|---------|--------|---------|
| **Failure Library** | 发生过什么？ | 失败模式枚举、证据、guardrail | 不写笼统的"注意事项" |
| **Constraints Ledger** | 什么不成立？ | 约束、证伪、长期边界 | 不写一次性 bug |
| **Playbook** | 以后怎么做？ | 操作手册、降级、检查 | 不写单个 bug 的 fix |

#### 输出本轮沉淀摘要

`_derived/product-lessons-summary-{timestamp}-{suffix}.md`，简短回答：
- 本轮新增了哪些 failure patterns（列 lesson_id）
- 本轮新增了哪些 constraints（列 C-NNN）
- playbook 是否有更新
- 哪些内容证据不足，仅为低置信度候选

---

## 产物文件位置

| 文件 | 位置 | 更新方式 |
|------|------|---------|
| `self-improve-report-{ts}-{suffix}.md` | `_derived/` | 每次新建 |
| `self-improve-collect-{ts}-{suffix}.json` | `_derived/` | 每次新建 |
| `product-failure-library.jsonl` | `_derived/` | 追加 + 按 lesson_id 去重更新 |
| `product-constraints-ledger.md` | `_derived/` | 追加条目 |
| `product-playbook.md` | `_derived/` | 轻量追加 |
| `product-lessons-summary-{ts}-{suffix}.md` | `_derived/` | 每次新建 |

---

## Input Contract

| 输入 | 来源 | 必须 |
|------|------|------|
| `mode` | 触发参数（A/B，默认 B）| 可选 |
| `task_id` | 触发参数 | Mode A 时必填 |
| Cowork sessions | `~/Library/Application Support/Hong Cowork/claude-sessions/` | 自动发现 |
| `_derived/` 现有产物 | 本地文件系统 | 自动读取 |

## Output Contract

**Mode A（单任务）**：

| 产物 | 位置 |
|------|------|
| `self-improve-report-{ts}-task-{id}.md` | `_derived/` |
| `self-improve-collect-{ts}-task-{id}.json` | `_derived/` |
| `product-lessons-summary-{ts}-task-{id}.md` | `_derived/` |
| `product-failure-library.jsonl` 更新 | `_derived/` |
| `product-constraints-ledger.md` 更新 | `_derived/` |
| `product-playbook.md` 更新（如有新稳定经验）| `_derived/` |
| `evaluation-{task_id}.yaml` | `orchestrator-state/{task_id}/monitor/` |

**Mode B（全量）**：

| 产物 | 位置 |
|------|------|
| `self-improve-report-{ts}-modeB.md` | `_derived/` |
| `self-improve-collect-{ts}-modeB.json` | `_derived/` |
| `product-lessons-summary-{ts}-modeB.md` | `_derived/` |
| `product-failure-library.jsonl` 更新 | `_derived/` |
| `product-constraints-ledger.md` 更新 | `_derived/` |
| `product-playbook.md` 更新（如有新稳定经验）| `_derived/` |
| `evaluation-*.yaml`（新 completed 任务）| `orchestrator-state/*/monitor/` |
| `regression-baseline-*.json`（仅 `--refresh-baseline`）| `_derived/` |

---

## Checklist（完成前自查）

### Step 1-2（治理复盘）
- [ ] Step 1 脚本已执行完毕，收集摘要 JSON 已读取
- [ ] 报告包含全部 4 节（结论 / 分流 / 修复建议 / follow-up）
- [ ] Findings 分流已明确区分 A/B/C 三类
- [ ] 修复建议每条均指明所在层
- [ ] Mode A 未刷新全局 baseline

### Step 3（产品经验沉淀）
- [ ] 已读取 snippets / artifacts / issues / review reports
- [ ] failure-library 更新采用追加方式（不全量重写）
- [ ] constraints-ledger 新条目有证据支撑
- [ ] playbook 只吸收稳定经验，未盲目扩充
- [ ] 产出 product-lessons-summary（列出本轮新增内容）
- [ ] 未为凑数而硬提炼——证据不足标低置信或不写
