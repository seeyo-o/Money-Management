import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Trash2,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { TransactionType, PillarType } from '../../domain/types';
import { formatIDR, formatShortDateID, getMonthLabel } from '../../domain/formatters';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { TransactionModal } from './TransactionModal';
import { MonthPicker } from '../../components/ui/MonthPicker';

export const TransactionsPage: React.FC = () => {
  const { transactions, wallets, categories, deleteTransaction, selectedMonth } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [selectedPillar, setSelectedPillar] = useState<PillarType | 'all'>('all');
  const [pageMonthFilter, setPageMonthFilter] = useState<string>('GLOBAL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const walletMap = new Map(wallets.map((w) => [w.id, w]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const filteredTransactions = transactions.filter((tx) => {
    const activePeriod = pageMonthFilter === 'GLOBAL' ? selectedMonth : pageMonthFilter;
    if (activePeriod !== 'ALL' && activePeriod && !tx.date.startsWith(activePeriod)) return false;
    if (selectedType !== 'all' && tx.type !== selectedType) return false;

    if (selectedWallet !== 'all') {
      if (tx.type === 'TRANSFER') {
        if (tx.walletId !== selectedWallet && tx.toWalletId !== selectedWallet) {
          return false;
        }
      } else {
        if (tx.walletId !== selectedWallet) return false;
      }
    }

    if (selectedPillar !== 'all' && tx.categoryId) {
      const cat = categoryMap.get(tx.categoryId);
      if (cat?.pillar !== selectedPillar) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNote = tx.note.toLowerCase().includes(q);
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      const matchCat = cat?.name.toLowerCase().includes(q);
      const w = walletMap.get(tx.walletId);
      const matchW = w?.name.toLowerCase().includes(q);
      if (!matchNote && !matchCat && !matchW) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Daftar Transaksi & Mutasi Keuangan
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan real-time multi-dompet dengan integritas akuntansi atomik
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm self-start sm:self-auto transition"
        >
          <Plus size={15} className="text-teal-400" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bento-card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi, merchant, catatan..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <MonthPicker
          value={pageMonthFilter === 'GLOBAL' ? selectedMonth : pageMonthFilter}
          onChange={(newVal) => setPageMonthFilter(newVal)}
          align="left"
          showAllOption={true}
          allOptionLabel="Semua Waktu"
        />

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as TransactionType | 'all')}
          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-700"
        >
          <option value="all">Semua Tipe</option>
          <option value="EXPENSE">Pengeluaran</option>
          <option value="INCOME">Pemasukan</option>
          <option value="TRANSFER">Transfer / Top-Up</option>
        </select>

        <select
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-700"
        >
          <option value="all">Semua Akun / Dompet</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.category})
            </option>
          ))}
        </select>

        <select
          value={selectedPillar}
          onChange={(e) => setSelectedPillar(e.target.value as PillarType | 'all')}
          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-700"
        >
          <option value="all">Semua Pilar</option>
          <option value="NEEDS">Needs (Kebutuhan Pokok)</option>
          <option value="WANTS">Wants (Gaya Hidup)</option>
          <option value="SAVINGS">Savings (Tabungan)</option>
        </select>
      </div>

      {/* List */}
      <div className="bento-card overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-14 text-center">
            <Filter size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi yang sesuai</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ubah filter atau tambahkan transaksi baru</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const fromW = walletMap.get(tx.walletId);
              const toW = tx.toWalletId ? walletMap.get(tx.toWalletId) : undefined;
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;

              const isIncome = tx.type === 'INCOME';
              const isExpense = tx.type === 'EXPENSE';
              const isTransfer = tx.type === 'TRANSFER';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight size={17} />
                      ) : isExpense ? (
                        <ArrowDownRight size={17} />
                      ) : (
                        <ArrowLeftRight size={17} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {tx.note}
                        </span>
                        {cat && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded hidden sm:inline-block ${
                              cat.pillar === 'NEEDS'
                                ? 'bg-teal-50 text-teal-700'
                                : cat.pillar === 'WANTS'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {cat.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatShortDateID(tx.date)}
                        </span>
                        <span>•</span>
                        {isTransfer ? (
                          <span className="text-indigo-600 font-medium">
                            {fromW?.name} &rarr; {toW?.name}
                            {tx.adminFee ? ` (Fee: ${formatIDR(tx.adminFee)})` : ''}
                          </span>
                        ) : (
                          <span className="font-medium" style={{ color: fromW?.color || '#64748B' }}>
                            {fromW?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xs sm:text-sm font-extrabold tabular-numbers ${
                          isIncome
                            ? 'text-emerald-600'
                            : isExpense
                            ? 'text-rose-600'
                            : 'text-indigo-600'
                        }`}
                      >
                        {isIncome
                          ? `+${formatIDR(tx.amount)}`
                          : isExpense
                          ? `-${formatIDR(tx.amount)}`
                          : formatIDR(tx.amount)}
                      </div>
                      {isTransfer && tx.adminFee && tx.adminFee > 0 ? (
                        <div className="text-[10px] text-rose-500 font-medium tabular-numbers">
                          +Biaya: {formatIDR(tx.adminFee)}
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Hapus transaksi ini? Saldo dompet akan otomatis disesuaikan kembali.')) {
                          deleteTransaction(tx);
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                      title="Hapus Transaksi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
