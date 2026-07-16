import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/useAppStore";
import type { Bookmark, Comment, Movie } from "../../types";

// ────────────────────────────────────────────
// fetch 함수들 (useQuery / useMutation 에 전달)
// ────────────────────────────────────────────

const fetchMovie = async (movieId: string): Promise<Movie> => {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=ko`,
  );
  if (!res.ok) throw new Error("영화 정보를 불러오지 못했습니다.");
  return res.json();
};

const fetchComments = async (movieId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("movie_id", Number(movieId))
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Comment[]) ?? [];
};

const fetchUserComments = async (userId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Comment[]) ?? [];
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

const fetchRelatedMovies = async (movieId: string): Promise<Movie[]> => {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=ko&page=1`,
  );
  if (!res.ok) throw new Error("추천 영화를 불러오지 못했습니다.");
  const data = await res.json();
  return (data.results || []) as Movie[];
};

type VoteMap = Record<number, { up: number; down: number }>;

const fetchVotes = async (): Promise<VoteMap> => {
  const { data, error } = await supabase
    .from("comment_votes")
    .select("comment_id, type");

  if (error) throw new Error(error.message);

  const countMap: VoteMap = {};
  (data ?? []).forEach(({ comment_id, type }) => {
    if (!countMap[comment_id]) countMap[comment_id] = { up: 0, down: 0 };
    if (type === "up") countMap[comment_id].up += 1;
    if (type === "down") countMap[comment_id].down += 1;
  });
  return countMap;
};

const fetchUserCommentCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
};

// ────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────

