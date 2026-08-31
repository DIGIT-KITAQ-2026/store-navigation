"use client";

import { useEffect, useRef, useState } from "react";
import UnityViewer, { type UnityViewerHandle } from "@/components/UnityViewer";
import SearchBar from "@/components/SearchBar";
import SearchSuggestions from "@/components/SearchSuggestions";
import SearchResults from "@/components/SearchResults";
import EmptyState from "@/components/EmptyState";
import GuideModal from "@/components/GuideModal";
import { guideToShelf } from "@/lib/unityBridge";
import type { SearchResultItem } from "@/types/product";

type SearchStatus = "idle" | "loading" | "empty-query" | "has-results" | "no-results";

const SEARCH_SUGGESTIONS = ["牛乳", "朝食に必要なもの", "カレーの材料", "飲み物が欲しい"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const unityViewerRef = useRef<UnityViewerHandle>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const runSearch = (rawQuery: string) => {
    abortControllerRef.current?.abort();

    if (rawQuery.trim().length === 0) {
      setStatus("empty-query");
      setResults([]);
      return;
    }

    setStatus("loading");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: rawQuery }),
      signal: abortController.signal,
    })
      .then((response) => response.json())
      .then((data: { results?: SearchResultItem[]; usedFallback?: boolean }) => {
        const found = data.results ?? [];
        setResults(found);
        setUsedFallback(data.usedFallback ?? false);
        setStatus(found.length > 0 ? "has-results" : "no-results");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setUsedFallback(false);
        setStatus("no-results");
      });
  };

  const handleSuggestionSelect = (value: string) => {
    setQuery(value);
    runSearch(value);
  };

  const handleViewLocation = (item: SearchResultItem) => {
    setSelectedItem(item);
    setGuideMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setGuideMessage(null);
  };

  const handleStartGuide = () => {
    if (selectedItem === null) return;
    const result = guideToShelf(selectedItem.product);
    setGuideMessage(result.message);
    unityViewerRef.current?.startGuideByShelfId(selectedItem.product.shelfId);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-6 w-6 shrink-0 text-blue-600 sm:h-7 sm:w-7"
            >
              <path
                fill="currentColor"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.847 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742z"
              />
              <circle cx="12" cy="10.5" r="3" fill="white" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">商品を探す</h1>
          </div>
          <p className="text-sm text-slate-600 sm:text-base">
            商品名や、作りたいもの・目的から売り場を検索できます
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[31fr_19fr] lg:items-start">
          <UnityViewer ref={unityViewerRef} />

          <div className="flex flex-col gap-6">
            <section
              aria-labelledby="search-form-heading"
              className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 id="search-form-heading" className="text-lg font-bold text-slate-900">
                商品検索
              </h2>
              <SearchBar value={query} onChange={setQuery} onSubmit={() => runSearch(query)} />
            </section>

            <section
              aria-label="検索候補"
              className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <SearchSuggestions
                suggestions={SEARCH_SUGGESTIONS}
                onSelect={handleSuggestionSelect}
              />
            </section>
          </div>
        </div>

        <section
          aria-labelledby="search-results-heading"
          className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 id="search-results-heading" className="text-lg font-bold text-slate-900">
            商品検索結果
          </h2>

          {status === "idle" && (
            <p className="text-center text-sm text-slate-500">
              商品を検索すると、こちらに候補が表示されます
            </p>
          )}

          {status === "loading" && (
            <p role="status" className="text-center text-sm font-medium text-slate-500">
              検索中です…
            </p>
          )}

          {status === "empty-query" && <EmptyState message="商品名や目的を入力してください" />}

          {(status === "no-results" || status === "has-results") && usedFallback && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
              AI検索が一時的に利用できないため、通常検索(部分一致)の結果を表示しています
            </p>
          )}

          {status === "no-results" && (
            <EmptyState message="該当する商品が見つかりませんでした。別の言葉で検索してください。" />
          )}

          {status === "has-results" && (
            <SearchResults results={results} onViewLocation={handleViewLocation} />
          )}
        </section>
      </div>

      {selectedItem !== null && (
        <GuideModal
          item={selectedItem}
          guideMessage={guideMessage}
          onStartGuide={handleStartGuide}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
