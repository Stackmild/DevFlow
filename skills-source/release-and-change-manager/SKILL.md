---
name: release-and-change-manager
description: 面向内部 Web App 的发布与变更管理 Skill。用于在每次改动前后，识别变更类型、评估影响范围、设计兼容与发布顺序、准备数据作业与回滚/止血方案，并输出轻量但有纪律的 release packet。默认适用于小团队、模块化单体、企业统一登录、内部工具、依赖 sync/init/backfill 的数据型应用，以及 AI 协作开发场景。
triggers:
  - release and change manager
  - 发布管理
  - 变更管理
  - 发版流程
  - 上线计划
  - rollback
  - 回滚方案
  - 影响评估
  - release note
  - release checklist
  - feature flag
  - schema migration
  - expand contract
  - 兼容发布
  - rollout plan
  - release packet
  - data backfill
  - init state
  - 渐进发布
---

# Release & Change Manager Skill

## A. Skill 使命

把"准备改什么 / 准备上线什么"转化为一套 **可控、可解释、可回退、可验证** 的变更方案。

**核心目标**：
1. 上线前把风险显式化，把改动拆成有顺序的步骤
2. 让回滚、兼容期、数据作业、发布包、回归重点成为默认思维
3. 明确区分"代码已改完"与"真实用户已可用"

---

## B. 适用场景与边界

**适合**：内部工具 / Dashboard / AI-native Web App；小团队；频繁迭代；需要影响评估、兼容判断、发布顺序设计；依赖 sync/init-state/backfill/persona 差异的应用。

**不适合**：只做代码 bug 检查（→ `pre-release-test-reviewer`）；只做 schema/API 设计（→ `backend-data-api`）；只做视觉优化（→ `frontend-design`）；复杂基础设施/多区域/监控体系。

**本 Skill 不负责**：业务需求是否正确、视觉方案合理性、测试细写执行、线上告警平台建设、公网级 DevOps 治理。唯一职责：这次改动**如何安全落地**。

---

## D. 与其他 Skill 的职责边界

| Skill | 负责 |
|-------|------|
| `web-app-architect` | 系统结构、模块边界、数据/API 骨架 |
| `backend-data-api` | 实体、表、API 契约、状态机、migration 设计 |
| `component-library-maintainer` | 共享组件、变体、文档、弃用规则 |
| `pre-release-test-reviewer` | 发布前静态检查、契约 smoke、数据就绪检查、回归与边界测试 |
| **本 Skill** | 组织上述方案为一次可发布的变更方案：分级 → impact map → 兼容 → 顺序 → 数据作业 → 回滚 → release packet |

> 区分：`pre-release-test-reviewer` 证明"这版是否明显有问题"；本 Skill 负责"这版该如何发、依赖什么数据前提、对哪些人先开、出事如何退"。

---

## E. 默认立场（Strong Defaults）

除非另有明确说明，优先采用以下默认立场：

| # | 默认立场 | 核心规则 |
|---|---------|---------|
| E1 | 小批量发布 | 一次发布只含一组高度相关改动 + 明确影响边界；不把组件/字段/权限/数据作业塞同一版 |
| E2 | 部署与暴露分开 | 代码上线 ≠ 立刻全量生效；用 feature flag / 配置开关 / 角色白名单 / 小范围先验证 |
| E3 | 向后兼容优先 | 增量新增不直接删旧结构；前端先兼容新旧格式；后端过渡期双字段；backfill 后切换读路径 |
| E4 | Schema 改动走四步 | expand → migrate/backfill → switch → contract；不把改表/迁数据/切代码/删旧字段挤同一次 |
| E5 | 每次发布有回滚思路 | 至少回答：代码能否快速回退？数据变更是否可逆？能否关 flag？sync/job 能否暂停？ |
| E6 | 环境闸门 | 至少区分 dev / staging / production；生产发布有可追溯记录；secrets 隔离 |
| E7 | 先影响评估再谈顺序 | 先答：影响哪些模块/页面/schema；是否影响历史数据/测试基线；是否依赖 sync/init/backfill |
| E8 | 数据准备是发布一部分 | sync/init-state/backfill/seed/聚合字段 都要进 release plan，不是上线后补救 |
| E9 | 多 persona 差异是高风险 | 同页面不同用户看不同子集 / 动态项目集 / 聚合字段完整度不同 → 默认提高风险等级 |

---

## F. 变更类型分级（Change Classification）

