# FeedFlow — RSS 博客阅读器

一个全栈 RSS 阅读器，基于 **Next.js 16 + React 19 + Tailwind 4 + Prisma 7 + PostgreSQL (Neon)**，支持 GitHub 登录、订阅管理、文章流阅读、收藏与已读状态、定时抓取。

## 功能

- 🔐 GitHub OAuth 多用户登录（数据库会话）
- 📡 订阅任意 RSS/Atom 源，自动解析标题、站点图标
- 🧰 开源订阅目录：自动摄入社区维护的 OPML 开放目录（2000+ 源），浏览/搜索/一键订阅，无需人工维护
- 📰 文章流：全部 / 未读 / 收藏 / 按源筛选
- ✨ 文章详情：消毒后的 HTML 正文直接渲染，阅读即标记，支持收藏；摘要太短可「加载全文」
- 🔄 手动刷新 + 定时抓取（Vercel Cron，每日一次）
- 🩺 订阅源健康校验：定时探测，连续失败自动标记「可能失效」
- 🔍 自动发现：定时摄入社区开放的 OPML 订阅目录（Developer Blog Directory、Engineering Blogs 等），自动收录/更新新源
- 🌐 文章翻译：详情页「原文 / 中文译文」一键切换，用 DeepL（tag_handling=html）保留排版，译文落库缓存
- 🖥️ 响应式侧边栏布局

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 + @tailwindcss/typography |
| ORM | Prisma 7 (driver adapter) |
| 数据库 | PostgreSQL (Neon / 任意 PG) |
| 认证 | NextAuth v4 + GitHub + Prisma adapter |
| RSS 解析 | rss-parser + 代理感知的抓取层 |

## 快速开始

```bash
pnpm install
cp .env.example .env        # 填入真实值
pnpm db:push                # 建表
pnpm dev
```

打开 http://localhost:3000

## 环境变量

见 `.env.example`。生产环境（Vercel）需要配置：

- `DATABASE_URL` — PostgreSQL 连接串
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth App
- `NEXTAUTH_SECRET` — 签名密钥
- `NEXTAUTH_URL` — 站点完整 URL
- `CRON_SECRET`（可选）— 保护定时抓取端点
- `DEEPL_API_KEY`（可选）— DeepL API key（`xxxx:fx`，Free 档即可）。未配置时翻译按钮会提示功能未开启

## 文章翻译

详情页正文区右上角有「原文 / 中文译文」切换。点击译文会调用 DeepL API Free（`api-free.deepl.com`，`tag_handling=html`，EN→ZH）：
- 保留原文章 HTML 结构与排版（代码块、列表、链接、表格等）
- 若文章只有短摘要，会先自动提取全文再翻译
- 译文写入 `Article.translatedContent` **落库缓存**，重复查看不消耗 DeepL 配额
- 超过 DeepL 单次 128 KiB 上限的长文会自动分块翻译

免费档 50 万字符/月，key 获取：https://www.deepl.com/account/summary → API → 生成 Free 密钥。

## 数据库迁移

```bash
pnpm postinstall        # 生成 Prisma Client
pnpm db:push            # 开发：直接同步表结构
# 生产构建时会自动执行: prisma migrate deploy
```

## 部署

项目已连接 Vercel + GitHub，**推送 `main` 分支即自动部署**。

- 生产地址由 Vercel 分配（如 `https://blog-reader-self.vercel.app`）
- 构建脚本会在部署时自动执行 `prisma migrate deploy`
- 定时抓取：`vercel.json` 配置每天 02:30 触发 `/api/cron/fetch`（抓取文章 + 校验健康 + 自动发现）

## 订阅目录（开源 OPML）

「发现新源」不再依赖任何人工维护的名单，而是**自动摄入社区维护的开放 OPML 订阅目录**：

- 根源（见 `src/lib/opml-sources.ts`）：
  - **Developer Blog Directory**（`dev-blog-directory/dev-blog-directory`，2000+ 源）
  - **Engineering Blogs**（`kilimchoi/engineering-blogs`，400+ 源）
- 定时任务 `syncDirectoryFeeds()` 抓取各 OPML，按 `url` 幂等同步进 `PresetFeed` 表：新增标记 `isNew`（7 天后过期），同一 URL 只更新元数据（标题/分类/来源），不产生重复。
- 前端「发现新源」面板：开放式浏览 + 关键词搜索 + 分类过滤 + 只看新发现，一键订阅为重心，无需输入订阅地址之外的任何东西。

## 健康校验与自动发现

定时任务 `/api/cron/fetch`（每日 02:30）在抓取文章之外，还执行：

1. **订阅源健康校验** — 抓取用户订阅源时累计 `consecutiveFailures`，连续失败达到 3 次即标记 `isHealthy=false`，管理页显示「可能失效」标记与最后一次错误。
2. **订阅目录摄入** — `syncDirectoryFeeds()` 拉取社区 OPML，幂等收录/更新新源；超 7 天的「新发现」标记自动过期。
3. **源库健康校验（预算制）** — 源库庞大（数千条），为不超时采用预算制：优先校验用户已订阅的源与新发现的源，其余按最久未校验轮转，每次最多校验 `VALIDATE_BUDGET`（120）个；失效源 `isValid=false`，在目录中置灰、暂不可订阅。

## GitHub OAuth 回调地址

GitHub OAuth App 的 **Authorization callback URL 只能填一个值**（不支持同时填多个不同主机）。

- **Homepage URL**：`https://blog-reader-self.vercel.app`
- **Authorization callback URL**：`https://blog-reader-self.vercel.app/api/auth/callback/github`

本地开发时如需测试登录，临时把 Authorization callback URL 改为
`http://localhost:3000/api/auth/callback/github` 即可，测完恢复生产地址。
