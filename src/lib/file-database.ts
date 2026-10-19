import type { Client } from "@libsql/client";
import { isStoredGoalFile } from "./goal-activities";

export const fileChunkSize = 256 * 1024;
export const maxFileSize = 20 * 1024 * 1024;

export class FileError extends Error {
  constructor(public status: number) {
    super("File operation failed");
  }
}

export async function findFile(client: Client, userId: string, id: string) {
  if (!isStoredGoalFile(id)) throw new FileError(400);
  const result = await client.execute({
    sql: "SELECT * FROM goal_files WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  if (!result.rows[0]) throw new FileError(404);
  return result.rows[0];
}

export async function beginFile(
  client: Client,
  userId: string,
  id: string,
  value: unknown,
) {
  if (!isStoredGoalFile(id) || !value || typeof value !== "object")
    throw new FileError(400);
  const { name, type, size } = value as {
    name: string;
    type: string;
    size: number;
  };
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 255 ||
    !name.isWellFormed() ||
    /[\x00-\x1f\x7f]/.test(name) ||
    typeof type !== "string" ||
    type.length > 255 ||
    /[\x00-\x1f\x7f]/.test(type) ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    size > maxFileSize
  )
    throw new FileError(400);
  await client.batch(
    [
      {
        sql: "DELETE FROM goal_files WHERE user_id = ? AND created_at < ? AND NOT EXISTS (SELECT 1 FROM activity_resources r WHERE r.storage_key = goal_files.id)",
        args: [userId, Date.now() - 86400000],
      },
      {
        sql: "INSERT INTO goal_files (id, user_id, file_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
        args: [
          id,
          userId,
          name,
          type || "application/octet-stream",
          size,
          Date.now(),
        ],
      },
    ],
    "write",
  );
  const file = await findFile(client, userId, id);
  if (file.file_name !== name || Number(file.size_bytes) !== size)
    throw new FileError(409);
  return { ready: Number(file.ready) === 1 };
}

export async function writeFileChunk(
  client: Client,
  userId: string,
  id: string,
  part: number,
  data: Buffer,
) {
  const file = await findFile(client, userId, id);
  const size = Number(file.size_bytes);
  const expected = Math.min(fileChunkSize, size - part * fileChunkSize);
  if (Number(file.ready) !== 0) throw new FileError(409);
  if (
    !Number.isSafeInteger(part) ||
    part < 0 ||
    expected <= 0 ||
    data.length !== expected
  )
    throw new FileError(400);
  const result = await client.execute({
    sql: `INSERT INTO goal_file_chunks (file_id, part, data)
      SELECT id, ?, ? FROM goal_files WHERE id = ? AND user_id = ? AND ready = 0
      ON CONFLICT (file_id, part) DO UPDATE SET data = excluded.data`,
    args: [part, data, id, userId],
  });
  if (!result.rowsAffected) throw new FileError(409);
}

export async function completeFile(client: Client, userId: string, id: string) {
  const file = await findFile(client, userId, id);
  const result = await client.execute({
    sql: `UPDATE goal_files SET ready = 1 WHERE id = ? AND user_id = ?
      AND size_bytes = (SELECT coalesce(sum(length(data)), 0) FROM goal_file_chunks WHERE file_id = ?)
      AND (SELECT count(*) FROM goal_file_chunks WHERE file_id = ?) = ?`,
    args: [
      id,
      userId,
      id,
      id,
      Math.ceil(Number(file.size_bytes) / fileChunkSize),
    ],
  });
  if (!result.rowsAffected) throw new FileError(409);
}

export async function deleteUnusedFile(
  client: Client,
  userId: string,
  id: string,
) {
  if (!isStoredGoalFile(id)) throw new FileError(400);
  await client.execute({
    sql: "DELETE FROM goal_files WHERE id = ? AND user_id = ? AND NOT EXISTS (SELECT 1 FROM activity_resources WHERE storage_key = ?)",
    args: [id, userId, id],
  });
}
