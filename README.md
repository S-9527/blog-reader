# FeedFlow — RSS 博客阅读器

一个全栈 RSS 阅读器，基于 **Next.js 16 + React 19 + Tailwind 4 + Prisma 7 + PostgreSQL (Neon)**，支持 GitHub 登录、订阅管理、文章流阅读、收藏与已读状态、定时抓取。

## 功能

- 🔐 GitHub OAuth 多用户登录（数据库会话）
- 📡 订阅任意 RSS/Atom 源，自动解析标题、站点图标
- 🧰 内置「官方博客源库」：30+ 主流框架/语言/平台博客，勾选一键批量订阅
- 📰 文章流：全部 / 未读 / 收藏 / 按源筛选
- ✨ 文章详情：消毒后的 HTML 正文直接渲染，阅读即标记，支持收藏；摘要太短可「加载全文」
- 🔄 手动刷新 + 定时抓取（Vercel Cron，每日一次）
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
- 定时抓取：`vercel.json` 配置每天 02:30 触发 `/api/cron/fetch`

## 官方博客源库

位于 `src/lib/preset-feeds.ts`，按「前端框架 / 后端与语言 / 数据库与基础设施 / 移动与浏览器 / 平台与工程博客」分类。
所有地址均已实测可用；官方改版常导致 RSS 失效，维护时建议定期用 `curl -I <url>` 复验后更新。

## GitHub OAuth 回调地址

GitHub OAuth App 的 **Authorization callback URL 只能填一个值**（不支持同时填多个不同主机）。

- **Homepage URL**：`https://blog-reader-self.vercel.app`
- **Authorization callback URL**：`https://blog-reader-self.vercel.app/api/auth/callback/github`

本地开发时如需测试登录，临时把 Authorization callback URL 改为
`http://localhost:3000/api/auth/callback/github` 即可，测完恢复生产地址。
