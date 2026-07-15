import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-bold">잘못된 경로입니다</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          요청하신 페이지는 존재하지 않습니다. 메인 화면으로 돌아가서 계속
          이용해보세요.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          메인 화면으로 가기
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
