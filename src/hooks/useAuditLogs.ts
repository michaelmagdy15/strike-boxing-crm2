import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLog, User } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

const PRIVILEGED_ROLES = new Set(['manager', 'admin', 'super_admin', 'crm_admin']);

export const useAuditLogs = (currentUser: User | null) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !PRIVILEGED_ROLES.has(currentUser.role)) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setAuditLogs(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'auditLogs');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  return { auditLogs, loading };
};
