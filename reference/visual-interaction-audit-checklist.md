# AM Hub 视觉 / 交互审计清单

> **版本**: v2.0（Insights V1 实战更新版）
> **更新日期**: 2026-03-31
> **变更说明**: 基于 Insights V1 开发中 20+ 轮迭代暴露的实际问题，新增 §3.4、§4.4、§5.4、§7.5–7.6、§8.5、§10.4–10.5、§12.3、§15–16 共 11 个新审计维度，提交前问题扩展到 20 问。
>
> 用途：给后续 AI、飞书妙搭、Cowork 或开发者在 **开发前 / 开发后 / 提交前** 使用。
>
> 目标：这份清单不只检查"视觉有没有统一"，还检查 **交互是否稳定、信息是否重复、响应式是否泄漏、组件是否真正纳入系统**。

---

## 1. 使用方式

### 开发前
先读：
- `docs/design/visual-system.md`
- `docs/design/component-guidelines.md`
- `docs/design/page-patterns.md`
- `docs/design/implementation-governance.md`
- 本清单

### 开发中
每做完一个页面或一个主要 section，就对照本清单检查一次。

### 开发后
将本清单当成交付前的 QA / Review gate。**未通过不得提交。**

---

## 2. 总体判断标准

如果一个页面达标，它应当满足：

1. **没有 orphan elements**：没有只活在某个页面里的奇怪 badge、toolbar、tab、note、列表块、说明块
2. **没有重复内容**：Header 说过的内容不会在下方 section 再说一遍；tab 已表达的状态不会在单条里再重复一次
3. **交互稳定**：点击 tab / pill / filter 后，顺序和布局不抖动
4. **响应式正确**：桌面端不会被误降级，移动端不会残留桌面逻辑
5. **组件已纳入系统**：不是"复用了一个组件名"，而是真正遵守了组件 family 的几何规则、状态规则、层级规则
6. **内容好读**：尤其是 DocumentRenderer 渲染的内容，行距和段距清楚，标题层级稳定，不依赖具体文案
7. **Token 精准**：每个颜色 / 间距 / 圆角都用了语义正确的 token，不是"看起来差不多就行"
8. **术语一致**：同一概念在所有页面、所有语言中叫同一个名字

---

## 3. 一级审计：页面结构与内容层级

### 3.1 Header 是否只承担页面身份？
- [ ] Header 只放页面标题、副标题和少量高优先级动作
- [ ] 搜索 / 筛选 / 排序没有漂在 Header 中（除非是系统明确允许的少量例外）
- [ ] mode switch 没有悬空漂在 header 和内容区之间

### 3.2 主内容是否全部进入主 `SectionCard`？
- [ ] 页面主要内容都有明确主容器
- [ ] 没有中间漂浮统计条 / 漂浮筛选条 / 漂浮说明块
- [ ] 需要成为 section 的内容已经进入 `SectionCard`

### 3.3 页面标题是否重复？
- [ ] 页面 Header 已表达的页面身份，没有在主 SectionCard 中重复写一遍
- [ ] tab 已表达的上下文，没有在下方内容里重复写同一标题
- [ ] 分组标题只表达"组"，不重复表达整个页面

### 3.4 Eyebrow / navGroup 是否一致？ ⚡ NEW
- [ ] PageHeader 和 BreadcrumbHeader 的 eyebrow 标签从 `NAV_GROUP_LABELS` 常量派生，不硬编码
- [ ] eyebrow 文案与 sidebar 导航分组标题完全一致（如 sidebar 写 "Insights"，eyebrow 不能写"洞察"）
- [ ] 子页面的 eyebrow 继承父路由的 `navGroup`，从路由配置自动推导

> **来源**：Insights V1 财务趋势页 eyebrow 显示"洞察"而 sidebar 显示"Insights"，经两轮修复才统一。

---

## 4. 二级审计：orphan elements / orphan patterns

### 4.1 是否存在 page-local element？
检查是否还有这些"页面自己长出来的东西"：
- [ ] page-local badge
- [ ] page-local pill
- [ ] page-local markdown 样式
- [ ] page-local glass 容器
- [ ] page-local summary block
- [ ] page-local 搜索/toolbar 写法
- [ ] page-local 颜色/阴影/圆角

### 4.2 是否存在"只有这一个页面这样做"的 pattern？
- [ ] 这个页面的 list 结构和其它同类页面一致吗？
- [ ] 这个页面的 toolbar 和其它 collection page 一致吗？
- [ ] 这个页面的 setting action item 和其它设置区块一致吗？
- [ ] 这个页面的 tab / segmented / pill family 跟其它页面一致吗？

