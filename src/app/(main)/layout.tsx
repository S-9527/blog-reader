import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const feeds = await prisma.feed.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, favicon: true },
  });

  const unreadCount = await prisma.article.count({
    where: { userId: session.user.id, isRead: false },
  });

  const navItems = [
    { href: "/", label: "全部文章", active: true },
    { href: "/unread", label: `未读 (${unreadCount})`, active: false },
    { href: "/starred", label: "我的收藏", active: false },
    { href: "/sources", label: "订阅源管理", active: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-zinc-50">
        <div className="px-4 py-5">
          <Link href="/" className="text-xl font-bold text-zinc-900">
            FeedFlow
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            视图
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-200"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="px-2 pb-2 pt-6 text-xs font-medium uppercase tracking-wide text-zinc-400">
            订阅源
          </p>
          <ul className="space-y-1">
            {feeds.map((feed) => (
              <li key={feed.id}>
                <Link
                  href={`/f/${feed.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-200"
                >
                  {feed.favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={feed.favicon}
                      alt=""
                      className="h-4 w-4 rounded-sm"
                      loading="lazy"
                    />
                  ) : (
                    <span className="h-4 w-4 rounded-sm bg-zinc-300" />
                  )}
                  <span className="truncate">{feed.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-300 text-sm font-medium text-zinc-700">
                  {(session.user.name || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm text-zinc-700">
                {session.user.name || "用户"}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
