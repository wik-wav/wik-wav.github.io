(() => {
  const { works } = window.PORTFOLIO_DATA;
  const P = window.Portfolio;
  const root = document.querySelector("[data-featured-work]");
  if (!root) return;

  function render() {
    const featured = works.filter(item => item.featured && !item.draft && item.galleryVisible !== false).slice(0, 4);
    root.innerHTML = featured.map((item, index) => `
      <article class="work-card ${index === 0 || index === 3 ? "wide" : "narrow"}" data-od-id="featured-${item.id}">
        <a class="work-link" href="${P.url(`portfolio/index.html?work=${encodeURIComponent(item.id)}`)}">
          ${P.makeMedia(item.cover, item, { eager: index === 0 })}
          <div class="work-title"><h3>${P.text(item)}</h3><span class="work-index">0${index + 1}</span></div>
          <div class="card-tags"><span class="tag">${P.projectName(item.project)}</span><span class="tag">${P.labelFor("year", item.year)}</span></div>
        </a>
      </article>`).join("");
  }
  window.addEventListener("portfolio:language", render);
  render();
})();
