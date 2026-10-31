import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Category, BudgetLedgerEntry, Transaction } from '../domain/types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_WALLETS,
  DEFAULT_TRANSACTIONS,
  DEFAULT_BUDGET_LEDGER,
} from '../domain/seedData';

const getCatLocalKey = (uid: string) => `rasio_categories_${uid}`;
const getLedgerLocalKey = (uid: string) => `rasio_budget_ledger_${uid}`;

export async function fetchCategories(uid: string): Promise<Category[]> {
  const defaultsMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

  let rawCategories: Category[] = [];
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, 'users', uid, 'budgets');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      rawCategories = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
    }
  } else {
    const saved = localStorage.getItem(getCatLocalKey(uid));
    if (saved) {
      rawCategories = JSON.parse(saved);
    }
  }

  if (rawCategories.length === 0) {
    return DEFAULT_CATEGORIES;
  }

  // Hydrate with defaults if any category missing monthlyPlanCap or budgetMode
  return rawCategories.map((c) => {
    const def = defaultsMap.get(c.id);
    const planCap =
      c.monthlyPlanCap !== undefined && c.monthlyPlanCap > 0
        ? c.monthlyPlanCap
        : c.budgetLimit !== undefined && c.budgetLimit > 0
        ? c.budgetLimit
        : def?.monthlyPlanCap || def?.budgetLimit || 0;

    return {
      ...def,
      ...c,
      monthlyPlanCap: planCap,
      budgetLimit: planCap,
      budgetMode: c.budgetMode || def?.budgetMode || 'ROUTINE_STRICT_CAP',
      accumulatedVaultReserve:
        c.accumulatedVaultReserve !== undefined ? c.accumulatedVaultReserve : (def?.accumulatedVaultReserve ?? 0),
      currentMonthAllocated:
        c.currentMonthAllocated !== undefined && c.currentMonthAllocated > 0
          ? c.currentMonthAllocated
          : (def?.currentMonthAllocated ?? planCap),
      targetFundAmount: c.targetFundAmount ?? def?.targetFundAmount,
      targetDate: c.targetDate ?? def?.targetDate,
      pillar: c.pillar || def?.pillar || 'NEEDS',
      color: c.color || def?.color || '#0D9488',
      iconName: c.iconName || def?.iconName || 'Tag',
    };
  });
}

export async function saveCategory(uid: string, category: Category): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'users', uid, 'budgets', category.id);
    await setDoc(docRef, category);
  } else {
    const current = await fetchCategories(uid);
    const existing = current.findIndex((c) => c.id === category.id);
    const updated =
      existing >= 0
        ? current.map((c) => (c.id === category.id ? category : c))
        : [...current, category];
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updated));
  }
}

export async function updateCategoryBudget(
  uid: string,
  categoryId: string,
  newMonthlyCap: number
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'users', uid, 'budgets', categoryId);
    await updateDoc(docRef, {
      monthlyPlanCap: newMonthlyCap,
      budgetLimit: newMonthlyCap,
    });
  } else {
    const current = await fetchCategories(uid);
    const updated = current.map((c) =>
      c.id === categoryId
        ? { ...c, monthlyPlanCap: newMonthlyCap, budgetLimit: newMonthlyCap }
        : c
    );
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updated));
  }
}

export async function fetchBudgetLedger(uid: string): Promise<BudgetLedgerEntry[]> {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, 'users', uid, 'budget_ledger');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BudgetLedgerEntry, 'id'>) }));
  } else {
    const saved = localStorage.getItem(getLedgerLocalKey(uid));
    return saved ? JSON.parse(saved) : DEFAULT_BUDGET_LEDGER;
  }
}

/**
 * ATOMIC SETOR ALOKASI BULANAN (MONTHLY_ALLOCATION):
 * Menambah kuota setoran alokasi bulan berjalan ke kategori dan mencatat mutasi internal ke budget_ledger.
 */
