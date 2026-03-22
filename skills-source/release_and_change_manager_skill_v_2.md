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

本 Skill 负责把“准备改什么 / 准备上线什么”转化为一套 **可控、可解释、可回退、可验证** 的变更方案。

它不是为了制造流程感，而是为了避免这些常见问题：

- 改了一个字段，结果打坏多个页面
- 改了一个共享组件，结果同类页面布局全部偏移
- 后端 schema 改了，但前端还在读旧字段
- AI 生成代码能跑，但发布顺序不对，导致中间态不可用
- 数据迁移和代码切换挤在同一次上线里，出问题后难以回滚
- 路由 alias、response shape、字段名没有收口，测试时漏过，线上才暴露
- 代码逻辑正确，但 sync / init-state / backfill 没跑，导致真实用户看到的是空白、未分类或缺字段页面
- 不同用户看到的是同一系统，但因为项目子集、字段完整度、状态初始化不同，页面表现完全不一样

本 Skill 的目标是：

1. 在上线前，把风险显式化，而不是靠运气上线
2. 把“改动”拆成有顺序的步骤，而不是一次性硬切
3. 让回滚、兼容期、数据作业、发布包、回归重点成为默认思维
4. 让小团队也能用轻量方式保持发布纪律
5. 让 AI 协作开发下的频繁改动不把系统越做越乱
6. 把“代码已改完”与“真实用户已可用”明确区分开

---

## B. 适用场景

### 适合

- 内部工具 / 管理后台 / Dashboard / AI-native Web App
- 小团队或 solo builder
- 模块化单体为主，偶尔带 worker / job
- 频繁迭代页面、组件、数据结构、AI 工作流
- 需要在上线前做影响评估、兼容判断、发布顺序设计
- 需要输出简洁但可靠的 release checklist / release note / rollback plan
- 依赖 sync / init-state / backfill / 聚合字段 / persona 差异的应用

### 不适合

- 只需要代码层面 bug 检查（应交给 `pre-release-test-reviewer`）
- 只需要数据库表设计或 API 设计（应交给 `backend-data-api`）
- 只需要页面视觉优化（应交给 `frontend-design`）
- 只需要高阶基础设施/多区域/复杂流量治理方案
- 只需要线上监控体系或性能分析体系

---

## C. 这个 Skill 不负责什么

本 Skill **不负责**：

- 业务需求本身是否正确
- 页面交互与视觉方案本身是否合理
- 具体测试用例细写与执行细节
- 线上告警平台、APM、日志平台建设
- 公网级别的 DevOps 平台治理

它主要回答的是：

> 这次改动该如何安全落地？要分几步？会影响哪里？需要先跑哪些数据作业？失败后如何退？上线后如何用最少步骤确认真实用户可用？

---

## D. 与其他 Skill 的职责边界

### `web-app-architect`
负责系统结构、模块边界、数据/API 骨架。

### `backend-data-api`
负责实体、表、API 契约、状态机、真相层和 migration 设计。

### `component-library-maintainer`
负责共享组件、变体、文档、弃用规则。

### `pre-release-test-reviewer`
负责发布前的静态检查、契约 smoke、数据就绪检查、persona matrix、关键路径测试、回归与边界测试。

### 本 Skill
负责把上述方案组织成一次 **可发布的变更方案**：

- 变更分级
- 影响范围评估
- 兼容与切换顺序
- 数据作业与依赖前置条件
- 环境与确认点
- 回滚 / 止血方案
- 发布后短周期验证
- release packet

一句话区分：

> `pre-release-test-reviewer` 证明“这版是否明显有问题”；`release-and-change-manager` 负责“这版该如何发、依赖什么数据前提、对哪些人先开、出事如何退”。

---

## E. 默认立场（Strong Defaults）

除非用户明确说明相反约束，否则优先采用以下默认立场：

### E1. 默认小批量发布，不做“大包上线”

一次发布尽量只包含：

- 一组高度相关的改动
- 明确的影响边界
- 明确的回归范围

