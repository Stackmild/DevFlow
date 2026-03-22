---
name: pre-release-test-reviewer
description: 上线前测试审阅者。面向内部 Web App / 管理工具 / AI-native 工具，在发布前系统发现代码逻辑冲突、接口契约不一致、用户视角差异、同步/回填数据缺口、状态初始化漏洞、回归风险、边界条件缺陷、视觉破坏与明显可访问性问题。默认采用“代码—接口—数据—用户视角—关键路径”五层发布前闸门，强调小而硬的测试资产与明确的人工验收矩阵。
triggers:
  - 上线前测试
  - 发布前测试
  - pre release testing
  - 回归测试
  - 边界测试
  - 关键路径测试
  - 冒烟测试
  - 逻辑冲突检测
  - 测试计划
  - 测试审阅
  - Storybook 测试
  - Playwright
  - 测试基线
  - 测试覆盖
  - 测试用例设计
  - 发布闸门
  - release gate
---

# Pre-Release Test Reviewer Skill

## A. Skill 使命

本 Skill 负责在 **版本发布前**，系统性发现那些**本来不必等到真实用户使用才暴露**的问题，尤其包括：

- 前后端接口路径、参数、返回结构不一致
- 同一页面在不同用户/不同项目子集下表现不一致
- 同步、初始化、回填作业未完成，导致页面逻辑“看似正常、实际无数据”
- Dashboard / 列表页依赖的聚合字段缺失，导致分组、摘要、状态展示异常
- 页面能渲染，但关键字段、关键动作、状态切换已经坏掉
- 发布前测试资产存在，但没有形成真正的发布闸门

目标不是追求测试数量，而是用 **最少但最硬的测试资产**，拦住最不该上线后才发现的问题。

---

## B. 适用场景

### 适合

- 内部 Web App / 管理后台 / 工作流工具 / AI-native 工具
- 小团队 / solo builder / 高度依赖 AI 协作开发
- 企业统一登录 / 多用户可见性差异 / 按项目子集展示的产品
- 依赖 sync、初始化、回填、状态生成的系统
- 页面和功能仍在快速迭代，但不希望每次发版都出现基础问题

### 不适合

- 只讨论上线后的监控与告警
- 只做性能压测
- 只做安全渗透测试
- 只修一个已知 bug 的代码实现
- 只做产品功能优先级判断

---

## C. 本 Skill 的新增默认立场

### C1. 发布前必须同时验证“代码、接口、数据、用户视角、关键路径”
默认把发布前检查拆成五层：

1. **代码静态层**：TypeScript / ESLint / schema / obvious drift
2. **接口契约层**：route、query、payload shape、alias、response keys
3. **数据就绪层**：sync、初始化、backfill、必需字段完整度
4. **用户视角层**：不同 persona / user context 下的同页表现
5. **关键路径层**：核心页面和动作真实走通

如果只测第 5 层，很容易漏掉今天这种问题。

### C2. 默认把“用户差异”当成一级风险，而不是边角问题
对于内部工具，默认至少识别并测试：

- 管理者 / 普通成员
- 不同项目拥有者 / AM team 成员
- 有完整数据的用户
- 数据刚同步、状态未补齐的用户

同一页面在不同用户下出现不同行为，不应被当成偶发现象。

### C3. 默认把“数据空值”和“逻辑异常”区分开
发布前要明确分清：

- 是页面逻辑坏了
- 还是字段为空时正常 fallback
- 还是 sync / backfill / init-state 未执行
- 还是数据源本身缺值

不能把“数据没准备好”误判成“页面没问题”。

### C4. 默认把 Dashboard / 列表聚合字段当作高风险面
凡是页面依赖以下内容，都应进入发布前专项检查：

- 分组字段（城市、状态、owner、类型）
- 摘要字段（上次拜访、关键标签、金额、阶段）
- 聚合统计（bucket、count、badge）
- 状态对象（radar state、review state、workflow state）

这类页面很容易“能渲染但内容全错”。

### C5. 默认必须有“小型人工验收矩阵”
对于 3 人左右小团队，默认每次发布前都应有一张小而硬的人工验收矩阵，而不是只跑自动化。

至少覆盖：
- 2–3 个关键用户
- 3–5 个关键页面
- 1–2 个关键动作
- 1 轮字段正确性检查

---

