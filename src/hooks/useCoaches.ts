import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Coach } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { cleanData } from '../utils';
import { addAuditLog } from '../services/auditService';

export const useCoaches = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coaches'), (snapshot) => {
      setCoaches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Coach)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coaches');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addCoach = async (coach: Omit<Coach, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'coaches'), cleanData(coach));
      await addAuditLog('CREATE', 'COACH', docRef.id, `Created coach: ${coach.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coaches');
    }
  };

  const updateCoach = async (id: string, updates: Partial<Coach>) => {
    try {
      await updateDoc(doc(db, 'coaches', id), cleanData(updates));
      const coachName = coaches.find(c => c.id === id)?.name || id;
      await addAuditLog('UPDATE', 'COACH', id, `Updated coach: ${coachName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coaches/${id}`);
    }
  };

  const deleteCoach = async (id: string) => {
    try {
      const coachName = coaches.find(c => c.id === id)?.name || id;
      await deleteDoc(doc(db, 'coaches', id));
      await addAuditLog('DELETE', 'COACH', id, `Deleted coach: ${coachName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coaches/${id}`);
    }
  };

  return { coaches, loading, addCoach, updateCoach, deleteCoach };
};
