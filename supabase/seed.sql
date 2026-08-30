-- デモ用の最小シードデータ(実演用デモ店舗1件、棚位置/棚/商品を3件ずつ)
-- 画面実装の動作確認用。管理者アカウント(profiles)はSupabase Authのサインアップを
-- 経由する必要があるため、このシードには含めていない。

WITH new_store AS (
  INSERT INTO stores (name, description, entry_qr_code)
  VALUES ('実演用デモ店舗', 'ハッカソンMVPのデモ用店舗', 'DEMO-STORE-ENTRY-001')
  RETURNING id
),
new_locations AS (
  INSERT INTO shelf_locations (store_id, location_code, unity_position_x, unity_position_y, unity_position_z)
  SELECT (SELECT id FROM new_store), v.location_code, v.x, v.y, v.z
  FROM (VALUES
    ('Shelf_01', 0.0, 0.0, 0.0),
    ('Shelf_02', 2.0, 0.0, 0.0),
    ('Shelf_03', 4.0, 0.0, 0.0)
  ) AS v(location_code, x, y, z)
  RETURNING id, location_code
),
new_shelves AS (
  INSERT INTO shelves (store_id, location_id, barcode)
  SELECT (SELECT id FROM new_store), nl.id, v.barcode
  FROM new_locations nl
  JOIN (VALUES
    ('Shelf_01', '4901234500011'),
    ('Shelf_02', '4901234500012'),
    ('Shelf_03', '4901234500013')
  ) AS v(location_code, barcode) ON v.location_code = nl.location_code
  RETURNING id, location_id
)
INSERT INTO products (store_id, shelf_id, barcode, name, category, description)
SELECT (SELECT id FROM new_store), ns.id, v.barcode, v.name, v.category, v.description
FROM new_shelves ns
JOIN new_locations nl ON nl.id = ns.location_id
JOIN (VALUES
  ('Shelf_01', '4901234500101', 'カレールー(中辛)', '調味料', 'カレーライス作りに使う中辛のルー'),
  ('Shelf_02', '4901234500102', '醤油(濃口)', '調味料', '和食全般に使う濃口しょうゆ'),
  ('Shelf_03', '4901234500103', '歯ブラシ(ふつう)', '日用品', '毎日の歯磨きに使う普通の硬さの歯ブラシ')
) AS v(location_code, barcode, name, category, description) ON v.location_code = nl.location_code;
