window.PORTFOLIO_DATA = (() => {
  const image = (src, ratio = "4/3", fit = "cover", altPL = "", altEN = "", metadata = {}) => ({
    kind: "image", src, ratio, fit, altPL, altEN, ...metadata
  });
  const placeholder = (art, ratio = "4/3") => ({ kind: "placeholder", art, ratio });
  const group = (items, ratio = "16/8") => ({ kind: "group", items, ratio });
  const degree = (name, ratio = "10/7", fit = "cover", altPL = "", altEN = "", metadata = {}) => image(`assets/media/degree/${name}`, ratio, fit, altPL, altEN, metadata);
  const lem = (name, ratio = "3/4", fit = "contain", altPL = "", altEN = "", metadata = {}) => image(`assets/media/lem/${name}`, ratio, fit, altPL, altEN, metadata);
  const zine = (name, ratio = "4/3", fit = "cover", altPL = "", altEN = "", metadata = {}) => image(`assets/media/windows-zine/${name}`, ratio, fit, altPL, altEN, metadata);
  const coverArt = (name, altPL, altEN) => image(`assets/media/cover-art/${name}`, "1/1", "cover", altPL, altEN);
  const character = (name, ratio = "7/10", fit = "contain", altPL = "", altEN = "") => image(`assets/media/character-art/${name}`, ratio, fit, altPL, altEN);
  const dissonance = (name, altPL, altEN) => image(`assets/media/dissonance-perspective/${name}`, "16/9", "cover", altPL, altEN);
  const disclosure = (kind, shortPL, shortEN, detailPL = shortPL, detailEN = shortEN) => ({ kind, shortPL, shortEN, detailPL, detailEN });
  const bookMockupDisclosure = disclosure(
    "ai-generated",
    "Wizualizacja wygenerowana przez AI",
    "AI-generated visualisation",
    "Wizualizacja wygenerowana przez AI; projekt okładki: Wiktor Sielaszuk.",
    "AI-generated visualisation; cover design by Wiktor Sielaszuk."
  );
  const wide = media => ({ ...media, ratio: "2/1", fit: "cover" });
  const thumbnail = media => {
    const [sourceWidth, sourceHeight] = String(media?.ratio || "").split("/").map(Number);
    const objectPosition = Number.isFinite(sourceWidth) && Number.isFinite(sourceHeight) && sourceWidth < sourceHeight
      ? { objectPosition: "50% 0%" }
      : {};
    return { ...media, ...objectPosition, ratio: "4/3", fit: "cover" };
  };
  const lozengeAlphabet = image(
    "assets/media/lozenge-t/lozenge-t-pabaka-alphabet.webp",
    "1527/1080",
    "cover",
    "Plansza alfabetu Pabaka z zestawem znaków pisma języka Asaxi.",
    "Pabaka alphabet board showing the character set of the Asaxi script."
  );
  const smallDesignIcon = image(
    "assets/media/small-design-projects/voice-model-icon.webp",
    "1/1",
    "contain",
    "Geometryczny portret w błękicie i różu na niebiesko-magentowym tle, z ciemnym zakrzywionym motywem.",
    "Geometric portrait in cyan and pink on a blue-and-magenta background, with a dark curved motif."
  );
  const work = entry => ({
    gallery: entry.gallery || [entry.cover],
    video: entry.video || { provider: null, id: null, poster: entry.cover },
    featured: false,
    draft: false,
    galleryVisible: true,
    ...entry
  });

  const projects = [
    {
      id: "latentne",
      titlePL: "Latentne",
      titleEN: "Latentne",
      summaryPL: "Magisterska praca artystyczna: cykl 12 cyfrowych wydruków badających rolę ludzkiej intencji i sprawczości w sztuce generatywnej.",
      summaryEN: "Master’s artistic work: a series of 12 digital prints examining human intention and agency in generative art.",
      overviewPL: "„Latentne” łączy dane warunkujące z generatorów fraktali z malarstwem cyfrowym i dyfuzją AI. Wieloetapowa obróbka pozostawia decyzję, selekcję i kierunek po stronie artysty.",
      overviewEN: "Latentne combines conditioning data from fractal generators with digital painting and AI diffusion. Its multi-stage workflow keeps direction, selection, and judgement with the artist.",
      yearPL: "2026",
      yearEN: "2026",
      disciplinesPL: "sztuka generatywna, grafika cyfrowa",
      disciplinesEN: "generative art, digital image-making",
      formatPL: "12 wydruków cyfrowych, 100 × 70 cm",
      formatEN: "12 digital prints, 100 × 70 cm",
      rolePL: "koncepcja, realizacja artystyczna, proces hybrydowy",
      roleEN: "concept, artistic production, hybrid workflow",
      processHeadingPL: "Fraktale, malarstwo cyfrowe i dyfuzja.",
      processHeadingEN: "Fractals, digital painting, and diffusion.",
      processPL: "Dane z Mandelbulb 3D i JWildfire były rozwijane poprzez malarstwo cyfrowe w Krita i G’MIC, dyfuzję AI w Krita oraz końcową obróbkę z użyciem Topaz.",
      processEN: "Conditioning data from Mandelbulb 3D and JWildfire was developed through digital painting in Krita and G’MIC, Krita AI diffusion, and final processing with Topaz.",
      creditsPL: "Praca magisterska zrealizowana pod kierunkiem dr Joanny Bentkowskiej-Hlebowicz.",
      creditsEN: "Master’s artistic work supervised by Dr Joanna Bentkowska-Hlebowicz.",
      cover: degree("latentne-01-graph-of-babel.webp"),
      hero: wide(degree("latentne-01-graph-of-babel.webp")),
      thumbnail: thumbnail(degree("latentne-01-graph-of-babel.webp")),
      related: ["para-analog-on", "gaijin-no-mittsu-no-kuusou"]
    },
    {
      id: "para-analog-on",
      titlePL: "Para-analog-on",
      titleEN: "Para-analog-on",
      summaryPL: "Aneks dyplomowy: otwarty protokół przekształcający opis obrazu od tysiąca słów do dwóch kluczowych wyrazów.",
      summaryEN: "Diploma annex: an open protocol transforming an image description from one thousand words into two key terms.",
      overviewPL: "Projekt traktuje system reguł jako dzieło. Obraz wejściowy zostaje wielokrotnie opisywany, rozwijany i redukowany, a kolejne warstwy tekstu są komponowane z obrazem i maksymą Arthura Brisbane’a.",
      overviewEN: "The project treats its rule system as the artwork. An input image is repeatedly described, expanded, and reduced before successive text layers are composed with the image and Arthur Brisbane’s maxim.",
      yearPL: "2026",
      yearEN: "2026",
      disciplinesPL: "projektowanie protokołu, typografia, wideo",
      disciplinesEN: "protocol design, typography, video",
      formatPL: "cztery wydruki 100 × 70 cm i projekt wideo",
      formatEN: "four 100 × 70 cm prints and a video project",
      rolePL: "projekt systemu, wykonanie protokołu, kompozycja",
      roleEN: "system design, protocol execution, composition",
      processHeadingPL: "Od tysiąca słów do dwóch.",
      processHeadingEN: "From a thousand words to two.",
      processPL: "Proces rozwija opis obrazu do około 1000 słów, następnie iteracyjnie redukuje go do dwóch wyrazów i łączy wszystkie etapy opisu z obrazem wejściowym. Protokół udostępniono na licencji CC0 1.0.",
      processEN: "The process expands an image description to roughly 1,000 words, iteratively reduces it to two terms, and combines the descriptive stages with the input image. The protocol is released under CC0 1.0.",
      creditsPL: "Aneks dyplomowy zrealizowany pod kierunkiem prof. dr. hab. Jarosława Bujnego.",
      creditsEN: "Diploma annex supervised by Prof. Jarosław Bujny.",
      cover: degree("para-analog-on-01-w.webp", "16/8", "contain"),
      hero: group([
        degree("para-analog-on-01-w.webp", "7/10", "contain", "W — pierwszy wydruk systemu Para-analog-on.", "W — first print in the Para-analog-on system."),
        degree("para-analog-on-02-o.webp", "7/10", "contain", "O — drugi wydruk systemu Para-analog-on.", "O — second print in the Para-analog-on system."),
        degree("para-analog-on-03-r.webp", "7/10", "contain", "R — trzeci wydruk systemu Para-analog-on.", "R — third print in the Para-analog-on system."),
        degree("para-analog-on-04-d.webp", "7/10", "contain", "D — czwarty wydruk systemu Para-analog-on.", "D — fourth print in the Para-analog-on system.")
      ], "2/1"),
      thumbnail: thumbnail(degree("para-analog-on-01-w.webp", "7/10")),
      related: ["latentne", "gaijin-no-mittsu-no-kuusou"]
    },
    {
      id: "gaijin-no-mittsu-no-kuusou",
      titlePL: "外人の三つの空想 / A Gaijin’s Three Visions",
      titleEN: "外人の三つの空想 / A Gaijin’s Three Visions",
      summaryPL: "Licencjacka praca artystyczna: autorski tryptyk audiowizualny z muzyką, wideo i trzema plakatami.",
      summaryEN: "Bachelor’s artistic work: an original audiovisual triptych combining music, video, and three posters.",
      overviewPL: "Trzy części wizualizują wizje hipnagogiczne, doświadczenie paraliżu sennego i lewitacji oraz syndrom eksplodującej głowy. Muzyka i obraz powstały z użyciem syntezatorów analogowych, syntezowanego śpiewu i grafiki fraktalnej.",
      overviewEN: "Its three parts visualise hypnagogic visions, sleep paralysis and levitation, and exploding head syndrome. The sound and image use analogue synthesisers, synthesised vocals, and fractal graphics.",
      yearPL: "2024",
      yearEN: "2024",
      disciplinesPL: "plakat, wideo, muzyka, grafika fraktalna",
      disciplinesEN: "poster, video, music, fractal graphics",
      formatPL: "tryptyk audiowizualny i trzy plakaty 100 × 70 cm",
      formatEN: "audiovisual triptych and three 100 × 70 cm posters",
      rolePL: "koncepcja, muzyka, wideo, plakaty",
      roleEN: "concept, music, video, posters",
      processHeadingPL: "Muzyka, synteza głosu i obraz fraktalny.",
      processHeadingEN: "Music, voice synthesis, and fractal imagery.",
      processPL: "Oryginalna muzyka, syntezowane wokale i fraktalne wizualizacje tworzą trzy powiązane interpretacje granicznych stanów snu.",
      processEN: "Original music, synthesised vocals, and fractal visualisations form three connected interpretations of liminal sleep states.",
      creditsPL: "Praca licencjacka zrealizowana pod kierunkiem dr. hab. Antoniego Grzybka, prof. UWM.",
      creditsEN: "Bachelor’s artistic work supervised by Dr hab. Antoni Grzybek, Prof. UWM.",
      cover: degree("gaijins-three-visions-01-nyuu-min.webp", "16/8", "contain"),
      hero: group([
        degree("gaijins-three-visions-01-nyuu-min.webp", "7/10", "contain", "Plakat Nyū Min / Enter Sleep z tryptyku A Gaijin’s Three Visions.", "Nyū Min / Enter Sleep poster from A Gaijin’s Three Visions."),
        degree("gaijins-three-visions-02-fuyuu.webp", "7/10", "contain", "Plakat Fuyū / Float Play z tryptyku A Gaijin’s Three Visions.", "Fuyū / Float Play poster from A Gaijin’s Three Visions."),
        degree("gaijins-three-visions-03-nai-atsu.webp", "7/10", "contain", "Plakat Nai Atsu / Internal Pressure z tryptyku A Gaijin’s Three Visions.", "Nai Atsu / Internal Pressure poster from A Gaijin’s Three Visions.")
      ], "2/1"),
      thumbnail: thumbnail(degree("gaijins-three-visions-01-nyuu-min.webp", "7/10")),
      related: ["latentne", "para-analog-on"]
    },
    {
      id: "lem",
      titlePL: "Lem — synteza głosu i system postaci",
      titleEN: "Lem — voice synthesis and character system",
      summaryPL: "Modularny system postaci i rodzina bezpłatnych głosów dla OpenUTAU, UTAU i DiffSinger, rozwijane jako jedna zmienna tożsamość.",
      summaryEN: "A modular character system and family of free voices for OpenUTAU, UTAU, and DiffSinger, developed as one variable identity.",
      overviewPL: "Lem (Lem.ma / 澪夢レム) łączy wielojęzyczne biblioteki głosu z modułową, zmiennokształtną postacią. Warianty wokalne otrzymują odrębne formy — Civet, Quoll, Phascogale, Mongoose, Weasel i Marten — pozostając częścią jednego systemu.",
      overviewEN: "Lem (Lem.ma / 澪夢レム) combines multilingual voice libraries with a modular shapeshifting character. Vocal variants take distinct forms—Civet, Quoll, Phascogale, Mongoose, Weasel, and Marten—while remaining part of one system.",
      yearPL: "",
      yearEN: "",
      disciplinesPL: "system postaci, ilustracja, synteza głosu",
      disciplinesEN: "character system, illustration, voice synthesis",
      formatPL: "biblioteki głosu, model DiffSinger, identyfikacja i dokumentacja",
      formatEN: "voicebanks, DiffSinger model, identity, and documentation",
      rolePL: "projekt postaci i systemu wizualnego, ilustracja, nagrania, etykietowanie fonetyczne, konfiguracja, dokumentacja, strojenie i ewaluacja",
      roleEN: "character and visual-system design, illustration, recording, phonetic labelling, configuration, documentation, tuning, and evaluation",
      processHeadingPL: "Głos, dane i warianty postaci.",
      processHeadingEN: "Voice, data, and character variants.",
      processPL: "Biblioteka obejmuje wielotonowe głosy angielskie i japońskie w systemach Arpasing, VCV, CVVC i VCCV. DiffSinger V2.4 Marten obsługuje język japoński, angielski i polski, deklarowany zakres A2–E5 oraz parametry TENC, VELC i GENC. Wsparcie Asaxi pozostaje planowane i eksperymentalne.",
      processEN: "The library includes multipitch English and Japanese voicebanks using Arpasing, VCV, CVVC, and VCCV. DiffSinger V2.4 Marten supports Japanese, English, and Polish, with a stated A2–E5 range and TENC, VELC, and GENC parameters. Asaxi support remains planned and experimental.",
      creditsPL: "Dane i etykiety DiffSinger: wik_wav. Trening modelu i wsparcie wielomówcze: PixPrucer.",
      creditsEN: "DiffSinger data and labels: wik_wav. Model training and multispeaker support: PixPrucer.",
      cover: group([
        lem("lem-v4-utau-civet-transparent.webp", "1/2", "contain", "Pełnopostaciowa forma Civet postaci Lem: smukła antropomorficzna cyweta w sportowym stroju, z długim ogonem.", "Full-body Lem Civet form: a slim anthropomorphic civet in sportswear with a long tail."),
        lem("lem-v4-utau-quoll-transparent.webp", "1/2", "contain", "Pełnopostaciowa forma Quoll postaci Lem: cętkowany antropomorficzny niełaz o masywnej sylwetce.", "Full-body Lem Quoll form: a spotted anthropomorphic quoll with a stocky build."),
        lem("lem-v4-utau-phascogale-transparent.webp", "1/2", "contain", "Pełnopostaciowa forma Phascogale postaci Lem: niewysoka sylwetka z dużymi uszami i kokardą na ogonie.", "Full-body Lem Phascogale form: a short figure with large ears and a ribbon tied around the tail.")
      ]),
      hero: image(
        "assets/media/lem/lem-three-forms-hero.webp",
        "2/1",
        "contain",
        "Trzy pełnopostaciowe formy Lem: Civet, Quoll i Phascogale, ustawione obok siebie.",
        "Three full-body Lem forms—Civet, Quoll, and Phascogale—arranged side by side.",
        { noPadding: true, mobileRatio: "2/1" }
      ),
      thumbnail: image(
        "assets/media/lem/lem-three-forms-thumbnail.webp",
        "4/3",
        "contain",
        "Trzy pełnopostaciowe formy Lem: Civet, Quoll i Phascogale, ustawione obok siebie.",
        "Three full-body Lem forms—Civet, Quoll, and Phascogale—arranged side by side.",
        { noPadding: true }
      ),
      related: ["lozenge-t", "gaijin-no-mittsu-no-kuusou"]
    },
    {
      id: "lozenge-t",
      titlePL: "Lozenge T.",
      titleEN: "Lozenge T.",
      summaryPL: "Projekt worldbuildingowy łączący fikcyjny świat, język Asaxi, autorski system pisma oraz dokumentację i narzędzia przeglądarkowe.",
      summaryEN: "A worldbuilding project connecting a fictional setting, the Asaxi language, an original writing system, documentation, and browser tools.",
      overviewPL: "Lozenge T. rozwija fikcyjny, częściowo wewnętrznie spójny świat. Powiązany z nim język Asaxi obejmuje gramatykę, leksykon, system pisma Pabaka i narzędzia wspierające pracę z językiem.",
      overviewEN: "Lozenge T. develops a fictional, partly internally consistent world. Its associated Asaxi language includes a grammar, lexicon, the Pabaka writing system, and tools for working with the language.",
      yearPL: "",
      yearEN: "",
      disciplinesPL: "worldbuilding, język konstruowany, projektowanie pisma, dokumentacja, narzędzia webowe",
      disciplinesEN: "worldbuilding, constructed language, type design, documentation, web tools",
      formatPL: "świat fikcyjny, język, krój pisma, dokumentacja i narzędzia",
      formatEN: "fictional world, language, typeface, documentation, and tools",
      rolePL: "koncepcja świata, konstrukcja języka, projekt pisma i kroju, dokumentacja, interfejs",
      roleEN: "world concept, language construction, writing-system and type design, documentation, interface",
      processHeadingPL: "Język, pismo i narzędzia.",
      processHeadingEN: "Language, script, and tools.",
      processPL: "Świat, język Asaxi, system pisma Pabaka, dokumentacja i narzędzia przeglądarkowe są rozwijane jako połączone części jednego projektu worldbuildingowego.",
      processEN: "The setting, Asaxi language, Pabaka script, documentation, and browser tools are developed as connected parts of one worldbuilding project.",
      creditsPL: "Koncepcja świata i języka, projekt systemu pisma i kroju, dokumentacja oraz narzędzia: Wiktor Sielaszuk.",
      creditsEN: "World and language concept, writing-system and type design, documentation, and tools: Wiktor Sielaszuk.",
      cover: lozengeAlphabet,
      hero: wide(lozengeAlphabet),
      thumbnail: thumbnail(lozengeAlphabet),
      externalLinks: [
        { href: "https://wik-wav.github.io/lozenge-tessellation/", labelPL: "Lozenge T. — otwórz projekt", labelEN: "Open Lozenge T." },
        { href: "https://wik-wav.github.io/lozenge-tessellation/grammar", labelPL: "Gramatyka Asaxi", labelEN: "Asaxi grammar" }
      ],
      scriptTitlePL: "Pabaka — pismo Asaxi",
      scriptTitleEN: "Pabaka — the Asaxi script",
      scriptSummaryPL: "Transliteracja pozostaje czytelna obok znaków renderowanych na żywo w kroju Pabaka. Dwuznaki korzystają ze standardowych ligatur OpenType.",
      scriptSummaryEN: "The transliteration remains visible beside live Pabaka glyphs. Digraphs use standard OpenType ligatures.",
      scriptRows: [
        ["p", "b", "k", "g", "s", "z", "ś", "sh", "jh", "h"],
        ["j", "w", "ŕ", "d", "t", "zh", "m", "ng", "l", "c"],
        ["th", "v", "n", "dh", "x", "f", "nj", "ch", "dz", "r"],
        ["a", "ă", "á", "å", "o", "ő", "ỏ", "i"],
        ["e", "ë", "è", "ě", "ý", "ù", "ů", "ń"]
      ],
      scriptSpecimen: "pabaka sh jh ng th dh nj ch dz zh",
      related: ["lem", "para-analog-on"]
    },
    {
      id: "book-cover",
      titlePL: "Książka, której nie napisałem",
      titleEN: "The Book I Did Not Write",
      summaryPL: "Projekt okładki książki Mariusza Obiedzińskiego, wydanej przez Novae Res w 2025 roku.",
      summaryEN: "Book-cover design for Mariusz Obiedziński, published by Novae Res in 2025.",
      overviewPL: "Projekt okładki porządkuje relację tytułu, nazwiska autora i pola obrazu w zwartej kompozycji wydawniczej.",
      overviewEN: "The cover design organises the title, author’s name, and image field into a compact publishing composition.",
      yearPL: "2025",
      yearEN: "2025",
      disciplinesPL: "projekt okładki, typografia",
      disciplinesEN: "cover design, typography",
      formatPL: "okładka książki",
      formatEN: "book cover",
      rolePL: "projekt okładki",
      roleEN: "cover design",
      processHeadingPL: "Typografia i kompozycja okładki.",
      processHeadingEN: "Typography and cover composition.",
      processPL: "Zakres obejmował opracowanie okładki dla wydania Novae Res.",
      processEN: "The scope covered the book jacket design for the Novae Res edition.",
      creditsPL: "Projekt okładki: Wiktor Sielaszuk. Autor: Mariusz Obiedziński. Wydawca: Novae Res.",
      creditsEN: "Cover design: Wiktor Sielaszuk. Author: Mariusz Obiedziński. Publisher: Novae Res.",
      cover: image(
        "assets/media/book-cover/book-cover-obiedzinski-mockup.webp",
        "4/3",
        "cover",
        "Makieta książki „Książka, której nie napisałem” Mariusza Obiedzińskiego i pasującej zakładki na jasnym biurku.",
        "Mockup of Mariusz Obiedziński’s book The Book I Did Not Write with a matching bookmark on a light desk.",
        { disclosure: bookMockupDisclosure }
      ),
      hero: wide(image(
        "assets/media/book-cover/book-cover-obiedzinski-mockup.webp",
        "4/3",
        "cover",
        "Makieta książki „Książka, której nie napisałem” Mariusza Obiedzińskiego i pasującej zakładki na jasnym biurku.",
        "Mockup of Mariusz Obiedziński’s book The Book I Did Not Write with a matching bookmark on a light desk.",
        { disclosure: bookMockupDisclosure }
      )),
      thumbnail: thumbnail(image(
        "assets/media/book-cover/book-cover-obiedzinski-mockup.webp",
        "4/3",
        "cover",
        "Makieta książki „Książka, której nie napisałem” Mariusza Obiedzińskiego i pasującej zakładki na jasnym biurku.",
        "Mockup of Mariusz Obiedziński’s book The Book I Did Not Write with a matching bookmark on a light desk.",
        { disclosure: bookMockupDisclosure }
      )),
      related: ["lozenge-t", "latentne"]
    },
    {
      id: "windows-zine",
      titlePL: "WIN / DOWS",
      titleEN: "WIN / DOWS",
      summaryPL: "Zin z 2023 roku łączący ASCII art stworzony przez ChatGPT w rozmowie z Wiktorem ze skanografią i autorskim projektem redakcyjnym.",
      summaryEN: "A 2023 zine combining ASCII art created by ChatGPT in conversation with Wiktor, scanography, and an original editorial design.",
      overviewPL: "Zin powstały na zajęciach projektowych na studiach artystycznych. Łączy ASCII art stworzony przez ChatGPT w rozmowie z Wiktorem ze skanografią wykorzystaną jako narzędzie budowania obrazu.",
      overviewEN: "A zine developed for a university design class. It combines ASCII art created by ChatGPT in conversation with Wiktor and scanography used as an image-making method.",
      statementPL: "Wiktor reflects\non language models\nas if\non language models\ndid his future depend",
      statementEN: "Wiktor reflects\non language models\nas if\non language models\ndid his future depend",
      yearPL: "2023",
      yearEN: "2023",
      disciplinesPL: "projekt redakcyjny, skanografia, typografia",
      disciplinesEN: "editorial design, scanography, typography",
      formatPL: "zin: okładki i osiem rozkładówek",
      formatEN: "zine: covers and eight spreads",
      rolePL: "koncepcja, redakcja, projekt i skanografia",
      roleEN: "concept, editing, design, and scanography",
      processHeadingPL: "ASCII, skanografia i skład zina.",
      processHeadingEN: "ASCII, scanography, and zine layout.",
      processPL: "ASCII art powstał w rozmowie z ChatGPT, a Wiktor opracował koncepcję, redakcję, układ oraz warstwę skanograficzną zina.",
      processEN: "The ASCII art was created in conversation with ChatGPT; Wiktor authored the zine’s concept, editing, layout, and scanographic imagery.",
      creditsPL: "Koncepcja, redakcja, projekt i skanografia: Wiktor Sielaszuk. ASCII art: ChatGPT w rozmowie z Wiktorem.",
      creditsEN: "Concept, editing, design, and scanography: Wiktor Sielaszuk. ASCII art: ChatGPT in conversation with Wiktor.",
      provenance: { creationYear: "2023", source: "XMP źródłowych plików / source-file XMP" },
      cover: zine("windows-zine-mockup-01-hero.webp", "4/3", "cover", "Mockup zina WIN / DOWS na szklanym stole, pokazujący okładkę i rozkładówkę.", "WIN / DOWS zine mockup on a glass table, showing the cover and an open spread.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") }),
      hero: wide(zine("windows-zine-mockup-01-hero.webp", "4/3", "cover", "Mockup zina WIN / DOWS na szklanym stole, pokazujący okładkę i rozkładówkę.", "WIN / DOWS zine mockup on a glass table, showing the cover and an open spread.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") })),
      thumbnail: thumbnail(zine("windows-zine-mockup-01-hero.webp", "4/3", "cover", "Mockup zina WIN / DOWS na szklanym stole, pokazujący okładkę i rozkładówkę.", "WIN / DOWS zine mockup on a glass table, showing the cover and an open spread.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") })),
      detailSequenceIds: ["windows-zine-mockup-01", ...Array.from({ length: 10 }, (_, index) => `windows-zine-page-${String(index + 1).padStart(2, "0")}`), "windows-zine-mockup-02", "windows-zine-mockup-03"],
      related: ["para-analog-on", "book-cover"]
    },
    {
      id: "cover-art",
      titlePL: "Okładki",
      titleEN: "Cover Art",
      summaryPL: "Wybrane projekty okładek, w tym dwie okładki singli SVREN.",
      summaryEN: "Selected cover artwork, including two single covers for SVREN.",
      overviewPL: "Kolekcja pokazuje trzy odrębne podejścia do kwadratowego pola okładki: abstrakcję, malarską narrację i ilustrację pejzażową.",
      overviewEN: "The collection presents three distinct approaches to the square cover format: abstraction, painterly narrative, and landscape illustration.",
      yearPL: "",
      yearEN: "",
      disciplinesPL: "projekt okładek, ilustracja",
      disciplinesEN: "cover design, illustration",
      formatPL: "trzy projekty okładek",
      formatEN: "three cover artworks",
      rolePL: "koncepcja i projekt okładek",
      roleEN: "cover concepts and design",
      processHeadingPL: "Trzy podejścia do kwadratowego formatu.",
      processHeadingEN: "Three approaches to the square format.",
      processPL: "Każda okładka została opracowana jako samodzielna kompozycja, z naciskiem na kolor, rytm i czytelność w kwadratowym formacie.",
      processEN: "Each cover was developed as a self-contained composition, emphasising colour, rhythm, and legibility in a square format.",
      creditsPL: "Projekt okładek: Wiktor Sielaszuk.",
      creditsEN: "Cover artwork: Wiktor Sielaszuk.",
      cover: coverArt("cover-art-01-untitled.webp", "Kwadratowa abstrakcyjna okładka w granacie i miedzianym różu z pionowym japońskim napisem.", "Square abstract cover in navy and copper-pink with vertical Japanese lettering."),
      hero: group([
        coverArt("cover-art-01-untitled.webp", "Kwadratowa abstrakcyjna okładka w granacie i miedzianym różu z pionowym japońskim napisem.", "Square abstract cover in navy and copper-pink with vertical Japanese lettering."),
        coverArt("cover-art-02-cloud-flow-free.webp", "Jasna malarska okładka z zielono-turkusowymi płaszczyznami przypominającymi górę, wodę i chmury.", "Light painterly cover with green-and-turquoise planes suggesting a mountain, water, and clouds."),
        coverArt("cover-art-03-midsummer-journey.webp", "Akwarelowa okładka z jasnym leśnym pejzażem, smukłymi pniami i czerwonymi kwiatami.", "Watercolour cover with a bright woodland scene, slender trunks, and red flowers.")
      ], "2/1"),
      thumbnail: thumbnail(coverArt("cover-art-01-untitled.webp", "Kwadratowa abstrakcyjna okładka w granacie i miedzianym różu z pionowym japońskim napisem.", "Square abstract cover in navy and copper-pink with vertical Japanese lettering.")),
      related: ["book-cover", "windows-zine"]
    },
    {
      id: "small-design-projects",
      titlePL: "Mniejsze projekty",
      titleEN: "Small Design Projects",
      summaryPL: "Mniejsze realizacje z zakresu ikon, identyfikacji wizualnej i grafiki użytkowej.",
      summaryEN: "A collection of smaller icon, visual-identity, and applied-design projects.",
      overviewPL: "Zbiór krótkich realizacji odpowiadających na konkretne zastosowania — od ikon interfejsowych po samodzielne elementy identyfikacji.",
      overviewEN: "Focused responses to specific design needs, from interface-scale icons to standalone identity elements.",
      yearPL: "",
      yearEN: "",
      disciplinesPL: "projekt ikony, identyfikacja wizualna",
      disciplinesEN: "icon design, visual identity",
      formatPL: "kolekcja mniejszych realizacji",
      formatEN: "collection of small design works",
      rolePL: "koncepcja i projekt graficzny",
      roleEN: "concept and graphic design",
      processHeadingPL: "Skala, funkcja i czytelność.",
      processHeadingEN: "Scale, function, and legibility.",
      processPL: "Każda realizacja odpowiada na określone zastosowanie, skalę i kontekst użycia.",
      processEN: "Each work responds to a defined application, scale, and context of use.",
      creditsPL: "Projekt graficzny: Wiktor Sielaszuk.",
      creditsEN: "Graphic design: Wiktor Sielaszuk.",
      cover: smallDesignIcon,
      hero: wide(smallDesignIcon),
      thumbnail: thumbnail(smallDesignIcon),
      related: ["lem", "lozenge-t"]
    },
    {
      id: "character-art",
      titlePL: "Postaci - ilustracje",
      titleEN: "Character Art",
      summaryPL: "Wybrane ilustracje postaci i plansze projektowe — od pełnych sylwetek po rozbudowane widoki referencyjne.",
      summaryEN: "Selected character illustrations and design sheets, from full figures to detailed reference turnarounds.",
      overviewPL: "Kolekcja zestawia ilustrację postaci z dokumentacją projektową. Obejmuje cyfrowe sylwetki, plansze referencyjne oraz tradycyjny rysunek tuszem i lawowaniem.",
      overviewEN: "The collection pairs character illustration with design documentation. It includes digital figures, reference sheets, and a traditional ink-and-wash drawing.",
      yearPL: "",
      yearEN: "",
      disciplinesPL: "ilustracja postaci, projektowanie postaci",
      disciplinesEN: "character illustration, character design",
      formatPL: "ilustracje i plansze referencyjne",
      formatEN: "illustrations and reference sheets",
      rolePL: "ilustracja i opracowanie plansz",
      roleEN: "illustration and reference-sheet development",
      processHeadingPL: "Od sylwetki do planszy referencyjnej.",
      processHeadingEN: "From silhouette to reference sheet.",
      processPL: "Prace rozwijają sylwetkę, kostium, proporcje i gest poprzez ilustracje końcowe oraz plansze obrotowe.",
      processEN: "The works develop silhouette, wardrobe, proportions, and gesture through finished illustrations and turnaround sheets.",
      creditsPL: "Ilustracje i opracowanie plansz: Wiktor Sielaszuk.",
      creditsEN: "Illustrations and reference-sheet development: Wiktor Sielaszuk.",
      cover: character("character-art-01-cami-possum-witch.webp", "7/10", "contain", "Pełnopostaciowa ilustracja Cami, oposiej wiedźmy, z laską i długim ogonem.", "Full-body illustration of Cami, a possum witch, with a staff and long tail."),
      hero: group([
        character("character-art-01-cami-possum-witch.webp", "7/10", "contain", "Pełnopostaciowa ilustracja Cami, oposiej wiedźmy, z laską i długim ogonem.", "Full-body illustration of Cami, a possum witch, with a staff and long tail."),
        character("character-art-02-kiyomi.webp", "7/10", "contain", "Pełnopostaciowa ilustracja Kiyomi, antropomorficznej króliczki z długimi opadającymi uszami, układającej dłonie w serce, w warstwowym czarnym stroju i berecie.", "Full-body illustration of Kiyomi, an anthropomorphic rabbit with long floppy ears, making a heart gesture in a layered black outfit and beret."),
        character("character-art-03-lem-banded-palm-civet.webp", "7/10", "contain", "Pełnopostaciowa forma Lem — Banded Palm Civet.", "Full-body Lem — Banded Palm Civet form.")
      ], "2/1"),
      thumbnail: thumbnail(character("character-art-01-cami-possum-witch.webp", "7/10", "contain", "Pełnopostaciowa ilustracja Cami, oposiej wiedźmy, z laską i długim ogonem.", "Full-body illustration of Cami, a possum witch, with a staff and long tail.")),
      related: ["lem", "cover-art"]
    },
    {
      id: "dissonance-perspective",
      titlePL: "Dissonance Perspective",
      titleEN: "Dissonance Perspective",
      summaryPL: "Autorska realizacja audiowizualna badająca granicę między harmonią a szumem.",
      summaryEN: "An original audiovisual work exploring the boundary between harmony and noise.",
      overviewPL: "Autorska realizacja audiowizualna badająca granicę między harmonią a szumem, pokazująca kompetencje w Blenderze i animacji 3D, realizacji wizualizera, produkcji muzyki, aranżacji, miksie i montażu w DaVinci Resolve.",
      overviewEN: "An original audiovisual work exploring the boundary between harmony and noise, demonstrating work in Blender and 3D animation, visualiser production, music production, arrangement, mixing, and editing in DaVinci Resolve.",
      yearPL: "2026",
      yearEN: "2026",
      disciplinesPL: "wideo, animacja 3D, muzyka",
      disciplinesEN: "video, 3D animation, music",
      formatPL: "wideo 1920 × 1080, 2:22",
      formatEN: "1920 × 1080 video, 2:22",
      rolePL: "muzyka, aranżacja, miks i wizualizer",
      roleEN: "music, arrangement, mix, and visualiser",
      processHeadingPL: "Animacja 3D, muzyka i montaż.",
      processHeadingEN: "3D animation, music, and editing.",
      processPL: "Animowane układy geometryczne powstały w Blenderze, a finalny obraz i dźwięk zostały zmontowane w DaVinci Resolve.",
      processEN: "Animated geometric systems were created in Blender, with the final image and sound edited in DaVinci Resolve.",
      creditsPL: "Muzyka, aranżacja, miks i wizualizer: wik_wav.",
      creditsEN: "Music, Arrangement, Mix, Visualizer: wik_wav.",
      sourceVideo: { width: 1920, height: 1080, fps: 24, duration: "02:21.79", author: "wik_wav", published: "2026-03-07" },
      cover: dissonance("dissonance-perspective-02-hero-0104.webp", "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.", "White concentric rings on black from Dissonance Perspective."),
      hero: wide(dissonance("dissonance-perspective-02-hero-0104.webp", "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.", "White concentric rings on black from Dissonance Perspective.")),
      thumbnail: thumbnail(dissonance("dissonance-perspective-02-hero-0104.webp", "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.", "White concentric rings on black from Dissonance Perspective.")),
      detailSequenceIds: ["dissonance-still-01", "dissonance-video", "dissonance-still-03", "dissonance-still-04"],
      related: ["gaijin-no-mittsu-no-kuusou", "windows-zine"]
    }
  ];

  const latentneSpecs = [
    ["graph-of-babel", "Graph of Babel", "latentne-01-graph-of-babel.webp", "10/7", "Żółto-turkusowa kompozycja z organiczną strukturą przypominającą plaster i warstwami cyfrowych śladów.", "Yellow-and-turquoise composition with an organic honeycomb-like structure and layered digital traces."],
    ["emergent-hardware", "Emergent Hardware", "latentne-02-emergent-hardware.webp", "10/7", "Gęsta kobaltowa kompozycja z turkusowymi liniami, blokami i rozproszonymi czarnymi modułami.", "Dense cobalt composition with turquoise lines, blocks, and scattered black modules."],
    ["mainframe", "Mainframe", "latentne-03-mainframe.webp", "10/7", "Jasnożółta kompozycja z szarą, zapętloną formą i delikatną siecią linii.", "Pale-yellow composition with a grey looping form and a fine network of lines."],
    ["foot-of-loss-mountain", "Foot of Loss Mountain", "latentne-04-foot-of-loss-mountain.webp", "10/7", "Kobaltowa kompozycja z krystalicznymi strukturami, czarnymi płaszczyznami i turkusowymi refleksami.", "Cobalt composition with crystalline structures, black planes, and turquoise highlights."],
    ["mirror-intelligence", "Mirror Intelligence", "latentne-05-mirror-intelligence.webp", "10/7", "Ciemnoniebieski pejzaż cyfrowy z centralną, kanciastą czarno-białą strukturą.", "Dark-blue digital landscape with a central angular black-and-white structure."],
    ["loss-mountain-up-close", "Loss Mountain Up Close", "latentne-06-loss-mountain-up-close.webp", "10/7", "Żółta kompozycja z turkusowym prostokątnym polem i miękkimi, poziomymi smugami.", "Yellow composition with a turquoise rectangular field and soft horizontal traces."],
    ["digital-weed", "Digital Weed", "latentne-07-digital-weed.webp", "10/7", "Turkusowo-żółta kompozycja o pofragmentowanej, siatkowej strukturze.", "Turquoise-and-yellow composition with a fragmented grid-like structure."],
    ["emergent-hallucinations", "Emergent Hallucinations", "latentne-08-emergent-hallucinations.webp", "10/7", "Kobaltowe pole z rozproszonymi czarnymi i różowymi fragmentami wokół ciemnego kwadratu.", "Cobalt field with scattered black and pink fragments around a dark square."],
    ["emergent-hardware-detail-1", "Emergent Hardware — Detail 1", "latentne-09-emergent-hardware-detail-1.webp", "7/10", "Pionowy detal w żółci i turkusie z geometrycznymi konturami oraz cyfrowymi śladami.", "Portrait detail in yellow and turquoise with geometric outlines and digital traces."],
    ["emergent-hardware-detail-2", "Emergent Hardware — Detail 2", "latentne-10-emergent-hardware-detail-2.webp", "7/10", "Pionowy żółty detal z drobną siecią linii i turkusowym obrzeżem.", "Portrait yellow detail with a fine line network and turquoise edge."],
    ["mainframe-detail-1", "Mainframe — Detail 1", "latentne-11-mainframe-detail-1.webp", "7/10", "Pionowy detal z nakładającymi się turkusowymi i kobaltowymi prostokątami.", "Portrait detail with overlapping turquoise and cobalt rectangles."],
    ["mainframe-detail-2", "Mainframe — Detail 2", "latentne-12-mainframe-detail-2.webp", "7/10", "Pionowy kobaltowy detal z turkusową, architektoniczną strukturą przy dolnej krawędzi.", "Portrait cobalt detail with a turquoise architectural structure near the lower edge."]
  ];

  const latentneWorks = latentneSpecs.map(([slug, title, file, ratio, altPL, altEN], index) => work({
    id: `latentne-${String(index + 1).padStart(2, "0")}-${slug}`,
    project: "latentne",
    year: "2026",
    medium: "digital",
    types: ["illustration", "generative"],
    mediaType: "image",
    cover: degree(file, ratio),
    titlePL: title,
    titleEN: title,
    summaryPL: `Praca ${index + 1} z 12-częściowego cyklu „Latentne”.`,
    summaryEN: `Work ${index + 1} from the 12-part Latentne series.`,
    altPL,
    altEN,
    captionPL: `Wiktor Sielaszuk, ${title.replace(" — Detail", " — detal")}, z cyklu „Latentne”, grafika cyfrowa, 2026.`,
    captionEN: `Wiktor Sielaszuk, ${title}, from the Latentne series, digital artwork, 2026.`,
    featured: index === 0
  }));

  const paraSpecs = [
    ["w", "W", "para-analog-on-01-w.webp", "Biała plansza typograficzna z gęstą siecią opisów, falującym konturem i dużą literą W.", "White typographic board with dense descriptive text, a wavering contour, and a large W."],
    ["o", "O", "para-analog-on-02-o.webp", "Biała plansza z dużą literą O oraz kaskadą tekstu zwężającą się ku dołowi.", "White board with a large O and a cascade of text narrowing toward the bottom."],
    ["r", "R", "para-analog-on-03-r.webp", "Gęsta czarno-biała kompozycja typograficzna z literą R i warstwami opisów.", "Dense black-and-white typographic composition with an R and layered descriptions."],
    ["d", "D", "para-analog-on-04-d.webp", "Biała plansza z wielowarstwowym tekstem, konturem postaci i dużą literą D.", "White board with layered text, a figure outline, and a large D."]
  ];

  const paraWorks = paraSpecs.map(([slug, title, file, altPL, altEN], index) => work({
    id: `para-analog-on-${String(index + 1).padStart(2, "0")}-${slug}`,
    project: "para-analog-on",
    year: "2026",
    medium: "digital",
    types: ["poster", "typography", "generative"],
    mediaType: "image",
    cover: degree(file, "7/10"),
    titlePL: title,
    titleEN: title,
    summaryPL: `Plansza ${index + 1} z czteroczęściowej realizacji protokołu Para-analog-on.`,
    summaryEN: `Board ${index + 1} from the four-part Para-analog-on protocol execution.`,
    altPL,
    altEN,
    captionPL: `Wiktor Sielaszuk, ${title}, z cyklu „Para-analog-on”, grafika cyfrowa, 2026.`,
    captionEN: `Wiktor Sielaszuk, ${title}, from the Para-analog-on series, digital artwork, 2026.`,
    featured: index === 0
  }));

  const gaijinPosterSpecs = [
    ["nyuu-min", "入眠 / Nyū Min / Enter Sleep", "gaijins-three-visions-01-nyuu-min.webp", "Ciemny plakat z japońskimi znakami 入眠 i warstwową, fraktalną kompozycją.", "Dark poster with the Japanese characters 入眠 and a layered fractal composition."],
    ["fuyuu", "浮遊 / Fuyū / Float Play", "gaijins-three-visions-02-fuyuu.webp", "Jasny plakat z dużymi znakami 浮遊 i lekkimi, unoszącymi się formami.", "Pale poster with large 浮遊 characters and light, floating forms."],
    ["nai-atsu", "内圧 / Nai Atsu / Internal Pressure", "gaijins-three-visions-03-nai-atsu.webp", "Ciemny plakat z japońskimi znakami 内圧 i zwartą, centralną strukturą.", "Dark poster with the Japanese characters 内圧 and a compact central structure."]
  ];

  const gaijinWorks = gaijinPosterSpecs.map(([slug, title, file, altPL, altEN], index) => work({
    id: `gaijins-three-visions-${String(index + 1).padStart(2, "0")}-${slug}`,
    project: "gaijin-no-mittsu-no-kuusou",
    year: "2024",
    medium: "digital",
    types: ["poster", "illustration", "generative"],
    mediaType: "image",
    cover: degree(file, "7/10"),
    titlePL: title,
    titleEN: title,
    summaryPL: `Plakat ${index + 1} z tryptyku „A Gaijin’s Three Visions”.`,
    summaryEN: `Poster ${index + 1} from the A Gaijin’s Three Visions triptych.`,
    altPL,
    altEN,
    captionPL: `Wiktor Sielaszuk, ${title}, z cyklu „A Gaijin’s Three Visions”, grafika cyfrowa, 100 × 70 cm, 2024.`,
    captionEN: `Wiktor Sielaszuk, ${title}, from A Gaijin’s Three Visions, digital artwork, 100 × 70 cm, 2024.`
  }));

  gaijinWorks.push(work({
    id: "gaijins-three-visions-04-video",
    project: "gaijin-no-mittsu-no-kuusou",
    year: "2024",
    medium: "digital",
    types: ["motion", "video", "sound", "generative"],
    mediaType: "video",
    cover: degree("gaijins-three-visions-01-nyuu-min.webp", "16/9"),
    video: {
      provider: "youtube",
      id: "0qHNBdlIDoA",
      poster: degree("gaijins-three-visions-01-nyuu-min.webp", "16/9")
    },
    titlePL: "外人の三つの空想 — wideo",
    titleEN: "A Gaijin’s Three Visions — video",
    summaryPL: "Pełna realizacja audiowizualna tryptyku: oryginalna muzyka i fraktalna sztuka wideo.",
    summaryEN: "The complete audiovisual triptych: original music and fractal video art.",
    altPL: "Kadr zastępczy wideo wykorzystujący plakat „Nyū Min”.",
    altEN: "Video poster fallback using the Nyū Min artwork.",
    captionPL: "„外人の三つの空想 (A Gaijin’s Three Visions) | Fractal Video Art [JWildfire / Mandelbulb3D]”, 2024.",
    captionEN: "“外人の三つの空想 (A Gaijin’s Three Visions) | Fractal Video Art [JWildfire / Mandelbulb3D],” 2024.",
    featured: true
  }));

  const lemWork = (entry) => work({
    project: "lem",
    year: null,
    medium: "digital",
    types: ["illustration", "character-design", "vocal-synthesis"],
    mediaType: "image",
    galleryVisible: true,
    ...entry
  });

  const lemWorks = [
    lemWork({ id: "lem-01-civet-identity", cover: lem("lem-v4-utau-civet-transparent.webp", "1/2"), titlePL: "Lem V4 — Civet", titleEN: "Lem V4 — Civet", summaryPL: "Pierwsza z trzech form V4/V4Bi w systemie jednej zmiennej tożsamości.", summaryEN: "The first of three V4/V4Bi forms within one variable identity.", altPL: "Pełnopostaciowa forma Civet postaci Lem: smukła antropomorficzna cyweta w sportowym stroju, z długim ogonem.", altEN: "Full-body Lem Civet form: a slim anthropomorphic civet in sportswear with a long tail.", captionPL: "Forma Civet — warianty wokalne Main i Head Voice.", captionEN: "Civet form—Main and Head Voice vocal variants.", galleryVisible: true, featured: true }),
    lemWork({ id: "lem-02-quoll-identity", cover: lem("lem-v4-utau-quoll-transparent.webp", "1/2"), titlePL: "Lem V4 — Quoll", titleEN: "Lem V4 — Quoll", summaryPL: "Forma Quoll rozwijająca wspólną identyfikację V4/V4Bi.", summaryEN: "The Quoll form extending the shared V4/V4Bi identity.", altPL: "Pełnopostaciowa forma Quoll postaci Lem: cętkowany antropomorficzny niełaz o masywnej sylwetce.", altEN: "Full-body Lem Quoll form: a spotted anthropomorphic quoll with a stocky build.", captionPL: "Forma Quoll — warianty wokalne Main i Head Voice.", captionEN: "Quoll form—Main and Head Voice vocal variants." }),
    lemWork({ id: "lem-03-phascogale-identity", cover: lem("lem-v4-utau-phascogale-transparent.webp", "1/2"), titlePL: "Lem V4 — Phascogale", titleEN: "Lem V4 — Phascogale", summaryPL: "Forma Phascogale dopełniająca trzyczęściowy system V4/V4Bi.", summaryEN: "The Phascogale form completing the three-part V4/V4Bi system.", altPL: "Pełnopostaciowa forma Phascogale postaci Lem: niewysoka sylwetka z dużymi uszami i kokardą na ogonie.", altEN: "Full-body Lem Phascogale form: a short figure with large ears and a ribbon tied around the tail.", captionPL: "Forma Phascogale — warianty wokalne Main i Head Voice.", captionEN: "Phascogale form—Main and Head Voice vocal variants." }),
    lemWork({ id: "lem-04-civet-illustration", cover: lem("lem-v4-utau-civet-illustration.webp", "7/10"), titlePL: "Civet — ilustracja systemowa", titleEN: "Civet — system illustration", summaryPL: "Ilustracja prezentująca wizualną interpretację wariantu Civet.", summaryEN: "Illustration presenting the visual interpretation of the Civet variant.", altPL: "Kolorowa pełnopostaciowa ilustracja formy Civet postaci Lem.", altEN: "Colour full-body illustration of Lem’s Civet form.", captionPL: "Ilustracja systemowa formy Civet.", captionEN: "System illustration for the Civet form.", projectPageVisible: false }),
    lemWork({ id: "lem-05-quoll-illustration", cover: lem("lem-v4-utau-quoll-illustration.webp", "7/10"), titlePL: "Quoll — ilustracja systemowa", titleEN: "Quoll — system illustration", summaryPL: "Ilustracja prezentująca wizualną interpretację wariantu Quoll.", summaryEN: "Illustration presenting the visual interpretation of the Quoll variant.", altPL: "Kolorowa pełnopostaciowa ilustracja formy Quoll postaci Lem.", altEN: "Colour full-body illustration of Lem’s Quoll form.", captionPL: "Ilustracja systemowa formy Quoll.", captionEN: "System illustration for the Quoll form.", galleryVisible: true, projectPageVisible: false }),
    lemWork({ id: "lem-06-phascogale-illustration", cover: lem("lem-v4-utau-phascogale-illustration.webp", "7/10"), titlePL: "Phascogale — ilustracja systemowa", titleEN: "Phascogale — system illustration", summaryPL: "Ilustracja prezentująca wizualną interpretację wariantu Phascogale.", summaryEN: "Illustration presenting the visual interpretation of the Phascogale variant.", altPL: "Kolorowa pełnopostaciowa ilustracja formy Phascogale postaci Lem.", altEN: "Colour full-body illustration of Lem’s Phascogale form.", captionPL: "Ilustracja systemowa formy Phascogale.", captionEN: "System illustration for the Phascogale form.", projectPageVisible: false }),
    lemWork({ id: "lem-07-civet-sideview", cover: lem("lem-banded-palm-civet-sideview.webp", "2/3"), titlePL: "Civet — profil", titleEN: "Civet — side view", summaryPL: "Profil porządkujący proporcje i cechy formy Civet.", summaryEN: "Side view defining the proportions and features of the Civet form.", altPL: "Profilowe popiersie formy Civet postaci Lem, zwrócone w lewo, z pomarańczowym kucykiem, opaską, czerwonym kołnierzem i niebieskim topem.", altEN: "Left-facing profile bust of Lem’s Civet form with an orange ponytail, patterned headband, red collar, and blue top.", captionPL: "Widok boczny formy Civet.", captionEN: "Civet form side view.", projectGroup: "lem-sideviews", projectGroupLabelPL: "Widoki boczne", projectGroupLabelEN: "Side views" }),
    lemWork({ id: "lem-08-quoll-sideview", cover: lem("lem-quoll-sideview.webp", "2/3"), titlePL: "Quoll — profil", titleEN: "Quoll — side view", summaryPL: "Profil porządkujący proporcje i cechy formy Quoll.", summaryEN: "Side view defining the proportions and features of the Quoll form.", altPL: "Profilowe popiersie formy Quoll postaci Lem, zwrócone w lewo, z cętkowanym futrem, pomarańczowym kucykiem i jasną kurtką.", altEN: "Left-facing profile bust of Lem’s Quoll form with spotted fur, an orange ponytail, and a pale jacket.", captionPL: "Widok boczny formy Quoll.", captionEN: "Quoll form side view.", projectGroup: "lem-sideviews", projectGroupLabelPL: "Widoki boczne", projectGroupLabelEN: "Side views" }),
    lemWork({ id: "lem-09-phascogale-sideview", cover: lem("lem-phascogale-sideview.webp", "2/3"), titlePL: "Phascogale — profil", titleEN: "Phascogale — side view", summaryPL: "Profil porządkujący proporcje i cechy formy Phascogale.", summaryEN: "Side view defining the proportions and features of the Phascogale form.", altPL: "Profilowe popiersie formy Phascogale postaci Lem, zwrócone w lewo, z dużymi okrągłymi uszami, pomarańczowym kucykiem i krótką bluzą.", altEN: "Left-facing profile bust of Lem’s Phascogale form with large round ears, an orange ponytail, and a cropped hoodie.", captionPL: "Widok boczny formy Phascogale.", captionEN: "Phascogale form side view.", galleryVisible: true, projectGroup: "lem-sideviews", projectGroupLabelPL: "Widoki boczne", projectGroupLabelEN: "Side views" }),
    lemWork({ id: "lem-10-mongoose-transparent", cover: lem("lem-shapeshifter-mongoose-transparent.webp", "1/2"), year: "2024", titlePL: "Mongoose 2024 — forma", titleEN: "Mongoose 2024 — form", summaryPL: "Forma dla dwujęzycznego głosu English VCCV + Japanese CVVC.", summaryEN: "Form for the bilingual English VCCV + Japanese CVVC voicebank.", altPL: "Pełnopostaciowa ilustracja formy Mongoose postaci Lem na przezroczystym tle.", altEN: "Full-body illustration of Lem’s Mongoose form on a transparent background.", captionPL: "Mongoose 2024 — tryby Normal i Soft, po pięć wysokości.", captionEN: "Mongoose 2024—Normal and Soft modes, five pitches each." }),
    lemWork({ id: "lem-11-mongoose-illustration", cover: lem("lem-vccv-cvvc-mongoose-illustration.webp", "2/3"), year: "2024", titlePL: "Mongoose 2024 — ilustracja", titleEN: "Mongoose 2024 — illustration", summaryPL: "Ilustracja etapu rozwoju angielskiego VCCV i japońskiego CVVC.", summaryEN: "Illustration for the English VCCV and Japanese CVVC development stage.", altPL: "Kolorowa pełnopostaciowa ilustracja formy Mongoose postaci Lem.", altEN: "Colour full-body illustration of Lem’s Mongoose form.", captionPL: "Mongoose 2024 — English VCCV + Japanese CVVC, Normal / Soft.", captionEN: "Mongoose 2024—English VCCV + Japanese CVVC, Normal / Soft.", galleryVisible: true }),
    lemWork({ id: "lem-12-v3-weasel-illustration", cover: lem("lem-v3-utau-weasel-illustration.webp", "7/10"), titlePL: "V3 Weasel — ilustracja", titleEN: "V3 Weasel — illustration", summaryPL: "Wizualna forma dla dziewięciotonowej biblioteki Japanese VCV.", summaryEN: "Visual form for the nine-pitch Japanese VCV voicebank.", altPL: "Pełnopostaciowa forma Weasel postaci Lem, uśmiechnięta, z uniesionymi rękami, w różowej wzorzystej koszulce i z dużą kokardą na ogonie.", altEN: "Full-body Lem Weasel form smiling with both arms raised, wearing a patterned pink shirt and a large bow on the tail.", captionPL: "V3 Weasel — Japanese VCV, dziewięć wysokości, G2–A4.", captionEN: "V3 Weasel—Japanese VCV, nine pitches, G2–A4.", galleryVisible: true }),
    lemWork({ id: "lem-14-phascogale-camera", cover: lem("phascogale-lem-holding-camera.webp", "10/7"), titlePL: "Phascogale — scena", titleEN: "Phascogale — scene", summaryPL: "Ilustracyjne zastosowanie formy Phascogale w scenie narracyjnej.", summaryEN: "An illustrative use of the Phascogale form in a narrative scene.", altPL: "Forma Phascogale postaci Lem trzyma aparat z obiektywem szerokokątnym, ubrana w krótką bluzę i spodnie dresowe.", altEN: "Lem’s Phascogale form holding a camera with a wide-angle lens, wearing a cropped hoodie and joggers.", captionPL: "Ilustracja formy Phascogale w scenie z aparatem.", captionEN: "Illustration of the Phascogale form in a camera scene." }),
    lemWork({ id: "lem-15-opaque-application", cover: lem("lem-clairecat-opaque-cover.webp", "1/1", "cover"), titlePL: "Opaque — przykład zastosowania", titleEN: "Opaque — application example", summaryPL: "Przykład wykorzystania systemu postaci w pracy współtworzonej.", summaryEN: "An example of the character system used in a collaborative work.", altPL: "Monochromatyczna ilustracja postaci Lem w formie Weasel, poprawiającej okulary przeciwsłoneczne, w kolczastym kołnierzu i kwiatowym topie.", altEN: "Monochrome illustration of Lem’s Weasel form adjusting sunglasses, wearing a spiked collar and a floral top.", captionPL: "Przykład zastosowania systemu postaci w pracy współtworzonej.", captionEN: "Example of the character system applied in a collaborative work.", galleryVisible: true })
  ];

  const otherWorks = [
    work({
      id: "lozenge-t-pabaka-script",
      project: "lozenge-t",
      year: null,
      medium: "digital",
      types: ["typography", "design"],
      mediaType: "image",
      cover: lozengeAlphabet,
      titlePL: "Pabaka — pismo Asaxi",
      titleEN: "Pabaka — the Asaxi script",
      summaryPL: "Alfabet i krój Pabaka rozwijane jako część języka Asaxi i świata Lozenge T.",
      summaryEN: "The Pabaka alphabet and typeface developed as part of the Asaxi language and Lozenge T. world.",
      altPL: "Plansza alfabetu Pabaka z zestawem znaków pisma języka Asaxi.",
      altEN: "Pabaka alphabet board showing the character set of the Asaxi script.",
      captionPL: "Pabaka — alfabet i system pisma języka Asaxi.",
      captionEN: "Pabaka—the alphabet and writing system of the Asaxi language."
    }),
    work({
      id: "book-cover-2025",
      project: "book-cover",
      year: "2025",
      medium: "digital",
      types: ["cover-art", "typography"],
      mediaType: "image",
      cover: image(
        "assets/media/book-cover/book-cover-obiedzinski-mockup.webp",
        "4/3",
        "cover",
        "Makieta książki „Książka, której nie napisałem” Mariusza Obiedzińskiego i pasującej zakładki na jasnym biurku.",
        "Mockup of Mariusz Obiedziński’s book The Book I Did Not Write with a matching bookmark on a light desk.",
        { disclosure: bookMockupDisclosure }
      ),
      titlePL: "Książka, której nie napisałem",
      titleEN: "The Book I Did Not Write",
      summaryPL: "Projekt okładki dla Mariusza Obiedzińskiego, wydany przez Novae Res w 2025 roku.",
      summaryEN: "Cover design for Mariusz Obiedziński, published by Novae Res in 2025.",
      altPL: "Makieta książki „Książka, której nie napisałem” Mariusza Obiedzińskiego i pasującej zakładki na jasnym biurku.",
      altEN: "Mockup of Mariusz Obiedziński’s book The Book I Did Not Write with a matching bookmark on a light desk.",
      captionPL: "Makieta okładki i zakładki do wydania Novae Res z 2025 roku.",
      captionEN: "Cover and bookmark mockup for the 2025 Novae Res edition."
    })
  ];

  const zinePageDisclosure = disclosure(
    "ai-elements",
    "Zawiera elementy wygenerowane przez AI — ASCII art: ChatGPT.",
    "Contains AI-generated elements — ASCII art: ChatGPT."
  );
  const zinePageSpecs = [
    ["Okładka", "Cover", "7/10", "Biała okładka zina z niebiesko-żółtym tytułem WIN / DOWS i powielonym, falującym napisem.", "White zine cover with a blue-and-yellow WIN / DOWS title and repeated undulating lettering."],
    ["Rozkładówka otwierająca", "Opening spread", "10/7", "Rozkładówka z tekstem, niebiesko-turkusową skanografią monitora i rozciągniętą typografią.", "Spread with text, blue-and-turquoise scanography of a monitor, and stretched typography."],
    ["Sekwencja skanograficzna", "Scanographic sequence", "10/7", "Rozkładówka z gęstym tekstem i trzema barwnymi, poziomymi deformacjami skanograficznymi.", "Spread with dense text and three colourful horizontal scanographic distortions."],
    ["Rozmowa i skan", "Conversation and scan", "10/7", "Niebieska rozkładówka łącząca zapis rozmowy, obrazy otwartej publikacji i białe pola tekstowe.", "Blue spread combining conversation excerpts, images of an open publication, and white text fields."],
    ["Figury ASCII", "ASCII figures", "10/7", "Kobaltowa rozkładówka z kolejnymi figurami ASCII i pionowymi fragmentami tekstu.", "Cobalt spread with successive ASCII figures and vertical fragments of text."],
    ["Studium ASCII", "ASCII study", "10/7", "Biała rozkładówka z dużą niebieską figurą ASCII i geometrycznym motywem trójkątów.", "White spread with a large blue ASCII figure and a geometric triangle motif."],
    ["Zniekształcona wymiana", "Distorted exchange", "10/7", "Niebiesko-biała rozkładówka z figurami ASCII, odwróconą typografią i poziomymi smugami skanu.", "Blue-and-white spread with ASCII figures, inverted typography, and horizontal scan streaks."],
    ["Warstwy skanografii", "Scanographic layers", "10/7", "Fioletowo-zielona rozkładówka z nakładającymi się tekstami, skanami i geometrycznymi pasami.", "Purple-and-green spread with layered text, scans, and geometric bands."],
    ["Refleksja redakcyjna", "Editorial reflection", "10/7", "Biała rozkładówka z kolumnami tekstu, dużymi słowami GOD i LIFE oraz liniową figurą ASCII.", "White spread with text columns, the large words GOD and LIFE, and a linear ASCII figure."],
    ["Tylna okładka", "Back cover", "7/10", "Turkusowo-żółta tylna okładka z fragmentami znaków, siatką i uśmiechniętą figurą ASCII.", "Turquoise-and-yellow back cover with glyph fragments, a grid, and a smiling ASCII figure."]
  ];
  const zineWorks = zinePageSpecs.map(([titlePL, titleEN, ratio, altPL, altEN], index) => work({
    id: `windows-zine-page-${String(index + 1).padStart(2, "0")}`,
    project: "windows-zine",
    year: "2023",
    medium: "digital",
    types: ["editorial", "scanography", "typography", "design"],
    mediaType: "image",
    cover: zine(`windows-zine-page-${String(index + 1).padStart(2, "0")}.webp`, ratio, "contain", altPL, altEN, { disclosure: zinePageDisclosure }),
    titlePL: `WIN / DOWS — ${titlePL}`,
    titleEN: `WIN / DOWS — ${titleEN}`,
    summaryPL: index === 0
      ? "Przednia okładka zina łączącego autorską redakcję i skanografię z ASCII artem powstałym w rozmowie z ChatGPT."
      : index === 9
        ? "Tylna okładka zina łączącego autorską redakcję i skanografię z ASCII artem powstałym w rozmowie z ChatGPT."
        : "Rozkładówka zina łączącego autorską redakcję i skanografię z ASCII artem powstałym w rozmowie z ChatGPT.",
    summaryEN: index === 0
      ? "The front cover of a zine combining original editing and scanography with ASCII art created in conversation with ChatGPT."
      : index === 9
        ? "The back cover of a zine combining original editing and scanography with ASCII art created in conversation with ChatGPT."
        : "A zine spread combining original editing and scanography with ASCII art created in conversation with ChatGPT.",
    altPL,
    altEN,
    captionPL: `WIN / DOWS, ${titlePL.toLowerCase()}, 2023.`,
    captionEN: `WIN / DOWS, ${titleEN.toLowerCase()}, 2023.`,
    provenance: { source: "XMP źródłowego pliku / source-file XMP", creationYear: "2023" },
    featured: index === 0
  }));

  const coverArtWorks = [
    work({
      id: "cover-art-01-untitled",
      project: "cover-art",
      year: null,
      medium: "digital",
      types: ["cover-art", "design"],
      mediaType: "image",
      cover: coverArt("cover-art-01-untitled.webp", "Abstrakcyjna kwadratowa okładka w granacie i miedzianym różu z pionowym białym napisem japońskim.", "Abstract square cover in navy and copper-pink with vertical white Japanese lettering."),
      titlePL: "Projekt okładki",
      titleEN: "Cover artwork",
      summaryPL: "Autorska abstrakcyjna kompozycja okładkowa.",
      summaryEN: "An original abstract cover composition.",
      altPL: "Abstrakcyjna kwadratowa okładka w granacie i miedzianym różu z pionowym białym napisem japońskim.",
      altEN: "Abstract square cover in navy and copper-pink with vertical white Japanese lettering.",
      captionPL: "Projekt okładki — praca autorska.",
      captionEN: "Cover artwork—independent work."
    }),
    work({
      id: "cover-art-02-cloud-flow-free",
      project: "cover-art",
      year: "2022",
      date: "2022-09-24",
      medium: "digital",
      types: ["cover-art", "design", "music"],
      mediaType: "image",
      cover: coverArt("cover-art-02-cloud-flow-free.webp", "Jasna malarska okładka z zielono-turkusowymi płaszczyznami przypominającymi górę, wodę i chmury.", "Light painterly cover with green-and-turquoise planes suggesting a mountain, water, and clouds."),
      titlePL: "I dreamt upon a mountain top, let the cloud flow free",
      titleEN: "I dreamt upon a mountain top, let the cloud flow free",
      summaryPL: "Projekt okładki singla SVREN, wydanego 24 września 2022 roku.",
      summaryEN: "Cover artwork for a SVREN single released on 24 September 2022.",
      altPL: "Jasna malarska okładka z zielono-turkusowymi płaszczyznami przypominającymi górę, wodę i chmury.",
      altEN: "Light painterly cover with green-and-turquoise planes suggesting a mountain, water, and clouds.",
      captionPL: "Okładka singla SVREN, 24.09.2022.",
      captionEN: "Cover artwork for a SVREN single, 24 September 2022.",
      externalLinks: [{ href: "https://open.spotify.com/album/01y2kSzgnhLctTaBA8YrzY", labelPL: "Posłuchaj singla „I dreamt upon a mountain top, let the cloud flow free” w Spotify", labelEN: "Listen to the single “I dreamt upon a mountain top, let the cloud flow free” on Spotify" }]
    }),
    work({
      id: "cover-art-03-midsummer-journey",
      project: "cover-art",
      year: "2022",
      date: "2022-07-26",
      medium: "digital",
      types: ["cover-art", "design", "music"],
      mediaType: "image",
      cover: coverArt("cover-art-03-midsummer-journey.webp", "Akwarelowa okładka z jasnym leśnym pejzażem, smukłymi pniami i czerwonymi kwiatami.", "Watercolour cover with a bright woodland scene, slender trunks, and red flowers."),
      titlePL: "A Midsummer Journey",
      titleEN: "A Midsummer Journey",
      summaryPL: "Projekt okładki singla SVREN, wydanego 26 lipca 2022 roku.",
      summaryEN: "Cover artwork for a SVREN single released on 26 July 2022.",
      altPL: "Akwarelowa okładka z jasnym leśnym pejzażem, smukłymi pniami i czerwonymi kwiatami.",
      altEN: "Watercolour cover with a bright woodland scene, slender trunks, and red flowers.",
      captionPL: "Okładka singla SVREN, 26.07.2022.",
      captionEN: "Cover artwork for a SVREN single, 26 July 2022.",
      externalLinks: [{ href: "https://open.spotify.com/album/7l4DnDaDdpZSWTMJzULw52", labelPL: "Posłuchaj singla „A Midsummer Journey” w Spotify", labelEN: "Listen to the single “A Midsummer Journey” on Spotify" }]
    })
  ];

  const iconWorks = [work({
    id: "small-design-projects-voice-model-icon",
    project: "small-design-projects",
    year: null,
    medium: "digital",
    types: ["design", "icon-design", "commissioned", "voice-model"],
    mediaType: "image",
    cover: smallDesignIcon,
    titlePL: "Ikona modelu głosowego",
    titleEN: "Voice Model Icon",
    summaryPL: "Ikona zaprojektowana na zamówienie jako znak modelu głosowego AI.",
    summaryEN: "A commissioned icon designed for an AI voice model.",
    altPL: "Geometryczny portret w błękicie i różu na niebiesko-magentowym tle, z ciemnym zakrzywionym motywem.",
    altEN: "Geometric portrait in cyan and pink on a blue-and-magenta background, with a dark curved motif.",
    captionPL: "Geometryczny znak opracowany z myślą o czytelności w małej, kwadratowej skali.",
    captionEN: "A geometric mark developed for legibility at a small square scale."
  })];

  const characterSpecs = [
    ["character-art-01-cami-possum-witch", "character-art", ["character-art"], "Cami — oposia wiedźma", "Cami — possum witch", "Pełnopostaciowa postać z szarą skórą, oposim ogonem, laską i turkusową tuniką.", "Full-body character with grey skin, a possum tail, staff, and teal tunic.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-02-kiyomi", "character-art", ["character-art"], "Kiyomi", "Kiyomi", "Pełnopostaciowa ilustracja Kiyomi, antropomorficznej króliczki z długimi opadającymi uszami, układającej dłonie w serce, w warstwowym czarnym stroju i berecie.", "Full-body illustration of Kiyomi, an anthropomorphic rabbit with long floppy ears, making a heart gesture in a layered black outfit and beret.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-03-lem-banded-palm-civet", "lem", ["character-art"], "Lem — Banded Palm Civet", "Lem — Banded Palm Civet", "Pełnopostaciowa forma Lem w ciepłej palecie żółci, pomarańczu i różu, z długim ogonem.", "Full-body Lem form in a warm yellow, orange, and pink palette with a long tail.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-04-mat-anniversary", "character-art", ["character-art"], "Mat — ilustracja rocznicowa", "Mat — anniversary illustration", "Pełnopostaciowy Mat, antropomorficzny wilk o jasnym futrze, spoglądający przez ramię i unoszący znak pokoju, w ciemnym warstwowym stroju.", "Full-body Mat, an anthropomorphic wolf with pale fur, looking over his shoulder and raising a peace sign in a dark layered outfit.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-05-mel-numbat", "character-art", ["character-art"], "Mel — numbat", "Mel — numbat", "Pełnopostaciowa postać o niebieskoszarym futrze, w szerokich spodniach i jasnym topie.", "Full-body blue-grey numbat character in wide trousers and a light top.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-06-diiru", "character-art", ["character-art"], "Diiru — myszojeleń", "Diiru — mouse deer", "Pełnopostaciowy Diiru, antropomorficzny myszojeleń z brązowym futrem, różowymi lokami, małymi rogami, kłami i kopytami, w turkusowych spodniach.", "Full-body Diiru, an anthropomorphic mouse-deer with brown fur, pink curls, small antlers, tusks, and hooves, wearing turquoise trousers.", "digital", ["character-art", "illustration"], "7/10"],
    ["character-art-07-cami-reference-sheet", "character-art", ["character-art"], "Cami — plansza referencyjna", "Cami — reference sheet", "Plansza referencyjna Cami z widokami przodu i tyłu, detalami stroju, laski i deskorolki.", "Cami reference sheet with front and back views plus wardrobe, staff, and skateboard details.", "digital", ["character-art", "character-design"], "10/7"],
    ["character-art-08-lem-wardrobe-turnaround", "lem", ["character-art"], "Lem — plansza stroju", "Lem — wardrobe turnaround", "Plansza Lem z widokami sylwetki w stroju oraz zestawem elementów garderoby i paletą.", "Lem sheet with dressed figure views plus wardrobe elements and a colour palette.", "digital", ["character-art", "character-design"], "6/5"],
    ["character-art-09-lem-base-turnaround", "lem", ["character-art"], "Lem — bazowa plansza obrotowa", "Lem — base turnaround", "Bazowa plansza obrotowa Lem z widokiem przodu, boku i tyłu oraz studiami proporcji.", "Base Lem turnaround with front, side, and back views plus proportion studies.", "digital", ["character-art", "character-design"], "8/5"],
    ["character-art-10-lem-sleeping", "lem", ["character-art"], "Lem — sen", "Lem — sleeping", "Monochromatyczna ilustracja tuszem i lawowaniem: skulona, śpiąca antropomorficzna postać obejmuje nogi obok kwiatu.", "Monochrome ink-and-wash illustration of a curled, sleeping anthropomorphic figure holding their legs beside a flower.", "traditional", ["character-art", "illustration"], "3/4"]
  ];
  const characterWorks = characterSpecs.map(([id, project, collections, titlePL, titleEN, altPL, altEN, medium, types, ratio], index) => work({
    id,
    project,
    collections,
    year: null,
    medium,
    types,
    mediaType: "image",
    cover: character(`${id}.webp`, ratio, "contain", altPL, altEN),
    titlePL,
    titleEN,
    summaryPL: types.includes("character-design") ? "Plansza dokumentująca konstrukcję, proporcje i elementy wizualne postaci." : "Autorska ilustracja postaci.",
    summaryEN: types.includes("character-design") ? "A sheet documenting the character’s construction, proportions, and visual elements." : "An original character illustration.",
    altPL,
    altEN,
    captionPL: `${titlePL} — ${medium === "traditional" ? "rysunek tradycyjny" : types.includes("character-design") ? "plansza projektowa" : "ilustracja cyfrowa"}.`,
    captionEN: `${titleEN}—${medium === "traditional" ? "traditional drawing" : types.includes("character-design") ? "character-design sheet" : "digital illustration"}.`,
    featured: index === 0
  }));

  const dissonanceWorks = [work({
    id: "dissonance-video",
    project: "dissonance-perspective",
    year: "2026",
    date: "2026-03-07",
    author: "wik_wav",
    medium: "digital",
    types: ["video", "motion", "3d", "music-video", "sound"],
    mediaType: "video",
    cover: dissonance("dissonance-perspective-02-hero-0104.webp", "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.", "White concentric rings on black from Dissonance Perspective."),
    video: {
      provider: "youtube",
      id: "jRYRyH9USNQ",
      poster: dissonance("dissonance-perspective-02-hero-0104.webp", "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.", "White concentric rings on black from Dissonance Perspective."),
      externalUrl: "https://www.youtube.com/watch?v=jRYRyH9USNQ"
    },
    videoWarningPL: "Ostrzeżenie: film zawiera szybko migające światła i efekty stroboskopowe.",
    videoWarningEN: "Warning: the video contains rapidly flashing lights and strobe effects.",
    videoLinkPL: "Obejrzyj Dissonance Perspective w YouTube",
    videoLinkEN: "Watch Dissonance Perspective on YouTube",
    titlePL: "Dissonance Perspective",
    titleEN: "Dissonance Perspective",
    summaryPL: "Autorska realizacja audiowizualna badająca granicę między harmonią a szumem.",
    summaryEN: "An original audiovisual work exploring the boundary between harmony and noise.",
    altPL: "Białe koncentryczne pierścienie na czarnym tle z realizacji Dissonance Perspective.",
    altEN: "White concentric rings on black from Dissonance Perspective.",
    captionPL: "Dissonance Perspective — wik_wav, opublikowano 07.03.2026.",
    captionEN: "Dissonance Perspective—wik_wav, published 7 March 2026.",
    featured: true
  })];

  const detailMedia = [
    {
      id: "windows-zine-mockup-01", mediaType: "image",
      cover: zine("windows-zine-mockup-01-hero.webp", "4/3", "cover", "Mockup zina WIN / DOWS na szklanym stole, pokazujący okładkę i rozkładówkę.", "WIN / DOWS zine mockup on a glass table, showing the cover and an open spread.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") }),
      titlePL: "WIN / DOWS — wizualizacja 01", titleEN: "WIN / DOWS — visualisation 01",
      captionPL: "Wizualizacja prezentacyjna zina.", captionEN: "Presentation visualisation of the zine."
    },
    {
      id: "windows-zine-mockup-02", mediaType: "image", projectGroup: "windows-zine-mockups", projectGroupLabelPL: "Wizualizacje zina", projectGroupLabelEN: "Zine visualisations",
      cover: zine("windows-zine-mockup-02.webp", "4/3", "cover", "Mockup otwartej niebiesko-białej rozkładówki zina i tylnej okładki na szklanym stole.", "Mockup of an open blue-and-white zine spread and back cover on a glass table.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") }),
      titlePL: "WIN / DOWS — wizualizacja 02", titleEN: "WIN / DOWS — visualisation 02",
      captionPL: "Wizualizacja prezentacyjna rozkładówki.", captionEN: "Presentation visualisation of a spread."
    },
    {
      id: "windows-zine-mockup-03", mediaType: "image", projectGroup: "windows-zine-mockups", projectGroupLabelPL: "Wizualizacje zina", projectGroupLabelEN: "Zine visualisations",
      cover: zine("windows-zine-mockup-03.webp", "4/3", "cover", "Mockup fioletowo-zielonej rozkładówki zina i tylnej okładki na szklanym stole.", "Mockup of a purple-and-green zine spread and back cover on a glass table.", { disclosure: disclosure("ai-generated", "Obraz wygenerowany przez AI — wizualizacja zina.", "AI-generated image — zine visualisation.") }),
      titlePL: "WIN / DOWS — wizualizacja 03", titleEN: "WIN / DOWS — visualisation 03",
      captionPL: "Wizualizacja prezentacyjna rozkładówki.", captionEN: "Presentation visualisation of a spread."
    },
    {
      id: "dissonance-still-01", mediaType: "image",
      cover: dissonance("dissonance-perspective-01-0028.webp", "Białe poziome pasma zakłóceń na czarnym tle.", "White horizontal interference bands on black."),
      titlePL: "Dissonance Perspective — kadr 00:28", titleEN: "Dissonance Perspective — still 00:28",
      captionPL: "Kadr z autorskiej animacji 3D.", captionEN: "Still from the original 3D animation."
    },
    {
      id: "dissonance-still-03", mediaType: "image",
      cover: dissonance("dissonance-perspective-03-0130.webp", "Rozproszone białe bryły z ukośnymi liniami na jasnym tle.", "Scattered white forms with diagonal lines on a light background."),
      titlePL: "Dissonance Perspective — kadr 01:30", titleEN: "Dissonance Perspective — still 01:30",
      captionPL: "Kadr z autorskiej animacji 3D.", captionEN: "Still from the original 3D animation."
    },
    {
      id: "dissonance-still-04", mediaType: "image",
      cover: dissonance("dissonance-perspective-04-0204.webp", "Czarno-białe geometryczne bryły w ukośne pasy na jasnym tle.", "Black-and-white geometric forms with diagonal stripes on a light background."),
      titlePL: "Dissonance Perspective — kadr 02:04", titleEN: "Dissonance Perspective — still 02:04",
      captionPL: "Kadr z autorskiej animacji 3D.", captionEN: "Still from the original 3D animation."
    }
  ];

  function completeMedia(media, item) {
    if (!media) return media;
    if (media.kind === "group") return { ...media, items: media.items.map(asset => completeMedia(asset, item)) };
    if (media.kind !== "image") return media;
    if (media.decorative === true) return { ...media, altPL: "", altEN: "" };
    return {
      ...media,
      altPL: media.altPL || item.altPL || item.summaryPL || item.titlePL,
      altEN: media.altEN || item.altEN || item.summaryEN || item.titleEN
    };
  }

  const works = [...latentneWorks, ...paraWorks, ...gaijinWorks, ...lemWorks, ...otherWorks, ...zineWorks, ...coverArtWorks, ...iconWorks, ...characterWorks, ...dissonanceWorks];
  for (const project of projects) {
    project.cover = completeMedia(project.cover, project);
    project.hero = completeMedia(project.hero, project);
    project.thumbnail = completeMedia(project.thumbnail, project);
  }
  for (const item of [...works, ...detailMedia]) {
    item.cover = completeMedia(item.cover, item);
    if (item.gallery) item.gallery = item.gallery.map(media => completeMedia(media, item));
    if (item.video?.poster) item.video.poster = completeMedia(item.video.poster, item);
  }

  return {
    projects,
    works,
    detailMedia
  };
})();
