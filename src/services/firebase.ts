import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SEED_LEADERBOARD } from '../game/constants';
import { normalizeWeaponUpgrades } from '../game/upgrades';
import type { LeaderboardEntry, PlayerSaveData, WeaponId } from '../game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  if (displayName && displayName.trim().length >= 2) {
    await updateProfile(result.user, { displayName: displayName.trim().slice(0, 40) });
  }
  try {
    await sendEmailVerification(result.user);
  } catch {
    // Non-blocking verification email send
  }
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return result.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function clampInt(val: number, min: number, max: number): number {
  const n = Math.round(Number(val) || 0);
  return Math.max(min, Math.min(max, n));
}

function sanitizeDisplayName(name: string): string {
  const cleaned = (name || 'Commander').trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : 'Commander';
}

function sanitizeWeapons(weapons: WeaponId[]): WeaponId[] {
  const allowed: WeaponId[] = ['standard', 'cluster', 'mortar'];
  const filtered = Array.from(new Set(weapons.filter((w) => allowed.includes(w)))).slice(0, 3);
  return filtered.length > 0 ? filtered : ['standard'];
}

function sanitizeTankColor(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#2563EB';
}

export async function loadSaveFromCloud(userId: string): Promise<PlayerSaveData | null> {
  const path = `saves/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'saves', userId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      displayName: sanitizeDisplayName(String(d.displayName ?? 'Commander')),
      totalXp: clampInt(d.totalXp, 0, 10000000),
      credits: clampInt(d.credits, 0, 10000000),
      unlockedStage: clampInt(d.unlockedStage, 1, 20),
      tutorialCompleted: Boolean(d.tutorialCompleted),
      bestScore: clampInt(d.bestScore, 0, 1000000),
      bestStreak: clampInt(d.bestStreak, 0, 1000),
      totalSolved: clampInt(d.totalSolved, 0, 1000000),
      totalAttempted: clampInt(d.totalAttempted, 0, 1000000),
      gamesPlayed: clampInt(d.gamesPlayed, 0, 100000),
      preferredSpec:
        d.preferredSpec === 'eco' || d.preferredSpec === 'high' ? d.preferredSpec : 'balanced',
      soundEnabled: d.soundEnabled !== false,
      tankColor: sanitizeTankColor(String(d.tankColor ?? '#2563EB')),
      unlockedWeapons: sanitizeWeapons(Array.isArray(d.unlockedWeapons) ? d.unlockedWeapons : ['standard']),
      weaponUpgrades: normalizeWeaponUpgrades(d.weaponUpgrades),
      lastSyncedDevice: String(d.lastSyncedDevice ?? 'Cloud').slice(0, 48),
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncSaveToCloud(
  userId: string,
  save: PlayerSaveData
): Promise<void> {
  const path = `saves/${userId}`;
  try {
    const ref = doc(db, 'saves', userId);
    const existingSnap = await getDoc(ref);
    const basePayload = {
      userId,
      displayName: sanitizeDisplayName(save.displayName),
      totalXp: clampInt(save.totalXp, 0, 10000000),
      credits: clampInt(save.credits, 0, 10000000),
      unlockedStage: clampInt(save.unlockedStage, 1, 20),
      tutorialCompleted: Boolean(save.tutorialCompleted),
      bestScore: clampInt(save.bestScore, 0, 1000000),
      bestStreak: clampInt(save.bestStreak, 0, 1000),
      totalSolved: clampInt(save.totalSolved, 0, 1000000),
      totalAttempted: clampInt(save.totalAttempted, 0, 1000000),
      gamesPlayed: clampInt(save.gamesPlayed, 0, 100000),
      preferredSpec: save.preferredSpec,
      soundEnabled: Boolean(save.soundEnabled),
      tankColor: sanitizeTankColor(save.tankColor),
      unlockedWeapons: sanitizeWeapons(save.unlockedWeapons),
      weaponUpgrades: normalizeWeaponUpgrades(save.weaponUpgrades),
      lastSyncedDevice: (save.lastSyncedDevice || 'Web').slice(0, 48),
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        ref,
        {
          ...basePayload,
          createdAt: existingSnap.data().createdAt ?? serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertLeaderboardEntry(
  userId: string,
  entry: {
    displayName: string;
    bestScore: number;
    highestTier: number;
    accuracyPct: number;
    bestStreak: number;
    totalSolved: number;
    gamesPlayed: number;
  }
): Promise<void> {
  const path = `leaderboard/${userId}`;
  try {
    const ref = doc(db, 'leaderboard', userId);
    const existingSnap = await getDoc(ref);
    const prevScore = existingSnap.exists() ? Number(existingSnap.data().bestScore ?? 0) : 0;
    const prevTier = existingSnap.exists() ? Number(existingSnap.data().highestTier ?? 1) : 1;
    const prevStreak = existingSnap.exists() ? Number(existingSnap.data().bestStreak ?? 0) : 0;

    const payload = {
      userId,
      displayName: sanitizeDisplayName(entry.displayName),
      bestScore: clampInt(Math.max(prevScore, entry.bestScore), 0, 1000000),
      highestTier: clampInt(Math.max(prevTier, entry.highestTier), 1, 5),
      accuracyPct: clampInt(entry.accuracyPct, 0, 100),
      bestStreak: clampInt(Math.max(prevStreak, entry.bestStreak), 0, 1000),
      totalSolved: clampInt(entry.totalSolved, 0, 1000000),
      gamesPlayed: clampInt(entry.gamesPlayed, 0, 100000),
      isPublic: true,
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        ref,
        {
          ...payload,
          createdAt: existingSnap.data().createdAt ?? serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('isPublic', '==', true),
      orderBy('bestScore', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const remote: LeaderboardEntry[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        userId: String(d.userId ?? docSnap.id),
        displayName: sanitizeDisplayName(String(d.displayName ?? 'Commander')),
        bestScore: clampInt(d.bestScore, 0, 1000000),
        highestTier: clampInt(d.highestTier, 1, 5),
        accuracyPct: clampInt(d.accuracyPct, 0, 100),
        bestStreak: clampInt(d.bestStreak, 0, 1000),
        totalSolved: clampInt(d.totalSolved, 0, 1000000),
        gamesPlayed: clampInt(d.gamesPlayed, 0, 100000),
        updatedAtMs: Date.now(),
      };
    });

    const combined = [...remote];
    for (const seed of SEED_LEADERBOARD) {
      if (!combined.some((e) => e.userId === seed.userId)) {
        combined.push(seed);
      }
    }
    return combined.sort((a, b) => b.bestScore - a.bestScore).slice(0, 25);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
