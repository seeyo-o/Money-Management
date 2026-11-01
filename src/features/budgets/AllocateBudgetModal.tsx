import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { AllocationAction } from '../../services/budgetService';
import { SmartCurrencyInput } from '../../components/ui/SmartCurrencyInput';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { formatIDR } from '../../domain/formatters';

interface AllocateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBudgetId?: string;
  initialMode?: AllocationAction;
}

export const AllocateBudgetModal: React.FC<AllocateBudgetModalProps> = ({
  isOpen,
  onClose,
  defaultBudgetId,
  initialMode = 'SET_TOTAL',
}) => {
  const { categories, adjustBudgetAllocation } = useFinance();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [actionMode, setActionMode] = useState<AllocationAction>(initialMode);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [syncPlanCap, setSyncPlanCap] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // All categories available for allocation
  const allCategories = categories;

  const currentCategory = allCategories.find((c) => c.id === selectedBudgetId);
  const currentAllocated = currentCategory?.currentMonthAllocated || 0;
  const currentPlanCap = currentCategory?.monthlyPlanCap || currentCategory?.budgetLimit || 0;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNote('');
      setSyncPlanCap(true);

      const targetId = defaultBudgetId || (allCategories.length > 0 ? allCategories[0].id : '');
      setSelectedBudgetId(targetId);

      const cat = allCategories.find((c) => c.id === targetId);
      const catAlloc = cat?.currentMonthAllocated || 0;
      const catCap = cat?.monthlyPlanCap || cat?.budgetLimit || 0;

      if (initialMode === 'SET_TOTAL') {
        setActionMode('SET_TOTAL');
        // Pre-fill with current allocation or plan cap
        setAmount(catAlloc > 0 ? catAlloc : catCap);
      } else if (initialMode === 'WITHDRAW') {
        setActionMode('WITHDRAW');
        // If allocation exceeds plan cap, suggest withdrawing the excess
        const excess = Math.max(0, catAlloc - catCap);
        setAmount(excess > 0 ? excess : catAlloc);
      } else {
        setActionMode('TOP_UP');
        setAmount(catCap > 0 ? catCap : 0);
      }
    }
  }, [isOpen, defaultBudgetId, initialMode, categories]);

  if (!isOpen) return null;

  const handleCategorySelect = (id: string) => {
    setSelectedBudgetId(id);
    const cat = allCategories.find((c) => c.id === id);
    const catAlloc = cat?.currentMonthAllocated || 0;
    const catCap = cat?.monthlyPlanCap || cat?.budgetLimit || 0;

    if (actionMode === 'SET_TOTAL') {
      setAmount(catAlloc > 0 ? catAlloc : catCap);
    } else if (actionMode === 'WITHDRAW') {
      const excess = Math.max(0, catAlloc - catCap);
      setAmount(excess > 0 ? excess : catAlloc);
    } else {
      setAmount(catCap > 0 ? catCap : 0);
    }
  };

  const handleModeChange = (mode: AllocationAction) => {
    setActionMode(mode);
    setError(null);
    if (mode === 'SET_TOTAL') {
      setAmount(currentAllocated > 0 ? currentAllocated : currentPlanCap);
    } else if (mode === 'WITHDRAW') {
      const excess = Math.max(0, currentAllocated - currentPlanCap);
      setAmount(excess > 0 ? excess : currentAllocated);
    } else {
      setAmount(currentPlanCap > 0 ? currentPlanCap : 0);
    }
  };

  // Calculations for live preview
  let calculatedNewAllocation = currentAllocated;
  let deltaEffect = 0; // positive: added from free cash, negative: returned to free cash

  if (actionMode === 'SET_TOTAL') {
    calculatedNewAllocation = Math.max(0, amount);
    deltaEffect = calculatedNewAllocation - currentAllocated;
  } else if (actionMode === 'WITHDRAW') {
    calculatedNewAllocation = Math.max(0, currentAllocated - amount);
    deltaEffect = -Math.min(currentAllocated, amount);
  } else if (actionMode === 'TOP_UP') {
    calculatedNewAllocation = currentAllocated + amount;
    deltaEffect = amount;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBudgetId) {
      setError('Pilih kategori anggaran.');
      return;
    }

    if (actionMode === 'WITHDRAW') {
      if (amount <= 0) {
        setError('Masukkan nominal penarikan lebih dari Rp 0.');
        return;
      }
      if (amount > currentAllocated) {
        setError(
          `Nominal penarikan (Rp ${amount.toLocaleString('id-ID')}) melebihi alokasi yang tersedia (Rp ${currentAllocated.toLocaleString('id-ID')}).`
        );
        return;
      }
    } else if (actionMode === 'TOP_UP') {
      if (amount <= 0) {
        setError('Masukkan nominal setoran tambahan lebih dari Rp 0.');
        return;
      }
    } else if (actionMode === 'SET_TOTAL') {
      if (amount < 0) {
        setError('Total alokasi tidak boleh negatif.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await adjustBudgetAllocation(
        selectedBudgetId,
        actionMode,
        amount,
        note.trim() || undefined,
        actionMode === 'SET_TOTAL' ? syncPlanCap : false
      );
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal memperbarui alokasi anggaran.');
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
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Kelola & Alokasi Anggaran Bulanan</h2>
              <p className="text-xs text-slate-500">
                Atur total alokasi, setor tambahan, atau tarik dana berlebih kembali ke Saldo Bebas
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
              Pilih Kategori Anggaran
            </label>
            <select
              value={selectedBudgetId}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
            >
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.pillar}) - Alokasi: {formatIDR(c.currentMonthAllocated || 0)} | Plafon: {formatIDR(c.monthlyPlanCap || c.budgetLimit || 0)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Kartu Kategori Terpilih */}
          {currentCategory && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: currentCategory.color }}
                  >
                    <IconRenderer name={currentCategory.iconName} size={13} />
                  </div>
                  <span>{currentCategory.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white border border-slate-200 text-slate-700">
                  {currentCategory.pillar}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Alokasi Bulan Ini:</span>
                  <span className="font-extrabold text-slate-900 tabular-numbers text-xs">
                    {formatIDR(currentAllocated)}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Plafon Rencana:</span>
                  <span className="font-extrabold text-slate-700 tabular-numbers text-xs">
                    {formatIDR(currentPlanCap)}
                  </span>
                </div>
              </div>

              {/* Excess warning badge if allocated > planCap */}
              {currentAllocated > currentPlanCap && currentPlanCap > 0 && (
                <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-800 font-medium">
                  <AlertCircle size={13} className="text-amber-600 shrink-0" />
                  <span>
                    Alokasi saat ini melebihi plafon sebesar <strong>{formatIDR(currentAllocated - currentPlanCap)}</strong>. Gunakan tab <em>Atur Total</em> atau <em>Tarik Dana (-)</em> di bawah untuk mengembalikannya ke Saldo Bebas.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Mode Selector (3 Tabs) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Tindakan Alokasi
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeChange('SET_TOTAL')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  actionMode === 'SET_TOTAL'
                    ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders size={13} />
                <span>Atur Total</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('WITHDRAW')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  actionMode === 'WITHDRAW'
                    ? 'bg-white text-rose-800 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownCircle size={13} />
                <span>Tarik Dana (-)</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('TOP_UP')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  actionMode === 'TOP_UP'
                    ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpCircle size={13} />
                <span>Setor (+)</span>
              </button>
            </div>
          </div>

          {/* Mode Description & Input */}
          <div className="space-y-3">
            {actionMode === 'SET_TOTAL' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Total Alokasi Baru Bulan Ini (Rp)
                  </label>
                  {currentPlanCap > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentPlanCap)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      Set ke Plafon ({formatIDR(currentPlanCap)})
                    </button>
                  )}
                </div>
                <SmartCurrencyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">
                  Ketik nominal total akhir yang Anda inginkan (misal: <strong>Rp 400.000</strong>). Sistem akan otomatis menghitung selisih dan menarik kelebihan uang kembali ke Saldo Bebas.
                </p>

                {/* Checkbox sync plan cap */}
                <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncPlanCap}
                    onChange={(e) => setSyncPlanCap(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  />
                  <span>
                    Sinkronkan juga Plafon Batas Anggaran (monthlyPlanCap) menjadi <strong>{formatIDR(amount)}</strong>
                  </span>
                </label>
              </div>
            )}

            {actionMode === 'WITHDRAW' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Nominal yang Ingin Ditarik Kembali (Rp)
                  </label>
                  {currentAllocated > currentPlanCap && currentPlanCap > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentAllocated - currentPlanCap)}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                    >
                      <RotateCcw size={11} />
                      Tarik Kelebihan ({formatIDR(currentAllocated - currentPlanCap)})
                    </button>
                  )}
                </div>
                <SmartCurrencyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  autoFocus
                />
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setAmount(currentAllocated)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Tarik Semua ({formatIDR(currentAllocated)})
                  </button>
                  {currentAllocated >= 350000 && (
                    <button
                      type="button"
                      onClick={() => setAmount(350000)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Tarik Rp 350.000
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Uang yang ditarik akan langsung keluar dari alokasi budget dan kembali menjadi <strong>Saldo Bebas (Free Cash)</strong> yang siap dibelanjakan atau dialokasikan ulang.
                </p>
              </div>
            )}

            {actionMode === 'TOP_UP' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Nominal Setoran Tambahan (Rp)
                  </label>
                  {currentPlanCap > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentPlanCap)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      Gunakan Plafon ({formatIDR(currentPlanCap)})
                    </button>
                  )}
                </div>
                <SmartCurrencyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">
                  Nominal ini akan ditambahkan di atas alokasi yang sudah ada sebelumnya.
                </p>
              </div>
            )}
          </div>

          {/* Live Impact Preview Box */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pratinjau Dampak Finansial
            </span>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Alokasi Saat Ini:</span>
              <span className="text-slate-800 tabular-numbers">{formatIDR(currentAllocated)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-1">
                <ArrowRight size={13} className="text-teal-600" />
                Alokasi Baru Bulan Ini:
              </span>
              <span className="text-teal-800 tabular-numbers text-sm">
                {formatIDR(calculatedNewAllocation)}
              </span>
            </div>

            {/* Impact on Free Cash */}
            <div className="pt-2 border-t border-slate-200/60 text-xs">
              {deltaEffect < 0 ? (
                <div className="flex items-start gap-1.5 text-emerald-800 font-semibold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/80">
                  <ShieldCheck size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    Dana sebesar <strong>{formatIDR(Math.abs(deltaEffect))}</strong> akan ditarik kembali dan masuk ke <strong>Saldo Bebas (Free Cash)</strong>.
                  </span>
                </div>
              ) : deltaEffect > 0 ? (
                <div className="flex items-start gap-1.5 text-teal-800 font-semibold bg-teal-50/80 p-2 rounded-lg border border-teal-200/80">
                  <ArrowUpCircle size={14} className="shrink-0 text-teal-600 mt-0.5" />
                  <span>
                    Dana tambahan sebesar <strong>{formatIDR(deltaEffect)}</strong> akan dialokasikan dari Saldo Bebas.
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  Tidak ada perubahan saldo alokasi kas.
                </span>
              )}
            </div>
          </div>

          {/* Catatan / Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan / Memo (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                actionMode === 'SET_TOTAL'
                  ? 'Contoh: Koreksi penyesuaian nominal safety net'
                  : actionMode === 'WITHDRAW'
                  ? 'Contoh: Tarik kembali kelebihan alokasi'
                  : 'Contoh: Setoran alokasi rutin bulanan'
              }
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
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                actionMode === 'WITHDRAW'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              {isSubmitting ? (
                'Menyimpan...'
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>
                    {actionMode === 'SET_TOTAL'
                      ? 'Simpan Koreksi Alokasi'
                      : actionMode === 'WITHDRAW'
                      ? 'Tarik Dana ke Saldo Bebas'
                      : 'Simpan Setoran Alokasi'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
