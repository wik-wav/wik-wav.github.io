import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  archiveRecordPath, loadContent, readArchivedRecords, recordPath, referencesFor, runtimeRecord, uniqueId, validateContent
} from "../scripts/lib/content-store.mjs";
import { compileRuntimeData, generateSite } from "../scripts/lib/generate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const clone = value => structuredClone(value);

test("migrated JSON is the valid source of truth", async () => {
  const bundle = await loadContent(root);
  const result = await validateContent(bundle, { root });
  assert.equal(result.valid, true);
  assert.equal(result.counts.projects, bundle.projects.length);
  assert.equal(result.counts.collections, bundle.collections.length);
  assert.equal(result.counts.works, bundle.works.length);
  assert.equal(result.counts.updates, bundle.updates.length);
  assert.ok(result.counts.media > 0);
  const registered = new Set(bundle.registry.published.map(entry => `${entry.recordType}:${entry.id}`));
  for (const record of [...bundle.projects, ...bundle.collections, ...bundle.works, ...bundle.updates].filter(item => item.published === true)) {
    assert.ok(registered.has(`${record.recordType}:${record.id}`), `${record.recordType}/${record.id} is registered`);
  }
});

test("draft translation gaps are warnings while published gaps are errors", async () => {
  const bundle = await loadContent(root);
  const draft = clone(bundle.works[0]);
  draft.id = "translation-test-draft";
  draft.published = false;
  draft.draft = true;
  draft.order = 9999;
  draft.titleEN = "";
  bundle.works.push(draft);
  let result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.valid,true);
  assert.ok(result.warnings.some(issue => issue.code === "missing-translation"));
  draft.draft = false;
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(issue => issue.code === "missing-translation"));
});

test("activity updates validate as first-class bilingual block records", async () => {
  const bundle = await loadContent(root);
  const update = {
    schemaVersion:1, recordType:"update", id:"activity-model-test", order:1,
    published:false, draft:true, date:"2026-08-12",
    titlePL:"Aktualizacja", titleEN:"Update", summaryPL:"Podsumowanie.", summaryEN:"Summary.",
    types:["publication"], projectIds:[bundle.projects[0].id],
    blocks:[
      {id:"text-1",kind:"text",headingPL:"Nagłówek",headingEN:"Heading",bodyPL:"Treść.",bodyEN:"Body."},
      {id:"link-2",kind:"link",labelPL:"Czytaj",labelEN:"Read",href:"https://example.com"}
    ]
  };
  bundle.updates.push(update);
  let result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.valid,true);
  assert.equal(compileRuntimeData(bundle,{includeDrafts:true}).updates[0].id,"activity-model-test");
  update.blocks[0].bodyEN = "";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.warnings.some(issue => issue.path.endsWith("blocks[0].bodyEN")));
  update.draft = false;
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.path.endsWith("blocks[0].bodyEN")));
});

test("validation rejects unsafe fields, invalid URLs, ratios, focal points and media paths", async () => {
  const bundle = await loadContent(root);
  const work = bundle.works[0];
  work.cover.ratio = "0/0";
  work.cover.focalPoint = { x:1.001,y:.5 };
  work.cover.src = "../private.png";
  work.cover.hasTransparency = "yes";
  work.cover.mobileRatio = "0/2";
  work.externalLinks = [{labelPL:"Bad",labelEN:"Bad",href:"javascript:alert(1)"}];
  work.embedHtml = "<iframe>";
  const result = await validateContent(bundle,{root,checkFiles:false});
  for (const code of ["invalid-ratio","invalid-focal-point","invalid-media-path","invalid-link","invalid-transparency","unsafe-field"]) assert.ok(result.errors.some(issue => issue.code === code),code);
});

test("profile social links are bilingual HTTPS records with a deliberate empty-state and legacy fallback", async () => {
  const bundle = await loadContent(root);
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,true);
  assert.deepEqual(bundle.site.profile.socialLinks.map(link => link.id),["linkedin","github","youtube","bandcamp"]);

  bundle.site.profile.socialLinks = [];
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,true);

  delete bundle.site.profile.socialLinks;
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,true);

  bundle.site.profile.socialLinks = [
    { id:"social",labelPL:"Społeczność",labelEN:"Social",href:"http://example.com" },
    { id:"social",labelPL:"Drugi",labelEN:"Second",href:"https://user:pass@example.com" }
  ];
  const invalid = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(invalid.errors.some(issue => issue.code === "invalid-social-link"));
  assert.ok(invalid.errors.some(issue => issue.code === "duplicate-social-link-id"));
});

