/**
 * 画像検索で使う「英語ラベル → 日本語の検索語」の対応表。
 *
 * CLIPの画像エンコーダは英語テキストとしか比較できないため、まず画像をこのラベル一覧に対して
 * ゼロショット分類し、当たったラベルの `query` を通常のテキスト検索にかける。
 * 英語ラベルの埋め込みを直接日本語の商品と突き合わせる方式も試したが、CLIPが信頼度1.00で
 * 「a fresh carrot」と当てても照合側で玉ねぎが1位になるなど、多言語テキストモデルが
 * 品目同士を区別できず精度が出なかった(実測: 総合8/16)。ここで日本語に橋渡ししてしまい、
 * 実績のあるテキスト検索に任せる形にしている(同16/16)。
 *
 * 商品ごとではなく一般的な品目の辞書なので、商品マスタが増減しても更新は不要。
 * 店舗の取扱カテゴリが大きく変わる場合のみ追記する。
 *
 * `query` が null のものは「商品ではない」背景クラス。これが無いと、商品が何も写っていない
 * 写真でもCLIPが無理やり食品ラベルに寄せてしまい、無関係な商品がヒットする
 * (実測: 靴の画像 → ミネラルウォーター)。
 */
export interface ImageLabel {
  /** CLIPに与える英語ラベル */
  label: string;
  /** 対応する日本語の検索語。スペース区切りで複数指定できる。null は商品ではないことを表す */
  query: string | null;
}

export const IMAGE_LABELS: ImageLabel[] = [
  // 青果
  { label: "a fresh carrot", query: "にんじん" },
  { label: "a head of cabbage", query: "キャベツ" },
  { label: "a fresh tomato", query: "トマト" },
  { label: "a potato", query: "じゃがいも" },
  { label: "an onion", query: "玉ねぎ" },
  { label: "a cucumber", query: "きゅうり" },
  { label: "a banana", query: "バナナ" },
  { label: "an apple", query: "りんご" },
  { label: "a bunch of green vegetables", query: "葉物野菜" },

  // 精肉・鮮魚
  { label: "a salmon fillet", query: "サーモン 切り身" },
  { label: "a whole raw fish", query: "魚 切り身" },
  { label: "sliced raw beef meat", query: "牛肉" },
  { label: "raw chicken meat", query: "鶏肉" },
  { label: "a pack of sliced pork", query: "豚肉" },
  { label: "sushi and sashimi", query: "刺身" },

  // 惣菜
  { label: "a plate of fried chicken", query: "から揚げ" },
  { label: "a fried chicken drumstick", query: "から揚げ 鶏肉" },
  { label: "potato salad", query: "ポテトサラダ" },
  { label: "grilled chicken skewers", query: "焼き鳥" },
  { label: "a bento lunch box", query: "弁当" },
  { label: "a rice ball onigiri", query: "おにぎり" },

  // 乳製品・卵
  { label: "sliced cheese", query: "チーズ" },
  { label: "a carton of milk", query: "牛乳" },
  { label: "a glass of milk", query: "牛乳" },
  { label: "a cup of plain yogurt", query: "ヨーグルト" },
  { label: "a carton of eggs", query: "卵" },
  { label: "a stick of butter", query: "バター" },

  // 飲料
  { label: "a bottle of mineral water", query: "ミネラルウォーター 水" },
  { label: "a cup or bottle of green tea", query: "緑茶 お茶" },
  { label: "a can of coffee", query: "コーヒー" },
  { label: "a bottle of juice", query: "ジュース" },
  { label: "a can of beer", query: "ビール" },

  // 加工食品・調味料
  { label: "a box of curry roux", query: "カレールー" },
  { label: "a bottle of soy sauce", query: "醤油" },
  { label: "a bottle of cooking oil", query: "食用油" },
  { label: "a jar of mayonnaise", query: "マヨネーズ" },
  { label: "a bag of rice", query: "米" },
  { label: "a bowl of cooked white rice", query: "米 ごはん" },
  { label: "a loaf of bread", query: "パン" },
  { label: "a package of pasta", query: "パスタ" },
  { label: "a can of canned food", query: "缶詰" },

  // 麺類
  { label: "a bowl of noodle soup", query: "うどん ラーメン 麺" },
  { label: "a package of instant noodles", query: "インスタント麺" },

  // 冷凍・菓子
  { label: "vanilla ice cream", query: "アイスクリーム" },
  { label: "japanese gyoza dumplings", query: "餃子" },
  { label: "a single dumpling", query: "餃子" },
  { label: "steamed dumplings on a plate", query: "餃子" },
  { label: "a bag of frozen food", query: "冷凍食品" },
  { label: "a bag of potato chips", query: "ポテトチップス" },
  { label: "a chocolate bar", query: "チョコレート" },
  { label: "a package of cookies", query: "クッキー" },

  // 日用品
  { label: "a toothbrush", query: "歯ブラシ" },
  { label: "a bottle of shampoo", query: "シャンプー" },
  { label: "a roll of toilet paper", query: "トイレットペーパー" },
  { label: "a box of tissues", query: "ティッシュ" },
  { label: "laundry detergent", query: "洗剤" },

  // 背景クラス(商品ではないもの)
  { label: "a laptop computer", query: null },
  { label: "a smartphone", query: null },
  { label: "a car on the road", query: null },
  { label: "a pair of shoes", query: null },
  { label: "a piece of clothing", query: null },
  { label: "a person's face", query: null },
  { label: "an animal or a pet", query: null },
  { label: "a building or a street", query: null },
  { label: "a plant or a flower", query: null },
  { label: "a screenshot of text", query: null },
];
