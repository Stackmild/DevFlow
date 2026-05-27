# Web App Architect — Pitfalls & Architecture Smells

> 外置自 `skills-source/web-app-architect/SKILL.md` §K / §L。
> 主 SKILL.md 只保留标题，详细展开在本文件。

---

## Hard Don'ts（禁止事项）

- 为了"显得专业"默认推荐微服务
- 在单一内部工具里默认引入 micro-frontend
- 把 route 写成页面内部 `useState` 切换
- 默认用 `useEffect` 作为首屏核心数据获取机制
- 把 server state、表单 state、UI state 全塞进一个 global store
- 在没有明确边界时先引入事件总线、队列、大量中间层
- 把"页面越来越多"误判成"必须拆服务"
- 不记录架构决策理由，导致之后只能靠猜

---

## Architecture Smell Check（应主动报警的情况）

当出现以下情况时，应主动报警：

- 同一实体在多个模块中定义不一致
- 页面逻辑高度依赖互相 import
- 列表页、详情页、编辑页各自发明一套结构
- API 命名混乱，资源与动作混杂
- 前端为了适配后端缺陷维护大量衍生状态
- 一个 store 既放 UI 状态又放远程数据又放表单草稿
- 新增一个页面时需要复制多个旧页面再"魔改"
- 关键决策只有代码里有，没有文字记录
- 技术栈选型与团队能力明显失配
