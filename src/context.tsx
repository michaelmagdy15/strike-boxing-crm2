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
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { 
  Client, 
  User, 
  UserRole, 
  Payment, 
  SalesTarget, 
  PTPackageRecord, 
  AuditLog, 
  Task, 
  Package, 
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
import { PACKAGES } from './constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clients: Client[];
  salesTarget: SalesTarget;
  payments: Payment[];
  ptPackageRecords: PTPackageRecord[];
  auditLogs: AuditLog[];
  tasks: Task[];
  packages: Package[];
  coaches: Coach[];
  importBatches: ImportBatch[];
  userTargets: UserSalesTarget[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addClient: (client: Client) => Promise<void>;
  bulkAddClients: (clients: Client[]) => Promise<{success: number, failed: number, errors: {row: number, reason: string}[]}>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  deleteMultipleClients: (ids: string[]) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  inviteUser: (email: string, role: UserRole) => Promise<void>;
  addComment: (clientId: string, text: string, author?: string) => Promise<void>;
  addInteraction: (clientId: string, interaction: Omit<InteractionLog, 'id' | 'author'>) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  updateSalesTarget: (target: number) => Promise<void>;
  updateUserTarget: (userId: string, month: string, total: number, privateTarget: number, groupTarget: number) => Promise<void>;
  addPTPackageRecord: (session: Omit<PTPackageRecord, 'id'>) => Promise<void>;
  updatePTPackageRecord: (id: string, updates: Partial<PTPackageRecord>) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addPackage: (pkg: Omit<Package, 'id'>) => Promise<void>;
  updatePackage: (id: string, updates: Partial<Package>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  addCoach: (coach: Omit<Coach, 'id'>) => Promise<void>;
  updateCoach: (id: string, updates: Partial<Coach>) => Promise<void>;
  deleteCoach: (id: string) => Promise<void>;
  addImportBatch: (batch: Omit<ImportBatch, 'id'>) => Promise<string>;
  rollbackImport: (batchId: string) => Promise<void>;
  isAuthReady: boolean;
  branding: BrandingSettings;
  updateBranding: (branding: Partial<BrandingSettings>) => Promise<void>;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  attendances: Attendance[];
  recordAttendance: (clientId: string, branch: Branch) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
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
  commissionRates: CommissionRates;
  updateCommissionRates: (rates: CommissionRates) => Promise<void>;
  isManagerOrSama: boolean;
  isAtefStrict: boolean;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [userTargets, setUserTargets] = useState<UserSalesTarget[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [globalSalesTarget, setGlobalSalesTarget] = useState(50000);
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: 'Strike',
    logoUrl: '/strikelogo.png'
  });
  const [commissionRates, setCommissionRates] = useState<CommissionRates>({
    ptRate: 8,
    groupRate: 5
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  const effectiveRole = useMemo(() => {
    if ((currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && previewRole) {
      return previewRole;
    }
    return currentUser?.role;
  }, [currentUser, previewRole]);

  const isManagerOrSama = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'admin' && currentUser.name.toLowerCase().includes('sama')) return true;
    return role === 'manager' || role === 'admin' || role === 'super_admin' || role === 'crm_admin';
  }, [currentUser, effectiveRole]);

  const isAtefStrict = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    const nameMatch = currentUser.name.toLowerCase().includes('atef');
    const roleMatch = role === 'manager';
    return nameMatch && roleMatch;
  }, [currentUser, effectiveRole]);

  const canDeletePayments = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    if (role === 'admin' && currentUser.name.toLowerCase().includes('sama')) return true;
    return !!currentUser.can_delete_payments;
  }, [currentUser, effectiveRole]);

  const canAccessSettings = useMemo(() => {
    if (!currentUser) return false;
    const role = effectiveRole;
    if (role === 'super_admin' || role === 'crm_admin' || role === 'manager' || role === 'admin') return true;
    if (currentUser.name.toLowerCase().includes('atef')) return true;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          let userData: User | null = null;

          if (userDoc.exists()) {
            userData = userDoc.data() as User;
            // Force admin role for specific emails if they exist but have wrong role
            if (firebaseUser.email === "michaelmitry13@gmail.com" && userData.role !== 'crm_admin') {
              userData.role = 'crm_admin';
              await updateDoc(userDocRef, { role: 'crm_admin' });
            } else if (firebaseUser.email === "magd.gallab@gmail.com" && userData.role !== 'super_admin') {
              userData.role = 'super_admin';
              await updateDoc(userDocRef, { role: 'super_admin' });
            }
            setCurrentUser(userData);
          } else {
            // Check if user was invited by email
            let role: UserRole = 'rep';
            if (firebaseUser.email === "michaelmitry13@gmail.com") {
              role = 'crm_admin';
            } else if (firebaseUser.email === "magd.gallab@gmail.com") {
              role = 'super_admin';
            } else if (firebaseUser.email) {
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const invitedUserDoc = querySnapshot.docs[0];
                role = invitedUserDoc.data().role as UserRole;
                try {
                  await deleteDoc(doc(db, 'users', invitedUserDoc.id));
                } catch (e) {
                  console.warn("Could not delete placeholder invitation doc:", e);
                }
              }
            }
            
            const newUser: User = {
              id: firebaseUser.uid,
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

  // Real-time listeners
  useEffect(() => {
    if (!currentUser) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

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

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubPackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Package)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'packages'));

    const unsubCoaches = onSnapshot(collection(db, 'coaches'), (snapshot) => {
      setCoaches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Coach)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'coaches'));

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

    const unsubBranding = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        setBranding(snapshot.data() as BrandingSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/branding'));

    const unsubCommission = onSnapshot(doc(db, 'settings', 'commission'), (snapshot) => {
      if (snapshot.exists()) {
        setCommissionRates(snapshot.data() as CommissionRates);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/commission'));

    return () => {
      unsubUsers();
      unsubClients();
      unsubComments();
      unsubInteractions();
      unsubPayments();
      unsubSessions();
      if (unsubAudit) unsubAudit();
      unsubTasks();
      unsubPackages();
      unsubCoaches();
      if (unsubTargets) unsubTargets();
      unsubBatches();
      unsubAttendances();
      unsubBranding();
      unsubCommission();
    };
  }, [currentUser]);

  // Seed initial coaches if none exist
  useEffect(() => {
    const seedInitialCoaches = async () => {
      if (currentUser && (currentUser.role === 'manager' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin')) {
        try {
          const snapshot = await getDocs(collection(db, 'coaches'));
          if (snapshot.empty) {
            const initialCoaches = ['SHADY YOUSSEF', 'OMAR KHALED', 'ALI YASSER', 'SEIF', 'MOHAMED ABD EL SATTAR'];
            for (const name of initialCoaches) {
              await addDoc(collection(db, 'coaches'), { name, active: true });
            }
          }
        } catch (e) {
          console.warn("Failed to seed coaches:", e);
        }
      }
    };
    if (isAuthReady) {
      seedInitialCoaches();
    }
  }, [isAuthReady, currentUser]);

  const login = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await logOut();
  };

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

  const generateMemberId = async (): Promise<string> => {
    const counterRef = doc(db, 'counters', 'clients');
    try {
      const newId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextId = 112; 
        if (counterDoc.exists()) {
          nextId = (counterDoc.data().lastId || 111) + 1;
        }
        transaction.set(counterRef, { lastId: nextId }, { merge: true });
        return nextId;
      });
      return newId.toString();
    } catch (error) {
      console.error("Error generating member ID:", error);
      return Math.floor(Math.random() * 10000).toString();
    }
  };

  const addClient = async (client: Client) => {
    try {
      const { id, comments, ...clientData } = client;
      if (clientData.paid === undefined) clientData.paid = false;
      
      if (!clientData.memberId) {
        clientData.memberId = await generateMemberId();
      }

      const docRef = doc(collection(db, 'clients'));
      const finalData = { 
        ...cleanData(clientData), 
        id: docRef.id,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, finalData);
      await addAuditLog('CREATE', client.status === 'Lead' ? 'LEAD' : 'CLIENT', docRef.id, `Added new ${client.status === 'Lead' ? 'lead' : 'client'}: ${client.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const bulkAddClients = async (newClients: Client[]) => {
    let successCount = 0;
    let failedCount = 0;
    const errors: {row: number, reason: string}[] = [];

    const clientsNeedingId = newClients.filter(c => !c.memberId).length;
    let nextMemberId = 112;
    
    if (clientsNeedingId > 0) {
      const counterRef = doc(db, 'counters', 'clients');
      try {
        nextMemberId = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let currentId = 112;
          if (counterDoc.exists()) {
            currentId = (counterDoc.data().lastId || 111) + 1;
          }
          transaction.set(counterRef, { lastId: currentId + clientsNeedingId }, { merge: true });
          return currentId;
        });
      } catch (error) {
        console.error("Error generating bulk member IDs:", error);
        nextMemberId = Math.floor(Math.random() * 10000);
      }
    }

    let batch = writeBatch(db);
    let operationCount = 0;

    for (let i = 0; i < newClients.length; i++) {
      try {
        const client = newClients[i];
        const { id, comments, ...clientData } = client;
        
        if (!clientData.memberId) {
          clientData.memberId = (nextMemberId++).toString();
        }

        const docRef = id ? doc(db, 'clients', id) : doc(collection(db, 'clients'));
        batch.set(docRef, { 
          ...cleanData(clientData), 
          id: docRef.id,
          createdAt: new Date().toISOString()
        });
        operationCount++;

        if (operationCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
        if (clientData.paid === undefined) clientData.paid = false;
        
        successCount++;
      } catch (err) {
        failedCount++;
        errors.push({ row: i + 1, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    await addAuditLog('CREATE', 'CLIENT', 'bulk', `Bulk imported ${successCount} clients/leads`);
    return { success: successCount, failed: failedCount, errors };
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const updateData = { ...updates };
      if (!updateData.memberId) {
        const existingClient = baseClients.find(c => c.id === id);
        if (existingClient && !existingClient.memberId) {
          updateData.memberId = await generateMemberId();
        }
      }

      await updateDoc(doc(db, 'clients', id), cleanData(updateData));
      const clientName = baseClients.find(c => c.id === id)?.name || id;
      addAuditLog('UPDATE', 'CLIENT', id, `Updated client/lead: ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const clientName = clients.find(c => c.id === id)?.name || id;
      await deleteDoc(doc(db, 'clients', id));
      await addAuditLog('DELETE', 'CLIENT', id, `Deleted client/lead: ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const deleteMultipleClients = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'clients', id));
      }
      await addAuditLog('DELETE', 'CLIENT', 'bulk', `Deleted ${ids.length} clients/leads`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/bulk`);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', id), cleanData(updates));
      const userName = users.find(u => u.id === id)?.name || id;
      addAuditLog('UPDATE', 'CLIENT', id, `Updated user permissions: ${userName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const userName = users.find(u => u.id === id)?.name || id;
      await deleteDoc(doc(db, 'users', id));
      await addAuditLog('DELETE', 'CLIENT', id, `Deleted user: ${userName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const inviteUser = async (email: string, role: UserRole) => {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        email,
        role,
        name: email.split('@')[0],
      });
      await addAuditLog('CREATE', 'CLIENT', docRef.id, `Invited user: ${email} as ${role}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const addComment = async (clientId: string, text: string, author?: string) => {
    try {
      const commentAuthor = author || currentUser?.name || 'Admin';
      await addDoc(collection(db, 'clients', clientId, 'comments'), {
        text,
        date: new Date().toISOString(),
        author: commentAuthor
      });
      await updateDoc(doc(db, 'clients', clientId), {
        lastContactDate: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `clients/${clientId}/comments`);
    }
  };

  const addInteraction = async (clientId: string, interaction: Omit<InteractionLog, 'id' | 'author'>) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'clients', clientId, 'interactions'), {
        ...interaction,
        author: currentUser.name,
        date: interaction.date || new Date().toISOString()
      });
      await updateDoc(doc(db, 'clients', clientId), {
        lastContactDate: interaction.date || new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `clients/${clientId}/interactions`);
    }
  };

  const addPayment = async (payment: Omit<Payment, 'id'>) => {
    if (!currentUser) return;
    try {
      const client = clients.find(c => c.id === payment.clientId);
      const clientName = client?.name || payment.clientId;
      
      const paymentData = {
        ...payment,
        client_name: clientName,
        amount_paid: payment.amount,
        sales_rep_id: payment.recordedBy || currentUser.id,
        created_at: new Date().toISOString(),
        package_category_type: payment.packageType.toLowerCase().includes('pt') || payment.packageType.toLowerCase().includes('private') 
          ? 'Private Training' 
          : 'Group Training',
        deleted_at: null
      };

      const docRef = await addDoc(collection(db, 'payments'), cleanData(paymentData));
      await addAuditLog('CREATE', 'PAYMENT', docRef.id, `Recorded payment of ${payment.amount} LE for ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  const deletePayment = async (id: string) => {
    if (!canDeletePayments) {
      throw new Error("Unauthorized: You do not have permission to delete payments.");
    }
    try {
      const payment = payments.find(p => p.id === id);
      const clientName = payment ? (clients.find(c => c.id === payment.clientId)?.name || payment.clientId) : id;
      const amount = payment?.amount || 'unknown';

      await deleteDoc(doc(db, 'payments', id));
      await addAuditLog('DELETE', 'PAYMENT', id, `Deleted payment of ${amount} LE for ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
    }
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    try {
      const payment = payments.find(p => p.id === id);
      const clientName = payment ? (clients.find(c => c.id === payment.clientId)?.name || payment.clientId) : id;

      await updateDoc(doc(db, 'payments', id), cleanData(updates));
      await addAuditLog('UPDATE', 'PAYMENT', id, `Updated payment for ${clientName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const updateSalesTarget = async (target: number) => {
    setGlobalSalesTarget(target);
    await addAuditLog('UPDATE', 'TARGET', 'sales-target', `Updated sales target to ${target}`);
  };

  const updateUserTarget = async (userId: string, month: string, total: number, privateTarget: number, groupTarget: number) => {
    if (!currentUser) return;
    try {
      const existing = userTargets.find(t => (t.userId === userId || t.sales_rep_id === userId) && (t.month === month || t.month_year === month));
      const targetData = {
        userId,
        sales_rep_id: userId,
        month,
        month_year: month,
        targetAmount: total,
        target_total_private: privateTarget,
        target_total_group: groupTarget,
        privateTarget,
        groupTarget,
        setBy: currentUser.id,
        createdAt: new Date().toISOString()
      };

      if (existing) {
        await updateDoc(doc(db, 'targets', existing.id), cleanData(targetData));
        await addAuditLog('UPDATE', 'TARGET', existing.id, `Updated user target for ${month}: Total ${total}, Private ${privateTarget}, Group ${groupTarget}`);
      } else {
        const docRef = await addDoc(collection(db, 'targets'), cleanData(targetData));
        await addAuditLog('CREATE', 'TARGET', docRef.id, `Created user target for ${month}: Total ${total}, Private ${privateTarget}, Group ${groupTarget}`);
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

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!currentUser) return;
    try {
      const newTask = {
        ...task,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'tasks'), cleanData(newTask));
      await addAuditLog('CREATE', 'CLIENT', docRef.id, `Created task: ${task.title}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', id), cleanData(updates));
      const taskName = tasks.find(t => t.id === id)?.title || id;
      await addAuditLog('UPDATE', 'CLIENT', id, `Updated task: ${taskName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const taskName = tasks.find(t => t.id === id)?.title || id;
      await deleteDoc(doc(db, 'tasks', id));
      await addAuditLog('DELETE', 'CLIENT', id, `Deleted task: ${taskName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const addPackage = async (pkg: Omit<Package, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'packages'), cleanData(pkg));
      await addAuditLog('CREATE', 'CLIENT', docRef.id, `Created package: ${pkg.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'packages');
    }
  };

  const updatePackage = async (id: string, updates: Partial<Package>) => {
    try {
      await updateDoc(doc(db, 'packages', id), cleanData(updates));
      const pkgName = packages.find(p => p.id === id)?.name || id;
      await addAuditLog('UPDATE', 'CLIENT', id, `Updated package: ${pkgName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `packages/${id}`);
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const pkgName = packages.find(p => p.id === id)?.name || id;
      await deleteDoc(doc(db, 'packages', id));
      await addAuditLog('DELETE', 'CLIENT', id, `Deleted package: ${pkgName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `packages/${id}`);
    }
  };

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

  const addImportBatch = async (batch: Omit<ImportBatch, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'importBatches'), cleanData(batch));
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'importBatches');
      return '';
    }
  };

  const updateBranding = async (updates: Partial<BrandingSettings>) => {
    try {
      await setDoc(doc(db, 'settings', 'branding'), updates, { merge: true });
      await addAuditLog('UPDATE', 'TARGET', 'branding', `Updated branding settings`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/branding');
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
      filtered = clients.filter(c => c.assignedTo === currentUser.id);
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
  }, [clients, currentUser, effectiveRole, searchQuery, canViewGlobalDashboard]);

  const visiblePayments = useMemo(() => {
    if (!currentUser) return [];
    if (canViewGlobalDashboard) return payments;
    
    const visibleClientIds = new Set(visibleClients.map(c => c.id));
    return payments.filter(p => 
      visibleClientIds.has(p.clientId) || 
      p.recordedBy === currentUser.id ||
      p.sales_rep_id === currentUser.id
    );
  }, [payments, visibleClients, currentUser, canViewGlobalDashboard]);

  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    if (effectiveRole === 'manager' || effectiveRole === 'admin') return tasks;
    return tasks.filter(t => t.assignedTo === currentUser.id || t.createdBy === currentUser.id);
  }, [tasks, currentUser, effectiveRole]);

  const salesStats = useMemo(() => {
    const total = visiblePayments.reduce((acc, p) => acc + p.amount, 0);
    const privateSold = visiblePayments.filter(p => p.packageType.toLowerCase().includes('private')).length;
    const groupSold = visiblePayments.filter(p => p.packageType.toLowerCase().includes('group') || p.packageType.toLowerCase().includes('gt')).length;
    
    const currentMonthStr = new Date().toISOString().substring(0, 7); 

    let targetAmount = globalSalesTarget;
    let privateTarget = 0;
    let groupTarget = 0;

    if (currentUser?.role === 'rep') {
      const personalTarget = userTargets.find(t => t.userId === currentUser.id && t.month === currentMonthStr);
      if (personalTarget) {
        targetAmount = personalTarget.targetAmount;
        privateTarget = personalTarget.privateTarget || 0;
        groupTarget = personalTarget.groupTarget || 0;
      } else if (currentUser.salesTarget) {
        targetAmount = currentUser.salesTarget;
      }
    } else {
      const allMonthTargets = userTargets.filter(t => t.month === currentMonthStr);
      if (allMonthTargets.length > 0) {
        targetAmount = allMonthTargets.reduce((sum, t) => sum + t.targetAmount, 0);
        privateTarget = allMonthTargets.reduce((sum, t) => sum + (t.privateTarget || 0), 0);
        groupTarget = allMonthTargets.reduce((sum, t) => sum + (t.groupTarget || 0), 0);
      }
    }

    return {
      targetAmount,
      currentAmount: total,
      privatePackagesSold: privateSold,
      groupPackagesSold: groupSold,
      privateTarget,
      groupTarget
    };
  }, [visiblePayments, globalSalesTarget, currentUser, userTargets]);

  const contextValue = useMemo(() => ({ 
    currentUser: currentUser ? { ...currentUser, role: effectiveRole as any } : null, 
    users,
    login, 
    logout,
    clients: visibleClients, 
    salesTarget: salesStats, 
    payments: visiblePayments, 
    ptPackageRecords,
    auditLogs,
    tasks: visibleTasks,
    packages,
    coaches,
    importBatches,
    userTargets,
    searchQuery,
    setSearchQuery,
    addClient, 
    bulkAddClients,
    updateClient, 
    deleteClient,
    deleteMultipleClients,
    updateUser,
    deleteUser,
    inviteUser,
    addComment,
    addInteraction,
    addPayment,
    updatePayment,
    deletePayment,
    updateSalesTarget,
    updateUserTarget,
    addPTPackageRecord,
    updatePTPackageRecord,
    addTask,
    updateTask,
    deleteTask,
    addPackage,
    updatePackage,
    deletePackage,
    addCoach,
    updateCoach,
    deleteCoach,
    addImportBatch,
    rollbackImport,
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
        // Verify PIN first
        if (branding.dailyCheckinPin && pin !== branding.dailyCheckinPin) {
          return { success: false, message: "Invalid Daily PIN. Please ask the front desk." };
        }

        const q = query(collection(db, 'clients'), where('memberId', '==', identifier));
        const q2 = query(collection(db, 'clients'), where('phone', '==', identifier));
        
        const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
        const clientDoc = snap1.docs[0] || snap2.docs[0];

        if (!clientDoc) {
          return { success: false, message: "Member not found. Please check your ID or Phone number." };
        }

        const client = { ...clientDoc.data(), id: clientDoc.id } as Client;

        if (client.status === 'Expired' || client.status === 'Hold') {
          return { success: false, message: `Your membership is currently ${client.status}. Please visit the front desk.` };
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
    isAtefStrict,
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
    visibleTasks, 
    packages, 
    coaches, 
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
    globalSalesTarget,
    isManagerOrSama,
    isAtefStrict,
    addAuditLog,
    commissionRates,
    updateCommissionRates
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
