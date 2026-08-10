(() => {
  const P = window.Portfolio;
  const projectId = document.body.dataset.project;
  const project = P.projectById(projectId);
  if (!project) return;
  const allWorks = window.PORTFOLIO_DATA.works;
  const detailMedia = window.PORTFOLIO_DATA.detailMedia || [];
  const allDetailItems = [...allWorks, ...detailMedia];
  const memberWorks = allWorks.filter(item => (item.project === projectId || item.collections?.includes(projectId)) && !item.draft && item.projectPageVisible !== false);
  const projectWorks = project.detailSequenceIds
    ? project.detailSequenceIds.map(id => allDetailItems.find(item => item.id === id)).filter(Boolean)
    : memberWorks;

  function set(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value || ""; });
  }

  function setOptionalRow(selector, value) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = value || "";
      el.closest("div")?.toggleAttribute("hidden", !value);
    });
  }

  function sequenceUnits(items) {
    const units = [];
    for (let index = 0; index < items.length;) {
      const item = items[index];
      if (!item.projectGroup) {
        units.push({ type: "item", item, index });
        index += 1;
        continue;
      }
      const grouped = [];
      let cursor = index;
      while (cursor < items.length && items[cursor].projectGroup === item.projectGroup) {
        grouped.push({ item: items[cursor], index: cursor });
        cursor += 1;
      }
      units.push({ type: "group", id: item.projectGroup, label: P.field(item, "projectGroupLabel"), items: grouped });
      index = cursor;
    }
    return units;
  }

  function externalLinks(item) {
    if (!item.externalLinks?.length) return "";
    return `<div class="sequence-links">${item.externalLinks.map(link => {
      const label = P.state.lang === "pl" ? link.labelPL : link.labelEN;
      return `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }).join("")}</div>`;
  }

  function projectLinks() {
    if (!project.externalLinks?.length) return "";
    return project.externalLinks.map(link => {
      const label = P.state.lang === "pl" ? link.labelPL : link.labelEN;
      return `<a href="${P.esc(link.href)}" target="_blank" rel="noopener noreferrer">${P.esc(label)}</a>`;
    }).join("");
  }

  function renderScriptShowcase() {
    const root = document.querySelector("[data-project-script]");
    if (!root || !project.scriptRows?.length) return;
    const desktopColumns = 10;
    const title = P.field(project, "scriptTitle");
    const summary = P.field(project, "scriptSummary");
    const labelPrefix = P.state.lang === "pl" ? "Znak Pabaka dla" : "Pabaka glyph for";
    root.innerHTML = `<div class="pabaka-intro"><p class="section-code">PABAKA / LIVE TYPE</p><h2>${P.esc(title)}</h2><p class="lead">${P.esc(summary)}</p></div>
      <p class="pabaka-specimen" aria-label="${P.esc(labelPrefix)}: ${P.esc(project.scriptSpecimen)}"><span aria-hidden="true">${P.esc(project.scriptSpecimen)}</span></p>
      <div class="pabaka-grid">${project.scriptRows.map((row, rowIndex) => {
        const glyphCells = row.map(glyph => `<div class="pabaka-cell" aria-label="${P.esc(labelPrefix)} ${P.esc(glyph)}"><span class="pabaka-input">${P.esc(glyph)}</span><span class="pabaka-glyph" aria-hidden="true">${P.esc(glyph)}</span></div>`).join("");
        const emptyCells = Array.from({ length: Math.max(0, desktopColumns - row.length) }, () => `<div class="pabaka-cell is-empty" aria-hidden="true"></div>`).join("");
        return `<div class="pabaka-row" data-script-row="${rowIndex + 1}">${glyphCells}${emptyCells}</div>`;
      }).join("")}</div>`;
  }

  function renderSequence(items) {
    const sequenceLabel = P.state.lang === "pl" ? "SEKWENCJA" : "SEQUENCE";
    return sequenceUnits(items).map(unit => {
      if (unit.type === "item") {
        const number = String(unit.index + 1).padStart(2, "0");
        return `<figure class="sequence-item" data-od-id="sequence-${project.id}-${number}">
          <div class="sequence-media">${P.makeWorkMedia(unit.item, { eager: unit.index < 2, disclosureMode: "detail" })}</div>
          <figcaption class="sequence-caption">
            <p class="section-code">${number} / ${sequenceLabel}</p>
            <h3>${P.text(unit.item)}</h3>
            <p>${P.field(unit.item, "caption")}</p>
            ${externalLinks(unit.item)}
          </figcaption>
        </figure>`;
      }
      const first = unit.items[0].index + 1;
      const last = unit.items.at(-1).index + 1;
      return `<section class="sequence-group" data-project-group="${unit.id}" data-od-id="sequence-group-${unit.id}">
        <header class="sequence-group-heading"><p class="section-code">${String(first).padStart(2, "0")}–${String(last).padStart(2, "0")} / ${sequenceLabel}</p><h3>${unit.label}</h3></header>
        <div class="sequence-group-grid" data-group-count="${unit.items.length}">${unit.items.map(({ item, index }) => `
          <figure class="sequence-group-card" data-od-id="sequence-${project.id}-${String(index + 1).padStart(2, "0")}">
            ${P.makeWorkMedia(item, { eager: index < 2, disclosureMode: "detail" })}
            <figcaption><p class="section-code">${String(index + 1).padStart(2, "0")}</p><h4>${P.text(item)}</h4><p>${P.field(item, "caption")}</p>${externalLinks(item)}</figcaption>
          </figure>`).join("")}</div>
      </section>`;
    }).join("");
  }

  function render() {
    const firstWork = projectWorks[0] || { altPL: project.summaryPL, altEN: project.summaryEN, mediaType: "image" };
    set("[data-project-title]", P.text(project));
    set("[data-project-summary]", P.field(project, "summary"));
    set("[data-project-overview]", P.field(project, "overview"));
    setOptionalRow("[data-project-year]", P.field(project, "year"));
    setOptionalRow("[data-project-disciplines]", P.field(project, "disciplines"));
    setOptionalRow("[data-project-format]", P.field(project, "format"));
    setOptionalRow("[data-project-role]", P.field(project, "role"));
    setOptionalRow("[data-project-media]", P.field(project, "format"));
    set("[data-project-process]", P.field(project, "process"));
    set("[data-project-credits]", P.field(project, "credits"));
    set("[data-project-process-heading]", P.field(project, "processHeading"));

    const cover = document.querySelector("[data-project-cover]");
    if (cover) cover.innerHTML = P.makeMedia(project.hero || project.cover, firstWork, { eager: true, fetchPriority: "high", disclosureMode: "detail" });
    document.title = `${P.text(project)} — Wiktor Sielaszuk`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", P.field(project, "summary"));

    const sequence = document.querySelector("[data-curated-sequence]");
    if (sequence) {
      sequence.innerHTML = renderSequence(projectWorks);
    }

    const overview = document.querySelector("[data-project-overview]");
    const statement = P.field(project, "statement");
    document.querySelector("[data-project-statement]")?.remove();
    if (overview && statement) {
      const block = document.createElement("p");
      block.className = "project-statement";
      block.dataset.projectStatement = "";
      block.textContent = statement;
      overview.before(block);
    }

    const links = document.querySelector("[data-project-links]");
    if (links) {
      links.innerHTML = projectLinks();
      links.hidden = !project.externalLinks?.length;
    }
    renderScriptShowcase();

    const processSection = document.querySelector("[data-process-section]");
    if (processSection) processSection.hidden = !P.field(project, "process") && !P.field(project, "credits");

    const related = document.querySelector("[data-related-projects]");
    if (related) related.innerHTML = (project.related || []).map((id, index) => {
      const item = P.projectById(id);
      const relatedWorks = allWorks.filter(entry => (entry.project === id || entry.collections?.includes(id)) && !entry.draft);
      const relatedWork = relatedWorks[0] || { altPL: item.summaryPL, altEN: item.summaryEN, mediaType: "image" };
      return `<article class="work-card" data-od-id="related-${id}"><a class="work-link" href="${P.url(`projects/${id}/index.html`)}">${P.makeMedia(item.thumbnail || item.cover, relatedWork)}<div class="work-title"><h3>${P.text(item)}</h3><span class="work-index">0${index + 1}</span></div></a></article>`;
    }).join("");
  }

  window.addEventListener("portfolio:language", render);
  render();
})();
