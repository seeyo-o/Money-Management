import type {
  Category,
  Transaction,
  Wallet,
  CategoryBudgetState,
  CashAllocationMetrics,
  BudgetLedgerEntry,
} from './types';

/**
 * PURE DUAL-BALANCE BUDGET & SINKING FUND ENGINE
 *
 * Implements:
 * 1. Dual-Layer Balance (Monthly Plan Cap vs Accumulated Vault Reserve).
 * 2. ROUTINE_STRICT_CAP (Strict 500k Cap + 100k Rollover Reserve - never raises spending limit!).
 * 3. SINKING_FUND (Long-term savings e.g. Service Motor with vault-backed execution).
 * 4. Physical vs Locked Budget Cash vs Unallocated Free Cash.
 * 5. Worst-Case Emergency Reallocation Guardrails & Impact Calculations.
 */

/**
 * Calculates real-time state for a budget category based on transactions and allocations.
 */
export function calculateCategoryBudgetState(
  category: Category,
  transactions: Transaction[],
  yearMonth: string
): CategoryBudgetState {
  const monthTxs = transactions.filter((tx) => tx.date.startsWith(yearMonth));

  let currentMonthSpent = 0;
  let vaultSpent = 0;

  monthTxs.forEach((tx) => {
    if (tx.type === 'EXPENSE' && tx.categoryId === category.id) {
      if (tx.isVaultSpend) {
        vaultSpent += tx.amount;
      } else {
        currentMonthSpent += tx.amount;
      }
    } else if (tx.type === 'TRANSFER' && tx.adminFee && category.id === 'cat-admin') {
      currentMonthSpent += tx.adminFee;
    }
  });

  const accumulatedReserve = category.accumulatedVaultReserve || 0;
  const currentAllocated = category.currentMonthAllocated || 0;

  // Total cash backing this category:
  // Reserve from past months + (Current allocation - regular spending) - vault spending
  const totalCategoryBackedCash = Math.max(
    0,
    accumulatedReserve + (currentAllocated - currentMonthSpent) - vaultSpent
  );

  let allowedSpendingLimit = 0;
  let spendingProgress = 0;
  let status: 'safe' | 'warning' | 'danger' = 'safe';

  if (category.budgetMode === 'ROUTINE_STRICT_CAP') {
    // STRICT CAP RULE:
    // Even if there is 100k leftover from October in reserve,
    // November's allowed spending limit is STRICTLY LOCKED to monthlyPlanCap (e.g. Rp 500.000)!
    allowedSpendingLimit = category.monthlyPlanCap || category.budgetLimit || 0;

    spendingProgress =
      allowedSpendingLimit > 0 ? (currentMonthSpent / allowedSpendingLimit) * 100 : 0;

    if (spendingProgress >= 100) {
      status = 'danger';
    } else if (spendingProgress >= 75) {
      status = 'warning';
    } else {
      status = 'safe';
    }
  } else {
    // SINKING_FUND mode:
    // e.g. Service Motor. The entire accumulated vault cash is available when needed.
    allowedSpendingLimit = Math.max(0, accumulatedReserve + currentAllocated - vaultSpent);

    if (category.targetFundAmount && category.targetFundAmount > 0) {
      // Progress towards savings target
      spendingProgress = (totalCategoryBackedCash / category.targetFundAmount) * 100;
    } else {
      spendingProgress =
        allowedSpendingLimit > 0 ? (vaultSpent / (allowedSpendingLimit + vaultSpent)) * 100 : 0;
    }

    status = 'safe';
  }

  const remainingAllowedSpend = Math.max(0, allowedSpendingLimit - currentMonthSpent);

  return {
    ...category,
    spent: currentMonthSpent,
    currentMonthSpent,
    vaultSpent,
    totalCategoryBackedCash,
    allowedSpendingLimit,
    spendingProgress,
    status,
    remainingAllowedSpend,
  };
}

/**
 * Calculates overall physical cash vs locked budget cash vs unallocated free cash.
 */
export function calculateOverallCashAllocation(
  wallets: Wallet[],
  categories: Category[],
  transactions: Transaction[],
  yearMonth: string
): CashAllocationMetrics {
  const totalPhysicalCash = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const budgetStates = categories.map((c) =>
    calculateCategoryBudgetState(c, transactions, yearMonth)
  );

  const totalAllocatedVaultLocked = budgetStates.reduce(
    (sum, s) => sum + s.totalCategoryBackedCash,
    0
  );

  const unallocatedFreeCash = totalPhysicalCash - totalAllocatedVaultLocked;

  return {
    totalPhysicalCash,
    totalAllocatedVaultLocked,
    unallocatedFreeCash,
    isDeficit: unallocatedFreeCash < 0,
  };
}

