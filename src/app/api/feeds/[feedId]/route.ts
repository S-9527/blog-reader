import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { feedId } = await params;

  const feed = await prisma.feed.findFirst({
    where: { id: feedId, userId: session.user.id },
  });
  if (!feed) {
    return NextResponse.json({ error: "源不存在" }, { status: 404 });
  }

  await prisma.feed.delete({ where: { id: feedId } });

  return NextResponse.json({ success: true });
}
