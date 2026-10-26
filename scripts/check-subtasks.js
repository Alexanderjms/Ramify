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

    async function captureExit(selector, close) {
      await delay(300);
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        window.drawerExit = (async () => {
          const frames = [];
          const start = performance.now();
          while (performance.now() - start < 500) {
            await new Promise(requestAnimationFrame);
            const style = getComputedStyle(element);
            frames.push({
              open: element.open,
              display: style.display,
              opacity: Number(style.opacity),
              transform: style.transform,
              text: element.textContent,
            });
          }
          return frames;
        })();
      }, selector);
      await close();
      if (process.env.UI_SCREENSHOTS) {
        await delay(40);
        await page.screenshot({
          path: `${process.env.UI_SCREENSHOTS}/drawer-exit-${selector === ".branch-details" ? "details" : "menu"}.png`,
        });
      }
      return page.evaluate(() => window.drawerExit);
    }
    const detailsExit = await captureExit(".branch-details", () =>
      panel
        .getByRole("button", {
          name: "Cerrar detalles de la meta",
          exact: true,
        })
        .click(),
    );
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    const menuExit = await captureExit("#mobile-sidebar", () =>
      page.getByRole("button", { name: "Cerrar menú", exact: true }).click(),
    );
    for (const [name, frames, content] of [
      ["Branch details", detailsExit, branch.notes],
      ["Mobile menu", menuExit, "Ramify"],
    ]) {
      const closing = frames.filter(
        (frame) =>
          !frame.open &&
          frame.display !== "none" &&
          frame.opacity > 0 &&
          frame.opacity < 1,
      );
      assert.ok(closing.length > 2, `${name} must visibly animate its exit`);
      assert.ok(
        closing.every((frame) => frame.text.includes(content)),
        `${name} must keep its content mounted throughout exit`,
      );
      assert.equal(frames.at(-1).display, "none");
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const branchButton = page.getByRole("button", {
      name: branch.name,
      exact: true,
    });
    await branchButton.click();
    await delay(300);
    await panel
      .getByRole("button", { name: "Cerrar detalles de la meta", exact: true })
      .click();
    await delay(40);
    await branchButton.click();
    await delay(300);
    await expect(
      panel.locator(".branch-field-text").filter({ hasText: branch.notes }),
    ).toBeVisible();
    const outsideExit = await captureExit(".branch-details", () =>
      page.mouse.click(600, 700),
    );
    assert.ok(
      outsideExit.some(
        (frame) =>
          !frame.open &&
          frame.opacity > 0 &&
          frame.opacity < 1 &&
          frame.text.includes(branch.notes),
      ),
      "Outside click must also keep the panel content while sliding out",
    );
    await expect(page.locator(".branch-fields")).toHaveCount(0);

    await branchButton.click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".branch-details")).not.toHaveAttribute("open");
    await expect(page.locator(".branch-fields")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await branchButton.click();
    const reducedExit = await captureExit(".branch-details", () =>
      panel
        .getByRole("button", {
          name: "Cerrar detalles de la meta",
          exact: true,
        })
        .click(),
    );
    assert.ok(
      reducedExit.every((frame) => frame.transform === "none"),
      "Reduced motion must fade without sliding",
    );
    assert.equal(reducedExit.at(-1).display, "none");

    // Wait for a real idle poll, without focus events or user actions.
    const goalsUrl = `${origin}/api/goals`;
    let remainingFailures = 2;
    let requests = 0;
    const failGoals = async (route) => {
      requests++;
      if (remainingFailures-- > 0)
        await route.fulfill({
          status: 503,
          json: { error: "Temporary outage" },
        });
      else await route.continue();
    };
    await page.route(goalsUrl, failGoals);
    await page.evaluate(() => {
      window.sawServerError = false;
      window.errorObserver = new MutationObserver(() => {
        if (
          document.body.textContent.includes(
            "El servidor no pudo completar la acción.",
          )
        )
          window.sawServerError = true;
      });
      window.errorObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
    await expect.poll(() => requests, { timeout: 25_000 }).toBe(3);
    await delay(300);
    assert.equal(
      await page.evaluate(() => window.sawServerError),
      false,
      "A recovered idle poll must not show an error toast",
    );
    assert.ok(
      (await context.cookies()).some(
        (cookie) => cookie.name === "authjs.session-token",
      ),
    );

    // Persistent failures must remain visible after the bounded retries.
    remainingFailures = 100;
    requests = 0;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const serverNotice = page
      .locator(".gooey-description")
      .filter({ hasText: "El servidor no pudo completar la acción." });
    await expect(serverNotice).toBeVisible({ timeout: 10_000 });
    assert.equal(requests, 3);
    await page.unroute(goalsUrl, failGoals);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(serverNotice).toHaveCount(0);
    await page.evaluate(() => window.errorObserver.disconnect());

    // Replays must keep diagram saves idempotent, including their revision.
    let saveAttempts = 0;
    const activitiesUrl = `${origin}/api/goals/test/activities`;
    const failSaves = async (route) => {
      if (++saveAttempts < 3)
        await route.fulfill({
          status: 503,
          json: { error: "Temporary outage" },
        });
      else await route.continue();
    };
    await page.route(activitiesUrl, failSaves);
    await branchButton.click();
    await panel.locator(".branch-subtask-toggle").click();
    await expect
      .poll(async () => (await remote()).subtasks[0]?.status, {
        timeout: 10_000,
      })
      .toBe("completed");
    assert.equal(saveAttempts, 3);
    assert.equal((await remote()).subtasks.length, 1);
    await page.unroute(activitiesUrl, failSaves);
    await page.waitForFunction(
      () =>
        !JSON.parse(localStorage.getItem("ramify:goals:subtasks-test"))[0]
          .syncPending,
    );
    const beforeReplay = (await (await context.request.get(goalsUrl)).json())[0]
      .activitiesVersion;
    let replayAttempts = 0;
    let committedStatus;
    const loseResponse = async (route) => {
      if (++replayAttempts === 1) {
        committedStatus = (await route.fetch()).status();
        await route.fulfill({
          status: 502,
          json: { error: "Response lost after commit" },
        });
      } else await route.continue();
    };
    await page.route(activitiesUrl, loseResponse);
    await panel.locator(".branch-subtask-toggle").click();
    await expect.poll(() => replayAttempts, { timeout: 10_000 }).toBe(2);
    await page.waitForFunction(
      () =>
        !JSON.parse(localStorage.getItem("ramify:goals:subtasks-test"))[0]
          .syncPending,
    );
    assert.equal(committedStatus, 200);
    const replayed = (await (await context.request.get(goalsUrl)).json())[0];
    assert.equal(
      replayed.activitiesVersion,
      beforeReplay + 1,
      "A lost response must not apply the edit twice",
    );
    assert.equal(replayed.activities[0].subtasks[0].status, "pending");
    await page.unroute(activitiesUrl, loseResponse);
    await panel
      .getByRole("button", { name: "Cerrar detalles de la meta", exact: true })
      .click();

    let viewAttempts = 0;
    const viewUrl = `${origin}/api/goals/test/view`;
    const failView = async (route) => {
      if (route.request().method() === "PUT" && ++viewAttempts < 3)
        await route.fulfill({
          status: 503,
          json: { error: "Temporary outage" },
        });
      else await route.continue();
    };
    await page.route(viewUrl, failView);
    await page.getByRole("button", { name: "Acercar", exact: true }).click();
    await expect
      .poll(
        async () => (await (await context.request.get(viewUrl)).json()).zoom,
        { timeout: 10_000 },
      )
      .toBe(1.1);
    assert.equal(viewAttempts, 3);
    await page.unroute(viewUrl, failView);
    assert.deepEqual(errors, []);
    console.log(
      "OK: subtasks and drawer motion; idle polling recovers without false alerts; persistent failures visible; diagram/view saves retry safely.",
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
