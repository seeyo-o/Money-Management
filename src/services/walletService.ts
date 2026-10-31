import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { Wallet } from '../domain/types';
import { DEFAULT_WALLETS } from '../domain/seedData';

const getLocalKey = (uid: string) => `rasio_wallets_${uid}`;

export async function fetchWallets(uid: string): Promise<Wallet[]> {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, 'users', uid, 'wallets');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
  } else {
    // Local storage fallback for mock dev
    const saved = localStorage.getItem(getLocalKey(uid));
    return saved ? JSON.parse(saved) : DEFAULT_WALLETS;
  }
}

export async function saveWallet(uid: string, wallet: Wallet): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'users', uid, 'wallets', wallet.id);
    await setDoc(docRef, wallet);
  } else {
    const list = await fetchWallets(uid);
    const existing = list.findIndex((w) => w.id === wallet.id);
    const updated = existing >= 0 ? list.map((w) => (w.id === wallet.id ? wallet : w)) : [...list, wallet];
    localStorage.setItem(getLocalKey(uid), JSON.stringify(updated));
  }
}

export async function deleteWallet(uid: string, walletId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'users', uid, 'wallets', walletId);
    await deleteDoc(docRef);
  } else {
    const list = await fetchWallets(uid);
    const updated = list.filter((w) => w.id !== walletId);
    localStorage.setItem(getLocalKey(uid), JSON.stringify(updated));
  }
}
