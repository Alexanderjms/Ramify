import { randomUUID } from "node:crypto";
import type { Client, Row } from "@libsql/client";
import type { Adapter, AdapterUser } from "next-auth/adapters";

function toUser(row: Row): AdapterUser {
  return {
    id: String(row.id),
    name: row.name === null ? null : String(row.name),
    email: row.email === null ? "" : String(row.email),
    image: row.image_url === null ? null : String(row.image_url),
    emailVerified:
      row.email_verified_at === null
        ? null
        : new Date(Number(row.email_verified_at)),
  };
}

export function TursoAdapter(getClient: () => Client): Adapter {
  const findUser = async (sql: string, args: string[]) => {
    const result = await getClient().execute({ sql, args });
    return result.rows[0] ? toUser(result.rows[0]) : null;
  };
  return {
    async createUser(user) {
      const id = randomUUID();
      const results = await getClient().batch(
        [
          {
            sql: "INSERT INTO users (id, name, email, email_verified_at, image_url) VALUES (?, ?, ?, ?, ?) RETURNING *",
            args: [
              id,
              user.name ?? null,
              user.email || null,
              user.emailVerified?.getTime() ?? null,
              user.image ?? null,
            ],
          },
          {
            sql: "INSERT INTO user_preferences (user_id) VALUES (?)",
            args: [id],
          },
        ],
        "write",
      );
      return toUser(results[0].rows[0]);
    },
    getUser: (id) => findUser("SELECT * FROM users WHERE id = ?", [id]),
    getUserByEmail: (email) =>
      findUser("SELECT * FROM users WHERE email = ?", [email]),
    getUserByAccount: ({ provider, providerAccountId }) =>
      findUser(
        "SELECT u.* FROM users u JOIN accounts a ON a.user_id = u.id WHERE a.provider = ? AND a.provider_account_id = ?",
        [provider, providerAccountId],
      ),
    async updateUser(user) {
      const columns = [];
      const args: (string | number | null)[] = [];
      for (const [key, column] of [
        ["name", "name"],
        ["email", "email"],
        ["image", "image_url"],
        ["emailVerified", "email_verified_at"],
      ] as const) {
        if (user[key] === undefined) continue;
        columns.push(`${column} = ?`);
        const value = user[key];
        args.push(value instanceof Date ? value.getTime() : (value ?? null));
      }
      columns.push("updated_at = ?");
      args.push(Date.now(), user.id);
      const result = await getClient().execute({
        sql: `UPDATE users SET ${columns.join(", ")} WHERE id = ? RETURNING *`,
        args,
      });
      if (!result.rows[0]) throw new Error("User not found");
      return toUser(result.rows[0]);
    },
    async linkAccount(account) {
      await getClient().execute({
        sql: "INSERT INTO accounts (provider, provider_account_id, user_id, type) VALUES (?, ?, ?, ?)",
        args: [
          account.provider,
          account.providerAccountId,
          account.userId,
          account.type,
        ],
      });
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await getClient().execute({
        sql: "DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?",
        args: [provider, providerAccountId],
      });
    },
    async deleteUser(id) {
      await getClient().execute({
        sql: "DELETE FROM users WHERE id = ?",
        args: [id],
      });
    },
  };
}
