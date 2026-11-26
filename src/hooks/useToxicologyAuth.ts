import { useCallback, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  signInWithGooglePopup,
  signOutUser,
  testFirestoreConnection,
} from '../lib/firebase';
import { ArchiveDoc } from '../data/toxicologyData';

export interface SavedAudit {
  id: string;
  userId: string;
  protocolName: string;
  incentivesScore: number;
  loadScore: number;
  usageScore: number;
  verdict: 'SIGNAL' | 'CAUTION' | 'TOXIC';
  notes: string;
}

export function useToxicologyAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (!firebaseUser) {
        setProfileReady(false);
        setBookmarkedIds(new Set());
        setAudits([]);
        return;
      }

      await testFirestoreConnection(firebaseUser.uid);
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const snap = await getDoc(userRef);
        const safeName = (firebaseUser.displayName || 'Researcher').slice(0, 80);
        const safeEmail = (firebaseUser.email || 'user@toxicology.app').slice(0, 160);
        const safePhoto = (firebaseUser.photoURL || '').slice(0, 500);

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: safeName,
            email: safeEmail,
            photoURL: safePhoto,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(
            userRef,
            {
              displayName: safeName,
              email: safeEmail,
              photoURL: safePhoto,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
        setProfileReady(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Only attach Firestore listeners once auth & parent profile document are ready
  useEffect(() => {
    if (!authReady || !user || !profileReady) return;

    setSyncLoading(true);
    const bookmarksPath = `users/${user.uid}/bookmarks`;
    const bookmarksQuery = query(
      collection(db, bookmarksPath),
      where('userId', '==', user.uid),
    );

    const unsubBookmarks = onSnapshot(
      bookmarksQuery,
      (snapshot) => {
        const next = new Set<string>();
        snapshot.forEach((d) => {
          next.add(d.id);
        });
        setBookmarkedIds(next);
        setSyncLoading(false);
      },
      (error) => {
        setSyncLoading(false);
        handleFirestoreError(error, OperationType.LIST, bookmarksPath);
      },
    );

    const auditsPath = `users/${user.uid}/audits`;
    const auditsQuery = query(
      collection(db, auditsPath),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc'),
    );

    const unsubAudits = onSnapshot(
      auditsQuery,
      (snapshot) => {
        const next: SavedAudit[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          next.push({
            id: d.id,
            userId: String(data.userId),
            protocolName: String(data.protocolName),
            incentivesScore: Number(data.incentivesScore),
            loadScore: Number(data.loadScore),
            usageScore: Number(data.usageScore),
            verdict: (data.verdict as SavedAudit['verdict']) || 'CAUTION',
            notes: String(data.notes || ''),
          });
        });
        setAudits(next);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, auditsPath);
      },
    );

    return () => {
      unsubBookmarks();
      unsubAudits();
    };
  }, [authReady, user, profileReady]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGooglePopup();
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in window was closed before completing.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Allow popups and try again.');
      } else {
        const msg = error instanceof Error ? error.message : 'Google Sign-In failed.';
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOutUser();
  }, []);

  const toggleBookmark = useCallback(
    async (archiveDoc: ArchiveDoc) => {
      if (!user) {
        await signIn();
        return;
      }
      const docPath = `users/${user.uid}/bookmarks/${archiveDoc.id}`;
      const ref = doc(db, 'users', user.uid, 'bookmarks', archiveDoc.id);
      try {
        if (bookmarkedIds.has(archiveDoc.id)) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            userId: user.uid,
            docId: archiveDoc.id.slice(0, 64),
            title: archiveDoc.title.slice(0, 160),
            category: archiveDoc.category,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
    },
    [user, bookmarkedIds, signIn],
  );

  const saveAudit = useCallback(
    async (payload: Omit<SavedAudit, 'id' | 'userId'>) => {
      if (!user) {
        await signIn();
        return;
      }
      const auditId = `audit_${Date.now()}`;
      const docPath = `users/${user.uid}/audits/${auditId}`;
      const ref = doc(db, 'users', user.uid, 'audits', auditId);
      try {
        await setDoc(ref, {
          userId: user.uid,
          protocolName: payload.protocolName.trim().slice(0, 80) || 'Unnamed Protocol',
          incentivesScore: Math.max(0, Math.min(10, Number(payload.incentivesScore) || 0)),
          loadScore: Math.max(0, Math.min(10, Number(payload.loadScore) || 0)),
          usageScore: Math.max(0, Math.min(10, Number(payload.usageScore) || 0)),
          verdict: payload.verdict,
          notes: payload.notes.trim().slice(0, 2000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    },
    [user, signIn],
  );

  const deleteAudit = useCallback(
    async (auditId: string) => {
      if (!user) return;
      const docPath = `users/${user.uid}/audits/${auditId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'audits', auditId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    },
    [user],
  );

  return {
    user,
    authReady,
    profileReady,
    bookmarkedIds,
    audits,
    authError,
    signingIn,
    syncLoading,
    signIn,
    logout,
    toggleBookmark,
    saveAudit,
    deleteAudit,
  };
}
