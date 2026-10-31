import type {
  Wallet,
  Category,
  Transaction,
  LedgerEntry,
  BookkeepingReport,
  BudgetLedgerEntry,
} from './types';
import { getMonthLabel } from './formatters';
import { calculateCategoryBudgetState } from './budgetEngine';

/**
 * PURE BOOKKEEPING ENGINE
 * Generates General Ledger, Running Balances, Sinking Fund Statements, and Emergency Reallocation Audit Logs.
 */

export function generateBookkeepingReport(
  wallets: Wallet[],
  categories: Category[],
  transactions: Transaction[],
  yearMonth: string,
  userEmail = 'user@example.com',
  filterWalletId?: string,
  budgetLedger: BudgetLedgerEntry[] = []
): BookkeepingReport {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const walletMap = new Map(wallets.map((w) => [w.id, w]));

  // Filter transactions for the selected month
  let monthTxs = transactions.filter((tx) => tx.date.startsWith(yearMonth));

  // If a specific wallet is filtered
  if (filterWalletId && filterWalletId !== 'all') {
    monthTxs = monthTxs.filter(
      (tx) => tx.walletId === filterWalletId || tx.toWalletId === filterWalletId
    );
  }

  // Sort chronologically ascending
  monthTxs.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.createdAt - b.createdAt;
  });

  // Calculate total current balance of selected wallets
  const activeWallets =
    filterWalletId && filterWalletId !== 'all'
      ? wallets.filter((w) => w.id === filterWalletId)
      : wallets;

  const currentTotalBalance = activeWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // Calculate transactions that happened AFTER the selected month to roll back to the end-of-month balance
  const nextTxs = transactions.filter((tx) => {
    if (tx.date.slice(0, 7) <= yearMonth) return false;
    if (filterWalletId && filterWalletId !== 'all') {
      return tx.walletId === filterWalletId || tx.toWalletId === filterWalletId;
    }
    return true;
  });

  let deltaAfter = 0;
  nextTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      deltaAfter += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      deltaAfter -= tx.amount;
    } else if (tx.type === 'TRANSFER') {
      if (filterWalletId && filterWalletId !== 'all') {
        if (tx.walletId === filterWalletId) {
          deltaAfter -= tx.amount + (tx.adminFee || 0);
        }
        if (tx.toWalletId === filterWalletId) {
          deltaAfter += tx.amount;
        }
      } else {
        deltaAfter -= tx.adminFee || 0;
      }
    }
  });

  const monthEndBalance = currentTotalBalance - deltaAfter;

  // Now calculate total monthly inflows & outflows to find initial balance
  let totalIncomeDebit = 0;
  let totalExpenseCredit = 0;
  let totalAdminFees = 0;

  monthTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncomeDebit += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpenseCredit += tx.amount;
    } else if (tx.type === 'TRANSFER') {
      const fee = tx.adminFee || 0;
      totalAdminFees += fee;

      if (filterWalletId && filterWalletId !== 'all') {
        if (tx.walletId === filterWalletId) {
          totalExpenseCredit += tx.amount + fee;
        }
        if (tx.toWalletId === filterWalletId) {
          totalIncomeDebit += tx.amount;
        }
      } else {
        totalExpenseCredit += fee;
      }
    }
  });

  const netCashflow = totalIncomeDebit - totalExpenseCredit;
  const initialBalance = monthEndBalance - netCashflow;

  // Build Chronological General Ledger with Running Balance
  let running = initialBalance;
  const ledgerEntries: LedgerEntry[] = [];

  monthTxs.forEach((tx, idx) => {
    const fromW = walletMap.get(tx.walletId);
    const toW = tx.toWalletId ? walletMap.get(tx.toWalletId) : undefined;
    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;

    let debit = 0;
    let credit = 0;
    const adminFee = tx.adminFee || 0;
    let desc = tx.note;
    let walletName = fromW?.name || 'Dompet';

    if (tx.type === 'INCOME') {
      debit = tx.amount;
      running += debit;
    } else if (tx.type === 'EXPENSE') {
      credit = tx.amount;
      running -= credit;
      if (tx.isVaultSpend) {
        desc = `[Vault Spend] ${desc}`;
      }
    } else if (tx.type === 'TRANSFER') {
      if (filterWalletId && filterWalletId !== 'all') {
        if (tx.walletId === filterWalletId) {
          credit = tx.amount + adminFee;
          running -= credit;
          desc = `Transfer ke ${toW?.name || 'Dompet'} (Fee: Rp ${adminFee.toLocaleString('id-ID')}) - ${tx.note}`;
        } else if (tx.toWalletId === filterWalletId) {
          debit = tx.amount;
          running += debit;
          desc = `Transfer dari ${fromW?.name || 'Dompet'} - ${tx.note}`;
        }
      } else {
        credit = adminFee;
        running -= credit;
        walletName = `${fromW?.name} ➔ ${toW?.name}`;
        desc = `Mutasi: ${tx.note} (Pokok: Rp ${tx.amount.toLocaleString('id-ID')})`;
      }
    }

    ledgerEntries.push({
      no: idx + 1,
      id: tx.id,
      date: tx.date,
      description: desc,
      categoryName: cat?.name || (tx.type === 'TRANSFER' ? 'Mutasi Dompet' : 'Lainnya'),
      pillar: cat?.pillar,
      walletName,
      debit,
      credit,
      adminFee,
      runningBalance: running,
      type: tx.type,
    });
  });

  // Build Sinking Fund & Vault Reserve Statement
  const vaultReserves = categories
    .filter((c) => (c.accumulatedVaultReserve || 0) > 0 || c.budgetMode === 'SINKING_FUND')
    .map((c) => {
      const state = calculateCategoryBudgetState(c, transactions, yearMonth);
      return {
        id: c.id,
        name: c.name,
        pillar: c.pillar,
        mode: c.budgetMode,
        monthlyPlanCap: c.monthlyPlanCap,
        accumulatedVaultReserve: c.accumulatedVaultReserve || 0,
        currentMonthAllocated: c.currentMonthAllocated || 0,
        totalBackedCash: state.totalCategoryBackedCash,
        targetFundAmount: c.targetFundAmount,
      };
    });

  // Filter Worst-Case Emergency Reallocations
  const emergencyReallocations = budgetLedger.filter(
    (bl) =>
      bl.type === 'WORST_CASE_REALLOCATION' &&
      (!yearMonth || bl.periodMonth === yearMonth || bl.date.startsWith(yearMonth))
  );

  return {
    periodMonth: yearMonth,
    periodLabel: getMonthLabel(yearMonth),
    generatedAt: new Date().toISOString(),
    userEmail,
    initialBalance,
    totalIncomeDebit,
    totalExpenseCredit,
    totalAdminFees,
    netCashflow,
    finalBalance: monthEndBalance,
    walletBalances: activeWallets.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      balance: w.balance,
    })),
    ledgerEntries,
    vaultReserves,
    emergencyReallocations,
  };
}
