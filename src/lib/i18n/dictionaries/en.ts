import type { Dictionary } from "./ja";

const en: Dictionary = {
  common: {
    back: "Back",
  },
  storeHeader: {
    menuOpen: "Open menu",
    menuClose: "Close menu",
    adminLogin: "Admin login",
    language: "Language",
  },
  hero: {
    tagline: "Never get lost in the aisles again.",
    description: "Search for a product and we'll\nguide you there in 3D.",
    searchButton: "Find products",
    openCard: "Find products (open search card)",
    closeCard: "Close search card",
    searchPlaceholder: "Enter a product name or what you need",
    imageSearchHint: "Press send to search by image",
    voiceLoadProgress: "Preparing the speech recognition model… (first time only, {percent}%)",
    headingLine1: "Shop with",
    headingLine2: "confidence",
    subDescription: "Enter a product name or goal and we'll guide you there in 3D",
    aiSearch: "AI search",
    suggestion1: "Milk",
    suggestion2: "Breakfast essentials",
    suggestion3: "Curry ingredients",
    suggestion4: "Something to drink",
  },
  search: {
    emptyQuery: "Enter a product name or purpose",
    loading: "Searching…",
    fallbackBanner: "AI search is temporarily unavailable, showing regular (partial match) search results instead",
    noResults: "No matching products found. Try a different search term.",
    resultsHeading: "Results for “{query}”",
    resultsHeadingEmpty: "Search results",
    resultsListAriaLabel: "Search results list",
    heroImageAlt: "Watercolor illustration of a supermarket",
    searchAgainPlaceholder: "Anything else you're looking for?",
    submitAriaLabel: "Search",
    suggestionAriaLabel: "Search for “{suggestion}”",
  },
  productCard: {
    placeAriaLabel: "View location of {name}",
    shelf: "Aisle {number}",
    viewLocation: "View location",
  },
  guide: {
    shelfId: "Shelf ID: {shelfId}",
    locationSentence: "{name} is on shelf {shelfNumber} in the {category} section",
    pendingLocation: "Location information for this product is not yet available",
    guideShowing: "Showing 3D guide",
    guideStart: "Start 3D guide",
    guideMessage: "Showing directions to {label} on the 3D store map",
  },
  navigate: {
    backToSearch: "Back to results",
  },
  imageSearch: {
    cameraOption: "Search with camera",
    galleryOption: "Attach an image",
    buttonAriaLabel: "Search by image (camera or attachment)",
    removeAriaLabel: "Remove attached image",
  },
  voiceSearch: {
    stop: "Stop voice input",
    start: "Search by voice",
  },
};

export default en;
