import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PRESET_FEEDS } from "../src/lib/preset-feeds";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// 将官方源灌入 PresetFeed 表。同名源（title）存在则更新其 url 等字段，否则新建。
async function main() {
  let seeded = 0;
  let updated = 0;

  for (const feed of PRESET_FEEDS) {
    const normalizedSite = feed.siteUrl.replace(/\/$/, "").toLowerCase();
    const existingByTitle = await prisma.presetFeed.findFirst({
      where: { title: feed.title },
    });
    if (existingByTitle) {
      await prisma.presetFeed.update({
        where: { id: existingByTitle.id },
        data: {
          url: feed.url,
          siteUrl: normalizedSite,
          category: feed.category,
          description: feed.description,
        },
      });
      updated++;
    } else {
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
