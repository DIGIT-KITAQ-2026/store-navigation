"use client";

import { useEffect, useState, type FormEvent } from "react";
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

type LookupStatus = "idle" | "loading" | "found" | "cache" | "not-found";

interface ShelfInfo {
  id: string;
  locationCode: LocationCode;
  zoneName: string;
  /** この棚位置(Shelf_01〜08)自体に設定済みのカテゴリ。未設定の棚も存在するためnull許容 */
  categoryId: string | null;
}

interface ExistingProduct {
  id: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string | null;
}

interface ShelfLookupResponse {
  shelf: {
    id: string;
    locationCode: string | null;
    categoryId: string | null;
    product: ExistingProduct | null;
  } | null;
  error?: string;
}

interface CategoryOption {
  id: string;
  code: string;
  name: string;
}

interface CategoryListResponse {
  categories?: CategoryOption[];
  error?: string;
}

type CategoriesStatus = "loading" | "ready" | "error";

// 商品登録・更新の一連の流れ(棚バーコード特定→商品バーコード→商品名/説明→保存)。
// 棚バーコードは事前登録済みのものだけを対象とし、その場での新規棚作成は行わない。
// 既に商品が登録されている棚は「更新するか」を確認し、更新する場合も含めて
// 商品バーコードのスキャンは必ず行う(名前・説明のみ既存内容を引き継ぐ)。
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
  const [categoryId, setCategoryId] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<CategoriesStatus>("loading");

  // fetch実行のみを行い、setStateは非同期コールバック内でのみ呼ぶ(エフェクト内からの
  // 直接呼び出しを許容するため。SearchScreen.tsxのexecuteSearchと同じ考え方)
  function fetchCategories() {
    fetch("/api/admin/categories")
      .then(async (response) => {
        const body: CategoryListResponse = await response.json();
        if (!response.ok || !body.categories) {
          setCategoriesStatus("error");
          return;
        }
        setCategories(body.categories);
        setCategoriesStatus("ready");
      })
      .catch(() => {
        setCategoriesStatus("error");
      });
  }

  // 再読み込みボタン用。「loading」表示への切り替えをここで明示する(初回はcategoriesStatusの
  // 初期値が既に"loading"のため、effect側では直接setStateせずfetchCategories()だけを呼ぶ)
  function loadCategories() {
    setCategoriesStatus("loading");
    fetchCategories();
  }

  // カテゴリ一覧は自由入力を避けるため必ずAPIから取得する。取得に失敗した場合は
  // カテゴリを選べない=登録できない状態になるが、誤ったカテゴリでの登録を防ぐため
  // 安全側に倒し、再読み込みできるようにする(details画面のエラー表示・再試行ボタン)
  useEffect(() => {
    fetchCategories();
  }, []);

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

    const shelfCategoryId = body.shelf.categoryId;
    setShelf({ id: body.shelf.id, locationCode, zoneName: ZONE_LABELS[locationCode], categoryId: shelfCategoryId });

    if (body.shelf.product) {
      setExistingProduct(body.shelf.product);
      setStep("shelf-occupied");
      return;
    }

    // 棚位置に設定済みのカテゴリがあれば初期選択にする(変更は可能。不一致のまま保存しようと
    // した場合は登録API側で409になる)
    setCategoryId(shelfCategoryId ?? "");
    setMode("create");
    setStep("scan-product");
  }

  function handleStartUpdate() {
    if (!existingProduct) return;
    setMode("update");
    setProductBarcode("");
    setName(existingProduct.name);
    // 説明は引き継がない。スキャンする商品が別物の場合、前の商品の説明が残ったままになるため
    setDescription("");
    setCategoryId(existingProduct.categoryId ?? shelf?.categoryId ?? "");
    setLookupStatus("idle");
    setStep("scan-product");
  }

  async function handleProductScan(code: string) {
    setProductBarcode(code);
    setStep("details");

    setLookupStatus("loading");
    try {
      const response = await fetch(`/api/admin/product-lookup?barcode=${encodeURIComponent(code)}`);
      const body: { name?: string | null; description?: string | null; source?: "cache" | "yahoo" } =
        await response.json();
      if (body.name) {
        // 更新モードで既存の商品名がプリフィルされていても、スキャンした最新の検索結果で上書きする
        setName(body.name);
        if (body.source === "cache" && body.description) {
          setDescription(body.description);
        }
        setLookupStatus(body.source === "cache" ? "cache" : "found");
      } else {
        // 見つからない場合は何もせず、更新モードなら既存の商品名をそのまま残す
        setLookupStatus("not-found");
      }
    } catch {
      // 検索失敗時もエラー扱いにせず手入力に任せる(「見つかりませんでした」と同じ表示にする)
      setLookupStatus("not-found");
    }
  }

  // 商品名からAIに検索用の説明文を一文生成させる(ボタン押下時のみ)。失敗時も手入力で上書きできる
  async function generateDescription(productName: string) {
    if (productName.trim().length === 0) return;

    setIsGeneratingDescription(true);
    try {
      const response = await fetch("/api/admin/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName }),
      });
      const body: { description?: string } = await response.json();
      if (response.ok && body.description) {
        setDescription(body.description);
      }
    } catch {
      // 失敗時はエラー表示せず手入力に任せる
    } finally {
      setIsGeneratingDescription(false);
    }
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length === 0 || description.trim().length === 0 || categoryId.length === 0) return;
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
        categoryId,
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
    setCategoryId("");
    setLookupStatus("idle");
    setIsGeneratingDescription(false);
    setError(null);
    setStep("scan-shelf");
  }

  const selectedCategoryName = categories.find((category) => category.id === categoryId)?.name ?? "";

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
            {lookupStatus === "loading" && (
              <p className="text-xs text-on-surface-variant">商品情報を検索中…</p>
            )}
            {lookupStatus === "cache" && (
              <p className="text-xs text-primary">
                前回このバーコードで登録した内容を自動入力しました。内容を確認してください。
              </p>
            )}
            {lookupStatus === "found" && (
              <p className="text-xs text-primary">
                Yahoo!ショッピングで商品情報が見つかったので、商品名を自動入力しました。内容を確認してください。
              </p>
            )}
            {lookupStatus === "not-found" && (
              <p className="text-xs text-on-surface-variant">
                Yahoo!ショッピングで該当する商品が見つかりませんでした。商品名を入力してください。
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium text-on-surface">
              カテゴリ
            </label>
            {categoriesStatus === "error" ? (
              <div className="flex items-center justify-between gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                <span>カテゴリ一覧の取得に失敗しました</span>
                <button
                  type="button"
                  onClick={loadCategories}
                  className="shrink-0 font-semibold text-amber-700 underline"
                >
                  再読み込み
                </button>
              </div>
            ) : (
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                disabled={categoriesStatus !== "ready"}
                className="h-11 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  {categoriesStatus === "loading" ? "読み込み中…" : "選択してください"}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
            {shelf.categoryId && categoryId.length > 0 && categoryId !== shelf.categoryId && (
              <p className="text-xs text-amber-700">
                この棚に設定されているカテゴリと異なります。保存時にエラーになる場合があります。
              </p>
            )}
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
              placeholder="下のボタンでAIに一文作成させるか、手入力してください"
              className="rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void generateDescription(name)}
              disabled={name.trim().length === 0 || isGeneratingDescription}
              className="h-10 self-start rounded-full border border-primary px-4 text-sm font-medium text-primary disabled:opacity-40"
            >
              {isGeneratingDescription ? "AIが文章作成中…" : "AI文章作成"}
            </button>
          </div>
          <button
            type="submit"
            disabled={isGeneratingDescription || categoriesStatus !== "ready" || categoryId.length === 0}
            className="h-11 rounded-full bg-primary text-sm font-bold text-on-primary disabled:opacity-60"
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
              <dd className="text-right text-on-surface">{selectedCategoryName}</dd>
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
