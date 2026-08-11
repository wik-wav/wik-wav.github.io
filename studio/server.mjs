import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, lstat, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createServer as createViteServer } from "vite";
import {
  CONTENT_ROOT, PROJECT_ROOT, archiveRecordPath, atomicWriteJson, loadContent, readArchivedRecords,
  recordPath, referencesFor, saveRecord, slugify, uniqueId, validateContent
} from "../scripts/lib/content-store.mjs";
import { generateSite, removeOwnedRoute } from "../scripts/lib/generate.mjs";
import { defaultMastersRoot, importImage, resolveImageMagick } from "../scripts/lib/media.mjs";

const HOST = "127.0.0.1";
const STUDIO_PORT = Number(process.env.PORTFOLIO_STUDIO_PORT || 4310);
const PREVIEW_PORT = Number(process.env.PORTFOLIO_PREVIEW_PORT || 4177);
const STUDIO_ORIGIN = `http://${HOST}:${STUDIO_PORT}`;
let PREVIEW_ORIGIN = `http://${HOST}:${PREVIEW_PORT}`;
const TOKEN = randomBytes(32).toString("base64url");
const UI_ROOT = path.join(import.meta.dirname, "ui");
const MAX_JSON = 2 * 1024 * 1024;
const MAX_UPLOAD = 120 * 1024 * 1024;
const LOCAL_SETTINGS = path.join(PROJECT_ROOT, ".portfolio-studio.json");
let mutationQueue = Promise.resolve();

const json = (response, status, value) => {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(body);
};

const revision = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const badKeys = new Set(["__proto__", "constructor", "prototype"]);
function assertSafeObject(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (badKeys.has(key)) throw new Error("Unsafe object key rejected.");
    assertSafeObject(child);
  }
}

