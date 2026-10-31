import type {
  Wallet,
  Category,
  Transaction,
  MonthSummary,
  ForecastingMetrics,
  CategoryBudgetState,
} from './types';
import {
  calculateCategoryBudgetState,
  calculateOverallCashAllocation,
} from './budgetEngine';

/**
 * PURE FINANCIAL MATH ENGINE
 * Guarantees zero double counting, precise multi-wallet integrity, and rational forecasting.
 */

export function filterTransactionsByMonth(
  transactions: Transaction[],
  yearMonth: string
): Transaction[] {
  return transactions.filter((tx) => tx.date.startsWith(yearMonth));
}

export function calculateMonthSummary(
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  yearMonth: string
): MonthSummary {
  const monthTxs = filterTransactionsByMonth(transactions, yearMonth);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const walletMap = new Map(wallets.map((w) => [w.id, w]));

  let totalIncome = 0;
  let totalExpense = 0;
  let totalAdminFees = 0;
  let needsSpend = 0;
  let wantsSpend = 0;
  let savingsSpend = 0;
  let eWalletSpend = 0;
  let bankSpend = 0;

  monthTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;

      // Group by 3 Pillars
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      const pillar = cat?.pillar || 'NEEDS';
      if (pillar === 'NEEDS') needsSpend += tx.amount;
      else if (pillar === 'WANTS') wantsSpend += tx.amount;
      else if (pillar === 'SAVINGS') savingsSpend += tx.amount;

      // Group by Wallet Category (Bank vs E-Wallet)
      const w = walletMap.get(tx.walletId);
      if (w?.category === 'EWALLET') {
        eWalletSpend += tx.amount;
      } else if (w?.category === 'BANK') {
        bankSpend += tx.amount;
      }
    } else if (tx.type === 'TRANSFER') {
      // Transfer principal does NOT count as monthly expense (NO DOUBLE COUNTING!)
      // BUT admin fee counts as an expense under Biaya Admin (NEEDS)
      const fee = tx.adminFee || 0;
      if (fee > 0) {
        totalExpense += fee;
        totalAdminFees += fee;
        needsSpend += fee;

        const w = walletMap.get(tx.walletId);
        if (w?.category === 'EWALLET') eWalletSpend += fee;
        else if (w?.category === 'BANK') bankSpend += fee;
      }
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpense,
    totalAdminFees,
    netSavings,
    savingsRate,
    needsSpend,
    wantsSpend,
    savingsSpend,
    eWalletSpend,
    bankSpend,
  };
}

export function calculateCategorySpending(
  categories: Category[],
  transactions: Transaction[],
  yearMonth: string
): CategoryBudgetState[] {
  return categories.map((cat) =>
    calculateCategoryBudgetState(cat, transactions, yearMonth)
  );
}

export function calculateForecastingMetrics(
  wallets: Wallet[],
  categories: Category[],
  transactions: Transaction[],
  yearMonth: string,
  referenceDate = new Date()
): ForecastingMetrics {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth =
    referenceDate.getFullYear() === year && referenceDate.getMonth() + 1 === month;

  const currentDay = isCurrentMonth ? Math.min(referenceDate.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : 1;

  const summary = calculateMonthSummary(transactions, categories, wallets, yearMonth);

  // Total Monthly Budget is based on monthlyPlanCap (or budgetLimit fallback)
  const totalMonthlyBudget = categories.reduce(
    (sum, c) => sum + (c.monthlyPlanCap || c.budgetLimit || 0),
    0
  );
  const budgetRemaining = Math.max(0, totalMonthlyBudget - summary.totalExpense);
  const isOverBudget = summary.totalExpense > totalMonthlyBudget;

  // 1. Daily Safe-to-Spend
  const dailySafeToSpend = isOverBudget ? 0 : Math.round(budgetRemaining / daysRemaining);

  // 2. Month-End Projection & Velocity
  const spendingVelocity = Math.round(summary.totalExpense / Math.max(1, currentDay));
  const projectedMonthEndExpense = spendingVelocity * daysInMonth;
  const projectedVariance = totalMonthlyBudget - projectedMonthEndExpense;

  // 3. Financial Runway
  const totalNetWorth = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const monthlyBurn =
    summary.totalExpense > 0 ? summary.totalExpense : totalMonthlyBudget || 5000000;
  const rawRunwayMonths = totalNetWorth / (monthlyBurn || 1);
  const cashflowRunwayMonths = Math.floor(rawRunwayMonths);
  const cashflowRunwayDays = Math.round((rawRunwayMonths - cashflowRunwayMonths) * 30);

  let runwayStatus: 'optimal' | 'healthy' | 'caution' | 'critical' = 'healthy';
  if (rawRunwayMonths >= 6) runwayStatus = 'optimal';
  else if (rawRunwayMonths >= 3) runwayStatus = 'healthy';
  else if (rawRunwayMonths >= 1) runwayStatus = 'caution';
  else runwayStatus = 'critical';

  // 4. E-Wallet Drain Detector
  const eWalletDrainPercentage =
    summary.totalExpense > 0
      ? Math.round((summary.eWalletSpend / summary.totalExpense) * 100)
      : 0;

  // 5. 50/30/20 Proportions
  const incomeBase = summary.totalIncome > 0 ? summary.totalIncome : summary.totalExpense || 1;
  const needsPercentage = Math.round((summary.needsSpend / incomeBase) * 100);
  const wantsPercentage = Math.round((summary.wantsSpend / incomeBase) * 100);
  const savingsPercentage = Math.round((Math.max(0, summary.netSavings) / incomeBase) * 100);

  // 6. Dual-balance Cash Allocation (Physical vs Locked vs Free Cash)
  const cashAllocation = calculateOverallCashAllocation(
    wallets,
    categories,
    transactions,
    yearMonth
  );

  return {
    dailySafeToSpend,
    daysRemaining,
    daysInMonth,
    currentDay,
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
    savingsRate: Math.round(summary.savingsRate),
    needsPercentage,
    wantsPercentage,
    savingsPercentage,
    cashAllocation,
  };
}
