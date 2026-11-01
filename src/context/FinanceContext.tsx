import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Wallet,
  Category,
  Transaction,
  MonthSummary,
  ForecastingMetrics,
  CategoryBudgetState,
  BudgetLedgerEntry,
  CashAllocationMetrics,
} from '../domain/types';
import { useAuth } from './AuthContext';
import { fetchWallets, saveWallet, deleteWallet as apiDeleteWallet } from '../services/walletService';
import {
  fetchTransactions,
  createTransactionAtomic,
  deleteTransactionAtomic,
  reconcileWalletAtomic,
} from '../services/transactionService';
import {
  fetchCategories,
  saveCategory as apiSaveCategory,
  updateCategoryBudget as apiUpdateCategoryBudget,
  allocateMonthlyBudget as apiAllocateMonthlyBudget,
  adjustBudgetAllocation as apiAdjustBudgetAllocation,
  type AllocationAction,
  executeMonthEndRollover as apiExecuteMonthEndRollover,
  emergencyReallocate as apiEmergencyReallocate,
  fetchBudgetLedger as apiFetchBudgetLedger,
  initializeUserDataIfEmpty,
  resetUserDataToZero,
} from '../services/budgetService';
import {
  calculateMonthSummary,
  calculateCategorySpending,
  calculateForecastingMetrics,
} from '../domain/financeEngine';
import { calculateOverallCashAllocation } from '../domain/budgetEngine';

