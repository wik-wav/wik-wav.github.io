(() => {
  const token = document.querySelector('meta[name="studio-token"]').content;
  const previewOrigin = document.querySelector('meta[name="preview-origin"]').content;
  const state = {
    bootstrap: null, type: null, id: null, record: null, revision: null,
    mediaKey: "cover", mediaItemIndex: 0, mediaUploadMode: "replace", updateBlockIndex: 0,
    dirty: false, createType: null, archiveTarget: null, typographyTarget: null,
    orderBusy: false, draggedContainer: null,
    managerOpen: false, managerType: "containers", managerReturnFocus: null,
    managerViews: {
      containers: { query:"", status:"all", scope:"all", sort:"order", page:1, per:25 },
      updates: { query:"", status:"all", scope:"all", sort:"newest", page:1, per:25 },
      works: { query:"", status:"all", scope:"all", sort:"order", page:1, per:25 }
    }
  };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);

  async function api(path, options = {}) {
    const mutation = options.method && options.method !== "GET";
    const binary = options.body instanceof Blob;
    const headers = Object.assign({}, binary ? {} : options.body ? { "Content-Type": "application/json" } : {}, mutation ? { "X-Studio-Token": token } : {}, options.headers || {});
    const response = await fetch(path, Object.assign({}, options, { headers, body: binary ? options.body : options.body ? JSON.stringify(options.body) : undefined }));
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    if (!response.ok) {
      const error = new Error(payload.error || "Request failed (" + response.status + ").");
      Object.assign(error, payload, { status: response.status });
      throw error;
    }
    return payload;
  }

  function field(name, label, value, options = {}) {
    let control;
    const typographyEnabled = !options.readonly && !options.options && (!options.type || options.type === "text") && /(?:PL|EN|\.pl|\.en)$/.test(name) && !/(?:^seo\.|imageAlt|^media\.alt)/i.test(name);
    const typographyAttribute = typographyEnabled ? " data-typography-input" : "";
    const multilineTitle = !options.readonly && !options.options && (!options.type || options.type === "text") && (options.title === true || /\b(?:title|headline|heading)\b/i.test(label));
    if (options.options) {
      control = '<select name="' + esc(name) + '"' + (options.required ? " required" : "") + '>' + options.options.map(pair => '<option value="' + esc(pair[0]) + '"' + (String(value == null ? "" : value) === String(pair[0]) ? " selected" : "") + ">" + esc(pair[1]) + "</option>").join("") + "</select>";
    } else if (options.area || multilineTitle) {
      control = '<textarea name="' + esc(name) + '" rows="' + (multilineTitle ? "1" : "3") + '" data-auto-grow' + (multilineTitle ? " data-title-field" : "") + typographyAttribute + (options.required ? " required" : "") + '>' + esc(value) + "</textarea>";
    } else {
      control = '<input name="' + esc(name) + '" type="' + esc(options.type || "text") + '" value="' + esc(value) + '"' + (options.min != null ? ' min="' + esc(options.min) + '"' : "") + (options.max != null ? ' max="' + esc(options.max) + '"' : "") + (options.step != null ? ' step="' + esc(options.step) + '"' : "") + (options.readonly ? " readonly" : "") + typographyAttribute + '>';
    }
    return '<label class="field' + (options.wide ? " wide" : "") + '"><span>' + esc(label) + "</span>" + control + "</label>";
  }
  function pair(name, label, record, options) {
    const key = name.split(".").pop();
    return field(name + "PL", label + " · PL", record[key + "PL"], options) + field(name + "EN", label + " · EN", record[key + "EN"], options);
  }
  function autoGrowTextarea(textarea) {
    if (!textarea?.matches?.("textarea[data-auto-grow]")) return;
    const minimum = Number.parseFloat(getComputedStyle(textarea).minHeight) || 0;
    textarea.style.height = "auto";
    textarea.style.height = Math.max(minimum, textarea.scrollHeight + 2) + "px";
  }
  function autoGrowTextareas(root = document) {
    root.querySelectorAll?.("textarea[data-auto-grow]").forEach(autoGrowTextarea);
  }
  function checkbox(name, label, checked) {
    return '<label class="checkbox"><input type="checkbox" name="' + esc(name) + '"' + (checked ? " checked" : "") + "><span>" + esc(label) + "</span></label>";
  }
  const titleOf = item => item.titlePL || item.titleEN || item.id;
  const searchText = value => String(value || "").replace(/[\u00a0\u2060]/g," ").toLowerCase();
  const allContainers = () => state.bootstrap.summaries.projects.concat(state.bootstrap.summaries.collections);
  const SIDEBAR_PROJECT_LIMIT = 5;
  const SIDEBAR_UPDATE_LIMIT = 5;
  const SIDEBAR_WORK_LIMIT = 5;
  const MANAGER_PER_VALUES = [25, 50, 100];
  const stored = (key, fallback = null) => { try { const value = localStorage.getItem(key); return value == null ? fallback : value; } catch { return fallback; } };
  const store = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const statusOf = item => item.draft ? "draft" : item.published ? "published" : "private";
  const selectedFirst = (items, limit, predicate) => {
    const visible = items.slice(0, limit);
    const selected = items.find(predicate);
    if (selected && !visible.includes(selected)) return [selected, ...visible.slice(0, Math.max(0, limit - 1))];
    return visible;
  };
  function restoreManagerPreferences() {
    try {
      const saved = JSON.parse(stored("portfolio:studio:manager", "{}"));
      if (["containers","updates","works"].includes(saved.type)) state.managerType = saved.type;
      for (const type of ["containers","updates","works"]) {
        const value = saved.views?.[type];
        if (!value || typeof value !== "object") continue;
        const target = state.managerViews[type];
        if (typeof value.query === "string") target.query = value.query.slice(0,200);
        for (const key of ["status","scope","sort"]) if (typeof value[key] === "string") target[key] = value[key];
        if (MANAGER_PER_VALUES.includes(Number(value.per))) target.per = Number(value.per);
        if (Number.isInteger(Number(value.page)) && Number(value.page) > 0) target.page = Number(value.page);
      }
    } catch {}
  }
  function persistManagerPreferences() {
    store("portfolio:studio:manager",JSON.stringify({ type:state.managerType, views:state.managerViews }));
  }

  function previewPath(type, record) {
    if (type === "site") return "/";
    if (type === "work") return "/studio-preview/portfolio/index.html?work=" + encodeURIComponent(record.id);
    if (type === "update") return "/studio-preview/activity/index.html#" + encodeURIComponent(record.id);
    return "/studio-preview/projects/" + encodeURIComponent(record.id) + "/index.html";
  }
  function setPreview(type, record) {
    const url = previewOrigin + previewPath(type, record);
    const preview = $("[data-preview]");
    preview.onload = previewHeadingSpacing;
    preview.src = url;
    $("[data-preview-open]").href = url;
    $("[data-preview-title]").textContent = type === "site" ? "Profile" : titleOf(record);
  }

  function previewHeadingSpacing() {
    if (!['project', 'collection'].includes(state.type)) return;
    const form = $("[data-editor]");
    const value = name => Math.min(1.4, Math.max(0.8, Number(form.elements.namedItem(name)?.value) || 1.12));
    $("[data-preview]").contentWindow?.postMessage({
      type: "portfolio-preview-heading-spacing",
      pl: value("heroLineHeightPL"),
      en: value("heroLineHeightEN")
    }, previewOrigin);
  }

  function renderLibrary() {
    const query = searchText($("[data-work-search]").value.trim());
    const containersForList = allContainers().slice().sort((a, b) => Number(a.order) - Number(b.order) || a.id.localeCompare(b.id));
    $("[data-project-count]").textContent = String(containersForList.length);
    $("[data-show-more='containers']").hidden = containersForList.length <= SIDEBAR_PROJECT_LIMIT;
    const quickContainers = selectedFirst(containersForList, SIDEBAR_PROJECT_LIMIT, item => state.type === item.recordType && state.id === item.id);
    $('[data-list="projects"]').innerHTML = quickContainers.map(item => {
      const selected = state.type === item.recordType && state.id === item.id;
      const label = item.recordType === "collection" ? "COLLECTION" : "PROJECT";
      return '<li><button type="button" class="library-item" data-open="' + esc(item.recordType) + '" data-id="' + esc(item.id) + '" aria-current="' + selected + '"><strong>' + esc(titleOf(item)) + '</strong><small>' + label + ' · ' + esc(item.id) + (item.draft ? ' · DRAFT' : '') + '</small></button></li>';
    }).join("");

    const updates = (state.bootstrap.summaries.updates || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || Number(a.order) - Number(b.order) || a.id.localeCompare(b.id));
    $("[data-update-count]").textContent = String(updates.length);
    $("[data-show-more='updates']").hidden = updates.length <= SIDEBAR_UPDATE_LIMIT;
    const quickUpdates = selectedFirst(updates, SIDEBAR_UPDATE_LIMIT, item => state.type === "update" && state.id === item.id);
    $('[data-list="updates"]').innerHTML = quickUpdates.length ? quickUpdates.map(item => {
      const selected = state.type === "update" && state.id === item.id;
      const badges = [item.draft ? "DRAFT" : "", !item.published && !item.draft ? "PRIVATE" : ""].filter(Boolean);
      return '<li><button type="button" class="library-item" data-open="update" data-id="' + esc(item.id) + '" aria-current="' + selected + '"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.date || "No date") + (badges.length ? " · " + esc(badges.join(" · ")) : "") + '</small></button></li>';
    }).join("") : '<li class="library-empty">No activity updates yet.</li>';

    const allWorks = state.bootstrap.summaries.works;
    const containers = new Map(allContainers().map(item => [item.id, item]));
    const matchingWorks = allWorks.filter(item => {
      const owner = containers.get(item.project);
      return !query || searchText([titleOf(item), item.id, owner ? titleOf(owner) : item.project].join(" ")).includes(query);
    });
    $("[data-work-count]").textContent = matchingWorks.length === allWorks.length ? String(allWorks.length) : matchingWorks.length + " / " + allWorks.length;
    $("[data-show-more='works']").hidden = matchingWorks.length <= SIDEBAR_WORK_LIMIT;
    const works = selectedFirst(matchingWorks, SIDEBAR_WORK_LIMIT, item => state.type === "work" && state.id === item.id);
    $('[data-list="works"]').innerHTML = works.map(item => {
      const selected = state.type === "work" && state.id === item.id;
      const sourceIndex = allWorks.findIndex(work => work.id === item.id);
      const owner = containers.get(item.project);
      const preview = item.coverPreview;
      const fit = preview && preview.fit === "cover" ? "cover" : "contain";
      const rawX = Number(preview?.focalPoint?.x);
      const rawY = Number(preview?.focalPoint?.y);
      const x = Math.min(1, Math.max(0, Number.isFinite(rawX) ? rawX : 0.5));
      const y = Math.min(1, Math.max(0, Number.isFinite(rawY) ? rawY : 0.5));
      const thumb = preview
        ? '<span class="work-browser-thumb' + (preview.viewerBackground === "dark" ? " dark" : "") + '" style="--thumb-fit:' + fit + ";--thumb-position:" + x * 100 + "% " + y * 100 + '%"><img src="' + esc(previewOrigin + "/" + preview.src) + '" alt="" loading="lazy" decoding="async"></span>'
        : '<span class="work-browser-thumb work-browser-placeholder" aria-hidden="true">NO IMAGE</span>';
      const mediaBadge = item.mediaType === "video" ? (["soundcloud", "bandcamp"].includes(item.videoProvider) ? "AUDIO" : "VIDEO") : "";
      const badges = [item.draft ? "DRAFT" : "", !item.published && !item.draft ? "PRIVATE" : "", item.galleryVisible === false ? "HIDDEN" : "", item.detailOnly ? "DETAIL" : "", mediaBadge].filter(Boolean);
      const editLabel = ["Edit " + titleOf(item), mediaBadge].filter(Boolean).join(" — ");
      return '<li class="work-browser-card"><button type="button" class="library-item work-browser-item" data-open="work" data-id="' + esc(item.id) + '" aria-current="' + selected + '" aria-label="' + esc(editLabel) + '">' + thumb + (badges.length ? '<span class="work-browser-badges" aria-hidden="true">' + badges.map(label => '<span>' + label + '</span>').join("") + '</span>' : "") + '<span class="work-browser-copy"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(owner ? titleOf(owner) : item.project || "Unassigned") + '</small></span></button><span class="order-buttons"><button type="button" data-move="up" data-type="work" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' up"' + (sourceIndex === 0 ? " disabled" : "") + '>↑</button><button type="button" data-move="down" data-type="work" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' down"' + (sourceIndex === allWorks.length - 1 ? " disabled" : "") + '>↓</button></span></li>';
    }).join("");

    const archived = state.bootstrap.archives?.works || [];
    $("[data-archive-count]").textContent = String(archived.length);
    $("[data-archived-works]").hidden = archived.length === 0;
    $("[data-show-more='archives']").hidden = archived.length <= 5;
    $('[data-list="archived-works"]').innerHTML = archived.slice(0, 5).map(item => {
      const date = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : "Date unavailable";
      return '<li><span class="archived-work-copy"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.id) + " · " + esc(date) + (item.published ? " · PUBLISHED ID RESERVED" : "") + '</small></span><button type="button" class="archive-delete-trigger" data-delete-archive="' + esc(item.id) + '" data-revision="' + esc(item.revision) + '" aria-label="Permanently delete archived record ' + esc(titleOf(item)) + '">Delete…</button></li>';
    }).join("");
    renderManager();
  }

  function managerView() {
    return state.managerViews[state.managerType];
  }
  function managerSource(type = state.managerType) {
    if (type === "containers") return allContainers().slice();
    if (type === "updates") return (state.bootstrap.summaries.updates || []).slice();
    return state.bootstrap.summaries.works.slice();
  }
  function managerStatusOptions() {
    return [["all","All statuses"],["published","Published"],["draft","Drafts"],["private","Private"]].concat(state.managerType === "works" ? [["archived","Archived"]] : []);
  }
  function managerScopeOptions() {
    if (state.managerType === "containers") return [["all","Projects + collections"],["project","Projects only"],["collection","Collections only"]];
    if (state.managerType === "updates") {
      const tags = Array.from(new Set((state.bootstrap.summaries.updates || []).flatMap(item => item.types || []))).sort((a,b) => a.localeCompare(b,"en"));
      return [["all","All update types"], ...tags.map(tag => [tag,tag])];
    }
    const containers = allContainers().slice().sort((a,b) => titleOf(a).localeCompare(titleOf(b),"pl"));
    return [["all","All projects"],["unassigned","Unassigned"], ...containers.map(item => [item.id,titleOf(item)])];
  }
  function managerSortOptions() {
    if (state.managerType === "containers") return [["order","Manual order"],["title","Title A–Z"],["status","Status"]];
    if (state.managerType === "updates") return [["newest","Newest first"],["oldest","Oldest first"],["title","Title A–Z"]];
    return [["order","Manual order"],["title","Title A–Z"],["project","Project"],["status","Status"]];
  }
  function managerCanReorder() {
    const view = managerView();
    return view.sort === "order" && view.status === "all" && view.scope === "all" && !view.query.trim();
  }
  function setSelectOptions(select, options, selected) {
    select.innerHTML = options.map(([value,label]) => '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>').join("");
    if (![...select.options].some(option => option.value === selected)) select.value = options[0]?.[0] || "";
  }
  function paginationTokens(current, total) {
    if (total <= 7) return Array.from({length:total},(_,index) => index + 1);
    const tokens = [1];
    const start = Math.max(2,current - 1);
    const end = Math.min(total - 1,current + 1);
    if (start > 2) tokens.push("gap-left");
    for (let page=start; page<=end; page += 1) tokens.push(page);
    if (end < total - 1) tokens.push("gap-right");
    tokens.push(total);
    return tokens;
  }
  function managerFilteredItems() {
    const view = managerView();
    if (state.managerType === "works" && view.status === "archived") {
      return (state.bootstrap.archives?.works || []).filter(item => !view.query || searchText([titleOf(item),item.id].join(" ")).includes(searchText(view.query)));
    }
    const containers = new Map(allContainers().map(item => [item.id,item]));
    const query = searchText(view.query);
    const items = managerSource().filter(item => {
      const owner = containers.get(item.project);
      const haystack = searchText([titleOf(item),item.id,item.project,owner && titleOf(owner),(item.types || []).join(" ")].filter(Boolean).join(" "));
      if (query && !haystack.includes(query)) return false;
      if (view.status !== "all" && statusOf(item) !== view.status) return false;
      if (view.scope !== "all") {
        if (state.managerType === "containers" && item.recordType !== view.scope) return false;
        if (state.managerType === "updates" && !(item.types || []).includes(view.scope)) return false;
        if (state.managerType === "works" && (view.scope === "unassigned" ? Boolean(item.project) : item.project !== view.scope)) return false;
      }
      return true;
    });
    const byTitle = (a,b) => titleOf(a).localeCompare(titleOf(b),"pl",{sensitivity:"base"}) || a.id.localeCompare(b.id);
    const byOrder = (a,b) => Number(a.order) - Number(b.order) || a.id.localeCompare(b.id);
    if (view.sort === "title") items.sort(byTitle);
    else if (view.sort === "status") items.sort((a,b) => statusOf(a).localeCompare(statusOf(b)) || byTitle(a,b));
    else if (view.sort === "project") items.sort((a,b) => titleOf(containers.get(a.project) || {titlePL:a.project}).localeCompare(titleOf(containers.get(b.project) || {titlePL:b.project}),"pl") || byTitle(a,b));
    else if (view.sort === "newest") items.sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")) || byOrder(a,b));
    else if (view.sort === "oldest") items.sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")) || byOrder(a,b));
    else items.sort(byOrder);
    return items;
  }
  function managerStatusBadge(item) {
    const status = statusOf(item);
    return '<span class="manager-status is-' + status + '">' + status.toUpperCase() + '</span>';
  }
  function managerThumbnail(item) {
    const preview = item.coverPreview;
    if (!preview) return '<span class="manager-thumb manager-thumb-empty" aria-hidden="true">—</span>';
    const fit = preview.fit === "cover" ? "cover" : "contain";
    const x = clamp(Number(preview.focalPoint?.x) || .5,0,1) * 100;
    const y = clamp(Number(preview.focalPoint?.y) || .5,0,1) * 100;
    return '<span class="manager-thumb' + (preview.viewerBackground === "dark" ? ' dark' : '') + '" style="--thumb-fit:' + fit + ';--thumb-position:' + x + '% ' + y + '%"><img src="' + esc(previewOrigin + '/' + preview.src) + '" alt="" loading="lazy" decoding="async"></span>';
  }
  function renderManagerRow(item, absoluteIndex) {
    if (state.managerType === "containers") {
      const ordered = orderedContainerItems();
      const globalIndex = ordered.findIndex(entry => entry.recordType === item.recordType && entry.id === item.id);
      const canReorder = managerCanReorder() && !state.orderBusy;
      const disabled = canReorder ? "" : " disabled";
      const reorderHint = canReorder ? "" : ' title="Clear search and filters and select Manual order to reorder"';
      return '<li class="manager-row manager-container-row container-order-item' + (canReorder ? '' : ' is-order-locked') + '" data-container-type="' + esc(item.recordType) + '" data-container-id="' + esc(item.id) + '"><button type="button" class="drag-handle" draggable="' + canReorder + '" aria-label="Drag to reorder ' + esc(titleOf(item)) + '"' + disabled + reorderHint + '>⠿</button><span class="manager-order">' + String(globalIndex + 1).padStart(2,"0") + '</span><button type="button" class="library-item manager-item-title" data-open="' + esc(item.recordType) + '" data-id="' + esc(item.id) + '"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.id) + '</small></button><span class="manager-kind">' + (item.recordType === "collection" ? "COLLECTION" : "PROJECT") + '</span>' + managerStatusBadge(item) + '<label class="position-control manager-position"><span class="sr-only">Position for ' + esc(titleOf(item)) + '</span><input type="number" min="1" max="' + ordered.length + '" value="' + (globalIndex + 1) + '" inputmode="numeric" data-position data-type="' + esc(item.recordType) + '" data-id="' + esc(item.id) + '"' + disabled + reorderHint + '></label><span class="order-buttons always-visible"><button type="button" data-container-move="up" data-type="' + esc(item.recordType) + '" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' up"' + (globalIndex <= 0 || !canReorder ? " disabled" : "") + reorderHint + '>↑</button><button type="button" data-container-move="down" data-type="' + esc(item.recordType) + '" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' down"' + (globalIndex >= ordered.length - 1 || !canReorder ? " disabled" : "") + reorderHint + '>↓</button></span></li>';
    }
    if (state.managerType === "updates") {
      return '<li class="manager-row manager-update-row"><span class="manager-order">' + String(absoluteIndex + 1).padStart(2,"0") + '</span><button type="button" class="manager-item-title" data-open="update" data-id="' + esc(item.id) + '"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.id) + '</small></button><time datetime="' + esc(item.date || "") + '">' + esc(item.date || "No date") + '</time><span class="manager-tags">' + esc((item.types || []).join(", ") || "—") + '</span>' + managerStatusBadge(item) + '<button type="button" class="manager-edit" data-open="update" data-id="' + esc(item.id) + '">Edit</button></li>';
    }
    if (managerView().status === "archived") {
      const date = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : "Date unavailable";
      return '<li class="manager-row manager-archive-row"><span class="manager-order">' + String(absoluteIndex + 1).padStart(2,"0") + '</span><span class="manager-item-title"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.id) + '</small></span><time>' + esc(date) + '</time><span class="manager-kind">ARCHIVED</span><span></span><button type="button" class="archive-delete-trigger" data-delete-archive="' + esc(item.id) + '" data-revision="' + esc(item.revision) + '">Delete…</button></li>';
    }
    const owner = allContainers().find(container => container.id === item.project);
    const mediaKind = item.mediaType === "video" ? (["soundcloud","bandcamp"].includes(item.videoProvider) ? "AUDIO" : "VIDEO") : "IMAGE";
    const orderedWorks = state.bootstrap.summaries.works;
    const globalIndex = orderedWorks.findIndex(work => work.id === item.id);
    const canReorder = managerCanReorder() && !state.orderBusy;
    const reorderHint = canReorder ? "" : ' title="Clear search and filters and select Manual order to reorder"';
    return '<li class="manager-row manager-work-row">' + managerThumbnail(item) + '<span class="manager-order">' + String(Number(item.order) || absoluteIndex + 1).padStart(2,"0") + '</span><button type="button" class="manager-item-title" data-open="work" data-id="' + esc(item.id) + '"><strong>' + esc(titleOf(item)) + '</strong><small>' + esc(item.id) + '</small></button><span class="manager-owner">' + esc(owner ? titleOf(owner) : item.project || "Unassigned") + '</span><span class="manager-kind">' + mediaKind + '</span>' + managerStatusBadge(item) + '<span class="order-buttons always-visible manager-work-order"><button type="button" data-move="up" data-type="work" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' up"' + (globalIndex <= 0 || !canReorder ? " disabled" : "") + reorderHint + '>↑</button><button type="button" data-move="down" data-type="work" data-id="' + esc(item.id) + '" aria-label="Move ' + esc(titleOf(item)) + ' down"' + (globalIndex >= orderedWorks.length - 1 || !canReorder ? " disabled" : "") + reorderHint + '>↓</button></span><button type="button" class="manager-edit" data-open="work" data-id="' + esc(item.id) + '">Edit</button></li>';
  }
  function renderManager() {
    if (!state.bootstrap) return;
    const root = $("[data-manager]");
    const grid = $(".app-grid");
    root.hidden = !state.managerOpen;
    grid.classList.toggle("manager-open",state.managerOpen);
    $("[data-editor]").closest(".editor").hidden = state.managerOpen;
    $(".preview-panel").hidden = state.managerOpen;
    if (state.managerOpen) $(".preview-panel").classList.remove("is-open");
    $("[data-manager-count='containers']").textContent = String(allContainers().length);
    $("[data-manager-count='updates']").textContent = String((state.bootstrap.summaries.updates || []).length);
    $("[data-manager-count='works']").textContent = String(state.bootstrap.summaries.works.length);
    if (!state.managerOpen) return;

    const view = managerView();
    const labels = { containers:"Projects + collections", updates:"Activity updates", works:"Works" };
    $("[data-manager-title]").textContent = labels[state.managerType];
    $("[data-manager-create]").textContent = state.managerType === "containers" ? "Create project" : state.managerType === "updates" ? "Create update" : "Create work";
    $("[data-manager-create]").dataset.create = state.managerType === "containers" ? "project" : state.managerType === "updates" ? "update" : "work";
    document.querySelectorAll("[data-manager-type]").forEach(button => button.setAttribute("aria-current",String(button.dataset.managerType === state.managerType)));
    $("[data-manager-query]").value = view.query;
    setSelectOptions($("[data-manager-status]"),managerStatusOptions(),view.status);
    view.status = $("[data-manager-status]").value;
    $("[data-manager-scope-label]").textContent = state.managerType === "containers" ? "Kind" : state.managerType === "updates" ? "Type" : "Project";
    setSelectOptions($("[data-manager-scope]"),managerScopeOptions(),view.scope);
    view.scope = $("[data-manager-scope]").value;
    setSelectOptions($("[data-manager-sort]"),managerSortOptions(),view.sort);
    view.sort = $("[data-manager-sort]").value;
    $("[data-manager-per]").value = String(view.per);

    const filtered = managerFilteredItems();
    const pageCount = Math.max(1,Math.ceil(filtered.length / view.per));
    view.page = clamp(view.page,1,pageCount);
    const start = (view.page - 1) * view.per;
    const pageItems = filtered.slice(start,start + view.per);
    $("[data-manager-list]").innerHTML = pageItems.length ? pageItems.map((item,index) => renderManagerRow(item,start + index)).join("") : '<li class="manager-empty"><strong>No matching items.</strong><span>Clear a filter or create new content.</span></li>';
    const first = filtered.length ? start + 1 : 0;
    const last = Math.min(start + view.per,filtered.length);
    $("[data-manager-range]").textContent = 'Showing ' + first + '–' + last + ' of ' + filtered.length;
    const totalCopy = filtered.length === managerSource().length ? filtered.length + ' total' : filtered.length + ' matching · ' + managerSource().length + ' total';
    const orderCopy = ["containers","works"].includes(state.managerType) && view.sort === "order" && !managerCanReorder() ? " · clear search and filters to reorder" : "";
    $("[data-manager-summary]").textContent = totalCopy + orderCopy;
    $("[data-manager-pagination]").innerHTML = pageCount <= 1 ? '' : paginationTokens(view.page,pageCount).map(token => typeof token === "number" ? '<button type="button" data-manager-page="' + token + '"' + (token === view.page ? ' aria-current="page"' : '') + '>' + token + '</button>' : '<span aria-hidden="true">…</span>').join("");
  }

  function openManager(type, options = {}) {
    state.managerType = ["containers","updates","works"].includes(type) ? type : "works";
    state.managerOpen = true;
    if (options.status) {
      state.managerViews[state.managerType].status = options.status;
      state.managerViews[state.managerType].page = 1;
    }
    persistManagerPreferences();
    renderManager();
    $("[data-manager-query]").focus();
  }
  function closeManager() {
    state.managerOpen = false;
    renderManager();
    const returnFocus = state.managerReturnFocus;
    state.managerReturnFocus = null;
    (returnFocus?.isConnected ? returnFocus : state.record ? $("[data-editor]") : $("[data-empty]"))?.focus?.();
  }
  function setPreviewDrawer(open) {
    const panel = $(".preview-panel");
    if (open && state.managerOpen) {
      state.managerOpen = false;
      renderManager();
    }
    panel.hidden = false;
    panel.classList.toggle("is-open",Boolean(open));
    if (open) panel.querySelector("[data-preview-close]")?.focus();
    else $("[data-preview-toggle]")?.focus();
  }

  function fallbackMedia() {
    return { kind:"image", src:"", ratio:"4/3", fit:"contain", altPL:"", altEN:"", focalPoint:{x:.5,y:.5}, transparencyMode:"auto", viewerBackground:"light" };
  }
  function getPath(object, pathName) {
    return String(pathName || "").split(".").filter(Boolean).reduce((value, part) => value == null ? undefined : value[/^\d+$/.test(part) ? Number(part) : part], object);
  }
  function mediaFor(record, key) {
    return getPath(record, key) || fallbackMedia();
  }
  function imageWithin(media, index = state.mediaItemIndex) {
    if (media.kind !== "group") return media;
    const items = media.items || [];
    state.mediaItemIndex = Math.max(0,Math.min(Math.max(0,items.length - 1),Number(index) || 0));
    return items[state.mediaItemIndex] || fallbackMedia();
  }

  function renderMediaEditor(record, keys) {
    if (!keys.includes(state.mediaKey)) state.mediaKey = keys[0];
    const root = mediaFor(record, state.mediaKey);
    const image = imageWithin(root,state.mediaItemIndex);
    const x = Number(image.focalPoint && image.focalPoint.x != null ? image.focalPoint.x : .5);
    const y = Number(image.focalPoint && image.focalPoint.y != null ? image.focalPoint.y : .5);
    const tabs = keys.map(key => '<button type="button" data-media-tab="' + key + '" aria-pressed="' + (state.mediaKey === key) + '">' + key + "</button>").join("");
    const groupTools = root.kind === "group" ? '<div class="media-group-tools"><div class="media-item-tabs" role="tablist" aria-label="Images in group">' + (root.items || []).map((item,index) => '<button type="button" role="tab" data-media-item="' + index + '" aria-selected="' + (index === state.mediaItemIndex) + '">' + String(index + 1).padStart(2,"0") + ' · ' + esc(item.altEN || item.altPL || item.src || "Image") + '</button>').join("") + '</div><div class="repeat-actions"><button type="button" data-media-item-move="previous"' + (state.mediaItemIndex === 0 ? " disabled" : "") + '>Move left</button><button type="button" data-media-item-move="next"' + (state.mediaItemIndex >= (root.items || []).length - 1 ? " disabled" : "") + '>Move right</button><button type="button" data-media-item-remove' + ((root.items || []).length <= 1 ? " disabled" : "") + '>Remove selected</button><button type="button" data-media-add>Add image</button></div></div>' : "";
    const preview = image.src ? '<img src="' + previewOrigin + "/" + esc(image.src) + '" alt=""><i class="focal"></i>' : "<span>No image assigned</span>";
    return '<fieldset><legend>Images & presentation</legend><div class="media-tabs">' + tabs + '</div><div class="media-editor" data-media-editor data-key="' + state.mediaKey + '"><div><div class="media-stage ' + (image.viewerBackground === "dark" ? "dark" : "") + '" data-focal-stage style="--fit:' + esc(image.fit || "contain") + ";--focal:" + x * 100 + "% " + y * 100 + "%;--x:" + x * 100 + "%;--y:" + y * 100 + '%">' + preview + '</div><div class="drop-zone" data-drop-zone>Drop PNG/JPEG/TIFF/WebP here or <button type="button" data-pick-image>choose a file</button><input data-file-input type="file" accept="image/png,image/jpeg,image/tiff,image/webp" hidden></div></div><div class="media-controls">' +
      field("media.src", "Generated web image", image.src || "", { wide:true }) +
      field("media.fit", "Fit", image.fit || "contain", { options:[["contain","Contain · show all"],["cover","Cover · crop"]] }) +
      (root.kind === "group" ? field("media.groupRatio", "Group frame ratio", root.ratio || "4/3") + field("media.ratio", "Selected image ratio", image.ratio || "4/3") : field("media.ratio", "Frame ratio", image.ratio || "4/3")) +
      field("media.focalX", "Focal X (0–1)", x, { type:"number" }) +
      field("media.focalY", "Focal Y (0–1)", y, { type:"number" }) +
      field("media.background", "Transparent background", image.viewerBackground || "light", { options:[["light","Neutral light"],["dark","Neutral dark"]] }) +
      field("media.transparency", "Transparency", image.transparencyMode || "auto", { options:[["auto","Auto detect"],["force-transparent","Treat as transparent"],["force-opaque","Treat as opaque"]] }) +
      field("media.disclosureKind", "AI disclosure", image.disclosure && image.disclosure.kind || "", { options:[["","None"],["ai-generated","AI-generated image"],["ai-elements","Contains AI-generated elements"]] }) +
      field("media.disclosureShortPL", "AI label · PL", image.disclosure && image.disclosure.shortPL || "", { area:true }) +
      field("media.disclosureShortEN", "AI label · EN", image.disclosure && image.disclosure.shortEN || "", { area:true }) +
      field("media.disclosureDetailPL", "AI detail · PL", image.disclosure && image.disclosure.detailPL || "", { area:true }) +
      field("media.disclosureDetailEN", "AI detail · EN", image.disclosure && image.disclosure.detailEN || "", { area:true }) +
      field("media.altPL", "Image description · PL", image.altPL || "", { area:true, wide:true }) +
      field("media.altEN", "Image description · EN", image.altEN || "", { area:true, wide:true }) +
      "</div></div>" + groupTools + "</fieldset>";
  }

  function sequenceIdBase(value) {
    return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "item";
  }

  function uniqueSequenceId(base, used) {
    const stem = sequenceIdBase(base);
    const numbered = stem.match(/^(.*?)-(\d+)$/);
    const prefix = numbered ? numbered[1] : stem;
    let suffix = numbered ? Number(numbered[2]) : 1;
    let id = stem;
    while (used.has(id)) id = prefix + "-" + ++suffix;
    used.add(id);
    return id;
  }

  function normalizeDetailSequence(record, repairReveal = false) {
    const legacyIds = Array.isArray(record.detailSequenceIds) ? record.detailSequenceIds.filter(id => typeof id === "string" && id) : [];
    const source = Array.isArray(record.detailSequence)
      ? record.detailSequence
      : legacyIds.map(workId => ({ kind:"work",workId }));
    const used = new Set();
    record.detailSequence = source.flatMap(node => {
      if (!node || typeof node !== "object") return [];
      if (node.kind === "work" && typeof node.workId === "string" && node.workId) {
        return [{ id:uniqueSequenceId(node.id || "work-" + node.workId,used),kind:"work",workId:node.workId }];
      }
      if (node.kind === "text") {
        return [{
          id:uniqueSequenceId(node.id || "text-1",used),
          kind:"text",
          headingPL:String(node.headingPL || ""),
          headingEN:String(node.headingEN || ""),
          bodyPL:String(node.bodyPL || ""),
          bodyEN:String(node.bodyEN || "")
        }];
      }
      return [];
    });
    record.detailSequenceIds = record.detailSequence.filter(node => node.kind === "work").map(node => node.workId);
    const reveal = record.sequenceReveal && typeof record.sequenceReveal === "object" ? record.sequenceReveal : {};
    const previousAfterId = typeof reveal.afterId === "string" ? reveal.afterId : "";
    record.sequenceReveal = {
      enabled:Boolean(reveal.enabled),
      afterId:previousAfterId,
      peekHeight:["compact","standard","tall"].includes(reveal.peekHeight) ? reveal.peekHeight : "standard"
    };
    if (repairReveal) {
      const eligibleIds = record.detailSequence.slice(0,-1).map(node => node.id);
      if (!eligibleIds.length) {
        record.sequenceReveal.enabled = false;
        record.sequenceReveal.afterId = "";
      } else if (!eligibleIds.includes(record.sequenceReveal.afterId)) {
        const previousIndex = source.findIndex(node => node && node.id === previousAfterId);
        const preferredIndex = Math.max(0, Math.min(previousIndex, record.detailSequence.length - 2));
        record.sequenceReveal.afterId = eligibleIds[preferredIndex] || eligibleIds[eligibleIds.length - 1];
      }
    }
    return record.detailSequence;
  }

  function sequenceNodeLabel(node, works) {
    if (node.kind === "work") {
      const item = works.find(work => work.id === node.workId);
      return item ? titleOf(item) : "Missing work: " + node.workId;
    }
    return node.headingPL || node.headingEN || "Text between works";
  }

  function renderSequence(record) {
    const works = state.bootstrap.summaries.works;
    const nodes = normalizeDetailSequence(record);
    const workIds = nodes.filter(node => node.kind === "work").map(node => node.workId);
    const rows = nodes.map((node,index) => {
      const controls = '<span class="sequence-block-actions"><button type="button" data-sequence-move="up" data-index="' + index + '" aria-label="Move block up"' + (index === 0 ? " disabled" : "") + '>↑</button><button type="button" data-sequence-move="down" data-index="' + index + '" aria-label="Move block down"' + (index === nodes.length - 1 ? " disabled" : "") + '>↓</button><button type="button" data-sequence-remove data-index="' + index + '" aria-label="Remove block">Remove</button></span>';
      const summary = '<div class="sequence-block-summary"><span class="sequence-block-number">' + String(index + 1).padStart(2,"0") + '</span><span class="sequence-block-copy"><strong>' + esc(sequenceNodeLabel(node,works)) + '</strong><small>' + (node.kind === "work" ? "WORK" : "TEXT") + ' · ' + esc(node.id) + '</small></span>' + controls + '</div>';
      if (node.kind === "work") return '<li class="sequence-block-row sequence-work-row">' + summary + '</li>';
      return '<li class="sequence-block-row sequence-text-row">' + summary + '<div class="sequence-text-editor field-grid">' + pair("detailSequence." + index + ".heading","Optional heading",node) + pair("detailSequence." + index + ".body","Body text",node,{area:true,required:true}) + '</div></li>';
    }).join("");
    const available = works.filter(work => !workIds.includes(work.id));
    const eligible = nodes.slice(0,-1);
    const reveal = record.sequenceReveal;
    const missingBoundary = Boolean(reveal.afterId && !eligible.some(node => node.id === reveal.afterId));
    return '<fieldset><legend>Project-page sequence</legend><p class="muted">Works and text blocks share one order. A text block appears directly above the work it describes; move either block with the arrow controls.</p><ol class="sequence-block-list">' + (rows || '<li class="sequence-block-empty">No content blocks in this sequence.</li>') + '</ol><div class="sequence-adders"><div class="sequence-picker"><select data-sequence-add-select><option value="">Choose a work…</option>' + available.map(item => '<option value="' + esc(item.id) + '">' + esc(titleOf(item)) + '</option>').join("") + '</select><button type="button" class="button secondary" data-sequence-add-work>Add work</button></div><button type="button" class="button secondary" data-sequence-add-text>Add text block</button></div></fieldset>' +
      '<fieldset class="sequence-reveal-editor"><legend>Show-more boundary</legend><p class="muted">When enabled, the public page shows a short preview of everything after the selected block behind a fading gradient and a Show more button. The last block is excluded because it leaves nothing to reveal. Disable this for short project pages.</p><div class="checkbox-row">' + checkbox("sequenceReveal.enabled","Enable Show more on this project",reveal.enabled) + '</div><div class="field-grid sequence-reveal-fields">' + field("sequenceReveal.afterId","Place boundary",reveal.afterId,{required:reveal.enabled,options:[["","Choose a block…"]].concat(eligible.map((node,index) => [node.id,"After " + String(index + 1).padStart(2,"0") + " · " + sequenceNodeLabel(node,works)]))}) + field("sequenceReveal.peekHeight","Visible preview height",reveal.peekHeight,{options:[["compact","Compact"],["standard","Standard"],["tall","Tall"]]}) + '</div>' + (missingBoundary ? '<p class="sequence-reveal-warning">The saved boundary no longer matches an eligible block. Choose a new boundary before enabling the feature.</p>' : "") + (!eligible.length ? '<p class="sequence-reveal-warning">Add at least two content blocks to create a useful reveal boundary.</p>' : "") + '</fieldset>';
  }

  function renderExternalLinks(record) {
    const links = record.externalLinks || [];
    const rows = links.map((link,index) => '<div class="repeat-row"><div class="field-grid three">' + field("externalLinks." + index + ".labelPL","Link label · PL",link.labelPL || "") + field("externalLinks." + index + ".labelEN","Link label · EN",link.labelEN || "") + field("externalLinks." + index + ".href","HTTPS URL",link.href || "") + '</div><div class="repeat-actions"><button type="button" data-link-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>Move up</button><button type="button" data-link-move="down" data-index="' + index + '"' + (index === links.length - 1 ? " disabled" : "") + '>Move down</button><button type="button" data-link-remove data-index="' + index + '">Remove</button></div></div>').join("");
    return '<fieldset><legend>External links</legend>' + (rows || '<p class="muted">No external links.</p>') + '<button type="button" class="button secondary" data-link-add>Add HTTPS link</button></fieldset>';
  }

  function normalizeTag(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function renderTagEditor(record) {
    const selected = Array.from(new Set(Array.isArray(record.types) ? record.types : []));
    const taxonomyKey = state.type === "update" ? "updateTypes" : "workTypes";
    const known = Array.from(new Set([...(state.bootstrap.taxonomy?.[taxonomyKey] || []), ...selected])).sort((a, b) => a.localeCompare(b, "en"));
    const available = known.filter(tag => !selected.includes(tag));
    const chips = selected.length
      ? selected.map(tag => '<li><span>' + esc(tag) + '</span><button type="button" data-tag-remove="' + esc(tag) + '" aria-label="Remove tag ' + esc(tag) + '">×</button></li>').join("")
      : '<li class="tag-empty">No tags selected.</li>';
    return '<fieldset class="tag-editor"><legend>Tags</legend><ul class="tag-chips" data-tag-chips>' + chips + '</ul><div class="tag-picker"><label class="field"><span>Choose an existing tag</span><select data-tag-select><option value="">Choose…</option>' + available.map(tag => '<option value="' + esc(tag) + '">' + esc(tag) + '</option>').join("") + '</select></label><button type="button" class="button secondary" data-tag-add-selected' + (available.length ? "" : " disabled") + '>Add selected</button></div><div class="tag-picker"><label class="field"><span>Add a new tag</span><input data-tag-new maxlength="48" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="lowercase-kebab-case"></label><button type="button" class="button secondary" data-tag-add-new>Add new tag</button></div><p class="muted">New tags are normalized to lowercase kebab-case.</p></fieldset>';
  }

  function renderNavigation(record) {
    const nav = record.navigation || [];
    return '<fieldset><legend>Navigation</legend>' + nav.map((item,index) => '<div class="repeat-row"><div class="field-grid three">' + field("navigation." + index + ".labelPL",item.id + " · PL",item.labelPL) + field("navigation." + index + ".labelEN",item.id + " · EN",item.labelEN) + field("navigation." + index + ".href","Local path / fragment",item.href) + '</div><div class="repeat-actions"><button type="button" data-nav-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>Move up</button><button type="button" data-nav-move="down" data-index="' + index + '"' + (index === nav.length - 1 ? " disabled" : "") + '>Move down</button><button type="button" data-nav-remove data-index="' + index + '">Remove</button></div></div>').join("") + '<button type="button" class="button secondary" data-nav-add>Add navigation item</button></fieldset>';
  }

  function renderHomeProjects(record) {
    const ids = record.home.degreeProjectIds || [];
    const containers = allContainers();
    const rows = ids.map((id,index) => { const item = containers.find(entry => entry.id === id); return '<li><span>' + String(index + 1).padStart(2,"0") + '</span><strong>' + esc(item ? titleOf(item) : id) + '</strong><span><button type="button" data-home-project-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>↑</button><button type="button" data-home-project-move="down" data-index="' + index + '"' + (index === ids.length - 1 ? " disabled" : "") + '>↓</button><button type="button" data-home-project-remove data-index="' + index + '">×</button></span></li>'; }).join("");
    const available = containers.filter(item => !ids.includes(item.id));
    return '<fieldset><legend>Home-page project list</legend><ol class="sequence-list">' + rows + '</ol><div class="sequence-picker"><select data-home-project-select><option value="">Choose a project…</option>' + available.map(item => '<option value="' + esc(item.id) + '">' + esc(titleOf(item)) + '</option>').join("") + '</select><button type="button" class="button secondary" data-home-project-add>Add</button></div></fieldset>';
  }

  function renderSocialLinks(record) {
    const profile = record.profile || (record.profile = { name:"", email:"" });
    if (!Array.isArray(profile.socialLinks)) {
      profile.socialLinks = profile.socialLinks === undefined && profile.linkedIn
        ? [{ id:"linkedin", labelPL:"LinkedIn", labelEN:"LinkedIn", href:profile.linkedIn }]
        : [];
    }
    const links = profile.socialLinks;
    const rows = links.map((link,index) => '<div class="repeat-row"><div class="field-grid three">' +
      field("profile.socialLinks." + index + ".labelPL","Link label ﾂｷ PL",link.labelPL || "") +
      field("profile.socialLinks." + index + ".labelEN","Link label ﾂｷ EN",link.labelEN || "") +
      field("profile.socialLinks." + index + ".href","HTTPS URL",link.href || "https://",{type:"url"}) +
      '</div><div class="repeat-actions"><button type="button" data-social-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>Move up</button><button type="button" data-social-move="down" data-index="' + index + '"' + (index === links.length - 1 ? " disabled" : "") + '>Move down</button><button type="button" data-social-remove data-index="' + index + '">Remove</button></div></div>').join("");
    return '<fieldset><legend>Social links</legend><p class="muted">These links appear in the public contact footer and in the Person SEO data. Leave this list empty to show no social links.</p>' + (rows || '<p class="muted">No social links configured.</p>') + '<button type="button" class="button secondary" data-social-add>Add HTTPS social link</button></fieldset>';
  }

  function renderUpdateBlocks(record) {
    const blocks = Array.isArray(record.blocks) ? record.blocks : [];
    state.updateBlockIndex = Math.max(0, Math.min(Math.max(0, blocks.length - 1), Number(state.updateBlockIndex) || 0));
    const active = blocks[state.updateBlockIndex];
    const rows = blocks.map((block, index) => {
      const label = block.kind === "text" ? (block.headingPL || block.headingEN || "Text") : block.kind === "media" ? (block.captionPL || block.captionEN || "Image") : block.kind === "embed" ? (block.titlePL || block.titleEN || "Embed") : (block.labelPL || block.labelEN || "Link");
      return '<li class="update-block-row"><button type="button" class="update-block-select" data-update-block-select="' + index + '" aria-pressed="' + (index === state.updateBlockIndex) + '"><span>' + String(index + 1).padStart(2,"0") + '</span><strong>' + esc(label) + '</strong><small>' + esc(block.kind) + '</small></button><span class="repeat-actions"><button type="button" data-update-block-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>↑</button><button type="button" data-update-block-move="down" data-index="' + index + '"' + (index === blocks.length - 1 ? " disabled" : "") + '>↓</button><button type="button" data-update-block-remove data-index="' + index + '"' + (blocks.length <= 1 ? " disabled" : "") + '>Remove</button></span></li>';
    }).join("");
    let editor = "";
    if (active?.kind === "text") {
      editor = '<fieldset><legend>Selected text block</legend><div class="field-grid">' + pair("blocks." + state.updateBlockIndex + ".heading","Optional heading",active) + pair("blocks." + state.updateBlockIndex + ".body","Body",active,{area:true}) + "</div></fieldset>";
    } else if (active?.kind === "media") {
      editor = '<fieldset><legend>Selected image block</legend><div class="field-grid">' + pair("blocks." + state.updateBlockIndex + ".caption","Caption",active,{area:true}) + "</div></fieldset>" + renderMediaEditor(record,["blocks." + state.updateBlockIndex + ".media"]);
    } else if (active?.kind === "embed") {
      const embed = active.embed || {};
      editor = '<fieldset><legend>Selected audio / video block</legend><div class="field-grid">' + pair("blocks." + state.updateBlockIndex + ".title","Embed title",active) + pair("blocks." + state.updateBlockIndex + ".summary","Optional context",active,{area:true}) + field("blocks." + state.updateBlockIndex + ".embed.provider","Provider",embed.provider || "",{options:[["","Choose…"],["youtube","YouTube"],["vimeo","Vimeo"],["soundcloud","SoundCloud"],["bandcamp","Bandcamp"]]}) + field("blocks." + state.updateBlockIndex + ".embed.id","YouTube / Vimeo / Bandcamp ID",embed.id || "") + field("blocks." + state.updateBlockIndex + ".embed.url","SoundCloud / Bandcamp public URL",embed.url || "",{wide:true}) + field("blocks." + state.updateBlockIndex + ".embed.bandcampType","Bandcamp release type",embed.bandcampType || "",{options:[["","Not applicable"],["album","Album"],["track","Track"]]}) + field("blocks." + state.updateBlockIndex + ".embed.embedSize","Audio-player size",embed.embedSize || "",{options:[["","Provider default"],["compact","Compact"],["standard","Standard"],["expanded","Expanded"]]}) + pair("blocks." + state.updateBlockIndex + ".embed.transcript","Transcript",embed,{area:true}) + pair("blocks." + state.updateBlockIndex + ".embed.credits","Embed credits",embed,{area:true}) + "</div></fieldset>";
    } else if (active?.kind === "link") {
      editor = '<fieldset><legend>Selected link block</legend><div class="field-grid">' + pair("blocks." + state.updateBlockIndex + ".label","Link label",active) + field("blocks." + state.updateBlockIndex + ".href","HTTPS URL",active.href || "",{wide:true}) + "</div></fieldset>";
    }
    return '<fieldset><legend>Ordered content blocks</legend><ol class="update-block-list">' + rows + '</ol><div class="sequence-picker"><select data-update-block-kind><option value="text">Text</option><option value="media">Image</option><option value="embed">Audio / video embed</option><option value="link">External link</option></select><button type="button" class="button secondary" data-update-block-add>Add block</button></div></fieldset>' + editor;
  }

  function renderUpdate(record) {
    const containers = allContainers();
    return '<div class="editor-head"><div><p class="overline">ACTIVITY UPDATE</p><h2>' + esc(titleOf(record)) + "</h2>" + (record.draft ? '<span class="draft-mark">DRAFT · NOT PUBLIC</span>' : "") + '</div><button type="button" class="button secondary" data-duplicate>Duplicate</button></div>' +
      '<fieldset><legend>Identity & publishing</legend><div class="field-grid">' + pair("title","Title",record) + field("id","Stable anchor",record.id,{readonly:true}) + field("date","Publication date",record.date || "",{type:"date"}) + '</div><div class="checkbox-row">' + checkbox("draft","Draft",record.draft) + checkbox("published","Published",record.published) + "</div></fieldset>" +
      '<fieldset><legend>Introduction</legend><div class="field-grid">' + pair("summary","Short summary",record,{area:true}) + "</div></fieldset>" +
      renderTagEditor(record) +
      '<fieldset><legend>Related projects</legend><div class="checkbox-row">' + containers.map(item => checkbox("updateProject." + item.id,titleOf(item),(record.projectIds || []).includes(item.id))).join("") + "</div></fieldset>" +
      renderUpdateBlocks(record);
  }

  function renderContainer(record) {
    const related = allContainers().filter(item => item.id !== record.id);
    return '<div class="editor-head"><div><p class="overline">PROJECT</p><h2>' + esc(titleOf(record)) + "</h2>" + (record.draft ? '<span class="draft-mark">DRAFT · NOT PUBLIC</span>' : "") + '</div><button type="button" class="button secondary" data-duplicate>Duplicate</button></div>' +
      '<fieldset><legend>Identity & publishing</legend><div class="field-grid">' + pair("title","Title",record) + pair("heroLineHeight","Main heading line spacing",{ heroLineHeightPL:record.heroLineHeightPL ?? record.heroLineHeight ?? 1.12, heroLineHeightEN:record.heroLineHeightEN ?? record.heroLineHeight ?? 1.12 },{type:"number",min:0.8,max:1.4,step:0.01}) + field("id","Stable slug",record.id,{readonly:true}) + field("detailMediaSize","Default sequence image size",record.detailMediaSize,{ options:[["compact","Compact"],["standard","Standard"],["large","Large"],["full","Full"]] }) + '</div><div class="checkbox-row">' + checkbox("draft","Draft",record.draft) + checkbox("published","Published",record.published) + "</div></fieldset>" +
      '<fieldset><legend>Introduction</legend><div class="field-grid">' + pair("summary","Short summary",record,{area:true}) + pair("overview","Overview",record,{area:true}) + pair("editorial","Editorial / exhibition text",record,{area:true}) + pair("year","Year",record) + pair("disciplines","Disciplines",record) + pair("format","Format",record) + pair("role","Role / scope",record,{area:true}) + "</div></fieldset>" +
      renderMediaEditor(record,["cover","hero","thumbnail"]) +
      '<fieldset><legend>Process & contributors</legend><div class="field-grid">' + pair("processHeading","Section heading",record) + pair("process","Process",record,{area:true}) + pair("credits","Contributors",record,{area:true}) + pair("statement","Optional statement",record,{area:true}) + "</div></fieldset>" +
      '<fieldset><legend>Related projects</legend><div class="checkbox-row">' + related.map(item => checkbox("related." + item.id,titleOf(item),(record.related || []).includes(item.id))).join("") + "</div></fieldset>" +
      renderExternalLinks(record) +
      renderSequence(record) +
      '<fieldset><legend>Search & social sharing</legend><div class="field-grid">' + pair("seo.title","SEO title",record.seo || {}) + pair("seo.description","SEO description",record.seo || {},{area:true}) + pair("seo.imageAlt","Social-image description",record.seo || {},{area:true}) + field("seo.image","Social image path",record.seo && record.seo.image || "",{wide:true}) + "</div></fieldset>";
  }

  function renderWork(record) {
    const containers = allContainers();
    const video = record.video || {};
    return '<div class="editor-head"><div><p class="overline">WORK</p><h2>' + esc(titleOf(record)) + "</h2>" + (record.draft ? '<span class="draft-mark">DRAFT · NOT PUBLIC</span>' : "") + '</div><button type="button" class="button secondary" data-duplicate>Duplicate</button></div>' +
      '<fieldset><legend>Identity & publishing</legend><div class="field-grid">' + pair("title","Title",record) + field("id","Stable slug",record.id,{readonly:true}) + field("project","Project",record.project,{options:[["","Choose…"]].concat(containers.map(item => [item.id,titleOf(item)]))}) + field("year","Year",record.year || "") + field("medium","Medium",record.medium || "digital",{options:[["digital","Digital"],["traditional","Traditional"]]}) + field("detailMediaSize","Project-page size override",record.detailMediaSize || "",{options:[["","Use project default"],["compact","Compact"],["standard","Standard"],["large","Large"],["full","Full"]]}) + '</div><div class="checkbox-row">' + checkbox("draft","Draft",record.draft) + checkbox("published","Published",record.published) + checkbox("galleryVisible","Show in all-work gallery",record.galleryVisible) + checkbox("projectPageVisible","Show on project page",record.projectPageVisible !== false) + checkbox("detailOnly","Project detail only",record.detailOnly) + "</div></fieldset>" +
      renderTagEditor(record) +
      '<fieldset><legend>Bilingual copy</legend><div class="field-grid">' + pair("summary","Summary",record,{area:true}) + pair("alt","Artwork description / alt text",record,{area:true}) + pair("caption","Caption",record,{area:true}) + "</div></fieldset>" +
      renderMediaEditor(record,["cover"]) +
      '<fieldset><legend>Video / audio embed</legend><div class="field-grid">' + field("mediaType","Media type",record.mediaType,{options:[["image","Image"],["video","Video / audio"]]}) + field("video.provider","Provider",video.provider || "",{options:[["","None"],["youtube","YouTube"],["vimeo","Vimeo"],["soundcloud","SoundCloud"],["bandcamp","Bandcamp"]]}) + field("video.id","YouTube / Vimeo / Bandcamp numeric ID",video.id || "") + field("video.url","SoundCloud / Bandcamp public URL",video.url || "",{wide:true}) + field("video.bandcampType","Bandcamp release type",video.bandcampType || "",{options:[["","Not applicable"],["album","Album"],["track","Track"]]}) + field("video.embedSize","Audio-player size",video.embedSize || "",{options:[["","Provider default"],["compact","Compact"],["standard","Standard (recommended)"],["expanded","Expanded"]]}) + pair("videoWarning","Content / flashing-light warning",record,{area:true}) + pair("video.transcript","Transcript",video,{area:true}) + pair("video.credits","Embed credits",video,{area:true}) + "</div></fieldset>" +
      '<fieldset><legend>Provenance</legend><div class="field-grid">' + field("provenance.source","Source / authorship note",record.provenance && record.provenance.source || "",{wide:true}) + field("provenance.creationYear","Creation year",record.provenance && record.provenance.creationYear || "") + "</div></fieldset>" + renderExternalLinks(record);
  }

  function renderSite(record) {
    const home = record.home;
    const activity = record.activity || {};
    const updateOptions = [["","No featured update"]].concat((state.bootstrap.summaries.updates || []).filter(item => item.published && !item.draft).map(item => [item.id,(item.date ? item.date + " · " : "") + titleOf(item)]));
    return '<div class="editor-head"><div><p class="overline">GLOBAL SITE CONTENT</p><h2>' + esc(record.profile.name) + "</h2></div></div>" +
      '<fieldset><legend>Profile & canonical identity</legend><div class="field-grid">' + field("origin","Canonical public origin · locked",record.origin,{readonly:true}) + field("profile.name","Name",record.profile.name) + field("profile.email","Email",record.profile.email,{type:"email"}) + "</div></fieldset>" +
      renderSocialLinks(record) +
      renderNavigation(record) +
      '<fieldset><legend>Home page</legend><div class="field-grid">' + pair("home.eyebrow","Eyebrow",home) + home.heroLines.map((line,index) => field("home.heroLines." + index + ".pl","Headline " + (index + 1) + " · PL",line.pl) + field("home.heroLines." + index + ".en","Headline " + (index + 1) + " · EN",line.en)).join("") + field("home.heroLineHeight","Hero headline line spacing (0.80–1.40)",home.heroLineHeight ?? 1.02,{type:"number",min:0.8,max:1.4,step:0.01}) + pair("home.intro","Introduction",home,{area:true}) + pair("home.disciplinesHeading","Disciplines heading",home,{area:true}) + pair("home.disciplinesIntro","Disciplines introduction",home,{area:true}) + home.disciplines.map((item,index) => field("home.disciplines." + index + ".titlePL","Discipline " + (index + 1) + " title · PL",item.titlePL) + field("home.disciplines." + index + ".titleEN","Discipline " + (index + 1) + " title · EN",item.titleEN) + field("home.disciplines." + index + ".textPL","Discipline " + (index + 1) + " text · PL",item.textPL,{area:true}) + field("home.disciplines." + index + ".textEN","Discipline " + (index + 1) + " text · EN",item.textEN,{area:true})).join("") + "</div></fieldset>" +
      renderHomeProjects(record) +
      '<fieldset><legend>Activity page</legend><div class="field-grid">' + pair("activity.eyebrow","Eyebrow",activity) + pair("activity.heading","Page heading",activity) + pair("activity.intro","Introduction",activity,{area:true}) + pair("activity.empty","Empty-state message",activity,{area:true}) + field("activity.featuredUpdateId","Featured / current update",activity.featuredUpdateId || "",{options:updateOptions}) + field("activity.itemsPerPage","Updates per page",activity.itemsPerPage || 10,{type:"number",min:1,max:50,step:1}) + "</div></fieldset>" +
      '<fieldset><legend>Page SEO</legend><div class="field-grid">' + Object.entries(record.pages || {}).map(([key,page]) => pair("pages." + key + ".title",key + " title",page) + pair("pages." + key + ".description",key + " description",page,{area:true})).join("") + "</div></fieldset>" +
      '<fieldset><legend>Footer</legend><div class="field-grid">' + field("footer.headingPL","Heading · PL",record.footer.headingPL,{area:true}) + field("footer.headingEN","Heading · EN",record.footer.headingEN,{area:true}) + "</div></fieldset>" +
      '<fieldset><legend>Global interface copy</legend><div class="field-grid">' + Object.entries(record.copy).map(entry => field("copyEntry." + entry[0].replaceAll(".","~") + ".pl",entry[0] + " · PL",entry[1].pl) + field("copyEntry." + entry[0].replaceAll(".","~") + ".en",entry[0] + " · EN",entry[1].en)).join("") + "</div></fieldset>";
  }

  function renderEditor() {
    const form = $("[data-editor]");
    $("[data-empty]").hidden = true;
    form.hidden = false;
    const content = state.type === "site" ? renderSite(state.record) : state.type === "work" ? renderWork(state.record) : state.type === "update" ? renderUpdate(state.record) : renderContainer(state.record);
    state.typographyTarget = null;
    form.innerHTML = content + '<fieldset class="typography-tools"><legend>Line-break control</legend><p>Select words in a Polish or English display-text field, then keep the phrase together. This is useful for names and separators such as <code>A / B</code>.</p><div class="typography-actions"><button type="button" class="button secondary" data-typography-action="separators">Protect separators in field</button><button type="button" class="button secondary" data-typography-action="keep">Keep selection together</button><button type="button" class="button secondary" data-typography-action="space">Insert non-breaking space</button><button type="button" class="button secondary" data-typography-action="hyphen">Insert non-breaking hyphen</button><button type="button" class="button secondary" data-typography-action="normal">Restore normal breaks</button></div><p class="typography-status muted" data-typography-status aria-live="polite">Focus a supported text field to use these controls.</p></fieldset><div class="editor-actions"><span class="status-line" data-form-status>Changes are local until saved.</span>' + (state.type !== "site" ? '<button type="button" class="button danger" data-archive>Archive…</button>' : "") + '<button type="submit" class="button">Save & regenerate</button></div>';
    autoGrowTextareas(form);
    setPreview(state.type,state.record);
    bindEditor();
  }

  function setPath(object,pathName,value) {
    const parts = pathName.split(".");
    let cursor = object;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = /^\d+$/.test(parts[index]) ? Number(parts[index]) : parts[index];
      if (cursor[key] == null) cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  function valueOf(form,name) {
    const input = form.elements.namedItem(name);
    return input && input.type === "checkbox" ? input.checked : input && input.value;
  }

  function hostedAudioDetails(value) {
    try {
      const url = new URL(String(value || "").trim());
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.protocol !== "https:") return null;
      if ((url.hostname === "soundcloud.com" || url.hostname.endsWith(".soundcloud.com")) && parts.length >= 2) return { provider:"soundcloud" };
      if ((url.hostname === "bandcamp.com" || url.hostname.endsWith(".bandcamp.com")) && parts.length === 2 && ["album","track"].includes(parts[0])) return { provider:"bandcamp", bandcampType:parts[0] };
      return null;
    } catch {
      return null;
    }
  }

  function mediaHasSource(media) {
    return media?.kind === "group" ? (media.items || []).some(item => Boolean(item?.src)) : Boolean(media?.src);
  }

  function normalizeHostedAudioEmbed(record) {
    const video = record.video || (record.video = {});
    video.url = String(video.url || "").trim();
    const detected = hostedAudioDetails(video.url);
    if (!detected || (video.provider && video.provider !== detected.provider)) return;
    video.provider = detected.provider;
    if (detected.provider === "soundcloud") video.id = "";
    if (detected.provider === "bandcamp") video.bandcampType = video.bandcampType || detected.bandcampType;
    video.embedSize = video.embedSize || "standard";
    record.mediaType = "video";
    if (!mediaHasSource(video.poster) && mediaHasSource(record.cover)) video.poster = structuredClone(record.cover);
  }

  function normalizeUpdateEmbeds(record) {
    for (const block of record.blocks || []) {
      if (block.kind !== "embed" || !block.embed) continue;
      block.embed.url = String(block.embed.url || "").trim();
      const detected = hostedAudioDetails(block.embed.url);
      if (!detected || (block.embed.provider && block.embed.provider !== detected.provider)) continue;
      block.embed.provider = detected.provider;
      if (detected.provider === "soundcloud") block.embed.id = "";
      if (detected.provider === "bandcamp") block.embed.bandcampType = block.embed.bandcampType || detected.bandcampType;
      block.embed.embedSize = block.embed.embedSize || "standard";
    }
  }

  function collectForm() {
    const record = structuredClone(state.record);
    const form = $("[data-editor]");
    for (const input of form.elements) {
      if (!input.name || input.name.startsWith("media.")) continue;
      let value = input.type === "checkbox" ? input.checked : input.type === "number" && input.value !== "" ? Number(input.value) : input.value;
      if (input.name === "id") continue;
      if (input.name.startsWith("copyEntry.")) {
        const parts = input.name.split(".");
        const key = parts[1].replaceAll("~",".");
        record.copy[key] = record.copy[key] || { pl:"",en:"" };
        record.copy[key][parts[2]] = value;
        continue;
      }
      if (input.name.startsWith("related.")) {
        const id = input.name.slice(8);
        record.related = record.related || [];
        record.related = input.checked ? Array.from(new Set(record.related.concat(id))) : record.related.filter(item => item !== id);
        continue;
      }
      if (input.name.startsWith("collections.")) {
        const id = input.name.slice(12);
        record.collections = record.collections || [];
        record.collections = input.checked ? Array.from(new Set(record.collections.concat(id))) : record.collections.filter(item => item !== id);
        continue;
      }
      if (input.name.startsWith("updateProject.")) {
        const id = input.name.slice(14);
        record.projectIds = record.projectIds || [];
        record.projectIds = input.checked ? Array.from(new Set(record.projectIds.concat(id))) : record.projectIds.filter(item => item !== id);
        continue;
      }
      setPath(record,input.name,value);
    }
    if (state.type !== "site" && form.querySelector("[data-media-editor]")) {
      const root = mediaFor(record,state.mediaKey);
      const media = imageWithin(root,state.mediaItemIndex);
      media.src = valueOf(form,"media.src") || "";
      media.fit = valueOf(form,"media.fit");
      media.ratio = valueOf(form,"media.ratio");
      if (root.kind === "group") root.ratio = valueOf(form,"media.groupRatio") || root.ratio;
      media.altPL = valueOf(form,"media.altPL");
      media.altEN = valueOf(form,"media.altEN");
      media.viewerBackground = valueOf(form,"media.background");
      media.transparencyMode = valueOf(form,"media.transparency");
      const disclosureKind = valueOf(form,"media.disclosureKind");
      if (disclosureKind) media.disclosure = { kind:disclosureKind, shortPL:valueOf(form,"media.disclosureShortPL"), shortEN:valueOf(form,"media.disclosureShortEN"), detailPL:valueOf(form,"media.disclosureDetailPL"), detailEN:valueOf(form,"media.disclosureDetailEN") };
      else delete media.disclosure;
      media.focalPoint = { x:Math.min(1,Math.max(0,Number(valueOf(form,"media.focalX")) || 0)), y:Math.min(1,Math.max(0,Number(valueOf(form,"media.focalY")) || 0)) };
      setPath(record,state.mediaKey,root);
    }
    if (state.type === "work") normalizeHostedAudioEmbed(record);
    if (state.type === "update") normalizeUpdateEmbeds(record);
    if (["project","collection"].includes(state.type)) normalizeDetailSequence(record);
    return record;
  }

  function markDirty() {
    state.dirty = true;
    const formStatus = $("[data-form-status]");
    if (formStatus) formStatus.textContent = "Unsaved changes";
    $("[data-save-state]").textContent = "Unsaved";
  }
  function applyTypographyAction(action) {
    const form = $("[data-editor]");
    const target = state.typographyTarget;
    const status = form.querySelector("[data-typography-status]");
    if (!target || !form.contains(target) || !target.matches("[data-typography-input]")) {
      if (status) status.textContent = "Select text in a supported Polish or English display field first.";
      return;
    }
    let start = target.selectionStart;
    let end = target.selectionEnd;
    let replacement = "";
    if (action === "separators") {
      target.value = target.value.replace(/([^\s\u00a0])[ \t]+([\/|·\-‐‑‒–—―−])[ \t]+(?=[^\s\u00a0])/gu,(_,before,separator) => before + "\u00a0" + separator + "\u00a0");
      target.dispatchEvent(new Event("input",{bubbles:true}));
      target.focus();
      if (status) status.textContent = "Separators in this field are protected on both sides.";
      return;
    } else if (action === "keep") {
      if (start === end) {
        if (status) status.textContent = "Select the complete phrase that must stay on one line.";
        target.focus();
        return;
      }
      while (start > 0 && /[ \t\u00a0]/.test(target.value[start - 1])) start -= 1;
      while (end < target.value.length && /[ \t\u00a0]/.test(target.value[end])) end += 1;
      replacement = target.value.slice(start,end).replace(/[ \t\u00a0]+/g,"\u00a0").replace(/([\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu,"$1‑");
    } else if (action === "normal") {
      if (start === end) {
        if (status) status.textContent = "Select the phrase whose normal line breaks should be restored.";
        target.focus();
        return;
      }
      replacement = target.value.slice(start,end).replace(/\u00a0/g," ").replace(/‑/g,"-");
    } else if (action === "space") replacement = "\u00a0";
    else if (action === "hyphen") replacement = "‑";
    else return;
    target.setRangeText(replacement,start,end,"end");
    target.dispatchEvent(new Event("input",{bubbles:true}));
    target.focus();
    if (status) status.textContent = action === "keep" ? "Selection will stay together after saving." : action === "normal" ? "Normal line-break opportunities restored." : "Non-breaking character inserted.";
  }
  function bindEditor() {
    const form = $("[data-editor]");
    form.addEventListener("input",event => {
      markDirty();
      if (/^heroLineHeight(?:PL|EN)$/.test(event.target.name || "")) previewHeadingSpacing();
    });
    form.addEventListener("keydown",event => {
      if (event.key !== " " || !event.shiftKey || !(event.ctrlKey || event.metaKey) || !event.target.matches?.("[data-typography-input]")) return;
      event.preventDefault();
      state.typographyTarget = event.target;
      applyTypographyAction("space");
    });
    form.addEventListener("focusin",event => {
      if (!event.target.matches?.("[data-typography-input]")) return;
      state.typographyTarget = event.target;
      const count = (event.target.value.match(/\u00a0/g) || []).length;
      const status = form.querySelector("[data-typography-status]");
      if (status) status.textContent = count ? `Protected spaces in this field: ${count}.` : "No protected spaces in this field.";
    });
    form.addEventListener("change",event => {
      if (event.target.name === "published" && event.target.checked) {
        const draft = form.elements.namedItem("draft");
        if (draft) draft.checked = false;
      }
      if (event.target.name === "draft" && event.target.checked) {
        const published = form.elements.namedItem("published");
        if (published) published.checked = false;
      }
      if (event.target.name === "sequenceReveal.enabled") {
        const boundary = form.elements.namedItem("sequenceReveal.afterId");
        if (boundary) boundary.required = event.target.checked;
      }
    });
    form.addEventListener("submit",saveCurrent);
    form.querySelectorAll("[data-typography-action]").forEach(button => {
      button.addEventListener("mousedown",event => event.preventDefault());
      button.addEventListener("click",() => applyTypographyAction(button.dataset.typographyAction));
    });
    const addTag = rawValue => {
      const tag = normalizeTag(rawValue);
      if (!tag) return false;
      state.record = collectForm();
      state.record.types = Array.from(new Set([...(state.record.types || []), tag]));
      renderEditor();
      markDirty();
      return true;
    };
    const existingTagButton = form.querySelector("[data-tag-add-selected]");
    if (existingTagButton) existingTagButton.addEventListener("click",() => addTag(form.querySelector("[data-tag-select]").value));
    const newTagInput = form.querySelector("[data-tag-new]");
    const addNewTag = () => {
      if (!newTagInput) return;
      const added = addTag(newTagInput.value);
      if (!added) {
        newTagInput.setCustomValidity("Enter at least one letter or number.");
        newTagInput.reportValidity();
      }
    };
    const newTagButton = form.querySelector("[data-tag-add-new]");
    if (newTagButton) newTagButton.addEventListener("click",addNewTag);
    if (newTagInput) {
      newTagInput.addEventListener("input",() => newTagInput.setCustomValidity(""));
      newTagInput.addEventListener("keydown",event => { if (event.key === "Enter") { event.preventDefault(); addNewTag(); } });
    }
    form.querySelectorAll("[data-tag-remove]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm();
      state.record.types = (state.record.types || []).filter(tag => tag !== button.dataset.tagRemove);
      renderEditor();
      markDirty();
    }));
    form.querySelectorAll("[data-update-block-select]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm();
      state.updateBlockIndex = Number(button.dataset.updateBlockSelect);
      state.mediaItemIndex = 0;
      renderEditor();
    }));
    form.querySelectorAll("[data-update-block-move]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm();
      const index = Number(button.dataset.index);
      const next = button.dataset.updateBlockMove === "up" ? index - 1 : index + 1;
      [state.record.blocks[index],state.record.blocks[next]] = [state.record.blocks[next],state.record.blocks[index]];
      state.updateBlockIndex = next;
      renderEditor();
      markDirty();
    }));
    form.querySelectorAll("[data-update-block-remove]").forEach(button => button.addEventListener("click",() => {
      if (!confirm("Remove this content block? Imported media files will remain available.")) return;
      state.record = collectForm();
      const index = Number(button.dataset.index);
      state.record.blocks.splice(index,1);
      state.updateBlockIndex = Math.max(0,Math.min(index,state.record.blocks.length - 1));
      renderEditor();
      markDirty();
    }));
    const addUpdateBlock = form.querySelector("[data-update-block-add]");
    if (addUpdateBlock) addUpdateBlock.addEventListener("click",() => {
      state.record = collectForm();
      const kind = form.querySelector("[data-update-block-kind]").value;
      const used = new Set(state.record.blocks.map(block => block.id));
      let number = state.record.blocks.length + 1;
      while (used.has(kind + "-" + number)) number += 1;
      const id = kind + "-" + number;
      const block = kind === "text" ? { id,kind,headingPL:"",headingEN:"",bodyPL:"",bodyEN:"" }
        : kind === "media" ? { id,kind,media:fallbackMedia(),captionPL:"",captionEN:"" }
        : kind === "embed" ? { id,kind,titlePL:"",titleEN:"",summaryPL:"",summaryEN:"",embed:{provider:"",id:"",url:"",bandcampType:"",embedSize:"standard"} }
        : { id,kind:"link",labelPL:"",labelEN:"",href:"https://" };
      state.record.blocks.push(block);
      state.updateBlockIndex = state.record.blocks.length - 1;
      state.mediaItemIndex = 0;
      renderEditor();
      markDirty();
    });
    form.querySelectorAll("[data-media-tab]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); state.mediaKey = button.dataset.mediaTab; state.mediaItemIndex = 0; renderEditor(); }));
    form.querySelectorAll("[data-media-item]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); state.mediaItemIndex = Number(button.dataset.mediaItem); renderEditor(); }));
    form.querySelectorAll("[data-media-item-move]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm();
      const mediaRoot = mediaFor(state.record,state.mediaKey);
      const next = button.dataset.mediaItemMove === "previous" ? state.mediaItemIndex - 1 : state.mediaItemIndex + 1;
      [mediaRoot.items[state.mediaItemIndex],mediaRoot.items[next]] = [mediaRoot.items[next],mediaRoot.items[state.mediaItemIndex]];
      state.mediaItemIndex = next; renderEditor(); markDirty();
    }));
    const removeMediaItem = form.querySelector("[data-media-item-remove]");
    if (removeMediaItem) removeMediaItem.addEventListener("click",() => {
      if (!confirm("Remove the selected image from this group? The source master remains archived.")) return;
      state.record = collectForm();
      const mediaRoot = mediaFor(state.record,state.mediaKey);
      mediaRoot.items.splice(state.mediaItemIndex,1);
      state.mediaItemIndex = Math.max(0,state.mediaItemIndex - 1);
      renderEditor(); markDirty();
    });
    const duplicate = form.querySelector("[data-duplicate]");
    if (duplicate) duplicate.addEventListener("click",duplicateCurrent);
    const archive = form.querySelector("[data-archive]");
    if (archive) archive.addEventListener("click",archiveCurrent);
    form.querySelectorAll("[data-sequence-move]").forEach(button => button.addEventListener("click",() => moveSequence(Number(button.dataset.index),button.dataset.sequenceMove)));
    form.querySelectorAll("[data-sequence-remove]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm();
      const nodes = normalizeDetailSequence(state.record);
      nodes.splice(Number(button.dataset.index),1);
      normalizeDetailSequence(state.record,true);
      renderEditor();
      markDirty();
    }));
    const sequenceAdd = form.querySelector("[data-sequence-add-work]");
    if (sequenceAdd) sequenceAdd.addEventListener("click",() => {
      const select = form.querySelector("[data-sequence-add-select]");
      if (!select.value) return;
      state.record = collectForm();
      const nodes = normalizeDetailSequence(state.record);
      const used = new Set(nodes.map(node => node.id));
      nodes.push({ id:uniqueSequenceId("work-" + select.value,used),kind:"work",workId:select.value });
      normalizeDetailSequence(state.record,true);
      renderEditor();
      markDirty();
    });
    const sequenceAddText = form.querySelector("[data-sequence-add-text]");
    if (sequenceAddText) sequenceAddText.addEventListener("click",() => {
      state.record = collectForm();
      const nodes = normalizeDetailSequence(state.record);
      const used = new Set(nodes.map(node => node.id));
      nodes.push({ id:uniqueSequenceId("text-1",used),kind:"text",headingPL:"",headingEN:"",bodyPL:"",bodyEN:"" });
      normalizeDetailSequence(state.record,true);
      renderEditor();
      markDirty();
      const newIndex = state.record.detailSequence.length - 1;
      $("[data-editor]")?.querySelector('[name="detailSequence.' + newIndex + '.bodyPL"]')?.focus();
    });
    form.querySelectorAll("[data-link-move]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm(); const links = state.record.externalLinks || []; const index = Number(button.dataset.index); const next = button.dataset.linkMove === "up" ? index - 1 : index + 1; [links[index],links[next]] = [links[next],links[index]]; renderEditor(); markDirty();
    }));
    form.querySelectorAll("[data-link-remove]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); state.record.externalLinks.splice(Number(button.dataset.index),1); renderEditor(); markDirty(); }));
    const addLink = form.querySelector("[data-link-add]");
    if (addLink) addLink.addEventListener("click",() => { state.record = collectForm(); state.record.externalLinks = state.record.externalLinks || []; state.record.externalLinks.push({labelPL:"",labelEN:"",href:"https://"}); renderEditor(); markDirty(); });
    form.querySelectorAll("[data-social-move]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm(); const links = state.record.profile.socialLinks || []; const index = Number(button.dataset.index); const next = button.dataset.socialMove === "up" ? index - 1 : index + 1; [links[index],links[next]] = [links[next],links[index]]; renderEditor(); markDirty();
    }));
    form.querySelectorAll("[data-social-remove]").forEach(button => button.addEventListener("click",() => {
      state.record = collectForm(); state.record.profile.socialLinks.splice(Number(button.dataset.index),1); renderEditor(); markDirty();
    }));
    const addSocial = form.querySelector("[data-social-add]");
    if (addSocial) addSocial.addEventListener("click",() => {
      state.record = collectForm(); const links = state.record.profile.socialLinks || (state.record.profile.socialLinks = []); const used = new Set(links.map(link => link.id)); let index = links.length + 1; while (used.has("social-" + index)) index += 1; links.push({id:"social-" + index,labelPL:"",labelEN:"",href:"https://"}); renderEditor(); markDirty();
    });
    form.querySelectorAll("[data-nav-move]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); const index = Number(button.dataset.index); const next = button.dataset.navMove === "up" ? index - 1 : index + 1; [state.record.navigation[index],state.record.navigation[next]] = [state.record.navigation[next],state.record.navigation[index]]; renderEditor(); markDirty(); }));
    form.querySelectorAll("[data-nav-remove]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); state.record.navigation.splice(Number(button.dataset.index),1); renderEditor(); markDirty(); }));
    const addNav = form.querySelector("[data-nav-add]");
    if (addNav) addNav.addEventListener("click",() => { state.record = collectForm(); const used = new Set(state.record.navigation.map(item => item.id)); let index = state.record.navigation.length + 1; while (used.has("link-" + index)) index += 1; state.record.navigation.push({id:"link-" + index,href:"#section",labelPL:"Nowa sekcja",labelEN:"New section"}); renderEditor(); markDirty(); });
    form.querySelectorAll("[data-home-project-move]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); const ids = state.record.home.degreeProjectIds; const index = Number(button.dataset.index); const next = button.dataset.homeProjectMove === "up" ? index - 1 : index + 1; [ids[index],ids[next]] = [ids[next],ids[index]]; renderEditor(); markDirty(); }));
    form.querySelectorAll("[data-home-project-remove]").forEach(button => button.addEventListener("click",() => { state.record = collectForm(); state.record.home.degreeProjectIds.splice(Number(button.dataset.index),1); renderEditor(); markDirty(); }));
    const addHomeProject = form.querySelector("[data-home-project-add]");
    if (addHomeProject) addHomeProject.addEventListener("click",() => { const select = form.querySelector("[data-home-project-select]"); if (!select.value) return; state.record = collectForm(); state.record.home.degreeProjectIds.push(select.value); renderEditor(); markDirty(); });
    const stage = form.querySelector("[data-focal-stage]");
    if (stage) stage.addEventListener("click",event => {
      const rect = stage.getBoundingClientRect();
      form.elements.namedItem("media.focalX").value = Math.max(0,Math.min(1,(event.clientX - rect.left) / rect.width)).toFixed(3);
      form.elements.namedItem("media.focalY").value = Math.max(0,Math.min(1,(event.clientY - rect.top) / rect.height)).toFixed(3);
      state.record = collectForm();
      renderEditor();
      markDirty();
    });
    const input = form.querySelector("[data-file-input]");
    const drop = form.querySelector("[data-drop-zone]");
    const picker = form.querySelector("[data-pick-image]");
    if (picker) picker.addEventListener("click",() => { state.mediaUploadMode = "replace"; input.click(); });
    const addMedia = form.querySelector("[data-media-add]");
    if (addMedia) addMedia.addEventListener("click",() => { state.mediaUploadMode = "add"; input.click(); });
    if (input) input.addEventListener("change",() => input.files[0] && uploadImage(input.files[0]));
    if (drop) {
      drop.addEventListener("dragover",event => { event.preventDefault(); drop.classList.add("is-over"); });
      drop.addEventListener("dragleave",() => drop.classList.remove("is-over"));
      drop.addEventListener("drop",event => { event.preventDefault(); drop.classList.remove("is-over"); state.mediaUploadMode = "replace"; if (event.dataTransfer.files[0]) uploadImage(event.dataTransfer.files[0]); });
    }
  }

  function moveSequence(index,direction) {
    state.record = collectForm();
    const next = direction === "up" ? index - 1 : index + 1;
    const nodes = normalizeDetailSequence(state.record);
    [nodes[index],nodes[next]] = [nodes[next],nodes[index]];
    normalizeDetailSequence(state.record,true);
    renderEditor();
    markDirty();
  }
  async function uploadImage(file) {
    try {
      $("[data-save-state]").textContent = "Importing image…";
      state.record = collectForm();
      const owner = state.type === "work" ? state.record.project || "library" : state.record.id;
      const payload = await api("/api/media/import",{ method:"POST", body:file, headers:{ "Content-Type":"application/octet-stream", "X-File-Name":encodeURIComponent(file.name), "X-Owner":owner, "X-Alt-PL":encodeURIComponent(state.record.altPL || ""), "X-Alt-EN":encodeURIComponent(state.record.altEN || "") } });
      const mediaRoot = mediaFor(state.record,state.mediaKey);
      if (mediaRoot.kind === "group") {
        if (state.mediaUploadMode === "add") { mediaRoot.items.push(payload.media); state.mediaItemIndex = mediaRoot.items.length - 1; }
        else mediaRoot.items[state.mediaItemIndex] = payload.media;
        setPath(state.record,state.mediaKey,mediaRoot);
      } else setPath(state.record,state.mediaKey,payload.media);
      state.mediaUploadMode = "replace";
      renderEditor();
      markDirty();
      $("[data-save-state]").textContent = "Imported · save record";
    } catch (error) { showError(error); }
  }

  async function saveCurrent(event) {
    if (event) event.preventDefault();
    try {
      state.record = collectForm();
      $("[data-save-state]").textContent = "Saving…";
      const endpoint = state.type === "site" ? "/api/site" : "/api/entities/" + state.type + "/" + encodeURIComponent(state.id);
      const payload = await api(endpoint,{ method:"PUT", headers:{ "If-Match":state.revision }, body:state.record });
      state.record = payload.record;
      state.revision = payload.revision;
      state.dirty = false;
      $("[data-save-state]").textContent = "Saved & generated";
      await refreshBootstrap();
      renderEditor();
      renderDiagnostics(payload.validation);
    } catch (error) { showError(error); }
  }
  async function duplicateCurrent() {
    try {
      const payload = await api("/api/entities/" + state.type + "/" + state.id + "/duplicate",{ method:"POST", body:{} });
      await refreshBootstrap();
      await openEntity(state.type,payload.record.id);
    } catch (error) { showError(error); }
  }
  async function archiveCurrent() {
    try {
      const preview = await api("/api/entities/" + state.type + "/" + state.id + "/archive/preview");
      if (preview.references.length) {
        renderDiagnostics({ errors:preview.references.map(ref => ({ path:ref.type + "/" + ref.id + "." + ref.field,message:"Remove this reference before archiving." })),warnings:[] });
        return;
      }
      if (!confirm("Archive " + titleOf(state.record) + "? The JSON will move to content/_archive; it will not be deleted.")) return;
      await api("/api/entities/" + state.type + "/" + state.id + "/archive",{ method:"POST",body:{} });
      state.type = state.id = state.record = null;
      await refreshBootstrap();
      $("[data-editor]").hidden = true;
      $("[data-empty]").hidden = false;
      $("[data-save-state]").textContent = "Archived";
    } catch (error) { showError(error); }
  }
  function openArchivedDeleteDialog(id,revision) {
    const archived = (state.bootstrap.archives?.works || []).find(item => item.id === id);
    if (!archived) return;
    state.archiveTarget = { id, revision };
    $("[data-delete-archive-id]").textContent = id;
    const input = $("[data-delete-archive-confirm]");
    input.value = "";
    $("[data-delete-archive-submit]").disabled = true;
    $("[data-delete-archive-dialog]").showModal();
    input.focus();
  }
  async function deleteArchivedWork() {
    if (!state.archiveTarget) return;
    const input = $("[data-delete-archive-confirm]");
    if (input.value !== state.archiveTarget.id) return;
    const submit = $("[data-delete-archive-submit]");
    try {
      submit.disabled = true;
      await api("/api/archives/works/" + encodeURIComponent(state.archiveTarget.id), { method:"DELETE", headers:{ "If-Match":state.archiveTarget.revision }, body:{ confirmId:input.value } });
      $("[data-delete-archive-dialog]").close();
      state.archiveTarget = null;
      await refreshBootstrap();
      $("[data-save-state]").textContent = "Archived record deleted";
    } catch (error) { submit.disabled = false; showError(error); }
  }
  async function openEntity(type,id) {
    if (state.dirty && !confirm("Discard unsaved changes?")) return;
    const payload = type === "site" ? await api("/api/site") : await api("/api/entities/" + type + "/" + encodeURIComponent(id));
    state.managerOpen = false;
    state.type = type;
    state.id = id;
    state.record = payload.record;
    state.revision = payload.revision;
    state.mediaKey = "cover";
    state.mediaItemIndex = 0;
    state.updateBlockIndex = 0;
    state.dirty = false;
    renderLibrary();
    renderEditor();
  }
  async function refreshBootstrap() {
    state.bootstrap = await api("/api/bootstrap");
    renderLibrary();
    renderDiagnostics(state.bootstrap.validation);
  }
  function renderDiagnostics(result) {
    const errors = result && result.errors || [];
    const warnings = result && result.warnings || [];
    $("[data-diagnostics]").innerHTML = !errors.length && !warnings.length ? '<div class="diagnostic ok"><strong>Ready.</strong> No validation problems.</div>' : errors.map(item => '<div class="diagnostic"><strong>' + esc(item.path || "Error") + "</strong><br>" + esc(item.message || item.code) + "</div>").concat(warnings.map(item => '<div class="diagnostic warning"><strong>' + esc(item.path || "Draft warning") + "</strong><br>" + esc(item.message || item.code) + "</div>")).join("");
  }
  function showError(error) {
    $("[data-save-state]").textContent = "Error";
    renderDiagnostics(error.validation || { errors:[{ path:"Studio",message:error.message }],warnings:[] });
  }
  async function createItem(type,titlePL,id) {
    try {
      const payload = await api("/api/entities/" + type,{ method:"POST",body:{titlePL,id} });
      await refreshBootstrap();
      await openEntity(type,payload.record.id);
    } catch (error) { showError(error); }
  }
  async function reorderWork(id,direction) {
    if (state.orderBusy) return;
    if (state.dirty) {
      $("[data-save-state]").textContent = "Save or discard editor changes before reordering works.";
      return;
    }
    const list = state.bootstrap.summaries.works;
    const index = list.findIndex(item => item.id === id);
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= list.length) return;
    const ids = list.map(item => item.id);
    [ids[index],ids[next]] = [ids[next],ids[index]];
    state.orderBusy = true;
    renderLibrary();
    try { await api("/api/order/work",{ method:"PUT",body:{ids} }); await refreshBootstrap(); }
    catch (error) { showError(error); }
    finally { state.orderBusy = false; renderLibrary(); }
  }

  const containerIdentity = item => item.recordType + ":" + item.id;
  function orderedContainerItems() {
    return allContainers()
      .slice()
      .sort((a, b) => Number(a.order) - Number(b.order) || a.id.localeCompare(b.id))
      .map(item => ({ recordType: item.recordType, id: item.id }));
  }
  function setOrderMessage(message) {
    const live = $("[data-order-status]");
    if (live) live.textContent = message;
    $("[data-save-state]").textContent = message;
  }
  function orderIsBlocked() {
    if (state.orderBusy) return true;
    if (!state.dirty) return false;
    setOrderMessage("Save or discard editor changes before reordering projects.");
    return true;
  }
  async function reloadSelectedContainer() {
    if (!["project", "collection"].includes(state.type) || !state.id) return;
    const payload = await api("/api/entities/" + state.type + "/" + encodeURIComponent(state.id));
    state.record = payload.record;
    state.revision = payload.revision;
    state.dirty = false;
  }
  async function persistContainerOrder(items, message) {
    if (orderIsBlocked()) return;
    state.orderBusy = true;
    renderLibrary();
    const editor = $("[data-editor]");
    if (editor) editor.inert = true;
    setOrderMessage("Saving project order…");
    try {
      const payload = await api("/api/order/containers", {
        method: "PUT",
        headers: { "If-Match": state.bootstrap.orderRevision },
        body: { items }
      });
      state.bootstrap.summaries = payload.summaries;
      state.bootstrap.orderRevision = payload.orderRevision;
      state.bootstrap.validation = payload.validation;
      state.bootstrap = await api("/api/bootstrap");
      await reloadSelectedContainer();
      renderDiagnostics(state.bootstrap.validation);
      setOrderMessage(message);
    } catch (error) {
      if (error.status === 412) {
        state.bootstrap = await api("/api/bootstrap");
        await reloadSelectedContainer();
      }
      showError(error);
      setOrderMessage(error.status === 412 ? "Order changed elsewhere · latest order loaded" : "Project order was not changed");
    } finally {
      state.orderBusy = false;
      if (editor) editor.inert = false;
      renderLibrary();
      if (["project", "collection"].includes(state.type) && state.record) renderEditor();
    }
  }
  function moveContainer(type, id, destination) {
    const items = orderedContainerItems();
    const index = items.findIndex(item => item.recordType === type && item.id === id);
    if (index < 0) return null;
    const next = Math.max(0, Math.min(items.length - 1, destination));
    if (next === index) return null;
    const [moved] = items.splice(index, 1);
    items.splice(next, 0, moved);
    return items;
  }
  function moveContainerBy(type, id, direction) {
    const items = orderedContainerItems();
    const index = items.findIndex(item => item.recordType === type && item.id === id);
    const next = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || next < 0 || next >= items.length) return;
    const reordered = moveContainer(type, id, next);
    if (reordered) persistContainerOrder(reordered, "Project order saved");
  }
  function clearContainerDropState() {
    document.querySelectorAll(".container-order-item").forEach(item => item.classList.remove("is-dragging", "drop-before", "drop-after"));
  }

  const libraryWidthLimits = () => ({ minimum:220, maximum:Math.max(220,Math.min(520,window.innerWidth - (window.innerWidth > 1150 ? 826 : 446))) });
  function applyLibraryWidth(value, persist = false) {
    const separator = $("[data-library-resizer]");
    if (!separator) return;
    const limits = libraryWidthLimits();
    const width = clamp(Number(value) || 280,limits.minimum,limits.maximum);
    document.documentElement.style.setProperty("--studio-library-width",width + "px");
    separator.setAttribute("aria-valuemin",String(limits.minimum));
    separator.setAttribute("aria-valuemax",String(limits.maximum));
    separator.setAttribute("aria-valuenow",String(Math.round(width)));
    separator.setAttribute("aria-valuetext",Math.round(width) + " pixels");
    if (persist) store("portfolio:studio:library-width",Math.round(width));
  }
  function initLibraryResizer() {
    const separator = $("[data-library-resizer]");
    if (!separator) return;
    applyLibraryWidth(Number(stored("portfolio:studio:library-width",280)));
    let active = false;
    const move = event => { if (active) applyLibraryWidth(event.clientX); };
    const stop = event => {
      if (!active) return;
      active = false;
      separator.classList.remove("is-resizing");
      applyLibraryWidth(Number(separator.getAttribute("aria-valuenow")),true);
      if (separator.hasPointerCapture?.(event.pointerId)) separator.releasePointerCapture(event.pointerId);
    };
    separator.addEventListener("pointerdown",event => {
      if (matchMedia("(max-width:760px)").matches) return;
      active = true;
      separator.classList.add("is-resizing");
      separator.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    separator.addEventListener("pointermove",move);
    separator.addEventListener("pointerup",stop);
    separator.addEventListener("pointercancel",stop);
    separator.addEventListener("dblclick",() => applyLibraryWidth(280,true));
    separator.addEventListener("keydown",event => {
      const current = Number(separator.getAttribute("aria-valuenow")) || 280;
      const limits = libraryWidthLimits();
      const step = event.shiftKey ? 40 : 10;
      const next = event.key === "ArrowLeft" ? current - step : event.key === "ArrowRight" ? current + step : event.key === "Home" ? limits.minimum : event.key === "End" ? limits.maximum : null;
      if (next == null) return;
      event.preventDefault();
      applyLibraryWidth(next,true);
    });
  }

  document.addEventListener("input",event => autoGrowTextarea(event.target));
  document.addEventListener("change",event => {
    const position = event.target.closest("[data-position]");
    if (!position) return;
    if (orderIsBlocked()) { renderLibrary(); return; }
    const requested = Number(position.value);
    const count = orderedContainerItems().length;
    if (!Number.isInteger(requested) || requested < 1 || requested > count) {
      setOrderMessage("Enter a whole-number position from 1 to " + count + ".");
      renderLibrary();
      return;
    }
    const reordered = moveContainer(position.dataset.type, position.dataset.id, requested - 1);
    if (reordered) persistContainerOrder(reordered, "Moved project to position " + requested);
    else renderLibrary();
  });
  document.addEventListener("dragstart", event => {
    const handle = event.target.closest(".drag-handle");
    const item = handle?.closest(".container-order-item");
    if (!item || orderIsBlocked()) { event.preventDefault(); return; }
    state.draggedContainer = { recordType: item.dataset.containerType, id: item.dataset.containerId };
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", containerIdentity(state.draggedContainer));
    setOrderMessage("Dragging " + item.querySelector(".library-item strong").textContent + ". Drop at the new position.");
  });
  document.addEventListener("dragover", event => {
    if (!state.draggedContainer) return;
    const target = event.target.closest(".container-order-item");
    if (!target) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".container-order-item").forEach(item => item.classList.remove("drop-before", "drop-after"));
    if (target.dataset.containerType === state.draggedContainer.recordType && target.dataset.containerId === state.draggedContainer.id) return;
    const after = event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    target.classList.add(after ? "drop-after" : "drop-before");
  });
  document.addEventListener("drop", event => {
    if (!state.draggedContainer) return;
    const target = event.target.closest(".container-order-item");
    if (!target) { clearContainerDropState(); state.draggedContainer = null; return; }
    event.preventDefault();
    if (target.dataset.containerType === state.draggedContainer.recordType && target.dataset.containerId === state.draggedContainer.id) {
      clearContainerDropState(); state.draggedContainer = null; renderLibrary(); return;
    }
    const items = orderedContainerItems();
    const sourceIndex = items.findIndex(item => containerIdentity(item) === containerIdentity(state.draggedContainer));
    const targetIndex = items.findIndex(item => item.recordType === target.dataset.containerType && item.id === target.dataset.containerId);
    const after = event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    const destination = targetIndex + (after ? 1 : 0) - (sourceIndex < targetIndex ? 1 : 0);
    const dragged = state.draggedContainer;
    clearContainerDropState();
    state.draggedContainer = null;
    const reordered = moveContainer(dragged.recordType, dragged.id, destination);
    if (reordered) persistContainerOrder(reordered, "Project order saved");
    else renderLibrary();
  });
  document.addEventListener("dragend", () => { clearContainerDropState(); state.draggedContainer = null; });
  document.addEventListener("click",event => {
    if (state.orderBusy && event.target.closest("[data-open],[data-create],[data-move],[data-container-move]")) return;
    const open = event.target.closest("[data-open]");
    if (open) openEntity(open.dataset.open,open.dataset.id);
    const move = event.target.closest("[data-move]");
    if (move) reorderWork(move.dataset.id,move.dataset.move);
    const containerMove = event.target.closest("[data-container-move]");
    if (containerMove) moveContainerBy(containerMove.dataset.type,containerMove.dataset.id,containerMove.dataset.containerMove);
    const create = event.target.closest("[data-create]");
    if (create) {
      state.createType = create.dataset.create;
      $("[data-dialog-title]").textContent = "Create " + state.createType;
      $("[data-create-dialog]").showModal();
      autoGrowTextareas($("[data-create-dialog]"));
    }
    const deleteArchive = event.target.closest("[data-delete-archive]");
    if (deleteArchive) openArchivedDeleteDialog(deleteArchive.dataset.deleteArchive,deleteArchive.dataset.revision);
    const manage = event.target.closest("[data-manage]");
    if (manage) {
      state.managerReturnFocus = manage;
      openManager(manage.dataset.manage,{ status:manage.dataset.managerInitialStatus });
    }
    const managerType = event.target.closest("[data-manager-type]");
    if (managerType) {
      state.managerType = managerType.dataset.managerType;
      persistManagerPreferences();
      renderManager();
      $("[data-manager-query]").focus();
    }
    const managerPage = event.target.closest("[data-manager-page]");
    if (managerPage) { managerView().page = Number(managerPage.dataset.managerPage); persistManagerPreferences(); renderManager(); $("[data-manager-list]").focus(); }
    if (event.target.closest("[data-manager-close]")) closeManager();
  });
  $("[data-open-site]").addEventListener("click",() => openEntity("site","site"));
  $("[data-preview-toggle]").addEventListener("click",() => setPreviewDrawer(true));
  $("[data-preview-close]").addEventListener("click",() => setPreviewDrawer(false));
  $("[data-work-search]").addEventListener("input",renderLibrary);
  let managerSearchTimer = 0;
  $("[data-manager-query]").addEventListener("input",event => {
    managerView().query = event.target.value;
    managerView().page = 1;
    persistManagerPreferences();
    clearTimeout(managerSearchTimer);
    managerSearchTimer = setTimeout(renderManager,120);
  });
  $("[data-manager-status]").addEventListener("change",event => { managerView().status = event.target.value; managerView().page = 1; persistManagerPreferences(); renderManager(); });
  $("[data-manager-scope]").addEventListener("change",event => { managerView().scope = event.target.value; managerView().page = 1; persistManagerPreferences(); renderManager(); });
  $("[data-manager-sort]").addEventListener("change",event => { managerView().sort = event.target.value; managerView().page = 1; persistManagerPreferences(); renderManager(); });
  $("[data-manager-per]").addEventListener("change",event => { const per=Number(event.target.value); managerView().per = MANAGER_PER_VALUES.includes(per) ? per : 25; managerView().page = 1; persistManagerPreferences(); renderManager(); });
  $("[data-dialog-cancel]").addEventListener("click",() => $("[data-create-dialog]").close());
  $("[data-dialog-submit]").addEventListener("click",event => {
    event.preventDefault();
    const form = event.target.form;
    if (!form.reportValidity()) return;
    $("[data-create-dialog]").close();
    createItem(state.createType,form.titlePL.value,form.id.value);
    form.reset();
  });
  $("[data-delete-archive-cancel]").addEventListener("click",() => { state.archiveTarget = null; $("[data-delete-archive-dialog]").close(); });
  $("[data-delete-archive-confirm]").addEventListener("input",event => { $("[data-delete-archive-submit]").disabled = !state.archiveTarget || event.target.value !== state.archiveTarget.id; });
  $("[data-delete-archive-submit]").addEventListener("click",deleteArchivedWork);
  $("[data-validate]").addEventListener("click",async () => {
    try { renderDiagnostics(await api("/api/validate",{method:"POST",body:{}})); $("[data-save-state]").textContent = "Validated"; }
    catch (error) { showError(error); }
  });
  $("[data-publish]").addEventListener("click",async () => {
    try {
      $("[data-save-state]").textContent = "Building…";
      const result = await api("/api/publish",{method:"POST",body:{}});
      $("[data-save-state]").textContent = "Build ready · Git unchanged";
      renderDiagnostics(result.validation);
    } catch (error) { showError(error); }
  });
  window.addEventListener("resize",() => window.requestAnimationFrame(() => { autoGrowTextareas($("[data-editor]")); applyLibraryWidth(Number($("[data-library-resizer]")?.getAttribute("aria-valuenow")) || 280); }));
  window.addEventListener("beforeunload",event => { if (!state.dirty) return; event.preventDefault(); event.returnValue = ""; });
  document.addEventListener("keydown",event => {
    if (event.key !== "Escape") return;
    if ($(".preview-panel").classList.contains("is-open")) setPreviewDrawer(false);
    else if (state.managerOpen) closeManager();
  });
  restoreManagerPreferences();
  initLibraryResizer();
  refreshBootstrap().then(() => { $("[data-save-state]").textContent = "Ready"; }).catch(showError);
})();
