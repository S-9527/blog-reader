import type { PresetFeedCategory } from "@/lib/preset-feeds";

export type DiscoverySeed = {
  title: string;
  siteUrl: string; // 站点主页域名（稳定，几乎不变）
  category: PresetFeedCategory;
  description: string;
  // 已知的精准 RSS 端点（可选）。提供了就直接验证用它，省去主页探测。
  knownRss?: string;
};

// 自动发现种子池。
// 与「预置源库」的区别：这里存的是稳定不轻易失效的“站点主页域名”，
// 定时任务会抓取主页并用标准 <link rel="alternate"> 探测真实 RSS 端点，
// 端点变化也能自动跟随，无需人工维护脆弱的 rss 路径。
export const DISCOVERY_SEEDS: DiscoverySeed[] = [
  // ── 前端框架与库 ──
  { title: "Vue.js", siteUrl: "https://vuejs.org", category: "前端框架", description: "Vue.js 官方博客" },
  { title: "Tailwind CSS", siteUrl: "https://tailwindcss.com", category: "前端框架", description: "Tailwind CSS 官方博客" },
  { title: "Preact", siteUrl: "https://preactjs.com", category: "前端框架", description: "Preact 官方博客" },
  { title: "SolidJS", siteUrl: "https://www.solidjs.com", category: "前端框架", description: "SolidJS 官方博客" },
  { title: "Lit", siteUrl: "https://lit.dev", category: "前端框架", description: "Lit 官方博客（Web Components）" },
  { title: "Alpine.js", siteUrl: "https://alpinejs.dev", category: "前端框架", description: "Alpine.js 官方博客" },
  { title: "Astro", siteUrl: "https://astro.build", category: "前端框架", description: "Astro 官方博客（静态站点框架）" },
  { title: "Qwik", siteUrl: "https://qwik.builder.io", category: "前端框架", description: "Qwik 官方博客" },
  { title: "Remix", siteUrl: "https://remix.run", category: "前端框架", description: "Remix 全栈框架博客" },

  // ── 后端与语言 ──
  { title: "Java", siteUrl: "https://blogs.oracle.com/java", category: "后端与语言", description: "Oracle Java 官方博客" },
  { title: "C++ (ISOCPP)", siteUrl: "https://isocpp.org/blog", category: "后端与语言", description: "C++ 标准委员会博客", knownRss: "https://isocpp.org/blog/rss" },
  { title: "Ruby on Rails", siteUrl: "https://rubyonrails.org", category: "后端与语言", description: "Ruby on Rails 官方博客" },
  { title: "Elixir", siteUrl: "https://elixir-lang.org", category: "后端与语言", description: "Elixir 语言官方博客" },
  { title: "Swift", siteUrl: "https://www.swift.org", category: "后端与语言", description: "Swift 官方博客" },
  { title: "Kotlin", siteUrl: "https://blog.jetbrains.com/kotlin", category: "后端与语言", description: "Kotlin 官方博客" },
  { title: "PHP", siteUrl: "https://www.php.net", category: "后端与语言", description: "PHP 官方博客" },
  { title: "Scala", siteUrl: "https://www.scala-lang.org", category: "后端与语言", description: "Scala 官方博客" },
  { title: "Haskell (GHC)", siteUrl: "https://www.haskell.org/ghc/blog/rss.xml", category: "后端与语言", description: "GHC/Haskell 官方博客" },

  // ── 运行时与构建 ──
  { title: "Vite", siteUrl: "https://vitejs.dev", category: "运行时与构建", description: "Vite 构建工具官方博客" },
  { title: "webpack", siteUrl: "https://webpack.js.org", category: "运行时与构建", description: "webpack 官方博客" },
  { title: "Rollup", siteUrl: "https://rollupjs.org", category: "运行时与构建", description: "Rollup 官方博客" },
  { title: "Turborepo", siteUrl: "https://turbo.build/blog", category: "运行时与构建", description: "Turborepo 官方博客" },
  { title: "Electron", siteUrl: "https://www.electronjs.org", category: "运行时与构建", description: "Electron 官方博客" },
  { title: "Tauri", siteUrl: "https://tauri.app", category: "运行时与构建", description: "Tauri 桌面框架博客" },
  { title: "Deno", siteUrl: "https://deno.com", category: "运行时与构建", description: "Deno 官方博客" },

  // ── 数据库与基础设施 ──
  { title: "PostgreSQL", siteUrl: "https://www.postgresql.org", category: "数据库与基础设施", description: "PostgreSQL 官方新闻与博客" },
  { title: "Redis", siteUrl: "https://redis.io", category: "数据库与基础设施", description: "Redis 官方博客" },
  { title: "SQLite", siteUrl: "https://sqlite.org", category: "数据库与基础设施", description: "SQLite 官方发布" },
  { title: "Apache Cassandra", siteUrl: "https://cassandra.apache.org", category: "数据库与基础设施", description: "Apache Cassandra 博客" },
  { title: "Neo4j", siteUrl: "https://neo4j.com", category: "数据库与基础设施", description: "Neo4j 图数据库博客" },
  { title: "Elastic", siteUrl: "https://www.elastic.co", category: "数据库与基础设施", description: "Elastic（ES）官方博客" },
  { title: "HashiCorp", siteUrl: "https://www.hashicorp.com/blog", category: "数据库与基础设施", description: "HashiCorp（Terraform/Vault）博客" },
  { title: "Ansible", siteUrl: "https://www.ansible.com", category: "数据库与基础设施", description: "Ansible 自动化博客" },
  { title: "Ubuntu", siteUrl: "https://ubuntu.com/blog", category: "数据库与基础设施", description: "Ubuntu 官方博客" },
  { title: "Kubernetes", siteUrl: "https://kubernetes.io", category: "数据库与基础设施", description: "Kubernetes 官方博客" },

  // ── 移动与浏览器 ──
  { title: "Chrome Developers", siteUrl: "https://developer.chrome.com", category: "移动与浏览器", description: "Chrome 开发者官方博客" },
  { title: "Mozilla Hacks", siteUrl: "https://hacks.mozilla.org", category: "移动与浏览器", description: "Mozilla Hacks 技术博客" },
  { title: "MDN Blog", siteUrl: "https://developer.mozilla.org", category: "移动与浏览器", description: "MDN 开发者官方博客" },
  { title: "Flutter", siteUrl: "https://medium.com/flutter", category: "移动与浏览器", description: "Flutter 官方博客（Medium）" },
  { title: "Apple Developer", siteUrl: "https://developer.apple.com", category: "移动与浏览器", description: "Apple Developer 新闻" },
  { title: "Android Developers", siteUrl: "https://android-developers.googleblog.com", category: "移动与浏览器", description: "Android 官方开发者博客" },

  // ── 平台与工程博客 ──
  { title: "Google AI Blog", siteUrl: "https://blog.google/technology/ai", category: "平台与工程博客", description: "Google AI 官方博客" },
  { title: "Amazon Science", siteUrl: "https://www.amazon.science", category: "平台与工程博客", description: "Amazon Science 研究博客" },
  { title: "Microsoft Azure", siteUrl: "https://azure.microsoft.com/en-us/blog", category: "平台与工程博客", description: "Microsoft Azure 官方博客" },
  { title: "IBM Developer", siteUrl: "https://developer.ibm.com", category: "平台与工程博客", description: "IBM Developer 博客" },
  { title: "DigitalOcean", siteUrl: "https://www.digitalocean.com/blog", category: "平台与工程博客", description: "DigitalOcean 官方博客" },
  { title: "Netlify", siteUrl: "https://www.netlify.com/blog", category: "平台与工程博客", description: "Netlify 官方博客" },
  { title: "Stripe", siteUrl: "https://stripe.com/blog", category: "平台与工程博客", description: "Stripe 官方博客" },
  { title: "Uber Engineering", siteUrl: "https://www.uber.com/blog/engineering", category: "平台与工程博客", description: "Uber 工程博客" },
  { title: "Dropbox Tech", siteUrl: "https://dropbox.tech", category: "平台与工程博客", description: "Dropbox 技术博客" },
  { title: "GitLab", siteUrl: "https://about.gitlab.com/blog", category: "平台与工程博客", description: "GitLab 官方博客" },
  { title: "Atlassian Engineering", siteUrl: "https://www.atlassian.com/engineering", category: "平台与工程博客", description: "Atlassian 工程博客" },
  { title: "Figma", siteUrl: "https://www.figma.com/blog", category: "平台与工程博客", description: "Figma 官方博客" },
  { title: "Smashing Magazine", siteUrl: "https://www.smashingmagazine.com", category: "平台与工程博客", description: "Web 设计与开发杂志" },
  { title: "InfoQ", siteUrl: "https://www.infoq.com", category: "平台与工程博客", description: "InfoQ 软件工程资讯" },
  { title: "Lobsters", siteUrl: "https://lobste.rs", category: "平台与工程博客", description: "Lobsters 技术社区" },
];

// 常见 RSS 端点路径兜底（当主页无 rel=alternate 时尝试）
export const FALLBACK_RSS_PATHS = [
  "/rss.xml",
  "/feed.xml",
  "/rss",
  "/feed",
  "/atom.xml",
  "/index.xml",
  "/feeds/posts/default",
  "/blog/feed.xml",
  "/blog/rss.xml",
  "/feeds/rss.xml",
  "/feeds/feed.xml",
  "/blog/feed",
];
