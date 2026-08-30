import { products } from "@/data/products";
import type { Product, SearchResultItem } from "@/types/product";

interface AbstractSearchRuleMatch {
  productId: string;
  reason: string;
}

interface AbstractSearchRule {
  triggers: string[];
  matches: AbstractSearchRuleMatch[];
}

const ABSTRACT_SEARCH_RULES: AbstractSearchRule[] = [
  {
    triggers: ["朝食", "朝ごはん"],
    matches: [
      { productId: "milk_001", reason: "朝食の飲み物として利用できます" },
      { productId: "bread_001", reason: "朝食の主食として利用できます" },
      { productId: "egg_001", reason: "朝食の料理に利用できます" },
    ],
  },
  {
    triggers: ["カレー"],
    matches: [
      { productId: "curry_roux_001", reason: "カレーの味付けに使用します" },
      { productId: "carrot_001", reason: "カレーの具材として使用できます" },
      { productId: "potato_001", reason: "カレーの具材として使用できます" },
    ],
  },
  {
    triggers: ["飲み物", "ドリンク"],
    matches: [
      { productId: "milk_001", reason: "乳製品の飲み物です" },
      { productId: "tea_001", reason: "食事や休憩に適した飲み物です" },
    ],
  },
  {
    triggers: ["おやつ", "甘いもの", "間食"],
    matches: [{ productId: "snack_001", reason: "おやつや間食に適しています" }],
  },
];

/**
 * 前後空白除去・全角スペースの半角化・連続空白の統合・小文字化を行う
 */
export function normalizeSearchQuery(rawQuery: string): string {
  return rawQuery
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function findProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

function matchesNormalSearch(product: Product, normalizedQuery: string): boolean {
  if (product.name.toLowerCase().includes(normalizedQuery)) return true;
  if (product.category.toLowerCase().includes(normalizedQuery)) return true;
  return product.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));
}

function buildNormalMatchReason(product: Product, normalizedQuery: string): string {
  const normalizedName = product.name.toLowerCase();

  if (normalizedName === normalizedQuery) {
    return `商品名「${product.name}」が検索語と一致しました`;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return `商品名「${product.name}」に一致しました`;
  }
  if (product.category.toLowerCase().includes(normalizedQuery)) {
    return `カテゴリー「${product.category}」に一致しました`;
  }

  const matchedKeyword = product.keywords.find((keyword) =>
    keyword.toLowerCase().includes(normalizedQuery)
  );
  if (matchedKeyword !== undefined) {
    return `キーワード「${matchedKeyword}」に一致しました`;
  }

  return "検索条件に一致しました";
}

/**
 * 商品名・カテゴリー・目的などの検索語から商品候補を検索する
 * 通常の部分一致検索と、ルールベースの抽象検索を組み合わせたモック実装
 */
export function searchProducts(rawQuery: string): SearchResultItem[] {
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const resultMap = new Map<string, SearchResultItem>();
  const exactMatchIds = new Set<string>();

  for (const product of products) {
    if (!matchesNormalSearch(product, normalizedQuery)) continue;

    if (product.name.toLowerCase() === normalizedQuery) {
      exactMatchIds.add(product.id);
    }

    resultMap.set(product.id, {
      product,
      matchReason: buildNormalMatchReason(product, normalizedQuery),
    });
  }

  for (const rule of ABSTRACT_SEARCH_RULES) {
    const isTriggered = rule.triggers.some((trigger) => normalizedQuery.includes(trigger));
    if (!isTriggered) continue;

    for (const match of rule.matches) {
      const product = findProductById(match.productId);
      if (product === undefined) continue;

      resultMap.set(product.id, { product, matchReason: match.reason });
    }
  }

  const results = Array.from(resultMap.values());

  results.sort((a, b) => {
    const aIsExact = exactMatchIds.has(a.product.id);
    const bIsExact = exactMatchIds.has(b.product.id);
    if (aIsExact === bIsExact) return 0;
    return aIsExact ? -1 : 1;
  });

  return results;
}
