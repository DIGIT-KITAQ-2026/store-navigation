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
