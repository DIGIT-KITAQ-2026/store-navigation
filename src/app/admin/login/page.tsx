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
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-on-surface">店舗管理者ログイン</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-on-surface-variant">
          メールアドレスとパスワードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-on-surface">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="例: admin@example.com"
              className="h-12 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-on-surface">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="パスワード"
              className="h-12 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 rounded-full bg-primary text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
