import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  deleteDoc,
  getDoc,
  enableIndexedDbPersistence,
  onSnapshot,
  query,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB5bHcA6bPreEgDtqcb_sCWCUf21Abnc-o",
  authDomain: "gen-lang-client-0488712142.firebaseapp.com",
  projectId: "gen-lang-client-0488712142",
  storageBucket: "gen-lang-client-0488712142.firebasestorage.app",
  messagingSenderId: "34527626826",
  appId: "1:34527626826:web:663ac332110f044ec588b3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-1aa8d619-5d39-49fe-a797-0b814fd6c276");
export const auth = getAuth(app);

// Ativar persistência offline: recargas do app leem do cache local (zero reads de servidor)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: múltiplas abas abertas — apenas uma aba faz cache');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: navegador não suporta');
  }
});

export async function initAuth(): Promise<void> {
  if (auth.currentUser) return;
  try {
    await Promise.race([
      signInAnonymously(auth),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 8000))
    ]);
  } catch (e) {
    console.warn('Anonymous auth failed (Safari privacy mode?):', e);
  }
}

// Listeners em tempo real — substituem getCollectionData
// Primeira carga lê do servidor; atualizações posteriores são delta-sync (0 reads extras)
export function listenCollection<T>(
  collectionName: string,
  callback: (items: T[]) => void,
  opts?: { orderByField?: string; limitCount?: number }
): () => void {
  const constraints: any[] = [];
  if (opts?.orderByField) constraints.push(orderBy(opts.orderByField, 'desc'));
  if (opts?.limitCount) constraints.push(firestoreLimit(opts.limitCount));
  const ref = constraints.length > 0
    ? query(collection(db, collectionName), ...constraints)
    : collection(db, collectionName);
  return onSnapshot(ref, (snapshot) => {
    callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as T)));
  }, (error) => {
    console.error(`Firebase listen error (${collectionName}):`, error);
  });
}

export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    querySnapshot.forEach((docSnap) => {
      data.push({ ...docSnap.data(), id: docSnap.id } as T);
    });
    return data;
  } catch (error) {
    console.error(`Error loading collection ${collectionName}:`, error);
    throw error;
  }
}

export async function saveItem<T extends { id: string }>(collectionName: string, item: T): Promise<void> {
  try {
    const docRef = doc(db, collectionName, item.id);
    await setDoc(docRef, item);
  } catch (error) {
    console.error(`Error saving item in ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteItem(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting item ${id} from ${collectionName}:`, error);
    throw error;
  }
}

export async function saveCollectionData<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item);
    }
    await batch.commit();
  } catch (error) {
    console.error(`Error bulk saving collection ${collectionName}:`, error);
    throw error;
  }
}

export async function getDocData<T>(collectionName: string, docId: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error loading doc ${docId} from ${collectionName}:`, error);
    throw error;
  }
}
