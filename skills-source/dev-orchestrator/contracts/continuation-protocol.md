# Gate 3 Continuation Protocol

> Gate 3 ACCEPT 后用户请求额外工作时的五条正式路径 + multi-item 处理协议。
> orchestrator **不可**在 Gate 3 后默认进入无结构化的 ad-hoc 工作模式。
> 如果用户请求工作且 orchestrator 不确定走哪条路径 → 展示五选项，由用户选择。
> 如果用户一条消息包含多个独立请求 → 走 Multi-Item 处理协议（§Multi-Item 处理协议）。

---

## 触发条件

当以下全部为真时，本协议启动：
1. `decisions/gate-3.yaml`（或兼容旧 `gate-b.yaml`）存在且 decision = ACCEPT
2. 用户在 Gate 3 ACCEPT 后请求额外工作（修复、改进、新增功能等）

---

## Pre-Action Check（V4.3 硬门槛 — 铁律 #15）

⚠️ **此检查在 Gate 3 ACCEPT 后、任何推进工作的写操作前必须执行。不通过则 HALT。**

### 何时触发

Gate 3 ACCEPT 后，orchestrator 收到任何用户指令（无论大小），在执行任何写操作前。

### 禁止对象清单

在 continuation decision 形成前，以下对象 **全部不允许写入/修改**：

| 对象 | 路径 | 说明 |
|------|------|------|
| 代码文件 | `src/` | 任何源代码 |
| Artifacts | `artifacts/` | 任何 artifact 文件 |
| Handoffs | `handoffs/` | 任何 handoff packet |
| Issues | `issues/` | 任何 issue / risk / override |
| Decisions | `decisions/`（除 `continuation-{seq}.yaml`） | continuation decision 本身除外 |
| Automation / Config | automation prompt / 配置文件 | 任何配置变更 |
| External side-effects | 脚本执行、API 调用、数据修复 | 任何外部副作用 |

**唯一允许的写操作**：`decisions/continuation-{seq}.yaml` + `events.jsonl` 中的 `continuation_initiated` 事件。

### 检查步骤

1. 读取 `decisions/gate-3.yaml`（或兼容旧 `gate-b.yaml`），确认 decision = ACCEPT
2. 判断用户指令是否涉及上述禁止对象的写操作
   - 不涉及（纯问答 / 说明 / 信息查询）→ PASS → 正常回答
   - 涉及 → 进入步骤 2.5
2.5 **Multi-Item 检测**：判断用户消息是否包含 ≥2 个独立请求
   - 独立请求 = 可以单独执行、不依赖其他请求的改动/需求/操作
   - 如只有 1 个请求 → 走**单项流程**（step 3-5）
   - 如 ≥2 个 → 走**Multi-Item 流程**（step 3M-6M，见下方 §Multi-Item 处理协议）
3. 生成 scope delta 摘要（新请求 vs `artifacts/implementation-scope.md`）
4. **以固定模板输出 Pre-Action Check 结果**（见下方单项模板）
5. 等待用户选择 → 走对应 Path

### 单项模板（1 个请求时使用）

Pre-Action Check 结果 **必须以以下固定格式输出**（不允许弱提示式 / 省略式 / 内部推理式输出）：

```
## ⚠️ Gate 3 后续工作检测

**检测结果**：Gate 3 已 ACCEPT，检测到后续工作请求。
**新请求**：{用户请求描述}
**Scope Delta**：
- 原始 scope（implementation-scope.md）：{范围摘要}
- 新请求涉及：{受影响的 artifacts / files / modules}
- 差异判定：{scope 内 / scope 外 / 环境配置 / 纯外部操作 / 新模块 / 新数据模型}

**分类判定**：{RE-ENTER / FOLLOW-UP / LIGHT-PATCH / NON-CODE-ACTION / DEFER}
**分类依据**：{一句话说明为什么是这个分类}

**请选择处理方式：**
**[RE-ENTER]** 在当前任务内修复（功能逻辑 / UI / 交互 / 需 reviewer 的变更）
**[FOLLOW-UP]** 创建新任务（范围扩大 / 明显新需求）
**[LIGHT-PATCH]** 环境配置修复（修改仓库内配置文件，不涉及功能逻辑）
**[NON-CODE-ACTION]** 非代码操作（不修改仓库文件，但产生外部效果：数据刷新/抓取/automation）
**[DEFER]** 记录并暂不处理

**当前建议**：{分类} — 原因：{一句话}
```

