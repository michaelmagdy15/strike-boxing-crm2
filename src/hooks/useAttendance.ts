import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Attendance, Branch, Client, User } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { addAuditLog } from '../services/auditService';

export const useAttendance = (currentUser: User | null, clients: Client[]) => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(db, 'attendance'), orderBy('date', 'desc')),
      (snapshot) => {
        setAttendances(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Attendance)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const recordAttendance = async (clientId: string, branch: Branch) => {
    if (!currentUser) return;
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');

      await addDoc(collection(db, 'attendance'), {
        clientId,
        branch,
        date: new Date().toISOString(),
        recordedBy: currentUser.id,
        packageName: client.packageType,
      } as Omit<Attendance, 'id'>);

      if (typeof client.sessionsRemaining === 'number') {
        await updateDoc(doc(db, 'clients', clientId), {
          sessionsRemaining: client.sessionsRemaining - 1,
        });
      }

      await addAuditLog('CREATE', 'ATTENDANCE', clientId, `Attendance: ${client.name} at ${branch}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    }
  };

  return { attendances, loading, recordAttendance };
};
