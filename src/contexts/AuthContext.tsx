import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserId, UserRole, isSuperAdmin, isAdmin, BrandingSettings } from '../types';
import { auth, db, signInWithGoogle, logOut } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
  writeBatch
} from 'firebase/firestore';
import * as userService from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  allUsers: User[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (id: UserId, updates: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<void>;
  deleteUser: (id: UserId) => Promise<void>;
  inviteUser: (email: string, role: UserRole, displayName?: string) => Promise<void>;
  isAuthReady: boolean;
  isSuperUser: boolean;
  effectiveRole: UserRole | undefined;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [branding, setBranding] = useState<BrandingSettings>({ companyName: '', logoUrl: '' });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  const effectiveRole = useMemo<UserRole | undefined>(() => {
    // Only admins and managers can preview other roles
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
            if (firebaseUser.email === "michaelmitry13@gmail.com" && userData.role !== 'crm_admin') {
              userData.role = 'crm_admin';
              await updateDoc(userDocRef, { role: 'crm_admin' });
            } else if (firebaseUser.email === "magd.gallab@gmail.com" && userData.role !== 'super_admin') {
              userData.role = 'super_admin';
              await updateDoc(userDocRef, { role: 'super_admin' });
            }
            // Clean up any stale invite placeholder docs with the same email
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
          } else {
            let role: UserRole = 'rep';
            if (firebaseUser.email === "michaelmitry13@gmail.com") {
              role = 'crm_admin';
            } else if (firebaseUser.email === "magd.gallab@gmail.com") {
              role = 'super_admin';
            } else if (firebaseUser.email) {
              const emailLower = firebaseUser.email.toLowerCase();
              const emailsToSearch = [...new Set([firebaseUser.email, emailLower])];
              const q = query(collection(db, 'users'), where('email', 'in', emailsToSearch));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                // Take role from the first valid invite, then delete all existing docs with this email
                // to prevent "Duplicate User" issues before creating the final UUID-keyed document.
                role = querySnapshot.docs[0]!.data()['role'] as UserRole;
                const batch = writeBatch(db);
                querySnapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              } else {
                // As a fallback for case variations not caught by exact or lowercase match
                // we can do a quick check to see if any user document matches case insensitively.
                // This is slightly heavier (fetching all users), but users collection is small.
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
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Presence Heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const updatePresence = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.id);
        await updateDoc(userDocRef, {
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    // Update immediately on mount/auth
    updatePresence();

    // Set up heartbeat every 2 minutes
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(d => {
        const data = d.data();
        const hasStoredId = 'id' in data;
        const user = { ...data, id: d.id } as User;
        // Mark as pending if this is an invite placeholder (no stored 'id' field = never logged in)
        user.isPending = !hasStoredId;
        return { user, hasStoredId };
      });
      // Deduplicate by email: prefer real auth-keyed docs (those that have an 'id'
      // field stored in Firestore data) over invite placeholders (only email/role/name).
      const emailMap = new Map<string, { user: User; hasStoredId: boolean }>();
      allUsers.forEach(({ user, hasStoredId }) => {
        const emailKey = (user.email || '').toLowerCase();
        const existing = emailMap.get(emailKey);
        if (!existing || (hasStoredId && !existing.hasStoredId)) {
          emailMap.set(emailKey, { user, hasStoredId });
        }
      });
      setAllUsers(allUsers.map(e => e.user));
      setUsers(Array.from(emailMap.values()).map(e => e.user));
    }, (error) => console.error('Firestore Error (users):', error));
    return () => unsubUsers();
  }, [currentUser]);

  const login = async () => { await signInWithGoogle(); };
  const logout = async () => { await logOut(); };
  const refreshUserData = async () => {};
  const updateBranding = async (updates: Partial<BrandingSettings>) => {};

  const updateUser = async (id: UserId, updates: Partial<User>) => {
    const currentName = users.find(u => u.id === id)?.name;
    await userService.updateUser(id, updates, currentName);
  };

  const deleteUser = async (id: UserId) => {
    if (!isSuperUser) throw new Error("Unauthorized");
    const user = users.find(u => u.id === id);
    if (user && isSuperAdmin(user.role)) {
      throw new Error("Cannot delete a super user account.");
    }
    await userService.deleteUser(id, user?.name);
  };

  const inviteUser = async (email: string, role: UserRole, displayName?: string) => {
    await userService.inviteUser(email, role, displayName);
  };

  const value = useMemo(() => ({
    currentUser: currentUser ? { ...currentUser, role: effectiveRole || currentUser.role } : null,
    users,
    allUsers,
    login,
    logout,
    updateUser,
    refreshUserData,
    updateBranding,
    deleteUser,
    inviteUser,
    isAuthReady,
    isSuperUser,
    effectiveRole,
    previewRole,
    setPreviewRole
  }), [currentUser, users, isAuthReady, isSuperUser, effectiveRole, previewRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