### 铁律 #15 违规判定

如果以下条件同时为真 → 违反铁律 #15 → state-auditor CHECK-14 标记 Critical：
- `decisions/gate-3.yaml`（或 `gate-b.yaml`）存在且 decision = ACCEPT
- 禁止对象中有新增/修改的文件
- `decisions/continuation-*.yaml` 不存在

---

## Multi-Item 处理协议（V4.4 新增）

当用户一条消息包含 **≥2 个独立请求**且属于不同分类时，走以下流程（替代单项 step 3-5）：

### 分类判断树

```
① 是否修改代码仓库中的文件（src/ / config / yaml / env）？
   → 是 + scope 内 → RE-ENTER
   → 是 + scope 外 → FOLLOW-UP
   → 是 + 纯配置常量/路径/端口 → LIGHT-PATCH
② 不修改仓库文件，但有外部效果（数据写入/抓取/automation）？
   → 是 → NON-CODE-ACTION
③ 以上都不是 / 用户说暂不做？
   → DEFER
```

### Step 3M：逐条分类

对每个独立请求生成 item 记录：

| item_id | 请求摘要 | 分类 | 分类理由 |
|---------|---------|------|---------|

分类枚举（5 类）：
- **RE-ENTER**：scope 内代码/功能变更
- **FOLLOW-UP**：scope 外新功能/新模块
- **LIGHT-PATCH**：环境配置修复（修改仓库内配置文件，不涉及功能逻辑）
- **NON-CODE-ACTION**：纯外部操作（不修改仓库内任何文件，但产生外部效果）
- **DEFER**：延后/接受风险

### Step 4M：Multi-Item 模板输出

```
## ⚠️ Gate 3 后续工作检测（{N} 项请求）

**检测结果**：Gate 3 已 ACCEPT，检测到 {N} 项后续工作请求。

### Item 分类

| # | 请求 | 分类 | 理由 |
|---|------|------|------|
| 1 | {摘要} | RE-ENTER | {理由} |
| 2 | {摘要} | FOLLOW-UP | {理由} |
| 3 | {摘要} | NON-CODE-ACTION | {理由} |
| ... | ... | ... | ... |

### 按分类分组

**RE-ENTER（{N} 项）**：
{列表}
→ 建议在当前任务内合并修复

**FOLLOW-UP（{N} 项）**：
{列表}
→ 建议创建新任务

**NON-CODE-ACTION（{N} 项）**：
{列表}
→ 可直接执行，需记录到 continuation decision

**DEFER（{N} 项）**：
{列表}
→ 记录并暂不处理

请逐组确认处理方式（可调整单个 item 的分类）。
```

### Step 5M：用户逐组确认

用户可以：
- 按组确认（"A 组 RE-ENTER，B 组 FOLLOW-UP，其余 DEFER"）
- 组内拆分（调整单个 item 的分类）
- 明确 defer 或 dismiss

### Step 5M.1：部分确认处置

如用户只回应了部分组（如确认了 RE-ENTER 和 FOLLOW-UP，但未提及其他组）：
- 已确认组 → 立即按对应 path 执行
- 未回应组 → 全部 items 的 resolution 设为 `deferred`，写入 `issues/deferred-item-*.yaml`
- 不阻塞已确认组的执行，不等待全部组确认完毕
- **"未回应"定义**：当前用户交互轮次内未明确 confirm 的项 = 未回应
- 原则：**部分确认 > 全部等待**

### Step 6M：写入 Item Resolution Table

写入 `decisions/continuation-{seq}.yaml` 中的 `items` 字段。所有 item 必须有 resolution。

### Multi-Item Continuation Decision Schema

