-- 消費者向け画面の多言語対応。商品名・説明文をロケールごとに翻訳キャッシュする。
-- barcode_lookup_cacheとは異なり、商品(products)のライフサイクルに従属させる
-- (商品が削除されたら翻訳も一緒に削除してよい)ため、ON DELETE CASCADEにする。
CREATE TABLE product_translations (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  translated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (product_id, locale)
);

CREATE INDEX idx_product_translations_product ON product_translations(product_id);

ALTER TABLE product_translations ENABLE ROW LEVEL SECURITY;
-- ポリシーは意図的に作成しない(service roleキー経由のサーバーAPIからのみ読み書きする)。
