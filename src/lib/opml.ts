import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { XMLParser } from "fast-xml-parser";

export type OpmlOutline = {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
};

export type OpmlResult = {
  source: string;
  category: string;
  feeds: OpmlOutline[];
};

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || null;
}

function fetchViaNode(url: string, timeoutMs: number) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const agent = getProxyUrl() ? new HttpsProxyAgent(getProxyUrl()!) : undefined;
    const req = mod.get(
      url,
      { agent, headers: { "User-Agent": "FeedFlow RSS Reader" } },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Request timed out")));
  });
}

/** 抓取并解析单个 OPML 目录，提取全部 feed outline。 */
export async function fetchOpml(
  url: string,
  source: string,
  category: string
): Promise<OpmlResult> {
  const result = await fetchViaNode(url, 30000);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`OPML HTTP ${result.status} while fetching ${url}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "outline",
  });
  const parsed = parser.parse(result.body);

  const body = parsed?.opml?.body;
  const outlineRoots: unknown[] = body?.outline ?? [];

  const feeds: OpmlOutline[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    // 这是一个带 xmlUrl 的 feed 节点
    const xmlUrl = n["@_xmlUrl"];
    if (typeof xmlUrl === "string") {
      const title = n["@_title"] ?? n["@_text"];
      feeds.push({
        title: typeof title === "string" ? title.trim() : xmlUrl,
        xmlUrl,
        htmlUrl:
          typeof n["@_htmlUrl"] === "string"
            ? (n["@_htmlUrl"] as string)
            : undefined,
      });
    }
    // 递归子节点（分组）
    const children = n.outline;
    if (Array.isArray(children)) children.forEach(visit);
    else if (children) visit(children);
  };

  outlineRoots.forEach(visit);

  return { source, category, feeds };
}
