(() => {
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 5;
  const ZOOM_STEP = 0.25;

  const labels = {
    close: ["Zamknij", "Close"],
    previous: ["Poprzednia praca", "Previous work"],
    next: ["Następna praca", "Next work"],
    showDetails: ["Pokaż szczegóły", "Show details"],
    hideDetails: ["Ukryj szczegóły", "Hide details"],
    zoomOut: ["Pomniejsz", "Zoom out"],
    zoomReset: ["Dopasuj / resetuj", "Fit / reset"],
    zoomIn: ["Powiększ", "Zoom in"],
    backgroundLight: ["Tło: jasne", "Background: light"],
    backgroundDark: ["Tło: ciemne", "Background: dark"],
    setBackgroundLight: ["Ustaw jasne tło", "Use light background"],
    setBackgroundDark: ["Ustaw ciemne tło", "Use dark background"],
    dialog: ["Powiększony podgląd pracy", "Enlarged work viewer"]
  };

  function createMediaViewer(callbacks = {}) {
    const P = window.Portfolio;
    const root = document.createElement("div");
    root.className = "media-viewer";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.tabIndex = -1;
    root.dataset.sharedViewer = "";
    root.dataset.odId = "shared-media-viewer";
    root.innerHTML = `
      <div class="viewer-stage" data-viewer-stage>
        <div class="viewer-bottom-controls">
          <button class="viewer-nav viewer-nav-prev" type="button" data-viewer-prev>←</button>
          <div class="viewer-zoom-controls" role="group" data-viewer-zoom-group>
            <button type="button" data-viewer-zoom="out">−</button>
            <button type="button" data-viewer-zoom="reset">0</button>
            <button type="button" data-viewer-zoom="in">+</button>
            <output class="viewer-zoom-readout" data-viewer-zoom-readout aria-live="polite">100%</output>
          </div>
          <button class="viewer-nav viewer-nav-next" type="button" data-viewer-next>→</button>
        </div>
        <div class="viewer-top-actions">
          <button type="button" data-viewer-background-toggle hidden></button>
          <button type="button" data-viewer-details aria-expanded="false" aria-controls="shared-viewer-details"></button>
          <button class="viewer-close" type="button" data-viewer-close></button>
        </div>
        <div class="viewer-canvas" data-viewer-canvas>
          <div class="viewer-transform" data-viewer-transform>
            <div class="viewer-artwork" data-viewer-media></div>
          </div>
        </div>
        <aside class="viewer-details" id="shared-viewer-details" data-viewer-details-panel hidden>
          <div><h2 data-viewer-title></h2><p data-viewer-caption></p><div class="sequence-links" data-viewer-links></div><div data-viewer-disclosure></div></div>
          <span class="viewer-counter" data-viewer-counter></span>
        </aside>
      </div>`;
    document.body.append(root);

    const stage = root.querySelector("[data-viewer-stage]");
    const canvas = root.querySelector("[data-viewer-canvas]");
    const transform = root.querySelector("[data-viewer-transform]");
    const mediaRoot = root.querySelector("[data-viewer-media]");
    const zoomGroup = root.querySelector("[data-viewer-zoom-group]");
    const topActions = root.querySelector(".viewer-top-actions");
    const zoomReadout = root.querySelector("[data-viewer-zoom-readout]");
    const detailsPanel = root.querySelector("[data-viewer-details-panel]");
    const detailsButton = root.querySelector("[data-viewer-details]");
    const backgroundButton = root.querySelector("[data-viewer-background-toggle]");
    const closeButton = root.querySelector("[data-viewer-close]");
    const previousButton = root.querySelector("[data-viewer-prev]");
    const nextButton = root.querySelector("[data-viewer-next]");

    let items = [];
    let index = -1;
    let opener = null;
    let openerSelector = "";
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let detailsVisible = false;
    let preferredViewerBackground = (() => {
      try {
        const saved = localStorage.getItem("portfolio:viewer-background");
        return saved === "light" || saved === "dark" ? saved : "dark";
      } catch (_) { return "dark"; }
    })();
    let viewerBackground = preferredViewerBackground;
    let backgroundItemId = "";
    let didPan = false;
    const pointers = new Map();
    let dragOrigin = null;
    let pinchOrigin = null;

    const langIndex = () => P.state.lang === "pl" ? 0 : 1;
    const l = key => labels[key][langIndex()];
    const current = () => items[index] || null;
    const isOpen = () => !root.hidden;
    const isVideo = item => item?.mediaType === "video";
    const isAudioEmbed = item => isVideo(item) && ["soundcloud", "bandcamp"].includes(item?.video?.provider);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function authoredBackground(media) {
      if (!media || typeof media !== "object") return "";
      if (media.viewerBackground === "light" || media.viewerBackground === "dark") return media.viewerBackground;
      if (media.kind === "group") {
        for (const item of media.items || []) {
          const value = authoredBackground(item);
          if (value) return value;
        }
      }
      return "";
    }

    function externalLinks(item) {
      return (item?.externalLinks || []).map(link => {
        const label = P.state.lang === "pl" ? link.labelPL : link.labelEN;
        return `<a href="${P.esc(link.href)}" target="_blank" rel="noopener noreferrer">${P.esc(label)}</a>`;
      }).join("");
    }

    function viewerLinks(item) {
      const href = callbacks.showProjectLink === true ? P.projectHref(item?.project) : "";
      const projectLink = href
        ? `<a data-viewer-project-link href="${P.esc(href)}">${P.esc(P.projectName(item.project))} <span aria-hidden="true">→</span></a>`
        : "";
      return projectLink + externalLinks(item);
    }

    function clampPan() {
      const maxX = Math.max(0, (transform.offsetWidth * zoom - canvas.clientWidth) / 2);
      const maxY = Math.max(0, (transform.offsetHeight * zoom - canvas.clientHeight) / 2);
      panX = clamp(panX, -maxX, maxX);
      panY = clamp(panY, -maxY, maxY);
    }

    function applyTransform() {
      clampPan();
      transform.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
      zoomReadout.value = `${Math.round(zoom * 100)}%`;
      zoomReadout.textContent = zoomReadout.value;
      canvas.classList.toggle("is-zoomed", zoom > 1);
      root.querySelector('[data-viewer-zoom="out"]').disabled = zoom <= ZOOM_MIN;
      root.querySelector('[data-viewer-zoom="in"]').disabled = zoom >= ZOOM_MAX;
    }

    function setViewerBackground(value, persist = true) {
      viewerBackground = value === "light" ? "light" : "dark";
      root.dataset.viewerBackground = viewerBackground;
      if (persist) {
        preferredViewerBackground = viewerBackground;
        try { localStorage.setItem("portfolio:viewer-background", viewerBackground); } catch (_) {}
      }
      updateLabels();
    }

    function setZoom(value, anchor = null) {
      const previousZoom = zoom;
      const nextZoom = clamp(Math.round(value * 100) / 100, ZOOM_MIN, ZOOM_MAX);
      if (anchor && nextZoom !== previousZoom && previousZoom > 0) {
        const bounds = canvas.getBoundingClientRect();
        const pointerX = anchor.x - (bounds.left + bounds.width / 2);
        const pointerY = anchor.y - (bounds.top + bounds.height / 2);
        const scaleChange = nextZoom / previousZoom;
        panX = pointerX - (pointerX - panX) * scaleChange;
        panY = pointerY - (pointerY - panY) * scaleChange;
      }
      zoom = nextZoom;
      if (zoom <= 1) {
        panX = 0;
        panY = 0;
      }
      applyTransform();
    }

    function resetView() {
      zoom = 1;
      panX = 0;
      panY = 0;
      pointers.clear();
      dragOrigin = null;
      pinchOrigin = null;
      didPan = false;
      applyTransform();
    }

    function updateLabels() {
      const item = current();
      root.setAttribute("aria-label", `${l("dialog")}: ${P.text(item)}`);
      closeButton.textContent = l("close");
      closeButton.setAttribute("aria-label", l("close"));
      topActions.dataset.peekLabel = l("close");
      previousButton.setAttribute("aria-label", l("previous"));
      nextButton.setAttribute("aria-label", l("next"));
      detailsButton.textContent = detailsVisible ? l("hideDetails") : l("showDetails");
      detailsButton.setAttribute("aria-expanded", String(detailsVisible));
      backgroundButton.textContent = viewerBackground === "dark" ? l("backgroundDark") : l("backgroundLight");
      backgroundButton.setAttribute("aria-label", viewerBackground === "dark" ? l("setBackgroundLight") : l("setBackgroundDark"));
      backgroundButton.removeAttribute("aria-pressed");
      root.querySelector('[data-viewer-zoom="out"]').setAttribute("aria-label", l("zoomOut"));
      root.querySelector('[data-viewer-zoom="reset"]').setAttribute("aria-label", l("zoomReset"));
      root.querySelector('[data-viewer-zoom="in"]').setAttribute("aria-label", l("zoomIn"));
    }

    function render() {
      const item = current();
      if (!item) return;
      const activeElement = document.activeElement;
      const hadViewerFocus = root.contains(activeElement);
      mediaRoot.innerHTML = P.makeWorkMedia(item, { eager: true, hideDisclosure: true, disclosureMode: "detail" });
      mediaRoot.querySelectorAll("img").forEach(image => { image.draggable = false; });
      root.classList.toggle("is-video", isVideo(item));
      root.classList.toggle("is-audio-embed", isAudioEmbed(item));
      const hasTransparentMedia = !isVideo(item) && P.mediaHasTransparency(item.cover);
      if (item.id !== backgroundItemId) {
        backgroundItemId = item.id;
        setViewerBackground(authoredBackground(item.cover) || preferredViewerBackground, false);
      }
      root.classList.toggle("has-transparent-media", hasTransparentMedia);
      root.dataset.viewerBackground = viewerBackground;
      backgroundButton.hidden = !hasTransparentMedia;
      zoomGroup.hidden = isVideo(item);
      previousButton.hidden = items.length < 2;
      nextButton.hidden = items.length < 2;
      root.querySelector("[data-viewer-title]").textContent = P.text(item);
      root.querySelector("[data-viewer-caption]").textContent = P.field(item, "caption");
      root.querySelector("[data-viewer-links]").innerHTML = viewerLinks(item);
      root.querySelector("[data-viewer-disclosure]").innerHTML = P.mediaDisclosure(item.cover, { disclosureMode: "detail" });
      root.querySelector("[data-viewer-counter]").textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      detailsPanel.hidden = !detailsVisible;
      updateLabels();
      resetView();
      if (hadViewerFocus && (!activeElement.isConnected || activeElement.hidden || activeElement.closest("[hidden]"))) {
        root.focus({ preventScroll: true });
      }
    }

    function selectorFor(item, source) {
      const key = source?.dataset.openWork ? "openWork" : source?.dataset.openSequence ? "openSequence" : "";
      const value = key ? source.dataset[key] : item?.id;
      if (!key || !value) return "";
      const attribute = key === "openWork" ? "data-open-work" : "data-open-sequence";
      return `[${attribute}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
    }

    function open(options = {}) {
      const nextItems = (options.items || []).filter(Boolean);
      if (!nextItems.length) return;
      const requested = options.id ? nextItems.findIndex(item => item.id === options.id) : Number(options.index || 0);
      const nextIndex = requested >= 0 ? requested : 0;
      const wasOpen = isOpen();
      items = nextItems;
      index = clamp(nextIndex, 0, items.length - 1);
      if (!wasOpen) detailsVisible = false;
      if (!wasOpen && options.opener) {
        opener = options.opener;
        openerSelector = selectorFor(current(), options.opener);
      }
      root.hidden = false;
      root.classList.add("open");
      root.classList.remove("ui-near-top", "ui-near-left", "ui-near-right", "ui-near-bottom");
      document.body.classList.add("no-scroll");
      render();
      if (options.notify !== false) callbacks.onActiveChange?.(current());
      if (!wasOpen) root.focus({ preventScroll: true });
    }

    function close(options = {}) {
      if (!isOpen()) return;
      let focusTarget = opener?.isConnected ? opener : openerSelector ? document.querySelector(openerSelector) : null;
      if (!focusTarget) {
        focusTarget = document.querySelector("main");
        if (focusTarget && !focusTarget.hasAttribute("tabindex")) focusTarget.tabIndex = -1;
      }
      root.hidden = true;
      root.classList.remove("open");
      clearUiProximity();
      document.body.classList.remove("no-scroll");
      mediaRoot.innerHTML = "";
      resetView();
      if (options.notify !== false) callbacks.onClose?.();
      focusTarget?.focus?.({ preventScroll: true });
      items = [];
      index = -1;
      opener = null;
      openerSelector = "";
    }

    function step(direction) {
      if (!isOpen() || items.length < 2) return;
      index = (index + direction + items.length) % items.length;
      render();
      callbacks.onActiveChange?.(current());
    }

    root.addEventListener("click", event => {
      const zoomButton = event.target.closest("[data-viewer-zoom]");
      if (zoomButton) {
        if (zoomButton.dataset.viewerZoom === "out") setZoom(zoom - ZOOM_STEP);
        if (zoomButton.dataset.viewerZoom === "reset") resetView();
        if (zoomButton.dataset.viewerZoom === "in") setZoom(zoom + ZOOM_STEP);
        return;
      }
      if (event.target.closest("[data-viewer-close]")) return close();
      if (event.target.closest("[data-viewer-prev]")) return step(-1);
      if (event.target.closest("[data-viewer-next]")) return step(1);
      if (event.target.closest("[data-viewer-background-toggle]")) {
        setViewerBackground(viewerBackground === "dark" ? "light" : "dark");
        return;
      }
      if (event.target.closest("[data-viewer-details]")) {
        detailsVisible = !detailsVisible;
        detailsPanel.hidden = !detailsVisible;
        updateLabels();
        return;
      }
      if (!didPan && (event.target === root || event.target === stage || event.target === canvas)) close();
      didPan = false;
    });

    function clearUiProximity() {
      root.classList.remove("ui-near-top", "ui-near-left", "ui-near-right", "ui-near-bottom");
    }

    stage.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;
      const bounds = stage.getBoundingClientRect();
      root.classList.toggle("ui-near-top", event.clientY - bounds.top <= 112);
      root.classList.toggle("ui-near-left", event.clientX - bounds.left <= 112);
      root.classList.toggle("ui-near-right", bounds.right - event.clientX <= 112);
      root.classList.toggle("ui-near-bottom", bounds.bottom - event.clientY <= 112);
    });
    stage.addEventListener("pointerleave", clearUiProximity);

    canvas.addEventListener("wheel", event => {
      if (isVideo(current()) || event.deltaY === 0) return;
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), { x: event.clientX, y: event.clientY });
    }, { passive: false });

    canvas.addEventListener("dragstart", event => event.preventDefault());

    canvas.addEventListener("pointerdown", event => {
      if (isVideo(current()) || !event.target.closest("[data-viewer-transform]")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      didPan = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
      if (zoom > 1) canvas.classList.add("is-panning");
      if (pointers.size === 1) dragOrigin = { x: event.clientX, y: event.clientY, panX, panY };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchOrigin = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      }
    });

    canvas.addEventListener("pointermove", event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2 && pinchOrigin) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchOrigin.distance > 0) {
          setZoom(pinchOrigin.zoom * distance / pinchOrigin.distance, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
        didPan = true;
        event.preventDefault();
      } else if (pointers.size === 1 && dragOrigin && zoom > 1) {
        panX = dragOrigin.panX + event.clientX - dragOrigin.x;
        panY = dragOrigin.panY + event.clientY - dragOrigin.y;
        didPan = Math.abs(event.clientX - dragOrigin.x) > 3 || Math.abs(event.clientY - dragOrigin.y) > 3;
        applyTransform();
        event.preventDefault();
      }
    });

    function releasePointer(event) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchOrigin = null;
      if (!pointers.size) {
        dragOrigin = null;
        canvas.classList.remove("is-panning");
        if (event.type === "pointercancel") didPan = false;
        else if (didPan) setTimeout(() => { didPan = false; }, 0);
      }
    }
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    document.addEventListener("keydown", event => {
      if (!isOpen()) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); return; }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); return; }
      if (!isVideo(current()) && (event.key === "+" || event.key === "=")) { event.preventDefault(); setZoom(zoom + ZOOM_STEP); return; }
      if (!isVideo(current()) && event.key === "-") { event.preventDefault(); setZoom(zoom - ZOOM_STEP); return; }
      if (!isVideo(current()) && event.key === "0") { event.preventDefault(); resetView(); return; }
      if (event.key === "Tab") {
        const focusable = [...root.querySelectorAll("button, iframe, [href], [tabindex]:not([tabindex='-1'])")]
          .filter(element => !element.disabled && !element.hidden && !element.closest("[hidden]"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (document.activeElement === root || !root.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener("portfolio:language", () => {
      if (isOpen()) render();
    });
    window.addEventListener("resize", () => {
      if (isOpen()) applyTransform();
    });

    return { open, close, step, isOpen, refresh: render, activeId: () => current()?.id || null };
  }

  window.PortfolioViewer = { create: createMediaViewer, limits: { min: ZOOM_MIN, max: ZOOM_MAX } };
})();