test("locks the public canonical identity against accidental Studio or content edits", async () => {
  const bundle = await loadContent(root);
  bundle.site.origin = "https://portfolio-copy.example";
  const result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "canonical-origin-mismatch"));

  const app = await readFile(path.join(root,"studio/ui/app.js"),"utf8");
  const schema = JSON.parse(await readFile(path.join(root,"content/schemas/site.schema.json"),"utf8"));
  assert.match(app,/field\("origin","Canonical public origin · locked",record\.origin,\{readonly:true\}\)/);
  assert.equal(schema.properties.origin.const,"https://wik-wav.github.io");
});

test("embed allowlist accepts SoundCloud and Bandcamp while rejecting lookalike hosts", async () => {
  const bundle = await loadContent(root);
  const work = bundle.works[0];
  work.mediaType = "video";
  work.video = { provider:"soundcloud",url:"https://soundcloud.com/artist/track",poster:clone(work.cover),transcriptPL:"Bez mowy.",transcriptEN:"No speech." };
  let result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.valid,true);
  work.video.url = "https://soundcloud.com.example.org/artist/track";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "invalid-soundcloud-url"));
  work.video.url = "https://soundcloud.com/artist/track";
  work.mediaType = "image";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "video-config-on-image"));
  work.mediaType = "video";
  work.video = { provider:"bandcamp",id:"2617205445",bandcampType:"album",embedSize:"expanded",url:"https://wik-wav.bandcamp.com/album/gaijin-no-iroirona-k-s",poster:clone(work.cover) };
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.valid,true);
  work.video.url = "https://wik-wav.bandcamp.com.example.org/album/gaijin-no-iroirona-k-s";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "invalid-bandcamp-url"));
  work.video.url = "https://wik-wav.bandcamp.com/track/gaijin-no-iroirona-k-s";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "bandcamp-type-mismatch"));
  work.video.url = "https://wik-wav.bandcamp.com/album/gaijin-no-iroirona-k-s";
  work.video.embedSize = "enormous";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "invalid-audio-embed-size"));
});

test("work tags are unique lowercase kebab-case identifiers", async () => {
  const bundle = await loadContent(root);
  bundle.works[0].types = ["valid-tag","valid-tag","Not valid"];
  const result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "duplicate-tag"));
  assert.ok(result.errors.some(issue => issue.code === "invalid-tag"));
});

test("reference graph protects ownership, related routes, collections and sequences", async () => {
  const bundle = await loadContent(root);
  const lemRefs = referencesFor(bundle,"project","lem");
  assert.ok(lemRefs.some(reference => reference.type === "work" && reference.field === "project"));
  assert.ok(lemRefs.some(reference => reference.field === "related"));
  const workId = bundle.projects.find(item => item.id === "latentne").detailSequenceIds[0];
  assert.ok(referencesFor(bundle,"work",workId).some(reference => reference.id === "latentne" && ["detailSequence","detailSequenceIds"].includes(reference.field)));
});

test("mixed project sequences validate text blocks and stable Show more boundaries", async () => {
  const bundle = await loadContent(root);
  const route = bundle.projects.find(item => item.id === "latentne");
  const workId = route.detailSequenceIds[0];
  route.detailSequence = [
    { id:"text-context",kind:"text",headingPL:"Kontekst",headingEN:"Context",bodyPL:"Opis poniższej pracy.",bodyEN:"Description of the work below." },
    { id:`work-${workId}`,kind:"work",workId }
  ];
  route.detailSequenceIds = [workId];
  route.sequenceReveal = { enabled:true,afterId:"text-context",peekHeight:"compact" };
  let result = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(result.errors.length,0,JSON.stringify(result.errors,null,2));
  route.sequenceReveal.afterId = `work-${workId}`;
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "empty-sequence-reveal-tail"));
  route.sequenceReveal.afterId = "text-context";
  route.detailSequence[0].bodyEN = "";
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "missing-translation"));
});