## D. 发布前五层闸门（Release Gates）

## Gate 1. 代码静态层

目标：先拦住最便宜、最明显的问题。

至少包括：

- TypeScript
- ESLint
- 基础 schema / contract 校验
- 共享类型是否漂移
- obvious dead code / wrong imports / missing exports

若这一层失败，不应继续以浏览器测试来“碰运气”。

---

## Gate 2. 接口契约层（API / Route Contract Smoke）

目标：拦住“前端请求 A，后端提供 B”这类基础问题。

发布前必须核对：

- 页面实际调用的 route 是否存在
- query 参数是否被后端支持
- response shape 是否与前端读取一致
- 是否需要 alias / backward compatibility
- controller / service / shared types 是否一致

专项关注：

- `GET /path`
- `POST /path`
- alias 路由
- response key 如 `items` / `records`
- `projectId` / `userId` / filter 参数
- 详情页聚合接口与页面依赖字段是否一致

### 这一层的最低要求
对每个关键页面，至少列出：

- 页面依赖的 API 清单
- 每个 API 的：
  - path
  - method
  - query/body
  - 关键 response 字段
- 前端实际读取字段名

---

## Gate 3. 数据就绪层（Data Readiness）

目标：拦住“代码没坏，但数据没准备好”的问题。

发布前必须检查：

- 是否需要 sync 才能显示
- 是否需要 init-state 才能展示 dashboard / status
- 是否需要 backfill 才能显示关键字段
- 关键摘要字段的非空率是否足够
- 新同步项目是否会自动进入正确状态
- 空值时是否是预期 fallback，而不是脏状态

### 必查对象
- `state` 表是否齐全
- `bitableRecordId` / 外部主键是否存在
- `headquartersCity` / status / owner / date 等关键字段完整度
- 新项目是否自动初始化
- 回填接口是否真实可调用，路径是否准确

### 必须输出
对关键字段做字段完整度统计，例如：

- 项目总数
- 非空数量
- 空值数量
- 非空率
- 是否达发布门槛

---

## Gate 4. 用户视角层（Persona Matrix）

目标：拦住“我这里正常、同事那里全坏”的问题。

默认至少定义 3 类 persona：

1. **主验证用户**：产品 owner / 管理员 / 全量视角
2. **普通业务用户**：项目子集不同、权限较窄
3. **新同步/弱数据用户**：数据刚进来、字段缺失概率高

### 每个 persona 至少验证
- 登录成功
- Dashboard / 首页
- 列表页
- 详情页
- 1 个关键动作
- 关键字段展示是否正确

### 特别要求
不要只比“项目有没有重叠”，而要比较：

- 同一张表的同一关键字段，在各自项目子集上的完整度
- 是否只是数据缺值导致 fallback
- 还是用户视角下拿到的 payload / state / aggregation 有异常

---

## Gate 5. 关键路径层（Critical Path）

目标：真实验证最有价值的用户流程。

默认先覆盖：

- 打开应用并进入核心模块
- Dashboard / 列表 / 详情
- 关键读路径 1–2 条
- 关键写路径 1–2 条
- 至少一个状态切换
- 至少一个“空值 fallback”场景

### 关键路径不只是“页面打开”
还必须验证：

- 核心字段存在
- 分组/聚合正确
- 详情不报错
- 常用动作按钮有效
- 页面之间数据一致

---

## E. 必测专项清单（针对你的场景）

### E1. Dashboard / Copilot 专项
至少验证：

- bucket 分组是否正确
- `未分类` 是否是合理 fallback，不是大面积脏数据
- count 与项目集合一致
- 摘要字段（城市、上次拜访、状态）显示正常
- 不同 persona 下 bucket 不应出现明显逻辑异常

### E2. 列表 → 详情 专项
至少验证：

- 列表能打开详情
- 详情页依赖的聚合接口真实存在
- worklog / related records / status 能显示
- 前端读取字段名与后端返回一致
- 详情页不依赖“碰巧存在的字段”

### E3. 同步 / 初始化 / 回填 专项
至少验证：

- 新同步项目是否自动生成所需 state
- 缺字段项目是否能被 backfill 修复
- backfill 接口路径真实可用
- 回填后页面无需改代码即可正确显示

### E4. 字段完整度专项
对以下字段做发布前检查：

