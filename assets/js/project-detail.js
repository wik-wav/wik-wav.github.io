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
  const imageSequence = projectWorks.filter(item => item.mediaType !== "video");
  const detailMediaSizes = ["compact", "standard", "large", "full"];
  const detailHeightLimits = { compact: 70, standard: 76, large: 82, full: 86 };
  const viewer = window.PortfolioViewer.create();

  function detailMediaSize(item) {
    if (detailMediaSizes.includes(item?.detailMediaSize)) return item.detailMediaSize;
    return detailMediaSizes.includes(project.detailMediaSize) ? project.detailMediaSize : "standard";
  }

  function mediaAspect(media) {
    const key = String(media?.src || "").replace(/^\.\//, "").replace(/^\//, "");
    const dimensions = window.MEDIA_DIMENSIONS?.[key];
    if (dimensions?.width && dimensions?.height) return dimensions.width / dimensions.height;
    const [width, height] = String(media?.ratio || "4/3").split("/").map(Number);
    return width > 0 && height > 0 ? width / height : 4 / 3;
  }

  function sequenceMedia(item, index) {
    if (item.mediaType === "video") return P.makeWorkMedia(item, { eager: index < 2, disclosureMode: "detail" });
    const size = detailMediaSize(item);
    const aspect = mediaAspect(item.cover);
    const widthFromHeight = `${(detailHeightLimits[size] * aspect).toFixed(3)}svh`;
    const label = P.state.lang === "pl" ? `Powiększ: ${P.text(item)}` : `Enlarge: ${P.text(item)}`;
    return `<div class="sequence-media-natural detail-media-size-${size}" data-detail-media-size="${size}" style="--detail-aspect:${aspect.toFixed(6)};--detail-width-from-height:${widthFromHeight}">
      <button class="sequence-media-button" type="button" data-open-sequence="${P.esc(item.id)}" aria-label="${P.esc(label)}">
        ${P.makeWorkMedia(item, { eager: index < 2, hideDisclosure: true, disclosureMode: "detail" })}
      </button>
      ${P.mediaDisclosure(item.cover, { disclosureMode: "detail" })}
    </div>`;
  }

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
      return `<a href="${P.esc(link.href)}" target="_blank" rel="noopener noreferrer">${P.esc(label)}</a>`;
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
        return `<figure class="sequence-item" data-od-id="sequence-${P.esc(project.id)}-${number}">
          <div class="sequence-media">${sequenceMedia(unit.item, unit.index)}</div>
          <figcaption class="sequence-caption">
            <p class="section-code">${number} / ${P.esc(sequenceLabel)}</p>
            <h3>${P.esc(P.text(unit.item))}</h3>
            <p>${P.esc(P.field(unit.item, "caption"))}</p>
            ${externalLinks(unit.item)}
          </figcaption>
        </figure>`;
      }
      const first = unit.items[0].index + 1;
      const last = unit.items.at(-1).index + 1;
      return `<section class="sequence-group" data-project-group="${P.esc(unit.id)}" data-od-id="sequence-group-${P.esc(unit.id)}">
        <header class="sequence-group-heading"><p class="section-code">${String(first).padStart(2, "0")}–${String(last).padStart(2, "0")} / ${P.esc(sequenceLabel)}</p><h3>${P.esc(unit.label)}</h3></header>
        <div class="sequence-group-grid" data-group-count="${unit.items.length}">${unit.items.map(({ item, index }) => `
          <figure class="sequence-group-card" data-od-id="sequence-${P.esc(project.id)}-${String(index + 1).padStart(2, "0")}">
            ${sequenceMedia(item, index)}
            <figcaption><p class="section-code">${String(index + 1).padStart(2, "0")}</p><h4>${P.esc(P.text(item))}</h4><p>${P.esc(P.field(item, "caption"))}</p>${externalLinks(item)}</figcaption>
          </figure>`).join("")}</div>
      </section>`;
    }).join("");
  }

  function render() {
    const firstWork = projectWorks[0] || { altPL: project.summaryPL, altEN: project.summaryEN, mediaType: "image" };
    set("[data-project-title]", P.text(project));
    set("[data-project-summary]", P.field(project, "summary"));
    set("[data-project-overview]", P.field(project, "overview"));
    const editorial = document.querySelector("[data-project-editorial]");
    if (editorial) {
      const editorialCopy = P.field(project, "editorial");
      editorial.textContent = editorialCopy;
      editorial.hidden = !editorialCopy;
    }
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
    if (related) {
      const section = related.closest(".section");
      const heading = related.previousElementSibling;
      section?.classList.add("related-projects-section");
      if (heading?.classList.contains("section-code")) {
        heading.classList.add("related-section-heading");
        heading.id ||= `${project.id}-related-heading`;
        heading.setAttribute("role", "heading");
        heading.setAttribute("aria-level", "2");
        related.setAttribute("aria-labelledby", heading.id);
      }

      const projectLabel = P.state.lang === "pl" ? "PROJEKT" : "PROJECT";
      const openLabel = P.state.lang === "pl" ? "Zobacz projekt" : "View project";
      related.innerHTML = (project.related || []).map((id, index) => {
        const item = P.projectById(id);
        const href = P.projectHref(id);
        if (!item || !href) return "";
        const relatedWorks = item.detailSequenceIds
          ? item.detailSequenceIds.map(workId => allDetailItems.find(entry => entry.id === workId)).filter(Boolean)
          : allDetailItems.filter(entry => (entry.project === id || entry.collections?.includes(id)) && !entry.draft);
        const relatedWork = relatedWorks[0] || { altPL: item.summaryPL, altEN: item.summaryEN, mediaType: "image" };
        const mediaBadge = P.preferredMediaBadge(relatedWorks);
        return `<article class="related-card" data-od-id="related-${P.esc(id)}">
          <a class="related-card-link" href="${P.esc(href)}">
            <div class="related-card-media">${P.makeMedia(item.thumbnail || item.cover, relatedWork, { mediaBadge })}</div>
            <div class="related-card-copy">
              <p class="related-card-meta"><span>${String(index + 1).padStart(2, "0")}</span><span>${projectLabel}</span></p>
              <h3>${P.esc(P.text(item))}</h3>
              <span class="related-card-action">${openLabel} <span aria-hidden="true">→</span></span>
            </div>
          </a>
        </article>`;
      }).join("");
    }
  }

  window.addEventListener("portfolio:language", render);
  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-sequence]");
    if (!opener) return;
    viewer.open({ items: imageSequence, id: opener.dataset.openSequence, opener });
  });
  render();
})();
