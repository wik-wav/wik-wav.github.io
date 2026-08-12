# Portfolio Wiktora Sielaszuka / Wiktor Sielaszuk Portfolio

## Portfolio Studio

Treść strony jest teraz oddzielona od kodu. Źródłem prawdy są pliki w `content/`: ustawienia globalne w `content/site.json`, projekty w `content/projects/`, kolekcje w `content/collections/`, prace w `content/works/`, a wpisy Aktywności w `content/updates/`. Pliki HTML, `assets/js/data.js`, `assets/js/site-data.js`, `seo-metadata.ts`, mapa witryny i manifest tras są generowane — nie należy edytować ich ręcznie.

Uruchomienie na Windows:

```powershell
cd D:\wyash\Documents\GitHub\wik-wav.github.io
npm.cmd install
npm.cmd run studio
```

Polecenie otwiera dwa lokalne adresy: Portfolio Studio (`127.0.0.1:4310`) i podgląd Vite (`127.0.0.1:4177`). Studio działa wyłącznie na komputerze lokalnym. Zapis rekordu waliduje pełny graf treści, generuje tylko zmienione pliki i odświeża podgląd.

W Studio można:

- tworzyć, duplikować, porządkować i archiwizować projekty oraz prace; projekty i kolekcje można układać przez przeciąganie, przyciski albo wpisanie pozycji;
- tworzyć, edytować, duplikować i archiwizować wpisy Aktywności z uporządkowanymi blokami tekstu, obrazu, osadzenia audio/wideo i linku;
- edytować teksty PL/EN, podpisy, opisy alternatywne, tagi wybierane z listy lub dodawane jako nowe, medium, rok, SEO i kolejność sekwencji;
- przypisywać niezależne okładki, hero i miniatury oraz ustawiać `cover`/`contain`, punkt kadrowania, rozmiar na stronie projektu i jasne/ciemne tło przezroczystych prac;
- upuszczać obrazy do importu. Oryginał trafia do zewnętrznego magazynu masterów, a do repozytorium — zoptymalizowany WebP bez metadanych, maksymalnie 2400 px;
- dodawać tylko ustrukturyzowane osadzenia YouTube, Vimeo, SoundCloud i Bandcamp, bez dowolnego HTML/iframe; dla odtwarzaczy audio można wybrać wariant kompaktowy, standardowy lub rozszerzony;
- wykonać ścisłą walidację i produkcyjny build przyciskiem **Build for publishing**.

Build nie wykonuje operacji Git. Po sprawdzeniu zmian należy osobno użyć zwykłego workflow: `git status`, commit i push. GitHub Actions publikuje stronę. Szkice nie trafiają do podglądu publicznego ani buildu i nie blokują publikacji innych, gotowych treści; ich ostrzeżenia pozostają widoczne w Studio. Usuwanie aktywnej pracy w Studio oznacza najpierw archiwizację JSON; materiały źródłowe nie są kasowane, opublikowany adres pozostaje na zawsze zarezerwowany, a rekord z aktywnymi odwołaniami nie może zostać zarchiwizowany. Zarchiwizowany JSON pracy można następnie trwale usunąć po wpisaniu jego dokładnego identyfikatora. Ta operacja nie usuwa plików mediów ani rezerwacji wcześniej opublikowanego adresu.

Najważniejsze polecenia:

```powershell
npm.cmd run studio             # edycja + Vite
npm.cmd run generate           # ręczne odtworzenie plików generowanych
npm.cmd run validate:content   # ścisła walidacja publikacji
npm.cmd test                   # walidacja, drift, build i testy
npm.cmd run build              # generacja + dist/
```

The site content is separated from its presentation code. `content/site.json`, `content/projects/`, `content/collections/`, and `content/works/` are authoritative. Run `npm run studio` to use the local browser editor and live Vite preview. Studio supports bilingual copy, sequence ordering, selectable and user-defined work tags, media import and crop settings, structured YouTube, Vimeo, SoundCloud, and Bandcamp embeds, compact/standard/expanded audio-player sizes, SEO, validation, and a production build. Existing collection data and relationships remain supported without a separate collection-management panel. Drafts remain private without blocking other ready content; published addresses stay permanently reserved after archival. An archived work JSON can be permanently removed only after exact-ID confirmation; its media remains untouched and a published address remains reserved. Studio never commits, pushes, or edits Git state.