test("validation rejects duplicate, foreign, and draft sequence members", async () => {
  const bundle = await loadContent(root);
  const route = bundle.projects.find(item => item.id === "latentne");
  const ownWork = route.detailSequenceIds[0];
  const foreignWork = bundle.works.find(item => item.project !== route.id && !(item.collections || []).includes(route.id));
  route.detailSequenceIds = [ownWork, ownWork, foreignWork.id];
  let result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "duplicate-reference"));
  assert.ok(result.errors.some(issue => issue.code === "foreign-sequence-work"));
  route.detailSequenceIds = [ownWork];
  bundle.works.find(item => item.id === ownWork).draft = true;
  result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "unpublished-sequence-work"));
});

test("public routes reject unpublished references and require complete SEO", async () => {
  const bundle = await loadContent(root);
  const route = bundle.projects.find(item => item.id === "latentne");
  const related = bundle.projects.find(item => item.id === route.related[0]) || bundle.collections.find(item => item.id === route.related[0]);
  related.draft = true;
  route.seo.imageAltEN = "";
  const result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "unpublished-reference"));
  assert.ok(result.errors.some(issue => issue.code === "missing-translation" && issue.path.includes("seo.imageAltEN")));
});

test("shared route ordering and published-ID registry are unambiguous", async () => {
  const bundle = await loadContent(root);
  bundle.collections[0].order = bundle.projects[0].order;
  bundle.registry.published.push(clone(bundle.registry.published[0]));
  const result = await validateContent(bundle,{root,checkFiles:false});
  assert.ok(result.errors.some(issue => issue.code === "duplicate-container-order"));
  assert.ok(result.errors.some(issue => issue.code === "duplicate-registry-entry"));
});

test("stable paths and duplicate IDs cannot escape the content tree", async () => {
  const bundle = await loadContent(root);
  assert.throws(() => recordPath("work","../escape",root));
  assert.equal(await uniqueId("Latentne",bundle),"latentne-2");
  assert.equal(await uniqueId("A brand new work",bundle),"a-brand-new-work");
  bundle.registry.published.push({recordType:"work",id:"retired-address"});
  assert.equal(await uniqueId("Retired address",bundle),"retired-address-2");
  const managed = {schemaVersion:1,recordType:"work",order:1,published:true,seo:{},detailOnly:false,id:"x",titlePL:"X"};
  assert.deepEqual(runtimeRecord(managed),{id:"x",titlePL:"X"});
});

test("archived IDs stay reserved until their archive JSON is purged", async t => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(),"portfolio-archive-test-"));
  t.after(() => rm(temporaryRoot,{recursive:true,force:true}));
  const archiveDirectory = path.join(temporaryRoot,"content","_archive","works");
  await mkdir(archiveDirectory,{recursive:true});
  const archived = {schemaVersion:1,recordType:"work",id:"retired-draft",order:1,published:false,draft:true,titlePL:"Retired",titleEN:"Retired",types:[]};
  await writeFile(path.join(archiveDirectory,"retired-draft.json"),JSON.stringify(archived),"utf8");
  assert.throws(() => archiveRecordPath("work","../escape",temporaryRoot));
  assert.equal((await readArchivedRecords("work",temporaryRoot))[0].id,"retired-draft");
  const bundle = {projects:[],collections:[],works:[],registry:{published:[]}};
  assert.equal(await uniqueId("Retired draft",bundle,{root:temporaryRoot}),"retired-draft-2");
  await rm(archiveRecordPath("work","retired-draft",temporaryRoot));
  assert.equal(await uniqueId("Retired draft",bundle,{root:temporaryRoot}),"retired-draft");
});

test("generator is deterministic and preserves the existing runtime contract", async () => {
  const bundle = await loadContent(root);
  const runtime = compileRuntimeData(bundle);
  assert.equal(runtime.projects.length,11);
  assert.deepEqual(runtime.collectionIds,bundle.collections.filter(item => item.published && !item.draft).sort((a,b)=>a.order-b.order).map(item=>item.id));
  assert.equal(runtime.works.length,bundle.works.filter(item => !item.detailOnly && item.published === true && item.draft !== true).length);
  assert.equal(runtime.detailMedia.length,bundle.works.filter(item => item.detailOnly && item.published === true && item.draft !== true).length);
  const previewRuntime = compileRuntimeData({ ...bundle, works:[...bundle.works, { ...clone(bundle.works[0]), id:"private-draft-preview", order:9999, draft:true, published:false }] }, { includeDrafts:true });
  assert.ok(previewRuntime.works.some(item => item.id === "private-draft-preview" && item.draft === false));
  assert.deepEqual(runtime.projects.map(item => item.id),[...bundle.projects,...bundle.collections].sort((a,b)=>a.order-b.order).map(item=>item.id));
  const result = await generateSite(bundle,{root,check:true});
  assert.equal(result.drift.length,0);
});

