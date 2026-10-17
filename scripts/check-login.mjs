import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:3000";
const home = await fetch(base, { redirect: "manual" });
assert.equal(home.status, 307);
assert.equal(home.headers.get("location"), "/login");

const login = await fetch(`${base}/login`);
assert.equal(login.status, 200);
const html = await login.text();
assert.match(html, /Continuar con GitHub/);
assert.match(html, /\/Logo\.svg/);
assert.match(html, /<canvas/);
assert.equal((await fetch(`${base}/Logo.svg`)).status, 200);
console.log("OK: redirección, login, botón GitHub, fondo y logo.");
