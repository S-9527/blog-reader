import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/rss";
import { DISCOVERY_SEEDS } from "@/lib/discovery-candidates";
import { discoverRssForSite } from "@/lib/discover-rss";
import { PRESET_FEEDS } from "@/lib/preset-feeds";

export const MAX_CONSECUTIVE_FAILURES = 3;
const DISCOVERY_CONCURRENCY = 5;

/**
 * 幂等引导：把已验证的官方源灌入 PresetFeed 表（若尚不存在）。
 * 在 sources 页与 cron 首次运行前调用，确保源库始终有内容，且不去重覆盖已有数据。
 * 返回当前 PresetFeed 总数。
 */
export async function ensurePresetSeeds(): Promise<number> {
  for (const feed of PRESET_FEEDS) {
    const normalizedSite = feed.siteUrl.replace(/\/$/, "").toLowerCase();
    await prisma.presetFeed.upsert({
      where: { url: feed.url },
      update: {},
      create: {
        title: feed.title,
        url: feed.url,
        siteUrl: normalizedSite,
        category: feed.category,
        description: feed.description,
        isValid: true,
        isNew: false,
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
      },
    });
  }
  return prisma.presetFeed.count();
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
 * 校验官方博客源库中所有预置源的可用性，更新 isValid/lastCheckedAt。
 */
export async function validateAllPresets(): Promise<{
  checked: number;
  valid: number;
  invalid: number;
}> {
  const presets = await prisma.presetFeed.findMany({ select: { id: true, url: true } });
  let valid = 0;
  let invalid = 0;

  for (const preset of presets) {
    try {
      await parseFeed(preset.url);
      await prisma.presetFeed.update({
        where: { id: preset.id },
        data: { isValid: true, lastCheckedAt: new Date(), lastSuccessAt: new Date(), lastError: null },
      });
      valid++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "解析失败";
      await prisma.presetFeed.update({
        where: { id: preset.id },
        data: { isValid: false, lastCheckedAt: new Date(), lastError: errMsg },
      });
      invalid++;
    }
  }

  return { checked: presets.length, valid, invalid };
}

/**
 * 从站点种子池自动发现并收录新源。
 * 对每个种子站点抓主页并用 <link rel="alternate">/常见路径探测出真实可解析的 RSS 端点，
 * 已收录进 PresetFeed 的站点跳过。采用受限并发。
 */
export async function discoverNewFeeds(): Promise<{
  discovered: number;
  totalSeeds: number;
}> {
  // 已收录的站点（用 siteUrl 判重，避免重复探测）
  const existingRows = await prisma.presetFeed.findMany({
    select: { siteUrl: true, url: true },
  });
  const existingSites = new Set(existingRows.map((r) => r.siteUrl || ""));
  const existingUrls = new Set(existingRows.map((r) => r.url));

  const pendingSeeds = DISCOVERY_SEEDS.filter((s) => {
    const key = s.siteUrl.replace(/\/$/, "").toLowerCase();
    return key && !existingSites.has(key);
  });

  const discovered: string[] = [];

  for (let i = 0; i < pendingSeeds.length; i += DISCOVERY_CONCURRENCY) {
    const chunk = pendingSeeds.slice(i, i + DISCOVERY_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((seed) =>
        discoverRssForSite(seed.siteUrl, seed.knownRss).catch(() => null)
      )
    );
    for (let j = 0; j < chunk.length; j++) {
      const result = results[j];
      if (!result) continue;
      const seed = chunk[j];
      const normalizedSite = seed.siteUrl.replace(/\/$/, "").toLowerCase();
      const normalizedUrl = result.rssUrl.replace(/\/$/, "").toLowerCase();
      if (existingSites.has(normalizedSite) || existingUrls.has(normalizedUrl)) continue;
      await prisma.presetFeed.create({
        data: {
          title: seed.title,
          url: result.rssUrl,
          siteUrl: normalizedSite,
          category: seed.category,
          description: seed.description,
          isValid: true,
          isNew: true,
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          discoveredAt: new Date(),
        },
      });
      existingSites.add(normalizedSite);
      existingUrls.add(result.rssUrl);
      discovered.push(result.rssUrl);
    }
  }

  return { discovered: discovered.length, totalSeeds: pendingSeeds.length };
}
