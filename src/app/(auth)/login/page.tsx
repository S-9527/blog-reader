import LoginButton from "@/components/login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">FeedFlow</h1>
          <p className="mt-2 text-sm text-zinc-500">
            登录后开始订阅和管理你的 RSS 源
          </p>
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
