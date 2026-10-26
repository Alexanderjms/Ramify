/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "../src", file);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.paths = module.paths;
  loaded.require = (id) => (id in mocks ? mocks[id] : require(id));
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const feedback = load("lib/feedback.ts");
const notifications = [];
const cleanups = [];
const dismissed = [];
const navigations = [];
let retries = 0;
const { ErrorToast } = load("components/app-feedback.tsx", {
  "next/navigation": {
    useRouter: () => ({ push: (url) => navigations.push(url) }),
  },
  react: {
    useRef: (current) => ({ current }),
    useEffect: (effect) => cleanups.push(effect()),
  },
  "goey-toast": {
    gooeyToast: {
      error: (title, options) => notifications.push({ title, ...options }),
      dismiss: (id) => dismissed.push(id),
    },
  },
  "./language-provider": {
    useLanguage: () => ({ t: (text) => text, language: "es" }),
  },
  "@/lib/feedback": feedback,
});
for (const id of ["preferences", "goal", "view"]) {
  ErrorToast({
    id,
    message: feedback.errorMessage({ status: 401 }, "fallback"),
    onRetry: () => retries++,
  });
}
assert.deepEqual(
  [...new Set(notifications.map(({ id }) => id))],
  ["session-expired"],
);
assert.equal(notifications[0].action.label, "Iniciar sesión");
notifications[0].action.onClick();
assert.deepEqual(navigations, ["/login"]);
assert.equal(retries, 0, "Expired sessions must not retry unauthorized writes");
cleanups.forEach((cleanup) => cleanup?.());
assert.deepEqual(
  dismissed,
  [],
  "One failed request must not dismiss the shared session warning",
);
ErrorToast({
  id: "server",
  message: feedback.errorMessage({ status: 500 }, "fallback"),
  onRetry: () => retries++,
});
assert.equal(notifications.at(-1).id, "server");
notifications.at(-1).action.onClick();
assert.equal(retries, 1, "Other failures must keep their retry action");
cleanups.at(-1)();
assert.deepEqual(dismissed, ["server"]);

const SessionProvider = () => null;
const AuthSessionProvider = load("components/auth-session-provider.tsx", {
  "next-auth/react": { SessionProvider },
  "@/components/goals/goals-provider": () => null,
  "@/components/query-provider": () => null,
  "@/components/user-preferences-provider": () => null,
}).default;
const provider = AuthSessionProvider({
  session: { user: { id: "test" } },
  children: null,
});
assert.equal(provider.type, SessionProvider);
assert.equal(provider.props.refetchInterval, 300);
assert.equal(provider.props.refetchWhenOffline, false);
const { retryRequest } = load("components/query-provider.tsx");
for (const status of [0, 500, 502, 503, 504]) {
  assert.equal(retryRequest(0, { status }), true);
  assert.equal(retryRequest(1, { status }), true);
  assert.equal(retryRequest(2, { status }), false);
}
for (const status of [400, 401, 403, 404, 409, 413, 429]) {
  assert.equal(
    retryRequest(0, { status }),
    false,
    `Do not replay HTTP ${status}`,
  );
}
assert.equal(retryRequest(0, new TypeError("Failed to fetch")), true);
assert.equal(retryRequest(0, new feedback.InputError("Invalid input")), false);
assert.equal(retryRequest(0, new SyntaxError("Invalid response")), false);
assert.equal(
  retryRequest(0, new DOMException("Cancelled", "AbortError")),
  false,
);
const { reportDatabaseError } = load("lib/db.ts");
const logs = [];
const originalError = console.error;
try {
  console.error = (...args) => logs.push(args);
  reportDatabaseError(
    "load-goals",
    Object.assign(new Error("private SQL and token"), {
      code: "SQLITE_BUSY",
      rawCode: 5,
    }),
  );
} finally {
  console.error = originalError;
}
assert.deepEqual(logs, [
  ["[ramify:database]", "load-goals", { code: "SQLITE_BUSY", rawCode: 5 }],
]);
console.log(
  "OK: session renewal; sign-in recovery; bounded transient retries; no 4xx replay; private database diagnostics.",
);
