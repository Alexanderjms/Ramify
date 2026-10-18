export const maxGoalFileSize = 20 * 1024 * 1024;

async function fileRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ramify:files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("files", mode);
      const request = run(transaction.objectStore("files"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? request.error);
      transaction.onerror = () => reject(transaction.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveGoalFile(file: File): Promise<string> {
  if (file.size > maxGoalFileSize)
    throw new Error("El archivo debe pesar como máximo 20 MB.");
  const url = `ramify-file:${crypto.randomUUID()}`;
  await fileRequest("readwrite", (store) => store.put(file, url));
  return url;
}

export function removeGoalFile(url: string): Promise<undefined> {
  return fileRequest("readwrite", (store) => store.delete(url));
}

export async function downloadGoalFile(
  url: string,
  name: string,
): Promise<void> {
  const file = await fileRequest<Blob | undefined>("readonly", (store) =>
    store.get(url),
  );
  if (!(file instanceof Blob))
    throw new Error("El archivo ya no está disponible en este navegador.");
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
