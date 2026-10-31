import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowUpCircle,
  RotateCcw,
  Plus,
  TrendingDown,
  Vault,
  Calendar,
  Lock,
  Wallet as WalletIcon,
  HelpCircle,
  Archive,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { PillarType, Category, BudgetMode } from '../../domain/types';
import { formatIDR, parseSmartAmount } from '../../domain/formatters';
import { IconRenderer } from '../../components/ui/IconRenderer';
import { AllocateBudgetModal } from './AllocateBudgetModal';
import { EmergencyReallocateModal } from './EmergencyReallocateModal';
import { RolloverSummaryModal } from './RolloverSummaryModal';

export const BudgetsPage: React.FC = () => {
  const {
    categorySpendings,
    forecasting,
    monthSummary,
    cashAllocation,
    budgetLedger,
    updateBudgetLimit,
    selectedMonth,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<BudgetMode>('ROUTINE_STRICT_CAP');
  const [selectedPillar, setSelectedPillar] = useState<PillarType | 'ALL'>('ALL');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newLimitStr, setNewLimitStr] = useState<string>('');

  // Modals state
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState<boolean>(false);
  const [allocateDefaultBudgetId, setAllocateDefaultBudgetId] = useState<string | undefined>();
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState<boolean>(false);

  // Exclude non-budgetable categories (salary, bonus, balance adjustments)
  const budgetableCategories = useMemo(() => {
    return categorySpendings.filter(
      (c) =>
        !c.id.includes('salary') &&
        !c.id.includes('bonus') &&
        !c.id.includes('income') &&
        !c.id.includes('adjustment')
    );
  }, [categorySpendings]);

  // Separate routine vs sinking fund categories
  const routineCategories = useMemo(() => {
    return budgetableCategories.filter(
      (c) => (c.budgetMode || 'ROUTINE_STRICT_CAP') === 'ROUTINE_STRICT_CAP'
    );
  }, [budgetableCategories]);

  const sinkingFundCategories = useMemo(() => {
    return budgetableCategories.filter((c) => c.budgetMode === 'SINKING_FUND');
  }, [budgetableCategories]);

  // Tab categories
  const tabCategories = activeTab === 'ROUTINE_STRICT_CAP' ? routineCategories : sinkingFundCategories;

  const filteredCategories = useMemo(() => {
    if (selectedPillar === 'ALL') return tabCategories;
    return tabCategories.filter((c) => c.pillar === selectedPillar);
  }, [tabCategories, selectedPillar]);

  // Totals for routine
  const totalRoutineBudget = routineCategories.reduce(
    (sum, c) => sum + (c.monthlyPlanCap || c.budgetLimit || 0),
    0
  );
  const totalRoutineSpent = routineCategories.reduce((sum, c) => sum + c.currentMonthSpent, 0);
  const routinePercentage =
    totalRoutineBudget > 0 ? (totalRoutineSpent / totalRoutineBudget) * 100 : 0;

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setNewLimitStr(formatIDR(c.monthlyPlanCap || c.budgetLimit, false));
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const parsed = parseSmartAmount(newLimitStr);
    await updateBudgetLimit(editingCategory.id, parsed);
    setEditingCategory(null);
  };

  const openAllocateFor = (catId: string) => {
    setAllocateDefaultBudgetId(catId);
    setIsAllocateModalOpen(true);
  };

  // Recent emergency reallocations from budget ledger
  const emergencyLogs = budgetLedger.filter((l) => l.type === 'WORST_CASE_REALLOCATION');

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Perencanaan Anggaran & Sinking Fund
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem Dual-Balance: Kuota belanja disiplin ketat & akumulasi brankas cadangan terencana
          </p>
        </div>

        {/* Global Action Modals Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAllocateDefaultBudgetId(undefined);
              setIsAllocateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-sm transition"
          >
            <ArrowUpCircle size={15} />
            <span>Setor Alokasi Bulanan</span>
          </button>

          <button
            onClick={() => setIsRolloverModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-subtle transition"
          >
            <RotateCcw size={14} />
            <span>Tutup Buku / Rollover</span>
          </button>

          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
          >
            <ShieldAlert size={14} />
            <span>Realokasi Darurat (Worst-Case)</span>
          </button>
        </div>
      </div>

      {/* 2. TOP CASH ALLOCATION BAR (Physical vs Locked vs Free Cash) */}
      <div className="bento-card p-5 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/50 border border-slate-200/90 rounded-2xl shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Vault size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Pemisahan Likuiditas Kas Fisik vs Dana Terikat Anggaran
              </span>
              <p className="text-[11px] text-slate-500">
                Mencegah ilusi kekayaan rekening: Menjamin dana kas teralokasi dengan peruntukan jelas
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full self-start sm:self-auto ${
              cashAllocation.isDeficit
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {cashAllocation.isDeficit ? 'Defisit Alokasi Kas' : 'Alokasi Likuiditas Sehat'}
          </span>
        </div>

        {/* 3 Metrics Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Total Physical Cash */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Total Saldo Kas Fisik (Semua Rekening)</span>
            <div className="my-1">
              <span className="text-base font-black text-slate-900 tabular-numbers">
                {formatIDR(cashAllocation.totalPhysicalCash)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Total saldo BCA, CIMB, E-Wallets & Tunai</span>
          </div>

          {/* Card 2: Total Locked in Vaults & Budget */}
          <div className="p-3.5 bg-white rounded-xl border border-teal-200/90 shadow-subtle flex flex-col justify-between">
            <span className="text-[11px] font-medium text-teal-700">Dana Terikat Anggaran & Sinking Fund</span>
            <div className="my-1">
              <span className="text-base font-black text-teal-800 tabular-numbers">
                {formatIDR(cashAllocation.totalAllocatedVaultLocked)}
              </span>
            </div>
            <span className="text-[10px] text-teal-600">Locked di brankas cadangan & kuota bulanan</span>
          </div>

          {/* Card 3: Unallocated Free Cash */}
          <div
            className={`p-3.5 rounded-xl border shadow-subtle flex flex-col justify-between ${
              cashAllocation.isDeficit
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-indigo-200/90'
            }`}
          >
            <span
              className={`text-[11px] font-medium ${
                cashAllocation.isDeficit ? 'text-rose-700' : 'text-indigo-700'
              }`}
            >
              Saldo Bebas (Siap Dialokasikan)
            </span>
            <div className="my-1">
              <span
                className={`text-base font-black tabular-numbers ${
                  cashAllocation.isDeficit ? 'text-rose-700' : 'text-indigo-900'
                }`}
              >
                {formatIDR(cashAllocation.unallocatedFreeCash)}
              </span>
            </div>
            <span
              className={`text-[10px] ${
                cashAllocation.isDeficit ? 'text-rose-600 font-semibold' : 'text-indigo-500'
              }`}
            >
              {cashAllocation.isDeficit
                ? 'PERINGATAN: Alokasi anggaran melebihi kas fisik!'
                : 'Uang dingin murni tanpa beban kewajiban'}
            </span>
          </div>
        </div>

        {/* Visual Allocation Split Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/70">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
            <div
              title={`Terikat Budget: ${formatIDR(cashAllocation.totalAllocatedVaultLocked)}`}
              className="h-full bg-teal-600 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  cashAllocation.totalPhysicalCash > 0
                    ? (cashAllocation.totalAllocatedVaultLocked / cashAllocation.totalPhysicalCash) * 100
                    : 0
                )}%`,
              }}
            ></div>
            <div
              title={`Saldo Bebas: ${formatIDR(Math.max(0, cashAllocation.unallocatedFreeCash))}`}
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${Math.max(
                  0,
                  cashAllocation.totalPhysicalCash > 0
                    ? (cashAllocation.unallocatedFreeCash / cashAllocation.totalPhysicalCash) * 100
                    : 0
                )}%`,
              }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              Terikat Anggaran (
              {cashAllocation.totalPhysicalCash > 0
                ? ((cashAllocation.totalAllocatedVaultLocked / cashAllocation.totalPhysicalCash) * 100).toFixed(0)
                : 0}
              %)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Saldo Bebas (
              {cashAllocation.totalPhysicalCash > 0
                ? ((Math.max(0, cashAllocation.unallocatedFreeCash) / cashAllocation.totalPhysicalCash) * 100).toFixed(0)
                : 0}
              %)
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABS SWITCHER & PILLAR FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ROUTINE_STRICT_CAP')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ROUTINE_STRICT_CAP'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Anggaran Rutin (Strict-Cap)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'ROUTINE_STRICT_CAP' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {routineCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SINKING_FUND')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'SINKING_FUND'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Vault size={15} />
            <span>Tabungan Budget (Sinking Fund)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'SINKING_FUND' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {sinkingFundCategories.length}
            </span>
          </button>
        </div>

        {/* Pillar Filter */}
        <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-subtle text-xs font-semibold self-start sm:self-auto">
          {(['ALL', 'NEEDS', 'WANTS', 'SAVINGS'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPillar(p)}
              className={`px-3 py-1 rounded-lg transition ${
                selectedPillar === p
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'ALL' ? 'Semua' : p}
            </button>
          ))}
        </div>
      </div>

      {/* 4. TAB 1: ANGGARAN RUTIN (STRICT CAP) */}
      {activeTab === 'ROUTINE_STRICT_CAP' && (
        <div className="space-y-4">
          {/* Strict Cap Rule Notice */}
          <div className="p-3.5 bg-slate-100/90 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
            <Lock size={16} className="text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Prinsip Disiplin Strict-Cap:</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sisa alokasi bulan lalu otomatis tersimpan di <strong>Brankas Cadangan</strong> dan <strong>TIDAK MENAIKKAN</strong> plafon belanja bulan berjalan (contoh: Makan tetap Rp 2.500.000 meskipun ada sisa Rp 100.000 dari Oktober). Ini melindungi Anda dari inflasi gaya hidup.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filteredCategories.map((cat) => {
              const isOver = cat.currentMonthSpent > cat.allowedSpendingLimit;
              const isDanger = cat.spendingProgress > 90;
              const isWarning = cat.spendingProgress >= 75 && cat.spendingProgress <= 90;

              return (
                <div
                  key={cat.id}
                  className="bento-card p-5 rounded-2xl flex flex-col justify-between bg-white border border-slate-200/90 shadow-subtle hover:border-slate-300 hover:shadow-card transition-all"
                >
                  <div>
                    {/* Header: Icon + Name + Pillar + Edit Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconRenderer name={cat.iconName} size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">
                            {cat.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                cat.pillar === 'NEEDS'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                                  : cat.pillar === 'WANTS'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              {cat.pillar}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • Plafon: <strong className="text-slate-600 font-semibold">{formatIDR(cat.allowedSpendingLimit)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openAllocateFor(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                          title="Setor Alokasi Bulanan"
                        >
                          <Plus size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Ubah Plafon Bulanan"
                        >
                          <Sliders size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Spending Box */}
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 mt-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-medium text-slate-500">Realisasi Belanja:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 tabular-numbers">
                            {formatIDR(cat.currentMonthSpent)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-numbers ${
                              isOver
                                ? 'bg-rose-100 text-rose-800'
                                : isWarning
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {cat.spendingProgress.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-teal-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, cat.spendingProgress))}%` }}
                        ></div>
                      </div>

                      {/* Sisa / Over Status */}
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        {isOver ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle size={11} className="shrink-0" />
                            Over: +{formatIDR(cat.currentMonthSpent - cat.allowedSpendingLimit)}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            Sisa Kuota: <strong className="text-slate-800">{formatIDR(cat.remainingAllowedSpend)}</strong>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">Disiplin Bulanan</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Footer (Vault Reserve - Zero Negative Margins!) */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                        <Vault size={13} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block leading-tight">
                          Brankas Akumulasi
                        </span>
                        <span className="text-[10px] text-slate-400">Cadangan Terkunci</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-teal-800 tabular-numbers block">
                        {formatIDR(cat.accumulatedVaultReserve || 0)}
                      </span>
                      <span className="text-[9px] text-slate-400">Sisa Rollover</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 2: TABUNGAN BUDGET (SINKING FUND) */}
      {activeTab === 'SINKING_FUND' && (
        <div className="space-y-4">
          {/* Sinking Fund Notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
            <Vault size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-900">Konsep Sinking Fund (Tabungan Terencana):</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Tabungan budget disisihkan secara disiplin setiap bulan (contoh: Service Motor Rp 100.000/bulan) untuk kebutuhan mendatang (target Rp 1.200.000 pada Okt 2027). Ketika service tiba, pembayaran diambil langsung dari brankas tanpa memotong kuota belanja harian.
              </p>
            </div>
          </div>

          {/* Sinking Fund Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filteredCategories.map((fund) => {
              const target = fund.targetFundAmount || 1;
              const currentTotal = fund.totalCategoryBackedCash;
              const progressPct = Math.min(100, Math.max(0, (currentTotal / target) * 100));

              return (
                <div
                  key={fund.id}
                  className="bento-card p-5 rounded-2xl flex flex-col justify-between bg-white border border-amber-200/90 shadow-subtle hover:border-amber-300 hover:shadow-card transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: fund.color }}
                        >
                          <IconRenderer name={fund.iconName} size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">
                            {fund.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Sinking Fund
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • Setoran: {formatIDR(fund.monthlyPlanCap)}/bln
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openAllocateFor(fund.id)}
                        className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition shrink-0"
                        title="Setor Tabungan Sinking Fund"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Total Brankas Ready to Spend */}
                    <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-200/70 rounded-xl space-y-2 mt-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold text-amber-900">
                          Dana Terkumpul di Brankas:
                        </span>
                        <span className="text-sm font-black text-amber-950 tabular-numbers">
                          {formatIDR(currentTotal)}
                        </span>
                      </div>

                      {/* Progress Bar towards Target */}
                      <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-amber-800 font-medium pt-0.5">
                        <span>Target: {formatIDR(fund.targetFundAmount || 0)}</span>
                        <span className="font-bold tabular-numbers">{progressPct.toFixed(0)}% Tercapai</span>
                      </div>
                    </div>

                    {/* Meta details */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-medium">Alokasi Bulan Ini:</span>
                        <span className="font-bold text-slate-800 tabular-numbers">
                          {formatIDR(fund.currentMonthAllocated || fund.monthlyPlanCap)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-medium">Target Waktu:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Calendar size={12} className="text-amber-600" />
                          {fund.targetDate || 'Fleksibel'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Action to deposit */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Lock size={11} className="text-teal-600" />
                      Pengeluaran langsung potong brankas
                    </span>
                    <button
                      onClick={() => openAllocateFor(fund.id)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <span>Setor Tabungan</span>
                      <span className="text-sm font-semibold">&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. RIWAYAT AUDIT REALOKASI DARURAT (WORST-CASE AUDIT TRAIL) */}
      {emergencyLogs.length > 0 && (
        <div className="bento-card p-5 border border-rose-200 bg-rose-50/20 rounded-2xl shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              <h3 className="text-xs font-bold text-rose-950">
                Audit Trail Realokasi Darurat (Worst-Case Reallocation History)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
              {emergencyLogs.length} Kali Terjadi
            </span>
          </div>

          <div className="border border-rose-200/80 rounded-xl overflow-hidden divide-y divide-rose-100 bg-white text-xs">
            {emergencyLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      Darurat
                    </span>
                    <span className="font-bold text-slate-900">
                      {log.fromBudgetName} &rarr; {log.toBudgetName}
                    </span>
                    <span className="text-[11px] text-slate-400">({log.date})</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{log.reason || log.note}&rdquo;
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-rose-600 tabular-numbers">
                    {formatIDR(log.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Dipindahkan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AllocateBudgetModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        defaultBudgetId={allocateDefaultBudgetId}
      />

      <EmergencyReallocateModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      <RolloverSummaryModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
      />

      {/* Edit Budget Limit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-900">Ubah Batas Anggaran (Plafon)</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: editingCategory.color }}
                >
                  <IconRenderer name={editingCategory.iconName} size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{editingCategory.name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Mode: {editingCategory.budgetMode === 'SINKING_FUND' ? 'Sinking Fund' : 'Strict Cap'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Plafon Alokasi Bulanan Baru (Rp)
                </label>
                <input
                  type="text"
                  value={newLimitStr}
                  onChange={(e) => setNewLimitStr(e.target.value)}
                  placeholder="Contoh: 500.000 atau 500k"
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 tabular-numbers focus:outline-none focus:border-teal-700"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