## PL

Statyczne, wielostronicowe portfolio przygotowane dla przyszłej witryny GitHub Pages. Strona startowa, filtrowalna galeria, indeks projektów i jedenaście widoków kuratorskich korzystają ze wspólnych tokenów, danych PL/EN i trwałego przełącznika języka. Projekt zawiera 14 tras i 62 publiczne prace galerii.

Trasy:

- `index.html` — profil;
- `portfolio/index.html` — galeria z filtrami i podglądem;
- `projects/index.html` — indeks jedenastu projektów;
- `projects/latentne/index.html`;
- `projects/para-analog-on/index.html`;
- `projects/gaijin-no-mittsu-no-kuusou/index.html`;
- `projects/lem/index.html`;
- `projects/lozenge-t/index.html`;
- `projects/book-cover/index.html`.
- `projects/windows-zine/index.html`;
- `projects/cover-art/index.html`;
- `projects/small-design-projects/index.html`;
- `projects/character-art/index.html`;
- `projects/dissonance-perspective/index.html`.

Wspólne dane znajdują się w `assets/js/data.js`, renderowanie mediów i języka w `assets/js/core.js`, logika galerii w `assets/js/portfolio.js`, a tokeny i responsywność w `assets/css/site.css`.

### Media

Pochodne prac dyplomowych znajdują się w `assets/media/degree/`. Powstały w ImageMagick z zachowaniem proporcji, bez powiększania: automatyczna orientacja, sRGB, maksymalny dłuższy bok 2400 px, usunięte metadane, WebP quality 82 / method 6.

Audytowane, bezpieczne zasoby projektu Lem znajdują się w `assets/media/lem/`. Są ograniczone do 2000 px na dłuższym boku, zapisane jako WebP quality 82 / method 6; przezroczystość źródeł została zachowana. Dedykowane kompozyty trzech pełnych form dla hero i miniatury zachowują przezroczystość, wspólną linię bazową oraz pełne sylwetki; zapisano je jako WebP quality 88 / method 6. Oryginały i lokalny plik MP4 nie są częścią witryny. Wideo licencjackie korzysta wyłącznie z dozwolonego identyfikatora YouTube i domeny `youtube-nocookie.com`.

Makieta okładki książki znajduje się w `assets/media/book-cover/`. Lokalna pochodna WebP zachowuje rozmiar źródła, profil sRGB i proporcje; oryginalny PNG pozostaje poza projektem.

Pochodne `WIN / DOWS` znajdują się w `assets/media/windows-zine/`: trzy mockupy zachowują rozmiar źródłowy, a dziesięć stron ma maksymalny dłuższy bok 2400 px. Rok 2023 jest przechowywany jawnie jako informacja pochodząca z XMP źródeł. Okładki, mniejsze projekty i Postaci - ilustracje znajdują się odpowiednio w `assets/media/cover-art/`, `assets/media/small-design-projects/` i `assets/media/character-art/`. Alfabet Lozenge T. oraz lokalny krój Pabaka znajdują się w `assets/media/lozenge-t/` i `assets/fonts/`. Cztery statyczne klatki `Dissonance Perspective` znajdują się w `assets/media/dissonance-perspective/`; lokalny film źródłowy nie jest kopiowany do witryny.

Metadane `disclosure` należą do konkretnego medium i są renderowane centralnie przez `makeMedia()`. Wartość `ai-generated` oznacza wygenerowaną wizualizację, a `ai-elements` — pracę zawierającą wskazane elementy wygenerowane przez AI. Jest to konwencja dokumentowania pochodzenia w tym portfolio, a nie certyfikacja prawna ani twierdzenie o uniwersalnym obowiązku prawnym. Zastosowano ją tylko do mockupu książki, mockupów zina i stron zina z ASCII artem; nie obejmuje ikony modelu głosowego, ilustracji postaci ani kadrów wideo.

Vite kopiuje katalogi `assets/media/` i `assets/fonts/` do tych samych ścieżek w `dist/`, dzięki czemu adresy działają zarówno w podglądzie Open Design, jak i w buildzie produkcyjnym.

