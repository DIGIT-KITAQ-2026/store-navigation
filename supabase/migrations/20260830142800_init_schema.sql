-- 1. 店舗テーブル (stores)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entry_qr_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 棚位置テーブル (shelf_locations)
CREATE TABLE shelf_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  unity_position_x DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  unity_position_y DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  unity_position_z DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (store_id, location_code)
);

-- 3. 棚テーブル (shelves)
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES shelf_locations(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 商品テーブル (products)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shelf_id UUID UNIQUE REFERENCES shelves(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 管理者プロフィールテーブル (profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- パフォーマンス最適化 (インデックス)
CREATE INDEX idx_products_search ON products(name, category);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_shelves_store ON shelves(store_id);
CREATE INDEX idx_shelf_locations_store ON shelf_locations(store_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_shelves_barcode ON shelves(barcode);
