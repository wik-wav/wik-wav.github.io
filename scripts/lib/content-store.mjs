import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
export const CONTENT_ROOT = path.join(PROJECT_ROOT, "content");
export const RECORD_FOLDERS = Object.freeze({
  project: "projects",
  collection: "collections",
  work: "works",
  update: "updates"
});
export const DETAIL_MEDIA_SIZES = Object.freeze(["compact", "standard", "large", "full"]);
export const SEQUENCE_REVEAL_PEEK_HEIGHTS = Object.freeze(["compact", "standard", "tall"]);
export const VIDEO_PROVIDERS = Object.freeze(["youtube", "vimeo", "soundcloud", "bandcamp"]);
export const AUDIO_EMBED_SIZES = Object.freeze(["compact", "standard", "expanded"]);
export const MEDIA_FITS = Object.freeze(["cover", "contain"]);
export const VIEWER_BACKGROUNDS = Object.freeze(["light", "dark"]);
export const TRANSPARENCY_MODES = Object.freeze(["auto", "force-transparent", "force-opaque"]);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ratioPattern = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
const forbiddenKeys = new Set(["html", "iframe", "embedHtml", "rawHtml", "script"]);
const mediaPathPattern = /^(?:assets\/media|public)\/[A-Za-z0-9][A-Za-z0-9_./-]*\.(?:webp|png|jpe?g|svg)$/i;

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Return the authored project-page sequence while keeping legacy records usable.
 * `detailSequence` is authoritative whenever it is present, including when it is
 * an intentionally empty array. Older records continue to resolve their
 * `detailSequenceIds` as work nodes with stable `work-<workId>` node IDs.
 */
export function resolveDetailSequence(record) {
  if (record && Object.prototype.hasOwnProperty.call(record, "detailSequence")) return Array.isArray(record.detailSequence) ? record.detailSequence : [];
  if (!Array.isArray(record?.detailSequenceIds)) return [];
  return record.detailSequenceIds.map(workId => ({ id: `work-${workId}`, kind: "work", workId }));
}

export function detailSequenceWorkIds(record) {
  return resolveDetailSequence(record)
    .filter(node => node?.kind === "work" && typeof node.workId === "string")
    .map(node => node.workId);
}

/**
 * Browser-facing Studio code cannot import this Node module, but server-side
 * migrations and maintenance scripts can use this helper before persisting a
 * record. Validation still reports a mismatch when hand-authored mirrors drift.
 */
export function withMirroredDetailSequenceIds(record) {
  if (!record || !Array.isArray(record.detailSequence)) return record;
  return { ...record, detailSequenceIds: detailSequenceWorkIds(record) };
}

export function recordPath(type, id, root = PROJECT_ROOT) {
  const folder = RECORD_FOLDERS[type];
  if (!folder || !slugPattern.test(id)) throw new Error(`Invalid content identifier: ${type}/${id}`);
  const target = path.resolve(root, "content", folder, `${id}.json`);
  const boundary = `${path.resolve(root, "content", folder)}${path.sep}`;
  if (!target.startsWith(boundary)) throw new Error("Content path escaped its allowed folder.");
  return target;
}

export function archiveRecordPath(type, id, root = PROJECT_ROOT) {
  const folder = RECORD_FOLDERS[type];
  if (!folder || !slugPattern.test(id)) throw new Error(`Invalid archived content identifier: ${type}/${id}`);
  const archiveRoot = path.resolve(root, "content", "_archive", folder);
  const target = path.resolve(archiveRoot, `${id}.json`);
  const boundary = `${archiveRoot}${path.sep}`;
  if (!target.startsWith(boundary)) throw new Error("Archived content path escaped its allowed folder.");
  return target;
}

async function readJson(file) {
  const source = await readFile(file, "utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${path.relative(PROJECT_ROOT, file)}: invalid JSON (${error.message})`);
  }
}

async function readRecords(folder, root) {
  const directory = path.resolve(root, "content", folder);
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name));
  const records = await Promise.all(files.map(async entry => {
    const record = await readJson(path.join(directory, entry.name));
    const filenameId = entry.name.slice(0, -5);
    if (record.id !== filenameId) throw new Error(`${path.join("content", folder, entry.name)}: record id must match its filename.`);
    return record;
  }));
  return records.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.id).localeCompare(String(b.id)));
}

export async function readArchivedRecords(type, root = PROJECT_ROOT) {
  const folder = RECORD_FOLDERS[type];
  if (!folder) throw new Error(`Invalid archived content type: ${type}`);
  const directory = path.resolve(root, "content", "_archive", folder);
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(files.map(async entry => {
    const id = entry.name.slice(0, -5);
    const record = await readJson(archiveRecordPath(type, id, root));
    if (record.id !== id || record.recordType !== type) throw new Error(`${path.join("content", "_archive", folder, entry.name)}: archived record identity must match its filename and folder.`);
    return record;
  }));
}

