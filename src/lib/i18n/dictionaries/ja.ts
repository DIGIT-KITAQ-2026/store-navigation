// 消費者向け画面(StoreHeader/StoreEntranceHero/検索/商品案内)の静的UI文言。
// このファイルが翻訳キーの正本(source of truth)。他ロケールのファイルは
// 同じキー構成(Dictionary型)を満たす必要がある。
export interface Dictionary {
  common: {
    back: string;
  };
  storeHeader: {
    menuOpen: string;
    menuClose: string;
    adminLogin: string;
    language: string;
  };
  hero: {
    tagline: string;
    description: string;
    searchButton: string;
    openCard: string;
    closeCard: string;
    searchPlaceholder: string;
    imageSearchHint: string;
    voiceLoadProgress: string;
    headingLine1: string;
    headingLine2: string;
    subDescription: string;
    aiSearch: string;
    suggestion1: string;
    suggestion2: string;
    suggestion3: string;
    suggestion4: string;
  };
  search: {
    emptyQuery: string;
    loading: string;
    fallbackBanner: string;
    noResults: string;
    resultsHeading: string;
    resultsHeadingEmpty: string;
    resultsListAriaLabel: string;
    heroImageAlt: string;
    searchAgainPlaceholder: string;
    submitAriaLabel: string;
    suggestionAriaLabel: string;
  };
  productCard: {
    placeAriaLabel: string;
    shelf: string;
    viewLocation: string;
  };
  guide: {
    shelfId: string;
    locationSentence: string;
    pendingLocation: string;
    guideShowing: string;
    guideStart: string;
    guideMessage: string;
  };
  navigate: {
    backToSearch: string;
  };
  imageSearch: {
    cameraOption: string;
    galleryOption: string;
    buttonAriaLabel: string;
    removeAriaLabel: string;
  };
  voiceSearch: {
    stop: string;
    start: string;
  };
  navigate3d: {
    destinationLabel: string;
    modeFirstPerson: string;
    modeAutoDemo: string;
    demoStatusIdle: string;
    demoStatusPlaying: string;
    demoStatusPaused: string;
    demoStatusArrived: string;
    demoStatusLabel: string;
    pointerLockPrompt: string;
    pointerLockHint: string;
    pointerLockUnsupported: string;
    pointerLockedHint: string;
    mobileMoveHint: string;
    mobileLookHint: string;
    restartAriaLabel: string;
    restartTitle: string;
    pause: string;
    play: string;
    playAgain: string;
    joystickAriaLabel: string;
    loading: string;
    unsupportedBrowser: string;
    unsupportedMessage: string;
    errorMessage: string;
    entranceLabel: string;
  };
}

const ja: Dictionary = {
  common: {
    back: "戻る",
  },
  storeHeader: {
    menuOpen: "メニューを開く",
    menuClose: "メニューを閉じる",
    adminLogin: "管理者ログイン",
    language: "言語",
  },
  hero: {
    tagline: "もう、売り場で迷わない。",
    description: "商品を検索すると、\n売り場まで3Dでご案内します。",
    searchButton: "商品を探す",
    openCard: "商品を探す(検索カードを開く)",
    closeCard: "検索カードを閉じる",
    searchPlaceholder: "商品名や欲しいものを入力",
    imageSearchHint: "送信ボタンを押すと画像で検索します",
    voiceLoadProgress: "音声認識モデルを準備中です…(初回のみ、{percent}%)",
    headingLine1: "迷わない",
    headingLine2: "お買い物へ",
    subDescription: "商品名や目的を入力すると、売り場まで3Dでご案内します",
    aiSearch: "AI検索",
    suggestion1: "牛乳",
    suggestion2: "朝食に必要なもの",
    suggestion3: "カレーの材料",
    suggestion4: "飲み物が欲しい",
  },
  search: {
    emptyQuery: "商品名や目的を入力してください",
    loading: "検索中です…",
    fallbackBanner: "AI検索が一時的に利用できないため、通常検索(部分一致)の結果を表示しています",
    noResults: "該当する商品が見つかりませんでした。別の言葉で検索してください。",
    resultsHeading: "「{query}」の検索結果",
    resultsHeadingEmpty: "検索結果",
    resultsListAriaLabel: "検索結果一覧",
    heroImageAlt: "水彩で描かれたスーパーマーケット",
    searchAgainPlaceholder: "他に探したいものはありますか？",
    submitAriaLabel: "検索する",
    suggestionAriaLabel: "「{suggestion}」で検索する",
  },
  productCard: {
    placeAriaLabel: "{name}の場所を見る",
    shelf: "棚 {number}",
    viewLocation: "場所を見る",
  },
  guide: {
    shelfId: "棚ID: {shelfId}",
    locationSentence: "{name}は{category}コーナーの棚{shelfNumber}にあります",
    pendingLocation: "この商品の売り場情報は現在準備中です",
    guideShowing: "3D案内を表示中",
    guideStart: "3D案内を開始",
    guideMessage: "3D店内マップで{label}への案内を表示します",
  },
  navigate: {
    backToSearch: "検索結果に戻る",
  },
  imageSearch: {
    cameraOption: "カメラで検索",
    galleryOption: "画像を添付",
    buttonAriaLabel: "画像で検索(カメラ・画像添付)",
    removeAriaLabel: "添付した画像を取り消す",
  },
  voiceSearch: {
    stop: "音声入力を停止",
    start: "音声で検索",
  },
  navigate3d: {
    destinationLabel: "目的地",
    modeFirstPerson: "一人称で歩く",
    modeAutoDemo: "自動デモ",
    demoStatusIdle: "開始前",
    demoStatusPlaying: "再生中",
    demoStatusPaused: "一時停止",
    demoStatusArrived: "到着",
    demoStatusLabel: "デモ: {status}",
    pointerLockPrompt: "クリックして視点操作を開始",
    pointerLockHint: "WASDまたは矢印キーで移動、マウスで視点操作、Escキーで終了します。",
    pointerLockUnsupported: "この環境では第一人称のマウス操作を利用できません。自動デモをご利用ください。",
    pointerLockedHint: "Escキーで視点操作を終了",
    mobileMoveHint: "左のスティックで移動",
    mobileLookHint: "画面をスワイプして見回す",
    restartAriaLabel: "最初から再スタート",
    restartTitle: "最初から",
    pause: "一時停止",
    play: "再生",
    playAgain: "もう一度再生",
    joystickAriaLabel: "移動スティック",
    loading: "3D店内を読み込んでいます…",
    unsupportedBrowser: "対応ブラウザ(最新のChrome・Edge・Safariなど)でアクセスすると3D表示をご利用いただけます。",
    unsupportedMessage: "お使いの環境では3D表示をご利用いただけません。",
    errorMessage: "3D表示の読み込み中に問題が発生しました。",
    entranceLabel: "入口",
  },
};

export default ja;
