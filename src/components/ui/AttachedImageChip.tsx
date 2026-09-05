"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n/useTranslations";

interface AttachedImageChipProps {
  file: File;
  /** 送信前に添付を取り消せるようにする場合に指定する(検索中は呼び出し側でボタンを隠す想定) */
  onRemove?: () => void;
}

/**
 * 検索欄の中に表示する、添付画像の確認用チップ(サムネイル+ファイル名+画像サイズ)。
 * あくまで「この画像を送信ボタンで送ろうとしている」ことをユーザーに見せるための表示で、
 * 検索処理自体はファイル名を一切見ない(searchProductsWithClaudeVisionが画像の中身だけを見る)。
 */
export default function AttachedImageChip({ file, onRemove }: AttachedImageChipProps) {
  const t = useTranslations();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Blob URLの生成はReactの外(ブラウザのURLレジストリ)との同期であり、
    // 同じeffect内でcreateObjectURL/revokeObjectURLを対にする必要があるため、
    // useMemoでの生成は避けている(StrictModeの二重実行でURLが失効するバグを避けるため)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    setDimensions(null);

    const img = new window.Image();
    img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <span className="flex min-w-0 items-center gap-2">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 一時的なblob URLのサムネイル表示のため
        <img src={previewUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">image</span>
        </span>
      )}
      <span className="flex min-w-0 flex-col items-start">
        <span className="w-full truncate text-left text-sm text-on-surface">{file.name}</span>
        {dimensions && (
          <span className="text-xs text-on-surface-variant">
            {dimensions.width}×{dimensions.height}
          </span>
        )}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.imageSearch.removeAriaLabel}
          className="pointer-events-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </span>
  );
}
