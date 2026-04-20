import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

const ROOT_COLLECTIONS = [
  'users',
  'clients',
  'counters',
  'packages',
  'importBatches',
  'tasks',
  'payments',
  'sessions',
  'auditLogs',
  'settings'
];

export const exportDatabaseToJson = async () => {
  const backupData: Record<string, any[]> = {};

  for (const collName of ROOT_COLLECTIONS) {
    const snapshot = await getDocs(collection(db, collName));
    backupData[collName] = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    // Handle subcollections for clients
    if (collName === 'clients') {
      const allComments: Record<string, any[]> = {};
      for (const clientDoc of snapshot.docs) {
        const commentsSnapshot = await getDocs(collection(db, 'clients', clientDoc.id, 'comments'));
        if (!commentsSnapshot.empty) {
          allComments[clientDoc.id] = commentsSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          }));
        }
      }
      backupData['client_comments'] = [allComments];
    }
  }

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `strike_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const restoreDatabaseFromJson = async (jsonData: string) => {
  const backupData = JSON.parse(jsonData);
  
  const commitBatch = async (batch: any) => {
    await batch.commit();
    return writeBatch(db);
  };

  let batch = writeBatch(db);
  let operationCount = 0;

  // Restore root collections
  for (const collName of ROOT_COLLECTIONS) {
    if (!backupData[collName]) continue;

    for (const record of backupData[collName]) {
      const { id, ...data } = record;
      const docRef = doc(db, collName, id);
      batch.set(docRef, data);
      operationCount++;

      if (operationCount >= 450) {
        batch = await commitBatch(batch);
        operationCount = 0;
      }
    }
  }

  // Restore comments specifically
  if (backupData['client_comments'] && backupData['client_comments'][0]) {
    const allComments = backupData['client_comments'][0];
    for (const clientId in allComments) {
      for (const comment of allComments[clientId]) {
        const { id, ...data } = comment;
        const docRef = doc(db, 'clients', clientId, 'comments', id);
        batch.set(docRef, data);
        operationCount++;

        if (operationCount >= 450) {
          batch = await commitBatch(batch);
          operationCount = 0;
        }
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};