避免把组件改动、字段改动、权限改动、AI 工作流改动、页面改动、数据作业全部塞进一个大版本。

### E2. 默认“部署”与“暴露”分开

代码上线不等于立刻对所有用户/流程生效。

如有必要，使用：

- feature flag
- 配置开关
- 角色白名单
- 部门内先行试用
- 自己/小范围账户先验证

对于小团队内部工具，这里的“渐进发布”不一定是复杂灰度；很多时候只需要做到：

- 先对自己可见
- 再对 1–2 个真实使用者可见
- 最后默认开放

### E3. 默认优先向后兼容，而不是一步 breaking change

任何会影响旧页面、旧字段、旧接口、旧数据的改动，都优先考虑：

- 增量新增，而不是直接删除旧结构
- 前端先兼容新旧格式
- 后端在过渡期同时提供旧字段/新字段
- 数据先 backfill，再切换读路径
- 验证完成后再清理旧结构

### E4. 数据库改动默认走 expand → migrate/backfill → switch → contract

对正在使用的 schema：

1. 先扩展 schema
2. 让代码兼容新旧结构
3. 执行 backfill / 数据迁移
4. 切换读写路径
5. 验证稳定
6. 再删除旧结构

不要把“改表、迁数据、切代码、删旧字段”挤在同一次动作里。

### E5. 默认每次发布都要有回滚思路

不是所有改动都能完全回滚，但每次发布都必须至少回答：

- 代码能否快速回退？
- 数据变更是否可逆？若不可逆，如何降低风险？
- 是否能通过关闭 flag / 配置开关快速止血？
- 是否能暂停某类 job / sync / 写入？
- 如果只能前滚修复，前滚步骤是什么？

### E6. 默认用环境闸门，而不是直接推生产

至少区分：

- development
- staging / preview
- production

对 production：

- 尽量要求显式批准或自检确认
- 生产 secrets 与非生产 secrets 分离
- 生产发布应有可追溯记录

### E7. 默认先做影响评估，再谈发布顺序

不要直接问“什么时候发”；先回答：

- 影响哪些模块/页面/组件/API/schema
- 是否涉及 canonical truth 或审核流
- 是否影响历史数据
- 是否影响已有测试基线
- 是否影响用户当前在跑的主路径
- 是否依赖 sync / init-state / backfill / seed 数据

### E8. 默认把“数据准备”当成发布的一部分，而不是上线后的补救

如果功能依赖：

- sync
- state 初始化
- backfill
- seed 数据
- 外部主键映射
- 聚合字段生成

那么这些都要进入 release plan，而不是写在备注里。

### E9. 默认把“多用户 / 多 persona 可见性差异”当成高风险项

凡是以下场景，默认提高风险等级：

- 同一页面对不同用户显示不同项目子集
- 列表/驾驶舱是按用户项目集动态计算
- 聚合字段可能在不同子集上完整度不同
- owner 账号正常但业务同事账号异常的概率高

---

## F. 变更类型分级（Change Classification）

每次变更，先分类，再决定发布方式。

### L0：极低风险

示例：

- 文案微调
- 非共享页面的纯样式小改
- 注释、文档、无行为变化的重命名

默认要求：

- 基本检查通过
- 受影响页面人工看一遍

### L1：低风险

示例：

- 单页面局部逻辑调整
- 新增一个不影响旧流程的小功能
- 非共享组件的小改动

默认要求：

- 静态检查通过
- 受影响页面 smoke test
- 简短 release note

### L2：中风险

示例：

- 共享组件改动
- 列表/详情/表单共用模式改动
- API 返回新增字段或语义调整
- AI 结果展示结构变化
- 权限文案或默认值变化
- 新增 alias 路由或 response shape 调整
- Dashboard 聚合字段计算调整

默认要求：

- 明确 impact map
- 关键路径回归
- 必要时 feature flag / 分阶段发布
- rollback / fallback 方案
- 数据依赖检查

### L3：高风险

示例：

