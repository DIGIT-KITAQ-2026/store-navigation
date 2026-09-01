"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

interface ImageSearchButtonProps {
  onSelectFile: (file: File) => void;
  isSearching: boolean;
  /**
   * メニューを開く向き。検索欄の下に十分な余白がある場合は"down"(既定)、
   * 画面下端に固定された検索欄など下に余白が無い場合は"up"を指定する。
   */
  menuPosition?: "up" | "down";
}

/**
 * 検索欄の中に置く「+」ボタン。押すと「カメラで検索」「画像を添付」の2択メニューが開く。
 * 実際の検索実行(fetch・画面遷移)は行わず、選ばれたファイルをonSelectFileで呼び出し元に渡すだけ。
 * 検索欄の角丸枠の左端(left-2)に収まるサイズ(h-9 w-9)を前提に、呼び出し側は
 * 拡大鏡アイコンをleft-12・inputをpl-20程度にずらして使う。
 */
export default function ImageSearchButton({
  onSelectFile,
  isSearching,
  menuPosition = "down",
}: ImageSearchButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = () => setIsMenuOpen((value) => !value);

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setIsMenuOpen(false);
    if (file) onSelectFile(file);
  };

  // メニューの外側クリック・Escapeで閉じる
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div ref={menuRef} className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
      {isMenuOpen && (
        <div
          role="menu"
          className={`absolute left-0 z-30 flex flex-col gap-1 rounded-2xl border border-outline-variant bg-surface p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${
            menuPosition === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">photo_camera</span>
            カメラで検索
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">image</span>
            画像を添付
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={toggleMenu}
        disabled={isSearching}
        aria-label="画像で検索(カメラ・画像添付)"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      >
        <span className={`material-symbols-outlined text-[20px]${isSearching ? " animate-spin" : ""}`}>
          {isSearching ? "progress_activity" : "add"}
        </span>
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
        suppressHydrationWarning
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
        suppressHydrationWarning
      />
    </div>
  );
}
