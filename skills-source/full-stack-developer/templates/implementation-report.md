# Implementation Report

## 实现范围
- 新增/修改/删除文件：{N} 个，约 {N} 行

## 平台能力利用
- {列出本次利用了哪些平台能力而非自建}

## 目录结构
{创建的目录和关键文件列表}

## 实现要点
{数据层 / 后端 / 前端 / 脚本 各自要点}

## Handoff / 硬上线限制标注 / 已知局限 / Upstream Issues
{如有，逐条列出}

## 飞书本地代码修改报告（仅 delivery_mode: local_code_sync 时附加）
- 已完成本地代码修改：{文件列表 + 摘要}
- 依赖 mock/stub 的部分：{哪些功能因本地无 DB/插件而使用 mock}
- 需云端验证的项目：{从 cloud_validation_items 继承 + 新增项}
- 上传前检查：`type:check` · `lint` · `build` 通过；mock/stub 已标注，不会上传为生产代码