test("Studio is loopback-only, token protected and limits deletion to confirmed archived work JSON", async () => {
  const server = await readFile(path.join(root,"studio/server.mjs"),"utf8");
  const validator = await readFile(path.join(root,"scripts/validate-content.mjs"),"utf8");
  assert.match(server,/const HOST = "127\.0\.0\.1"/);
  assert.match(server,/X-Studio-Token/i);
  assert.match(server,/request\.headers\.origin !== STUDIO_ORIGIN/);
  assert.match(server,/frame-ancestors 'none'/);
  assert.equal((server.match(/request\.method === "DELETE"/g) || []).length,1);
  assert.match(server,/\/api\\\/archives\\\/works\\\/\(\[a-z0-9-\]\+\)/);
  assert.match(server,/confirmId !== id/);
  assert.match(server,/expectedRevision !== revision\(record\)/);
  assert.match(server,/archiveRecordPath\("work", id\)/);
  assert.match(server,/!info\.isFile\(\) \|\| info\.isSymbolicLink\(\)/);
  const purge = server.match(/async function deleteArchivedWork[\s\S]*?\n}/)?.[0] || "";
  assert.doesNotMatch(purge,/registry|assets[\\/]media|recursive:\s*true/);
  assert.doesNotMatch(server,/git (?:add|commit|push)/i);
  assert.match(server,/build:site/);
  assert.doesNotMatch(server,/!validation\.valid \|\| validation\.warnings\.length/);
  assert.match(server,/An archive with this stable ID already exists/);
  assert.match(server,/existingSlots\[index\]/);
  assert.match(server,/generateSite\(bundle, \{ preview: true \}\)/);
  assert.doesNotMatch(validator,/warnings\.length/);
});

test("media imports use argument arrays, preserve external masters, and apply the fixed WebP recipe", async () => {
  const media = await readFile(path.join(root,"scripts/lib/media.mjs"),"utf8");
  for (const marker of ['"-auto-orient"','"-colorspace", "sRGB"','"-resize", "2400x2400>"','"-strip"','"webp:method=6"','"webp:alpha-quality=100"','"-quality", "82"']) assert.ok(media.includes(marker),marker);
  assert.match(media,/shell:\s*false|execFile/);
  assert.match(media,/master-image folder must stay outside the Git repository/);
  assert.match(media,/sha256/);
});

