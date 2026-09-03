"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * ブラウザ用Supabaseクライアント(anon key)。RLSはログイン中の管理者セッション
 * (auth.uid())で評価されるため、管理画面のCRUDはこのクライアント経由で行う。
 * サービスロールキーは使わない(server.tsのservice clientはRLSをバイパスするため
 * 消費者向けAPIからのみ使用すること)。
 */
function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabaseの接続情報が設定されていません。.env.localにNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。"
    );
  }

  return createClient<Database>(url, anonKey);
}

// モジュールスコープで1つだけ生成する(呼び出しごとに作ると"Multiple GoTrueClient
// instances"警告が出るため)。
export const supabase = createSupabaseBrowserClient();
