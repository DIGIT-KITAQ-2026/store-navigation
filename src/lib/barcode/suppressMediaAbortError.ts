"use client";

/**
 * カメラ映像の`<video>`が再生開始(play())の完了前にDOMから外れると、ブラウザが
 * 「AbortError: The play() request was interrupted because the media was removed from
 * the document.」を投げる。html5-qrcodeが内部で呼ぶplay()が発生源で、ライブラリは
 * 戻り値のPromiseを捨てているため、こちらからcatchを付ける先が無い。
 * 結果として「未処理のPromise拒否」になり、開発時はNext.jsのエラーオーバーレイが出る。
 *
 * カメラを閉じる瞬間の競合であり、閉じるという目的自体は達成されているため実害はない。
 *
 * 以前はwindowの`error`/`unhandledrejection`を捕まえてpreventDefaultする方式にしていたが、
 * これは効かない。Next.jsのオーバーレイは起動時にwindowへリスナーを登録しており
 * (`next/dist/next-devtools/userspace/app/errors/use-error-handler.js`)、
 * windowが対象のイベントは登録順に発火するため、コンポーネントのマウント時に登録する
 * こちらのハンドラは必ず後になる。さらにNext側は`defaultPrevented`を見ていないため、
 * preventDefaultもstopImmediatePropagationも間に合わない。
 *
 * そこでカメラを使っている間だけ`play()`を包み、返ってきたPromiseにこちらでcatchを
 * 付ける。拒否が「処理済み」になるので、そもそもイベントが発生しなくなる。
 * 対象は「play()の中断」に限定し、それ以外の拒否はそのまま投げ直す。
 *
 * カメラが複数同時に存在し得る(棚用・商品用・画像検索用)ため、参照カウントで多重適用を防ぐ。
 */

let activeCount = 0;
let originalPlay: typeof HTMLMediaElement.prototype.play | null = null;

function isMediaPlayAbortError(value: unknown): boolean {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : "";
  return message.includes("play()") && message.includes("interrupted");
}

function patchedPlay(this: HTMLMediaElement): Promise<void> {
  const play = originalPlay;
  if (!play) return Promise.resolve();

  return play.call(this).catch((error: unknown) => {
    if (isMediaPlayAbortError(error)) return;
    throw error;
  });
}

/** 適用を1つ増やす。戻り値を呼ぶと解除される(useEffectのcleanupで使う想定) */
export function suppressMediaAbortError(): () => void {
  if (typeof window === "undefined" || typeof HTMLMediaElement === "undefined") {
    return () => {};
  }

  activeCount += 1;
  if (!originalPlay) {
    originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = patchedPlay;
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount -= 1;
    if (activeCount > 0 || !originalPlay) return;

    activeCount = 0;
    // 別の誰かがさらに差し替えている場合は戻さない(その差し替えを壊さないため)
    if (HTMLMediaElement.prototype.play === patchedPlay) {
      HTMLMediaElement.prototype.play = originalPlay;
    }
    originalPlay = null;
  };
}