### 4.3 旧模式是否仍在残留？
- [ ] 是否还存在已经被替代的旧页面 / 旧路径 / 旧组件
- [ ] Layout / route meta / mobile topbar 是否还引用旧命名
- [ ] 是否有"看起来能跑，但其实已经过期"的 UI 结构还活着

### 4.4 Token 使用是否精准？ ⚡ NEW
以下是高频踩坑的 token 误用，逐条检查：
- [ ] 行 hover 使用 `--hover-bg`，**不是** `--bg-subtle`（`--bg-subtle` 是白色半透明底色，语义不同）
- [ ] 行分隔线使用 `--border-subtle`，**不是** `--content-glass-border`（Glass 边框是白色，用在行 divider 上视觉不可见）
- [ ] 选中态背景使用 `--accent-soft`，**不是** `--accent-bg`（`--accent-soft` 是设计系统规定的选中态 token）
- [ ] 没有使用 `color-mix()`——如需极浅 accent，直接用已有 `--accent-bg` token
- [ ] Sidebar 的 gradient / rgba 全部萃取为 `--sidebar-active-bar` 等 token，不残留硬编码
- [ ] SectionCardHeader 标题使用 `SectionCardHeader` 组件，不自行写 `<h3>` 或 `<p>`

> **来源**：Insights V1 design-spec 合规审查发现 4 处 token 偏差（hover/border/selected/color-mix），每个都会导致视觉不一致。

---

## 5. 三级审计：list language 是否真正压住了 card language

### 5.1 集合内容是否优先用 list？
- [ ] 项目列表是 row list，不是一项一张卡
- [ ] 我的简报是 list / grouped list，不是卡片流
- [ ] 城市下拉公司列表是 row list，而不是小卡片
- [ ] 已暂停 / 已移除页面是 collection page，而不是卡片堆

### 5.2 expandable content 是否属于该行？
- [ ] 展开内容看起来是该行的 nested detail
- [ ] 展开后没有变成另一个平级大卡片
- [ ] 展开/收起交互行为一致（整行与箭头行为一致）

### 5.3 list item 是否有统一几何规则？
- [ ] 行高一致
- [ ] hover 一致
- [ ] divider 节奏一致
- [ ] 左右信息分配一致
- [ ] 行内操作数量受控，不会太吵

### 5.4 行选中 / hover 背景是否覆盖整行？ ⚡ NEW
- [ ] `backgroundColor` 设在最外层行容器 `<div>` 上，**不在任何内层容器**
- [ ] 所有子列 div（**包括 CTA 列**）不设置任何 `backgroundColor` 或 Tailwind `bg-*` class
- [ ] 最外层行容器使用 `alignItems: 'stretch'`（不是 `center`），让子列高度撑满行高
- [ ] CTA 列（如"查看财务趋势"）是最外层 flex 容器的**直接子节点**，不嵌套在另一个有背景的 div 内

> **来源**：Insights V1 的"选中行蓝底不覆盖 CTA 列"问题反复出现 3 次，每次根因相同——backgroundColor 在内层而 CTA 在外层。

---

## 6. 四级审计：tab / pill / filter 稳定性

### 6.1 tab / pill / filter 顺序是否固定？
- [ ] 点击后顺序不变化
- [ ] 选中态不改变位置
- [ ] 数据变化不改变 tab 顺序
- [ ] 优先城市排序是稳定规则，不是临时排序

### 6.2 tab 切换是否引发布局抖动？
- [ ] `全部 / 待拜访 / 已拜访` 切换时布局不抖动
- [ ] 生成简报 / 我的简报切换时主工作区骨架稳定
- [ ] "全部" tab 的布局可作为其它 tab 的基准骨架

### 6.3 pill family 是否统一？
- [ ] 高度一致
- [ ] 选中态一致
- [ ] hover 一致
- [ ] 字体层级一致
- [ ] 不同页面没有悄悄再长一套 pill 样式

---

## 7. 五级审计：响应式稳定性

### 7.1 桌面端是否被错误降级？
- [ ] 桌面端城市 tab 全量显示
- [ ] 桌面端 summary 没被错误压成移动端 2x2
- [ ] 桌面端 toolbar 没被误折叠

### 7.2 移动端是否泄漏了桌面逻辑？
- [ ] 单列布局下没有残留桌面 divider / 边线
- [ ] Worklog 同步区没有莫名其妙的左边线
- [ ] 桌面专属 hover 方案不会在移动端破坏布局