export async function loadContent(root = PROJECT_ROOT) {
  const site = await readJson(path.resolve(root, "content", "site.json"));
  let registry = { schemaVersion: 1, published: [] };
  try { registry = await readJson(path.resolve(root, "content", "registry.json")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const projects = await readRecords("projects", root);
  const collections = await readRecords("collections", root);
  const works = await readRecords("works", root);
  const updates = await readRecords("updates", root);
  return { site, registry, projects, collections, works, updates };
}

function addIssue(target, pathName, code, message) {
  target.push({ path: pathName, code, message });
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function requiredPair(record, key, pathName, target) {
  for (const language of ["PL", "EN"]) {
    if (!nonEmpty(record[`${key}${language}`])) addIssue(target, `${pathName}.${key}${language}`, "missing-translation", `Missing ${language === "PL" ? "Polish" : "English"} ${key}.`);
  }
}

function scanForbidden(value, pathName, target) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) addIssue(target, `${pathName}.${key}`, "unsafe-field", `Arbitrary ${key} content is not accepted.`);
    scanForbidden(child, `${pathName}.${key}`, target);
  }
}

function validateDisclosure(disclosure, pathName, target) {
  if (!disclosure) return;
  if (typeof disclosure !== "object") return addIssue(target, pathName, "invalid-disclosure", "Disclosure must be an object.");
  requiredPair(disclosure, "short", pathName, target);
  requiredPair(disclosure, "detail", pathName, target);
  if (!["ai-generated", "ai-elements"].includes(disclosure.kind)) addIssue(target, `${pathName}.kind`, "invalid-disclosure-kind", "AI disclosure kind must be ai-generated or ai-elements.");
}

function validateMediaSource(source, pathName, target, mediaFiles) {
  if (!nonEmpty(source) || path.isAbsolute(source) || source.includes("..") || !mediaPathPattern.test(source)) {
    addIssue(target, pathName, "invalid-media-path", "Media paths must stay inside assets/media or public.");
    return;
  }
  mediaFiles.add(source);
}

function validateMedia(media, pathName, target, mediaFiles) {
  if (!media || typeof media !== "object") {
    addIssue(target, pathName, "missing-media", "Media configuration is required.");
    return;
  }
  const ratio = String(media.ratio || "");
  const ratioParts = ratio.match(ratioPattern) ? ratio.split("/").map(Number) : [];
  if (ratioParts.length !== 2 || ratioParts.some(value => !Number.isFinite(value) || value <= 0)) addIssue(target, `${pathName}.ratio`, "invalid-ratio", "Use a positive aspect ratio such as 4/3 or 16/9.");
  if (media.kind === "group") {
    if (!Array.isArray(media.items) || media.items.length < 1 || media.items.length > 8) addIssue(target, `${pathName}.items`, "invalid-group", "Media groups need between one and eight items.");
    else media.items.forEach((item, index) => validateMedia(item, `${pathName}.items[${index}]`, target, mediaFiles));
    return;
  }
  if (media.kind !== "image") addIssue(target, `${pathName}.kind`, "invalid-media-kind", "Only image and group media are supported.");
  validateMediaSource(media.src, `${pathName}.src`, target, mediaFiles);
  if (!MEDIA_FITS.includes(media.fit)) addIssue(target, `${pathName}.fit`, "invalid-fit", "Image fit must be cover or contain.");
  requiredPair(media, "alt", pathName, target);
  if (media.mobileRatio) {
    const mobileParts = String(media.mobileRatio).match(ratioPattern) ? String(media.mobileRatio).split("/").map(Number) : [];
    if (mobileParts.length !== 2 || mobileParts.some(value => !Number.isFinite(value) || value <= 0)) addIssue(target, `${pathName}.mobileRatio`, "invalid-ratio", "Use a positive mobile aspect ratio such as 4/3.");
  }
  if (media.objectPosition) {
    const values = String(media.objectPosition).match(/^([\d.]+)%\s+([\d.]+)%$/)?.slice(1).map(Number);
    if (!values || values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) addIssue(target, `${pathName}.objectPosition`, "invalid-focal-point", "Object position must contain two percentages from 0% to 100%.");
  }
  if (media.focalPoint != null) {
    const { x, y } = media.focalPoint || {};
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) addIssue(target, `${pathName}.focalPoint`, "invalid-focal-point", "Focal-point coordinates must be numbers from 0 to 1.");
  }
  if (media.transparencyMode && !TRANSPARENCY_MODES.includes(media.transparencyMode)) addIssue(target, `${pathName}.transparencyMode`, "invalid-transparency", "Transparency mode must be auto, force-transparent, or force-opaque.");
  if (media.viewerBackground && !VIEWER_BACKGROUNDS.includes(media.viewerBackground)) addIssue(target, `${pathName}.viewerBackground`, "invalid-background", "Transparent-image background must be light or dark.");
  if (media.hasTransparency != null && typeof media.hasTransparency !== "boolean") addIssue(target, `${pathName}.hasTransparency`, "invalid-transparency", "Transparency detection must be a boolean.");
  if (media.noPadding != null && typeof media.noPadding !== "boolean") addIssue(target, `${pathName}.noPadding`, "invalid-media-option", "Image padding preference must be a boolean.");
  validateDisclosure(media.disclosure, `${pathName}.disclosure`, target);
}

function validateExternalLinks(links, pathName, target) {
  if (links == null) return;
  if (!Array.isArray(links)) return addIssue(target, pathName, "invalid-links", "External links must be an array.");
  links.forEach((link, index) => {
    const here = `${pathName}[${index}]`;
    requiredPair(link, "label", here, target);
    try {
      const parsed = new URL(link.href);
      if (parsed.protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      addIssue(target, `${here}.href`, "invalid-link", "External links must be valid HTTPS URLs.");
    }
  });
}

function validSoundCloudUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "soundcloud.com" || url.hostname.endsWith(".soundcloud.com")) && url.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function parseBandcampUrl(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const trustedHost = url.hostname === "bandcamp.com" || url.hostname.endsWith(".bandcamp.com");
    if (url.protocol !== "https:" || !trustedHost || parts.length !== 2 || !["album", "track"].includes(parts[0])) return null;
    return { type: parts[0], url };
  } catch {
    return null;
  }
}