Widoki `portfolio/` i `projects/` obsługują parametry `size`, `per` i `page`. Widok projektów obsługuje także `view=visual|list`; lista tworzy zwarty indeks bez obrazów i ikon. Rozmiar, tryb projektów oraz właściwa dla danego widoku liczba elementów są zapamiętywane lokalnie, natomiast poprawny query string ma pierwszeństwo. Przełączenie między trybami przenosi wyłącznie wspólny parametr `size`. Jawna nawigacja stron używa historii przeglądarki, podczas gdy zmiany układu, filtrów i liczby elementów aktualizują bieżący wpis. Galeria zachowuje powtarzane parametry filtrów. Pole `projectPageVisible: false` ukrywa pracę wyłącznie w narracji projektu, a `projectGroup` łączy kolejne prace w semantyczną grupę bez zmiany ich obecności w galerii ogólnej.

Pole `collections` pozwala jednej pracy należeć do kolekcji bez duplikowania rekordu. Skrót Postaci - ilustracje ustawia parametr `collection=character-art`; wpisy Lem pozostają przypisane do projektu `lem`, a jednocześnie są widoczne w kolekcji.

Pole projektu `detailMediaSize` steruje domyślną skalą naturalnych obrazów w sekwencji kuratorskiej i przyjmuje wyłącznie `compact`, `standard`, `large` albo `full`. Ten sam klucz zapisany przy pojedynczej pracy ma pierwszeństwo. Obrazy sekwencji otwierają wspólny viewer Portfolio/projektów z kontrolą powiększenia, przesuwaniem i opcjonalnym panelem szczegółów; filmy pozostają responsywnymi osadzeniami 16:9.

### Przyszła aktualizacja

Portfolio Studio jest lokalnym narzędziem aktualizacji. Dane w `content/` są źródłem prawdy, a narracja, tekst redakcyjny, kolejność mediów, proces, współtwórcy i powiązane prace są generowane z tych danych.

## EN

Static, multi-page portfolio prepared for GitHub Pages. The home page, activity log, filterable gallery, project index, and eleven curated views share one token layer, paired PL/EN data, and a persistent language switcher. The project contains 15 routes and 66 public gallery works.

Routes:

- `index.html` — profile;
- `portfolio/index.html` — gallery with filters and preview;
- `projects/index.html` — index of eleven projects;
- `activity/index.html` — bilingual activity and status updates;
- `projects/latentne/index.html`;
- `projects/para-analog-on/index.html`;
- `projects/gaijin-no-mittsu-no-kuusou/index.html`;
- `projects/lem/index.html`;
- `projects/lozenge-t/index.html`;
- `projects/book-cover/index.html`.
- `projects/windows-zine/index.html`;
- `projects/cover-art/index.html`;
- `projects/small-design-projects/index.html`;
- `projects/character-art/index.html`;
- `projects/dissonance-perspective/index.html`.

Shared data lives in `assets/js/data.js`, media and language rendering in `assets/js/core.js`, gallery logic in `assets/js/portfolio.js`, and tokens and responsive rules in `assets/css/site.css`.

### Media

Degree-work derivatives live in `assets/media/degree/`. ImageMagick generated them without changing aspect ratio or upscaling: auto orientation, sRGB, maximum 2400 px long edge, stripped metadata, WebP quality 82 / method 6.

Audited safe Lem assets live in `assets/media/lem/`. They are limited to a 2000 px long edge and encoded as WebP quality 82 / method 6; source transparency is preserved. Dedicated three-form hero and thumbnail composites preserve transparency, a shared baseline, and every complete figure; they use WebP quality 88 / method 6. Originals and the local MP4 are not part of the site. The bachelor video uses only the approved YouTube ID and `youtube-nocookie.com`.

The book-cover mockup lives in `assets/media/book-cover/`. Its local WebP derivative preserves the source dimensions, sRGB profile, and aspect ratio; the original PNG remains outside the project.

