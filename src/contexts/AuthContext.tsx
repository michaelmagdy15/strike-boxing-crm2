import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserId, UserRole, isSuperAdmin, isAdmin } from '../types';
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
  deleteDoc 
} from 'firebase/firestore';
import * as userService from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (id: UserId, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: UserId) => Promise<void>;
  inviteUser: (email: string, role: UserRole) => Promise<void>;
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
            setCurrentUser(userData);
          } else {
            let role: UserRole = 'rep';
            if (firebaseUser.email === "michaelmitry13@gmail.com") {
              role = 'crm_admin';
            } else if (firebaseUser.email === "magd.gallab@gmail.com") {
              role = 'super_admin';
            } else if (firebaseUser.email) {
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const invitedUserDoc = querySnapshot.docs[0]!;
                role = invitedUserDoc.data()['role'] as UserRole;
                await deleteDoc(doc(db, 'users', invitedUserDoc.id));
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

  useEffect(() => {
    if (!currentUser) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    }, (error) => console.error('Firestore Error (users):', error));
    return () => unsubUsers();
  }, [currentUser]);

  const login = async () => { await signInWithGoogle(); };
  const logout = async () => { await logOut(); };

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

  const inviteUser = async (email: string, role: UserRole) => {
    await userService.inviteUser(email, role);
  };

  const value = useMemo(() => ({
    currentUser: currentUser ? { ...currentUser, role: effectiveRole || currentUser.role } : null,
    users,
    login,
    logout,
    updateUser,
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
