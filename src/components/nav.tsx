"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
      title="退出登录"
    >
      <LogOut className="h-3.5 w-3.5" />
      退出
    </button>
  );
}
