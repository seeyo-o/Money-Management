import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface PasswordStrength {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isValid: boolean;
  score: number; // 0 to 5
}

export function validatePasswordStrength(pass: string): PasswordStrength {
  const hasMinLength = pass.length >= 6;
  const hasLowercase = /[a-z]/.test(pass);
  const hasUppercase = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSymbol = /[^A-Za-z0-9]/.test(pass);
  const score = [hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;
  return {
    hasMinLength,
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSymbol,
    score,
    isValid: hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol,
  };
}

export function translateAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau kata sandi salah. Silakan coba lagi.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Minimal gunakan 6 karakter.';
    case 'auth/email-already-in-use':
      return 'Alamat email ini sudah terdaftar. Silakan login.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan terputus. Periksa sambungan internet Anda.';
    default:
      return 'Terjadi kendala autentikasi. Silakan periksa kembali data Anda.';
  }
}

// Local mock storage key for unconfigured dev environments
const MOCK_AUTH_KEY = 'rasio_mock_user_session';

export async function loginUser(email: string, pass: string): Promise<AuthUser> {
  if (isFirebaseConfigured && auth) {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      throw new Error(translateAuthError(code));
    }
  } else {
    // Graceful Local Mock Auth fallback
    if (!email || !pass) {
      throw new Error('Email dan kata sandi wajib diisi.');
    }
    if (pass.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }
    const mockUser: AuthUser = {
      uid: `user-${btoa(email).replace(/=/g, '')}`,
      email,
      displayName: email.split('@')[0],
    };
    localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(mockUser));
    return mockUser;
  }
}

export async function registerUser(email: string, pass: string): Promise<AuthUser> {
  if (!email || !pass) {
    throw new Error('Email dan kata sandi wajib diisi.');
  }

  const strength = validatePasswordStrength(pass);
  if (!strength.isValid) {
    throw new Error(
      'Kata sandi wajib minimal 6 karakter, mengandung huruf besar (A-Z), huruf kecil (a-z), angka (0-9), dan simbol (!@#$...).'
    );
  }

  if (isFirebaseConfigured && auth) {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      throw new Error(translateAuthError(code));
    }
  } else {
    // Graceful Local Mock Auth
    const mockUser: AuthUser = {
      uid: `user-${btoa(email).replace(/=/g, '')}`,
      email,
      displayName: email.split('@')[0],
    };
    localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(mockUser));
    return mockUser;
  }
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  } else {
    localStorage.removeItem(MOCK_AUTH_KEY);
  }
}

export function subscribeAuthState(callback: (user: AuthUser | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        callback(null);
      }
    });
  } else {
    // Local mock state check
    const stored = localStorage.getItem(MOCK_AUTH_KEY);
    if (stored) {
      try {
        callback(JSON.parse(stored));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {};
  }
}
