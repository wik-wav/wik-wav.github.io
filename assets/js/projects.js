(() => {
  const P = window.Portfolio;
  const root = document.querySelector("[data-project-list]");
  const controlsRoot = document.querySelector("[data-display-controls]");
  const paginationRoot = document.querySelector("[data-pagination]");
  if (!root || !controlsRoot || !paginationRoot) return;

  const projects = window.PORTFOLIO_DATA.projects;
  const works = window.PORTFOLIO_DATA.works;
  const detailMedia = window.PORTFOLIO_DATA.detailMedia || [];
  const viewValues = ["visual", "list"];
  const sizeValues = ["small", "medium", "large"];
  const perValues = [3, 6, 12];
  const display = { view: "visual", size: "medium", per: 6, page: 1 };
  let expandedProjectId = null;
  const viewer = window.PortfolioViewer.create();
  const copy = {
    displayView: ["Widok projektów", "Project view"], visual: ["Wizualny", "Visual"], list: ["Lista", "List"],
    displaySize: ["Rozmiar okładek", "Cover size"], small: ["Małe", "Small"], medium: ["Średnie", "Medium"], large: ["Duże", "Large"],
    perPage: ["Projekty na stronie", "Projects per page"], pagination: ["Stronicowanie projektów", "Project pagination"],
    previous: ["Poprzednia", "Previous"], next: ["Następna", "Next"], page: ["Strona", "Page"],
    showImages: ["Pokaż obrazy", "Show images"], hideImages: ["Ukryj obrazy", "Hide images"],
    images: ["Obrazy projektu", "Project images"], enlarge: ["Powiększ", "Enlarge"], openProject: ["Otwórz projekt", "Open project"]
  };
  const c = key => copy[key][P.state.lang === "pl" ? 0 : 1];

  function projectMedia(project) {
    const allItems = [...works, ...detailMedia];
    const members = works.filter(item =>
      (item.project === project.id || item.collections?.includes(project.id)) &&
      !item.draft && item.projectPageVisible !== false
    );
    const sequence = project.detailSequenceIds
      ? project.detailSequenceIds.map(id => allItems.find(item => item.id === id)).filter(Boolean)
      : members;
    return sequence.filter(item => !item.draft && item.projectPageVisible !== false);
  }

  const mediaByProject = new Map(projects.map(project => [project.id, projectMedia(project)]));
  const imagesByProject = new Map(projects.map(project => [
    project.id,
    mediaByProject.get(project.id).filter(item => item.mediaType !== "video")
  ]));

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
    display.view = params.has("view")
      ? allowed(params.get("view"), viewValues, "visual")
      : allowed(stored("portfolio:projects:view"), viewValues, "visual");
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
    params.set("view", display.view);
    params.set("size", display.size);
    params.set("per", String(display.per));
    params.set("page", String(display.page));
    const query = params.toString();
    history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function renderControls() {
    const viewLabels = { visual: c("visual"), list: c("list") };
    const labels = { small: c("small"), medium: c("medium"), large: c("large") };
    controlsRoot.innerHTML = `
      <fieldset class="size-control view-control">
        <legend>${c("displayView")}</legend>
        <div class="size-options view-options">${viewValues.map(value => `<label><input type="radio" name="project-view" value="${value}" ${display.view === value ? "checked" : ""}><span>${viewLabels[value]}</span></label>`).join("")}</div>
      </fieldset>
      ${display.view === "visual" ? `<fieldset class="size-control">
        <legend>${c("displaySize")}</legend>
        <div class="size-options">${sizeValues.map(value => `<label><input type="radio" name="project-size" value="${value}" ${display.size === value ? "checked" : ""}><span>${labels[value]}</span></label>`).join("")}</div>
      </fieldset>` : ""}
      <label class="per-control"><span>${c("perPage")}</span><select name="project-per">${perValues.map(value => `<option value="${value}" ${display.per === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>`;
  }

  function renderList() {
    const totalPages = Math.max(1, Math.ceil(projects.length / display.per));
    display.page = Math.min(display.page, totalPages);
    const start = (display.page - 1) * display.per;
    root.dataset.size = display.size;
    root.dataset.view = display.view;
    const pageProjects = projects.slice(start, start + display.per);
    if (display.view === "list") {
      root.innerHTML = `<ul class="project-name-list">${pageProjects.map(project => `<li><a class="project-name-link" href="${P.esc(P.projectHref(project.id))}">${P.esc(P.text(project))}</a></li>`).join("")}</ul>`;
      return;
    }
    root.innerHTML = pageProjects.map((project, index) => {
      const projectWorks = mediaByProject.get(project.id) || [];
      const work = projectWorks[0] || { altPL: project.summaryPL, altEN: project.summaryEN, mediaType: "image" };
      const mediaBadge = P.preferredMediaBadge(projectWorks);
      const mediaLabel = mediaBadge ? P.t(`media.${mediaBadge}`) : "";
      const projectImages = imagesByProject.get(project.id) || [];
      const expanded = expandedProjectId === project.id;
      const year = P.field(project, "year");
      const href = P.projectHref(project.id);
      const title = P.text(project);
      const galleryId = `project-gallery-${project.id}`;
      const toggleId = `project-gallery-toggle-${project.id}`;
      const gallery = expanded ? `<section class="project-inline-gallery" id="${galleryId}" aria-labelledby="project-gallery-heading-${project.id}">
        <header class="project-inline-heading"><h3 id="project-gallery-heading-${project.id}">${c("images")}: ${P.esc(title)}</h3><span class="section-code">${String(projectImages.length).padStart(2, "0")}</span></header>
        <div class="project-inline-grid">${projectImages.map(item => `<figure class="project-inline-card">
          <button class="project-inline-image" type="button" data-project-gallery-project="${P.esc(project.id)}" data-project-gallery-item="${P.esc(item.id)}" data-open-sequence="${P.esc(`${project.id}--${item.id}`)}" aria-label="${P.esc(`${c("enlarge")}: ${P.text(item)}`)}">${P.makeWorkMedia(item, { hideDisclosure: true })}</button>
          <figcaption>${P.esc(P.text(item))}${P.mediaDisclosure(item.cover, { disclosureMode: "detail" })}</figcaption>
        </figure>`).join("")}</div>
      </section>` : `<section class="project-inline-gallery" id="${galleryId}" hidden></section>`;
      return `<article class="project-entry" data-od-id="project-row-${project.id}">
        <div class="project-row">
          <span class="project-number">${String(start + index + 1).padStart(2, "0")}</span>
          <a class="project-row-cover" href="${P.esc(href)}" aria-label="${P.esc([`${c("openProject")}: ${title}`, mediaLabel].filter(Boolean).join(" — "))}">${P.makeMedia(project.thumbnail || project.cover, work, { mediaBadge })}</a>
          <div class="project-row-title"><h2><a href="${P.esc(href)}">${P.esc(title)}</a></h2>${year ? `<span class="project-year">${P.esc(year)}</span>` : ""}</div>
          <div class="project-row-copy"><p>${P.esc(P.field(project, "summary"))}</p>
            <div class="project-row-actions"><a class="project-open-link" href="${P.esc(href)}">${c("openProject")} <span aria-hidden="true">↗</span></a>${projectImages.length ? `<button class="project-gallery-toggle" type="button" id="${toggleId}" data-toggle-project-gallery="${P.esc(project.id)}" aria-expanded="${expanded}" aria-controls="${galleryId}">${expanded ? c("hideImages") : c("showImages")} (${projectImages.length})</button>` : ""}</div>
            <div class="card-tags"><span class="tag">${P.esc(P.field(project, "disciplines"))}</span><span class="tag">${P.esc(P.field(project, "format"))}</span></div>
          </div>
          <a class="project-arrow" href="${P.esc(href)}" aria-label="${P.esc(`${c("openProject")}: ${title}`)}"><span aria-hidden="true">→</span></a>
        </div>
        ${gallery}
      </article>`;
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

  root.addEventListener("click", event => {
    const toggle = event.target.closest("[data-toggle-project-gallery]");
    if (toggle) {
      const projectId = toggle.dataset.toggleProjectGallery;
      expandedProjectId = expandedProjectId === projectId ? null : projectId;
      renderList();
      restoreFocus(`#project-gallery-toggle-${projectId}`);
      return;
    }
    const opener = event.target.closest("[data-project-gallery-item]");
    if (!opener) return;
    const projectItems = imagesByProject.get(opener.dataset.projectGalleryProject) || [];
    viewer.open({ items: projectItems, id: opener.dataset.projectGalleryItem, opener });
  });

  controlsRoot.addEventListener("change", event => {
    if (event.target.name === "project-view") {
      display.view = allowed(event.target.value, viewValues, "visual");
      expandedProjectId = null;
      persist("portfolio:projects:view", display.view);
      render({ focusTarget: `input[name="project-view"][value="${display.view}"]` });
    }
    if (event.target.name === "project-size") {
      display.size = allowed(event.target.value, sizeValues, "medium");
      persist("portfolio:size", display.size);
      render({ focusTarget: `input[name="project-size"][value="${display.size}"]` });
    }
    if (event.target.name === "project-per") {
      display.per = allowed(Number.parseInt(event.target.value, 10), perValues, 6);
      display.page = 1;
      expandedProjectId = null;
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
    expandedProjectId = null;
    render({ historyMode: "push", focusTarget: "[data-pagination-range]" });
  });

  window.addEventListener("portfolio:language", () => render({ sync: false }));
  window.addEventListener("popstate", () => { expandedProjectId = null; readQuery(); render({ sync: false, focusTarget: "[data-pagination-range]" }); });

  readQuery();
  render();
})();
