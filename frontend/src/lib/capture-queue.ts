'use client';

import type { SyncCapturePayload } from '@/lib/api';

const DB_NAME = 'torneos-pesca-offline';
const STORE_NAME = 'capture_queue';
const DB_VERSION = 1;

export type PendingCaptureRecord = SyncCapturePayload & {
  id: string;
  createdAt: string;
  syncState: 'PENDING_SYNC' | 'SYNCING' | 'ERROR';
  lastError?: string | null;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const database = await openDatabase();

  return new Promise<T | void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = run(store);

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
}

export function listQueuedCaptures() {
  return withStore<PendingCaptureRecord[]>('readonly', (store) => store.getAll()).then(
    (result) => (result as PendingCaptureRecord[] | undefined) ?? [],
  );
}

export function saveQueuedCapture(record: PendingCaptureRecord) {
  return withStore('readwrite', (store) => {
    store.put(record);
  });
}

export function deleteQueuedCapture(id: string) {
  return withStore('readwrite', (store) => {
    store.delete(id);
  });
}

export async function updateQueuedCapture(
  id: string,
  patch: Partial<PendingCaptureRecord>,
) {
  const items = await listQueuedCaptures();
  const current = items.find((item) => item.id === id);
  if (!current) {
    return;
  }

  await saveQueuedCapture({
    ...current,
    ...patch,
  });
}