`WIN / DOWS` derivatives live in `assets/media/windows-zine/`: the three mockups retain source size, while the ten pages have a 2400 px maximum long edge. The 2023 creation year is stored explicitly as provenance from source-file XMP. Cover art, small design projects, and Character Art live in `assets/media/cover-art/`, `assets/media/small-design-projects/`, and `assets/media/character-art/`. The Lozenge T. alphabet and local Pabaka font live in `assets/media/lozenge-t/` and `assets/fonts/`. Four static `Dissonance Perspective` stills live in `assets/media/dissonance-perspective/`; the local source video is not copied into the site.

`disclosure` metadata belongs to a specific media asset and is rendered centrally by `makeMedia()`. `ai-generated` identifies a generated visualisation; `ai-elements` identifies a work containing the named generated elements. This is a portfolio provenance convention, not legal certification or a claim of universal legal necessity. It is applied only to the book mockup, zine mockups, and zine pages containing ChatGPT ASCII art—not to the voice-model icon, character art, or video stills.

Vite copies `assets/media/` and `assets/fonts/` to the same paths in `dist/`, so URLs work in both Open Design preview and the production build.

The `portfolio/` and `projects/` views support `size`, `per`, and `page` parameters. Projects also supports `view=visual|list`; list view renders a compact index with no images or icons. Size, project view, and each route’s own per-page preference persist locally, while a valid query string takes precedence. Switching modes carries only the shared `size` parameter. Explicit page navigation uses browser history, while layout, filter, and per-page changes update the current entry. The gallery preserves repeated filter parameters. `projectPageVisible: false` hides a work only from a project narrative, while `projectGroup` combines consecutive works into one semantic group without changing their general-gallery presence.

The `collections` field lets one work join a collection without duplicating its record. The Character Art shortcut sets `collection=character-art`; Lem works retain `lem` as their primary project while also appearing in the collection.

The project-level `detailMediaSize` field controls the default scale of natural-ratio images in a curated sequence and accepts only `compact`, `standard`, `large`, or `full`. The same key on an individual work overrides the project default. Sequence images open the shared Portfolio/project viewer with zoom, pan, and an optional details panel; visual video remains responsive 16:9 while SoundCloud and Bandcamp use responsive player-specific presets.

### Future updates

Portfolio Studio is the local update pipeline. Data in `content/` is authoritative; narrative, editorial text, activity blocks, media order, process, contributors, related work, routes, and SEO are generated from it.

## SEO and GitHub Pages / SEO i GitHub Pages

Metadane wszystkich 15 tras są utrzymywane centralnie w `seo-metadata.ts` i wstrzykiwane podczas builda. Jedynym originem kanonicznym jest `https://wik-wav.github.io`; adresy kanoniczne mają końcowy slash i nigdy nie zawierają parametrów filtrów, paginacji ani viewera. Polski pozostaje językiem początkowego HTML, a przełącznik PL/EN aktualizuje tytuł, opis i obsługiwane metadane. Osobno indeksowalna wersja angielska wymagałaby w przyszłości tras `/en/` i nie jest częścią tej wersji.

Metadata for all 15 routes is maintained in `seo-metadata.ts` and injected at build time. The sole canonical origin is `https://wik-wav.github.io`; canonical URLs use trailing slashes and never contain filter, pagination, or viewer parameters. Polish remains the initial HTML language, while the PL/EN switch updates the title, description, and supported metadata. Fully indexable English content would require separate `/en/` routes in a later release.

`public/og-social.png` jest wygenerowaną przez AI wizualizacją podglądu portfolio i zachowuje widoczne oznaczenie pochodzenia. The social card is an AI-generated portfolio preview visualisation and retains its visible disclosure.

Wspólna paginacja emituje maksymalnie siedem tokenów. `npm run media:dimensions` odtwarza zatwierdzony manifest wymiarów wszystkich lokalnych obrazów; należy uruchomić go po dodaniu lub wymianie mediów i zatwierdzić `assets/js/media-dimensions.js`. Brak wymiarów lokalnego obrazu jest błędem. The shared pagination emits no more than seven tokens. Regenerate and commit the image-dimensions manifest whenever media changes.

Workflow `.github/workflows/deploy.yml` jest przygotowany dla przyszłego repozytorium `wik-wav/wik-wav.github.io`: `npm test` wykonuje produkcyjny build, a `dist` jest przekazywany do GitHub Pages. Ten przebieg lokalny niczego nie publikuje.
