import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import Parser from "rss-parser";
import { prisma } from "@/lib/db";

type CustomItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  isoDate?: string;
  guid?: string;
};

type ParsedFeed = {
  title?: string;
  description?: string;
  link?: string;
  items: CustomItem[];
};

const parser = new Parser({ timeout: 20000 });

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
      { agent, headers: { "User-Agent": "FeedFlow RSS Reader" } },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
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

async function fetchXml(url: string): Promise<string> {
  const timeoutMs = 20000;
  const result = await fetchViaNode(url, timeoutMs);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`HTTP ${result.status} while fetching ${url}`);
  }
  return result.body;
}

export function getFavicon(siteUrl: string) {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return undefined;
  }
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  const xml = await fetchXml(url);
  const parsed = await parser.parseString(xml);
  return parsed as ParsedFeed;
}

export async function upsertArticles(
  feedId: string,
  userId: string,
  feed: { items?: CustomItem[] }
) {
  if (!feed.items || feed.items.length === 0) return;

  for (const item of feed.items) {
    if (!item.link) continue;
    try {
      await prisma.article.upsert({
        where: {
          userId_url: { userId, url: item.link },
        },
        create: {
          title: item.title?.trim() || "无标题",
          url: item.link,
          content: item.content || item.contentSnippet || "",
          author: item.creator || null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          feedId,
          userId,
        },
        update: {},
      });
    } catch {
      // 跳过单个失败的文章
    }
  }
}