export async function allocateMonthlyBudget(
  uid: string,
  budgetId: string,
  amount: number,
  periodMonth: string,
  note = 'Setoran alokasi rutin bulanan'
): Promise<{ updatedCategory: Category; ledgerEntry: BudgetLedgerEntry }> {
  const currentCategories = await fetchCategories(uid);
  const targetCategory = currentCategories.find((c) => c.id === budgetId);

  if (!targetCategory) {
    throw new Error('Kategori anggaran tidak ditemukan.');
  }

  const updatedAllocated = (targetCategory.currentMonthAllocated || 0) + amount;
  const updatedCategory: Category = {
    ...targetCategory,
    currentMonthAllocated: updatedAllocated,
  };

  const ledgerId = `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const ledgerEntry: BudgetLedgerEntry = {
    id: ledgerId,
    type: 'MONTHLY_ALLOCATION',
    budgetId: targetCategory.id,
    budgetName: targetCategory.name,
    amount,
    date: todayStr,
    periodMonth,
    timestamp: Date.now(),
    note,
  };

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    const catDocRef = doc(db, 'users', uid, 'budgets', targetCategory.id);
    batch.update(catDocRef, { currentMonthAllocated: updatedAllocated });

    const ledgerDocRef = doc(db, 'users', uid, 'budget_ledger', ledgerId);
    batch.set(ledgerDocRef, ledgerEntry);

    await batch.commit();
  } else {
    const updatedList = currentCategories.map((c) =>
      c.id === budgetId ? updatedCategory : c
    );
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updatedList));

    const currentLedger = await fetchBudgetLedger(uid);
    localStorage.setItem(getLedgerLocalKey(uid), JSON.stringify([ledgerEntry, ...currentLedger]));
  }

  return { updatedCategory, ledgerEntry };
}

/**
 * ATOMIC MONTH-END ROLLOVER (MONTH_END_ROLLOVER):
 * Menutup bulan lalu: sisa alokasi yang belum terpakai otomatis dipindahkan ke accumulatedVaultReserve
 * dan mencatat riwayat rollover pada budget_ledger.
 */
export async function executeMonthEndRollover(
  uid: string,
  categories: Category[],
  transactions: Transaction[],
  prevPeriod: string,
  nextPeriod: string
): Promise<{ updatedCategories: Category[]; ledgerEntries: BudgetLedgerEntry[] }> {
  const prevTxs = transactions.filter((t) => t.date.startsWith(prevPeriod));
  const spentMap: Record<string, number> = {};

  prevTxs.forEach((t) => {
    if (t.type === 'EXPENSE' && t.categoryId && !t.isVaultSpend) {
      spentMap[t.categoryId] = (spentMap[t.categoryId] || 0) + t.amount;
    }
  });

  const ledgerEntries: BudgetLedgerEntry[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  const updatedCategories = categories.map((cat) => {
    const allocated = cat.currentMonthAllocated || cat.monthlyPlanCap || 0;
    const spent = spentMap[cat.id] || 0;
    const leftover = Math.max(0, allocated - spent);

    const newReserve = (cat.accumulatedVaultReserve || 0) + leftover;

    if (leftover > 0) {
      const ledgerId = `ro-${Date.now()}-${cat.id}`;
      ledgerEntries.push({
        id: ledgerId,
        type: 'MONTH_END_ROLLOVER',
        budgetId: cat.id,
        budgetName: cat.name,
        amount: leftover,
        date: todayStr,
        periodMonth: prevPeriod,
        timestamp: Date.now(),
        note: `Sisa anggaran ${prevPeriod} sebesar Rp ${leftover.toLocaleString('id-ID')} masuk ke Brankas Akumulasi Cadangan (Vault).`,
      });
    }

    return {
      ...cat,
      accumulatedVaultReserve: newReserve,
      currentMonthAllocated: cat.monthlyPlanCap, // Reset allocation for new month to default plan cap
      lastRolloverPeriod: nextPeriod,
    };
  });

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    updatedCategories.forEach((cat) => {
      const cRef = doc(db, 'users', uid, 'budgets', cat.id);
      batch.set(cRef, cat);
    });

    ledgerEntries.forEach((entry) => {
      const lRef = doc(db, 'users', uid, 'budget_ledger', entry.id);
      batch.set(lRef, entry);
    });

    await batch.commit();
  } else {
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updatedCategories));

    const currentLedger = await fetchBudgetLedger(uid);
    localStorage.setItem(getLedgerLocalKey(uid), JSON.stringify([...ledgerEntries, ...currentLedger]));
  }

  return { updatedCategories, ledgerEntries };
}

/**
 * ATOMIC WORST-CASE EMERGENCY REALLOCATION (WORST_CASE_REALLOCATION):
 * Memindahkan dana cadangan antar budget untuk kondisi darurat (misal: Tagihan membengkak)
 * lengkap dengan pencatatan audit log & alasan wajib.
 */
export async function emergencyReallocate(
  uid: string,
  fromBudgetId: string,
  toBudgetId: string,
  amount: number,
  reason: string,
  periodMonth: string
): Promise<{
  updatedFromCategory: Category;
  updatedToCategory: Category;
  ledgerEntry: BudgetLedgerEntry;
}> {
  if (!reason.trim()) {
    throw new Error('Alasan darurat wajib diisi.');
  }

  const categories = await fetchCategories(uid);
  const fromCat = categories.find((c) => c.id === fromBudgetId);
  const toCat = categories.find((c) => c.id === toBudgetId);

  if (!fromCat || !toCat) {
    throw new Error('Kategori asal atau tujuan tidak ditemukan.');
  }

  // Calculate available reserve in source
  const availableReserve =
    (fromCat.accumulatedVaultReserve || 0) + (fromCat.currentMonthAllocated || 0);

  if (amount > availableReserve) {
    throw new Error(
      `Dana cadangan tidak mencukupi. Tersedia: Rp ${availableReserve.toLocaleString('id-ID')}`
    );
  }

  // Deduct from fromCat reserve first, then allocated
  let deductionFromReserve = Math.min(fromCat.accumulatedVaultReserve || 0, amount);
  let deductionFromAllocated = amount - deductionFromReserve;

  const updatedFromCategory: Category = {
    ...fromCat,
    accumulatedVaultReserve: Math.max(0, (fromCat.accumulatedVaultReserve || 0) - deductionFromReserve),
    currentMonthAllocated: Math.max(0, (fromCat.currentMonthAllocated || 0) - deductionFromAllocated),
  };

  const updatedToCategory: Category = {
    ...toCat,
    currentMonthAllocated: (toCat.currentMonthAllocated || 0) + amount,
  };

  const ledgerId = `em-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const ledgerEntry: BudgetLedgerEntry = {
    id: ledgerId,
    type: 'WORST_CASE_REALLOCATION',
    budgetId: toCat.id,
    fromBudgetId: fromCat.id,
    fromBudgetName: fromCat.name,
    toBudgetId: toCat.id,
    toBudgetName: toCat.name,
    amount,
    date: todayStr,
    periodMonth,
    timestamp: Date.now(),
    reason: reason.trim(),
    note: `Realokasi Darurat: -Rp ${amount.toLocaleString('id-ID')} dari [${fromCat.name}] ke [${toCat.name}]. Alasan: ${reason.trim()}`,
  };

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    const fromRef = doc(db, 'users', uid, 'budgets', fromCat.id);
    batch.set(fromRef, updatedFromCategory);

    const toRef = doc(db, 'users', uid, 'budgets', toCat.id);
    batch.set(toRef, updatedToCategory);

    const ledgerRef = doc(db, 'users', uid, 'budget_ledger', ledgerId);
    batch.set(ledgerRef, ledgerEntry);

    await batch.commit();
  } else {
    const updatedList = categories.map((c) => {
      if (c.id === fromBudgetId) return updatedFromCategory;
      if (c.id === toBudgetId) return updatedToCategory;
      return c;
    });
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updatedList));

    const currentLedger = await fetchBudgetLedger(uid);
    localStorage.setItem(getLedgerLocalKey(uid), JSON.stringify([ledgerEntry, ...currentLedger]));
  }

  return {
    updatedFromCategory,
    updatedToCategory,
    ledgerEntry,
  };
}

