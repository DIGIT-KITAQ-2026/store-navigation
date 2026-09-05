import { RawImage } from "@huggingface/transformers";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { getImageClassifier } from "./clip/models";
import { IMAGE_LABELS } from "./clip/imageLabels";
import { searchProductsWithClip } from "./searchProductsWithClip";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { buildSearchReason } from "./searchReasons";

/** 上位ラベルのスコアがこれ未満の場合は「何が写っているか判断できない」とみなす */
const MIN_LABEL_SCORE = 0.2;

/** 1位からこの差の範囲内のラベルも採用する(1位と2位が僅差のときに取りこぼさないため) */
const LABEL_MARGIN = 0.15;

/** 1回の検索で返す最大件数 */
const MAX_RESULTS = 5;

/**
 * アップロードされた画像から商品を検索する。
 *
 * 1) 画像を英語ラベル一覧(`IMAGE_LABELS`)に対してCLIPでゼロショット分類し、
 * 2) 当たったラベルに対応する日本語の検索語で、通常のテキスト検索を実行する。
 *
 * 2)で英語ラベルのベクトルを直接日本語商品と突き合わせないのは、多言語テキストモデルが
 * 品目同士を区別できず精度が出なかったため(詳細は `clip/imageLabels.ts` のコメント)。
 * 評価用画像16枚での実測は、旧方式8/16に対しこの方式で16/16。
 */
export async function searchProductsWithClipVision(
  imageBuffer: Buffer,
  catalog: CatalogItem[],
  locale: Locale = DEFAULT_LOCALE
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const classifier = await getImageClassifier();
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]));

  const predictions = (await classifier(
    image,
    IMAGE_LABELS.map((entry) => entry.label)
  )) as Array<{ label: string; score: number }>;

  const topScore = predictions[0]?.score ?? 0;
  const acceptedLabels = predictions.filter(
    (prediction) =>
      prediction.score >= MIN_LABEL_SCORE && prediction.score >= topScore - LABEL_MARGIN
  );

  const queryByLabel = new Map(IMAGE_LABELS.map((entry) => [entry.label, entry.query]));

  const matches: ClaudeSearchMatch[] = [];
  const seenProductIds = new Set<string>();

  for (const prediction of acceptedLabels) {
    // 背景クラス(商品ではない)に当たったラベルは検索しない
    const query = queryByLabel.get(prediction.label);
    if (!query) continue;

    for (const match of await searchProductsWithClip(query, catalog, locale)) {
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
