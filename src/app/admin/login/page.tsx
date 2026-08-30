"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function AdminLoginPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: Supabase Authでの認証に置き換える(Supabaseプロジェクト作成後)
    router.push("/admin");
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-surface-alt px-4 py-12">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <h1 className="text-center text-2xl leading-[1.3] font-bold text-text-primary">
          店舗管理者ログイン
        </h1>
        <p className="mt-2 text-center text-[15px] leading-[1.6] text-text-secondary">
          店舗IDとパスワードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="storeId"
              className="text-[15px] font-medium text-text-primary"
            >
              店舗ID
            </label>
            <input
              id="storeId"
              name="storeId"
              type="text"
              autoComplete="username"
              required
              placeholder="例: store001"
              className="h-12 rounded-control border border-border bg-surface px-4 text-[15px] text-text-primary outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[15px] font-medium text-text-primary"
            >
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="パスワード"
              className="h-12 rounded-control border border-border bg-surface px-4 text-[15px] text-text-primary outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="mt-2 h-12 rounded-pill bg-primary text-[15px] font-semibold text-text-on-primary transition-colors hover:bg-primary-hover active:scale-[0.97]"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
