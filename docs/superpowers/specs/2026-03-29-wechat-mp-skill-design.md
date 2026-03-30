# WeChat MP Skill 设计文档

## 概述

一个 Claude Code Skill，用于管理多个微信公众号的草稿箱和素材。通过 TypeScript CLI 工具封装微信公众号 API，Skill 文件编排交互流程。支持在 Claude Code、Claude Cowork、OpenClaw 中调用。

## 需求

- 管理多个公众号（通过别名区分）
- 草稿箱操作：创建、查看列表、查看详情、删除、发布
- 素材管理：上传图片、获取列表、获取详情
- 接收其他 Agent 生成的文章（Markdown 或 HTML），Markdown 自动转换为公众号兼容 HTML
- access_token 本地缓存，过期自动刷新

## 架构

**Skill 提示词 + TypeScript CLI 工具**

- `skill.md`：定义触发条件、工作流程、交互逻辑，不含业务代码
- `src/`：TypeScript CLI 工具，负责所有 API 调用、token 管理、格式转换
- Claude 通过 Bash 工具执行 CLI 命令，解析 JSON 输出

## 项目结构

```
wechat-mp-skill/
├── skill.md                     # Skill 定义文件
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts                   # CLI 入口，子命令分发
│   ├── config.ts                # 读取/校验配置文件
│   ├── token.ts                 # access_token 缓存与刷新
│   ├── markdown.ts              # Markdown → 公众号 HTML 转换
│   ├── api/
│   │   ├── client.ts            # HTTP 客户端封装（带 token 自动注入）
│   │   ├── draft.ts             # 草稿箱 API
│   │   └── material.ts          # 素材管理 API
│   └── types.ts                 # 类型定义
├── config.example.json          # 配置文件模板
└── dist/                        # 编译输出
```

## 配置文件

路径：`~/.wechat-mp/config.json`

```json
{
  "accounts": {
    "my-blog": {
      "name": "我的博客",
      "appId": "wx...",
      "appSecret": "..."
    },
    "tech-weekly": {
      "name": "技术周刊",
      "appId": "wx...",
      "appSecret": "..."
    }
  }
}
```

token 缓存路径：`~/.wechat-mp/tokens.json`

```json
{
  "my-blog": {
    "accessToken": "...",
    "expiresAt": 1711700000000
  }
}
```

## CLI 命令

所有命令输出为 JSON 格式，方便 Claude 解析。

### 公众号管理

| 命令 | 说明 |
|------|------|
| `wechat-mp accounts` | 列出所有配置的公众号 |

### 草稿箱操作

| 命令 | 说明 |
|------|------|
| `wechat-mp draft list [--account=别名]` | 列出草稿列表 |
| `wechat-mp draft create --file=文章路径 [--account=别名]` | 创建草稿（支持 .md 和 .html） |
| `wechat-mp draft get --media-id=ID [--account=别名]` | 获取草稿详情 |
| `wechat-mp draft delete --media-id=ID [--account=别名]` | 删除草稿 |
| `wechat-mp draft publish --media-id=ID [--account=别名]` | 发布草稿 |

### 素材管理

| 命令 | 说明 |
|------|------|
| `wechat-mp material upload --file=图片路径 --type=image [--account=别名]` | 上传素材 |
| `wechat-mp material list --type=image [--account=别名]` | 获取素材列表 |
| `wechat-mp material get --media-id=ID [--account=别名]` | 获取素材详情 |

## 文章文件格式

支持 YAML frontmatter 指定元信息：

```markdown
---
title: 文章标题
author: 作者名
digest: 文章摘要
thumb_media_id: 封面图素材ID
---

文章正文内容...
```

- `.md` 文件：正文自动转换为公众号兼容 HTML（内联样式）
- `.html` 文件：正文直接使用

## 核心模块

### token.ts — access_token 管理

- 读取 `~/.wechat-mp/tokens.json` 缓存
- 检查 token 是否存在且未过期（提前 5 分钟视为过期）
- 过期则调用微信 `/cgi-bin/token` 接口刷新，写回缓存
- 暴露 `getAccessToken(accountAlias: string): Promise<string>`

### client.ts — HTTP 客户端

- 使用 Node 18+ 内置 `fetch`
- 自动注入 access_token 到请求参数
- 统一处理微信 API 错误码（errcode !== 0 时抛出异常）
- token 过期（errcode 40001/42001）时自动刷新一次并重试

### markdown.ts — Markdown 转 HTML

- 使用 `marked` 解析 Markdown
- 注入公众号兼容的内联样式（公众号不支持外部 CSS 和 `<style>` 标签）
- 内置默认样式：标题、段落、代码块、列表、引用、图片
- 代码块语法高亮使用 `highlight.js`，输出内联样式

### config.ts — 配置管理

- 从 `~/.wechat-mp/config.json` 读取配置
- 校验必填字段（appId、appSecret）
- `getAccount(alias?: string)`：有别名返回对应账号，无别名输出可用列表

### cli.ts — 命令入口

- 使用 `commander` 做子命令解析
- 所有输出为 JSON 格式
- 非零退出码 + stderr 输出错误信息

## Skill 文件

`skill.md` 定义：

### 多公众号选择逻辑
1. 用户指定别名 → 使用 `--account=别名`
2. 未指定 → 运行 `wechat-mp accounts` 获取列表，展示给用户选择

### 发布文章流程
1. 确定目标公众号
2. 确认文章文件路径和格式
3. 如需封面图且未指定 thumb_media_id，先引导上传封面图
4. 执行 `wechat-mp draft create`
5. 创建成功后询问是否立即发布
6. 如需发布，执行 `wechat-mp draft publish`

### 管理草稿流程
- 查看列表 → `wechat-mp draft list`
- 查看详情 → `wechat-mp draft get`
- 删除 → `wechat-mp draft delete`

### 素材管理流程
- 上传 → `wechat-mp material upload`
- 列表 → `wechat-mp material list`

## 依赖

| 包 | 用途 |
|---|------|
| `commander` | CLI 子命令解析 |
| `marked` | Markdown → HTML |
| `highlight.js` | 代码块语法高亮 |
| `typescript` (dev) | 编译 |

Node 18+ 内置 `fetch`，无需额外 HTTP 库。

## 安装使用

- **本地开发**：`npm install && npm run build`，然后 `node dist/cli.js`
- **全局安装**：`npm install -g .`，然后直接 `wechat-mp`
- **Skill 中调用**：`npx wechat-mp` 或绝对路径调用
