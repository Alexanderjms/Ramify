/* eslint-disable @typescript-eslint/no-require-imports */
// Run after pnpm build. Uses only an isolated, temporary database.
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { rm } = require("node:fs/promises");
const { setTimeout: delay } = require("node:timers/promises");
const { createClient } = require("@libsql/client");
const { chromium, expect } = require("@playwright/test");
const { migrate } = require("./db-migrate.cjs");

(async () => {
  const { encode } = await import("next-auth/jwt");
  const filename = `C:/Users/aleex/AppData/Local/Temp/opencode/ramify-subtasks-${randomUUID()}.db`;
  const url = `file:${filename}`;
  const client = createClient({ url });
  const secret = randomBytes(32).toString("hex");
  const origin = "http://localhost:3126";
  let server;
  let browser;
  try {
    await client.execute("PRAGMA foreign_keys = ON");
    await migrate(client);
    await client.execute(
      "INSERT INTO users (id, name) VALUES ('subtasks-test', 'Test')",
    );
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3126"],
      {
        env: {
          ...process.env,
          TURSO_DATABASE_URL: url,
          TURSO_AUTH_TOKEN: "test",
          AUTH_SECRET: secret,
          AUTH_URL: origin,
          AUTH_TRUST_HOST: "true",
          AUTH_GITHUB_ID: "test",
          AUTH_GITHUB_SECRET: "test",
        },
        stdio: "ignore",
      },
    );
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(`${origin}/api/auth/session`);
        ready = true;
        break;
      } catch {
        await delay(100);
      }
    }
    assert.ok(ready, "Test server requires a current pnpm build");
    browser = await chromium.launch();
    const context = await browser.newContext();
    const value = await encode({
      token: { sub: "subtasks-test" },
      secret,
      salt: "authjs.session-token",
    });
    await context.addCookies([
      { name: "authjs.session-token", value, url: origin },
    ]);
    const metadata = {
      name: "Subtask test",
      description: "",
      icon: "flag-fill",
      color: "#A78BFA",
    };
    const sibling = {
      id: "second",
      name: "Conservar esta subtarea",
      status: "pending",
    };
    const branch = {
      id: "branch",
      name: "Rama de prueba",
      color: "#A78BFA",
      status: "pending",
      notes: "Keep notes",
      children: [
        { id: "nested", name: "Nested", color: "#A78BFA", status: "pending" },
      ],
      subtasks: [
        {
          id: "first",
          name: "Revisarla y tomar todo lo útil para el desarrollo para la App.",
          status: "completed",
        },
        sibling,
      ],
    };
    const seeded = await context.request.put(
      `${origin}/api/goals/test/activities`,
      {
        headers: { Origin: origin },
        data: { goal: metadata, version: 0, activities: [branch] },
      },
    );
    assert.equal(seeded.status(), 200);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const remote = async () =>
      (await (await context.request.get(`${origin}/api/goals`)).json()).find(
        (goal) => goal.id === "test",
      ).activities[0];
    const panel = page.getByRole("dialog", { name: branch.name, exact: true });
    const first = panel.locator('[data-task-id="first"]');
    const input = first.getByRole("textbox", {
      name: "Nombre de la subtarea",
      exact: true,
    });
    const open = async () => {
      await page.goto(`${origin}/metas/test`);
      await page
        .getByRole("button", { name: branch.name, exact: true })
        .click();
    };
    await open();
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const toggle = first.locator(".branch-subtask-toggle");
      await toggle.hover();
      await delay(700);
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      assert.equal(await toggle.getAttribute("title"), null);
      const bounds = await first.boundingBox();
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= width,
        "Subtask controls must fit the viewport",
      );
      await first.getByRole("button", { name: /^Editar subtarea:/ }).click();
      await expect(input).toBeFocused();
      await input.fill("   ");
      await input.press("Enter");
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await input.fill("Borrador cancelado");
      await input.press("Escape");
      await expect(input).toHaveCount(0);
      await expect(panel).toBeVisible();
      await expect(toggle).toContainText(branch.subtasks[0].name);
      if (process.env.UI_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.UI_SCREENSHOTS}/subtasks-${width}.png`,
        });
    }
    await first.getByRole("button", { name: /^Editar subtarea:/ }).click();
    await input.fill("  Subtarea editada  ");
    await input.press("Enter");
    await expect
      .poll(async () => (await remote()).subtasks[0].name)
      .toBe("Subtarea editada");
    assert.equal((await remote()).subtasks[0].status, "completed");
    await open();
    await expect(first.locator(".branch-subtask-toggle")).toContainText(
      "Subtarea editada",
    );
    await first.locator(".branch-subtask-toggle").click();
    await expect
      .poll(async () => (await remote()).subtasks[0].status)
      .toBe("pending");
    await first.getByRole("button", { name: /^Eliminar subtarea:/ }).click();
    await expect(first).toHaveCount(0);
    await expect.poll(async () => (await remote()).subtasks).toEqual([sibling]);
    assert.equal((await remote()).notes, branch.notes);
    assert.equal((await remote()).children[0].id, "nested");
    await open();
    await expect(first).toHaveCount(0);
    await panel.getByRole("button", { name: /^Eliminar subtarea:/ }).click();
    await expect.poll(async () => (await remote()).subtasks).toEqual([]);
    await expect(
      panel.getByText("Esta meta todavía no tiene subtareas."),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "Añadir subtarea", exact: true })
      .click();
    await panel
      .getByRole("textbox", { name: "Nombre de la subtarea", exact: true })
      .fill("Nueva subtarea");
    await panel
      .getByRole("textbox", { name: "Nombre de la subtarea", exact: true })
      .press("Enter");
    await expect
      .poll(async () => (await remote()).subtasks[0]?.name)
      .toBe("Nueva subtarea");
    assert.deepEqual(errors, []);
    console.log(
      "OK: no toggle tooltip; desktop/mobile; validation; Escape cancel; edit/toggle/delete/add persist; sibling and nested data preserved.",
    );
  } finally {
    await browser?.close();
    if (server) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill();
      await exited;
    }
    client.close();
    for (const suffix of ["", "-wal", "-shm"])
      await rm(filename + suffix, { force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
