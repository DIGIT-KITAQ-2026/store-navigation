"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-surface-alt px-4 py-12">
      <div className="w-full max-w-sm rounded-admin border border-border bg-surface p-8">
        <h1 className="text-center text-2xl leading-[1.3] font-bold text-text-primary">
          店舗管理者ログイン
        </h1>
        <p className="mt-2 text-center text-[15px] leading-[1.6] text-text-secondary">
          メールアドレスとパスワードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[15px] font-medium text-text-primary"
            >
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="例: admin@example.com"
              className="h-12 rounded-admin border border-border bg-surface px-4 text-[15px] text-text-primary outline-none focus:border-primary"
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
              className="h-12 rounded-admin border border-border bg-surface px-4 text-[15px] text-text-primary outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="rounded-admin bg-red-50 px-3 py-2 text-[13px] text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 rounded-admin border border-primary bg-primary text-[15px] font-semibold text-text-on-primary transition-colors hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
          >
            {isSubmitting ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
