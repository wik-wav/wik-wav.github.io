import { readdir, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const roots = ["assets/media", "public"];
const supported = /\.(?:avif|gif|jpe?g|png|webp)$/i;

async function walk(relative) {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (supported.test(entry.name)) files.push(child);
  }
  return files;
}

function identify(file) {
  const candidates = [
    ["magick", ["identify", "-format", "%w %h", file]],
    ["identify", ["-format", "%w %h", file]]
  ];
  for (const [command, args] of candidates) {
    try {
      return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("ImageMagick is required: install either the `magick` or `identify` command.");
}

const files = (await Promise.all(roots.map(walk))).flat().sort();
const dimensions = Object.fromEntries(files.map(relative => {
  const output = identify(path.join(root, relative));
  const [width, height] = output.split(/\s+/).map(Number);
  if (!(width > 0 && height > 0)) throw new Error(`Missing dimensions for ${relative}`);
  return [relative.startsWith("public/") ? relative.slice(7) : relative, { width, height }];
}));

await mkdir(path.join(root, "assets/js"), { recursive: true });
await writeFile(path.join(root, "assets/js/media-dimensions.js"), `window.MEDIA_DIMENSIONS = Object.freeze(${JSON.stringify(dimensions, null, 2)});\n`);
console.log(`Wrote ${Object.keys(dimensions).length} image dimensions.`);
