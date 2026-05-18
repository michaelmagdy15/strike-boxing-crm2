import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, (firebaseConfig as any).firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const sendPasswordReset = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

/**
 * Creates a Firebase Auth user without disrupting the current admin session.
 * Uses a temporary secondary app instance that gets deleted after creation.
 */
export const createFirebaseUser = async (email: string, password: string): Promise<string> => {
  const tempApp = initializeApp(firebaseConfig as any, `temp-${Date.now()}`);
  const tempAuth = getAuth(tempApp);
  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    return cred.user.uid;
  } finally {
    await deleteApp(tempApp);
  }
};

/**
 * Retrieves the UID of an existing Firebase Auth account by signing in with the
 * known default password. Used when `createFirebaseUser` fails with
 * `auth/email-already-in-use` to recover the pre-existing UID so Firestore
 * documents can be migrated to it.
 */
export const getExistingUserUID = async (email: string, password: string): Promise<string> => {
  const tempApp = initializeApp(firebaseConfig as any, `temp-lookup-${Date.now()}`);
  const tempAuth = getAuth(tempApp);
  try {
    const cred = await signInWithEmailAndPassword(tempAuth, email, password);
    return cred.user.uid;
  } finally {
    await deleteApp(tempApp);
  }
};

/**
 * Checks what sign-in methods are registered for an email address.
 * Useful for diagnosing why an account already exists.
 */
export const checkSignInMethods = async (email: string): Promise<string[]> => {
  return fetchSignInMethodsForEmail(auth, email);
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
