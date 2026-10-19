import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// All API calls are intercepted; this checks the real UI without an account or database writes.
const route = await mkdtemp(
  fileURLToPath(new URL("../src/app/responsive-check-", import.meta.url)),
);
const browser = await chromium.launch();
const widths = [320, 360, 390, 768, 1024, 1440];
const goal = {
  id: "responsive-goal",
  name: "UnaMetaConNombreLargo".repeat(4),
  description: "DescripciónSinEspacios".repeat(30),
  icon: "book-fill",
  color: "#A78BFA",
  progress: 0,
  tasks: 2,
  completedTasks: 0,
  activity: "Sin actividad",
  activities: [
    {
      id: "parent",
      name: "Rama principal",
      color: "#3B82F6",
      status: "pending",
      priority: "medium",
      description: "DescripciónSinEspacios".repeat(20),
      notes: "Notas sin perder contenido en móvil.",
      resources: [
        { id: "link", url: `https://example.test/${"archivo".repeat(20)}` },
      ],
      subtasks: [
        {
          id: "task",
          name: "UnaSubtareaSinEspacios".repeat(4),
          status: "pending",
        },
      ],
      children: [
        { id: "child", name: "Subrama", color: "#3B82F6", status: "pending" },
      ],
    },
  ],
};
let preferences = {
  language: "es",
  goalView: "grid",
  goalSort: "activity",
  goalStatus: "Todas",
  sidebarCollapsed: false,
};
try {
  const fixture = await readFile(
    new URL("./fixtures/responsive-page.tsx", import.meta.url),
  );
  for (const screen of ["dashboard", "metas", "diagrama", "loading"]) {
    await mkdir(`${route}/${screen}`);
    await writeFile(`${route}/${screen}/page.tsx`, fixture);
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.route("**/api/**", async (request) => {
    const url = new URL(request.request().url());
    let json;
    if (url.pathname === "/api/preferences") {
      if (request.request().method() === "PATCH")
        preferences = { ...preferences, ...request.request().postDataJSON() };
      json = preferences;
    } else if (url.pathname === "/api/goals")
      json = [goal, { ...goal, id: "second-goal", name: "Segunda meta" }];
    else if (url.pathname.endsWith("/view"))
      json = { zoom: 1, scrollLeft: 0, scrollTop: 0, collapsed: [] };
    else if (url.pathname.endsWith("/activities")) json = { version: 1 };
    else if (url.pathname === "/api/auth/session")
      json = {
        user: { id: "responsive-check", name: "Cuenta de prueba" },
        expires: "2099-01-01T00:00:00Z",
      };
    else throw new Error(`Unexpected API request: ${url.pathname}`);
    await request.fulfill({ json });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.argv[2] ?? "http://localhost:3000";
  const prefix = route.split(/[\\/]/).at(-1);
  async function noOverflow(label) {
    const result = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      result.scroll <= result.width + 1,
      `${label}: document ${result.scroll}px > viewport ${result.width}px`,
    );
    const clipped = await page
      .locator(".goal-card h3, .goal-card p")
      .evaluateAll((elements) =>
        elements.some((el) => el.scrollWidth > el.clientWidth + 1),
      );
    assert.equal(clipped, false, `${label}: texto recortado en tarjeta`);
  }
  async function screenshot(name) {
    if (!process.env.RESPONSIVE_SCREENSHOTS) return;
    await mkdir(process.env.RESPONSIVE_SCREENSHOTS, { recursive: true });
    await page.screenshot({
      path: `${process.env.RESPONSIVE_SCREENSHOTS}/${name}.png`,
      fullPage: true,
    });
  }
  async function checkDialog(dialog, label) {
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("opacity", "1");
    await expect
      .poll(
        () =>
          dialog.evaluate((el) => {
            const box = el.getBoundingClientRect();
            return (
              box.left >= -1 &&
              box.right <= innerWidth + 1 &&
              el.scrollWidth <= el.clientWidth + 1
            );
          }),
        { message: label },
      )
      .toBe(true);
  }
  for (const screen of ["dashboard", "metas", "diagrama", "loading"]) {
    await expect
      .poll(
        async () =>
          (await page.request.get(`${base}/${prefix}/${screen}`)).status(),
        { timeout: 15000 },
      )
      .toBe(200);
    await page.goto(`${base}/${prefix}/${screen}`);
    if (screen === "diagrama")
      await expect(
        page.getByRole("region", { name: "Diagrama de la meta", exact: true }),
      ).toBeVisible();
    else if (screen !== "loading")
      await expect(page.locator(".goal-card").first()).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(`${screen} ${width}`);
      if (width === 320 || width === 768)
        await screenshot(`${screen}-${width}`);
      if (screen === "diagrama") {
        await expect
          .poll(
            () =>
              page.locator(".goal-canvas-tools").evaluate((el) => {
                const box = el.getBoundingClientRect();
                const canvas = el
                  .closest(".goal-canvas-wrapper")
                  .getBoundingClientRect();
                return (
                  box.left >= canvas.left &&
                  box.right <= canvas.right &&
                  box.bottom <= innerHeight + 1
                );
              }),
            { message: `controles del diagrama ${width}` },
          )
          .toBe(true);
      }
    }
    await page.setViewportSize({ width: 320, height: 740 });
    if (screen === "metas") {
      await page
        .getByRole("button", { name: "Vista lista", exact: true })
        .click();
      await expect(page.getByRole("table")).toBeVisible();
      await noOverflow("tabla 320");
    }
    if (screen === "dashboard") {
      await page
        .getByRole("button", { name: "Nueva meta", exact: true })
        .click();
      const modal = page.getByRole("dialog", {
        name: "Crear nueva meta",
        exact: true,
      });
      await checkDialog(modal, "crear meta 320");
      await screenshot("crear-320");
      await modal
        .getByRole("button", { name: "Cambiar icono y color", exact: true })
        .click();
      const icons = page.getByRole("dialog", {
        name: "Icono y color",
        exact: true,
      });
      await checkDialog(icons, "iconos 320");
      await screenshot("iconos-320");
      await icons
        .getByRole("button", { name: "Cerrar selector de iconos", exact: true })
        .click();
      await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
      await page
        .getByRole("button", { name: /^Opciones de/ })
        .first()
        .click();
      const menu = page.getByRole("menu");
      await checkDialog(menu, "menú de meta 320");
      await menu
        .getByRole("menuitem", { name: "Eliminar meta", exact: true })
        .click();
      const deletion = page.getByRole("dialog", {
        name: "Eliminar meta",
        exact: true,
      });
      await checkDialog(deletion, "confirmar eliminación 320");
      await deletion
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      await page.locator(".profile-trigger").click();
      const profile = page.locator(".profile-popover");
      await checkDialog(profile, "perfil 320");
      await page.keyboard.press("Escape");
    }
    if (screen === "diagrama") {
      await page.setViewportSize({ width: 844, height: 390 });
      await page
        .getByRole("button", {
          name: "Cambiar porcentaje de zoom",
          exact: true,
        })
        .click();
      const zoom = page.getByRole("dialog", {
        name: "Porcentaje de zoom",
        exact: true,
      });
      await checkDialog(zoom, "zoom horizontal 844x390");
      await expect
        .poll(() =>
          zoom.evaluate((el) => {
            const box = el.getBoundingClientRect();
            return box.top >= 0 && box.bottom <= innerHeight;
          }),
        )
        .toBe(true);
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 320, height: 740 });
      await page
        .getByRole("button", { name: "Rama principal", exact: true })
        .click();
      const panel = page.getByRole("dialog", {
        name: "Rama principal",
        exact: true,
      });
      for (const width of widths) {
        await page.setViewportSize({ width, height: 740 });
        await checkDialog(panel, `detalles ${width}`);
        await noOverflow(`detalles ${width}`);
        if (width === 320 || width === 768)
          await screenshot(`detalles-${width}`);
      }
      await page.setViewportSize({ width: 320, height: 740 });
      await panel
        .getByRole("button", { name: "Editar descripción", exact: true })
        .click();
      await expect(panel.locator("textarea:visible").first()).toHaveCSS(
        "font-size",
        "16px",
      );
      await checkDialog(panel, "editar descripción 320");
      await panel.getByRole("button", { name: /^Fecha objetivo:/ }).click();
      const calendar = page.getByRole("dialog", {
        name: "Elegir fecha objetivo",
        exact: true,
      });
      await checkDialog(calendar, "calendario 320");
      await screenshot("calendario-320");
      await page.keyboard.press("Escape");
    }
  }
  await page.goto(`${base}/login`);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 740 });
    await noOverflow(`login ${width}`);
  }
  assert.deepEqual(errors, []);
  console.log(
    "OK: responsive 320–1440px, dashboard, metas, tabla, diagrama, paneles, crear/iconos, login y carga; APIs simuladas.",
  );
} finally {
  await browser.close();
  await rm(route, { recursive: true, force: true });
}
