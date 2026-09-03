-- 一度確認・保存された商品バーコードの商品名/説明を記録しておくキャッシュ。
-- 商品が棚から削除されたり、Yahoo!ショッピングの検索結果が毎回同じ不自然な名前
-- (梱包・販促情報混じり)を返したりしても、スタッフが一度手直しした内容を次回以降
-- 再利用できるようにするための独立テーブル(productsのライフサイクルに依存しない)。
CREATE TABLE barcode_lookup_cache (
  barcode TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE barcode_lookup_cache ENABLE ROW LEVEL SECURITY;
-- ポリシーは意図的に作成しない(service roleキー経由のサーバーAPIからのみ読み書きする)。
