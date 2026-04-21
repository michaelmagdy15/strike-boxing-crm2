import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  addDays, 
  format, 
  isAfter, 
  isBefore, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  parse,
  isValid
} from 'date-fns';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  setDoc, 
  runTransaction,
  collectionGroup,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { auth, db, logOut } from './firebase'; // Removed signInWithGoogle
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { 
  Client, 
  User, 
  UserId,
  UserRole, 
  Payment, 
  SalesTarget, 
  PTPackageRecord, 
  AuditLog, 
  Task, 
  Coach, 
  ImportBatch,
  UserSalesTarget,
  BrandingSettings,
  Attendance,
  Branch,
  CRMComment,
  InteractionLog,
  CommissionRates
} from './types';
import { PACKAGES, SALES_NAME_MAPPING } from './constants';

import { handleFirestoreError, OperationType } from './utils/errorHandler';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  salesTarget: SalesTarget;
  userTargets: UserSalesTarget[];
  updateUserTarget: (userId: string, month: string, total: number) => Promise<void>;
  updateSalesTarget: (target: number) => Promise<void>;
  isAuthReady: boolean;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  wipeSystem: () => Promise<void>;
  bulkAddPayments: (payments: Payment[]) => Promise<void>;
  canDeletePayments: boolean;
  canAccessSettings: boolean;
  canViewGlobalDashboard: boolean;
  canDeleteRecords: boolean;
  canAssignLeads: boolean;
  recalculateAllPackages: () => Promise<void>;
  selfCheckIn: (identifier: string, pin: string, branch: Branch) => Promise<{ success: boolean; message: string }>;
  mergeDuplicates: () => Promise<void>;
  backfillMemberIds: () => Promise<void>;
  isManagerOrSama: boolean;
  branches: Branch[];
  updateBranches: (branches: Branch[]) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  updateUser: (id: UserId, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: UserId) => Promise<void>;
  inviteUser: (email: string, role: UserRole) => Promise<void>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

