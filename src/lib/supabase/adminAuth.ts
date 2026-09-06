import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export interface AdminSession {
  userId: string;
  storeId: string;
}

export type AdminSessionResult =
  | ({ ok: true } & AdminSession)
  | { ok: false; status: 401 | 403 | 500; error: string };

/**
 * `/api/admin/*` のRoute Handlerから呼ぶ管理者認証ヘルパー。
 * middlewareのURL保護(`/admin/:path*`)は`/api/admin/*`には及ばないため、
 * 各Route Handlerの内部でも必ずこれを呼び、認証・店舗スコープを確認すること。
 *
 * `src/lib/supabase/middleware.ts`の`updateSession`と同じ考え方
 * (`getSession()`ではなく`getUser()`でSupabase Authサーバーへ問い合わせてトークンを検証する)
 * を、Route Handler向けのCookie API(`next/headers`の`cookies()`。Route Handler内では
 * 読み書き両方が可能)で実装したもの。
 *
 * - 未認証(セッションなし・トークン無効)は401
 * - 認証済みでも`profiles.store_id`が確認できない場合は403
 * - 成功時は認証済みユーザーの`userId`と、正本として扱うべき`storeId`を返す
 *   (呼び出し側はリクエスト本文のstore_idを信用せず、必ずこのstoreIdを使うこと)
 */
export async function requireAdminSession(): Promise<AdminSessionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[adminAuth] Supabaseの接続情報が設定されていません");
    return { ok: false, status: 500, error: "サーバー設定が不足しています" };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "認証が必要です" };
  }

  // profilesのRLS(profiles_select_own)により、本人の行のみ取得できる。
  // Service Role Clientは使わず、このユーザーのセッションを持つクライアントのまま問い合わせる
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[adminAuth] プロフィールの取得に失敗しました", profileError);
    return { ok: false, status: 500, error: "サーバー設定が不足しています" };
  }

  if (!profile?.store_id) {
    return { ok: false, status: 403, error: "担当店舗が確認できません" };
  }

  return { ok: true, userId: user.id, storeId: profile.store_id };
}

/** `requireAdminSession()`が`ok: false`を返した場合に、その内容をそのままResponseへ変換する */
export function adminAuthErrorResponse(result: Extract<AdminSessionResult, { ok: false }>): Response {
  return Response.json({ error: result.error }, { status: result.status });
}
