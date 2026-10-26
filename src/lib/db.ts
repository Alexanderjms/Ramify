import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

export function reportDatabaseError(operation: string, error: unknown) {
  const details = error && typeof error === "object" ? error : {};
  console.error("[ramify:database]", operation, {
    code: "code" in details ? details.code : "UNKNOWN",
    rawCode: "rawCode" in details ? details.rawCode : undefined,
  });
}

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
