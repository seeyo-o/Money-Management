import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Category, BudgetLedgerEntry, Transaction, Wallet } from '../domain/types';
import { fetchWallets } from './walletService';
import { fetchTransactions } from './transactionService';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_WALLETS,
  DEFAULT_TRANSACTIONS,
  DEFAULT_BUDGET_LEDGER,
  CLEAN_DEFAULT_WALLETS,
  CLEAN_DEFAULT_CATEGORIES,
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
    return CLEAN_DEFAULT_CATEGORIES;
  }

  // 1. MIGRATION: Remove deleted categories (cat-shopping, cat-entertainment, cat-housing, cat-coffee)
  const deprecatedIds = ['cat-shopping', 'cat-entertainment', 'cat-housing', 'cat-coffee'];
  const hasDeprecated = rawCategories.some((c) => deprecatedIds.includes(c.id));
  if (hasDeprecated) {
    rawCategories = rawCategories.filter((c) => !deprecatedIds.includes(c.id));
    if (isFirebaseConfigured && db) {
      deprecatedIds.forEach((dId) => {
        deleteDoc(doc(db, 'users', uid, 'budgets', dId)).catch(() => {});
      });
    }
  }

  // 2. MIGRATION: Ensure new categories (cat-vehicle-tax, cat-fashion, cat-skincare, cat-hangout-friends, cat-hangout-gf) exist
  const existingIds = new Set(rawCategories.map((c) => c.id));
  const missingCategories = CLEAN_DEFAULT_CATEGORIES.filter((c) => !existingIds.has(c.id));
  if (missingCategories.length > 0) {
    rawCategories = [...rawCategories, ...missingCategories];
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      missingCategories.forEach((mc) => {
        batch.set(doc(db, 'users', uid, 'budgets', mc.id), mc);
      });
      batch.commit().catch(() => {});
    }
  }

  // Hydrate with defaults for icons/colors/names without overwriting user's 0 numbers
  return rawCategories.map((c) => {
    const def = defaultsMap.get(c.id);
    const planCap =
      c.monthlyPlanCap !== undefined
        ? c.monthlyPlanCap
        : c.budgetLimit !== undefined
        ? c.budgetLimit
        : 0;

    let categoryName = c.name || def?.name || 'Kategori';
    let iconName = c.iconName || def?.iconName || 'Tag';

    // Rename legacy motor service to Service Kendaraan / Armada
    if (c.id === 'cat-motor-service') {
      if (!c.name || c.name === 'Service Motor & Perawatan') {
        categoryName = 'Service Kendaraan / Armada';
      }
      iconName = 'Wrench';
    }

    return {
      ...def,
      ...c,
      name: categoryName,
      iconName,
      monthlyPlanCap: planCap,
      budgetLimit: planCap,
      budgetMode: 'ROUTINE_STRICT_CAP',
      accumulatedVaultReserve:
        c.accumulatedVaultReserve !== undefined ? c.accumulatedVaultReserve : 0,
      currentMonthAllocated:
        c.currentMonthAllocated !== undefined ? c.currentMonthAllocated : planCap,
      targetFundAmount: 0,
      targetDate: null,
      pillar: c.pillar || def?.pillar || 'NEEDS',
      color: c.color || def?.color || '#0D9488',
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
  newMonthlyCap: number,
  syncAllocation = false
): Promise<void> {
  const patch: Record<string, any> = {
    monthlyPlanCap: newMonthlyCap,
    budgetLimit: newMonthlyCap,
  };
  if (syncAllocation) {
    patch.currentMonthAllocated = newMonthlyCap;
  }

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'users', uid, 'budgets', categoryId);
    await updateDoc(docRef, patch);
  } else {
    const current = await fetchCategories(uid);
    const updated = current.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            ...patch,
          }
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

export type AllocationAction = 'SET_TOTAL' | 'TOP_UP' | 'WITHDRAW';

/**
 * ATOMIC ADJUST / SETOR / TARIK ALOKASI ANGGARAN:
 * Memungkinkan pengguna untuk:
 * - 'SET_TOTAL': Mengoreksi atau mengatur total alokasi bulan ini langsung ke nominal baru (misal: dari 750k menjadi 400k).
 * - 'WITHDRAW': Menarik kembali kelebihan alokasi kembali ke Saldo Bebas (Free Cash).
 * - 'TOP_UP': Menambah alokasi di atas alokasi yang sudah ada.
 * Serta secara opsional menyinkronkan monthlyPlanCap / budgetLimit jika diinginkan pengguna.
 */
export async function adjustBudgetAllocation(
  uid: string,
  budgetId: string,
  action: AllocationAction,
  amount: number,
  periodMonth: string,
  note?: string,
  syncPlanCap = false
): Promise<{ updatedCategory: Category; ledgerEntry: BudgetLedgerEntry }> {
  const currentCategories = await fetchCategories(uid);
  const targetCategory = currentCategories.find((c) => c.id === budgetId);

  if (!targetCategory) {
    throw new Error('Kategori anggaran tidak ditemukan.');
  }

  const prevAllocated = targetCategory.currentMonthAllocated || 0;
  let newAllocated = prevAllocated;
  let ledgerType: BudgetMutationType = 'MONTHLY_ALLOCATION';
  let mutationAmount = 0;
  let defaultNote = '';

  if (action === 'SET_TOTAL') {
    newAllocated = Math.max(0, amount);
    const delta = newAllocated - prevAllocated;

    if (delta > 0) {
      ledgerType = 'MONTHLY_ALLOCATION';
      mutationAmount = delta;
      defaultNote = `Penyesuaian alokasi: Rp ${prevAllocated.toLocaleString('id-ID')} -> Rp ${newAllocated.toLocaleString('id-ID')} (+Rp ${delta.toLocaleString('id-ID')})`;
    } else if (delta < 0) {
      ledgerType = 'ALLOCATION_WITHDRAWAL';
      mutationAmount = Math.abs(delta);
      defaultNote = `Koreksi alokasi: Rp ${prevAllocated.toLocaleString('id-ID')} -> Rp ${newAllocated.toLocaleString('id-ID')} (Penarikan Rp ${mutationAmount.toLocaleString('id-ID')} kembali ke Saldo Bebas)`;
    } else {
      mutationAmount = 0;
      defaultNote = `Pembaruan alokasi anggaran tetap Rp ${newAllocated.toLocaleString('id-ID')}`;
    }
  } else if (action === 'WITHDRAW') {
    if (amount <= 0) {
      throw new Error('Nominal penarikan harus lebih dari Rp 0.');
    }
    if (amount > prevAllocated) {
      throw new Error(
        `Nominal penarikan (Rp ${amount.toLocaleString('id-ID')}) melebihi alokasi yang tersedia (Rp ${prevAllocated.toLocaleString('id-ID')}).`
      );
    }
    newAllocated = Math.max(0, prevAllocated - amount);
    ledgerType = 'ALLOCATION_WITHDRAWAL';
    mutationAmount = amount;
    defaultNote = `Penarikan alokasi Rp ${amount.toLocaleString('id-ID')} kembali ke Saldo Bebas (Sisa Alokasi: Rp ${newAllocated.toLocaleString('id-ID')})`;
  } else if (action === 'TOP_UP') {
    if (amount <= 0) {
      throw new Error('Nominal setoran alokasi harus lebih dari Rp 0.');
    }
    newAllocated = prevAllocated + amount;
    ledgerType = 'MONTHLY_ALLOCATION';
    mutationAmount = amount;
    defaultNote = `Setoran alokasi tambahan Rp ${amount.toLocaleString('id-ID')}`;
  }

  const updatedCategory: Category = {
    ...targetCategory,
    currentMonthAllocated: newAllocated,
    ...(syncPlanCap
      ? {
          monthlyPlanCap: newAllocated,
          budgetLimit: newAllocated,
        }
      : {}),
  };

  const ledgerId = `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const ledgerEntry: BudgetLedgerEntry = {
    id: ledgerId,
    type: ledgerType,
    budgetId: targetCategory.id,
    budgetName: targetCategory.name,
    amount: mutationAmount,
    date: todayStr,
    periodMonth,
    timestamp: Date.now(),
    note: note && note.trim() ? note.trim() : defaultNote,
  };

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    const catDocRef = doc(db, 'users', uid, 'budgets', targetCategory.id);
    const updatePayload: Record<string, any> = { currentMonthAllocated: newAllocated };
    if (syncPlanCap) {
      updatePayload.monthlyPlanCap = newAllocated;
      updatePayload.budgetLimit = newAllocated;
    }
    batch.update(catDocRef, updatePayload);

    if (mutationAmount > 0) {
      const ledgerDocRef = doc(db, 'users', uid, 'budget_ledger', ledgerId);
      batch.set(ledgerDocRef, ledgerEntry);
    }

    await batch.commit();
  } else {
    const updatedList = currentCategories.map((c) =>
      c.id === budgetId ? updatedCategory : c
    );
    localStorage.setItem(getCatLocalKey(uid), JSON.stringify(updatedList));

    if (mutationAmount > 0) {
      const currentLedger = await fetchBudgetLedger(uid);
      localStorage.setItem(getLedgerLocalKey(uid), JSON.stringify([ledgerEntry, ...currentLedger]));
    }
  }

  return { updatedCategory, ledgerEntry };
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
  return adjustBudgetAllocation(uid, budgetId, 'TOP_UP', amount, periodMonth, note);
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
 * AUTO-MIGRATE OFFLINE LOCALSTORAGE DATA TO CLOUD FIRESTORE:
 * If a user used the app while in offline/demo storage mode on their laptop,
 * and later connects Firebase, this migrates their saved local data directly into Cloud Firestore
 * so they don't lose any data and it becomes immediately available on mobile (HP).
 */
export async function migrateLocalDataToFirestoreIfAvailable(
  firebaseUid: string,
  userEmail: string
): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !userEmail) return false;

  const mockUid = `user-${btoa(userEmail).replace(/=/g, '')}`;
  const mockUidLower = `user-${btoa(userEmail.toLowerCase()).replace(/=/g, '')}`;

  let walletsStr =
    localStorage.getItem(`rasio_wallets_${mockUid}`) ||
    localStorage.getItem(`rasio_wallets_${mockUidLower}`);
  let catsStr =
    localStorage.getItem(`rasio_categories_${mockUid}`) ||
    localStorage.getItem(`rasio_categories_${mockUidLower}`);
  let txsStr =
    localStorage.getItem(`rasio_tx_${mockUid}`) ||
    localStorage.getItem(`rasio_tx_${mockUidLower}`);
  let ledgerStr =
    localStorage.getItem(`rasio_budget_ledger_${mockUid}`) ||
    localStorage.getItem(`rasio_budget_ledger_${mockUidLower}`);

  // Fallback: search any user session key if specific email key not found
  if (!walletsStr && !catsStr && !txsStr) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rasio_wallets_user-')) {
          const uId = k.replace('rasio_wallets_', '');
          walletsStr = localStorage.getItem(`rasio_wallets_${uId}`);
          catsStr = localStorage.getItem(`rasio_categories_${uId}`);
          txsStr = localStorage.getItem(`rasio_tx_${uId}`);
          ledgerStr = localStorage.getItem(`rasio_budget_ledger_${uId}`);
          if (walletsStr || catsStr || txsStr) break;
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
  }

  if (!walletsStr && !catsStr && !txsStr) {
    return false;
  }

  // Check if Firestore already has real transactions or balances
  const [snapTxs, snapWallets] = await Promise.all([
    getDocs(collection(db, 'users', firebaseUid, 'transactions')),
    getDocs(collection(db, 'users', firebaseUid, 'wallets')),
  ]);

  if (!snapTxs.empty) {
    return false; // Already has cloud transactions
  }
  if (!snapWallets.empty) {
    const hasBalance = snapWallets.docs.some((d) => (d.data().balance || 0) > 0);
    if (hasBalance) return false;
  }

  const localWallets: Wallet[] = walletsStr ? JSON.parse(walletsStr) : [];
  const localCats: Category[] = catsStr ? JSON.parse(catsStr) : [];
  const localTxs: Transaction[] = txsStr ? JSON.parse(txsStr) : [];
  const localLedger: BudgetLedgerEntry[] = ledgerStr ? JSON.parse(ledgerStr) : [];

  const hasRealData =
    localTxs.length > 0 ||
    localWallets.some((w) => (w.balance || 0) > 0) ||
    localCats.some((c) => (c.monthlyPlanCap || 0) > 0);

  if (!hasRealData) return false;

  console.log('Migrating local offline data to Cloud Firestore for user:', userEmail);
  const batch = writeBatch(db);

  localWallets.forEach((w) => {
    batch.set(doc(db, 'users', firebaseUid, 'wallets', w.id), w);
  });

  localCats.forEach((c) => {
    batch.set(doc(db, 'users', firebaseUid, 'budgets', c.id), c);
  });

  localTxs.forEach((t) => {
    batch.set(doc(db, 'users', firebaseUid, 'transactions', t.id), t);
  });

  localLedger.forEach((l) => {
    batch.set(doc(db, 'users', firebaseUid, 'budget_ledger', l.id), l);
  });

  await batch.commit();
  return true;
}

/**
 * AUTO-ONBOARDING SEED:
 * Initializes empty zero-slate accounts and categories for regular users,
 * or full demo accounts specifically for demo.user@rasio.id.
 */
export async function initializeUserDataIfEmpty(
  uid: string,
  userEmail?: string | null
): Promise<{ walletsInitialized: boolean }> {
  // If userEmail is provided and Firebase is configured, attempt auto-migration first!
  if (isFirebaseConfigured && db && userEmail) {
    try {
      const didMigrate = await migrateLocalDataToFirestoreIfAvailable(uid, userEmail);
      if (didMigrate) {
        return { walletsInitialized: true };
      }
    } catch (e) {
      console.warn('Auto-migration error:', e);
    }
  }

  const isDemo = userEmail === 'demo.user@rasio.id';

  const walletsToSeed = isDemo ? DEFAULT_WALLETS : CLEAN_DEFAULT_WALLETS;
  const categoriesToSeed = isDemo ? DEFAULT_CATEGORIES : CLEAN_DEFAULT_CATEGORIES;
  const txsToSeed = isDemo ? DEFAULT_TRANSACTIONS : [];
  const ledgerToSeed = isDemo ? DEFAULT_BUDGET_LEDGER : [];

  if (isFirebaseConfigured && db) {
    const walletColRef = collection(db, 'users', uid, 'wallets');
    const snap = await getDocs(walletColRef);

    if (snap.empty) {
      const batch = writeBatch(db);

      walletsToSeed.forEach((w) => {
        const wRef = doc(db, 'users', uid, 'wallets', w.id);
        batch.set(wRef, w);
      });

      categoriesToSeed.forEach((c) => {
        const cRef = doc(db, 'users', uid, 'budgets', c.id);
        batch.set(cRef, c);
      });

      txsToSeed.forEach((tx) => {
        const tRef = doc(db, 'users', uid, 'transactions', tx.id);
        batch.set(tRef, tx);
      });

      ledgerToSeed.forEach((bl) => {
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
      localStorage.setItem(`rasio_wallets_${uid}`, JSON.stringify(walletsToSeed));
      localStorage.setItem(`rasio_categories_${uid}`, JSON.stringify(categoriesToSeed));
      localStorage.setItem(`rasio_tx_${uid}`, JSON.stringify(txsToSeed));
      localStorage.setItem(`rasio_budget_ledger_${uid}`, JSON.stringify(ledgerToSeed));
      return { walletsInitialized: true };
    }
    return { walletsInitialized: false };
  }
}

/**
 * RESET ALL DATA TO ZERO:
 * Resets all wallets to Rp 0, clears all transactions, resets all budget limits to Rp 0.
 */
export async function resetUserDataToZero(uid: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    // 1. Reset all wallets to balance 0
    CLEAN_DEFAULT_WALLETS.forEach((w) => {
      const wRef = doc(db, 'users', uid, 'wallets', w.id);
      batch.set(wRef, w);
    });

    // 2. Reset all categories to 0 caps & delete legacy categories
    CLEAN_DEFAULT_CATEGORIES.forEach((c) => {
      const cRef = doc(db, 'users', uid, 'budgets', c.id);
      batch.set(cRef, c);
    });
    ['cat-shopping', 'cat-entertainment', 'cat-housing', 'cat-coffee'].forEach((dId) => {
      batch.delete(doc(db, 'users', uid, 'budgets', dId));
    });

    // 3. Delete all transactions
    const txColRef = collection(db, 'users', uid, 'transactions');
    const txSnap = await getDocs(txColRef);
    txSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 4. Delete all budget ledger entries
    const ledgerColRef = collection(db, 'users', uid, 'budget_ledger');
    const ledgerSnap = await getDocs(ledgerColRef);
    ledgerSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
  } else {
    localStorage.setItem(`rasio_wallets_${uid}`, JSON.stringify(CLEAN_DEFAULT_WALLETS));
    localStorage.setItem(`rasio_categories_${uid}`, JSON.stringify(CLEAN_DEFAULT_CATEGORIES));
    localStorage.setItem(`rasio_tx_${uid}`, JSON.stringify([]));
    localStorage.setItem(`rasio_budget_ledger_${uid}`, JSON.stringify([]));
  }
}

/**
 * EXPORT ALL DATA TO JSON
 * Allows the user to save a complete offline backup file of all their data.
 */
export async function exportAllUserDataJSON(
  uid: string,
  userEmail?: string | null
): Promise<string> {
  const [wallets, categories, transactions, budgetLedger] = await Promise.all([
    fetchWallets(uid),
    fetchCategories(uid),
    fetchTransactions(uid),
    fetchBudgetLedger(uid),
  ]);

  const exportData = {
    app: 'Rasio FinFlow',
    version: 1,
    exportedAt: new Date().toISOString(),
    userEmail: userEmail || null,
    wallets,
    categories,
    transactions,
    budgetLedger,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * IMPORT ALL DATA FROM JSON
 * Restores a full backup from a JSON file into either Firestore or localStorage.
 */
export async function importAllUserDataJSON(
  uid: string,
  jsonString: string
): Promise<{
  success: boolean;
  error?: string;
  stats?: { wallets: number; categories: number; transactions: number };
}> {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Format data JSON tidak valid.' };
    }

    const wallets = Array.isArray(data.wallets) ? data.wallets : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const budgetLedger = Array.isArray(data.budgetLedger) ? data.budgetLedger : [];

    if (wallets.length === 0 && categories.length === 0 && transactions.length === 0) {
      return { success: false, error: 'File cadangan tidak berisi data dompet atau transaksi.' };
    }

    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);

      wallets.forEach((w: any) => {
        batch.set(doc(db, 'users', uid, 'wallets', w.id), w);
      });

      categories.forEach((c: any) => {
        batch.set(doc(db, 'users', uid, 'budgets', c.id), c);
      });

      transactions.forEach((t: any) => {
        batch.set(doc(db, 'users', uid, 'transactions', t.id), t);
      });

      budgetLedger.forEach((l: any) => {
        batch.set(doc(db, 'users', uid, 'budget_ledger', l.id), l);
      });

      await batch.commit();
    } else {
      localStorage.setItem(`rasio_wallets_${uid}`, JSON.stringify(wallets));
      localStorage.setItem(`rasio_categories_${uid}`, JSON.stringify(categories));
      localStorage.setItem(`rasio_tx_${uid}`, JSON.stringify(transactions));
      localStorage.setItem(`rasio_budget_ledger_${uid}`, JSON.stringify(budgetLedger));
    }

    return {
      success: true,
      stats: {
        wallets: wallets.length,
        categories: categories.length,
        transactions: transactions.length,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Gagal memproses file JSON.' };
  }
}

