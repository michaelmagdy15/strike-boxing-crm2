import { 
  collection, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole, UserId } from '../types';
import { cleanData } from '../utils';
import { addAuditLog } from './auditService';

export const updateUser = async (id: UserId, updates: Partial<User>, currentName?: string) => {
  await updateDoc(doc(db, 'users', id), cleanData(updates));
  await addAuditLog('UPDATE', 'CLIENT', id as any, `Updated user permissions: ${currentName || id}`);
};

export const deleteUser = async (id: UserId, userName?: string) => {
  await deleteDoc(doc(db, 'users', id));
  await addAuditLog('DELETE', 'CLIENT', id as any, `Deleted user account: ${userName || id}`);
};

export const inviteUser = async (email: string, role: UserRole) => {
  // Check for existing user or invite
  const q = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    throw new Error('A user with this email already exists or is already invited.');
  }

  const docRef = await addDoc(collection(db, 'users'), {
    email,
    role,
    name: email.split('@')[0],
  });
  await addAuditLog('CREATE', 'CLIENT', docRef.id as any, `Invited user: ${email} as ${role}`);
  return docRef.id as UserId;
};
