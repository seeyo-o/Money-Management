import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Check, AlertCircle, Vault } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { TransactionType } from '../../domain/types';
import { SmartCurrencyInput } from '../../components/ui/SmartCurrencyInput';
import { IconRenderer } from '../../components/ui/IconRenderer';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  defaultWalletId?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'EXPENSE',
  defaultWalletId,
}) => {
  const { wallets, categories, addTransaction, selectedMonth } = useFinance();

  const getSmartDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedMonth && !today.startsWith(selectedMonth)) {
      return `${selectedMonth}-01`;
    }
    return today;
  };

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string>('');
  const [toWalletId, setToWalletId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [adminFee, setAdminFee] = useState<number>(0);
  const [isVaultSpend, setIsVaultSpend] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(getSmartDate);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmount(0);
      setAdminFee(0);
      setIsVaultSpend(false);
      setNote('');
      setError(null);
      setDate(getSmartDate());

      if (defaultWalletId) {
        setWalletId(defaultWalletId);
      } else if (wallets.length > 0) {
        setWalletId(wallets[0].id);
      }

      if (wallets.length > 1) {
        setToWalletId(wallets[1].id);
      }

      const expCats = categories.filter((c) => !c.id.includes('salary') && !c.id.includes('bonus'));
      if (expCats.length > 0) {
        setCategoryId(expCats[0].id);
      }
    }
  }, [isOpen, defaultType, defaultWalletId, wallets, categories]);

  if (!isOpen) return null;

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
  };

  const availableCategories =
    type === 'INCOME'
      ? categories.filter((c) => c.id.includes('salary') || c.id.includes('bonus') || c.id.includes('income'))
      : categories.filter((c) => !c.id.includes('salary') && !c.id.includes('bonus'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Masukkan nominal transaksi yang valid.');
      return;
    }

    if (!walletId) {
      setError('Pilih akun / dompet sumber.');
      return;
    }

    if (type === 'TRANSFER') {
      if (!toWalletId) {
        setError('Pilih akun / dompet tujuan transfer.');
        return;
      }
      if (walletId === toWalletId) {
        setError('Akun asal dan akun tujuan tidak boleh sama.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (type === 'TRANSFER') {
        await addTransaction({
          type: 'TRANSFER',
          amount,
          date,
          walletId,
          toWalletId,
          adminFee: adminFee > 0 ? adminFee : 0,
          note: note.trim() || 'Transfer Antar Dompet',
        });
      } else {
        await addTransaction({
          type,
          amount,
          date,
          walletId,
          categoryId: categoryId || undefined,
          note: note.trim() || (type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
          isVaultSpend: isVaultSpend && type === 'EXPENSE',
        });
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Catat Transaksi Cepat</h2>
            <p className="text-xs text-slate-500">Pencatatan real-time multi-dompet tanpa double counting</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 3 Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                setAdminFee(0);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                type === 'EXPENSE'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={15} />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                setAdminFee(0);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                type === 'INCOME'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={15} />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('TRANSFER');
                setAdminFee(1000);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                type === 'TRANSFER'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight size={15} />
              <span>Top-Up / Transfer</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nominal {type === 'TRANSFER' ? 'Pokok Transfer' : 'Transaksi'}
            </label>
            <SmartCurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="Contoh: 50.000 atau 50k"
              autoFocus
            />
          </div>

          {/* Transfer Fields */}
          {type === 'TRANSFER' ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">ℹ️ Bebas Double-Counting</span>
                Pokok transfer berpindah antar dompet tanpa dihitung sebagai beban bulanan. Hanya <strong>Biaya Admin</strong> yang dicatat sebagai pengeluaran operasional.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Dari Akun (Sumber)
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ke Akun (Tujuan)
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} disabled={w.id === walletId}>
                        {w.name} ({w.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Fee */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Biaya Admin Top-Up / Transfer (Opsional)
                  </label>
                  <span className="text-[11px] text-slate-400">Tercatat ke Biaya Admin Bank</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={adminFee === 0 ? '' : adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 tabular-numbers focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Rp 0', fee: 0 },
                      { label: '1.000', fee: 1000 },
                      { label: '1.500', fee: 1500 },
                      { label: '2.500', fee: 2500 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAdminFee(p.fee)}
                        className={`text-xs px-2.5 py-2 rounded-lg font-medium transition ${
                          adminFee === p.fee
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Income / Expense */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {type === 'INCOME' ? 'Masuk ke Akun' : 'Bayar Dari Akun'}
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kategori & Pilar
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleSelectCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.pillar})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {type === 'EXPENSE' && (
                <>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                      Kategori Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                      {categories
                        .filter((c) => !c.id.includes('salary') && !c.id.includes('bonus'))
                        .slice(0, 10)
                        .map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                              categoryId === cat.id
                                ? 'bg-teal-50 border border-teal-600 text-teal-800 font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                            }`}
                          >
                            <IconRenderer name={cat.iconName} size={12} />
                            <span>{cat.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Vault Spend Toggle */}
                  <div
                    className={`p-3 rounded-xl border text-xs transition ${
                      isVaultSpend
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVaultSpend}
                        onChange={(e) => setIsVaultSpend(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                      />
                      <div>
                        <span className="font-bold flex items-center gap-1.5 text-slate-900">
                          <Vault size={14} className={isVaultSpend ? 'text-amber-600' : 'text-slate-400'} />
                          Gunakan Saldo Cadangan Brankas (Spend from Vault Reserve)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Potong transaksi ini langsung dari saldo cadangan brankas akumulasi tanpa memotong kuota batas belanja bulanan.
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keterangan / Merchant
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Nasi Padang, Token Listrik, dll."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition disabled:opacity-50"
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
