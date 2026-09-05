# STRUCTURE — どの機能をどこに書くか

5人がバラバラに作業してコンフリクトや重複が起きるのを防ぐため、「この機能はこのフォルダに書く」
という置き場所を先に決めておくもの。新しい画面・機能を作るときはまずここを見て、当てはまる
場所が無ければこのファイルに追記してから作業を始める。

対応する機能一覧は [`docs/仕様書.md`](./docs/仕様書.md)、コンポーネントの見た目のルールは
[`DESIGN.md`](./DESIGN.md) を参照。消費者用画面と管理者用画面は **URLパスで分ける**
(`/admin` 以下が管理者用、それ以外が消費者用)。

## 画面(ルーティング)

Next.js App Router なので、`src/app/` 以下のフォルダ = URLパスになる。

消費者用の3画面(`/`, `/search`, `/navigate/[productId]`)は、共通ヘッダー(`StoreHeader`)を
共有するルートグループ `src/app/(consumer)/` の下にまとめている(`(consumer)` はURLパスには
現れない)。

| 画面(仕様書.mdの画面一覧) | 置き場所 | URL |
|---|---|---|
| 店舗トップ画面(QR読み取り後) | `src/app/(consumer)/page.tsx` | `/` |
| AI検索結果画面(商品/マップ/リストタブ) | `src/app/(consumer)/search/page.tsx` | `/search` |
| 3D店内ナビゲーション画面(Three.js/React Three Fiber) | `src/app/(consumer)/navigate/[productId]/page.tsx` | `/navigate/:productId` |
| ↑の商品が見つからない場合の表示 | `src/app/(consumer)/navigate/[productId]/not-found.tsx` | (同上、`notFound()`呼び出し時) |
| ブラウザネイティブ3D店内ナビゲーションのデモ画面(Three.js/React Three Fiber。`store-3d/`配下のコンポーネントを`/navigate/[productId]`と共用) | `src/app/store-3d-demo/page.tsx` | `/store-3d-demo` |
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
  バーコード/QRスキャナー、商品登録フォームなど)。`ui/` の部品を組み合わせて作る
- `src/components/store-3d/` — ブラウザネイティブ3D店内ナビゲーション(Three.js / React Three Fiber)
  専用のコンポーネント群。`/store-3d-demo`と`/navigate/[productId]`(`NavigateScreen`経由)の
  両方から利用する

迷ったら「他の画面でも使い回せそうか」で判断する。使い回せそうなら `ui/`、その画面専用なら `features/`。

## 共通ロジック(`src/lib/`)

- `src/lib/supabase/` — Supabaseクライアントの初期化、テーブルアクセス関数
- `src/lib/aiSearch/` — `claude`コマンド(Claude Code CLI)をサブプロセス実行してのAI商品検索
  (`searchProductsWithClaude.ts`)と、失敗時の部分一致フォールバック検索(`fallbackSearch.ts`)。
  当初`src/lib/claude/`にAgent SDK(OAuth認証)経由の実装を置く想定だったが、利用ポリシー上の
  制約で方式変更したため`aiSearch/`に置き直している(`docs/仕様書.md`の「AI連携仕様」参照)。
  `src/lib/claude/`は未使用の空フォルダなので新規実装をここに置かないこと
- `src/lib/voice/` — 音声入力。ブラウザ側の録音・PCM変換(`useVoiceSearch.ts`)と、
  サーバー側でWhisperを動かす文字起こし(`transcribeAudio.ts`)。APIルートは`src/app/api/transcribe/`
- `src/lib/barcode/` — カメラでのバーコード/QR読み取りの共通処理
- `src/lib/store-navigation/` — `store-3d/`向けの型・店内レイアウト(ナビゲーショングラフ)・
  経路探索(BFS)のみを持つ。Three.js/3D描画のコードはここには置かない(経路計算と3D描画の分離)

## (過去経緯)Unity WebGL版について

初期はUnityでビルドしたWebGL成果物を`public/unity/`に配置し、`UnityViewer.tsx`から`<iframe>`で
読み込む方式を検討していたが、React Three Fiber版(`src/components/store-3d/`)への一本化に伴い
未使用となったため削除済み。現在3Dナビゲーションを実装する場合は`src/components/store-3d/`配下を使う。

## 開発を始めるときの手順

1. これから作る機能が上の表・分類のどれに当たるか確認する
2. 当てはまるものが無ければ、まずこのファイルに1行追記してから実装を始める(後から来た人が迷わないように)
3. [`CONTRIBUTING.md`](./CONTRIBUTING.md) の通り、`main` から機能ごとのブランチを切って作業する