```yaml
# decisions/continuation-{seq}.yaml（multi-item 版）
continuation_id: "continuation-{seq}"
type: multi_item
trigger: "{用户原始消息摘要}"
item_count: {N}
created_at: "ISO 8601"

items:
  - item_id: "c{seq}-1"              # 格式: c{continuation_seq}-{N}
    request: "{请求摘要}"
    classification: re_enter          # re_enter | follow_up | light_patch | non_code_action | defer
    user_decision: re_enter           # 用户最终确认（可能与 classification 不同）
    resolution: pending               # pending | in_progress | completed | deferred | dismissed
    state_refs:                       # 数组，一个 item 可能关联多个 state 对象
      - "handoffs/handoff-D1-fsd-002.yaml"
    prior_item_ref: ""                # 如引用前序 continuation 中的 item，填入原 item_id
    dismiss_evidence:                  # 仅当 resolution=dismissed 时必填
      source: "user_reply"             # user_reply | user_original_message
      quote: "{用户原话}"               # 必须是用户的直接引用，不是 orchestrator 的推断

re_enter_scope: "{合并后的 RE-ENTER 修改范围}"

non_code_actions:
  - action_id: "nca-1"
    description: "{操作描述}"
    affects_data: true | false
    result: "{操作结果摘要}"
    executed_at: "ISO 8601"
```

### Item Resolution 关键规则

- 每个 item 必须有 `resolution` 字段——不允许 `resolution` 为空
- 没有 `resolution` 的 item = **协议违规**
- state-auditor 可通过检查 `items[].resolution` 验证所有 item 有去向
- `dismissed` 必须提供 `dismiss_evidence`（含 source + quote）。orchestrator 不能自行推断 dismissed——必须引用用户原话
- `dismiss_evidence.quote` 为空或为 orchestrator 推断文本（如"用户说其余不管，推断为 dismissed"）= **协议违规**，state-auditor CHECK-19 E 项标记 anomaly

### item_id 稳定延续规则

- `item_id` 格式为 `c{continuation_seq}-{N}`（如 `c003-1`、`c003-2`），continuation_seq 取自全局 continuation 流水号
- **任务生命周期内不变**：item_id 一旦生成，在整个 task 的生命周期内不重新分配，即使触发新 continuation 也不变
- 后续所有引用该 item 的 state 对象（follow-up task.yaml、issues/deferred-item-*.yaml、handoff-packet、change-package）**必须沿用同一个 item_id**
- 新 continuation 引用旧 item 时，使用 `prior_item_ref: "{item_id}"` 字段关联，不重新编号

### 未处理 Item 落盘规则（V4.4 硬规则）

Multi-item continuation 中，所有 item 必须有以下去向之一：

| resolution | 含义 | 落盘位置 |
|------------|------|---------|
| `in_progress` / `completed` | 正在处理或已处理 | 对应 path 的 state 对象 |
| `deferred` | 用户选择延后 / 未回应（默认） | `issues/deferred-item-{seq}.yaml` |
| `dismissed` | 用户**明确说**"不用管/不需要" | continuation decision 的 items[] 中记录即可 |

### 未回应 Item 默认处置规则

> 用户没有明确回应 ≠ 用户明确说"不处理"。

| 用户行为 | 默认 resolution |
|---------|----------------|
| 用户明确说"不用管了/不需要/skip this" | `dismissed` |
| 用户没有选择 / 没有回应 / 被后续消息覆盖 | **`deferred`**（默认） |

**禁止**：把"用户没回"直接记为 `dismissed`。未回应的 item 默认进入 `deferred`。

### 模糊表达判定示例（V4.4.1）

| 用户表达 | 判定 | 理由 |
|---------|------|------|
| "这个不用了" / "不需要" / "skip this" / "删掉这个" | `dismissed` | 明确否定，指向特定 item |
| "其余不管" / "其他先不做" / "剩下的以后再说" | **`deferred`** | 整体性模糊表达，未逐条确认 |
| "先不管" / "暂时不做" / "先放着" | **`deferred`** | "先/暂时"= 时间限定，倾向延后而非放弃 |
| "以后再看" / "回头再说" / "下次再处理" | **`deferred`** | 明确表达了"未来会回来"的意图 |
| "算了" / "先这样吧" | **`deferred`** | 模糊放弃，安全默认为延后 |
| 完全没提到某个 item | **`deferred`** | 未回应 = 默认延后 |

⚠️ **dismissed 判定两条硬规则**：

