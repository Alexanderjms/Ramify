import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

// A temporary route exercises real components without requiring a user account.
const route = await mkdtemp(
  fileURLToPath(new URL("../src/app/tooltip-check-", import.meta.url)),
);
const browser = await chromium.launch();
try {
  await writeFile(
    `${route}/page.tsx`,
    await readFile(new URL("./fixtures/tooltip-page.tsx", import.meta.url)),
  );
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `${process.argv[2] ?? "http://localhost:3000"}/${route.split(/[\\/]/).at(-1)}`,
  );
  const tip = page.getByRole("tooltip");
  const first = page.getByRole("button", { name: "Primero", exact: true });
  await first.hover();
  await page.waitForTimeout(150);
  await expect(tip).toHaveCount(0);
  await expect(tip).toHaveText("Primero");
  assert.equal(
    await first.getAttribute("aria-describedby"),
    await tip.getAttribute("id"),
  );
  await expect(tip).toHaveJSProperty("popover", "manual");
  await tip.hover();
  await page.waitForTimeout(200);
  await expect(tip).toHaveText("Primero");
  await page.getByRole("button", { name: "Segundo", exact: true }).hover();
  await expect(tip).toContainText("Segundo", { timeout: 250 });
  await page.mouse.move(1000, 700);
  await expect(tip).toHaveCount(0);
  await page.keyboard.press("Tab");
  await first.focus();
  await expect(tip).toHaveText("Primero");
  await first.press("Escape");
  await expect(tip).toHaveCount(0);
  await first.click();
  await expect(page.locator("output")).toHaveText("1");
  await page
    .getByRole("button", { name: "Deshabilitado", exact: true })
    .hover();
  await expect(tip).toContainText("Próximamente");
  for (const label of [
    "Ajustar a pantalla",
    "Configuración de la vista",
    "Ajustar a pantalla",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).hover();
    await expect(tip).toHaveText(label);
    await expect
      .poll(() =>
        tip.evaluate((el) => {
          const text = el.querySelector("span.inline-flex");
          const box = el.getBoundingClientRect();
          const ink = text.getBoundingClientRect();
          return (
            ink.height <= parseFloat(getComputedStyle(text).lineHeight) + 1 &&
            ink.left - box.left >= 6 &&
            box.right - ink.right >= 6
          );
        }),
      )
      .toBe(true);
  }
  await page.getByRole("button", { name: /^Arrastra para ordenar/ }).hover();
  await expect(tip).toContainText("Arrastra para ordenar");
  await page.setViewportSize({ width: 360, height: 740 });
  await expect
    .poll(() =>
      tip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const text = el
          .querySelector("span.inline-flex")
          .getBoundingClientRect();
        return (
          box.left >= 0 &&
          box.right <= innerWidth &&
          text.left - box.left >= 6 &&
          box.right - text.right >= 6
        );
      }),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("button", { name: "Abrir detalles", exact: true })
    .click();
  const panel = page.getByRole("dialog");
  const close = panel.getByRole("button", {
    name: "Cerrar prueba",
    exact: true,
  });
  await close.hover();
  await expect(tip).toContainText("Cerrar prueba");
  assert.ok(
    await tip.evaluate(
      (el) => el.matches(":popover-open") && el.closest("dialog")?.open,
    ),
  );
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  const priority = panel.getByRole("radiogroup", {
    name: "Prioridad",
    exact: true,
  });
  for (const [name, color] of [
    ["Baja", "blue"],
    ["Media", "orange"],
    ["Alta", "green"],
  ]) {
    const radio = priority.getByRole("radio", { name, exact: true });
    await expect(radio.locator(`.bg-${color}-500.rounded-full`)).toBeVisible();
    await radio.click();
    await expect(radio).toBeChecked();
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await close.hover();
  await expect(tip).toContainText("Cerrar prueba");
  assert.ok(
    await tip.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return (
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= innerWidth &&
        box.bottom <= innerHeight
      );
    }),
  );
  await expect(page.locator("main [title]")).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    "OK: delay frío, grupo cálido, teclado, Escape, refs, clics, deshabilitados, diálogo, prioridades y móvil.",
  );
} finally {
  await browser.close();
  await rm(route, { recursive: true, force: true });
}
