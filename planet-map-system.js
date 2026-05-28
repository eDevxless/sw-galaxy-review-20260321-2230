(function () {
  const PLANET_MAP_CACHE_VERSION = 12;
  const PLANET_MAP_DB_NAME = "sw-galaxy-planet-maps";
  const PLANET_MAP_DB_VERSION = 1;
  const PLANET_MAP_STORE = "maps";
  const PLANET_MAP_FALLBACK_KEY = "sw-galaxy-planet-maps-fallback-v1";
  const ADMIN_TOKEN_STORAGE_KEY = "swmap_admin_token";
  const CORUSCANT_CITY_MAP_PATH = "./coruscant-city-map/city-map.html";
  const ECUMENOPOLIS_CITY_MAP_PATH = "./coruscant-city-map/planet-city-map.html";
  const PLANET_MAP_FRAME_SIZE = 5000;
  const PLANET_MAP_VIEWS = ["leaflet", "hybrid"];
  const PLANET_MAP_CITY_PLANETS = new Set([
    "alsakan",
    "anaxes",
    "arramanx",
    "axxila",
    "cademimu v",
    "cademimu",
    "carratos",
    "coruscant",
    "coruschal",
    "denon",
    "dramassia",
    "empress teta",
    "erkit",
    "fondor",
    "gerrenthum",
    "humbarine",
    "jutrand",
    "kaiserin teta",
    "karideph",
    "kassido",
    "lianna",
    "malador",
    "metellos",
    "nar shaddaa",
    "otrand",
    "skako",
    "sump",
    "taris",
    "thisspias",
  ]);
  const PLANET_WORLD_EDITOR_PATH = "./planet-world-editor/";
  const PLANET_MAP_MAPLIBRE_LNG_SPAN = 0.18;
  const PLANET_MAP_MAPLIBRE_LAT_SPAN = 0.135;
  const PLANET_MAP_BUILDING_KIND_LABELS = {
    state: "Staatlich",
    commercial: "Privatwirtschaftlich",
    private: "Privat",
  };
  const PLANET_MAP_BUILDING_KIND_COLORS = {
    state: "#d59a32",
    commercial: "#347fbd",
    private: "#62a46a",
  };
  const PLANET_MAP_BUILDING_KIND_OUTLINES = {
    state: "#9a5d0f",
    commercial: "#1b4c76",
    private: "#2d6134",
  };
  const PLANET_MAP_BUNDLED_RECORDS = {
    coruscant: "./data/planet-maps/coruscant-v3.json",
  };

  const runtime = {
    overlayReady: false,
    currentView: "leaflet",
    activeItemKey: "",
    activeItem: null,
    activeRecord: null,
    dbPromise: null,
    memoryRecords: new Map(),
    pendingRecords: new Map(),
    maplibrePromise: null,
    leafletModulePromise: null,
    nodes: {},
    leaflet: {
      map: null,
      group: null,
      activeKey: "",
    },
    maplibre: {
      map: null,
      activeKey: "",
      popup: null,
      markers: [],
      cleanupMouseControls: null,
    },
    three: {
      renderer: null,
      scene: null,
      camera: null,
      root: null,
      activeKey: "",
      animationFrame: 0,
      resizeHandler: null,
    },
    coruscantCity: {
      overlay: null,
      frame: null,
      closeButton: null,
    },
  };

  function normalizePlanetName(value) {
    if (typeof normalizeNameKey === "function") {
      return normalizeNameKey(value);
    }
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function decodeBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(normalized + padding);
  }

  function tokenLooksCurrent(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return false;
    try {
      const payload = JSON.parse(decodeBase64Url(parts[0]));
      const role = String(payload?.role || payload?.sub || "").toLowerCase();
      if (role !== "admin") return false;
      if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return false;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function localAdminToken() {
    try {
      const token = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
      if (tokenLooksCurrent(token)) return token;
      if (token) sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch (_error) {
      return "";
    }
    return "";
  }

  function hasAdminMapAccess() {
    return Boolean(window.MapAdminUi?.isAdmin?.() || localAdminToken());
  }

  function mapAccessVersion() {
    return "readonly-map-access-1";
  }

  function normalizePlanetGrid(value) {
    if (typeof normalizeGridLabel === "function") {
      return normalizeGridLabel(value);
    }
    return String(value || "").trim().toUpperCase();
  }

  function htmlEscape(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(10);
  }

  function planetMapKey(item) {
    return [
      "planet-map",
      PLANET_MAP_CACHE_VERSION,
      normalizePlanetName(item?.name || item?.nameKey || ""),
      normalizePlanetGrid(item?.grid || ""),
      String(item?.region || "").trim().toLowerCase(),
      Number(item?.x || 0).toFixed(4),
      Number(item?.y || 0).toFixed(4),
    ].join(":");
  }

  function planetMapSeed(item) {
    return hashString(
      [
        item?.name || "",
        item?.grid || "",
        item?.region || "",
        item?.faction || "",
        item?.terrain || "",
        item?.climate || "",
        item?.desc || "",
      ].join("|")
    );
  }

  function isCityMapPlanet(item) {
    return PLANET_MAP_CITY_PLANETS.has(normalizePlanetName(item?.name || item?.nameKey || ""));
  }

  function isCoruscantCityMap(item) {
    return normalizePlanetName(item?.name || item?.nameKey || "") === "coruscant";
  }

  function cityPlanetProfile(item) {
    const name = normalizePlanetName(item?.name || item?.nameKey || "");
    const label = String(item?.name || item?.nameKey || "Ecumenopolis").trim() || "Ecumenopolis";
    const sample = [name, item?.terrain, item?.climate, item?.desc, item?.lore, item?.region, item?.faction]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const faction = String(item?.faction || "").toLowerCase();
    let key = "core";
    if (/nar shaddaa|hutt|smuggl|schmuggl|crime|unterwelt|shadow|kartell|pirate|black sun/.test(sample)) key = "underworld";
    else if (/fondor|skako|lianna|cademimu|axxila|industrial|industrie|werft|shipyard|factory|fabrik|plasma|techno/.test(sample)) key = "industrial";
    else if (/taris|malador|ruin|vines|fungae|unterstadt|lower city|overgrown/.test(sample)) key = "ancient";
    else if (/kassido|sump|aquat|ocean|meer|wasser|sumpf|marin/.test(sample)) key = "aquatic";
    else if (/karideph|denon|trade|handel|hyperraum|fracht|spaceport|raumhafen|logistik/.test(sample)) key = "trade";
    else if (/separatist|konfoederation|bankenklan|handelsfoederation/.test(sample)) key = "separatist";

    const profiles = {
      core: {
        key,
        familyLabel: "Kernwelt-Megacity",
        spacing: 64,
        spacingJitter: 26,
        mainEvery: 5,
        majorEvery: 2,
        minorWidth: 12,
        majorWidth: 25,
        mainWidth: 44,
        diagonalCount: 9,
        plazaCount: 7,
        maxColumns: 6,
        maxRows: 6,
        lotBase: 34,
        skipChance: 0.015,
        heightBase: 34,
        heightRandom: 62,
        centerHeight: 88,
        pulseHeight: 55,
        spireChance: 0.11,
        spireHeight: 115,
        heightScale: 1.42,
        preview: { ground: "#091424", minor: "#24405e", major: "#5e9fd1", main: "#d6f5ff", low: "#5f7f9e", mid: "#8ebeff", high: "#d7feff" },
        theme: { surface: "#091424", background: "#050b13", buildings: "#d7e8ff", roofs: "#8ebeff", roads: "#7cd5ff", roadsSoft: "#2d587f", outline: "#eff6ff", glow: "rgba(125, 227, 215, 0.18)" },
      },
      underworld: {
        key,
        familyLabel: "Unterwelt-Megacity",
        spacing: 58,
        spacingJitter: 32,
        mainEvery: 4,
        majorEvery: 2,
        minorWidth: 10,
        majorWidth: 22,
        mainWidth: 39,
        diagonalCount: 12,
        plazaCount: 5,
        maxColumns: 7,
        maxRows: 7,
        lotBase: 30,
        skipChance: 0.035,
        heightBase: 26,
        heightRandom: 58,
        centerHeight: 72,
        pulseHeight: 82,
        spireChance: 0.08,
        spireHeight: 95,
        heightScale: 1.2,
        preview: { ground: "#120f18", minor: "#34243d", major: "#7b5267", main: "#f0d4a8", low: "#5d4b58", mid: "#b58c73", high: "#ffe0a3" },
        theme: { surface: "#120f18", background: "#07060b", buildings: "#f1d9bd", roofs: "#c78969", roads: "#e9b876", roadsSoft: "#633a45", outline: "#ffe8cc", glow: "rgba(255, 184, 118, 0.2)" },
      },
      industrial: {
        key,
        familyLabel: "Industrie-Ecumenopolis",
        spacing: 72,
        spacingJitter: 20,
        mainEvery: 4,
        majorEvery: 2,
        minorWidth: 15,
        majorWidth: 31,
        mainWidth: 52,
        diagonalCount: 7,
        plazaCount: 4,
        maxColumns: 5,
        maxRows: 5,
        lotBase: 42,
        skipChance: 0.01,
        heightBase: 30,
        heightRandom: 48,
        centerHeight: 65,
        pulseHeight: 52,
        spireChance: 0.14,
        spireHeight: 135,
        heightScale: 1.35,
        preview: { ground: "#101217", minor: "#34404b", major: "#78919f", main: "#e9f2ef", low: "#5e6971", mid: "#a8b8c0", high: "#e5f5f6" },
        theme: { surface: "#101217", background: "#07090d", buildings: "#e0e6e6", roofs: "#9fb0bb", roads: "#c7d7d8", roadsSoft: "#45535c", outline: "#f4fbfb", glow: "rgba(140, 202, 220, 0.18)" },
      },
      trade: {
        key,
        familyLabel: "Hyperraum-Megahub",
        spacing: 66,
        spacingJitter: 30,
        mainEvery: 3,
        majorEvery: 2,
        minorWidth: 12,
        majorWidth: 27,
        mainWidth: 50,
        diagonalCount: 13,
        plazaCount: 8,
        maxColumns: 6,
        maxRows: 6,
        lotBase: 34,
        skipChance: 0.02,
        heightBase: 28,
        heightRandom: 52,
        centerHeight: 82,
        pulseHeight: 64,
        spireChance: 0.1,
        spireHeight: 105,
        heightScale: 1.32,
        preview: { ground: "#0b1320", minor: "#263a4f", major: "#409ac0", main: "#dff7ff", low: "#58768a", mid: "#70bdd2", high: "#d9fbff" },
        theme: { surface: "#0b1320", background: "#040912", buildings: "#d6f5ff", roofs: "#70bdd2", roads: "#9beeff", roadsSoft: "#28506a", outline: "#effcff", glow: "rgba(112, 189, 210, 0.2)" },
      },
      ancient: {
        key,
        familyLabel: "Alte Megacity",
        spacing: 70,
        spacingJitter: 38,
        mainEvery: 5,
        majorEvery: 2,
        minorWidth: 10,
        majorWidth: 22,
        mainWidth: 42,
        diagonalCount: 6,
        plazaCount: 6,
        maxColumns: 5,
        maxRows: 5,
        lotBase: 39,
        skipChance: 0.07,
        heightBase: 20,
        heightRandom: 46,
        centerHeight: 56,
        pulseHeight: 58,
        spireChance: 0.07,
        spireHeight: 90,
        heightScale: 1.1,
        preview: { ground: "#101710", minor: "#293829", major: "#668261", main: "#d9edc2", low: "#4d614d", mid: "#91a782", high: "#e1f7c8" },
        theme: { surface: "#101710", background: "#080d08", buildings: "#d8e8c8", roofs: "#91a782", roads: "#cbe5b0", roadsSoft: "#3c513c", outline: "#f1ffe5", glow: "rgba(157, 212, 136, 0.18)" },
      },
      aquatic: {
        key,
        familyLabel: "Wasserstadt",
        spacing: 68,
        spacingJitter: 28,
        mainEvery: 4,
        majorEvery: 2,
        minorWidth: 11,
        majorWidth: 24,
        mainWidth: 46,
        diagonalCount: 8,
        plazaCount: 7,
        maxColumns: 6,
        maxRows: 6,
        lotBase: 35,
        skipChance: 0.025,
        heightBase: 24,
        heightRandom: 54,
        centerHeight: 68,
        pulseHeight: 58,
        spireChance: 0.09,
        spireHeight: 100,
        heightScale: 1.18,
        preview: { ground: "#071726", minor: "#174667", major: "#4fb7dc", main: "#ddfbff", low: "#4b7892", mid: "#7edfff", high: "#e5fdff" },
        theme: { surface: "#071726", background: "#040d16", buildings: "#d0f0ff", roofs: "#73d8ff", roads: "#9ae7ff", roadsSoft: "#1e5575", outline: "#eefcff", glow: "rgba(115, 216, 255, 0.18)" },
      },
      separatist: {
        key,
        familyLabel: "Konfoederations-Megacity",
        spacing: 62,
        spacingJitter: 24,
        mainEvery: 4,
        majorEvery: 2,
        minorWidth: 12,
        majorWidth: 26,
        mainWidth: 45,
        diagonalCount: 10,
        plazaCount: 6,
        maxColumns: 6,
        maxRows: 6,
        lotBase: 34,
        skipChance: 0.018,
        heightBase: 28,
        heightRandom: 60,
        centerHeight: 76,
        pulseHeight: 68,
        spireChance: 0.12,
        spireHeight: 120,
        heightScale: 1.3,
        preview: { ground: "#0c1020", minor: "#25305c", major: "#4964c8", main: "#dfe7ff", low: "#53618b", mid: "#8a9bdf", high: "#edf1ff" },
        theme: { surface: "#0c1020", background: "#050713", buildings: "#dce4ff", roofs: "#8a9bdf", roads: "#a9bcff", roadsSoft: "#273467", outline: "#f0f4ff", glow: "rgba(92, 116, 230, 0.2)" },
      },
    };

    const profile = profiles[key] || profiles.core;
    const landmarks = [
      {
        id: "central-spire",
        label: `${label} Zentralspitze`,
        shortLabel: "Zentralspitze",
        district: profile.familyLabel,
        description: `Der dichteste Verwaltungs- und Verkehrsknoten von ${label}.`,
        anchor: [0.5, 0.45],
        prominence: 1.35,
        buildingKind: faction === "separatist" ? "commercial" : "state",
      },
      {
        id: "orbital-transfer",
        label: `${label} Orbitaltransfer`,
        shortLabel: "Orbitalhub",
        district: "Raumhafen-Ebene",
        description: `Groesserer Raumhafenkomplex fuer Shuttles, Fracht und planetare Zubringer.`,
        anchor: [0.72, 0.26],
        prominence: 1.18,
        buildingKind: "commercial",
      },
      {
        id: "industrial-stack",
        label: key === "industrial" ? `${label} Werftdirektion` : `${label} Versorgungsturm`,
        shortLabel: key === "industrial" ? "Werften" : "Versorgung",
        district: key === "underworld" ? "Schattenmarkt" : "Infrastruktur-Zone",
        description: key === "underworld" ? "Schwer kontrollierbarer Markt- und Lagerkomplex der unteren Stadtdecks." : "Kraft-, Transit- und Logistikknoten fuer die oberen Stadtdecks.",
        anchor: [0.28, 0.63],
        prominence: 1.08,
        buildingKind: key === "underworld" ? "private" : "commercial",
      },
      {
        id: "civic-ring",
        label: faction === "separatist" ? `${label} Konzernforum` : `${label} Verwaltungsring`,
        shortLabel: faction === "separatist" ? "Konzernforum" : "Verwaltung",
        district: "Civic Deck",
        description: `Oeffentliche Verwaltung, lokale Gilden und Sicherheitskraefte der Stadtwelt.`,
        anchor: [0.42, 0.22],
        prominence: 1.05,
        buildingKind: faction === "separatist" ? "commercial" : "state",
      },
    ];

    return { ...profile, landmarks };
  }

  function planetMapTouchMode() {
    if (document.body.classList.contains("mobile-view")) return true;
    if (window.matchMedia?.("(max-width: 900px)").matches) return true;
    return false;
  }

  function availablePlanetMapViews() {
    return planetMapTouchMode() ? ["leaflet"] : PLANET_MAP_VIEWS;
  }

  function roadKindLabel(kind) {
    if (kind === "main") return "Primaertrasse";
    if (kind === "major") return "Verteilertrasse";
    return "Nebenstrasse";
  }

  function buildingKindLabel(kind) {
    return PLANET_MAP_BUILDING_KIND_LABELS[kind] || PLANET_MAP_BUILDING_KIND_LABELS.private;
  }

  function buildingKindColor(kind) {
    return PLANET_MAP_BUILDING_KIND_COLORS[kind] || PLANET_MAP_BUILDING_KIND_COLORS.private;
  }

  function inferBuildingKind(building, index, area, height) {
    const normalizedArea = Number(area || 0);
    const normalizedHeight = Number(height || 0);
    const seed = Math.abs(Math.sin((index + 1) * 12.9898 + normalizedArea * 0.017 + normalizedHeight * 0.071));
    if (normalizedHeight >= 42 || normalizedArea >= 900) return "commercial";
    if (normalizedHeight >= 32 && seed > 0.24) return "commercial";
    return "private";
  }

  function formatNumber(value, maximumFractionDigits = 0) {
    return Number(value || 0).toLocaleString("de-DE", {
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits > 0 ? Math.min(1, maximumFractionDigits) : 0,
    });
  }

  function bundledPlanetRecordPath(item) {
    return PLANET_MAP_BUNDLED_RECORDS[normalizePlanetName(item?.name || item?.nameKey || "")] || "";
  }

  function compactPoint(point) {
    return {
      x: Number(Number(point?.x || 0).toFixed(1)),
      y: Number(Number(point?.y || 0).toFixed(1)),
    };
  }

  function compactPolygon(points) {
    if (!Array.isArray(points)) return [];
    return points.map(compactPoint);
  }

  function compactPolygonList(polygons) {
    if (!Array.isArray(polygons)) return [];
    return polygons.map(compactPolygon);
  }

  function compactPlanetSnapshot(snapshot) {
    return {
      width: Math.max(1, Number(snapshot?.width) || PLANET_MAP_FRAME_SIZE),
      height: Math.max(1, Number(snapshot?.height) || PLANET_MAP_FRAME_SIZE),
      seaPolygon: compactPolygon(snapshot?.seaPolygon),
      riverPolygon: compactPolygon(snapshot?.riverPolygon),
      coastlinePolygon: compactPolygon(snapshot?.coastlinePolygon),
      footprintPolygon: compactPolygon(snapshot?.footprintPolygon),
      cityClass: String(snapshot?.cityClass || ""),
      mainRoadPolygons: compactPolygonList(snapshot?.mainRoadPolygons),
      majorRoadPolygons: compactPolygonList(snapshot?.majorRoadPolygons),
      minorRoadPolygons: compactPolygonList(snapshot?.minorRoadPolygons),
      buildingModels: Array.isArray(snapshot?.buildingModels)
        ? snapshot.buildingModels.map((building) => ({
          height: Number(Number(building?.height || 0).toFixed(1)),
          lotScreen: compactPolygon(building?.lotScreen),
        }))
        : [],
      svg: String(snapshot?.svg || ""),
    };
  }

  function terrainFamily(item) {
    if (isCityMapPlanet(item)) return "urban";
    const sample = [item?.terrain, item?.climate, item?.desc, item?.region].join(" ").toLowerCase();
    if (sample.includes("stadt") || sample.includes("urban") || sample.includes("industrie")) return "urban";
    if (sample.includes("wueste") || sample.includes("wuste") || sample.includes("desert") || sample.includes("sand")) return "desert";
    if (sample.includes("ozean") || sample.includes("wasser") || sample.includes("meer") || sample.includes("ocean")) return "ocean";
    if (sample.includes("lava") || sample.includes("vulkan") || sample.includes("volcan")) return "volcanic";
    if (sample.includes("eis") || sample.includes("schnee") || sample.includes("ice") || sample.includes("frozen")) return "ice";
    if (sample.includes("dschungel") || sample.includes("wald") || sample.includes("forest") || sample.includes("jungle")) return "jungle";
    return "frontier";
  }

  function themePalette(item) {
    const family = terrainFamily(item);
    const cityProfile = isCityMapPlanet(item) ? cityPlanetProfile(item) : null;
    const faction = String(item?.faction || "").toLowerCase();
    const accent = faction === "separatist" ? "#4285f4" : faction === "republic" ? "#ea4335" : "#1a73e8";
    const base = {
      urban: {
        surface: "#edf1e6",
        background: "#e7eddc",
        buildings: "#d6d0c4",
        roofs: "#b8c4cf",
        roads: "#ffffff",
        roadsSoft: "#cdd5c9",
        water: "#c4d7ef",
        outline: "#95a3b1",
        glow: "rgba(66, 133, 244, 0.12)",
        heightScale: 2.4,
        familyLabel: "Metropole",
      },
      desert: {
        surface: "#20160d",
        background: "#120b07",
        buildings: "#f1d8bb",
        roofs: "#ffc785",
        roads: "#f7d089",
        roadsSoft: "#7c5a31",
        water: "#304f63",
        outline: "#fff2d6",
        glow: "rgba(255, 199, 133, 0.18)",
        heightScale: 0.92,
        familyLabel: "Wuestenstadt",
      },
      ocean: {
        surface: "#071726",
        background: "#040d16",
        buildings: "#d0f0ff",
        roofs: "#73d8ff",
        roads: "#9ae7ff",
        roadsSoft: "#1e5575",
        water: "#1a6aa0",
        outline: "#eefcff",
        glow: "rgba(115, 216, 255, 0.18)",
        heightScale: 1.05,
        familyLabel: "Hafenwelt",
      },
      volcanic: {
        surface: "#1b0d0b",
        background: "#0d0504",
        buildings: "#f0d3c8",
        roofs: "#ff8e67",
        roads: "#ffb290",
        roadsSoft: "#7c3f2e",
        water: "#5f1d13",
        outline: "#ffe9e1",
        glow: "rgba(255, 142, 103, 0.18)",
        heightScale: 1.08,
        familyLabel: "Lavabecken",
      },
      ice: {
        surface: "#0d1620",
        background: "#070d14",
        buildings: "#eef7ff",
        roofs: "#9fd2ff",
        roads: "#d6ecff",
        roadsSoft: "#466681",
        water: "#1f425c",
        outline: "#ffffff",
        glow: "rgba(159, 210, 255, 0.18)",
        heightScale: 1.02,
        familyLabel: "Frostkolonie",
      },
      jungle: {
        surface: "#0d1812",
        background: "#060c08",
        buildings: "#d8f1da",
        roofs: "#8dd49b",
        roads: "#c8efb6",
        roadsSoft: "#406247",
        water: "#1a5046",
        outline: "#f0fff1",
        glow: "rgba(141, 212, 155, 0.18)",
        heightScale: 0.88,
        familyLabel: "Waldsiedlung",
      },
      frontier: {
        surface: "#eef0ea",
        background: "#e6eadf",
        buildings: "#d9d4cb",
        roofs: "#bcc7d3",
        roads: "#ffffff",
        roadsSoft: "#d4d9d1",
        water: "#c8d9ec",
        outline: "#9ba7b6",
        glow: "rgba(26, 115, 232, 0.12)",
        heightScale: 1,
        familyLabel: "Frontier-Netz",
      },
    }[family];

    return {
      family,
      familyLabel: cityProfile?.familyLabel || base.familyLabel,
      accent,
      surface: cityProfile?.theme?.surface || base.surface,
      background: cityProfile?.theme?.background || base.background,
      buildings: cityProfile?.theme?.buildings || base.buildings,
      roofs: cityProfile?.theme?.roofs || base.roofs,
      roads: cityProfile?.theme?.roads || base.roads,
      roadsSoft: cityProfile?.theme?.roadsSoft || base.roadsSoft,
      water: cityProfile?.theme?.water || base.water,
      outline: cityProfile?.theme?.outline || base.outline,
      glow: cityProfile?.theme?.glow || base.glow,
      heightScale: cityProfile ? cityProfile.heightScale : base.heightScale,
    };
  }

  function hybridPalette(record) {
    const accent = "#62d8ff";
    return {
      background: "#020814",
      haze: "#08192d",
      ground: "#061124",
      roadsMain: "#71e6ff",
      roadsMajor: "#37b5ff",
      roadsMinor: "#0f365b",
      buildingsBase: "#10284a",
      buildingsGlow: "#7df4ff",
      buildingsHigh: "#d7feff",
      landmark: "#b8fbff",
      outline: "#89efff",
      accent,
    };
  }

  function previewSvgUrl(record) {
    const svg = String(record?.snapshot?.svg || "").trim();
    if (!svg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function planetRecordMetrics(record) {
    const snapshot = record?.snapshot || {};
    const roads =
      (snapshot.mainRoadPolygons?.length || 0) +
      (snapshot.majorRoadPolygons?.length || 0) +
      (snapshot.minorRoadPolygons?.length || 0);
    const buildings = snapshot.buildingModels?.length || 0;
    return { roads, buildings };
  }

  function polygonArea(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let total = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      total += Number(current.x || 0) * Number(next.y || 0) - Number(next.x || 0) * Number(current.y || 0);
    }
    return Math.abs(total * 0.5);
  }

  function polygonCentroid(points) {
    if (!Array.isArray(points) || points.length < 3) {
      return { x: 0, y: 0 };
    }
    let twiceArea = 0;
    let centroidX = 0;
    let centroidY = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const cross = Number(current.x || 0) * Number(next.y || 0) - Number(next.x || 0) * Number(current.y || 0);
      twiceArea += cross;
      centroidX += (Number(current.x || 0) + Number(next.x || 0)) * cross;
      centroidY += (Number(current.y || 0) + Number(next.y || 0)) * cross;
    }
    if (Math.abs(twiceArea) < 0.0001) {
      const fallback = points.reduce(
        (sum, point) => ({
          x: sum.x + Number(point?.x || 0),
          y: sum.y + Number(point?.y || 0),
        }),
        { x: 0, y: 0 }
      );
      return {
        x: fallback.x / points.length,
        y: fallback.y / points.length,
      };
    }
    return {
      x: centroidX / (3 * twiceArea),
      y: centroidY / (3 * twiceArea),
    };
  }

  function distanceSquared(pointA, pointB) {
    const deltaX = Number(pointA?.x || 0) - Number(pointB?.x || 0);
    const deltaY = Number(pointA?.y || 0) - Number(pointB?.y || 0);
    return deltaX * deltaX + deltaY * deltaY;
  }

  function closeRing(coordinates) {
    if (!coordinates.length) return coordinates;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) return coordinates;
    return coordinates.concat([[first[0], first[1]]]);
  }

  function leafletPoint(point) {
    return [Number(point.x || 0), Number(point.y || 0)];
  }

  function leafletLatLng(point) {
    return [Number(point.y || 0), Number(point.x || 0)];
  }

  function maplibrePoint(point, snapshot) {
    const width = Math.max(1, Number(snapshot?.width) || PLANET_MAP_FRAME_SIZE);
    const height = Math.max(1, Number(snapshot?.height) || PLANET_MAP_FRAME_SIZE);
    return [
      ((Number(point.x || 0) / width) - 0.5) * PLANET_MAP_MAPLIBRE_LNG_SPAN,
      (0.5 - Number(point.y || 0) / height) * PLANET_MAP_MAPLIBRE_LAT_SPAN,
    ];
  }

  function worldPointFromScreen(point, snapshot, cityRadius) {
    const width = Math.max(1, Number(snapshot?.width) || PLANET_MAP_FRAME_SIZE);
    const height = Math.max(1, Number(snapshot?.height) || PLANET_MAP_FRAME_SIZE);
    return {
      x: ((Number(point?.x || 0) / width) - 0.5) * cityRadius * 1.95,
      z: (0.5 - Number(point?.y || 0) / height) * cityRadius * 1.55,
    };
  }

  function polygonBounds(points) {
    if (!Array.isArray(points) || !points.length) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    points.forEach((point) => {
      const x = Number(point?.x || 0);
      const y = Number(point?.y || 0);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  function mercatorBounds(snapshot) {
    return [
      maplibrePoint({ x: 0, y: snapshot?.height || PLANET_MAP_FRAME_SIZE }, snapshot),
      maplibrePoint({ x: snapshot?.width || PLANET_MAP_FRAME_SIZE, y: 0 }, snapshot),
    ];
  }

  function setupMapLibreMouseControls(map) {
    if (!map?.getCanvas) return () => { };
    const canvas = map.getCanvas();
    const container = typeof map.getCanvasContainer === "function" ? map.getCanvasContainer() : canvas;
    map.dragPan?.disable?.();
    map.dragRotate?.disable?.();
    map.scrollZoom?.enable?.();

    let mode = "";
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;

    const resetInteraction = () => {
      mode = "";
      pointerId = null;
      canvas.style.cursor = "";
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "touch") return;
      if (event.button === 1) {
        mode = "rotate";
      } else if (event.button === 2) {
        mode = "pan";
      } else {
        return;
      }
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.style.cursor = mode === "pan" ? "grabbing" : "move";
      try {
        container.setPointerCapture?.(event.pointerId);
      } catch (_error) {
        // Ignore pointer capture failures on browsers that do not support it.
      }
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!mode || pointerId !== event.pointerId) return;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      if (mode === "pan") {
        map.panBy([-deltaX, -deltaY], { animate: false });
      } else if (mode === "rotate") {
        map.setBearing(map.getBearing() + deltaX * 0.34);
        map.setPitch(clamp(map.getPitch() - deltaY * 0.18, 30, 84));
      }
      event.preventDefault();
    };

    const onPointerUp = (event) => {
      if (pointerId !== event.pointerId) return;
      resetInteraction();
      event.preventDefault();
    };

    const onPointerCancel = (event) => {
      if (pointerId !== event.pointerId) return;
      resetInteraction();
    };

    const onAuxClick = (event) => {
      if (event.button === 1) {
        event.preventDefault();
      }
    };

    container.addEventListener("contextmenu", onContextMenu);
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    container.addEventListener("auxclick", onAuxClick);

    return () => {
      resetInteraction();
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      container.removeEventListener("auxclick", onAuxClick);
    };
  }

  function pointOfInterestDefinitions(record) {
    const nameKey = normalizePlanetName(record?.name || record?.nameKey || "");
    if (nameKey !== "coruscant") {
      if (!PLANET_MAP_CITY_PLANETS.has(nameKey)) return [];
      const profile = cityPlanetProfile(record);
      return profile.landmarks.map((landmark) => ({
        ...landmark,
        sourceLabel: `${record?.name || "Planet"} Infotabelle`,
        sourceHref: record?.mapHref || "#",
      }));
    }

    return [
      {
        id: "jedi-temple",
        label: "Jedi-Tempel",
        shortLabel: "Jedi-Tempel",
        district: "Federal District",
        description: "Hauptquartier des Jedi-Ordens auf Coruscant während der Klonkriege.",
        sourceLabel: "Jedi Temple | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Jedi_Temple",
        anchor: [0.5, 0.22],
        prominence: 1.25,
        buildingKind: "state",
      },
      {
        id: "galactic-senate-building",
        label: "Galaktisches Senatsgebaeude",
        shortLabel: "Senat",
        district: "Federal District",
        description: "Politisches Zentrum der Republik mit dem großen Senatskomplex im Regierungsviertel.",
        sourceLabel: "Federal District | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Federal_District",
        anchor: [0.67, 0.46],
        prominence: 1.18,
        buildingKind: "state",
      },
      {
        id: "senate-office-building",
        label: "Senatsbürogebäude",
        shortLabel: "Senatsbüro",
        district: "Federal District",
        description: "Bürokomplex des Obersten Kanzlers, später als Imperial Executive Building bekannt.",
        sourceLabel: "Coruscant | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Coruscant",
        anchor: [0.61, 0.54],
        prominence: 1.05,
        buildingKind: "state",
      },
      {
        id: "500-republica",
        label: "500 Republica",
        shortLabel: "500 Republica",
        district: "Senate District",
        description: "Exklusiver Wohnturm der politischen Elite von Coruscant.",
        sourceLabel: "Coruscant | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Coruscant",
        anchor: [0.77, 0.61],
        prominence: 0.98,
        buildingKind: "private",
      },
      {
        id: "compor-headquarters",
        label: "COMPOR-Zentrale",
        shortLabel: "COMPOR",
        district: "Federal District",
        description: "Sitz der Commission for the Protection of the Republic während der Klonkriege, also vor der späteren COMPNOR-Phase.",
        sourceLabel: "Commission for the Protection of the Republic | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Commission_for_the_Protection_of_the_Republic",
        anchor: [0.36, 0.6],
        prominence: 1.12,
        buildingKind: "state",
      },
      {
        id: "republic-military-base",
        label: "Republikanischer Militärkomplex",
        shortLabel: "Rep.-Basis",
        district: "Federal District",
        description: "Republikanischer Militärstützpunkt in 20 BBY, später unter dem Imperium zum Inspectorate-Hauptquartier umgebaut.",
        sourceLabel: "Imperial Inspectorate HQ | Wookieepedia",
        sourceHref: "https://starwars.fandom.com/wiki/Imperial_Inspectorate_HQ",
        anchor: [0.28, 0.4],
        prominence: 1.08,
        buildingKind: "state",
      },
    ];
  }

  function pointOfInterestPopup(properties) {
    return `<strong>${htmlEscape(properties.label || "Point of Interest")}</strong><br/>${htmlEscape(
      properties.description || ""
    )}<br/>Art: ${htmlEscape(properties.kindLabel || buildingKindLabel(properties.kind))}<br/>Distrikt: ${htmlEscape(properties.district || "Coruscant")}<br/>An Baukomplex gekoppelt: ${htmlEscape(
      properties.buildingLabel || "unbekannt"
    )}<br/><a href="${htmlEscape(properties.sourceHref || "#")}" target="_blank" rel="noreferrer noopener">${htmlEscape(
      properties.sourceLabel || "Wookieepedia"
    )}</a>`;
  }

  function pointOfInterestMarkerMarkup(properties) {
    return `<span class="planet-map-poi-pin" aria-hidden="true"></span><span class="planet-map-poi-label">${htmlEscape(
      properties.shortLabel || properties.label || "POI"
    )}</span>`;
  }

  function buildPointOfInterestCollections(record) {
    if (record.pointsOfInterestCollections) return record.pointsOfInterestCollections;
    const definitions = pointOfInterestDefinitions(record);
    const snapshot = record.snapshot || {};
    const width = Math.max(1, Number(snapshot.width) || PLANET_MAP_FRAME_SIZE);
    const height = Math.max(1, Number(snapshot.height) || PLANET_MAP_FRAME_SIZE);
    const candidates = Array.isArray(snapshot.buildingModels)
      ? snapshot.buildingModels
        .map((building, index) => {
          const polygon = Array.isArray(building?.lotScreen) ? building.lotScreen : [];
          if (polygon.length < 3) return null;
          return {
            index,
            polygon,
            area: polygonArea(polygon),
            centroid: polygonCentroid(polygon),
            height: Number(building?.height || 0),
          };
        })
        .filter(Boolean)
      : [];
    const pool = (candidates.filter((candidate) => candidate.area >= 680).length >= definitions.length
      ? candidates.filter((candidate) => candidate.area >= 680)
      : candidates
    ).sort((left, right) => right.area - left.area);
    const used = new Set();
    const entries = [];
    const landmarkLeaflet = [];
    const landmarkMaplibre = [];
    const poiLeaflet = [];
    const poiMaplibre = [];

    definitions.forEach((definition) => {
      const anchor = {
        x: Number(definition.anchor?.[0] || 0.5) * width,
        y: Number(definition.anchor?.[1] || 0.5) * height,
      };
      let bestCandidate = null;
      let bestScore = Number.POSITIVE_INFINITY;
      pool.forEach((candidate) => {
        if (used.has(candidate.index)) return;
        const score =
          distanceSquared(candidate.centroid, anchor) /
          Math.max(1, candidate.area * 0.22 + candidate.height * 340 * Number(definition.prominence || 1));
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      });
      if (!bestCandidate) return;
      used.add(bestCandidate.index);
      const properties = {
        id: definition.id,
        label: definition.label,
        shortLabel: definition.shortLabel,
        kind: definition.buildingKind || "state",
        kindLabel: buildingKindLabel(definition.buildingKind || "state"),
        district: definition.district,
        description: definition.description,
        sourceHref: definition.sourceHref,
        sourceLabel: definition.sourceLabel,
        buildingIndex: bestCandidate.index + 1,
        buildingLabel: `Baukomplex ${bestCandidate.index + 1}`,
        area: Number(bestCandidate.area.toFixed(0)),
        height: Number(bestCandidate.height.toFixed(1)),
      };
      entries.push(properties);
      landmarkLeaflet.push({
        type: "Feature",
        properties,
        geometry: { type: "Polygon", coordinates: [closeRing(bestCandidate.polygon.map(leafletPoint))] },
      });
      landmarkMaplibre.push({
        type: "Feature",
        properties: {
          ...properties,
          extrudeHeight: Math.max(260, Number((bestCandidate.height * 18.5 * (record.theme?.heightScale || 1)).toFixed(2))),
        },
        geometry: { type: "Polygon", coordinates: [closeRing(bestCandidate.polygon.map((point) => maplibrePoint(point, snapshot)))] },
      });
      poiLeaflet.push({
        type: "Feature",
        properties,
        geometry: { type: "Point", coordinates: leafletPoint(bestCandidate.centroid) },
      });
      poiMaplibre.push({
        type: "Feature",
        properties,
        geometry: { type: "Point", coordinates: maplibrePoint(bestCandidate.centroid, snapshot) },
      });
    });

    record.pointsOfInterest = entries;
    record.pointsOfInterestCollections = {
      landmarkBuildingsLeaflet: { type: "FeatureCollection", features: landmarkLeaflet },
      landmarkBuildingsMaplibre: { type: "FeatureCollection", features: landmarkMaplibre },
      poiLeaflet: { type: "FeatureCollection", features: poiLeaflet },
      poiMaplibre: { type: "FeatureCollection", features: poiMaplibre },
    };
    return record.pointsOfInterestCollections;
  }

  function buildFeatureCollections(record) {
    if (record.collections) return record.collections;
    const snapshot = record.snapshot || {};
    const roadsLeaflet = [];
    const roadsMaplibre = [];
    const roadGroups = [
      { kind: "main", polygons: snapshot.mainRoadPolygons || [] },
      { kind: "major", polygons: snapshot.majorRoadPolygons || [] },
      { kind: "minor", polygons: snapshot.minorRoadPolygons || [] },
    ];

    roadGroups.forEach((group) => {
      group.polygons.forEach((polygon) => {
        if (!Array.isArray(polygon) || polygon.length < 3) return;
        const area = polygonArea(polygon);
        roadsLeaflet.push({
          type: "Feature",
          properties: {
            kind: group.kind,
            label: roadKindLabel(group.kind),
            area: Number(area.toFixed(2)),
          },
          geometry: { type: "Polygon", coordinates: [closeRing(polygon.map(leafletPoint))] },
        });
        roadsMaplibre.push({
          type: "Feature",
          properties: {
            kind: group.kind,
            label: roadKindLabel(group.kind),
            area: Number(area.toFixed(2)),
          },
          geometry: { type: "Polygon", coordinates: [closeRing(polygon.map((point) => maplibrePoint(point, snapshot)))] },
        });
      });
    });

    const buildingsLeaflet = [];
    const buildingsMaplibre = [];
    (snapshot.buildingModels || []).forEach((building, index) => {
      const polygon = Array.isArray(building?.lotScreen) ? building.lotScreen : [];
      if (polygon.length < 3) return;
      const area = polygonArea(polygon);
      const heightBase = Number(building.height || 0);
      const kind = inferBuildingKind(building, index, area, heightBase);
      const kindLabel = buildingKindLabel(kind);
      const skyscraperHeight = Math.max(
        96,
        Number((heightBase * 13.5 * (record.theme?.heightScale || 1) + Math.sqrt(Math.max(0, area)) * 1.7).toFixed(2))
      );
      buildingsLeaflet.push({
        type: "Feature",
        properties: {
          index: index + 1,
          label: `Baukomplex ${index + 1}`,
          kind,
          kindLabel,
          height: heightBase,
          area: Number(area.toFixed(2)),
        },
        geometry: { type: "Polygon", coordinates: [closeRing(polygon.map(leafletPoint))] },
      });
      buildingsMaplibre.push({
        type: "Feature",
        properties: {
          index: index + 1,
          label: `Baukomplex ${index + 1}`,
          kind,
          kindLabel,
          height: skyscraperHeight,
          heightRaw: heightBase,
          area: Number(area.toFixed(2)),
        },
        geometry: { type: "Polygon", coordinates: [closeRing(polygon.map((point) => maplibrePoint(point, snapshot)))] },
      });
    });

    const pointsOfInterest = buildPointOfInterestCollections(record);

    record.collections = {
      roadsLeaflet: { type: "FeatureCollection", features: roadsLeaflet },
      roadsMaplibre: { type: "FeatureCollection", features: roadsMaplibre },
      buildingsLeaflet: { type: "FeatureCollection", features: buildingsLeaflet },
      buildingsMaplibre: { type: "FeatureCollection", features: buildingsMaplibre },
      landmarkBuildingsLeaflet: pointsOfInterest.landmarkBuildingsLeaflet,
      landmarkBuildingsMaplibre: pointsOfInterest.landmarkBuildingsMaplibre,
      poiLeaflet: pointsOfInterest.poiLeaflet,
      poiMaplibre: pointsOfInterest.poiMaplibre,
    };
    return record.collections;
  }

  function readFallbackCache() {
    try {
      const raw = localStorage.getItem(PLANET_MAP_FALLBACK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function writeFallbackCache(records) {
    try {
      localStorage.setItem(PLANET_MAP_FALLBACK_KEY, JSON.stringify(records || {}));
    } catch (_error) {
      // Ignore fallback write failures when the payload grows too large.
    }
  }

  function openPlanetMapDb() {
    if (runtime.dbPromise) return runtime.dbPromise;
    runtime.dbPromise = new Promise((resolve) => {
      if (!("indexedDB" in window)) {
        resolve(null);
        return;
      }
      try {
        const request = window.indexedDB.open(PLANET_MAP_DB_NAME, PLANET_MAP_DB_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(PLANET_MAP_STORE)) {
            database.createObjectStore(PLANET_MAP_STORE, { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (_error) {
        resolve(null);
      }
    });
    return runtime.dbPromise;
  }

  async function readStoredRecord(key) {
    if (runtime.memoryRecords.has(key)) return runtime.memoryRecords.get(key);
    const database = await openPlanetMapDb();
    if (database) {
      const result = await new Promise((resolve) => {
        try {
          const transaction = database.transaction(PLANET_MAP_STORE, "readonly");
          const request = transaction.objectStore(PLANET_MAP_STORE).get(key);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => resolve(null);
        } catch (_error) {
          resolve(null);
        }
      });
      if (result && result.version === PLANET_MAP_CACHE_VERSION) {
        runtime.memoryRecords.set(key, result);
        return result;
      }
      return null;
    }
    const fallback = readFallbackCache();
    const record = fallback[key];
    if (record && record.version === PLANET_MAP_CACHE_VERSION) {
      runtime.memoryRecords.set(key, record);
      return record;
    }
    return null;
  }

  async function writeStoredRecord(record) {
    runtime.memoryRecords.set(record.key, record);
    const database = await openPlanetMapDb();
    if (database) {
      await new Promise((resolve) => {
        try {
          const transaction = database.transaction(PLANET_MAP_STORE, "readwrite");
          transaction.objectStore(PLANET_MAP_STORE).put(record);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        } catch (_error) {
          resolve();
        }
      });
      return;
    }
    const fallback = readFallbackCache();
    fallback[record.key] = record;
    writeFallbackCache(fallback);
  }

  function buildPlanetRecord(item, snapshot, options = {}) {
    return {
      key: planetMapKey(item),
      version: PLANET_MAP_CACHE_VERSION,
      seed: options.seed || planetMapSeed(item),
      createdAt: options.createdAt || new Date().toISOString(),
      name: item.name,
      nameKey: normalizePlanetName(item.name),
      grid: normalizePlanetGrid(item.grid),
      region: item.region || "",
      faction: item.faction || "",
      climate: item.climate || "",
      terrain: item.terrain || "",
      desc: item.lore || item.desc || "",
      mapHref: item.map_href || "",
      mapLabel: item.map_label || "",
      theme: themePalette(item),
      snapshot: compactPlanetSnapshot(snapshot),
    };
  }

  async function loadBundledPlanetRecord(item) {
    const assetPath = bundledPlanetRecordPath(item);
    if (!assetPath) return null;
    const response = await fetch(assetPath, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Bundled planet map missing (${response.status})`);
    }
    const payload = await response.json();
    if (!payload?.snapshot) {
      throw new Error("Bundled planet map payload is invalid");
    }
    return buildPlanetRecord(item, payload.snapshot, {
      createdAt: payload.createdAt,
      seed: payload.seed,
    });
  }

  function createCityRandom(seed) {
    let state = Number.parseInt(hashString(seed), 10) || 1;
    return function () {
      state += 0x6d2b79f5;
      let sample = state;
      sample = Math.imul(sample ^ (sample >>> 15), sample | 1);
      sample ^= sample + Math.imul(sample ^ (sample >>> 7), sample | 61);
      return ((sample ^ (sample >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cityRectangle(x, y, width, height) {
    const left = Number(x || 0);
    const top = Number(y || 0);
    const right = left + Number(width || 0);
    const bottom = top + Number(height || 0);
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
  }

  function cityRoadAxes(size, rng, profile = {}) {
    const axes = [];
    let cursor = 34 + rng() * 24;
    let index = 0;
    const spacing = Number(profile.spacing || 86);
    const spacingJitter = Number(profile.spacingJitter || 42);
    const mainEvery = Math.max(2, Number(profile.mainEvery || 6));
    const majorEvery = Math.max(2, Number(profile.majorEvery || 3));
    while (cursor < size - 28) {
      const main = index % mainEvery === Math.floor(mainEvery / 2);
      const major = !main && index % majorEvery === 1;
      axes.push({
        position: cursor,
        width: main
          ? Number(profile.mainWidth || 42) + rng() * 12
          : major
            ? Number(profile.majorWidth || 24) + rng() * 8
            : Number(profile.minorWidth || 11) + rng() * 5,
        kind: main ? "main" : major ? "major" : "minor",
      });
      cursor += spacing + rng() * spacingJitter + (main ? spacing * 0.28 : major ? spacing * 0.12 : 0);
      index += 1;
    }
    return axes;
  }

  function pushCityRoad(snapshot, kind, polygon) {
    if (kind === "main") snapshot.mainRoadPolygons.push(polygon);
    else if (kind === "major") snapshot.majorRoadPolygons.push(polygon);
    else snapshot.minorRoadPolygons.push(polygon);
  }

  function addCityRoads(snapshot, verticalAxes, horizontalAxes) {
    verticalAxes.forEach((axis) => {
      pushCityRoad(snapshot, axis.kind, cityRectangle(axis.position - axis.width / 2, -12, axis.width, snapshot.height + 24));
    });
    horizontalAxes.forEach((axis) => {
      pushCityRoad(snapshot, axis.kind, cityRectangle(-12, axis.position - axis.width / 2, snapshot.width + 24, axis.width));
    });
  }

  function cityCorridorPolygon(x1, y1, x2, y2, width) {
    const length = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
    const offsetX = ((y2 - y1) / length) * (width / 2);
    const offsetY = ((x1 - x2) / length) * (width / 2);
    return [
      { x: x1 + offsetX, y: y1 + offsetY },
      { x: x2 + offsetX, y: y2 + offsetY },
      { x: x2 - offsetX, y: y2 - offsetY },
      { x: x1 - offsetX, y: y1 - offsetY },
    ];
  }

  function cityCirclePolygon(centerX, centerY, radius, points = 32) {
    return Array.from({ length: points }, (_entry, index) => {
      const angle = (Math.PI * 2 * index) / points;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }

  function cityPolarPoint(centerX, centerY, radius, angle) {
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }

  function cityArcBandPolygon(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, steps = 6) {
    const outer = [];
    const inner = [];
    const count = Math.max(2, steps);
    for (let index = 0; index <= count; index += 1) {
      const angle = startAngle + ((endAngle - startAngle) * index) / count;
      outer.push(cityPolarPoint(centerX, centerY, outerRadius, angle));
      inner.unshift(cityPolarPoint(centerX, centerY, innerRadius, angle));
    }
    return outer.concat(inner);
  }

  function cityPolarCellPolygon(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
    return [
      cityPolarPoint(centerX, centerY, innerRadius, startAngle),
      cityPolarPoint(centerX, centerY, outerRadius, startAngle),
      cityPolarPoint(centerX, centerY, outerRadius, endAngle),
      cityPolarPoint(centerX, centerY, innerRadius, endAngle),
    ];
  }

  function cityAngleDelta(startAngle, endAngle) {
    let delta = endAngle - startAngle;
    while (delta <= 0) delta += Math.PI * 2;
    return delta;
  }

  function ecumenopolisRoadPlan(snapshot, profile, rng) {
    const centerX = snapshot.width / 2;
    const centerY = snapshot.height / 2;
    const radius = Math.min(snapshot.width, snapshot.height) * 0.475;
    const ringCount = profile.key === "industrial" ? 6 : profile.key === "underworld" ? 8 : profile.key === "ancient" ? 7 : 8;
    const spokeCount = profile.key === "industrial" ? 24 : profile.key === "trade" ? 34 : profile.key === "underworld" ? 30 : 32;
    const twist = rng() * Math.PI * 2;
    const ringRadii = [];
    for (let index = 0; index < ringCount; index += 1) {
      const base = (index + 1) / ringCount;
      const curved = 0.11 + Math.pow(base, 1.06) * 0.88;
      ringRadii.push(radius * curved);
    }
    const spokeAngles = [];
    for (let index = 0; index < spokeCount; index += 1) {
      const jitter = (rng() - 0.5) * (Math.PI * 2 / spokeCount) * (profile.key === "underworld" ? 0.48 : 0.28);
      spokeAngles.push((twist + (Math.PI * 2 * index) / spokeCount + jitter + Math.PI * 2) % (Math.PI * 2));
    }
    spokeAngles.sort((left, right) => left - right);
    return { centerX, centerY, radius, ringRadii, spokeAngles };
  }

  function addEcumenopolisRadialRoads(snapshot, profile, rng, plan) {
    snapshot.footprintPolygon = cityCirclePolygon(plan.centerX, plan.centerY, plan.radius, 192);
    plan.ringRadii.forEach((radius, index) => {
      const kind = index === 0 || index === plan.ringRadii.length - 1 || index % 3 === 1 ? "main" : index % 2 === 0 ? "major" : "minor";
      const width =
        kind === "main"
          ? Number(profile.mainWidth || 44) * 1.25
          : kind === "major"
            ? Number(profile.majorWidth || 25) * 1.12
            : Number(profile.minorWidth || 12) * 1.08;
      const segmentCount = kind === "main" ? 64 : 48;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const startAngle = (Math.PI * 2 * segment) / segmentCount;
        const endAngle = (Math.PI * 2 * (segment + 1)) / segmentCount;
        pushCityRoad(snapshot, kind, cityArcBandPolygon(plan.centerX, plan.centerY, radius - width / 2, radius + width / 2, startAngle, endAngle, 3));
      }
    });
    plan.spokeAngles.forEach((angle, index) => {
      const kind = index % 8 === 0 ? "main" : index % 3 === 0 ? "major" : "minor";
      const width = kind === "main" ? Number(profile.mainWidth || 44) * 1.35 : kind === "major" ? Number(profile.majorWidth || 25) * 1.2 : Number(profile.minorWidth || 12);
      const start = cityPolarPoint(plan.centerX, plan.centerY, plan.ringRadii[0] * 0.3, angle);
      const end = cityPolarPoint(plan.centerX, plan.centerY, plan.radius * 1.03, angle + (rng() - 0.5) * 0.018);
      pushCityRoad(snapshot, kind, cityCorridorPolygon(start.x, start.y, end.x, end.y, width));
    });
    const connectorCount = profile.key === "trade" ? 16 : profile.key === "underworld" ? 18 : 12;
    for (let index = 0; index < connectorCount; index += 1) {
      const kind = index % 4 === 0 ? "major" : "minor";
      const startRadius = plan.radius * (0.24 + rng() * 0.5);
      const endRadius = Math.min(plan.radius * 0.98, startRadius + plan.radius * (0.18 + rng() * 0.28));
      const startAngle = rng() * Math.PI * 2;
      const endAngle = startAngle + (rng() > 0.5 ? 1 : -1) * (0.26 + rng() * 0.38);
      const start = cityPolarPoint(plan.centerX, plan.centerY, startRadius, startAngle);
      const end = cityPolarPoint(plan.centerX, plan.centerY, endRadius, endAngle);
      const width = kind === "major" ? Number(profile.majorWidth || 25) : Number(profile.minorWidth || 12);
      pushCityRoad(snapshot, kind, cityCorridorPolygon(start.x, start.y, end.x, end.y, width));
    }
  }

  function addEcumenopolisRadialBuildings(snapshot, profile, seed, rng, plan) {
    const center = { x: plan.centerX, y: plan.centerY };
    const rings = [plan.ringRadii[0] * 0.28, ...plan.ringRadii, plan.radius * 0.985];
    const maxAngularCells = profile.key === "industrial" ? 4 : profile.key === "ancient" ? 5 : 6;
    const maxRadialCells = profile.key === "industrial" ? 4 : 5;
    for (let sectorIndex = 0; sectorIndex < plan.spokeAngles.length; sectorIndex += 1) {
      const sectorStart = plan.spokeAngles[sectorIndex];
      const sectorEnd = plan.spokeAngles[(sectorIndex + 1) % plan.spokeAngles.length] + (sectorIndex === plan.spokeAngles.length - 1 ? Math.PI * 2 : 0);
      const sectorWidth = cityAngleDelta(sectorStart, sectorEnd);
      for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
        const innerBand = rings[ringIndex];
        const outerBand = rings[ringIndex + 1];
        const bandDepth = outerBand - innerBand;
        if (bandDepth < 38) continue;
        const arcLength = ((innerBand + outerBand) / 2) * sectorWidth;
        const angularCells = Math.max(1, Math.min(maxAngularCells, Math.floor(arcLength / (profile.key === "industrial" ? 72 : 48))));
        const radialCells = Math.max(1, Math.min(maxRadialCells, Math.floor(bandDepth / (profile.key === "industrial" ? 58 : 42))));
        for (let radial = 0; radial < radialCells; radial += 1) {
          for (let angular = 0; angular < angularCells; angular += 1) {
            const ringNoise = Math.abs(Math.sin((sectorIndex + 1) * 1.71 + (ringIndex + 1) * 2.19 + seed * 0.00001));
            if (rng() < Number(profile.skipChance || 0.03) * (profile.key === "ancient" ? 1.8 : 0.85)) continue;
            const radialMargin = 7 + rng() * 9;
            const cellStartAngle = sectorStart + (sectorWidth * angular) / angularCells;
            const cellEndAngle = sectorStart + (sectorWidth * (angular + 1)) / angularCells;
            const angularMargin = (cellEndAngle - cellStartAngle) * (0.12 + rng() * 0.06);
            const r1 = innerBand + (bandDepth * radial) / radialCells + radialMargin;
            const r2 = innerBand + (bandDepth * (radial + 1)) / radialCells - radialMargin;
            const a1 = cellStartAngle + angularMargin;
            const a2 = cellEndAngle - angularMargin;
            if (r2 - r1 < 10 || a2 - a1 < 0.002) continue;
            const polygon = cityPolarCellPolygon(center.x, center.y, r1, r2, a1, a2);
            const lotCenter = polygonCentroid(polygon);
            const centerRate = 1 - Math.min(1, Math.hypot(lotCenter.x - center.x, lotCenter.y - center.y) / plan.radius);
            const districtPulse = Math.abs(Math.sin((sectorIndex + 1) * 0.77 + (ringIndex + 1) * 1.43 + angular * 0.91 + seed * 0.00002));
            const heightValue =
              Number(profile.heightBase || 18) +
              rng() * Number(profile.heightRandom || 38) +
              centerRate * Number(profile.centerHeight || 44) +
              districtPulse * Number(profile.pulseHeight || 34) +
              ringNoise * 20 +
              (rng() < Number(profile.spireChance || 0.06) ? Number(profile.spireHeight || 70) : 0);
            snapshot.buildingModels.push({
              height: Number(heightValue.toFixed(1)),
              lotScreen: polygon,
            });
          }
        }
      }
    }
  }

  function addCityDiagonalRoads(snapshot, profile, rng) {
    const count = Number(profile.diagonalCount || 0);
    const length = Math.hypot(snapshot.width, snapshot.height) * 0.9;
    for (let index = 0; index < count; index += 1) {
      const kind = index % 5 === 0 ? "main" : index % 2 === 0 ? "major" : "minor";
      const width = kind === "main" ? profile.mainWidth + rng() * 13 : kind === "major" ? profile.majorWidth + rng() * 8 : profile.minorWidth + rng() * 5;
      const centerX = snapshot.width * (0.18 + rng() * 0.64);
      const centerY = snapshot.height * (0.18 + rng() * 0.64);
      const angle = (rng() * Math.PI * 0.55 + (index % 2 ? Math.PI * 0.18 : Math.PI * 0.68)) % Math.PI;
      const x1 = centerX - Math.cos(angle) * length;
      const y1 = centerY - Math.sin(angle) * length;
      const x2 = centerX + Math.cos(angle) * length;
      const y2 = centerY + Math.sin(angle) * length;
      const polygon = cityCorridorPolygon(x1, y1, x2, y2, width);
      if (kind === "main") snapshot.mainRoadPolygons.push(polygon);
      else if (kind === "major") snapshot.majorRoadPolygons.push(polygon);
      else snapshot.minorRoadPolygons.push(polygon);
    }
  }

  function addCityPlazas(snapshot, profile, rng) {
    const count = Number(profile.plazaCount || 0);
    for (let index = 0; index < count; index += 1) {
      const radius = (index === 0 ? 58 : 34) + rng() * 34;
      const centerX = snapshot.width * (0.16 + rng() * 0.68);
      const centerY = snapshot.height * (0.16 + rng() * 0.68);
      const polygon = cityCirclePolygon(centerX, centerY, radius, 34);
      if (index < 2) snapshot.mainRoadPolygons.push(polygon);
      else snapshot.majorRoadPolygons.push(polygon);
    }
  }

  function cityIntervals(size, axes) {
    const bands = axes
      .map((axis) => ({ start: axis.position - axis.width / 2, end: axis.position + axis.width / 2 }))
      .sort((left, right) => left.start - right.start);
    const intervals = [];
    let start = 18;
    bands.forEach((band) => {
      if (band.start - start > 34) intervals.push({ start, end: band.start });
      start = Math.max(start, band.end);
    });
    if (size - 18 - start > 34) intervals.push({ start, end: size - 18 });
    return intervals;
  }

  function addCityBuildings(snapshot, verticalIntervals, horizontalIntervals, seed, rng, profile = {}) {
    const center = { x: snapshot.width / 2, y: snapshot.height / 2 };
    const maximumDistance = Math.hypot(center.x, center.y);
    const largeCityFrame = Math.max(snapshot.width, snapshot.height) >= 4096;
    const lotBase = Number(profile.lotBase || 52) * (largeCityFrame ? 0.62 : 1);
    const lotVariance = largeCityFrame ? 10 : 18;
    const maxColumns = Number(profile.maxColumns || 4) + (largeCityFrame ? 2 : 0);
    const maxRows = Number(profile.maxRows || 4) + (largeCityFrame ? 2 : 0);
    verticalIntervals.forEach((vertical, column) => {
      horizontalIntervals.forEach((horizontal, row) => {
        const blockWidth = vertical.end - vertical.start;
        const blockHeight = horizontal.end - horizontal.start;
        if (blockWidth < 42 || blockHeight < 42) return;
        const columns = Math.max(1, Math.min(maxColumns, Math.floor(blockWidth / (lotBase + rng() * lotVariance))));
        const rows = Math.max(1, Math.min(maxRows, Math.floor(blockHeight / (lotBase + rng() * lotVariance))));
        const gap = largeCityFrame ? 2 + rng() * 5 : 3 + rng() * 7;
        const lotWidth = blockWidth / columns;
        const lotHeight = blockHeight / rows;
        for (let cellY = 0; cellY < rows; cellY += 1) {
          for (let cellX = 0; cellX < columns; cellX += 1) {
            if (rng() < Number(profile.skipChance || 0.05)) continue;
            const jitterX = rng() * Math.min(10, lotWidth * 0.13);
            const jitterY = rng() * Math.min(10, lotHeight * 0.13);
            const left = vertical.start + cellX * lotWidth + gap + jitterX;
            const top = horizontal.start + cellY * lotHeight + gap + jitterY;
            const width = lotWidth - gap * 2 - jitterX - rng() * Math.min(12, lotWidth * 0.15);
            const height = lotHeight - gap * 2 - jitterY - rng() * Math.min(12, lotHeight * 0.15);
            const minLotSize = largeCityFrame ? 8 : 18;
            if (width < minLotSize || height < minLotSize) continue;
            const lotCenter = { x: left + width / 2, y: top + height / 2 };
            const centerRate = 1 - Math.min(1, Math.hypot(lotCenter.x - center.x, lotCenter.y - center.y) / maximumDistance);
            const districtPulse = Math.abs(Math.sin((column + 1) * 1.73 + (row + 1) * 2.17 + seed * 0.00001));
            const heightValue =
              Number(profile.heightBase || 18) +
              rng() * Number(profile.heightRandom || 38) +
              centerRate * Number(profile.centerHeight || 44) +
              districtPulse * Number(profile.pulseHeight || 34) +
              (rng() < Number(profile.spireChance || 0.06) ? Number(profile.spireHeight || 70) : 0);
            snapshot.buildingModels.push({
              height: Number(heightValue.toFixed(1)),
              lotScreen: cityRectangle(left, top, width, height),
            });
          }
        }
      });
    });
  }

  function addCityLandmarkBuildings(snapshot, profile, rng) {
    const landmarks = Array.isArray(profile.landmarks) ? profile.landmarks : [];
    landmarks.forEach((landmark, index) => {
      const anchorX = Number(landmark.anchor?.[0] || 0.5) * snapshot.width;
      const anchorY = Number(landmark.anchor?.[1] || 0.5) * snapshot.height;
      const width = (index === 0 ? 130 : 92) + rng() * 52;
      const height = (index === 0 ? 122 : 84) + rng() * 46;
      const left = anchorX - width / 2 + (rng() - 0.5) * 34;
      const top = anchorY - height / 2 + (rng() - 0.5) * 34;
      snapshot.buildingModels.push({
        height: Number((155 + rng() * 120 + index * 24).toFixed(1)),
        lotScreen: cityRectangle(left, top, width, height),
      });
    });
  }

  function citySvgPolygon(polygon, fill, opacity) {
    const points = polygon
      .map((point) => `${Number(point.x || 0).toFixed(1)},${Number(point.y || 0).toFixed(1)}`)
      .join(" ");
    return `<polygon points="${points}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }

  function buildCityPreviewSvg(snapshot, profile = {}) {
    const palette = profile.preview || {
      ground: "#e5eadf",
      minor: "#cad4d1",
      major: "#f0f4ef",
      main: "#ffffff",
      low: "#d1cbbc",
      mid: "#aebdcc",
      high: "#8aa9cb",
    };
    const footprintMarkup = snapshot.footprintPolygon?.length
      ? `<polygon points="${snapshot.footprintPolygon.map((point) => `${Number(point.x || 0).toFixed(1)},${Number(point.y || 0).toFixed(1)}`).join(" ")}" fill="${palette.ground}" fill-opacity="1"/>`
      : `<rect width="100%" height="100%" fill="${palette.ground}"/>`;
    const roadMarkup = [
      ...snapshot.minorRoadPolygons.map((polygon) => citySvgPolygon(polygon, palette.minor, "0.92")),
      ...snapshot.majorRoadPolygons.map((polygon) => citySvgPolygon(polygon, palette.major, "0.98")),
      ...snapshot.mainRoadPolygons.map((polygon) => citySvgPolygon(polygon, palette.main, "1")),
    ].join("");
    const buildingMarkup = snapshot.buildingModels
      .map((building) => {
        const height = Number(building.height || 0);
        const fill = height > 115 ? palette.high : height > 70 ? palette.mid : palette.low;
        return citySvgPolygon(building.lotScreen, fill, height > 98 ? "0.98" : "0.9");
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${snapshot.width} ${snapshot.height}" width="${snapshot.width}" height="${snapshot.height}"><rect width="100%" height="100%" fill="#dfe5e8"/>${footprintMarkup}<g>${roadMarkup}</g><g stroke="${palette.major}" stroke-width="1.6">${buildingMarkup}</g></svg>`;
  }

  function generateNativeCitySnapshot(item, seed) {
    const numericSeed = Number.parseInt(String(seed || "0"), 10) || 1;
    const profile = cityPlanetProfile(item);
    const rng = createCityRandom(`${numericSeed}:${item?.name || "city"}:${profile.key}:${item?.terrain || ""}:${item?.climate || ""}`);
    const snapshot = {
      width: PLANET_MAP_FRAME_SIZE,
      height: PLANET_MAP_FRAME_SIZE,
      cityClass: profile.key,
      seaPolygon: [],
      riverPolygon: [],
      coastlinePolygon: [],
      footprintPolygon: [],
      mainRoadPolygons: [],
      majorRoadPolygons: [],
      minorRoadPolygons: [],
      buildingModels: [],
      svg: "",
    };
    if (Math.max(snapshot.width, snapshot.height) >= 4096) {
      const radialPlan = ecumenopolisRoadPlan(snapshot, profile, rng);
      addEcumenopolisRadialRoads(snapshot, profile, rng, radialPlan);
      addEcumenopolisRadialBuildings(snapshot, profile, numericSeed, rng, radialPlan);
    } else {
      const verticalAxes = cityRoadAxes(snapshot.width, rng, profile);
      const horizontalAxes = cityRoadAxes(snapshot.height, rng, profile);
      addCityRoads(snapshot, verticalAxes, horizontalAxes);
      addCityDiagonalRoads(snapshot, profile, rng);
      addCityPlazas(snapshot, profile, rng);
      addCityBuildings(snapshot, cityIntervals(snapshot.width, verticalAxes), cityIntervals(snapshot.height, horizontalAxes), numericSeed, rng, profile);
    }
    addCityLandmarkBuildings(snapshot, profile, rng);
    snapshot.svg = buildCityPreviewSvg(snapshot, profile);
    return snapshot;
  }

  async function createPlanetRecord(item) {
    const snapshot = generateNativeCitySnapshot(item, planetMapSeed(item));
    const record = buildPlanetRecord(item, snapshot);
    await writeStoredRecord(record);
    return record;
  }

  async function ensurePlanetRecord(item, options = {}) {
    const key = planetMapKey(item);
    if (runtime.pendingRecords.has(key)) return runtime.pendingRecords.get(key);
    if (!options.force) {
      const cached = await readStoredRecord(key);
      if (cached) return cached;
    }
    const task = (async () => {
      try {
        const bundledRecord = await loadBundledPlanetRecord(item);
        if (bundledRecord) {
          await writeStoredRecord(bundledRecord);
          return bundledRecord;
        }
      } catch (_error) {
        // Fall back to live generation when no bundled record is available.
      }
      return createPlanetRecord(item);
    })();
    runtime.pendingRecords.set(key, task);
    try {
      return await task;
    } finally {
      if (runtime.pendingRecords.get(key) === task) {
        runtime.pendingRecords.delete(key);
      }
    }
  }

  function renderSlotMarkup(slot, markup) {
    slot.classList.add("planet-map-slot");
    slot.innerHTML = markup;
  }

  function renderPilotSlot(slot, item) {
    const theme = themePalette(item);
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview is-disabled" style="--planet-map-accent:${htmlEscape(theme.accent)};--planet-map-glow:${htmlEscape(
        theme.glow
      )}">
        <div class="planet-map-preview-art planet-map-preview-empty">Pilot nur auf Coruscant</div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">Planet-Map Pilotphase</div>
          <div class="planet-map-preview-meta">Die datenbasierte Stadtkarte ist vorerst nur für Coruscant aktiv. Weitere Planeten schalten wir frei, sobald Speicher und Performance sauber skaliert sind.</div>
        </div>
        <div class="planet-map-preview-actions">
          <button type="button" class="planet-map-preview-primary" disabled aria-disabled="true">Noch gesperrt</button>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
  }

  function worldEditorHref(item) {
    const params = new URLSearchParams();
    params.set("name", item?.name || "Planet");
    params.set("seed", planetMapSeed(item));
    if (item?.grid) params.set("grid", item.grid);
    if (item?.region) params.set("region", item.region);
    if (item?.faction) params.set("faction", item.faction);
    if (item?.terrain) params.set("terrain", item.terrain);
    if (item?.climate) params.set("climate", item.climate);
    if (item?.species_population) params.set("species", item.species_population);
    const settlements = worldEditorSettlements(item);
    if (settlements.length) params.set("settlements", settlements.join("|"));
    params.set("returnTo", `${window.location.pathname}${window.location.search}${window.location.hash}`);
    return `${PLANET_WORLD_EDITOR_PATH}?${params.toString()}`;
  }

  function appendCityMapParam(params, key, value, limit = 360) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    params.set(key, text.length > limit ? text.slice(0, limit) : text);
  }

  function cityMapAppHref(item) {
    const params = new URLSearchParams();
    if (isCoruscantCityMap(item)) {
      params.set("_v", mapAccessVersion());
      if (!hasAdminMapAccess()) params.set("view", "public");
      return `${CORUSCANT_CITY_MAP_PATH}?${params.toString()}`;
    }
    const profile = cityPlanetProfile(item);
    params.set("_v", mapAccessVersion());
    if (!hasAdminMapAccess()) params.set("view", "public");
    params.set("name", item?.name || item?.nameKey || "Ecumenopolis");
    params.set("seed", planetMapSeed(item));
    appendCityMapParam(params, "grid", item?.grid, 40);
    appendCityMapParam(params, "region", item?.region, 80);
    appendCityMapParam(params, "faction", item?.faction, 140);
    appendCityMapParam(params, "terrain", item?.terrain, 160);
    appendCityMapParam(params, "climate", item?.climate, 120);
    appendCityMapParam(params, "species", item?.species_population, 240);
    appendCityMapParam(params, "desc", item?.desc || item?.lore, 420);
    appendCityMapParam(params, "profile", profile?.key, 40);
    return `${ECUMENOPOLIS_CITY_MAP_PATH}?${params.toString()}`;
  }

  function worldEditorSettlements(item) {
    const profileText = [item?.lore, item?.desc].filter(Boolean).join(" ");
    const match = profileText.match(/Wichtige Siedlungen sind ([^.]+)/i);
    if (!match) return [];

    const entries = match[1]
      .split(/[\u00b7;|]/)
      .map((raw, order) => {
        const capital = /\(\s*capital\s*\)/i.test(raw);
        const name = raw
          .replace(/\([^)]*\)/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return { capital, name, order };
      })
      .filter(({ name }) => name && !/^(a city|another city|a settlement|a village|village|mos)$/i.test(name));

    const unique = new Set();
    return entries
      .sort((left, right) => Number(right.capital) - Number(left.capital) || left.order - right.order)
      .map(({ name }) => name)
      .filter((name) => {
        const key = name.toLowerCase();
        if (unique.has(key)) return false;
        unique.add(key);
        return true;
      })
      .slice(0, 18);
  }

  function renderWorldEditorSlot(slot, item) {
    const theme = themePalette(item);
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview" style="--planet-map-accent:${htmlEscape(theme.accent)};--planet-map-glow:${htmlEscape(
        theme.glow
      )}">
        <div class="planet-map-preview-art planet-map-preview-empty">Azgaar Sci-Fi Editor</div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">${htmlEscape(item.name || "Planet")} Weltkarte</div>
          <div class="planet-map-preview-meta">Interaktive Weltkarte aus Profil-Terrain, Klima, Siedlungen, Kulturen und Militarbasisdaten.</div>
        </div>
        <div class="planet-map-preview-actions">
          <a class="planet-map-preview-primary" href="${htmlEscape(worldEditorHref(item))}">Weltkarte &ouml;ffnen</a>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
  }

  function slotExternalLink(item) {
    if (!item?.map_href) return "";
    return `<a class="planet-map-preview-secondary" href="${htmlEscape(item.map_href)}" target="_blank" rel="noreferrer noopener">${htmlEscape(
      item.map_label || "Externe Karte"
    )}</a>`;
  }

  function renderSlotLoading(slot, item) {
    const theme = themePalette(item);
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview is-loading" style="--planet-map-accent:${htmlEscape(theme.accent)};--planet-map-glow:${htmlEscape(
        theme.glow
      )}">
        <div class="planet-map-preview-art planet-map-preview-art-loading">
          <div class="planet-map-preview-spinner" aria-hidden="true"></div>
        </div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">Planetensiedlung wird vorbereitet</div>
          <div class="planet-map-preview-meta">Straßen und Gebäude für ${htmlEscape(item.name)} werden geladen und lokal zwischengespeichert.</div>
        </div>
        <div class="planet-map-preview-actions">
          <button type="button" class="planet-map-preview-primary">Planetenkarte öffnen</button>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
    const button = slot.querySelector(".planet-map-preview-primary");
    if (button) {
      button.addEventListener("click", () => openPlanetMapModal(item));
    }
  }

  function renderSlotReady(slot, item, record) {
    const metrics = planetRecordMetrics(record);
    const previewUrl = previewSvgUrl(record);
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview" style="--planet-map-accent:${htmlEscape(record.theme.accent)};--planet-map-glow:${htmlEscape(
        record.theme.glow
      )}">
        <div class="planet-map-preview-art">
          ${previewUrl ? `<img src="${previewUrl}" alt="${htmlEscape(item.name)} Planetenkarte"/>` : '<div class="planet-map-preview-empty">Keine Vorschau</div>'}
          <div class="planet-map-preview-badge">${htmlEscape(record.theme.familyLabel)}</div>
        </div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">${htmlEscape(item.name)} Stadtplan</div>
          <div class="planet-map-preview-meta">${metrics.buildings} Gebäude | ${metrics.roads} Straßenflächen | Seed ${htmlEscape(
        record.seed
      )}</div>
        </div>
        <div class="planet-map-preview-actions">
          <button type="button" class="planet-map-preview-primary">Planetenkarte öffnen</button>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
    const button = slot.querySelector(".planet-map-preview-primary");
    if (button) {
      button.addEventListener("click", () => openPlanetMapModal(item));
    }
  }

  function renderCoruscantCitySlot(slot, item) {
    const theme = themePalette(item);
    const label = isCoruscantCityMap(item) ? "Coruscant City Map" : "Ecumenopolis City Map";
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview" style="--planet-map-accent:${htmlEscape(theme.accent)};--planet-map-glow:${htmlEscape(
        theme.glow
      )}">
        <div class="planet-map-preview-art planet-map-preview-empty">${htmlEscape(label)}</div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">${htmlEscape(item.name || "Coruscant")} Stadtplan</div>
          <div class="planet-map-preview-meta">Full-Screen Karte mit Suche, Gebäudefarben und klickbaren Gebäudeinfos.</div>
        </div>
        <div class="planet-map-preview-actions">
          <button type="button" class="planet-map-preview-primary">Planetenkarte öffnen</button>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
    const button = slot.querySelector(".planet-map-preview-primary");
    if (button) {
      button.addEventListener("click", () => openCoruscantCityMap(item, { href: cityMapAppHref(item) }));
    }
  }

  function renderSlotError(slot, item, error) {
    renderSlotMarkup(
      slot,
      `<div class="planet-map-preview is-error">
        <div class="planet-map-preview-art planet-map-preview-empty">Generatorfehler</div>
        <div class="planet-map-preview-copy">
          <div class="planet-map-preview-title">Planetenkarte konnte nicht vorbereitet werden</div>
          <div class="planet-map-preview-meta">${htmlEscape(error?.message || "Unbekannter Fehler")}</div>
        </div>
        <div class="planet-map-preview-actions">
          <button type="button" class="planet-map-preview-primary">Erneut versuchen</button>
          ${slotExternalLink(item)}
        </div>
      </div>`
    );
    const button = slot.querySelector(".planet-map-preview-primary");
    if (button) {
      button.addEventListener("click", () => openPlanetMapModal(item, { force: true }));
    }
  }

  function clearSlot(slot) {
    if (!slot) return;
    slot.innerHTML = "";
    slot.classList.remove("planet-map-slot");
    slot.removeAttribute("data-planet-map-key");
  }

  function renderSlot(slot, item) {
    if (!slot || !item || item.kind === "route" || item.kind === "faction") {
      clearSlot(slot);
      return false;
    }
    if (!isCityMapPlanet(item)) {
      renderWorldEditorSlot(slot, item);
      return true;
    }
    slot.dataset.planetMapKey = `ecumenopolis-city-map:${normalizePlanetName(item.name || item.nameKey || "")}`;
    renderCoruscantCitySlot(slot, item);
    return true;
  }

  function ensureOverlayUi() {
    if (runtime.overlayReady) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="planetMapOverlay" class="planet-map-overlay hidden" aria-hidden="true">
        <div class="planet-map-overlay-backdrop" data-planet-map-close="true"></div>
        <section class="planet-map-modal" role="dialog" aria-modal="true" aria-labelledby="planetMapTitle">
          <header class="planet-map-modal-head">
            <div class="planet-map-modal-copy">
              <p class="planet-map-kicker">Planet-Map System</p>
              <h2 id="planetMapTitle" class="planet-map-title"></h2>
              <p id="planetMapSubtitle" class="planet-map-subtitle"></p>
            </div>
            <div class="planet-map-modal-actions">
              <button type="button" id="planetMapRefreshButton" class="ghost-button">Neu laden</button>
              <button type="button" id="planetMapCloseButton" class="ghost-button">Schliessen</button>
            </div>
          </header>
          <div class="planet-map-toolbar">
            <div id="planetMapMetrics" class="planet-map-metrics"></div>
            <div class="planet-map-view-toggle">
              <button type="button" class="planet-map-view-button is-active" data-planet-map-view="leaflet">2D</button>
              <button type="button" class="planet-map-view-button" data-planet-map-view="hybrid">3D</button>
            </div>
          </div>
          <div class="planet-map-layout">
            <aside class="planet-map-sidebar">
              <div id="planetMapOverview" class="planet-map-panel"></div>
              <div id="planetMapSourceNote" class="planet-map-panel"></div>
            </aside>
            <div class="planet-map-stage">
              <div id="planetMapLeafletPane" class="planet-map-pane is-active"></div>
              <div id="planetMapHybridPane" class="planet-map-pane planet-map-hybrid-pane">
                <div id="planetMapMaplibrePane" class="planet-map-hybrid-surface planet-map-hybrid-map"></div>
                <div id="planetMapThreePane" class="planet-map-hybrid-surface planet-map-hybrid-three"></div>
                <div class="planet-map-layer-badge">MapLibre + Three.js</div>
              </div>
              <div id="planetMapLoading" class="planet-map-loading hidden">
                <div class="planet-map-loading-spinner" aria-hidden="true"></div>
                <p id="planetMapLoadingText">Planetensiedlung wird vorbereitet...</p>
              </div>
            </div>
          </div>
        </section>
      </div>`
    );

    runtime.nodes.overlay = document.getElementById("planetMapOverlay");
    runtime.nodes.title = document.getElementById("planetMapTitle");
    runtime.nodes.subtitle = document.getElementById("planetMapSubtitle");
    runtime.nodes.metrics = document.getElementById("planetMapMetrics");
    runtime.nodes.overview = document.getElementById("planetMapOverview");
    runtime.nodes.sourceNote = document.getElementById("planetMapSourceNote");
    runtime.nodes.loading = document.getElementById("planetMapLoading");
    runtime.nodes.loadingText = document.getElementById("planetMapLoadingText");
    runtime.nodes.refresh = document.getElementById("planetMapRefreshButton");
    runtime.nodes.close = document.getElementById("planetMapCloseButton");
    runtime.nodes.leafletPane = document.getElementById("planetMapLeafletPane");
    runtime.nodes.hybridPane = document.getElementById("planetMapHybridPane");
    runtime.nodes.maplibrePane = document.getElementById("planetMapMaplibrePane");
    runtime.nodes.threePane = document.getElementById("planetMapThreePane");
    runtime.nodes.viewButtons = Array.from(document.querySelectorAll("[data-planet-map-view]"));

    runtime.nodes.close.addEventListener("click", closePlanetMapModal);
    runtime.nodes.refresh.addEventListener("click", () => {
      if (!runtime.activeItem) return;
      openPlanetMapModal(runtime.activeItem, { force: true });
    });
    runtime.nodes.overlay.addEventListener("click", (event) => {
      if (event.target && event.target.closest("[data-planet-map-close='true']")) {
        closePlanetMapModal();
      }
    });
    runtime.nodes.viewButtons.forEach((button) => {
      button.addEventListener("click", () => setPlanetMapView(button.dataset.planetMapView || "leaflet"));
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !runtime.nodes.overlay.classList.contains("hidden")) {
        closePlanetMapModal();
      }
    });
    window.addEventListener("resize", () => {
      syncPlanetMapResponsiveUi();
      if (runtime.activeRecord) {
        setPlanetMapView(runtime.currentView);
      }
    });
    runtime.overlayReady = true;
    syncPlanetMapResponsiveUi();
  }

  function ensureCoruscantCityOverlay() {
    if (runtime.coruscantCity.overlay) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="coruscantCityMapOverlay" class="coruscant-city-map-overlay hidden" aria-hidden="true">
        <iframe id="coruscantCityMapFrame" class="coruscant-city-map-frame" title="Ecumenopolis City Map"></iframe>
        <div class="coruscant-city-map-actions" aria-label="City-Map Kartenaktionen">
          <button type="button" class="coruscant-city-map-action" data-coruscant-city-map-close="true" aria-label="City-Map schliessen">×</button>
        </div>
      </div>`
    );
    runtime.coruscantCity.overlay = document.getElementById("coruscantCityMapOverlay");
    runtime.coruscantCity.frame = document.getElementById("coruscantCityMapFrame");
    runtime.coruscantCity.closeButton = document.querySelector("[data-coruscant-city-map-close]");
    runtime.coruscantCity.closeButton?.addEventListener("click", closeCoruscantCityMap);
    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && !runtime.coruscantCity.overlay?.classList.contains("hidden")) {
        closeCoruscantCityMap();
      }
    });
  }

  function openCoruscantCityMap(_item, options = {}) {
    ensureCoruscantCityOverlay();
    closePlanetMapModal();
    const frame = runtime.coruscantCity.frame;
    const overlay = runtime.coruscantCity.overlay;
    if (!frame || !overlay) return;
    const href = options.href || cityMapAppHref(_item);
    if (options.force || frame.getAttribute("src") !== href) {
      frame.src = href;
    }
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("planet-map-open");
  }

  function closeCoruscantCityMap() {
    const overlay = runtime.coruscantCity.overlay;
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("planet-map-open");
  }

  function setPlanetMapLoading(active, text) {
    ensureOverlayUi();
    runtime.nodes.loading.classList.toggle("hidden", !active);
    runtime.nodes.loadingText.textContent = text || "Planetensiedlung wird vorbereitet...";
  }

  function syncPlanetMapResponsiveUi() {
    ensureOverlayUi();
    const touchMode = planetMapTouchMode();
    const views = availablePlanetMapViews();
    runtime.nodes.overlay.classList.toggle("planet-map-touch-2d-only", touchMode);
    runtime.nodes.viewButtons.forEach((button) => {
      const allowed = views.includes(button.dataset.planetMapView || "");
      button.hidden = !allowed;
      button.disabled = !allowed;
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    });
    if (!views.includes(runtime.currentView)) {
      runtime.currentView = "leaflet";
    }
  }

  function renderModalMeta(item, record) {
    ensureOverlayUi();
    const metrics = planetRecordMetrics(record);
    buildFeatureCollections(record);
    const pointsOfInterest = Array.isArray(record.pointsOfInterest) ? record.pointsOfInterest : [];
    runtime.nodes.title.textContent = item.name || "Planet";
    runtime.nodes.subtitle.textContent = `${record.theme.familyLabel} - ${item.region || "Unbekannter Rim"} - Grid ${record.grid || "unbekannt"
      }`;
    runtime.nodes.metrics.innerHTML = [
      `${metrics.buildings} Gebäude`,
      `${metrics.roads} Straßenflächen`,
      pointsOfInterest.length ? `${pointsOfInterest.length} Points of Interest` : "",
      `Seed ${record.seed}`,
      record.faction ? `Fraktion ${htmlEscape(typeof factionDisplayName === "function" ? factionDisplayName(record.faction) : record.faction)}` : "",
    ]
      .filter(Boolean)
      .map((entry) => `<span class="planet-map-metric-chip">${entry}</span>`)
      .join("");
    const kindLegend = Object.entries(PLANET_MAP_BUILDING_KIND_LABELS)
      .map(
        ([kind, label]) =>
          `<span class="planet-map-kind-chip"><i style="background:${htmlEscape(
            buildingKindColor(kind)
          )}" aria-hidden="true"></i>${htmlEscape(label)}</span>`
      )
      .join("");

    runtime.nodes.overview.innerHTML = `
      <h3>Übersicht</h3>
      <p>${htmlEscape(record.desc || "Prozeduraler Stadtplan für diesen Planeten.")}</p>
      <div class="planet-map-kind-legend">${kindLegend}</div>
      <dl class="planet-map-overview-list">
        <div><dt>Terrainfamilie</dt><dd>${htmlEscape(record.theme.familyLabel)}</dd></div>
        <div><dt>Region</dt><dd>${htmlEscape(record.region || "Unbekannt")}</dd></div>
        <div><dt>Klima</dt><dd>${htmlEscape(record.climate || "Nicht hinterlegt")}</dd></div>
        <div><dt>Terrain</dt><dd>${htmlEscape(record.terrain || "Nicht hinterlegt")}</dd></div>
        <div><dt>Kartenraster</dt><dd>${htmlEscape(`${record.snapshot?.width || PLANET_MAP_FRAME_SIZE} x ${record.snapshot?.height || PLANET_MAP_FRAME_SIZE}`)}</dd></div>
        <div><dt>Kartenstil</dt><dd>${record.nameKey === "coruscant" ? "Coruscant Civic" : htmlEscape(record.theme.familyLabel)}</dd></div>
        <div><dt>Erzeugt</dt><dd>${htmlEscape(new Date(record.createdAt).toLocaleString("de-DE"))}</dd></div>
      </dl>
      ${record.mapHref ? `<a class="planet-map-panel-link" href="${htmlEscape(record.mapHref)}" target="_blank" rel="noreferrer noopener">${htmlEscape(record.mapLabel || "Externe Karte öffnen")}</a>` : ""}
    `;

    runtime.nodes.sourceNote.innerHTML = `
      <h3>Points of Interest</h3>
      <p>Die Landmarken orientieren sich an Wookieepedia-Einträgen für Coruscants Federal District. Die Zuordnung auf konkrete generierte Baukomplexe ist eine gestalterische Annäherung und keine kanonische GIS-Koordinate.</p>
      <div class="planet-map-source-list">
        ${pointsOfInterest
        .map(
          (poi) => `<a class="planet-map-source-item" href="${htmlEscape(poi.sourceHref)}" target="_blank" rel="noreferrer noopener">
              <strong>${htmlEscape(poi.label)}</strong>
              <span>${htmlEscape(poi.description)}</span>
            </a>`
        )
        .join("")}
      </div>
    `;
    if (record.nameKey !== "coruscant") {
      const sourceParagraph = runtime.nodes.sourceNote.querySelector("p");
      if (sourceParagraph) {
        sourceParagraph.textContent = `Die Landmarken werden aus dem ${record.theme.familyLabel}-Profil, der Infotabelle und dem Planetenseed erzeugt. Jede Ecumenopolis nutzt die Coruscant-Kartengroesse, aber eine eigene Stadtstruktur.`;
      }
    }
    if (!pointsOfInterest.length) {
      runtime.nodes.sourceNote.innerHTML = `
        <h3>Stadtkarte</h3>
        <p>Dieser Ecumenopolis-Ausschnitt wird pro Planet aus seinem Seed erzeugt. Strassenflaechen und Baukomplexe bleiben interaktiv und koennen spaeter mit planetenspezifischen Orten belegt werden.</p>
      `;
    }
  }

  function setPlanetMapView(nextView) {
    const views = availablePlanetMapViews();
    if (!views.includes(nextView)) {
      nextView = "leaflet";
    }
    ensureOverlayUi();
    syncPlanetMapResponsiveUi();
    runtime.currentView = nextView;
    runtime.nodes.viewButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.planetMapView === nextView);
    });
    runtime.nodes.leafletPane.classList.toggle("is-active", nextView === "leaflet");
    runtime.nodes.hybridPane.classList.toggle("is-active", nextView === "hybrid");
    if (runtime.activeRecord) {
      renderActiveView();
    }
  }

  async function loadLeafletModule() {
    if (window.L) return window.L;
    if (runtime.leafletModulePromise) return runtime.leafletModulePromise;
    runtime.leafletModulePromise = new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (window.L) {
          resolve(window.L);
          return;
        }
        if (Date.now() - startedAt > 12000) {
          reject(new Error("Leaflet konnte nicht geladen werden"));
          return;
        }
        window.setTimeout(tick, 40);
      };
      tick();
    });
    return runtime.leafletModulePromise;
  }

  async function loadMapLibre() {
    if (window.maplibregl) return window.maplibregl;
    if (runtime.maplibrePromise) return runtime.maplibrePromise;
    runtime.maplibrePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.21.1/dist/maplibre-gl.js";
      script.onload = () => resolve(window.maplibregl);
      script.onerror = () => reject(new Error("MapLibre konnte nicht geladen werden"));
      document.head.appendChild(script);
    });
    return runtime.maplibrePromise;
  }

  async function renderLeafletView(record) {
    const L = await loadLeafletModule();
    const snapshot = record.snapshot;
    const touchMode = planetMapTouchMode();
    const bounds = [
      [0, 0],
      [Number(snapshot.height || PLANET_MAP_FRAME_SIZE), Number(snapshot.width || PLANET_MAP_FRAME_SIZE)],
    ];
    const collections = buildFeatureCollections(record);
    const shouldFitBounds = runtime.leaflet.activeKey !== record.key;

    if (!runtime.leaflet.map) {
      runtime.leaflet.map = L.map(runtime.nodes.leafletPane, {
        crs: L.CRS.Simple,
        attributionControl: false,
        zoomSnap: 0.25,
        minZoom: -3,
        maxZoom: 5.5,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: !touchMode,
        tap: true,
        zoomControl: true,
      });
    }

    runtime.leaflet.map.dragging?.enable?.();
    runtime.leaflet.map.touchZoom?.enable?.();
    runtime.leaflet.map.scrollWheelZoom?.enable?.();
    if (touchMode) {
      runtime.leaflet.map.boxZoom?.disable?.();
      runtime.leaflet.map.keyboard?.disable?.();
      runtime.leaflet.map.doubleClickZoom?.disable?.();
      runtime.leaflet.map.tap?.enable?.();
    } else {
      runtime.leaflet.map.keyboard?.enable?.();
      runtime.leaflet.map.doubleClickZoom?.enable?.();
    }

    if (runtime.leaflet.group) {
      runtime.leaflet.group.remove();
      runtime.leaflet.group = null;
    }

    const group = L.featureGroup();
    L.rectangle(bounds, {
      stroke: false,
      fillColor: snapshot.footprintPolygon?.length ? "#dfe5e8" : record.theme.surface,
      fillOpacity: snapshot.footprintPolygon?.length ? 0 : 1,
      interactive: false,
    }).addTo(group);
    if (snapshot.footprintPolygon?.length) {
      L.polygon(snapshot.footprintPolygon.map(leafletLatLng), {
        color: "rgba(106, 119, 129, 0.38)",
        weight: 1,
        opacity: 0.5,
        fillColor: record.theme.surface,
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    }
    L.geoJSON(collections.roadsLeaflet, {
      style(feature) {
        const kind = feature?.properties?.kind;
        const fillColor = kind === "main" ? record.theme.roads : kind === "major" ? "#f6f7f2" : record.theme.roadsSoft;
        const fillOpacity = kind === "main" ? 1 : kind === "major" ? 0.92 : 0.8;
        return {
          color: "#b6c1cb",
          weight: kind === "main" ? 0.5 : 0.22,
          opacity: 0.42,
          fillColor,
          fillOpacity,
        };
      },
      onEachFeature(feature, layer) {
        const properties = feature?.properties || {};
        layer.bindPopup(
          `<strong>${htmlEscape(properties.label || "Straße")}</strong><br/>Typ: ${htmlEscape(
            roadKindLabel(properties.kind)
          )}<br/>Fläche: ${htmlEscape(formatNumber(properties.area, 0))} u2`,
          { maxWidth: 240 }
        );
      },
    }).addTo(group);

    L.geoJSON(collections.buildingsLeaflet, {
      style(feature) {
        const area = Number(feature?.properties?.area || 0);
        const height = Number(feature?.properties?.height || 0);
        const kind = feature?.properties?.kind || "private";
        const fillOpacity = area > 2000 ? 0.94 : area > 700 ? 0.88 : 0.8;
        return {
          color: PLANET_MAP_BUILDING_KIND_OUTLINES[kind] || record.theme.outline,
          weight: height > 40 ? 0.75 : 0.48,
          opacity: 0.5,
          fillColor: buildingKindColor(kind),
          fillOpacity,
        };
      },
      onEachFeature(feature, layer) {
        const properties = feature?.properties || {};
        layer.bindPopup(
          `<strong>${htmlEscape(properties.label || "Gebäude")}</strong><br/>Art: ${htmlEscape(
            properties.kindLabel || buildingKindLabel(properties.kind)
          )}<br/>Höhe: ${htmlEscape(
            formatNumber(properties.height, 1)
          )}<br/>Grundflaeche: ${htmlEscape(formatNumber(properties.area, 0))} u2`,
          { maxWidth: 240 }
        );
      },
    }).addTo(group);

    L.geoJSON(collections.landmarkBuildingsLeaflet, {
      style(feature) {
        const kind = feature?.properties?.kind || "state";
        return {
          color: PLANET_MAP_BUILDING_KIND_OUTLINES[kind] || PLANET_MAP_BUILDING_KIND_OUTLINES.state,
          weight: 1.05,
          opacity: 0.9,
          fillColor: buildingKindColor(kind),
          fillOpacity: 0.82,
        };
      },
      onEachFeature(feature, layer) {
        layer.bindPopup(pointOfInterestPopup(feature?.properties || {}), { maxWidth: 280 });
      },
    }).addTo(group);

    L.geoJSON(collections.poiLeaflet, {
      pointToLayer(feature) {
        return L.marker(leafletLatLng({
          x: feature?.geometry?.coordinates?.[0],
          y: feature?.geometry?.coordinates?.[1],
        }), {
          keyboard: false,
          icon: L.divIcon({
            className: "planet-map-poi-icon",
            html: pointOfInterestMarkerMarkup(feature?.properties || {}),
            iconSize: [150, 36],
            iconAnchor: [18, 36],
            popupAnchor: [18, -24],
          }),
        });
      },
      onEachFeature(feature, layer) {
        layer.bindPopup(pointOfInterestPopup(feature?.properties || {}), { maxWidth: 280 });
      },
    }).addTo(group);

    group.addTo(runtime.leaflet.map);
    runtime.leaflet.group = group;
    runtime.leaflet.activeKey = record.key;
    if (shouldFitBounds) {
      runtime.leaflet.map.fitBounds(bounds, { animate: false, padding: touchMode ? [28, 28] : [72, 72] });
    }
    runtime.leaflet.map.setMaxBounds([
      [-snapshot.height * 0.12, -snapshot.width * 0.12],
      [snapshot.height * 1.12, snapshot.width * 1.12],
    ]);
    window.requestAnimationFrame(() => runtime.leaflet.map.invalidateSize());
  }

  async function renderMapLibreView(record) {
    const maplibregl = await loadMapLibre();
    const collections = buildFeatureCollections(record);
    const bounds = mercatorBounds(record.snapshot);
    const hologram = hybridPalette(record);
    const style = {
      version: 8,
      sources: {
        roads: { type: "geojson", data: collections.roadsMaplibre },
        buildings: { type: "geojson", data: collections.buildingsMaplibre },
        landmarks: { type: "geojson", data: collections.landmarkBuildingsMaplibre },
      },
      layers: [
        { id: "background", type: "background", paint: { "background-color": hologram.background } },
        {
          id: "ground-glow",
          type: "fill",
          source: "roads",
          paint: {
            "fill-color": hologram.ground,
            "fill-opacity": 0.16,
          },
        },
        {
          id: "road-surface",
          type: "fill",
          source: "roads",
          paint: {
            "fill-color": ["match", ["get", "kind"], "main", hologram.roadsMain, "major", hologram.roadsMajor, hologram.roadsMinor],
            "fill-opacity": ["match", ["get", "kind"], "main", 0.82, "major", 0.62, 0.26],
          },
        },
        {
          id: "road-outline",
          type: "line",
          source: "roads",
          paint: {
            "line-color": hologram.outline,
            "line-width": ["match", ["get", "kind"], "main", 1.9, "major", 1.2, 0.64],
            "line-opacity": 0.7,
          },
        },
        {
          id: "building-footprint",
          type: "fill",
          source: "buildings",
          paint: {
            "fill-color": [
              "match",
              ["get", "kind"],
              "state", PLANET_MAP_BUILDING_KIND_COLORS.state,
              "commercial", PLANET_MAP_BUILDING_KIND_COLORS.commercial,
              "private", PLANET_MAP_BUILDING_KIND_COLORS.private,
              hologram.buildingsBase,
            ],
            "fill-opacity": 0.36,
          },
        },
        {
          id: "building-extrusion",
          type: "fill-extrusion",
          source: "buildings",
          paint: {
            "fill-extrusion-color": [
              "match",
              ["get", "kind"],
              "state", PLANET_MAP_BUILDING_KIND_COLORS.state,
              "commercial", PLANET_MAP_BUILDING_KIND_COLORS.commercial,
              "private", PLANET_MAP_BUILDING_KIND_COLORS.private,
              hologram.buildingsGlow,
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.84,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        {
          id: "landmark-extrusion",
          type: "fill-extrusion",
          source: "landmarks",
          paint: {
            "fill-extrusion-color": [
              "match",
              ["get", "kind"],
              "state", PLANET_MAP_BUILDING_KIND_COLORS.state,
              "commercial", PLANET_MAP_BUILDING_KIND_COLORS.commercial,
              "private", PLANET_MAP_BUILDING_KIND_COLORS.private,
              hologram.landmark,
            ],
            "fill-extrusion-height": ["get", "extrudeHeight"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.96,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        {
          id: "building-outline",
          type: "line",
          source: "buildings",
          paint: {
            "line-color": [
              "match",
              ["get", "kind"],
              "state", PLANET_MAP_BUILDING_KIND_OUTLINES.state,
              "commercial", PLANET_MAP_BUILDING_KIND_OUTLINES.commercial,
              "private", PLANET_MAP_BUILDING_KIND_OUTLINES.private,
              hologram.outline,
            ],
            "line-width": 0.86,
            "line-opacity": 0.76,
          },
        },
        {
          id: "landmark-outline",
          type: "line",
          source: "landmarks",
          paint: {
            "line-color": [
              "match",
              ["get", "kind"],
              "state", PLANET_MAP_BUILDING_KIND_OUTLINES.state,
              "commercial", PLANET_MAP_BUILDING_KIND_OUTLINES.commercial,
              "private", PLANET_MAP_BUILDING_KIND_OUTLINES.private,
              hologram.buildingsHigh,
            ],
            "line-width": 1.7,
            "line-opacity": 1,
          },
        },
      ],
    };

    if (runtime.maplibre.popup) {
      runtime.maplibre.popup.remove();
      runtime.maplibre.popup = null;
    }

    runtime.maplibre.markers.forEach((marker) => marker.remove());
    runtime.maplibre.markers = [];
    runtime.maplibre.cleanupMouseControls?.();
    runtime.maplibre.cleanupMouseControls = null;

    if (runtime.maplibre.map) {
      runtime.maplibre.map.remove();
      runtime.maplibre.map = null;
    }

    runtime.maplibre.map = new maplibregl.Map({
      container: runtime.nodes.maplibrePane,
      style,
      attributionControl: false,
      pitch: 76,
      bearing: -18,
      antialias: true,
      maxPitch: 84,
      maxZoom: 19,
      minZoom: 11,
      renderWorldCopies: false,
    });
    runtime.maplibre.cleanupMouseControls = setupMapLibreMouseControls(runtime.maplibre.map);
    runtime.maplibre.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    let initialized = false;
    let initializeAttempts = 0;
    const applyLoadedState = () => {
      if (initialized || !runtime.maplibre.map) return;
      const styleLayers = runtime.maplibre.map.getStyle?.()?.layers || [];
      if (!styleLayers.some((layer) => layer.id === "building-extrusion")) {
        initializeAttempts += 1;
        if (initializeAttempts < 90) {
          window.requestAnimationFrame(applyLoadedState);
        }
        return;
      }
      initialized = true;
      const center = [
        (bounds[0][0] + bounds[1][0]) * 0.5,
        (bounds[0][1] + bounds[1][1]) * 0.5,
      ];
      runtime.maplibre.map.jumpTo({
        center,
        zoom: 14.7,
        pitch: 78,
        bearing: -14,
      });
      runtime.maplibre.map.easeTo({
        center,
        zoom: 15.6,
        pitch: 80,
        bearing: -12,
        duration: 1200,
        essential: true,
      });
      runtime.maplibre.map.setMaxBounds([
        [bounds[0][0] - 10, bounds[0][1] - 10],
        [bounds[1][0] + 10, bounds[1][1] + 10],
      ]);
      collections.poiMaplibre.features.forEach((feature) => {
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = "planet-map-maplibre-marker";
        markerElement.innerHTML = pointOfInterestMarkerMarkup(feature?.properties || {});
        markerElement.addEventListener("click", () => {
          if (runtime.maplibre.popup) runtime.maplibre.popup.remove();
          runtime.maplibre.popup = new maplibregl.Popup({ closeButton: false, offset: 20 })
            .setLngLat(feature.geometry.coordinates)
            .setHTML(pointOfInterestPopup(feature?.properties || {}))
            .addTo(runtime.maplibre.map);
        });
        const marker = new maplibregl.Marker({
          element: markerElement,
          anchor: "bottom-left",
          offset: [0, 0],
        })
          .setLngLat(feature.geometry.coordinates)
          .addTo(runtime.maplibre.map);
        runtime.maplibre.markers.push(marker);
      });
      runtime.maplibre.map.on("mouseenter", "building-extrusion", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "pointer";
      });
      runtime.maplibre.map.on("mouseleave", "building-extrusion", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "";
      });
      runtime.maplibre.map.on("mouseenter", "landmark-extrusion", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "pointer";
      });
      runtime.maplibre.map.on("mouseleave", "landmark-extrusion", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "";
      });
      runtime.maplibre.map.on("mouseenter", "road-surface", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "pointer";
      });
      runtime.maplibre.map.on("mouseleave", "road-surface", () => {
        runtime.maplibre.map.getCanvas().style.cursor = "";
      });
      runtime.maplibre.map.on("click", "building-extrusion", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const properties = feature.properties || {};
        if (runtime.maplibre.popup) runtime.maplibre.popup.remove();
        runtime.maplibre.popup = new maplibregl.Popup({ closeButton: false, offset: 14 })
          .setLngLat(event.lngLat)
          .setHTML(
            `<strong>${htmlEscape(properties.label || "Gebäude")}</strong><br/>Art: ${htmlEscape(
              properties.kindLabel || buildingKindLabel(properties.kind)
            )}<br/>Höhe: ${htmlEscape(
              formatNumber(properties.heightRaw, 1)
            )}<br/>Grundflaeche: ${htmlEscape(formatNumber(properties.area, 0))} u2`
          )
          .addTo(runtime.maplibre.map);
      });
      runtime.maplibre.map.on("click", "landmark-extrusion", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        if (runtime.maplibre.popup) runtime.maplibre.popup.remove();
        runtime.maplibre.popup = new maplibregl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(event.lngLat)
          .setHTML(pointOfInterestPopup(feature.properties || {}))
          .addTo(runtime.maplibre.map);
      });
      runtime.maplibre.map.on("click", "road-surface", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const properties = feature.properties || {};
        if (runtime.maplibre.popup) runtime.maplibre.popup.remove();
        runtime.maplibre.popup = new maplibregl.Popup({ closeButton: false, offset: 14 })
          .setLngLat(event.lngLat)
          .setHTML(
            `<strong>${htmlEscape(properties.label || "Straße")}</strong><br/>Typ: ${htmlEscape(
              roadKindLabel(properties.kind)
            )}<br/>Fläche: ${htmlEscape(formatNumber(properties.area, 0))} u2`
          )
          .addTo(runtime.maplibre.map);
      });
      runtime.maplibre.map.resize();
    };
    runtime.maplibre.map.on("styledata", applyLoadedState);
    window.requestAnimationFrame(applyLoadedState);
    runtime.maplibre.activeKey = record.key;
  }

  function ensureThreeScene(THREE) {
    if (runtime.three.renderer) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.pointerEvents = "none";
    runtime.nodes.threePane.innerHTML = "";
    runtime.nodes.threePane.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2400);
    camera.position.set(0, 110, 240);
    camera.lookAt(0, 20, 0);
    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffffff, 1.18);
    const directional = new THREE.DirectionalLight(0xffffff, 0.75);
    directional.position.set(120, 160, 60);
    const rim = new THREE.DirectionalLight(0x7de3d7, 0.55);
    rim.position.set(-110, 35, -120);
    scene.add(ambient, directional, rim);

    runtime.three.renderer = renderer;
    runtime.three.scene = scene;
    runtime.three.camera = camera;
    runtime.three.root = root;

    runtime.three.resizeHandler = () => resizeThreeRenderer();
    window.addEventListener("resize", runtime.three.resizeHandler);
  }

  function resizeThreeRenderer() {
    if (!runtime.three.renderer || !runtime.three.camera) return;
    const width = Math.max(1, runtime.nodes.threePane.clientWidth || 1);
    const height = Math.max(1, runtime.nodes.threePane.clientHeight || 1);
    runtime.three.renderer.setSize(width, height, false);
    runtime.three.camera.aspect = width / height;
    runtime.three.camera.updateProjectionMatrix();
  }

  function renderThreeCamera() {
    const camera = runtime.three.camera;
    if (!camera) return;
    camera.position.set(0, 138, 212);
    camera.lookAt(0, 30, 0);
  }

  function stopThreeLoop() {
    if (!runtime.three.animationFrame) return;
    window.cancelAnimationFrame(runtime.three.animationFrame);
    runtime.three.animationFrame = 0;
  }

  function startThreeLoop() {
    stopThreeLoop();
    const tick = () => {
      runtime.three.animationFrame = 0;
      if (!runtime.three.renderer || !runtime.three.scene || !runtime.three.camera) return;
      const elapsed = performance.now() * 0.001;
      const root = runtime.three.root;
      const rotor = root?.userData?.rotor || root;
      const hoverGroup = root?.userData?.hoverGroup || root;
      if (rotor) {
        rotor.rotation.y = elapsed * 0.045;
      }
      if (hoverGroup) {
        hoverGroup.position.y = Math.sin(elapsed * 0.6) * 1.6;
      }
      const scanRing = root?.userData?.scanRing;
      if (scanRing?.material) {
        const pulse = 0.92 + Math.sin(elapsed * 2.8) * 0.08;
        scanRing.scale.setScalar(pulse);
        scanRing.material.opacity = 0.22 + (Math.sin(elapsed * 4.2) + 1) * 0.07;
      }
      const haloRing = root?.userData?.haloRing;
      if (haloRing?.material) {
        haloRing.material.opacity = 0.15 + (Math.sin(elapsed * 1.8) + 1) * 0.04;
      }
      const skylineMaterial = root?.userData?.skylineMaterial;
      if (skylineMaterial) {
        skylineMaterial.opacity = 0.16 + Math.sin(elapsed * 12.5) * 0.018 + Math.sin(elapsed * 2.9) * 0.04;
      }
      const skylineWireMaterial = root?.userData?.skylineWireMaterial;
      if (skylineWireMaterial) {
        skylineWireMaterial.opacity = 0.34 + Math.sin(elapsed * 9.6) * 0.03 + Math.sin(elapsed * 2.4) * 0.05;
      }
      const landmarkMaterial = root?.userData?.landmarkMaterial;
      if (landmarkMaterial) {
        landmarkMaterial.opacity = 0.26 + Math.sin(elapsed * 6.2) * 0.035 + Math.sin(elapsed * 1.9) * 0.05;
      }
      runtime.three.renderer.render(runtime.three.scene, runtime.three.camera);
      runtime.three.animationFrame = window.requestAnimationFrame(tick);
    };
    runtime.three.animationFrame = window.requestAnimationFrame(tick);
  }

  function buildThreeGeometry(THREE, record) {
    const root = runtime.three.root;
    const disposeNode = (node) => {
      if (!node) return;
      while (node.children?.length) {
        const child = node.children.pop();
        disposeNode(child);
      }
      if (node.geometry?.dispose) node.geometry.dispose();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    };
    while (root.children.length) {
      const child = root.children.pop();
      disposeNode(child);
    }
    root.userData = {};

    const snapshot = record.snapshot;
    const hologram = hybridPalette(record);
    const width = Math.max(1, Number(snapshot.width) || PLANET_MAP_FRAME_SIZE);
    const height = Math.max(1, Number(snapshot.height) || PLANET_MAP_FRAME_SIZE);
    const cityRadius = Math.max(70, Math.round((Math.max(width, height) / PLANET_MAP_FRAME_SIZE) * 110));
    const decorations = new THREE.Group();
    root.add(decorations);
    root.userData.rotor = decorations;
    root.userData.hoverGroup = decorations;

    const groundGlow = new THREE.Mesh(
      new THREE.CircleGeometry(cityRadius * 1.18, 72),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hologram.accent),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.4;
    decorations.add(groundGlow);

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(cityRadius * 1.02, cityRadius * 1.08, 96),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hologram.outline),
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 1.5;
    decorations.add(outerRing);
    root.userData.haloRing = outerRing;

    const scanRing = new THREE.Mesh(
      new THREE.RingGeometry(cityRadius * 0.46, cityRadius * 0.5, 96),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hologram.buildingsGlow),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    scanRing.rotation.x = -Math.PI / 2;
    scanRing.position.y = 3.2;
    decorations.add(scanRing);
    root.userData.scanRing = scanRing;

    const beamMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(hologram.outline),
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    });
    for (let index = 0; index < 26; index += 1) {
      const angle = (Math.PI * 2 * index) / 26;
      const radius = cityRadius * (0.34 + (index % 6) * 0.08);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x * 0.62, 42 + (index % 5) * 12, z * 0.62),
      ]);
      decorations.add(new THREE.Line(geometry, beamMaterial.clone()));
    }

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const i = index * 3;
      positions[i] = (Math.random() - 0.5) * 760;
      positions[i + 1] = 50 + Math.random() * 320;
      positions[i + 2] = (Math.random() - 0.5) * 760;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: hologram.outline,
        size: 1.9,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
      })
    );
    decorations.add(stars);
  }

  async function renderThreeView(record) {
    const THREE = await loadThreeModuleIfNeeded();
    ensureThreeScene(THREE);
    resizeThreeRenderer();
    if (runtime.three.activeKey !== record.key) {
      buildThreeGeometry(THREE, record);
      runtime.three.activeKey = record.key;
    }
    renderThreeCamera();
    runtime.three.renderer.render(runtime.three.scene, runtime.three.camera);
    startThreeLoop();
  }

  async function renderHybridView(record) {
    await renderMapLibreView(record);
    await renderThreeView(record);
  }

  async function renderActiveView() {
    if (!runtime.activeRecord) return;
    const record = runtime.activeRecord;
    if (!availablePlanetMapViews().includes(runtime.currentView)) {
      runtime.currentView = "leaflet";
    }
    if (runtime.currentView === "leaflet") {
      stopThreeLoop();
      await renderLeafletView(record);
      return;
    }
    if (runtime.currentView === "hybrid") {
      await renderHybridView(record);
    }
  }

  function closePlanetMapModal() {
    if (!runtime.overlayReady || !runtime.nodes.overlay) return;
    runtime.nodes.overlay.classList.add("hidden");
    runtime.nodes.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("planet-map-open");
    if (runtime.maplibre.popup) {
      runtime.maplibre.popup.remove();
      runtime.maplibre.popup = null;
    }
    stopThreeLoop();
  }

  async function openPlanetMapModal(item, options = {}) {
    if (!isCityMapPlanet(item)) return;
    openCoruscantCityMap(item, { ...options, href: options.href || cityMapAppHref(item) });
    return;
    ensureOverlayUi();
    syncPlanetMapResponsiveUi();
    runtime.activeItem = item;
    runtime.activeItemKey = planetMapKey(item);
    runtime.activeRecord = null;
    runtime.currentView = availablePlanetMapViews().includes(runtime.currentView) ? runtime.currentView : "leaflet";
    runtime.nodes.overlay.classList.remove("hidden");
    runtime.nodes.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("planet-map-open");
    runtime.nodes.title.textContent = item.name || "Planet";
    runtime.nodes.subtitle.textContent = "Planetensiedlung wird vorbereitet...";
    runtime.nodes.metrics.innerHTML = "";
    runtime.nodes.overview.innerHTML = "";
    runtime.nodes.sourceNote.innerHTML = "";
    setPlanetMapLoading(true, `Gebäude und Straßen für ${item.name} werden vorbereitet...`);

    try {
      const record = await ensurePlanetRecord(item, options);
      if (runtime.activeItemKey !== planetMapKey(item)) return;
      runtime.activeRecord = record;
      renderModalMeta(item, record);
      setPlanetMapLoading(false);
      await renderActiveView();
    } catch (error) {
      if (runtime.activeItemKey !== planetMapKey(item)) return;
      setPlanetMapLoading(false);
      runtime.nodes.overview.innerHTML = `
        <h3>Fehler</h3>
        <p>${htmlEscape(error?.message || "Planetensiedlung konnte nicht geladen werden.")}</p>
      `;
    }
  }

  function refreshPanels() {
    if (typeof renderPlanetPanel === "function") {
      renderPlanetPanel();
    }
    if (typeof renderFactionPanel === "function") {
      renderFactionPanel();
    }
  }

  window.PlanetMapSystem = {
    renderSlot,
    clearSlot,
    open: openPlanetMapModal,
    debugRuntime: runtime,
  };
  window.addEventListener("swmap-admin-auth-changed", refreshPanels);
  refreshPanels();
})();
