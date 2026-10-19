import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const response = await fetch(`${base}/manifest.webmanifest`);
assert.equal(response.status, 200);
const manifest = await response.json();
assert.equal(manifest.name, "Ramify");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/dashboard");
assert.equal(manifest.scope, "/");
assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
for (const icon of manifest.icons) {
  const response = await fetch(`${base}${icon.src}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /image\/png/);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/login`);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  await expect(
    page.locator('meta[name="mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors: errors } = await cdp.send(
    "Page.getInstallabilityErrors",
  );
  assert.deepEqual(errors, [], "Chromium installability checks must pass");
  console.log(
    "OK: manifest, PNG 192/512, maskable, Apple icon y criterios de instalación de Chromium.",
  );
} finally {
  await browser.close();
}
