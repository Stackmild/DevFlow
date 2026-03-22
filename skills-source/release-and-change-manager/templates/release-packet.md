# Release Packet

> 发布包。由 `release-and-change-manager` skill 生成。
> 每次发布必须填写，是发布决策的核心文档。

**版本/PR**：
**发布日期**：YYYY-MM-DD
**Release Owner**：

---

## 1. Executive Summary

**本次改动的本质**：

**风险等级**：`L0 极低` / `L1 低` / `L2 中` / `L3 高`

**推荐发布策略**：

---

## 2. Change Scope

**改动对象**：
-

**影响对象**：
- 受影响模块：
- 受影响页面：
- 受影响共享组件：
- 受影响 API / Schema：
- 受影响 Persona：

**明确不受影响**：
-

---

## 3. Data Readiness

**是否需要 sync / init-state / backfill / seed**：
- [ ] sync（执行人：  执行时间：  ）
- [ ] init-state（执行人：  执行时间：  ）
- [ ] backfill（执行人：  执行时间：  ）

**关键字段完整度风险**：

**若未执行会导致什么用户可见问题**：

---

## 4. Compatibility & Migration

**是否需要兼容期**：Y / N
**是否需要双读/双写**：Y / N
**是否需要 backfill**：Y / N
**是否需要 feature flag**：Y / N
**是否需要 alias / response shape 兼容**：Y / N

**说明**：

---

## 5. Release Plan

**发布步骤**：

1. ...
2. ...
3. ...

**环境顺序**：dev → staging → production

**审批/确认点**：

**Persona 发布顺序**：
1. Owner/自己
2. 1–2 位真实业务同事
3. 全量

---

## 6. Rollback / Fallback

**可回滚项**：
-

**不可回滚项（原因）**：
-

**失败时的止血方案**：
-

**数据作业中断时的应对**：
-

---

## 7. Validation

**发布前重点验证**：
-

**发布后重点 smoke**：
-

**必测 Persona**：
-

**必看页面与字段**：
-

---

## 8. Cleanup（后续清理）

| 清理项 | 预计时间 | 负责人 |
|-------|---------|-------|
| 旧字段/组件下线 | ... | ... |
| Feature flag 移除 | ... | ... |
| 临时 alias 路由清理 | ... | ... |

---

*此模板由 `release-and-change-manager` skill 提供。*
