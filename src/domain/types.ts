export type WalletCategory = 'BANK' | 'EWALLET' | 'CASH' | 'CUSTOM';

export type PillarType = 'NEEDS' | 'WANTS' | 'SAVINGS';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type BudgetMode = 'ROUTINE_STRICT_CAP' | 'SINKING_FUND';

export type BudgetMutationType =
  | 'MONTHLY_ALLOCATION'
  | 'ALLOCATION_WITHDRAWAL'
  | 'ALLOCATION_ADJUSTMENT'
  | 'MONTH_END_ROLLOVER'
  | 'WORST_CASE_REALLOCATION'
  | 'SINKING_FUND_SPEND';

export interface Wallet {
  id: string;
  name: string;
  category: WalletCategory;
  accountNumber?: string;
  balance: number; // Current real-time balance
  color: string;
  iconName: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  pillar: PillarType;
  iconName: string;
  color: string;
  budgetMode: BudgetMode;
  monthlyPlanCap: number; // Disiplin batas pengeluaran bulanan (e.g. 500k Makan, 100k Service Motor)
  accumulatedVaultReserve: number; // Akumulasi sisa bulan sebelumnya / tabungan terkumpul
  currentMonthAllocated: number; // Setoran alokasi pada bulan berjalan (e.g. 500k Makan)
  targetFundAmount?: number | null; // Khusus Sinking Fund (e.g. 1.200.000 Service Motor)
  targetDate?: string | null; // e.g. "2027-10"
  linkedPreferredWalletId?: string | null; // e.g. "w-bca"
  lastRolloverPeriod?: string; // Format "YYYY-MM"
  budgetLimit: number; // Kept for backward compatibility (synced with monthlyPlanCap)
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Principal transaction amount in IDR
  date: string; // ISO format (YYYY-MM-DD)
  walletId: string; // Source wallet (or recipient wallet if income)
  toWalletId?: string; // Target wallet for transfer/top-up
  categoryId?: string; // Associated category
  adminFee?: number; // Optional admin fee for transfer (e.g. Rp 1.000)
  note: string;
  isVaultSpend?: boolean; // True jika dibayar menggunakan dana tabungan sinking fund
  createdAt: number;
}

export interface BudgetLedgerEntry {
  id: string;
  type: BudgetMutationType;
  budgetId: string;
  budgetName?: string;
  toBudgetId?: string;
  toBudgetName?: string;
  fromBudgetId?: string;
  fromBudgetName?: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  periodMonth: string; // "YYYY-MM"
  timestamp: number;
  reason?: string;
  note?: string;
}

export interface CashAllocationMetrics {
  totalPhysicalCash: number; // Total uang fisik di semua rekening
  totalAllocatedVaultLocked: number; // Total dana terikat budget & tabungan alokasi
  unallocatedFreeCash: number; // Total Saldo Fisik - Total Terikat
  isDeficit: boolean;
}

export interface CategoryBudgetState extends Category {
  spent: number; // Backward compatibility with currentMonthSpent
  currentMonthSpent: number;
  vaultSpent: number; // Spent from sinking fund reserve
  totalCategoryBackedCash: number; // accumulatedVaultReserve + (currentMonthAllocated - currentMonthSpent)
  allowedSpendingLimit: number; // monthlyPlanCap for STRICT_CAP, or accumulated total for SINKING_FUND
  spendingProgress: number; // spent / allowedSpendingLimit * 100
  status: 'safe' | 'warning' | 'danger';
  remainingAllowedSpend: number; // Math.max(0, allowedSpendingLimit - currentMonthSpent)
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  totalAdminFees: number;
  netSavings: number;
  savingsRate: number;
  needsSpend: number;
  wantsSpend: number;
  savingsSpend: number;
  eWalletSpend: number;
  bankSpend: number;
}

export interface ForecastingMetrics {
  dailySafeToSpend: number;
  daysRemaining: number;
  daysInMonth: number;
  currentDay: number;
  spendingVelocity: number;
  projectedMonthEndExpense: number;
  projectedVariance: number; // Positive = surplus, Negative = deficit
  isOverBudget: boolean;
  budgetRemaining: number;
  totalMonthlyBudget: number;
  cashflowRunwayMonths: number;
  cashflowRunwayDays: number;
  runwayStatus: 'optimal' | 'healthy' | 'caution' | 'critical';
  eWalletDrainPercentage: number;
  savingsRate: number;
  needsPercentage: number;
  wantsPercentage: number;
  savingsPercentage: number;
  // Dual-balance cash allocation
  cashAllocation: CashAllocationMetrics;
}

export interface LedgerEntry {
  no: number;
  id: string;
  date: string;
  description: string;
  categoryName: string;
  pillar?: PillarType;
  walletName: string;
  debit: number; // Income
  credit: number; // Expense
  adminFee: number;
  runningBalance: number;
  type: TransactionType;
}

export interface BookkeepingReport {
  periodMonth: string; // 'YYYY-MM'
  periodLabel: string; // 'Oktober 2026'
  generatedAt: string;
  userEmail: string;
  initialBalance: number;
  totalIncomeDebit: number;
  totalExpenseCredit: number;
  totalAdminFees: number;
  netCashflow: number;
  finalBalance: number;
  walletBalances: Array<{
    id: string;
    name: string;
    category: WalletCategory;
    balance: number;
  }>;
  ledgerEntries: LedgerEntry[];
  // Sinking Fund & Vault Reserve Statement
  vaultReserves: Array<{
    id: string;
    name: string;
    pillar: PillarType;
    mode: BudgetMode;
    monthlyPlanCap: number;
    accumulatedVaultReserve: number;
    currentMonthAllocated: number;
    totalBackedCash: number;
    targetFundAmount?: number | null;
  }>;
  // Worst-Case Emergency Reallocations Log
  emergencyReallocations: BudgetLedgerEntry[];
}
