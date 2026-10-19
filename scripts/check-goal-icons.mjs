import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@libsql/client";

const require = createRequire(import.meta.url);
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
  `OK: ${goalIcons.length} icons accepted; migration preserves data; goal/branch/subtask/resource CRUD persists.`,
);
