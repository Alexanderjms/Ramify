import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@libsql/client";

const require = createRequire(import.meta.url);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const exports = {};
  modules.set(name, exports);
  const filename = new URL(`../src/lib/${name}.ts`, import.meta.url);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      exports,
      URL,
      require: (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id)),
    },
    { filename: fileURLToPath(filename), timeout: 1000 },
  );
  return exports;
}

const { goalIcons, isGoalIcon } = load("goal-icons");
const { parseGoalFields, saveGoal, databaseId, listGoals, deleteGoalRecord } =
  load("goal-database");
const { saveActivities } = load("activity-database");
const { validActivities, validResourceUrl, validGoalFileUrl } =
  load("goal-activities");
const { validText, validInputId, validColor } = load("input-validation");
const { saveUserPreferences } = load("preference-database");
const { saveGoalView, parseGoalView } = load("goal-view");
const { beginFile } = load("file-database");
const { parseGoals } = load("goal-storage");
const fields = { name: "Dummy", description: "", color: "#FFFFFF" };
assert.equal(
  goalIcons.length,
  Object.keys(require("bootstrap-icons/font/bootstrap-icons.json")).length,
);
for (const icon of goalIcons) {
  assert.ok(isGoalIcon(icon));
  assert.equal(parseGoalFields({ ...fields, icon }).icon, icon);
  assert.equal(
    parseGoals(
      JSON.stringify([
        {
          ...fields,
          id: "dummy",
          icon,
          progress: 0,
          tasks: 0,
          completedTasks: 0,
          activity: "",
        },
      ]),
    )[0].icon,
    icon,
  );
}
for (const icon of [
  null,
  "",
  "toString",
  "__proto__",
  "fake-icon",
  'star" onclick="x',
]) {
  assert.equal(isGoalIcon(icon), false);
  assert.throws(() => parseGoalFields({ ...fields, icon }));
}

