# WebApp Consistency Audit — Report Output Template

> 外置自 `SKILL.md` §K。
> 主 SKILL.md 只保留输出部分标题，详细模板在本文件。

---

## 1. 项目现状概览

- 技术栈
- 已有测试与规则基础设施
- 设计系统成熟度判断
- contract / DTO / schema 单一事实来源判断
- 数据作业现状（sync / init-state / backfill）

---

## 2. 高优先级问题表

建议表头：

| Severity | 类型 | 位置 | 现象 | 证据 | 根因判断 | 修复建议 |
|---|---|---|---|---|---|---|
| P0/P1/P2/P3 | Logic / Contract / Data / UI / A11y / Test Infra | 文件/页面/组件/API/表 | 具体问题 | 路径/selector/query/字段/截图 | 单一事实来源缺失 / contract drift / 数据缺值 / state 未初始化 / token 漂移 | 明确动作 |

---

## 3. 同级页面一致性矩阵

| 页面组 | 页面 | Container | 标题 | 操作区 | 数据区 | 状态页 | 结论 |

---

## 4. 数据完整度 / Persona 矩阵

| Persona | 项目数 | 关键字段 | 非空率 | Dashboard | List | Detail | 结论 |

---

## 5. 根因归并

按 root cause 聚合：
- token 体系缺失
- layout primitive 缺失
- route/meta 分裂
- 状态定义分裂
- 组件库失控
- a11y 规范未固化
- API / DTO contract drift
- sync / init / backfill 缺口
- persona 子集字段完整度差异

---

## 6. 修复优先级建议

按以下顺序：
1. 会导致真实逻辑错误 / 数据误读的问题
2. contract 漂移与接口不匹配
3. 数据作业缺口与字段完整度问题
4. 系统性 UI 漂移
5. 单页局部视觉问题

---

## 7. 建议新增的自动化防线

必须附：
- 应新增哪些 lint 规则
- 应新增哪些 schema / contract 校验
- 应新增哪些 data-readiness checks
- 应新增哪些 component tests
- 应新增哪些 Playwright tests
- 应新增哪些 persona matrix smoke
- 应新增哪些 Storybook stories
