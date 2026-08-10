import "./media-dimensions.js";

(() => {
  const copy = {
    "skip": { pl: "Przejdź do treści", en: "Skip to content" },
    "nav.home": { pl: "Profil", en: "Profile" },
    "nav.portfolio": { pl: "Portfolio", en: "Portfolio" },
    "nav.projects": { pl: "Projekty", en: "Projects" },
    "nav.contact": { pl: "Kontakt", en: "Contact" },
    "nav.menu": { pl: "MENU", en: "MENU" },
    "nav.close": { pl: "ZAMKNIJ", en: "CLOSE" },
    "language": { pl: "Język", en: "Language" },
    "footer.title": { pl: "Porozmawiajmy o projekcie albo współpracy.", en: "Let’s talk about a project or collaboration." },
    "media.placeholder": { pl: "ZASTĘPCZY MATERIAŁ", en: "PLACEHOLDER" },
    "media.video": { pl: "WIDEO", en: "VIDEO" }
  };

  const state = { lang: localStorage.getItem("portfolio:lang") === "en" ? "en" : "pl" };
  const base = document.body.dataset.base || ".";
  const url = path => `${base}/${path}`.replace(/\/+/g, "/");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const text = item => item?.[state.lang === "pl" ? "titlePL" : "titleEN"] || "";
  const field = (item, name) => item?.[`${name}${state.lang === "pl" ? "PL" : "EN"}`] || "";
  const t = key => copy[key]?.[state.lang] || key;

  function paginationTokens(currentPage, totalPages) {
    const total = Math.max(1, Number.parseInt(totalPages, 10) || 1);
    const current = Math.min(total, Math.max(1, Number.parseInt(currentPage, 10) || 1));
    const page = value => ({ type: "page", page: value, key: `page-${value}` });
    const gap = key => ({ type: "gap", key });
    if (total <= 7) return Array.from({ length: total }, (_, index) => page(index + 1));
    if (current <= 4) return [page(1), page(2), page(3), page(4), page(5), gap("end-gap"), page(total)];
    if (current >= total - 3) return [page(1), gap("start-gap"), page(total - 4), page(total - 3), page(total - 2), page(total - 1), page(total)];
    return [page(1), gap("start-gap"), page(current - 1), page(current), page(current + 1), gap("end-gap"), page(total)];
  }

  function renderPaginationTokens(currentPage, totalPages, pageLabel) {
    const current = Math.min(Math.max(1, Number.parseInt(totalPages, 10) || 1), Math.max(1, Number.parseInt(currentPage, 10) || 1));
    return paginationTokens(current, totalPages).map(token => token.type === "gap"
      ? `<span class="pagination-ellipsis" data-gap="${token.key}" aria-hidden="true">…</span>`
      : `<button type="button" data-page="${token.page}" ${token.page === current ? 'aria-current="page"' : ""} aria-label="${esc(pageLabel)} ${token.page}">${token.page}</button>`).join("");
  }

  function navLink(path, key, page) {
    const current = document.body.dataset.page === page ? ' aria-current="page"' : "";
    return `<a href="${url(path)}" data-copy="${key}"${current}>${t(key)}</a>`;
  }

  function renderChrome() {
    const header = document.querySelector("[data-site-header]");
    const footer = document.querySelector("[data-site-footer]");
    if (header) header.innerHTML = `
      <a class="skip-link" href="#main" data-copy="skip">${t("skip")}</a>
      <header class="site-header" data-od-id="global-header">
        <div class="header-inner">
          <a class="wordmark" href="${url("index.html")}" aria-label="Wiktor Sielaszuk — ${t("nav.home")}" data-aria-pl="Wiktor Sielaszuk — Profil" data-aria-en="Wiktor Sielaszuk — Profile" data-od-id="wordmark">
            <span class="register-mark" aria-hidden="true"></span><span>Wiktor Sielaszuk</span>
          </a>
          <nav class="primary-nav" id="primary-nav" aria-label="${t("nav.menu")}" data-aria-pl="Nawigacja główna" data-aria-en="Primary navigation" data-od-id="primary-navigation">
            ${navLink("index.html", "nav.home", "home")}
            ${navLink("portfolio/index.html", "nav.portfolio", "portfolio")}
            ${navLink("projects/index.html", "nav.projects", "projects")}
            <a href="#contact" data-copy="nav.contact">${t("nav.contact")}</a>
          </nav>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-copy="nav.menu" data-od-id="mobile-menu-toggle">${t("nav.menu")}</button>
          <div class="lang-switch" role="group" aria-label="${t("language")}" data-aria-pl="Język" data-aria-en="Language" data-od-id="language-switcher">
            <button type="button" data-lang="pl" aria-pressed="${state.lang === "pl"}">PL</button>
            <button type="button" data-lang="en" aria-pressed="${state.lang === "en"}">EN</button>
          </div>
        </div>
      </header>`;
    if (footer) footer.innerHTML = `
      <footer class="site-footer" id="contact" data-od-id="global-footer">
        <div class="footer-band" aria-hidden="true"><span></span></div>
        <div class="footer-inner">
          <div class="footer-main">
            <div><p class="section-code">C.01 / ${t("nav.contact")}</p><h2 data-copy="footer.title">${t("footer.title")}</h2></div>
            <div class="footer-links">
              <a href="mailto:wiktor.sielaszuk.22@gmail.com">wiktor.sielaszuk.22@gmail.com</a>
              <a href="https://www.linkedin.com/in/wiktor-sielaszuk" rel="me">LinkedIn</a>
              <a href="${url("portfolio/index.html")}" data-copy="nav.portfolio">${t("nav.portfolio")}</a>
              <a href="${url("projects/index.html")}" data-copy="nav.projects">${t("nav.projects")}</a>
            </div>
          </div>
        </div>
      </footer>`;
  }

  function applyCopy() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-copy]").forEach(el => { el.textContent = t(el.dataset.copy); });
    document.querySelectorAll("[data-lang]").forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.lang === state.lang)));
    document.querySelectorAll("[data-pl][data-en]").forEach(el => { el.textContent = el.dataset[state.lang]; });
    document.querySelectorAll("[data-aria-pl][data-aria-en]").forEach(el => { el.setAttribute("aria-label", el.dataset[state.lang === "pl" ? "ariaPl" : "ariaEn"]); });
    document.querySelectorAll("[data-content-pl][data-content-en]").forEach(el => { el.setAttribute("content", el.dataset[state.lang === "pl" ? "contentPl" : "contentEn"]); });
    const pageTitle = document.querySelector("title[data-pl][data-en]");
    if (pageTitle) document.title = pageTitle.dataset[state.lang];
    window.dispatchEvent(new CustomEvent("portfolio:language", { detail: { lang: state.lang } }));
  }

  function setLanguage(lang) {
    state.lang = lang === "en" ? "en" : "pl";
    localStorage.setItem("portfolio:lang", state.lang);
    applyCopy();
  }

  function mediaAlt(media, item) {
    const own = media?.[state.lang === "pl" ? "altPL" : "altEN"];
    const value = own || field(item, "alt");
    if (!value && media?.decorative !== true) throw new Error(`Missing ${state.lang.toUpperCase()} alt text for ${media?.src || "media"}`);
    return value || "";
  }

  function imageAttributes(media, options = {}) {
    const key = String(media?.src || "").replace(/^\.\//, "").replace(/^\//, "");
    const dimensions = window.MEDIA_DIMENSIONS?.[key];
    if (!dimensions) throw new Error(`Missing intrinsic dimensions for ${key}`);
    const priority = options.fetchPriority === "high" ? ' fetchpriority="high"' : "";
    return ` width="${dimensions.width}" height="${dimensions.height}"${priority}`;
  }

  function mediaDisclosure(media, options = {}) {
    const metadata = media?.disclosure;
    if (!metadata) return "";
    const suffix = options.disclosureMode === "detail" ? "detail" : "short";
    const value = metadata[`${suffix}${state.lang === "pl" ? "PL" : "EN"}`] || metadata[`${state.lang === "pl" ? "shortPL" : "shortEN"}`];
    if (!value) return "";
    return `<p class="media-disclosure media-disclosure-${esc(metadata.kind)}" role="note">${esc(value)}</p>`;
  }

  function wrapMedia(frame, media, options) {
    return `<div class="media-block">${frame}${mediaDisclosure(media, options)}</div>`;
  }

  function makeMedia(media, item, options = {}) {
    const ratio = media?.ratio || "4/3";
    const eager = options.eager === true;
    if (media?.kind === "group" && Array.isArray(media.items)) {
      const frame = `<div class="media-frame media-group" data-group-count="${media.items.length}" style="--ratio:${esc(ratio)}">${media.items.map((asset, index) => `
        <div class="media-group-item"><img src="${url(asset.src)}" alt="${esc(mediaAlt(asset, item))}"${imageAttributes(asset, { fetchPriority: options.fetchPriority === "high" && index === 0 ? "high" : undefined })} loading="${eager && index === 0 ? "eager" : "lazy"}" decoding="async"></div>`).join("")}</div>`;
      return wrapMedia(frame, media, options);
    }
    if (media?.kind === "image" && media.src) {
      const source = media.srcset ? `<source srcset="${esc(media.srcset)}" sizes="${esc(media.sizes || "(max-width: 680px) 100vw, 50vw")}">` : "";
      const fit = media.fit === "contain" ? "is-contain" : "is-cover";
      const noPadding = media.noPadding === true ? " no-padding" : "";
      const mobileRatio = media.mobileRatio ? `;--mobile-ratio:${esc(media.mobileRatio)}` : "";
      const objectPosition = media.objectPosition ? `;--object-position:${esc(media.objectPosition)}` : "";
      const frame = `<div class="media-frame ${fit}${noPadding}" style="--ratio:${esc(ratio)}${mobileRatio}${objectPosition}"><picture>${source}<img src="${url(media.src)}" alt="${esc(mediaAlt(media, item))}"${imageAttributes(media, options)} loading="${eager ? "eager" : "lazy"}" decoding="async"></picture>${item?.mediaType === "video" ? `<span class="video-mark">${t("media.video")}</span>` : ""}</div>`;
      return wrapMedia(frame, media, options);
    }
    const frame = `<div class="media-frame" style="--ratio:${esc(ratio)}">
      <div class="media-art ${esc(media?.art || "art-latentne")}" role="img" aria-label="${esc(mediaAlt(media, item))}"><i></i><b></b><em></em></div>
      <span class="placeholder-label">${t("media.placeholder")}</span>
      ${item?.mediaType === "video" ? `<span class="video-mark">${t("media.video")}</span>` : ""}
    </div>`;
    return wrapMedia(frame, media, options);
  }

  function videoUrl(video) {
    if (!video?.provider || !video?.id) return null;
    if (video.provider === "youtube" && /^[A-Za-z0-9_-]{6,20}$/.test(video.id)) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0`;
    if (video.provider === "vimeo" && /^\d{5,12}$/.test(video.id)) return `https://player.vimeo.com/video/${encodeURIComponent(video.id)}`;
    return null;
  }

  function makeVideo(item, options = {}) {
    const src = videoUrl(item?.video);
    if (!src) return makeMedia(item?.video?.poster || item?.cover, item, options);
    const warning = field(item, "videoWarning");
    const externalUrl = item?.video?.externalUrl;
    const externalLabel = field(item, "videoLink");
    return `<div class="video-block">
      ${warning ? `<p class="video-warning" role="note">${esc(warning)}</p>` : ""}
      <div class="media-frame video-frame" style="--ratio:16/9"><iframe src="${src}" title="${esc(text(item))}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
      ${externalUrl && externalLabel ? `<p class="media-external"><a href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer">${esc(externalLabel)}</a></p>` : ""}
    </div>`;
  }

  function makeWorkMedia(item, options = {}) {
    return item?.mediaType === "video" ? makeVideo(item, options) : makeMedia(item?.cover, item, options);
  }

  function projectById(id) { return window.PORTFOLIO_DATA.projects.find(project => project.id === id); }
  function projectName(id) { return text(projectById(id)); }
  function labelFor(fieldName, value) {
    if (value == null || value === "") return "";
    const labels = {
      medium: { digital: ["Cyfrowe", "Digital"], traditional: ["Tradycyjne", "Traditional"] },
      type: {
        illustration: ["Ilustracja", "Illustration"],
        "cover-art": ["Okładka", "Cover art"],
        poster: ["Plakat", "Poster"],
        typography: ["Typografia", "Typography"],
        motion: ["Motion", "Motion"],
        video: ["Wideo", "Video"],
        sound: ["Dźwięk", "Sound"],
        generative: ["Generatywne", "Generative"],
        "character-design": ["System postaci", "Character system"],
        "vocal-synthesis": ["Synteza głosu", "Voice synthesis"],
        design: ["Projektowanie", "Design"],
        music: ["Muzyka", "Music"],
        "icon-design": ["Projekt ikony", "Icon design"],
        commissioned: ["Zamówienie", "Commissioned"],
        "voice-model": ["Model głosowy", "Voice model"],
        "character-art": ["Postaci - ilustracje", "Character Art"],
        "3d": ["3D", "3D"],
        "music-video": ["Teledysk", "Music video"],
        editorial: ["Projekt redakcyjny", "Editorial"],
        scanography: ["Skanografia", "Scanography"]
      }
    };
    const pair = labels[fieldName]?.[value];
    return pair ? pair[state.lang === "pl" ? 0 : 1] : value;
  }

  renderChrome();
  document.addEventListener("click", event => {
    const lang = event.target.closest("[data-lang]");
    if (lang) setLanguage(lang.dataset.lang);
    const toggle = event.target.closest(".menu-toggle");
    if (toggle) {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = t(open ? "nav.close" : "nav.menu");
      document.querySelector(".primary-nav")?.classList.toggle("open", open);
    }
  });
  applyCopy();

  window.Portfolio = { state, t, text, field, esc, url, setLanguage, makeMedia, makeVideo, makeWorkMedia, projectById, projectName, labelFor, videoUrl, paginationTokens, renderPaginationTokens };
})();
