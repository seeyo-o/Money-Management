import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAddModal }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 shadow-lg">
      <div className="flex items-center justify-around relative">
        {/* Tab 1: Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span className="text-[10px]">Dashboard</span>
        </NavLink>

        {/* Tab 2: Transaksi */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Receipt size={18} />
          <span className="text-[10px]">Transaksi</span>
        </NavLink>

        {/* Center Floating Action Button (FAB) + */}
        <div className="relative -top-5">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-full bg-slate-900 text-teal-400 flex items-center justify-center shadow-lg active:scale-95 hover:bg-slate-800 transition ring-4 ring-[#F8FAFC]"
            aria-label="Catat Transaksi Baru"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab 3: Dompet */}
        <NavLink
          to="/wallets"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Wallet size={18} />
          <span className="text-[10px]">Dompet</span>
        </NavLink>

        {/* Tab 4: Buku Kas */}
        <NavLink
          to="/bookkeeping"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <FileSpreadsheet size={18} />
          <span className="text-[10px]">Buku Kas</span>
        </NavLink>
      </div>
    </nav>
  );
};
