/**
 * 学習した分類器が出すクラス名 → 日本語の検索語。
 * 分類結果をこの表で日本語に橋渡しし、既存のテキスト検索へ渡す。
 * クラス名は Open Images Dataset V7 のもの(学習時のフォルダ名に合わせて記号を _ にしてある)。
 *
 * 対応語は管理者画面の商品一覧(= Supabaseのproducts)にある商品に当たるように付けている。
 * 広すぎる語は避けること(「水」は化粧水やマイクロファイバークロスの説明文にも当たってしまう)。
 * 商品が増減したら、ここの対応語が実在の商品に当たるか確認する。
 *
 * Not_a_product は「商品ではない」ことを表す学習クラス(車・人・家具などOIv7の店外物体で学習)。
 * これが1位になった画像は検索せず0件にする。
 */
export const OIV7_CLASS_QUERIES: Record<string, string | null> = {
  "Battery": "乾電池",
  "Beef": "牛こま切れ 牛肉",
  "Bin_bag": "ごみ袋",
  "Biscuit": "ビスケット",
  "Bottled_water": "ミネラルウォーター",
  "Box": "小物収納ケース",
  "Brush": "掃除用ブラシ",
  "Cabbage": "キャベツ",
  "Cable": "ケーブル",
  "Carrot": "にんじん",
  "Cheese": "チーズ",
  "Chicken_meat": "鶏むね 鶏肉",
  "Cotton_swab": "綿棒",
  "Cosmetics": "化粧",
  "Curry": "カレー",
  "Dumpling": "餃子",
  "Eraser": "消しゴム",
  "Flashlight": "LEDライト",
  "Food_storage_containers": "保存容器",
  "Fried_chicken": "から揚げ",
  "Garment_bag": "衣類圧縮袋",
  "Green_tea": "緑茶",
  "Headphones": "イヤホン",
  "Household_cleaning_supply": "掃除",
  "Ice_cream": "アイスクリーム",
  "Lotion": "化粧水",
  "Mackerel": "さば",
  "Makeup_brushes": "メイクブラシ",
  "Mask": "マスク",
  "Measuring_spoon": "計量スプーン",
  "Milk": "牛乳",
  "Mirror": "ミラー 鏡",
  "Nail_care": "ネイルケア",
  "Noodle": "うどん 麺",
  "Not_a_product": null,
  "Notebook": "ノート",
  "Onion": "玉ねぎ",
  "Pen": "ボールペン",
  "Pencil": "鉛筆",
  "Plastic_wrap": "食品用ラップ",
  "Plate": "小皿",
  "Pork": "豚バラ 豚肉",
  "Potato_chip": "ポテトスナック",
  "Potato_salad": "ポテトサラダ",
  "Pouch": "トラベルポーチ",
  "Salmon": "サーモン",
  "Sashimi": "刺身",
  "Soup": "スープ",
  "Sponge_Tool_": "スポンジ",
  "Soy_sauce": "醤油",
  "Stationery": "文具 付箋",
  "Tissue": "ウェットティッシュ",
  "Toothbrush": "歯ブラシ",
  "Toothpaste": "歯磨き",
  "Towel": "マイクロファイバークロス",
  "Travel_pillow": "ネックピロー",
  "Usb_cable": "USB充電ケーブル",
  "Water_bottle": "携帯用ボトル",
  "Yakitori": "焼き鳥",
  "Yogurt": "ヨーグルト",
};

/** 「商品ではない」を表すクラス名 */
export const NOT_A_PRODUCT_CLASS = "Not_a_product";
