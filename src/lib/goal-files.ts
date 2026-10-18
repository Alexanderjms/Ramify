import { isStoredGoalFile, type GoalActivity } from "./goal-activities";

export const maxGoalFileSize = 20 * 1024 * 1024;
const chunkSize = 256 * 1024;

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

async function uploadFile(file: File, url: string): Promise<string> {
  if (file.size > maxGoalFileSize)
    throw new Error("El archivo debe pesar como máximo 20 MB.");
  const endpoint = `/api/files/${encodeURIComponent(url)}`;
  const start = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
  });
  if (!start.ok) throw new Error("Could not upload file");
  if (!(await start.json()).ready) {
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const response = await fetch(`${endpoint}?part=${offset / chunkSize}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file.slice(offset, offset + chunkSize),
      });
      if (!response.ok) throw new Error("Could not upload file chunk");
    }
    const complete = await fetch(endpoint, { method: "PATCH" });
    if (!complete.ok) throw new Error("Could not finish upload");
  }
  return url;
}

export async function saveGoalFile(file: File): Promise<string> {
  const url = `ramify-file:${crypto.randomUUID()}`;
  try {
    return await uploadFile(file, url);
  } catch (error) {
    await fetch(`/api/files/${encodeURIComponent(url)}`, {
      method: "DELETE",
    }).catch(() => {});
    throw error;
  }
}

export async function removeGoalFile(url: string): Promise<void> {
  const response = await fetch(`/api/files/${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Could not remove file");
  await fileRequest("readwrite", (store) => store.delete(url)).catch(() => {});
}

export async function downloadGoalFile(
  url: string,
  name: string,
): Promise<void> {
  const response = await fetch(`/api/files/${encodeURIComponent(url)}`, {
    cache: "no-store",
  });
  let file: Blob | undefined;
  if (response.ok) file = await response.blob();
  else if (response.status === 404)
    file = await fileRequest<Blob | undefined>("readonly", (store) =>
      store.get(url),
    );
  if (!(file instanceof Blob)) throw new Error("Could not download file");
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function migrateGoalFiles(
  activities: GoalActivity[],
): Promise<GoalActivity[]> {
  const migrated: GoalActivity[] = [];
  for (const activity of activities) {
    const resources = [];
    for (const resource of activity.resources ?? []) {
      if (!resource.fileName) {
        resources.push(resource);
        continue;
      }
      if (isStoredGoalFile(resource.url)) {
        const response = await fetch(
          `/api/files/${encodeURIComponent(resource.url)}`,
          { method: "HEAD", cache: "no-store" },
        );
        if (response.ok) {
          resources.push(resource);
          continue;
        }
        if (response.status !== 404)
          throw new Error("Could not verify attachment");
        const blob = await fileRequest<Blob | undefined>("readonly", (store) =>
          store.get(resource.url),
        );
        if (!(blob instanceof Blob))
          throw new Error(
            "Local attachment is missing; it has not been removed from your goal",
          );
        await uploadFile(
          new File([blob], resource.fileName, { type: blob.type }),
          resource.url,
        );
        resources.push(resource);
      } else {
        const response = await fetch(resource.url);
        const file = new File([await response.blob()], resource.fileName, {
          type: "application/octet-stream",
        });
        resources.push({ ...resource, url: await saveGoalFile(file) });
      }
    }
    migrated.push({
      ...activity,
      resources,
      children: await migrateGoalFiles(activity.children ?? []),
    });
  }
  return migrated;
}
