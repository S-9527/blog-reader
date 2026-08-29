import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseFeed } from "@/lib/rss";
import { FALLBACK_RSS_PATHS } from "@/lib/discovery-candidates";

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || null;
}

async function fetchPage(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = getProxyUrl() ? new HttpsProxyAgent(getProxyUrl()!) : undefined;
    const req = mod.get(
      url,
      { agent, headers: { "User-Agent": "Mozilla/5.0 (FeedFlow/1.0)" } },
      (res) => {
        // 跟随重定向
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          fetchPage(new URL(res.headers.location, url).toString())
            .then(resolve)
            .catch(reject);
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          data += c;
          if (data.length > 500_000) req.destroy();
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data })
        );
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("Request timed out")));
  });
}

/** 从 HTML 中提取 rel=alternate 的 RSS/Atom 端点 */
function extractRssLinks(html: string, base: string): string[] {
  const links = html.match(/<link[^>]*rel=["']?alternate["']?[^>]*>/gi) || [];
  const out: string[] = [];
  for (const tag of links) {
    if (!/application\/rss|application\/atom|type=["']?[^"']*(rss|atom)/i.test(tag)) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1] || "";
    if (!/rss|atom/i.test(type)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) {
      try {
        out.push(new URL(href, base).toString());
      } catch {
        // 忽略非法 URL
      }
    }
  }
  return out;
}

/** 探测一个 RSS 端点是否真的能解析出合法 feed，返回解析结果或 null */
async function tryParse(url: string): Promise<boolean> {
  try {
    await parseFeed(url);
    return true;
  } catch {
    return false;
  }
}

export type RssDiscoveryResult = {
  rssUrl: string; // 最终确认有效的 RSS 端点
  source: "alternate" | "known" | "fallback";
};

/**
 * 从站点主页发现有效 RSS 端点。
 * 探测顺序：已知端点 → 主页 <link rel=alternate> → 常见路径兜底。
 * 返回第一个能被真实解析为 feed 的端点；找不到返回 null。
 */
export async function discoverRssForSite(
  siteUrl: string,
  knownRss?: string
): Promise<RssDiscoveryResult | null> {
  // 1. 已知端点
  if (knownRss) {
    const cleaned = knownRss.startsWith("http")
      ? knownRss
      : new URL(knownRss, siteUrl.endsWith("/") ? siteUrl : siteUrl + "/").toString();
    if (await tryParse(cleaned)) {
      return { rssUrl: cleaned, source: "known" };
    }
  }

  // 2. 主页 rel=alternate
  try {
    const { status, body } = await fetchPage(siteUrl);
    if (status >= 200 && status < 400 && body) {
      const candidates = extractRssLinks(body, siteUrl);
      for (const candidate of candidates) {
        if (await tryParse(candidate)) {
          return { rssUrl: candidate, source: "alternate" };
        }
      }
    }
  } catch {
    // 主页抓取失败，进入兜底
  }

  // 3. 常见路径兜底
  const base = siteUrl.endsWith("/") ? siteUrl : siteUrl + "/";
  for (const path of FALLBACK_RSS_PATHS) {
    const candidate = new URL(path, base).toString();
    if (await tryParse(candidate)) {
      return { rssUrl: candidate, source: "fallback" };
    }
  }

  return null;
}
