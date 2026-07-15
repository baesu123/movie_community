import { Link } from "react-router-dom";
import { Heart, ImageOff, Star } from "lucide-react";
import type { Movie } from "../../types";

interface MovieCardProps {
  movie: Movie;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}

const MovieCard = ({ movie, bookmarked, onToggleBookmark }: MovieCardProps) => {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition hover:-translate-y-1 hover:border-indigo-500/60"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-center">
            <ImageOff className="mb-3 h-12 w-12 text-slate-500" />
            <span className="text-xs text-slate-400">
              영화 포스터가 없습니다
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">
              {movie.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onToggleBookmark?.();
              }}
              className={`rounded-full p-2 transition ${
                bookmarked
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Heart className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
              <Star className="h-3.5 w-3.5" />
              {movie.vote_average.toFixed(1)}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {movie.release_date || "개봉일 미정"}
        </p>
        <p className="line-clamp-3 text-sm text-slate-400">
          {movie.overview
            ? `${movie.overview.slice(0, 100)}...`
            : "줄거리 정보가 없습니다."}
        </p>
      </div>
    </Link>
  );
};

export default MovieCard;