/**
 * Simulates month-end rollover calculation:
 * Returns the exact rollover difference that should be added to accumulatedVaultReserve.
 */
export function simulateCategoryRollover(
  category: Category,
  currentMonthSpent: number
): {
  leftover: number;
  newVaultReserve: number;
  explanation: string;
} {
  const allocated = category.currentMonthAllocated || category.monthlyPlanCap || 0;
  const leftover = allocated - currentMonthSpent;

  const currentReserve = category.accumulatedVaultReserve || 0;
  const newVaultReserve = Math.max(0, currentReserve + leftover);

  let explanation = '';
  if (leftover > 0) {
    explanation = `Sisa Rp ${leftover.toLocaleString('id-ID')} dari alokasi bulan ini otomatis dimasukkan ke Brankas Akumulasi Cadangan (Vault).`;
  } else if (leftover === 0) {
    explanation = 'Alokasi bulan ini habis terpakai secara presisi tanpa sisa.';
  } else {
    explanation = `Pengeluaran melebihi alokasi sebesar Rp ${Math.abs(leftover).toLocaleString('id-ID')}.`;
  }

  return {
    leftover,
    newVaultReserve,
    explanation,
  };
}

/**
 * Evaluates Worst-Case Emergency Reallocation Impact:
 * Returns detailed financial warning, forfeited savings duration, and validation.
 */
export function calculateWorstCaseReallocationImpact(
  fromCategory: Category,
  toCategory: Category,
  amount: number
): {
  isValid: boolean;
  errorMessage?: string;
  isWantsTarget: boolean;
  severityLevel: 'SAFE' | 'WARNING' | 'CRITICAL_BLOCK';
  currentFromReserve: number;
  projectedFromReserve: number;
  sacrificedMonthsOfSaving: number;
  impactMessage: string;
} {
  const currentFromReserve =
    (fromCategory.accumulatedVaultReserve || 0) + (fromCategory.currentMonthAllocated || 0);

  const isWantsTarget = toCategory.pillar === 'WANTS';

  if (amount <= 0) {
    return {
      isValid: false,
      errorMessage: 'Nominal realokasi harus lebih dari Rp 0.',
      isWantsTarget,
      severityLevel: 'CRITICAL_BLOCK',
      currentFromReserve,
      projectedFromReserve: currentFromReserve,
      sacrificedMonthsOfSaving: 0,
      impactMessage: 'Nominal tidak valid.',
    };
  }

  if (amount > currentFromReserve) {
    return {
      isValid: false,
      errorMessage: `Dana tersedia di budget '${fromCategory.name}' hanya Rp ${currentFromReserve.toLocaleString('id-ID')}.`,
      isWantsTarget,
      severityLevel: 'CRITICAL_BLOCK',
      currentFromReserve,
      projectedFromReserve: currentFromReserve,
      sacrificedMonthsOfSaving: 0,
      impactMessage: 'Dana tidak mencukupi.',
    };
  }

  const projectedFromReserve = currentFromReserve - amount;

  // Calculate equivalent months of disciplined saving sacrificed
  const monthlyDeposit = fromCategory.monthlyPlanCap || 1;
  const sacrificedMonthsOfSaving = parseFloat((amount / monthlyDeposit).toFixed(1));

  let severityLevel: 'SAFE' | 'WARNING' | 'CRITICAL_BLOCK' = 'WARNING';
  if (isWantsTarget) {
    severityLevel = 'CRITICAL_BLOCK';
  }

  const impactMessage = `Mengambil Rp ${amount.toLocaleString('id-ID')} dari tabungan budget '${fromCategory.name}' untuk menutupi '${toCategory.name}' akan memangkas cadangan dari Rp ${currentFromReserve.toLocaleString('id-ID')} menjadi Rp ${projectedFromReserve.toLocaleString('id-ID')}. Ini setara dengan MENGORBANKAN ${sacrificedMonthsOfSaving} BULAN setoran alokasi rutin Anda!`;

  return {
    isValid: true,
    isWantsTarget,
    severityLevel,
    currentFromReserve,
    projectedFromReserve,
    sacrificedMonthsOfSaving,
    impactMessage,
  };
}
