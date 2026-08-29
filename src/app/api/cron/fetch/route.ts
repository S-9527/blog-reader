import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles } from "@/lib/rss";
import { validateAllPresets, discoverNewFeeds, ensurePresetSeeds } from "@/lib/validate-feeds";
import { MAX_CONSECUTIVE_FAILURES } from "@/lib/validate-feeds";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  // 0. 幂等引导源库（首次运行时填充已校验的官方源）
  let presetCount = 0;
  await ensurePresetSeeds()
    .then((n) => (presetCount = n))
    .catch(() => {});

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

  // 2. 校验官方源库可用性
  const presetResult = await validateAllPresets().catch(() => ({
    checked: 0,
    valid: 0,
    invalid: 0,
  }));

  // 3. 自动发现新的有效源
  const discoveryResult = await discoverNewFeeds().catch(() => ({
    discovered: 0,
    totalSeeds: 0,
  }));

  return NextResponse.json({
    success: true,
    feeds: feeds.length,
    fetched,
    failed,
    presetCount,
    presetChecked: presetResult.checked,
    presetValid: presetResult.valid,
    presetInvalid: presetResult.invalid,
    discovered: discoveryResult.discovered,
  });
}
