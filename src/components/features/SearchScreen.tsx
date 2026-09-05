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
import { useTranslations } from "@/lib/i18n/useTranslations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { SearchResultItem } from "@/types/product";

type SearchStatus = "idle" | "loading" | "empty-query" | "has-results" | "no-results";

interface SearchScreenProps {
  initialQuery: string;
}

export default function SearchScreen({ initialQuery }: SearchScreenProps) {
  const router = useRouter();
  const t = useTranslations();
  const { locale } = useLocale();
  // サーバーとクライアントの初回レンダーを一致させるため、ここではsessionStorage/pending画像を参照しない。
  // 復元はマウント後のuseEffect内でのみ行う。
  const [query, setQuery] = useState(initialQuery);
  // 見出し(「〇〇」の検索結果)に表示する検索語。検索バーの入力中の文字にリアルタイムで
  // 連動させず、実際に検索が実行された(送信ボタン・音声入力での確定)タイミングでのみ更新する
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
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
        // フォールバック(AI検索失敗)の結果はキャッシュしない。キャッシュすると、
        // 一時的な失敗がその検索語に対して固着し、再訪問時もAI検索が再試行されなくなるため。
        if (!usedFallbackResult) {
          writeCachedResults(rawQuery, locale, { results: found, usedFallback: usedFallbackResult });
        }
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
    if (!outcome.usedFallback) {
      writeCachedResults(query, locale, outcome);
    }
  };

  useEffect(() => {
    const pendingFile = takePendingImageSearchFile();

    if (pendingFile) {
      // ホーム画面から画像検索として遷移してきた場合。この画面側で改めて検索を実行する
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttachedFile(pendingFile);
      void executeImageSearch(pendingFile);
    } else if (initialQuery.trim().length > 0) {
      const cached = readCachedResults(initialQuery, locale);
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

  // 言語切り替え時、表示中の検索結果(商品説明・一致理由など翻訳対象のフィールドを含む)を
  // 新しいロケールで再取得する。マウント時の初回実行は上のeffectに任せるためスキップする
  const isFirstLocaleRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstLocaleRenderRef.current) {
      isFirstLocaleRenderRef.current = false;
      return;
    }

    abortControllerRef.current?.abort();

    if (attachedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void executeImageSearch(attachedFile);
      return;
    }

    if (submittedQuery.trim().length === 0) return;

    const cached = readCachedResults(submittedQuery, locale);
    if (cached) {
      setResults(cached.results);
      setUsedFallback(cached.usedFallback);
      setStatus(cached.results.length > 0 ? "has-results" : "no-results");
    } else {
      setStatus("loading");
      executeSearch(submittedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const handleSubmit = () => {
    if (attachedFile) {
      void executeImageSearch(attachedFile);
      return;
    }
    setSubmittedQuery(query);
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
    runSearch(query);
  };

  const handleSelectImage = (file: File) => {
    setAttachedFile(file);
    setQuery("");
    setSubmittedQuery("");
  };

  const handleRemoveAttachedImage = () => setAttachedFile(null);

  const handleVoiceResult = (text: string) => {
    setAttachedFile(null);
    setQuery(text);
    setSubmittedQuery(text);
    router.replace(`/search?q=${encodeURIComponent(text)}`, { scroll: false });
    runSearch(text);
  };

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
            onVoiceResult={handleVoiceResult}
            isImageSearching={isImageSearching}
          />
        </div>

        <div className="animate-fade-in-up flex items-center gap-3">
          <Link
            href="/"
            aria-label={t.common.back}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <h1 className="text-xl font-bold text-on-surface md:text-2xl">
            {submittedQuery.trim().length > 0 ? (
              (() => {
                const [prefix, suffix] = t.search.resultsHeading.split("{query}");
                return (
                  <>
                    {prefix}
                    <span className="text-primary">{submittedQuery}</span>
                    {suffix}
                  </>
                );
              })()
            ) : (
              t.search.resultsHeadingEmpty
            )}
          </h1>
        </div>

        {status === "loading" && (
          <div className="animate-fade-in-up flex flex-col items-center gap-3">
            <Image
              src="/images/design-reference/store-search-empty.png"
              alt={t.search.heroImageAlt}
              width={800}
              height={400}
              className="h-auto w-[176px] max-w-full object-contain opacity-90 md:w-[220px]"
            />
            <p role="status" className="text-center text-sm font-medium text-on-surface-variant">
              {t.search.loading}
            </p>
          </div>
        )}

        {status === "empty-query" && <EmptyState message={t.search.emptyQuery} />}

        {(status === "no-results" || status === "has-results") && usedFallback && (
          <p className="animate-fade-in-up rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
            {t.search.fallbackBanner}
          </p>
        )}

        {status === "no-results" && (
          <EmptyState message={imageSearchError ?? t.search.noResults} showImage />
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
            onVoiceResult={handleVoiceResult}
            isImageSearching={isImageSearching}
          />
        </div>
      </div>
    </div>
  );
}