function validateVideo(work, pathName, target, mediaFiles) {
  const video = work.video;
  const hasEmbedConfiguration = Boolean(video && [video.provider, video.id, video.url, video.bandcampType, video.embedSize].some(value => typeof value === "string" ? value.trim() : value));
  if (work.mediaType !== "video") {
    if (hasEmbedConfiguration) addIssue(target, `${pathName}.mediaType`, "video-config-on-image", "Choose Video / audio when an embed provider, ID, or URL is configured.");
    return;
  }
  if (!video || typeof video !== "object") return addIssue(target, `${pathName}.video`, "missing-video", "Video configuration is required.");
  if (!VIDEO_PROVIDERS.includes(video.provider)) addIssue(target, `${pathName}.video.provider`, "invalid-provider", "Use YouTube, Vimeo, SoundCloud, or Bandcamp.");
  if (video.provider === "youtube" && !/^[A-Za-z0-9_-]{6,20}$/.test(String(video.id || ""))) addIssue(target, `${pathName}.video.id`, "invalid-youtube-id", "Invalid YouTube video ID.");
  if (video.provider === "vimeo" && !/^\d{5,12}$/.test(String(video.id || ""))) addIssue(target, `${pathName}.video.id`, "invalid-vimeo-id", "Invalid Vimeo video ID.");
  if (video.provider === "soundcloud" && !validSoundCloudUrl(video.url)) addIssue(target, `${pathName}.video.url`, "invalid-soundcloud-url", "Use a public SoundCloud track URL.");
  if (video.provider === "bandcamp") {
    const bandcamp = parseBandcampUrl(video.url);
    if (!/^\d{5,12}$/.test(String(video.id || ""))) addIssue(target, `${pathName}.video.id`, "invalid-bandcamp-id", "Use the numeric album or track ID from Bandcamp's Share / Embed player.");
    if (!["album", "track"].includes(video.bandcampType)) addIssue(target, `${pathName}.video.bandcampType`, "invalid-bandcamp-type", "Choose whether the Bandcamp release is an album or a track.");
    if (!bandcamp) addIssue(target, `${pathName}.video.url`, "invalid-bandcamp-url", "Use a public Bandcamp album or track URL.");
    else if (video.bandcampType && bandcamp.type !== video.bandcampType) addIssue(target, `${pathName}.video.bandcampType`, "bandcamp-type-mismatch", "The Bandcamp type must match the public URL.");
  }
  if (["soundcloud", "bandcamp"].includes(video.provider)) {
    if (video.embedSize && !AUDIO_EMBED_SIZES.includes(video.embedSize)) addIssue(target, `${pathName}.video.embedSize`, "invalid-audio-embed-size", "Choose compact, standard, or expanded.");
  } else if (video.embedSize) addIssue(target, `${pathName}.video.embedSize`, "embed-size-on-video", "Embed size choices apply only to SoundCloud and Bandcamp.");
  if (video.poster) validateMedia(video.poster, `${pathName}.video.poster`, target, mediaFiles);
  if (video.transcriptPL || video.transcriptEN) requiredPair(video, "transcript", `${pathName}.video`, target);
  if (video.creditsPL || video.creditsEN) requiredPair(video, "credits", `${pathName}.video`, target);
  if (work.videoWarningPL || work.videoWarningEN) requiredPair(work, "videoWarning", pathName, target);
}

function validHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function validateSocialLinks(profile, target) {
  if (!profile || typeof profile !== "object") return;
  // An omitted property is intentionally supported for legacy content. An empty
  // array, on the other hand, means that no social links should be rendered.
  if (profile.socialLinks === undefined) {
    if (profile.linkedIn != null && !validHttpsUrl(profile.linkedIn)) addIssue(target, "site.profile.linkedIn", "invalid-social-link", "Legacy LinkedIn URL must be a valid HTTPS URL.");
    return;
  }
  if (!Array.isArray(profile.socialLinks)) return addIssue(target, "site.profile.socialLinks", "invalid-social-links", "Social links must be an array.");
  if (profile.socialLinks.length > 32) addIssue(target, "site.profile.socialLinks", "too-many-social-links", "Use at most 32 social links.");
  const ids = new Set();
  profile.socialLinks.forEach((link, index) => {
    const here = `site.profile.socialLinks[${index}]`;
    if (!link || typeof link !== "object") return addIssue(target, here, "invalid-social-link", "Social links must be objects.");
    if (!slugPattern.test(String(link.id || ""))) addIssue(target, `${here}.id`, "invalid-social-link-id", "Social-link IDs use lowercase letters, digits, and single hyphens only.");
    else if (ids.has(link.id)) addIssue(target, `${here}.id`, "duplicate-social-link-id", "Each social-link ID must be unique.");
    ids.add(link.id);
    requiredPair(link, "label", here, target);
    if (!validHttpsUrl(link.href)) addIssue(target, `${here}.href`, "invalid-social-link", "Social links must use valid HTTPS URLs without credentials.");
  });
}

