-- store-navigation データベース初期構築(テーブル・インデックス・RLS)
-- 内容はdocs/データベース設計.mdと対応。Supabaseへの適用済み最終状態をまとめたもの。

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

-- インデックス
CREATE INDEX idx_products_search ON products(name, category);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_shelves_store ON shelves(store_id);
CREATE INDEX idx_shelf_locations_store ON shelf_locations(store_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_shelves_barcode ON shelves(barcode);
CREATE INDEX idx_profiles_store_id ON profiles(store_id);
CREATE INDEX idx_shelves_location_id ON shelves(location_id);

-- RLS(Row Level Security)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: 本人の行のみ参照・更新可
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = (select auth.uid()));

-- stores / shelf_locations / shelves / products:
-- 認証済みユーザーは自分のprofiles.store_idと一致するstore_idの行のみ操作可
CREATE POLICY stores_admin_all ON stores
  FOR ALL USING (
    id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

CREATE POLICY shelf_locations_admin_all ON shelf_locations
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

CREATE POLICY shelves_admin_all ON shelves
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

CREATE POLICY products_admin_all ON products
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
