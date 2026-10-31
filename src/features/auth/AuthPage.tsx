import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validatePasswordStrength } from '../../services/authService';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, isFirebaseLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // @ts-expect-error router state from
  const from = location.state?.from?.pathname || '/dashboard';

  // Real-time password strength validation
  const pwdStrength = useMemo(() => {
    return validatePasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && !pwdStrength.isValid) {
      setError(
        'Kata sandi belum memenuhi standar keamanan: minimal 6 karakter, huruf besar (A-Z), angka (0-9), dan simbol.'
      );
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    const demoEmail = 'demo.user@rasio.id';
    const demoPassword = 'Demo@123456'; // Strong password compliant
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate(from, { replace: true });
    } catch {
      // If user doesn't exist, register
      try {
        await register(demoEmail, demoPassword);
        navigate(from, { replace: true });
      } catch (err: unknown) {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-teal-100">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 font-extrabold text-xl shadow-card mb-3">
            R
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Rasio</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Personal Finance & Rational Budgeting Web App
          </p>
        </div>

        {/* Card */}
        <div className="bento-card p-6 sm:p-8 bg-white shadow-modal rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRegister ? 'Proteksi akun dengan kata sandi kuat' : 'Masuk untuk mengakses pembukuan'}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
              <ShieldCheck size={11} />
              <span>{isFirebaseLive ? 'Firebase Auth' : 'Demo Mode'}</span>
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl mb-4 animate-shake">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? 'Kombinasi huruf besar, angka, simbol' : 'Masukkan password'}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Interactive Password Strength Checklist (Only for Registration) */}
            {isRegister && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                {/* Strength Meter Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-600">Kekuatan Kata Sandi:</span>
                    <span
                      className={`font-bold ${
                        pwdStrength.score === 4
                          ? 'text-emerald-600'
                          : pwdStrength.score === 3
                          ? 'text-indigo-600'
                          : pwdStrength.score === 2
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {pwdStrength.score === 4
                        ? 'Sangat Kuat'
                        : pwdStrength.score === 3
                        ? 'Cukup Kuat'
                        : pwdStrength.score === 2
                        ? 'Sedang'
                        : password.length > 0
                        ? 'Lemah'
                        : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          pwdStrength.score >= step
                            ? pwdStrength.score === 4
                              ? 'bg-emerald-500'
                              : pwdStrength.score === 3
                              ? 'bg-indigo-500'
                              : pwdStrength.score === 2
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                            : 'bg-slate-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* 4 Security Requirements Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {pwdStrength.hasMinLength ? (
                      <Check size={13} className="text-emerald-600 shrink-0 font-bold" />
                    ) : (
                      <X size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className={pwdStrength.hasMinLength ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Min. 6 karakter
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {pwdStrength.hasUppercase ? (
                      <Check size={13} className="text-emerald-600 shrink-0 font-bold" />
                    ) : (
                      <X size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className={pwdStrength.hasUppercase ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Huruf besar (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {pwdStrength.hasNumber ? (
                      <Check size={13} className="text-emerald-600 shrink-0 font-bold" />
                    ) : (
                      <X size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className={pwdStrength.hasNumber ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Angka (0-9)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {pwdStrength.hasSymbol ? (
                      <Check size={13} className="text-emerald-600 shrink-0 font-bold" />
                    ) : (
                      <X size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className={pwdStrength.hasSymbol ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                      Simbol (!@#$...)
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isRegister && !pwdStrength.isValid)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Memproses...' : isRegister ? 'Daftar Akun Baru' : 'Masuk ke Aplikasi'}</span>
              <ArrowRight size={14} className="text-teal-400" />
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles size={13} className="text-teal-600" />
              <span>Gunakan Akun Demo Otomatis</span>
            </button>
          </div>

          {/* Toggle Register / Login */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium transition"
            >
              {isRegister ? (
                <>
                  Sudah memiliki akun? <strong className="text-teal-700">Masuk di sini</strong>
                </>
              ) : (
                <>
                  Belum punya akun? <strong className="text-teal-700">Daftar sekarang</strong>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-slate-400 text-center mt-6">
          Dirancang untuk ekosistem perbankan & e-wallet Indonesia (BCA, CIMB Niaga, OVO, GoPay, ShopeePay).
        </p>
      </div>
    </div>
  );
};
