import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Attendance, Branch, Client, User } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { addAuditLog } from '../services/auditService';
import { isBefore, parseISO, startOfDay } from 'date-fns';

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

      // Block expired members from checking in
      if (client.membershipExpiry) {
        const expiry = startOfDay(parseISO(client.membershipExpiry));
        const today = startOfDay(new Date());
        if (isBefore(expiry, today)) {
          throw new Error(`${client.name}'s membership expired on ${expiry.toLocaleDateString()}. Please renew before checking in.`);
        }
      } else if (client.status === 'Expired') {
        throw new Error(`${client.name}'s membership is expired. Please renew before checking in.`);
      }

      await addDoc(collection(db, 'attendance'), {
        clientId,
        branch,
        date: new Date().toISOString(),
        recordedBy: currentUser.id,
        packageName: client.packageType,
      } as Omit<Attendance, 'id'>);

      // Decrement sessions only for finite packages with sessions remaining
      if (typeof client.sessionsRemaining === 'number' && client.sessionsRemaining > 0) {
        await updateDoc(doc(db, 'clients', clientId), {
          sessionsRemaining: client.sessionsRemaining - 1,
        });
      }

      await addAuditLog('CREATE', 'ATTENDANCE', clientId, `Attendance: ${client.name} at ${branch}`, currentUser?.name);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    }
  };

  return { attendances, loading, recordAttendance };
};
