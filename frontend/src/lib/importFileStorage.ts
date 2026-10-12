const DB_NAME = "nogalix-import-files";
const STORE = "files";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB"));
  });
}

export async function saveImportFileToDb(cvId: string, file: File) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, cvId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Écriture IndexedDB"));
  });
  db.close();
}

function normalizeStoredFile(
  value: unknown,
  meta?: { fileName: string; mimeType: string },
): File | null {
  if (!value) return null;
  if (value instanceof File) return value;
  if (value instanceof Blob) {
    const fileName = meta?.fileName || "cv-import";
    const mimeType = meta?.mimeType || value.type || "application/octet-stream";
    return new File([value], fileName, { type: mimeType, lastModified: Date.now() });
  }
  return null;
}

export async function loadImportFileFromDb(
  cvId: string,
  meta?: { fileName: string; mimeType: string },
): Promise<File | null> {
  const db = await openDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(cvId);
    request.onsuccess = () => resolve(normalizeStoredFile(request.result, meta));
    request.onerror = () => reject(request.error ?? new Error("Lecture IndexedDB"));
  });
  db.close();
  return file;
}

export async function deleteImportFileFromDb(cvId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(cvId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Suppression IndexedDB"));
  });
  db.close();
}
