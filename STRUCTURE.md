# STRUCTURE — どの機能をどこに書くか

5人がバラバラに作業してコンフリクトや重複が起きるのを防ぐため、「この機能はこのフォルダに書く」
という置き場所を先に決めておくもの。新しい画面・機能を作るときはまずここを見て、当てはまる
場所が無ければこのファイルに追記してから作業を始める。

対応する機能一覧は [`docs/仕様書.md`](./docs/仕様書.md)、コンポーネントの見た目のルールは
[`DESIGN.md`](./DESIGN.md) を参照。消費者用画面と管理者用画面は **URLパスで分ける**
(`/admin` 以下が管理者用、それ以外が消費者用)。

## 画面(ルーティング)

Next.js App Router なので、`src/app/` 以下のフォルダ = URLパスになる。

| 画面(仕様書.mdの画面一覧) | 置き場所 | URL |
|---|---|---|
| 店舗トップ画面(QR読み取り後) | `src/app/page.tsx` | `/` |
| AI検索結果画面(商品/マップ/リストタブ) | `src/app/search/page.tsx` | `/search` |
| Unity WebGLナビゲーション画面 | `src/app/navigate/[productId]/page.tsx` | `/navigate/:productId` |
| 管理者ログイン画面 | `src/app/admin/login/page.tsx` | `/admin/login` |
| 店舗管理画面(登録/削除/一覧への導線) | `src/app/admin/page.tsx` | `/admin` |
| 商品登録画面 | `src/app/admin/products/new/page.tsx` | `/admin/products/new` |
| 商品削除画面(棚バーコード→一覧→選択削除) | `src/app/admin/products/delete/page.tsx` | `/admin/products/delete` |
| 商品一覧画面 | `src/app/admin/products/page.tsx` | `/admin/products` |

サーバー側の処理(Claude Agent SDK呼び出し、Supabaseへの書き込みなど)は
`src/app/api/<機能名>/route.ts` に置く(例: `src/app/api/search/route.ts`)。

## コンポーネント

- `src/components/ui/` — DESIGN.mdのトークンに沿った共通部品(検索バー、ボトムシート、
  pillボタン、フローティングアクションボタン、リストアイテムなど)。**特定の画面に依存しない見た目だけの部品**
- `src/components/features/` — 特定の機能に紐づくコンポーネント(商品検索フォーム、
  バーコード/QRスキャナー、Unity WebGLビューア、商品登録フォームなど)。`ui/` の部品を組み合わせて作る

迷ったら「他の画面でも使い回せそうか」で判断する。使い回せそうなら `ui/`、その画面専用なら `features/`。

## 共通ロジック(`src/lib/`)

- `src/lib/supabase/` — Supabaseクライアントの初期化、テーブルアクセス関数
- `src/lib/claude/` — Claude Agent SDK(OAuth認証)経由での商品検索呼び出し処理
- `src/lib/barcode/` — カメラでのバーコード/QR読み取りの共通処理

## Unity WebGL

Unityでビルドした成果物一式は `public/unity/` に配置し、`src/components/features/` 内の
ビューアコンポーネントから `<iframe>` またはUnityの標準ローダーで読み込む。

## 開発を始めるときの手順

1. これから作る機能が上の表・分類のどれに当たるか確認する
2. 当てはまるものが無ければ、まずこのファイルに1行追記してから実装を始める(後から来た人が迷わないように)
3. [`CONTRIBUTING.md`](./CONTRIBUTING.md) の通り、`main` から機能ごとのブランチを切って作業する