- 数据库 schema 改动
- 状态机调整
- API breaking change
- 权限逻辑变更
- canonical truth 写入路径变化
- AI 结果从建议态改成正式入库
- 导入 / 审核 / 发布链路改动
- sync / init-state / backfill 逻辑变化
- 会影响多 persona、项目子集或字段完整度的聚合逻辑改动

默认要求：

- 明确阶段化 rollout plan
- 向后兼容方案
- migration / backfill / init 计划
- 明确 rollback 或前滚修复方案
- 更严格回归清单
- 发布窗口和责任人说明
- 预发数据验证 + 生产后短周期验证

---

## G. 核心原则

### 原则 1：先做 impact map，再做 release plan

每次改动前，至少列出以下影响面：

- 受影响模块
- 受影响页面
- 受影响共享组件
- 受影响 API / schema
- 受影响数据流（import / sync / AI / review / publish）
- 受影响角色（查看 / 编辑 / 审核 / 发布）
- 受影响 persona（owner / 普通成员 / 弱数据用户）
- 受影响测试基线
- 受影响数据作业（init-state / backfill / seed）

### 原则 2：发布顺序必须显式设计

常见顺序：

- schema 先扩展
- 后端先兼容
- 前端再适配
- backfill 完成后切换读路径
- 验证稳定后清理旧字段

或：

- 代码先合入主干
- 功能默认关闭
- 测试环境验证
- 小范围打开 flag
- 全量打开

### 原则 3：兼容窗口是常态，不是例外

任何以下场景都默认考虑兼容期：

- 字段更名
- 枚举变化
- 组件替换
- 页面结构切换
- API 结构变化
- 权限行为变化
- response shape 从 `items` 改为 `records`
- 新旧路由并存一段时间
- 新状态表补齐前，旧逻辑仍需可读

### 原则 4：共享层改动优先保守

共享组件、共享 hook、共享查询层、共享 schema、共享状态结构，只要一改就可能影响多处。

默认要求：

- 先列出受影响清单
- 先跑同类页面回归
- 如能“并存一段时间”，优先并存

### 原则 5：feature flag 是发布工具，不是长期垃圾堆

可用于：

- 新功能渐进开启
- 高风险改动快速止血
- 新旧路径短期并存

但必须同时管理：

- flag 责任人
- 预计移除时间
- 何时默认全开
- 何时删除旧逻辑

### 原则 6：数据与代码改动解耦

尽量不要把以下操作绑在同一瞬间：

- 代码切换
- 数据 backfill
- 历史清理
- 权限切换
- 组件大替换
- sync 重跑
- init-state 初始化

### 原则 7：任何不可逆改动都要提前声明

如：

- 删除列 / 删除表
- 批量覆盖正式数据
- 重写 canonical truth
- 删除历史版本
- 把审核前数据直接推为正式层

这类改动必须显式写明：

- 为什么不可逆
- 如何降低风险
- 上线前如何验证
- 出问题时如何止血

### 原则 8：真实用户可用性优先于“开发者环境正常”

发布判断不能只基于：

- 自己账号可用
- 本地数据可用
- 假数据可用

还应回答：

- 普通同事是否可用
- 刚同步的新项目是否可用
- 字段不完整时是否合理 fallback
- backfill 未跑前是否会导致页面错误理解

---

## H. Skill 执行步骤（默认工作流）

## Step 1. 提炼本次改动

先把改动压成一段清晰描述：

- 改了什么
- 为什么改
- 用户可见变化是什么
- 系统层变化是什么
- 是否依赖数据作业 / 初始化 / 配置开关

输出：**change summary**

---

## Step 2. 做变更分类与风险分级

判断：

- 属于 L0 / L1 / L2 / L3 哪一类
- 是否涉及共享层
- 是否涉及 schema / API / 权限 / truth boundary
- 是否涉及历史数据
- 是否涉及 sync / init / backfill
- 是否涉及多 persona 差异

输出：**risk level + 原因**

---

## Step 3. 画 impact map

至少列出：

- 模块
- 页面
- 组件
- API / 表 / 字段
- 数据路径
- 用户角色 / persona
- 数据作业
- 回归范围

输出：**impact map**

---

