import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const article = await prisma.article.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const data: { isRead?: boolean; isStarred?: boolean } = {};
  if (typeof body.isRead === "boolean") data.isRead = body.isRead;
  if (typeof body.isStarred === "boolean") data.isStarred = body.isStarred;

  const updated = await prisma.article.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
