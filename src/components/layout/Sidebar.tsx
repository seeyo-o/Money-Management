import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PieChart,
  FileSpreadsheet,
  LogOut,
  Sparkles,
  Cloud,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, isFirebaseLive } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard & Insight',
      icon: LayoutDashboard,
    },
    {
      to: '/transactions',
      label: 'Transaksi & Mutasi',
      icon: Receipt,
    },
    {
      to: '/wallets',
      label: 'Dompet & Rekonsiliasi',
      icon: Wallet,
    },
    {
      to: '/budgets',
      label: 'Perencanaan Budget',
      icon: PieChart,
    },
    {
      to: '/bookkeeping',
      label: 'Buku Kas & Cetak PDF',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-white min-h-screen shrink-0 sticky top-0 h-screen select-none">
      {/* Brand Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center font-black text-base shadow-sm">
            R
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-base tracking-tight">Rasio</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">FinTech & Budgeting</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Session & Status */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        {/* Cloud Status */}
        <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-white border border-slate-200/80 rounded-lg">
          <span className="text-slate-500 font-medium flex items-center gap-1.5">
            {isFirebaseLive ? (
              <>
                <Cloud size={13} className="text-emerald-500" />
                <span>Cloud Firestore</span>
              </>
            ) : (
              <>
                <HardDrive size={13} className="text-amber-500" />
                <span>Demo Storage</span>
              </>
            )}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isFirebaseLive ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          ></span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Keluar (Logout)"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
