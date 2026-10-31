import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Lock,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SmartCurrencyInput } from '../../components/ui/SmartCurrencyInput';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { formatIDR } from '../../domain/formatters';
import { calculateWorstCaseReallocationImpact } from '../../domain/budgetEngine';

interface EmergencyReallocateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyReallocateModal: React.FC<EmergencyReallocateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, performEmergencyReallocation } = useFinance();

  const [fromBudgetId, setFromBudgetId] = useState<string>('');
  const [toBudgetId, setToBudgetId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible source categories are those with positive accumulated reserve or allocation
  const sourceCandidates = useMemo(() => {
    return categories.filter(
      (c) => (c.accumulatedVaultReserve || 0) + (c.currentMonthAllocated || 0) > 0
    );
  }, [categories]);

  // Target candidates: all categories except the selected source
  const targetCandidates = useMemo(() => {
    return categories.filter((c) => c.id !== fromBudgetId);
  }, [categories, fromBudgetId]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount(0);
      setReason('');

      // Auto-select initial categories
      const sinking = sourceCandidates.find((c) => c.budgetMode === 'SINKING_FUND');
      const initialFrom = sinking ? sinking.id : (sourceCandidates[0]?.id || '');
      setFromBudgetId(initialFrom);

      const initialTo = categories.find((c) => c.id !== initialFrom && c.pillar === 'NEEDS')?.id ||
        categories.find((c) => c.id !== initialFrom)?.id ||
        '';
      setToBudgetId(initialTo);
    }
  }, [isOpen, sourceCandidates, categories]);

  if (!isOpen) return null;

  const fromCat = categories.find((c) => c.id === fromBudgetId);
  const toCat = categories.find((c) => c.id === toBudgetId);

  // Compute real-time impact
  const impact =
    fromCat && toCat
      ? calculateWorstCaseReallocationImpact(fromCat, toCat, amount)
      : null;

  const isFormValid =
    impact?.isValid &&
    !impact.isWantsTarget &&
    amount > 0 &&
    reason.trim().length >= 10 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromBudgetId || !toBudgetId) {
      setError('Pilih budget asal dan budget tujuan.');
      return;
    }

    if (!impact || !impact.isValid) {
      setError(impact?.errorMessage || 'Validasi realokasi gagal.');
      return;
    }

    if (impact.isWantsTarget) {
      setError('Dilarang keras mengorbankan dana darurat/sinking fund untuk kebutuhan Gaya Hidup (Wants).');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Alasan darurat wajib diisi minimal 10 karakter untuk pertanggungjawaban audit keuangan.');
      return;
    }

    setIsSubmitting(true);
    try {
      await performEmergencyReallocation(fromBudgetId, toBudgetId, amount, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal mengeksekusi realokasi darurat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Urgent Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-300">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                Realokasi Darurat Antar-Budget (Worst-Case)
              </h2>
              <p className="text-xs text-rose-700">
                Pinjam / alihkan dana dari brankas tabungan untuk kebutuhan darurat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100/70 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-300 rounded-xl">
              <AlertOctagon size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Severe Financial Warning Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>PERINGATAN DISIPLIN FINANSIAL: Skenario Terburuk (Worst-Case)</span>
            </div>
            <p className="text-amber-800">
              Mengambil dana dari tabungan budget lain (seperti Sinking Fund Service Motor/Pajak) adalah tindakan berisiko tinggi. Setiap rupiah yang ditarik akan menunda kesiapan finansial Anda saat kejadian mendesak yang direncanakan akhirnya terjadi.
            </p>
          </div>

          {/* Source and Target Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ambil Dari Budget (Sumber Cadangan):
              </label>
              <select
                value={fromBudgetId}
                onChange={(e) => setFromBudgetId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
              >
                {sourceCandidates.map((c) => {
                  const available = (c.accumulatedVaultReserve || 0) + (c.currentMonthAllocated || 0);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.budgetMode === 'SINKING_FUND' ? 'Sinking' : 'Rutin'}) - Tersedia: {formatIDR(available)}
                    </option>
                  );
                })}
              </select>
              {fromCat && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Cadangan Brankas: <span className="font-bold text-slate-700 tabular-numbers">{formatIDR(fromCat.accumulatedVaultReserve || 0)}</span>
                </p>
              )}
            </div>

            {/* Target */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pindahkan Ke Budget (Tujuan):
              </label>
              <select
                value={toBudgetId}
                onChange={(e) => setToBudgetId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
              >
                {targetCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.pillar}) - Plafon: {formatIDR(c.monthlyPlanCap || c.budgetLimit)}
                  </option>
                ))}
              </select>
              {toCat && (
                <div className="flex items-center gap-1.5 text-[11px] mt-1 font-semibold">
                  <span className="text-slate-500">Pilar Tujuan:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      toCat.pillar === 'WANTS'
                        ? 'bg-rose-100 text-rose-800'
                        : toCat.pillar === 'NEEDS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {toCat.pillar}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hard Block If Target is WANTS */}
          {impact?.isWantsTarget && (
            <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-950 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <Lock size={15} className="text-rose-700 shrink-0" />
                <span>PELANGGARAN ATURAN FINANSIAL KRITIS: TARGET WANTS DIBLOKIR</span>
              </div>
              <p className="text-rose-800 text-[11px]">
                Sistem menolak realokasi ini. Mengambil dana darurat / sinking fund untuk membiayai kategori hiburan atau gaya hidup (Wants) melanggar prinsip dasar pengelolaan keuangan sehat.
              </p>
            </div>
          )}

          {/* Nominal Transfer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Nominal yang Dipinjam / Dialihkan</label>
              {impact && impact.currentFromReserve > 0 && (
                <span className="text-[11px] text-slate-500">
                  Maksimal:{' '}
                  <button
                    type="button"
                    onClick={() => setAmount(impact.currentFromReserve)}
                    className="font-bold text-teal-700 hover:underline"
                  >
                    {formatIDR(impact.currentFromReserve)}
                  </button>
                </span>
              )}
            </div>
            <SmartCurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              autoFocus
            />
          </div>

          {/* Impact Analysis Card */}
          {impact && amount > 0 && !impact.isWantsTarget && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <TrendingDown size={15} className="text-rose-500" />
                  Kalkulasi Pengorbanan Disiplin Finansial
                </span>
                <span className="text-rose-600 font-extrabold tabular-numbers">
                  -{formatIDR(amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Cadangan Brankas Asal:</span>
                  <div className="flex items-center gap-1 font-bold text-slate-800 mt-0.5">
                    <span className="tabular-numbers">{formatIDR(impact.currentFromReserve)}</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className="text-rose-600 tabular-numbers">
                      {formatIDR(impact.projectedFromReserve)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Waktu Disiplin Dikorbankan:</span>
                  <span className="font-extrabold text-rose-600 mt-0.5 block">
                    {impact.sacrificedMonthsOfSaving} Bulan Setoran
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-medium bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                {impact.impactMessage}
              </p>
            </div>
          )}

          {/* Mandatory Reason (Audit Trail) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan Realokasi Darurat (Wajib Diisi - Minimal 10 Karakter):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Tagihan listrik melonjak dan tabungan darurat utama belum siap, terpaksa meminjam alokasi service motor bulan ini..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500 placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>Alasan akan dicatat permanen dalam Buku Kas & Audit Trail.</span>
              <span className={reason.trim().length >= 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {reason.trim().length}/10 karakter
              </span>
            </div>
          </div>

          {/* Action Footer */}
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
              disabled={!isFormValid}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Memproses Realokasi...'
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Eksekusi Realokasi Darurat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
