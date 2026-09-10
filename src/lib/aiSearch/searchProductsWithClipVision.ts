import { RawImage } from "@huggingface/transformers";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { classifyProductImage } from "./clip/productClassifier";
import { NOT_A_PRODUCT_CLASS } from "./clip/oiv7ClassQueries";
import { fallbackSearch } from "./fallbackSearch";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { buildSearchReason } from "./searchReasons";

/**
 * 上位の確率がこれ未満なら「何が写っているか判断できない」として0件にする。
 *
 * 商品以外の写真は学習した Not_a_product クラスで弾けるので、ここは低めでよい
 * (実測: 正しく当たる商品画像は0.141以上、判別できなかった画像は0.078以下)。
 */
const MIN_SCORE = 0.12;

/**
 * 1位からこの割合まで確率が落ちる範囲は候補として採用する。
 * 似た品目のクラス(歯ブラシ/歯磨き/メイクブラシなど)は確率が割れるため、
 * 広めに採ってから商品名で絞る方が取りこぼしが少ない。
 */
const SCORE_RATIO = 0.3;

/** 分類結果から採用する上位件数 */
const TOP_CLASSES = 5;

/** 1回の検索で返す最大件数 */
const MAX_RESULTS = 5;

/**
 * アップロードされた画像から商品を検索する。
 *
 * 1) Open Images V7 で学習した分類器で、画像を商品カテゴリに分類し、
 * 2) 当たったクラスに対応する日本語の検索語で、通常のテキスト検索を実行する。
 *
 * 以前は手書きの英語ラベル一覧に対するゼロショット分類だったが、ラベルを食品中心に
 * 書いていたため、後から増えた文具・電気・化粧・衛生・トラベル・掃除・キッチンの商品を
 * 画像で探せなかった(実測: 食品以外は1/8)。OIv7の実画像で学習させることで、
 * 同じ検証データでの分類精度も44.4%(ゼロショット)から59.5%に上がっている。
 *
 * 2)で意味検索を使わず文字列一致だけにしているのは、その品目を店が扱っていない場合に
 * 無関係な商品が出てしまうため(実測: にんじんの画像 → 店に無いので「綿棒」が返っていた)。
 * 画像から得るのは「にんじん」のような具体的な品目名なので、文字列一致で十分に当たる。
 */
export async function searchProductsWithClipVision(
  imageBuffer: Buffer,
  catalog: CatalogItem[],
  locale: Locale = DEFAULT_LOCALE
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]));
  const predictions = await classifyProductImage(image);

  const top = predictions[0];
  if (!top || top.score < MIN_SCORE) return [];
  // 商品が写っていないと判断した場合はここで打ち切る(2位以下の商品クラスを拾わない)
  if (top.className === NOT_A_PRODUCT_CLASS) return [];

  const accepted = predictions
    .slice(0, TOP_CLASSES)
    .filter((prediction) => prediction.score >= top.score * SCORE_RATIO && prediction.query);

  const matches: ClaudeSearchMatch[] = [];
  const seenProductIds = new Set<string>();

  for (const prediction of accepted) {
    const query = prediction.query;
    if (!query) continue;

    // 「サーモン 切り身」のように複数語の場合があるため語ごとに照合する
    const words = query.split(" ").filter(Boolean);
    const lexicalMatches = words.flatMap((word) => fallbackSearch(word, catalog, locale));
    for (const match of lexicalMatches) {
      if (seenProductIds.has(match.productId)) continue;
      seenProductIds.add(match.productId);
      matches.push({
        productId: match.productId,
        reason: buildSearchReason("image", { label: query.split(" ")[0] }, locale),
      });
      if (matches.length >= MAX_RESULTS) return matches;
    }
  }

  return matches;
}