## Step 4. 判断是否需要兼容期

逐项问：

- 是否要兼容旧字段？
- 是否要兼容旧 API？
- 是否要保留旧组件？
- 是否要双写 / 双读？
- 是否要做 backfill？
- 是否要做 init-state？
- 是否需要 feature flag？
- 是否需要 alias 路由？
- 是否需要 response shape 兼容？

输出：**compatibility plan**

---

## Step 5. 设计发布顺序

给出清晰步骤，例如：

1. 合入 schema 扩展
2. 后端兼容新旧结构
3. 前端适配新字段但保持旧字段 fallback
4. 执行 backfill / init-state / seed
5. staging 验证
6. 小范围开启
7. 全量开启
8. 观察/人工 smoke
9. 清理旧逻辑（单独一期）

输出：**rollout plan**

---

## Step 6. 设计 rollback / fallback 方案

至少回答：

- 能否直接回滚代码？
- 不能回滚时，是否能关 flag？
- 数据已变化时，是否能暂停写入或切回旧读路径？
- sync / init / backfill 是否可暂停？
- 若 backfill 跑了一半，如何止血？
- 最坏情况下，如何快速恢复到可用状态？

输出：**rollback / fallback plan**

---

## Step 7. 生成 release checklist

按风险等级给出最小清单。

### 默认 checklist 模板

- [ ] change summary 已写清
- [ ] 影响范围已列清
- [ ] 是否需要兼容期已判断
- [ ] schema / API / 组件 / 权限 / persona 影响已标注
- [ ] 关键测试已通过
- [ ] 受影响页面已 smoke
- [ ] 所需数据作业已列出（sync / init-state / backfill / seed）
- [ ] rollback / fallback 已明确
- [ ] release owner 已明确
- [ ] 发布后需要人工验证的页面/路径/用户已列出
- [ ] 后续清理任务已记录（如 flag removal / old field cleanup）

输出：**release checklist**

---

## Step 8. 生成 release packet

最终应汇总为一个轻量发布包，包含：

- 一句话改动摘要
- 风险等级
- 影响范围
- 发布步骤
- 所需数据作业
- 回滚方案
- 验证步骤
- 后续清理事项

输出：**release packet**

---

## Step 9. 发布后短周期验证（轻量）

即使不建设复杂 observability，也建议至少做：

- 人工 smoke
- 核心页面点检
- 核心写入链路验证
- 关键角色权限确认
- 关键 persona 登录验证
- Dashboard / 列表 / 详情抽查
- 如果开了 flag，确认默认值与目标受众正确
- 如果跑了 backfill / init，确认真实页面已吃到新数据

注意：

这一步是**轻量 post-release validation**，不是复杂线上监控平台。

---

## I. 面向内部工具 / 数据型应用的默认策略

### I1. 轻量环境模型

默认就三层：

- local / dev
- staging / preview
- production

如果环境资源有限：

- 仍然要至少保留一个接近真实数据结构的预发环境
- 不建议直接跳过 staging

### I2. 轻量审批模型

即使只有 3 个人，也建议对高风险变更保留一个“显式确认点”：

- 自己写下 release packet 并逐条确认
- 或由另一位同事快速 review 高风险改动

### I3. 渐进发布的最小实现

即使没有专门 flag 平台，也可以用：

- 环境变量
- 配置表
- 用户白名单
- 角色开关
- 部门内先行账户

关键不是工具高级，而是：

> 不要让高风险改动一上来就对所有真实流程同时生效。

### I4. 高风险改动单独发

以下改动尽量不要和普通 UI 调整一起发：

- schema 迁移
- canonical truth 变更
- 权限逻辑改动
- AI 审核/发布链路改动
- 共享组件大替换
- sync / init / backfill 逻辑改动
- 路由契约 / response shape 变更

### I5. 清理任务必须进待办

任何以下内容都不能只写在脑子里：

- 旧字段删除
- 双写结束
- 旧组件下线
- 临时 flag 移除
- 兼容逻辑清理
- 临时 alias 路由移除
- 一次性 backfill 脚本归档或删除