### 7.3 移动端是否有特殊交互 bug？
- [ ] 展开后的 pill / 城市 tab 可以收起
- [ ] 搜索 / select 不会折成难看的两行
- [ ] "不限逾期"等 select value 单行显示
- [ ] 紧凑 matrix 的视觉重心和标题对齐，不是只看盒模型对齐

### 7.4 同一组件在桌面 / 移动端是否语义一致？
- [ ] 只是布局变了，不是交互规则变了
- [ ] 选中规则和顺序规则完全一致
- [ ] 不会出现一个端是动作型文案，另一个端是状态型文案

### 7.5 移动端多列行是否做了响应式降级？ ⚡ NEW
- [ ] 桌面端 3–4 列 flex 布局在移动端改为 2 行堆叠布局
- [ ] 移动端长文字 CTA（如"查看财务趋势 →"）改为图标按钮或缩短文案
- [ ] 列表内部滚动（`maxHeight + overflow-y-auto`）在**所有屏幕尺寸**都生效，不要只写 `lg:overflow-y-auto`
- [ ] 移动端数字/标签/公司名不因列宽不足而被截断或竖排

> **来源**：Company Master 4 列布局在手机上导致"查看财务趋势"竖着排列，列表不可滚动。

### 7.6 Sticky 元素背景是否不透明？ ⚡ NEW
- [ ] `position: sticky` 的列或行背景使用纯白 `#ffffff`，**不使用** Glass 半透明 token
- [ ] 横向滚动时，sticky 列完全遮挡后面滚过来的内容，不透出

> **来源**：财务趋势表 sticky 指标列使用 `--content-glass-bg`（半透明），移动端横滚时内容透出。

---

## 8. 六级审计：Summary / Stat 区域

### 8.1 item grouping 是否稳定？
- [ ] 每个 stat item 内部元素明显属于一组
- [ ] 图标不会像漂在 section 里
- [ ] 数字和标签关系稳定

### 8.2 左右 block 语言是否一致？
- [ ] 一边有 icon，另一边也要有明确同家族规则；不要一边 icon 一边纯数字又布局完全不同
- [ ] 桌面端左右 block 都是 row 语言
- [ ] 移动端降级规则一致

### 8.3 Summary 数字逻辑是否正确？
- [ ] 总数和分项统计逻辑一致
- [ ] category / monitor status / project status 数据都能正确抓取
- [ ] 不存在 placeholder 常驻或空值未接入

### 8.4 Summary 内容是否重复？
- [ ] summary card 标题、说明、数字标签不重复说同一件事
- [ ] 若标题已经说明"项目数量"，数字下方就不要再重复"纳入监控项目总数"这类同义文案

### 8.5 统计数字是否独立于筛选条件？ ⚡ NEW
- [ ] Stats SectionCard 中的总数 / 分项数字来自**独立的全量查询**
- [ ] 切换 FilterPill（如"回购潜力"/"预警"/"风险"）时，Stats 数字**不随之变化**
- [ ] Stats 查询的 queryKey 不包含 filter / search / dealLeader 等筛选参数

> **来源**：Company Master 的 286 / 224 / 62 统计数字随 FilterPill 切换而变化，应始终反映全量。

---

## 9. 七级审计：Settings 页面专门检查

### 9.1 setting action item 是否真的成组？
- [ ] 标题、说明、按钮从视觉上能看出是一组
- [ ] 不是"说明在上、按钮掉得很远"
- [ ] 按钮和说明距离合理

### 9.2 双列 settings item 是否对齐？
- [ ] 左右列都有舒适宽度
- [ ] 内容不会顶到中间 divider
- [ ] 左右 action item 基线稳定

### 9.3 说明列表是否真的成组？
- [ ] "紧急拜访 / 可顺路排期"等规则是一组说明，不是两条散开的备注
- [ ] 小标题如果冗余就删掉
- [ ] 规则之间距离明显比跨组距离小

### 9.4 移动端设置页是否正确降级？
- [ ] 桌面双列在移动端正确变单列
- [ ] 不残留桌面边线
- [ ] 信息和操作不会挤在一起

---

## 10. 八级审计：文案层级与重复内容

### 10.1 文案是否重复？
检查这些重复：
- [ ] Header 已说页面身份，SectionCard 不再重复
- [ ] tab 已说状态，单条 item 不再重复状态文案
- [ ] 城市 / 公司选择区不再写肉眼可见的冗余说明（如"共 68 家，已选 0 家"）
- [ ] note 区、描述区不再像开发期说明

### 10.2 文案是否属于正确层级？
- [ ] 页面标题简洁明确
- [ ] section 标题只说明 section，不抢页面标题
- [ ] 次级说明不写成口号
- [ ] 菜单文案是动作型，不是状态型