/**
 * AUTO-ONBOARDING SEED:
 * Automatically initializes standard Indonesian accounts, categories, and seed data for new users.
 */
export async function initializeUserDataIfEmpty(uid: string): Promise<{
  walletsInitialized: boolean;
}> {
  if (isFirebaseConfigured && db) {
    const walletColRef = collection(db, 'users', uid, 'wallets');
    const snap = await getDocs(walletColRef);

    if (snap.empty) {
      const batch = writeBatch(db);

      DEFAULT_WALLETS.forEach((w) => {
        const wRef = doc(db, 'users', uid, 'wallets', w.id);
        batch.set(wRef, w);
      });

      DEFAULT_CATEGORIES.forEach((c) => {
        const cRef = doc(db, 'users', uid, 'budgets', c.id);
        batch.set(cRef, c);
      });

      DEFAULT_TRANSACTIONS.forEach((tx) => {
        const tRef = doc(db, 'users', uid, 'transactions', tx.id);
        batch.set(tRef, tx);
      });

      DEFAULT_BUDGET_LEDGER.forEach((bl) => {
        const blRef = doc(db, 'users', uid, 'budget_ledger', bl.id);
        batch.set(blRef, bl);
      });

      await batch.commit();
      return { walletsInitialized: true };
    }
    return { walletsInitialized: false };
  } else {
    const existing = localStorage.getItem(`rasio_wallets_${uid}`);
    if (!existing) {
      localStorage.setItem(`rasio_wallets_${uid}`, JSON.stringify(DEFAULT_WALLETS));
      localStorage.setItem(`rasio_categories_${uid}`, JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem(`rasio_tx_${uid}`, JSON.stringify(DEFAULT_TRANSACTIONS));
      localStorage.setItem(`rasio_budget_ledger_${uid}`, JSON.stringify(DEFAULT_BUDGET_LEDGER));
      return { walletsInitialized: true };
    }
    return { walletsInitialized: false };
  }
}
