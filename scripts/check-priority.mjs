import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${process.argv[2] ?? "http://localhost:3000"}/metas/aprender-ingles`);
  const open = () => page.getByRole("region", { name: "Diagrama de la meta", exact: true }).getByRole("button", { name: "Duolingo", exact: true }).click();
  await open();
  const panel = page.getByRole("dialog", { name: "Duolingo", exact: true });
  const group = panel.getByRole("radiogroup", { name: "Prioridad", exact: true });
  const low = group.getByRole("radio", { name: "Baja", exact: true });
  const high = group.getByRole("radio", { name: "Alta", exact: true });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("ramify:goals"))[0].activities.find(item => item.id === "duolingo").priority);
  await high.click();
  await expect(high).toBeChecked();
  assert.equal(await saved(), "high");
  await high.press("Home");
  await expect(low).toBeFocused();
  await expect(low).toBeChecked();
  assert.equal(await saved(), "low");
  await low.press("End");
  await expect(high).toBeFocused();
  await expect(high).toBeChecked();
  await page.reload();
  await open();
  await expect(high).toBeChecked();
  for (const width of [1440, 390, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(high).toBeVisible();
    assert.ok(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), `Panel overflow at ${width}px`);
    assert.ok(await group.evaluate(el => {
      const panel = el.closest('dialog, [role="dialog"]').getBoundingClientRect();
      return [...el.querySelectorAll("button")].every(button => {
        const box = button.getBoundingClientRect();
        return box.left >= panel.left && box.right <= panel.right;
      });
    }), `Priority overflow at ${width}px`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await low.click();
  await expect(low).toBeChecked();
  assert.equal(await saved(), "low");
  assert.deepEqual(errors, []);
  console.log("OK: JellyRadio, guardado, teclado, persistencia, móvil y movimiento reducido.");
} finally {
  await browser.close();
}