### 10.3 品牌与导航文案是否正式？
- [ ] 左侧品牌区不出现开发期说明文案
- [ ] 移动端 topbar 副标题引用统一 route meta，不单独硬编码

### 10.4 工程术语是否泄漏到 UI？ ⚡ NEW
- [ ] "CSV 文件"、"ETL"、"data_status"、"approval_level"、"ind_"、"cat_" 等工程字段名 **不得** 出现在用户界面
- [ ] Settings 页面的同步描述使用业务语言（如"更新财务快照"），不暴露数据管道细节
- [ ] 空值文案根据业务语义选择：Runway 无值 = `—`，不是"待补数据"
- [ ] 指标无数据时显示"暂无数据"或 `—`，不显示"数据不足"
- [ ] "已纳入当前分析"/"已完成人工核验" 等系统内部标签评估是否对用户有意义，无意义则不显示

> **来源**：Settings 同步项含"CSV 文件"、Preview 的 Runway 空值显示"待补数据"、"已监控" badge 对用户无意义。

### 10.5 术语是否全局一致？ ⚡ NEW
- [ ] 同一概念在所有文件中使用同一名称（如"现金跑道"统一为"Runway"，不混用）
- [ ] 修改术语前先全局 `grep`，列出所有出现位置（前端组件 + 后端 service + spec 文档）
- [ ] 同一指标的中英文不在不同页面使用不同翻译

> **来源**："现金跑道"/"跑道"/"跑道告警" 分散在 5 个文件，经 3 轮修复才统一为"Runway"。

---

## 11. 九级审计：DocumentRenderer / 文档内容渲染（高危项）

### 11.1 是否仍然依赖具体文案？
- [ ] 没有按"快速摘要 / 模型判断 / 建议切入"这类文案做硬编码匹配
- [ ] 规则基于 `h1 / h2 / h3 / p / li / strong` 等结构
- [ ] 如需段首 label 增强，是基于通用结构模式，而不是基于词表

### 11.2 标题层级是否稳定？
- [ ] 一级标题、二级标题、三级标题都清楚
- [ ] 小标题不会忽大忽小
- [ ] `strong` 只是强调，不冒充标题

### 11.3 行距与段距是否分离？
- [ ] 正文 line-height 稳定
- [ ] 列表 line-height 与正文一致或同家族
- [ ] 段距明显大于行距
- [ ] 不会出现"行距像段距"或"段与段挤在一起"

### 11.4 正文是否易读？
- [ ] 正文字号稳定，不忽大忽小
- [ ] 段落之间能明显看出边界
- [ ] 不是一面文字墙
- [ ] 列表和正文像同一系统，不是两套排版

### 11.5 跨页面是否一致？
- [ ] Briefings 与 ProjectDetail 使用同一渲染规则
- [ ] 不会一边紧凑一边像大文章

---

## 12. 十级审计：业务状态表达与组件规范

### 12.1 badge / status 是否已纳入系统？
- [ ] `StatusBadge` / `TierBadge` / `SignalBadge` 一律走 token
- [ ] 页面没有自己再造一套 badge
- [ ] 业务状态表达属于 `business-ui` 体系，而不是 page-local 实现

### 12.2 菜单文案是否是动作型？
- [ ] 菜单项写"暂停监控 / 移除监控"，而不是"已暂停 / 已移除"
- [ ] 操作和状态表达分离

### 12.3 指标详情 Popover 是否遵循规范？ ⚡ NEW
- [ ] 使用现有 `Popover` / `PopoverTrigger` / `PopoverContent`（Radix UI），不自建浮层
- [ ] `PopoverContent` 样式使用 `--bg-overlay` + `--border-default` + `--radius-card` + `--shadow-overlay`
- [ ] 触发方式：**点击**（不是 hover），ESC / 外部点击关闭
- [ ] 公式框使用 `--nested-glass-bg` 底色
- [ ] 无数据时不弹 Popover，或显示"数据不足，暂无法计算"

> **来源**：Insights V1 新增指标计算详情弹层，需在设计系统内规范化。

---

## 13. 提交前 20 问（必须全部回答）

原 15 问 + 5 个新增问题：

