export const ORIGIN = "https://wik-wav.github.io";

export type RouteMeta = {
  titlePL: string; titleEN: string; descriptionPL: string; descriptionEN: string;
  image?: string; imageAltPL?: string; imageAltEN?: string; year?: string;
};

const project = (title: string, descriptionPL: string, descriptionEN: string, image: string, year?: string): RouteMeta => ({
  titlePL: `${title} — Wiktor Sielaszuk`, titleEN: `${title} — Wiktor Sielaszuk`, descriptionPL, descriptionEN, image, year,
  imageAltPL: `Podgląd projektu ${title} w portfolio Wiktora Sielaszuka.`, imageAltEN: `Preview of ${title} in Wiktor Sielaszuk’s portfolio.`
});

export const routeMetadata: Record<string, RouteMeta> = {
  "/": { titlePL: "Wiktor Sielaszuk — profil i wybrane prace", titleEN: "Wiktor Sielaszuk — profile and selected work", descriptionPL: "Portfolio Wiktora Sielaszuka: projektowanie, sztuka, systemy wizualne i wybrane prace.", descriptionEN: "Wiktor Sielaszuk’s portfolio: design, art, visual systems, and selected work." },
  "/portfolio/": { titlePL: "Wszystkie prace — Wiktor Sielaszuk", titleEN: "All work — Wiktor Sielaszuk", descriptionPL: "Wszystkie publiczne prace Wiktora Sielaszuka z filtrowaniem według projektu, roku, medium i typu.", descriptionEN: "All public work by Wiktor Sielaszuk, filterable by project, year, medium, and type." },
  "/projects/": { titlePL: "Projekty — Wiktor Sielaszuk", titleEN: "Projects — Wiktor Sielaszuk", descriptionPL: "Wybrane projekty Wiktora Sielaszuka z opisami założeń, procesu, roli i mediów.", descriptionEN: "Selected projects by Wiktor Sielaszuk with context on concept, process, role, and media." },
  "/projects/latentne/": project("Latentne", "Cykl 12 cyfrowych wydruków z 2026 roku badający ludzką intencję i sprawczość w sztuce generatywnej.", "A 2026 series of 12 digital prints examining human intention and agency in generative art.", "/assets/media/degree/latentne-01-graph-of-babel.webp", "2026"),
  "/projects/para-analog-on/": project("Para-analog-on", "Aneks dyplomowy z 2026 roku: otwarty protokół przekształcający opis obrazu od tysiąca słów do dwóch.", "A 2026 diploma annex: an open protocol transforming an image description from one thousand words to two.", "/assets/media/degree/para-analog-on-01-w.webp", "2026"),
  "/projects/gaijin-no-mittsu-no-kuusou/": project("外人の三つの空想 / A Gaijin’s Three Visions", "Autorski tryptyk audiowizualny z 2024 roku łączący muzykę, wideo i trzy plakaty.", "An original 2024 audiovisual triptych combining music, video, and three posters.", "/assets/media/degree/gaijins-three-visions-01-nyuu-min.webp", "2024"),
  "/projects/lem/": project("Lem", "Modularny system postaci i rodzina głosów dla OpenUTAU, UTAU i DiffSinger.", "A modular character system and family of voices for OpenUTAU, UTAU, and DiffSinger.", "/assets/media/lem/lem-three-forms-hero.webp"),
  "/projects/lozenge-t/": project("Lozenge T.", "Fikcyjny świat, język Asaxi, pismo Pabaka, dokumentacja i narzędzia przeglądarkowe.", "A fictional setting, the Asaxi language, Pabaka script, documentation, and browser tools.", "/assets/media/lozenge-t/lozenge-t-pabaka-alphabet.webp"),
  "/projects/book-cover/": project("Książka, której nie napisałem", "Projekt okładki książki Mariusza Obiedzińskiego wydanej przez Novae Res w 2025 roku.", "Cover design for Mariusz Obiedziński’s book published by Novae Res in 2025.", "/assets/media/book-cover/book-cover-obiedzinski-mockup.webp", "2025"),
  "/projects/windows-zine/": project("WIN / DOWS", "Zin z 2023 roku łączący ASCII art powstały w rozmowie z ChatGPT ze skanografią.", "A 2023 zine combining ASCII art created in conversation with ChatGPT and scanography.", "/assets/media/windows-zine/windows-zine-mockup-01-hero.webp", "2023"),
  "/projects/cover-art/": project("Okładki / Cover Art", "Wybrane projekty okładek, w tym dwie okładki singli SVREN.", "Selected cover artwork, including two covers for SVREN singles.", "/assets/media/cover-art/cover-art-01-untitled.webp"),
  "/projects/small-design-projects/": project("Mniejsze projekty / Small Design Projects", "Mniejsze realizacje z zakresu ikon, identyfikacji wizualnej i grafiki użytkowej.", "Smaller works spanning icons, visual identity, and applied graphic design.", "/assets/media/small-design-projects/voice-model-icon.webp"),
  "/projects/character-art/": project("Postaci — ilustracje / Character Art", "Wybrane ilustracje postaci i plansze projektowe — od pełnych sylwetek po widoki referencyjne.", "Selected character illustrations and design sheets, from full figures to reference turnarounds.", "/assets/media/character-art/character-art-01-cami-possum-witch.webp"),
  "/projects/dissonance-perspective/": project("Dissonance Perspective", "Autorska realizacja audiowizualna badająca granicę między harmonią a szumem.", "An original audiovisual work exploring the boundary between harmony and noise.", "/assets/media/dissonance-perspective/dissonance-perspective-02-hero-0104.webp", "2026")
};

export const canonicalRoutes = Object.keys(routeMetadata);
export const projectRoutes = canonicalRoutes.filter(route => route.startsWith("/projects/") && route !== "/projects/");
