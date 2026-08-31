import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles } from "@/lib/rss";
import { validateAllPresets, syncDirectoryFeeds } from "@/lib/validate-feeds";
import { MAX_CONSECUTIVE_FAILURES } from "@/lib/validate-feeds";
import {
  discoverFeedsFromGraph,
  promoteLegacyToOfficial,
} from "@/lib/official-discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  // 0. 摄入社区开放 OPML 订阅目录（首次及每次 cron 刷新新源）
  let dirResult = { added: 0, updated: 0, failed: 0 };
  await syncDirectoryFeeds()
    .then((r) => (dirResult = r))
    .catch(() => {});

  // 0.1 超过 7 天的"新发现"标记过期，避免永远高亮
  const newCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.presetFeed.updateMany({
    where: { isNew: true, discoveredAt: { lt: newCutoff } },
    data: { isNew: false },
  });

  // 0.2 官方源自动发现：从已有来源沿出链+内容识别收集新官方博客；旧 legacy 归位为官方源
  const [graphResult, promotedCount] = await Promise.all([
    discoverFeedsFromGraph().catch(() => null),
    promoteLegacyToOfficial().catch(() => 0),
  ]);
  const officialResult = {
    discovered: graphResult?.discovered ?? 0,
    updated: graphResult?.updated ?? 0,
    promoted: promotedCount,
  };

  const feeds = await prisma.feed.findMany({
    include: { user: { select: { id: true } } },
  });

  let fetched = 0;
  let failed = 0;

  // 1. 抓取所有用户订阅源，同时累计健康状态
  for (const feed of feeds) {
    try {
      const parsed = await parseFeed(feed.url);
      await upsertArticles(feed.id, feed.userId, parsed);
      await prisma.feed.update({
        where: { id: feed.id },
        data: {
          lastFetchedAt: new Date(),
          isHealthy: true,
          consecutiveFailures: 0,
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          lastError: null,
        },
      });
      fetched++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "抓取失败";
      const nextCount = (feed.consecutiveFailures ?? 0) + 1;
      await prisma.feed.update({
        where: { id: feed.id },
        data: {
          consecutiveFailures: nextCount,
          isHealthy: nextCount < MAX_CONSECUTIVE_FAILURES,
          lastCheckedAt: new Date(),
          lastError: errMsg,
        },
      });
      failed++;
    }
  }

  // 2. 校验源库可用性
  const presetResult = await validateAllPresets().catch(() => ({
    checked: 0,
    valid: 0,
    invalid: 0,
  }));

  return NextResponse.json({
    success: true,
    feeds: feeds.length,
    fetched,
    failed,
    directoryAdded: dirResult.added,
    directoryUpdated: dirResult.updated,
    directoryFailed: dirResult.failed,
    officialDiscovered: officialResult.discovered,
    officialUpdated: officialResult.updated,
    officialPromoted: officialResult.promoted,
    presetChecked: presetResult.checked,
    presetValid: presetResult.valid,
    presetInvalid: presetResult.invalid,
  });
}
