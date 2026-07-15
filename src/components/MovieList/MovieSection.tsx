import { useEffect, useMemo, useState, type RefCallback } from "react";
import { Loader2, Search, Sparkles, Star } from "lucide-react";
import { useInView } from "react-intersection-observer";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/useAppStore";
import type { Bookmark, Movie } from "../../types";
import MovieCard from "./MovieCard";

// ────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────

type MovieSectionMode = "search" | "review" | "top-rated" | "upcoming";
type MovieSort = "latest" | "rating" | "title";

interface TmdbPageResult {
  page: number;
  results: Movie[];
  total_pages: number;
}

// ────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────

const sortMovies = (items: Movie[], sortOrder: MovieSort): Movie[] => {
  const sorted = [...items];
  if (sortOrder === "rating")
    return sorted.sort((a, b) => b.vote_average - a.vote_average);
  if (sortOrder === "title")
    return sorted.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  return sorted.sort((a, b) =>
    (b.release_date || "").localeCompare(a.release_date || ""),
  );
};

// ────────────────────────────────────────────
// fetch 함수들
// ────────────────────────────────────────────

const fetchMoviePage = async (
  pageParam: number,
  mode: MovieSectionMode,
  query: string,
): Promise<TmdbPageResult> => {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
  const base = "https://api.themoviedb.org/3";

  let url: string;

  if (mode === "search" && query.trim()) {
    url = `${base}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ko&page=${pageParam}`;
  } else {
    const params = new URLSearchParams({
      api_key: apiKey,
      language: "ko",
      page: String(pageParam),
    });

    if (mode === "top-rated") {
      params.set("sort_by", "vote_average.desc");
      params.set("vote_count.gte", "100");
    } else if (mode === "upcoming") {
      const today = new Date().toISOString().slice(0, 10);
      params.set("sort_by", "primary_release_date.asc");
      params.set("primary_release_date.gte", today);
    } else {
      params.set("sort_by", "release_date.desc"); // 기본: 최신순
    }

    url = `${base}/discover/movie?${params.toString()}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("영화 목록을 불러오지 못했습니다.");
  return res.json();
};

const fetchReviewMovies = async (): Promise<Movie[]> => {
  const { data, error } = await supabase.from("comments").select("movie_id");
  if (error || !data) return [];

  const uniqueIds = Array.from(
    new Set(
      data
        .map((item) => item.movie_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  );
  if (uniqueIds.length === 0) return [];

  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string;
  const results = await Promise.all(
    uniqueIds.map((id) =>
      fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=ko`,
      ).then((r) => r.json()),
    ),
  );
  return (results as Movie[]).filter((item) => item && item.id);
};

const fetchBookmarks = async (userId: string): Promise<Bookmark[]> => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Bookmark[]) ?? [];
};

// ────────────────────────────────────────────
// useMovieSectionState (커스텀 훅)
// ────────────────────────────────────────────