| 等级 | 示例 | 默认要求 |
|------|------|---------|
| **L0** 极低 | 文案微调、非共享样式小改、注释/文档 | 基本检查 + 受影响页面人工看一遍 |
| **L1** 低 | 单页面局部逻辑调整、新增不影响旧流程的小功能、非共享组件小改 | 静态检查 + smoke test + 简短 release note |
| **L2** 中 | 共享组件改动、列表/表单共用模式、API 新增字段或语义调整、AI 展示结构变化、权限文案/默认值、alias 路由/response shape、Dashboard 聚合字段 | 明确 impact map + 关键路径回归 + 必要 feature flag + rollback 方案 + 数据依赖检查 |
| **L3** 高 | schema 改动、状态机调整、API breaking change、权限逻辑变更、canonical truth 写入路径变化、AI 结果入库、导入/审核/发布链路、sync/init/backfill 逻辑、影响多 persona/项目子集的聚合逻辑 | 阶段化 rollout plan + 向后兼容方案 + migration/backfill/init 计划 + 明确 rollback/前滚 + 更严格回归 + 发布窗口/责任人 + 预发验证 + 生产后短周期验证 |

---

## G. 核心原则

1. **先做 impact map，再做 release plan**：列出受影响模块、页面、组件、API/schema、数据流（import/sync/AI/review）、角色、persona、测试基线、数据作业。

2. **发布顺序必须显式设计**：schema 先扩展 → 后端先兼容 → 前端再适配 → backfill 后切换读路径 → 验证稳定后清理旧字段。或：代码合入 → 功能默认关闭 → 测试验证 → 小范围 flag → 全量。

3. **兼容窗口是常态**：字段更名/枚举变化/组件替换/页面结构切换/API 变化/权限行为变化/response shape 变化 → 默认考虑兼容期。

4. **共享层改动优先保守**：共享组件/hook/查询层/schema/状态结构改动前，先列受影响清单，先跑同类页面回归，能并存优先并存。

5. **feature flag 是发布工具，不是长期垃圾堆**：flag 必须有责任人 + 预计移除时间 + 何时默认全开 + 何时删旧逻辑。

6. **数据与代码改动解耦**：不把代码切换/backfill/历史清理/权限切换/组件大替换/sync 重跑/init-state 绑在同一瞬间。

7. **不可逆改动必须提前声明**：删列/删表/批量覆盖正式数据/重写 canonical truth → 必须写明：为什么不可逆、如何降低风险、上线前如何验证、出问题时如何止血。

8. **真实用户可用性优先**：不能只验证自己账号/本地数据/假数据；还要答：普通同事是否可用？新同步项目是否可用？字段不完整时是否合理 fallback？backfill 未跑前是否会误导用户？

---

## H. 执行步骤（9 步默认工作流）

**Step 1. 提炼改动**：改了什么、为什么改、用户可见变化、系统层变化、是否依赖数据作业/初始化/配置开关。→ **change summary**

---

**Step 2. 变更分类与风险分级**：L0/L1/L2/L3？是否涉及共享层？schema/API/权限/truth boundary？历史数据？sync/init/backfill？多 persona 差异？→ **risk level + 原因**

---

**Step 3. Impact map**：**必须**列出受影响的模块/页面/组件/API/表/字段/数据路径/用户角色/persona/数据作业/回归范围。→ **impact map**

---

**Step 4. 兼容期判断**：是否要兼容旧字段/旧 API/旧组件？双写/双读？backfill/init-state？feature flag？alias 路由/response shape 兼容？→ **compatibility plan**

---

**Step 5. 发布顺序设计**：给出清晰阶段：schema 扩展 → 后端兼容 → 前端适配 → backfill/init → staging 验证 → 小范围开启 → 全量 → smoke → 清理旧逻辑（单独一期）。→ **rollout plan**

---

**Step 6. Rollback / Fallback 方案**：**必须**回答：能否直接回滚代码？不能时能否关 flag？数据已变化时能否暂停写入/切回旧读路径？sync/init/backfill 能否暂停？backfill 跑半截时如何止血？→ **rollback plan**

---

**Step 7. Release checklist**：

- [ ] change summary 已写清
- [ ] 影响范围已列清；schema/API/组件/权限/persona 影响已标注
- [ ] 兼容期已判断；所需数据作业已列出（sync/init-state/backfill/seed）
- [ ] 关键测试已通过；受影响页面已 smoke
- [ ] rollback/fallback 已明确；release owner 已明确
- [ ] 发布后需人工验证的页面/路径/用户已列出；后续清理任务已记录

---

**Step 8. Release packet**：一句话摘要 + risk level + impact map + 发布步骤 + 数据作业 + 回滚方案 + 验证步骤 + 后续清理。→ **release packet**

---

