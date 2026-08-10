(() => {
  const P = window.Portfolio;
  const root = document.querySelector("[data-project-list]");
  const controlsRoot = document.querySelector("[data-display-controls]");
  const paginationRoot = document.querySelector("[data-pagination]");
  if (!root || !controlsRoot || !paginationRoot) return;

  const projects = window.PORTFOLIO_DATA.projects;
  const sizeValues = ["small", "medium", "large"];
  const perValues = [3, 6, 12];
  const display = { size: "medium", per: 6, page: 1 };
  const copy = {
    displaySize: ["Rozmiar okładek", "Cover size"], small: ["Małe", "Small"], medium: ["Średnie", "Medium"], large: ["Duże", "Large"],
    perPage: ["Projekty na stronie", "Projects per page"], pagination: ["Stronicowanie projektów", "Project pagination"],
    previous: ["Poprzednia", "Previous"], next: ["Następna", "Next"], page: ["Strona", "Page"]
  };
  const c = key => copy[key][P.state.lang === "pl" ? 0 : 1];

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

  function readQuery() {
    const params = new URLSearchParams(location.search);
    const querySize = params.get("size");
    const queryPer = Number.parseInt(params.get("per") || "", 10);
    display.size = params.has("size")
      ? allowed(querySize, sizeValues, "medium")
      : allowed(stored("portfolio:size"), sizeValues, "medium");
    display.per = params.has("per")
      ? allowed(queryPer, perValues, 6)
      : allowed(Number.parseInt(stored("portfolio:projects:per") || "", 10), perValues, 6);
    display.page = positivePage(params.get("page"));
  }

  function writeQuery(mode = "replace") {
    const params = new URLSearchParams(location.search);
    params.set("size", display.size);
    params.set("per", String(display.per));
    params.set("page", String(display.page));
    const query = params.toString();
    history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function renderControls() {
    const labels = { small: c("small"), medium: c("medium"), large: c("large") };
    controlsRoot.innerHTML = `
      <fieldset class="size-control">
        <legend>${c("displaySize")}</legend>
        <div class="size-options">${sizeValues.map(value => `<label><input type="radio" name="project-size" value="${value}" ${display.size === value ? "checked" : ""}><span>${labels[value]}</span></label>`).join("")}</div>
      </fieldset>
      <label class="per-control"><span>${c("perPage")}</span><select name="project-per">${perValues.map(value => `<option value="${value}" ${display.per === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>`;
  }

  function renderList() {
    const totalPages = Math.max(1, Math.ceil(projects.length / display.per));
    display.page = Math.min(display.page, totalPages);
    const start = (display.page - 1) * display.per;
    root.dataset.size = display.size;
    root.innerHTML = projects.slice(start, start + display.per).map((project, index) => {
      const work = window.PORTFOLIO_DATA.works.find(item => item.project === project.id) || { altPL: project.summaryPL, altEN: project.summaryEN, mediaType: "image" };
      const year = P.field(project, "year");
      return `<a class="project-row" href="${P.url(`projects/${project.id}/index.html`)}" data-od-id="project-row-${project.id}">
        <span class="project-number">${String(start + index + 1).padStart(2, "0")}</span>
        <div class="project-row-cover">${P.makeMedia(project.thumbnail || project.cover, work)}</div>
        <div class="project-row-title"><h2>${P.text(project)}</h2>${year ? `<span class="project-year">${year}</span>` : ""}</div>
        <div class="project-row-copy"><p>${P.field(project, "summary")}</p><div class="card-tags"><span class="tag">${P.field(project, "disciplines")}</span><span class="tag">${P.field(project, "format")}</span></div></div>
        <span class="project-arrow" aria-hidden="true">→</span>
      </a>`;
    }).join("");
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(projects.length / display.per));
    const start = projects.length ? (display.page - 1) * display.per + 1 : 0;
    const end = projects.length ? Math.min(display.page * display.per, projects.length) : 0;
    const range = P.state.lang === "pl" ? `Wyświetlono ${start}–${end} z ${projects.length} projektów` : `Showing ${start}–${end} of ${projects.length} projects`;
    paginationRoot.innerHTML = `<p class="pagination-range" data-pagination-range tabindex="-1" aria-live="polite">${range}</p>
      <nav class="pagination-nav" aria-label="${c("pagination")}">
        <button class="pagination-previous" type="button" data-page="${display.page - 1}" ${display.page <= 1 ? "disabled" : ""}>${c("previous")}</button>
        <div class="pagination-pages">${P.renderPaginationTokens(display.page, totalPages, c("page"))}</div>
        <button class="pagination-next" type="button" data-page="${display.page + 1}" ${display.page >= totalPages ? "disabled" : ""}>${c("next")}</button>
      </nav>`;
  }

  function updateModeLink() {
    document.querySelector("[data-works-mode-link]")?.setAttribute("href", `../portfolio/index.html?size=${display.size}`);
  }

  function restoreFocus(selector) {
    if (!selector) return;
    queueMicrotask(() => document.querySelector(selector)?.focus({ preventScroll: true }));
  }

  function render({ sync = true, historyMode = "replace", focusTarget = null } = {}) {
    renderControls();
    renderList();
    renderPagination();
    updateModeLink();
    if (sync) writeQuery(historyMode);
    restoreFocus(focusTarget);
  }

  controlsRoot.addEventListener("change", event => {
    if (event.target.name === "project-size") {
      display.size = allowed(event.target.value, sizeValues, "medium");
      persist("portfolio:size", display.size);
      render({ focusTarget: `input[name="project-size"][value="${display.size}"]` });
    }
    if (event.target.name === "project-per") {
      display.per = allowed(Number.parseInt(event.target.value, 10), perValues, 6);
      display.page = 1;
      persist("portfolio:projects:per", display.per);
      render({ focusTarget: "select[name=\"project-per\"]" });
    }
  });

  paginationRoot.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const targetPage = positivePage(button.dataset.page);
    if (targetPage === display.page) return;
    display.page = targetPage;
    render({ historyMode: "push", focusTarget: "[data-pagination-range]" });
  });

  window.addEventListener("portfolio:language", () => render({ sync: false }));
  window.addEventListener("popstate", () => { readQuery(); render({ sync: false, focusTarget: "[data-pagination-range]" }); });

  readQuery();
  render();
})();
