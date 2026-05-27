# Backend Data API — Output Contract Template

> 外置自 `SKILL.md` §14。
> 当用户要求设计后端 / 数据 / API 时，按以下结构输出。

---

## 推荐输出结构

### A. 问题定义
- 当前产品目标
- 核心业务对象
- 主要页面类型
- 主要写操作
- 是否有 AI / 导入 / 审核
- 引用自 `web-app-architect` 的已知边界

### B. 模块上下文
- 属于哪个模块
- 与其他模块的依赖
- 是 canonical resource 还是 page view model

### C. 数据模型
- 表名、主键、关键字段
- 关联关系
- 状态字段、审计字段

### D. 真相层级
- raw → extracted → review → canonical → derived（按需列明）

### E. API 草案
- 端点、方法、请求参数、响应体、错误场景

### F. 写操作规则
- 幂等策略、并发策略
- 审核前置条件、发布前置条件

### G. 演进方案
- migration / backfill / expand-contract / 风险点

### H. 反模式提醒
- 当前方案最可能出的问题
- 不应采用的 shortcut
