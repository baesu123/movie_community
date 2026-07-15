import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/useAppStore";
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAppStore();

  // 입력 필드 상태 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI 상태 관리 (로그인 vs 회원가입)
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // 결과 메시지 상태 관리
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  // 이메일/비밀번호 인증 핸들러
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // 회원가입 요청
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Supabase 설정에 따라 가입 후 이메일 인증이 필요할 수 있습니다.
        setSuccessMessage(
          "회원가입이 완료되었습니다! 이메일 인증 링크를 확인하거나 로그인해 보세요.",
        );
        setEmail("");
        setPassword("");
      } else {
        // 로그인 요청
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "인증 과정에서 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* 백그라운드 디자인 데코 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 카드 레이아웃 */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="mb-2 font-semibold text-slate-100">테스트 계정</p>
          <ul className="space-y-1 text-slate-400">
            <li>• test1@never.com / 123456789</li>
            <li>• test2@gmeil.com / 123456789</li>
            <li>• test3@kekeo.com / 123456789</li>
            <li>*별도로 회원가입이 가능합니다.</li>
          </ul>
        </div>
        {/* 타이틀 및 설명 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 mb-4 border border-indigo-500/20">
            {isSignUp ? (
              <UserPlus className="w-8 h-8" />
            ) : (
              <LogIn className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            {isSignUp ? "새로운 계정 만들기" : "서비스 로그인"}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {isSignUp ? (
              <>
                <p className="font-bold text-yellow-400">
                  [실제 메일을 통해 인증하여 가입/로그인이 가능합니다.]
                </p>
                <br />
                <p className="font-bold text-red-400">
                  "Supabase는 보안상 이유로 저장된 사용자의 비밀번호 원본을 절대
                  확인할 수 없습니다."
                </p>
              </>
            ) : (
              "등록하신 계정으로 계속 진행하세요"
            )}
          </p>
        </div>

        {/* 오류 메시지 경고창 */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-300 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 성공 메시지 알림창 */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-emerald-300 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 인증 폼 */}
        <form onSubmit={handleAuth} className="space-y-5">
          {/* 이메일 입력 필드 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>
          </div>

          {/* 비밀번호 입력 필드 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />
                <span>회원가입 완료하기</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>로그인하기</span>
              </>
            )}
          </button>
        </form>

        {/* 로그인/회원가입 상태 전환 토글 */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            {isSignUp
              ? "이미 계정이 있으신가요? 로그인"
              : "처음이신가요? 새로운 계정 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
