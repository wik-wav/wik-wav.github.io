(() => {
  const P = window.Portfolio;
  const { works: allWorks, projects } = window.PORTFOLIO_DATA;
  const works = allWorks.filter(item => !item.draft && item.galleryVisible !== false);
  const gallery = document.querySelector("[data-gallery]");
  const filterRoot = document.querySelector("[data-filters]");
  const controlsRoot = document.querySelector("[data-display-controls]");
  const paginationRoot = document.querySelector("[data-pagination]");
  const summary = document.querySelector("[data-selection-summary]");
  const resultCount = document.querySelector("[data-result-count]");
  const zero = document.querySelector("[data-zero-state]");
  const lightbox = document.querySelector("[data-lightbox]");
  if (!gallery || !filterRoot || !controlsRoot || !paginationRoot) return;

  const facetKeys = ["project", "year", "medium", "type"];
  const sizeValues = ["small", "medium", "large"];
  const perValues = [6, 12, 24];
  const collectionValues = [...new Set(works.flatMap(item => item.collections || []))];
  const selected = Object.fromEntries(facetKeys.map(key => [key, new Set()]));
  const display = { size: "medium", per: 12, page: 1 };
  let activeCollection = null;
  let visibleWorks = works.slice();
  let activeWorkId = null;
  let lastFocus = null;
  let openFacet = null;

  const staticCopy = {
    project: ["Projekt", "Project"], year: ["Rok", "Year"], medium: ["Medium", "Medium"], type: ["Typ", "Type"],
    clear: ["Wyczyść wszystko", "Clear all"], filters: ["Filtry galerii", "Gallery filters"],
    noFilters: ["Brak wybranych filtrów", "No filters selected"], results: ["wyników", "results"], result: ["wynik", "result"],
    zeroTitle: ["Brak prac dla tej kombinacji.", "No work matches this combination."],
    zeroBody: ["Usuń jeden lub więcej filtrów albo wyczyść zestaw i zacznij od nowa.", "Remove one or more filters, or clear the set and start again."],
    zeroAction: ["Wyczyść filtry", "Clear filters"], selected: ["Wybrane", "Selected"],
    previous: ["Poprzednia", "Previous"], next: ["Następna", "Next"], close: ["Zamknij", "Close"],
    displaySize: ["Rozmiar prac", "Work size"], small: ["Małe", "Small"], mediumSize: ["Średnie", "Medium"], large: ["Duże", "Large"],
    perPage: ["Prace na stronie", "Works per page"], pagination: ["Stronicowanie prac", "Work pagination"], page: ["Strona", "Page"]
  };
  const c = key => staticCopy[key][P.state.lang === "pl" ? 0 : 1];

  function stored(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function persist(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function allowed(value, values, fallback) {
    return values.includes(value) ? value : fallback;
  }

  function positivePage(value) {
    const page = Number.parseInt(value || "1", 10);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  function options() {
    return {
      project: [...projects.map(project => ({ value: project.id, label: P.text(project) })), { value: "independent", label: P.projectName("independent") }],
      year: [...new Set(works.map(item => item.year).filter(Boolean))].map(value => ({ value, label: value })),
      medium: [...new Set(works.map(item => item.medium))].map(value => ({ value, label: P.labelFor("medium", value) })),
      type: [...new Set(works.flatMap(item => item.types))].map(value => ({ value, label: P.labelFor("type", value) })).sort((a, b) => a.label.localeCompare(b.label, P.state.lang))
    };
  }

  function readQuery() {
    const params = new URLSearchParams(location.search);
    facetKeys.forEach(key => {
      selected[key].clear();
      params.getAll(key).forEach(value => selected[key].add(value));
    });
    const querySize = params.get("size");
    const queryPer = Number.parseInt(params.get("per") || "", 10);
    display.size = params.has("size")
      ? allowed(querySize, sizeValues, "medium")
      : allowed(stored("portfolio:size"), sizeValues, "medium");
    display.per = params.has("per")
      ? allowed(queryPer, perValues, 12)
      : allowed(Number.parseInt(stored("portfolio:works:per") || "", 10), perValues, 12);
    display.page = positivePage(params.get("page"));
    activeCollection = collectionValues.includes(params.get("collection")) ? params.get("collection") : null;
    activeWorkId = params.get("work");
  }

  function writeQuery(mode = "replace") {
    const params = new URLSearchParams(location.search);
    facetKeys.forEach(key => {
      params.delete(key);
      [...selected[key]].forEach(value => params.append(key, value));
    });
    params.set("size", display.size);
    params.set("per", String(display.per));
    params.set("page", String(display.page));
    activeCollection ? params.set("collection", activeCollection) : params.delete("collection");
    activeWorkId ? params.set("work", activeWorkId) : params.delete("work");
    const query = params.toString();
    history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function matches(item) {
    const projectMatch = !selected.project.size || selected.project.has(item.project);
    const yearMatch = !selected.year.size || selected.year.has(item.year);
    const mediumMatch = !selected.medium.size || selected.medium.has(item.medium);
    const typeMatch = !selected.type.size || item.types.some(type => selected.type.has(type));
    const collectionMatch = !activeCollection || item.collections?.includes(activeCollection);
    return projectMatch && yearMatch && mediumMatch && typeMatch && collectionMatch;
  }

  function tagLine(item) {
    return [P.projectName(item.project), item.year || null, P.labelFor("medium", item.medium), ...item.types.map(type => P.labelFor("type", type))]
      .filter(Boolean).map(label => `<span class="tag">${label}</span>`).join("");
  }

  function renderControls() {
    const labels = { small: c("small"), medium: c("mediumSize"), large: c("large") };
    controlsRoot.innerHTML = `
      <fieldset class="size-control">
        <legend>${c("displaySize")}</legend>
        <div class="size-options">${sizeValues.map(value => `<label><input type="radio" name="work-size" value="${value}" ${display.size === value ? "checked" : ""}><span>${labels[value]}</span></label>`).join("")}</div>
      </fieldset>
      <label class="per-control"><span>${c("perPage")}</span><select name="work-per">${perValues.map(value => `<option value="${value}" ${display.per === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>`;
  }

  function renderFilters() {
    const facetOptions = options();
    filterRoot.setAttribute("aria-label", c("filters"));
    filterRoot.innerHTML = facetKeys.map(key => `
      <div class="filter-group" data-filter-group="${key}">
        <button class="filter-trigger" type="button" aria-expanded="${openFacet === key}" aria-controls="filter-${key}" data-od-id="filter-${key}-trigger">
          <span>${c(key)}</span><span aria-hidden="true">+</span>
        </button>
        <div class="filter-menu ${openFacet === key ? "open" : ""}" id="filter-${key}" role="group" aria-label="${c(key)}">
          ${facetOptions[key].map(option => `<label class="filter-option"><input type="checkbox" name="${key}" value="${option.value}" ${selected[key].has(option.value) ? "checked" : ""}><span>${option.label}</span></label>`).join("")}
        </div>
      </div>`).join("") + `<button class="filter-clear" type="button" data-clear-filters data-od-id="clear-all-filters">${c("clear")}</button>`;
  }

  function renderGallery() {
    visibleWorks = works.filter(matches);
    const pages = Math.max(1, Math.ceil(visibleWorks.length / display.per));
    display.page = Math.min(display.page, pages);
    const start = (display.page - 1) * display.per;
    const pageWorks = visibleWorks.slice(start, start + display.per);
    gallery.dataset.size = display.size;
    gallery.innerHTML = pageWorks.map((item, index) => `
      <article class="work-card" data-od-id="gallery-card-${item.id}">
        <button class="work-link" type="button" data-open-work="${item.id}" aria-label="${P.text(item)}">
          ${P.makeMedia(item.cover, item, { eager: index < 2 })}
          <div class="work-title"><h3>${P.text(item)}</h3><span class="work-index">${String(start + index + 1).padStart(2, "0")}</span></div>
          <div class="card-tags">${tagLine(item)}</div>
        </button>
      </article>`).join("");
    const count = visibleWorks.length;
    resultCount.textContent = `${count} ${count === 1 ? c("result") : c("results")}`;
    zero.classList.toggle("show", count === 0);
    gallery.hidden = count === 0;
  }

  function renderSummary() {
    const facetOptions = options();
    const chips = [];
    facetKeys.forEach(key => [...selected[key]].forEach(value => {
      const option = facetOptions[key].find(item => item.value === value);
      chips.push(`<span class="selection-chip">${c(key)}: ${option?.label || value}</span>`);
    }));
    if (activeCollection) chips.unshift(`<span class="selection-chip">${P.projectName(activeCollection)}</span>`);
    summary.innerHTML = chips.length ? `<span class="filter-label">${c("selected")}</span>${chips.join("")}` : `<span class="muted">${c("noFilters")}</span>`;
  }

  function renderPagination() {
    const count = visibleWorks.length;
    const totalPages = Math.max(1, Math.ceil(count / display.per));
    const start = count ? (display.page - 1) * display.per + 1 : 0;
    const end = count ? Math.min(display.page * display.per, count) : 0;
    const range = P.state.lang === "pl" ? `Wyświetlono ${start}–${end} z ${count} prac` : `Showing ${start}–${end} of ${count} works`;
    paginationRoot.innerHTML = `<p class="pagination-range" data-pagination-range tabindex="-1" aria-live="polite">${range}</p>
      <nav class="pagination-nav" aria-label="${c("pagination")}">
        <button class="pagination-previous" type="button" data-page="${display.page - 1}" ${display.page <= 1 ? "disabled" : ""}>${c("previous")}</button>
        <div class="pagination-pages">${P.renderPaginationTokens(display.page, totalPages, c("page"))}</div>
        <button class="pagination-next" type="button" data-page="${display.page + 1}" ${display.page >= totalPages ? "disabled" : ""}>${c("next")}</button>
      </nav>`;
  }

  function updateModeLink() {
    document.querySelector("[data-projects-mode-link]")?.setAttribute("href", `../projects/index.html?size=${display.size}`);
  }

  function updateCollectionShortcut() {
    const shortcut = document.querySelector("[data-character-art-shortcut]");
    if (!shortcut) return;
    shortcut.setAttribute("aria-pressed", String(activeCollection === "character-art"));
  }

  function restoreFocus(selector) {
    if (!selector) return;
    queueMicrotask(() => document.querySelector(selector)?.focus({ preventScroll: true }));
  }

  function selectorValue(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function update({ sync = true, resetPage = false, historyMode = "replace", focusTarget = null } = {}) {
    if (resetPage) display.page = 1;
    renderControls();
    renderFilters();
    renderSummary();
    renderGallery();
    renderPagination();
    updateModeLink();
    updateCollectionShortcut();
    if (sync) writeQuery(historyMode);
    restoreFocus(focusTarget);
  }

  function embedFor(item) { return P.makeWorkMedia(item, { eager: true, disclosureMode: "detail" }); }

  function openLightbox(id, opener, sync = true) {
    const item = works.find(work => work.id === id);
    if (!item) return;
    lastFocus = opener || lastFocus || document.activeElement;
    activeWorkId = id;
    if (sync) writeQuery();
    document.body.classList.add("no-scroll");
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.querySelector("[data-lightbox-media]").innerHTML = embedFor(item);
    lightbox.querySelector("[data-lightbox-title]").textContent = P.text(item);
    lightbox.querySelector("[data-lightbox-caption]").textContent = P.field(item, "caption");
    const links = lightbox.querySelector("[data-lightbox-links]");
    if (links) links.innerHTML = (item.externalLinks || []).map(link => {
      const label = P.state.lang === "pl" ? link.labelPL : link.labelEN;
      return `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }).join("");
    const filteredIndex = visibleWorks.findIndex(work => work.id === id);
    const sequence = filteredIndex >= 0 ? visibleWorks : works;
    const actualIndex = filteredIndex >= 0 ? filteredIndex : works.findIndex(work => work.id === id);
    lightbox.querySelector("[data-lightbox-counter]").textContent = `${String(actualIndex + 1).padStart(2, "0")} / ${String(sequence.length).padStart(2, "0")}`;
    lightbox.querySelector("[data-lightbox-close]").focus();
  }

  function closeLightbox(sync = true) {
    activeWorkId = null;
    if (sync) writeQuery();
    document.body.classList.remove("no-scroll");
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.querySelector("[data-lightbox-media]").innerHTML = "";
    const links = lightbox.querySelector("[data-lightbox-links]");
    if (links) links.innerHTML = "";
    lastFocus?.focus?.();
  }

  function stepLightbox(direction) {
    const sequence = visibleWorks.some(work => work.id === activeWorkId) ? visibleWorks : works;
    const index = sequence.findIndex(work => work.id === activeWorkId);
    const next = (index + direction + sequence.length) % sequence.length;
    openLightbox(sequence[next].id, lastFocus);
  }

  controlsRoot.addEventListener("change", event => {
    if (event.target.name === "work-size") {
      display.size = allowed(event.target.value, sizeValues, "medium");
      persist("portfolio:size", display.size);
      update({ focusTarget: `input[name="work-size"][value="${display.size}"]` });
    }
    if (event.target.name === "work-per") {
      display.per = allowed(Number.parseInt(event.target.value, 10), perValues, 12);
      display.page = 1;
      persist("portfolio:works:per", display.per);
      update({ focusTarget: "select[name=\"work-per\"]" });
    }
  });

  paginationRoot.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const targetPage = positivePage(button.dataset.page);
    if (targetPage === display.page) return;
    display.page = targetPage;
    update({ historyMode: "push", focusTarget: "[data-pagination-range]" });
  });

  filterRoot.addEventListener("click", event => {
    const trigger = event.target.closest(".filter-trigger");
    if (trigger) {
      const group = trigger.closest(".filter-group");
      const key = group.dataset.filterGroup;
      const menu = group.querySelector(".filter-menu");
      const open = trigger.getAttribute("aria-expanded") !== "true";
      openFacet = open ? key : null;
      document.querySelectorAll(".filter-trigger").forEach(button => button.setAttribute("aria-expanded", "false"));
      document.querySelectorAll(".filter-menu").forEach(item => item.classList.remove("open"));
      trigger.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("open", open);
    }
    if (event.target.closest("[data-clear-filters]")) {
      facetKeys.forEach(key => selected[key].clear());
      activeCollection = null;
      openFacet = null;
      update({ resetPage: true, focusTarget: "[data-clear-filters]" });
    }
  });

  document.querySelector("[data-character-art-shortcut]")?.addEventListener("click", () => {
    activeCollection = activeCollection === "character-art" ? null : "character-art";
    update({ resetPage: true, focusTarget: "[data-character-art-shortcut]" });
  });

  filterRoot.addEventListener("change", event => {
    const input = event.target.closest("input[type=checkbox]");
    if (!input) return;
    const focusTarget = `input[name="${selectorValue(input.name)}"][value="${selectorValue(input.value)}"]`;
    input.checked ? selected[input.name].add(input.value) : selected[input.name].delete(input.value);
    update({ resetPage: true, focusTarget });
  });

  gallery.addEventListener("click", event => {
    const button = event.target.closest("[data-open-work]");
    if (button) openLightbox(button.dataset.openWork, button);
  });

  document.querySelector("[data-zero-clear]")?.addEventListener("click", () => {
    facetKeys.forEach(key => selected[key].clear());
    activeCollection = null;
    openFacet = null;
    update({ resetPage: true, focusTarget: "[data-result-count]" });
  });

  lightbox.addEventListener("click", event => {
    if (event.target.closest("[data-lightbox-close]")) closeLightbox();
    if (event.target.closest("[data-lightbox-prev]")) stepLightbox(-1);
    if (event.target.closest("[data-lightbox-next]")) stepLightbox(1);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const openMenu = document.querySelector(".filter-menu.open");
      if (openMenu) {
        openFacet = null;
        openMenu.classList.remove("open");
        const trigger = openMenu.previousElementSibling;
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
      } else if (lightbox.classList.contains("open")) closeLightbox();
    }
    if (lightbox.classList.contains("open") && event.key === "ArrowLeft") stepLightbox(-1);
    if (lightbox.classList.contains("open") && event.key === "ArrowRight") stepLightbox(1);
    if (lightbox.classList.contains("open") && event.key === "Tab") {
      const focusable = [...lightbox.querySelectorAll("button, iframe, [href], [tabindex]:not([tabindex='-1'])")].filter(el => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener("portfolio:language", () => {
    update({ sync: false });
    if (activeWorkId) openLightbox(activeWorkId, lastFocus, false);
  });

  window.addEventListener("popstate", () => {
    const wasOpen = lightbox.classList.contains("open");
    readQuery();
    update({ sync: false, focusTarget: "[data-pagination-range]" });
    if (activeWorkId && works.some(work => work.id === activeWorkId)) openLightbox(activeWorkId, lastFocus, false);
    else if (wasOpen) closeLightbox(false);
  });

  readQuery();
  update();
  if (activeWorkId && works.some(work => work.id === activeWorkId)) openLightbox(activeWorkId, null, false);
})();