interface FinanceContextType {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgetLedger: BudgetLedgerEntry[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isLoading: boolean;
  totalBankBalance: number;
  totalEwalletBalance: number;
  totalCashBalance: number;
  netWorth: number;
  cashAllocation: CashAllocationMetrics;
  monthSummary: MonthSummary;
  categorySpendings: CategoryBudgetState[];
  forecasting: ForecastingMetrics;
  addTransaction: (txData: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (tx: Transaction) => Promise<void>;
  reconcileWallet: (wallet: Wallet, actualBalance: number, note?: string) => Promise<void>;
  addWallet: (walletData: Omit<Wallet, 'id'>) => Promise<void>;
  updateWallet: (wallet: Wallet) => Promise<void>;
  deleteWallet: (walletId: string) => Promise<void>;
  updateBudgetLimit: (categoryId: string, limit: number, syncAllocation?: boolean) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  allocateBudget: (budgetId: string, amount: number, note?: string) => Promise<void>;
  adjustBudgetAllocation: (
    budgetId: string,
    action: AllocationAction,
    amount: number,
    note?: string,
    syncPlanCap?: boolean
  ) => Promise<void>;
  triggerMonthEndRollover: (prevPeriod: string, nextPeriod: string) => Promise<void>;
  performEmergencyReallocation: (
    fromBudgetId: string,
    toBudgetId: string,
    amount: number,
    reason: string
  ) => Promise<void>;
  resetAllDataToZero: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const currentDefaultMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetLedger, setBudgetLedger] = useState<BudgetLedgerEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDefaultMonth);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setWallets([]);
      setCategories([]);
      setTransactions([]);
      setBudgetLedger([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await initializeUserDataIfEmpty(user.uid, user.email);

      let [wList, cList, tList, blList] = await Promise.all([
        fetchWallets(user.uid),
        fetchCategories(user.uid),
        fetchTransactions(user.uid),
        apiFetchBudgetLedger(user.uid),
      ]);

      // AUTO-CLEANUP FOR REAL REGISTERED USERS:
      // If user is not demo.user@rasio.id, but has demo transactions or demo seed balances
      // (from earlier signups before clean slate was enabled), reset to clean zero slate.
      const isDemo = user.email === 'demo.user@rasio.id';
      const hasDemoData =
        tList.some((t) => t.id === 'tx-01' || t.id === 'tx-02') ||
        wList.some((w) => w.id === 'w-bca' && w.balance === 24500000);

      if (!isDemo && hasDemoData) {
        console.log('Real registered user detected with demo seed data. Resetting to clean zero state...');
        await resetUserDataToZero(user.uid);
        [wList, cList, tList, blList] = await Promise.all([
          fetchWallets(user.uid),
          fetchCategories(user.uid),
          fetchTransactions(user.uid),
          apiFetchBudgetLedger(user.uid),
        ]);
      }

      setWallets(wList);
      setCategories(cList);
      setTransactions(tList);
      setBudgetLedger(blList);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Liquidity breakdown
  const { totalBankBalance, totalEwalletBalance, totalCashBalance, netWorth } = useMemo(() => {
    let bank = 0;
    let ewallet = 0;
    let cash = 0;
    let total = 0;

    wallets.forEach((w) => {
      const bal = w.balance || 0;
      total += bal;
      if (w.category === 'BANK') bank += bal;
      else if (w.category === 'EWALLET') ewallet += bal;
      else cash += bal;
    });

    return {
      totalBankBalance: bank,
      totalEwalletBalance: ewallet,
      totalCashBalance: cash,
      netWorth: total,
    };
  }, [wallets]);

  // Monthly summary
  const monthSummary = useMemo(() => {
    return calculateMonthSummary(transactions, categories, wallets, selectedMonth);
  }, [transactions, categories, wallets, selectedMonth]);

  // Category spending progress (Dual-balance state)
  const categorySpendings = useMemo(() => {
    return calculateCategorySpending(categories, transactions, selectedMonth);
  }, [categories, transactions, selectedMonth]);

  // Rational Forecasting
  const forecasting = useMemo(() => {
    return calculateForecastingMetrics(wallets, categories, transactions, selectedMonth);
  }, [wallets, categories, transactions, selectedMonth]);

  // Cash allocation metrics (Physical vs Locked vs Free Cash)
  const cashAllocation = useMemo(() => {
    return calculateOverallCashAllocation(wallets, categories, transactions, selectedMonth);
  }, [wallets, categories, transactions, selectedMonth]);

  // Atomic Methods
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { newTx, updatedWallets } = await createTransactionAtomic(user.uid, txData, wallets);
    setTransactions((prev) => [newTx, ...prev]);
    setWallets(updatedWallets);
  };

  const deleteTransaction = async (tx: Transaction) => {
    if (!user) return;
    const updatedWallets = await deleteTransactionAtomic(user.uid, tx, wallets);
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    setWallets(updatedWallets);
  };

  const reconcileWallet = async (wallet: Wallet, actualBalance: number, note?: string) => {
    if (!user) return;
    const { adjustmentTx, updatedWallet } = await reconcileWalletAtomic(
      user.uid,
      wallet,
      actualBalance,
      note
    );
    setTransactions((prev) => [adjustmentTx, ...prev]);
    setWallets((prev) => prev.map((w) => (w.id === wallet.id ? updatedWallet : w)));
  };

  const addWallet = async (walletData: Omit<Wallet, 'id'>) => {
    if (!user) return;
    const newWallet: Wallet = {
      ...walletData,
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    await saveWallet(user.uid, newWallet);
    setWallets((prev) => [...prev, newWallet]);
  };

  const updateWallet = async (wallet: Wallet) => {
    if (!user) return;
    await saveWallet(user.uid, wallet);
    setWallets((prev) => prev.map((w) => (w.id === wallet.id ? wallet : w)));
  };

  const deleteWalletAction = async (walletId: string) => {
    if (!user) return;
    await apiDeleteWallet(user.uid, walletId);
    setWallets((prev) => prev.filter((w) => w.id !== walletId));
  };

  const updateBudgetLimit = async (
    categoryId: string,
    limit: number,
    syncAllocation = false
  ) => {
    if (!user) return;
    await apiUpdateCategoryBudget(user.uid, categoryId, limit, syncAllocation);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              monthlyPlanCap: limit,
              budgetLimit: limit,
              ...(syncAllocation ? { currentMonthAllocated: limit } : {}),
            }
          : c
      )
    );
  };

  const saveCategoryAction = async (category: Category) => {
    if (!user) return;
    await apiSaveCategory(user.uid, category);
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        return prev.map((c) => (c.id === category.id ? category : c));
      }
      return [...prev, category];
    });
  };

  // Setor / Tarik / Koreksi alokasi anggaran bulanan
  const adjustBudgetAllocation = async (
    budgetId: string,
    action: AllocationAction,
    amount: number,
    note?: string,
    syncPlanCap = false
  ) => {
    if (!user) return;
    const { updatedCategory, ledgerEntry } = await apiAdjustBudgetAllocation(
      user.uid,
      budgetId,
      action,
      amount,
      selectedMonth,
      note,
      syncPlanCap
    );
    setCategories((prev) => prev.map((c) => (c.id === budgetId ? updatedCategory : c)));
    if (ledgerEntry.amount > 0) {
      setBudgetLedger((prev) => [ledgerEntry, ...prev]);
    }
  };

  const allocateBudget = async (budgetId: string, amount: number, note?: string) => {
    await adjustBudgetAllocation(budgetId, 'TOP_UP', amount, note);
  };

  // Rollover pergantian bulan
  const triggerMonthEndRollover = async (prevPeriod: string, nextPeriod: string) => {
    if (!user) return;
    const { updatedCategories, ledgerEntries } = await apiExecuteMonthEndRollover(
      user.uid,
      categories,
      transactions,
      prevPeriod,
      nextPeriod
    );
    setCategories(updatedCategories);
    setBudgetLedger((prev) => [...ledgerEntries, ...prev]);
  };

  // Realokasi Darurat (Worst-Case)
  const performEmergencyReallocation = async (
    fromBudgetId: string,
    toBudgetId: string,
    amount: number,
    reason: string
  ) => {
    if (!user) return;
    const { updatedFromCategory, updatedToCategory, ledgerEntry } = await apiEmergencyReallocate(
      user.uid,
      fromBudgetId,
      toBudgetId,
      amount,
      reason,
      selectedMonth
    );
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === fromBudgetId) return updatedFromCategory;
        if (c.id === toBudgetId) return updatedToCategory;
        return c;
      })
    );
    setBudgetLedger((prev) => [ledgerEntry, ...prev]);
  };

  const resetAllDataToZero = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await resetUserDataToZero(user.uid);
      await loadData();
    } catch (err) {
      console.error('Failed to reset user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        wallets,
        categories,
        transactions,
        budgetLedger,
        selectedMonth,
        setSelectedMonth,
        isLoading,
        totalBankBalance,
        totalEwalletBalance,
        totalCashBalance,
        netWorth,
        cashAllocation,
        monthSummary,
        categorySpendings,
        forecasting,
        addTransaction,
        deleteTransaction,
        reconcileWallet,
        addWallet,
        updateWallet,
        deleteWallet: deleteWalletAction,
        updateBudgetLimit,
        saveCategory: saveCategoryAction,
        allocateBudget,
        adjustBudgetAllocation,
        triggerMonthEndRollover,
        performEmergencyReallocation,
        resetAllDataToZero,
        refreshData: loadData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
};
