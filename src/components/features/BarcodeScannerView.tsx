"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useBarcodeScanner } from "@/lib/barcode/useBarcodeScanner";

interface BarcodeScannerViewProps {
  label: string;
  onScan: (code: string) => void;
}

// カメラでのバーコード/QR読み取りUI。カメラが使えない端末・権限拒否時のために
// 手入力フォールバックを必ず併設する。
export default function BarcodeScannerView({ label, onScan }: BarcodeScannerViewProps) {
  const reactId = useId().replace(/:/g, "");
  const scannerElementId = `barcode-scanner-${reactId}`;
  const [manualValue, setManualValue] = useState("");
  const hasScannedRef = useRef(false);

  const { start, stop, isScanning, error } = useBarcodeScanner(scannerElementId, {
    onDetected: (code) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      void stop();
      onScan(code.trim());
    },
  });

  useEffect(() => {
    hasScannedRef.current = false;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerElementId]);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualValue.trim();
    if (trimmed.length === 0) return;
    hasScannedRef.current = true;
    void stop();
    onScan(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-on-surface">{label}</p>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-variant">
        <div id={scannerElementId} className="aspect-video w-full [&_video]:object-cover" />
      </div>

      {!isScanning && !error && (
        <p className="text-center text-xs text-on-surface-variant">カメラを起動しています…</p>
      )}

      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          {error} 下の入力欄からバーコードを直接入力してください。
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder="バーコードを手入力"
          className="h-11 flex-1 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-bold text-on-primary"
        >
          確定
        </button>
      </form>
    </div>
  );
}