1. **指向性规则**：只有用户**对特定 item 说出否定词**（"不用/不需要/不要/skip/删掉"）才允许 `dismissed`。整体性表达（"其余/剩下/其他"+ "不管/不做/以后再说"）一律 `deferred`。

2. **证据规则**：`dismissed` 必须提供 `dismiss_evidence` 字段（见 schema），包含用户原话引用。无法提供引用 = 不允许标记 `dismissed`，默认 `deferred`。

### classification 与 resolution 的保护规则

如果 orchestrator 在 Step 3M 中已将某 item 的 `classification` 标记为 `defer`（基于用户原始消息），则：
- 后续用户确认回复中的模糊表达（如"其余不管"）**不得将该 item 的 resolution 升级为 dismissed**
- 原始 classification=defer 的 item，resolution 只能是 `deferred` 或 `in_progress`（如用户改主意要做）
- 理由：用户原始消息中的"先不管"已经是明确的 defer 意图，不应被后续模糊表达覆盖

⚠️ **"标注了但不追踪" = 协议失败。** item 只出现在展示模板的文字中，但没有进入 `items[]` 字段 = state-auditor CHECK-19 标记 High anomaly。

### `issues/deferred-item-{seq}.yaml` Schema

```yaml
object_family: deferred_item
item_id: "{对应 continuation items[].item_id}"
continuation_ref: "continuation-{seq}"
request: "{原始请求摘要}"
original_classification: "{orchestrator 初始分类}"
deferred_reason: "{用户说了什么 / 为什么延后}"
created_at: "ISO 8601"
```

---

## ⚠️ Continuation 不应降低 contract 强度（V4.3 总原则）

RE-ENTER D 默认要求与首轮 D 阶段**相同级别**的核心 contract：
- **change-package**（revision_seq 递增，schema 同级，不可因 scope 小而省略）
- **reviewer handoff**（含 change_package_ref + expected_consumption，不分轻量/完整）
- **review artifact**（结构化 YAML report）
- **Gate 3 decision**（7 字段完整）

除非未来单独设计并批准"轻量 continuation protocol"，否则**不得自动降级**。
"scope 小"、"只改两行"、"续行轮次"都不是降级理由。

---

## Path 1: RE-ENTER D（同 task，小修复）

### 准入条件

- 修复涉及的文件全部在 `artifacts/implementation-scope.md` 的 scope 定义中
- 不引入新依赖或新数据模型
- 不涉及新模块（当前代码库中不存在的功能模块）

### 执行步骤

1. 写入 `decisions/continuation-{seq}.yaml`:
   ```yaml
   continuation_id: "continuation-{seq}"
   type: re_enter_d
   trigger: "{用户请求描述}"
   rationale: "{为什么判定为 re-enter 而非 follow-up}"
   scope: "{修改范围}"
   scope_delta: "{与 implementation-scope.md 原始 scope 的差异}"
   created_at: "ISO 8601"
   ```
2. events.jsonl 写入 `continuation_initiated` 事件（continuation_type: re_enter_d）
3. task.yaml 更新：
   - current_phase → phase_d_1
   - current_focus → "re-enter D: {修复描述}"
4. **⚠️ MANDATORY**: change-package revision_seq 递增（如原来是 0 → 新 package 为 1）。
   **这是 blocking gate**：`change-package-{new_seq}.yaml` 不存在于 artifacts/ = D.1 Exit FAIL，禁止进入 D.2。
   此规则与首轮 D.1 Exit 完全同级，不可因 scope 小、续行轮次、改动简单而省略。
5. 构造新 handoff-packet → `handoffs/handoff-D1-fsd-{new_seq}.yaml`
   - supersedes_handoff_id 指向前序最后一个 D.1 packet
   - open_issues 包含触发本次修复的 finding / user request
6. Re-enter D.1 → FSD spawn → change-package 产出
7. **⚠️ MANDATORY**: D.2 必须生成 reviewer handoff packet（`handoff-D2-{reviewer}-{new_seq}.yaml`），与首轮同级。
   handoff 不存在 = reviewer 不 spawn。此规则不分首轮/续行/轻量/完整。
