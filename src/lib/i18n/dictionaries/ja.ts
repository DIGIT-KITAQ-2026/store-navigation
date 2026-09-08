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
    actionNavigateToShelf: string;
    actionCheckShelf: string;
  };
  stock: {
    availableLabel: string;
    outOfStockLabel: string;
    unknownLabel: string;
    quantity: string;
    lastCounted: string;
  };
  navigate: {
    backToSearch: string;
    productInfoAriaLabel: string;
    title: string;
    productGuideLabel: string;
  };
  imageSearch: {
    cameraOption: string;
    galleryOption: string;
    buttonAriaLabel: string;
    removeAriaLabel: string;
  };
  camera: {
    title: string;
    close: string;
    shutter: string;
    switchCamera: string;
    starting: string;
    unsupported: string;
    permissionDenied: string;
    captureFailed: string;
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
  navigate3dRealistic: {
    viewerLoading: string;
    viewerError: string;
    reload: string;
    webglUnsupported: string;
    sceneLoading: string;
    hintMobile: string;
    hintDesktop: string;
    statusPreparing: string;
    statusSelectPrompt: string;
    statusGuiding: string;
    statusPaused: string;
    statusArrived: string;
    statusBlocked: string;
    statusReady: string;
    helperBlocked: string;
    helperNoSelection: string;
    destinationAriaLabel: string;
    destinationLabel: string;
    categoryUnselected: string;
    shelfPlaceholder: string;
    modeGroupAriaLabel: string;
    modeManual: string;
    modeAuto: string;
    lockButton: string;
    joystickAriaLabel: string;
    shelfSelectorLabel: string;
    backToEntrance: string;
    selectAnotherShelf: string;
    pauseButton: string;
    resumeButton: string;
    startButton: string;
    replayButton: string;
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
    actionNavigateToShelf: "この棚へ案内",
    actionCheckShelf: "売場を確認",
  },
  stock: {
    availableLabel: "在庫あり",
    outOfStockLabel: "在庫なし",
    unknownLabel: "在庫情報なし",
    quantity: "在庫数 {count}{unit}",
    lastCounted: "最終確認 {datetime}",
  },
  navigate: {
    backToSearch: "検索結果に戻る",
    productInfoAriaLabel: "商品情報",
    title: "3Dストアナビ",
    productGuideLabel: "商品案内",
  },
  imageSearch: {
    cameraOption: "カメラで検索",
    galleryOption: "画像を添付",
    buttonAriaLabel: "画像で検索(カメラ・画像添付)",
    removeAriaLabel: "添付した画像を取り消す",
  },
  camera: {
    title: "カメラで検索",
    close: "カメラを閉じる",
    shutter: "撮影する",
    switchCamera: "カメラの向きを切り替える",
    starting: "カメラを起動しています…",
    unsupported: "この端末・ブラウザはカメラに対応していません",
    permissionDenied: "カメラの使用が許可されていません。ブラウザの設定を確認してください",
    captureFailed: "撮影に失敗しました。もう一度お試しください",
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
  navigate3dRealistic: {
    viewerLoading: "店舗を準備しています…",
    viewerError: "店舗を表示できませんでした。通信状態とブラウザをご確認ください。",
    reload: "再読み込み",
    webglUnsupported: "このブラウザでは3D表示を利用できません。",
    sceneLoading: "店舗と経路を準備しています…",
    hintMobile: "スティックで移動・画面スワイプで見回す",
    hintDesktop: "WASD / 矢印キーで移動・マウスで見回す・Escで解除",
    statusPreparing: "店舗を準備しています",
    statusSelectPrompt: "売り場を選択してください",
    statusGuiding: "{category}売り場へ案内中",
    statusPaused: "案内を一時停止しました",
    statusArrived: "目的地に到着しました",
    statusBlocked: "現在位置から安全な経路を確認できません",
    statusReady: "案内を開始できます",
    helperBlocked: "「入口へ戻る」を選んで、案内をやり直してください。",
    helperNoSelection: "場所情報を確認できません。売り場を選択するか、商品検索へ戻ってください。",
    destinationAriaLabel: "現在の目的地",
    destinationLabel: "目的地",
    categoryUnselected: "未選択",
    shelfPlaceholder: "売り場を選択",
    modeGroupAriaLabel: "操作モード",
    modeManual: "一人称で歩く",
    modeAuto: "自動案内",
    lockButton: "視点操作を開始",
    joystickAriaLabel: "店舗内の視点を移動",
    shelfSelectorLabel: "売り場を選択",
    backToEntrance: "入口へ戻る",
    selectAnotherShelf: "別の売り場を選ぶ",
    pauseButton: "一時停止",
    resumeButton: "再開",
    startButton: "案内を開始",
    replayButton: "最初から再生",
  },
};

export default ja;
