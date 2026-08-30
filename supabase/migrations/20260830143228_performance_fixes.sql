-- 未インデックスの外部キーにインデックスを追加
CREATE INDEX idx_profiles_store_id ON profiles(store_id);
CREATE INDEX idx_shelves_location_id ON shelves(location_id);

-- RLSポリシー内のauth.uid()を行ごとに再評価しないよう (select auth.uid()) に変更
DROP POLICY profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = (select auth.uid()));

DROP POLICY stores_admin_all ON stores;
CREATE POLICY stores_admin_all ON stores
  FOR ALL USING (
    id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

DROP POLICY shelf_locations_admin_all ON shelf_locations;
CREATE POLICY shelf_locations_admin_all ON shelf_locations
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

DROP POLICY shelves_admin_all ON shelves;
CREATE POLICY shelves_admin_all ON shelves
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

DROP POLICY products_admin_all ON products;
CREATE POLICY products_admin_all ON products
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
