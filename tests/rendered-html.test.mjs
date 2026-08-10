import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const projectSlugs = ["latentne", "para-analog-on", "gaijin-no-mittsu-no-kuusou", "lem", "lozenge-t", "book-cover", "windows-zine", "cover-art", "small-design-projects", "character-art", "dissonance-perspective"];
const pages = ["index.html", "portfolio/index.html", "projects/index.html", ...projectSlugs.map(slug => `projects/${slug}/index.html`)];
const read = relative => readFile(path.join(root, relative), "utf8");

async function loadData() {
  const source = await read("assets/js/data.js");
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return { source, ...context.window.PORTFOLIO_DATA };
}

function collectMedia(asset, target) {
  if (!asset) return;
  if (asset.kind === "image" && asset.src) target.add(asset.src);
  if (asset.kind === "group") asset.items.forEach(item => collectMedia(item, target));
}

test("keeps index.html primary and registers exactly fourteen routes", async () => {
  const { projects, works } = await loadData();
  const publicWorks = works.filter(item => !item.draft && item.galleryVisible !== false);
  assert.equal(pages[0], "index.html");
  assert.equal(pages.length, 14);
  assert.equal(projects.length, 11);
  assert.equal(publicWorks.length, 61);
  for (const page of pages) await access(path.join(root, page));

  const vite = await read("vite.config.ts");
  for (const page of pages) assert.match(vite, new RegExp(page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(vite, /copy-static-media/);
  assert.doesNotMatch(vite, /__dirname/);
  assert.match(vite, /\.\/seo-metadata\.ts/);
});

test("keeps every page bilingual and connected to shared chrome", async () => {
  for (const page of pages) {
    const html = await read(page);
    assert.match(html, /<html lang="pl">/);
    assert.match(html, /<main\b[^>]*id="main"/);
    assert.match(html, /data-site-header/);
    assert.match(html, /data-site-footer/);
    assert.match(html, /assets\/js\/data\.js/);
    assert.match(html, /assets\/js\/core\.js/);
  }

  const core = await read("assets/js/core.js");
  assert.match(core, /localStorage\.getItem\("portfolio:lang"\)/);
  assert.match(core, /localStorage\.setItem\("portfolio:lang"/);
  assert.match(core, /document\.documentElement\.lang = state\.lang/);
  assert.match(core, /data-lang="pl"/);
  assert.match(core, /data-lang="en"/);
});

test("builds complete route-specific production SEO for all fourteen canonical pages", async () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const page of pages) {
    const output = await read(path.posix.join("dist", page));
    const route = page === "index.html" ? "/" : `/${page.replace(/index\.html$/, "")}`;
    const canonical = `https://wik-wav.github.io${route}`;
    const title = output.match(/<title[^>]*>([^<]+)<\/title>/)?.[1];
    const description = output.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && description, `${page} has title and description`);
    assert.ok(!titles.has(title), `${page} title is unique`);
    assert.ok(!descriptions.has(description), `${page} description is unique`);
    titles.add(title); descriptions.add(description);
    assert.match(output, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    for (const marker of ['name="robots" content="index,follow,max-image-preview:large"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image" content="https://wik-wav.github.io/og-social.png"', 'property="og:image:width" content="1200"', 'property="og:image:height" content="630"', 'property="og:site_name"', 'property="og:locale" content="pl_PL"', 'property="og:locale:alternate" content="en_GB"', 'name="twitter:card" content="summary_large_image"', 'name="twitter:image:alt"', 'rel="manifest" href="/site.webmanifest"']) assert.ok(output.includes(marker), `${page} has ${marker}`);
    assert.match(output, /data-content-pl="[^"]+" data-content-en="[^"]+"/);
    assert.doesNotMatch(output.match(/<(?:link rel="canonical"|meta property="og:url")[^>]+>/g)?.join("\n") || "", /[?&](?:page|size|per|project|type|medium|year|collection|work)=/);
    const json = output.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const schema = JSON.parse(json);
    if (route === "/") assert.ok(schema["@graph"].some(item => item["@type"] === "Person") && schema["@graph"].some(item => item["@type"] === "WebSite"));
    else if (["/portfolio/", "/projects/"].includes(route)) assert.equal(schema["@type"], "CollectionPage");
    else assert.equal(schema["@type"], "CreativeWork");
  }
  assert.equal(titles.size, 14);
  assert.equal(descriptions.size, 14);
});

test("ships crawl, manifest, icon, and disclosed social assets", async () => {
  for (const file of ["robots.txt", "sitemap.xml", "site.webmanifest", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og-social.png"]) await access(path.join(root, "dist", file));
  const sitemap = await read("dist/sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, 14);
  assert.equal(new Set(urls).size, 14);
  assert.ok(urls.every(url => url.startsWith("https://wik-wav.github.io/") && !url.includes("?")));
  const manifest = JSON.parse(await read("dist/site.webmanifest"));
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ["192x192", "512x512"]);
  const seo = await read("seo-metadata.ts");
  assert.doesNotMatch(seo, /meta keywords|hreflang/i);
  assert.match(await read("README.md"), /AI-generated portfolio preview visualisation|wygenerowaną przez AI wizualizacją/i);
  const workflow = await read(".github/workflows/deploy.yml");
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(workflow, /npm run build/);
});

test("uses constant-size shared pagination tokens and inert gaps", async () => {
  const core = await read("assets/js/core.js");
  const start = core.indexOf("function paginationTokens");
  const end = core.indexOf("\n  function renderPaginationTokens", start);
  const tokens = vm.runInNewContext(`(${core.slice(start, end).trim()})`);
  const compact = (current, total) => tokens(current, total).map(token => token.type === "page" ? token.page : token.key);
  assert.deepEqual(Array.from(compact(1, 1)), [1]);
  assert.deepEqual(Array.from(compact(4, 7)), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(compact(1, 8)), [1, 2, 3, 4, 5, "end-gap", 8]);
  assert.deepEqual(Array.from(compact(5, 8)), [1, "start-gap", 4, 5, 6, 7, 8]);
  assert.deepEqual(Array.from(compact(10, 20)), [1, "start-gap", 9, 10, 11, "end-gap", 20]);
  assert.deepEqual(Array.from(compact(500, 1000)), [1, "start-gap", 499, 500, 501, "end-gap", 1000]);
  for (const [current, total] of [[1, 1], [4, 7], [1, 8], [5, 8], [10, 20], [500, 1000], [1000, 1000]]) {
    const result = tokens(current, total);
    assert.ok(result.length <= 7);
    assert.equal(result.filter(token => token.type === "page" && token.page === Math.min(current, total)).length, 1);
  }
  assert.match(core, /<span class="pagination-ellipsis" data-gap="\$\{token\.key\}" aria-hidden="true">…<\/span>/);
  assert.doesNotMatch(core.match(/<span class="pagination-ellipsis"[^>]+>/)?.[0] || "", /data-page/);
  for (const source of [await read("assets/js/portfolio.js"), await read("assets/js/projects.js")]) assert.match(source, /P\.renderPaginationTokens/);
  const css = await read("assets/css/site.css");
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.pagination-previous[^}]*grid-row:\s*1[\s\S]*?\.pagination-pages[^}]*grid-row:\s*2/);
});

