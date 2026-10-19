import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(
    compiled,
    {
      exports,
      Request,
      Response,
      Headers,
      Buffer,
      Blob,
      File,
      URL,
      crypto,
      require: (id) => {
        assert.ok(
          Object.hasOwn(dependencies, id),
          `Unexpected dependency: ${id}`,
        );
        return dependencies[id];
      },
      ...globals,
    },
    { timeout: 1000 },
  );
  return exports;
}

let account = "bob";
let databaseCalls = 0;
const route = load("../src/app/api/files/[id]/route.ts", {
  "@/auth": { auth: async () => (account ? { user: { id: account } } : null) },
  "@/lib/db": {
    getDatabase: () => {
      databaseCalls++;
      return {};
    },
  },
  "@/lib/file-database": { deleteUnusedFile: async () => {} },
  "@/lib/request-body": {},
});
const context = { params: Promise.resolve({ id: "dummy" }) };
for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]) {
  for (const expectedUser of ["alice", "", null]) {
    const headers = { Origin: "https://ramify.test" };
    if (expectedUser !== null) headers["X-Ramify-User-Id"] = expectedUser;
    const response = await route[method](
      new Request("https://ramify.test/api/files/dummy", { method, headers }),
      context,
    );
    assert.equal(
      response.status,
      403,
      `${method} must reject stale/missing account`,
    );
  }
}
assert.equal(databaseCalls, 0);
const request = (origin = "https://ramify.test") =>
  new Request("https://ramify.test/api/files/dummy", {
    method: "DELETE",
    headers: { Origin: origin, "X-Ramify-User-Id": "bob" },
  });
assert.equal(
  (await route.DELETE(request("https://other.test"), context)).status,
  403,
);
account = "";
assert.equal((await route.DELETE(request(), context)).status, 401);
account = "bob";
assert.equal((await route.DELETE(request(), context)).status, 204);

const methods = [];
let failChunk = false;
const files = load(
  "../src/lib/goal-files.ts",
  {
    "./goal-activities": {
      isStoredGoalFile: (value) => value.startsWith("ramify-file:"),
    },
    "./goal-storage": { goalsStorageKey: "ramify:goals" },
  },
  {
    localStorage: { getItem: () => "ramify:goals:bob" },
    indexedDB: {
      open: () => {
        throw new Error("Must not read another account's legacy files");
      },
    },
    fetch: async (_url, init) => {
      assert.equal(new Headers(init.headers).get("X-Ramify-User-Id"), "alice");
      methods.push(init.method ?? "GET");
      if (failChunk && init.method === "PUT")
        return new Response(null, { status: 403 });
      return init.method === "POST"
        ? Response.json({ ready: false })
        : new Response(null, { status: init.method ? 204 : 404 });
    },
  },
);
const id = await files.saveGoalFile(new File(["dummy"], "dummy.txt"), "alice");
await files.removeGoalFile(id, "alice");
await assert.rejects(
  files.downloadGoalFile(id, "dummy.txt", "alice"),
  /ownership/,
);
await assert.rejects(
  files.saveGoalFile(new File([], "dummy.txt"), ""),
  /authenticated/,
);
assert.deepEqual(methods, ["POST", "PUT", "PATCH", "DELETE", "GET"]);
methods.length = 0;
const activity = { resources: [{ fileName: "dummy.txt", url: id }] };
await files.migrateGoalFiles([{ ...activity, children: [activity] }], "alice");
assert.deepEqual(methods, ["HEAD", "HEAD"]);
methods.length = 0;
failChunk = true;
await assert.rejects(
  files.saveGoalFile(new File(["dummy"], "dummy.txt"), "alice"),
  /chunk/,
);
assert.deepEqual(methods, ["POST", "PUT", "DELETE"]);
console.log(
  "OK: file requests stay account-bound; stale requests and unowned legacy reads are rejected.",
);
