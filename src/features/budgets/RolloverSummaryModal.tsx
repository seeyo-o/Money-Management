import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Archive,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIDR } from '../../domain/formatters';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { simulateCategoryRollover } from '../../domain/budgetEngine';

interface RolloverSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RolloverSummaryModal: React.FC<RolloverSummaryModalProps> = ({ isOpen, onClose }) => {
  const { categories, transactions, selectedMonth, triggerMonthEndRollover } = useFinance();

  // Compute previous month string (e.g. if selectedMonth is 2026-11, prev is 2026-10)
  const prevMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const [fromPeriod, setFromPeriod] = useState<string>(prevMonthStr);
  const [toPeriod, setToPeriod] = useState<string>(selectedMonth);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate actual spending in fromPeriod for each category
  const rolloverSimulations = useMemo(() => {
    const prevTxs = transactions.filter((t) => t.date.startsWith(fromPeriod));
    const spentMap: Record<string, number> = {};

    prevTxs.forEach((t) => {
      if (t.type === 'EXPENSE' && t.categoryId && !t.isVaultSpend) {
        spentMap[t.categoryId] = (spentMap[t.categoryId] || 0) + t.amount;
      }
    });

    return categories.map((cat) => {
      const spent = spentMap[cat.id] || 0;
      const sim = simulateCategoryRollover(cat, spent);
      return {
        category: cat,
        spent,
        ...sim,
      };
    });
  }, [categories, transactions, fromPeriod]);

  const totalLeftoverToVault = useMemo(() => {
    return rolloverSimulations.reduce((sum, item) => sum + Math.max(0, item.leftover), 0);
  }, [rolloverSimulations]);

  if (!isOpen) return null;

  const handleExecuteRollover = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await triggerMonthEndRollover(fromPeriod, toPeriod);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menjalankan tutup buku rollover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tutup Buku & Rollover Cadangan Brankas
              </h2>
              <p className="text-xs text-slate-500">
                Transisi otomatis sisa anggaran periode lalu ke brankas akumulasi
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
              <span>Prinsip Akuntansi: Strict-Cap Rollover Reserve</span>
            </div>
            <p className="text-indigo-800">
              Sisa uang dari alokasi bulan lalu <strong>TIDAK HANGUS</strong> dan otomatis dialirkan ke dalam Brankas Akumulasi Cadangan (Vault). Sesuai aturan disiplin, sisa ini <strong>TIDAK AKAN</strong> menaikkan limit belanja bulan baru demi mencegah inflasi gaya hidup (Lifestyle Creep).
            </p>
          </div>

          {/* Period Selector */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Tutup Periode Bulan Lalu:</label>
              <input
                type="month"
                value={fromPeriod}
                onChange={(e) => setFromPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Buka Periode Bulan Baru:</label>
              <input
                type="month"
                value={toPeriod}
                onChange={(e) => setToPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Total Leftover Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-teal-400" />
              <span className="text-xs font-semibold">Total Sisa Masuk Brankas (Vault):</span>
            </div>
            <span className="text-sm font-extrabold text-teal-300 tabular-numbers">
              +{formatIDR(totalLeftoverToVault)}
            </span>
          </div>

          {/* Simulation Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Rincian Per Kategori Anggaran ({fromPeriod}):
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {rolloverSimulations.map((item) => {
                const cat = item.category;
                const allocated = cat.currentMonthAllocated || cat.monthlyPlanCap || 0;
                return (
                  <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <IconRenderer name={cat.iconName} size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{cat.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {cat.budgetMode === 'SINKING_FUND' ? 'Sinking Fund' : 'Strict Cap'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Alokasi: {formatIDR(allocated)} • Terpakai: {formatIDR(item.spent)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-extrabold tabular-numbers block ${
                          item.leftover > 0 ? 'text-teal-600' : 'text-slate-500'
                        }`}
                      >
                        {item.leftover > 0 ? `+${formatIDR(item.leftover)}` : formatIDR(0)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Total Brankas: {formatIDR(item.newVaultReserve)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleExecuteRollover}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              'Memproses Tutup Buku...'
            ) : (
              <>
                <CheckCircle2 size={15} />
                Eksekusi Rollover ke {toPeriod}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
