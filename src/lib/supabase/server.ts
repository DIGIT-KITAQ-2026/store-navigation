import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * サーバーサイド専用のSupabaseクライアント。RLSをバイパスするService Role Keyを使うため、
 * API route等のサーバーコードからのみ呼び出すこと(クライアントコンポーネントに渡さない)。
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabaseの接続情報が設定されていません。.env.localにNEXT_PUBLIC_SUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYを設定してください。"
    );
  }

  return createClient<Database>(url, serviceRoleKey);
}
