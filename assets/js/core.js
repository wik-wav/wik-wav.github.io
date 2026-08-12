(() => {
  const site = window.PORTFOLIO_SITE || {};
  const copy = site.copy || {
    "skip": { pl: "Przejdź do treści", en: "Skip to content" },
    "nav.home": { pl: "Profil", en: "Profile" },
    "nav.portfolio": { pl: "Portfolio", en: "Portfolio" },
    "nav.projects": { pl: "Projekty", en: "Projects" },
    "nav.activity": { pl: "Aktywność", en: "Activity" },
    "nav.contact": { pl: "Kontakt", en: "Contact" },
    "nav.menu": { pl: "MENU", en: "MENU" },
    "nav.close": { pl: "ZAMKNIJ", en: "CLOSE" },
    "language": { pl: "Język", en: "Language" },
    "footer.title": { pl: "Porozmawiajmy o projekcie albo współpracy.", en: "Let’s talk about a project or collaboration." },
    "media.placeholder": { pl: "ZASTĘPCZY MATERIAŁ", en: "PLACEHOLDER" },
    "media.video": { pl: "WIDEO", en: "VIDEO" },
    "media.audio": { pl: "AUDIO", en: "AUDIO" }
  };
  for (const item of site.navigation || []) copy[`nav.${item.id}`] = { pl: item.labelPL, en: item.labelEN };
  if (site.footer) copy["footer.title"] = { pl: site.footer.headingPL, en: site.footer.headingEN };

  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* sandboxed previews may deny storage */ } }
  };
  const state = { lang: storage.get("portfolio:lang") === "en" ? "en" : "pl" };
  const base = document.body.dataset.base || ".";
  const url = path => `${base}/${path}`.replace(/\/+/g, "/");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const singleLine = value => String(value ?? "").replace(/\s+/gu, " ").trim();
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

  function configuredNavigation() {
    const items = Array.isArray(site.navigation) && site.navigation.length
      ? site.navigation
      : [
          { id: "home", href: "index.html" },
          { id: "portfolio", href: "portfolio/index.html" },
          { id: "projects", href: "projects/index.html" },
          { id: "activity", href: "activity/index.html" },
          { id: "contact", href: "#contact" }
        ];
    return items.map(item => {
      const href = String(item.href || "").startsWith("#") ? item.href : url(item.href);
      const current = document.body.dataset.page === item.id ? ' aria-current="page"' : "";
      return `<a href="${esc(href)}" data-copy="nav.${esc(item.id)}"${current}>${t(`nav.${item.id}`)}</a>`;
    }).join("");
  }

  function safeSocialHref(value) {
    try {
      const href = new URL(String(value || ""));
      return href.protocol === "https:" && href.hostname && !href.username && !href.password ? href.href : "";
    } catch {
      return "";
    }
  }

  function configuredSocialLinks() {
    const profile = site.profile || {};
    // Only older content without the socialLinks property receives the legacy
    // LinkedIn fallback. An explicit empty array deliberately renders nothing.
    const source = Array.isArray(profile.socialLinks)
      ? profile.socialLinks
      : profile.socialLinks === undefined
        ? [{ id: "linkedin", labelPL: "LinkedIn", labelEN: "LinkedIn", href: profile.linkedIn || "https://www.linkedin.com/in/wiktor-sielaszuk" }]
        : [];
    return source
      .map((link, index) => ({
        id: String(link?.id || `social-${index + 1}`),
        labelPL: String(link?.labelPL || "").trim(),
        labelEN: String(link?.labelEN || "").trim(),
        href: safeSocialHref(link?.href)
      }))
      .filter(link => link.href && link.labelPL && link.labelEN);
  }

  function footerEmailMarkup(value) {
    const email = String(value || "").trim();
    const separator = email.lastIndexOf("@");
    if (separator <= 0 || separator >= email.length - 1) return `<span>${esc(email)}</span>`;
    return `<span class="footer-email-local">${esc(email.slice(0, separator))}</span><span class="footer-email-domain">${esc(email.slice(separator))}</span>`;
  }

  function renderChrome() {
    const header = document.querySelector("[data-site-header]");
    const footer = document.querySelector("[data-site-footer]");
    if (header) header.innerHTML = `
      <a class="skip-link" href="#main" data-copy="skip">${t("skip")}</a>
      <header class="site-header" data-od-id="global-header">
        <div class="header-inner">
          <a class="wordmark" href="${url("index.html")}" aria-label="${esc(site.profile?.name || "Wiktor Sielaszuk")} — ${t("nav.home")}" data-aria-pl="${esc(site.profile?.name || "Wiktor Sielaszuk")} — Profil" data-aria-en="${esc(site.profile?.name || "Wiktor Sielaszuk")} — Profile" data-od-id="wordmark">
            <span class="register-mark" aria-hidden="true"></span><span>${esc(site.profile?.name || "Wiktor Sielaszuk")}</span>
          </a>
          <nav class="primary-nav" id="primary-nav" aria-label="${t("nav.menu")}" data-aria-pl="Nawigacja główna" data-aria-en="Primary navigation" data-od-id="primary-navigation">
            ${configuredNavigation()}
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
              <a class="footer-email" href="mailto:${esc(site.profile?.email || "wiktor.sielaszuk.22@gmail.com")}" aria-label="${esc(site.profile?.email || "wiktor.sielaszuk.22@gmail.com")}" data-no-typography>${footerEmailMarkup(site.profile?.email || "wiktor.sielaszuk.22@gmail.com")}</a>
              ${configuredSocialLinks().map(link => `<a class="footer-social-link" href="${esc(link.href)}" target="_blank" rel="me noopener noreferrer" aria-label="${esc(state.lang === "pl" ? `${link.labelPL} (otwiera w nowej karcie)` : `${link.labelEN} (opens in a new tab)`)}" data-aria-pl="${esc(`${link.labelPL} (otwiera w nowej karcie)`)}" data-aria-en="${esc(`${link.labelEN} (opens in a new tab)`)}"><span data-pl="${esc(link.labelPL)}" data-en="${esc(link.labelEN)}">${esc(state.lang === "pl" ? link.labelPL : link.labelEN)}</span><span class="footer-external-mark" aria-hidden="true">↗</span></a>`).join("")}
              <a href="${url("portfolio/index.html")}" data-copy="nav.portfolio">${t("nav.portfolio")}</a>
              <a href="${url("projects/index.html")}" data-copy="nav.projects">${t("nav.projects")}</a>
              <a href="${url("activity/index.html")}" data-copy="nav.activity">${t("nav.activity")}</a>
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
    document.querySelectorAll("[data-content-pl][data-content-en]").forEach(el => { el.setAttribute("content", singleLine(el.dataset[state.lang === "pl" ? "contentPl" : "contentEn"])); });
    const pageTitle = document.querySelector("title[data-pl][data-en]");
    if (pageTitle) document.title = singleLine(pageTitle.dataset[state.lang]);
    window.dispatchEvent(new CustomEvent("portfolio:language", { detail: { lang: state.lang } }));
  }

  function setLanguage(lang) {
    state.lang = lang === "en" ? "en" : "pl";
    storage.set("portfolio:lang", state.lang);
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
    const disclosure = options?.hideDisclosure === true ? "" : mediaDisclosure(media, options);
    return `<div class="media-block">${frame}${disclosure}</div>`;
  }

  function mediaHasTransparency(media) {
    if (!media) return false;
    if (media.hasTransparency === true) return true;
    return media.kind === "group" && Array.isArray(media.items) && media.items.some(mediaHasTransparency);
  }

  function makeMedia(media, item, options = {}) {
    const ratio = media?.ratio || "4/3";
    const eager = options.eager === true;
    const mediaBadge = ["video", "audio"].includes(options.mediaBadge) ? options.mediaBadge : mediaBadgeForItem(item);
    const mediaMark = mediaBadge ? `<span class="media-mark media-mark-${mediaBadge}">${t(`media.${mediaBadge}`)}</span>` : "";
    if (media?.kind === "group" && Array.isArray(media.items)) {
      const transparencyClass = mediaHasTransparency(media) ? " has-transparency" : "";
      const frame = `<div class="media-frame media-group${transparencyClass}" data-group-count="${media.items.length}" style="--ratio:${esc(ratio)}">${media.items.map((asset, index) => `
        <div class="media-group-item"><img src="${url(asset.src)}" alt="${esc(mediaAlt(asset, item))}"${imageAttributes(asset, { fetchPriority: options.fetchPriority === "high" && index === 0 ? "high" : undefined })} loading="${eager && index === 0 ? "eager" : "lazy"}" decoding="async"></div>`).join("")}${mediaMark}</div>`;
      return wrapMedia(frame, media, options);
    }
    if (media?.kind === "image" && media.src) {
      const source = media.srcset ? `<source srcset="${esc(media.srcset)}" sizes="${esc(media.sizes || "(max-width: 680px) 100vw, 50vw")}">` : "";
      const fit = media.fit === "contain" ? "is-contain" : "is-cover";
      const noPadding = media.noPadding === true ? " no-padding" : "";
      const mobileRatio = media.mobileRatio ? `;--mobile-ratio:${esc(media.mobileRatio)}` : "";
      const objectPosition = media.objectPosition ? `;--object-position:${esc(media.objectPosition)}` : "";
      const transparencyClass = mediaHasTransparency(media) ? " has-transparency" : "";
      const frame = `<div class="media-frame ${fit}${noPadding}${transparencyClass}" style="--ratio:${esc(ratio)}${mobileRatio}${objectPosition}"><picture>${source}<img src="${url(media.src)}" alt="${esc(mediaAlt(media, item))}"${imageAttributes(media, options)} loading="${eager ? "eager" : "lazy"}" decoding="async"></picture>${mediaMark}</div>`;
      return wrapMedia(frame, media, options);
    }
    const frame = `<div class="media-frame" style="--ratio:${esc(ratio)}">
      <div class="media-art ${esc(media?.art || "art-latentne")}" role="img" aria-label="${esc(mediaAlt(media, item))}"><i></i><b></b><em></em></div>
      <span class="placeholder-label">${t("media.placeholder")}</span>
      ${mediaMark}
    </div>`;
    return wrapMedia(frame, media, options);
  }

  const AUDIO_EMBED_SIZES = new Set(["compact", "standard", "expanded"]);
  const AUDIO_PROVIDERS = new Set(["soundcloud", "bandcamp"]);
  const audioEmbedSize = video => AUDIO_EMBED_SIZES.has(video?.embedSize) ? video.embedSize : "standard";

  function videoUrl(video) {
    if (!video?.provider) return null;
    if (video.provider === "youtube" && /^[A-Za-z0-9_-]{6,20}$/.test(video.id)) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0`;
    if (video.provider === "vimeo" && /^\d{5,12}$/.test(video.id)) return `https://player.vimeo.com/video/${encodeURIComponent(video.id)}`;
    if (video.provider === "soundcloud") {
      try {
        const track = new URL(video.url);
        if (track.protocol !== "https:" || !(track.hostname === "soundcloud.com" || track.hostname.endsWith(".soundcloud.com"))) return null;
        const size = audioEmbedSize(video);
        const params = new URLSearchParams({
          url: track.href,
          auto_play: "false",
          hide_related: "true",
          show_comments: "false",
          show_user: "true",
          show_reposts: "false",
          visual: size === "expanded" ? "true" : "false",
          show_artwork: size === "standard" ? "true" : "false"
        });
        return `https://w.soundcloud.com/player/?${params}`;
      } catch { return null; }
    }
    if (video.provider === "bandcamp" && /^(?:album|track)$/.test(video.bandcampType) && /^\d{5,12}$/.test(String(video.id || ""))) {
      const size = audioEmbedSize(video);
      const layout = size === "compact"
        ? "size=small"
        : `size=large/artwork=small/tracklist=${size === "expanded" ? "true" : "false"}`;
      return `https://bandcamp.com/EmbeddedPlayer/v=2/${video.bandcampType}=${encodeURIComponent(video.id)}/${layout}/bgcol=f8f9f8/linkcol=1420ca/transparent=true/`;
    }
    return null;
  }

  function mediaBadgeForItem(item) {
    if (item?.mediaType !== "video" || !videoUrl(item.video)) return "";
    return AUDIO_PROVIDERS.has(item.video?.provider) ? "audio" : "video";
  }

  function preferredMediaBadge(items = []) {
    let hasAudio = false;
    for (const item of items) {
      const badge = mediaBadgeForItem(item);
      if (badge === "video") return "video";
      if (badge === "audio") hasAudio = true;
    }
    return hasAudio ? "audio" : "";
  }

  function makeVideo(item, options = {}) {
    const src = videoUrl(item?.video);
    if (!src) return makeMedia(item?.video?.poster || item?.cover, item, options);
    const provider = item?.video?.provider || "";
    const isAudioEmbed = AUDIO_PROVIDERS.has(provider);
    const embedSize = audioEmbedSize(item?.video);
    const audioClasses = isAudioEmbed ? ` is-audio-embed embed-provider-${provider} embed-size-${embedSize}` : "";
    const frameClasses = isAudioEmbed ? " audio-embed-frame" : "";
    const frameStyle = isAudioEmbed ? "" : ' style="--ratio:16/9"';
    const providerLabel = provider === "bandcamp" ? "Bandcamp" : provider === "soundcloud" ? "SoundCloud" : "Video";
    const fullscreen = isAudioEmbed ? "" : " allowfullscreen";
    const warning = field(item, "videoWarning");
    const externalUrl = item?.video?.externalUrl;
    const externalLabel = field(item, "videoLink");
    const transcript = field(item?.video, "transcript");
    const credits = field(item?.video, "credits");
    const transcriptLabel = state.lang === "pl" ? "Transkrypcja" : "Transcript";
    const creditsLabel = state.lang === "pl" ? "Kredyty" : "Credits";
    return `<div class="video-block${audioClasses}">
      ${warning ? `<p class="video-warning" role="note">${esc(warning)}</p>` : ""}
      <div class="media-frame video-frame${frameClasses}"${frameStyle}><iframe src="${src}" title="${esc(`${providerLabel}: ${text(item)}`)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media"${fullscreen}></iframe></div>
      ${externalUrl && externalLabel ? `<p class="media-external"><a href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer">${esc(externalLabel)}</a></p>` : ""}
      ${credits ? `<p class="video-credits"><strong>${creditsLabel}:</strong> ${esc(credits)}</p>` : ""}
      ${transcript ? `<details class="video-transcript"><summary>${transcriptLabel}</summary><p>${esc(transcript)}</p></details>` : ""}
    </div>`;
  }

  function makeWorkMedia(item, options = {}) {
    return item?.mediaType === "video" ? makeVideo(item, options) : makeMedia(item?.cover, item, options);
  }

  function projectById(id) { return window.PORTFOLIO_DATA.projects.find(project => project.id === id); }
  function projectName(id) { return text(projectById(id)); }
  function projectHref(id) {
    const project = projectById(id);
    return project ? url(`projects/${encodeURIComponent(project.id)}/index.html`) : "";
  }
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
  function initTypography() {
    if (window.PortfolioTypography) {
      window.PortfolioTypography.start();
      return;
    }
    if (!location.pathname.includes("/studio-preview/") || document.querySelector("[data-typography-fallback]")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = url("assets/js/typography.js");
    script.dataset.typographyFallback = "true";
    script.addEventListener("load",() => window.PortfolioTypography?.start(),{once:true});
    document.head.append(script);
  }
  initTypography();

  function initSmartHeader() {
    const shell = document.querySelector("[data-site-header]");
    if (!shell) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastY = Math.max(0, window.scrollY);
    let downwardTravel = 0;
    let upwardTravel = 0;
    let frame = 0;

    const reveal = () => shell.classList.remove("is-hidden");
    const menuIsOpen = () => document.querySelector(".menu-toggle")?.getAttribute("aria-expanded") === "true";
    const mustStayVisible = () => reducedMotion.matches || menuIsOpen() || shell.contains(document.activeElement) || document.body.classList.contains("no-scroll");

    const update = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;
      const topZone = Math.max(16, shell.offsetHeight);

      if (currentY <= topZone || mustStayVisible()) {
        reveal();
        downwardTravel = 0;
        upwardTravel = 0;
      } else if (delta > 0) {
        downwardTravel += delta;
        upwardTravel = 0;
        if (downwardTravel >= 32) shell.classList.add("is-hidden");
      } else if (delta < 0) {
        upwardTravel += Math.abs(delta);
        downwardTravel = 0;
        if (upwardTravel >= 12) reveal();
      }
      lastY = currentY;
    };

    window.addEventListener("scroll", () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    }, { passive: true });
    shell.addEventListener("focusin", reveal);
    reducedMotion.addEventListener?.("change", reveal);
  }

  initSmartHeader();
  document.addEventListener("click", event => {
    const lang = event.target.closest("[data-lang]");
    if (lang) setLanguage(lang.dataset.lang);
    const toggle = event.target.closest(".menu-toggle");
    if (toggle) {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = t(open ? "nav.close" : "nav.menu");
      document.querySelector(".primary-nav")?.classList.toggle("open", open);
      document.querySelector("[data-site-header]")?.classList.remove("is-hidden");
    }
  });
  window.addEventListener("message", event => {
    if (!location.pathname.includes("/studio-preview/")) return;
    let referrerOrigin = "";
    try { referrerOrigin = new URL(document.referrer).origin; } catch {}
    if (event.source !== window.parent || event.origin !== referrerOrigin || !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(event.origin)) return;
    if (event.data?.type !== "portfolio-preview-heading-spacing") return;
    const hero = document.querySelector(".project-hero");
    if (!hero) return;
    const clamp = value => Math.min(1.4, Math.max(0.8, Number(value) || 1.12));
    hero.style.setProperty("--project-hero-line-height-pl", String(clamp(event.data.pl)));
    hero.style.setProperty("--project-hero-line-height-en", String(clamp(event.data.en)));
  });
  applyCopy();

  window.Portfolio = { state, t, text, field, esc, singleLine, url, setLanguage, makeMedia, makeVideo, makeWorkMedia, mediaDisclosure, mediaHasTransparency, mediaBadgeForItem, preferredMediaBadge, projectById, projectName, projectHref, labelFor, videoUrl, paginationTokens, renderPaginationTokens, configuredSocialLinks };
})();
