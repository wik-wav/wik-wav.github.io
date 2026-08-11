import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PROJECT_ROOT, slugify } from "./content-store.mjs";

const run = promisify(execFile);
const FORMAT_ALLOWLIST = new Set(["JPEG", "JPG", "PNG", "WEBP", "TIFF"]);
const MAX_PIXELS = 120_000_000;

async function commandWorks(command) {
  try {
    await run(command, ["-version"], { windowsHide: true, timeout: 10_000 });
    return true;
  } catch { return false; }
}

export async function resolveImageMagick() {
  const candidates = [
    process.env.PORTFOLIO_MAGICK,
    "magick",
    "C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe"
  ].filter(Boolean);
  for (const candidate of candidates) if (await commandWorks(candidate)) return candidate;
  throw new Error("ImageMagick was not found. Install ImageMagick 7 or set PORTFOLIO_MAGICK.");
}

async function identify(command, file) {
  const { stdout } = await run(command, ["identify", "-quiet", "-format", "%m|%w|%h|%[opaque]", file], { windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 });
  const [format, width, height, opaque] = stdout.trim().split("|");
  const result = { format: format.toUpperCase(), width: Number(width), height: Number(height), opaque: /^true$/i.test(opaque) };
  if (!FORMAT_ALLOWLIST.has(result.format)) throw new Error(`Unsupported input format: ${result.format || "unknown"}.`);
  if (!Number.isInteger(result.width) || !Number.isInteger(result.height) || result.width < 1 || result.height < 1 || result.width * result.height > MAX_PIXELS) throw new Error("Image dimensions exceed the safe import limit.");
  return result;
}

async function analyseAlpha(command, file) {
  const options = { windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 };
  const [{ stdout: minimumOutput }, { stdout: fractionOutput }] = await Promise.all([
    run(command, [file, "-alpha", "extract", "-format", "%[fx:minima]", "info:"], options),
    run(command, [file, "-alpha", "extract", "-threshold", "98%", "-format", "%[fx:1-mean]", "info:"], options)
  ]);
  const minimum = Number(minimumOutput.trim());
  const fraction = Number(fractionOutput.trim());
  const alphaMin = Number.isFinite(minimum) ? minimum : 1;
  const alphaFraction = Number.isFinite(fraction) ? fraction : 0;
  return { alphaMin, alphaFraction, meaningfulTransparency: alphaMin <= 0.05 && alphaFraction >= 0.001 };
}

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function assertExternalMasterRoot(root, repositoryRoot) {
  await mkdir(root, { recursive: true });
  const [masterReal, repoReal] = await Promise.all([realpath(root), realpath(repositoryRoot)]);
  const boundary = `${repoReal}${path.sep}`.toLowerCase();
  if (masterReal.toLowerCase() === repoReal.toLowerCase() || masterReal.toLowerCase().startsWith(boundary)) throw new Error("The master-image folder must stay outside the Git repository.");
  return masterReal;
}

export function defaultMastersRoot(root = PROJECT_ROOT) {
  return path.join(os.homedir(), "Pictures", "Portfolio Studio Masters", path.basename(root));
}

export async function importImage({ stagedFile, originalName, owner, altPL = "", altEN = "", mastersRoot = defaultMastersRoot(), root = PROJECT_ROOT }) {
  const ownerSlug = slugify(owner);
  if (!ownerSlug) throw new Error("Choose a project or collection before importing an image.");
  const magick = await resolveImageMagick();
  const input = await identify(magick, stagedFile);
  const alpha = await analyseAlpha(magick, stagedFile);
  const digest = await sha256(stagedFile);
  const masterBase = await assertExternalMasterRoot(mastersRoot, root);
  const extension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "") || `.${input.format.toLowerCase()}`;
  const masterDir = path.join(masterBase, "sha256", digest.slice(0, 2));
  const masterFile = path.join(masterDir, `${digest}${extension}`);
  await mkdir(masterDir, { recursive: true });
  try { await stat(masterFile); } catch { await copyFile(stagedFile, masterFile); }

  const stem = slugify(path.basename(originalName, path.extname(originalName))) || "image";
  const relative = `assets/media/${ownerSlug}/${stem}-${digest.slice(0, 8)}.webp`;
  const destination = path.resolve(root, relative);
  const mediaBoundary = `${path.resolve(root, "assets", "media")}${path.sep}`;
  if (!destination.startsWith(mediaBoundary)) throw new Error("Generated media path escaped assets/media.");
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp.webp`;
  const resultFor = async output => ({
    media: {
      kind: "image",
      src: relative.replaceAll("\\", "/"),
      ratio: `${output.width}/${output.height}`,
      fit: "contain",
      altPL,
      altEN,
      hasTransparency: alpha.meaningfulTransparency,
      transparencyMode: "auto",
      viewerBackground: alpha.meaningfulTransparency ? "light" : undefined,
      focalPoint: { x: 0.5, y: 0.5 }
    },
    asset: { sha256: digest, width: output.width, height: output.height, bytes: (await stat(destination)).size, masterKey: `sha256/${digest.slice(0, 2)}/${path.basename(masterFile)}`, originalName, ...alpha }
  });
  try {
    try {
      const existing = await identify(magick, destination);
      return await resultFor(existing);
    } catch (error) {
      if (error.code !== "ENOENT" && !/no such file|unable to open image/i.test(`${error.stderr || ""} ${error.message || ""}`)) throw error;
    }
    await run(magick, [stagedFile, "-auto-orient", "-colorspace", "sRGB", "-resize", "2400x2400>", "-strip", "-define", "webp:method=6", "-define", "webp:alpha-quality=100", "-quality", "82", temporary], { windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    const output = await identify(magick, temporary);
    await rename(temporary, destination);
    return await resultFor(output);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}
