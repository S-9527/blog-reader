import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

const DEEPL_FREE_BASE = "https://api-free.deepl.com/v2/translate";
// DeepL 单请求上限 128 KiB，留余量按 ~110 KB 分块（按字节计，避免多字节字符膨胀出错）
const MAX_CHUNK_BYTES = 110 * 1024;

// 优先在这些块级边界处切分，避免破坏 HTML 标签结构
const BLOCK_BOUNDARIES = [
  "</p>",
  "<br>",
  "<br/>",
  "</li>",
  "</h1>",
  "</h2>",
  "</h3>",
  "</h4>",
  "</h5>",
  "</h6>",
  "</pre>",
  "</blockquote>",
  "</tr>",
  "</div>",
  "</figcaption>",
];

export function isTranslationConfigured() {
  return Boolean(process.env.DEEPL_API_KEY);
}

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || null;
}

function postForm(
  url: string,
  form: Record<string, string>,
  apiKey: string
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(form).toString();
    const agent = getProxyUrl() ? new HttpsProxyAgent(getProxyUrl()!) : undefined;
    const req = https.request(
      url,
      {
        method: "POST",
        agent,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `DeepL-Auth-Key ${apiKey}`,
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed: unknown = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(60000, () => req.destroy(new Error("翻译请求超时")));
    req.write(body);
    req.end();
  });
}

/**
 * 将 HTML 按字节大小切块，优先在块级边界断开。
 * 单块无法再切时强行截断（保持总长度不超上限）。
 */
function splitHtmlChunks(html: string): string[] {
  const chunks: string[] = [];
  let remaining = html;

  while (Buffer.byteLength(remaining, "utf8") > MAX_CHUNK_BYTES) {
    // 在当前 110KB 字节范围内的目标断点
    const byteLimit = MAX_CHUNK_BYTES;
    // 先用字符串粗略定位，避免逐字节
    let cutAt = -1;

    // 在 byteLimit 允许的范围内找最后一个块级边界
    const prefix = remaining.slice(
      0,
      Math.floor(remaining.length * (byteLimit / Buffer.byteLength(remaining, "utf8")))
    );

    for (const boundary of BLOCK_BOUNDARIES) {
      const idx = prefix.lastIndexOf(boundary);
      const end = idx >= 0 ? idx + boundary.length : -1;
      if (end >= 0 && end <= remaining.length && end > cutAt && ByteLen(prefix.slice(0, end)) <= byteLimit) {
        cutAt = end;
      }
    }

    if (cutAt > 0) {
      chunks.push(remaining.slice(0, cutAt));
      remaining = remaining.slice(cutAt);
    } else {
      // 没有合适的边界，直接截断到允许的字节上限
      let low = 0;
      let high = remaining.length;
      while (low < high) {
        const mid = (low + high + 1) >> 1;
        if (ByteLen(remaining.slice(0, mid)) <= byteLimit) low = mid;
        else high = mid - 1;
      }
      chunks.push(remaining.slice(0, low));
      remaining = remaining.slice(low);
    }
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function ByteLen(s: string) {
  return Buffer.byteLength(s, "utf8");
}

async function translateChunk(chunk: string): Promise<string> {
  const response = await postForm(
    DEEPL_FREE_BASE,
    {
      text: chunk,
      target_lang: "ZH",
      source_lang: "EN",
      tag_handling: "html",
      preserve_formatting: "1",
    },
    process.env.DEEPL_API_KEY!
  );

  if (response.status !== 200) {
    const detail =
      typeof response.body === "object" && response.body && "message" in (response.body as object)
        ? String((response.body as { message: string }).message)
        : JSON.stringify(response.body);
    throw new Error(`DeepL 翻译失败 (HTTP ${response.status}): ${detail}`);
  }

  const translations = (response.body as { translations?: { text?: string }[] })
    ?.translations;
  const text = translations?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("DeepL 返回缺少译文文本");
  }
  return text;
}

/**
 * 将一段英文 HTML 正文翻译为中文，保留原有 HTML 结构与排版。
 */
export async function translateHtmlToZh(html: string): Promise<string> {
  if (!process.env.DEEPL_API_KEY) {
    throw new Error("未配置 DEEPL_API_KEY，无法使用翻译功能");
  }

  const trimmed = (html || "").trim();
  if (!trimmed) return "";

  const chunks = splitHtmlChunks(trimmed);
  const results: string[] = [];
  for (const chunk of chunks) {
    const translated = await translateChunk(chunk);
    if (translated) results.push(translated);
  }
  return results.join("");
}
