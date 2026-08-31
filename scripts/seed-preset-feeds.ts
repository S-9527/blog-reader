import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { syncDirectoryFeeds } from "../src/lib/validate-feeds";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// 摄入社区开放 OPML 订阅目录到 PresetFeed 表。
async function main() {
  const result = await syncDirectoryFeeds();
  const total = await prisma.presetFeed.count();
  console.log(
    `OPML 摄入完成：新增 ${result.added}，更新 ${result.updated}，失败 ${result.failed}；库中共 ${total} 个源`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
