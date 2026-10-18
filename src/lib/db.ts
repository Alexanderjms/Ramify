import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

export function getDatabase(): Client {
  if (typeof window !== "undefined")
    throw new Error("Database access is server-only");
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("Turso is not configured");
    client = createClient({ url, authToken });
  }
  return client;
}
