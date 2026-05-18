import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserId, UserRole, isSuperAdmin, isAdmin, BrandingSettings, PendingAccount, PasswordResetRequest } from '../types';
import { auth, db, signInWithGoogle, signInWithEmail, logOut, createFirebaseUser, sendPasswordReset } from '../firebase';
import { onAuthStateChanged, updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import * as userService from '../services/userService';
import { activatePendingUser as activatePendingUserService } from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  allUsers: User[];
  pendingAccounts: PendingAccount[];
  passwordResetRequests: PasswordResetRequest[];
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithCoachId: (coachId: string, password: string) => Promise<void>;
  loginWithMemberId: (memberId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (id: UserId, updates: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<void>;
  deleteUser: (id: UserId) => Promise<void>;
  inviteUser: (email: string, role: UserRole, displayName?: string) => Promise<void>;
  activatePendingUser: (pendingDocId: string, email: string, role: UserRole, name: string) => Promise<void>;
  createCoachAccount: (name: string, email: string, branch?: string) => Promise<{ uid: string; coachId: string }>;
  createClientAccount: (clientId: string, memberId: string, clientName: string, phone?: string) => Promise<{ uid: string }>;
  submitSignUpRequest: (name: string, email: string, role: UserRole, message?: string) => Promise<void>;
  approveSignUpRequest: (id: string, pending: PendingAccount) => Promise<void>;
  denySignUpRequest: (id: string) => Promise<void>;
  submitPasswordResetRequest: (email: string, name?: string) => Promise<void>;
  approvePasswordResetRequest: (id: string, email: string) => Promise<void>;
  denyPasswordResetRequest: (id: string) => Promise<void>;
  isAuthReady: boolean;
  isSuperUser: boolean;
  effectiveRole: UserRole | undefined;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  completeForcedPasswordChange: (newPassword: string) => Promise<void>;
  updateMyProfile: (updates: { photoURL?: string; name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateCoachId = async (): Promise<string> => {
  const q = query(collection(db, 'users'), where('role', '==', 'coach'));
  const snap = await getDocs(q);
  const nums = snap.docs
    .map(d => (d.data().coachId as string) || '')
    .filter(id => id.startsWith('COACH-'))
    .map(id => parseInt(id.split('-')[1] || '0', 10))
    .filter(n => !isNaN(n));
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  return `COACH-${String(maxNum + 1).padStart(3, '0')}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const effectiveRole = useMemo<UserRole | undefined>(() => {
    if (currentUser && isAdmin(currentUser.role) && previewRole) {
      return previewRole;
    }
    return currentUser?.role;
  }, [currentUser, previewRole]);

  const isSuperUser = useMemo(() => {
    return isSuperAdmin(currentUser?.role);
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userId = firebaseUser.uid as UserId;
        const userDocRef = doc(db, 'users', userId);
        try {
          const userDoc = await getDoc(userDocRef);
          let userData: User | null = null;

          if (userDoc.exists()) {
            userData = userDoc.data() as User;
            userData.id = userId;
            const OWNER_EMAILS = ['magd.gallab@gmail.com', 'admin@strike.eg', 'strike.egyptt@gmail.com'];
            if (firebaseUser.email === "michaelmitry13@gmail.com" && userData.role !== 'crm_admin') {
              userData.role = 'crm_admin';
              await updateDoc(userDocRef, { role: 'crm_admin' });
            } else if (OWNER_EMAILS.includes(firebaseUser.email || '') && userData.role !== 'super_admin') {
              userData.role = 'super_admin';
              await updateDoc(userDocRef, { role: 'super_admin' });
            }
            if (firebaseUser.email) {
              const staleQ = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const staleSnap = await getDocs(staleQ);
              const staleInvites = staleSnap.docs.filter(d => d.id !== userId);
              if (staleInvites.length > 0) {
                const batch = writeBatch(db);
                staleInvites.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            }
            setCurrentUser(userData);
            setAuthError(null);
          } else {
            const OWNER_EMAILS_NEW = ['magd.gallab@gmail.com', 'admin@strike.eg', 'strike.egyptt@gmail.com'];
            let role: UserRole = 'rep';
            if (firebaseUser.email === "michaelmitry13@gmail.com") {
              role = 'crm_admin';
            } else if (OWNER_EMAILS_NEW.includes(firebaseUser.email || '')) {
              role = 'super_admin';
            } else if (firebaseUser.email) {
              const emailLower = firebaseUser.email.toLowerCase();
              const emailsToSearch = [...new Set([firebaseUser.email, emailLower])];
              const q = query(collection(db, 'users'), where('email', 'in', emailsToSearch));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                role = querySnapshot.docs[0]!.data()['role'] as UserRole;
                const batch = writeBatch(db);
                querySnapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              } else {
                const allUsersSnap = await getDocs(collection(db, 'users'));
                const match = allUsersSnap.docs.find(d => (d.data().email || '').toLowerCase() === emailLower);
                if (match) {
                  role = match.data()['role'] as UserRole;
                  const batch = writeBatch(db);
                  allUsersSnap.docs.filter(d => (d.data().email || '').toLowerCase() === emailLower).forEach(d => batch.delete(d.ref));
                  await batch.commit();
                }
              }
            }

            const newUser: User = {
              id: userId,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: role
            };
            await setDoc(userDocRef, newUser);
            setCurrentUser(newUser);
            setAuthError(null);
          }
        } catch (error: any) {
          console.error("Error fetching user doc:", error);
          setAuthError(`[Firestore Auth Error] ${error.code || 'UNKNOWN'}: ${error.message || String(error)}`);
          // If we fail to load or update the user document, we shouldn't consider the user fully logged in
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setAuthError(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Presence heartbeat
  useEffect(() => {
    if (!currentUser) return;
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', currentUser.id), { lastSeen: new Date().toISOString() });
      } catch { /* silent */ }
    };
    updatePresence();
    const interval = setInterval(updatePresence, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Users listener
  useEffect(() => {
    if (!currentUser) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsersData = snapshot.docs.map(d => {
        const data = d.data();
        const hasStoredId = 'id' in data;
        const user = { ...data, id: d.id } as User;
        user.isPending = !hasStoredId;
        return { user, hasStoredId };
      });
      const emailMap = new Map<string, { user: User; hasStoredId: boolean }>();
      allUsersData.forEach(({ user, hasStoredId }) => {
        const emailKey = (user.email || '').toLowerCase();
        const existing = emailMap.get(emailKey);
        if (!existing || (hasStoredId && !existing.hasStoredId)) {
          emailMap.set(emailKey, { user, hasStoredId });
        }
      });
      setAllUsers(allUsersData.map(e => e.user));
      setUsers(Array.from(emailMap.values()).map(e => e.user));
    }, (error) => console.error('Firestore Error (users):', error));
    return () => unsubUsers();
  }, [currentUser]);

  // Pending accounts + password reset requests listeners (admin/manager only)
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'crm_admin') return;

    const unsubPending = onSnapshot(
      query(collection(db, 'pendingAccounts'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc')),
      (snap) => setPendingAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id } as PendingAccount))),
      () => {}
    );

    const unsubResets = onSnapshot(
      query(collection(db, 'passwordResetRequests'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc')),
      (snap) => setPasswordResetRequests(snap.docs.map(d => ({ ...d.data(), id: d.id } as PasswordResetRequest))),
      () => {}
    );

    return () => { unsubPending(); unsubResets(); };
  }, [currentUser?.id, currentUser?.role]);

  const login = async () => { await signInWithGoogle(); };
  const logout = async () => { await logOut(); };
  const refreshUserData = async () => {};
  const updateBranding = async (_updates: Partial<BrandingSettings>) => {};

  const loginWithEmailFn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const loginWithCoachId = async (coachId: string, password: string) => {
    const q = query(collection(db, 'users'), where('coachId', '==', coachId.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Coach ID not found. Please check and try again.');
    const coachData = snap.docs[0]!.data();
    if (!coachData.email) throw new Error('No email associated with this Coach ID.');
    await signInWithEmail(coachData.email, password);
  };

  const loginWithMemberId = async (memberId: string, password: string) => {
    const q = query(collection(db, 'users'), where('clientRecordId', '==', memberId.trim()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Member ID not found. Please check and try again.');
    const memberData = snap.docs[0]!.data();
    if (!memberData.email) throw new Error('No account associated with this Member ID.');
    await signInWithEmail(memberData.email, password);
  };

  const createCoachAccount = async (name: string, email: string, branch?: string) => {
    const coachId = await generateCoachId();
    const uid = await createFirebaseUser(email, '12345678');
    const newUser: User = {
      id: uid,
      name,
      email,
      role: 'coach',
      coachId,
      branch: branch || undefined,
    };
    await setDoc(doc(db, 'users', uid), newUser);
    return { uid, coachId };
  };

  const createClientAccount = async (clientId: string, memberId: string, clientName: string, phone?: string) => {
    const email = `member-${memberId.toLowerCase()}@strike-member.local`;
    const uid = await createFirebaseUser(email, '12345678');
    const newUser: User = {
      id: uid,
      name: clientName,
      email,
      role: 'client',
      clientRecordId: memberId,
      phone,
    };
    await setDoc(doc(db, 'users', uid), newUser);
    // Update the client record to flag portal access
    await updateDoc(doc(db, 'clients', clientId), { portalUserId: uid });
    return { uid };
  };

  const submitSignUpRequest = async (name: string, email: string, role: UserRole, message?: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error('An account with this email already exists.');
    const pendingQ = query(collection(db, 'pendingAccounts'), where('email', '==', email), where('status', '==', 'pending'));
    const pendingSnap = await getDocs(pendingQ);
    if (!pendingSnap.empty) throw new Error('A pending request for this email already exists.');
    await addDoc(collection(db, 'pendingAccounts'), {
      name,
      email,
      role,
      message: message || '',
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
  };

  const approveSignUpRequest = async (id: string, pending: PendingAccount) => {
    const uid = await createFirebaseUser(pending.email, '12345678');
    const newUser: User = {
      id: uid,
      name: pending.name,
      email: pending.email,
      role: pending.role,
    };
    if (pending.role === 'coach') {
      const coachId = await generateCoachId();
      newUser.coachId = coachId;
    }
    await setDoc(doc(db, 'users', uid), newUser);
    await deleteDoc(doc(db, 'pendingAccounts', id));
  };

  const denySignUpRequest = async (id: string) => {
    await updateDoc(doc(db, 'pendingAccounts', id), { status: 'denied' });
    await deleteDoc(doc(db, 'pendingAccounts', id));
  };

  const submitPasswordResetRequest = async (email: string, name?: string) => {
    // Rate-limit: block duplicate pending requests for the same email
    const existingQ = query(
      collection(db, 'passwordResetRequests'),
      where('email', '==', email),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      throw new Error('A password reset request for this email is already pending admin approval. Please wait for it to be processed.');
    }
    await addDoc(collection(db, 'passwordResetRequests'), {
      email,
      name: name || '',
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
  };

  const approvePasswordResetRequest = async (id: string, email: string) => {
    await sendPasswordReset(email);
    // Find user by email and mark mustChangePassword so the force-change dialog shows on next login
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0]!.ref, { mustChangePassword: true });
      }
    } catch { /* silent — email still sent */ }
    await deleteDoc(doc(db, 'passwordResetRequests', id));
  };

  const denyPasswordResetRequest = async (id: string) => {
    await deleteDoc(doc(db, 'passwordResetRequests', id));
  };

  const updateUser = async (id: UserId, updates: Partial<User>) => {
    const currentName = users.find(u => u.id === id)?.name;
    await userService.updateUser(id, updates, currentName);
  };

  const deleteUser = async (id: UserId) => {
    if (!isSuperUser) throw new Error("Unauthorized");
    const user = users.find(u => u.id === id);
    if (user && isSuperAdmin(user.role)) throw new Error("Cannot delete a super user account.");
    await userService.deleteUser(id, user?.name);
  };

  const inviteUser = async (email: string, role: UserRole, displayName?: string) => {
    await userService.inviteUser(email, role, displayName);
  };

  const activatePendingUser = async (pendingDocId: string, email: string, role: UserRole, name: string) => {
    await activatePendingUserService(pendingDocId, email, role, name);
  };

  /**
   * Allows the currently signed-in user to change their own password.
   * Requires re-authentication first (Firebase security requirement).
   */
  const changeMyPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user found.');
    // Re-authenticate before changing password (Firebase requires this)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await fbUpdatePassword(user, newPassword);
  };

  /** Called from the ForcePasswordChangeDialog — tries reauth with default pwd then updates */
  const completeForcedPasswordChange = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user found.');
    // Try default password first; if user already changed it via email link this will fail gracefully
    try {
      const cred = EmailAuthProvider.credential(user.email, '12345678');
      await reauthenticateWithCredential(user, cred);
    } catch {
      // User may have already signed in via a reset link — current session is fresh enough
    }
    await fbUpdatePassword(user, newPassword);
    await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
    setCurrentUser(prev => prev ? { ...prev, mustChangePassword: false } : prev);
  };

  /** Update current user's own profile (name / avatar) */
  const updateMyProfile = async (updates: { photoURL?: string; name?: string }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user.');
    await updateDoc(doc(db, 'users', user.uid), updates);
    setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const memoizedCurrentUser = useMemo(() => {
    return currentUser ? { ...currentUser, role: effectiveRole || currentUser.role } : null;
  }, [currentUser, effectiveRole]);

  const value = useMemo(() => ({
    currentUser: memoizedCurrentUser,
    users,
    allUsers,
    pendingAccounts,
    passwordResetRequests,
    login,
    loginWithEmail: loginWithEmailFn,
    loginWithCoachId,
    loginWithMemberId,
    logout,
    updateUser,
    refreshUserData,
    updateBranding,
    deleteUser,
    inviteUser,
    createCoachAccount,
    createClientAccount,
    activatePendingUser,
    submitSignUpRequest,
    approveSignUpRequest,
    denySignUpRequest,
    submitPasswordResetRequest,
    approvePasswordResetRequest,
    denyPasswordResetRequest,
    isAuthReady,
    isSuperUser,
    effectiveRole,
    previewRole,
    setPreviewRole,
    authError,
    setAuthError,
    changeMyPassword,
    completeForcedPasswordChange,
    updateMyProfile,
  }), [memoizedCurrentUser, users, pendingAccounts, passwordResetRequests, isAuthReady, isSuperUser, effectiveRole, previewRole, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
