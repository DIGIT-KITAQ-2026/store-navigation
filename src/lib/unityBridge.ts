import type { Product } from "@/types/product";

/** iframe内のUnity WebGLへ送るpostMessageのtype識別子 */
export const START_GUIDE_MESSAGE_TYPE = "SMART_STORE_START_GUIDE" as const;

export interface StartGuideMessage {
  type: typeof START_GUIDE_MESSAGE_TYPE;
  shelfId: string;
}

/**
 * iframe内のUnity WebGL（web/public/unity/index.html）へ、
 * postMessageで棚IDを送信する。
 * targetWindowが存在しない場合（iframe未マウント・未ロード）は何もしない。
 * targetOriginにはwindow.location.originを使用し、"*"は使用しない。
 */
export function postStartGuideMessage(targetWindow: Window | null | undefined, shelfId: string): void {
  if (!targetWindow) return;

  const message: StartGuideMessage = {
    type: START_GUIDE_MESSAGE_TYPE,
    shelfId,
  };

  targetWindow.postMessage(message, window.location.origin);
}

export interface GuideToShelfPayload {
  action: "guideToShelf";
  productId: string;
  productName: string;
  shelfId: string;
}

export interface GuideToShelfResult {
  success: boolean;
  message: string;
  payload: GuideToShelfPayload;
}

/**
 * Unity WebGLへの3D案内リクエストを表すモック関数。
 *
 * 将来的にUnity WebGLを埋め込んだ際は、このConsole出力の代わりに
 * 以下のようなunityInstance呼び出しへ置き換える想定。
 *
 *   unityInstance.SendMessage(
 *     "StoreNaviController",
 *     "StartGuideByShelfId",
 *     shelfId
 *   )
 */
export function guideToShelf(product: Product): GuideToShelfResult {
  const payload: GuideToShelfPayload = {
    action: "guideToShelf",
    productId: product.id,
    productName: product.name,
    shelfId: product.shelfId,
  };

  console.log(payload);

  return {
    success: true,
    message: `3D店舗で${product.shelfId}への案内を開始します`,
    payload,
  };
}