8. D.2 review cycle 适用：
   - 如修复在 implementation-scope.md scope 内且无 schema 变更 → code-reviewer only（轻量）
   - 否则 → 正常 reviewer selector
8. D.3 Gate 3 重新展示：
   - 如 scope 小（code-reviewer only）→ 可快速确认
   - 否则 → 完整 Gate 3 展示

### 退出条件

Gate 3 再次 ACCEPT → 进入 Phase F（或再次续行）。

---

## Path 2: FOLLOW-UP TASK（scope 扩展）

### 准入条件

满足以下任一：
- 新请求涉及新数据模型
- 新请求涉及新模块（当前代码库中不存在）
- scope 超出 `artifacts/implementation-scope.md` 定义的范围
- 新请求的验收标准与原任务不重叠

### 执行步骤

1. 写入 `decisions/continuation-{seq}.yaml`:
   ```yaml
   continuation_id: "continuation-{seq}"
   type: follow_up
   trigger: "{用户请求描述}"
   rationale: "{为什么判定为 follow-up 而非 re-enter}"
   new_scope: "{新请求的大致范围}"
   original_task_id: "{当前 task_id}"
   created_at: "ISO 8601"
   ```
2. events.jsonl 写入 `continuation_initiated` 事件（continuation_type: follow_up_task）
3. 当前任务进入 Phase F closeout：
   - task.yaml known_gaps 追加：`"follow-up task pending: {新请求描述}"`
   - 正常执行 F.1-F.4
   - task.yaml status → completed
4. 创建新 task_id 在 orchestrator-state/：
   - 新 task.yaml 初始化
   - 新 task.yaml 中 `notes` 引用原始 task_id（"continuation of {original_task_id}"）
5. 新任务从 Phase A 开始（完整流程）

### 退出条件

当前任务：Phase F 完成 → status=completed。
新任务：进入独立生命周期。

---

## Path 3: RECORD AND STOP（延后/接受风险）

### 准入条件

满足以下任一：
- 用户说 "not now" / "later" / "暂时不做"
- 用户明确接受风险（"这个问题先不管"）
- 问题被评估为低优先级

### 执行步骤

1. 根据情况写入：
   - 延后修复 → `issues/risk-{seq}.yaml`（object_family: risk, type: deferred_fix）
   - 接受风险 → `issues/override-{seq}.yaml`（object_family: override, type: human_override）
2. 写入 `decisions/continuation-{seq}.yaml`:
   ```yaml
   continuation_id: "continuation-{seq}"
   type: record_and_stop
   trigger: "{用户请求描述}"
   disposition: deferred | accepted_risk
   risk_record: "issues/{family}-{seq}.yaml"
   created_at: "ISO 8601"
   ```
3. events.jsonl 写入 `continuation_initiated` 事件（continuation_type: record_and_stop）
4. 当前任务进入 Phase F closeout：
   - task.yaml known_gaps 追加延后项
   - 正常执行 F.1-F.4
   - task.yaml status → completed

### 退出条件

Phase F 完成 → status=completed。延后项记录在 known_gaps 中。

---

## Path 4: LIGHT POST-GATE PATCH（环境配置修复）

### 准入条件

满足以下全部：
- 变更仅涉及配置常量、路径、端口、依赖版本等运行环境参数
- 不涉及功能逻辑（业务代码、UI 渲染、数据处理、API 行为）
- 不涉及新模块或新依赖引入

### 典型场景

- STATE_DIR / BASE_URL / PORT 等路径或端口修正
- package.json 依赖版本锁定
- 环境变量默认值调整
- 部署配置文件修正

### 执行步骤

1. 写入 `decisions/continuation-{seq}.yaml`:
   ```yaml
   continuation_id: "continuation-{seq}"
   type: light_patch
   trigger: "{用户请求描述}"
   rationale: "环境配置修复，不涉及功能逻辑"
   affected_files: ["{文件路径}"]
   change_description: "{一句话描述}"
   created_at: "ISO 8601"
   ```
2. events.jsonl 写入 `continuation_initiated` 事件（continuation_type: light_patch）
3. 执行修改（限定于 continuation decision 中声明的 affected_files）
4. 写入极简变更记录到 `artifacts/patch-note-{seq}.yaml`:
   ```yaml
   patch_id: "patch-{seq}"
   continuation_ref: "continuation-{seq}"
   files_touched:
     - path: "{文件路径}"
       change_type: modified
       change_description: "{一句话}"
   functional_logic_changed: false
   ```