function cleanData(data: any) {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  });
  return clean;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, isAuthReady, effectiveRole, previewRole, setPreviewRole, login, logout, updateUser, deleteUser, inviteUser } = useAuth();
  const { branding, updateBranding, searchQuery, setSearchQuery, salesTarget, updateSalesTarget } = useSettings();

  const [baseClients, setBaseClients] = useState<Omit<Client, 'comments' | 'interactions'>[]>([]);
  const [allComments, setAllComments] = useState<Record<string, CRMComment[]>>({});
  const [allInteractions, setAllInteractions] = useState<Record<string, InteractionLog[]>>({});

  const clients = useMemo(() => {
    return baseClients.map(c => ({
      ...c,
      comments: allComments[c.id] || [],
      interactions: allInteractions[c.id] || []
    })) as Client[];
  }, [baseClients, allComments, allInteractions]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ptPackageRecords, setPTPackageRecords] = useState<PTPackageRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [userTargets, setUserTargets] = useState<UserSalesTarget[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [commissionRates, setCommissionRates] = useState<CommissionRates>({
    ptRate: 8,
    groupRate: 5
  });
  const [branches, setBranches] = useState<Branch[]>(['COMPLEX', 'MIVIDA', 'Strike IMPACT']);

  const isManagerOrSama = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    return role === 'manager' || role === 'admin' || role === 'super_admin' || role === 'crm_admin';
  }, [currentUser, effectiveRole]);

  const canDeletePayments = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    return !!currentUser.can_delete_payments;
  }, [currentUser, effectiveRole]);

  const canAccessSettings = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    return !!currentUser.can_access_settings_and_history;
  }, [currentUser, effectiveRole]);

  const canViewGlobalDashboard = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    return !!currentUser.can_view_global_dashboard;
  }, [currentUser, effectiveRole]);

  const canDeleteRecords = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    return !!currentUser.can_delete_records || !!currentUser.can_delete_payments;
  }, [currentUser, effectiveRole]);

  const canAssignLeads = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    return !!currentUser.can_assign_leads || !!currentUser.can_access_settings_and_history;
  }, [currentUser, effectiveRole]);



  // Real-time listeners
  useEffect(() => {
    if (!currentUser) return;

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Omit<Client, 'comments'>));
      setBaseClients(clientsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const unsubComments = onSnapshot(collectionGroup(db, 'comments'), (snapshot) => {
      const commentsByClient: Record<string, CRMComment[]> = {};
      snapshot.docs.forEach(doc => {
        const clientId = doc.ref.parent.parent?.id;
        if (clientId) {
          if (!commentsByClient[clientId]) commentsByClient[clientId] = [];
          commentsByClient[clientId].push({ ...doc.data(), id: doc.id } as CRMComment);
        }
      });
      setAllComments(commentsByClient);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'comments'));

    const unsubInteractions = onSnapshot(collectionGroup(db, 'interactions'), (snapshot) => {
      const interactionsByClient: Record<string, InteractionLog[]> = {};
      snapshot.docs.forEach(doc => {
        const clientId = doc.ref.parent.parent?.id;
        if (clientId) {
          if (!interactionsByClient[clientId]) interactionsByClient[clientId] = [];
          interactionsByClient[clientId].push({ ...doc.data(), id: doc.id } as InteractionLog);
        }
      });
      setAllInteractions(interactionsByClient);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'interactions'));

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment));
      setPayments(paymentsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      setPTPackageRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PTPackageRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sessions'));

    let unsubAudit: (() => void) | undefined;
    if (currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') {
      unsubAudit = onSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')), (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditLog)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'));
    }

    let unsubTargets: (() => void) | undefined;
    if (currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') {
      unsubTargets = onSnapshot(collection(db, 'targets'), (snapshot) => {
        setUserTargets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserSalesTarget)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'targets'));
    }

    const unsubBatches = onSnapshot(query(collection(db, 'importBatches'), orderBy('date', 'desc')), (snapshot) => {
      setImportBatches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ImportBatch)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'importBatches'));

    const unsubAttendances = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc')), (snapshot) => {
      setAttendances(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attendance)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    const unsubCommission = onSnapshot(doc(db, 'settings', 'commission'), (snapshot) => {
      if (snapshot.exists()) {
        setCommissionRates(snapshot.data() as CommissionRates);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/commission'));

    const unsubBranches = onSnapshot(doc(db, 'settings', 'branches'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.branches && Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/branches'));

    return () => {
      unsubClients();
      unsubComments();
      unsubInteractions();
      unsubPayments();
      unsubSessions();
      if (unsubAudit) unsubAudit();

      if (unsubTargets) unsubTargets();
      unsubBatches();
      unsubAttendances();
      unsubCommission();
    };
  }, [currentUser]);



  const addAuditLog = useCallback(async (action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, details: string, branch?: Branch) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: currentUser.id,
        action,
        entityType,
        entityId,
        details,
        timestamp: new Date().toISOString(),
        branch: branch || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'auditLogs');
    }
  }, [currentUser]);

  const updateBranches = async (newBranches: Branch[]) => {
    try {
      await setDoc(doc(db, 'settings', 'branches'), { branches: newBranches }, { merge: true });
      await addAuditLog('UPDATE', 'SYSTEM', 'branches', `Updated system branches`);
      setBranches(newBranches);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/branches');
    }
  };

  const updateUserTarget = async (userId: string, month: string, total: number) => {
    if (!currentUser) return;
    try {
      const existing = userTargets.find(t => (t.userId === userId || t.sales_rep_id === userId) && (t.month === month || t.month_year === month));
      const targetData = {
        userId,
        sales_rep_id: userId,
        month,
        month_year: month,
        targetAmount: total,
        setBy: currentUser.id,
        createdAt: new Date().toISOString()
      };

      if (existing) {
        await updateDoc(doc(db, 'targets', existing.id), cleanData(targetData));
        await addAuditLog('UPDATE', 'TARGET', existing.id, `Updated user target for ${month}: Total ${total}`);
      } else {
        const docRef = await addDoc(collection(db, 'targets'), cleanData(targetData));
        await addAuditLog('CREATE', 'TARGET', docRef.id, `Created user target for ${month}: Total ${total}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'targets');
    }
  };

  const addPTPackageRecord = async (session: Omit<PTPackageRecord, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'sessions'), cleanData(session));
      const clientName = clients.find(c => c.id === session.clientId)?.name || session.clientId;
      await addAuditLog('CREATE', 'PACKAGE_RECORD', docRef.id, `Scheduled package for ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  const updatePTPackageRecord = async (id: string, updates: Partial<PTPackageRecord>) => {
    try {
      await updateDoc(doc(db, 'sessions', id), cleanData(updates));
      const record = ptPackageRecords.find(s => s.id === id);
      if (record) {
        const clientName = clients.find(c => c.id === record.clientId)?.name || record.clientId;
        await addAuditLog('UPDATE', 'PACKAGE_RECORD', id, `Updated package status to ${updates.status} for ${clientName}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
    }
  };

  const addImportBatch = async (batch: Omit<ImportBatch, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'importBatches'), cleanData(batch));
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'importBatches');
      return '';
    }
  };

  const updateCommissionRates = async (rates: CommissionRates) => {
    try {
      await setDoc(doc(db, 'settings', 'commission'), rates, { merge: true });
      await addAuditLog('UPDATE', 'TARGET', 'commission', `Updated commission rates: PT ${rates.ptRate}%, Group ${rates.groupRate}%`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/commission');
    }
  };

  const rollbackImport = async (batchId: string) => {
    try {
      const clientsToRollback = clients.filter(c => c.importBatchId === batchId);
      for (const client of clientsToRollback) {
        await deleteDoc(doc(db, 'clients', client.id));
      }
      
      const paymentIds = payments
        .filter(p => clientsToRollback.some(c => c.id === p.clientId))
        .map(p => p.id);
      
      if (paymentIds.length > 0) {
        let batch = writeBatch(db);
        let count = 0;
        for (const pid of paymentIds) {
          batch.delete(doc(db, 'payments', pid));
          count++;
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      }

      await updateDoc(doc(db, 'importBatches', batchId), { status: 'Rolled Back' });
      await addAuditLog('DELETE', 'CLIENT', batchId, `Rolled back import batch, deleted ${clientsToRollback.length} records and ${paymentIds.length} payments`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `importBatches/${batchId}`);
    }
  };

  const bulkAddPayments = async (newPayments: Payment[]) => {
    if (!currentUser) return;
    try {
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const payment of newPayments) {
        const pkgType = payment.packageType || '';
        const sessionType = pkgType.toLowerCase().includes('pt') || pkgType.toLowerCase().includes('private') 
          ? 'Private Training' 
          : 'Group Training';

        const paymentData = {
          ...payment,
          amount_paid: payment.amount,
          sales_rep_id: payment.recordedBy || payment.sales_rep_id || currentUser.id,
          created_at: payment.created_at || new Date().toISOString(),
          package_category_type: payment.package_category_type || sessionType,
          deleted_at: null
        };

        const docRef = doc(collection(db, 'payments'));
        batch.set(docRef, { ...cleanData(paymentData), id: docRef.id });
        operationCount++;

        if (operationCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }
      
      await addAuditLog('CREATE', 'PAYMENT', 'bulk', `Bulk imported ${newPayments.length} payments`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments/bulk');
    }
  };

  const visibleClients = useMemo(() => {
    if (!currentUser) return [];
    let filtered = clients;
    
    if (!canViewGlobalDashboard) {
      // Create a set of all identifiers for the current user (ID and Name aliases)
      const userIdentities = new Set([currentUser.id, currentUser.name].filter(Boolean));
      
      // Add known aliases from the sales name mapping
      Object.entries(SALES_NAME_MAPPING).forEach(([alias, fullName]) => {
        if (fullName === currentUser.name || fullName === currentUser.id) {
          userIdentities.add(alias);
          userIdentities.add(fullName);
        }
      });

      filtered = clients.filter(c => c.assignedTo && userIdentities.has(c.assignedTo));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        (c.memberId && c.memberId.includes(q))
      );
    }
    return filtered;
  }, [clients, currentUser, searchQuery, canViewGlobalDashboard]);

  const visiblePayments = useMemo(() => {
    if (!currentUser) return [];
    if (canViewGlobalDashboard) return payments;
    
    const visibleClientIds = new Set(visibleClients.map(c => c.id));
    const userIdentities = new Set([currentUser.id, currentUser.name].filter(Boolean));
    
    // Add known aliases for payment attribution matching
    Object.entries(SALES_NAME_MAPPING).forEach(([alias, fullName]) => {
      if (fullName === currentUser.name || fullName === currentUser.id) {
        userIdentities.add(alias);
        userIdentities.add(fullName);
      }
    });

    return payments.filter(p => 
      visibleClientIds.has(p.clientId) || 
      (p.recordedBy && userIdentities.has(p.recordedBy)) ||
      (p.sales_rep_id && userIdentities.has(p.sales_rep_id))
    );
  }, [payments, visibleClients, currentUser, canViewGlobalDashboard]);

  const salesStats = useMemo(() => {
    const total = visiblePayments.reduce((acc, p) => acc + p.amount, 0);
    const privateSold = visiblePayments.filter(p => p.packageType.toLowerCase().includes('private')).length;
    const groupSold = visiblePayments.filter(p => p.packageType.toLowerCase().includes('group') || p.packageType.toLowerCase().includes('gt')).length;
    
    const currentMonthStr = new Date().toISOString().substring(0, 7); 

    let targetAmount = salesTarget?.targetAmount || 50000;

    if (currentUser?.role === 'rep') {
      const personalTarget = userTargets.find(t => t.userId === currentUser.id && t.month === currentMonthStr);
      if (personalTarget) {
        targetAmount = personalTarget.targetAmount;
      } else if (currentUser.salesTarget) {
        targetAmount = currentUser.salesTarget;
      }
    } else {
      const allMonthTargets = userTargets.filter(t => t.month === currentMonthStr);
      if (allMonthTargets.length > 0) {
        targetAmount = allMonthTargets.reduce((sum, t) => sum + t.targetAmount, 0);
      }
    }

    return {
      targetAmount,
      currentAmount: total,
      privatePackagesSold: privateSold,
      groupPackagesSold: groupSold
    };
  }, [visiblePayments, salesTarget, currentUser, userTargets]);

  const contextValue = useMemo(() => ({ 
    currentUser: currentUser ? { ...currentUser, role: effectiveRole as any } : null, 
    users,
    login, 
    logout,
    salesTarget: salesStats,
    ptPackageRecords,
    auditLogs,
    userTargets,
    searchQuery,
    setSearchQuery,
    updateUser,
    deleteUser,
    inviteUser,
    updateSalesTarget,
    updateBranches,
    updateUserTarget,
    branches,
    commissionRates,
    updateCommissionRates,
    addPTPackageRecord,
    updatePTPackageRecord,
    addImportBatch,
    rollbackImport,
    importBatches,
    attendances,
    recordAttendance: async (clientId: string, branch: Branch) => {
      if (!currentUser) return;
      try {
        const client = clients.find(c => c.id === clientId);
        if (!client) throw new Error("Client not found");

        const attendanceData: Omit<Attendance, 'id'> = {
          clientId,
          branch,
          date: new Date().toISOString(),
          recordedBy: currentUser.id,
          packageName: client.packageType
        };

        await addDoc(collection(db, 'attendance'), attendanceData);
        
        if (typeof client.sessionsRemaining === 'number') {
          await updateDoc(doc(db, 'clients', clientId), {
            sessionsRemaining: client.sessionsRemaining - 1
          });
        }

        await addAuditLog('CREATE', 'ATTENDANCE', clientId, `Attendance: ${client.name} at ${branch}`, branch);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'attendance');
      }
    },
    selfCheckIn: async (identifier: string, pin: string, branch: Branch) => {
      try {
        // Ensure we are authenticated (anonymous if no real session) so Firestore rules pass
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch {
            return { success: false, message: "Check-in unavailable. Please see the front desk." };
          }
        }

        // Verify PIN
        if (branding.dailyCheckinPin && pin.trim() !== branding.dailyCheckinPin.trim()) {
          return { success: false, message: "Invalid Daily PIN. Please ask the front desk." };
        }

        const normalizedIdentifier = identifier.trim();
        const q = query(collection(db, 'clients'), where('memberId', '==', normalizedIdentifier));
        const q2 = query(collection(db, 'clients'), where('phone', '==', normalizedIdentifier));
        
        const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
        const clientDoc = snap1.docs[0] || snap2.docs[0];

        if (!clientDoc) {
          return { success: false, message: "Member not found. Please check your ID or Phone number." };
        }

        const client = { ...clientDoc.data(), id: clientDoc.id } as Client;

        if (client.status === 'Expired' || client.status === 'Hold') {
          return { success: false, message: `Your membership is currently ${client.status}. Please visit the front desk.` };
        }

        if (typeof client.sessionsRemaining === 'number' && client.sessionsRemaining <= 0) {
          return { success: false, message: "You have no sessions remaining. Please renew your membership at the front desk." };
        }

        const attendanceData: Omit<Attendance, 'id'> = {
          clientId: client.id,
          branch,
          date: new Date().toISOString(),
          recordedBy: 'SELF_CHECKIN',
          packageName: client.packageType
        };

        await addDoc(collection(db, 'attendance'), attendanceData);
        
        if (typeof client.sessionsRemaining === 'number') {
          await updateDoc(doc(db, 'clients', client.id), {
            sessionsRemaining: (client.sessionsRemaining || 0) - 1
          });
        }

        await addDoc(collection(db, 'auditLogs'), {
          userId: 'SELF_CHECKIN',
          action: 'CREATE',
          entityType: 'ATTENDANCE',
          entityId: client.id,
          details: `Self Check-in: ${client.name} at ${branch}`,
          timestamp: new Date().toISOString(),
          branch: branch
        });

        return { success: true, message: `Welcome, ${client.name}! Your attendance has been recorded.` };
      } catch (error) {
        console.error("Self check-in error:", error);
        return { success: false, message: "An error occurred. Please try again." };
      }
    },
    branding,
    updateBranding,
    bulkAddPayments,
    isAuthReady,
    previewRole,
    setPreviewRole,
    isManagerOrSama,
    canDeletePayments,
    canAccessSettings,
    canViewGlobalDashboard,
    canDeleteRecords,
    canAssignLeads,
    wipeSystem: async () => {
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'crm_admin' && currentUser.email !== 'michaelmitry13@gmail.com')) {
        throw new Error("Unauthorized: Only super admins can wipe the system.");
      }

      try {
        const collectionsToWipe = [
          'clients',
          'payments',
          'attendance',
          'sessions',
          'tasks',
          'importBatches',
          'auditLogs'
        ];

        await Promise.all(collectionsToWipe.map(async (collName) => {
          try {
            const snapshot = await getDocs(collection(db, collName));
            if (snapshot.empty) return;
            
            let i = 0;
            let batch = writeBatch(db);
            for (const doc of snapshot.docs) {
              batch.delete(doc.ref);
              i++;
              if (i === 450) { 
                await batch.commit();
                batch = writeBatch(db);
                i = 0;
              }
            }
            if (i > 0) await batch.commit();
          } catch (e) {
            console.error(`Failed to wipe collection ${collName}:`, e);
          }
        }));

        try {
          const commentsSnapshot = await getDocs(collectionGroup(db, 'comments'));
          if (!commentsSnapshot.empty) {
            let i = 0;
            let batch = writeBatch(db);
            for (const doc of commentsSnapshot.docs) {
              batch.delete(doc.ref);
              i++;
              if (i === 450) {
                await batch.commit();
                batch = writeBatch(db);
                i = 0;
              }
            }
            if (i > 0) await batch.commit();
          }
        } catch (e) {
          console.error("Failed to wipe comments collection group:", e);
        }

        try {
          const interactionsSnapshot = await getDocs(collectionGroup(db, 'interactions'));
          if (!interactionsSnapshot.empty) {
            let i = 0;
            let batch = writeBatch(db);
            for (const d of interactionsSnapshot.docs) {
              batch.delete(d.ref);
              i++;
              if (i === 450) {
                await batch.commit();
                batch = writeBatch(db);
                i = 0;
              }
            }
            if (i > 0) await batch.commit();
          }
        } catch (e) {
          console.error("Failed to wipe interactions collection group:", e);
        }

        try {
          await setDoc(doc(db, 'counters', 'clients'), { lastId: 111 }, { merge: true });
        } catch (e) {
          console.error("Failed to reset counters:", e);
        }

        await addAuditLog('DELETE', 'CLIENT', 'system', `CRITICAL: Full system wipe performed by ${currentUser.name}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'system-wipe');
        throw error;
      }
    },
    recalculateAllPackages: async () => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'crm_admin' && currentUser.role !== 'manager')) {
        alert('Unauthorized');
        return;
      }

      const confirm = window.confirm('Are you sure you want to recalculate all expiry dates? This will use the "Start Date" and "Package Type" to determine the new expiry date.');
      if (!confirm) return;

      let successCount = 0;
      let skippedCount = 0;

      const parseDateStr = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const isoDate = parseISO(dateStr);
        if (isValid(isoDate) && isoDate.getFullYear() > 1990) return isoDate;
        const ddmmyyyy = parse(dateStr, 'dd/MM/yyyy', new Date());
        if (isValid(ddmmyyyy) && ddmmyyyy.getFullYear() > 1990) return ddmmyyyy;
        const mmddyyyy = parse(dateStr, 'MM/dd/yyyy', new Date());
        if (isValid(mmddyyyy) && mmddyyyy.getFullYear() > 1990) return mmddyyyy;
        return null;
      };

      const findPackage = (name: string) => {
        if (!name) return null;
        const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return PACKAGES.find(p => {
          const pName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalized.includes(pName) || pName.includes(normalized);
        });
      };

      try {
        const batch = writeBatch(db);
        let batchCount = 0;

        for (const client of baseClients) {
          if (!client.startDate || !client.packageType) {
            skippedCount++;
            continue;
          }
          const startDate = parseDateStr(client.startDate);
          if (!startDate) {
            skippedCount++;
            continue;
          }
          const pkg = findPackage(client.packageType);
          if (!pkg) {
            skippedCount++;
            continue;
          }
          const newExpiryDate = addDays(startDate, pkg.expiryDays);
          const newExpiry = format(newExpiryDate, 'yyyy-MM-dd');
          if (client.membershipExpiry !== newExpiry) {
            batch.update(doc(db, 'clients', client.id), { 
              membershipExpiry: newExpiry,
              status: isAfter(new Date(), newExpiryDate) ? 'Expired' : client.status
            });
            batchCount++;
            successCount++;
            if (batchCount >= 400) {
              await batch.commit();
              batchCount = 0;
            }
          } else {
            skippedCount++;
          }
        }
        if (batchCount > 0) await batch.commit();
        await addAuditLog('UPDATE', 'CLIENT', 'bulk', `Bulk recalculated membership expiry. Success: ${successCount}, Skipped: ${skippedCount}`);
        alert(`Recalculation complete!\nUpdated: ${successCount}\nSkipped: ${skippedCount}`);
      } catch (error) {
        console.error('Error during bulk recalculation:', error);
        handleFirestoreError(error, OperationType.UPDATE, 'clients/bulk-recalculate');
      }
    },
    backfillMemberIds: async () => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'crm_admin' && currentUser.role !== 'manager')) {
        alert('Unauthorized');
        return;
      }

      const clientsToBackfill = baseClients.filter(c => !c.memberId);
      if (clientsToBackfill.length === 0) {
        alert('All clients already have Member IDs.');
        return;
      }

      const confirm = window.confirm(`Found ${clientsToBackfill.length} clients missing Member IDs. Assign sequential IDs now?`);
      if (!confirm) return;

      try {
        const counterRef = doc(db, 'counters', 'clients');
        let nextId = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let currentId = 112;
          if (counterDoc.exists()) {
            currentId = (counterDoc.data().lastId || 111) + 1;
          }
          transaction.set(counterRef, { lastId: currentId + clientsToBackfill.length }, { merge: true });
          return currentId;
        });

        const batch = writeBatch(db);
        let batchCount = 0;
        let successCount = 0;

        for (const client of clientsToBackfill) {
          batch.update(doc(db, 'clients', client.id), { memberId: (nextId++).toString() });
          batchCount++;
          successCount++;
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
          }
        }
        if (batchCount > 0) await batch.commit();
        
        await addAuditLog('UPDATE', 'CLIENT', 'bulk', `Backfilled ${successCount} Member IDs.`);
        alert(`Successfully backfilled ${successCount} Member IDs.`);
      } catch (error) {
        console.error('Error during backfill:', error);
        handleFirestoreError(error, OperationType.UPDATE, 'clients/backfill-ids');
      }
    },
    mergeDuplicates: async () => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'crm_admin' && currentUser.role !== 'manager')) {
        alert('Unauthorized');
        return;
      }

      const confirm = window.confirm('Are you sure you want to merge duplicate profiles? This will identify duplicates by matching any phone numbers (including those separated by /) and merge their data into the most active profile. This action cannot be undone.');
      if (!confirm) return;

      try {
        const clientPhones: Record<string, string[]> = {};
        const phoneToClients: Record<string, string[]> = {};

        baseClients.forEach(c => {
          const rawPhones = (c.phone || '').split(/[/,;]/);
          const normalized = rawPhones
            .map(p => p.trim().replace(/[^0-9]/g, ''))
            .filter(p => p.length >= 8);
          
          clientPhones[c.id] = normalized;
          normalized.forEach(p => {
            if (!phoneToClients[p]) phoneToClients[p] = [];
            phoneToClients[p].push(c.id);
          });
        });

        const visited = new Set<string>();
        const mergeGroups: string[][] = [];

        Object.keys(clientPhones).forEach(startId => {
          if (visited.has(startId)) return;

          const group: string[] = [];
          const stack = [startId];
          visited.add(startId);

          while (stack.length > 0) {
            const currentId = stack.pop()!;
            group.push(currentId);

            const phones = clientPhones[currentId] || [];
            phones.forEach(p => {
              const neighbors = phoneToClients[p] || [];
              neighbors.forEach(neighborId => {
                if (!visited.has(neighborId)) {
                  visited.add(neighborId);
                  stack.push(neighborId);
                }
              });
            });
          }

          if (group.length > 1) {
            mergeGroups.push(group);
          }
        });

        if (mergeGroups.length === 0) {
          alert('No duplicates found.');
          return;
        }

        let totalMerged = 0;
        for (const groupIds of mergeGroups) {
          const groupClients = baseClients.filter(c => groupIds.includes(c.id));
          
          const sorted = [...groupClients].sort((a, b) => {
            if (a.status === 'Active' && b.status !== 'Active') return -1;
            if (b.status === 'Active' && a.status !== 'Active') return 1;
            if (a.memberId && !b.memberId) return -1;
            if (b.memberId && !a.memberId) return 1;
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return dateB - dateA;
          });

          const primary = sorted[0];
          const duplicates = sorted.slice(1);
          if (!primary) continue;

          for (const dup of duplicates) {
            const dupId = dup.id;

            const dupPayments = payments.filter(p => p.clientId === dupId);
            for (const p of dupPayments) {
              await updateDoc(doc(db, 'payments', p.id), { clientId: primary.id });
            }

            const dupAttendance = attendances.filter(a => a.clientId === dupId);
            for (const a of dupAttendance) {
              await updateDoc(doc(db, 'attendance', a.id), { clientId: primary.id });
            }

            const dupSessions = ptPackageRecords.filter(s => s.clientId === dupId);
            for (const s of dupSessions) {
              await updateDoc(doc(db, 'sessions', s.id), { clientId: primary.id });
            }

            const commentsSnapshot = await getDocs(collection(db, 'clients', dupId, 'comments'));
            for (const commentDoc of commentsSnapshot.docs) {
              await addDoc(collection(db, 'clients', primary.id, 'comments'), commentDoc.data());
              await deleteDoc(commentDoc.ref);
            }

            await deleteDoc(doc(db, 'clients', dupId));
            totalMerged++;
          }
        }

        await addAuditLog('UPDATE', 'CLIENT', 'bulk', `Bulk merged ${totalMerged} duplicate profiles.`);
        alert(`Successfully merged ${totalMerged} duplicate profiles.`);
      } catch (error) {
        console.error('Error during merge:', error);
        handleFirestoreError(error, OperationType.UPDATE, 'clients/merge-duplicates');
      }
    }
  }), [
    currentUser, 
    effectiveRole, 
    users, 
    visibleClients, 
    salesStats, 
    visiblePayments, 
    ptPackageRecords, 
    auditLogs,
    importBatches,
    userTargets, 
    branding, 
    searchQuery, 
    isAuthReady, 
    previewRole, 
    attendances, 
    canDeletePayments, 
    canAccessSettings, 
    canViewGlobalDashboard, 
    bulkAddPayments,
    baseClients,
    clients,
    payments,
    canDeleteRecords,
    canAssignLeads,
    isManagerOrSama,
    addAuditLog,
    commissionRates,
    updateCommissionRates,
    branches,
    updateBranches
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
