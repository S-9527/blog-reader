import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/rss";
import { fetchOpml } from "@/lib/opml";
import { OPML_SOURCES } from "@/lib/opml-sources";

export const MAX_CONSECUTIVE_FAILURES = 3;
const INGEST_CONCURRENCY = 6;

function normalizeSite(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * 摄入社区开放的 OPML 订阅目录，把其所有 feed 同步进 PresetFeed 表。
 * 同一 url 幂等更新（标题/分类/来源可能随目录变化），新增以 isNew 标记。
 * 不做 parseFeed 全量验证（量大），仅记录来源与分类；健康由 validateAllPresets 负责。
 * 返回新增 / 更新 / 失败统计。
 */
export async function syncDirectoryFeeds(): Promise<{
  added: number;
  updated: number;
  failed: number;
}> {
  const results = await Promise.all(
    OPML_SOURCES.map(async (source) => {
      try {
        return await fetchOpml(source.url, source.key, source.defaultCategory);
      } catch {
        return null;
      }
    })
  );

  const validResults = results.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

  let added = 0;
  let updated = 0;
  let failed = 0;

  const pending: {
    title: string;
    url: string;
    siteUrl: string | null;
    category: string;
    source: string;
  }[] = [];

  const seen = new Set<string>();
  for (const result of validResults) {
    for (const feed of result.feeds) {
      if (!feed.xmlUrl || !/^https?:\/\//i.test(feed.xmlUrl)) continue;
      const key = feed.xmlUrl.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pending.push({
        title: feed.title || feed.xmlUrl,
        url: feed.xmlUrl,
        siteUrl: normalizeSite(feed.htmlUrl || feed.xmlUrl),
        category: result.category,
        source: result.source,
      });
    }
  }

  // 预载已存在的 url 集合（已去除重复，用非 null 判断作 isNew 依据）
  const existingUrlSet = new Set<string>();
  const rows = await prisma.presetFeed.findMany({
    select: { url: true },
  });
  for (const r of rows) {
    existingUrlSet.add(r.url.replace(/\/$/, "").toLowerCase());
  }

  for (let i = 0; i < pending.length; i += INGEST_CONCURRENCY) {
    const chunk = pending.slice(i, i + INGEST_CONCURRENCY);
    await Promise.all(
      chunk.map(async (feed) => {
        const key = feed.url.replace(/\/$/, "").toLowerCase();
        const isNew = !existingUrlSet.has(key);
        try {
          // 用 url upsert：存在则更新元数据，否则新建（数据库层幂等，无竞态）
          await prisma.presetFeed.upsert({
            where: { url: feed.url },
            update: {
              title: feed.title,
              siteUrl: feed.siteUrl,
              category: feed.category,
              source: feed.source,
            },
            create: {
              title: feed.title,
              url: feed.url,
              siteUrl: feed.siteUrl,
              category: feed.category,
              source: feed.source,
              isValid: true,
              isNew: true,
              discoveredAt: new Date(),
            },
          });
          existingUrlSet.add(key);
          if (isNew) added++;
          else updated++;
        } catch {
          failed++;
        }
      })
    );
  }

  return { added, updated, failed };
}

/**
 * 校验单个用户订阅源：成功则重置健康状态，失败则累加连续失败计数。
 * 连续失败达到阈值后标记 isHealthy=false。返回健康状态是否变化。
 */
export async function validateUserFeed(feedId: string): Promise<{
  healthy: boolean;
  changed: boolean;
}> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) {
    throw new Error("feed not found");
  }

  try {
    await parseFeed(feed.url);
    const wasUnhealthy = !feed.isHealthy;
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        isHealthy: true,
        consecutiveFailures: 0,
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
      },
    });
    return { healthy: true, changed: wasUnhealthy };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "解析失败";
    const nextCount = feed.consecutiveFailures + 1;
    const stillHealthy = nextCount < MAX_CONSECUTIVE_FAILURES;
    const wasHealthy = feed.isHealthy;
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        isHealthy: stillHealthy,
        consecutiveFailures: nextCount,
        lastCheckedAt: new Date(),
        lastError: errMsg,
      },
    });
    return { healthy: stillHealthy, changed: stillHealthy !== wasHealthy };
  }
}

/**
 * 校验已发现源库的可用性。
 * 源库庞大（数千条），不能每次 cron 全量 parseFeed（会超时），故采用预算制：
 * 优先校验被用户订阅的源 + 新发现的源，其余按最久未校验者轮转，每次最多校验 VALIDATE_BUDGET 个。
 */
export const VALIDATE_BUDGET = 120;

export async function validateAllPresets(): Promise<{
  checked: number;
  valid: number;
  invalid: number;
}> {
  // 优先：用户已订阅的源 url
  const subscribedUrls = new Set(
    (
      await prisma.feed.findMany({
        select: { url: true },
        distinct: ["url"],
      })
    ).map((f) => f.url.replace(/\/$/, "").toLowerCase())
  );

  const presets = await prisma.presetFeed.findMany({
    select: { id: true, url: true, isNew: true, lastCheckedAt: true },
  });

  // 排序：已订阅 -> 新发现 -> 按 lastCheckedAt 升序（最久未校验优先）
  const sorted = [...presets].sort((a, b) => {
    const aSub = subscribedUrls.has(a.url.replace(/\/$/, "").toLowerCase());
    const bSub = subscribedUrls.has(b.url.replace(/\/$/, "").toLowerCase());
    if (aSub !== bSub) return aSub ? -1 : 1;
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return (a.lastCheckedAt?.getTime() ?? 0) - (b.lastCheckedAt?.getTime() ?? 0);
  });

  const toCheck = sorted.slice(0, VALIDATE_BUDGET);
  let valid = 0;
  let invalid = 0;

  for (let i = 0; i < toCheck.length; i += INGEST_CONCURRENCY) {
    const chunk = toCheck.slice(i, i + INGEST_CONCURRENCY);
    await Promise.all(
      chunk.map(async (preset) => {
        try {
          await parseFeed(preset.url);
          await prisma.presetFeed.update({
            where: { id: preset.id },
            data: {
              isValid: true,
              lastCheckedAt: new Date(),
              lastSuccessAt: new Date(),
              lastError: null,
            },
          });
          valid++;
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "解析失败";
          await prisma.presetFeed.update({
            where: { id: preset.id },
            data: {
              isValid: false,
              lastCheckedAt: new Date(),
              lastError: errMsg,
            },
          });
          invalid++;
        }
      })
    );
  }

  return { checked: toCheck.length, valid, invalid };
}
