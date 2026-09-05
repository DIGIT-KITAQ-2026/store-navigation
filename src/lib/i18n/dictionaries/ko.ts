import type { Dictionary } from "./ja";

const ko: Dictionary = {
  common: {
    back: "뒤로",
  },
  storeHeader: {
    menuOpen: "메뉴 열기",
    menuClose: "메뉴 닫기",
    adminLogin: "관리자 로그인",
    language: "언어",
  },
  hero: {
    tagline: "이제 매장에서 헤매지 마세요.",
    description: "상품을 검색하면\n매장까지 3D로 안내해 드립니다.",
    searchButton: "상품 찾기",
    openCard: "상품 찾기(검색 카드 열기)",
    closeCard: "검색 카드 닫기",
    searchPlaceholder: "상품명이나 찾으시는 것을 입력하세요",
    imageSearchHint: "전송 버튼을 누르면 이미지로 검색합니다",
    voiceLoadProgress: "음성 인식 모델을 준비하고 있습니다…(최초 1회만, {percent}%)",
    headingLine1: "헤매지 않는",
    headingLine2: "쇼핑",
    subDescription: "상품명이나 목적을 입력하면 매장까지 3D로 안내해 드립니다",
    aiSearch: "AI 검색",
    suggestion1: "우유",
    suggestion2: "아침 식사 재료",
    suggestion3: "카레 재료",
    suggestion4: "마실 것",
  },
  search: {
    emptyQuery: "상품명이나 목적을 입력해 주세요",
    loading: "검색 중입니다…",
    fallbackBanner: "AI 검색을 일시적으로 사용할 수 없어 일반(부분 일치) 검색 결과를 표시합니다",
    noResults: "해당하는 상품을 찾을 수 없습니다. 다른 검색어로 시도해 주세요.",
    resultsHeading: "'{query}' 검색 결과",
    resultsHeadingEmpty: "검색 결과",
    resultsListAriaLabel: "검색 결과 목록",
    heroImageAlt: "수채화로 그린 슈퍼마켓",
    searchAgainPlaceholder: "또 찾으시는 것이 있나요?",
    submitAriaLabel: "검색하기",
    suggestionAriaLabel: "'{suggestion}' 검색하기",
  },
  productCard: {
    placeAriaLabel: "{name}의 위치 보기",
    shelf: "매대 {number}",
    viewLocation: "위치 보기",
  },
  guide: {
    shelfId: "매대 ID: {shelfId}",
    locationSentence: "{name}은(는) {category} 코너의 {shelfNumber}번 매대에 있습니다",
    pendingLocation: "이 상품의 매장 위치 정보는 현재 준비 중입니다",
    guideShowing: "3D 안내 표시 중",
    guideStart: "3D 안내 시작",
    guideMessage: "3D 매장 지도에서 {label}까지의 안내를 표시합니다",
  },
  navigate: {
    backToSearch: "검색 결과로 돌아가기",
  },
  imageSearch: {
    cameraOption: "카메라로 검색",
    galleryOption: "이미지 첨부",
    buttonAriaLabel: "이미지로 검색(카메라 또는 이미지 첨부)",
    removeAriaLabel: "첨부한 이미지 취소",
  },
  voiceSearch: {
    stop: "음성 입력 중지",
    start: "음성으로 검색",
  },
};

export default ko;
