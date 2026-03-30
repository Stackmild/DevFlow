# 视觉 / 交互审计清单

> 适用于 LLM 生成的 Web 应用的开发前 / 开发后 / 提交前审计。
> 源自 AM Hub 项目实践，泛化为通用清单。
> 每级附 DevFlow skill 指向和产品经验文件引用。

---

## 使用方式

- **开发前**：读 VISUAL-SYSTEM.md + COMPONENTS.md + 本清单
- **开发中**：每做完一个页面/section 对照检查
- **提交前**：15 问必答，有 1 个答不清楚不提交

## 总体判断标准

一个达标的页面应当满足：
1. **无 orphan elements** — 没有只活在某个页面里的 badge/pill/toolbar/样式
2. **无重复内容** — Header 说过的不在下方 section 再说；tab 已表达的状态不在 item 里重复
3. **交互稳定** — tab/pill/filter 切换后顺序和布局不抖动
4. **响应式正确** — 桌面端不被误降级，移动端不残留桌面逻辑
5. **组件已纳入系统** — 真正遵守组件 family 的几何、状态、层级规则
6. **内容好读** — 行距段距清楚，标题层级稳定，不依赖具体文案

---

## Level 1：页面结构与内容层级

> DevFlow 指向：**PFL-012**（LLM 不维护跨组件内容层级）、`frontend-design` Phase 3

- [ ] Header 只放页面标题和少量高优先级动作，搜索/筛选/排序不漂在 Header 中
- [ ] 主内容全部进入主容器，无中间漂浮统计条/筛选条/说明块
- [ ] 页面标题不重复（Header 已表达的不在下方 section 重写）

## Level 2：Orphan Elements / Orphan Patterns

> DevFlow 指向：`webapp-consistency-audit` Step 6

- [ ] 无 page-local badge/pill/markdown 样式/glass 容器/summary block
- [ ] 无"只有这个页面这样做"的 pattern（list 结构、toolbar、tab/pill family 跨页面一致）
- [ ] 无已被替代但仍残留的旧组件/旧路径

## Level 3：List Language vs Card Language

> DevFlow 指向：PFL-012 子模式、`webapp-interaction-designer` Step 3

- [ ] 集合内容优先用 list，而非一项一张卡
- [ ] expandable content 属于该行的 nested detail，不变成平级大卡片
- [ ] list item 几何规则统一（行高、hover、divider、左右信息分配）

## Level 4：Tab / Pill / Filter 稳定性

> DevFlow 指向：`webapp-consistency-audit` Rule U3/U8

- [ ] 点击后顺序不变化，选中态不改变位置
- [ ] tab 切换不引发布局抖动
- [ ] pill family 统一（高度、选中态、hover、字体层级）

## Level 5：响应式稳定性

> DevFlow 指向：`frontend-design` §3.5 Theme/Mode Strategy、`webapp-consistency-audit` Step 8

- [ ] 桌面端不被错误降级（tab 全量显示、summary 不被压成移动端布局）
- [ ] 移动端不泄漏桌面逻辑（无残留 divider/边线、桌面 hover 不破坏移动布局）
- [ ] 同一组件在桌面/移动端语义一致（只是布局变，不是交互规则变）

## Level 6：Summary / Stat 区域

> DevFlow 指向：PFL-012 子模式、`webapp-consistency-audit` Step 7

- [ ] stat item 内部元素明显属于一组（icon 不漂移，数字和标签关系稳定）
- [ ] 左右 block 视觉语言一致
- [ ] summary 内容不重复（标题已说的数字标签不再重复同义文案）

## Level 7：Settings 页面

> DevFlow 指向：`frontend-design` Phase 3 page type rules、`webapp-consistency-audit` Step 7

- [ ] setting action item 标题/说明/按钮从视觉上成组
- [ ] 双列 settings item 对齐，内容不顶到 divider
- [ ] 移动端正确降级为单列，不残留桌面边线

## Level 8：文案层级与重复内容

> DevFlow 指向：PFL-012 guardrail #2

- [ ] Header 已说的页面身份不在 SectionCard 重复
- [ ] tab 已说的状态不在 item 重复
- [ ] 页面标题简洁，section 标题不抢页面标题，菜单文案是动作型不是状态型

## Level 9：DocumentRenderer / 富文本渲染

> DevFlow 指向：**C-010**（LLM 富文本渲染基于内容推断而非语义结构）

- [ ] 渲染规则基于 h1/h2/h3/p/li/strong 结构，不基于具体文案硬编码
- [ ] 标题层级稳定（一级/二级/三级清楚，strong 不冒充标题）
- [ ] 行距与段距分离（段距 > 行距，列表 line-height 与正文同家族）
- [ ] 跨页面使用同一渲染规则

## Level 10：业务状态表达

> DevFlow 指向：PFL-012 guardrail #4、`webapp-interaction-designer` Step 4

- [ ] badge/status 走 token 系统，无 page-local 实现
- [ ] 菜单文案是动作型（"暂停监控"），不是状态型（"已暂停"）

---

## 提交前 15 问

1. 这个页面属于哪种 page pattern？
2. 主内容是否全部进入了主容器？
3. 有没有中间漂浮块？
4. 有没有重复标题？
5. 集合内容为什么不是 list？
6. tab/pill 点击后顺序会不会变化？
7. tab 切换后布局会不会抖动？
8. 桌面端是否被错误降级？
9. 移动端是否泄漏桌面规则？
10. select/value 会不会折成两行？
11. badge 是否都来自系统组件？
12. 文档内容是否走统一渲染器？
13. 渲染器是否依赖文案硬编码？
14. 这一页里还有没有 orphan element？
15. 这一页里还有没有重复内容？

**有 1 个答不清楚，就不要提交。**
