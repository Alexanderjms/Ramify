import assert from "node:assert/strict";

const response = await fetch(`${process.argv[2] ?? "http://localhost:3000"}/dashboard`);
assert.equal(response.status, 200);
const html = await response.text();
for (const text of ["Mis objetivos", "Aprender inglés", "Aprender programación", "Conseguir empleo", 'aria-valuenow="35"', 'aria-valuenow="52"', 'aria-valuenow="20"']) {
  assert.ok(html.includes(text), `Falta ${text}`);
}
assert.ok(!html.includes("Próximas actividades"));
assert.ok(!html.includes("Continúa donde estabas"));
console.log("OK: dashboard, metas, progreso y secciones omitidas.");