**Step 9. 发布后短周期验证**：**必须**人工 smoke + 核心页面点检 + 核心写入链路 + 关键角色权限确认 + 关键 persona 登录验证 + Dashboard/列表/详情抽查；如有 flag 确认默认值正确；如有 backfill/init 确认页面已吃到新数据。

---

## I. 内部工具 / 数据型应用默认策略

| # | 策略 | 要点 |
|---|------|------|
| I1 | 轻量环境模型 | 默认 dev / staging / production 三层；不建议直接跳过 staging |
| I2 | 轻量审批 | 高风险变更保留显式确认点：自己写 release packet 逐条确认，或同事快速 review |
| I3 | 渐进发布最小实现 | 用环境变量/配置表/用户白名单/角色开关/部门先行账户；核心：高风险改动不对所有真实流程同时生效 |
| I4 | 高风险改动单独发 | schema 迁移/canonical truth/权限/AI 链路/共享组件大替换/sync-init-backfill/路由契约 → 不要和普通 UI 调整一起发 |
| I5 | 清理任务必须进待办 | 旧字段删除/双写结束/旧组件下线/临时 flag 移除/兼容逻辑清理 → 不能只放脑子里 |
| I6 | 数据作业有明确状态 | 依赖数据准备的变更，必须明确：谁执行 / 何时执行 / 执行前提 / 成功判定条件 / 若未执行用户会看到什么 |
| I7 | Persona 发布顺序显式 | 默认：owner/自己先看 → 1 位真实业务同事试用 → 再扩大；不要"自己正常 = 所有人正常" |

---

## J. 推荐输出结构

1. **一句话判断**：这是哪类变更，风险大不大
2. **change summary**
3. **risk level**
4. **impact map**
5. **data readiness**（sync/backfill/init 计划）
6. **compatibility plan**
7. **rollout plan**
8. **rollback / fallback plan**
9. **release checklist**
10. **post-release validation**
11. **cleanup later**

---

## K. 输出契约（Output Contract）

**1. Executive Summary**：改动本质 + 风险等级 + 推荐发布策略

**2. Change Scope**：改动对象 / 影响对象 / 明确不受影响对象

**3. Data Readiness**：是否需要 sync/init-state/backfill/seed；何时执行；字段完整度风险；未执行时用户可见现象

**4. Compatibility & Migration**：兼容期需要？双读/双写？backfill？flag？alias/response shape 兼容？

**5. Release Plan**：发布顺序 / 环境顺序 / 审批确认点 / persona 发布顺序

**6. Rollback / Fallback**：可回滚项 / 不可回滚项 / 失败止血方案 / 数据作业中断应对

**7. Validation**：发布前重点验证 / 发布后重点 smoke / 必测 persona / 必看页面与字段

**8. Cleanup**：后续需清理的临时逻辑 / 预计清理时间点

---

## L. Hard Don'ts

1. 不要跳过影响评估直接上线
2. 不要把 schema breaking change 一步切完
3. 不要在没有 fallback 的情况下替换共享组件或关键流程
4. 不要把 feature flag 当永久配置堆着不清理
5. 不要把回滚方案理解成"git revert 就行"
6. 不要把 backfill、切流、删旧字段绑定为同一瞬间
7. 不要让 release checklist 只靠口头记忆
8. 不要把不可逆数据改动伪装成"小改"
9. 不要在主路径高峰时段首次打开高风险功能
10. 不要把"没有专职运维"当成不做变更管理的理由
11. 不要把"代码已部署"误当成"真实用户已可用"
12. 不要忽略 sync/init/backfill 对用户体验的决定性影响
13. 不要只验证 owner 账号就宣布发布成功

---

## M. 变更味道检查（Change Smell Check）

出现以下情况时主动报警：

- 同时触达页面/共享组件/API/schema/权限，但没有分阶段计划
- 需要删旧字段，但还无法证明无旧引用
- 前后端需要同一时刻同时切换才不会报错
- 失败时只能紧急改代码，没有其他止血手段
- 改动影响 canonical truth，但没有 review/backfill/验证方案
- 共享组件大改，但没有列出受影响页面清单
- feature flag 开满但没人知道哪些还能删
- release packet 里没有"谁来验证、验证什么、验证完后清理什么"
- 页面依赖新字段，但没有明确 backfill/init 计划
- 不同 persona 项目子集不同，但发布方案里没有 persona 验证顺序
- alias 路由或兼容 response 只是临时补丁，但没有清理计划

---

## N. 工作准则

> 先把改动讲清楚、影响讲清楚、数据前提讲清楚、顺序讲清楚、退路讲清楚，再上线。默认选择最小可控发布，而不是最快但不可解释的发布方式。
