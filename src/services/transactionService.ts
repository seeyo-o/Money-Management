import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Transaction, Wallet } from '../domain/types';
import { DEFAULT_TRANSACTIONS } from '../domain/seedData';

const getTxLocalKey = (uid: string) => `rasio_tx_${uid}`;
const getWalletLocalKey = (uid: string) => `rasio_wallets_${uid}`;

export async function fetchTransactions(uid: string): Promise<Transaction[]> {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, 'users', uid, 'transactions');
    const q = query(colRef, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }))
      .map((t) => (t.categoryId === 'cat-shopping' ? { ...t, categoryId: 'cat-skincare' } : t));
  } else {
    const saved = localStorage.getItem(getTxLocalKey(uid));
    const list: Transaction[] = saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
    return list.map((t) =>
      t.categoryId === 'cat-shopping' ? { ...t, categoryId: 'cat-skincare' } : t
    );
  }
}

/**
 * ATOMIC TRANSACTION CREATION (Using Firestore writeBatch)
 * Ensures transaction log and wallet balances are updated simultaneously.
 */
export async function createTransactionAtomic(
  uid: string,
  txData: Omit<Transaction, 'id' | 'createdAt'>,
  wallets: Wallet[]
): Promise<{ newTx: Transaction; updatedWallets: Wallet[] }> {
  const newTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newTx: Transaction = {
    ...txData,
    id: newTxId,
    createdAt: Date.now(),
  };

  // Compute balance changes locally first
  const updatedWallets = wallets.map((w) => {
    let newBal = w.balance;
    if (txData.type === 'INCOME' && w.id === txData.walletId) {
      newBal += txData.amount;
    } else if (txData.type === 'EXPENSE' && w.id === txData.walletId) {
      newBal -= txData.amount;
    } else if (txData.type === 'TRANSFER') {
      if (w.id === txData.walletId) {
        newBal -= (txData.amount + (txData.adminFee || 0));
      }
      if (w.id === txData.toWalletId) {
        newBal += txData.amount;
      }
    }
    return { ...w, balance: newBal };
  });

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    // 1. Write Transaction document
    const txDocRef = doc(db, 'users', uid, 'transactions', newTxId);
    batch.set(txDocRef, newTx);

    // 2. Update Source Wallet
    const sourceW = updatedWallets.find((w) => w.id === txData.walletId);
    if (sourceW) {
      const sourceDocRef = doc(db, 'users', uid, 'wallets', sourceW.id);
      batch.update(sourceDocRef, { balance: sourceW.balance });
    }

    // 3. Update Target Wallet if transfer
    if (txData.type === 'TRANSFER' && txData.toWalletId) {
      const targetW = updatedWallets.find((w) => w.id === txData.toWalletId);
      if (targetW) {
        const targetDocRef = doc(db, 'users', uid, 'wallets', targetW.id);
        batch.update(targetDocRef, { balance: targetW.balance });
      }
    }

    // Atomic commit
    await batch.commit();
  } else {
    // Local fallback
    const currentTxs = await fetchTransactions(uid);
    localStorage.setItem(getTxLocalKey(uid), JSON.stringify([newTx, ...currentTxs]));
    localStorage.setItem(getWalletLocalKey(uid), JSON.stringify(updatedWallets));
  }

  return { newTx, updatedWallets };
}

/**
 * ATOMIC TRANSACTION DELETION (Using Firestore writeBatch)
 * Reverses balance impacts on associated wallets.
 */
export async function deleteTransactionAtomic(
  uid: string,
  tx: Transaction,
  wallets: Wallet[]
): Promise<Wallet[]> {
  const updatedWallets = wallets.map((w) => {
    let newBal = w.balance;
    if (tx.type === 'INCOME' && w.id === tx.walletId) {
      newBal -= tx.amount;
    } else if (tx.type === 'EXPENSE' && w.id === tx.walletId) {
      newBal += tx.amount;
    } else if (tx.type === 'TRANSFER') {
      if (w.id === tx.walletId) {
        newBal += (tx.amount + (tx.adminFee || 0));
      }
      if (w.id === tx.toWalletId) {
        newBal -= tx.amount;
      }
    }
    return { ...w, balance: newBal };
  });

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    // 1. Delete Transaction document
    const txDocRef = doc(db, 'users', uid, 'transactions', tx.id);
    batch.delete(txDocRef);

    // 2. Revert Source Wallet
    const sourceW = updatedWallets.find((w) => w.id === tx.walletId);
    if (sourceW) {
      const sourceDocRef = doc(db, 'users', uid, 'wallets', sourceW.id);
      batch.update(sourceDocRef, { balance: sourceW.balance });
    }

    // 3. Revert Target Wallet if transfer
    if (tx.type === 'TRANSFER' && tx.toWalletId) {
      const targetW = updatedWallets.find((w) => w.id === tx.toWalletId);
      if (targetW) {
        const targetDocRef = doc(db, 'users', uid, 'wallets', targetW.id);
        batch.update(targetDocRef, { balance: targetW.balance });
      }
    }

    await batch.commit();
  } else {
    const currentTxs = await fetchTransactions(uid);
    const filtered = currentTxs.filter((t) => t.id !== tx.id);
    localStorage.setItem(getTxLocalKey(uid), JSON.stringify(filtered));
    localStorage.setItem(getWalletLocalKey(uid), JSON.stringify(updatedWallets));
  }

  return updatedWallets;
}

/**
 * ATOMIC WALLET RECONCILIATION
 * Adjusts wallet balance to actual count and logs an adjustment transaction.
 */
export async function reconcileWalletAtomic(
  uid: string,
  wallet: Wallet,
  actualBalance: number,
  note = 'Penyesuaian Saldo Aktual (Rekonsiliasi)'
): Promise<{ adjustmentTx: Transaction; updatedWallet: Wallet }> {
  const diff = actualBalance - wallet.balance;
  const todayStr = new Date().toISOString().split('T')[0];
  const newTxId = `adj-${Date.now()}`;

  const adjustmentTx: Transaction = {
    id: newTxId,
    type: diff > 0 ? 'INCOME' : 'EXPENSE',
    amount: Math.abs(diff),
    date: todayStr,
    walletId: wallet.id,
    categoryId: 'cat-adjustment',
    note: `${note} (${diff > 0 ? '+' : ''}${diff.toLocaleString('id-ID')})`,
    createdAt: Date.now(),
  };

  const updatedWallet: Wallet = {
    ...wallet,
    balance: actualBalance,
  };

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    const txDocRef = doc(db, 'users', uid, 'transactions', newTxId);
    batch.set(txDocRef, adjustmentTx);

    const walletDocRef = doc(db, 'users', uid, 'wallets', wallet.id);
    batch.update(walletDocRef, { balance: actualBalance });

    await batch.commit();
  } else {
    const currentTxs = await fetchTransactions(uid);
    localStorage.setItem(getTxLocalKey(uid), JSON.stringify([adjustmentTx, ...currentTxs]));

    const currentWallets = JSON.parse(localStorage.getItem(getWalletLocalKey(uid)) || '[]') as Wallet[];
    const updated = currentWallets.map((w) => (w.id === wallet.id ? updatedWallet : w));
    localStorage.setItem(getWalletLocalKey(uid), JSON.stringify(updated));
  }

  return { adjustmentTx, updatedWallet };
}
