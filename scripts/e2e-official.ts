import { discoverFeedsFromGraph, promoteLegacyToOfficial } from "@/lib/official-discovery";
import { prisma } from "@/lib/db";

async function main() {
  console.log("legacy 归位:", await promoteLegacyToOfficial());
  const res = await discoverFeedsFromGraph();
  console.log("discover:", JSON.stringify(res));
  const officialCount = await prisma.presetFeed.count({ where: { source: "official" } });
  console.log("official 总数:", officialCount);
  const official = await prisma.presetFeed.findMany({
    where: { source: "official" },
    take: 40,
    orderBy: { discoveredAt: "desc" },
    select: { title: true, url: true, isNew: true },
  });
  console.log("最近 official 样例:");
  for (const f of official) console.log(`  ${f.isNew ? "[新]" : "    "} ${f.title} ${f.url}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
