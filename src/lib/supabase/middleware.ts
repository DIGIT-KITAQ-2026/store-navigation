import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * `middleware.ts`から呼び出す、管理者ログインガード本体。
 * Cookie経由でSupabase Authのセッションを確認し、
 * - `/admin`以下(`/admin/login`を除く)に未ログインでアクセス → `/admin/login`へリダイレクト
 * - ログイン済みで`/admin/login`にアクセス → `/admin`へリダイレクト
 * それ以外はそのまま通す。
 *
 * `getUser()`を必ず呼ぶことが重要(Supabase公式ドキュメントの注意点): `getSession()`は
 * Cookieの中身をそのまま信頼してしまうため、`getUser()`でAuthサーバーに問い合わせて
 * トークンの正当性を検証する。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[middleware] Supabaseの接続情報が設定されていません");
    return response;
  }

  const supabase = createServerClient<never>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!user && pathname.startsWith("/admin") && !isLoginPage) {
    const redirectUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}
