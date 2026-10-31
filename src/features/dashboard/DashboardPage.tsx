import React from 'react';
import {
  Compass,
  Calendar,
  TrendingUp,
  PieChart,
  Landmark,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Receipt,
  Layers,
  Vault,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIDR } from '../../domain/formatters';

export const DashboardPage: React.FC = () => {
  const {
    wallets,
    transactions,
    selectedMonth,
    totalBankBalance,
    totalEwalletBalance,
    totalCashBalance,
    netWorth,
    monthSummary,
    categorySpendings,
    forecasting,
    cashAllocation,
  } = useFinance();

  const {
    dailySafeToSpend,
    daysRemaining,
    spendingVelocity,
    projectedMonthEndExpense,
    projectedVariance,
    isOverBudget,
    budgetRemaining,
    totalMonthlyBudget,
    cashflowRunwayMonths,
    cashflowRunwayDays,
    runwayStatus,
    eWalletDrainPercentage,
    savingsRate,
    needsPercentage,
    wantsPercentage,
    savingsPercentage,
  } = forecasting;

  const isSafe = dailySafeToSpend > 100000 && !isOverBudget;
  const isTight = dailySafeToSpend > 0 && dailySafeToSpend <= 100000 && !isOverBudget;

  // Filter top 5 expense categories
  const topExpenseCategories = [...categorySpendings]
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Group transactions of the month into 4 weeks for cashflow trend
  const weeklyTrends = [
    { label: 'Minggu 1', in: 0, out: 0 },
    { label: 'Minggu 2', in: 0, out: 0 },
    { label: 'Minggu 3', in: 0, out: 0 },
    { label: 'Minggu 4', in: 0, out: 0 },
  ];

  transactions
    .filter((tx) => tx.date.startsWith(selectedMonth))
    .forEach((tx) => {
      const day = parseInt(tx.date.split('-')[2], 10);
      const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
      if (tx.type === 'INCOME') {
        weeklyTrends[weekIdx].in += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        weeklyTrends[weekIdx].out += tx.amount;
      } else if (tx.type === 'TRANSFER' && tx.adminFee) {
        weeklyTrends[weekIdx].out += tx.adminFee;
      }
    });

  const maxWeeklyAmount = Math.max(
    1,
    ...weeklyTrends.map((w) => Math.max(w.in, w.out))
  );

  return (
    <div className="space-y-6">
      {/* 1. Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Kekayaan Bersih
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-numbers tracking-tight">
              {formatIDR(netWorth)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Saldo likuid di seluruh akun aktif</p>
          </div>
        </div>

        {/* Bank vs E-Wallet Split */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pemisahan Likuiditas
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Landmark size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0060AF]"></span> Bank Tabungan:
              </span>
              <strong className="text-slate-900 tabular-numbers">{formatIDR(totalBankBalance)}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6D28D9]"></span> E-Wallet Harian:
              </span>
              <strong className="text-slate-900 tabular-numbers">{formatIDR(totalEwalletBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pemasukan Bulan Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tabular-numbers tracking-tight">
              +{formatIDR(monthSummary.totalIncome)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gaji & pendapatan sampingan</p>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pengeluaran Bulan Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <ArrowDownRight size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 tabular-numbers tracking-tight">
              -{formatIDR(monthSummary.totalExpense)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Bebas double counting transfer</p>
          </div>
        </div>
      </div>

      {/* 1.5 Dual-Balance Cash Allocation & Sinking Fund Status */}
      <div className="bento-card p-5 bg-gradient-to-br from-white via-slate-50/70 to-slate-100/50 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Vault size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">
                Pemisahan Likuiditas: Kas Fisik vs Dana Terikat Anggaran
              </span>
              <p className="text-[11px] text-slate-500">
                Memastikan uang di rekening bank & e-wallet memiliki peruntukan terencana tanpa ilusi kekayaan
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
            {cashAllocation.isDeficit ? 'Defisit Alokasi' : 'Alokasi Sehat'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-[11px] font-medium text-slate-500 block">Total Saldo Kas Fisik (Semua Rekening)</span>
            <span className="text-sm font-extrabold text-slate-900 tabular-numbers mt-0.5 block">
              {formatIDR(cashAllocation.totalPhysicalCash)}
            </span>
            <span className="text-[10px] text-slate-400">Total uang di bank & e-wallet</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-subtle">
            <span className="text-[11px] font-medium text-teal-700 block">Dana Terikat Budget & Sinking Fund</span>
            <span className="text-sm font-extrabold text-teal-800 tabular-numbers mt-0.5 block">
              {formatIDR(cashAllocation.totalAllocatedVaultLocked)}
            </span>
            <span className="text-[10px] text-teal-600">Locked di brankas tabungan & kuota aktif</span>
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
              className={`text-sm font-extrabold tabular-numbers mt-0.5 block ${
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
                ? 'Peringatan: Alokasi anggaran melebihi saldo kas fisik!'
                : 'Uang dingin bebas tanpa ikatan kewajiban'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Rational Decision Engine Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Rational Financial Health & Forecasting
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400 hidden sm:block">
            Pedoman Rasional Pengambilan Keputusan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Daily Safe to Spend */}
          <div className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Batas Aman Hari Ini
                </span>
                <h3 className="text-xs font-semibold text-slate-800">Daily Safe-to-Spend</h3>
              </div>
              <div
                className={`p-2 rounded-xl ${
                  isSafe
                    ? 'bg-emerald-50 text-emerald-600'
                    : isTight
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <Compass size={17} />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tabular-numbers">
                {formatIDR(dailySafeToSpend)}
                <span className="text-xs font-normal text-slate-400 ml-1">/ hari</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isSafe
                      ? 'bg-emerald-100 text-emerald-800'
                      : isTight
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isSafe ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  <span>{isSafe ? 'Sangat Aman' : isTight ? 'Terkendali' : 'Overbudget'}</span>
                </span>
                <span className="text-[11px] text-slate-400">Sisa {daysRemaining} hari</span>
              </div>
            </div>

            <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
              Maksimal nominal harian agar total anggaran tidak jebol sampai akhir bulan.
            </p>
          </div>

          {/* Card 2: End-of-Month Projection */}
          <div className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Proyeksi Pengeluaran
                </span>
                <h3 className="text-xs font-semibold text-slate-800">End-of-Month Projection</h3>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar size={17} />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tabular-numbers">
                {formatIDR(projectedMonthEndExpense)}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full tabular-numbers">
                  Velocity: {formatIDR(spendingVelocity)}/hr
                </span>
                <span
                  className={`text-[10px] font-bold tabular-numbers ${
                    projectedVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {projectedVariance >= 0
                    ? `+Surplus ${formatIDR(projectedVariance)}`
                    : `Defisit ${formatIDR(Math.abs(projectedVariance))}`}
                </span>
              </div>
            </div>

            <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
              Berdasarkan laju pengeluaran saat ini dari target budget {formatIDR(totalMonthlyBudget)}.
            </p>
          </div>

          {/* Card 3: Financial Runway */}
          <div className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Daya Tahan Finansial
                </span>
                <h3 className="text-xs font-semibold text-slate-800">Cashflow Runway</h3>
              </div>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <TrendingUp size={17} />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tabular-numbers">
                {cashflowRunwayMonths}{' '}
                <span className="text-sm font-semibold text-slate-500">Bln</span>{' '}
                {cashflowRunwayDays}{' '}
                <span className="text-sm font-semibold text-slate-500">Hari</span>
              </div>
              <div className="mt-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    runwayStatus === 'optimal'
                      ? 'bg-emerald-100 text-emerald-800'
                      : runwayStatus === 'healthy'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {runwayStatus === 'optimal'
                    ? 'Kuat (Dana Darurat Aman)'
                    : runwayStatus === 'healthy'
                    ? 'Sehat (Standar Ideal)'
                    : 'Perlu Tambahan'}
                </span>
              </div>
            </div>

            <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
              Lama Anda mampu bertahan hidup dengan saldo saat ini tanpa pemasukan tambahan.
            </p>
          </div>

          {/* Card 4: Savings Rate & 50/30/20 */}
          <div className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Rasio Tabungan
                </span>
                <h3 className="text-xs font-semibold text-slate-800">50/30/20 Benchmark</h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <PieChart size={17} />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tabular-numbers">
                {savingsRate}%
                <span className="text-xs font-normal text-slate-400 ml-1.5">(Target &ge;20%)</span>
              </div>

              {/* Progress Bar 50/30/20 */}
              <div className="mt-2 space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-teal-600"
                    style={{ width: `${Math.min(100, needsPercentage)}%` }}
                    title={`Needs ${needsPercentage}%`}
                  ></div>
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100 - needsPercentage, wantsPercentage)}%` }}
                    title={`Wants ${wantsPercentage}%`}
                  ></div>
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100 - needsPercentage - wantsPercentage, savingsPercentage)}%` }}
                    title={`Savings ${savingsPercentage}%`}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-0.5">
                  <span>Needs {needsPercentage}%</span>
                  <span>Wants {wantsPercentage}%</span>
                  <span>Save {savingsPercentage}%</span>
                </div>
              </div>
            </div>

            <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
              Net Tabungan: <strong>{formatIDR(monthSummary.netSavings)}</strong>
            </p>
          </div>
        </div>

        {/* E-Wallet Drain & Admin Fee Tracker */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                eWalletDrainPercentage > 40 ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-700'
              }`}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">
                  E-Wallet Drain & Admin Fee Tracker
                </h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-numbers ${
                    eWalletDrainPercentage > 40
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {eWalletDrainPercentage}% via E-Wallet
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {eWalletDrainPercentage > 40
                  ? 'Waspadai pengeluaran impulsif mikro lewat GoPay/OVO/ShopeePay. Rekonsiliasi mutasi secara berkala.'
                  : 'Pengeluaran dompet digital Anda berada dalam batas sehat (<40%).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Beban E-Wallet:</span>
              <strong className="text-slate-800 tabular-numbers">{formatIDR(monthSummary.eWalletSpend)}</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Total Biaya Admin:</span>
              <strong className="text-rose-600 tabular-numbers">{formatIDR(monthSummary.totalAdminFees)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Charts & Category Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Cashflow Trend (Bar Chart) */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Arus Kas Mingguan (Cashflow Trend)</h3>
              <p className="text-[10px] text-slate-400">Pemasukan vs Pengeluaran per Minggu</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded bg-emerald-500"></span> Inflow
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2 h-2 rounded bg-rose-500"></span> Outflow
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-100">
            {weeklyTrends.map((w, idx) => {
              const inHeight = Math.round((w.in / maxWeeklyAmount) * 120);
              const outHeight = Math.round((w.out / maxWeeklyAmount) * 120);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1.5 h-32">
                    {/* Inflow bar */}
                    <div
                      className="w-4 bg-emerald-500 rounded-t-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(4, inHeight)}px` }}
                      title={`Pemasukan: ${formatIDR(w.in)}`}
                    ></div>
                    {/* Outflow bar */}
                    <div
                      className="w-4 bg-rose-500 rounded-t-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(4, outHeight)}px` }}
                      title={`Pengeluaran: ${formatIDR(w.out)}`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Expense Categories */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Top 5 Kategori Pengeluaran Terbesar</h3>
              <p className="text-[10px] text-slate-400">Distribusi realisasi belanja bulan ini</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Bulan Ini
            </span>
          </div>

          <div className="space-y-3">
            {topExpenseCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Belum ada pengeluaran tercatat.</p>
            ) : (
              topExpenseCategories.map((cat) => {
                const proportion = monthSummary.totalExpense > 0
                  ? (cat.spent / monthSummary.totalExpense) * 100
                  : 0;

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        ></span>
                        <span className="font-semibold text-slate-800">{cat.name}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-bold">
                          {cat.pillar}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-numbers">
                        {formatIDR(cat.spent)} ({proportion.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, proportion)}%`,
                          backgroundColor: cat.color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
