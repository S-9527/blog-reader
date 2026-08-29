import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PRESET_FEEDS } from "../src/lib/preset-feeds";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// 将 35 个已实测有效的官方源灌入 PresetFeed 表（幂等 upsert）。
async function main() {
  let seeded = 0;
  let updated = 0;

  for (const feed of PRESET_FEEDS) {
    const normalizedSite = feed.siteUrl.replace(/\/$/, "").toLowerCase();
    const existing = await prisma.presetFeed.findUnique({ where: { url: feed.url } });
    if (existing) {
      await prisma.presetFeed.update({
        where: { url: feed.url },
        data: {
          title: feed.title,
          siteUrl: normalizedSite,
          category: feed.category,
          description: feed.description,
        },
      });
      updated++;
    } else {
      await prisma.presetFeed.create({
        data: {
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
      seeded++;
    }
  }

  console.log(`PresetFeed 种子完成：新增 ${seeded}，更新 ${updated}，共 ${PRESET_FEEDS.length} 个源`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
