# store-navigation

チームブルーオーシャンのリポジトリです。

店員に話しかけなくても、スマホだけで商品を検索して店内ナビゲーションまでできるアプリ(ハッカソン向けMVP)。
「探し物が見つからない消費者」と「作業を中断させたくない店員」双方の負担をなくすことが目的。

## 技術構成

| 要素 | 採用技術 |
|---|---|
| フロントエンド/バックエンド | Next.js(このリポジトリ) |
| データベース | Supabase(テーブル設計確定済み。詳細は[`docs/データベース設計.md`](./docs/データベース設計.md)を参照) |
| 3Dナビゲーション | Unity WebGLビルドをNext.jsページに埋め込み |
| AI(テキスト検索) | CLIP多言語モデル(`@huggingface/transformers`)をサーバー上で実行。外部API・認証は不要 |
| AI(画像検索) | CLIP(`@huggingface/transformers`)をサーバー上で実行。外部API・認証は不要 |
| AI(音声入力) | Whisper large-v3-turbo(`@huggingface/transformers`)をサーバー上で実行。外部API・認証は不要 |
| AI(商品説明の自動生成・管理者用) | `claude`コマンド(Claude Code CLI)のサブプロセス呼び出し |
| バーコード/QR読取 | ブラウザのカメラAPI |

詳細な機能・画面仕様は [`docs/仕様書.md`](./docs/仕様書.md)、UIのデザインルールは [`DESIGN.md`](./DESIGN.md) を参照。

## Getting Started

`.env.local.example` を `.env.local` にコピーし、`SUPABASE_SERVICE_ROLE_KEY` をSupabaseダッシュボード(Project Settings > API)から取得して設定する(`.env.local` はコミットしないこと)。

商品説明の自動生成(管理者画面)だけは`claude`コマンドを使うため、この機能を使う場合は
`npm run dev` を実行するマシンで `claude login` を済ませておくこと。インタラクティブログインできない
環境では `.env.local.example` のコメントに従い `CLAUDE_CODE_OAUTH_TOKEN` を設定する。
テキスト検索・画像検索・音声入力は追加設定なしで動作する。

開発サーバーを起動する。

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開くと確認できる。`src/app/page.tsx` を編集すると自動で反映される。

## 検索精度を測る

画像検索・音声検索の精度は評価スクリプトで確認できる。`npm run dev` を起動した状態で実行する。

```bash
node scripts/eval-image-search.mjs   # 画像 → 商品
node scripts/eval-voice-search.mjs   # 音声 → 文字起こし → 商品
```

`scripts/fixtures/` 以下の画像・音声を実際のAPIに投げ、`expected.json` の期待結果と
突き合わせて正解数を出す。自分で撮った商品写真や録音した音声(16kHz・モノラル・16bitのwav)を
同じフォルダに置き、`expected.json` に追記すれば評価対象を増やせる。
評価用の音声はmacOSの`say`コマンドで生成したもので、`scripts/generate-voice-fixtures.sh` で作り直せる。

音声認識は初回リクエストでモデルの読み込みに20秒ほどかかる。アプリからマイクを押したときは、
話している間に読み込みを先行させるようにしている(`/api/transcribe` へのウォームアップ要求)。

## はじめに読むもの

このリポジトリで開発に参加する人は、まず以下を読むこと。

1. [`docs/プロジェクトコンテキスト.md`](./docs/プロジェクトコンテキスト.md) — プロジェクトの背景・現状・チーム体制のまとめ
2. [`docs/仕様書.md`](./docs/仕様書.md) — 何を作るか(機能・画面・データモデル方針)
3. [`docs/データベース設計.md`](./docs/データベース設計.md) — Supabaseのテーブル定義・DDL・RLSポリシー
4. [`DESIGN.md`](./DESIGN.md) — 配色・タイポグラフィなどUIのルール
5. [`STRUCTURE.md`](./STRUCTURE.md) — どの機能をどのフォルダ/URLに実装するかの置き場所ルール
6. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — ブランチ運用・コミット・コンフリクト対応のルール(Git初心者向け)

## 開発の進め方

このチームはGitでの共同開発がほぼ初めてのメンバーで構成されている。事故を防ぐため、必ず
[`CONTRIBUTING.md`](./CONTRIBUTING.md) の「1人1機能ブランチ + PR」の流れに沿って作業すること。`main` への直接コミットはしない。

Claude Codeを使う場合、以下のスキルが使える。

- `/merge-folder <フォルダパス>` — `main`を共有せずに個人のフォルダで進めてしまった作業を、確認を取りながら新しいブランチとして安全に取り込む
- `/manage-tasks` — 共有タスクバックログ([`TASK.md`](./TASK.md))の表示・追加・完了管理。仕様書とコードを照合した未実装タスクの提案も行う

次に何をやるか迷ったら `/manage-tasks` で [`TASK.md`](./TASK.md) を確認する(担当は決めていないので、空いているタスクから自由に着手してよい)。

## Learn More(Next.js)

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy

デプロイ先やタイミングはチームで別途決定する。参考: [Vercelへのデプロイ手順](https://nextjs.org/docs/app/building-your-application/deploying)。