- 分组字段
- 详情摘要字段
- 关键状态字段
- 时间字段
- 外部主键 / 回填依赖字段

输出：
- 空值率
- 风险等级
- 是否阻断发布

---

## F. 反模式（新增）

### 反模式 1：只测“我自己的账号”
后果：owner 正常，普通同事大量异常。

### 反模式 2：只看页面能打开，不看关键字段对不对
后果：UI 在，数据错。

### 反模式 3：把“未分类”当作安全 fallback，不检查其占比
后果：真实数据缺口被掩盖。

### 反模式 4：修了 sync / backfill 代码，但不验证旧数据是否已补齐
后果：代码看似正确，线上数据仍旧脏。

### 反模式 5：接口加了 alias，但前端仍在读旧字段结构
后果：页面局部继续空白。

### 反模式 6：报告只写“已修复”，不做 persona 实测
后果：开发自测通过，真实用户仍出问题。

---

## G. 发布前默认工作流（重写版）

### Step 1. 读取本次变更，列出影响面
输出：
- 改动模块
- 影响页面
- 影响 API
- 影响数据表
- 影响 persona

### Step 2. 跑静态检查
- typecheck
- lint
- shared types / obvious drift

### Step 3. 做接口契约核对
为关键页面列出：
- 页面 → API 映射
- API path / method / params / response keys
- 前端实际读取字段

### Step 4. 做数据就绪检查
输出：
- 是否需要 sync
- 是否需要 init-state
- 是否需要 backfill
- 关键字段完整度统计
- 发布前需执行的数据作业

### Step 5. 做 persona matrix 验证
至少验证 2–3 个用户：
- 首页
- 列表
- 详情
- 关键字段
- 关键动作

### Step 6. 跑关键路径 E2E / 人工冒烟
重点覆盖：
- Dashboard
- 列表 → 详情
- 关键状态切换
- 空值 fallback

### Step 7. 做变更驱动回归
检查本次改动是否波及：
- 旧页面
- 共享组件
- 数据聚合
- 详情页依赖接口

### Step 8. 输出发布结论
必须包含：
- 已验证范围
- 未验证范围
- 数据准备是否完成
- persona 验证结果
- Blocker / High / Medium / Low
- Go / Go with risk / No-Go

---

## H. 输出契约（Output Contract）

```markdown
# Pre-Release Test Review

## 1. Scope
- Covered:
- Not covered:

## 2. Change Risk Summary
- High-risk areas:
- Shared components affected:
- API/routes affected:
- Data/state jobs affected:
- Personas affected:

## 3. Contract Smoke
- Page → API mapping:
- Route / param mismatches:
- Response shape mismatches:
- Alias / backward-compat issues:

## 4. Data Readiness
- Required sync/init/backfill:
- Critical field completeness:
- Blocking data gaps:

## 5. Persona Matrix
| Persona | Dashboard | List | Detail | Key Fields | Key Action | Result |
|---------|-----------|------|--------|------------|------------|--------|

## 6. Findings
### Blocker
- ...

### High
- ...

### Medium
- ...

### Low
- ...

## 7. Recommended Tests / Fixes
### Static
- ...

### Contract Smoke
- ...

### Data Readiness
- ...

### Persona Matrix
- ...

### Critical Path E2E
- ...

### Regression
- ...

### Edge / Error Cases
- ...

### Visual / a11y Smoke
- ...

## 8. Release Recommendation
- Decision: Go / Go with risk / No-Go
- Reasoning:
- Manual checks before release:
- Required data jobs before release:
```

---

## I. 针对你当前团队的默认最低门槛

适用于：
- 3 人左右小团队
- 内部工具
- 企业统一登录
- 多 persona
- 有 sync / backfill / init-state
- AI 协作开发较多

### 每次发版前最低门槛
1. **静态检查通过**
2. **关键页面的 API contract smoke 过一遍**
3. **关键数据字段完整度统计出一版**
4. **至少 2 个用户做 persona 冒烟**
5. **Dashboard / 列表 / 详情 走一轮**
6. **若依赖 sync / init / backfill，必须确认作业已执行**
7. **发布结论必须写 Go / Go with risk / No-Go**

---

## J. 一句话原则

> 不只是测试“页面能不能打开”，而是要在发布前确认：代码、接口、数据、用户视角和关键路径这五层都没有明显破口。