test("Studio UI exposes structured bilingual, sequence, crop, fit, background, media and publish controls", async () => {
  const app = await readFile(path.join(root,"studio/ui/app.js"),"utf8");
  const vite = await readFile(path.join(root,"vite.config.ts"),"utf8");
  for (const marker of ["detailSequenceIds","focalPoint","Neutral light","Neutral dark","SoundCloud","Bandcamp","video.embedSize","video.bandcampType","video.transcript","seo.description","home.heroLines","Build ready · Git unchanged","data-media-item","media.disclosureKind","externalLinks.","data-nav-add","data-home-project-add","pages.","profile.socialLinks.","data-social-add","data-social-remove","data-social-move","Social links"]) assert.ok(app.includes(marker),marker);
  assert.doesNotMatch(app,/<iframe[^>]*name="html"/i);
  assert.match(app,/event\.target\.name === "published"[\s\S]*draft\.checked = false/);
  assert.match(app,/event\.target\.name === "draft"[\s\S]*published\.checked = false/);
  assert.match(app,/studio-preview\/portfolio/);
  assert.match(vite,/route\.startsWith\("\/studio-preview\/"\)[\s\S]*noindex,nofollow/);
  assert.match(app,/function normalizeHostedAudioEmbed\(record\)/);
  assert.match(app,/provider:"soundcloud"/);
  assert.match(app,/provider:"bandcamp"/);
  assert.match(app,/record\.mediaType = "video"/);
  assert.match(app,/video\.poster = structuredClone\(record\.cover\)/);
  assert.match(app,/video\.provider && video\.provider !== detected\.provider/);
  assert.match(app,/video\.embedSize = video\.embedSize \|\| "standard"/);
  assert.match(app,/\["soundcloud", "bandcamp"\]\.includes\(item\.videoProvider\) \? "AUDIO" : "VIDEO"/);
  assert.match(app,/const editLabel = \["Edit " \+ titleOf\(item\), mediaBadge\]/);
  assert.match(app,/data-typography-input/);
  assert.match(app,/data-typography-action="keep"/);
  assert.match(app,/data-typography-action="separators"/);
  assert.match(app,/Protect separators in field/);
  assert.match(app,/Insert non-breaking space/);
  assert.match(app,/Insert non-breaking hyphen/);
  assert.match(app,/Restore normal breaks/);
  assert.match(app,/function applyTypographyAction\(action\)/);
  assert.match(app,/target\.setRangeText\(replacement,start,end,"end"\)/);
  assert.match(app,/replace\(\/\[ \\t\\u00a0\]\+\/g,"\\u00a0"\)/);
  assert.match(app,/button\.addEventListener\("mousedown",event => event\.preventDefault\(\)\)/);
  assert.match(app,/Protected spaces in this field/);
  assert.match(app,/event\.key !== " " \|\| !event\.shiftKey \|\| !\(event\.ctrlKey \|\| event\.metaKey\)/);
  assert.match(app,/while \(start > 0 && \/\[ \\t\\u00a0\]\//);
  assert.match(app,/replace\(\/\[\\u00a0\\u2060\]\/g," "\)/);
});

test("Studio title and headline fields support native line breaks and grow with their content", async () => {
  const app = await readFile(path.join(root,"studio/ui/app.js"),"utf8");
  const html = await readFile(path.join(root,"studio/ui/index.html"),"utf8");
  const css = await readFile(path.join(root,"studio/ui/styles.css"),"utf8");
  const generator = await readFile(path.join(root,"scripts/lib/generate.mjs"),"utf8");
  const publicCss = await readFile(path.join(root,"assets/css/site.css"),"utf8");
  const detail = await readFile(path.join(root,"assets/js/project-detail.js"),"utf8");
  const server = await readFile(path.join(root,"studio/server.mjs"),"utf8");
  assert.match(app,/const multilineTitle[^\n]+title\|headline\|heading/);
  assert.match(app,/\(!options\.type \|\| options\.type === "text"\)/);
  assert.match(app,/const typographyEnabled[^\n]+\(!options\.type \|\| options\.type === "text"\)/);
  assert.match(app,/<textarea[^>]*rows="[^>]*data-auto-grow/);
  assert.match(app,/data-title-field/);
  assert.match(app,/textarea\.style\.height = "auto"/);
  assert.match(app,/textarea\.scrollHeight \+ 2/);
  assert.match(app,/autoGrowTextareas\(form\)/);
  assert.match(app,/document\.addEventListener\("input",event => autoGrowTextarea\(event\.target\)\)/);
  assert.match(app,/window\.addEventListener\("resize"[^\n]*autoGrowTextareas/);
  assert.match(app,/else if \(options\.area \|\| multilineTitle\)/);
  assert.match(app,/home\.heroLineHeight","Hero headline line spacing \(0\.80–1\.40\)"/);
  assert.match(app,/pair\("heroLineHeight","Main heading line spacing"/);
  assert.match(app,/type:"number",min:0\.8,max:1\.4,step:0\.01/);
  assert.match(server,/heroLineHeightPL:\s*1\.12/);
  assert.match(server,/heroLineHeightEN:\s*1\.12/);
  assert.match(app,/type:\s*"portfolio-preview-heading-spacing"/);
  assert.match(app,/preview\.onload = previewHeadingSpacing/);
  assert.match(app,/\^heroLineHeight\(\?:PL\|EN\)\$/);
  assert.match(app,/input\.type === "number" && input\.value !== "" \? Number\(input\.value\)/);
  assert.match(html,/<textarea name="titlePL"[^>]*data-auto-grow[^>]*data-title-field/);
  assert.match(css,/textarea\[data-auto-grow\][^}]*overflow-y:hidden/);
  assert.match(css,/textarea\[data-title-field\][^}]*min-height:42px/);
  assert.match(generator,/const singleLine = value => String\(value \?\? ""\)\.replace\(\/\\s\+\/gu, " "\)\.trim\(\)/);
  assert.match(generator,/const escapeAttribute = value => escapeHtml\(value\)\.replace\(\/\\r\\n\?\|\\n\/g, "&#10;"\)/);
  assert.match(publicCss,/white-space:\s*pre-line/);
  assert.doesNotMatch(detail,/document\.title\s*=|meta\[name="description"\]/);

  const bundle = await loadContent(root);
  const source = bundle.works[0];
  source.titlePL = "Pierwsza linia\nDruga linia";
  source.titleEN = "First line\nSecond line";
  const validation = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(validation.valid,true);
  const runtime = compileRuntimeData(bundle).works.find(item => item.id === source.id);
  assert.equal(runtime.titlePL,"Pierwsza linia\nDruga linia");
  assert.equal(runtime.titleEN,"First line\nSecond line");

  bundle.site.home.heroLineHeight = 1.12;
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,true);
  bundle.site.home.heroLineHeight = 1.41;
  const invalidSpacing = await validateContent(bundle,{root,checkFiles:false});
  assert.equal(invalidSpacing.valid,false);
  assert.ok(invalidSpacing.errors.some(issue => issue.code === "invalid-heading-spacing"));
  bundle.site.home.heroLineHeight = "1.02";
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,false);
  bundle.site.home.heroLineHeight = 1.02;

  const container = bundle.projects[0];
  container.heroLineHeightPL = 1.12;
  container.heroLineHeightEN = 1.18;
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,true);
  container.heroLineHeightPL = 1.41;
  assert.ok((await validateContent(bundle,{root,checkFiles:false})).errors.some(issue => issue.path.endsWith(".heroLineHeightPL") && issue.code === "invalid-heading-spacing"));
  container.heroLineHeightPL = 1.12;
  container.heroLineHeightEN = "1.12";
  assert.equal((await validateContent(bundle,{root,checkFiles:false})).valid,false);
});

test("Studio provides a visual, searchable works browser without an intrusive preview banner", async () => {
  const app = await readFile(path.join(root,"studio/ui/app.js"),"utf8");
  const html = await readFile(path.join(root,"studio/ui/index.html"),"utf8");
  const css = await readFile(path.join(root,"studio/ui/styles.css"),"utf8");
  const server = await readFile(path.join(root,"studio/server.mjs"),"utf8");
  const portfolio = await readFile(path.join(root,"assets/js/portfolio.js"),"utf8");
  const generator = await readFile(path.join(root,"scripts/lib/generate.mjs"),"utf8");
  const publicCss = await readFile(path.join(root,"assets/css/site.css"),"utf8");
  assert.match(server,/function summaryMedia\(media\)/);
  assert.match(server,/coverPreview:\s*summaryMedia\(record\.cover\)/);
  assert.match(html,/data-work-count[^>]*aria-live="polite"/);
  assert.match(html,/data-list="works"[^>]*aria-label="Quick works browser"/);
  assert.doesNotMatch(html,/data-list="collections"|data-create="collection"/);
  assert.match(html,/data-list="archived-works"/);
  assert.match(html,/data-delete-archive-dialog/);
  assert.match(app,/allContainers\(\).*sort/);
  assert.match(app,/item\.recordType === "collection"/);
  assert.match(app,/data-tag-select/);
  assert.match(app,/data-tag-new/);
  assert.match(app,/data-tag-remove/);
  assert.doesNotMatch(app,/Tags \(comma-separated\)/);
  assert.doesNotMatch(app,/<fieldset><legend>Collections<\/legend>/);
  assert.match(app,/class="work-browser-thumb/);
  assert.match(app,/loading="lazy" decoding="async"/);
  assert.match(app,/--thumb-fit:/);
  assert.match(app,/--thumb-position:/);
  assert.match(app,/titleOf\(owner\)/);
  assert.match(css,/\.works-list\{[^}]*display:grid[^}]*repeat\(2,/);
  assert.match(css,/\.work-browser-item:focus-visible/);
  assert.match(html,/role="separator"[^>]*data-library-resizer/);
  assert.match(html,/data-manager[^>]*aria-labelledby="manager-title"/);
  assert.match(html,/data-manager-type="containers"/);
  assert.match(html,/data-manager-type="updates"/);
  assert.match(html,/data-manager-type="works"/);
  assert.match(app,/SIDEBAR_PROJECT_LIMIT = 5/);
  assert.match(app,/SIDEBAR_UPDATE_LIMIT = 5/);
  assert.match(app,/SIDEBAR_WORK_LIMIT = 5/);
  assert.match(html,/data-show-more="containers"[^>]*hidden/);
  assert.match(html,/data-show-more="updates"[^>]*hidden/);
  assert.match(html,/data-show-more="works"[^>]*hidden/);
  assert.match(html,/data-show-more="archives"[^>]*hidden/);
  assert.match(app,/MANAGER_PER_VALUES = \[25, 50, 100\]/);
  assert.match(app,/function paginationTokens\(/);
  assert.match(app,/function managerFilteredItems\(/);
  assert.match(app,/function managerCanReorder\(/);
  assert.match(app,/view\.sort === "order"[\s\S]*view\.status === "all"[\s\S]*view\.scope === "all"/);
  assert.match(app,/portfolio:studio:manager/);
  assert.match(app,/managerSearchTimer = setTimeout\(renderManager,120\)/);
  assert.match(app,/function initLibraryResizer\(/);
  assert.match(app,/event\.key === "ArrowLeft"/);
  assert.match(app,/event\.key === "ArrowRight"/);
  assert.match(app,/localStorage\.setItem/);
  assert.match(app,/beforeunload/);
  assert.match(html,/data-preview-toggle/);
  assert.match(html,/data-preview-close/);
  assert.match(html,/data-manager-list[^>]*tabindex="-1"/);
  assert.match(css,/--studio-library-width:280px/);
  assert.match(css,/\.app-grid\.manager-open/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.library-resizer\{display:none\}/);
  assert.doesNotMatch(generator,/STUDIO PREVIEW · NOT PUBLIC|studio-preview-banner|data-studio-preview/);
  assert.doesNotMatch(publicCss,/studio-preview-banner|data-studio-preview/);
  assert.match(portfolio,/const previewMode = location\.pathname\.includes\("\/studio-preview\/"\)/);
  assert.match(portfolio,/const allWorks = \[\.\.\.runtimeWorks, \.\.\.detailMedia\]/);
  assert.match(portfolio,/const directlyViewableWorks = previewMode \? allWorks : works/);
  assert.match(portfolio,/if \(!directlyViewableWorks\.some\(work => work\.id === id\)\) return/);
});

test("public media rendering exposes authored transcript, credit, and background fields", async () => {
  const core = await readFile(path.join(root,"assets/js/core.js"),"utf8");
  const viewer = await readFile(path.join(root,"assets/js/viewer.js"),"utf8");
  assert.match(core,/field\(item\?\.video, "transcript"\)/);
  assert.match(core,/field\(item\?\.video, "credits"\)/);
  assert.match(core,/video-transcript/);
  assert.match(core,/video-credits/);
  assert.match(viewer,/authoredBackground\(item\.cover\) \|\| preferredViewerBackground/);
});

test("public footer and Person SEO derive social links from configured profile data", async () => {
  const core = await readFile(path.join(root,"assets/js/core.js"),"utf8");
  const vite = await readFile(path.join(root,"vite.config.ts"),"utf8");
  const schema = await readFile(path.join(root,"content/schemas/site.schema.json"),"utf8");
  assert.match(core,/function configuredSocialLinks\(/);
  assert.match(core,/profile\.socialLinks === undefined/);
  assert.match(core,/target="_blank" rel="me noopener noreferrer"/);
  assert.match(core,/footer-social-link/);
  assert.match(core,/opens in a new tab/);
  assert.match(core,/data-aria-pl/);
  assert.match(core,/data-pl=/);
  assert.match(core,/function safeSocialHref\(/);
  assert.match(core,/function footerEmailMarkup\(/);
  assert.match(core,/class="footer-email"[^>]*aria-label=[^>]*data-no-typography/);
  assert.match(core,/class="footer-email-local"/);
  assert.match(core,/class="footer-email-domain"/);
  assert.match(vite,/const configuredSameAs = \(\) =>/);
  assert.match(vite,/socialLinks/);
  assert.doesNotMatch(vite,/sameAs:\s*\["https:\/\/github\.com\/wik-wav",\s*"https:\/\/www\.linkedin\.com/);
  assert.match(schema,/"socialLinks"/);

  const css = await readFile(path.join(root,"assets/css/site.css"),"utf8");
  assert.match(css,/\.footer-links \{[^}]*repeat\(auto-fit, minmax\(min\(100%, 11rem\), 1fr\)\)/s);
  assert.match(css,/\.footer-links a \{[^}]*overflow-wrap: anywhere/s);
  assert.match(css,/\.footer-email \{[^}]*flex-wrap: wrap[^}]*gap: 0 !important[^}]*overflow-wrap: normal !important/s);
  assert.match(css,/\.footer-email-domain \{[^}]*flex: 0 0 auto/s);
});