const { migrate } = require("./db-migrate.cjs");
const client = createClient({ url: "file::memory:" });
try {
  await client.execute("PRAGMA foreign_keys = ON");
  for (const name of [
    "0001_initial.sql",
    "0002_goal_view_preferences.sql",
    "0003_activity_persistence.sql",
    "0004_user_preferences.sql",
  ])
    await client.executeMultiple(
      readFileSync(
        new URL(`../db/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  await client.execute("INSERT INTO users (id) VALUES ('alice')");
  await saveGoal(client, "alice", "dummy", { ...fields, icon: "star-fill" });
  await client.execute({
    sql: "INSERT INTO activities (id, goal_id, name, position) VALUES (?, ?, 'Branch', 0)",
    args: [
      JSON.stringify([databaseId("alice", "dummy"), "branch"]),
      databaseId("alice", "dummy"),
    ],
  });
  await client.executeMultiple(
    readFileSync(
      new URL("../db/migrations/0005_all_goal_icons.sql", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    (await client.execute("SELECT icon FROM goals")).rows[0].icon,
    "star-fill",
  );
  assert.equal(
    (await client.execute("SELECT count(*) AS n FROM activities")).rows[0].n,
    1,
  );
  for (const icon of ["star", "github", "1-circle", "star-fill"]) {
    await saveGoal(client, "alice", "dummy", { ...fields, icon });
    assert.equal(
      (await client.execute("SELECT icon FROM goals")).rows[0].icon,
      icon,
    );
  }
  assert.equal(
    (await client.execute("PRAGMA foreign_key_check")).rows.length,
    0,
  );
  await saveGoal(client, "alice", "crud", { ...fields, icon: "book" });
  const branch = {
    id: "crud-branch",
    name: "Branch",
    color: "#FFFFFF",
    status: "pending",
    subtasks: [{ id: "task", name: "Task", status: "pending" }],
    resources: [{ id: "link", name: "Link", url: "https://example.com" }],
  };
  await saveActivities(client, "alice", "crud", [branch], 0, {
    ...fields,
    icon: "book",
  });
  const readGoal = async () =>
    (await listGoals(client, "alice")).find((goal) => goal.id === "crud");
  assert.equal((await readGoal()).activities[0].subtasks[0].name, "Task");
  assert.equal((await readGoal()).activities[0].resources[0].name, "Link");
  branch.name = "Updated branch";
  branch.subtasks[0].status = "completed";
  branch.resources[0].name = "Updated link";
  await saveActivities(client, "alice", "crud", [branch], 1, {
    ...fields,
    icon: "book",
  });
  await saveGoal(client, "alice", "crud", {
    ...fields,
    name: "Updated goal",
    icon: "star",
  });
  const updated = await readGoal();
  assert.equal(updated.name, "Updated goal");
  assert.equal(updated.activities[0].name, "Updated branch");
  assert.equal(updated.activities[0].subtasks[0].status, "completed");
  assert.equal(updated.activities[0].resources[0].name, "Updated link");
  await saveActivities(
    client,
    "alice",
    "crud",
    [{ ...branch, subtasks: [], resources: [] }],
    2,
    { ...fields, icon: "star" },
  );
  assert.equal((await readGoal()).activities[0].subtasks.length, 0);
  assert.equal((await readGoal()).activities[0].resources.length, 0);
  await saveActivities(client, "alice", "crud", [], 3, {
    ...fields,
    icon: "star",
  });
  assert.equal((await readGoal()).activities.length, 0);
  await deleteGoalRecord(client, "alice", "crud");
  assert.equal(await readGoal(), undefined);

  // Injection-looking text must remain literal data, not be stripped or executed.
  const payload = `x'); DROP TABLE goals; --`;
  const xss = `<img src=x onerror="globalThis.__ramifyXss=1">`;
  const attackFields = {
    name: payload,
    description: xss,
    icon: "book",
    color: "#FFFFFF",
  };
  const maliciousGoalId = `goal' OR 1=1 --`;
  await saveGoal(client, "alice", maliciousGoalId, attackFields);
  const tree = [
    {
      id: payload,
      name: xss,
      color: "#FFFFFF",
      status: "pending",
      description: payload,
      notes: `${xss}\n${payload}`,
      subtasks: [{ id: payload, name: xss, status: "pending" }],
      resources: [
        { id: payload, name: xss, url: "https://example.test/?q=%3Cscript%3E" },
      ],
    },
  ];
  await saveActivities(client, "alice", maliciousGoalId, tree, 0, attackFields);
  const saved = (await listGoals(client, "alice")).find(
    (goal) => goal.id === maliciousGoalId,
  );
  assert.equal(saved.name, payload);
  assert.equal(saved.description, xss);
  assert.equal(saved.activities[0].name, xss);
  assert.equal(saved.activities[0].notes, `${xss}\n${payload}`);
  assert.equal(saved.activities[0].subtasks[0].name, xss);
  assert.equal(saved.activities[0].resources[0].name, xss);
  const renderedText = renderToStaticMarkup(createElement("p", null, xss));
  assert.ok(renderedText.includes("&lt;img"));
  assert.ok(
    !renderedText.includes("<img"),
    "Plain text must not become executable HTML",
  );
  assert.equal((await listGoals(client, `alice' OR 1=1 --`)).length, 0);
  await saveGoalView(client, "alice", maliciousGoalId, {
    zoom: 1,
    scrollLeft: 0,
    scrollTop: 0,
    collapsed: [payload],
  });
  const fileId = "ramify-file:11111111-1111-4111-8111-111111111111";
  await beginFile(client, "alice", fileId, {
    name: xss,
    type: "text/html",
    size: 0,
  });
  assert.equal(
    (
      await client.execute({
        sql: "SELECT file_name FROM goal_files WHERE id = ?",
        args: [fileId],
      })
    ).rows[0].file_name,
    xss,
  );
  await assert.rejects(() =>
    saveUserPreferences(client, "alice", { [payload]: "en" }),
  );
  await assert.rejects(() =>
    saveUserPreferences(client, "alice", { language: payload }),
  );
  assert.throws(() =>
    parseGoalView({
      zoom: payload,
      scrollLeft: 0,
      scrollTop: 0,
      collapsed: [],
    }),
  );
  for (const changes of [
    { color: xss },
    { icon: xss },
    { name: "a\u0000b" },
    { description: "\ud800" },
  ])
    assert.throws(() => parseGoalFields({ ...attackFields, ...changes }));
  for (const value of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "&#106;avascript:alert(1)",
    "data:text/html,<svg onload=alert(1)>",
    "vbscript:msgbox(1)",
    "//example.test",
    "https://example.test/\r\nX-Test:1",
  ])
    assert.equal(validResourceUrl(value), false, value);
  assert.equal(validResourceUrl("https://example.test/?q=%3Cscript%3E"), true);
  assert.equal(
    validGoalFileUrl("data:image/svg+xml,<svg onload=alert(1)>"),
    false,
  );
  assert.equal(
    validGoalFileUrl("data:application/octet-stream;base64,PHN2Zz4="),
    true,
  );
  for (const value of ["a\u0000b", "a\u007fb", "\ud800", "x".repeat(129)])
    assert.equal(validInputId(value), false);
  assert.equal(validText("O'Connor <3", 100), true);
  assert.equal(validColor("#ffffff\n"), false);
  assert.equal(validText("Notes\nwith\ttabs", 100, true), true);
  assert.equal(
    validActivities([
      { ...tree[0], resources: [{ id: "link", url: "javascript:alert(1)" }] },
    ]),
    false,
  );
  assert.equal(
    (await client.execute("PRAGMA foreign_key_check")).rows.length,
    0,
  );
  await deleteGoalRecord(client, "alice", maliciousGoalId);
  assert.ok(
    (await listGoals(client, "alice")).some((goal) => goal.id === "dummy"),
    "SQL-like identifiers must not delete other goals",
  );
} finally {
  client.close();
}
const fresh = createClient({ url: "file::memory:" });
try {
  await fresh.execute("PRAGMA foreign_keys = ON");
  await migrate(fresh);
  await migrate(fresh);
} finally {
  fresh.close();
}
console.log(
  `OK: ${goalIcons.length} icons accepted; CRUD persists; SQL payloads stay bound data; unsafe URLs, controls and invalid structured inputs are rejected.`,
);
