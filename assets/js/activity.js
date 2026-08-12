(() => {
  const P = window.Portfolio;
  const feedRoot = document.querySelector("[data-activity-feed]");
  if (!P || !feedRoot) return;

  const filtersRoot = document.querySelector("[data-activity-filters]");
  const featuredRoot = document.querySelector("[data-activity-featured]");
  const paginationRoot = document.querySelector("[data-activity-pagination]");
  const countRoots = [...document.querySelectorAll("[data-activity-count]")];
  const activity = window.PORTFOLIO_SITE?.activity || {};
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(activity.itemsPerPage, 10) || 10));
  const viewer = window.PortfolioViewer?.create?.();
  let selectedType = "all";
  let page = 1;
  let viewerItems = [];

  const labels = {
    all: ["Wszystkie", "All"],
    filter: ["Filtr aktualizacji", "Update filter"],
    featured: ["TERAZ", "NOW"],
    previous: ["Poprzednia", "Previous"],
    next: ["Następna", "Next"],
    page: ["Strona", "Page"],
    pagination: ["Stronicowanie aktualizacji", "Update pagination"],
    range: ["Wyświetlono", "Showing"],
    of: ["z", "of"],
    entries: ["wpisów", "updates"],
    permalink: ["Link do wpisu", "Permalink"],
    enlarge: ["Powiększ obraz", "Enlarge image"],
    empty: ["Brak opublikowanych aktualizacji.", "No published updates yet."],
    emptyFilter: ["Brak aktualizacji w tej kategorii.", "No updates in this category."]
  };

  const langIndex = () => P.state.lang === "pl" ? 0 : 1;
  const l = key => labels[key][langIndex()];
  const local = (item, name) => item?.[`${name}${P.state.lang === "pl" ? "PL" : "EN"}`] || "";

  function configuredLabel(name, fallback) {
    const suffix = P.state.lang === "pl" ? "PL" : "EN";
    const direct = activity?.[`${name}${suffix}`];
    if (direct) return direct;
    const nested = activity?.labels?.[name];
    if (nested && typeof nested === "object") return nested[P.state.lang] || fallback;
    return fallback;
  }

  function updateTypes(update) {
    const values = Array.isArray(update?.types) ? update.types : [update?.type];
    return [...new Set(values.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
  }

  function typeDefinitions() {
    if (Array.isArray(activity.types)) return activity.types;
    if (activity.typeLabels && typeof activity.typeLabels === "object") {
      return Object.entries(activity.typeLabels).map(([id, value]) => ({
        id,
        labelPL: value?.pl || value?.labelPL || id,
        labelEN: value?.en || value?.labelEN || id
      }));
    }
    return [];
  }

  function typeLabel(type) {
    const definition = typeDefinitions().find(item => item.id === type);
    if (definition) return local(definition, "label") || definition.label || type;
    const translated = P.labelFor("type", type);
    if (translated && translated !== type) return translated;
    return String(type).replace(/[-_]+/g, " ").replace(/^./u, character => character.toLocaleUpperCase(P.state.lang));
  }

  function dateValue(update) {
    const value = update?.date || update?.publishedAt || "";
    const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function dateLabel(value) {
    if (!value) return "";
    const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
    if (!Number.isFinite(timestamp)) return value;
    return new Intl.DateTimeFormat(P.state.lang === "pl" ? "pl-PL" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(timestamp));
  }

  const updates = (Array.isArray(window.PORTFOLIO_DATA?.updates) ? window.PORTFOLIO_DATA.updates : [])
    .filter(update => update && update.id && update.draft !== true && update.published !== false);

  function safeHref(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const target = new URL(value, window.location.href);
      if (!["http:", "https:", "mailto:"].includes(target.protocol)) return "";
      return target.href;
    } catch {
      return "";
    }
  }

  function prose(value) {
    const paragraphs = String(value || "").trim().split(/\n{2,}/u).map(part => part.trim()).filter(Boolean);
    return paragraphs.map(paragraph => `<p>${P.esc(paragraph).replace(/\n/gu, "<br>")}</p>`).join("");
  }

  function viewerItem(update, block) {
    const captionPL = block.captionPL || update.summaryPL || "";
    const captionEN = block.captionEN || update.summaryEN || "";
    return {
      id: `${update.id}--${block.id}`,
      titlePL: block.captionPL || update.titlePL,
      titleEN: block.captionEN || update.titleEN,
      captionPL,
      captionEN,
      mediaType: "image",
      cover: block.media,
      externalLinks: []
    };
  }

  function mediaHasSource(media) {
    if (!media || typeof media !== "object") return false;
    if (media.kind === "group") return Array.isArray(media.items) && media.items.some(mediaHasSource);
    return media.kind === "image" && typeof media.src === "string" && media.src.trim().length > 0;
  }

  function renderTextBlock(block) {
    const heading = local(block, "heading");
    const body = local(block, "body");
    if (!heading && !body) return "";
    return `<section class="activity-block activity-text-block" data-activity-block="${P.esc(block.id)}">
      ${heading ? `<h3>${P.esc(heading)}</h3>` : ""}
      ${body ? `<div class="activity-prose">${prose(body)}</div>` : ""}
    </section>`;
  }

  function renderMediaBlock(update, block, eager) {
    if (!mediaHasSource(block.media)) return `<p class="activity-draft-placeholder">${P.esc(P.state.lang === "pl" ? "Obraz nie został jeszcze przypisany." : "No image has been assigned yet.")}</p>`;
    const item = viewerItem(update, block);
    viewerItems.push(item);
    const label = `${l("enlarge")}: ${P.text(item)}`;
    const caption = local(block, "caption");
    return `<figure class="activity-block activity-media-block" data-activity-block="${P.esc(block.id)}">
      <button class="activity-media-button" type="button" data-open-work="${P.esc(item.id)}" aria-label="${P.esc(label)}">
        ${P.makeMedia(block.media, item, { eager, hideDisclosure: true, disclosureMode: "detail" })}
      </button>
      ${P.mediaDisclosure(block.media, { disclosureMode: "detail" })}
      ${caption ? `<figcaption>${P.esc(caption)}</figcaption>` : ""}
    </figure>`;
  }

  function renderEmbedBlock(update, block) {
    if (!block.embed) return "";
    const title = local(block, "title");
    const summary = local(block, "summary");
    const item = {
      id: `${update.id}--${block.id}`,
      titlePL: block.titlePL || update.titlePL,
      titleEN: block.titleEN || update.titleEN,
      mediaType: "video",
      video: block.embed
    };
    if (!P.videoUrl(block.embed)) return `<p class="activity-draft-placeholder">${P.esc(P.state.lang === "pl" ? "Osadzenie nie zostało jeszcze skonfigurowane." : "The embed has not been configured yet.")}</p>`;
    return `<section class="activity-block activity-embed-block" data-activity-block="${P.esc(block.id)}">
      ${title ? `<h3>${P.esc(title)}</h3>` : ""}
      ${summary ? `<div class="activity-prose">${prose(summary)}</div>` : ""}
      ${P.makeVideo(item)}
    </section>`;
  }

  function renderLinkBlock(block) {
    const label = local(block, "label");
    const href = safeHref(block.href);
    if (!label || !href) return "";
    const external = /^https?:/u.test(href) && new URL(href).origin !== window.location.origin;
    return `<p class="activity-block activity-link-block" data-activity-block="${P.esc(block.id)}"><a href="${P.esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${P.esc(label)} <span aria-hidden="true">↗</span></a></p>`;
  }

  function renderBlock(update, block, eager) {
    if (!block || !block.id) return "";
    if (block.kind === "text") return renderTextBlock(block);
    if (block.kind === "media") return renderMediaBlock(update, block, eager);
    if (block.kind === "embed") return renderEmbedBlock(update, block);
    if (block.kind === "link") return renderLinkBlock(block);
    return "";
  }

  function renderEntry(update, index) {
    const title = P.text(update);
    const summary = local(update, "summary");
    const date = update.date || update.publishedAt || "";
    const types = updateTypes(update);
    const typeMarkup = types.map(type => `<span>${P.esc(typeLabel(type))}</span>`).join("");
    const projectLinks = (update.projectIds || []).map(id => {
      const href = P.projectHref(id);
      const name = P.projectName(id);
      return href && name ? `<a href="${P.esc(href)}">${P.esc(name)} <span aria-hidden="true">→</span></a>` : "";
    }).filter(Boolean).join("");
    const blocks = (Array.isArray(update.blocks) ? update.blocks : []).map((block, blockIndex) => renderBlock(update, block, index === 0 && blockIndex === 0)).join("");
    return `<article class="activity-entry" id="${P.esc(update.id)}" data-activity-entry="${P.esc(update.id)}">
      <header class="activity-entry-header">
        <div class="activity-entry-meta">
          ${date ? `<time datetime="${P.esc(date)}">${P.esc(dateLabel(date))}</time>` : ""}
          ${typeMarkup ? `<span class="activity-entry-types">${typeMarkup}</span>` : ""}
        </div>
        <h2>${P.esc(title)}</h2>
        ${summary ? `<div class="activity-summary">${prose(summary)}</div>` : ""}
        ${projectLinks ? `<nav class="activity-project-links" aria-label="${P.esc(P.state.lang === "pl" ? "Powiązane projekty" : "Related projects")}">${projectLinks}</nav>` : ""}
        <a class="activity-permalink" href="#${encodeURIComponent(update.id)}" aria-label="${P.esc(`${l("permalink")}: ${title}`)}">${P.esc(l("permalink"))} <span aria-hidden="true">#</span></a>
      </header>
      ${blocks ? `<div class="activity-entry-blocks">${blocks}</div>` : ""}
    </article>`;
  }

  function usedTypes() {
    const used = new Set(updates.flatMap(updateTypes));
    const configured = typeDefinitions().map(item => item.id).filter(id => used.has(id));
    const remaining = [...used].filter(id => !configured.includes(id)).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), P.state.lang));
    return [...configured, ...remaining];
  }

  function filteredUpdates() {
    return selectedType === "all" ? updates : updates.filter(update => updateTypes(update).includes(selectedType));
  }

  function renderFilters() {
    if (!filtersRoot) return;
    const types = usedTypes();
    const buttons = ["all", ...types].map(type => {
      const label = type === "all" ? l("all") : typeLabel(type);
      return `<button type="button" data-activity-type="${P.esc(type)}" aria-pressed="${type === selectedType}">${P.esc(label)}</button>`;
    }).join("");
    filtersRoot.innerHTML = `<div class="activity-filter-group" role="group" aria-label="${P.esc(configuredLabel("filterLabel", l("filter")))}">${buttons}</div>`;
    filtersRoot.hidden = updates.length === 0;
  }

  function renderFeatured() {
    if (!featuredRoot) return;
    const featured = updates.find(update => update.id === activity.featuredUpdateId);
    if (!featured) {
      featuredRoot.hidden = true;
      featuredRoot.innerHTML = "";
      return;
    }
    const title = P.text(featured);
    const summary = local(featured, "summary");
    const date = featured.date || featured.publishedAt || "";
    featuredRoot.hidden = false;
    featuredRoot.innerHTML = `<aside class="activity-now" aria-labelledby="activity-now-title">
      <p class="section-code">${P.esc(configuredLabel("featuredLabel", l("featured")))}</p>
      <div><h2 id="activity-now-title"><a href="#${encodeURIComponent(featured.id)}">${P.esc(title)}</a></h2>${summary ? `<div class="activity-now-summary">${prose(summary)}</div>` : ""}</div>
      ${date ? `<time datetime="${P.esc(date)}">${P.esc(dateLabel(date))}</time>` : ""}
    </aside>`;
  }

  function renderPagination(total, totalPages) {
    if (!paginationRoot) return;
    if (!total) {
      paginationRoot.innerHTML = "";
      paginationRoot.hidden = true;
      return;
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    const range = `${l("range")} ${start}–${end} ${l("of")} ${total} ${l("entries")}`;
    paginationRoot.hidden = false;
    paginationRoot.innerHTML = `<p class="pagination-range" data-activity-pagination-range tabindex="-1" aria-live="polite">${P.esc(range)}</p>
      <nav class="pagination-nav" aria-label="${P.esc(configuredLabel("paginationLabel", l("pagination")))}">
        <button class="pagination-previous" type="button" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${P.esc(l("previous"))}</button>
        <div class="pagination-pages">${P.renderPaginationTokens(page, totalPages, l("page"))}</div>
        <button class="pagination-next" type="button" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>${P.esc(l("next"))}</button>
      </nav>`;
  }

  function updateUrl(mode = "replace") {
    const url = new URL(window.location.href);
    if (selectedType === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", selectedType);
    if (page <= 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    const method = mode === "push" ? "pushState" : "replaceState";
    window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function readUrl({ followHash = true } = {}) {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type") || "all";
    selectedType = requestedType === "all" || usedTypes().includes(requestedType) ? requestedType : "all";
    page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
    if (!followHash || !window.location.hash) return;
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { id = window.location.hash.slice(1); }
    const target = updates.find(update => update.id === id);
    if (!target) return;
    if (selectedType !== "all" && !updateTypes(target).includes(selectedType)) selectedType = "all";
    const index = filteredUpdates().findIndex(update => update.id === id);
    if (index >= 0) page = Math.floor(index / pageSize) + 1;
  }

  function focusHashTarget() {
    if (!window.location.hash) return;
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { id = window.location.hash.slice(1); }
    const target = document.getElementById(id);
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  }

  function render(options = {}) {
    const filtered = filteredUpdates();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(totalPages, Math.max(1, page));
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    viewerItems = [];
    renderFilters();
    renderFeatured();
    feedRoot.innerHTML = visible.length
      ? visible.map(renderEntry).join("")
      : `<p class="activity-empty" role="status">${P.esc(updates.length ? l("emptyFilter") : configuredLabel("emptyLabel", local(activity, "empty") || l("empty")))}</p>`;
    countRoots.forEach(root => { root.textContent = String(filtered.length); });
    renderPagination(filtered.length, totalPages);
    if (options.sync !== false) updateUrl(options.historyMode);
    if (options.focusSelector) document.querySelector(options.focusSelector)?.focus({ preventScroll: true });
    if (options.followHash) window.requestAnimationFrame(focusHashTarget);
  }

  filtersRoot?.addEventListener("click", event => {
    const button = event.target.closest("button[data-activity-type]");
    if (!button) return;
    const next = button.dataset.activityType;
    if (next === selectedType) return;
    selectedType = next;
    page = 1;
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    render({ historyMode: "push", focusSelector: `[data-activity-type="${CSS.escape(next)}"]` });
  });

  paginationRoot?.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const next = Math.max(1, Number.parseInt(button.dataset.page, 10) || 1);
    if (next === page) return;
    page = next;
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    render({ historyMode: "push", focusSelector: "[data-activity-pagination-range]" });
    feedRoot.scrollIntoView({ block: "start" });
  });

  feedRoot.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-work]");
    if (!opener || !viewer) return;
    viewer.open({ items: viewerItems, id: opener.dataset.openWork, opener });
  });

  window.addEventListener("portfolio:language", () => render({ sync: false }));
  window.addEventListener("popstate", () => {
    readUrl();
    render({ sync: false, followHash: true });
  });
  window.addEventListener("hashchange", () => {
    readUrl();
    render({ sync: false, followHash: true });
  });

  readUrl();
  render({ sync: false, followHash: true });
})();
