"use client";

import { useEffect } from "react";
import { useVoiceSearch } from "@/lib/voice/useVoiceSearch";
import { useTranslations } from "@/lib/i18n/useTranslations";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  /** エラーメッセージが出たことを呼び出し側にも伝える(検索バー下に表示する等) */
  onError?: (message: string) => void;
}

/**
 * 検索欄の中に置くマイクボタン。タップで録音開始、もう一度タップで録音終了→
 * サーバー側のWhisperで文字起こしし、結果が出るとonResultを呼ぶ。
 * getUserMedia/MediaRecorderに対応していない場合は何も描画しない(段階的機能強化)。
 */
export default function VoiceSearchButton({ onResult, disabled, onError }: VoiceSearchButtonProps) {
  const t = useTranslations();
  const { isSupported, isListening, isTranscribing, error, startListening, stopListening } =
    useVoiceSearch((text) => {
      onResult(text);
    });

  useEffect(() => {
    if (error) onError?.(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  };

  const busy = isTranscribing;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-label={isListening ? t.voiceSearch.stop : t.voiceSearch.start}
      aria-pressed={isListening}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${
        isListening
          ? "bg-red-500 text-white"
          : "text-on-surface-variant hover:bg-surface-variant"
      }`}
    >
      <span
        className={`material-symbols-outlined text-[20px]${isListening || busy ? " animate-pulse" : ""}`}
      >
        {busy ? "progress_activity" : isListening ? "mic" : "mic_none"}
      </span>
    </button>
  );
}
