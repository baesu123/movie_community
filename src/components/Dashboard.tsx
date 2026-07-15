import { Link, useNavigate } from "react-router-dom";
import { Film, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/useAppStore";
import {
  MovieSectionControls,
  MovieSectionResults,
  useMovieSectionState,
} from "./MovieList/MovieSection";
import type { Bookmark, Comment } from "../types";

// ✅ 내 댓글 fetch 함수 (useQuery 에 전달)
const fetchMyComments = async (userId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Comment[]) ?? [];
};

// ✅ 댓글 삭제 함수 (useMutation 에 전달)
const deleteComment = async (commentId: string | number) => {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) throw new Error(error.message);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"comments" | "bookmarks">(
    "comments",
  );
  const movieSection = useMovieSectionState();

  // ✅ useQuery - 내 댓글 목록
  // user.id 가 없으면 fetch 하지 않음 (enabled)
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["myComments", user?.id],
    queryFn: () => fetchMyComments(user!.id),
    enabled: !!user?.id,
  });

  const { data: bookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["myBookmarks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user!.id)
        .order("id", { ascending: false });

      if (error) throw new Error(error.message);
      return (data as Bookmark[]) ?? [];
    },
    enabled: !!user?.id,
  });

  // ✅ useMutation - 댓글 삭제
  const { mutate: handleDeleteComment } = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // 삭제 성공 시 내 댓글 목록 자동 갱신
      void queryClient.invalidateQueries({
        queryKey: ["myComments", user?.id],
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/15 p-2 text-indigo-300">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">Movie Community</p>
              <p className="text-sm text-slate-400">
                영화 검색과 댓글을 한 곳에서
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {user?.nickname || "Guest"}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-rose-400 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <MovieSectionControls {...movieSection} />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("comments")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === "comments"
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                내 댓글
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bookmarks")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === "bookmarks"
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                찜한 영화
              </button>
            </div>

            {activeTab === "comments" ? (
              <>
                <h2 className="mb-4 text-lg font-semibold">내 댓글</h2>
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    아직 작성한 댓글이 없습니다.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        <Link
                          to={`/movie/${comment.movie_id}`}
                          className="flex-1 text-left transition hover:opacity-80"
                        >
                          <p className="text-sm font-medium text-slate-100">
                            {`영화 #${comment.movie_title}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {comment.content.slice(0, 40)}...
                          </p>
                        </Link>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="rounded-full p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="mb-4 text-lg font-semibold">찜한 영화</h2>
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    찜한 영화가 없습니다.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                    {bookmarks.map((bookmark) => (
                      <Link
                        key={bookmark.id}
                        to={`/movie/${bookmark.movie_id}`}
                        className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 transition hover:bg-slate-900"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${bookmark.poster_path}`}
                          alt={bookmark.movie_title}
                          className="h-16 w-12 rounded-xl object-cover"
                        />
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-slate-100">
                            {bookmark.movie_title}
                          </p>
                          <p className="text-xs text-slate-400">
                            찜한 영화 {bookmark.movie_id}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <MovieSectionResults {...movieSection} />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
