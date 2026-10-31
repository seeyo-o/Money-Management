import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SmartCurrencyInput } from '../../components/ui/SmartCurrencyInput';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { formatIDR } from '../../domain/formatters';

interface AllocateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBudgetId?: string;
}

export const AllocateBudgetModal: React.FC<AllocateBudgetModalProps> = ({
  isOpen,
  onClose,
  defaultBudgetId,
}) => {
  const { categories, allocateBudget } = useFinance();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('Setoran alokasi rutin bulanan');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter categories that have budgeting configured
  const budgetCategories = categories.filter((c) => c.monthlyPlanCap > 0 || c.budgetLimit > 0);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount(0);
      setNote('Setoran alokasi rutin bulanan');
      if (defaultBudgetId) {
        setSelectedBudgetId(defaultBudgetId);
        const target = budgetCategories.find((c) => c.id === defaultBudgetId);
        if (target) {
          setAmount(target.monthlyPlanCap || target.budgetLimit || 0);
        }
      } else if (budgetCategories.length > 0) {
        setSelectedBudgetId(budgetCategories[0].id);
        setAmount(budgetCategories[0].monthlyPlanCap || budgetCategories[0].budgetLimit || 0);
      }
    }
  }, [isOpen, defaultBudgetId]);

  if (!isOpen) return null;

  const currentCategory = budgetCategories.find((c) => c.id === selectedBudgetId);

  const handleCategorySelect = (id: string) => {
    setSelectedBudgetId(id);
    const cat = budgetCategories.find((c) => c.id === id);
    if (cat) {
      setAmount(cat.monthlyPlanCap || cat.budgetLimit || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBudgetId) {
      setError('Pilih kategori anggaran.');
      return;
    }

    if (amount <= 0) {
      setError('Masukkan nominal setoran alokasi lebih dari Rp 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await allocateBudget(selectedBudgetId, amount, note.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyimpan setoran alokasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <ArrowUpCircle size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Setor Alokasi Anggaran Bulanan</h2>
              <p className="text-xs text-slate-500">
                Alokasikan likuiditas kas fisik ke kuota atau tabungan sinking fund
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Pilih Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Kategori Target
            </label>
            <select
              value={selectedBudgetId}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
            >
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.budgetMode === 'SINKING_FUND' ? 'Tabungan Sinking Fund' : 'Rutin Strict Cap'}) - Plafon: {formatIDR(c.monthlyPlanCap || c.budgetLimit)}
                </option>
              ))}
            </select>
          </div>

          {/* Info Mode Kategori Terpilih */}
          {currentCategory && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                currentCategory.budgetMode === 'SINKING_FUND'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-teal-50/70 border-teal-200 text-teal-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="flex items-center gap-1.5">
                  <IconRenderer name={currentCategory.iconName} size={14} />
                  {currentCategory.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase bg-white/80 border border-current">
                  {currentCategory.budgetMode === 'SINKING_FUND' ? 'Sinking Fund' : 'Strict Cap Rutin'}
                </span>
              </div>
              {currentCategory.budgetMode === 'SINKING_FUND' ? (
                <div>
                  <p className="text-amber-800">
                    Setoran ini akan menambah akumulasi tabungan brankas jangka panjang.
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between font-semibold">
                    <span>Saldo Brankas Saat Ini:</span>
                    <span className="tabular-numbers">
                      {formatIDR(currentCategory.accumulatedVaultReserve || 0)}
                    </span>
                  </div>
                  {currentCategory.targetFundAmount && (
                    <div className="flex items-center justify-between text-[11px] text-amber-700 mt-0.5">
                      <span>Target Kebutuhan:</span>
                      <span className="tabular-numbers">
                        {formatIDR(currentCategory.targetFundAmount)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-teal-800">
                    Setoran rutin bulanan untuk menutupi belanja operasional bulan berjalan. Sisa anggaran akhir bulan akan otomatis disimpan ke cadangan brankas.
                  </p>
                  <div className="mt-2 pt-2 border-t border-teal-200/60 flex items-center justify-between font-semibold">
                    <span>Alokasi Terdaftar Bulan Ini:</span>
                    <span className="tabular-numbers">
                      {formatIDR(currentCategory.currentMonthAllocated || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nominal Alokasi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Nominal Setoran Alokasi</label>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => setAmount(currentCategory.monthlyPlanCap || currentCategory.budgetLimit)}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Gunakan Plafon ({formatIDR(currentCategory.monthlyPlanCap || currentCategory.budgetLimit)})
                </button>
              )}
            </div>
            <SmartCurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              autoFocus
            />
          </div>

          {/* Catatan / Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan / Memo Alokasi
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Setoran alokasi rutin bulanan"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Menyimpan...'
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Simpan Setoran Alokasi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
