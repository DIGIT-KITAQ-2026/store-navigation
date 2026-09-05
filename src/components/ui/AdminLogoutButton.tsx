"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/** AdminHeaderの「ログアウト」ボタン本体。Supabase Authのセッションを破棄してからトップへ戻る。 */
export function AdminLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isLoggingOut}
      className="flex h-9 items-center rounded-full border border-outline-variant bg-surface px-4 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant disabled:opacity-60"
    >
      {isLoggingOut ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}
