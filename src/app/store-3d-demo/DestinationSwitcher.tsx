"use client";

import { useId, useState } from "react";
import StoreNavigation3D from "@/components/store-3d/StoreNavigation3D";
import { DEFAULT_DESTINATION_ID, STORE_DESTINATIONS } from "@/lib/store-navigation/store-layout";

interface DestinationSwitcherProps {
  className?: string;
}

/**
 * `/store-3d-demo`専用: 商品検索と接続する前でも全8棚の案内を確認できるようにする目的地選択UI。
 * 選択状態はこのデモページ側だけが持ち、再利用可能なStoreNavigation3D本体へは
 * destinationIdをpropsとして渡すだけにする(将来Supabase検索結果から渡す値と同じ入口を使う)
 */
export default function DestinationSwitcher({ className }: DestinationSwitcherProps) {
  const [destinationId, setDestinationId] = useState<string>(DEFAULT_DESTINATION_ID);
  const selectId = useId();

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <StoreNavigation3D destinationId={destinationId} initialMode="auto-demo" className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-3">
        <label
          htmlFor={selectId}
          className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-outline-variant bg-white/95 px-3 py-2 text-xs font-semibold text-on-surface-variant shadow-sm"
        >
          <span className="hidden shrink-0 sm:inline">売り場を選択</span>
          <select
            id={selectId}
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            className="min-w-0 rounded-md border border-outline-variant bg-white px-2 py-1 text-sm font-bold text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {STORE_DESTINATIONS.map((storeDestination) => (
              <option key={storeDestination.id} value={storeDestination.id}>
                {storeDestination.label}({storeDestination.id})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
