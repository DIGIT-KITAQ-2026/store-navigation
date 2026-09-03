"use client";

/**
 * カメラ映像の`<video>`が再生開始(play())の完了前にDOMから外れると、ブラウザが
 * 「AbortError: The play() request was interrupted because the media was removed from
 * the document.」を投げる。html5-qrcode内部のplay()が発生源で、こちらからは
 * そのPromiseに触れないため、window側でこのエラーだけを捕捉して無視する。
 *
 * カメラを閉じる瞬間の競合であり、閉じるという目的自体は達成されているため実害はない。
 * 対象を「AbortError かつ play() 関連」に限定し、他のエラーは通常どおり表示させる。
 *
 * スキャナが複数同時に存在し得る(棚用・商品用)ため、参照カウントで多重登録を防ぐ。
 */

let activeCount = 0;
let listenerAttached = false;

function isMediaPlayAbortError(value: unknown): boolean {
  const message =
    value instanceof Error ? value.message : typeof value === "string" ? value : "";
  return message.includes("play()") && message.includes("interrupted");
}

function handleWindowError(event: ErrorEvent) {
  if (isMediaPlayAbortError(event.error) || isMediaPlayAbortError(event.message)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  if (isMediaPlayAbortError(event.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

/** 登録を1つ増やす。戻り値を呼ぶと解除される(useEffectのcleanupで使う想定) */
export function suppressMediaAbortError(): () => void {
  if (typeof window === "undefined") return () => {};

  activeCount += 1;
  if (!listenerAttached) {
    // captureフェーズで登録することで、Next.jsの開発用オーバーレイなど
    // bubbleフェーズで待ち受けている他のハンドラより先に止める
    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);
    listenerAttached = true;
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount -= 1;
    if (activeCount <= 0 && listenerAttached) {
      activeCount = 0;
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
      listenerAttached = false;
    }
  };
}
