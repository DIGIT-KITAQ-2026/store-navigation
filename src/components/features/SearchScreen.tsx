"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/components/ui/SearchBar";
import EmptyState from "@/components/ui/EmptyState";
import SearchResults from "@/components/features/SearchResults";
import { readCachedResults, writeCachedResults } from "@/lib/searchResultsCache";
import { takePendingImageSearchFile } from "@/lib/pendingImageSearch";
import { useImageSearch } from "@/lib/useImageSearch";
import type { SearchResultItem } from "@/types/product";

type SearchStatus = "idle" | "loading" | "empty-query" | "has-results" | "no-results";

interface SearchScreenProps {
  initialQuery: string;
}

export default function SearchScreen({ initialQuery }: SearchScreenProps) {
  const router = useRouter();
  // サーバーとクライアントの初回レンダーを一致させるため、ここではsessionStorage/pending画像を参照しない。
  // 復元はマウント後のuseEffect内でのみ行う。
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<SearchStatus>(() =>
    initialQuery.trim().length === 0 ? "empty-query" : "loading"
  );
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { error: imageSearchError, search: searchByImage } = useImageSearch();

  // fetch実行のみを行い、setStateは非同期コールバック内でのみ呼ぶ(エフェクト内からの直接呼び出しを許容するため)
  const executeSearch = (rawQuery: string) => {
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
        const usedFallbackResult = data.usedFallback ?? false;
        setResults(found);
        setUsedFallback(usedFallbackResult);
        setStatus(found.length > 0 ? "has-results" : "no-results");
        writeCachedResults(rawQuery, { results: found, usedFallback: usedFallbackResult });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setUsedFallback(false);
        setStatus("no-results");
      });
  };

  const runSearch = (rawQuery: string) => {
    abortControllerRef.current?.abort();

    if (rawQuery.trim().length === 0) {
      setStatus("empty-query");
      setResults([]);
      return;
    }

    setStatus("loading");
    executeSearch(rawQuery);
  };

  // 画像検索の実行。ホーム画面からの遷移時(マウント時)・この画面上での再送信の両方から呼ぶ
  const executeImageSearch = async (file: File) => {
    setStatus("loading");
    const outcome = await searchByImage(file);

    if (!outcome) {
      setAttachedFile(null);
      setResults([]);
      setUsedFallback(false);
      setStatus("no-results");
      return;
    }

    setResults(outcome.results);
    setUsedFallback(outcome.usedFallback);
    setStatus(outcome.results.length > 0 ? "has-results" : "no-results");
    writeCachedResults(query, outcome);
  };

  useEffect(() => {
    const pendingFile = takePendingImageSearchFile();

    if (pendingFile) {
      // ホーム画面から画像検索として遷移してきた場合。この画面側で改めて検索を実行する
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttachedFile(pendingFile);
      void executeImageSearch(pendingFile);
    } else if (initialQuery.trim().length > 0) {
      const cached = readCachedResults(initialQuery);
      if (cached) {
        // ハイドレーション不一致を避けるため、sessionStorageの復元はマウント後のここでのみ行う
        setResults(cached.results);
        setUsedFallback(cached.usedFallback);
        setStatus(cached.results.length > 0 ? "has-results" : "no-results");
      } else {
        executeSearch(initialQuery);
      }
    }

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (attachedFile) {
      void executeImageSearch(attachedFile);
      return;
    }
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
    runSearch(query);
  };

  const handleSelectImage = (file: File) => {
    setAttachedFile(file);
    setQuery("");
  };

  const handleRemoveAttachedImage = () => setAttachedFile(null);

  const isImageSearching = status === "loading" && attachedFile !== null;

  return (
    <div className="min-h-full bg-surface pb-28 md:pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        {/* デスクトップのみ: 上部インライン検索バー */}
        <div className="hidden max-w-2xl md:block">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            attachedFile={attachedFile}
            onSelectImage={handleSelectImage}
            onRemoveAttachedImage={handleRemoveAttachedImage}
            isImageSearching={isImageSearching}
          />
        </div>

        <div className="animate-fade-in-up flex items-center gap-3">
          <Link
            href="/"
            aria-label="戻る"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <h1 className="text-xl font-bold text-on-surface md:text-2xl">
            {query.trim().length > 0 ? (
              <>
                <span className="text-primary">&ldquo;{query}&rdquo;</span> の検索結果
              </>
            ) : (
              "検索結果"
            )}
          </h1>
        </div>

        {status === "loading" && (
          <div className="animate-fade-in-up flex flex-col items-center gap-3">
            <Image
              src="/images/design-reference/store-search-empty.png"
              alt="水彩で描かれたスーパーマーケット"
              width={800}
              height={400}
              className="h-auto w-[176px] max-w-full object-contain opacity-90 md:w-[220px]"
            />
            <p role="status" className="text-center text-sm font-medium text-on-surface-variant">
              検索中です…
            </p>
          </div>
        )}

        {status === "empty-query" && <EmptyState message="商品名や目的を入力してください" />}

        {(status === "no-results" || status === "has-results") && usedFallback && (
          <p className="animate-fade-in-up rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
            AI検索が一時的に利用できないため、通常検索(部分一致)の結果を表示しています
          </p>
        )}

        {status === "no-results" && (
          <EmptyState
            message={
              imageSearchError ?? "該当する商品が見つかりませんでした。別の言葉で検索してください。"
            }
            showImage
          />
        )}

        {status === "has-results" && <SearchResults results={results} />}
      </div>

      {/* モバイルのみ: 画面下部固定の再検索バー */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-surface via-surface to-transparent px-4 py-3 md:hidden">
        <div className="mx-auto max-w-2xl">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            imageMenuPosition="up"
            attachedFile={attachedFile}
            onSelectImage={handleSelectImage}
            onRemoveAttachedImage={handleRemoveAttachedImage}
            isImageSearching={isImageSearching}
          />
        </div>
      </div>
    </div>
  );
}
