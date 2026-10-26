/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const Module = require("node:module");
const ts = require("typescript");

(async () => {
  const core = require.resolve("@auth/core", {
    paths: [path.dirname(require.resolve("next-auth"))],
  });
  const { Auth } = await import(pathToFileURL(core).href);
  const { encode } = await import("next-auth/jwt");
  const GitHub = await import("next-auth/providers/github");
  const secret = "isolated-session-regression-test-secret";
  const user = {
    id: "test-user",
    name: "Stored name",
    email: "test@example.com",
    image: null,
  };
  let unavailable = false;
  let deleted = false;
  let lookups = 0;
  let handlers;
  let cookie = await encode({
    token: { sub: user.id, name: "Signed in" },
    secret,
    salt: "authjs.session-token",
  });
  const request = () =>
    new Request("http://localhost/api/auth/session", {
      headers: { cookie: `authjs.session-token=${cookie}` },
    });
  const filename = path.resolve(__dirname, "../src/auth.ts");
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  const mocks = {
    "next-auth": {
      default: (config) => {
        handlers = {
          GET: (req) =>
            Auth(req, {
              ...config,
              basePath: "/api/auth",
              secret,
              trustHost: true,
              logger: { error() {} },
            }),
        };
        return {
          handlers,
          auth: async () => (await handlers.GET(request())).json(),
        };
      },
    },
    "next-auth/providers/github": GitHub,
    "@/lib/db": {
      reportDatabaseError() {},
      getDatabase() {
        throw new Error("Real database must not be used");
      },
    },
    "@/lib/auth-adapter": {
      TursoAdapter: () => ({
        getUser: async () => {
          lookups++;
          if (unavailable) throw new Error("Temporary database outage");
          return deleted ? null : user;
        },
      }),
    },
  };
  loaded.require = (id) => (id in mocks ? mocks[id] : require(id));
  loaded._compile(compiled, filename);

  unavailable = true;
  const refresh = await handlers.GET(request());
  assert.equal(
    (await refresh.json())?.user?.id,
    user.id,
    "A database outage must not invalidate a verified JWT",
  );
  assert.doesNotMatch(
    refresh.headers.get("set-cookie") ?? "",
    /authjs\.session-token=;/,
    "A database outage must not delete the session cookie",
  );
  assert.equal(
    lookups,
    0,
    "Token verification and renewal must not depend on database availability",
  );
  await assert.rejects(
    loaded.exports.auth(),
    /Temporary database outage/,
    "Protected access must fail closed with a server error, not a false expired session",
  );
  unavailable = false;
  assert.equal(
    (await loaded.exports.auth()).user.name,
    user.name,
    "Access recovers with the same cookie after the database recovers",
  );
  deleted = true;
  assert.equal(
    await loaded.exports.auth(),
    null,
    "Deleted users must still be denied protected access",
  );
  deleted = false;
  cookie = "invalid-token";
  assert.equal(await loaded.exports.auth(), null);
  cookie = await encode({
    token: { sub: user.id },
    secret,
    salt: "authjs.session-token",
    maxAge: -60,
  });
  assert.equal(
    await loaded.exports.auth(),
    null,
    "Actually expired tokens must still be rejected",
  );
  console.log(
    "OK: database outage preserves JWT/cookie; protected access fails closed; same-session recovery; deleted users, invalid and expired tokens rejected.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