否则技术债会快速堆积。

### I6. 数据作业要有“是否已执行”的明确状态

对依赖数据准备的变更，不能只写“需要 backfill”，还要明确：

- 谁执行
- 何时执行
- 执行前提
- 执行成功的判定条件
- 若未执行，页面会出现什么现象

### I7. Persona 发布顺序默认要显式

对于内部工具，默认推荐：

1. Owner / 自己先看
2. 1 位真实业务同事试用
3. 再扩大到全员

不要默认“自己正常 = 所有人正常”。

---

## J. 推荐输出模板

当用户请求发布/变更方案时，优先按以下结构回答：

1. **一句话判断**：这是哪类变更，风险大不大
2. **change summary**
3. **risk level**
4. **impact map**
5. **data readiness**
6. **compatibility plan**
7. **rollout plan**
8. **rollback / fallback plan**
9. **release checklist**
10. **post-release validation**
11. **cleanup later**

---

## K. 输出契约（Output Contract）

本 Skill 的标准输出应至少包含：

### 1. Executive Summary

- 本次改动的本质
- 风险等级
- 推荐发布策略

### 2. Change Scope

- 改动对象
- 影响对象
- 明确不受影响对象

### 3. Data Readiness

- 是否需要 sync / init-state / backfill / seed
- 这些数据作业何时执行
- 关键字段完整度风险
- 若未执行会导致什么用户可见问题

### 4. Compatibility & Migration

- 是否需要兼容期
- 是否需要双读/双写
- 是否需要 backfill
- 是否需要 flag
- 是否需要 alias / response shape 兼容

### 5. Release Plan

- 发布顺序
- 环境顺序
- 审批 / 确认点
- persona 发布顺序

### 6. Rollback / Fallback

- 可回滚项
- 不可回滚项
- 失败时的止血方案
- 数据作业中断时的应对

### 7. Validation

- 发布前重点验证
- 发布后重点 smoke
- 必测 persona
- 必看页面与字段

### 8. Cleanup

- 后续需清理的临时逻辑
- 预计清理时间点

---

## L. Hard Don’ts

### 不要做这些：

1. **不要跳过影响评估直接上线**
2. **不要把 schema breaking change 一步切完**
3. **不要在没有 fallback 的情况下替换共享组件或关键流程**
4. **不要把 feature flag 当永久配置堆着不清理**
5. **不要把回滚方案理解成“git revert 就行”**
6. **不要把 backfill、切流、删旧字段绑定为同一瞬间**
7. **不要让 release checklist 只靠口头记忆**
8. **不要把不可逆数据改动伪装成“小改”**
9. **不要在主路径高峰时段首次打开高风险功能**
10. **不要把“没有专职运维”当成不做变更管理的理由**
11. **不要把“代码已部署”误当成“真实用户已可用”**
12. **不要忽略 sync / init / backfill 对用户体验的决定性影响**
13. **不要只验证 owner 账号就宣布发布成功**

---

## M. 变更味道检查（Change Smell Check）

出现以下情况时，应主动报警：

- 这次改动同时触达页面、共享组件、API、schema、权限，但没有分阶段计划
- 需要删旧字段，但还无法证明无旧引用
- 前端与后端需要同一时刻同时切换才不会报错
- 一旦失败，只能紧急修代码，没有其他止血手段
- 改动影响 canonical truth，但没有 review / backfill / 验证方案
- 共享组件大改，但没有列出受影响页面清单
- feature flag 已经开满，但没人知道哪些还能删
- release packet 里没有“谁来验证、验证什么、验证完后清理什么”
- 页面依赖新字段，但没有明确 backfill / init 计划
- 不同 persona 看到的项目子集不同，但发布方案里没有 persona 验证顺序
- alias 路由或兼容 response 只是临时补丁，但没有清理计划

---

## N. 一句话工作准则

> 先把改动讲清楚、影响讲清楚、数据前提讲清楚、顺序讲清楚、退路讲清楚，再上线；默认选择最小可控发布，而不是最快但不可解释的发布方式.