test("requires intrinsic dimensions and specific bilingual local-image alternatives", async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await read("assets/js/media-dimensions.js"), context);
  const dimensions = context.window.MEDIA_DIMENSIONS;
  const { projects, works, detailMedia } = await loadData();
  const visit = (media, owner) => {
    if (!media) return;
    if (media.kind === "group") return media.items.forEach(item => visit(item, owner));
    if (media.kind !== "image") return;
    assert.ok(dimensions[media.src], `${media.src} has intrinsic dimensions`);
    if (media.decorative === true) assert.equal(media.altPL + media.altEN, "");
    else {
      assert.ok(media.altPL?.trim() && media.altEN?.trim(), `${media.src} has paired alt text`);
      assert.doesNotMatch(media.altPL, /^(image|artwork|poster)$/i);
      assert.doesNotMatch(media.altEN, /^(image|artwork|poster)$/i);
    }
  };
  for (const project of projects) for (const media of [project.cover, project.hero, project.thumbnail]) visit(media, project);
  for (const item of [...works, ...detailMedia]) { visit(item.cover, item); item.gallery?.forEach(media => visit(media, item)); visit(item.video?.poster, item); }
  for (const id of ["para-analog-on", "gaijin-no-mittsu-no-kuusou", "lem"]) {
    const group = projects.find(item => item.id === id).cover.kind === "group" ? projects.find(item => item.id === id).cover : projects.find(item => item.id === id).hero;
    assert.equal(new Set(group.items.map(item => item.altPL)).size, group.items.length);
    assert.equal(new Set(group.items.map(item => item.altEN)).size, group.items.length);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(dimensions["og-social.png"])), { width: 1200, height: 630 });
  const core = await read("assets/js/core.js");
  assert.match(core, /width="\$\{dimensions\.width\}" height="\$\{dimensions\.height\}"/);
  assert.match(core, /fetchpriority="high"/);
  assert.match(core, /loading="\$\{eager \? "eager" : "lazy"\}" decoding="async"/);
  assert.match(await read("assets/js/project-detail.js"), /fetchPriority: "high"/);
  assert.doesNotMatch((await read("assets/js/home.js")) + (await read("assets/js/portfolio.js")) + (await read("assets/js/projects.js")), /fetchPriority/);
});

test("renders the exact bilingual home headline as two persistent lines", async () => {
  const source = await read("index.html");
  const css = await read("assets/css/site.css");
  const output = await read("dist/index.html");
  const retiredHeadlines = [
    ["Projektuję", "systemy,", "które", "potrafią", "mówić", "wieloma", "głosami."].join(" "),
    ["I", "design", "systems", "that", "can", "speak", "in", "many", "voices."].join(" ")
  ];
  for (const html of [source, output]) {
    assert.match(html, /data-pl="Tożsamość w sztuce" data-en="Identity in art"/);
    assert.match(html, /data-pl="Projektowanie poprzez protokół" data-en="Design in protocol"/);
    assert.equal((html.match(/class="home-hero-heading-line"/g) || []).length, 2);
    for (const retired of retiredHeadlines) assert.ok(!html.includes(retired));
  }
  assert.match(css, /\.home-hero-heading-line\s*\{\s*display:\s*block;\s*\}/);
});

