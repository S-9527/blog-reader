export type PresetFeedCategory =
  | "前端框架"
  | "后端与语言"
  | "运行时与构建"
  | "数据库与基础设施"
  | "移动与浏览器"
  | "平台与工程博客";

export type PresetFeed = {
  title: string;
  url: string;
  siteUrl: string;
  category: PresetFeedCategory;
  description: string;
};

// 技术官方博客预置源库。
// 所有源均经过 HTTP 200 实测验证，可在订阅源管理页一键批量添加。
// 注意：官方改版常导致 RSS 地址失效，需定期用同样的方式复验与更新。
export const PRESET_FEEDS: PresetFeed[] = [
  // ── 前端框架 ──
  {
    title: "React",
    url: "https://react.dev/rss.xml",
    siteUrl: "https://react.dev",
    category: "前端框架",
    description: "React 官方博客，UI 库更新与设计说明",
  },
  {
    title: "Svelte",
    url: "https://svelte.dev/blog/rss.xml",
    siteUrl: "https://svelte.dev",
    category: "前端框架",
    description: "Svelte 官方博客，编译器式前端框架",
  },
  {
    title: "Angular",
    url: "https://blog.angular.dev/feed",
    siteUrl: "https://blog.angular.dev",
    category: "前端框架",
    description: "Angular 官方博客，版本发布与生态动态",
  },
  {
    title: "Next.js",
    url: "https://nextjs.org/feed.xml",
    siteUrl: "https://nextjs.org",
    category: "前端框架",
    description: "Next.js 官方博客，React 全栈框架更新",
  },
  {
    title: "Remix",
    url: "https://remix.run/blog/rss.xml",
    siteUrl: "https://remix.run",
    category: "前端框架",
    description: "Remix 官方博客，全栈 Web 框架",
  },
  {
    title: "React Native",
    url: "https://reactnative.dev/blog/rss.xml",
    siteUrl: "https://reactnative.dev",
    category: "前端框架",
    description: "React Native 官方博客，跨平台移动开发",
  },
  {
    title: "Overreacted",
    url: "https://overreacted.io/rss.xml",
    siteUrl: "https://overreacted.io",
    category: "前端框架",
    description: "Dan Abramov 的 React 深入文章",
  },

  // ── 后端与语言 ──
  {
    title: "Node.js",
    url: "https://nodejs.org/en/feed/blog.xml",
    siteUrl: "https://nodejs.org",
    category: "后端与语言",
    description: "Node.js 官方博客，运行时版本与核心变更",
  },
  {
    title: "Deno",
    url: "https://deno.com/blog/feed.xml",
    siteUrl: "https://deno.com",
    category: "后端与语言",
    description: "Deno 官方博客，现代 JavaScript/TypeScript 运行时",
  },
  {
    title: "Bun",
    url: "https://bun.com/rss.xml",
    siteUrl: "https://bun.com",
    category: "后端与语言",
    description: "Bun 官方博客，飞速 JavaScript 运行时/工具链",
  },
  {
    title: "TypeScript",
    url: "https://devblogs.microsoft.com/typescript/feed/",
    siteUrl: "https://devblogs.microsoft.com/typescript",
    category: "后端与语言",
    description: "TypeScript 官方团队博客",
  },
  {
    title: "Rust",
    url: "https://blog.rust-lang.org/feed.xml",
    siteUrl: "https://blog.rust-lang.org",
    category: "后端与语言",
    description: "Rust 语言官方博客",
  },
  {
    title: "Inside Rust",
    url: "https://blog.rust-lang.org/inside-rust/feed.xml",
    siteUrl: "https://blog.rust-lang.org/inside-rust",
    category: "后端与语言",
    description: "Rust 团队内部开发动态",
  },
  {
    title: "Go 语言",
    url: "https://go.dev/blog/feed.atom",
    siteUrl: "https://go.dev",
    category: "后端与语言",
    description: "Go 官方博客，语言设计与发布",
  },
  {
    title: "Python",
    url: "https://blog.python.org/feeds/posts/default",
    siteUrl: "https://blog.python.org",
    category: "后端与语言",
    description: "Python 官方博客（Blogger 源）",
  },

  // ── 数据库与基础设施 ──
  {
    title: "Docker",
    url: "https://blog.docker.com/feed/",
    siteUrl: "https://blog.docker.com",
    category: "数据库与基础设施",
    description: "Docker 官方博客，容器与平台",
  },
  {
    title: "Kubernetes",
    url: "https://kubernetes.io/feed.xml",
    siteUrl: "https://kubernetes.io",
    category: "数据库与基础设施",
    description: "Kubernetes 官方博客，容器编排",
  },
  {
    title: "MongoDB",
    url: "https://www.mongodb.com/blog/rss",
    siteUrl: "https://www.mongodb.com",
    category: "数据库与基础设施",
    description: "MongoDB 官方博客",
  },
  {
    title: "AWS Blog",
    url: "https://aws.amazon.com/blogs/aws/feed/",
    siteUrl: "https://aws.amazon.com/blogs/aws",
    category: "数据库与基础设施",
    description: "AWS 官方新闻与公告",
  },
  {
    title: "AWS DevOps",
    url: "https://aws.amazon.com/blogs/devops/feed/",
    siteUrl: "https://aws.amazon.com/blogs/devops",
    category: "数据库与基础设施",
    description: "AWS 开发运维与 CI/CD",
  },
  {
    title: "Google Cloud",
    url: "https://cloud.google.com/blog/feed/releases.xml",
    siteUrl: "https://cloud.google.com/blog",
    category: "数据库与基础设施",
    description: "Google Cloud 发布与更新",
  },
  {
    title: "Cloudflare",
    url: "https://blog.cloudflare.com/rss/",
    siteUrl: "https://blog.cloudflare.com",
    category: "数据库与基础设施",
    description: "Cloudflare 官方博客，边缘与服务",
  },

  // ── 移动与浏览器 ──
  {
    title: "Android Developers",
    url: "https://android-developers.googleblog.com/feeds/posts/default",
    siteUrl: "https://android-developers.googleblog.com",
    category: "移动与浏览器",
    description: "Android 官方开发者博客",
  },
  {
    title: "web.dev",
    url: "https://web.dev/feed.xml",
    siteUrl: "https://web.dev",
    category: "移动与浏览器",
    description: "Web 平台能力与最佳实践（Chrome 团队）",
  },
  {
    title: "Google Developers",
    url: "https://developers.googleblog.com/?format=xml",
    siteUrl: "https://developers.googleblog.com",
    category: "移动与浏览器",
    description: "Google 开发者官方博客",
  },

  // ── 平台与工程博客 ──
  {
    title: "GitHub Blog",
    url: "https://github.blog/feed/",
    siteUrl: "https://github.blog",
    category: "平台与工程博客",
    description: "GitHub 官方博客，产品与生态",
  },
  {
    title: "GitHub Engineering",
    url: "https://github.blog/engineering/feed/",
    siteUrl: "https://github.blog/engineering",
    category: "平台与工程博客",
    description: "GitHub 工程团队技术文章",
  },
  {
    title: "Vercel",
    url: "https://vercel.com/blog/feed.xml",
    siteUrl: "https://vercel.com/blog",
    category: "平台与工程博客",
    description: "Vercel 官方博客（Next.js/Serverless 平台）",
  },
  {
    title: "Facebook Engineering",
    url: "https://engineering.fb.com/feed/",
    siteUrl: "https://engineering.fb.com",
    category: "平台与工程博客",
    description: "Meta/Facebook 工程团队博客",
  },
  {
    title: "Netflix TechBlog",
    url: "https://medium.com/feed/netflix-techblog",
    siteUrl: "https://netflixtechblog.com",
    category: "平台与工程博客",
    description: "Netflix 技术团队博客",
  },
  {
    title: "Spotify Engineering",
    url: "https://engineering.atspotify.com/feed/",
    siteUrl: "https://engineering.atspotify.com",
    category: "平台与工程博客",
    description: "Spotify 工程团队博客",
  },
  {
    title: "CSS-Tricks",
    url: "https://css-tricks.com/feed/",
    siteUrl: "https://css-tricks.com",
    category: "平台与工程博客",
    description: "CSS 与 Web 前端技巧",
  },
  {
    title: "LogRocket",
    url: "https://blog.logrocket.com/rss/",
    siteUrl: "https://blog.logrocket.com",
    category: "平台与工程博客",
    description: "前端与产品工程博客",
  },
];

export const PRESET_CATEGORIES: PresetFeedCategory[] = [
  "前端框架",
  "后端与语言",
  "数据库与基础设施",
  "移动与浏览器",
  "平台与工程博客",
];
