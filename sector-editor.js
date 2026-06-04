(function () {
  // Legacy prototype only. The production Sektorarmee editor is integrated in
  // script.js and started from the Infopanel after the Admin warning dialog.
  // Do not load this file from index.html unless it is first reconciled with
  // script.js' draft storage, admin gate, and single active editor state.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const state = {
    enabled: false,
    mode: "view", // view | sector | vertex | curve
    svg: null,
    layers: {},
    nodes: {}, // per-sector DOM nodes
    selectedSectorId: null,
    activeVertex: null,
    dragging: null,
    history: { undo: [], redo: [], max: 60 },
    layerVisibility: { polygon: true, border: true, vertex: false, handles: false },
  };

  // Performance helpers: rAF-batched pointer processing
  let rafPending = false;
  let lastPointerEvent = null;
  const HITBOX_RADIUS_PX = 12; // radius for easier vertex grabbing

  function isAdmin() {
    try {
      return Boolean(window.MapAdminUi?.isAdmin?.() || window.MapAdminUi?.getToken?.());
    } catch (e) {
      return false;
    }
  }

  function init() {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _init);
    else _init();
  }

  function _init() {
    const mount = document.getElementById("sectorArmyEditorMount") || document.body;
    // Only initialize editor controls if admin privileges exist.
    if (!isAdmin()) return;

    createToggleButton();
    createSvgLayer(mount);
    createControlsUI();
    updateModeIndicator();
    renderAllPolygons();
    window.addEventListener("resize", renderAllPolygons);
    window.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("click", (ev) => {
      if (!state.enabled) return;
      if (!ev.target.closest || !ev.target.closest("#sector-editor-svg")) {
        clearSelection();
      }
    });
  }

  function createToggleButton() {
    const btn = document.createElement("button");
    btn.id = "sectorEditorToggle";
    btn.type = "button";
    btn.className = "accent-button sector-editor-toggle";
    btn.textContent = "Sektor-Editor";
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "12px";
    btn.style.zIndex = 99999;
    btn.title = "Admin: Grenzen der Sektorarmeen bearbeiten (Editor)";
    document.body.appendChild(btn);
    btn.addEventListener("click", () => {
      state.enabled = !state.enabled;
      btn.textContent = state.enabled ? "Editor beenden" : "Sektor-Editor";
      if (state.enabled) enableEditor();
      else disableEditor();
    });
  }

  function createSvgLayer(mount) {
    const container = document.querySelector('.viewer-frame') || mount || document.body;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("id", "sector-editor-svg");
    svg.setAttribute("aria-hidden", "false");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "850";
    svg.style.overflow = "visible";

    // Ensure container is positioned so absolute svg overlays correctly
    if (getComputedStyle(container).position === "static") container.style.position = "relative";

    container.appendChild(svg);
    state.svg = svg;

    // global svg pointerdown for hitbox support
    svg.addEventListener('pointerdown', onSvgPointerDown, { passive: false });

    const polygonLayer = document.createElementNS(SVG_NS, "g");
    polygonLayer.setAttribute("data-layer", "sector-polygon-layer");
    const borderLayer = document.createElementNS(SVG_NS, "g");
    borderLayer.setAttribute("data-layer", "sector-border-layer");
    const vertexLayer = document.createElementNS(SVG_NS, "g");
    vertexLayer.setAttribute("data-layer", "sector-vertex-layer");
    const handlesLayer = document.createElementNS(SVG_NS, "g");
    handlesLayer.setAttribute("data-layer", "sector-handle-layer");

    svg.appendChild(polygonLayer);
    svg.appendChild(borderLayer);
    svg.appendChild(vertexLayer);
    svg.appendChild(handlesLayer);

    state.layers.polygon = polygonLayer;
    state.layers.border = borderLayer;
    state.layers.vertex = vertexLayer;
    state.layers.handles = handlesLayer;
    // ensure nodes map is clean
    state.nodes = {};
  }

  function svgSize() {
    if (!state.svg) return { width: 1000, height: 800 };
    const rect = state.svg.getBoundingClientRect();
    return { width: rect.width || 1000, height: rect.height || 800 };
  }

  function applyLayerVisibility() {
    if (!state.layers) return;
    try {
      state.layers.polygon.style.display = state.layerVisibility.polygon ? (state.enabled ? 'block' : 'none') : 'none';
      state.layers.border.style.display = state.layerVisibility.border ? (state.enabled ? 'block' : 'none') : 'none';
      state.layers.vertex.style.display = state.layerVisibility.vertex ? (state.enabled ? 'block' : 'none') : 'none';
      if (state.layers.handles) state.layers.handles.style.display = state.layerVisibility.handles ? (state.enabled ? 'block' : 'none') : 'none';
    } catch (e) {}
  }

  function renderAllPolygons() {
    if (!state.svg || !window.SW_SECTOR_ARMY_TERRITORIES) return;
    state.layers.polygon.innerHTML = "";
    state.layers.border.innerHTML = "";
    state.layers.vertex.innerHTML = "";
    state.nodes = {};

    const { width, height } = svgSize();

    window.SW_SECTOR_ARMY_TERRITORIES.forEach((sector) => {
      const poly = Array.isArray(sector.polygon) ? sector.polygon : [];
      if (!poly.length) return;
      const points = poly.map(([x, y]) => `${x * width},${y * height}`).join(" ");

      // polygon fill
      const polygonEl = document.createElementNS(SVG_NS, "polygon");
      polygonEl.setAttribute("points", points);
      polygonEl.setAttribute("data-sector-id", String(sector.id));
      polygonEl.setAttribute("data-sector-name", String(sector.name));
      polygonEl.classList.add("sector-editor-polygon");
      polygonEl.style.fill = "rgba(255,255,255,0.02)";
      polygonEl.style.stroke = "rgba(255,255,255,0.08)";
      polygonEl.style.strokeWidth = "1";
      polygonEl.style.pointerEvents = "auto"; // allow clicks when editor enabled

      polygonEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!state.enabled) return;
        selectSector(String(sector.id));
      });

      polygonEl.addEventListener('mouseenter', () => {
        if (!state.enabled) return;
        document.body.style.cursor = state.mode === 'sector' ? 'move' : 'pointer';
      });
      polygonEl.addEventListener('mouseleave', () => {
        if (!state.enabled) return;
        document.body.style.cursor = '';
      });

      // allow starting a sector-move when in sector mode
      polygonEl.addEventListener("pointerdown", (ev) => {
        if (!state.enabled) return;
        if (state.mode === "sector" && String(sector.id) === String(state.selectedSectorId)) {
          ev.stopPropagation();
          startSectorPointerDown(ev, String(sector.id));
        }
      });

      state.layers.polygon.appendChild(polygonEl);

      // border (path) - supports straight segments and optional Bézier controls
      const borderEl = document.createElementNS(SVG_NS, "path");
      borderEl.setAttribute("d", computeSectorPathData(sector, width, height));
      borderEl.classList.add("sector-editor-border");
      borderEl.style.fill = "none";
      borderEl.style.stroke = "rgba(255,255,255,0.12)";
      borderEl.style.strokeWidth = "2";
      borderEl.style.display = state.enabled ? "block" : "none";
      borderEl.style.pointerEvents = state.enabled ? "auto" : "none";
      borderEl.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        if (!state.enabled) return;
        if (state.mode === "curve") onBorderDoubleClickForCurve(ev, String(sector.id));
        else onBorderDoubleClick(ev, String(sector.id));
      });
      borderEl.addEventListener('mouseenter', () => {
        if (!state.enabled) return;
        document.body.style.cursor = state.mode === 'curve' ? 'crosshair' : 'default';
      });
      borderEl.addEventListener('mouseleave', () => {
        if (!state.enabled) return;
        document.body.style.cursor = '';
      });
      state.layers.border.appendChild(borderEl);

      // vertices
      const vertexEls = [];
      poly.forEach((pt, idx) => {
        const [x, y] = pt;
        const cx = x * width;
        const cy = y * height;
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", "6");
        circle.setAttribute("data-sector-id", String(sector.id));
        circle.setAttribute("data-vertex-index", String(idx));
        circle.classList.add("sector-editor-vertex");
        circle.style.fill = "#ffffff";
        circle.style.stroke = "rgba(0,0,0,0.4)";
        circle.style.strokeWidth = "1";
        circle.style.display = "none";
        circle.style.pointerEvents = "auto";

        circle.addEventListener("pointerdown", onVertexPointerDown);
        circle.addEventListener("pointerenter", () => { circle.setAttribute("r", "9"); document.body.style.cursor = 'grab'; });
        circle.addEventListener("pointerleave", () => { circle.setAttribute("r", "6"); document.body.style.cursor = ''; });
        circle.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (!state.enabled) return;
          setActiveVertex(String(sector.id), idx);
        });

        state.layers.vertex.appendChild(circle);
        vertexEls.push(circle);
      });

      // create handle elements for curves (only visible in curve mode & when selected)
      const handleEls = [];
      const curves = Array.isArray(sector.curves) ? sector.curves : [];
      for (let ei = 0; ei < poly.length; ei++) {
        const c = curves[ei];
        if (!c || !c.c1 || !c.c2) continue;
        const [c1x, c1y] = [c.c1[0] * width, c.c1[1] * height];
        const [c2x, c2y] = [c.c2[0] * width, c.c2[1] * height];
        const h1 = document.createElementNS(SVG_NS, "circle");
        h1.setAttribute("cx", String(c1x));
        h1.setAttribute("cy", String(c1y));
        h1.setAttribute("r", "5");
        h1.classList.add("sector-editor-handle");
        h1.setAttribute("data-sector-id", String(sector.id));
        h1.setAttribute("data-edge-index", String(ei));
        h1.setAttribute("data-handle", "c1");
        h1.style.display = state.enabled && state.selectedSectorId === String(sector.id) && state.mode === "curve" ? "block" : "none";
        h1.style.pointerEvents = "auto";
        h1.addEventListener("pointerdown", onHandlePointerDown);
        h1.addEventListener('pointerenter', () => { if (state.enabled) document.body.style.cursor = 'grab'; });
        h1.addEventListener('pointerleave', () => { if (state.enabled) document.body.style.cursor = ''; });
        state.layers.handles.appendChild(h1);
        handleEls.push({ edge: ei, which: "c1", el: h1 });

        const h2 = document.createElementNS(SVG_NS, "circle");
        h2.setAttribute("cx", String(c2x));
        h2.setAttribute("cy", String(c2y));
        h2.setAttribute("r", "5");
        h2.classList.add("sector-editor-handle");
        h2.setAttribute("data-sector-id", String(sector.id));
        h2.setAttribute("data-edge-index", String(ei));
        h2.setAttribute("data-handle", "c2");
        h2.style.display = state.enabled && state.selectedSectorId === String(sector.id) && state.mode === "curve" ? "block" : "none";
        h2.style.pointerEvents = "auto";
        h2.addEventListener("pointerdown", onHandlePointerDown);
        h2.addEventListener('pointerenter', () => { if (state.enabled) document.body.style.cursor = 'grab'; });
        h2.addEventListener('pointerleave', () => { if (state.enabled) document.body.style.cursor = ''; });
        state.layers.handles.appendChild(h2);
        handleEls.push({ edge: ei, which: "c2", el: h2 });
      }

      state.nodes[String(sector.id)] = { polygonEl, borderEl, vertexEls, handleEls };
    });
  }

  // --- Interaction helpers -------------------------------------------------

  function getSectorIndexById(id) {
    return (window.SW_SECTOR_ARMY_TERRITORIES || []).findIndex((s) => String(s.id) === String(id));
  }

  function svgPointFromEvent(evt) {
    const rect = state.svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, evt.clientY - rect.top));
    return { x, y, nx: x / Math.max(1, rect.width), ny: y / Math.max(1, rect.height) };
  }

  // Global svg pointerdown to allow hitbox-based vertex grabbing
  function onSvgPointerDown(ev) {
    if (!state.enabled) return;
    // ignore if clicking actual editor elements (they have their own handlers)
    const t = ev.target;
    if (t && t.classList && (t.classList.contains('sector-editor-vertex') || t.classList.contains('sector-editor-handle') || t.classList.contains('sector-editor-border') || t.classList.contains('sector-editor-polygon'))) return;
    if (state.mode !== 'vertex') return;
    const rect = state.svg.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
    const found = findNearestVertexByPixel(px, py, HITBOX_RADIUS_PX);
    if (!found) return;
    ev.preventDefault();
    ev.stopPropagation();
    const { sectorId, index } = found;
    pushHistorySnapshot();
    state.dragging = { sectorId: String(sectorId), index };
    try { state.svg.setPointerCapture(ev.pointerId); } catch (e) {}
    document.addEventListener('pointermove', recordPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: false });
    document.body.style.cursor = 'move';
    setActiveVertex(sectorId, index);
  }

  function findNearestVertexByPixel(px, py, threshold) {
    if (!window.SW_SECTOR_ARMY_TERRITORIES) return null;
    const { width, height } = svgSize();
    let best = { d2: Infinity, sectorId: null, index: -1 };
    window.SW_SECTOR_ARMY_TERRITORIES.forEach((s) => {
      const id = String(s.id);
      (s.polygon || []).forEach((pt, idx) => {
        const x = pt[0] * width;
        const y = pt[1] * height;
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < best.d2) {
          best = { d2, sectorId: id, index: idx };
        }
      });
    });
    if (best.d2 <= threshold * threshold) return { sectorId: best.sectorId, index: best.index };
    return null;
  }

  function recordPointerMove(ev) {
    // store latest event and schedule rAF-driven processor
    try {
      ev.preventDefault();
    } catch (e) {}
    lastPointerEvent = ev;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(performPointerMoves);
    }
  }

  function performPointerMoves() {
    rafPending = false;
    const ev = lastPointerEvent;
    lastPointerEvent = null;
    if (!ev) return;
    // Vertex dragging
    if (state.dragging) {
      const { x, y, nx, ny } = svgPointFromEvent(ev);
      const { sectorId, index } = state.dragging;
      const si = getSectorIndexById(sectorId);
      if (si >= 0) {
        const poly = window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || [];
        poly[index] = [Number(nx.toFixed(6)), Number(ny.toFixed(6))];
        updateSectorVisual(sectorId);
      }
      return;
    }
    // Handle dragging (curves)
    if (state.draggingHandle) {
      const { nx, ny } = svgPointFromEvent(ev);
      const { sectorId, edgeIndex, which } = state.draggingHandle;
      const si = getSectorIndexById(sectorId);
      if (si < 0) return;
      if (!Array.isArray(window.SW_SECTOR_ARMY_TERRITORIES[si].curves)) window.SW_SECTOR_ARMY_TERRITORIES[si].curves = new Array((window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || []).length).fill(null);
      const cur = window.SW_SECTOR_ARMY_TERRITORIES[si].curves[edgeIndex] || { c1: null, c2: null };
      cur[which] = [Number(nx.toFixed(6)), Number(ny.toFixed(6))];
      window.SW_SECTOR_ARMY_TERRITORIES[si].curves[edgeIndex] = cur;
      updateSectorVisual(sectorId);
      return;
    }
    // Sector dragging
    if (state.draggingSector) {
      const { nx, ny } = svgPointFromEvent(ev);
      const { sectorId, startNx, startNy, original } = state.draggingSector;
      const dx = nx - startNx;
      const dy = ny - startNy;
      const si = getSectorIndexById(sectorId);
      if (si < 0) return;
      const newPoly = original.map(([x, y]) => [Number(Math.max(0, Math.min(1, x + dx)).toFixed(6)), Number(Math.max(0, Math.min(1, y + dy)).toFixed(6))]);
      window.SW_SECTOR_ARMY_TERRITORIES[si].polygon = newPoly;
      updateSectorVisual(sectorId);
      return;
    }
  }

  function updateSectorVisual(sectorId) {
    const node = state.nodes[String(sectorId)];
    if (!node) return;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const sector = window.SW_SECTOR_ARMY_TERRITORIES[si];
    const { width, height } = svgSize();
    const points = (sector.polygon || []).map(([x, y]) => `${x * width},${y * height}`).join(" ");
    node.polygonEl.setAttribute("points", points);
    // update border path (may contain curves)
    try {
      const d = computeSectorPathData(sector, width, height);
      node.borderEl.setAttribute("d", d);
    } catch (e) {}
    (node.vertexEls || []).forEach((circle, idx) => {
      const pt = sector.polygon[idx] || [0, 0];
      circle.setAttribute("cx", String(pt[0] * width));
      circle.setAttribute("cy", String(pt[1] * height));
      circle.setAttribute("data-vertex-index", String(idx));
    });
    // update handles positions
    (node.handleEls || []).forEach((h) => {
      const si = getSectorIndexById(sectorId);
      const sec = window.SW_SECTOR_ARMY_TERRITORIES[si];
      const curves = Array.isArray(sec.curves) ? sec.curves : [];
      const c = curves[h.edge];
      if (!c || !c[h.which]) {
        h.el.style.display = "none";
        return;
      }
      const [hx, hy] = [c[h.which][0] * width, c[h.which][1] * height];
      h.el.setAttribute("cx", String(hx));
      h.el.setAttribute("cy", String(hy));
      h.el.style.display = state.enabled && state.selectedSectorId === String(sectorId) && state.mode === "curve" ? "block" : "none";
    });
  }

  function onVertexPointerDown(ev) {
    if (!state.enabled) return;
    ev.preventDefault();
    ev.stopPropagation();
    const circle = ev.currentTarget;
    const sectorId = circle.getAttribute("data-sector-id");
    const index = Number(circle.getAttribute("data-vertex-index"));

    // snapshot for undo
    pushHistorySnapshot();

    state.dragging = { sectorId: String(sectorId), index };
    try {
      circle.setPointerCapture(ev.pointerId);
    } catch (e) {
      // some browsers may not support capture on SVG
    }
    document.addEventListener("pointermove", recordPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: false });
    document.body.style.cursor = "move";
    setActiveVertex(sectorId, index);
  }

  function onPointerMove(ev) {
    if (!state.dragging) return;
    ev.preventDefault();
    const { x, y, nx, ny } = svgPointFromEvent(ev);
    const { sectorId, index } = state.dragging;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const poly = window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || [];
    poly[index] = [Number(nx.toFixed(6)), Number(ny.toFixed(6))];
    updateSectorVisual(sectorId);
  }

  function onPointerUp(ev) {
    if (!state.dragging) return;
    const { sectorId, index } = state.dragging;
    const node = state.nodes[String(sectorId)];
    if (node) {
      const circle = node.vertexEls[index];
      try {
        circle && circle.releasePointerCapture && circle.releasePointerCapture(ev.pointerId);
      } catch (e) {}
    }
    try {
      state.svg && state.svg.releasePointerCapture && state.svg.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    state.dragging = null;
    document.removeEventListener("pointermove", recordPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "";
    saveDraft();
  }

  function setActiveVertex(sectorId, index) {
    state.activeVertex = { sectorId: String(sectorId), index };
    // visual
    Object.values(state.nodes).forEach((node) => {
      (node.vertexEls || []).forEach((c) => c.classList.remove("active"));
    });
    const node = state.nodes[String(sectorId)];
    if (node && node.vertexEls[index]) node.vertexEls[index].classList.add("active");
  }

  function clearSelection() {
    state.selectedSectorId = null;
    state.activeVertex = null;
    state.mode = "view";
    state.layers.vertex.querySelectorAll("*").forEach((el) => (el.style.display = "none"));
    state.layers.polygon.querySelectorAll("polygon").forEach((el) => (el.style.stroke = "rgba(255,255,255,0.08)"));
    const ctrl = document.getElementById("sectorEditorControls");
    if (ctrl) ctrl.style.display = "none";
  }

  function enableEditor() {
    if (!state.svg) return;
    state.enabled = true;
    state.svg.style.pointerEvents = "auto";
    state.layers.border.querySelectorAll("*").forEach((el) => (el.style.display = "block"));
    state.layers.polygon.querySelectorAll("polygon").forEach((el) => (el.style.fill = "rgba(80,160,255,0.06)"));
    const ctrl = document.getElementById("sectorEditorControls");
    if (ctrl) ctrl.style.display = state.selectedSectorId ? "block" : "none";
    applyLayerVisibility();
  }

  function disableEditor() {
    if (!state.svg) return;
    state.enabled = false;
    state.svg.style.pointerEvents = "none";
    state.layers.border.querySelectorAll("*").forEach((el) => (el.style.display = "none"));
    state.layers.vertex.querySelectorAll("*").forEach((el) => (el.style.display = "none"));
    state.layers.polygon.querySelectorAll("polygon").forEach((el) => (el.style.fill = "rgba(255,255,255,0.02)"));
    const ctrl = document.getElementById("sectorEditorControls");
    if (ctrl) ctrl.style.display = "none";
    applyLayerVisibility();
  }

  // --- Controls UI ------------------------------------------------------

  function createControlsUI() {
    if (document.getElementById("sectorEditorControls")) return;
    const container = document.createElement("div");
    container.id = "sectorEditorControls";
    container.className = "sector-editor-controls";
    container.style.position = "fixed";
    container.style.right = "12px";
    container.style.bottom = "64px";
    container.style.zIndex = 99999;
    container.style.display = "none";
    // Mode indicator
    const modeIndicator = document.createElement("div");
    modeIndicator.id = "sectorEditorModeIndicator";
    modeIndicator.className = "sector-editor-mode-indicator";
    modeIndicator.textContent = "Modus: Ansicht";
    modeIndicator.style.marginBottom = "6px";
    container.appendChild(modeIndicator);

    // Layer toggles
    const layerWrap = document.createElement("div");
    layerWrap.className = "sector-editor-layer-toggles";
    layerWrap.style.display = "flex";
    layerWrap.style.gap = "8px";
    layerWrap.style.alignItems = "center";

    function mkCheckbox(id, labelText, checked) {
      const label = document.createElement('label');
      label.style.display = 'inline-flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.checked = !!checked;
      const span = document.createElement('span');
      span.textContent = labelText;
      span.style.fontSize = '0.82rem';
      label.appendChild(cb);
      label.appendChild(span);
      return { label, cb };
    }

    const p = mkCheckbox('sectorEditorTogglePolygons', 'Polygone', state.layerVisibility.polygon);
    const b = mkCheckbox('sectorEditorToggleBorders', 'Ränder', state.layerVisibility.border);
    const v = mkCheckbox('sectorEditorToggleVertices', 'Punkte', state.layerVisibility.vertex);
    const h = mkCheckbox('sectorEditorToggleHandles', 'Handles', state.layerVisibility.handles);
    layerWrap.appendChild(p.label); layerWrap.appendChild(b.label); layerWrap.appendChild(v.label); layerWrap.appendChild(h.label);
    container.appendChild(layerWrap);

    p.cb.addEventListener('change', () => { state.layerVisibility.polygon = p.cb.checked; applyLayerVisibility(); });
    b.cb.addEventListener('change', () => { state.layerVisibility.border = b.cb.checked; applyLayerVisibility(); });
    v.cb.addEventListener('change', () => { state.layerVisibility.vertex = v.cb.checked; applyLayerVisibility(); });
    h.cb.addEventListener('change', () => { state.layerVisibility.handles = h.cb.checked; applyLayerVisibility(); });

    // Toast container
    if (!document.getElementById('sectorEditorToasts')) {
      const toastWrap = document.createElement('div');
      toastWrap.id = 'sectorEditorToasts';
      toastWrap.className = 'sector-editor-toasts';
      toastWrap.style.position = 'fixed';
      toastWrap.style.right = '12px';
      toastWrap.style.bottom = '150px';
      toastWrap.style.zIndex = 100000;
      document.body.appendChild(toastWrap);
    }

    const moveBtn = document.createElement("button");
    moveBtn.id = "sectorEditorMoveBtn";
    moveBtn.className = "accent-button";
    moveBtn.textContent = "Sektor verschieben";
    moveBtn.addEventListener("click", () => {
      if (!state.selectedSectorId) return;
      state.mode = "sector";
      moveBtn.textContent = "Ziehe den Sektor (Esc zum Abbrechen)";
      document.body.style.cursor = "move";
      updateModeIndicator();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger-button";
    deleteBtn.textContent = "Sektor löschen";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.addEventListener("click", () => {
      if (!state.selectedSectorId) return;
      // confirm and delete
      const ok = confirm("Sektor wirklich löschen? Dieser Vorgang entfernt den Sektor dauerhaft.");
      if (!ok) return;
      deleteSector(state.selectedSectorId);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary-button";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.style.marginLeft = "8px";
    cancelBtn.addEventListener("click", () => {
      if (state.draggingSector) cancelSectorDrag();
      state.mode = "vertex";
      document.body.style.cursor = "";
      moveBtn.textContent = "Sektor verschieben";
    });

    const curveBtn = document.createElement("button");
    curveBtn.className = "accent-button";
    curveBtn.textContent = "Kurven bearbeiten";
    curveBtn.style.marginLeft = "8px";
    curveBtn.addEventListener("click", () => {
      if (!state.selectedSectorId) return;
      state.mode = state.mode === "curve" ? "vertex" : "curve";
      curveBtn.textContent = state.mode === "curve" ? "Kurven-Modus: Aktiv" : "Kurven bearbeiten";
      // re-render handles visibility
      renderAllPolygons();
      updateModeIndicator();
    });
    // save-to-server button
    const saveBtn = document.createElement("button");
    saveBtn.id = "sectorEditorSaveBtn";
    saveBtn.className = "accent-button";
    saveBtn.textContent = "Speichern (Server)";
    saveBtn.style.marginLeft = "8px";
    saveBtn.addEventListener("click", () => {
      saveToServer();
    });

    const restoreBtn = document.createElement("button");
    restoreBtn.id = "sectorEditorRestoreBtn";
    restoreBtn.className = "secondary-button";
    restoreBtn.textContent = "Backup wiederherstellen";
    restoreBtn.style.marginLeft = "8px";
    restoreBtn.addEventListener("click", () => {
      openRestoreDialog();
    });

    container.appendChild(restoreBtn);
    container.appendChild(saveBtn);
    container.appendChild(curveBtn);

    container.appendChild(moveBtn);
    container.appendChild(deleteBtn);
    container.appendChild(cancelBtn);
    document.body.appendChild(container);
  }

  function cancelSectorDrag() {
    if (!state.draggingSector) return;
    const { sectorId, original } = state.draggingSector;
    const si = getSectorIndexById(sectorId);
    if (si >= 0) {
      window.SW_SECTOR_ARMY_TERRITORIES[si].polygon = original;
      updateSectorVisual(sectorId);
    }
    try {
      document.removeEventListener("pointermove", recordPointerMove);
      document.removeEventListener("pointerup", onSectorPointerUp);
    } catch (e) {}
    state.draggingSector = null;
    document.body.style.cursor = "";
  }

  function updateModeIndicator() {
    const el = document.getElementById('sectorEditorModeIndicator');
    if (!el) return;
    const m = state.mode || 'view';
    let text = 'Modus: ';
    if (m === 'view') text += 'Ansicht';
    else if (m === 'vertex') text += 'Punkte bearbeiten';
    else if (m === 'sector') text += 'Sektor verschieben';
    else if (m === 'curve') text += 'Kurven bearbeiten';
    el.textContent = text;
  }

  function showToast(msg, kind = 'info', timeout = 3000) {
    try {
      const wrapId = 'sectorEditorToasts';
      let wrap = document.getElementById(wrapId);
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = wrapId;
        wrap.className = 'sector-editor-toasts';
        wrap.style.position = 'fixed';
        wrap.style.right = '12px';
        wrap.style.bottom = '150px';
        wrap.style.zIndex = 100000;
        document.body.appendChild(wrap);
      }
      const t = document.createElement('div');
      t.className = 'sector-editor-toast ' + kind;
      t.textContent = msg;
      t.style.marginTop = '8px';
      t.style.padding = '8px 10px';
      t.style.borderRadius = '8px';
      t.style.background = kind === 'error' ? 'rgba(255,80,80,0.95)' : (kind === 'success' ? 'rgba(40,180,80,0.95)' : 'rgba(40,40,40,0.95)');
      t.style.color = '#fff';
      t.style.fontSize = '0.9rem';
      wrap.appendChild(t);
      setTimeout(() => { try { t.remove(); } catch (e) {} }, timeout);
    } catch (e) {}
  }

  // --- Sector drag handlers --------------------------------------------

  function startSectorPointerDown(ev, sectorId) {
    if (!state.enabled) return;
    ev.preventDefault();
    ev.stopPropagation();
    const { nx, ny } = svgPointFromEvent(ev);
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    pushHistorySnapshot();
    const original = JSON.parse(JSON.stringify(window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || []));
    state.draggingSector = { sectorId: String(sectorId), startNx: nx, startNy: ny, original };
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch (e) {}
    document.addEventListener("pointermove", recordPointerMove, { passive: false });
    document.addEventListener("pointerup", onSectorPointerUp, { passive: false });
  }

  function onSectorPointerMove(ev) {
    if (!state.draggingSector) return;
    ev.preventDefault();
    const { nx, ny } = svgPointFromEvent(ev);
    const { sectorId, startNx, startNy, original } = state.draggingSector;
    const dx = nx - startNx;
    const dy = ny - startNy;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const newPoly = original.map(([x, y]) => [Number(Math.max(0, Math.min(1, x + dx)).toFixed(6)), Number(Math.max(0, Math.min(1, y + dy)).toFixed(6))]);
    window.SW_SECTOR_ARMY_TERRITORIES[si].polygon = newPoly;
    updateSectorVisual(sectorId);
  }

  function onSectorPointerUp(ev) {
    if (!state.draggingSector) return;
    const { sectorId } = state.draggingSector;
    const node = state.nodes[String(sectorId)];
    try {
      if (node && node.polygonEl && node.polygonEl.releasePointerCapture) node.polygonEl.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    try {
      state.svg && state.svg.releasePointerCapture && state.svg.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    state.draggingSector = null;
    document.removeEventListener("pointermove", recordPointerMove);
    document.removeEventListener("pointerup", onSectorPointerUp);
    document.body.style.cursor = "";
    saveDraft();
    state.mode = "vertex";
    const moveBtn = document.getElementById("sectorEditorMoveBtn");
    if (moveBtn) moveBtn.textContent = "Sektor verschieben";
  }

  function deleteSector(sectorId) {
    if (!sectorId) return;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    pushHistorySnapshot();
    saveBackup(sectorId);
    window.SW_SECTOR_ARMY_TERRITORIES.splice(si, 1);
    renderAllPolygons();
    clearSelection();
    saveDraft();
    showToast('Sektor gelöscht', 'success');
  }

  function saveBackup(sectorId) {
    try {
      const ts = Date.now();
      const key = `sector-editor-backup-${sectorId}-${ts}`;
      const payload = { ts, territories: window.SW_SECTOR_ARMY_TERRITORIES };
      localStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem("sector-editor-backup-last", key);
    } catch (e) {}
  }

  function selectSector(id) {
    // Highlight sector and reveal vertices
    if (!state.svg) return;
    state.layers.polygon.querySelectorAll("polygon").forEach((el) => (el.style.stroke = "rgba(255,255,255,0.08)"));
    const selectedNode = state.nodes[String(id)];
    const selected = selectedNode?.polygonEl || state.layers.polygon.querySelector(`polygon[data-sector-id=\"${id}\"]`);
    if (selected) selected.style.stroke = "rgba(255,200,80,0.95)";

    // hide all vertices first
    Object.values(state.nodes).forEach((node) => (node.vertexEls || []).forEach((el) => (el.style.display = "none")));
    if (selectedNode) (selectedNode.vertexEls || []).forEach((el) => (el.style.display = "block"));
    state.selectedSectorId = String(id);
    state.mode = "vertex";
    // show controls UI
    const ctrl = document.getElementById("sectorEditorControls");
    if (ctrl) ctrl.style.display = state.enabled ? "block" : "none";
    const moveBtn = document.getElementById("sectorEditorMoveBtn");
    if (moveBtn) moveBtn.textContent = "Sektor verschieben";
    updateModeIndicator();
  }

  // --- History (undo/redo) -----------------------------------------------

  function pushHistorySnapshot() {
    try {
      const snap = JSON.parse(JSON.stringify(window.SW_SECTOR_ARMY_TERRITORIES || []));
      state.history.undo.push(snap);
      if (state.history.undo.length > state.history.max) state.history.undo.shift();
      state.history.redo = [];
    } catch (e) {
      // ignore
    }
  }

  function undo() {
    if (!state.history.undo.length) return;
    try {
      const prev = state.history.undo.pop();
      const current = JSON.parse(JSON.stringify(window.SW_SECTOR_ARMY_TERRITORIES || []));
      state.history.redo.push(current);
      window.SW_SECTOR_ARMY_TERRITORIES = prev;
      renderAllPolygons();
      saveDraft();
    } catch (e) {}
  }

  function redo() {
    if (!state.history.redo.length) return;
    try {
      const next = state.history.redo.pop();
      const current = JSON.parse(JSON.stringify(window.SW_SECTOR_ARMY_TERRITORIES || []));
      state.history.undo.push(current);
      window.SW_SECTOR_ARMY_TERRITORIES = next;
      renderAllPolygons();
      saveDraft();
    } catch (e) {}
  }

  function onKeyDown(ev) {
    if (!state.enabled) return;
    const key = (ev.key || "").toLowerCase();
    if (key === "escape") {
      // cancel dragging or exit sector mode
      if (state.draggingSector) {
        cancelSectorDrag();
      }
      state.mode = "vertex";
      const moveBtn = document.getElementById("sectorEditorMoveBtn");
      if (moveBtn) moveBtn.textContent = "Sektor verschieben";
      document.body.style.cursor = "";
      updateModeIndicator();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && key === "z") {
      ev.preventDefault();
      undo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (key === "z" || key === "y")) {
      ev.preventDefault();
      redo();
      return;
    }
    if (key === "delete" || key === "del") {
      ev.preventDefault();
      deleteActiveVertex();
      return;
    }
  }

  function deleteActiveVertex() {
    if (!state.activeVertex) return;
    const { sectorId, index } = state.activeVertex;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const poly = window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || [];
    if (poly.length <= 3) {
      showToast('Polygon benötigt mindestens 3 Punkte.', 'error');
      return;
    }
    pushHistorySnapshot();
    poly.splice(index, 1);
    renderAllPolygons();
    selectSector(sectorId);
    saveDraft();
  }

  // --- Add vertex on double-clicked border --------------------------------

  function onBorderDoubleClick(ev, sectorId) {
    const { nx, ny } = svgPointFromEvent(ev);
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const poly = window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || [];
    if (poly.length < 1) return;
    pushHistorySnapshot();
    const insertIndex = findNearestSegmentIndex(poly, nx, ny);
    poly.splice(insertIndex, 0, [Number(nx.toFixed(6)), Number(ny.toFixed(6))]);
    renderAllPolygons();
    selectSector(sectorId);
    setActiveVertex(sectorId, insertIndex);
    saveDraft();
  }

  function onBorderDoubleClickForCurve(ev, sectorId) {
    const { nx, ny } = svgPointFromEvent(ev);
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    const poly = window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || [];
    if (poly.length < 2) return;
    pushHistorySnapshot();
    const insertIndex = findNearestSegmentIndex(poly, nx, ny); // returns insertion index i+1
    const segIndex = (insertIndex - 1 + poly.length) % poly.length;
    const a = poly[segIndex];
    const b = poly[(segIndex + 1) % poly.length];
    const c1 = [Number((a[0] + (b[0] - a[0]) / 3).toFixed(6)), Number((a[1] + (b[1] - a[1]) / 3).toFixed(6))];
    const c2 = [Number((a[0] + 2 * (b[0] - a[0]) / 3).toFixed(6)), Number((a[1] + 2 * (b[1] - a[1]) / 3).toFixed(6))];
    if (!Array.isArray(window.SW_SECTOR_ARMY_TERRITORIES[si].curves)) window.SW_SECTOR_ARMY_TERRITORIES[si].curves = new Array(poly.length).fill(null);
    window.SW_SECTOR_ARMY_TERRITORIES[si].curves[segIndex] = { c1, c2 };
    renderAllPolygons();
    selectSector(sectorId);
    saveDraft();
  }

  function findNearestSegmentIndex(poly, nx, ny) {
    let best = { dist: Infinity, idx: 0 };
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ax = a[0], ay = a[1], bx = b[0], by = b[1];
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy;
      let t = 0;
      if (l2 > 0) t = ((nx - ax) * dx + (ny - ay) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = (px - nx) * (px - nx) + (py - ny) * (py - ny);
      if (d < best.dist) best = { dist: d, idx: i + 1 };
    }
    return best.idx;
  }

  // --- Persistence: lightweight autosave to localStorage --------------------

  function saveDraft() {
    try {
      const key = 'sector-editor-draft-v1';
      const payload = { ts: Date.now(), territories: window.SW_SECTOR_ARMY_TERRITORIES };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {}
  }

  // --- Curve path builder -----------------------------------------------

  function computeSectorPathData(sector, width, height) {
    const poly = Array.isArray(sector.polygon) ? sector.polygon : [];
    const curves = Array.isArray(sector.curves) ? sector.curves : [];
    if (!poly.length) return "";
    let d = "";
    for (let i = 0; i < poly.length; i++) {
      const x = poly[i][0] * width;
      const y = poly[i][1] * height;
      if (i === 0) d += `M ${x},${y}`;
      const j = (i + 1) % poly.length;
      const nx = poly[j][0] * width;
      const ny = poly[j][1] * height;
      const c = curves[i];
      if (c && c.c1 && c.c2) {
        const c1x = c.c1[0] * width;
        const c1y = c.c1[1] * height;
        const c2x = c.c2[0] * width;
        const c2y = c.c2[1] * height;
        d += ` C ${c1x},${c1y} ${c2x},${c2y} ${nx},${ny}`;
      } else {
        d += ` L ${nx},${ny}`;
      }
    }
    d += " Z";
    return d;
  }

  // --- Handle drag logic ------------------------------------------------

  function onHandlePointerDown(ev) {
    if (!state.enabled) return;
    ev.preventDefault();
    ev.stopPropagation();
    const el = ev.currentTarget;
    const sectorId = el.getAttribute("data-sector-id");
    const edgeIndex = Number(el.getAttribute("data-edge-index"));
    const which = el.getAttribute("data-handle");
    pushHistorySnapshot();
    state.draggingHandle = { sectorId: String(sectorId), edgeIndex, which };
    try {
      el.setPointerCapture(ev.pointerId);
    } catch (e) {}
    document.addEventListener("pointermove", recordPointerMove, { passive: false });
    document.addEventListener("pointerup", onHandlePointerUp, { passive: false });
  }

  function onHandlePointerMove(ev) {
    if (!state.draggingHandle) return;
    ev.preventDefault();
    const { nx, ny } = svgPointFromEvent(ev);
    const { sectorId, edgeIndex, which } = state.draggingHandle;
    const si = getSectorIndexById(sectorId);
    if (si < 0) return;
    if (!Array.isArray(window.SW_SECTOR_ARMY_TERRITORIES[si].curves)) window.SW_SECTOR_ARMY_TERRITORIES[si].curves = new Array((window.SW_SECTOR_ARMY_TERRITORIES[si].polygon || []).length).fill(null);
    const cur = window.SW_SECTOR_ARMY_TERRITORIES[si].curves[edgeIndex] || { c1: null, c2: null };
    cur[which] = [Number(nx.toFixed(6)), Number(ny.toFixed(6))];
    window.SW_SECTOR_ARMY_TERRITORIES[si].curves[edgeIndex] = cur;
    updateSectorVisual(sectorId);
  }

  function onHandlePointerUp(ev) {
    if (!state.draggingHandle) return;
    const { sectorId, edgeIndex, which } = state.draggingHandle;
    const node = state.nodes[String(sectorId)];
    if (node) {
      try {
        // try to release pointer capture on the element (may not exist)
        const el = node.handleEls && node.handleEls.find((h) => h.edge === edgeIndex && h.which === which)?.el;
        el && el.releasePointerCapture && el.releasePointerCapture(ev.pointerId);
      } catch (e) {}
    }
    try {
      state.svg && state.svg.releasePointerCapture && state.svg.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    state.draggingHandle = null;
    document.removeEventListener("pointermove", recordPointerMove);
    document.removeEventListener("pointerup", onHandlePointerUp);
    saveDraft();
  }

  // --- Save to server --------------------------------------------------

  async function saveToServer() {
    if (!isAdmin()) {
      showToast('Nur im Adminmodus verfügbar.', 'error');
      return;
    }
    const btn = document.getElementById('sectorEditorSaveBtn');
    const saveUrl = window.SectorEditor && window.SectorEditor.saveUrl ? window.SectorEditor.saveUrl : '/admin/api/sectors/save';
    const token = window.MapAdminUi?.getToken?.();
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Speichern...'; }
      const payload = { ts: Date.now(), territories: window.SW_SECTOR_ARMY_TERRITORIES };
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'x-admin-token': token } : {}),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Server returned error');
      // save succeeded
      try { localStorage.setItem('sector-editor-last-save', JSON.stringify({ ts: Date.now(), server: saveUrl, info: data })); } catch (e) {}
      showToast('Speicherung auf dem Server erfolgreich.', 'success');
    } catch (err) {
      showToast('Speichern fehlgeschlagen: ' + (err && err.message ? err.message : String(err)), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Speichern (Server)'; }
    }
  }

  // --- Restore from server backups UI ---------------------------------
  async function fetchBackupsList() {
    if (!isAdmin()) {
      showToast('Nur im Adminmodus verfügbar.', 'error');
      return [];
    }
    try {
      const token = window.MapAdminUi?.getToken?.();
      const res = await fetch('/admin/api/sectors/backups', { headers: token ? { 'x-admin-token': token } : {} });
      if (!res.ok) throw new Error('failed to fetch');
      const data = await res.json().catch(() => ({}));
      return data && Array.isArray(data.backups) ? data.backups : [];
    } catch (err) {
      showToast('Fehler beim Laden der Backups: ' + (err && err.message ? err.message : String(err)), 'error');
      return [];
    }
  }

  async function fetchBackupFile(name) {
    if (!isAdmin()) {
      showToast('Nur im Adminmodus verfügbar.', 'error');
      return null;
    }
    try {
      const token = window.MapAdminUi?.getToken?.();
      const res = await fetch('/admin/api/sectors/backup/' + encodeURIComponent(name), { headers: token ? { 'x-admin-token': token } : {} });
      if (!res.ok) throw new Error('failed to fetch file');
      const data = await res.json().catch(() => ({}));
      return data && data.data ? data.data : null;
    } catch (err) {
      showToast('Fehler beim Laden des Backups: ' + (err && err.message ? err.message : String(err)), 'error');
      return null;
    }
  }

  function closeRestoreDialog() {
    const d = document.getElementById('sectorEditorRestoreDialog');
    if (d) d.remove();
  }

  async function openRestoreDialog() {
    if (!isAdmin()) {
      showToast('Nur im Adminmodus verfügbar.', 'error');
      return;
    }
    // prevent multiple dialogs
    closeRestoreDialog();
    showToast('Lade Backups...', 'info', 1200);
    const backups = await fetchBackupsList();
    if (!backups || !backups.length) {
      showToast('Keine Backups gefunden.', 'error');
      return;
    }
    const dlg = document.createElement('div');
    dlg.id = 'sectorEditorRestoreDialog';
    dlg.className = 'sector-editor-restore-dialog';
    dlg.style.position = 'fixed';
    dlg.style.right = '12px';
    dlg.style.bottom = '220px';
    dlg.style.zIndex = 100001;
    dlg.style.width = '360px';
    dlg.style.maxHeight = '420px';
    dlg.style.overflow = 'auto';
    dlg.style.padding = '12px';
    dlg.style.background = 'rgba(12,18,26,0.96)';
    dlg.style.border = '1px solid rgba(255,255,255,0.06)';
    dlg.style.borderRadius = '8px';
    dlg.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';

    const title = document.createElement('div');
    title.textContent = 'Backup wiederherstellen';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    dlg.appendChild(title);

    const listWrap = document.createElement('div');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
    listWrap.style.gap = '8px';

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '8px';
    backups.forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      select.appendChild(opt);
    });
    listWrap.appendChild(select);

    const info = document.createElement('div');
    info.style.fontSize = '0.82rem';
    info.style.color = 'rgba(200,220,255,0.75)';
    info.textContent = 'Wähle ein Backup aus und klicke auf Wiederherstellen.';
    listWrap.appendChild(info);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'secondary-button';
    closeBtn.textContent = 'Abbrechen';
    closeBtn.addEventListener('click', () => closeRestoreDialog());

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'accent-button';
    restoreBtn.textContent = 'Wiederherstellen';
    restoreBtn.addEventListener('click', async () => {
      const name = select.value;
      if (!name) return;
      const ok = confirm('Backup ' + name + ' wirklich wiederherstellen? Aktuelle Änderungen gehen verloren.');
      if (!ok) return;
      showToast('Lade Backup...', 'info');
      const data = await fetchBackupFile(name);
      if (!data) return;
      // payload may be { ts, territories } or just territories
      const territories = Array.isArray(data.territories) ? data.territories : (Array.isArray(data) ? data : (data && data.territories ? data.territories : null));
      if (!territories) {
        showToast('Backup-Datei enthält keine Sektor-Daten.', 'error');
        return;
      }
      pushHistorySnapshot();
      window.SW_SECTOR_ARMY_TERRITORIES = territories;
      renderAllPolygons();
      saveDraft();
      showToast('Backup wiederhergestellt.', 'success');
      closeRestoreDialog();
    });

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(restoreBtn);
    listWrap.appendChild(btnRow);
    dlg.appendChild(listWrap);
    document.body.appendChild(dlg);
  }

  // expose public API
  window.SectorEditor = {
    init,
    enable: () => enableEditor(),
    disable: () => disableEditor(),
    render: () => renderAllPolygons(),
    selectSector,
    getState: () => ({ ...state }),
    undo,
    redo,
    saveToServer,
    saveUrl: '/admin/api/sectors/save',
  };

  init();
})();
