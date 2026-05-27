# WebApp Consistency Audit — Detection Rules & Pitfalls

> 外置自 `SKILL.md` §J / §L。
> 主 SKILL.md 只保留规则编号与要点标题，详细展开在本文件。

---

## 代码逻辑 / Contract 检测规则

| Rule | 要点 | 典型表现 |
|---|---|---|
| L1 | 同一业务概念（status/role/variant/sourceType 等）不得多处定义 | 两个文件各定义一套 `Status` enum，值不完全相同 |
| L2 | route / menu title / page heading / breadcrumb 尽量同源，分散写极易漂移 | sidebar 显示"项目"，breadcrumb 显示"Portfolio"，page title 显示"项目列表" |
| L3 | API schema、frontend type、form validation 必须可相互映射 | backend 返回 `items`，frontend type 写 `records`，form schema 写 `entries` |
| L4 | 页面依赖的接口 contract 必须显式核对 | alias 路由存在但 query 参数未支持；response 新增字段但前端未消费 |
| L5 | loading / empty / error / success 必须互斥清晰 | 接口失败却展示 empty state（"暂无数据"），用户不知道请求已出错 |
| L6 | feature flag 与权限逻辑必须可追踪 | route 层判断 `isAdmin`，menu 层判断 `hasPermission('admin')`，component 层判断 `user.role === 'owner'` |
| L7 | 数据作业依赖必须显式点名 | 页面显示"暂无数据"，实际是 backfill 未执行，但前端逻辑把它当空态处理 |
| L8 | Dashboard / 列表聚合字段必须检查完整度 | "城市"字段在 60% 记录上为空，dashboard 按城市聚合时数据失真 |
| L9 | Persona 差异必须区分原因 | 不能把所有差异都归为"bug"——有些是数据缺值，有些是状态未初始化，有些是合理的权限裁剪 |

---

## 页面元素一致性检测规则

| Rule | 要点 | 典型表现 |
|---|---|---|
| U1 | 同级页面共享容器规范 | 页面 A 最大宽度 1200px，页面 B 最大宽度 100% |
| U2 | 同类页面共享标题系统 | 页面 A 标题用 24px/700，页面 B 标题用 22px/600 |
| U3 | 主操作位置与按钮层级稳定 | 页面 A 主按钮在右上角，页面 B 主按钮在左上角 |
| U4 | 同类组件状态一致 | 页面 A 的 Card hover 有阴影，页面 B 的 Card hover 无边框变化 |
| U5 | 空态·错态·加载态必须有统一语法 | 空态：页面 A 用"暂无数据"，页面 B 用"没有找到记录"，页面 C 用空白 |
| U6 | 图标尺寸·文字尺寸·点击区域统一 | 表格操作按钮在不同页面大小不一致 |
| U7 | 表单必须一致处理 label / help / error | 页面 A 错误在字段下方，页面 B 错误在字段右侧，页面 C 错误在全局 banner |
| U8 | 表格与卡片密度体系稳定 | 页面 A 表格行高 48px，页面 B 表格行高 40px |

---

## 质量标准 — 禁止表述

以下表述在审计报告中**不允许出现**：

- "这里感觉不太统一"
- "建议优化一下视觉"
- "建议加一些测试"
- "可能是缓存问题"
- "应该是字段没回来"

**必须替换为**：哪个 contract 断了、哪个字段缺了、哪个 persona 异常、根因在哪层、如何验证修复完成。

---

## 质量标准 — 必须做到

- 区分事实 / 推断 / 建议
- 问题尽量落到文件、组件、selector、API、字段或 job
- 明确哪些是系统性问题，哪些是单点问题
- 对设计差异给出"是否可能是有意设计"的判断
- 对数据异常给出"代码坏了还是数据没准备好"的判断
