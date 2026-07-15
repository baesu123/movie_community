import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/useAppStore";
import { Loader2 } from "lucide-react";

const ProtectedRoute = () => {
  const { user } = useAppStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 💡 새 탭이 열리자마자 Supabase에게 이 브라우저에 기존 로그인 세션이 있는지 확인.
      await supabase.auth.getSession();
      // 세션 확인(또는 App.tsx의 onAuthStateChange 반영)이 완료되면 로딩 상태를 끝냄.
      setIsAuthChecking(false);
    };

    void checkAuth();
  }, []);

  // 1️⃣ Supabase가 로그인 세션을 복구하는 동안에는 리다이렉트를 하지 않고 로딩 화면을 보여주며 기다림.
  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-400">
          인증 상태를 확인 중입니다...
        </span>
      </div>
    );
  }

  // 2️⃣ 세션 확인이 끝났는데도 user가 없다면 로그인 페이지로 리다이렉트.
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
