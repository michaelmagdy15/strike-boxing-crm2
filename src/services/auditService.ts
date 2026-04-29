import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AuditLog, UserId } from '../types';

/**
 * Adds an audit log entry to Firestore.
 */
export const addAuditLog = async (
  action: AuditLog['action'], 
  entityType: AuditLog['entityType'], 
  entityId: string, 
  details: string,
  userName?: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    await addDoc(collection(db, 'auditLogs'), {
      userId: currentUser.uid as UserId,
      userName: userName || currentUser.displayName || undefined,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};
