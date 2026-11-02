import React, { useState } from 'react';
import {
  Plus,
  SlidersHorizontal,
  Landmark,
  Smartphone,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  X,
  Check,
  ArrowDown,
  ArrowUp,
  Vault,
  RotateCcw,
  AlertTriangle,
  Cloud,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { Wallet, WalletCategory } from '../../domain/types';
import { formatIDR } from '../../domain/formatters';
import { SmartCurrencyInput } from '../../components/ui/SmartCurrencyInput';
import { CloudSyncModal } from '../../components/ui/CloudSyncModal';

export const WalletsPage: React.FC = () => {
  const {
    wallets,
    transactions,
    selectedMonth,
    addWallet,
    reconcileWallet,
    cashAllocation,
    resetAllDataToZero,
  } = useFinance();

  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [reconcilingWallet, setReconcilingWallet] = useState<Wallet | null>(null);
  const [actualBalance, setActualBalance] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState<string>('');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletCategory, setNewWalletCategory] = useState<WalletCategory>('BANK');
  const [newWalletNumber, setNewWalletNumber] = useState('');
  const [newWalletInitialBalance, setNewWalletInitialBalance] = useState(0);
  const [newWalletColor, setNewWalletColor] = useState('#0060AF');

  // Compute per-wallet statistics for selected month
  const monthTxs = transactions.filter((tx) => tx.date.startsWith(selectedMonth));

  const walletStats: Record<string, { in: number; out: number; count: number }> = {};
  wallets.forEach((w) => {
    walletStats[w.id] = { in: 0, out: 0, count: 0 };
  });

  monthTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      if (walletStats[tx.walletId]) {
        walletStats[tx.walletId].in += tx.amount;
        walletStats[tx.walletId].count += 1;
      }
    } else if (tx.type === 'EXPENSE') {
      if (walletStats[tx.walletId]) {
        walletStats[tx.walletId].out += tx.amount;
        walletStats[tx.walletId].count += 1;
      }
    } else if (tx.type === 'TRANSFER') {
      // Source
      if (walletStats[tx.walletId]) {
        walletStats[tx.walletId].out += tx.amount + (tx.adminFee || 0);
        walletStats[tx.walletId].count += 1;
      }
      // Target
      if (tx.toWalletId && walletStats[tx.toWalletId]) {
        walletStats[tx.toWalletId].in += tx.amount;
        walletStats[tx.toWalletId].count += 1;
      }
    }
  });

  // Separate Bank Wallets vs E-Wallet / Cash
  const bankWallets = wallets.filter((w) => w.category === 'BANK');
  const ewalletsAndCash = wallets.filter((w) => w.category !== 'BANK');

  const handleOpenReconcile = (w: Wallet) => {
    setReconcilingWallet(w);
    setActualBalance(w.balance);
    setReconcileNote('');
  };

  const handleSaveReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingWallet) return;
    await reconcileWallet(reconcilingWallet, actualBalance, reconcileNote.trim() || undefined);
    setReconcilingWallet(null);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    await addWallet({
      name: newWalletName.trim(),
      category: newWalletCategory,
      accountNumber: newWalletNumber.trim() || undefined,
      balance: newWalletInitialBalance,
      color: newWalletColor,
      iconName: newWalletCategory === 'BANK' ? 'Building2' : newWalletCategory === 'EWALLET' ? 'Smartphone' : 'Banknote',
    });

    setIsAddOpen(false);
    setNewWalletName('');
    setNewWalletNumber('');
    setNewWalletInitialBalance(0);
  };

  const handleResetToZero = async () => {
    setIsResetting(true);
    try {
      await resetAllDataToZero();
      setIsResetConfirmOpen(false);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const renderWalletCard = (w: Wallet) => {
    const stats = walletStats[w.id] || { in: 0, out: 0, count: 0 };

    return (
      <div
        key={w.id}
        className="bento-card p-5 relative overflow-hidden flex flex-col justify-between"
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: w.color }}
        ></div>

        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: w.color }}
              >
                {w.category === 'BANK' ? (
                  <Landmark size={15} />
                ) : w.category === 'EWALLET' ? (
                  <Smartphone size={15} />
                ) : (
                  <Banknote size={15} />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">{w.name}</h3>
                <span className="text-[10px] font-semibold text-slate-400">
                  {w.accountNumber || (w.category === 'BANK' ? 'Rekening Bank' : 'Dompet Digital')}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenReconcile(w)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Sesuaikan Saldo (Rekonsiliasi)"
            >
              <SlidersHorizontal size={11} />
              <span>Rekonsiliasi</span>
            </button>
          </div>

          <div className="my-2">
            <span className="text-[10px] text-slate-400 font-medium">Saldo Aktual:</span>
            <div className="text-xl font-black text-slate-900 tabular-numbers">
              {formatIDR(w.balance)}
            </div>
          </div>
        </div>

        {/* Month Stats */}
        <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1 text-[11px]">
              <ArrowDownLeft size={12} className="text-emerald-500" /> Uang Masuk:
            </span>
            <span className="font-bold text-emerald-600 tabular-numbers">
              +{formatIDR(stats.in)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1 text-[11px]">
              <ArrowUpRight size={12} className="text-rose-500" /> Uang Keluar:
            </span>
            <span className="font-bold text-rose-600 tabular-numbers">
              -{formatIDR(stats.out)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Receipt size={11} /> Frekuensi Transaksi:
            </span>
            <span className="font-semibold text-slate-700">{stats.count}x transaksi</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Manajemen Dompet & Rekonsiliasi Saldo
          </h2>
          <p className="text-xs text-slate-500">
            Pemisahan saldo perbankan utama dan uang operasional dompet digital
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCloudSyncOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-subtle transition"
            title="Sinkronisasi Cloud & Cadangan JSON"
          >
            <Cloud size={14} className="text-teal-700" />
            <span>Sinkronisasi / Cadangan</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold shadow-subtle transition"
            title="Kosongkan seluruh saldo, transaksi, dan budget ke nol"
          >
            <RotateCcw size={14} />
            <span>Kosongkan & Mulai dari Nol</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus size={15} className="text-teal-400" />
            <span>Tambah Akun / Dompet</span>
          </button>
        </div>
      </div>

      {/* Dual-Balance Cash Allocation Summary */}
      <div className="bento-card p-5 bg-gradient-to-br from-white via-slate-50/70 to-slate-100/50 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Vault size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">
                Pemisahan Saldo Fisik vs Alokasi Budget Terikat
              </span>
              <p className="text-[11px] text-slate-500">
                Mencegah ilusi saldo rekening: Bedakan kas bebas dan kas yang sudah dialokasikan ke pos kebutuhan
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              cashAllocation.isDeficit
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {cashAllocation.isDeficit ? 'Defisit Likuiditas' : 'Likuiditas Kas Terjaga'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-500 block">Total Saldo Kas Fisik</span>
            <span className="text-sm font-black text-slate-900 tabular-numbers mt-0.5 block">
              {formatIDR(cashAllocation.totalPhysicalCash)}
            </span>
            <span className="text-[10px] text-slate-400">Total uang di bank, e-wallet & kas</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-subtle">
            <span className="text-[11px] font-medium text-teal-700 block">Dana Terikat Budget & Sinking Fund</span>
            <span className="text-sm font-black text-teal-800 tabular-numbers mt-0.5 block">
              {formatIDR(cashAllocation.totalAllocatedVaultLocked)}
            </span>
            <span className="text-[10px] text-teal-600">Locked di brankas cadangan & alokasi</span>
          </div>

          <div
            className={`p-3 rounded-xl border shadow-subtle ${
              cashAllocation.isDeficit ? 'bg-rose-50 border-rose-300' : 'bg-white border-indigo-200'
            }`}
          >
            <span
              className={`text-[11px] font-medium block ${
                cashAllocation.isDeficit ? 'text-rose-700' : 'text-indigo-700'
              }`}
            >
              Saldo Bebas (Siap Dialokasikan)
            </span>
            <span
              className={`text-sm font-black tabular-numbers mt-0.5 block ${
                cashAllocation.isDeficit ? 'text-rose-700' : 'text-indigo-900'
              }`}
            >
              {formatIDR(cashAllocation.unallocatedFreeCash)}
            </span>
            <span
              className={`text-[10px] ${
                cashAllocation.isDeficit ? 'text-rose-600 font-semibold' : 'text-indigo-500'
              }`}
            >
              {cashAllocation.isDeficit
                ? 'Anggaran terikat melebihi saldo kas fisik!'
                : 'Uang dingin bebas kewajiban'}
            </span>
          </div>
        </div>
      </div>

      {/* Group 1: Bank Utama */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#0060AF]"></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Rekening Bank Utama (BCA, CIMB Niaga)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankWallets.map(renderWalletCard)}
        </div>
      </div>

      {/* Group 2: E-Wallet & Kas */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]"></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            E-Wallet Harian & Kas Tunai (OVO, GoPay, ShopeePay, DANA, Tunai)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ewalletsAndCash.map(renderWalletCard)}
        </div>
      </div>

      {/* Reconcile Modal */}
      {reconcilingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: reconcilingWallet.color }}
                >
                  <SlidersHorizontal size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sesuaikan Saldo (Rekonsiliasi)</h3>
                  <p className="text-xs text-slate-500">{reconcilingWallet.name}</p>
                </div>
              </div>
              <button
                onClick={() => setReconcilingWallet(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReconcile} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Saldo di Sistem:</span>
                <span className="text-xs font-bold text-slate-900 tabular-numbers">
                  {formatIDR(reconcilingWallet.balance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Saldo Aktual Saat Ini (Sesuai Aplikasi Mobile / Fisik)
                </label>
                <SmartCurrencyInput
                  value={actualBalance}
                  onChange={setActualBalance}
                  placeholder="0"
                  autoFocus
                />
              </div>

              {/* Difference analysis */}
              {actualBalance !== reconcilingWallet.balance && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    actualBalance > reconcilingWallet.balance
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {actualBalance > reconcilingWallet.balance ? (
                      <ArrowUp size={14} className="text-emerald-600" />
                    ) : (
                      <ArrowDown size={14} className="text-rose-600" />
                    )}
                    <span>
                      {actualBalance > reconcilingWallet.balance
                        ? 'Penyesuaian Tambah (Pemasukan)'
                        : 'Penyesuaian Kurang (Pengeluaran)'}
                    </span>
                  </div>
                  <strong className="tabular-numbers">
                    {actualBalance > reconcilingWallet.balance ? '+' : ''}
                    {formatIDR(actualBalance - reconcilingWallet.balance)}
                  </strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan Rekonsiliasi (Opsional)
                </label>
                <input
                  type="text"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Misal: Bunga bank, admin bulanan, atau lupa catat"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReconcilingWallet(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actualBalance === reconcilingWallet.balance}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>Simpan Penyesuaian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Wallet Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900">Tambah Akun / Dompet Baru</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Akun / Dompet
                </label>
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="Misal: Bank Jago, SeaBank, LinkAja"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kategori Akun
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Bank', val: 'BANK' as WalletCategory },
                    { label: 'E-Wallet', val: 'EWALLET' as WalletCategory },
                    { label: 'Tunai', val: 'CASH' as WalletCategory },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setNewWalletCategory(t.val)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        newWalletCategory === t.val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Rekening / HP (Opsional)
                </label>
                <input
                  type="text"
                  value={newWalletNumber}
                  onChange={(e) => setNewWalletNumber(e.target.value)}
                  placeholder="Contoh: 8220-xxxx-xx atau 0812-xxxx-xxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Saldo Awal
                </label>
                <SmartCurrencyInput
                  value={newWalletInitialBalance}
                  onChange={setNewWalletInitialBalance}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Warna Identitas
                </label>
                <div className="flex items-center gap-2">
                  {['#0060AF', '#DC2626', '#00AED6', '#6D28D9', '#EA580C', '#118EEA', '#059669', '#334155'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewWalletColor(hex)}
                      className={`w-6 h-6 rounded-full transition ${
                        newWalletColor === hex ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Tambah Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kosongkan Semua Data ke Nol?</h3>
                <p className="text-xs text-slate-500">Mulai pembukuan fresh dari awal</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              Tindakan ini akan mengosongkan seluruh saldo dompet ke <strong>Rp 0</strong>, menghapus seluruh riwayat transaksi, dan mereset plafon budget ke <strong>Rp 0</strong> sehingga Anda bisa mengisi data riil Anda sendiri dari awal secara manual.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetToZero}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isResetting ? 'Mengosongkan...' : 'Ya, Kosongkan Semua Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync & Backup Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
      />
    </div>
  );
};
