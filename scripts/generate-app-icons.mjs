import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next/package.json")] }),
);
const output = new URL("../public/icons/", import.meta.url);
const logo = await sharp(
  await readFile(new URL("../public/Logo.svg", import.meta.url)),
)
  .trim()
  .png()
  .toBuffer();
await mkdir(output, { recursive: true });
for (const [name, size, rounded, transparent] of [
  ["ramify-logo.png", 512, false, true],
  ["favicon.png", 48, false, true],
  ["ramify-192.png", 192, true, false],
  ["ramify-512.png", 512, true, false],
  ["ramify-maskable-512.png", 512, false, false],
  ["apple-touch-icon.png", 180, false, false],
]) {
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${transparent ? "none" : "#18181b"}"/></svg>`,
  );
  const mark = await sharp(logo)
    .resize(
      Math.round(size * (name === "favicon.png" ? 1 : transparent ? 0.9 : 0.6)),
      Math.round(size * (name === "favicon.png" ? 1 : transparent ? 0.9 : 0.6)),
      { fit: "inside" },
    )
    .png()
    .toBuffer();
  await sharp(background)
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(fileURLToPath(new URL(name, output)));
}
