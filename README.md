# store-navigation

チームブルーオーシャンのリポジトリです。

店員に話しかけなくても、スマホだけで商品を検索して店内ナビゲーションまでできるアプリ(ハッカソン向けMVP)。
「探し物が見つからない消費者」と「作業を中断させたくない店員」双方の負担をなくすことが目的。

## 技術構成

| 要素 | 採用技術 |
|---|---|
| フロントエンド/バックエンド | Next.js(このリポジトリ) |
| データベース | Supabase(テーブル設計は実装時に決定) |
| 3Dナビゲーション | Unity WebGLビルドをNext.jsページに埋め込み |
| AI(商品検索) | Claude Agent SDK(claude.aiサブスクリプションのOAuth認証) |
| バーコード/QR読取 | ブラウザのカメラAPI |

詳細な機能・画面仕様は [`docs/仕様書.md`](./docs/仕様書.md)、UIのデザインルールは [`DESIGN.md`](./DESIGN.md) を参照。

## Getting Started

開発サーバーを起動する。

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開くと確認できる。`src/app/page.tsx` を編集すると自動で反映される。

## はじめに読むもの

このリポジトリで開発に参加する人は、まず以下を読むこと。

1. [`docs/プロジェクトコンテキスト.md`](./docs/プロジェクトコンテキスト.md) — プロジェクトの背景・現状・チーム体制のまとめ
2. [`docs/仕様書.md`](./docs/仕様書.md) — 何を作るか(機能・画面・データモデル方針)
3. [`DESIGN.md`](./DESIGN.md) — 配色・タイポグラフィなどUIのルール
4. [`STRUCTURE.md`](./STRUCTURE.md) — どの機能をどのフォルダ/URLに実装するかの置き場所ルール
5. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — ブランチ運用・コミット・コンフリクト対応のルール(Git初心者向け)

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
