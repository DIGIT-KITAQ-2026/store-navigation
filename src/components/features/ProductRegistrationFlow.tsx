"use client";

import { useState, type FormEvent } from "react";
import BarcodeScannerView from "@/components/features/BarcodeScannerView";
import { ZONE_LABELS, type LocationCode } from "@/lib/shelfZones";

type Step =
  | "scan-shelf"
  | "shelf-not-found"
  | "shelf-occupied"
  | "scan-product"
  | "details"
  | "review"
  | "saving"
  | "done";

type Mode = "create" | "update";

interface ShelfInfo {
  id: string;
  locationCode: LocationCode;
  zoneName: string;
}

interface ExistingProduct {
  id: string;
  name: string;
  barcode: string;
  description: string;
}

interface ShelfLookupResponse {
  shelf: {
    id: string;
    locationCode: string | null;
    product: ExistingProduct | null;
  } | null;
  error?: string;
}

// 商品登録・更新の一連の流れ(棚バーコード特定→商品バーコード→商品名/説明→保存)。
// 棚バーコードは事前登録済みのものだけを対象とし、その場での新規棚作成は行わない。
// 既に商品が登録されている棚は「更新するか」を確認し、更新する場合は既存の内容を
// 引き継いで編集できるようにする。
//
// 管理者ログイン画面がまだ無いため、実際のデータ読み書きは`/api/admin/*`
// (service roleキーを使うサーバー側API)経由で行う。ログイン機能が完成したら
// セッション付きクライアント経由のRLSに置き換えることを検討する
// ([[admin-login-sequencing]])。
export default function ProductRegistrationFlow() {
  const [step, setStep] = useState<Step>("scan-shelf");
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("create");
  const [shelfBarcode, setShelfBarcode] = useState("");
  const [shelf, setShelf] = useState<ShelfInfo | null>(null);
  const [existingProduct, setExistingProduct] = useState<ExistingProduct | null>(null);

  const [productBarcode, setProductBarcode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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

    const locationCode = body.shelf.locationCode as LocationCode | null;
    if (!locationCode || !(locationCode in ZONE_LABELS)) {
      setError("この棚はUnityゾーンに未配置のため登録できません。管理者にご確認ください。");
      return;
    }

    setShelf({ id: body.shelf.id, locationCode, zoneName: ZONE_LABELS[locationCode] });

    if (body.shelf.product) {
      setExistingProduct(body.shelf.product);
      setStep("shelf-occupied");
      return;
    }

    setMode("create");
    setStep("scan-product");
  }

  function handleStartUpdate() {
    if (!existingProduct) return;
    setMode("update");
    setProductBarcode(existingProduct.barcode);
    setName(existingProduct.name);
    setDescription(existingProduct.description);
    setStep("details");
  }

  function handleProductScan(code: string) {
    setProductBarcode(code);
    setStep("details");
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length === 0 || description.trim().length === 0) return;
    setStep("review");
  }

  async function handleSave() {
    if (!shelf) return;
    setStep("saving");
    setError(null);

    const response = await fetch("/api/admin/product-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        shelfId: shelf.id,
        existingProductId: existingProduct?.id,
        barcode: productBarcode,
        name: name.trim(),
        category: shelf.zoneName,
        description: description.trim(),
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? (mode === "update" ? "商品の更新に失敗しました" : "商品の登録に失敗しました"));
      setStep("review");
      return;
    }

    setStep("done");
  }

  function resetAll() {
    setMode("create");
    setShelfBarcode("");
    setShelf(null);
    setExistingProduct(null);
    setProductBarcode("");
    setName("");
    setDescription("");
    setError(null);
    setStep("scan-shelf");
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p>
      )}

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

      {step === "shelf-occupied" && shelf && existingProduct && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm text-on-surface">
            {shelf.locationCode}({shelf.zoneName})には既に商品「{existingProduct.name}」が登録されています。更新しますか?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleStartUpdate}
              className="h-11 flex-1 rounded-full bg-primary text-sm font-bold text-on-primary"
            >
              更新する
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="h-11 flex-1 rounded-full border border-outline-variant text-sm font-medium text-on-surface"
            >
              もう一度スキャンする
            </button>
          </div>
        </div>
      )}

      {step === "scan-product" && shelf && (
        <>
          <p className="text-sm text-on-surface-variant">
            棚: {shelf.locationCode}({shelf.zoneName})
          </p>
          <BarcodeScannerView label="商品バーコードをスキャンしてください" onScan={handleProductScan} />
        </>
      )}

      {step === "details" && shelf && (
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm text-on-surface-variant">
            棚: {shelf.locationCode}({shelf.zoneName}) ・ バーコード: {productBarcode}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-on-surface">
              商品名
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="h-11 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-on-surface">
              商品説明(検索用)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={3}
              className="rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-full bg-primary text-sm font-bold text-on-primary"
          >
            確認画面へ
          </button>
        </form>
      )}

      {(step === "review" || step === "saving") && shelf && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm font-medium text-on-surface-variant">
            {mode === "update" ? "更新内容の確認" : "登録内容の確認"}
          </p>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">棚</dt>
              <dd className="text-right text-on-surface">
                {shelf.locationCode}({shelf.zoneName})
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">商品バーコード</dt>
              <dd className="text-right text-on-surface">{productBarcode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">商品名</dt>
              <dd className="text-right text-on-surface">{name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-variant">カテゴリ</dt>
              <dd className="text-right text-on-surface">{shelf.zoneName}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-on-surface-variant">説明</dt>
              <dd className="text-on-surface">{description}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleSave}
            disabled={step === "saving"}
            className="h-11 rounded-full bg-primary text-sm font-bold text-on-primary disabled:opacity-60"
          >
            {step === "saving" ? "処理中…" : mode === "update" ? "この内容で更新する" : "この内容で登録する"}
          </button>
        </div>
      )}

      {step === "done" && shelf && (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-sm font-bold text-on-surface">
            {mode === "update"
              ? `「${name}」の情報を更新しました。`
              : `「${name}」を${shelf.locationCode}(${shelf.zoneName})に登録しました。`}
          </p>
          <button type="button" onClick={resetAll} className="self-start text-sm font-medium text-primary">
            続けて登録する
          </button>
        </div>
      )}
    </div>
  );
}
