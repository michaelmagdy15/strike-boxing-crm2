import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLog, User } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { subYears, formatISO } from 'date-fns';

const PRIVILEGED_ROLES = new Set(['manager', 'admin', 'super_admin', 'crm_admin']);
const MAX_FETCH = 5000; // safety cap

export interface AuditLogQueryParams {
  dateFrom: string; // 'yyyy-MM-dd'
  dateTo: string;   // 'yyyy-MM-dd'
}

export const useAuditLogs = (currentUser: User | null, params: AuditLogQueryParams) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!currentUser || !PRIVILEGED_ROLES.has(currentUser.role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fromISO = params.dateFrom
        ? params.dateFrom + 'T00:00:00.000Z'
        : formatISO(subYears(new Date(), 1));
      const toISO = params.dateTo
        ? params.dateTo + 'T23:59:59.999Z'
        : formatISO(new Date());

      const q = query(
        collection(db, 'auditLogs'),
        where('timestamp', '>=', fromISO),
        where('timestamp', '<=', toISO),
        orderBy('timestamp', 'desc'),
        limit(MAX_FETCH)
      );
      const snap = await getDocs(q);
      setAuditLogs(snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    } finally {
      setLoading(false);
    }
  }, [currentUser, params.dateFrom, params.dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { auditLogs, loading, refresh: fetchLogs };
};
