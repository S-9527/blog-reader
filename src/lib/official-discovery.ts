import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/rss";

// 自动发现官方/项目博客：
// 从库中已有来源出发，沿出链爬取新站点，用「内容识别」判断一个 URL 是否为 feed，
// 再按域名特征软分类为官方（official）vs 社区（community）。
// 不维护任何硬编码名单——目录随链接图自增长。

// 社区/门户域名，爬取时跳过（避免追去无关站点）
const SKIP_HOSTS = new Set([
  "github.com", "gitlab.com", "twitter.com", "x.com", "youtube.com",
  "facebook.com", "linkedin.com", "instagram.com", "medium.com", "dev.to",
  "reddit.com", "discord.com", "slack.com", "npmjs.com", "crates.io",
  "pypi.org", "maven.org", "nuget.org", "stackoverflow.com", "google.com",
  "images.unsplash.com", "gravatar.com",
]);

// 预算：种子数 / 内容识别上限 / 全局墙钟毫秒
export const DISCOVERY_SEED_BUDGET = 60;
export const DISCOVERY_FEED_BUDGET = 90;
export const DISCOVERY_DEADLINE_MS = 90_000;

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || null;
}

function fetchViaNode(url: string, timeoutMs: number) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = getProxyUrl() ? new HttpsProxyAgent(getProxyUrl()!) : undefined;
    let settled = false;
    const req = mod.get(
      url,
      { agent, headers: { "User-Agent": "Mozilla/5.0 (FeedFlow/1.0)" } },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          data += c;
          if (data.length > 500_000) req.destroy();
        });
        res.on("end", () => {
          if (!settled) {
            settled = true;
            clearTimeout(hardTimer);
            resolve({ status: res.statusCode ?? 0, body: data });
          }
        });
      }
    );
    // 硬超时：无论 socket 活动与否，到点直接 reject，避免 TLS 握手被阻断时挂死
    const hardTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        req.destroy();
        reject(new Error("Request timed out"));
      }
    }, timeoutMs);
    req.on("error", (e) => {
      if (!settled) {
        settled = true;
        clearTimeout(hardTimer);
        reject(e);
      }
    });
  });
}

async function fetchPage(url: string): Promise<{ status: number; body: string }> {
  try {
    const r = await fetchViaNode(url, 15000);
    // 跟随重定向
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      return r;
    }
    return r;
  } catch {
    return { status: 0, body: "" };
  }
}

function extractLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 200) {
    const href = m[1];
    if (!/^https?:\/\//i.test(href)) continue;
    try {
      out.push(new URL(href, base).toString());
    } catch {
      // ignore
    }
  }
  return out;
}

/** 从页面提取 rel=alternate 的 feed 端点 */
function extractAlternateFeeds(html: string, base: string): string[] {
  const out: string[] = [];
  const links =
    html.match(/<link[^>]*rel=["']?alternate["']?[^>]*>/gi) || [];
  for (const tag of links) {
    if (!/rss|atom/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      out.push(new URL(href, base).toString());
    } catch {
      // ignore
    }
  }
  return out;
}

async function isFeed(url: string): Promise<boolean> {
  try {
    await parseFeed(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从库中已有的来源出发，爬取 1 跳出链，用内容识别发现新 feed 并收录。
 * 返回新增/更新统计。
 */
export async function discoverFeedsFromGraph(): Promise<{
  visited: number;
  discovered: number;
  updated: number;
}> {
  // 1. 已收录来源（官方+目录），取其 site 根，作为爬取起点
  const rows = await prisma.presetFeed.findMany({
    select: { url: true, siteUrl: true },
  });
  const sites = new Set<string>();
  const existingDomains = new Set<string>();
  for (const r of rows) {
    const site = r.siteUrl || r.url;
    try {
      const u = new URL(site);
      existingDomains.add(u.hostname.toLowerCase());
      sites.add(u.origin);
    } catch {
      // ignore
    }
  }

  const visited = new Set<string>();
  let discovered = 0;
  let updated = 0;

  const candidates = new Map<string, { url: string }>();
  // 全局墙钟上限：保证 cron 有界、不挂死（爬取的是外部网络，可能被限速或阻断）
  const deadline = Date.now() + DISCOVERY_DEADLINE_MS;
  const over = () => Date.now() >= deadline;
  // 种子与候选都有预算，避免无限膨胀
  const pending = Array.from(sites).slice(0, DISCOVERY_SEED_BUDGET);

  for (let i = 0; i < pending.length && !over(); i += 5) {
    const chunk = pending.slice(i, i + 5);
    await Promise.all(
      chunk.map(async (origin) => {
        visited.add(origin);
        // 抓主页，也试 /blog 子页更可能带出链与 feed 声明
        for (const page of [origin, `${origin}/blog`]) {
          if (over()) return;
          const r = await fetchPage(page);
          if (r.status < 200 || r.status >= 400 || !r.body) continue;
          for (const link of extractLinks(r.body, origin)) {
            let host: string;
            try {
              host = new URL(link).hostname.toLowerCase();
            } catch {
              continue;
            }
            if (SKIP_HOSTS.has(host.replace(/^www\./, ""))) continue;
            if (existingDomains.has(host) || visited.has(host)) continue;
            candidates.set(host, { url: link });
          }
        }
      })
    );
  }

  // 2. 对候选新域名做内容识别（先试其主页上的 rel=alternate，再试页面本身是否为 feed）
  const newDomainSeeds = Array.from(candidates.entries()).slice(0, DISCOVERY_FEED_BUDGET);
  for (let i = 0; i < newDomainSeeds.length && !over(); i += 5) {
    const chunk = newDomainSeeds.slice(i, i + 5);
    await Promise.all(
      chunk.map(async ([host, { url }]) => {
        if (over()) return;
        let found = false;
        const targetOrigin = new URL(url).origin;
        const r = await fetchPage(targetOrigin);
        if (r.status >= 200 && r.status < 400 && r.body) {
          const alternates = extractAlternateFeeds(r.body, targetOrigin);
          for (const alt of alternates) {
            if (await isFeed(alt)) {
              await upsertFound(host, alt, targetOrigin);
              discovered++;
              found = true;
              break;
            }
          }
          if (!found && (await isFeed(targetOrigin))) {
            await upsertFound(host, targetOrigin, targetOrigin);
            discovered++;
          }
        }
      })
    );
  }

  return { visited: visited.size, discovered, updated };

  async function upsertFound(host: string, feedUrl: string, siteUrl: string) {
    const url = feedUrl.replace(/\/$/, "");
    const existing = await prisma.presetFeed.findUnique({ where: { url } });
    if (existing) {
      await prisma.presetFeed.update({ where: { url }, data: { source: "official" } });
      updated++;
      return;
    }
    await prisma.presetFeed.create({
      data: {
        title: host,
        url,
        siteUrl: new URL(siteUrl).origin,
        category: "官方源",
        source: "official",
        isValid: true,
        isNew: true,
        discoveredAt: new Date(),
      },
    });
    existingDomains.add(host);
  }
}

/**
 * 把旧的独立 legacy 官方源并入「官方源」层（它们本就是官方博客，只是早先分类独立显得突兀）。
 * 一次性归位，避免「官方博客才是重点」却散落在奇怪分类里的观感。
 */
export async function promoteLegacyToOfficial(): Promise<number> {
  const r = await prisma.presetFeed.updateMany({
    where: { source: "legacy" },
    data: { source: "official", category: "官方源" },
  });
  return r.count;
}