export const useMovieSectionState = () => {
  const [mode, setMode] = useState<MovieSectionMode>("search");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<MovieSort>("latest");
  const { ref, inView } = useInView({ threshold: 0.2 });
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  // ✅ useInfiniteQuery - 영화 목록 (검색 / 일반 / 최고평점 / 예정)
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: moviesLoading,
  } = useInfiniteQuery<TmdbPageResult>({
    queryKey: ["movies", mode, searchQuery],
    queryFn: ({ pageParam }) =>
      fetchMoviePage(pageParam as number, mode, searchQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: mode !== "review",
  });

  // ✅ useQuery - 리뷰 영화 목록
  const { data: reviewMoviesRaw = [], isLoading: reviewLoading } = useQuery<
    Movie[]
  >({
    queryKey: ["reviewMovies"],
    queryFn: fetchReviewMovies,
    enabled: mode === "review",
  });

  const loading =
    mode === "review" ? reviewLoading : moviesLoading || isFetchingNextPage;

  // 무한스크롤 - 하단 감지 시 다음 페이지 요청
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && mode !== "review") {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, mode, fetchNextPage]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setMode("search");
    setSearchQuery(searchInput);
  };

  // 모든 페이지 결과를 하나로 합치고 정렬
  const { data: bookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => fetchBookmarks(user!.id),
    enabled: !!user?.id,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async (movie: Movie) => {
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: existing, error: existingError } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("movie_id", movie.id)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      if (existing) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("bookmarks").insert({
          user_id: user.id,
          movie_id: movie.id,
          movie_title: movie.title,
          poster_path: movie.poster_path,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const visibleMovies = useMemo(() => {
    const raw =
      mode === "review"
        ? reviewMoviesRaw
        : (infiniteData?.pages.flatMap((p) => p.results) ?? []);
    return sortMovies(raw, sortOrder);
  }, [mode, reviewMoviesRaw, infiniteData, sortOrder]);

  const sectionTitle =
    mode === "review"
      ? "리뷰가 있는 영화"
      : mode === "top-rated"
        ? "최고평점 영화"
        : mode === "upcoming"
          ? "예정작품"
          : "검색 결과";

  return {
    mode,
    setMode,
    searchInput,
    setSearchInput,
    handleSearch,
    sortOrder,
    setSortOrder,
    loading,
    visibleMovies,
    sectionTitle,
    hasMore: !!hasNextPage,
    ref,
    bookmarks,
    toggleBookmark,
  };
};

// ────────────────────────────────────────────
// MovieSectionControls
// ────────────────────────────────────────────

interface MovieSectionControlsProps {
  mode: MovieSectionMode;
  setMode: React.Dispatch<React.SetStateAction<MovieSectionMode>>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (event: React.FormEvent) => void;
  sortOrder: MovieSort;
  setSortOrder: React.Dispatch<React.SetStateAction<MovieSort>>;
  loading: boolean;
}

export const MovieSectionControls = ({
  mode,
  setMode,
  searchInput,
  setSearchInput,
  handleSearch,
  sortOrder,
  setSortOrder,
  loading,
}: MovieSectionControlsProps) => (
  <div>
    <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "search", label: "검색" },
          { id: "review", label: "리뷰" },
          { id: "top-rated", label: "최고평점" },
          { id: "upcoming", label: "예정작품" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id as MovieSectionMode)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === item.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={handleSearch}
          className="flex flex-1 flex-col gap-3 sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="영화 제목을 검색해보세요"
              className="w-full bg-transparent text-sm text-slate-100 outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </form>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
          <Star className="h-4 w-4 text-amber-400" />
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as MovieSort)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="latest">최신순</option>
            <option value="rating">평점순</option>
            <option value="title">제목순</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        <span>
          {mode === "review"
            ? "내가 남긴 댓글이 있는 영화들을 한눈에 확인해보세요."
            : "검색, 최고평점, 예정작품까지 다양한 기준으로 영화를 탐색할 수 있습니다."}
        </span>
      </div>
    </div>
  </div>
);

// ────────────────────────────────────────────
// MovieSectionResults
// ────────────────────────────────────────────

interface MovieSectionResultsProps {
  mode: MovieSectionMode;
  visibleMovies: Movie[];
  sectionTitle: string;
  loading: boolean;
  hasMore: boolean;
  ref: RefCallback<HTMLElement | null>;
  bookmarks: Bookmark[];
  toggleBookmark: (movie: Movie) => void;
}

export const MovieSectionResults = ({
  mode,
  visibleMovies,
  sectionTitle,
  loading,
  hasMore,
  ref,
  bookmarks,
  toggleBookmark,
}: MovieSectionResultsProps) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:p-6">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold">{sectionTitle}</h2>
      <span className="text-sm text-slate-400">
        총 {visibleMovies.length}개
      </span>
    </div>

    {mode === "review" && visibleMovies.length === 0 && !loading ? (
      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
        아직 댓글이 작성된 영화가 없습니다.
      </div>
    ) : null}

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {visibleMovies.map((movie) => {
        const isBookmarked = bookmarks.some(
          (bookmark) => bookmark.movie_id === movie.id,
        );

        return (
          <MovieCard
            key={movie.id}
            movie={movie}
            bookmarked={isBookmarked}
            onToggleBookmark={() => toggleBookmark(movie)}
          />
        );
      })}
    </div>

    {/* 무한스크롤 감지 div */}
    {mode !== "review" && (
      <div ref={ref} className="py-6 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        )}
        {!hasMore && !loading && (
          <p className="text-sm text-slate-500">모든 영화를 불러왔습니다!</p>
        )}
      </div>
    )}
  </div>
);

// ────────────────────────────────────────────
// default export
// ────────────────────────────────────────────

const MovieSection = () => {
  const movieSection = useMovieSectionState();
  return (
    <>
      <MovieSectionControls {...movieSection} />
      <MovieSectionResults {...movieSection} />
    </>
  );
};

export default MovieSection;
