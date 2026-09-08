-- カテゴリDB(categories/category_keywords)・商品/棚とカテゴリの紐付け・棚卸しデータ
-- (inventory_counts)を追加する。内容はdocs/データベース設計.mdの追記分と対応。
--
-- 3D(Unity)側は既存のShelf_01〜Shelf_08固定8ゾーン(docs/データベース設計.md 3.2節)を
-- 変更しない。本マイグレーションはlocation_codeの値やshelves/productsの既存カラムには
-- 一切手を入れず、新しいカテゴリ体系(食品/文具/電気/化粧/衛生/トラベル/掃除/キッチン)を
-- 「並行して」持たせるだけに留める。既存のproducts.category(自由記述・Unityゾーン名文字列)
-- はそのまま残し、削除・上書きしない(互換性維持)。

-- 1. カテゴリマスタ (categories)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT categories_code_not_empty CHECK (code <> ''),
  CONSTRAINT categories_name_not_empty CHECK (name <> ''),
  CONSTRAINT categories_display_order_non_negative CHECK (display_order >= 0)
);

CREATE INDEX idx_categories_display_order ON categories(display_order);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- 2. カテゴリ検索キーワード (category_keywords)
-- 同じ検索語が複数カテゴリへ登録できる構造にするため、normalized_keyword単独のUNIQUE制約は
-- 作らない(例: 「スポンジ」→ 掃除・キッチンの両方)。一意制約は(category_id, normalized_keyword)の
-- 組み合わせのみ(同一カテゴリへの同一キーワード重複登録を防ぐ)。
CREATE TABLE category_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  normalized_keyword TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT category_keywords_keyword_not_empty CHECK (keyword <> ''),
  CONSTRAINT category_keywords_normalized_keyword_not_empty CHECK (normalized_keyword <> ''),
  CONSTRAINT category_keywords_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT category_keywords_category_normalized_unique UNIQUE (category_id, normalized_keyword)
);

CREATE INDEX idx_category_keywords_category_id ON category_keywords(category_id);
CREATE INDEX idx_category_keywords_normalized_keyword ON category_keywords(normalized_keyword);

