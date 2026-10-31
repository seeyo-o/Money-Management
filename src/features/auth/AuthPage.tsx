import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, isFirebaseLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // @ts-expect-error router state from
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    setEmail('demo.user@rasio.id');
    setPassword('demo123456');
    setLoading(true);
    try {
      await login('demo.user@rasio.id', 'demo123456');
      navigate(from, { replace: true });
    } catch {
      // If user doesn't exist, register
      try {
        await register('demo.user@rasio.id', 'demo123456');
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
        <div className="bento-card p-6 sm:p-8 bg-white shadow-modal">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRegister ? 'Mulai kelola dompet dengan rasional' : 'Masuk untuk mengakses pembukuan'}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
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
