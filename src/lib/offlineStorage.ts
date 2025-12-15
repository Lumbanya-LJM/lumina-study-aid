// Offline storage utilities using IndexedDB

const DB_NAME = 'luminary-study-offline';
const DB_VERSION = 1;

interface OfflineFlashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  mastered: boolean;
}

interface OfflineDeck {
  id: string;
  title: string;
  subject: string;
  cards: OfflineFlashcard[];
  lastSynced: number;
}

interface OfflineQuiz {
  id: string;
  title: string;
  subject: string;
  questions: any[];
  lastSynced: number;
}

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create flashcard decks store
      if (!database.objectStoreNames.contains('flashcard_decks')) {
        const deckStore = database.createObjectStore('flashcard_decks', { keyPath: 'id' });
        deckStore.createIndex('lastSynced', 'lastSynced', { unique: false });
      }

      // Create quizzes store
      if (!database.objectStoreNames.contains('quizzes')) {
        const quizStore = database.createObjectStore('quizzes', { keyPath: 'id' });
        quizStore.createIndex('lastSynced', 'lastSynced', { unique: false });
      }

      // Create pending actions store for sync
      if (!database.objectStoreNames.contains('pending_sync')) {
        database.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Flashcard Deck Operations
export const saveOfflineDeck = async (deck: OfflineDeck): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['flashcard_decks'], 'readwrite');
    const store = transaction.objectStore('flashcard_decks');
    const request = store.put(deck);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save deck offline'));
  });
};

export const getOfflineDecks = async (): Promise<OfflineDeck[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['flashcard_decks'], 'readonly');
    const store = transaction.objectStore('flashcard_decks');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Failed to get offline decks'));
  });
};

export const getOfflineDeck = async (id: string): Promise<OfflineDeck | null> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['flashcard_decks'], 'readonly');
    const store = transaction.objectStore('flashcard_decks');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get offline deck'));
  });
};

export const deleteOfflineDeck = async (id: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['flashcard_decks'], 'readwrite');
    const store = transaction.objectStore('flashcard_decks');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete offline deck'));
  });
};

// Quiz Operations
export const saveOfflineQuiz = async (quiz: OfflineQuiz): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['quizzes'], 'readwrite');
    const store = transaction.objectStore('quizzes');
    const request = store.put(quiz);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save quiz offline'));
  });
};

export const getOfflineQuizzes = async (): Promise<OfflineQuiz[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['quizzes'], 'readonly');
    const store = transaction.objectStore('quizzes');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Failed to get offline quizzes'));
  });
};

export const getOfflineQuiz = async (id: string): Promise<OfflineQuiz | null> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['quizzes'], 'readonly');
    const store = transaction.objectStore('quizzes');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get offline quiz'));
  });
};

// Sync utilities
export const addPendingSync = async (action: {
  type: 'flashcard_review' | 'quiz_complete';
  data: any;
}): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_sync'], 'readwrite');
    const store = transaction.objectStore('pending_sync');
    const request = store.add({ ...action, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to add pending sync'));
  });
};

export const getPendingSyncs = async (): Promise<any[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_sync'], 'readonly');
    const store = transaction.objectStore('pending_sync');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Failed to get pending syncs'));
  });
};

export const clearPendingSyncs = async (): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_sync'], 'readwrite');
    const store = transaction.objectStore('pending_sync');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear pending syncs'));
  });
};

// Check if offline mode is available
export const isOfflineSupported = (): boolean => {
  return 'indexedDB' in window && 'serviceWorker' in navigator;
};

// Get storage usage info
export const getStorageInfo = async (): Promise<{ used: number; quota: number } | null> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
};
