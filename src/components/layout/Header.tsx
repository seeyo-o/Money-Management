import React from 'react';
import { Plus, Landmark, Smartphone, Banknote, LogOut } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatIDR } from '../../domain/formatters';
import { MonthPicker } from '../ui/MonthPicker';

interface HeaderProps {
  onOpenAddModal: () => void;
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddModal, pageTitle }) => {
  const {
    selectedMonth,
    setSelectedMonth,
    totalBankBalance,
    totalEwalletBalance,
    totalCashBalance,
    netWorth,
  } = useFinance();
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Page Title & Mobile Brand */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Arsitektur Finansial Rasional & Pembukuan Kas
          </p>
        </div>

        {/* Center: Liquidity Pill (Desktop) */}
        <div className="hidden xl:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-subtle text-xs">
          <div className="pr-3 border-r border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Net Worth:</span>
            <span className="font-bold text-slate-900 tabular-numbers">
              {formatIDR(netWorth)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2">
            <div className="w-2 h-2 rounded-full bg-[#0060AF]"></div>
            <div>
              <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                <Landmark size={10} /> Bank:
              </span>
              <span className="font-bold text-slate-700 tabular-numbers">
                {formatIDR(totalBankBalance)}
              </span>
            </div>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5 px-2">
            <div className="w-2 h-2 rounded-full bg-[#6D28D9]"></div>
            <div>
              <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                <Smartphone size={10} /> E-Wallet:
              </span>
              <span className="font-bold text-slate-700 tabular-numbers">
                {formatIDR(totalEwalletBalance)}
              </span>
            </div>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5 pl-2">
            <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
            <div>
              <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                <Banknote size={10} /> Tunai:
              </span>
              <span className="font-bold text-slate-700 tabular-numbers">
                {formatIDR(totalCashBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Month Selector & Quick Add Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Elegant Month & Year Picker */}
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            align="right"
          />

          {/* Quick Add Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus size={15} className="text-teal-400" />
            <span className="hidden sm:inline">Catat Transaksi</span>
            <span className="sm:hidden">Catat</span>
          </button>

          {/* Mobile Logout button */}
          <button
            onClick={() => logout()}
            className="md:hidden p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
