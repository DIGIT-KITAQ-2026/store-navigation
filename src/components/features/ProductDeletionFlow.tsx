"use client";

import { useState } from "react";
import BarcodeScannerView from "@/components/features/BarcodeScannerView";
import { ZONE_LABELS, isLocationCode } from "@/lib/shelfZones";

type Step = "scan-shelf" | "shelf-not-found" | "no-product" | "confirm" | "deleting" | "done";

interface ShelfInfo {
  locationLabel: string;
}

interface ProductInfo {
  id: string;
  name: string;
  barcode: string;
  description: string;
}

interface ShelfLookupResponse {
  shelf: {
    id: string;
    locationCode: string | null;
    product: ProductInfo | null;
  } | null;
  error?: string;
}

// 商品削除の一連の流れ(棚バーコードをスキャン→その棚に登録済みの商品一覧を表示
// →削除したい商品を選択して削除)。docs/仕様書.md「商品削除」・docs/データベース設計.md
// 3.4節の運用ルール(1棚につき商品は1件のみ)に基づき、一覧は0件または1件になる。
//
// 管理者ログイン画面がまだ無いため、実際のデータ読み書きは`/api/admin/*`
// (service roleキーを使うサーバー側API)経由で行う。ログイン機能が完成したら
// セッション付きクライアント経由のRLSに置き換えることを検討する
// ([[admin-login-sequencing]])。
export default function ProductDeletionFlow() {
  const [step, setStep] = useState<Step>("scan-shelf");
  const [error, setError] = useState<string | null>(null);

  const [shelfBarcode, setShelfBarcode] = useState("");
  const [shelf, setShelf] = useState<ShelfInfo | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);

  async function handleShelfScan(code: string) {
    setError(null);
    setShelfBarcode(code);

    const response = await fetch(`/api/admin/shelf-lookup?barcode=${encodeURIComponent(code)}`);
    const body: ShelfLookupResponse = await response.json();

    if (!response.ok) {
      setError(body.error ?? "棚の検索に失敗しました");
      return;
    }

    if (!body.shelf) {
      setStep("shelf-not-found");
      return;
    }

    const locationLabel =
      body.shelf.locationCode && isLocationCode(body.shelf.locationCode)
        ? `${body.shelf.locationCode}(${ZONE_LABELS[body.shelf.locationCode]})`
        : "未配置の棚";
    setShelf({ locationLabel });

    if (!body.shelf.product) {
      setStep("no-product");
      return;
    }

    setProduct(body.shelf.product);
    setStep("confirm");
  }

  async function handleDelete() {
    if (!product) return;
    setStep("deleting");
    setError(null);

    const response = await fetch("/api/admin/product-deletion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? "商品の削除に失敗しました");
      setStep("confirm");
      return;
    }

    setStep("done");
  }

  function resetAll() {
    setShelfBarcode("");
    setShelf(null);
    setProduct(null);
    setError(null);
    setStep("scan-shelf");
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p>}

      {step === "scan-shelf" && (
        <BarcodeScannerView label="棚バーコードをスキャンしてください" onScan={handleShelfScan} />
      )}

      {step === "shelf-not-found" && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm text-on-surface">
            バーコード「{shelfBarcode}」は登録されている棚が見つかりませんでした。棚バーコードを確認してもう一度スキャンしてください。
          </p>
          <button type="button" onClick={resetAll} className="self-start text-sm font-medium text-primary">
            もう一度スキャンする
          </button>
        </div>
      )}

      {step === "no-product" && shelf && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm text-on-surface">
            {shelf.locationLabel}には削除できる商品が登録されていません。
          </p>
          <button type="button" onClick={resetAll} className="self-start text-sm font-medium text-primary">
            もう一度スキャンする
          </button>
        </div>
      )}

      {(step === "confirm" || step === "deleting") && shelf && product && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm font-medium text-on-surface-variant">この商品を削除しますか?</p>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">棚</dt>
              <dd className="text-right text-on-surface">{shelf.locationLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">商品名</dt>
              <dd className="text-right text-on-surface">{product.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">商品バーコード</dt>
              <dd className="text-right text-on-surface">{product.barcode}</dd>
            </div>
            {product.description && (
              <div className="flex flex-col gap-1">
                <dt className="text-on-surface-variant">説明</dt>
                <dd className="text-on-surface">{product.description}</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-on-surface-variant">削除すると元に戻せません。</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={step === "deleting"}
              className="h-11 flex-1 rounded-full bg-danger text-sm font-bold text-white disabled:opacity-60"
            >
              {step === "deleting" ? "削除中…" : "削除する"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              disabled={step === "deleting"}
              className="h-11 flex-1 rounded-full border border-outline-variant text-sm font-medium text-on-surface disabled:opacity-60"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm font-bold text-on-surface">商品を削除しました。</p>
          <button type="button" onClick={resetAll} className="self-start text-sm font-medium text-primary">
            続けて削除する
          </button>
        </div>
      )}
    </div>
  );
}
