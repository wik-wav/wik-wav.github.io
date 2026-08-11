(() => {
  const P = window.Portfolio;
  const { works: runtimeWorks, detailMedia = [], projects, collectionIds = [] } = window.PORTFOLIO_DATA;
  const allWorks = [...runtimeWorks, ...detailMedia];
  const works = runtimeWorks.filter(item => !item.draft && item.galleryVisible !== false);
  const previewMode = location.pathname.includes("/studio-preview/");
  const directlyViewableWorks = previewMode ? allWorks : works;
  const gallery = document.querySelector("[data-gallery]");
  const filterRoot = document.querySelector("[data-filters]");
  const controlsRoot = document.querySelector("[data-display-controls]");
  const paginationRoot = document.querySelector("[data-pagination]");
  const summary = document.querySelector("[data-selection-summary]");
  const resultCount = document.querySelector("[data-result-count]");
  const zero = document.querySelector("[data-zero-state]");
  if (!gallery || !filterRoot || !controlsRoot || !paginationRoot) return;

  const facetKeys = ["project", "year", "medium", "type"];
  const sizeValues = ["small", "medium", "large"];
  const perValues = [6, 12, 24];
  const selected = Object.fromEntries(facetKeys.map(key => [key, new Set()]));
  const display = { size: "medium", per: 12, page: 1, tagsVisible: false };
  let visibleWorks = works.slice();
  let activeWorkId = null;
  let openFacet = null;
  const viewer = window.PortfolioViewer.create({
    showProjectLink: true,
    onActiveChange(item) {
      activeWorkId = item.id;
      writeQuery();
    },
    onClose() {
      activeWorkId = null;
      writeQuery();
    }
  });

  const staticCopy = {
    project: ["Projekt", "Project"], year: ["Rok", "Year"], medium: ["Medium", "Medium"], type: ["Typ", "Type"],
    clear: ["Wyczyść wszystko", "Clear all"], filters: ["Filtry galerii", "Gallery filters"],
    noFilters: ["Brak wybranych filtrów", "No filters selected"], results: ["wyników", "results"], result: ["wynik", "result"],
    zeroTitle: ["Brak prac dla tej kombinacji.", "No work matches this combination."],
    zeroBody: ["Usuń jeden lub więcej filtrów albo wyczyść zestaw i zacznij od nowa.", "Remove one or more filters, or clear the set and start again."],
    zeroAction: ["Wyczyść filtry", "Clear filters"], selected: ["Wybrane", "Selected"],
    previous: ["Poprzednia", "Previous"], next: ["Następna", "Next"], close: ["Zamknij", "Close"],
    displaySize: ["Rozmiar prac", "Work size"], small: ["Małe", "Small"], mediumSize: ["Średnie", "Medium"], large: ["Duże", "Large"],
    perPage: ["Prace na stronie", "Works per page"], tagVisibility: ["Tagi prac", "Work tags"], showTags: ["Pokaż tagi prac", "Show work tags"],
    pagination: ["Stronicowanie prac", "Work pagination"], page: ["Strona", "Page"]
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
    const representedProjectIds = new Set(works.map(item => item.project).filter(Boolean));
    const collectionIdSet = new Set(collectionIds);
    return {
      project: projects.filter(project => !collectionIdSet.has(project.id) && representedProjectIds.has(project.id)).map(project => ({ value: project.id, label: P.text(project) })),
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
    display.tagsVisible = params.has("tags")
      ? params.get("tags") === "1"
      : stored("portfolio:works:tags-visible") === "1";
    display.page = positivePage(params.get("page"));
    activeWorkId = params.get("work");
  }

  function writeQuery(mode = "replace") {
    const params = new URLSearchParams(location.search);
    params.delete("collection");
    facetKeys.forEach(key => {
      params.delete(key);
      [...selected[key]].forEach(value => params.append(key, value));
    });
    params.set("size", display.size);
    params.set("per", String(display.per));
    params.set("page", String(display.page));
    params.set("tags", display.tagsVisible ? "1" : "0");
    activeWorkId ? params.set("work", activeWorkId) : params.delete("work");
    const query = params.toString();
    history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function matches(item) {
    const projectMatch = !selected.project.size || selected.project.has(item.project);
    const yearMatch = !selected.year.size || selected.year.has(item.year);
    const mediumMatch = !selected.medium.size || selected.medium.has(item.medium);
    const typeMatch = !selected.type.size || item.types.some(type => selected.type.has(type));
    return projectMatch && yearMatch && mediumMatch && typeMatch;
  }

  function tagLine(item) {
    return [item.year || null, P.labelFor("medium", item.medium), ...item.types.map(type => P.labelFor("type", type))]
      .filter(Boolean).map(label => `<span class="tag">${P.esc(label)}</span>`).join("");
  }

  function renderControls() {
    const labels = { small: c("small"), medium: c("mediumSize"), large: c("large") };
    controlsRoot.innerHTML = `
      <fieldset class="size-control">
        <legend>${c("displaySize")}</legend>
        <div class="size-options">${sizeValues.map(value => `<label><input type="radio" name="work-size" value="${value}" ${display.size === value ? "checked" : ""}><span>${labels[value]}</span></label>`).join("")}</div>
      </fieldset>
      <label class="tags-control"><span class="display-control-label">${c("tagVisibility")}</span><span class="tags-toggle"><input type="checkbox" name="work-tags" ${display.tagsVisible ? "checked" : ""}><span>${c("showTags")}</span></span></label>
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
          ${facetOptions[key].map(option => `<label class="filter-option"><input type="checkbox" name="${P.esc(key)}" value="${P.esc(option.value)}" ${selected[key].has(option.value) ? "checked" : ""}><span>${P.esc(option.label)}</span></label>`).join("")}
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
    gallery.innerHTML = pageWorks.map((item, index) => {
      const workParams = new URLSearchParams(location.search);
      workParams.set("work", item.id);
      const workHref = `?${workParams.toString()}${location.hash}`;
      const projectHref = P.projectHref(item.project);
      const projectName = P.projectName(item.project);
      const projectLink = projectHref && projectName
        ? `<a class="work-project-link" href="${P.esc(projectHref)}">${P.esc(projectName)} <span aria-hidden="true">→</span></a>`
        : "";
      const mediaBadge = P.mediaBadgeForItem(item);
      const workLabel = [P.text(item), mediaBadge ? P.t(`media.${mediaBadge}`) : ""].filter(Boolean).join(" — ");
      return `<article class="work-card" data-od-id="gallery-card-${P.esc(item.id)}">
        <a class="work-link" href="${P.esc(workHref)}" data-open-work="${P.esc(item.id)}" aria-label="${P.esc(workLabel)}">
          ${P.makeMedia(item.cover, item, { eager: index < 2 })}
          <div class="work-title"><h3>${P.esc(P.text(item))}</h3><span class="work-index">${String(start + index + 1).padStart(2, "0")}</span></div>
        </a>
        <div class="work-card-meta">${projectLink}<div class="work-taxonomy card-tags" data-work-taxonomy ${display.tagsVisible ? "" : "hidden"}>${tagLine(item)}</div></div>
      </article>`;
    }).join("");
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
      chips.push(`<span class="selection-chip">${P.esc(c(key))}: ${P.esc(option?.label || P.projectName(value) || value)}</span>`);
    }));
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

  function restoreFocus(selector) {
    if (!selector) return;
    queueMicrotask(() => document.querySelector(selector)?.focus({ preventScroll: true }));
  }

  function applyTaxonomyVisibility() {
    gallery.querySelectorAll("[data-work-taxonomy]").forEach(element => { element.hidden = !display.tagsVisible; });
  }

  function selectorValue(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  const filterMenuGap = 12;
  let filterMenuFrame = 0;

  function viewportBounds() {
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    return { top, bottom: top + height, height };
  }

  function positionOpenFilterMenu() {
    const menu = filterRoot.querySelector(".filter-menu.open");
    if (!menu) return;
    menu.classList.remove("opens-up");
    const bounds = viewportBounds();
    if (window.matchMedia("(max-width: 680px)").matches) {
      menu.style.setProperty("--filter-menu-max-height", `${Math.max(1, Math.min(420, Math.floor(bounds.height * .5)))}px`);
      return;
    }
    const trigger = menu.previousElementSibling;
    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = Math.max(0, bounds.bottom - triggerRect.bottom - filterMenuGap);
    const spaceAbove = Math.max(0, triggerRect.top - bounds.top - filterMenuGap);
    const naturalHeight = Math.min(420, menu.scrollHeight + 2);
    const opensUp = spaceBelow < naturalHeight && spaceAbove > spaceBelow;
    const available = opensUp ? spaceAbove : spaceBelow;
    menu.classList.toggle("opens-up", opensUp);
    menu.style.setProperty("--filter-menu-max-height", `${Math.max(1, Math.min(420, Math.floor(available)))}px`);
  }

  function scheduleFilterMenuPosition() {
    if (filterMenuFrame) return;
    filterMenuFrame = window.requestAnimationFrame(() => {
      filterMenuFrame = 0;
      positionOpenFilterMenu();
    });
  }

  function update({ sync = true, resetPage = false, historyMode = "replace", focusTarget = null } = {}) {
    if (resetPage) display.page = 1;
    renderControls();
    renderFilters();
    positionOpenFilterMenu();
    renderSummary();
    renderGallery();
    renderPagination();
    updateModeLink();
    if (sync) writeQuery(historyMode);
    restoreFocus(focusTarget);
  }

  function openViewer(id, opener, sync = true) {
    if (!directlyViewableWorks.some(work => work.id === id)) return;
    activeWorkId = id;
    const filteredIndex = visibleWorks.findIndex(work => work.id === id);
    const sequence = filteredIndex >= 0 ? visibleWorks : directlyViewableWorks;
    viewer.open({ items: sequence, id, opener, notify: sync });
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
    if (event.target.name === "work-tags") {
      display.tagsVisible = event.target.checked;
      persist("portfolio:works:tags-visible", display.tagsVisible ? "1" : "0");
      applyTaxonomyVisibility();
      writeQuery();
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
      document.querySelectorAll(".filter-menu").forEach(item => {
        item.classList.remove("open", "opens-up");
        item.style.removeProperty("--filter-menu-max-height");
      });
      trigger.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("open", open);
      if (open) positionOpenFilterMenu();
    }
    if (event.target.closest("[data-clear-filters]")) {
      facetKeys.forEach(key => selected[key].clear());
      openFacet = null;
      update({ resetPage: true, focusTarget: "[data-clear-filters]" });
    }
  });

  filterRoot.addEventListener("change", event => {
    const input = event.target.closest("input[type=checkbox]");
    if (!input) return;
    const focusTarget = `input[name="${selectorValue(input.name)}"][value="${selectorValue(input.value)}"]`;
    input.checked ? selected[input.name].add(input.value) : selected[input.name].delete(input.value);
    update({ resetPage: true, focusTarget });
  });

  gallery.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-work]");
    if (opener) {
      event.preventDefault();
      openViewer(opener.dataset.openWork, opener);
    }
  });

  document.querySelector("[data-zero-clear]")?.addEventListener("click", () => {
    facetKeys.forEach(key => selected[key].clear());
    openFacet = null;
    update({ resetPage: true, focusTarget: "[data-result-count]" });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const openMenu = document.querySelector(".filter-menu.open");
      if (openMenu) {
        openFacet = null;
        openMenu.classList.remove("open", "opens-up");
        openMenu.style.removeProperty("--filter-menu-max-height");
        const trigger = openMenu.previousElementSibling;
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
      }
    }
  });

  window.addEventListener("portfolio:language", () => {
    update({ sync: false });
  });

  window.addEventListener("resize", scheduleFilterMenuPosition);
  window.addEventListener("scroll", scheduleFilterMenuPosition, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleFilterMenuPosition);
  window.visualViewport?.addEventListener("scroll", scheduleFilterMenuPosition);

  window.addEventListener("popstate", () => {
    const wasOpen = viewer.isOpen();
    readQuery();
    update({ sync: false, focusTarget: "[data-pagination-range]" });
    if (activeWorkId && directlyViewableWorks.some(work => work.id === activeWorkId)) openViewer(activeWorkId, null, false);
    else if (wasOpen) viewer.close({ notify: false });
  });

  readQuery();
  update();
  if (activeWorkId && directlyViewableWorks.some(work => work.id === activeWorkId)) openViewer(activeWorkId, null, false);
})();
