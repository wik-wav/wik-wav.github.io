import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { CONTENT_ROOT, PROJECT_ROOT, atomicWriteJson } from "./lib/content-store.mjs";

const FORCE = process.argv.includes("--force");
const COLLECTION_IDS = new Set(["cover-art", "small-design-projects", "character-art"]);

async function loadLegacyData() {
  const source = await readFile(path.join(PROJECT_ROOT, "assets", "js", "data.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "assets/js/data.js" });
  return structuredClone(sandbox.window.PORTFOLIO_DATA);
}

function firstImage(media) {
  if (!media) return null;
  if (media.kind === "image") return media;
  if (media.kind === "group") return firstImage(media.items?.[0]);
  return null;
}

function normaliseMedia(media) {
  if (!media || typeof media !== "object") return media;
  const output = structuredClone(media);
  if (output.kind === "image") {
    output.fit ||= "cover";
    output.ratio ||= "4/3";
    if (typeof output.objectPosition === "string") {
      const match = output.objectPosition.match(/^([\d.]+)%\s+([\d.]+)%$/);
      if (match) output.focalPoint = { x: Number(match[1]) / 100, y: Number(match[2]) / 100 };
    }
    output.transparencyMode = output.hasTransparency ? "force-transparent" : "auto";
    output.viewerBackground ||= output.hasTransparency ? "light" : undefined;
  }
  if (output.kind === "group") output.items = (output.items || []).map(normaliseMedia);
  return output;
}

function seoFor(record) {
  const image = firstImage(record.thumbnail || record.hero || record.cover);
  return {
    titlePL: `${record.titlePL} — Wiktor Sielaszuk`,
    titleEN: `${record.titleEN} — Wiktor Sielaszuk`,
    descriptionPL: record.summaryPL,
    descriptionEN: record.summaryEN,
    image: image?.src || "public/og-social.png",
    imageAltPL: image?.altPL || `Podgląd projektu ${record.titlePL}.`,
    imageAltEN: image?.altEN || `Preview of ${record.titleEN}.`
  };
}

function siteRecord() {
  return {
    schemaVersion: 1,
    origin: "https://wik-wav.github.io",
    profile: {
      name: "Wiktor Sielaszuk",
      email: "wiktor.sielaszuk.22@gmail.com",
      linkedIn: "https://www.linkedin.com/in/wiktor-sielaszuk",
      socialLinks: [
        { id: "linkedin", labelPL: "LinkedIn", labelEN: "LinkedIn", href: "https://www.linkedin.com/in/wiktor-sielaszuk" },
        { id: "github", labelPL: "GitHub", labelEN: "GitHub", href: "https://github.com/wik-wav" }
      ]
    },
    navigation: [
      { id: "home", href: "index.html", labelPL: "Profil", labelEN: "Profile" },
      { id: "portfolio", href: "portfolio/index.html", labelPL: "Portfolio", labelEN: "Portfolio" },
      { id: "projects", href: "projects/index.html", labelPL: "Projekty", labelEN: "Projects" },
      { id: "activity", href: "activity/index.html", labelPL: "Aktywność", labelEN: "Activity" },
      { id: "contact", href: "#contact", labelPL: "Kontakt", labelEN: "Contact" }
    ],
    copy: {
      skip: { pl: "Przejdź do treści", en: "Skip to content" },
      "nav.home": { pl: "Profil", en: "Profile" },
      "nav.portfolio": { pl: "Portfolio", en: "Portfolio" },
      "nav.projects": { pl: "Projekty", en: "Projects" },
      "nav.activity": { pl: "Aktywność", en: "Activity" },
      "nav.contact": { pl: "Kontakt", en: "Contact" },
      "nav.menu": { pl: "MENU", en: "MENU" },
      "nav.close": { pl: "ZAMKNIJ", en: "CLOSE" },
      language: { pl: "Język", en: "Language" },
      "footer.title": { pl: "Porozmawiajmy o projekcie albo współpracy.", en: "Let’s talk about a project or collaboration." },
      "project.view": { pl: "Zobacz projekt", en: "View project" },
      "media.placeholder": { pl: "ZASTĘPCZY MATERIAŁ", en: "PLACEHOLDER" },
      "media.video": { pl: "WIDEO", en: "VIDEO" },
      "media.audio": { pl: "AUDIO", en: "AUDIO" }
    },
    home: {
      eyebrowPL: "PROFIL / PROJEKTOWANIE + BADANIA",
      eyebrowEN: "PROFILE / DESIGN + RESEARCH",
      heroLines: [
        { pl: "Tożsamość w sztuce", en: "Identity in art" },
        { pl: "Projektowanie poprzez protokół", en: "Design in protocol" }
      ],
      heroLineHeight: 1.02,
      introPL: "Wiktor Sielaszuk — projektant pracujący na styku komunikacji wizualnej, narzędzi językowych, sztuki generatywnej i systemów uczenia maszynowego.",
      introEN: "Wiktor Sielaszuk — a designer working across visual communication, language tools, generative art, and machine-learning systems.",
      disciplinesHeadingPL: "Praktyka bez sztucznych granic między formą a systemem.",
      disciplinesHeadingEN: "A practice without artificial boundaries between form and system.",
      disciplinesIntroPL: "Każdy projekt zaczyna się od innego pytania, ale łączy je ta sama metoda: nazwać reguły, sprawdzić je w działaniu i dopracować język wizualny tak, by pozostał czytelny.",
      disciplinesIntroEN: "Each project begins with a different question, but shares one method: name the rules, test them in use, and refine the visual language until it remains clear.",
      disciplines: [
        { titlePL: "Systemy wizualne", titleEN: "Visual systems", textPL: "Identyfikacja, typografia, reguły i dokumentacja.", textEN: "Identity, typography, rules, and documentation." },
        { titlePL: "Język i narzędzia", titleEN: "Language and tools", textPL: "Pismo, krój, narzędzia przeglądarkowe i interfejsy.", textEN: "Writing systems, type, browser tools, and interfaces." },
        { titlePL: "Badania generatywne", titleEN: "Generative research", textPL: "Latentne i Para-analog-on: obraz, protokół i sprawczość.", textEN: "Latentne and Para-analog-on: image, protocol, and agency." },
        { titlePL: "Głos i postać", titleEN: "Voice and character", textPL: "Synteza wokalna, zbiory danych, system Lem i projektowanie postaci.", textEN: "Vocal synthesis, datasets, the Lem system, and character design." },
        { titlePL: "Publikacje", titleEN: "Publishing", textPL: "Okładki, plakaty i typografia redakcyjna.", textEN: "Covers, posters, and editorial typography." },
        { titlePL: "Ruch i dźwięk", titleEN: "Motion and sound", textPL: "Autorska muzyka, wideo fraktalne i syntezowane wokale.", textEN: "Original music, fractal video, and synthesised vocals." }
      ],
      degreeProjectIds: ["latentne", "para-analog-on", "gaijin-no-mittsu-no-kuusou"]
    },
    pages: {
      home: { titlePL: "Wiktor Sielaszuk — profil", titleEN: "Wiktor Sielaszuk — profile", descriptionPL: "Profil Wiktora Sielaszuka: projektowanie, sztuka, systemy wizualne i badania.", descriptionEN: "Wiktor Sielaszuk’s profile: design, art, visual systems, and research." },
      portfolio: { titlePL: "Portfolio — Wiktor Sielaszuk", titleEN: "Portfolio — Wiktor Sielaszuk", descriptionPL: "Wszystkie publiczne prace Wiktora Sielaszuka z filtrowaniem według projektu, roku, medium i typu.", descriptionEN: "All public work by Wiktor Sielaszuk, filterable by project, year, medium, and type." },
      projects: { titlePL: "Projekty — Wiktor Sielaszuk", titleEN: "Projects — Wiktor Sielaszuk", descriptionPL: "Wybrane projekty Wiktora Sielaszuka z opisami założeń, procesu, roli i mediów.", descriptionEN: "Selected projects by Wiktor Sielaszuk with context on concept, process, role, and media." },
      activity: { titlePL: "Aktywność — Wiktor Sielaszuk", titleEN: "Activity — Wiktor Sielaszuk", descriptionPL: "Aktualności dotyczące projektów, publikacji, wydarzeń i rozwijanych narzędzi.", descriptionEN: "Updates on projects, publications, events, and tools in development." }
    },
    activity: {
      eyebrowPL: "DZIENNIK AKTYWNOŚCI", eyebrowEN: "ACTIVITY LOG",
      headingPL: "Aktywność", headingEN: "Activity",
      introPL: "Aktualności dotyczące projektów, publikacji, wydarzeń i rozwijanych narzędzi.",
      introEN: "Updates on projects, publications, events, and tools in development.",
      featuredUpdateId: "", itemsPerPage: 10,
      emptyPL: "Nie ma jeszcze opublikowanych aktualizacji.", emptyEN: "There are no published updates yet."
    },
    footer: {
      headingPL: "Porozmawiajmy o projekcie albo współpracy.",
      headingEN: "Let’s talk about a project or collaboration."
    }
  };
}

async function ensureEmptyOrForced() {
  try {
    const entries = await readFile(path.join(CONTENT_ROOT, "site.json"), "utf8");
    if (entries && !FORCE) throw new Error("content/site.json already exists. Use --force only for a deliberate re-migration.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  await ensureEmptyOrForced();
  let retainedUpdates = [];
  try {
    const files = (await readdir(path.join(CONTENT_ROOT,"updates"))).filter(file => file.endsWith(".json"));
    retainedUpdates = await Promise.all(files.map(file => readFile(path.join(CONTENT_ROOT,"updates",file),"utf8").then(JSON.parse)));
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const legacy = await loadLegacyData();
  const projectsById = new Map(legacy.projects.map(item => [item.id, item]));
  const sequenceOwner = new Map();
  for (const project of legacy.projects) for (const id of project.detailSequenceIds || []) sequenceOwner.set(id, project.id);

  for (const folder of ["projects", "collections", "works", "updates", "_archive/projects", "_archive/collections", "_archive/works", "_archive/updates", "schemas"]) {
    await mkdir(path.join(CONTENT_ROOT, folder), { recursive: true });
  }
  await atomicWriteJson(path.join(CONTENT_ROOT, "site.json"), siteRecord());

  for (const [index, legacyProject] of legacy.projects.entries()) {
    const recordType = COLLECTION_IDS.has(legacyProject.id) ? "collection" : "project";
    const record = {
      schemaVersion: 1,
      recordType,
      order: index + 1,
      published: true,
      draft: false,
      pageCode: `P.${String(index + 3).padStart(2, "0")}`,
      pageLabelPL: recordType === "collection" ? "KOLEKCJA" : "PROJEKT KURATORSKI",
      pageLabelEN: recordType === "collection" ? "COLLECTION" : "CURATED PROJECT",
      ...structuredClone(legacyProject)
    };
    for (const key of ["cover", "hero", "thumbnail"]) record[key] = normaliseMedia(record[key]);
    if (!Array.isArray(record.detailSequenceIds) || record.detailSequenceIds.length === 0) {
      record.detailSequenceIds = legacy.works
        .filter(item => (item.project === record.id || item.collections?.includes(record.id)) && item.projectPageVisible !== false)
        .map(item => item.id);
    }
    record.detailSequence = Array.isArray(record.detailSequence)
      ? record.detailSequence
      : record.detailSequenceIds.map(workId => ({ id: `work-${workId}`, kind: "work", workId }));
    record.detailSequenceIds = record.detailSequence
      .filter(node => node?.kind === "work" && typeof node.workId === "string")
      .map(node => node.workId);
    record.sequenceReveal ??= record.id === "lem"
      ? { enabled: true, afterId: "work-lem-09-phascogale-sideview", peekHeight: "standard" }
      : { enabled: false, afterId: "", peekHeight: "standard" };
    const defaultHeroLineHeight = record.id === "gaijin-no-mittsu-no-kuusou" ? 1.3 : 1.12;
    record.heroLineHeightPL ??= record.heroLineHeight ?? defaultHeroLineHeight;
    record.heroLineHeightEN ??= record.heroLineHeight ?? defaultHeroLineHeight;
    record.editorialPL ??= "";
    record.editorialEN ??= "";
    record.seo = seoFor(record);
    if (record.id === "lem") record.brandMark = {
      src: "assets/media/lem/lem-jp-logo.svg",
      altPL: "Logo Lem — 澪夢レム / Lem",
      altEN: "Lem logo — 澪夢レム / Lem",
      background: "white"
    };
    const folder = recordType === "collection" ? "collections" : "projects";
    await atomicWriteJson(path.join(CONTENT_ROOT, folder, `${record.id}.json`), record);
  }

  const allWorks = [
    ...legacy.works.map((item, index) => ({ ...structuredClone(item), _order: index + 1, detailOnly: false })),
    ...(legacy.detailMedia || []).map((item, index) => ({
      gallery: [item.cover], video: { provider: null, id: null, poster: item.cover }, featured: false, draft: false,
      galleryVisible: false, projectPageVisible: true, mediaType: "image", types: [], medium: "digital", year: "",
      summaryPL: item.captionPL, summaryEN: item.captionEN, altPL: item.cover?.altPL || item.captionPL,
      altEN: item.cover?.altEN || item.captionEN, ...structuredClone(item), _order: legacy.works.length + index + 1,
      detailOnly: true, project: sequenceOwner.get(item.id)
    }))
  ];

  for (const item of allWorks) {
    if (!item.project || !projectsById.has(item.project)) throw new Error(`Could not determine the primary project for ${item.id}.`);
    const record = {
      schemaVersion: 1,
      recordType: "work",
      order: item._order,
      published: true,
      ...item
    };
    delete record._order;
    record.cover = normaliseMedia(record.cover);
    record.gallery = (record.gallery || [record.cover]).map(normaliseMedia);
    if (record.video?.poster) record.video.poster = normaliseMedia(record.video.poster);
    record.titlePL ||= record.label || record.id;
    record.titleEN ||= record.label || record.id;
    record.captionPL ||= record.summaryPL || record.titlePL;
    record.captionEN ||= record.summaryEN || record.titleEN;
    record.altPL ||= record.cover?.altPL || record.captionPL;
    record.altEN ||= record.cover?.altEN || record.captionEN;
    await atomicWriteJson(path.join(CONTENT_ROOT, "works", `${record.id}.json`), record);
  }

  await atomicWriteJson(path.join(CONTENT_ROOT, "registry.json"), {
    schemaVersion: 1,
    published: [
      ...legacy.projects.map(item => ({ id: item.id, recordType: COLLECTION_IDS.has(item.id) ? "collection" : "project" })),
      ...allWorks.map(item => ({ id: item.id, recordType: "work" })),
      ...retainedUpdates.filter(item => item.published === true).map(item => ({ id: item.id, recordType: "update" }))
    ]
  });
  await writeFile(path.join(CONTENT_ROOT, "README.md"), "# Portfolio content\n\nThese JSON files are the source of truth. Edit them through `npm run studio`; generated HTML and runtime data should not be edited manually.\n", "utf8");
  console.log(`Migrated ${legacy.projects.length} containers and ${allWorks.length} works into content/.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