1. 这个页面属于哪种 page pattern？
2. 主内容是否全部进入了主 `SectionCard`？
3. 有没有中间漂浮块？
4. 有没有重复标题？
5. 集合内容为什么不是 list？
6. tab / pill 点击后顺序会不会变化？
7. tab 切换后布局会不会抖动？
8. 桌面端是否被错误降级？
9. 移动端是否泄漏桌面规则？
10. select/value 会不会折成两行？
11. badge 是否都来自系统组件？
12. 文档内容是否走统一 `DocumentRenderer`？
13. `DocumentRenderer` 是否依赖文案硬编码？
14. 这一页里还有没有 orphan element？
15. 这一页里还有没有重复内容？
16. ⚡ 所有颜色 token 是否精准？（hover 用 `--hover-bg`？divider 用 `--border-subtle`？selected 用 `--accent-soft`？）
17. ⚡ 行选中/hover 背景是否覆盖**整行**（含 CTA 列）？
18. ⚡ 移动端多列是否做了 2 行降级？列表是否可滚动？
19. ⚡ 所有术语在全局是否一致？（grep 确认）
20. ⚡ 搜索框是否处理了中文 IME（compositionstart/end）？

只要有 1 个问题答不清楚，就不要提交。

---

## 14. 最终要求

以后 AM Hub 的开发和审计，不仅检查"视觉统一"，还必须同时检查：

- 交互稳定性
- 信息重复
- 组件成熟度
- 响应式泄漏
- 内容渲染结构
- Token 精准性
- 术语全局一致性

> **这不是纯视觉 QA 清单，而是一份"视觉 + 交互 + 信息层级 + 组件治理 + Token 精准 + 工程纪律"的系统审计清单。**

---

## 15. 中文输入法（IME）处理 ⚡ NEW

### 15.1 搜索框是否支持 IME 合成？
- [ ] 搜索框监听了 `onCompositionStart` 和 `onCompositionEnd` 事件
- [ ] 使用 `useRef` 记录 `isComposing` 状态
- [ ] debounce effect 在 `isComposing === true` 时跳过，不触发搜索
- [ ] `onCompositionEnd` 时用最终值立即触发搜索

### 15.2 其它文本输入是否也需要考虑？
- [ ] 所有带 debounce 即时搜索的 `<input>` 都要处理 IME
- [ ] 按 Enter 触发的搜索不受此影响（回车本身在 composition 结束后才触发）

> **来源**：Company Master 搜索框拼音输入时每键一字母就搜索，用户根本打不完字。

---

## 16. Overlay / Drawer 面板规范 ⚡ NEW

### 16.1 遮罩层是否覆盖全视口？
- [ ] 遮罩 div 使用 `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh`
- [ ] **不依赖** CSS `inset: 0`（某些 Feishu 环境下兼容性问题）
- [ ] 遮罩底部没有露出一条缝隙

### 16.2 面板是否放在 SectionCard 外部？
- [ ] Overlay 面板（Preview / Drawer）**不在** `SectionCard` 内部
- [ ] 避免 `SectionCard` 的 `overflow: hidden`（为圆角裁切）干扰面板动画和定位
- [ ] 面板作为 `PageContent` 的兄弟节点或 `position: fixed` 独立于页面流

### 16.3 面板退出动画是否有延迟卸载？
- [ ] 使用 `isClosing` state 在关闭时延迟组件卸载
- [ ] 退出动画播放完毕后，通过 `onAnimationEnd` 回调真正清除状态
- [ ] 不在动画未完成时直接 `unmount` 导致退出动画不可见

### 16.4 面板背景是否正确？
- [ ] Overlay 面板背景使用 `--bg-surface-strong` 或纯白（不是 `--nested-glass-bg` 的半透明）
- [ ] 在面板用作 fixed drawer 时，背景必须不透明

> **来源**：Preview 曾透明叠在列表上（split panel 在 SectionCard 内被 overflow:hidden 裁切）；遮罩层底部露缝隙。

---

## 附录 A：v2.0 新增条目来源索引

| 新增条目 | 来源问题 |
|---------|---------|
| §3.4 eyebrow 一致性 | FTS 页 eyebrow "洞察" vs sidebar "Insights" |
| §4.4 Token 精准性 | design-spec 审查 4 处偏差 |
| §5.4 行选中全覆盖 | "蓝底不覆盖 CTA 列"出现 3 次 |
| §7.5 移动端多列降级 | 手机端 CTA 竖排、列表不可滚动 |
| §7.6 Sticky 不透明 | 趋势表 sticky 列透出内容 |
| §8.5 统计数字独立 | stats 数字随 FilterPill 变化 |
| §10.4 工程术语泄漏 | Settings 含"CSV 文件"、Runway 显示"待补数据" |
| §10.5 术语全局一致 | "现金跑道/跑道/跑道告警"分散 5 文件 |
| §12.3 Popover 规范 | 指标详情弹层需设计系统入口 |
| §15 IME 处理 | 拼音输入时每键搜索 |
| §16 Overlay 规范 | Preview 透明叠加 + 遮罩漏缝 |