test("loads Exo 2 for body copy without changing display or mono typography", async () => {
  const css = await read("assets/css/site.css");
  assert.equal((css.match(/@import\s+url\(/g) || []).length, 1);
  assert.match(css, /family=Exo\+2:wght@400;500;600&family=Merriweather:opsz,wght@18\.\.144,400;18\.\.144,600&display=swap/);
  assert.match(css, /--font-body:\s*"Exo 2", "Segoe UI", system-ui, -apple-system, sans-serif;/);
  assert.match(css, /--font-display:\s*"Merriweather", Georgia, serif;/);
  assert.match(css, /--font-mono:\s*"Cascadia Mono", "SFMono-Regular", Consolas, monospace;/);
  assert.doesNotMatch(css, /--font-body:[^;]*Aptos/);
  assert.match(css, /@font-face\s*\{[\s\S]*?font-family:\s*"Asaxi Merriweather 24pt";[\s\S]*?font-weight:\s*500;[\s\S]*?font-style:\s*normal;[\s\S]*?font-display:\s*swap;/);
  assert.match(css, /font-synthesis:\s*none/);
  assert.match(css, /font-feature-settings:\s*"liga" 1/);
  assert.doesNotMatch(css, /\bdlig\b/);
  await access(path.join(root, "assets/fonts/Asaxi-alphabet-Merriweather24pt-Medium.ttf"));
  await access(path.join(root, "dist/assets/fonts/Asaxi-alphabet-Merriweather24pt-Medium.ttf"));
});

test("uses eleven curated projects in stable order with valid relations and collections", async () => {
  const { projects, works } = await loadData();
  assert.deepEqual(Array.from(projects, project => project.id), projectSlugs);
  const ids = new Set(projectSlugs);
  for (const project of projects) for (const related of project.related) assert.ok(ids.has(related), `${project.id} relates to an existing project`);
  for (const item of works) {
    assert.ok(ids.has(item.project), `${item.id} references an existing project`);
    for (const collection of item.collections || []) assert.ok(ids.has(collection), `${item.id} collection exists`);
  }

  const detail = await read("assets/js/project-detail.js");
  assert.match(detail, /item\.project === projectId \|\| item\.collections\?\.includes\(projectId\)/);
  assert.doesNotMatch(detail, /works\.find\(item => item\.project === projectId/);
});

test("uses tailored process headings and intentional project hero media", async () => {
  const { projects } = await loadData();
  const headings = {
    latentne: ["Fraktale, malarstwo cyfrowe i dyfuzja.", "Fractals, digital painting, and diffusion."],
    "para-analog-on": ["Od tysiąca słów do dwóch.", "From a thousand words to two."],
    "gaijin-no-mittsu-no-kuusou": ["Muzyka, synteza głosu i obraz fraktalny.", "Music, voice synthesis, and fractal imagery."],
    lem: ["Głos, dane i warianty postaci.", "Voice, data, and character variants."],
    "lozenge-t": ["Język, pismo i narzędzia.", "Language, script, and tools."],
    "book-cover": ["Typografia i kompozycja okładki.", "Typography and cover composition."],
    "windows-zine": ["ASCII, skanografia i skład zina.", "ASCII, scanography, and zine layout."],
    "cover-art": ["Trzy podejścia do kwadratowego formatu.", "Three approaches to the square format."],
    "small-design-projects": ["Skala, funkcja i czytelność.", "Scale, function, and legibility."],
    "character-art": ["Od sylwetki do planszy referencyjnej.", "From silhouette to reference sheet."],
    "dissonance-perspective": ["Animacja 3D, muzyka i montaż.", "3D animation, music, and editing."]
  };
  assert.ok(projects.every(project => project.processHeadingPL && project.processHeadingEN));
  for (const project of projects) assert.deepEqual([project.processHeadingPL, project.processHeadingEN], headings[project.id]);
  assert.ok(projects.every(project => project.hero && project.thumbnail));
  for (const id of ["para-analog-on", "gaijin-no-mittsu-no-kuusou", "lozenge-t", "small-design-projects", "character-art"]) {
    const project = projects.find(item => item.id === id);
    assert.equal(project.hero.ratio, "2/1", `${id} has a wide hero`);
    assert.equal(project.thumbnail.ratio, "4/3", `${id} has a 4:3 thumbnail`);
    assert.equal(project.thumbnail.fit, "cover", `${id} thumbnail crops deliberately`);
  }
  const para = projects.find(item => item.id === "para-analog-on");
  const gaijin = projects.find(item => item.id === "gaijin-no-mittsu-no-kuusou");
  const character = projects.find(item => item.id === "character-art");
  assert.equal(para.hero.items.length, 4);
  assert.equal(gaijin.hero.items.length, 3);
  assert.equal(character.hero.items.length, 3);
  for (const slug of projectSlugs) assert.match(await read(`projects/${slug}/index.html`), /data-project-process-heading/);
  const detail = await read("assets/js/project-detail.js");
  const projectsRenderer = await read("assets/js/projects.js");
  const core = await read("assets/js/core.js");
  assert.match(detail, /project\.hero \|\| project\.cover/);
  assert.match(detail, /item\.thumbnail \|\| item\.cover/);
  assert.match(projectsRenderer, /project\.thumbnail \|\| project\.cover/);
  assert.match(core, /data-group-count=/);
});

test("top-aligns only portrait project thumbnails through the shared media renderer", async () => {
  const { projects } = await loadData();
  for (const id of ["para-analog-on", "gaijin-no-mittsu-no-kuusou", "character-art"]) {
    assert.equal(projects.find(item => item.id === id).thumbnail.objectPosition, "50% 0%", `${id} portrait thumbnail aligns from the top`);
  }
  for (const id of ["latentne", "lozenge-t", "book-cover", "windows-zine", "cover-art", "small-design-projects", "dissonance-perspective"]) {
    assert.equal(projects.find(item => item.id === id).thumbnail.objectPosition, undefined, `${id} keeps the centered CSS fallback`);
  }
  const lem = projects.find(item => item.id === "lem");
  assert.equal(lem.thumbnail.objectPosition, undefined);
  assert.equal(lem.thumbnail.fit, "contain");
  assert.equal(lem.thumbnail.noPadding, true);

  const data = await read("assets/js/data.js");
  const core = await read("assets/js/core.js");
  const css = await read("assets/css/site.css");
  assert.match(data, /sourceWidth < sourceHeight/);
  assert.match(core, /--object-position:\$\{esc\(media\.objectPosition\)\}/);
  assert.match(css, /object-position:\s*var\(--object-position,\s*50% 50%\)/);
});

test("contains every degree image work plus the bachelor video", async () => {
  const { works } = await loadData();
  assert.equal(works.filter(item => item.project === "latentne").length, 12);
  assert.equal(works.filter(item => item.project === "para-analog-on").length, 4);
  const bachelor = works.filter(item => item.project === "gaijin-no-mittsu-no-kuusou");
  assert.equal(bachelor.length, 4);
  assert.equal(bachelor.filter(item => item.mediaType === "video").length, 1);
  assert.ok([...works.filter(item => item.project === "latentne"), ...works.filter(item => item.project === "para-analog-on"), ...bachelor].every(item => item.galleryVisible !== false && !item.draft));
});

test("shows every surviving Lem work in the gallery and keeps the authored detail sequence", async () => {
  const { projects, works, source } = await loadData();
  const project = projects.find(item => item.id === "lem");
  const lemWorks = works.filter(item => item.project === "lem");
  assert.equal(lemWorks.length, 18);
  assert.ok(lemWorks.every(item => item.galleryVisible === true && !item.draft));
  assert.ok(lemWorks.some(item => item.year === "2024"));
  assert.ok(lemWorks.some(item => item.year == null));
  const hiddenOnDetail = lemWorks.filter(item => item.projectPageVisible === false);
  assert.deepEqual(Array.from(hiddenOnDetail, item => item.id), ["lem-04-civet-illustration", "lem-05-quoll-illustration", "lem-06-phascogale-illustration"]);
  const sideviews = lemWorks.filter(item => item.projectGroup === "lem-sideviews");
  assert.deepEqual(Array.from(sideviews, item => item.id), ["lem-07-civet-sideview", "lem-08-quoll-sideview", "lem-09-phascogale-sideview"]);
  assert.ok(sideviews.every(item => item.projectGroupLabelPL === "Widoki boczne"));
  assert.ok(sideviews.every(item => item.projectGroupLabelEN === "Side views"));
  assert.ok(["lem-02-quoll-identity", "lem-03-phascogale-identity", "lem-04-civet-illustration", "lem-06-phascogale-illustration", "lem-07-civet-sideview", "lem-08-quoll-sideview", "lem-10-mongoose-transparent", "lem-14-phascogale-camera"].every(id => lemWorks.find(item => item.id === id)?.galleryVisible === true));
  assert.ok(lemWorks.some(item => item.id === "lem-12-v3-weasel-illustration"));
  assert.ok(!lemWorks.some(item => item.id === "lem-13-v3-weasel-transparent"));
  assert.ok(!lemWorks.some(item => item.id === "lem-16-icon"));
  assert.doesNotMatch(source, /lem-v3-utau-weasel-transparent\.webp|lem-icon-hires\.webp/);
  await assert.rejects(access(path.join(root, "assets/media/lem/lem-v3-utau-weasel-transparent.webp")));
  await assert.rejects(access(path.join(root, "assets/media/lem/lem-icon-hires.webp")));
  await assert.rejects(access(path.join(root, "dist/assets/media/lem/lem-v3-utau-weasel-transparent.webp")));
  await assert.rejects(access(path.join(root, "dist/assets/media/lem/lem-icon-hires.webp")));
  await access(path.join(root, "assets/media/lem/lem-v3-utau-weasel-illustration.webp"));
  const sourceForms = ["lem-v4-utau-civet-transparent.webp", "lem-v4-utau-quoll-transparent.webp", "lem-v4-utau-phascogale-transparent.webp"];
  assert.deepEqual(Array.from(project.cover.items, item => path.basename(item.src)), sourceForms);
  for (const name of sourceForms) await access(path.join(root, "assets/media/lem", name));

  assert.equal(project.hero.src, "assets/media/lem/lem-three-forms-hero.webp");
  assert.equal(project.hero.ratio, "2/1");
  assert.equal(project.hero.mobileRatio, "2/1");
  assert.equal(project.hero.fit, "contain");
  assert.equal(project.hero.noPadding, true);
  assert.equal(project.thumbnail.src, "assets/media/lem/lem-three-forms-thumbnail.webp");
  assert.equal(project.thumbnail.ratio, "4/3");
  assert.equal(project.thumbnail.fit, "contain");
  assert.equal(project.thumbnail.noPadding, true);
  for (const relative of [project.hero.src, project.thumbnail.src]) {
    await access(path.join(root, relative));
    await access(path.join(root, "dist", relative));
  }

  const detail = await read("assets/js/project-detail.js");
  const projectsRenderer = await read("assets/js/projects.js");
  const core = await read("assets/js/core.js");
  const css = await read("assets/css/site.css");
  assert.match(detail, /item\.projectPageVisible !== false/);
  assert.match(detail, /item\.thumbnail \|\| item\.cover/);
  assert.match(projectsRenderer, /project\.thumbnail \|\| project\.cover/);
  assert.match(core, /media\.noPadding === true/);
  assert.match(core, /--mobile-ratio/);
  assert.match(css, /\.media-frame\.is-contain\.no-padding img\s*\{\s*object-fit:\s*contain;\s*padding:\s*0;/);
  assert.match(css, /\.project-cover \.media-frame\s*\{\s*aspect-ratio:\s*var\(--mobile-ratio, 4\/3\) !important;/);
  assert.match(detail, /sequenceUnits/);
  assert.match(detail, /data-project-group/);
  assert.match(detail, /sequence-group-grid/);
});

test("keeps paired copy and every referenced media file in source and dist", async () => {
  const { projects, works, detailMedia } = await loadData();
  const pairedWork = ["titlePL", "titleEN", "summaryPL", "summaryEN", "altPL", "altEN", "captionPL", "captionEN"];
  const media = new Set();
  for (const project of projects) {
    collectMedia(project.cover, media);
    collectMedia(project.hero, media);
    collectMedia(project.thumbnail, media);
  }
  for (const item of detailMedia) collectMedia(item.cover, media);
  for (const item of works) {
    for (const key of ["id", "project", "medium", "types", "mediaType", "cover", "gallery", "video", "featured", "draft", ...pairedWork]) assert.ok(Object.hasOwn(item, key), `${item.id} has ${key}`);
    collectMedia(item.cover, media);
    item.gallery.forEach(asset => collectMedia(asset, media));
    collectMedia(item.video?.poster, media);
  }
  assert.ok(media.size >= 65);
  for (const relative of media) {
    await access(path.join(root, relative));
    await access(path.join(root, "dist", relative));
  }
});

test("uses the real local book-cover mockup without placeholder copy", async () => {
  const { projects, works, source } = await loadData();
  const project = projects.find(item => item.id === "book-cover");
  const work = works.find(item => item.id === "book-cover-2025");
  const expected = "assets/media/book-cover/book-cover-obiedzinski-mockup.webp";
  assert.equal(project.cover.kind, "image");
  assert.equal(project.cover.src, expected);
  assert.equal(work.cover.kind, "image");
  assert.equal(work.cover.src, expected);
  assert.doesNotMatch(work.summaryPL, /zastępcz/i);
  assert.doesNotMatch(work.summaryEN, /placeholder/i);
  assert.doesNotMatch(source, /[A-Z]:[\\/]/);
});

test("builds Lozenge T. with the live Pabaka script and secure project links", async () => {
  const { projects, works } = await loadData();
  const project = projects.find(item => item.id === "lozenge-t");
  const work = works.find(item => item.id === "lozenge-t-pabaka-script");
  const expectedGlyphs = ["p", "b", "k", "g", "s", "z", "ś", "sh", "jh", "h", "j", "w", "ŕ", "d", "t", "zh", "m", "ng", "l", "c", "th", "v", "n", "dh", "x", "f", "nj", "ch", "dz", "r", "a", "ă", "á", "å", "o", "ő", "ỏ", "i", "e", "ë", "è", "ě", "ý", "ù", "ů", "ń"];
  const ligatures = ["ch", "dh", "dz", "jh", "ng", "nj", "sh", "th", "zh"];
  assert.equal(project.titlePL, "Lozenge T.");
  assert.deepEqual(Array.from(project.scriptRows.flat()), expectedGlyphs);
  assert.equal(project.scriptRows.flat().length, 46);
  assert.deepEqual(Array.from(project.scriptRows, row => row.length), [10, 10, 10, 8, 8]);
  assert.deepEqual(Array.from(project.scriptRows.flat().filter(value => ligatures.includes(value)).sort()), Array.from(ligatures).sort());
  assert.equal(work.project, "lozenge-t");
  assert.equal(work.cover.src, "assets/media/lozenge-t/lozenge-t-pabaka-alphabet.webp");
  assert.equal(work.galleryVisible, true);
  assert.deepEqual(Array.from(project.externalLinks, link => link.href), ["https://wik-wav.github.io/lozenge-tessellation/", "https://wik-wav.github.io/lozenge-tessellation/grammar"]);
  const html = await read("projects/lozenge-t/index.html");
  const detail = await read("assets/js/project-detail.js");
  const css = await read("assets/css/site.css");
  assert.match(html, /data-project-script/);
  assert.match(html, /data-project-links/);
  assert.doesNotMatch(html, /data-project-cover/);
  assert.equal(project.thumbnail.src, "assets/media/lozenge-t/lozenge-t-pabaka-alphabet.webp");
  for (const slug of projectSlugs.filter(item => item !== "lozenge-t")) {
    const projectHtml = await read(`projects/${slug}/index.html`);
    assert.match(projectHtml, /data-project-cover/, `${slug} keeps its project hero slot`);
  }
  assert.match(detail, /target="_blank" rel="noopener noreferrer"/);
  assert.match(detail, /pabaka-glyph/);
  assert.match(detail, /desktopColumns = 10/);
  assert.match(detail, /desktopColumns - row\.length/);
  assert.match(detail, /class="pabaka-cell is-empty" aria-hidden="true"/);
  assert.match(css, /\.pabaka-cell\.is-empty\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /\.pabaka-input\s*\{[^}]*font-family:\s*var\(--font-body\);[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*font-style:\s*normal;/s);
  assert.doesNotMatch(css.match(/\.pabaka-input\s*\{[^}]*\}/s)?.[0] || "", /font-weight:\s*(500|600)|var\(--font-mono\)|Asaxi Merriweather/);
});

test("renders precise media-level AI provenance without false labels", async () => {
  const { projects, works, detailMedia } = await loadData();
  const bookProject = projects.find(item => item.id === "book-cover");
  const bookWork = works.find(item => item.id === "book-cover-2025");
  for (const asset of [bookProject.cover, bookProject.hero, bookProject.thumbnail, bookWork.cover]) {
    assert.equal(asset.disclosure.kind, "ai-generated");
    assert.equal(asset.disclosure.shortPL, "Wizualizacja wygenerowana przez AI");
    assert.equal(asset.disclosure.detailEN, "AI-generated visualisation; cover design by Wiktor Sielaszuk.");
  }
  assert.ok(works.filter(item => item.project === "windows-zine").every(item => item.cover.disclosure.kind === "ai-elements"));
  assert.ok(detailMedia.filter(item => item.id.startsWith("windows-zine-mockup")).every(item => item.cover.disclosure.kind === "ai-generated"));
  const zineProject = projects.find(item => item.id === "windows-zine");
  assert.equal(zineProject.hero.disclosure.kind, "ai-generated");
  assert.equal(zineProject.thumbnail.disclosure.kind, "ai-generated");
  for (const id of ["small-design-projects-voice-model-icon", "character-art-01-cami-possum-witch", "dissonance-video"]) {
    assert.equal(works.find(item => item.id === id).cover.disclosure, undefined, `${id} has no false AI media label`);
  }
  const core = await read("assets/js/core.js");
  assert.match(core, /function mediaDisclosure\(media, options = \{\}\)/);
  assert.match(core, /role="note"/);
  assert.match(core, /disclosureMode === "detail"/);
  assert.match(core, /makeMedia, makeVideo, makeWorkMedia/);
  const callSites = (await Promise.all(["assets/js/home.js", "assets/js/portfolio.js", "assets/js/projects.js", "assets/js/project-detail.js"].map(read))).join("\n");
  assert.match(callSites, /P\.makeMedia/);
  assert.match(callSites, /P\.makeWorkMedia/);
  const readme = await read("README.md");
  assert.match(readme, /portfolio provenance convention/i);
  assert.match(readme, /not legal certification/i);
});

test("adds the complete WIN DOWS zine with authored order and retained provenance", async () => {
  const { projects, works, detailMedia } = await loadData();
  const project = projects.find(item => item.id === "windows-zine");
  const zineWorks = works.filter(item => item.project === "windows-zine");
  assert.equal(zineWorks.length, 10);
  assert.equal(project.formatPL, "zin: okładki i osiem rozkładówek");
  assert.equal(project.formatEN, "zine: covers and eight spreads");
  assert.deepEqual(Array.from(zineWorks, item => item.id), Array.from({ length: 10 }, (_, index) => `windows-zine-page-${String(index + 1).padStart(2, "0")}`));
  assert.equal(project.provenance.creationYear, "2023");
  assert.equal(project.statementEN, "Wiktor reflects\non language models\nas if\non language models\ndid his future depend");
  assert.equal(project.detailSequenceIds.length, 13);
  assert.equal(detailMedia.filter(item => item.id.startsWith("windows-zine-mockup")).length, 3);
  assert.ok(zineWorks.every(item => item.types.includes("editorial") && item.types.includes("scanography")));
  assert.equal(zineWorks[0].cover.ratio, "7/10");
  assert.equal(zineWorks.at(-1).cover.ratio, "7/10");
  assert.match(zineWorks[0].summaryPL, /Przednia okładka/);
  assert.match(zineWorks.at(-1).summaryEN, /back cover/i);
  assert.ok(zineWorks.slice(1, 9).every(item => item.summaryPL.startsWith("Rozkładówka") && item.summaryEN.startsWith("A zine spread")));
  assert.doesNotMatch(zineWorks.slice(1, 9).map(item => `${item.summaryPL} ${item.summaryEN}`).join(" "), /\bpage\b|strona/i);
  for (let index = 1; index < 9; index += 1) assert.equal(zineWorks[index].cover.ratio, "10/7");
});

test("adds factual cover singles and secure descriptive Spotify links", async () => {
  const { projects, works } = await loadData();
  const project = projects.find(item => item.id === "cover-art");
  const covers = works.filter(item => item.project === "cover-art");
  assert.equal(covers.length, 3);
  assert.equal(project.yearPL, "");
  assert.equal(project.yearEN, "");
  assert.equal(project.processPL, "Każda okładka została opracowana jako samodzielna kompozycja, z naciskiem na kolor, rytm i czytelność w kwadratowym formacie.");
  assert.equal(project.processEN, "Each cover was developed as a self-contained composition, emphasising colour, rhythm, and legibility in a square format.");
  assert.ok(covers.every(item => item.types.includes("cover-art") && item.types.includes("design")));
  assert.equal(covers[0].year, null);
  assert.equal(covers[0].summaryPL, "Autorska abstrakcyjna kompozycja okładkowa.");
  assert.equal(covers[0].summaryEN, "An original abstract cover composition.");
  assert.equal(covers[1].date, "2022-09-24");
  assert.equal(covers[2].date, "2022-07-26");
  assert.ok(covers.slice(1).every(item => item.types.includes("music")));
  const hrefs = covers.flatMap(item => item.externalLinks || []).map(link => link.href);
  assert.deepEqual(Array.from(hrefs), ["https://open.spotify.com/album/01y2kSzgnhLctTaBA8YrzY", "https://open.spotify.com/album/7l4DnDaDdpZSWTMJzULw52"]);
  assert.ok(covers.slice(1).every(item => /singla/.test(item.summaryPL) && /single/.test(item.summaryEN)));
  const renderers = (await Promise.all(["assets/js/project-detail.js", "assets/js/portfolio.js"].map(read))).join("\n");
  assert.match(renderers, /target="_blank" rel="noopener noreferrer"/);
});

test("keeps the small-design collection concise and the icon unlabelled as generated media", async () => {
  const { projects, works, source } = await loadData();
  const project = projects.find(item => item.id === "small-design-projects");
  const item = works.find(work => work.id === "small-design-projects-voice-model-icon");
  const expectedPL = "Geometryczny portret w błękicie i różu na niebiesko-magentowym tle, z ciemnym zakrzywionym motywem.";
  const expectedEN = "Geometric portrait in cyan and pink on a blue-and-magenta background, with a dark curved motif.";
  assert.equal(project.yearPL, "");
  assert.equal(item.year, null);
  assert.deepEqual(Array.from(item.types), ["design", "icon-design", "commissioned", "voice-model"]);
  assert.equal(item.cover.disclosure, undefined);
  assert.equal(item.cover.src, "assets/media/small-design-projects/voice-model-icon.webp");
  assert.equal(project.cover.altPL, expectedPL);
  assert.equal(project.cover.altEN, expectedEN);
  assert.equal(item.cover.altPL, expectedPL);
  assert.equal(item.cover.altEN, expectedEN);
  assert.equal(item.altPL, expectedPL);
  assert.equal(item.altEN, expectedEN);
  assert.doesNotMatch(`${item.altPL} ${item.altEN}`, /\bJZ\b/);
  assert.equal(project.titlePL, "Mniejsze projekty");
  assert.equal(project.titleEN, "Small Design Projects");
  assert.equal(item.titlePL, "Ikona modelu głosowego");
  assert.equal(item.titleEN, "Voice Model Icon");
  assert.equal(item.summaryEN, "A commissioned icon designed for an AI voice model.");
  const retiredClient = "Oli" + "wier";
  assert.ok(!source.includes(retiredClient));
  await assert.rejects(access(path.join(root, "projects", "oli" + "wier-ziembla-icon")));
  await assert.rejects(access(path.join(root, "assets/media", "oli" + "wier-ziembla-icon")));
});

test("models Character Art as one collection without duplicate media records", async () => {
  const { projects, works } = await loadData();
  const project = projects.find(item => item.id === "character-art");
  const characterWorks = works.filter(item => item.collections?.includes("character-art"));
  assert.equal(characterWorks.length, 10);
  assert.equal(new Set(characterWorks.map(item => item.id)).size, 10);
  assert.equal(new Set(characterWorks.map(item => item.cover.src)).size, 10);
  assert.equal(characterWorks.filter(item => item.project === "lem").length, 4);
  assert.equal(characterWorks.at(-1).medium, "traditional");
  assert.ok(characterWorks.slice(0, 9).every(item => item.medium === "digital"));
  assert.ok(characterWorks.slice(6, 9).every(item => item.types.includes("character-design")));
  assert.ok(characterWorks.filter(item => ["character-art-07-cami-reference-sheet", "character-art-08-lem-wardrobe-turnaround", "character-art-09-lem-base-turnaround"].includes(item.id)).every(item => item.cover.fit === "contain"));
  assert.equal(project.rolePL, "ilustracja i opracowanie plansz");
  assert.equal(project.titlePL, "Postaci - ilustracje");
  assert.equal(project.titleEN, "Character Art");
  assert.equal(project.roleEN, "illustration and reference-sheet development");
  assert.equal(project.creditsPL, "Ilustracje i opracowanie plansz: Wiktor Sielaszuk.");
  assert.equal(project.creditsEN, "Illustrations and reference-sheet development: Wiktor Sielaszuk.");
  const sleeping = characterWorks.find(item => item.id === "character-art-10-lem-sleeping");
  assert.equal(sleeping.altPL, "Monochromatyczna ilustracja tuszem i lawowaniem: skulona, śpiąca antropomorficzna postać obejmuje nogi obok kwiatu.");
  assert.equal(sleeping.altEN, "Monochrome ink-and-wash illustration of a curled, sleeping anthropomorphic figure holding their legs beside a flower.");
  assert.equal(sleeping.cover.altPL, sleeping.altPL);
  assert.equal(sleeping.cover.altEN, sleeping.altEN);
  const portfolio = await read("assets/js/portfolio.js");
  const html = await read("portfolio/index.html");
  assert.match(portfolio, /params\.get\("collection"\)/);
  assert.match(portfolio, /item\.collections\?\.includes\(activeCollection\)/);
  assert.match(html, /data-character-art-shortcut/);
  assert.match(html, /data-pl="Postaci - ilustracje" data-en="Character Art"/);
  const core = await read("assets/js/core.js");
  assert.match(core, /"character-art": \["Postaci - ilustracje", "Character Art"\]/);
});

test("adds one safe Dissonance video with still sequence, warning, and fallback", async () => {
  const { projects, works, detailMedia } = await loadData();
  const project = projects.find(item => item.id === "dissonance-perspective");
  const videos = works.filter(item => item.project === "dissonance-perspective");
  assert.equal(videos.length, 1);
  assert.equal(videos[0].video.id, "jRYRyH9USNQ");
  assert.equal(videos[0].author, "wik_wav");
  assert.equal(project.sourceVideo.duration, "02:21.79");
  assert.equal(project.sourceVideo.fps, 24);
  assert.equal(project.formatPL, "wideo 1920 × 1080, 2:22");
  assert.equal(project.formatEN, "1920 × 1080 video, 2:22");
  assert.equal(detailMedia.filter(item => item.id.startsWith("dissonance-still")).length, 3);
  assert.equal(project.detailSequenceIds.length, 4);
  assert.equal(videos[0].videoWarningPL, "Ostrzeżenie: film zawiera szybko migające światła i efekty stroboskopowe.");
  const core = await read("assets/js/core.js");
  assert.match(core, /video-warning/);
  assert.match(core, /youtube-nocookie\.com/);
  assert.match(core, /https:\/\/www\.youtube\.com\/watch\?v=jRYRyH9USNQ|externalUrl/);
  assert.doesNotMatch(core, /autoplay/);
});

test("allows only the two verified privacy-enhanced YouTube videos", async () => {
  const { works } = await loadData();
  const videos = works.filter(item => item.video?.provider || item.video?.id);
  assert.equal(videos.length, 2);
  assert.deepEqual(Array.from(videos, item => [item.video.provider, item.video.id]), [["youtube", "0qHNBdlIDoA"], ["youtube", "jRYRyH9USNQ"]]);

  const core = await read("assets/js/core.js");
  assert.match(core, /youtube-nocookie\.com\/embed/);
  assert.match(core, /video\.provider === "youtube"/);
  assert.match(core, /video\.provider === "vimeo"/);
  assert.doesNotMatch(core, /autoplay/i);
});

test("removes retired routes and visitor-irrelevant copy", async () => {
  const retired = ["exhi" + "bitions", "coper" + "nicus", "ide" + "ami", "voice-" + "synthesis"];
  const sourceFiles = ["index.html", "portfolio/index.html", "projects/index.html", "assets/js/data.js", "assets/js/core.js", "assets/js/home.js", "assets/js/projects.js", "assets/js/project-detail.js", "assets/js/portfolio.js"];
  const source = (await Promise.all(sourceFiles.map(read))).join("\n").toLowerCase();
  for (const value of retired) assert.ok(!source.includes(value), `${value} is absent from public source`);
  await assert.rejects(access(path.join(root, "projects", retired[0])));
  await assert.rejects(access(path.join(root, "projects", retired[3])));

  for (const phrase of ["profesjonalne portfolio", "treści sfw", "dane kontaktowe do uzupełnienia", "ręcznie układaną narrację", "future video id"]) assert.ok(!source.includes(phrase));
  assert.match(source, /wiktor\.sielaszuk\.22@gmail\.com/);
  assert.match(source, /linkedin\.com\/in\/wiktor-sielaszuk/);
});

test("keeps URL-backed AND/OR filters, hidden drafts, and accessible lightbox controls", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  assert.match(portfolio, /const facetKeys = \["project", "year", "medium", "type"\]/);
  assert.match(portfolio, /new URLSearchParams\(location\.search\)/);
  assert.match(portfolio, /params\.append\(key, value\)/);
  assert.match(portfolio, /projectMatch && yearMatch && mediumMatch && typeMatch/);
  assert.match(portfolio, /item\.types\.some\(type => selected\.type\.has\(type\)\)/);
  assert.match(portfolio, /!item\.draft && item\.galleryVisible !== false/);
  assert.match(portfolio, /event\.key === "Escape"/);
  assert.match(portfolio, /event\.key === "ArrowLeft"/);
  assert.match(portfolio, /event\.key === "ArrowRight"/);
  assert.match(portfolio, /event\.key === "Tab"/);
});

test("uses uniform auto-fill gallery tracks without nth-child sizing or offsets", async () => {
  const css = await read("assets/css/site.css");
  assert.match(css, /\.gallery-grid\s*\{[^}]*repeat\(auto-fill,[^}]*--card-min/s);
  assert.match(css, /\.gallery-grid\[data-size=/);
  assert.match(css, /\.gallery-grid \.work-card\s*\{[^}]*grid-column:\s*auto;[^}]*margin-top:\s*0;[^}]*min-width:\s*0;/s);
  assert.doesNotMatch(css, /\.gallery-grid[^\{]*nth-child/);
  assert.doesNotMatch(css, /\.gallery-grid \.work-card[^}]*!important/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.gallery-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("adds paired display controls and pagination to both archive views", async () => {
  const portfolioHtml = await read("portfolio/index.html");
  const projectsHtml = await read("projects/index.html");
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  for (const html of [portfolioHtml, projectsHtml]) {
    assert.match(html, /data-display-controls/);
    assert.match(html, /data-pagination/);
  }
  for (const source of [portfolio, projects]) {
    assert.match(source, /<fieldset class="size-control">/);
    assert.match(source, /type="radio"/);
    assert.match(source, /<select name=/);
    assert.match(source, /Małe/);
    assert.match(source, /Small/);
    assert.match(source, /Średnie/);
    assert.match(source, /Medium/);
    assert.match(source, /Duże/);
    assert.match(source, /Large/);
    assert.match(source, /aria-live="polite"/);
  }
  assert.match(await read("assets/js/core.js"), /aria-current="page"/);
  assert.match(portfolio, /Prace na stronie/);
  assert.match(portfolio, /Works per page/);
  assert.match(projects, /Projekty na stronie/);
  assert.match(projects, /Projects per page/);
});

test("validates size, per, and page state with query precedence and popstate", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  assert.match(portfolio, /const sizeValues = \["small", "medium", "large"\]/);
  assert.match(portfolio, /const perValues = \[6, 12, 24\]/);
  assert.match(projects, /const perValues = \[3, 6, 12\]/);
  for (const source of [portfolio, projects]) {
    assert.match(source, /params\.has\("size"\)/);
    assert.match(source, /params\.has\("per"\)/);
    assert.match(source, /positivePage/);
    assert.match(source, /Math\.min\(display\.page, totalPages|Math\.min\(display\.page, pages/);
    assert.match(source, /window\.addEventListener\("popstate"/);
    assert.match(source, /localStorage\.setItem/);
    assert.match(source, /new URLSearchParams\(location\.search\)/);
  }
});

test("preserves focus and uses push history only for explicit pagination", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  for (const source of [portfolio, projects]) {
    assert.match(source, /function restoreFocus\(selector\)/);
    assert.match(source, /queueMicrotask\(\(\) => document\.querySelector\(selector\)\?\.focus\(\{ preventScroll: true \}\)\)/);
    assert.match(source, /data-pagination-range tabindex="-1" aria-live="polite"/);
    assert.match(source, /history\[mode === "push" \? "pushState" : "replaceState"\]/);
    assert.match(source, /historyMode: "push", focusTarget: "\[data-pagination-range\]"/);
    assert.match(source, /popstate[\s\S]*?sync: false, focusTarget: "\[data-pagination-range\]"/);
  }
  assert.match(portfolio, /focusTarget: `input\[name="work-size"\]\[value="\$\{display\.size\}"\]`/);
  assert.match(portfolio, /focusTarget: "select\[name=\\"work-per\\"\]"/);
  assert.match(projects, /focusTarget: `input\[name="project-size"\]\[value="\$\{display\.size\}"\]`/);
  assert.match(projects, /focusTarget: "select\[name=\\"project-per\\"\]"/);
});

test("restores filter focus after checkbox and clear actions", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const html = await read("portfolio/index.html");
  assert.match(portfolio, /function selectorValue\(value\)/);
  assert.match(portfolio, /const focusTarget = `input\[name="\$\{selectorValue\(input\.name\)\}"\]\[value="\$\{selectorValue\(input\.value\)\}"\]`/);
  assert.match(portfolio, /update\(\{ resetPage: true, focusTarget \}\)/);
  assert.match(portfolio, /openFacet = null;\s*update\(\{ resetPage: true, focusTarget: "\[data-clear-filters\]" \}\)/);
  assert.match(portfolio, /openFacet = null;\s*update\(\{ resetPage: true, focusTarget: "\[data-result-count\]" \}\)/);
  assert.match(html, /data-result-count tabindex="-1" aria-live="polite"/);
});

test("does not push history when the current numbered page is clicked", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  for (const source of [portfolio, projects]) {
    assert.match(source, /const targetPage = positivePage\(button\.dataset\.page\);\s*if \(targetPage === display\.page\) return;\s*display\.page = targetPage;/);
    assert.match(source, /display\.page = targetPage;\s*(?:update|render)\(\{ historyMode: "push", focusTarget: "\[data-pagination-range\]" \}\)/);
  }
});

test("carries only shared size between Portfolio and Projects", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  assert.match(portfolio, /`\.\.\/projects\/index\.html\?size=\$\{display\.size\}`/);
  assert.match(projects, /`\.\.\/portfolio\/index\.html\?size=\$\{display\.size\}`/);
  assert.doesNotMatch(portfolio, /projects\/index\.html\?size=[^`]*&per=/);
  assert.doesNotMatch(projects, /portfolio\/index\.html\?size=[^`]*&per=/);
  assert.match(portfolio, /portfolio:works:per/);
  assert.match(projects, /portfolio:projects:per/);
});

test("paginates 61 public works and eleven projects at the requested defaults", async () => {
  const { projects, works } = await loadData();
  const publicWorks = works.filter(item => !item.draft && item.galleryVisible !== false);
  assert.equal(works.length, 61);
  assert.ok(works.every(item => !item.draft && item.galleryVisible === true));
  assert.equal(publicWorks.length, 61);
  assert.equal(Math.ceil(publicWorks.length / 12), 6);
  assert.equal(publicWorks.slice(60, 72).length, 1);
  assert.equal(projects.length, 11);
  assert.equal(Math.ceil(projects.length / 3), 4);
});

test("resets pages on filtering or per-page changes while preserving repeated facets", async () => {
  const portfolio = await read("assets/js/portfolio.js");
  const projects = await read("assets/js/projects.js");
  assert.match(portfolio, /params\.delete\(key\);[\s\S]*?params\.append\(key, value\)/);
  assert.match(portfolio, /update\(\{ resetPage: true, focusTarget/);
  assert.match(portfolio, /if \(resetPage\) display\.page = 1/);
  assert.match(portfolio, /event\.target\.name === "work-per"[\s\S]*?display\.page = 1/);
  assert.match(projects, /event\.target\.name === "project-per"[\s\S]*?display\.page = 1/);
  assert.match(portfolio, /name === "work-size"[\s\S]*?focusTarget/);
  assert.match(projects, /name === "project-size"[\s\S]*?focusTarget/);
  assert.match(portfolio, /data-projects-mode-link/);
  assert.match(projects, /data-works-mode-link/);
});

test("hardens responsive rows, related cards, groups, and controls", async () => {
  const css = await read("assets/css/site.css");
  assert.doesNotMatch(css, /body\s*\{[^}]*min-width:\s*320px/);
  assert.match(css, /\.project-row > \*, \.project-row-title, \.project-row-copy\s*\{\s*min-width:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.related-grid\s*\{\s*grid-template-columns:\s*repeat\(2/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.related-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.project-row-title\s*\{\s*grid-column:\s*2;/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.project-row-copy\s*\{\s*grid-column:\s*2 \/ 4;/);
  assert.match(css, /\.sequence-group-grid\s*\{[^}]*repeat\(3/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.sequence-group-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /\.pagination-nav button\s*\{[^}]*min-height:\s*44px/);
  assert.doesNotMatch(css, /44px 140px minmax\(190px/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.wordmark span:last-child\s*\{\s*display:\s*none/);
  assert.match(css, /\.size-control\s*\{[^}]*min-inline-size:\s*0/);
  assert.match(css, /\.portfolio-head > \*[^}]*min-width:\s*0/);
  assert.match(css, /\.mode-tabs\s*\{[^}]*max-width:\s*100%[^}]*min-width:\s*0/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.gallery-grid \.work-card\s*\{[^}]*width:\s*min\(100%, var\(--card-min\)\)/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.gallery-grid\[data-size="large"\] \.work-card\s*\{\s*width:\s*100%/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.project-row-cover\s*\{[^}]*width:\s*min\(100%, var\(--project-cover\)\)/);
  assert.match(css, /\.filter-group\s*\{\s*position:\s*relative;\s*\}/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.filter-menu\s*\{[^}]*position:\s*static/);
  assert.doesNotMatch(css, /overflow-x:\s*(?:hidden|clip)/);
});

test("stabilises portfolio headings across responsive layouts", async () => {
  const home = await read("index.html");
  const allWork = await read("portfolio/index.html");
  const projects = await read("projects/index.html");
  const css = await read("assets/css/site.css");
  assert.match(allWork, /Wybrane prace z filtrowaniem według projektu, roku, medium i typu\./);
  assert.match(projects, /Wybrane projekty z opisami założeń, procesu, roli i użytych mediów\./);
  assert.match(css, /\.portfolio-head[^}]*align-items:\s*start/);
  assert.match(css, /\.portfolio-head > \.lead[^}]*min-height:/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.portfolio-head > \.lead \{ min-height: 0;/);
  assert.match(home, /Synteza wokalna, zbiory danych, system Lem i projektowanie postaci\./);
  assert.match(home, /Vocal synthesis, datasets, the Lem system, and character design\./);
});

test("uses only relative local page and asset references", async () => {
  for (const page of pages) {
    const html = await read(page);
    const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1]);
    for (const ref of refs) {
      if (ref.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;
      const clean = ref.split(/[?#]/, 1)[0];
      const resolved = path.resolve(path.dirname(path.join(root, page)), clean);
      assert.ok(resolved.startsWith(root), `${page}: ${ref} stays inside the project`);
      await access(resolved);
    }
  }
  const publicCode = (await Promise.all(["assets/js/data.js", "assets/js/core.js", ...pages].map(read))).join("\n");
  assert.doesNotMatch(publicCode, /[A-Z]:[\\/]/);
});

test("keeps retired identifiers out of the production output", async () => {
  const retired = ["exhi" + "bitions", "coper" + "nicus", "ide" + "ami", "voice-" + "synthesis"];
  async function walk(dir) {
    const found = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...await walk(full));
      else if (/\.(?:html|js|css)$/i.test(entry.name)) found.push(full);
    }
    return found;
  }
  const built = (await Promise.all((await walk(path.join(root, "dist"))).map(file => readFile(file, "utf8")))).join("\n").toLowerCase();
  for (const value of retired) assert.ok(!built.includes(value), `${value} is absent from dist`);
  for (const value of ["projects/" + "asaxi/", 'data-project="' + 'asaxi"', 'id: "' + 'asaxi"', "oli" + "wier-ziembla", "oli" + "wier ziembla"]) assert.ok(!built.includes(value), `${value} is absent from dist`);
  const genericPL = "Metoda i " + "odpowiedzialność.";
  const genericEN = "Method and " + "responsibility.";
  assert.ok(!built.includes(genericPL.toLowerCase()));
  assert.ok(!built.includes(genericEN.toLowerCase()));
  const publicSource = (await Promise.all(["assets/js/data.js", "assets/js/core.js", "assets/js/project-detail.js", "assets/css/site.css", "README.md", ...pages].map(read))).join("\n");
  assert.ok(!publicSource.includes(genericPL));
  assert.ok(!publicSource.includes(genericEN));
  await assert.rejects(access(path.join(root, "dist/projects", "asaxi")));
  await assert.rejects(access(path.join(root, "dist/projects", "oli" + "wier-ziembla-icon")));
  await assert.rejects(access(path.join(root, "dist/assets/media", "oli" + "wier-ziembla-icon")));
});
