import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const route = await mkdtemp(fileURLToPath(new URL("../src/app/toast-ui-check-", import.meta.url)));
const browser = await chromium.launch();
try {
  await writeFile(`${route}/page.tsx`, `"use client";
import { gooeyToast } from "goey-toast";
export default function Page() {
  return <main>
    <button onClick={() => {
      gooeyToast.dismiss();
      gooeyToast("Saving changes…", { id: "test", duration: Infinity });
      setTimeout(() => gooeyToast.update("test", { type: "success", title: "Goal updated", description: "Changes were saved to your account." }), 150);
    }}>Update</button>
    <button onClick={() => {
      gooeyToast.dismiss();
      gooeyToast.error("No se pudo completar la acción", { id: "test", description: "Tu sesión ha caducado. Vuelve a iniciar sesión; tus cambios locales se conservan.", action: { label: "Reintentar", onClick: () => {} }, duration: 12000 });
    }}>Error</button>
    <button onClick={() => { gooeyToast.dismiss(); gooeyToast.success("Changes saved", { id: "test" }); }}>Success</button>
  </main>;
}`);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `${process.argv[2] ?? "http://localhost:3000"}/${route.split(/[\\/]/).at(-1)}`;
  await expect.poll(async () => (await page.request.get(url)).status(), { timeout: 15000 }).toBe(200);
  await page.goto(url);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const kind of ["Update", "Error", "Success"]) {
      await page.getByRole("button", { name: kind, exact: true }).click();
      const samples = await page.evaluate(async () => {
        const samples = [];
        const start = performance.now();
        while (performance.now() - start < 1400) {
          await new Promise(requestAnimationFrame);
          const content = document.querySelector('[data-sonner-toast] .gooey-content');
          if (!content) continue;
          const bounds = content.getBoundingClientRect();
          const style = getComputedStyle(content);
          const description = content.querySelector('.gooey-description');
          const body = description?.getBoundingClientRect();
          const title = content.querySelector('.gooey-title');
          samples.push({
            clip: style.clipPath,
            overflow: style.overflow,
            expanded: content.classList.contains('gooey-contentExpanded'),
            width: content.offsetWidth,
            inViewport: bounds.left >= -1 && bounds.right <= innerWidth + 1,
            bodyInside: !body || (body.left >= bounds.left - 1 && body.right <= bounds.right + 1),
            titleFits: !title || title.scrollWidth <= title.clientWidth + 1,
            timestamps: Array.from(content.querySelectorAll('.gooey-timestamp')).some((el) => getComputedStyle(el).display !== 'none'),
          });
        }
        return samples;
      });
      assert.ok(samples.length > 5);
      assert.ok(samples.every((sample) => sample.clip === "none" && sample.overflow === "visible"), `${kind}/${width}: text must not be clipped during morphing`);
      assert.ok(samples.every((sample) => sample.inViewport && sample.bodyInside && sample.titleFits), `${kind}/${width}: text must fit from the first frame`);
      assert.ok(samples.every((sample) => !sample.timestamps));
      const widths = samples.filter((sample) => sample.expanded).map((sample) => sample.width);
      if (widths.length) assert.ok(Math.max(...widths) - Math.min(...widths) < 1, `${kind}/${width}: expanded text must not reflow`);
      if (process.env.UI_SCREENSHOTS) await page.screenshot({ path: `${process.env.UI_SCREENSHOTS}/toast-${kind.toLowerCase()}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log("OK: update, error/action and success toasts keep stable, unclipped text at 320/1440px throughout animation.");
} finally {
  await browser.close();
  await rm(route, { recursive: true, force: true });
}