5. 不要求 reviewer handoff 或 Gate 3 重新展示
6. 当前任务可正常进入 Phase F

### 关键约束

- LIGHT-PATCH **不是无痕通道**——必须有 continuation decision + event + patch-note
- **硬升级条件**：只要修改会影响业务逻辑判断、渲染逻辑、数据处理逻辑、API 行为，或超出 continuation decision 中声明的 `affected_files`，就**不得**走 LIGHT POST-GATE PATCH，必须升级为 RE-ENTER D。"看起来很小"不是走轻量路径的充分条件——判定标准是**功能语义是否不变**。
- 如果修改过程中发现涉及功能逻辑 → 立即停止，升级为 RE-ENTER D
- state-auditor CHECK-14 会检查：gate-3.yaml ACCEPT 后是否有代码文件变更但无 continuation decision

---

## Path 5: NON-CODE-ACTION（非代码操作）

### 准入条件

满足以下全部：
- 不涉及项目代码文件的变更（不改 src/、不改 artifacts/、不改配置文件）
- 但会产生可观测的外部效果（数据写入、内容抓取、automation 触发、API 调用等）

### 典型场景

- 用 Cowork 原生能力抓取内容并写入数据库
- 手动触发 automation
- 执行数据刷新/同步命令
- 查询并修复数据库状态

### 执行步骤

1. 在 continuation decision 的 `non_code_actions` 字段中记录（如 multi-item，已在 items[] 中标注）
2. events.jsonl 写入 `continuation_initiated` 事件（continuation_type: non_code_action）
3. 执行操作
4. 在 `non_code_actions[].result` 中记录操作结果摘要

### 关键约束

- NON-CODE-ACTION 不需要 change-package 或 reviewer
- 但**必须有 continuation decision 记录 + canonical event**
- **硬升级条件**：只要 NON-CODE-ACTION 在执行中发现以下任一情况，必须**立即停止**并升级为 RE-ENTER D：
  - 需要改项目代码或配置文件
  - 需要新的 handoff 才能说明上下文
  - 会改变产品功能逻辑 / 数据处理逻辑 / API 行为
  不得继续按 NON-CODE-ACTION 处理。此规则与 LIGHT-PATCH 的硬升级条件同级。
- 如果操作影响了用户可见的产品数据状态，`affects_data` 必须为 `true`

---

## 默认行为

如用户在 Gate 3 后请求额外工作，orchestrator 不确定走哪条路径 → **必须先展示 scope delta 摘要 + 五选项**：

```
## Gate 3 后续工作确认

**Scope Delta 摘要**：
- 原始 scope（implementation-scope.md）：{原始范围}
- 新请求：{新工作描述}
- 差异：{超出/在内/环境配置/新模块/新数据模型}

**请选择处理方式：**
**[RE-ENTER]** 在当前任务内修复（适用于：scope 内改动，功能逻辑变更）
**[FOLLOW-UP]** 创建新任务（适用于：scope 扩展、新模块、新数据模型）
**[LIGHT-PATCH]** 环境配置修复（适用于：修改仓库内配置文件，不涉及功能逻辑）
**[NON-CODE-ACTION]** 非代码操作（适用于：不修改仓库文件，但产生外部效果）
**[DEFER]** 记录并暂不处理（适用于：低优先级、接受风险）
```

⚠️ **不可默认走 ad-hoc 模式**。如果 orchestrator 在 Gate 3 后直接开始写代码或修改文件，而没有走上述五条路径之一 → 违反续行协议 → state-auditor CHECK-14 会标记为 Critical anomaly。

⚠️ **Anti-Rationalization 条款（V4.3 新增）**：orchestrator 不得以以下任何理由跳过 Pre-Action Check：
- "任务小 / 改动很简单"
- "显而易见不需要走协议"
- "用户已隐含同意"
- "只是顺手改一下"
- "不涉及核心逻辑"

**所有 rationalization 视为 bypass 行为**，等同于未执行 Pre-Action Check。
