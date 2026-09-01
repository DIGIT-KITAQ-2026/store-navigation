"use client";

import { useState } from "react";
import BarcodeScannerView from "@/components/features/BarcodeScannerView";
import { parseShelfBarcode } from "@/lib/barcode/shelfBarcode";

// Step1(棚バーコードのスキャン)のみ実装。商品バーコード入力〜保存は後続PRで追加する。
export default function AdminProductsNewPage() {
  const [shelfBarcode, setShelfBarcode] = useState<string | null>(null);
  const parsed = shelfBarcode !== null ? parseShelfBarcode(shelfBarcode) : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-bold text-on-surface">商品登録</h1>

      {shelfBarcode === null ? (
        <BarcodeScannerView label="棚バーコードをスキャンしてください" onScan={setShelfBarcode} />
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          {parsed ? (
            <>
              <p className="text-sm text-on-surface-variant">読み取った棚番号</p>
              <p className="text-lg font-bold text-on-surface">
                {parsed.locationCode}({parsed.zoneName}) ・ {parsed.branch}/03
              </p>
              <p className="text-xs text-on-surface-variant">バーコード: {shelfBarcode}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-on-surface-variant">読み取ったバーコード</p>
              <p className="text-lg font-bold text-on-surface">{shelfBarcode}</p>
              <p className="text-xs text-amber-700">
                棚バーコードの形式(4909…)と一致しませんでした。棚バーコードを読み取ってください。
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setShelfBarcode(null)}
            className="self-start text-sm font-medium text-primary"
          >
            もう一度スキャンする
          </button>
        </div>
      )}
    </div>
  );
}
