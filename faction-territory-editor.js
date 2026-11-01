(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const LOCAL_DRAFT_KEY = "swmap_faction_territories_v1";
  const DB_NAME = "swmap-faction-assets-v1";
  const DB_STORE = "banners";
  const CLOSE_PATH_DISTANCE_PX = 14;
  const MIN_ANCHOR_SPACING_PX = 18;
  const state = {
    data: null,
    viewer: null,
    width: 0,
    height: 0,
    regionOverlay: null,
    objectOverlay: null,
    regionSvg: null,
    objectSvg: null,
    controlOverlay: null,
    controlSvg: null,
    shell: null,
    canvasHost: null,
    frame: null,
    previousFrameParent: null,
    previousFrameNext: null,
    active: false,
    tool: "select",
    activeFactionId: "republic",
    selectedTerritories: new Set(),
    selectedImages: new Set(),
    selectedNode: null,
    drawingPoints: [],
    drawPointer: null,
    pointerDrag: null,
    history: { undo: [], redo: [], max: 10 },
    territoryBootstrapTimer: 0,
    dirty: false,
    saving: false,
    status: "",
    toastTimer: 0,
    localAssetUrls: new Map(),
    loaded: false,
    assignmentSignature: "",
    dataRevision: 0,
    dataPromise: null,
    clipboard: null,
    sidebarOpen: false,
  };

  const DEFAULT_LAYERS = [
    { id: "territories", type: "territories", name: "Fraktionsgebiete", visible: true, locked: false, opacity: 100, order: 6 },
    { id: "banners", type: "banners", name: "Fraktionsbanner", visible: true, locked: false, opacity: 100, order: 5 },
    { id: "planets", type: "planets", name: "Planeten", visible: true, locked: true, opacity: 100, order: 4 },
    { id: "routes", type: "routes", name: "Hyperraumrouten", visible: true, locked: true, opacity: 100, order: 3 },
    { id: "rims", type: "rims", name: "Rims und Kartenvektoren", visible: true, locked: true, opacity: 100, order: 2 },
    { id: "background", type: "background", name: "Kartenhintergrund", visible: true, locked: true, opacity: 100, order: 1 },
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const numberOr = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function isAdmin() {
    try { return Boolean(window.MapAdminUi?.isAdmin?.()); } catch (_error) { return false; }
  }

  function isLocal() {
    return window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  function normalizeData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const fallbackFactions = [
      { id: "republic", name: "Galaktische Republik", color: "#d65353", secondaryColor: "#ffcf78", scope: "government" },
      { id: "separatist", name: "Konföderation Unabhängiger Systeme", color: "#4d9de0", secondaryColor: "#b5e6ff", scope: "government" },
      { id: "blacksun", name: "Black Sun", color: "#9858d6", secondaryColor: "#e4c3ff", scope: "underworld" },
      { id: "hutt", name: "Huttenkartelle", color: "#c69b36", secondaryColor: "#ffe5a4", scope: "underworld" },
      { id: "pyke", name: "Pyke-Syndikat", color: "#3c9d88", secondaryColor: "#a1f0d6", scope: "underworld" },
      { id: "ohnaka", name: "Ohnaka-Bande", color: "#db7a44", secondaryColor: "#ffd3b5", scope: "underworld" },
    ];
    const factions = (Array.isArray(source.factions) ? source.factions : fallbackFactions).map((entry, index) => {
      const id = String(entry?.id || `faction-${index + 1}`).trim().toLowerCase();
      return {
        id,
        name: String(entry?.name || id).trim(),
        color: /^#[0-9a-f]{6}$/i.test(String(entry?.color || "")) ? entry.color : "#b9c4d4",
        secondaryColor: /^#[0-9a-f]{6}$/i.test(String(entry?.secondaryColor || "")) ? entry.secondaryColor : (entry?.color || "#b9c4d4"),
        bannerUrl: String(entry?.bannerUrl || ""),
        scope: ["government", "underworld", "both"].includes(entry?.scope) ? entry.scope : "both",
        visible: entry?.visible !== false,
        locked: Boolean(entry?.locked),
      };
    });
    const factionIds = new Set(factions.map((entry) => entry.id));
    const territories = (Array.isArray(source.territories) ? source.territories : []).map((entry, index) => {
      const points = (Array.isArray(entry?.points) ? entry.points : []).map((point) => ({
        anchor: {
          x: clamp(numberOr(point?.anchor?.x ?? point?.x), -0.25, 1.25),
          y: clamp(numberOr(point?.anchor?.y ?? point?.y), -0.25, 1.25),
        },
        in: point?.in ? { x: clamp(numberOr(point.in.x), -0.25, 1.25), y: clamp(numberOr(point.in.y), -0.25, 1.25) } : null,
        out: point?.out ? { x: clamp(numberOr(point.out.x), -0.25, 1.25), y: clamp(numberOr(point.out.y), -0.25, 1.25) } : null,
        nodeType: ["smooth", "symmetric", "sharp"].includes(point?.nodeType) ? point.nodeType : "smooth",
      }));
      return {
        id: String(entry?.id || makeId(`territory-${index + 1}`)),
        name: String(entry?.name || `Gebiet ${index + 1}`),
        factionId: factionIds.has(entry?.factionId) ? entry.factionId : factions[0]?.id,
        points,
        closed: entry?.closed !== false,
        fillOpacity: clamp(numberOr(entry?.fillOpacity, 0.25), 0, 1),
        fillColor: /^#[0-9a-f]{6}$/i.test(String(entry?.fillColor || "")) ? entry.fillColor : (factions.find((candidate) => candidate.id === entry?.factionId)?.color || "#d65353"),
        strokeColor: /^#[0-9a-f]{6}$/i.test(String(entry?.strokeColor || "")) ? entry.strokeColor : (factions[0]?.color || "#ffffff"),
        strokeWidth: clamp(numberOr(entry?.strokeWidth, 2), 0.2, 24),
        visible: entry?.visible !== false,
        locked: Boolean(entry?.locked),
        assignmentEnabled: entry?.assignmentEnabled !== false,
        zIndex: numberOr(entry?.zIndex, index),
      };
    });
    const images = (Array.isArray(source.images) ? source.images : []).map((entry, index) => ({
      id: String(entry?.id || makeId(`image-${index + 1}`)),
      name: String(entry?.name || entry?.filename || "Fraktionsgrafik"),
      filename: String(entry?.filename || ""),
      factionId: factionIds.has(entry?.factionId) ? entry.factionId : "",
      layerId: String(entry?.layerId || "banners"),
      url: String(entry?.url || ""),
      x: numberOr(entry?.x, 0.5),
      y: numberOr(entry?.y, 0.5),
      width: clamp(numberOr(entry?.width, 0.06), 0.001, 2),
      height: clamp(numberOr(entry?.height, 0.04), 0.001, 2),
      rotation: numberOr(entry?.rotation, 0),
      opacity: clamp(numberOr(entry?.opacity, 1), 0, 1),
      visible: entry?.visible !== false,
      locked: Boolean(entry?.locked),
      zIndex: numberOr(entry?.zIndex, index),
    }));
    const rawLayers = Array.isArray(source.layers) ? source.layers : DEFAULT_LAYERS;
    const layers = DEFAULT_LAYERS.map((base) => {
      const entry = rawLayers.find((candidate) => candidate?.id === base.id) || base;
      return {
        ...base,
        ...entry,
        id: base.id,
        type: base.type,
        name: String(entry.name || base.name),
        visible: entry.visible !== false,
        locked: Boolean(entry.locked),
        opacity: clamp(numberOr(entry.opacity, base.opacity), 0, 100),
        order: numberOr(entry.order, base.order),
      };
    });
    (Array.isArray(source.layers) ? source.layers : []).filter((entry) => entry?.id && !DEFAULT_LAYERS.some((base) => base.id === entry.id)).forEach((entry, index) => {
      layers.push({
        id: String(entry.id), type: String(entry.type || "banners"), name: String(entry.name || `Grafikebene ${index + 1}`),
        visible: entry.visible !== false, locked: Boolean(entry.locked), opacity: clamp(numberOr(entry.opacity, 100), 0, 100), order: numberOr(entry.order, index + 7),
      });
    });
    const territoryBootstrapFactions = Array.isArray(source.territoryBootstrapFactions)
      ? [...new Set(source.territoryBootstrapFactions.map((id) => String(id || "").trim().toLowerCase()).filter((id) => factionIds.has(id)))]
      : [];
    return { version: 1, factions, territories, images, layers, territoryBootstrapFactions };
  }

  function bezierEllipsePoints(fragment, width, height) {
    const radiusX = numberOr(fragment.ambientRx, fragment.coreRx);
    const radiusY = numberOr(fragment.ambientRy, fragment.coreRy);
    if (!(radiusX > 0) || !(radiusY > 0) || !(width > 0) || !(height > 0)) return [];
    const count = 8;
    const step = Math.PI * 2 / count;
    const handleScale = (4 / 3) * Math.tan(step / 4);
    const cosRotation = Math.cos(numberOr(fragment.angleRad));
    const sinRotation = Math.sin(numberOr(fragment.angleRad));
    return Array.from({ length: count }, (_, index) => {
      const angle = index * step;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const anchorPx = {
        x: fragment.cx + cosRotation * radiusX * cos - sinRotation * radiusY * sin,
        y: fragment.cy + sinRotation * radiusX * cos + cosRotation * radiusY * sin,
      };
      const tangentPx = {
        x: -cosRotation * radiusX * sin - sinRotation * radiusY * cos,
        y: -sinRotation * radiusX * sin + cosRotation * radiusY * cos,
      };
      const toNorm = (point) => ({ x: point.x / width, y: point.y / height });
      return {
        anchor: toNorm(anchorPx),
        in: toNorm({ x: anchorPx.x - tangentPx.x * handleScale, y: anchorPx.y - tangentPx.y * handleScale }),
        out: toNorm({ x: anchorPx.x + tangentPx.x * handleScale, y: anchorPx.y + tangentPx.y * handleScale }),
        nodeType: "smooth",
      };
    });
  }

  function seedCurrentFactionTerritories() {
    if (!state.data || !window.MapAdminApi?.getFactionFragments) return false;
    const fragments = window.MapAdminApi.getFactionFragments();
    if (!Array.isArray(fragments) || !fragments.length) return false;
    const size = window.MapAdminApi.getImageSize?.() || {};
    if (!(size.width > 0) || !(size.height > 0)) return false;
    const mode = window.MapAdminApi.getMapMode?.() === "underworld" ? "underworld" : "government";
    const bootstrapped = new Set(state.data.territoryBootstrapFactions || []);
    let changed = false;
    state.data.factions.filter((entry) => activeScopeMatches(entry, mode)).forEach((meta) => {
      if (bootstrapped.has(meta.id)) return;
      const existing = state.data.territories.some((entry) => entry.factionId === meta.id);
      if (!existing) {
        fragments.filter((fragment) => fragment.faction === meta.id).forEach((fragment, index) => {
          const points = bezierEllipsePoints(fragment, size.width, size.height);
          if (points.length < 3) return;
          const fragmentIndex = numberOr(String(fragment.id || "").match(/(\d+)$/)?.[1], index + 1);
          state.data.territories.push({
            id: `legacy-${meta.id}-${fragmentIndex}`,
            name: `${meta.name} – Gebiet ${fragmentIndex}`,
            factionId: meta.id,
            points,
            closed: true,
            fillOpacity: 0.025,
            fillColor: meta.color,
            strokeColor: meta.color,
            strokeWidth: 2,
            visible: true,
            locked: false,
            assignmentEnabled: false,
            zIndex: Math.max(0, ...state.data.territories.map((entry) => numberOr(entry.zIndex))) + 1,
          });
          changed = true;
        });
      }
      bootstrapped.add(meta.id);
    });
    state.data.territoryBootstrapFactions = [...bootstrapped];
    if (changed) state.assignmentSignature = "";
    return changed;
  }

  async function loadData() {
    let raw = null;
    try {
      const response = await fetch("/api/factions/territories", { cache: "no-store" });
      if (response.ok) raw = (await response.json())?.data;
    } catch (_error) { /* static fallback below */ }
    if (!raw) {
      try {
        const response = await fetch("faction-territories.json", { cache: "no-cache" });
        if (response.ok) raw = await response.json();
      } catch (_error) { /* built-in starter profiles below */ }
    }
    if (isLocal()) {
      try {
        const draft = localStorage.getItem(LOCAL_DRAFT_KEY);
        if (draft) raw = JSON.parse(draft);
      } catch (_error) { /* ignore a corrupt local draft */ }
    }
    state.data = normalizeData(raw);
    registerFactions();
    seedCurrentFactionTerritories();
    state.loaded = true;
    state.dataPromise = null;
    applyLayerSettings();
    syncTerritoryAssignments(true);
    renderMapLayers();
    if (state.active) renderSidebar();
    return state.data;
  }

  function ensureData() {
    if (state.loaded) return Promise.resolve(state.data);
    if (!state.dataPromise) state.dataPromise = loadData();
    return state.dataPromise;
  }

  function layer(id) { return state.data?.layers.find((entry) => entry.id === id) || null; }
  function faction(id) { return state.data?.factions.find((entry) => entry.id === id) || null; }
  function factionColor(id) { return faction(id)?.color || "#d6deeb"; }
  function layerOpacity(id) { return clamp(numberOr(layer(id)?.opacity, 100) / 100, 0, 1); }

  function registerFactions() {
    if (!state.data || !window.MapAdminApi?.registerTerritoryFactions) return;
    window.MapAdminApi.registerTerritoryFactions(state.data.factions);
  }

  function applyLayerSettings() {
    if (!state.data || !window.MapAdminApi?.setEditorLayerVisibility) return;
    ["planets", "routes", "rims", "background"].forEach((id) => {
      const entry = layer(id);
      if (entry) window.MapAdminApi.setEditorLayerVisibility(id, entry.visible);
    });
  }

  function activeScopeMatches(factionMeta, mode) {
    const scope = factionMeta?.scope || "both";
    return scope === "both" || (mode === "underworld" ? scope === "underworld" : scope === "government");
  }

  function pathSamples(points, steps = 32) {
    if (!Array.isArray(points) || points.length < 3) return [];
    const result = [];
    points.forEach((node, index) => {
      const next = points[(index + 1) % points.length];
      const p0 = node.anchor;
      const p1 = node.out || node.anchor;
      const p2 = next.in || next.anchor;
      const p3 = next.anchor;
      for (let step = 0; step < steps; step += 1) {
        const t = step / steps;
        const mt = 1 - t;
        result.push({
          x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
          y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
        });
      }
    });
    return result;
  }

  function pointOnLine(point, a, b) {
    const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) > 1e-9) return false;
    const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
    if (dot < 0) return false;
    const lengthSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    return dot <= lengthSq;
  }

  function pointInPath(point, samples) {
    if (samples.length < 3) return false;
    let inside = false;
    for (let i = 0, j = samples.length - 1; i < samples.length; j = i, i += 1) {
      const a = samples[j];
      const b = samples[i];
      if (pointOnLine(point, a, b)) return true;
      const crosses = (b.y > point.y) !== (a.y > point.y) &&
        point.x < ((a.x - b.x) * (point.y - b.y)) / ((a.y - b.y) || Number.EPSILON) + b.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function syncTerritoryAssignments(force = false) {
    if (!state.data || !window.MapAdminApi?.getMapItems || !window.MapAdminApi?.setTerritoryFactionMap) return;
    const items = window.MapAdminApi.getMapItems();
    const pointItems = items.filter((item) => item.kind !== "route" && item.kind !== "faction" && Number.isFinite(item.x) && Number.isFinite(item.y));
    const itemSignature = pointItems.map((item) => `${item.nameKey}:${item.x.toFixed(6)},${item.y.toFixed(6)}`).join("|");
    const mode = window.MapAdminApi.getMapMode?.() === "underworld" ? "underworld" : "government";
    const signature = `${mode}|${itemSignature}|${state.dataRevision}`;
    if (!force && signature === state.assignmentSignature) return;
    state.assignmentSignature = signature;

    const territories = state.data.territories
      .filter((entry) => entry.assignmentEnabled !== false && entry.closed && entry.points.length >= 3)
      .map((entry, index) => ({ entry, index, samples: pathSamples(entry.points) }))
      .filter(({ entry }) => activeScopeMatches(faction(entry.factionId), mode))
      .sort((a, b) => numberOr(b.entry.zIndex, b.index) - numberOr(a.entry.zIndex, a.index) || b.index - a.index);
    const assignments = new Map();
    const territoryPlanetCounts = new Map();
    pointItems.forEach((item) => {
      const containing = territories.find(({ samples }) => pointInPath({ x: item.x, y: item.y }, samples));
      if (containing) {
        assignments.set(item.nameKey, containing.entry.factionId);
        territoryPlanetCounts.set(containing.entry.id, (territoryPlanetCounts.get(containing.entry.id) || 0) + 1);
      }
    });
    const territoryRegions = territories.map(({ entry, samples }) => ({
      id: entry.id,
      factionId: entry.factionId,
      points: samples,
      visible: entry.visible,
      planetCount: territoryPlanetCounts.get(entry.id) || 0,
    }));
    window.MapAdminApi.setTerritoryFactionMap(assignments, territoryRegions);
  }

  function makeSvgOverlay(viewer, width, height, name, zIndex) {
    const overlay = viewer.htmlOverlay({ scale: width });
    const root = overlay.element();
    root.classList.add(name);
    root.style.zIndex = String(zIndex);
    root.style.pointerEvents = "none";
    const plane = document.createElement("div");
    plane.style.position = "absolute";
    plane.style.left = "0";
    plane.style.top = "0";
    plane.style.width = `${width}px`;
    plane.style.height = `${height}px`;
    plane.style.pointerEvents = "none";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add(name.replace("overlay", "svg"));
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.overflow = "visible";
    plane.appendChild(svg);
    root.appendChild(plane);
    return { overlay, root, svg };
  }

  function attachToViewer() {
    const viewer = window.MapAdminApi?.getViewer?.();
    const size = window.MapAdminApi?.getImageSize?.() || {};
    if (!viewer || !size.width || !size.height || state.viewer === viewer) return;
    state.viewer = viewer;
    state.width = size.width;
    state.height = size.height;
    const regionLayer = makeSvgOverlay(viewer, state.width, state.height, "faction-territory-map-overlay", 1);
    const objectLayer = makeSvgOverlay(viewer, state.width, state.height, "faction-territory-image-overlay", 4);
    const controlLayer = makeSvgOverlay(viewer, state.width, state.height, "faction-territory-controls-overlay", 8);
    state.regionOverlay = regionLayer.overlay;
    state.regionSvg = regionLayer.svg;
    state.objectOverlay = objectLayer.overlay;
    state.objectSvg = objectLayer.svg;
    state.controlOverlay = controlLayer.overlay;
    state.controlSvg = controlLayer.svg;
    state.regionSvg.style.pointerEvents = "none";
    state.objectSvg.style.pointerEvents = "none";
    state.controlSvg.style.pointerEvents = "none";
    state.objectSvg.addEventListener("pointerdown", onObjectPointerDown);
    state.objectSvg.addEventListener("dblclick", onObjectDoubleClick);
    state.controlSvg.addEventListener("pointerdown", onObjectPointerDown);
    state.controlSvg.addEventListener("dblclick", onObjectDoubleClick);
    viewer.element.addEventListener("pointerdown", onCanvasPointerDown, true);
    viewer.addHandler("zoom", updateZoomStatus);
    viewer.addHandler("animation-finish", updateZoomStatus);
    renderMapLayers();
  }

  function createShell() {
    if (state.shell) return;
    const shell = document.createElement("section");
    shell.className = "faction-editor-shell faction-territory-editor-shell";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "true");
    shell.setAttribute("aria-label", "Fraktionsgebiets-Editor");
    shell.innerHTML = `
      <header class="faction-editor-topbar">
        <div class="faction-editor-brand"><span class="faction-editor-mark">✦</span><span class="faction-editor-title">Fraktionsgebiets-Editor</span></div>
        <div class="faction-editor-top-actions">
          <button class="faction-editor-button icon-only" type="button" data-action="undo" title="Rückgängig (Strg+Z)" aria-label="Rückgängig">↶</button>
          <button class="faction-editor-button icon-only" type="button" data-action="redo" title="Wiederholen (Strg+Y)" aria-label="Wiederholen">↷</button>
          <span class="faction-editor-top-spacer"></span>
          <span class="faction-editor-zoom" data-zoom>100%</span>
          <button class="faction-editor-button" type="button" data-action="sidebar" aria-label="Seitenleiste öffnen">Panels</button>
          <button class="faction-editor-button is-primary" type="button" data-action="save">Speichern</button>
          <button class="faction-editor-button icon-only" type="button" data-action="close" title="Editor schließen" aria-label="Editor schließen">×</button>
        </div>
        <span class="faction-editor-save-state" data-save-state>Gespeichert</span>
      </header>
      <div class="faction-editor-main">
        <nav class="faction-editor-toolbar" aria-label="Werkzeuge">
          <button class="faction-editor-tool is-active" type="button" data-tool="select" title="Auswahl (V)" aria-label="Auswahl">↖</button>
          <button class="faction-editor-tool" type="button" data-tool="pen" title="Bézier-Stift (B)" aria-label="Bézier-Stift">⌁</button>
          <button class="faction-editor-tool" type="button" data-tool="node" title="Knotenwerkzeug (N)" aria-label="Knotenwerkzeug">◆</button>
          <button class="faction-editor-tool" type="button" data-tool="transform" title="Transformieren (T)" aria-label="Transformieren">⤢</button>
          <button class="faction-editor-tool" type="button" data-tool="image" title="Bilder auswählen" aria-label="Bildwerkzeug">▧</button>
          <button class="faction-editor-tool" type="button" data-tool="hand" title="Arbeitsfläche verschieben (H)" aria-label="Handwerkzeug">✋</button>
          <span class="faction-editor-tool-divider"></span>
          <button class="faction-editor-tool" type="button" data-action="import-image" title="Banner oder Bild importieren" aria-label="Bild importieren">＋</button>
          <input type="file" accept="image/png,image/webp,image/jpeg" data-image-file hidden />
        </nav>
        <main class="faction-editor-canvas-host" data-canvas-host aria-label="Galaxiekarte"></main>
        <aside class="faction-editor-sidebar" data-sidebar>
          <section class="faction-editor-panel">
            <div class="faction-editor-panel-head"><button class="faction-editor-panel-toggle" type="button" data-panel-toggle="factions" aria-expanded="true">Fraktionen</button><div class="faction-editor-panel-actions"><button class="faction-editor-button icon-only" type="button" data-action="add-faction" title="Fraktion erstellen">＋</button></div></div>
            <div class="faction-editor-panel-content" data-panel-content="factions"><div class="faction-editor-list" data-faction-list></div><div data-faction-properties></div></div>
          </section>
          <section class="faction-editor-panel">
            <div class="faction-editor-panel-head"><button class="faction-editor-panel-toggle" type="button" data-panel-toggle="layers" aria-expanded="true">Ebenen</button><div class="faction-editor-panel-actions"><button class="faction-editor-button icon-only" type="button" data-action="add-layer" title="Grafikebene hinzufügen">＋</button></div></div>
            <div class="faction-editor-panel-content" data-panel-content="layers" data-layer-list></div>
          </section>
          <section class="faction-editor-panel">
            <div class="faction-editor-panel-head"><button class="faction-editor-panel-toggle" type="button" data-panel-toggle="properties" aria-expanded="true">Eigenschaften</button><div class="faction-editor-panel-actions"><button class="faction-editor-button icon-only" type="button" data-action="new-territory" title="Neues Fraktionsgebiet zeichnen">＋</button></div></div>
            <div class="faction-editor-panel-content" data-panel-content="properties" data-properties></div>
          </section>
          <section class="faction-editor-panel">
            <div class="faction-editor-panel-head"><button class="faction-editor-panel-toggle" type="button" data-panel-toggle="view" aria-expanded="true">Ansicht</button></div>
            <div class="faction-editor-panel-content" data-panel-content="view">
              <label class="faction-editor-check"><input type="checkbox" data-option="snap"> An Planeten und Knoten einrasten</label>
              <label class="faction-editor-check"><input type="checkbox" data-option="grid"> Raster anzeigen</label>
              <label class="faction-editor-check"><input type="checkbox" data-option="guides"> Hilfslinien anzeigen</label>
            </div>
          </section>
        </aside>
      </div>
      <footer class="faction-editor-statusbar"><span data-status>Werkzeug: Auswahl</span><span data-selection-info>Keine Auswahl</span></footer>
      <div class="faction-editor-toast" data-toast hidden></div>`;
    document.body.appendChild(shell);
    state.shell = shell;
    state.canvasHost = $("[data-canvas-host]", shell);
    bindShellEvents();
  }

  function bindShellEvents() {
    state.shell.addEventListener("click", (event) => {
      const panelToggle = event.target.closest("[data-panel-toggle]");
      if (panelToggle) {
        const expanded = panelToggle.getAttribute("aria-expanded") !== "true";
        panelToggle.setAttribute("aria-expanded", String(expanded));
        const content = $(`[data-panel-content="${panelToggle.dataset.panelToggle}"]`, state.shell);
        if (content) content.hidden = !expanded;
        return;
      }
      const toolButton = event.target.closest("[data-tool]");
      if (toolButton) { setTool(toolButton.dataset.tool); return; }
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) { void handleAction(actionButton.dataset.action); return; }
      const factionRow = event.target.closest("[data-faction-id]");
      if (factionRow && factionRow.dataset.factionRow === "1") {
        selectFaction(factionRow.dataset.factionId);
        renderSidebar();
        renderMapLayers();
        return;
      }
      const territoryRow = event.target.closest("[data-territory-row]");
      if (territoryRow) { selectTerritory(territoryRow.dataset.territoryRow, event.shiftKey); return; }
      const imageRow = event.target.closest("[data-image-row]");
      if (imageRow) { selectImage(imageRow.dataset.imageRow, event.shiftKey); return; }
      const layerButton = event.target.closest("[data-layer-action]");
      if (layerButton) { void handleLayerAction(layerButton.dataset.layerId, layerButton.dataset.layerAction); return; }
      const nodeAction = event.target.closest("[data-node-action]");
      if (nodeAction) { setSelectedNodeType(nodeAction.dataset.nodeAction); return; }
    });
    state.shell.addEventListener("change", (event) => {
      const input = event.target;
      const value = input.type === "checkbox" ? input.checked : input.value;
      if (input.matches("[data-faction-field]")) updateFactionField(input.dataset.factionField, value);
      else if (input.matches("[data-object-field]")) updateObjectField(input.dataset.objectField, value);
      else if (input.matches("[data-layer-visible]")) updateLayerField(input.dataset.layerVisible, "visible", input.checked);
      else if (input.matches("[data-layer-locked]")) updateLayerField(input.dataset.layerLocked, "locked", input.checked);
      else if (input.matches("[data-layer-opacity]")) updateLayerField(input.dataset.layerOpacity, "opacity", Number(input.value));
      else if (input.matches("[data-option]")) updateCanvasOption(input.dataset.option, input.checked);
      else if (input.matches("[data-image-file]")) void importImageFile(input.files?.[0]);
    });
    window.addEventListener("keydown", handleGlobalKeyboard, true);
  }

  function makeDefaultFaction(name, scope = "both") {
    const slug = String(name || "Neue Fraktion").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fraktion";
    let id = slug;
    let suffix = 2;
    while (state.data.factions.some((entry) => entry.id === id)) { id = `${slug}-${suffix++}`; }
    return { id, name: name || "Neue Fraktion", color: "#8f78d3", secondaryColor: "#d7c8ff", bannerUrl: "", scope, visible: true, locked: false };
  }

  function selectedTerritory() {
    const id = [...state.selectedTerritories][0];
    return state.data?.territories.find((entry) => entry.id === id) || null;
  }

  function enableSelectedTerritoryAssignments() {
    state.selectedTerritories.forEach((id) => {
      const entry = state.data?.territories.find((territory) => territory.id === id);
      if (entry) entry.assignmentEnabled = true;
    });
  }

  function selectedImage() {
    const id = [...state.selectedImages][0];
    return state.data?.images.find((entry) => entry.id === id) || null;
  }

  function selectedObjectCount() { return state.selectedTerritories.size + state.selectedImages.size; }

  function selectedObjectLocked() {
    const territory = selectedTerritory();
    const image = selectedImage();
    return Boolean(territory?.locked || image?.locked || (territory && layer("territories")?.locked) || (image && layer(image.layerId || "banners")?.locked));
  }

  function renderFactionList() {
    const list = $("[data-faction-list]", state.shell);
    list.innerHTML = state.data.factions.map((entry) => `
      <button type="button" class="faction-editor-list-row ${state.activeFactionId === entry.id ? "is-selected" : ""}" data-faction-id="${escapeHtml(entry.id)}" data-faction-row="1">
        <span class="faction-editor-swatch" style="background:${escapeHtml(entry.color)}"></span>
        <span>${escapeHtml(entry.name)}</span>
        <span class="faction-editor-row-end">${state.data.territories.filter((area) => area.factionId === entry.id).length}</span>
      </button>`).join("") || '<div class="faction-editor-empty">Noch keine Fraktionen vorhanden.</div>';
    const entry = faction(state.activeFactionId);
    const panel = $("[data-faction-properties]", state.shell);
    if (!entry) { panel.innerHTML = ""; return; }
    panel.innerHTML = `
      <div class="faction-editor-form">
        <label class="faction-editor-field is-wide">Fraktionsname<input type="text" maxlength="120" data-faction-field="name" value="${escapeHtml(entry.name)}"></label>
        <label class="faction-editor-field">Hauptfarbe<input type="color" data-faction-field="color" value="${escapeHtml(entry.color)}"></label>
        <label class="faction-editor-field">Sekundärfarbe<input type="color" data-faction-field="secondaryColor" value="${escapeHtml(entry.secondaryColor)}"></label>
        <label class="faction-editor-field is-wide">Kartendarstellung<select data-faction-field="scope"><option value="government" ${entry.scope === "government" ? "selected" : ""}>Regierungsfraktionen</option><option value="underworld" ${entry.scope === "underworld" ? "selected" : ""}>Unterwelt</option><option value="both" ${entry.scope === "both" ? "selected" : ""}>Beide Kartenmodi</option></select></label>
        <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-faction-field="visible" ${entry.visible ? "checked" : ""}> Fraktion und Gebiete anzeigen</label>
        <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-faction-field="locked" ${entry.locked ? "checked" : ""}> Fraktion sperren</label>
      </div>
      <div class="faction-editor-property-actions"><button class="faction-editor-button" type="button" data-action="faction-banner">Banner zuweisen</button><button class="faction-editor-button is-danger" type="button" data-action="delete-faction">Löschen</button></div>`;
  }

  function renderLayerList() {
    const panel = $("[data-layer-list]", state.shell);
    const ordered = state.data.layers.slice().sort((a, b) => b.order - a.order);
    panel.innerHTML = ordered.map((entry, index) => `
      <div class="faction-editor-layer">
        <input type="checkbox" data-layer-visible="${escapeHtml(entry.id)}" ${entry.visible ? "checked" : ""} aria-label="${escapeHtml(entry.name)} sichtbar">
        <label title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</label>
        <button type="button" data-layer-id="${escapeHtml(entry.id)}" data-layer-action="lock" title="${entry.locked ? "Entsperren" : "Sperren"}">${entry.locked ? "🔒" : "🔓"}</button>
        <button type="button" data-layer-id="${escapeHtml(entry.id)}" data-layer-action="raise" title="Ebene nach oben" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-layer-id="${escapeHtml(entry.id)}" data-layer-action="lower" title="Ebene nach unten" ${index === ordered.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-layer-id="${escapeHtml(entry.id)}" data-layer-action="rename" title="Ebene umbenennen">✎</button>
        <input class="faction-editor-layer-opacity" type="range" min="0" max="100" step="1" value="${entry.opacity}" data-layer-opacity="${escapeHtml(entry.id)}" aria-label="Deckkraft ${escapeHtml(entry.name)}">
      </div>`).join("");
    const objectList = [
      ...state.data.territories.map((entry) => ({ type: "territory", id: entry.id, name: entry.name, visible: entry.visible, locked: entry.locked, color: factionColor(entry.factionId) })),
      ...state.data.images.map((entry) => ({ type: "image", id: entry.id, name: entry.name, visible: entry.visible, locked: entry.locked, color: factionColor(entry.factionId) })),
    ];
    const rows = objectList.map((entry) => entry.type === "territory"
      ? `<button type="button" class="faction-editor-list-row ${state.selectedTerritories.has(entry.id) ? "is-selected" : ""}" data-territory-row="${escapeHtml(entry.id)}"><span class="faction-editor-swatch" style="background:${escapeHtml(entry.color)}"></span><span>${escapeHtml(entry.name)}</span><span class="faction-editor-row-end">${entry.locked ? "🔒" : ""}</span></button>`
      : `<button type="button" class="faction-editor-list-row ${state.selectedImages.has(entry.id) ? "is-selected" : ""}" data-image-row="${escapeHtml(entry.id)}"><span class="faction-editor-swatch" style="background:${escapeHtml(entry.color)}"></span><span>${escapeHtml(entry.name)}</span><span class="faction-editor-row-end">${entry.locked ? "🔒" : ""}</span></button>`).join("");
    if (objectList.length) panel.insertAdjacentHTML("beforeend", `<div class="faction-editor-muted" style="padding:10px 0 5px">Objekte</div><div class="faction-editor-list">${rows}</div>`);
    if (state.active && window.innerWidth <= 680) $("[data-sidebar]", state.shell).classList.add("is-open");
  }

  function renderProperties() {
    const panel = $("[data-properties]", state.shell);
    const territory = selectedTerritory();
    const image = selectedImage();
    if (territory) {
      const node = state.selectedNode == null ? null : territory.points[state.selectedNode];
      const choices = state.data.factions.map((entry) => `<option value="${escapeHtml(entry.id)}" ${territory.factionId === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("");
      panel.innerHTML = `
        <div class="faction-editor-form">
          <label class="faction-editor-field is-wide">Gebietsname<input type="text" maxlength="120" data-object-field="name" value="${escapeHtml(territory.name)}"></label>
          <label class="faction-editor-field is-wide">Zugehörige Fraktion<select data-object-field="factionId">${choices}</select></label>
          <label class="faction-editor-field">Füllfarbe<input type="color" data-object-field="color" value="${escapeHtml(territory.fillColor || factionColor(territory.factionId))}"></label>
          <label class="faction-editor-field">Umrandung<input type="color" data-object-field="strokeColor" value="${escapeHtml(territory.strokeColor)}"></label>
          <label class="faction-editor-field is-wide">Deckkraft <span data-fill-value>${Math.round(territory.fillOpacity * 100)}%</span><input type="range" min="0" max="100" data-object-field="fillOpacity" value="${Math.round(territory.fillOpacity * 100)}"></label>
          <label class="faction-editor-field">Linienstärke<input type="number" min="0.2" max="24" step="0.2" data-object-field="strokeWidth" value="${territory.strokeWidth}"></label>
          <label class="faction-editor-field">Ankerpunkte<input type="number" readonly value="${territory.points.length}"></label>
          <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-object-field="visible" ${territory.visible ? "checked" : ""}> Sichtbar</label>
          <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-object-field="locked" ${territory.locked ? "checked" : ""}> Gebiet sperren</label>
          ${node ? `<label class="faction-editor-field is-wide">Knotentyp<div class="faction-editor-property-actions"><button class="faction-editor-button ${node.nodeType === "smooth" ? "is-active" : ""}" type="button" data-node-action="smooth">Glatt</button><button class="faction-editor-button ${node.nodeType === "symmetric" ? "is-active" : ""}" type="button" data-node-action="symmetric">Symmetrisch</button><button class="faction-editor-button ${node.nodeType === "sharp" ? "is-active" : ""}" type="button" data-node-action="sharp">Spitz</button></div></label>` : ""}
        </div>
        <div class="faction-editor-property-actions"><button class="faction-editor-button" type="button" data-action="duplicate">Duplizieren</button><button class="faction-editor-button" type="button" data-action="copy">Kopieren</button><button class="faction-editor-button" type="button" data-action="raise-object">Nach oben</button><button class="faction-editor-button is-danger" type="button" data-action="delete-selection">Löschen</button></div>
        <p class="faction-editor-muted">Planeten innerhalb des geschlossenen Pfads erhalten diese Fraktion. Bei Überschneidungen gilt das oberste Gebiet.</p>`;
      return;
    }
    if (image) {
      const choices = `<option value="">Keine Fraktion</option>` + state.data.factions.map((entry) => `<option value="${escapeHtml(entry.id)}" ${image.factionId === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("");
      panel.innerHTML = `
        <div class="faction-editor-form">
          <label class="faction-editor-field is-wide">Grafikname<input type="text" maxlength="160" data-object-field="name" value="${escapeHtml(image.name)}"></label>
          <label class="faction-editor-field is-wide">Fraktion<select data-object-field="factionId">${choices}</select></label>
          <label class="faction-editor-field">Mitte X<input type="number" step="0.001" data-object-field="x" value="${image.x.toFixed(4)}"></label>
          <label class="faction-editor-field">Mitte Y<input type="number" step="0.001" data-object-field="y" value="${image.y.toFixed(4)}"></label>
          <label class="faction-editor-field">Breite<input type="number" min="0.001" max="2" step="0.001" data-object-field="width" value="${image.width.toFixed(4)}"></label>
          <label class="faction-editor-field">Höhe<input type="number" min="0.001" max="2" step="0.001" data-object-field="height" value="${image.height.toFixed(4)}"></label>
          <label class="faction-editor-field">Drehung °<input type="number" step="1" data-object-field="rotation" value="${Math.round(image.rotation)}"></label>
          <label class="faction-editor-field">Deckkraft <span data-image-opacity-value>${Math.round(image.opacity * 100)}%</span><input type="range" min="0" max="100" data-object-field="opacity" value="${Math.round(image.opacity * 100)}"></label>
          <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-object-field="visible" ${image.visible ? "checked" : ""}> Sichtbar</label>
          <label class="faction-editor-check faction-editor-field is-wide"><input type="checkbox" data-object-field="locked" ${image.locked ? "checked" : ""}> Grafik sperren</label>
          <div class="faction-editor-field is-wide"><span class="faction-editor-muted">Datei</span><span>${escapeHtml(image.filename || image.url.split("/").pop())}</span></div>
        </div>
        <div class="faction-editor-property-actions"><button class="faction-editor-button" type="button" data-action="duplicate">Duplizieren</button><button class="faction-editor-button is-danger" type="button" data-action="delete-selection">Löschen</button></div>`;
      return;
    }
    panel.innerHTML = `<div class="faction-editor-empty">Gebiet oder Grafik auswählen, um Eigenschaften zu bearbeiten. Mit dem Bézier-Stift ein Gebiet auf der Karte zeichnen.</div>`;
  }

  function renderSidebar() {
    if (!state.shell || !state.data) return;
    renderFactionList();
    renderLayerList();
    renderProperties();
    updateSelectionStatus();
  }

  function pathData(points, closed = true) {
    if (!Array.isArray(points) || !points.length) return "";
    const first = points[0].anchor;
    let d = `M ${(first.x * state.width).toFixed(2)} ${(first.y * state.height).toFixed(2)}`;
    const segmentCount = closed ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const c1 = current.out || current.anchor;
      const c2 = next.in || next.anchor;
      d += ` C ${(c1.x * state.width).toFixed(2)} ${(c1.y * state.height).toFixed(2)}, ${(c2.x * state.width).toFixed(2)} ${(c2.y * state.height).toFixed(2)}, ${(next.anchor.x * state.width).toFixed(2)} ${(next.anchor.y * state.height).toFixed(2)}`;
    }
    return closed ? `${d} Z` : d;
  }

  function activeMapFactionIds() {
    const mode = window.MapAdminApi?.getMapMode?.() === "underworld" ? "underworld" : "government";
    return new Set(state.data.factions.filter((entry) => entry.visible && activeScopeMatches(entry, mode)).map((entry) => entry.id));
  }

  function renderMapLayers() {
    if (!state.data || !state.regionSvg || !state.objectSvg) return;
    const activeFactionSet = activeMapFactionIds();
    const regionLayer = layer("territories");
    const bannerLayer = layer("banners");
    if (state.regionOverlay?.element) state.regionOverlay.element().style.zIndex = String(1 + numberOr(regionLayer?.order, 6));
    if (state.objectOverlay?.element) state.objectOverlay.element().style.zIndex = String(1 + numberOr(bannerLayer?.order, 5));
    if (state.controlOverlay?.element) {
      const topLayer = Math.max(numberOr(regionLayer?.order, 6), numberOr(bannerLayer?.order, 5));
      state.controlOverlay.element().style.zIndex = String(topLayer + 2);
    }
    const territories = state.data.territories.slice().sort((a, b) => numberOr(a.zIndex) - numberOr(b.zIndex));
    const regionMarkup = territories.map((entry) => {
      const meta = faction(entry.factionId);
      if (!state.active || !state.selectedTerritories.has(entry.id) || !entry.visible || !meta?.visible || !activeFactionSet.has(entry.factionId) || !regionLayer?.visible || entry.points.length < 3 || !entry.closed) return "";
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pathData(entry.points, true));
      path.setAttribute("fill", entry.fillColor || meta.color);
      path.setAttribute("fill-opacity", String(entry.fillOpacity * layerOpacity("territories")));
      path.setAttribute("stroke", entry.strokeColor || meta.color);
      path.setAttribute("stroke-width", String(entry.strokeWidth));
      path.setAttribute("stroke-opacity", String(layerOpacity("territories")));
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("class", "faction-territory-path");
      path.dataset.territoryId = entry.id;
      path.dataset.factionId = entry.factionId;
      path.setAttribute("pointer-events", "none");
      return path;
    });
    state.regionSvg.replaceChildren(...regionMarkup.filter(Boolean));

    const imageMarkup = [];
    if (bannerLayer?.visible) {
      state.data.images.slice().sort((a, b) => numberOr(a.zIndex) - numberOr(b.zIndex)).forEach((entry) => {
        const imageLayer = layer(entry.layerId || "banners");
        if (!entry.visible || !imageLayer?.visible || (!activeFactionSet.has(entry.factionId) && entry.factionId) || !entry.url) return;
        const image = document.createElementNS(SVG_NS, "image");
        image.setAttribute("x", String((entry.x - entry.width / 2) * state.width));
        image.setAttribute("y", String((entry.y - entry.height / 2) * state.height));
        image.setAttribute("width", String(entry.width * state.width));
        image.setAttribute("height", String(entry.height * state.height));
        image.setAttribute("preserveAspectRatio", "none");
        image.setAttribute("opacity", String(entry.opacity * layerOpacity(imageLayer.id)));
        image.setAttribute("transform", `rotate(${entry.rotation} ${entry.x * state.width} ${entry.y * state.height})`);
        image.setAttribute("href", resolvedImageUrl(entry.url));
        image.setAttribute("class", "faction-editor-object faction-banner-image");
        image.dataset.imageId = entry.id;
        image.dataset.factionId = entry.factionId;
        image.setAttribute("pointer-events", state.active ? "visiblePainted" : "none");
        imageMarkup.push(image);
      });
    }
    if (state.active && layer("territories")?.visible) {
      territories.forEach((entry) => {
        if (!entry.points.length || !entry.visible) return;
        const meta = faction(entry.factionId);
        if (!meta?.visible) return;
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", pathData(entry.points, entry.closed));
        path.setAttribute("fill", "rgba(0,0,0,0.001)");
        path.setAttribute("stroke", "transparent");
        path.setAttribute("stroke-width", "24");
        path.setAttribute("pointer-events", "all");
        path.setAttribute("class", "faction-editor-object faction-editor-hit-area");
        path.dataset.territoryId = entry.id;
        imageMarkup.unshift(path);
      });
    }
    state.objectSvg.replaceChildren(...imageMarkup);
    if (state.active) renderEditorControls();
    if (!state.pointerDrag) syncTerritoryAssignments();
  }

  function makeSvgElement(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      element.setAttribute(key, String(value));
    });
    return element;
  }

  function overlayScale() {
    return window.MapAdminApi?.getScreenScale?.() || 1;
  }

  function allSelectedPoints() {
    const coords = [];
    state.selectedTerritories.forEach((id) => {
      const entry = state.data.territories.find((item) => item.id === id);
      if (!entry) return;
      entry.points.forEach((node) => {
        coords.push(node.anchor);
        if (node.in) coords.push(node.in);
        if (node.out) coords.push(node.out);
      });
    });
    state.selectedImages.forEach((id) => {
      const entry = state.data.images.find((item) => item.id === id);
      if (!entry) return;
      coords.push({ x: entry.x - entry.width / 2, y: entry.y - entry.height / 2 });
      coords.push({ x: entry.x + entry.width / 2, y: entry.y + entry.height / 2 });
    });
    return coords;
  }

  function selectionBounds() {
    const points = allSelectedPoints();
    if (!points.length) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    return { left, top, right, bottom, width: Math.max(0.002, right - left), height: Math.max(0.002, bottom - top), cx: (left + right) / 2, cy: (top + bottom) / 2 };
  }

  function renderEditorControls() {
    if (!state.active || !state.objectSvg) return;
    const scale = Math.max(overlayScale(), 0.00001);
    const controls = [];
    if ($('[data-option="grid"]', state.shell)?.checked) {
      for (let step = 1; step < 20; step += 1) {
        const x = state.width * step / 20;
        const y = state.height * step / 20;
        controls.push(makeSvgElement("line", { x1: x, y1: 0, x2: x, y2: state.height, stroke: "#c5d7e622", "stroke-width": 1 / scale, "pointer-events": "none" }));
        controls.push(makeSvgElement("line", { x1: 0, y1: y, x2: state.width, y2: y, stroke: "#c5d7e622", "stroke-width": 1 / scale, "pointer-events": "none" }));
      }
    }
    if ($('[data-option="guides"]', state.shell)?.checked) {
      controls.push(makeSvgElement("line", { x1: state.width / 2, y1: 0, x2: state.width / 2, y2: state.height, stroke: "#85cdf355", "stroke-width": 1 / scale, "stroke-dasharray": `${5 / scale} ${5 / scale}`, "pointer-events": "none" }));
      controls.push(makeSvgElement("line", { x1: 0, y1: state.height / 2, x2: state.width, y2: state.height / 2, stroke: "#85cdf355", "stroke-width": 1 / scale, "stroke-dasharray": `${5 / scale} ${5 / scale}`, "pointer-events": "none" }));
    }
    if (state.tool === "pen" && state.drawingPoints.length) {
      const draftPoints = state.drawingPoints.concat(state.drawPreview ? [{ anchor: state.drawPreview, in: null, out: null }] : []);
      const draftPath = pathData(draftPoints, false);
      const dashPattern = `${5 / scale} ${4 / scale}`;
      controls.push(makeSvgElement("path", {
        d: draftPath,
        fill: "none", stroke: "#07111b", "stroke-width": 8 / scale,
        "stroke-linecap": "round", "stroke-linejoin": "round",
        "pointer-events": "none", class: "faction-editor-draft-halo",
      }));
      controls.push(makeSvgElement("path", {
        d: draftPath,
        fill: "none", stroke: "#f5f8ff", "stroke-width": 4.5 / scale,
        "stroke-linecap": "round", "stroke-linejoin": "round",
        "pointer-events": "none", class: "faction-editor-draft-outline",
      }));
      controls.push(makeSvgElement("path", {
        d: draftPath,
        fill: "none", stroke: "#ffd45a", "stroke-width": 2.5 / scale,
        "stroke-dasharray": dashPattern, "stroke-linecap": "round", "stroke-linejoin": "round",
        "pointer-events": "none", class: "faction-editor-draft-path",
      }));
      state.drawingPoints.forEach((node, index) => {
        const cx = node.anchor.x * state.width;
        const cy = node.anchor.y * state.height;
        controls.push(makeSvgElement("circle", {
          cx, cy, r: 10 / scale, fill: "#101820", stroke: "#fff", "stroke-width": 2.5 / scale,
          "pointer-events": "none", class: "faction-editor-draft-point-ring",
        }));
        controls.push(makeSvgElement("circle", {
          cx, cy, r: (index === 0 ? 5.5 : 4.5) / scale,
          fill: index === 0 ? "#ffd45a" : factionColor(state.activeFactionId),
          stroke: "#101820", "stroke-width": 1.5 / scale, "pointer-events": "none", class: "faction-editor-draft-point",
        }));
      });
    }
    if (state.lastSnap) {
      controls.push(makeSvgElement("circle", { cx: state.lastSnap.x * state.width, cy: state.lastSnap.y * state.height, r: 9 / scale, fill: "none", stroke: "#ffe08a", "stroke-width": 1.5 / scale, "pointer-events": "none" }));
    }
    const territory = selectedTerritory();
    if (territory && state.selectedTerritories.size > 0 && ["node", "transform"].includes(state.tool)) {
      if (state.tool === "node") {
        if (state.selectedTerritories.size === 1) territory.points.forEach((node, index) => {
          const anchor = node.anchor;
          if (node.in || node.out) {
            [node.in, node.out].forEach((handle, handleIndex) => {
              if (!handle) return;
              controls.push(makeSvgElement("line", {
                x1: anchor.x * state.width, y1: anchor.y * state.height,
                x2: handle.x * state.width, y2: handle.y * state.height,
                stroke: "#badcf2", "stroke-width": 1 / scale, "pointer-events": "none",
              }));
              controls.push(makeSvgElement("circle", {
                cx: handle.x * state.width, cy: handle.y * state.height, r: 7 / scale,
                fill: handleIndex === 0 ? "#f6c76a" : "#74c5ef", stroke: "#14202b", "stroke-width": 1.5 / scale,
                class: "faction-editor-object", "data-node-index": index, "data-handle-key": handleIndex === 0 ? "in" : "out",
              }));
            });
          }
          controls.push(makeSvgElement("circle", {
            cx: anchor.x * state.width, cy: anchor.y * state.height,
            r: 17 / scale, fill: "transparent", stroke: "none", class: "faction-editor-object",
            "data-node-index": index, "data-node-anchor": "1",
          }));
          controls.push(makeSvgElement("circle", {
            cx: anchor.x * state.width, cy: anchor.y * state.height,
            r: (state.selectedNode === index ? 6.5 : 4.5) / scale,
            fill: state.selectedNode === index ? "#fff18d" : "#ffffff", stroke: "#253342", "stroke-width": 1.5 / scale,
            "pointer-events": "none",
          }));
        });
      } else {
        const bounds = selectionBounds();
        if (bounds) {
          controls.push(makeSvgElement("rect", {
            x: bounds.left * state.width, y: bounds.top * state.height,
            width: bounds.width * state.width, height: bounds.height * state.height,
            fill: "none", stroke: "#9de0ff", "stroke-width": 1.2 / scale,
            "stroke-dasharray": `${4 / scale} ${3 / scale}`, "pointer-events": "none",
          }));
          const corners = [
            ["nw", bounds.left, bounds.top], ["ne", bounds.right, bounds.top],
            ["se", bounds.right, bounds.bottom], ["sw", bounds.left, bounds.bottom],
          ];
          corners.forEach(([key, x, y]) => controls.push(makeSvgElement("rect", {
            x: x * state.width - 5 / scale, y: y * state.height - 5 / scale,
            width: 10 / scale, height: 10 / scale, fill: "#f4fbff", stroke: "#287eaa", "stroke-width": 1.2 / scale,
            class: "faction-editor-object", "data-transform-handle": key,
          })));
          const rotY = bounds.top * state.height - 28 / scale;
          controls.push(makeSvgElement("line", {
            x1: bounds.cx * state.width, y1: bounds.top * state.height,
            x2: bounds.cx * state.width, y2: rotY, stroke: "#9de0ff", "stroke-width": 1 / scale, "pointer-events": "none",
          }));
          controls.push(makeSvgElement("circle", {
            cx: bounds.cx * state.width, cy: rotY, r: 6 / scale, fill: "#9de0ff", stroke: "#17344a", "stroke-width": 1 / scale,
            class: "faction-editor-object", "data-transform-handle": "rotate",
          }));
        }
      }
    }
    state.controlSvg.replaceChildren(...controls);
  }

  function resolvedImageUrl(url) {
    if (!url.startsWith("local-banner:")) return url;
    if (state.localAssetUrls.has(url)) return state.localAssetUrls.get(url);
    const id = url.slice("local-banner:".length);
    void loadLocalBanner(id).then((blob) => {
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      state.localAssetUrls.set(url, objectUrl);
      renderMapLayers();
    });
    return "";
  }

  function openAssetDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Bildspeicher konnte nicht geöffnet werden."));
    });
  }

  async function saveLocalBanner(id, file) {
    const db = await openAssetDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(file, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Banner konnte lokal nicht gespeichert werden."));
    });
    db.close();
  }

  async function loadLocalBanner(id) {
    try {
      const db = await openAssetDb();
      const result = await new Promise((resolve, reject) => {
        const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return result;
    } catch (_error) { return null; }
  }

  function pushHistory() {
    if (!state.data) return;
    state.history.undo.push(clone(state.data));
    if (state.history.undo.length > state.history.max) state.history.undo.shift();
    state.history.redo.length = 0;
    state.dirty = true;
    updateSaveState();
  }

  function restoreData(snapshot) {
    state.data = normalizeData(snapshot);
    registerFactions();
    applyLayerSettings();
    syncTerritoryAssignments(true);
    renderMapLayers();
    renderSidebar();
    markDirty();
  }

  function undo() {
    if (!state.history.undo.length) { showToast("Nichts zum Rückgängigmachen."); return; }
    state.history.redo.push(clone(state.data));
    state.data = normalizeData(state.history.undo.pop());
    registerFactions();
    applyLayerSettings();
    syncTerritoryAssignments(true);
    renderMapLayers();
    renderSidebar();
    markDirty();
  }

  function redo() {
    if (!state.history.redo.length) { showToast("Nichts zum Wiederherstellen."); return; }
    state.history.undo.push(clone(state.data));
    state.data = normalizeData(state.history.redo.pop());
    registerFactions();
    applyLayerSettings();
    syncTerritoryAssignments(true);
    renderMapLayers();
    renderSidebar();
    markDirty();
  }

  function markDirty() {
    state.dirty = true;
    state.dataRevision += 1;
    updateSaveState();
    renderMapLayers();
    updateSelectionStatus();
    if (isLocal()) {
      try { localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(state.data)); } catch (_error) { /* save remains available through the button */ }
    }
  }

  function updateSaveState(error = "") {
    if (!state.shell) return;
    const label = $("[data-save-state]", state.shell);
    label.textContent = error ? "Speichern fehlgeschlagen" : state.saving ? "Speichert …" : state.dirty ? "Ungespeicherte Änderungen" : "Gespeichert";
    label.classList.toggle("is-dirty", state.dirty && !error);
    label.classList.toggle("is-error", Boolean(error));
    const saveButton = $("[data-action=save]", state.shell);
    if (saveButton) saveButton.disabled = state.saving || !isAdmin();
    if (error) label.title = error;
  }

  async function saveData() {
    if (!isAdmin()) { showToast("Speichern ist nur mit Admin-Zugang möglich.", true); return; }
    if (state.saving) return;
    state.saving = true;
    updateSaveState();
    const payload = clone(state.data);
    try {
      if (isLocal()) {
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
      } else {
        const token = window.MapAdminUi?.getToken?.() || "";
        const response = await fetch("/api/factions/territories", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: payload }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        state.data = normalizeData(result.data || payload);
      }
      state.dirty = false;
      state.status = "Gebiete, Fraktionen und Grafiken dauerhaft gespeichert.";
      registerFactions();
      renderMapLayers();
      renderSidebar();
      updateSaveState();
      showToast(isLocal() ? "Lokal im Browser gespeichert." : "Änderungen dauerhaft gespeichert.");
    } catch (error) {
      state.saving = false;
      updateSaveState(String(error?.message || error));
      showToast(`Speichern fehlgeschlagen: ${error?.message || error}`, true);
      return;
    }
    state.saving = false;
    updateSaveState();
  }

  function showToast(message, isError = false) {
    if (!state.shell) return;
    const toast = $("[data-toast]", state.shell);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.toggle("is-error", isError);
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
    state.status = message;
    updateStatusText();
  }

  function setTool(tool) {
    if (!["select", "pen", "node", "transform", "image", "hand"].includes(tool)) return;
    state.tool = tool;
    state.selectedNode = null;
    if (tool === "image") state.selectedTerritories.clear();
    $$("[data-tool]", state.shell).forEach((button) => button.classList.toggle("is-active", button.dataset.tool === tool));
    renderMapLayers();
    updateStatusText();
    renderProperties();
  }

  function setEditorActive(active) {
    if (active && !isAdmin()) { showToast("Dieser Editor ist nur für Administratoren verfügbar.", true); return; }
    if (active) {
      createShell();
      void ensureData().then(() => {
        attachToViewer();
        seedCurrentFactionTerritories();
        const mode = window.MapAdminApi?.getMapMode?.() === "underworld" ? "underworld" : "government";
        if (!activeScopeMatches(faction(state.activeFactionId), mode)) {
          state.activeFactionId = state.data.factions.find((entry) => activeScopeMatches(entry, mode))?.id || state.data.factions[0]?.id;
        }
        selectFaction(state.activeFactionId);
        state.active = true;
        window.MapAdminApi?.setFactionTerritoryEditorActive?.(true);
        state.shell.classList.add("is-open");
        state.frame = document.querySelector(".viewer-frame");
        if (state.frame && state.canvasHost && state.frame.parentElement !== state.canvasHost) {
          state.previousFrameParent = state.frame.parentElement;
          state.previousFrameNext = state.frame.nextSibling;
          state.canvasHost.appendChild(state.frame);
        }
        state.viewer = window.MapAdminApi?.getViewer?.() || state.viewer;
        state.viewer?.setMouseNavEnabled?.(true);
        state.sidebarOpen = true;
        if (window.innerWidth <= 680) $("[data-sidebar]", state.shell).classList.add("is-open");
        setTool("select");
        renderSidebar();
        renderMapLayers();
        updateSaveState();
        updateZoomStatus();
        state.shell.focus?.();
        window.requestAnimationFrame(() => {
          state.viewer?.forceResize?.();
          renderMapLayers();
          updateZoomStatus();
        });
      });
      return;
    }
    if (!state.active) return;
    if (state.dirty && !window.confirm("Es gibt ungespeicherte Änderungen. Editor trotzdem schließen?")) return;
    state.active = false;
    window.MapAdminApi?.setFactionTerritoryEditorActive?.(false);
    state.drawingPoints = [];
    state.pointerDrag = null;
    state.shell.classList.remove("is-open");
    if (state.frame && state.previousFrameParent) {
      if (state.previousFrameNext?.parentNode === state.previousFrameParent) state.previousFrameParent.insertBefore(state.frame, state.previousFrameNext);
      else state.previousFrameParent.appendChild(state.frame);
      state.previousFrameParent = null;
      state.previousFrameNext = null;
    }
    renderMapLayers();
    window.requestAnimationFrame(() => {
      state.viewer?.forceResize?.();
      renderMapLayers();
      updateZoomStatus();
    });
  }

  function updateStatusText() {
    if (!state.shell) return;
    const label = $("[data-status]", state.shell);
    const tools = { select: "Auswahl", pen: "Bézier-Stift", node: "Knoten", transform: "Transformation", image: "Bild", hand: "Hand" };
    label.textContent = state.status || `Werkzeug: ${tools[state.tool] || state.tool}`;
  }

  function updateSelectionStatus() {
    if (!state.shell) return;
    const parts = [];
    if (state.selectedTerritories.size) parts.push(`${state.selectedTerritories.size} Gebiet${state.selectedTerritories.size === 1 ? "" : "e"}`);
    if (state.selectedImages.size) parts.push(`${state.selectedImages.size} Grafik${state.selectedImages.size === 1 ? "" : "en"}`);
    if (state.selectedNode != null) parts.push(`Knoten ${state.selectedNode + 1}`);
    $("[data-selection-info]", state.shell).textContent = parts.join(" · ") || (state.drawingPoints.length ? `${state.drawingPoints.length} Ankerpunkte – Klick auf den ersten Punkt schließt den Pfad` : "Keine Auswahl");
  }

  function updateZoomStatus() {
    if (!state.shell || !state.viewer) return;
    const zoom = state.viewer.viewport?.getZoom?.(true) || 1;
    const home = state.viewer.viewport?.getHomeZoom?.() || 1;
    $("[data-zoom]", state.shell).textContent = `${Math.round((zoom / home) * 100)}%`;
  }

  function selectTerritory(id, additive = false) {
    const entry = state.data.territories.find((item) => item.id === id);
    if (!entry) return;
    if (!additive) { state.selectedTerritories.clear(); state.selectedImages.clear(); }
    if (additive && state.selectedTerritories.has(id)) state.selectedTerritories.delete(id);
    else state.selectedTerritories.add(id);
    state.selectedNode = null;
    state.activeFactionId = entry.factionId;
    renderMapLayers();
    renderSidebar();
  }

  function selectFaction(id) {
    state.activeFactionId = id;
    state.selectedTerritories = new Set(state.data.territories.filter((entry) => entry.factionId === id).map((entry) => entry.id));
    state.selectedImages.clear();
    state.selectedNode = null;
  }

  function selectImage(id, additive = false) {
    const entry = state.data.images.find((item) => item.id === id);
    if (!entry) return;
    if (!additive) { state.selectedImages.clear(); state.selectedTerritories.clear(); }
    if (additive && state.selectedImages.has(id)) state.selectedImages.delete(id);
    else state.selectedImages.add(id);
    state.selectedNode = null;
    if (entry.factionId) state.activeFactionId = entry.factionId;
    renderMapLayers();
    renderSidebar();
  }

  async function handleAction(action) {
    switch (action) {
      case "close": setEditorActive(false); break;
      case "save": await saveData(); break;
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "sidebar": {
        state.sidebarOpen = !state.sidebarOpen;
        $("[data-sidebar]", state.shell).classList.toggle("is-open", state.sidebarOpen);
        break;
      }
      case "add-faction": {
        if (!isAdmin()) return;
        pushHistory();
        const next = makeDefaultFaction(`Neue Fraktion ${state.data.factions.length + 1}`);
        state.data.factions.push(next);
        state.activeFactionId = next.id;
        registerFactions(); markDirty(); renderSidebar();
        break;
      }
      case "delete-faction": {
        const current = faction(state.activeFactionId);
        if (!current || state.data.factions.length <= 1) { showToast("Mindestens eine Fraktion muss bestehen bleiben."); return; }
        if (!window.confirm(`Fraktion „${current.name}“ und ihre Gebiete löschen?`)) return;
        pushHistory();
        state.data.factions = state.data.factions.filter((entry) => entry.id !== current.id);
        state.data.territories = state.data.territories.filter((entry) => entry.factionId !== current.id);
        state.data.images = state.data.images.filter((entry) => entry.factionId !== current.id);
        state.data.territoryBootstrapFactions = (state.data.territoryBootstrapFactions || []).filter((id) => id !== current.id);
        if (state.pendingFactionBanner === current.id) state.pendingFactionBanner = "";
        state.selectedTerritories.clear(); state.selectedImages.clear();
        state.activeFactionId = state.data.factions[0].id;
        registerFactions(); markDirty(); renderSidebar();
        break;
      }
      case "faction-banner": {
        state.pendingFactionBanner = state.activeFactionId;
        $("[data-image-file]", state.shell).click();
        break;
      }
      case "import-image":
        $("[data-image-file]", state.shell).click();
        break;
      case "add-layer": addGraphicsLayer(); break;
      case "new-territory":
        if (!isAdmin()) return;
        state.selectedTerritories.clear(); state.selectedImages.clear(); state.selectedNode = null;
        state.drawingPoints = [];
        setTool("pen");
        showToast(`Gebiet für ${faction(state.activeFactionId)?.name || "die gewählte Fraktion"} zeichnen. Mindestens drei Ankerpunkte setzen und den ersten Punkt anklicken.`);
        renderSidebar();
        break;
      case "delete-selection": deleteSelection(); break;
      case "duplicate": duplicateSelection(); break;
      case "copy": copySelection(); break;
      case "raise-object": raiseSelectedObject(); break;
      case "raise": raiseSelectedObject(); break;
      case "lower": lowerSelectedObject(); break;
    }
  }

  function updateFactionField(key, value) {
    const entry = faction(state.activeFactionId);
    if (!entry || entry.locked || !isAdmin()) return;
    pushHistory();
    entry[key] = key === "visible" || key === "locked" ? Boolean(value) : value;
    if (key === "name" && !entry.name.trim()) entry.name = "Unbenannte Fraktion";
    registerFactions();
    markDirty();
    renderSidebar();
  }

  function updateObjectField(key, rawValue) {
    const territory = selectedTerritory();
    const image = selectedImage();
    const entry = territory || image;
    if (!entry || selectedObjectLocked() || !isAdmin()) return;
    pushHistory();
    let value = rawValue;
    if (["visible", "locked"].includes(key)) value = Boolean(rawValue);
    else if (["x", "y", "width", "height", "rotation", "opacity", "fillOpacity", "strokeWidth"].includes(key)) value = Number(rawValue);
    if (key === "color" && territory) {
      territory.fillColor = value;
    } else if (territory) {
      if (key === "factionId") {
        entry.factionId = state.data.factions.some((candidate) => candidate.id === value) ? value : state.activeFactionId;
        state.activeFactionId = entry.factionId;
        territory.assignmentEnabled = true;
        territory.fillColor = factionColor(entry.factionId);
        territory.strokeColor = factionColor(entry.factionId);
      } else if (key === "fillOpacity") territory.fillOpacity = clamp(value / 100, 0, 1);
      else if (key === "strokeWidth") territory.strokeWidth = clamp(value, 0.2, 24);
      else if (key in territory) territory[key] = value;
    } else if (image) {
      if (key === "width" || key === "height") image[key] = clamp(value, 0.001, 2);
      else if (key === "opacity") image.opacity = clamp(value / 100, 0, 1);
      else if (key === "rotation") image.rotation = value;
      else if (key === "factionId") image.factionId = state.data.factions.some((candidate) => candidate.id === value) ? value : "";
      else if (key in image) image[key] = value;
    }
    registerFactions();
    markDirty();
    renderSidebar();
  }

  function updateLayerField(id, key, value) {
    const entry = layer(id);
    if (!entry || (entry.locked && !["locked", "visible"].includes(key)) || !isAdmin()) return;
    pushHistory();
    entry[key] = value;
    if (["planets", "routes", "rims", "background"].includes(id) && key === "visible") {
      window.MapAdminApi?.setEditorLayerVisibility?.(id, value);
    }
    markDirty();
    renderSidebar();
  }

  function updateCanvasOption(key, enabled) {
    state.shell.dataset[key] = enabled ? "1" : "0";
    if (key === "grid" || key === "guides") renderMapLayers();
  }

  function handleLayerAction(id, action) {
    const entry = layer(id);
    if (!entry || !isAdmin()) return;
    if (action === "lock") {
      pushHistory(); entry.locked = !entry.locked; markDirty(); renderSidebar(); return;
    }
    if (action === "rename") {
      const name = window.prompt("Neuer Ebenenname", entry.name);
      if (name == null || !name.trim()) return;
      pushHistory(); entry.name = name.trim().slice(0, 120); markDirty(); renderSidebar(); return;
    }
    if (action === "raise" || action === "lower") {
      pushHistory();
      const ordered = state.data.layers.slice().sort((a, b) => b.order - a.order);
      const index = ordered.findIndex((item) => item.id === id);
      const other = ordered[index + (action === "raise" ? -1 : 1)];
      if (other) [entry.order, other.order] = [other.order, entry.order];
      markDirty(); renderSidebar();
    }
  }

  function addGraphicsLayer() {
    const number = state.data.layers.filter((entry) => entry.type === "banners").length + 1;
    const entry = { id: `graphics-${number}`, type: "banners", name: `Grafikebene ${number}`, visible: true, locked: false, opacity: 100, order: Math.max(...state.data.layers.map((item) => item.order)) + 1 };
    pushHistory();
    state.data.layers.push(entry);
    state.activeGraphicsLayerId = entry.id;
    markDirty(); renderSidebar();
    showToast(`${entry.name} wurde hinzugefügt.`);
  }

  function handleCanvasPoint(event) {
    const imagePoint = window.MapAdminApi?.screenToImage?.(event.clientX, event.clientY);
    if (!imagePoint || !Number.isFinite(imagePoint.x) || !Number.isFinite(imagePoint.y)) return null;
    const point = { x: clamp(imagePoint.x, -0.25, 1.25), y: clamp(imagePoint.y, -0.25, 1.25) };
    state.lastSnap = null;
    if (!$("[data-option='snap']", state.shell)?.checked || !state.data) return point;
    const snapPoints = [];
    (window.MapAdminApi?.getMapItems?.() || []).forEach((item) => {
      if (item.kind !== "route" && item.kind !== "faction" && Number.isFinite(item.x) && Number.isFinite(item.y)) snapPoints.push({ x: item.x, y: item.y });
    });
    state.data.territories.forEach((entry) => entry.points.forEach((node) => snapPoints.push(node.anchor)));
    const scale = overlayScale();
    let nearest = null;
    snapPoints.forEach((candidate) => {
      const distance = Math.hypot((candidate.x - point.x) * state.width * scale, (candidate.y - point.y) * state.height * scale);
      if (distance <= 12 && (!nearest || distance < nearest.distance)) nearest = { point: candidate, distance };
    });
    if (!nearest) return point;
    state.lastSnap = { x: nearest.point.x, y: nearest.point.y };
    return { x: nearest.point.x, y: nearest.point.y };
  }

  function beginDraw(event, point) {
    if (!isAdmin() || layer("territories")?.locked || faction(state.activeFactionId)?.locked) return;
    const first = state.drawingPoints[0]?.anchor;
    const scale = overlayScale();
    if (state.drawingPoints.length >= 3 && first) {
      const distance = Math.hypot((point.x - first.x) * state.width * scale, (point.y - first.y) * state.height * scale);
      if (distance <= CLOSE_PATH_DISTANCE_PX) { completeDrawing(); return; }
    }
    const overlappingPoint = state.drawingPoints.find((node) => {
      const distance = Math.hypot(
        (point.x - node.anchor.x) * state.width * scale,
        (point.y - node.anchor.y) * state.height * scale
      );
      return distance < MIN_ANCHOR_SPACING_PX;
    });
    if (overlappingPoint) {
      showToast(`Ankerpunkte brauchen mindestens ${MIN_ANCHOR_SPACING_PX} Pixel Abstand.`, true);
      updateSelectionStatus();
      return;
    }
    const anchor = { x: point.x, y: point.y };
    state.drawingPoints.push({ anchor, in: null, out: null, nodeType: "smooth" });
    state.drawPointer = { id: event.pointerId, origin: point, moved: false };
    event.target.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", onDrawPointerMove, true);
    document.addEventListener("pointerup", onDrawPointerUp, true);
    renderMapLayers();
    updateSelectionStatus();
  }

  function onDrawPointerMove(event) {
    if (!state.drawPointer || event.pointerId !== state.drawPointer.id) return;
    const point = handleCanvasPoint(event);
    if (!point) return;
    const delta = { x: point.x - state.drawPointer.origin.x, y: point.y - state.drawPointer.origin.y };
    const pxDelta = Math.hypot(delta.x * state.width * overlayScale(), delta.y * state.height * overlayScale());
    if (pxDelta > 3) state.drawPointer.moved = true;
    state.drawPointer.current = point;
    state.drawPointer.delta = delta;
    state.drawPointer.pxDelta = pxDelta;
    state.drawPointer.preview = point;
    state.drawPreview = point;
    renderEditorControls();
  }

  function onDrawPointerUp(event) {
    if (!state.drawPointer || event.pointerId !== state.drawPointer.id) return;
    document.removeEventListener("pointermove", onDrawPointerMove, true);
    document.removeEventListener("pointerup", onDrawPointerUp, true);
    const draw = state.drawPointer;
    state.drawPointer = null;
    if (draw.moved && state.drawingPoints.length) {
      const node = state.drawingPoints[state.drawingPoints.length - 1];
      const delta = draw.delta || { x: 0, y: 0 };
      node.out = { x: clamp(node.anchor.x + delta.x, -0.25, 1.25), y: clamp(node.anchor.y + delta.y, -0.25, 1.25) };
      node.in = { x: clamp(node.anchor.x - delta.x, -0.25, 1.25), y: clamp(node.anchor.y - delta.y, -0.25, 1.25) };
      node.nodeType = "symmetric";
    }
    state.drawPointer = null;
    state.drawPreview = null;
    renderMapLayers();
  }

  function completeDrawing() {
    if (state.drawingPoints.length < 3) { showToast("Ein geschlossenes Gebiet braucht mindestens drei Ankerpunkte.", true); return; }
    const meta = faction(state.activeFactionId);
    if (!meta || !isAdmin()) return;
    pushHistory();
    const count = state.data.territories.filter((entry) => entry.factionId === meta.id).length + 1;
    const territory = {
      id: makeId("territory"),
      name: `${meta.name} – Gebiet ${count}`,
      factionId: meta.id,
      points: clone(state.drawingPoints),
      closed: true,
      fillOpacity: 0.25,
      fillColor: meta.color,
      strokeColor: meta.color,
      strokeWidth: 2,
      visible: true,
      locked: false,
      zIndex: Math.max(0, ...state.data.territories.map((entry) => entry.zIndex + 1)),
    };
    state.data.territories.push(territory);
    state.drawingPoints = [];
    state.selectedTerritories = new Set([territory.id]);
    state.selectedImages.clear();
    state.selectedNode = null;
    state.tool = "node";
    $$("[data-tool]", state.shell).forEach((button) => button.classList.toggle("is-active", button.dataset.tool === "node"));
    markDirty();
    renderSidebar();
    showToast(`„${territory.name}“ geschlossen. Anker und Béziergriffe lassen sich jetzt bearbeiten.`);
  }

  function onCanvasPointerDown(event) {
    if (!state.active || event.button === 1 || state.tool === "hand") return;
    const target = event.target;
    if (event.button !== 0) return;
    if (state.tool === "pen") {
      const point = handleCanvasPoint(event);
      if (!point) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      beginDraw(event, point);
      return;
    }
    if (target?.closest?.("[data-territory-id], [data-image-id], [data-node-index], [data-transform-handle]")) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
    state.selectedTerritories.clear();
    state.selectedImages.clear();
    state.selectedNode = null;
    state.drawingPoints = [];
    renderMapLayers();
    renderSidebar();
  }

  function onObjectPointerDown(event) {
    if (!state.active || event.button !== 0) return;
    const target = event.target;
    const transformHandle = target.closest?.("[data-transform-handle]");
    const nodeElement = target.closest?.("[data-node-index]");
    const territoryElement = target.closest?.("[data-territory-id]");
    const imageElement = target.closest?.("[data-image-id]");
    if (!transformHandle && !nodeElement && !territoryElement && !imageElement) return;
    if (!isAdmin()) return;
    event.preventDefault(); event.stopPropagation();
    if (transformHandle) {
      if (selectedObjectLocked()) return;
      const bounds = selectionBounds();
      if (!bounds) return;
      beginObjectDrag(event, { kind: transformHandle.dataset.transformHandle === "rotate" ? "rotate" : "scale", handle: transformHandle.dataset.transformHandle, bounds });
      return;
    }
    if (nodeElement && state.tool === "node") {
      const nodeIndex = Number(nodeElement.dataset.nodeIndex);
      const territory = territoryElementFromSelection(nodeElement.dataset.nodeIndex, territoryElement);
      const selected = selectedTerritory() || findTerritoryContainingNodeElement(nodeElement);
      const id = territoryElement?.dataset.territoryId || selected?.id;
      const entry = state.data.territories.find((item) => item.id === id) || selected;
      if (!entry) return;
      if (!state.selectedTerritories.has(entry.id)) selectTerritory(entry.id);
      state.selectedNode = nodeIndex;
      renderSidebar();
      if (selectedObjectLocked()) return;
      const handleKey = nodeElement.dataset.handleKey || "";
      beginObjectDrag(event, { kind: handleKey ? "handle" : "node", territoryId: entry.id, nodeIndex, handleKey });
      return;
    }
    if (territoryElement) {
      if (state.tool === "image" || state.tool === "hand" || state.tool === "pen") return;
      const id = territoryElement.dataset.territoryId;
      selectTerritory(id, event.shiftKey);
      if (state.tool !== "node" && !selectedObjectLocked()) beginObjectDrag(event, { kind: "move" });
      return;
    }
    if (imageElement) {
      if (state.tool === "node" || state.tool === "pen" || state.tool === "hand") return;
      const id = imageElement.dataset.imageId;
      selectImage(id, event.shiftKey);
      if (!selectedObjectLocked()) beginObjectDrag(event, { kind: "move" });
    }
  }

  function territoryElementFromSelection(_index, element) {
    return element;
  }

  function findTerritoryContainingNodeElement(nodeElement) {
    const id = nodeElement.closest?.("[data-territory-id]")?.dataset.territoryId;
    return state.data.territories.find((entry) => entry.id === id) || selectedTerritory();
  }

  function beginObjectDrag(event, config) {
    const point = handleCanvasPoint(event);
    if (!point) return;
    state.pointerDrag = {
      ...config,
      pointerId: event.pointerId,
      start: point,
      initialTerritories: [...state.selectedTerritories].map((id) => [id, clone(state.data.territories.find((entry) => entry.id === id))]).filter(([, entry]) => entry),
      initialImages: [...state.selectedImages].map((id) => [id, clone(state.data.images.find((entry) => entry.id === id))]).filter(([, entry]) => entry),
      bounds: config.bounds || selectionBounds(),
      historyPushed: false,
      moved: false,
    };
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", onObjectPointerMove, true);
    document.addEventListener("pointerup", onObjectPointerUp, true);
    document.addEventListener("pointercancel", onObjectPointerUp, true);
  }

  function pointDelta(point, origin) { return { x: point.x - origin.x, y: point.y - origin.y }; }

  function updateMovedObjects(drag, delta) {
    drag.initialTerritories.forEach(([id, initial]) => {
      const entry = state.data.territories.find((item) => item.id === id);
      if (!entry || entry.locked || layer("territories")?.locked) return;
      entry.assignmentEnabled = true;
      entry.points = initial.points.map((node) => ({
        anchor: { x: node.anchor.x + delta.x, y: node.anchor.y + delta.y },
        in: node.in ? { x: node.in.x + delta.x, y: node.in.y + delta.y } : null,
        out: node.out ? { x: node.out.x + delta.x, y: node.out.y + delta.y } : null,
        nodeType: node.nodeType,
      }));
    });
    drag.initialImages.forEach(([id, initial]) => {
      const entry = state.data.images.find((item) => item.id === id);
      if (!entry || entry.locked || layer(entry.layerId || "banners")?.locked) return;
      entry.x = initial.x + delta.x;
      entry.y = initial.y + delta.y;
    });
  }

  function updateNodeDrag(drag, delta) {
    const entry = state.data.territories.find((item) => item.id === drag.territoryId);
    const original = drag.initialTerritories.find(([id]) => id === drag.territoryId)?.[1];
    if (!entry || !original || entry.locked || layer("territories")?.locked) return;
    entry.assignmentEnabled = true;
    const index = drag.nodeIndex;
    const current = original.points[index];
    if (!current) return;
    if (drag.kind === "node") {
      entry.points[index] = {
        ...clone(current),
        anchor: { x: current.anchor.x + delta.x, y: current.anchor.y + delta.y },
        in: current.in ? { x: current.in.x + delta.x, y: current.in.y + delta.y } : null,
        out: current.out ? { x: current.out.x + delta.x, y: current.out.y + delta.y } : null,
      };
    } else {
      const handle = { x: current.anchor.x + delta.x, y: current.anchor.y + delta.y };
      const oppositeKey = drag.handleKey === "in" ? "out" : "in";
      const existingOpposite = current[oppositeKey] || current.anchor;
      const vx = current.anchor.x - handle.x;
      const vy = current.anchor.y - handle.y;
      const length = Math.hypot(vx, vy) || 0.001;
      const oppositeLength = current.nodeType === "symmetric" ? length : Math.hypot(existingOpposite.x - current.anchor.x, existingOpposite.y - current.anchor.y);
      const next = clone(current);
      next[drag.handleKey] = handle;
      if (current.nodeType !== "sharp") {
        next[oppositeKey] = { x: current.anchor.x + (vx / length) * oppositeLength, y: current.anchor.y + (vy / length) * oppositeLength };
      }
      entry.points[index] = next;
    }
  }

  function applyTransformDrag(drag, point, event) {
    const bounds = drag.bounds;
    if (!bounds) return;
    const center = { x: bounds.cx, y: bounds.cy };
    if (drag.kind === "rotate") {
      const startAngle = Math.atan2(drag.start.y - center.y, drag.start.x - center.x);
      const nextAngle = Math.atan2(point.y - center.y, point.x - center.x);
      const deltaRadians = nextAngle - startAngle;
      transformSelectedObjects(drag, (p) => rotatePoint(p, center, deltaRadians), deltaRadians * 180 / Math.PI);
      return;
    }
    const initialCorner = {
      x: drag.handle.includes("w") ? bounds.left : bounds.right,
      y: drag.handle.includes("n") ? bounds.top : bounds.bottom,
    };
    const startDx = initialCorner.x - center.x || 0.001;
    const startDy = initialCorner.y - center.y || 0.001;
    let sx = (point.x - center.x) / startDx;
    let sy = (point.y - center.y) / startDy;
    if (event.shiftKey) {
      const scale = Math.max(Math.abs(sx), Math.abs(sy));
      sx = Math.sign(sx || 1) * scale; sy = Math.sign(sy || 1) * scale;
    }
    transformSelectedObjects(drag, (p) => ({ x: center.x + (p.x - center.x) * sx, y: center.y + (p.y - center.y) * sy }), 0);
  }

  function rotatePoint(point, center, radians) {
    const dx = point.x - center.x; const dy = point.y - center.y;
    const cos = Math.cos(radians); const sin = Math.sin(radians);
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  }

  function transformSelectedObjects(drag, transformPoint, rotationDegrees) {
    drag.initialTerritories.forEach(([id, initial]) => {
      const entry = state.data.territories.find((item) => item.id === id);
      if (!entry || entry.locked || layer("territories")?.locked) return;
      entry.assignmentEnabled = true;
      entry.points = initial.points.map((node) => ({
        anchor: transformPoint(node.anchor),
        in: node.in ? transformPoint(node.in) : null,
        out: node.out ? transformPoint(node.out) : null,
        nodeType: node.nodeType,
      }));
    });
    drag.initialImages.forEach(([id, initial]) => {
      const entry = state.data.images.find((item) => item.id === id);
      if (!entry || entry.locked || layer(entry.layerId || "banners")?.locked) return;
      const center = transformPoint({ x: initial.x, y: initial.y });
      entry.x = center.x; entry.y = center.y;
      if (rotationDegrees) entry.rotation = initial.rotation + rotationDegrees;
      else {
        const originalDx = Math.max(1e-9, Math.abs(initial.x - drag.bounds.cx));
        const originalDy = Math.max(1e-9, Math.abs(initial.y - drag.bounds.cy));
        const current = transformPoint({ x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 });
        const sx = Math.hypot(current.x - drag.bounds.cx, current.y - drag.bounds.cy) / Math.hypot(initial.x + initial.width / 2 - drag.bounds.cx, initial.y + initial.height / 2 - drag.bounds.cy);
        if (Number.isFinite(sx) && sx > 0) { entry.width = initial.width * sx; entry.height = initial.height * sx; }
      }
    });
  }

  function onObjectPointerMove(event) {
    const drag = state.pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const point = handleCanvasPoint(event);
    if (!point) return;
    const delta = pointDelta(point, drag.start);
    const movedPx = Math.hypot(delta.x * state.width * overlayScale(), delta.y * state.height * overlayScale());
    if (movedPx < 1) return;
    if (!drag.historyPushed) { pushHistory(); drag.historyPushed = true; }
    drag.moved = true;
    if (drag.kind === "move") updateMovedObjects(drag, delta);
    else if (drag.kind === "node" || drag.kind === "handle") updateNodeDrag(drag, delta);
    else if (drag.kind === "rotate" || drag.kind === "scale") applyTransformDrag(drag, point, event);
    renderMapLayers();
  }

  function onObjectPointerUp(event) {
    if (!state.pointerDrag || event.pointerId !== state.pointerDrag.pointerId) return;
    document.removeEventListener("pointermove", onObjectPointerMove, true);
    document.removeEventListener("pointerup", onObjectPointerUp, true);
    document.removeEventListener("pointercancel", onObjectPointerUp, true);
    const drag = state.pointerDrag;
    state.pointerDrag = null;
    if (drag.moved) markDirty();
    else renderMapLayers();
    if (drag.moved) syncTerritoryAssignments(true);
  }

  function onObjectDoubleClick(event) {
    if (!state.active || state.tool !== "node" || !isAdmin()) return;
    const target = event.target.closest?.("[data-territory-id]");
    if (!target) return;
    const territory = state.data.territories.find((entry) => entry.id === target.dataset.territoryId);
    if (!territory || territory.locked || layer("territories")?.locked) return;
    const point = handleCanvasPoint(event);
    if (!point) return;
    const segment = nearestBezierSegment(territory.points, point);
    if (!segment) return;
    event.preventDefault(); event.stopPropagation();
    pushHistory();
    const { index, t } = segment;
    territory.assignmentEnabled = true;
    const current = territory.points[index];
    const nextIndex = (index + 1) % territory.points.length;
    const next = territory.points[nextIndex];
    const p0 = current.anchor; const p1 = current.out || current.anchor;
    const p2 = next.in || next.anchor; const p3 = next.anchor;
    const split = splitCubic(p0, p1, p2, p3, t);
    current.out = split.left[1];
    next.in = split.right[2];
    const inserted = { anchor: split.left[3], in: split.left[2], out: split.right[1], nodeType: "smooth" };
    territory.points.splice(index + 1, 0, inserted);
    state.selectedTerritories = new Set([territory.id]);
    state.selectedImages.clear();
    state.selectedNode = index + 1;
    renderMapLayers(); renderSidebar(); markDirty();
  }

  function lerpPoint(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

  function splitCubic(p0, p1, p2, p3, t) {
    const p01 = lerpPoint(p0, p1, t); const p12 = lerpPoint(p1, p2, t); const p23 = lerpPoint(p2, p3, t);
    const p012 = lerpPoint(p01, p12, t); const p123 = lerpPoint(p12, p23, t); const p = lerpPoint(p012, p123, t);
    return { left: [p0, p01, p012, p], right: [p, p123, p23, p3] };
  }

  function nearestBezierSegment(points, target) {
    let best = null;
    const count = points.length;
    for (let index = 0; index < count; index += 1) {
      const current = points[index]; const next = points[(index + 1) % count];
      const p0 = current.anchor; const p1 = current.out || current.anchor; const p2 = next.in || next.anchor; const p3 = next.anchor;
      for (let step = 0; step <= 40; step += 1) {
        const t = step / 40; const mt = 1 - t;
        const point = {
          x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
          y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
        };
        const distance = Math.hypot((point.x - target.x) * state.width * overlayScale(), (point.y - target.y) * state.height * overlayScale());
        if (!best || distance < best.distance) best = { index, t, distance };
      }
    }
    return best && best.distance <= 18 ? best : null;
  }

  function setSelectedNodeType(type) {
    const territory = selectedTerritory();
    const index = state.selectedNode;
    if (!territory || index == null || !territory.points[index] || !["smooth", "symmetric", "sharp"].includes(type) || selectedObjectLocked()) return;
    pushHistory();
    territory.assignmentEnabled = true;
    const node = territory.points[index];
    node.nodeType = type;
    if (type === "sharp") {
      node.in = node.in || null;
      node.out = node.out || null;
    } else {
      const direction = node.out || node.in || { x: node.anchor.x + 0.01, y: node.anchor.y };
      const dx = direction.x - node.anchor.x; const dy = direction.y - node.anchor.y;
      const length = Math.hypot(dx, dy) || 0.01;
      const inLength = type === "symmetric" ? length : Math.hypot((node.in?.x || node.anchor.x) - node.anchor.x, (node.in?.y || node.anchor.y) - node.anchor.y) || length;
      node.out = { x: node.anchor.x + dx, y: node.anchor.y + dy };
      node.in = { x: node.anchor.x - (dx / length) * inLength, y: node.anchor.y - (dy / length) * inLength };
    }
    markDirty(); renderSidebar();
  }

  function removeSelectedNode() {
    const territory = selectedTerritory();
    const index = state.selectedNode;
    if (!territory || index == null) return false;
    if (territory.points.length <= 3) { showToast("Ein geschlossenes Gebiet braucht mindestens drei Ankerpunkte.", true); return true; }
    if (selectedObjectLocked()) return true;
    pushHistory();
    territory.assignmentEnabled = true;
    territory.points.splice(index, 1);
    state.selectedNode = null;
    markDirty(); renderSidebar();
    return true;
  }

  function deleteSelection() {
    if (state.selectedNode != null && removeSelectedNode()) return;
    if ((!state.selectedTerritories.size && !state.selectedImages.size) || !isAdmin()) return;
    if ([...state.selectedTerritories].every((id) => state.data.territories.find((entry) => entry.id === id)?.locked || layer("territories")?.locked) &&
        [...state.selectedImages].every((id) => state.data.images.find((entry) => entry.id === id)?.locked || layer("banners")?.locked)) {
      showToast("Die Auswahl ist gesperrt.", true); return;
    }
    pushHistory();
    state.data.territories = state.data.territories.filter((entry) => !state.selectedTerritories.has(entry.id) || entry.locked || layer("territories")?.locked);
    state.data.images = state.data.images.filter((entry) => !state.selectedImages.has(entry.id) || entry.locked || layer(entry.layerId || "banners")?.locked);
    state.selectedTerritories.clear(); state.selectedImages.clear(); state.selectedNode = null;
    markDirty(); renderSidebar();
  }

  function duplicateSelection() {
    if (!isAdmin() || !selectedObjectCount()) return;
    pushHistory();
    const offset = 0.012;
    const territories = [...state.selectedTerritories].map((id) => state.data.territories.find((entry) => entry.id === id)).filter(Boolean);
    const images = [...state.selectedImages].map((id) => state.data.images.find((entry) => entry.id === id)).filter(Boolean);
    const territoryCopies = territories.map((entry) => ({
      ...clone(entry), id: makeId("territory"), name: `${entry.name} – Kopie`, assignmentEnabled: true, zIndex: Math.max(0, ...state.data.territories.map((value) => value.zIndex + 1)),
      points: entry.points.map((node) => ({ anchor: { x: node.anchor.x + offset, y: node.anchor.y + offset }, in: node.in ? { x: node.in.x + offset, y: node.in.y + offset } : null, out: node.out ? { x: node.out.x + offset, y: node.out.y + offset } : null, nodeType: node.nodeType })),
    }));
    const imageCopies = images.map((entry) => ({ ...clone(entry), id: makeId("image"), name: `${entry.name} – Kopie`, x: entry.x + offset, y: entry.y + offset, zIndex: Math.max(0, ...state.data.images.map((value) => value.zIndex + 1)) }));
    state.data.territories.push(...territoryCopies);
    state.data.images.push(...imageCopies);
    state.selectedTerritories = new Set(territoryCopies.map((entry) => entry.id));
    state.selectedImages = new Set(imageCopies.map((entry) => entry.id));
    markDirty(); renderSidebar();
  }

  function copySelection() {
    if (!selectedObjectCount()) return;
    state.clipboard = {
      territories: [...state.selectedTerritories].map((id) => state.data.territories.find((entry) => entry.id === id)).filter(Boolean).map(clone),
      images: [...state.selectedImages].map((id) => state.data.images.find((entry) => entry.id === id)).filter(Boolean).map(clone),
    };
    showToast("Auswahl kopiert. Strg+V fügt eine verschobene Kopie ein.");
  }

  function pasteSelection() {
    if (!isAdmin() || !state.clipboard) return;
    pushHistory();
    const offset = 0.016;
    const territories = state.clipboard.territories.map((entry) => ({
      ...clone(entry), id: makeId("territory"), name: `${entry.name} – Kopie`, assignmentEnabled: true,
      points: entry.points.map((node) => ({ anchor: { x: node.anchor.x + offset, y: node.anchor.y + offset }, in: node.in ? { x: node.in.x + offset, y: node.in.y + offset } : null, out: node.out ? { x: node.out.x + offset, y: node.out.y + offset } : null, nodeType: node.nodeType })),
    }));
    const images = state.clipboard.images.map((entry) => ({ ...clone(entry), id: makeId("image"), name: `${entry.name} – Kopie`, x: entry.x + offset, y: entry.y + offset }));
    state.data.territories.push(...territories); state.data.images.push(...images);
    state.selectedTerritories = new Set(territories.map((entry) => entry.id)); state.selectedImages = new Set(images.map((entry) => entry.id));
    markDirty(); renderSidebar();
  }

  function raiseSelectedObject(direction = 1) {
    if (!selectedObjectCount() || !isAdmin()) return;
    pushHistory();
    const collection = state.selectedTerritories.size ? state.data.territories : state.data.images;
    const selected = state.selectedTerritories.size ? state.selectedTerritories : state.selectedImages;
    const max = Math.max(0, ...collection.map((entry) => numberOr(entry.zIndex)));
    selected.forEach((id, index) => {
      const entry = collection.find((item) => item.id === id);
      if (entry) entry.zIndex = direction > 0 ? max + index + 1 : Math.min(...collection.map((item) => item.zIndex)) - index - 1;
    });
    markDirty(); renderSidebar();
  }

  function lowerSelectedObject() { raiseSelectedObject(-1); }

  function handleKeyboard(event) {
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if (command && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (command && event.key.toLowerCase() === "c") { event.preventDefault(); copySelection(); return; }
    if (command && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelection(); return; }
    if (command && event.key.toLowerCase() === "d") { event.preventDefault(); state.selectedTerritories.clear(); state.selectedImages.clear(); state.selectedNode = null; renderMapLayers(); renderSidebar(); return; }
    if (event.key === "Escape") {
      if (state.drawingPoints.length) { state.drawingPoints = []; state.drawPointer = null; renderMapLayers(); updateSelectionStatus(); }
      else setEditorActive(false);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelection(); return; }
    const keyTools = { v: "select", b: "pen", n: "node", t: "transform", h: "hand" };
    if (!command && keyTools[event.key.toLowerCase()]) setTool(keyTools[event.key.toLowerCase()]);
  }

  function handleGlobalKeyboard(event) {
    if (!state.active) return;
    if (event.target?.matches?.("input, select, textarea") || event.target?.isContentEditable) return;
    handleKeyboard(event);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });
  }

  async function importImageFile(file) {
    if (!file) return;
    const input = $("[data-image-file]", state.shell);
    input.value = "";
    if (!isAdmin()) { showToast("Bilder können nur mit Admin-Zugang importiert werden.", true); return; }
    const supported = ["image/png", "image/webp", "image/jpeg"];
    if (!supported.includes(file.type)) { showToast("Bitte ein PNG-, WebP- oder JPEG-Bild wählen.", true); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Das Bild darf höchstens 5 MB groß sein.", true); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      let url = "";
      if (isLocal()) {
        const assetId = makeId("banner");
        await saveLocalBanner(assetId, file);
        url = `local-banner:${assetId}`;
      } else {
        const token = window.MapAdminUi?.getToken?.() || "";
        try {
          const response = await fetch("/api/factions/upload-banner", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ filename: file.name, dataUrl }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
          url = result.url;
        } catch (uploadError) {
          if (file.size > 2_500_000) throw uploadError;
          url = dataUrl;
          showToast("Vercel Blob ist nicht erreichbar; das Banner wird direkt in den Gebietsdaten gespeichert.", true);
        }
      }
      const dimensions = await readImageDimensions(url.startsWith("local-banner:") ? dataUrl : url);
      const width = 0.075;
      const height = clamp(width * dimensions.height / Math.max(1, dimensions.width), 0.02, 0.15);
      const assignedFaction = state.pendingFactionBanner || state.activeFactionId;
      const meta = faction(assignedFaction);
      pushHistory();
      if (meta && state.pendingFactionBanner && url.startsWith("https://")) meta.bannerUrl = url;
      const image = {
        id: makeId("banner"),
        name: file.name.replace(/\.[^.]+$/, "") || "Fraktionsbanner",
        filename: file.name,
        factionId: assignedFaction || "",
        layerId: state.activeGraphicsLayerId || "banners",
        url,
        x: 0.5,
        y: 0.5,
        width,
        height,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: Math.max(0, ...state.data.images.map((entry) => entry.zIndex + 1)),
      };
      state.data.images.push(image);
      state.selectedImages = new Set([image.id]);
      state.selectedTerritories.clear();
      state.activeFactionId = image.factionId || state.activeFactionId;
      state.pendingFactionBanner = "";
      state.tool = "image";
      $$("[data-tool]", state.shell).forEach((button) => button.classList.toggle("is-active", button.dataset.tool === "image"));
      renderSidebar(); markDirty();
      showToast(`„${file.name}“ importiert. Transparenz und Originalpixel bleiben erhalten.`);
    } catch (error) {
      state.pendingFactionBanner = "";
      showToast(`Bild konnte nicht importiert werden: ${error?.message || error}`, true);
    }
  }

  function readImageDimensions(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
      image.onerror = () => reject(new Error("Bilddatei ist beschädigt oder nicht lesbar."));
      image.src = url;
    });
  }

  function updateMapButton() {
    const button = document.getElementById("factionTerritoryEditorButton");
    if (!button) return;
    button.classList.toggle("hidden", !isAdmin());
    button.disabled = !isAdmin();
    button.setAttribute("aria-hidden", isAdmin() ? "false" : "true");
  }

  function initialize() {
    const button = document.getElementById("factionTerritoryEditorButton");
    if (button) button.addEventListener("click", () => setEditorActive(true));
    updateMapButton();
    window.addEventListener("swmap-admin-auth-changed", () => {
      updateMapButton();
      if (!isAdmin() && state.active) setEditorActive(false);
    });
    window.addEventListener("swmap-viewer-open", () => {
      attachToViewer();
      void ensureData();
    });
    window.addEventListener("swmap-rendered", () => {
      if (state.loaded) syncTerritoryAssignments();
    });
    window.addEventListener("swmap-mode-changed", () => {
      state.assignmentSignature = "";
      renderMapLayers();
      syncTerritoryAssignments(true);
      clearTimeout(state.territoryBootstrapTimer);
      state.territoryBootstrapTimer = window.setTimeout(() => {
        if (!state.loaded) return;
        seedCurrentFactionTerritories();
        const mode = window.MapAdminApi?.getMapMode?.() === "underworld" ? "underworld" : "government";
        if (!activeScopeMatches(faction(state.activeFactionId), mode)) {
          state.activeFactionId = state.data.factions.find((entry) => activeScopeMatches(entry, mode))?.id || state.data.factions[0]?.id;
          selectFaction(state.activeFactionId);
        }
        syncTerritoryAssignments(true);
        renderSidebar();
        renderMapLayers();
      }, 450);
    });
    void ensureData();
    if (window.MapAdminApi?.getViewer?.()?.isOpen?.()) attachToViewer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();





