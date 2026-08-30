ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: 本人の行のみ参照・更新可
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- stores / shelf_locations / shelves / products:
-- 認証済みユーザーは自分のprofiles.store_idと一致するstore_idの行のみ操作可
CREATE POLICY stores_admin_all ON stores
  FOR ALL USING (
    id IN (SELECT store_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY shelf_locations_admin_all ON shelf_locations
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY shelves_admin_all ON shelves
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY products_admin_all ON products
  FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE profiles.id = auth.uid())
  );
