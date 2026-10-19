import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { chromium, expect } from "@playwright/test";

const translationsSource = await readFile(
  new URL("../src/lib/translations.ts", import.meta.url),
  "utf8",
);
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(translationsSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
async function checkTranslations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory,
    );
    if (entry.isDirectory()) await checkTranslations(url);
    else if (/\.tsx$/.test(entry.name)) {
      const source = ts.createSourceFile(
        url.pathname,
        await readFile(url, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === "t"
        ) {
          function literals(child) {
            if (ts.isStringLiteral(child))
              assert.ok(
                dictionary.english[child.text],
                `Missing English translation in ${url.pathname}: ${child.text}`,
              );
            if (ts.isConditionalExpression(child)) {
              literals(child.whenTrue);
              literals(child.whenFalse);
            }
          }
          node.arguments.forEach(literals);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
await checkTranslations(new URL("../src/components/", import.meta.url));

const route = await mkdtemp(
  fileURLToPath(new URL("../src/app/goal-ui-check-", import.meta.url)),
);
const browser = await chromium.launch();
const base = process.argv[2] ?? "http://localhost:3000";
let goal = {
  id: "responsive-goal",
  name: "Learn English",
  description: "Practice every day",
  icon: "book",
  color: "#22D3EE",
  progress: 0,
  tasks: 0,
  completedTasks: 0,
  activity: "Sin actividad",
  activities: [],
  activitiesInitialized: true,
  activitiesVersion: 1,
};
let preferences = {
  language: "en",
  goalView: "list",
  goalSort: "activity",
  goalStatus: "Todas",
  sidebarCollapsed: false,
};
const errors = [];
let failSave = false;
try {
  await writeFile(
    `${route}/layout.tsx`,
    `import { connection } from "next/server";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return children;
}`,
  );
  const fixture = await readFile(
    new URL("./fixtures/responsive-page.tsx", import.meta.url),
  );
  for (const screen of ["metas", "diagrama", "seeded"]) {
    await mkdir(`${route}/${screen}`);
    await writeFile(
      `${route}/${screen}/page.tsx`,
      screen === "seeded"
        ? fixture
            .toString()
            .replace(
              "session={session}",
              `session={session} initialPreferences={${JSON.stringify(preferences)}}`,
            )
        : fixture,
    );
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.route("**/api/**", async (request) => {
    const req = request.request();
    const url = new URL(req.url());
    let json;
    if (url.pathname === "/api/preferences") {
      if (req.method() === "GET")
        await new Promise((resolve) => setTimeout(resolve, 800));
      if (req.method() === "PATCH")
        preferences = { ...preferences, ...req.postDataJSON() };
      json = preferences;
    } else if (url.pathname === "/api/goals") json = [goal];
    else if (url.pathname.endsWith("/view"))
      json = { zoom: 1, scrollLeft: 0, scrollTop: 0, collapsed: [] };
    else if (url.pathname.endsWith("/activities")) json = { version: 2 };
    else if (
      url.pathname === "/api/goals/responsive-goal" &&
      req.method() === "PUT"
    ) {
      if (failSave) {
        await request.fulfill({
          status: 500,
          json: { error: "Simulated write failure" },
        });
        return;
      }
      goal = { ...goal, ...req.postDataJSON() };
      json = goal;
    } else if (url.pathname === "/api/auth/session")
      json = {
        user: { id: "responsive-check" },
        expires: "2099-01-01T00:00:00Z",
      };
    else throw new Error(`Unexpected API: ${req.method()} ${url.pathname}`);
    await request.fulfill({ json });
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.spanishHeadings = [];
    new MutationObserver(() => {
      for (const heading of document.querySelectorAll("main h1"))
        if (heading.textContent === "Metas")
          window.spanishHeadings.push(heading.textContent);
    }).observe(document, { childList: true, subtree: true });
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const prefix = route.split(/[\\/]/).at(-1);
  const seededResponse = await context.request.get(`${base}/${prefix}/seeded`);
  const seededHtml = await seededResponse.text();
  assert.ok(
    seededHtml.includes(">Goals<"),
    "Server-rendered preferences must use English immediately",
  );
  assert.ok(!seededHtml.includes(">Metas<"));
  await page.goto(`${base}/${prefix}/metas`);
  const row = page.locator(".goal-table-row");
  await expect(row).toBeVisible();
  await expect(row).toHaveCSS("cursor", "pointer");
  await expect(page).toHaveTitle("Goals · Ramify");
  assert.deepEqual(await page.evaluate(() => window.spanishHeadings), []);
  await expect(page.locator(".icon-picker-modal button")).toHaveCount(0);
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest("a");
        if (link?.closest(".goal-table-row")) {
          event.preventDefault();
          window.rowHref = link.getAttribute("href");
        }
      },
      true,
    );
  });
  const bounds = await row.boundingBox();
  await page.mouse.click(
    bounds.x + bounds.width * 0.65,
    bounds.y + bounds.height / 2,
  );
  assert.equal(
    await page.evaluate(() => window.rowHref),
    "/metas/responsive-goal",
  );
  await row
    .getByRole("button", { name: "Options for Learn English", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit goal", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit goal", exact: true });
  await expect(edit).toBeVisible();
  await expect(edit).toHaveCSS("cursor", "default");
  await expect(edit.locator("form")).toHaveCSS("cursor", "default");
  await expect(
    edit.getByRole("textbox", { name: "Goal name", exact: true }),
  ).toHaveCSS("cursor", "text");
  await expect(
    edit.getByRole("button", { name: "Save changes", exact: true }),
  ).toHaveCSS("cursor", "pointer");
  await edit
    .getByRole("button", { name: "Change icon and color", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Icon and color",
    exact: true,
  });
  await expect(picker).toBeVisible();
  await picker
    .getByRole("button", { name: "Close icon picker", exact: true })
    .click();
  await expect(picker).not.toBeVisible({ timeout: 1500 });
  await expect(page.locator(".icon-picker-modal button")).toHaveCount(0);
  await expect(edit).toBeVisible();
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await expect(edit).not.toBeVisible({ timeout: 1500 });
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await row
    .getByRole("button", { name: "Options for Learn English", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit goal", exact: true }).click();
  await edit
    .getByRole("textbox", { name: "Goal name", exact: true })
    .fill("Learn English daily");
  failSave = true;
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit.getByRole("alert")).toBeVisible();
  await expect(
    edit.getByRole("textbox", { name: "Goal name", exact: true }),
  ).toHaveValue("Learn English daily");
  failSave = false;
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(row.getByRole("link")).toHaveText("Learn English daily");
  await row
    .getByRole("button", {
      name: "Options for Learn English daily",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete goal", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Delete goal",
    exact: true,
  });
  await expect(deletion).toBeVisible();
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto(`${base}/${prefix}/diagrama`);
  await expect(
    page.getByRole("heading", { name: "Your goal starts here", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".goal-root-connection")).toHaveCount(0);
  await expect(page.locator(".goal-canvas-tools")).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Add first goal", exact: true }),
    ).toBeInViewport();
    if (process.env.UI_SCREENSHOTS) {
      await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
      await page.screenshot({
        path: `${process.env.UI_SCREENSHOTS}/empty-goal-${width}.png`,
        fullPage: true,
      });
    }
  }
  const input = page.getByRole("textbox", {
    name: "First goal name",
    exact: true,
  });
  await input.fill("   ");
  await page
    .getByRole("button", { name: "Add first goal", exact: true })
    .click();
  assert.equal(
    await input.evaluate((el) => el.validationMessage),
    "Enter the goal name.",
  );
  await input.fill("Practice vocabulary");
  await page
    .getByRole("button", { name: "Add first goal", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Practice vocabulary", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".goal-diagram-empty")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Practice vocabulary", exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Practice vocabulary",
    exact: true,
  });
  await expect(details).toBeVisible();
  await details
    .getByRole("button", { name: "Close goal details", exact: true })
    .click();
  await expect(details).not.toBeVisible({ timeout: 1500 });
  await page
    .getByRole("button", { name: "Practice vocabulary", exact: true })
    .click();
  await expect(details).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    "OK: seeded SSR English/no language flash, modal cursors and close/reopen, lazy icons, update retry, row menu, responsive empty diagram and branch creation; mocked APIs.",
  );
} finally {
  await browser.close();
  await rm(route, { recursive: true, force: true });
}
