import { defineConfig } from "vite";
import { relative, resolve } from "node:path";
import { cp } from "node:fs/promises";
import { ORIGIN, projectRoutes, routeMetadata } from "./seo-metadata.ts";

const projectRoot = import.meta.dirname;
const htmlEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const routeForFile = (filename: string) => {
  const file = relative(projectRoot, filename).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!file || file === "." || file === "index.html") return "/";
  return `/${file.replace(/index\.html$/, "")}`;
};

const jsonLd = (route: string) => {
  const meta = routeMetadata[route];
  const person = { "@type": "Person", "@id": `${ORIGIN}/#person`, name: "Wiktor Sielaszuk", url: `${ORIGIN}/`, email: "mailto:wiktor.sielaszuk.22@gmail.com", sameAs: ["https://github.com/wik-wav", "https://www.linkedin.com/in/wiktor-sielaszuk"] };
  if (route === "/") return { "@context": "https://schema.org", "@graph": [person, { "@type": "WebSite", "@id": `${ORIGIN}/#website`, name: "Wiktor Sielaszuk — portfolio", url: `${ORIGIN}/`, inLanguage: ["pl", "en"], author: { "@id": `${ORIGIN}/#person` } }] };
  if (route === "/portfolio/" || route === "/projects/") return { "@context": "https://schema.org", "@type": "CollectionPage", name: meta.titlePL, description: meta.descriptionPL, url: `${ORIGIN}${route.slice(1)}`, inLanguage: "pl", author: { "@id": `${ORIGIN}/#person` }, mainEntity: { "@type": "ItemList", itemListElement: projectRoutes.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: routeMetadata[item].titlePL.replace(" — Wiktor Sielaszuk", ""), url: `${ORIGIN}${item}` })) } };
  return { "@context": "https://schema.org", "@type": "CreativeWork", name: meta.titlePL.replace(" — Wiktor Sielaszuk", ""), description: meta.descriptionPL, url: `${ORIGIN}${route.slice(1)}`, image: `${ORIGIN}${meta.image}`, inLanguage: ["pl", "en"], creator: { "@id": `${ORIGIN}/#person` }, ...(meta.year ? { dateCreated: meta.year } : {}) };
};

const routeSeo = () => ({
  name: "route-seo",
  order: "post" as const,
  transformIndexHtml(html: string, context: { filename: string }) {
    const route = routeForFile(context.filename);
    const meta = routeMetadata[route];
    if (!meta) throw new Error(`Missing route metadata for ${route}`);
    const canonical = route === "/" ? `${ORIGIN}/` : `${ORIGIN}${route}`;
    const social = `${ORIGIN}/og-social.png`;
    const socialAltPL = "Wygenerowana przez AI wizualizacja podglądu portfolio Wiktora Sielaszuka.";
    const socialAltEN = "AI-generated visualisation previewing Wiktor Sielaszuk’s portfolio.";
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title data-pl="${htmlEscape(meta.titlePL)}" data-en="${htmlEscape(meta.titleEN)}">${htmlEscape(meta.titlePL)}</title>`);
    html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${htmlEscape(meta.descriptionPL)}" data-content-pl="${htmlEscape(meta.descriptionPL)}" data-content-en="${htmlEscape(meta.descriptionEN)}">`);
    const tags = `
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="author" content="Wiktor Sielaszuk">
  <meta name="theme-color" content="#F8F9F8">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta property="og:type" content="${route.startsWith("/projects/") && route !== "/projects/" ? "article" : "website"}">
  <meta property="og:title" content="${htmlEscape(meta.titlePL)}" data-content-pl="${htmlEscape(meta.titlePL)}" data-content-en="${htmlEscape(meta.titleEN)}">
  <meta property="og:description" content="${htmlEscape(meta.descriptionPL)}" data-content-pl="${htmlEscape(meta.descriptionPL)}" data-content-en="${htmlEscape(meta.descriptionEN)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${social}">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${htmlEscape(socialAltPL)}" data-content-pl="${htmlEscape(socialAltPL)}" data-content-en="${htmlEscape(socialAltEN)}">
  <meta property="og:site_name" content="Wiktor Sielaszuk — portfolio">
  <meta property="og:locale" content="pl_PL"><meta property="og:locale:alternate" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(meta.titlePL)}" data-content-pl="${htmlEscape(meta.titlePL)}" data-content-en="${htmlEscape(meta.titleEN)}">
  <meta name="twitter:description" content="${htmlEscape(meta.descriptionPL)}" data-content-pl="${htmlEscape(meta.descriptionPL)}" data-content-en="${htmlEscape(meta.descriptionEN)}">
  <meta name="twitter:image" content="${social}">
  <meta name="twitter:image:alt" content="${htmlEscape(socialAltPL)}" data-content-pl="${htmlEscape(socialAltPL)}" data-content-en="${htmlEscape(socialAltEN)}">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <script type="application/ld+json">${JSON.stringify(jsonLd(route)).replace(/</g, "\\u003c")}</script>`;
    return html.replace("</head>", `${tags}\n</head>`);
  }
});

const copyStaticMedia = () => ({
  name: "copy-static-media",
  apply: "build" as const,
  async writeBundle() {
    await cp(resolve(projectRoot, "assets/media"), resolve(projectRoot, "dist/assets/media"), { recursive: true, force: true });
    await cp(resolve(projectRoot, "assets/fonts"), resolve(projectRoot, "dist/assets/fonts"), { recursive: true, force: true });
  }
});

export default defineConfig({
  base: "./",
  plugins: [routeSeo(), copyStaticMedia()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        home: resolve(projectRoot, "index.html"),
        portfolio: resolve(projectRoot, "portfolio/index.html"),
        projects: resolve(projectRoot, "projects/index.html"),
        latentne: resolve(projectRoot, "projects/latentne/index.html"),
        paraAnalogOn: resolve(projectRoot, "projects/para-analog-on/index.html"),
        gaijin: resolve(projectRoot, "projects/gaijin-no-mittsu-no-kuusou/index.html"),
        lem: resolve(projectRoot, "projects/lem/index.html"),
        lozengeT: resolve(projectRoot, "projects/lozenge-t/index.html"),
        bookCover: resolve(projectRoot, "projects/book-cover/index.html"),
        windowsZine: resolve(projectRoot, "projects/windows-zine/index.html"),
        coverArt: resolve(projectRoot, "projects/cover-art/index.html"),
        smallDesignProjects: resolve(projectRoot, "projects/small-design-projects/index.html"),
        characterArt: resolve(projectRoot, "projects/character-art/index.html"),
        dissonancePerspective: resolve(projectRoot, "projects/dissonance-perspective/index.html")
      }
    }
  }
});