function validateTags(tags, pathName, target, noun = "record") {
  if (!Array.isArray(tags)) return addIssue(target, pathName, "invalid-tags", `${noun} tags must be an array.`);
  if (tags.length > 32) addIssue(target, pathName, "too-many-tags", `${noun} can use at most 32 tags.`);
  const seen = new Set();
  tags.forEach((tag, index) => {
    if (typeof tag !== "string" || tag.length > 48 || !slugPattern.test(tag)) addIssue(target, `${pathName}[${index}]`, "invalid-tag", "Tags use lowercase letters, digits, and single hyphens only, up to 48 characters.");
    if (seen.has(tag)) addIssue(target, `${pathName}[${index}]`, "duplicate-tag", `Tag ${tag} is listed more than once.`);
    seen.add(tag);
  });
}

function validateUpdateBlock(block, pathName, target, mediaFiles) {
  if (!block || typeof block !== "object") return addIssue(target, pathName, "invalid-update-block", "Update blocks must be objects.");
  if (!slugPattern.test(String(block.id || ""))) addIssue(target, `${pathName}.id`, "invalid-block-id", "Block IDs use lowercase letters, digits, and hyphens only.");
  if (block.kind === "text") {
    if (block.headingPL || block.headingEN) requiredPair(block, "heading", pathName, target);
    requiredPair(block, "body", pathName, target);
    return;
  }
  if (block.kind === "media") {
    validateMedia(block.media, `${pathName}.media`, target, mediaFiles);
    if (block.captionPL || block.captionEN) requiredPair(block, "caption", pathName, target);
    return;
  }
  if (block.kind === "embed") {
    requiredPair(block, "title", pathName, target);
    if (block.summaryPL || block.summaryEN) requiredPair(block, "summary", pathName, target);
    validateVideo({ mediaType: "video", video: block.embed }, `${pathName}.embed`, target, mediaFiles);
    return;
  }
  if (block.kind === "link") {
    validateExternalLinks([{ labelPL: block.labelPL, labelEN: block.labelEN, href: block.href }], pathName, target);
    return;
  }
  addIssue(target, `${pathName}.kind`, "invalid-update-block-kind", "Update blocks must be text, media, embed, or link.");
}

function validateSite(site, errors) {
  if (site.schemaVersion !== 1) addIssue(errors, "site.schemaVersion", "schema-version", "Unsupported site schema version.");
  try {
    const origin = new URL(site.origin);
    if (origin.protocol !== "https:" || origin.origin !== site.origin) throw new Error("invalid origin");
  } catch { addIssue(errors, "site.origin", "invalid-origin", "The public site origin must be an HTTPS origin without a path."); }
  if (site.origin !== "https://wik-wav.github.io") addIssue(errors, "site.origin", "canonical-origin-mismatch", "This portfolio's canonical public identity is locked to https://wik-wav.github.io.");
  if (!site.profile || !nonEmpty(site.profile.name) || !nonEmpty(site.profile.email)) addIssue(errors, "site.profile", "missing-profile", "Profile name and email are required.");
  else validateSocialLinks(site.profile, errors);
  for (const [index, item] of (site.navigation || []).entries()) {
    requiredPair(item, "label", `site.navigation[${index}]`, errors);
    if (!nonEmpty(item.id) || !nonEmpty(item.href) || item.href.includes("..") || item.href.includes("\\") || /^(?:[a-z]+:|\/\/)/i.test(item.href)) addIssue(errors, `site.navigation[${index}]`, "invalid-navigation", "Navigation items need a stable id and a safe local route or fragment.");
  }
  if (!site.copy || typeof site.copy !== "object") addIssue(errors, "site.copy", "missing-copy", "Global bilingual copy is required.");
  else for (const [key, value] of Object.entries(site.copy)) {
    if (!nonEmpty(value?.pl) || !nonEmpty(value?.en)) addIssue(errors, `site.copy.${key}`, "missing-translation", "Global copy needs Polish and English text.");
  }
  const home = site.home;
  if (!home || typeof home !== "object") addIssue(errors, "site.home", "missing-home", "Homepage content is required.");
  else {
    for (const key of ["eyebrow", "intro", "disciplinesHeading", "disciplinesIntro"]) requiredPair(home, key, "site.home", errors);
    if (!Array.isArray(home.heroLines) || home.heroLines.length < 1) addIssue(errors, "site.home.heroLines", "missing-home-heading", "At least one bilingual homepage heading line is required.");
    else home.heroLines.forEach((line, index) => {
      if (!nonEmpty(line.pl) || !nonEmpty(line.en)) addIssue(errors, `site.home.heroLines[${index}]`, "missing-translation", "Homepage heading lines need Polish and English text.");
    });
    const heroLineHeight = home.heroLineHeight ?? 1.02;
    if (typeof heroLineHeight !== "number" || !Number.isFinite(heroLineHeight) || heroLineHeight < 0.8 || heroLineHeight > 1.4) addIssue(errors, "site.home.heroLineHeight", "invalid-heading-spacing", "Homepage headline line spacing must be a number between 0.8 and 1.4.");
    for (const [index, discipline] of (home.disciplines || []).entries()) {
      requiredPair(discipline, "title", `site.home.disciplines[${index}]`, errors);
      requiredPair(discipline, "text", `site.home.disciplines[${index}]`, errors);
    }
  }
  for (const key of ["home", "portfolio", "projects", "activity"]) {
    const page = site.pages?.[key];
    if (!page || typeof page !== "object") {
      addIssue(errors, `site.pages.${key}`, "missing-page-settings", `Page settings for ${key} are required.`);
      continue;
    }
    requiredPair(page, "title", `site.pages.${key}`, errors);
    requiredPair(page, "description", `site.pages.${key}`, errors);
  }
  const activity = site.activity;
  if (!activity || typeof activity !== "object") addIssue(errors, "site.activity", "missing-activity", "Activity page settings are required.");
  else {
    for (const key of ["eyebrow", "heading", "intro", "empty"]) requiredPair(activity, key, "site.activity", errors);
    if (!Number.isInteger(activity.itemsPerPage) || activity.itemsPerPage < 1 || activity.itemsPerPage > 50) addIssue(errors, "site.activity.itemsPerPage", "invalid-page-size", "Activity page size must be an integer from 1 to 50.");
  }
  if (site.footer) requiredPair(site.footer, "heading", "site.footer", errors);
}

