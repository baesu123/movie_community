# Movie Community

React, TypeScript, Supabase, TMDB API를 활용한 영화 커뮤니티 포트폴리오입니다.

실제 이메일 인증 기반의 회원가입/로그인, 영화 검색 및 상세 페이지, 댓글 작성/삭제, 추천/비추천 기능을 제공합니다.
댓글 히스토리를 모아보는 프로필 팝업, 보고 싶은 영화를 보관하는 북마크(찜) 시스템, TMDB 추천 API 연동을 통한 연관 영화를 제공하여 커뮤니티의 유기적인 흐름과 개인화 경험을 제공합니다.

## 🔗 Quick Links

- **🚀 라이브 배포 주소**: [Netlify 배포 링크 바로가기](https://moviecommunity.netlify.app/login)
- **💻 소스 코드**: [GitHub 저장소 바로가기](https://github.com/baesu123/movie_community)
- **🍿 연동 API 데이터 출처**: [TMDB (The Movie Database)](https://www.themoviedb.org)

---

## 사용 기술

| 기술                               | 분류             |
| ---------------------------------- | ---------------- |
| React 19, TypeScript, Tailwind CSS | UI               |
| Vite                               | 빌드             |
| React Router DOM                   | 라우팅           |
| Zustand                            | 전역 상태        |
| TanStack React Query               | 서버 상태        |
| Supabase (인증, DB)                | 백엔드           |
| Fetch API                          | 외부 데이터 통신 |
| TypeScript                         | 데이터 타입 정의 |
| react-intersection-observer        | 무한 스크롤      |
| Custom Hook                        | 상태 로직 분리   |
| lucide-react                       | 아이콘           |

---

## 주요 기능

- 실제 이메일 인증을 통한 회원가입 및 로그인
- TMDB API 기반 영화 검색 및 카드 목록 표시
- 검색 / 리뷰 / 최고평점 / 예정작품 모드 전환
- 최신순 / 평점순 / 제목순 정렬
- 무한 스크롤로 영화 목록 자동 추가 로딩
- 영화 상세 페이지 및 댓글 작성 / 삭제
- 상세 페이지 하단에 현재 영화와 연관된 영화 4~5개의 가로 슬라이더 형태
- 사용자당 최대 10개 댓글 제한
- 댓글 추천 / 비추천 (중복 투표 방지, 취소 가능)
- 타 유저의 닉네임을 클릭하면 해당 유저의 모든 댓글을 한눈에 모아볼 수 있는 팝업(모달)
- 상세 페이지 및 영화 카드에서 하트(북마크) 아이콘을 눌러 원하는 영화를 찜 목록에 추가/삭제 가능
- 대시보드 우측 영역에 '내가 남긴 댓글'과 '내가 찜한 영화 목록'을 관리할 수 있는 탭 레이아웃 구성
- 내가 남긴 댓글 목록 확인 및 내가 찜한 영화 목록 클릭 시 상세페이지 바로 이동
- 잘못된 경로 접근 시 404 페이지 처리

---

## 프로젝트 구조

```
src/
├── App.tsx                         # 라우팅 및 QueryClientProvider 설정
├── components/
│   ├── Auth.tsx                    # 로그인 / 회원가입 페이지
│   ├── Dashboard.tsx               # 메인 대시보드 (헤더, 내 댓글, 북마크 탭 전환 레이아웃 포함)
│   ├── NotFound.tsx                # 404 페이지
│   ├── ProtectedRoute.tsx          # 인증 상태 확인 후 라우트 보호
│   └── MovieList/
│       ├── MovieCard.tsx           # 영화 포스터 카드 UI
│       ├── MovieSection.tsx        # 영화 목록, 검색, 정렬, 무한스크롤
│       └── SingleMovie.tsx         # 영화 상세 페이지 및 댓글 기능 , 연관 영화 , 댓글 스레드 및 유저 팝업 모달
├── lib/
│   └── supabase.ts                 # Supabase 클라이언트 초기화
├── stores/
│   └── useAppStore.ts              # Zustand 로그인 유저 전역 상태
└── types.ts                        # Movie, Comment, AppUser, Bookmark 타입 정의


```

### 프로젝트 상세

- App: Supabase의 로그인 상태를 전역 상태(Zustand)에 저장하고 React Query와 React Router를 설정하여 전체 화면의 라우팅을 관리하는 역할
- Auth: Supabase의 이메일 인증 방법을 가져와서 쓴 코드이며, 프로젝트에서는 이 API를 이용해서 로그인/회원가입을 구현
- Dashboard: 로그인한 사용자의 댓글과 북마크를 React Query로 조회하고, 댓글 삭제 및 로그아웃 기능을 제공하며, 데이터가 변경되면 자동으로 최신 상태를 다시 요청
- NotFound: 존재하지 않는 URL(잘못된 경로)로 접근했을 때 보여주는 404 페이지이며, 메인 화면으로 이동할 수 있는 버튼을 제공
- ProtectedRoute: 로그인이 필요한 페이지에 접근하기 전에 Supabase의 로그인 세션을 확인하고, 로그인되어 있으면 해당 페이지를 보여주고, 로그인되어 있지 않으면 로그인 페이지로 전환
- MovieCard: Movie 객체와 북마크 상태를 props로 받아 영화의 포스터, 제목, 평점 등의 정보를 화면에 표시
- MovieSection: TMDB API와 Supabase를 이용해 영화 검색, 최신 영화, 최고 평점 영화, 예정작, 리뷰 영화 목록을 조회하고 정렬·무한스크롤·북마크 기능을 제공하는 영화 목록 관리
- SingleMovie: TMDB API와 Supabase를 이용해 영화 상세 정보와 추천 영화를 조회하고, 댓글 작성·조회, 북마크, 추천/비추천 등 영화와 관련된 주요 기능을 제공하는 상세 페이지

---

## 페이지 구성

| 경로              | 설명                                   |
| ----------------- | -------------------------------------- |
| `/login`          | 로그인 / 회원가입                      |
| `/`               | 메인 대시보드 (영화 탐색 + 마이페이지) |
| `/movie/:movieId` | 영화 상세 페이지 + 댓글 + 연관 영화    |
| `/404`            | 잘못된 경로 안내                       |

---

## Supabase 테이블 구조

### comments

| 컬럼        | 타입        | 설명           |
| ----------- | ----------- | -------------- |
| id          | bigint (PK) | 댓글 번호      |
| movie_id    | integer     | TMDB 영화 ID   |
| movie_title | text        | 영화 제목      |
| user_id     | uuid        | Auth 사용자 ID |
| nickname    | text        | 표시용 닉네임  |
| content     | text        | 댓글 내용      |
| created_at  | timestamptz | 작성 시간      |

### comment_votes

| 컬럼       | 타입        | 설명               |
| ---------- | ----------- | ------------------ |
| id         | bigint (PK) | 투표 번호          |
| comment_id | bigint (FK) | comments.id 참조   |
| user_id    | uuid (FK)   | auth.users.id 참조 |
| type       | text        | "up" 또는 "down"   |
| created_at | timestamptz | 투표 시간          |

### bookmarks

| 컬럼        | 타입        | 설명               |
| ----------- | ----------- | ------------------ |
| id          | bigint (PK) | 북마크 번호        |
| user_id     | uuid        | auth.user.id 참조  |
| movie_id    | integer     | 찜한 영화 TMDB ID  |
| movie_title | text        | 찜한 영화 제목     |
| poster_path | text (UQ)   | 포스터 이미지 경로 |

---

## 테스트 계정

```
test1@never.com  /  123456789
test2@gmeil.com  /  123456789
test3@kekeo.com  /  123456789
```

별도 이메일 인증을 통한 회원가입도 가능합니다.

---

## 실행 방법

### 1. 종속성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력합니다.

```env
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 빌드

```bash
npm run build
```

---

## 트러블슈팅

### 댓글 추천/비추천 업데이트 불가

**문제**
`comments` 테이블의 `upvote` / `downvote` 컬럼을 직접 수정하는 방식은
Supabase RLS(행 수준 보안) 정책으로 인해 본인 댓글이 아닌 행의 UPDATE가 차단되어
다른 사용자 댓글의 추천/비추천 기능 구현이 불가능했습니다.

**해결**
테이블 구조를 변경하는 데이터베이스 정규화
`comment_votes` 테이블을 별도로 생성하여 해결했습니다.

- 투표 시 `comment_votes` 테이블에 row를 추가/삭제하는 방식으로 변경
- `comment_id` (comments.id 외래키), `user_id`, `type` (up/down) 컬럼으로 구성
- 추천/비추천 수는 해당 `comment_id`의 `type`별 row 개수를 카운팅하여 화면에 표시
- 기존 `comments` 테이블의 `upvote` / `downvote` 컬럼 삭제

> RLS(Row-Level Security)란 데이터베이스에서 사용자의 권한에 따라 특정 행(Row)에만 접근을 허용하는 행 수준 보안 기능입니다.
