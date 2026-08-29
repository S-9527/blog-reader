import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || null;
}

function fetchHtml(url: string, timeoutMs = 25000) {
  return new Promise<{ status: number; html: string; finalUrl: string }>(
    (resolve, reject) => {
      const visit = (target: string, redirects: number) => {
        if (redirects > 5) {
          reject(new Error("too many redirects"));
          return;
        }
        const mod = target.startsWith("https") ? https : http;
        const agent = getProxyUrl() ? new HttpsProxyAgent(getProxyUrl()!) : undefined;
        const req = mod.get(
          target,
          {
            agent,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; FeedFlow/1.0; +https://blog-reader-self.vercel.app)",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            },
          },
          (res) => {
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode) &&
              res.headers.location
            ) {
              res.resume();
              visit(new URL(res.headers.location, target).toString(), redirects + 1);
              return;
            }
            if (res.statusCode && res.statusCode >= 400) {
              res.resume();
              resolve({ status: res.statusCode, html: "", finalUrl: target });
              return;
            }
            let data = "";
            res.setEncoding("utf8");
            res.on("data", (c) => (data += c));
            res.on("end", () =>
              resolve({ status: res.statusCode ?? 0, html: data, finalUrl: res.url || target })
            );
          }
        );
        req.on("error", reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error("Request timed out")));
      };
      visit(url, 0);
    }
  );
}

export async function extractArticle(url: string): Promise<{
  title: string | null;
  content: string | null;
  textContent: string | null;
  excerpt: string | null;
}> {
  const { status, html } = await fetchHtml(url);
  if (status >= 400 || !html) {
    throw new Error(`HTTP ${status}`);
  }

  const { document } = parseHTML(html);
  const reader = new Readability(document as never);
  const article = reader.parse();

  if (!article) {
    throw new Error("无法从页面提取正文");
  }

  return {
    title: article.title || null,
    content: article.content || null,
    textContent: article.textContent || null,
    excerpt: article.excerpt || null,
  };
}
