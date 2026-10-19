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
let saveStatus = 500;
let failSync = 0;
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
    else if (url.pathname.endsWith("/activities")) {
      if (failSync) {
        await request.fulfill({
          status: failSync,
          json: { error: "Simulated sync failure" },
        });
        return;
      }
      const body = req.postDataJSON();
      goal = {
        ...goal,
        activities: body.activities,
        activitiesVersion: body.version + 1,
      };
      json = { version: body.version + 1 };
    } else if (
      url.pathname === "/api/goals/responsive-goal" &&
      req.method() === "PUT"
    ) {
      if (failSave) {
        await request.fulfill({
          status: saveStatus,
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
  let seededHtml;
  await expect
    .poll(
      async () => {
        const response = await context.request.get(`${base}/${prefix}/seeded`);
        seededHtml = await response.text();
        return response.status();
      },
      { timeout: 15000 },
    )
    .toBe(200);
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
  const allIcons = Object.keys(
    JSON.parse(
      await readFile(
        new URL(
          "../node_modules/bootstrap-icons/font/bootstrap-icons.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  ).sort();
  const iconGrid = picker.getByRole("group", {
    name: "Bootstrap icons",
    exact: true,
  });
  const renderedIcons = iconGrid.locator("button[data-icon-index]");
  await expect(picker.getByRole("status")).toContainText(
    String(allIcons.length),
  );
  assert.ok(
    (await renderedIcons.count()) < 130,
    "Only visible icon rows should be mounted",
  );
  await iconGrid.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const lastIcon = iconGrid.getByRole("button", {
    name: allIcons.at(-1),
    exact: true,
  });
  await expect(lastIcon).toBeVisible();
  assert.ok((await renderedIcons.count()) < 130);
  await lastIcon.focus();
  await page.keyboard.press("Home");
  const firstIcon = iconGrid.getByRole("button", {
    name: allIcons[0],
    exact: true,
  });
  await expect(firstIcon).toBeFocused();
  await page.keyboard.press("End");
  await expect(lastIcon).toBeFocused();
  const iconSearch = picker.getByRole("searchbox", {
    name: "Search icons",
    exact: true,
  });
  await iconSearch.fill("star");
  await expect(
    iconGrid.getByRole("button", { name: "star", exact: true }),
  ).toBeVisible();
  await expect(renderedIcons).toHaveCount(
    allIcons.filter((name) => name.includes("star")).length,
  );
  await iconSearch.fill("");
  await expect(firstIcon).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(iconGrid).toHaveCSS("--icon-columns", "6");
  await iconGrid.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(lastIcon).toBeVisible();
  assert.ok((await renderedIcons.count()) < 90);
  await page.setViewportSize({ width: 1440, height: 900 });
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
  const nameInput = edit.getByRole("textbox", {
    name: "Goal name",
    exact: true,
  });
  await nameInput.fill("   ");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit.getByRole("alert")).toHaveText(
    "Enter a name that is not just spaces.",
  );
  await expect(nameInput).toHaveAttribute("aria-invalid", "true");
  await expect(nameInput).toBeFocused();
  await expect(edit.getByRole("alert")).toHaveCSS("border-radius", "6px");
  await edit
    .getByRole("textbox", { name: "Goal name", exact: true })
    .fill("Learn English daily");
  failSave = true;
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit.getByRole("alert")).toBeVisible();
  await expect(edit.getByRole("alert")).toContainText(
    "The server could not complete the action.",
  );
  await expect(
    edit.getByRole("textbox", { name: "Goal name", exact: true }),
  ).toHaveValue("Learn English daily");
  saveStatus = 401;
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit.getByRole("alert")).toContainText("Your session expired.");
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Your session expired." }),
  ).toHaveCount(0);
  failSave = false;
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(row.getByRole("link")).toHaveText("Learn English daily");
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Goal updated", { exact: true }),
  ).toBeVisible();
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
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Enter a name that is not just spaces.", { exact: true }),
  ).toBeVisible();
  await input.fill("Practice vocabulary");
  await page
    .getByRole("button", { name: "Add first goal", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Practice vocabulary", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".goal-diagram-empty")).toHaveCount(0);
  const syncToast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Changes saved" });
  await expect(syncToast).toBeVisible();
  await expect(syncToast).toHaveCount(0, { timeout: 7000 });
  await page
    .getByRole("button", { name: "Practice vocabulary", exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Practice vocabulary",
    exact: true,
  });
  await expect(details).toBeVisible();
  await details
    .getByRole("button", { name: "Add subtask", exact: true })
    .click();
  const subtaskForm = details.getByRole("form", {
    name: "Add subtask",
    exact: true,
  });
  await subtaskForm
    .getByRole("button", { name: "Save subtask", exact: true })
    .click();
  await expect(subtaskForm.getByRole("alert")).toHaveText(
    "Complete this field.",
  );
  await subtaskForm.getByRole("textbox").fill("   ");
  await subtaskForm
    .getByRole("button", { name: "Save subtask", exact: true })
    .click();
  await expect(subtaskForm.getByRole("alert")).toHaveText(
    "Enter a name that is not just spaces.",
  );
  failSync = 409;
  await subtaskForm.getByRole("textbox").fill("Review words");
  await subtaskForm
    .getByRole("button", { name: "Save subtask", exact: true })
    .click();
  await expect(details.getByRole("alert")).toContainText(
    "Another session changed the diagram.",
  );
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Another session changed the diagram." }),
  ).toHaveCount(0);
  await details.getByRole("button", { name: "Retry", exact: true }).click();
  const conflict = page.getByRole("dialog", {
    name: "Sync conflict",
    exact: true,
  });
  await expect(conflict).toBeVisible();
  await conflict.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(details.getByRole("alert")).toContainText(
    "Another session changed the diagram.",
  );
  failSync = 0;
  await details.getByRole("button", { name: "Retry", exact: true }).click();
  await conflict
    .getByRole("button", { name: "Replace version", exact: true })
    .click();
  await expect(details.getByRole("alert")).toHaveCount(0);
  await details
    .getByRole("button", { name: "+ Add resource", exact: true })
    .click();
  const resourceForm = details.getByRole("form", {
    name: "Add resource",
    exact: true,
  });
  await resourceForm.getByRole("textbox").fill("ftp://example.com/file");
  await resourceForm
    .getByRole("button", { name: "Save resource", exact: true })
    .click();
  await expect(resourceForm.getByRole("alert")).toHaveText(
    "Use a valid http:// or https:// URL.",
  );
  await resourceForm
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await details.locator('input[type="file"]').setInputFiles({
    name: "too-large.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(details.getByRole("alert")).toContainText("20 MB");
  if (process.env.UI_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.UI_SCREENSHOTS}/validation-panel.png`,
      fullPage: true,
    });
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