const SingleMovie = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  // ✅ useQuery - 영화 정보
  const { data: movie, isLoading: movieLoading } = useQuery<Movie>({
    queryKey: ["movie", movieId],
    queryFn: () => fetchMovie(movieId!),
    enabled: !!movieId,
  });

  // ✅ useQuery - 댓글 목록
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["comments", movieId],
    queryFn: () => fetchComments(movieId!),
    enabled: !!movieId,
  });

  const { data: relatedMovies = [] } = useQuery<Movie[]>({
    queryKey: ["relatedMovies", movieId],
    queryFn: () => fetchRelatedMovies(movieId!),
    enabled: !!movieId,
  });

  const { data: bookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => fetchBookmarks(user!.id),
    enabled: !!user?.id,
  });

  const { data: votes = {} } = useQuery<VoteMap>({
    queryKey: ["votes"],
    queryFn: fetchVotes,
  });

  // ✅ useMutation - 댓글 등록
  const { mutate: submitComment, isPending: commentLoading } = useMutation({
    mutationFn: async (newContent: string) => {
      // 댓글 개수 확인
      const count = await fetchUserCommentCount(user!.id);
      if (count >= 10) {
        throw new Error(
          "테스트용 사이트이므로 사용자 별 10개의 댓글만 작성가능합니다",
        );
      }

      const { error } = await supabase.from("comments").insert({
        movie_id: Number(movieId),
        movie_title: movie?.title || "",
        user_id: user!.id,
        nickname: user!.nickname,
        content: newContent.trim(),
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setContent("");
      // 댓글 목록 자동 갱신
      void queryClient.invalidateQueries({ queryKey: ["comments", movieId] });
      // 내 댓글 목록도 갱신 (Dashboard 에 반영)
      void queryClient.invalidateQueries({
        queryKey: ["myComments", user?.id],
      });
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async (targetMovie: Movie) => {
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: existing, error: existingError } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("movie_id", targetMovie.id)
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
          movie_id: targetMovie.id,
          movie_title: targetMovie.title,
          poster_path: targetMovie.poster_path,
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

  // ✅ useMutation - 추천/비추천
  const { mutate: handleVote } = useMutation({
    mutationFn: async ({
      commentId,
      type,
    }: {
      commentId: number;
      type: "up" | "down";
    }) => {
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: existing, error: existingError } = await supabase
        .from("comment_votes")
        .select("id, type")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      if (existing) {
        if (existing.type === type) {
          // 같은 버튼 → 취소
          const { error } = await supabase
            .from("comment_votes")
            .delete()
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        } else {
          // 다른 버튼 → 변경
          const { error } = await supabase
            .from("comment_votes")
            .update({ type })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        }
      } else {
        // 처음 투표
        const { error } = await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: user.id,
          type,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // 투표 수 자동 갱신
      void queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(
    null,
  );
  const [profileModalComments, setProfileModalComments] = useState<Comment[]>(
    [],
  );

  const handleOpenProfileModal = async (userId: string) => {
    setProfileModalUserId(userId);
    const comments = await fetchUserComments(userId);
    setProfileModalComments(comments);
  };

  const handleCloseProfileModal = () => {
    setProfileModalUserId(null);
    setProfileModalComments([]);
  };

  const isBookmarked = useMemo(
    () => !!bookmarks.find((item) => item.movie_id === movie?.id),
    [bookmarks, movie],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !movieId || !content.trim()) return;
    submitComment(content);
  };

  // ────────────────────────────────────────────
  // 로딩 / 렌더링
  // ────────────────────────────────────────────

  if (movieLoading || !movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        <span>영화 정보를 불러오는 중입니다...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="border-b border-slate-800 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(2,6,23,0.8), rgba(2,6,23,0.98)), url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-end lg:px-8">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="h-80 w-56 rounded-2xl object-cover shadow-2xl"
          />
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-indigo-500 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark(movie)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isBookmarked
                    ? "bg-rose-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Heart className="h-4 w-4" />
                {isBookmarked ? "찜 취소" : "보고 싶어요"}
              </button>
            </div>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{movie.title}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {movie.release_date || "개봉일 미정"} · 평점{" "}
                {movie.vote_average.toFixed(1)}
              </p>
            </div>
            <p className="text-sm leading-7 text-slate-300">
              {movie.overview || "줄거리 정보가 없습니다."}
            </p>
          </div>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-5 text-xl font-semibold">댓글 작성</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
              <p>
                현재 접속 사용자:{" "}
                <span className="font-semibold text-slate-100">
                  {user?.nickname ?? "로그인 필요"}
                </span>
              </p>
              {!user ? (
                <p className="mt-1 text-amber-400">
                  댓글 작성은 로그인 후 가능합니다.
                </p>
              ) : (
                <p className="mt-1">현재 사용자로 댓글을 남길 수 있습니다.</p>
              )}
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              disabled={!user}
              placeholder="이 영화에 대한 의견을 남겨보세요."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={commentLoading || !user}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {commentLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              댓글 등록
            </button>
          </form>

          {/* 댓글 목록 */}
          <div className="mt-8 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400">
                아직 작성된 댓글이 없습니다.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(comment.user_id)}
                        className="font-semibold text-slate-100 transition hover:text-indigo-300"
                      >
                        {comment.nickname}
                      </button>
                      <p className="text-xs text-slate-500">
                        {new Date(comment.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex gap-2 text-sm text-slate-400">
                      <button
                        onClick={() =>
                          handleVote({
                            commentId: Number(comment.id),
                            type: "up",
                          })
                        }
                        disabled={!user}
                        className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {votes[Number(comment.id)]?.up || 0}
                      </button>
                      <button
                        onClick={() =>
                          handleVote({
                            commentId: Number(comment.id),
                            type: "down",
                          })
                        }
                        disabled={!user}
                        className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {votes[Number(comment.id)]?.down || 0}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 사이드바 */}
        <aside className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <MessageCircle className="h-5 w-5 text-indigo-400" />
            커뮤니티 요약
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            <p>총 댓글 수: {comments.length}개</p>
            <p className="mt-2">
              로그인한 사용자는 이 영화에 대해 의견을 남기고, 다른 사용자의
              댓글을 추천/비추천할 수 있습니다.
            </p>
          </div>
          <Link
            to="/"
            className="block rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-center text-sm font-medium text-indigo-300 hover:bg-indigo-500/20"
          >
            메인 화면으로 이동
          </Link>
        </aside>
      </div>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">추천 영화</h2>
          </div>
          {relatedMovies.length === 0 ? (
            <p className="text-sm text-slate-400">추천 영화가 없습니다.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 pt-2">
              {relatedMovies.slice(0, 10).map((related) => (
                <Link
                  key={related.id}
                  to={`/movie/${related.id}`}
                  className="min-w-[220px] shrink-0 rounded-3xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-indigo-500/60"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w300${related.poster_path}`}
                    alt={related.title}
                    className="mb-3 h-48 w-full rounded-2xl object-cover"
                  />
                  <p className="text-sm font-semibold text-slate-100">
                    {related.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {related.release_date || "개봉일 미정"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {profileModalUserId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  사용자 댓글
                </h3>
                <p className="text-sm text-slate-400">
                  ID: {profileModalUserId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseProfileModal}
                className="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
            {profileModalComments.length === 0 ? (
              <p className="text-sm text-slate-400">
                이 사용자가 작성한 댓글 정보가 없습니다.
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {profileModalComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {comment.movie_title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleString("ko-KR")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SingleMovie;