export async function validateContent(bundle, { root = PROJECT_ROOT, checkFiles = true, publish = false } = {}) {
  const errors = [];
  const warnings = [];
  const mediaFiles = new Set();
  validateSite(bundle.site, errors);
  scanForbidden(bundle, "content", errors);

  const containers = [...bundle.projects, ...bundle.collections];
  const allIds = new Map();
  const registryEntries = bundle.registry?.published || [];
  const registry = new Map();
  for (const [index, entry] of registryEntries.entries()) {
    const here = `registry.published[${index}]`;
    if (!RECORD_FOLDERS[entry?.recordType] || !slugPattern.test(String(entry?.id || ""))) {
      addIssue(errors, here, "invalid-registry-entry", "Published-ID registry entries need a valid record type and stable ID.");
      continue;
    }
    const key = `${entry.recordType}:${entry.id}`;
    if (registry.has(key)) addIssue(errors, here, "duplicate-registry-entry", `Published ID ${key} is registered more than once.`);
    else registry.set(key, entry);
  }
  for (const [kind, records] of [["project", bundle.projects], ["collection", bundle.collections], ["work", bundle.works], ["update", bundle.updates || []]]) {
    const orders = new Set();
    records.forEach((record, index) => {
      const here = `${RECORD_FOLDERS[kind]}[${index}]`;
      const target = record.draft ? warnings : errors;
      if (record.schemaVersion !== 1) addIssue(errors, `${here}.schemaVersion`, "schema-version", "Unsupported record schema version.");
      if (record.recordType !== kind) addIssue(errors, `${here}.recordType`, "record-type", `Expected recordType ${kind}.`);
      if (!slugPattern.test(String(record.id || ""))) addIssue(errors, `${here}.id`, "invalid-id", "IDs use lowercase letters, digits, and hyphens only.");
      if (allIds.has(record.id)) addIssue(errors, `${here}.id`, "duplicate-id", `ID is already used by ${allIds.get(record.id)}.`);
      else allIds.set(record.id, here);
      if (!Number.isFinite(Number(record.order))) addIssue(errors, `${here}.order`, "missing-order", "A numeric order is required.");
      else if (orders.has(Number(record.order))) addIssue(errors, `${here}.order`, "duplicate-order", "Order values must be unique within a content type.");
      else orders.add(Number(record.order));
      if (record.published === true && !registry.has(`${kind}:${record.id}`)) addIssue(errors, `${here}.id`, "unregistered-published-id", "Published IDs must be registered before generation.");
      requiredPair(record, "title", here, target);
      if (kind !== "work") requiredPair(record, "summary", here, target);
      if (publish && record.draft && record.published === true) addIssue(errors, `${here}.draft`, "published-draft", "Published records cannot remain drafts during publish.");
    });
  }

  const containerIds = new Set(containers.map(record => record.id));
  const containerById = new Map(containers.map(record => [record.id, record]));
  const collectionIds = new Set(bundle.collections.map(record => record.id));
  const workIds = new Set(bundle.works.map(record => record.id));
  const workById = new Map(bundle.works.map(record => [record.id, record]));
  const containerOrders = new Set();
  const isPublic = record => record?.published === true && record?.draft !== true;
  if (bundle.site.activity?.featuredUpdateId) {
    const featured = (bundle.updates || []).find(record => record.id === bundle.site.activity.featuredUpdateId);
    if (!featured) addIssue(errors, "site.activity.featuredUpdateId", "missing-reference", `Featured update ${bundle.site.activity.featuredUpdateId} does not exist.`);
    else if (!isPublic(featured)) addIssue(errors, "site.activity.featuredUpdateId", "unpublished-reference", "The featured update must be published and not a draft.");
  }
  const seoTitles = new Map();
  const seoDescriptions = new Map();

  const degreeSeen = new Set();
  for (const id of bundle.site.home?.degreeProjectIds || []) {
    if (degreeSeen.has(id)) addIssue(errors, "site.home.degreeProjectIds", "duplicate-reference", `Homepage project ${id} is listed more than once.`);
    else degreeSeen.add(id);
    const record = containerById.get(id);
    if (!record) addIssue(errors, "site.home.degreeProjectIds", "missing-reference", `Homepage project ${id} does not exist.`);
    else if (!isPublic(record)) addIssue(errors, "site.home.degreeProjectIds", "unpublished-reference", `Homepage project ${id} must be published and not a draft.`);
  }

  containers.forEach((record, index) => {
    const folder = record.recordType === "collection" ? "collections" : "projects";
    const here = `${folder}[${index}]`;
    const target = record.draft ? warnings : errors;
    const order = Number(record.order);
    if (containerOrders.has(order)) addIssue(errors, `${here}.order`, "duplicate-container-order", "Projects and collections share one ordered list, so their order values must be unique.");
    else if (Number.isFinite(order)) containerOrders.add(order);
    if (!DETAIL_MEDIA_SIZES.includes(record.detailMediaSize)) addIssue(target, `${here}.detailMediaSize`, "invalid-detail-size", "Choose compact, standard, large, or full.");
    for (const language of ["PL", "EN"]) {
      const key = `heroLineHeight${language}`;
      const heroLineHeight = record[key] ?? record.heroLineHeight ?? 1.12;
      if (typeof heroLineHeight !== "number" || !Number.isFinite(heroLineHeight) || heroLineHeight < 0.8 || heroLineHeight > 1.4) addIssue(target, `${here}.${key}`, "invalid-heading-spacing", `Main heading line spacing (${language}) must be a number between 0.8 and 1.4.`);
    }
    if (record.editorialPL || record.editorialEN) requiredPair(record, "editorial", here, target);
    for (const key of ["cover", "hero", "thumbnail"]) validateMedia(record[key], `${here}.${key}`, target, mediaFiles);
    if (!record.seo || typeof record.seo !== "object") addIssue(target, `${here}.seo`, "missing-seo", "Route SEO settings are required.");
    else {
      requiredPair(record.seo, "title", `${here}.seo`, target);
      requiredPair(record.seo, "description", `${here}.seo`, target);
      requiredPair(record.seo, "imageAlt", `${here}.seo`, target);
      validateMediaSource(record.seo.image, `${here}.seo.image`, target, mediaFiles);
      if (isPublic(record)) {
        for (const [language, key, map] of [["PL", "title", seoTitles], ["EN", "title", seoTitles], ["PL", "description", seoDescriptions], ["EN", "description", seoDescriptions]]) {
          const value = String(record.seo[`${key}${language}`] || "").replace(/\s+/gu, " ").trim().toLocaleLowerCase("en");
          const fingerprint = `${language}:${value}`;
          if (value && map.has(fingerprint)) addIssue(target, `${here}.seo.${key}${language}`, "duplicate-seo", `SEO ${key} duplicates ${map.get(fingerprint)}.`);
          else if (value) map.set(fingerprint, `${record.recordType}/${record.id}`);
        }
      }
    }
    const relatedSeen = new Set();
    for (const id of record.related || []) {
      if (relatedSeen.has(id)) addIssue(target, `${here}.related`, "duplicate-reference", `Related item ${id} is listed more than once.`);
      else relatedSeen.add(id);
      if (id === record.id) addIssue(target, `${here}.related`, "self-reference", "A route cannot be related to itself.");
      else if (!containerIds.has(id)) addIssue(target, `${here}.related`, "missing-reference", `Related item ${id} does not exist.`);
      else if (isPublic(record) && !isPublic(containerById.get(id))) addIssue(target, `${here}.related`, "unpublished-reference", `Related item ${id} must be published and not a draft.`);
    }
    const legacySequence = record.detailSequenceIds;
    if (legacySequence != null && !Array.isArray(legacySequence)) addIssue(target, `${here}.detailSequenceIds`, "invalid-detail-sequence-mirror", "The legacy sequence mirror must be an array of work IDs.");
    if (record.detailSequence != null && !Array.isArray(record.detailSequence)) addIssue(target, `${here}.detailSequence`, "invalid-detail-sequence", "Project-page sequence content must be an array.");

    const hasAuthoredSequence = Object.prototype.hasOwnProperty.call(record, "detailSequence");
    const authoredSequence = hasAuthoredSequence
      ? (Array.isArray(record.detailSequence) ? record.detailSequence : [])
      : (Array.isArray(legacySequence) ? legacySequence.map(workId => ({ id: `work-${workId}`, kind: "work", workId })) : []);
    const sequenceNodeIds = new Set();
    const sequenceWorkIds = [];
    const sequenceWorksSeen = new Set();
    const validateSequenceWork = (id, pathName) => {
      if (!slugPattern.test(String(id || ""))) {
        addIssue(target, pathName, "invalid-sequence-work-id", "Sequence work IDs use lowercase letters, digits, and single hyphens only.");
        return;
      }
      if (sequenceWorksSeen.has(id)) {
        addIssue(target, pathName, "duplicate-reference", `Sequence work ${id} is listed more than once.`);
        return;
      }
      sequenceWorksSeen.add(id);
      sequenceWorkIds.push(id);
      if (!workIds.has(id)) {
        addIssue(target, pathName, "missing-reference", `Sequence work ${id} does not exist.`);
        return;
      }
      const work = workById.get(id);
      const belongs = work.project === record.id || (work.collections || []).includes(record.id);
      if (!belongs) addIssue(target, pathName, "foreign-sequence-work", `Sequence work ${id} does not belong to ${record.id}.`);
      if (isPublic(record) && !isPublic(work)) addIssue(target, pathName, "unpublished-sequence-work", `Published route ${record.id} cannot include unpublished or draft work ${id}.`);
    };

    authoredSequence.forEach((node, nodeIndex) => {
      const nodePath = `${here}.${Array.isArray(record.detailSequence) ? "detailSequence" : "detailSequenceIds"}[${nodeIndex}]`;
      if (!node || typeof node !== "object" || Array.isArray(node)) {
        addIssue(target, nodePath, "invalid-sequence-node", "Sequence entries must be work or text objects.");
        return;
      }
      if (!slugPattern.test(String(node.id || ""))) addIssue(target, `${nodePath}.id`, "invalid-sequence-node-id", "Sequence-node IDs use lowercase letters, digits, and single hyphens only.");
      else if (sequenceNodeIds.has(node.id)) addIssue(target, `${nodePath}.id`, "duplicate-sequence-node-id", `Sequence node ID ${node.id} is used more than once.`);
      else sequenceNodeIds.add(node.id);

      if (node.kind === "work") {
        if (node.id !== `work-${node.workId}`) addIssue(target, `${nodePath}.id`, "sequence-work-node-id-mismatch", `Work sequence node ID must be work-${node.workId || "<work-id>"}.`);
        validateSequenceWork(node.workId, Array.isArray(record.detailSequence) ? `${nodePath}.workId` : nodePath);
        if (["headingPL", "headingEN", "bodyPL", "bodyEN"].some(key => node[key] != null)) addIssue(target, nodePath, "unexpected-sequence-field", "Work sequence nodes cannot contain text-block fields.");
        return;
      }
      if (node.kind === "text") {
        if (node.headingPL || node.headingEN) requiredPair(node, "heading", nodePath, target);
        requiredPair(node, "body", nodePath, target);
        if (node.workId != null) addIssue(target, `${nodePath}.workId`, "unexpected-sequence-field", "Text sequence nodes cannot reference a work.");
        return;
      }
      addIssue(target, `${nodePath}.kind`, "invalid-sequence-node-kind", "Sequence entries must be work or text nodes.");
    });

    if (Array.isArray(record.detailSequence) && Array.isArray(legacySequence)) {
      const mirrorsMatch = legacySequence.length === sequenceWorkIds.length && legacySequence.every((id, mirrorIndex) => id === sequenceWorkIds[mirrorIndex]);
      if (!mirrorsMatch) addIssue(target, `${here}.detailSequenceIds`, "detail-sequence-mismatch", "detailSequenceIds must mirror the work nodes in detailSequence, in the same order.");
    }

    if (record.sequenceReveal != null) {
      const reveal = record.sequenceReveal;
      if (!reveal || typeof reveal !== "object" || Array.isArray(reveal)) addIssue(target, `${here}.sequenceReveal`, "invalid-sequence-reveal", "Sequence reveal settings must be an object.");
      else {
        if (typeof reveal.enabled !== "boolean") addIssue(target, `${here}.sequenceReveal.enabled`, "invalid-sequence-reveal", "Sequence reveal enabled must be true or false.");
        if (!SEQUENCE_REVEAL_PEEK_HEIGHTS.includes(reveal.peekHeight)) addIssue(target, `${here}.sequenceReveal.peekHeight`, "invalid-sequence-peek-height", "Choose compact, standard, or tall for the collapsed preview height.");
        const afterId = String(reveal.afterId || "");
        if (reveal.enabled === true && !nonEmpty(afterId)) addIssue(target, `${here}.sequenceReveal.afterId`, "missing-sequence-reveal-boundary", "An enabled sequence reveal needs a boundary node.");
        else if (nonEmpty(afterId) && !sequenceNodeIds.has(afterId)) addIssue(target, `${here}.sequenceReveal.afterId`, "missing-sequence-node", `Sequence reveal boundary ${afterId} does not exist in the authored sequence.`);
        else if (reveal.enabled === true && authoredSequence.at(-1)?.id === afterId) addIssue(target, `${here}.sequenceReveal.afterId`, "empty-sequence-reveal-tail", "The Show more boundary must leave at least one sequence block below it.");
      }
    }
    validateExternalLinks(record.externalLinks, `${here}.externalLinks`, target);
  });

  bundle.works.forEach((work, index) => {
    const here = `works[${index}]`;
    const target = work.draft ? warnings : errors;
    const primaryContainer = containerById.get(work.project);
    if (!primaryContainer) addIssue(target, `${here}.project`, "missing-project", `Primary project ${work.project || "(empty)"} does not exist.`);
    else if (isPublic(work) && !isPublic(primaryContainer)) addIssue(target, `${here}.project`, "unpublished-reference", `Published work ${work.id} needs a published primary project or collection.`);
    for (const id of work.collections || []) {
      if (!collectionIds.has(id)) addIssue(target, `${here}.collections`, "missing-collection", `Collection ${id} does not exist.`);
      else if (isPublic(work) && !isPublic(containerById.get(id))) addIssue(target, `${here}.collections`, "unpublished-reference", `Published work ${work.id} cannot reference unpublished collection ${id}.`);
    }
    if (!work.detailOnly) {
      requiredPair(work, "summary", here, target);
      requiredPair(work, "alt", here, target);
    }
    validateTags(work.types, `${here}.types`, target, "Work");
    requiredPair(work, "caption", here, target);
    if (!["image", "video"].includes(work.mediaType)) addIssue(target, `${here}.mediaType`, "invalid-media-type", "Work media type must be image or video.");
    validateMedia(work.cover, `${here}.cover`, target, mediaFiles);
    validateVideo(work, here, target, mediaFiles);
    validateExternalLinks(work.externalLinks, `${here}.externalLinks`, target);
  });

  (bundle.updates || []).forEach((update, index) => {
    const here = `updates[${index}]`;
    const target = update.draft ? warnings : errors;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(update.date || "")) || Number.isNaN(Date.parse(`${update.date}T00:00:00Z`))) addIssue(target, `${here}.date`, "invalid-date", "Updates need a valid date in YYYY-MM-DD format.");
    validateTags(update.types, `${here}.types`, target, "Update");
    const projectIds = Array.isArray(update.projectIds) ? update.projectIds : [];
    if (!Array.isArray(update.projectIds)) addIssue(target, `${here}.projectIds`, "invalid-references", "Related projects must be an array.");
    const seenProjects = new Set();
    for (const id of projectIds) {
      if (seenProjects.has(id)) addIssue(target, `${here}.projectIds`, "duplicate-reference", `Project ${id} is listed more than once.`);
      else seenProjects.add(id);
      if (!containerIds.has(id)) addIssue(target, `${here}.projectIds`, "missing-reference", `Related project ${id} does not exist.`);
      else if (isPublic(update) && !isPublic(containerById.get(id))) addIssue(target, `${here}.projectIds`, "unpublished-reference", `Published update ${update.id} cannot reference unpublished project ${id}.`);
    }
    if (!Array.isArray(update.blocks) || update.blocks.length < 1) addIssue(target, `${here}.blocks`, "missing-update-block", "An update needs at least one content block.");
    else {
      const blockIds = new Set();
      update.blocks.forEach((block, blockIndex) => {
        if (blockIds.has(block?.id)) addIssue(target, `${here}.blocks[${blockIndex}].id`, "duplicate-block-id", `Block ID ${block.id} is used more than once.`);
        else blockIds.add(block?.id);
        validateUpdateBlock(block, `${here}.blocks[${blockIndex}]`, target, mediaFiles);
      });
    }
  });

  if (checkFiles) {
    for (const relative of mediaFiles) {
      const file = path.resolve(root, relative);
      const boundary = `${path.resolve(root)}${path.sep}`;
      if (!file.startsWith(boundary)) {
        addIssue(errors, relative, "invalid-media-path", "Media path escaped the repository.");
        continue;
      }
      try {
        await access(file, fsConstants.R_OK);
        const info = await stat(file);
        if (!info.isFile()) throw new Error("not a file");
      } catch {
        addIssue(errors, relative, "missing-media-file", "Referenced media file does not exist.");
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings, counts: { projects: bundle.projects.length, collections: bundle.collections.length, works: bundle.works.length, updates: (bundle.updates || []).length, media: mediaFiles.size } };
}

export function referencesFor(bundle, type, id) {
  const references = [];
  const containers = [...bundle.projects, ...bundle.collections];
  if (type === "project" || type === "collection") {
    containers.forEach(record => {
      if (record.related?.includes(id)) references.push({ type: record.recordType, id: record.id, field: "related" });
    });
    bundle.works.forEach(work => {
      if (work.project === id) references.push({ type: "work", id: work.id, field: "project" });
      if (work.collections?.includes(id)) references.push({ type: "work", id: work.id, field: "collections" });
    });
    if (bundle.site.home?.degreeProjectIds?.includes(id)) references.push({ type: "site", id: "site", field: "home.degreeProjectIds" });
    (bundle.updates || []).forEach(update => {
      if (update.projectIds?.includes(id)) references.push({ type: "update", id: update.id, field: "projectIds" });
    });
  } else if (type === "work") {
    containers.forEach(record => {
      if (detailSequenceWorkIds(record).includes(id)) references.push({ type: record.recordType, id: record.id, field: Array.isArray(record.detailSequence) ? "detailSequence" : "detailSequenceIds" });
    });
  } else if (type === "update" && bundle.site.activity?.featuredUpdateId === id) {
    references.push({ type: "site", id: "site", field: "activity.featuredUpdateId" });
  }
  return references;
}

export async function atomicWriteJson(file, value) {
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

export async function saveRecord(type, id, value, root = PROJECT_ROOT) {
  if (!value || value.id !== id || value.recordType !== type) throw new Error("Record identity cannot be changed after creation.");
  const file = recordPath(type, id, root);
  await atomicWriteJson(file, value);
  return file;
}

export async function uniqueId(desired, bundle, { root = PROJECT_ROOT } = {}) {
  const archived = (await Promise.all(Object.keys(RECORD_FOLDERS).map(type => readArchivedRecords(type, root)))).flat();
  const used = new Set([
    ...bundle.projects,
    ...bundle.collections,
    ...bundle.works,
    ...(bundle.updates || []),
    ...(bundle.registry?.published || []),
    ...archived
  ].map(record => record.id));
  const base = slugify(desired) || "untitled";
  if (!used.has(base)) return base;
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique identifier.");
}

export function runtimeRecord(record) {
  const clone = structuredClone(record);
  for (const key of ["schemaVersion", "recordType", "order", "published", "seo", "pageCode", "pageLabelPL", "pageLabelEN", "brandMark", "detailOnly", "archivedAt"]) delete clone[key];
  return clone;
}