-- 3. products / shelf_locations へカテゴリ参照を追加
-- 既存products.category(TEXT、Unityゾーン名の自由記述)は互換性のため残したまま、
-- 正式なカテゴリDBへの参照をnullable列として追加する(既存行は無条件でnullのまま)。
ALTER TABLE products ADD COLUMN category_id UUID NULL REFERENCES categories(id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Shelf_01〜Shelf_08という売り場ゾーンのカテゴリを表す(3D側のゾーン名とは独立)。
ALTER TABLE shelf_locations ADD COLUMN category_id UUID NULL REFERENCES categories(id);
CREATE INDEX idx_shelf_locations_category_id ON shelf_locations(category_id);

-- 4. 棚卸しデータ (inventory_counts)
-- 商品未登録のSKUも記録できるよう、product_id/shelf_location_id/category_idはすべてnullable。
-- store_id・sku・counted_atの組み合わせを一意にし、同一CSVの誤った二重取込を防ぐ
-- (同じ商品を別日時で再度棚卸しすることは許可する)。
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NULL REFERENCES products(id) ON DELETE SET NULL,
  shelf_location_id UUID NULL REFERENCES shelf_locations(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  jan_code TEXT NULL,
  category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,
  book_stock INTEGER NULL,
  actual_stock INTEGER NOT NULL,
  unit TEXT NULL,
  cost_price NUMERIC NULL,
  selling_price NUMERIC NULL,
  counted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT inventory_counts_sku_not_empty CHECK (sku <> ''),
  CONSTRAINT inventory_counts_actual_stock_non_negative CHECK (actual_stock >= 0),
  CONSTRAINT inventory_counts_book_stock_non_negative CHECK (book_stock IS NULL OR book_stock >= 0),
  CONSTRAINT inventory_counts_cost_price_non_negative CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT inventory_counts_selling_price_non_negative CHECK (selling_price IS NULL OR selling_price >= 0),
  CONSTRAINT inventory_counts_store_sku_counted_at_unique UNIQUE (store_id, sku, counted_at)
);

CREATE INDEX idx_inventory_counts_store_id ON inventory_counts(store_id);
CREATE INDEX idx_inventory_counts_product_id ON inventory_counts(product_id);
CREATE INDEX idx_inventory_counts_shelf_location_id ON inventory_counts(shelf_location_id);
CREATE INDEX idx_inventory_counts_category_id ON inventory_counts(category_id);
-- 店舗別・棚卸日時別の絞り込み用(棚卸しCSVの一覧・確認画面での取得を想定)
CREATE INDEX idx_inventory_counts_store_counted_at ON inventory_counts(store_id, counted_at);

-- 5. RLS(Row Level Security)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

-- categories/category_keywords: barcode_lookup_cache/product_translationsと同じ方針で、
-- ポリシーは意図的に作成しない(消費者検索・管理者APIとも、service roleキー経由の
-- サーバーコードからのみ読み書きする。匿名ユーザーが直接読み書きする経路は無い)。

-- inventory_counts: stores/shelf_locations/shelves/productsと同じ「担当店舗のみ」パターン。
-- 実際の読み書きはrequireAdminSession()を通した管理者APIがService Role Client経由で行うため
-- 通常はこのポリシー経由の呼び出しは発生しないが、他の店舗スコープテーブルとの一貫性と
-- 万一のセッション付きクライアント利用に備えた多層防御として同じ形にしておく。
CREATE POLICY inventory_counts_admin_all ON inventory_counts
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

-- 6. 正式8カテゴリの初期データ(再実行しても重複しないようON CONFLICT DO NOTHING)
INSERT INTO categories (code, name, display_order) VALUES
  ('CAT_01', '食品', 1),
  ('CAT_02', '文具', 2),
  ('CAT_03', '電気', 3),
  ('CAT_04', '化粧', 4),
  ('CAT_05', '衛生', 5),
  ('CAT_06', 'トラベル', 6),
  ('CAT_07', '掃除', 7),
  ('CAT_08', 'キッチン', 8)
ON CONFLICT (code) DO NOTHING;

-- 7. 検索キーワード初期データ
-- normalized_keywordはsrc/lib/category/normalize.tsのnormalizeCategoryText()と同じ結果になるよう
-- lower(trim(keyword))で求める(この初期データには全角/半角ゆれや連続空白を含む語が無いため、
-- lower(trim())のみで一致する。'LED'のみ大文字混在のため正規化後は'led'になる)。
-- 「スポンジ」は掃除・キッチンの両方に登録し、1カテゴリへ固定しない。
INSERT INTO category_keywords (category_id, keyword, normalized_keyword, priority)
SELECT c.id, v.keyword, lower(trim(v.keyword)), 0
FROM (VALUES
  ('CAT_01', '食品'), ('CAT_01', 'お菓子'), ('CAT_01', '菓子'), ('CAT_01', '飲み物'),
  ('CAT_01', '飲料'), ('CAT_01', '調味料'), ('CAT_01', 'レトルト'), ('CAT_01', '缶詰'),

  ('CAT_02', '文具'), ('CAT_02', '文房具'), ('CAT_02', 'ノート'), ('CAT_02', 'ペン'),
  ('CAT_02', 'ボールペン'), ('CAT_02', '鉛筆'), ('CAT_02', '消しゴム'), ('CAT_02', '付箋'),
  ('CAT_02', 'ファイル'), ('CAT_02', 'テープ'),

  ('CAT_03', '電気'), ('CAT_03', '電池'), ('CAT_03', '乾電池'), ('CAT_03', '充電'),
  ('CAT_03', '充電ケーブル'), ('CAT_03', 'ケーブル'), ('CAT_03', 'イヤホン'), ('CAT_03', 'ライト'),
  ('CAT_03', 'LED'),

  ('CAT_04', '化粧'), ('CAT_04', 'メイク'), ('CAT_04', '化粧水'), ('CAT_04', 'パフ'),
  ('CAT_04', 'ファンデーション'), ('CAT_04', 'ネイル'), ('CAT_04', 'メイクブラシ'), ('CAT_04', 'コスメ'),

  ('CAT_05', '衛生'), ('CAT_05', '歯磨き'), ('CAT_05', '歯みがき'), ('CAT_05', '歯ブラシ'),
  ('CAT_05', '歯磨き粉'), ('CAT_05', 'デンタルフロス'), ('CAT_05', '口腔ケア'), ('CAT_05', 'マスク'),
  ('CAT_05', '綿棒'), ('CAT_05', 'ウェットティッシュ'),

  ('CAT_06', 'トラベル'), ('CAT_06', '旅行'), ('CAT_06', '旅行用品'), ('CAT_06', '携帯用品'),
  ('CAT_06', '圧縮袋'), ('CAT_06', '収納袋'), ('CAT_06', 'トラベルボトル'), ('CAT_06', 'ネックピロー'),

  ('CAT_07', '掃除'), ('CAT_07', '清掃'), ('CAT_07', '掃除ブラシ'), ('CAT_07', '雑巾'),
  ('CAT_07', 'メラミンスポンジ'), ('CAT_07', 'スポンジ'), ('CAT_07', '粘着クリーナー'), ('CAT_07', 'ゴミ袋'),
  ('CAT_07', '浴室掃除'),

  ('CAT_08', 'キッチン'), ('CAT_08', '台所'), ('CAT_08', '食器'), ('CAT_08', '調理器具'),
  ('CAT_08', '保存容器'), ('CAT_08', 'アルミホイル'), ('CAT_08', '食器洗い'), ('CAT_08', 'スポンジ'),
  ('CAT_08', 'キッチンスポンジ'), ('CAT_08', 'ラップ')
) AS v(category_code, keyword)
JOIN categories c ON c.code = v.category_code
ON CONFLICT (category_id, normalized_keyword) DO NOTHING;

-- 8. shelf_locations.category_id の初期対応付け
-- Shelf_01〜Shelf_08はUnity側の固定ゾーンコードで、docs/データベース設計.md 3.2節の通り
-- 全店舗共通の対応(store_idを問わない)。location_codeの値自体は変更しない。
UPDATE shelf_locations sl
SET category_id = c.id
FROM categories c,
     (VALUES
        ('Shelf_01', 'CAT_01'),
        ('Shelf_02', 'CAT_02'),
        ('Shelf_03', 'CAT_03'),
        ('Shelf_04', 'CAT_04'),
        ('Shelf_05', 'CAT_05'),
        ('Shelf_06', 'CAT_06'),
        ('Shelf_07', 'CAT_07'),
        ('Shelf_08', 'CAT_08')
     ) AS v(location_code, category_code)
WHERE sl.location_code = v.location_code
  AND c.code = v.category_code;