async function readJsonBody(request) {
  if (!String(request.headers["content-type"] || "").startsWith("application/json")) throw Object.assign(new Error("Expected application/json."), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON) throw Object.assign(new Error("JSON request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  assertSafeObject(value);
  return value;
}

async function settings() {
  try { return JSON.parse(await readFile(LOCAL_SETTINGS, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; return { mastersRoot: defaultMastersRoot(PROJECT_ROOT) }; }
}

function summaryMedia(media) {
  const image = media?.kind === "group" ? media.items?.find(item => item?.kind === "image" && item.src) : media;
  if (image?.kind !== "image" || !image.src) return null;
  return {
    src: image.src,
    fit: image.fit || "contain",
    focalPoint: image.focalPoint || { x: 0.5, y: 0.5 },
    viewerBackground: image.viewerBackground || "light"
  };
}

function listSummaries(bundle) {
  const summary = record => ({ id: record.id, recordType: record.recordType, order: record.order, titlePL: record.titlePL, titleEN: record.titleEN, draft: record.draft, published: record.published, revision: revision(record) });
  return {
    projects: bundle.projects.map(summary),
    collections: bundle.collections.map(summary),
    works: bundle.works.map(record => ({
      ...summary(record),
      project: record.project || "",
      mediaType: record.mediaType || "image",
      galleryVisible: record.galleryVisible !== false,
      detailOnly: record.detailOnly === true,
      coverPreview: summaryMedia(record.cover)
    }))
  };
}

function archivedWorkSummaries(records) {
  return records
    .map(record => ({
      id: record.id,
      recordType: "work",
      titlePL: record.titlePL,
      titleEN: record.titleEN,
      archivedAt: record.archivedAt || null,
      published: record.published === true,
      draft: record.draft === true,
      revision: revision(record)
    }))
    .sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")) || a.id.localeCompare(b.id));
}

function workTypeTaxonomy(bundle, archivedWorks = []) {
  return [...new Set([...bundle.works, ...archivedWorks].flatMap(record => Array.isArray(record.types) ? record.types : []))]
    .sort((a, b) => a.localeCompare(b, "en"));
}

function recordFromBundle(bundle, type, id) {
  if (type === "site") return bundle.site;
  const plural = type === "project" ? "projects" : type === "collection" ? "collections" : type === "work" ? "works" : null;
  return plural ? bundle[plural].find(record => record.id === id) : null;
}

function defaultImage() {
  return { kind: "image", src: "", ratio: "4/3", fit: "contain", altPL: "", altEN: "", transparencyMode: "auto", focalPoint: { x: 0.5, y: 0.5 } };
}

function createDraft(type, id, title) {
  const base = { schemaVersion: 1, recordType: type, id, order: Date.now(), published: false, draft: true, titlePL: title, titleEN: title };
  if (type === "work") return { ...base, project: "", collections: [], year: "", medium: "digital", types: [], mediaType: "image", galleryVisible: false, projectPageVisible: true, detailOnly: false, summaryPL: "", summaryEN: "", altPL: "", altEN: "", captionPL: "", captionEN: "", cover: defaultImage(), gallery: [], video: { provider: null, id: null, url: null, bandcampType: null, embedSize: null, poster: defaultImage() }, featured: false };
  return { ...base, summaryPL: "", summaryEN: "", overviewPL: "", overviewEN: "", yearPL: "", yearEN: "", disciplinesPL: "", disciplinesEN: "", formatPL: "", formatEN: "", rolePL: "", roleEN: "", processHeadingPL: "", processHeadingEN: "", processPL: "", processEN: "", creditsPL: "", creditsEN: "", detailMediaSize: "standard", heroLineHeightPL: 1.12, heroLineHeightEN: 1.12, cover: defaultImage(), hero: defaultImage(), thumbnail: defaultImage(), related: [], detailSequenceIds: [], externalLinks: [], seo: { titlePL: `${title} — Wiktor Sielaszuk`, titleEN: `${title} — Wiktor Sielaszuk`, descriptionPL: "", descriptionEN: "", image: "public/og-social.png", imageAltPL: "", imageAltEN: "" }, pageCode: "P.NEW", pageLabelPL: type === "collection" ? "KOLEKCJA" : "PROJEKT KURATORSKI", pageLabelEN: type === "collection" ? "COLLECTION" : "CURATED PROJECT" };
}

async function generateAndNotify(bundle) {
  const result = await generateSite(bundle, { preview: true });
  if (vite) vite.ws.send({ type: "full-reload" });
  return result;
}

function enqueue(task) {
  const next = mutationQueue.then(task, task);
  mutationQueue = next.catch(() => {});
  return next;
}

async function persistEntity(type, id, value, expectedRevision) {
  const bundle = await loadContent();
  const current = recordFromBundle(bundle, type, id);
  if (!current) throw Object.assign(new Error("Content record not found."), { status: 404 });
  if (expectedRevision && expectedRevision !== revision(current)) throw Object.assign(new Error("This record changed in another Studio window. Reload before saving."), { status: 412 });
  const previousRegistry = structuredClone(bundle.registry);
  if (type === "site") await atomicWriteJson(path.join(CONTENT_ROOT, "site.json"), value);
  else {
    value.id = id;
    value.recordType = type;
    await saveRecord(type, id, value);
    if (value.published === true && !(bundle.registry.published || []).some(entry => entry.id === id && entry.recordType === type)) {
      bundle.registry.published = [...(bundle.registry.published || []), { id, recordType: type }];
      await atomicWriteJson(path.join(CONTENT_ROOT, "registry.json"), bundle.registry);
    }
  }
  const refreshed = await loadContent();
  const validation = await validateContent(refreshed);
  if (!validation.valid) {
    if (type === "site") await atomicWriteJson(path.join(CONTENT_ROOT, "site.json"), current);
    else await saveRecord(type, id, current);
    await atomicWriteJson(path.join(CONTENT_ROOT, "registry.json"), previousRegistry);
    throw Object.assign(new Error("Save rejected by content validation."), { status: 422, validation });
  }
  await generateAndNotify(refreshed);
  return { record: recordFromBundle(refreshed, type, id), validation };
}

async function archiveRecord(type, id) {
  const bundle = await loadContent();
  const record = recordFromBundle(bundle, type, id);
  if (!record) throw Object.assign(new Error("Content record not found."), { status: 404 });
  const refs = referencesFor(bundle, type, id);
  if (refs.length) throw Object.assign(new Error("Remove or reassign references before archiving."), { status: 409, references: refs });
  const source = recordPath(type, id);
  const archiveDir = path.dirname(archiveRecordPath(type, id));
  await mkdir(archiveDir, { recursive: true });
  record.archivedAt = new Date().toISOString();
  const archiveFile = archiveRecordPath(type, id);
  try {
    await access(archiveFile);
    throw Object.assign(new Error("An archive with this stable ID already exists; nothing was overwritten."), { status: 409 });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await atomicWriteJson(archiveFile, record);
  try { await rm(source); }
  catch (error) {
    await rm(archiveFile, { force: true }).catch(() => {});
    throw error;
  }
  const refreshed = await loadContent();
  await generateAndNotify(refreshed);
  if (type === "project" || type === "collection") await removeOwnedRoute(`projects/${id}/index.html`);
  if (type === "project" || type === "collection") await rm(path.join(PROJECT_ROOT, "studio-preview", "projects", id), { recursive: true, force: true });
  return { archived: id, references: refs };
}

async function deleteArchivedWork(id, expectedRevision, confirmId) {
  if (confirmId !== id) throw Object.assign(new Error("Type the exact stable ID to confirm permanent archive deletion."), { status: 422 });
  const bundle = await loadContent();
  if (bundle.works.some(record => record.id === id)) throw Object.assign(new Error("An active work uses this stable ID; its archive was not deleted."), { status: 409 });
  const archiveFile = archiveRecordPath("work", id);
  let info;
  try { info = await lstat(archiveFile); }
  catch (error) {
    if (error.code === "ENOENT") throw Object.assign(new Error("Archived work not found."), { status: 404 });
    throw error;
  }
  if (!info.isFile() || info.isSymbolicLink()) throw Object.assign(new Error("Archived work must be a regular JSON file."), { status: 409 });
  const record = JSON.parse(await readFile(archiveFile, "utf8"));
  if (record.id !== id || record.recordType !== "work") throw Object.assign(new Error("Archived work identity does not match its filename."), { status: 409 });
  if (!expectedRevision || expectedRevision !== revision(record)) throw Object.assign(new Error("This archived work changed. Refresh Studio before deleting it."), { status: 412 });
  await rm(archiveFile);
  return { deleted: id };
}

async function runPublish() {
  const bundle = await loadContent();
  const validation = await validateContent(bundle, { publish: true });
  if (!validation.valid) throw Object.assign(new Error("Publish validation failed."), { status: 422, validation });
  await generateSite(bundle);
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const output = [];
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, ["run", "build:site"], { cwd: PROJECT_ROOT, windowsHide: true, shell: false });
    child.stdout.on("data", chunk => output.push(chunk.toString()));
    child.stderr.on("data", chunk => output.push(chunk.toString()));
    child.on("error", rejectPromise);
    child.on("exit", code => code === 0 ? resolvePromise() : rejectPromise(new Error(`Build failed with exit code ${code}.`)));
  });
  return { validation, log: output.join("").slice(-30_000), dist: path.join(PROJECT_ROOT, "dist"), gitAction: "none" };
}

async function serveUi(request, response, pathname) {
  const file = pathname === "/" ? "index.html" : pathname === "/app.js" ? "app.js" : pathname === "/styles.css" ? "styles.css" : null;
  if (!file) return false;
  let source = await readFile(path.join(UI_ROOT, file), "utf8");
  if (file === "index.html") source = source.replaceAll("__STUDIO_TOKEN__", TOKEN).replaceAll("__PREVIEW_ORIGIN__", PREVIEW_ORIGIN);
  const type = file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html";
  response.writeHead(200, {
    "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": `default-src 'self'; img-src 'self' ${PREVIEW_ORIGIN} data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src ${PREVIEW_ORIGIN}; connect-src 'self' ${PREVIEW_ORIGIN}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`
  });
  response.end(source);
  return true;
}

function requireMutationAuth(request) {
  if (request.headers.origin !== STUDIO_ORIGIN || request.headers["x-studio-token"] !== TOKEN) throw Object.assign(new Error("Studio mutation authorization failed."), { status: 403 });
}

const server = createServer(async (request, response) => {
  try {
    const host = request.headers.host;
    if (host !== `${HOST}:${STUDIO_PORT}`) throw Object.assign(new Error("Unexpected Host header."), { status: 403 });
    const url = new URL(request.url, STUDIO_ORIGIN);
    if (!url.pathname.startsWith("/api/") && await serveUi(request, response, url.pathname)) return;
    if (url.pathname === "/api/health" && request.method === "GET") return json(response, 200, { ok: true, preview: PREVIEW_ORIGIN });
    if (request.method !== "GET" && request.method !== "HEAD") requireMutationAuth(request);

    if (url.pathname === "/api/bootstrap" && request.method === "GET") {
      const bundle = await loadContent();
      const archivedWorks = await readArchivedRecords("work");
      const validation = await validateContent(bundle);
      let magick = null;
      try { magick = await resolveImageMagick(); } catch { /* shown as unavailable */ }
      return json(response, 200, {
        site: bundle.site,
        summaries: listSummaries(bundle),
        archives: { works: archivedWorkSummaries(archivedWorks) },
        taxonomy: { workTypes: workTypeTaxonomy(bundle, archivedWorks) },
        validation,
        previewOrigin: PREVIEW_ORIGIN,
        imageMagick: magick,
        settings: await settings()
      });
    }
    if (url.pathname === "/api/site" && request.method === "GET") {
      const bundle = await loadContent();
      return json(response, 200, { record: bundle.site, revision: revision(bundle.site) });
    }
    if (url.pathname === "/api/site" && request.method === "PUT") {
      const value = await readJsonBody(request);
      const result = await enqueue(() => persistEntity("site", "site", value, request.headers["if-match"]));
      return json(response, 200, { ...result, revision: revision(result.record) });
    }

    let match = url.pathname.match(/^\/api\/entities\/(project|collection|work)\/([a-z0-9-]+)$/);
    if (match && request.method === "GET") {
      const bundle = await loadContent();
      const record = recordFromBundle(bundle, match[1], match[2]);
      return record ? json(response, 200, { record, revision: revision(record), references: referencesFor(bundle, match[1], match[2]) }) : json(response, 404, { error: "Not found." });
    }
    if (match && request.method === "PUT") {
      const value = await readJsonBody(request);
      const result = await enqueue(() => persistEntity(match[1], match[2], value, request.headers["if-match"]));
      return json(response, 200, { ...result, revision: revision(result.record) });
    }

    match = url.pathname.match(/^\/api\/entities\/(project|collection|work)$/);
    if (match && request.method === "POST") {
      const input = await readJsonBody(request);
      const result = await enqueue(async () => {
        const bundle = await loadContent();
        const id = await uniqueId(input.id || input.titlePL || input.titleEN || "untitled", bundle);
        const record = createDraft(match[1], id, input.titlePL || input.titleEN || "Untitled");
        const orderedPeers = match[1] === "work" ? bundle.works : [...bundle.projects, ...bundle.collections];
        record.order = orderedPeers.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1;
        await saveRecord(match[1], id, record);
        await generateAndNotify(await loadContent());
        return record;
      });
      return json(response, 201, { record: result, revision: revision(result) });
    }

    match = url.pathname.match(/^\/api\/entities\/(project|collection|work)\/([a-z0-9-]+)\/duplicate$/);
    if (match && request.method === "POST") {
      const result = await enqueue(async () => {
        const bundle = await loadContent();
        const source = recordFromBundle(bundle, match[1], match[2]);
        if (!source) throw Object.assign(new Error("Content record not found."), { status: 404 });
        const id = await uniqueId(`${source.id}-copy`, bundle);
        const copy = structuredClone(source);
        const orderedPeers = match[1] === "work" ? bundle.works : [...bundle.projects, ...bundle.collections];
        copy.id = id; copy.published = false; copy.draft = true; copy.order = Math.max(0, ...orderedPeers.map(item => Number(item.order) || 0)) + 1;
        await saveRecord(match[1], id, copy);
        await generateAndNotify(await loadContent());
        return copy;
      });
      return json(response, 201, { record: result, revision: revision(result) });
    }

    match = url.pathname.match(/^\/api\/entities\/(project|collection|work)\/([a-z0-9-]+)\/archive(?:\/preview)?$/);
    if (match && request.method === "GET") {
      const bundle = await loadContent();
      return json(response, 200, { references: referencesFor(bundle, match[1], match[2]) });
    }
    if (match && request.method === "POST") return json(response, 200, await enqueue(() => archiveRecord(match[1], match[2])));

    match = url.pathname.match(/^\/api\/archives\/works\/([a-z0-9-]+)$/);
    if (match && request.method === "DELETE") {
      const input = await readJsonBody(request);
      return json(response, 200, await enqueue(() => deleteArchivedWork(match[1], request.headers["if-match"], input.confirmId)));
    }

    match = url.pathname.match(/^\/api\/order\/(project|collection|work)$/);
    if (match && request.method === "PUT") {
      const input = await readJsonBody(request);
      const result = await enqueue(async () => {
        const bundle = await loadContent();
        const records = match[1] === "project" ? bundle.projects : match[1] === "collection" ? bundle.collections : bundle.works;
        if (!Array.isArray(input.ids) || input.ids.length !== records.length || new Set(input.ids).size !== records.length || input.ids.some(id => !records.some(record => record.id === id))) throw Object.assign(new Error("Order must contain every record exactly once."), { status: 422 });
        const existingSlots = records.map(item => Number(item.order)).sort((a, b) => a - b);
        for (const [index, id] of input.ids.entries()) {
          const record = records.find(item => item.id === id);
          record.order = existingSlots[index];
          await saveRecord(match[1], id, record);
        }
        const refreshed = await loadContent(); await generateAndNotify(refreshed); return listSummaries(refreshed);
      });
      return json(response, 200, result);
    }

    if (url.pathname === "/api/media/import" && request.method === "POST") {
      const length = Number(request.headers["content-length"] || 0);
      if (!length || length > MAX_UPLOAD) throw Object.assign(new Error("Image is empty or exceeds 120 MB."), { status: 413 });
      const configuration = await settings();
      const stagingDir = path.join(configuration.mastersRoot || defaultMastersRoot(), ".staging");
      await mkdir(stagingDir, { recursive: true });
      const stagedFile = path.join(stagingDir, `${randomBytes(16).toString("hex")}.upload`);
      let received = 0;
      const limiter = new Transform({ transform(chunk, encoding, callback) { received += chunk.length; callback(received > MAX_UPLOAD ? new Error("Upload exceeded 120 MB.") : null, chunk); } });
      try {
        await pipeline(request, limiter, createWriteStream(stagedFile, { flags: "wx" }));
        const imported = await enqueue(() => importImage({ stagedFile, originalName: decodeURIComponent(String(request.headers["x-file-name"] || "image")), owner: String(request.headers["x-owner"] || "library"), altPL: decodeURIComponent(String(request.headers["x-alt-pl"] || "")), altEN: decodeURIComponent(String(request.headers["x-alt-en"] || "")), mastersRoot: configuration.mastersRoot || defaultMastersRoot() }));
        const command = process.platform === "win32" ? "node.exe" : "node";
        await new Promise((resolvePromise, rejectPromise) => {
          const child = spawn(command, [path.join(PROJECT_ROOT, "scripts", "generate-media-dimensions.mjs")], { cwd: PROJECT_ROOT, shell: false, windowsHide: true });
          child.on("error", rejectPromise); child.on("exit", code => code === 0 ? resolvePromise() : rejectPromise(new Error("Could not refresh media dimensions.")));
        });
        if (vite) vite.ws.send({ type: "full-reload" });
        return json(response, 201, imported);
      } finally { await rm(stagedFile, { force: true }).catch(() => {}); }
    }

    if (url.pathname === "/api/validate" && request.method === "POST") {
      const bundle = await loadContent(); return json(response, 200, await validateContent(bundle, { publish: false }));
    }
    if (url.pathname === "/api/generate" && request.method === "POST") return json(response, 200, await enqueue(async () => generateAndNotify(await loadContent())));
    if (url.pathname === "/api/publish" && request.method === "POST") return json(response, 200, await enqueue(runPublish));
    json(response, 404, { error: "Unknown Studio endpoint." });
  } catch (error) {
    console.error(error.stack || error.message);
    json(response, error.status || 500, { error: error.message, validation: error.validation, references: error.references });
  }
});

let vite;
try {
  await generateSite(await loadContent(), { preview: true });
  vite = await createViteServer({ root: PROJECT_ROOT, server: { host: HOST, port: PREVIEW_PORT, strictPort: false }, appType: "mpa" });
  await vite.listen();
  if (vite.resolvedUrls?.local?.[0]) PREVIEW_ORIGIN = new URL(vite.resolvedUrls.local[0]).origin;
  await new Promise((resolvePromise, rejectPromise) => server.once("error", rejectPromise).listen(STUDIO_PORT, HOST, resolvePromise));
  console.log(`Portfolio Studio: ${STUDIO_ORIGIN}`);
  console.log(`Live preview:     ${PREVIEW_ORIGIN}`);
  if (!process.argv.includes("--no-open")) {
    const opener = process.platform === "win32" ? spawn("cmd.exe", ["/c", "start", "", STUDIO_ORIGIN], { detached: true, windowsHide: true }) : spawn("xdg-open", [STUDIO_ORIGIN], { detached: true });
    opener.unref();
    setTimeout(() => { const previewOpener = process.platform === "win32" ? spawn("cmd.exe", ["/c", "start", "", PREVIEW_ORIGIN], { detached: true, windowsHide: true }) : spawn("xdg-open", [PREVIEW_ORIGIN], { detached: true }); previewOpener.unref(); }, 300);
  }
} catch (error) {
  console.error(error.stack || error.message);
  await vite?.close();
  server.close();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { server.close(); await vite?.close(); process.exit(0); });
