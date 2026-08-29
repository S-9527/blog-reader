"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
      title="退出登录"
    >
      退出
    </button>
  );
}
