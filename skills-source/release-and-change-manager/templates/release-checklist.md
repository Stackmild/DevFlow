# Release Checklist

> 每次发布前必须执行的最小清单。由 `release-and-change-manager` skill 提供。

**版本/PR**：
**日期**：YYYY-MM-DD

---

## 基础清单（每次必做）

- [ ] change summary 已写清
- [ ] 影响范围已列清（模块/页面/组件/API/表/persona）
- [ ] 是否需要兼容期已判断
- [ ] schema / API / 组件 / 权限 / persona 影响已标注
- [ ] 关键测试已通过（参见 `pre-release-test-reviewer`）
- [ ] 受影响页面已 smoke
- [ ] 所需数据作业已列出（sync / init-state / backfill / seed）
- [ ] rollback / fallback 方案已明确
- [ ] release owner 已明确
- [ ] 发布后需要人工验证的页面/路径/用户已列出

---

## L2 中风险额外项

- [ ] impact map 已画出
- [ ] 关键路径回归已执行
- [ ] 数据依赖检查已完成
- [ ] rollback / fallback 方案已测试可行

---

## L3 高风险额外项

- [ ] 阶段化 rollout plan 已定义
- [ ] 向后兼容方案已实施
- [ ] migration / backfill / init 计划已确认
- [ ] rollback 或前滚修复方案已明确
- [ ] 预发数据验证已完成
- [ ] 发布窗口和责任人已确认
- [ ] 不可逆数据改动已显式声明

---

## 发布后短周期验证

- [ ] 关键页面人工 smoke 完成
- [ ] 核心写入链路验证完成
- [ ] 关键角色权限确认
- [ ] 至少 1 个非 owner 账号验证
- [ ] Dashboard / 列表 / 详情抽查完成
- [ ] （若有 feature flag）确认默认值与目标受众正确
- [ ] （若有 backfill/init）确认真实页面已吃到新数据

---

## 后续清理待办

- [ ] 旧字段删除计划已记录
- [ ] 临时 feature flag 移除计划已记录
- [ ] 旧组件/路由下线计划已记录
- [ ] backfill 脚本归档或删除已安排

---

*此模板由 `release-and-change-manager` skill 提供。*
