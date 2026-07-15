export interface Movie {
  id: number;
  title: string;
  poster_path?: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  backdrop_path?: string | null;
  popularity?: number;
  genres?: Array<{ id: number; name: string }>;
}

export interface AppUser {
  id: string;
  email: string;
  nickname: string;
}

export interface Comment {
  id: string | number;
  movie_id: number;
  movie_title: string;
  user_id: string;
  nickname: string;
  content: string;
  created_at: string;
}

export interface Bookmark {
  id: number;
  user_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
}
