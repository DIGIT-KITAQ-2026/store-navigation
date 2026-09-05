-- 商品名は翻訳せず常に元の日本語表示のままにする方針に変更したため、
-- product_translationsのnameカラムは不要になった(説明文のみ翻訳・キャッシュする)。
ALTER TABLE product_translations DROP COLUMN name;
