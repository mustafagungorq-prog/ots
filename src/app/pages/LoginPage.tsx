import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Clock, User, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { login, sessionExpired, clearSessionExpired, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      clearSessionExpired();
    };
  }, [clearSessionExpired]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Kullanıcı adı ve şifre gereklidir");
      return;
    }
    const ok = await login(username, password);
    if (ok) navigate("/");
    else setError("Geçersiz kullanıcı adı veya şifre");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - brand panel, visible on large screens */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/20 bg-white">
              <img
                src="/ots/dist/logo-365.jpg"
                alt="365 Kuran"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">365 Kuran</h1>
              <p className="text-emerald-200 text-sm">Kuran Mektebi</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="text-3xl font-semibold leading-snug">
            “Sizin en hayırlınız, Kur'an'ı öğrenen ve öğreteninizdir.”
          </blockquote>
          <p className="mt-4 text-emerald-200/80">— Hz. Muhammed (sav)</p>
        </div>

        <div className="relative z-10 flex items-end gap-6">
          <img
            src="/ots/dist/quran-book.png"
            alt="Kuran"
            className="w-36 h-44 object-contain opacity-80 drop-shadow-2xl rotate-[-6deg]"
          />
          <img
            src="/ots/dist/risale-book.png"
            alt="Risale-i Nur"
            className="w-36 h-44 object-contain opacity-80 drop-shadow-2xl rotate-[6deg]"
          />
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-gradient-to-br from-gray-50 to-emerald-50/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_40%)]" />
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-4 ring-emerald-100 mb-4 bg-white">
              <img
                src="/ots/dist/logo-365.jpg"
                alt="365 Kuran"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              365 Kuran Kuran Mektebi
            </h1>
            <p className="text-emerald-700 text-sm text-center mt-1 max-w-xs">
              Sizin en hayırlınız, Kur'an'ı öğrenen ve öğreteninizdir.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Hoş geldiniz</h2>
              <p className="text-gray-500 mt-1">
                Hesabınıza giriş yaparak takip sistemine devam edin
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Kullanıcı adınız"
                    className="pl-10 h-11"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifreniz"
                    className="pl-10 pr-10 h-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {sessionExpired && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Oturum süreniz doldu.</strong> 10 dakika boyunca
                    işlem yapılmadığından oturumunuz kapatıldı. Lütfen tekrar
                    giriş yapın.
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-base transition-colors"
              >
                {loading && (
                  <Loader2 className="mr-2 animate-spin" size={18} />
                )}
                Giriş Yap
              </Button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Kuran ve Risale-i Nur Takip Sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
