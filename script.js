const GRID_LETTERS = "ABCDEFGHIJKLMNOPQRSTUV";
const GRID_ROWS = 22;
const SESSION_STORAGE_KEY = "sw-galaxy-map-session-v2";
const FLEET_STORAGE_KEY = "sw-galaxy-map-fleets-v1";
const FLEET_AUTH_STORAGE_KEY = "sw-galaxy-map-fleet-auth-v1";
const PLANET_OVERRIDES_STORAGE_KEY = "sw-galaxy-map-planet-overrides-v1";
const FLEET_DEFAULT_PROFILE_NAME = "Lokaler Kommandant";
const FLEET_SYNC_DEBOUNCE_MS = 850;
const NEWS_READ_STORAGE_KEY = "sw-galaxy-map-news-read-v1";
const SECTOR_ARMY_TERRITORY_STORAGE_KEY = "sw-galaxy-map-sector-army-territories-v1";
const SECTOR_ARMY_DATA_STORAGE_KEY = "sw-galaxy-map-sector-armies-drafts-v1";
// Remove legacy/dev URL flags that could be used to accidentally enable editor features.
(function sanitizeDevParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    ["sectorEditor", "sectorTest"].forEach((p) => {
      if (params.has(p)) {
        params.delete(p);
        changed = true;
      }
    });
    if (changed) {
      history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`);
    }
  } catch (_e) {
    // ignore in environments without a window or URL
  }
})();
const FLEET_CATEGORY_ORDER = [
  "Star Dreadnoughts",
  "Battlecruisers",
  "Star Destroyers",
  "Heavy Cruisers",
  "Cruisers",
  "Frigates",
  "Corvettes",
  "Freighters",
  "Gunships & Transports",
  "Fightercraft",
  "Unsortiert",
];
const ALLOW_PIN_DRAG = false;
const SVG_NS = "http://www.w3.org/2000/svg";
const CALIBRATION_BASE_WIDTH = 6000;
const CALIBRATION_BASE_HEIGHT = 5388;
const HYPERSPACE_TRAVEL_BASE_HOURS = 168;
const HYPERSPACE_TRAVEL_BASE_GRID = 21;
const HYPERSPACE_TRAVEL_SAMPLE_STEP_PX = 3;
const HYPERSPACE_TRAVEL_SHORT_RUN_RATIO = 0.18;
const HYPERSPACE_ROUTE_SWITCH_PENALTY = 0.00001;
const VECTOR_LAYER_COLORS = {
  "deep core": "#8de6ff",
  core: "#ffd56f",
  colonies: "#b5ec8a",
  "inner rim": "#6fd8ff",
  "expansion region": "#89e6b5",
  "mid rim": "#f7de8c",
  grid: "#93f5ee",
  "republik fraktion": "#ff9cb0",
};
const OVERVIEW_PLANET_LABELS = new Set(["coruscant"]);
const PLANET_LABEL_PRIORITIES = {
  coruscant: 1000,
  alderaan: 180,
  corellia: 175,
  chandrila: 170,
  naboo: 165,
  tatooine: 160,
  mandalore: 155,
  kashyyyk: 150,
  kamino: 148,
  "yavin iv": 145,
  hoth: 142,
  dagobah: 140,
  endor: 138,
  mustafar: 135,
  geonosis: 132,
  dathomir: 128,
};
const PLANET_LABEL_ALL_VISIBLE_ZOOM = {
  mobile: 10.5,
  desktop: 9.4,
};
const JSON_FETCH_TIMEOUT_MS = 6500;
const ROUTE_PLANET_ALIASES = {
  abregado: "Abregado-rae",
  columex: "Columnex",
  "allanteen six": "Allanteen",
  "algara ii": "Algara",
  "andosha ii": "Andosha",
  "bestine iv": "Bestine",
  "jiroch-reslia": "Jiroch",
  "mytus vii": "Mytus",
  "thaere privo": "Thaere",
};
const HYPERSPACE_LAYER_GROUP_ID = "hyperraumrouten";
const LEGACY_SIDE_ROUTE_NAME = "neben routen";
const ALWAYS_VISIBLE_PATH_LABELS = new Set([
  "deep core",
  "core",
  "colonies",
  "inner rim",
  "expansion region",
  "mid rim",
]);
const FACTION_VISUALS = {
  separatist: {
    dotFill: "#137dff",
    dotFillOpacity: 1,
    dotStroke: "#e9f4ff",
    dotStrokeOpacity: 0.68,
    labelFill: "rgba(88, 178, 255, 0.99)",
    pinDotShadow: "rgba(19, 125, 255, 0.28)",
    pinLabelColor: "rgba(180, 223, 255, 0.99)",
    pinLabelBorder: "rgba(19, 125, 255, 0.58)",
    selectionRingColor: "rgba(108, 189, 255, 0.98)",
    selectionRingBg: "rgba(19, 125, 255, 0.2)",
    selectionRingShadow: "rgba(19, 125, 255, 0.14)",
    selectionDotFill: "rgba(19, 125, 255, 1)",
    selectionDotBorder: "rgba(233, 244, 255, 0.98)",
    hoverFill: "rgba(19, 125, 255, 0.42)",
    hoverBorder: "rgba(233, 244, 255, 0.96)",
    hoverShadow: "rgba(19, 125, 255, 0.12)",
  },
  republic: {
    dotFill: "#ff314e",
    dotFillOpacity: 1,
    dotStroke: "#fff1f4",
    dotStrokeOpacity: 0.68,
    labelFill: "rgba(255, 102, 124, 0.99)",
    pinDotShadow: "rgba(255, 49, 78, 0.28)",
    pinLabelColor: "rgba(255, 192, 201, 0.99)",
    pinLabelBorder: "rgba(255, 49, 78, 0.58)",
    selectionRingColor: "rgba(255, 126, 143, 0.99)",
    selectionRingBg: "rgba(255, 49, 78, 0.2)",
    selectionRingShadow: "rgba(255, 49, 78, 0.14)",
    selectionDotFill: "rgba(255, 49, 78, 1)",
    selectionDotBorder: "rgba(255, 241, 244, 0.98)",
    hoverFill: "rgba(255, 49, 78, 0.42)",
    hoverBorder: "rgba(255, 241, 244, 0.96)",
    hoverShadow: "rgba(255, 49, 78, 0.12)",
  },
  blacksun: {
    dotFill: "#ff8a24",
    dotFillOpacity: 1,
    dotStroke: "#ffe7c2",
    dotStrokeOpacity: 0.6,
    labelFill: "rgba(255, 178, 92, 0.99)",
    pinDotShadow: "rgba(255, 138, 36, 0.28)",
    pinLabelColor: "rgba(255, 224, 184, 0.99)",
    pinLabelBorder: "rgba(255, 138, 36, 0.58)",
    selectionRingColor: "rgba(255, 174, 92, 0.98)",
    selectionRingBg: "rgba(255, 138, 36, 0.2)",
    selectionRingShadow: "rgba(255, 138, 36, 0.14)",
    selectionDotFill: "rgba(255, 138, 36, 1)",
    selectionDotBorder: "rgba(255, 231, 194, 0.98)",
    hoverFill: "rgba(255, 138, 36, 0.42)",
    hoverBorder: "rgba(255, 231, 194, 0.96)",
    hoverShadow: "rgba(255, 138, 36, 0.12)",
  },
  hutt: {
    dotFill: "#ecbb1a",
    dotFillOpacity: 1,
    dotStroke: "#fff5cc",
    dotStrokeOpacity: 0.65,
    labelFill: "rgba(255, 222, 80, 0.99)",
    pinDotShadow: "rgba(236, 187, 26, 0.28)",
    pinLabelColor: "rgba(255, 232, 158, 0.99)",
    pinLabelBorder: "rgba(236, 187, 26, 0.58)",
    selectionRingColor: "rgba(255, 226, 110, 0.98)",
    selectionRingBg: "rgba(236, 187, 26, 0.2)",
    selectionRingShadow: "rgba(236, 187, 26, 0.14)",
    selectionDotFill: "rgba(236, 187, 26, 1)",
    selectionDotBorder: "rgba(255, 245, 204, 0.98)",
    hoverFill: "rgba(236, 187, 26, 0.42)",
    hoverBorder: "rgba(255, 245, 204, 0.96)",
    hoverShadow: "rgba(236, 187, 26, 0.12)",
  },
  pyke: {
    dotFill: "#2fa942",
    dotFillOpacity: 1,
    dotStroke: "#dafad8",
    dotStrokeOpacity: 0.62,
    labelFill: "rgba(120, 230, 138, 0.99)",
    pinDotShadow: "rgba(47, 169, 66, 0.28)",
    pinLabelColor: "rgba(186, 240, 196, 0.99)",
    pinLabelBorder: "rgba(47, 169, 66, 0.58)",
    selectionRingColor: "rgba(140, 230, 158, 0.98)",
    selectionRingBg: "rgba(47, 169, 66, 0.2)",
    selectionRingShadow: "rgba(47, 169, 66, 0.14)",
    selectionDotFill: "rgba(47, 169, 66, 1)",
    selectionDotBorder: "rgba(218, 250, 216, 0.98)",
    hoverFill: "rgba(47, 169, 66, 0.42)",
    hoverBorder: "rgba(218, 250, 216, 0.96)",
    hoverShadow: "rgba(47, 169, 66, 0.12)",
  },
  ohnaka: {
    dotFill: "#9b3ec8",
    dotFillOpacity: 1,
    dotStroke: "#f1d8ff",
    dotStrokeOpacity: 0.6,
    labelFill: "rgba(204, 142, 240, 0.99)",
    pinDotShadow: "rgba(155, 62, 200, 0.28)",
    pinLabelColor: "rgba(228, 200, 250, 0.99)",
    pinLabelBorder: "rgba(155, 62, 200, 0.58)",
    selectionRingColor: "rgba(214, 158, 245, 0.98)",
    selectionRingBg: "rgba(155, 62, 200, 0.2)",
    selectionRingShadow: "rgba(155, 62, 200, 0.14)",
    selectionDotFill: "rgba(155, 62, 200, 1)",
    selectionDotBorder: "rgba(241, 216, 255, 0.98)",
    hoverFill: "rgba(155, 62, 200, 0.42)",
    hoverBorder: "rgba(241, 216, 255, 0.96)",
    hoverShadow: "rgba(155, 62, 200, 0.12)",
  },
};
const NEUTRAL_PLANET_VISUALS = {
  saved: {
    fill: "#f8fbff",
    fillOpacity: 0.88,
    stroke: "#ffffff",
    strokeOpacity: 0.24,
  },
  known: {
    fill: "#f8fbff",
    fillOpacity: 0.58,
    stroke: "#ffffff",
    strokeOpacity: 0.13,
  },
};
const FACTION_LABELS = {
  republic: "Galaktische Republik",
  separatist: "Separatisten",
  blacksun: "Black Sun",
  hutt: "Huttenkartelle",
  pyke: "Pyke-Syndikat",
  ohnaka: "Hondo Ohnakas Bande",
};
const FACTION_MAIN_PLANETS = {
  republic: "Coruscant",
  separatist: "Raxus",
  blacksun: "Coruscant",
  hutt: "Klatooine",
  pyke: "Oba Diah",
  ohnaka: "Florrum",
};
const SECTOR_ARMY_STATUS_META = {
  "republic-secured": {
    label: "Republik gesichert",
    fill: "rgba(140, 198, 255, 0.19)",
    stroke: "rgba(229, 245, 255, 0.86)",
    glow: "rgba(119, 196, 255, 0.32)",
  },
  "republic-leaning": {
    label: "Republik-Vorteil",
    fill: "rgba(88, 176, 255, 0.17)",
    stroke: "rgba(120, 207, 255, 0.82)",
    glow: "rgba(88, 176, 255, 0.26)",
  },
  contested: {
    label: "Umkämpft",
    fill: "rgba(197, 121, 255, 0.14)",
    stroke: "rgba(246, 194, 102, 0.84)",
    glow: "rgba(231, 165, 71, 0.3)",
  },
  "cis-pressure": {
    label: "KUS-Druckraum",
    fill: "rgba(255, 91, 76, 0.16)",
    stroke: "rgba(255, 159, 96, 0.86)",
    glow: "rgba(255, 111, 69, 0.32)",
  },
  reserve: {
    label: "Strategische Reserve",
    fill: "rgba(232, 189, 104, 0.2)",
    stroke: "rgba(255, 223, 142, 0.92)",
    glow: "rgba(232, 189, 104, 0.36)",
  },
};
const REPUBLIC_SECTOR_FIELD_LABELS = {
  heavyCommand: "Schwere Kommandoschiffe",
  venator: "Venator",
  victory: "Victory",
  acclamator: "Acclamator",
  dreadHeavy: "Dread/Schwere Kreuzer",
  escortSupport: "Eskorte & Support",
};
const CIS_SECTOR_FIELD_LABELS = {
  lucrehulk: "Lucrehulk",
  providence: "Providence",
  recusant: "Recusant",
  bulwark: "Bulwark",
  munificent: "Munificent",
  dreadCruiser: "Dread/Cruiser",
  support: "Support",
};
const SECTOR_SHIP_AVAILABILITY_FIELDS = [
  { key: "free", label: "Frei", cssClass: "is-free" },
  { key: "frontBound", label: "Frontgebunden", cssClass: "is-front-bound" },
  { key: "garrison", label: "Garnison", cssClass: "is-garrison" },
  { key: "repair", label: "Reparatur", cssClass: "is-repair" },
  { key: "locked", label: "Gesperrt", cssClass: "is-locked" },
];
const SECTOR_SHIP_AVAILABILITY_KEYS = SECTOR_SHIP_AVAILABILITY_FIELDS.map((field) => field.key);
// Zusaetzliche Welten an denen ein Underworld-Banner erzwungen wird,
// auch wenn sie geographisch isoliert sind. Nutzt das gleiche Anker-System
// wie FACTION_MAIN_PLANETS — wird zusaetzlich angewandt.
const FACTION_EXTRA_ANCHORS = {
  blacksun: ["Mustafar"],
  hutt: [],
  pyke: [],
  ohnaka: [],
};
const GOVERNMENT_FACTION_KEYS = ["republic", "separatist"];
const UNDERWORLD_FACTION_KEYS = ["blacksun", "hutt", "pyke", "ohnaka"];
const GOVERNMENT_CORE_CLUSTER_MIN_PLANETS = 110;
const FACTION_LOGO_URLS = {
  republic: "assets/factions/republic.svg",
  separatist: "assets/factions/cis.svg",
  blacksun: "assets/factions/blacksun.webp",
  hutt: "assets/factions/hutt.png",
  pyke: "assets/factions/pyke.png",
  ohnaka: "assets/factions/ohnaka.webp",
};
const DEFAULT_FACTION_PROFILES = {
  republic: {
    faction: "republic",
    name: "Galaktische Republik",
    summary:
      "Im Jahr 20 BBY steht die Galaktische Republik mitten in den Klonkriegen. Senat, Jedi-Orden und Klonarmee halten die Kernwelten und die wichtigsten Hyperraumachsen zusammen, waehrend Kanzler Palpatine immer mehr Macht in der Exekutive buendelt. Nach aussen wirkt die Republik wie die Schutzmacht der Ordnung, innen beginnt sie sich bereits in die spaetere imperiale Zentralherrschaft zu verwandeln.",
    government: "Galaktischer Senat, Oberster Kanzler Palpatine, Jedi-Generaele, Groesse Armee der Republik",
    strength: "Kernwelten, Kolonien und zahlreiche loyalistische Frontsysteme",
    main_planet: FACTION_MAIN_PLANETS.republic,
    sources: [
      { title: "Galactic Republic", url: "https://starwars.fandom.com/wiki/Galactic_Republic" },
      { title: "Galactic Republic/Legends", url: "https://starwars.fandom.com/wiki/Galactic_Republic/Legends" },
    ],
  },
  separatist: {
    faction: "separatist",
    name: "Separatisten",
    summary:
      "Im Jahr 20 BBY fuehrt die Konfoederation unabhaengiger Systeme den Krieg gegen die Republik unter Graf Dooku. Ihr Einfluss konzentriert sich vor allem auf Fronten des Mid und Outer Rim, wo Konzernverbuende und Droidenarmeen ganze Kriegsschauplaetze dominieren. Offiziell kaempft die KUS fuer Sezession und Selbstbestimmung, praktisch wird ihr Kurs stark von Sith- und Konzerninteressen gelenkt.",
    government: "Konfoederation unabhaengiger Systeme, Graf Dooku, Droidenarmeen der Handels- und Techno-Unionen",
    strength: "Starke Frontpraesenz im Mid und Outer Rim, droidengestuetzte Offensivkriegfuehrung",
    main_planet: FACTION_MAIN_PLANETS.separatist,
    sources: [
      {
        title: "Confederacy of Independent Systems",
        url: "https://starwars.fandom.com/wiki/Confederacy_of_Independent_Systems",
      },
      {
        title: "Confederacy of Independent Systems/Legends",
        url: "https://starwars.fandom.com/wiki/Confederacy_of_Independent_Systems/Legends",
      },
    ],
  },
};
const FACTION_FRAGMENT_VISUALS = {
  separatist: {
    ambientHex: "#12395f",
    coreHex: "#2d78c6",
    glowHex: "#6db2ff",
    bannerHex: "#6db2ff",
    bannerOpacity: 0.2,
  },
  republic: {
    ambientHex: "#5d1e2c",
    coreHex: "#b63144",
    glowHex: "#ff7587",
    bannerHex: "#ff5b6f",
    bannerOpacity: 0.2,
  },
  blacksun: {
    ambientHex: "#4a2608",
    coreHex: "#bd5f13",
    glowHex: "#ff9c3d",
    bannerHex: "#ffb160",
    bannerOpacity: 0.17,
  },
  hutt: {
    ambientHex: "#4a3a08",
    coreHex: "#b08412",
    glowHex: "#ffd770",
    bannerHex: "#ffe9a0",
    bannerOpacity: 0.16,
  },
  pyke: {
    ambientHex: "#0f3a18",
    coreHex: "#1f8030",
    glowHex: "#6cd97c",
    bannerHex: "#a8eeb5",
    bannerOpacity: 0.15,
  },
  ohnaka: {
    ambientHex: "#3a1352",
    coreHex: "#7a2cb0",
    glowHex: "#cd9aff",
    bannerHex: "#e2c2ff",
    bannerOpacity: 0.15,
  },
};
const FACTION_FRAGMENT_LINK_DISTANCE_RATIO = 0.032;
const FACTION_FRAGMENT_MIN_PLANETS = 12;
const FACTION_FRAGMENT_MIN_PLANETS_BY_FACTION = {
  blacksun: 4,
  hutt: 5,
  pyke: 4,
  ohnaka: 4,
};
const VIEW_HELP_TEXT = {
  "2d":
    "Mausrad zoomt, Ziehen verschiebt die Karte, Punkte, Fraktionsbanner und Hyperraumrouten lassen sich per Klick oder Tap direkt auswaehlen.",
  "3d":
    "3D-Modus: Ziehen dreht die Galaxie, Mausrad zoomt zur Mausposition, Hover zeigt Planetennamen, Klick oeffnet den Orbit.",
};
const THREE_VIEW_TRANSITION_PROGRESS_LOCK = 0.94;
const THREE_VIEW_TRANSITION_MIN_MS = 2600;
const THREE_VIEW_TRANSITION_READY_HOLD_MS = 420;
const THREE_VIEW_TRANSITION_FADE_MS = 480;
const THREE_VIEW_TRANSITION_STARFIELD_DENSITY = {
  desktop: 420,
  mobile: 240,
};
const LANDING_INTRO_PROGRESS_LOCK = 0.94;
const LANDING_INTRO_READY_PROGRESS_LOCK = 0.985;
const LANDING_INTRO_COMPLETE_PROGRESS = 0.995;
const LANDING_INTRO_MIN_ACTIVE_MS = 1200;
const LANDING_INTRO_READY_HOLD_MS = 260;
const LANDING_STARFIELD_DENSITY = {
  desktop: 760,
  mobile: 420,
};
const PLANET_DATA_OVERRIDES = {
  abanol: { faction: "republic", region: "Core Worlds" },
  alland: { faction: "republic", region: "Core Worlds" },
  aradia: { faction: "republic", region: "Core Worlds" },
  "cal-set": { faction: "republic", region: "Core Worlds" },
  constancia: { faction: "republic", region: "Deep Core" },
  crystan: { faction: "republic", region: "Deep Core" },
  dulvoyinn: { faction: "republic", region: "Deep Core" },
  fresia: { faction: "republic", region: "Core Worlds" },
  galand: { faction: "republic", region: "Core Worlds" },
  galantos: { faction: "republic", region: "Core Worlds" },
  "j't'p'tan": { faction: "republic", region: "Core Worlds" },
  jerrilek: { faction: "republic", region: "Deep Core" },
  kaikielius: { faction: "republic", region: "Core Worlds" },
  kalist: { faction: "republic", region: "Deep Core" },
  kampe: { faction: "republic", region: "Deep Core" },
  keeara: { faction: "republic", region: "Deep Core" },
  khomm: { faction: "republic", region: "Deep Core" },
  kokash: { faction: "republic", region: "Core Worlds" },
  kuar: { faction: "republic", region: "Deep Core" },
  lialic: { faction: "republic", region: "Deep Core" },
  merakai: { faction: "republic", region: "Core Worlds" },
  mrisst: { faction: "republic", region: "Core Worlds" },
  "n'zoth": { faction: "republic", region: "Core Worlds" },
  norkronia: { faction: "republic", region: "Core Worlds" },
  odik: { faction: "republic", region: "Deep Core" },
  pollillus: { faction: "republic", region: "Core Worlds" },
  praxlis: { faction: "republic", region: "Core Worlds" },
  salliche: { faction: "republic", region: "Core Worlds" },
  symbia: { faction: "republic", region: "Deep Core" },
  tamban: { faction: "republic", region: "Core Worlds" },
  "tsoss beacon": { faction: "republic", region: "Deep Core" },
  twith: { faction: "republic", region: "Core Worlds" },
  tython: { faction: "republic", region: "Deep Core" },
  tzarib: { faction: "republic", region: "Core Worlds" },
  "veöisoa": { faction: "republic", region: "Core Worlds" },
  widek: { faction: "republic", region: "Core Worlds" },
};
const THREE_VIEW_WORLD_WIDTH = 280;
const THREE_VIEW_WORLD_HEIGHT = 248;
const THREE_VIEW_BULGE_HEIGHT = 0;
const THREE_VIEW_DISC_VARIANCE = 0.82;
const THREE_VIEW_DISC_MICRO_VARIANCE = 0.14;
const THREE_VIEW_PLANET_LIFT = 1.8;
const THREE_VIEW_ROUTE_ARC_HEIGHT = 0.72;
const THREE_VIEW_DEFAULT_DISTANCE = 420;
const THREE_VIEW_DEFAULT_YAW = -0.58;
const THREE_VIEW_DEFAULT_PITCH = 0.54;
const THREE_VIEW_MIN_DISTANCE = 8;
const THREE_VIEW_MAX_DISTANCE = 1900;
const THREE_ORBIT_VIEW_DISTANCE = 12.4;
const THREE_ORBIT_MIN_DISTANCE = 8.2;
const THREE_ORBIT_MAX_DISTANCE = 58;
const THREE_ORBIT_EXIT_DISTANCE = 48;
const THREE_ORBIT_SPHERE_RADIUS = 10.4;
const THREE_ORBIT_RADIUS_EXPONENT = 0.36;
const THREE_ORBIT_RADIUS_MIN_FACTOR = 0.58;
const THREE_ORBIT_RADIUS_MAX_FACTOR = 1.92;
const THREE_ORBIT_SURFACE_MIN_RATIO = 0.08;
const THREE_ORBIT_SURFACE_VIEW_RATIO = 0.48;
const THREE_ORBIT_SURFACE_MAX_RATIO = 3.25;
const DEFAULT_PLANET_DIAMETER_KM = 1000;
const DEFAULT_PLANET_RADIUS_KM = DEFAULT_PLANET_DIAMETER_KM * 0.5;
const THREE_BACKGROUND_ROTATION_SPEED = 0.0011;
const OPENSPACE_REFERENCE_RADII_KM = Object.freeze({
  terrestrial: 6378.137,
  gasGiant: 71492,
  moon: 1737,
});
const THREE_RIM_HUD_REGIONS = Object.freeze([
  { name: "Deep Core", accent: "#8de6ff", direction: { x: -0.92, z: 0.38 } },
  { name: "Core", accent: "#ffd56f", direction: { x: -0.34, z: 0.94 } },
  { name: "Colonies", accent: "#b5ec8a", direction: { x: 0.44, z: 0.9 } },
  { name: "Inner Rim", accent: "#6fd8ff", direction: { x: 0.96, z: 0.18 } },
  { name: "Expansion Region", accent: "#89e6b5", direction: { x: 0.82, z: -0.58 } },
  { name: "Mid Rim", accent: "#f7de8c", direction: { x: 0.08, z: -1 } },
]);
const THREE_RIM_LIGHT_LAYERS = Object.freeze([
  { height: 5.8, opacity: 0.11, offsets: [0], shimmerPhase: 0.0 },
  { height: 11.5, opacity: 0.05, offsets: [0], shimmerPhase: 1.6 },
  { height: 18.5, opacity: 0.024, offsets: [-0.45, 0.45], shimmerPhase: 3.1 },
  { height: 27, opacity: 0.012, offsets: [-1.0, 1.0], shimmerPhase: 4.7 },
]);
const THREE_RIM_SAMPLE_SUBDIVISIONS = 10;
const THREE_RIM_LABEL_LIFT = 7.2;
const THREE_POINT_SIZE_DISTANCE_EXPONENT = 0.82;
const THREE_POINT_SIZE_MIN_FACTOR = 0.075;
const THREE_POINT_SIZE_MAX_FACTOR = 1.85;
const THREE_PERFORMANCE_PRESETS = {
  default: {
    maxPixelRatio: 1.25,
    antialias: true,
    starCount: 23600,
    twinkleStarCount: 17600,
    travelerStarCount: 13800,
    interplanetaryStarCount: 26000,
    orbitRingCount: 0,
    orbitRingSegments: 32,
    discSegments: 0,
    routePointBudget: 36,
    routeRenderLimit: 999,
    hoverThrottleMs: 0,
    markerScale: 1,
    pointSize: 2.65,
    rayPointThreshold: 4.8,
    rayLineThreshold: 3,
  },
  lowPower: {
    maxPixelRatio: 1,
    antialias: false,
    starCount: 2200,
    twinkleStarCount: 1400,
    travelerStarCount: 560,
    interplanetaryStarCount: 0,
    orbitRingCount: 0,
    orbitRingSegments: 22,
    discSegments: 0,
    routePointBudget: 18,
    routeRenderLimit: 999,
    hoverThrottleMs: 72,
    markerScale: 0.82,
    pointSize: 2.1,
    rayPointThreshold: 5.4,
    rayLineThreshold: 4,
  },
};
const THREE_CAMERA_SETTLE_EPSILON = {
  focus: 0.0012,
  angle: 0.0012,
  distance: 0.12,
};

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const gridInput = document.getElementById("gridInput");
const gridPrev = document.getElementById("gridPrev");
const gridNext = document.getElementById("gridNext");
const gridFocus = document.getElementById("gridFocus");
const gridStats = document.getElementById("gridStats");
const gridMeta = document.getElementById("gridMeta");
const contextList = document.getElementById("contextList");
const contextCount = document.getElementById("contextCount");
const resetSelectionButton = document.getElementById("resetSelectionButton");
const mapToolsTitle = document.getElementById("mapToolsTitle");
const mapToolsSummaryChip = document.getElementById("mapToolsSummaryChip");
const viewerHelpText = document.getElementById("viewerHelpText");
const planetDetailClearButton = document.getElementById("planetDetailClearButton");
const planetDetailKind = document.getElementById("planetDetailKind");
const planetDetailEmpty = document.getElementById("planetDetailEmpty");
const planetDetailBody = document.getElementById("planetDetailBody");
const planetDetailGrid = document.getElementById("planetDetailGrid");
const planetDetailName = document.getElementById("planetDetailName");
const planetDetailRegion = document.getElementById("planetDetailRegion");
const planetDetailDesc = document.getElementById("planetDetailDesc");
const planetDetailFacts = document.getElementById("planetDetailFacts");
const planetDetailPositionLabel = document.getElementById("planetDetailPositionLabel");
const planetDetailPosition = document.getElementById("planetDetailPosition");
const planetDetailFactionLabel = document.getElementById("planetDetailFactionLabel");
const planetDetailFaction = document.getElementById("planetDetailFaction");
const planetDetailClimateLabel = document.getElementById("planetDetailClimateLabel");
const planetDetailClimate = document.getElementById("planetDetailClimate");
const planetDetailSpeciesLabel = document.getElementById("planetDetailSpeciesLabel");
const planetDetailSpecies = document.getElementById("planetDetailSpecies");
const planetDetailSourceLabel = document.getElementById("planetDetailSourceLabel");
const planetDetailSource = document.getElementById("planetDetailSource");
const planetDetailWikiLabel = document.getElementById("planetDetailWikiLabel");
const planetDetailWiki = document.getElementById("planetDetailWiki");
const planetDetailEvent = document.getElementById("planetDetailEvent");
const planetDetailNotes = document.getElementById("planetDetailNotes");
const planetDetailMedia = document.getElementById("planetDetailMedia");
const planetDetailOrbitSlot = document.getElementById("planetDetailOrbitSlot");
const planetDetailMapSlot = document.getElementById("planetDetailMapSlot");
const planetDetailActions = document.getElementById("planetDetailActions");
const planetDetailSetTravelStartButton = document.getElementById("planetDetailSetTravelStartButton");
const planetDetailSetTravelTargetButton = document.getElementById("planetDetailSetTravelTargetButton");
const detailClearButton = document.getElementById("detailClearButton");
const detailKind = document.getElementById("detailKind");
const detailEmpty = document.getElementById("detailEmpty");
const detailBody = document.getElementById("detailBody");
const detailGrid = document.getElementById("detailGrid");
const detailName = document.getElementById("detailName");
const detailRegion = document.getElementById("detailRegion");
const detailDesc = document.getElementById("detailDesc");
const detailPositionLabel = document.getElementById("detailPositionLabel");
const detailPosition = document.getElementById("detailPosition");
const detailFactionLabel = document.getElementById("detailFactionLabel");
const detailFaction = document.getElementById("detailFaction");
const detailClimateLabel = document.getElementById("detailClimateLabel");
const detailClimate = document.getElementById("detailClimate");
const detailSpeciesLabel = document.getElementById("detailSpeciesLabel");
const detailSpecies = document.getElementById("detailSpecies");
const detailSourceLabel = document.getElementById("detailSourceLabel");
const detailSource = document.getElementById("detailSource");
const detailWikiLabel = document.getElementById("detailWikiLabel");
const detailWiki = document.getElementById("detailWiki");
const detailNotes = document.getElementById("detailNotes");
const detailMedia = document.getElementById("detailMedia");
const detailOrbitSlot = document.getElementById("detailOrbitSlot");
const detailMapSlot = document.getElementById("detailMapSlot");
const detailActions = document.getElementById("detailActions");
const detailSetTravelStartButton = document.getElementById("detailSetTravelStartButton");
const detailSetTravelTargetButton = document.getElementById("detailSetTravelTargetButton");
const travelStartInput = document.getElementById("travelStartInput");
const travelTargetInput = document.getElementById("travelTargetInput");
const travelHyperdriveInput = document.getElementById("travelHyperdriveInput");
const travelFleetSelect = document.getElementById("travelFleetSelect");
const travelSwapButton = document.getElementById("travelSwapButton");
const travelRunButton = document.getElementById("travelRunButton");
const travelClearButton = document.getElementById("travelClearButton");
const travelPlanetOptions = document.getElementById("travelPlanetOptions");
const travelModeChip = document.getElementById("travelModeChip");
const travelSummary = document.getElementById("travelSummary");
const travelResult = document.getElementById("travelResult");
const travelGridDistance = document.getElementById("travelGridDistance");
const travelTime = document.getElementById("travelTime");
const travelModeText = document.getElementById("travelModeText");
const travelFleetMeta = document.getElementById("travelFleetMeta");
const travelRouteNames = document.getElementById("travelRouteNames");
const travelEndpointGrids = document.getElementById("travelEndpointGrids");
const travelGridSequence = document.getElementById("travelGridSequence");
const fleetSummaryChip = document.getElementById("fleetSummaryChip");
const fleetAccountStatus = document.getElementById("fleetAccountStatus");
const fleetUsernameInput = document.getElementById("fleetUsernameInput");
const fleetPasswordInput = document.getElementById("fleetPasswordInput");
const fleetLoginButton = document.getElementById("fleetLoginButton");
const fleetRegisterButton = document.getElementById("fleetRegisterButton");
const fleetLogoutButton = document.getElementById("fleetLogoutButton");
const fleetSyncButton = document.getElementById("fleetSyncButton");
const fleetAccountFeedback = document.getElementById("fleetAccountFeedback");
const fleetAdminBlock = document.getElementById("fleetAdminBlock");
const fleetAdminStatus = document.getElementById("fleetAdminStatus");
const fleetAdminUserSelect = document.getElementById("fleetAdminUserSelect");
const fleetAdminLoadButton = document.getElementById("fleetAdminLoadButton");
const fleetAdminExitButton = document.getElementById("fleetAdminExitButton");
const fleetAdminFeedback = document.getElementById("fleetAdminFeedback");
const fleetProfileSelect = document.getElementById("fleetProfileSelect");
const fleetProfileNameInput = document.getElementById("fleetProfileNameInput");
const fleetProfileSaveButton = document.getElementById("fleetProfileSaveButton");
const fleetProfileCreateButton = document.getElementById("fleetProfileCreateButton");
const fleetCountStat = document.getElementById("fleetCountStat");
const fleetShipCountStat = document.getElementById("fleetShipCountStat");
const fleetCatalogCountStat = document.getElementById("fleetCatalogCountStat");
const fleetNameInput = document.getElementById("fleetNameInput");
const fleetFactionInput = document.getElementById("fleetFactionInput");
const fleetSaveButton = document.getElementById("fleetSaveButton");
const fleetNewButton = document.getElementById("fleetNewButton");
const fleetDeleteButton = document.getElementById("fleetDeleteButton");
const fleetList = document.getElementById("fleetList");
const fleetEmptyState = document.getElementById("fleetEmptyState");
const fleetActiveBody = document.getElementById("fleetActiveBody");
const fleetActiveTitle = document.getElementById("fleetActiveTitle");
const fleetActiveMeta = document.getElementById("fleetActiveMeta");
const fleetActiveStats = document.getElementById("fleetActiveStats");
const fleetShipSearchInput = document.getElementById("fleetShipSearchInput");
const fleetShipFactionFilter = document.getElementById("fleetShipFactionFilter");
const fleetShipQuantityInput = document.getElementById("fleetShipQuantityInput");
const fleetShipAddButton = document.getElementById("fleetShipAddButton");
const fleetShipCatalogCount = document.getElementById("fleetShipCatalogCount");
const fleetShipList = document.getElementById("fleetShipList");
const fleetShipDetail = document.getElementById("fleetShipDetail");
const fleetShipOptions = document.getElementById("fleetShipOptions");
const sectorArmyFleetButton = document.getElementById("sectorArmyFleetButton");
const sectorArmyEditorMount = document.getElementById("sectorArmyEditorMount");
const newsSummaryChip = document.getElementById("newsSummaryChip");
const newsUnreadDockBadge = document.getElementById("newsUnreadDockBadge");
const newsUnreadMobileBadge = document.getElementById("newsUnreadMobileBadge");
const newsUnreadHint = document.getElementById("newsUnreadHint");
const newsAdminBlock = document.getElementById("newsAdminBlock");
const newsAdminStatus = document.getElementById("newsAdminStatus");
const newsTitleInput = document.getElementById("newsTitleInput");
const newsBodyInput = document.getElementById("newsBodyInput");
const newsImageUrlInput = document.getElementById("newsImageUrlInput");
const newsImageFileInput = document.getElementById("newsImageFileInput");
const newsPublishButton = document.getElementById("newsPublishButton");
const newsAdminFeedback = document.getElementById("newsAdminFeedback");
const newsList = document.getElementById("newsList");
const statusBar = document.getElementById("statusBar");
const osdViewerEl = document.getElementById("osdViewer");
const threeViewerEl = document.getElementById("threeViewer");
const threeTransitionOverlayEl = document.getElementById("threeTransitionOverlay");
const threeTransitionStarfieldCanvas = document.getElementById("threeTransitionStarfield");
const threeViewerHint = document.getElementById("threeViewerHint");
const threeHoverLabel = document.getElementById("threeHoverLabel");
const threeRimHud = document.getElementById("threeRimHud");
const threeTravelFlash = document.getElementById("threeTravelFlash");
const threeNavHud = document.getElementById("threeNavHud");
const threeJumpHud = document.getElementById("threeJumpHud");
const threeNavArrows = document.getElementById("threeNavArrows");
const threePrevPlanetButton = document.getElementById("threePrevPlanetButton");
const threeNextPlanetButton = document.getElementById("threeNextPlanetButton");
const threeOrbitHud = document.getElementById("threeOrbitHud");
const threeOrbitTitle = document.getElementById("threeOrbitTitle");
const threeOrbitSubtitle = document.getElementById("threeOrbitSubtitle");
const threeOrbitCompass = document.getElementById("threeOrbitCompass");
const landingIntroEl = document.getElementById("landingIntro");
const landingStarfieldCanvas = document.getElementById("landingStarfield");
const landingPromptVerb = document.getElementById("landingPromptVerb");
const landingPromptHint = document.getElementById("landingPromptHint");
const appShellEl = document.querySelector(".app-shell");
const viewerFrameEl = document.querySelector(".viewer-frame");
const viewerHeadEl = document.querySelector(".viewer-head");
const viewerToolsCardEl = document.querySelector(".viewer-tools-card");
const sidebarLeft = document.getElementById("sidebarLeft");
const sidebarRight = document.getElementById("sidebarRight");
const travelCardEl = document.querySelector(".travel-card");
const fleetCardEl = document.querySelector(".fleet-card");
const newsCardEl = document.querySelector(".news-card");
const planetDetailCardEl = document.querySelector(".planet-detail-card");
const factionDetailCardEl = document.querySelector(".faction-detail-card");
const viewModeToggleButton = document.getElementById("viewModeToggleButton");
const mobileTravelButton = document.getElementById("mobileTravelButton");
const mobileMenuSheetEl = document.getElementById("mobileMenuSheet");
const mobileMenuHandleEl = document.getElementById("mobileMenuHandle");
const mobileMenuOpenButtons = Array.from(document.querySelectorAll("[data-mobile-open]"));
const mobileMenuCloseButtons = Array.from(document.querySelectorAll("[data-mobile-close]"));
const desktopWindowOpenButtons = Array.from(document.querySelectorAll("[data-window-open]"));
const desktopWindowCloseButtons = Array.from(document.querySelectorAll("[data-window-close]"));
const desktopWindowMaximizeButtons = Array.from(document.querySelectorAll("[data-window-maximize]"));
const mapFilterButtons = Array.from(document.querySelectorAll("[data-filter-key]"));

const MOBILE_MEDIA_QUERY = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
const DESKTOP_WINDOW_KEYS = ["travel", "fleet", "news", "planetDetail", "detail", "mapTools", "viewerHead"];
const DESKTOP_TOGGLABLE_WINDOW_KEYS = ["travel", "fleet", "news", "planetDetail", "detail", "mapTools"];
const DESKTOP_WINDOW_MARGIN = 12;
const MOBILE_MENU_PANEL = "menu";
const MOBILE_FULL_SCREEN_PANELS = new Set(["filters", "travel", "fleet", "news", "planetDetail", "detail"]);
const MOBILE_MENU_OPEN_THRESHOLD_PX = 56;
const MOBILE_MENU_CLOSE_THRESHOLD_PX = 72;

let mobileMenuGesture = null;
let mobileMenuClickLockedUntil = 0;

function sanitizeDesktopWindowOffset(value) {
  return {
    x: Number.isFinite(Number(value?.x)) ? Math.round(Number(value.x)) : 0,
    y: Number.isFinite(Number(value?.y)) ? Math.round(Number(value.y)) : 0,
  };
}

function defaultDesktopWindowOffsets() {
  return Object.fromEntries(DESKTOP_WINDOW_KEYS.map((key) => [key, { x: 0, y: 0 }]));
}

function defaultDesktopWindowVisibility() {
  return Object.fromEntries(DESKTOP_TOGGLABLE_WINDOW_KEYS.map((key) => [key, false]));
}

function sanitizeDesktopWindowSize(value) {
  const width = Number(value?.width);
  const height = Number(value?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 0,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 0,
  };
}

function defaultDesktopWindowSizes() {
  return Object.fromEntries(DESKTOP_TOGGLABLE_WINDOW_KEYS.map((key) => [key, { width: 0, height: 0 }]));
}

function defaultDesktopWindowMaximized() {
  return Object.fromEntries(DESKTOP_TOGGLABLE_WINDOW_KEYS.map((key) => [key, false]));
}

function normalizeDesktopWindowOffsets(source) {
  const defaults = defaultDesktopWindowOffsets();
  if (!source || typeof source !== "object") return defaults;
  DESKTOP_WINDOW_KEYS.forEach((key) => {
    defaults[key] = sanitizeDesktopWindowOffset(source[key]);
  });
  return defaults;
}

function normalizeDesktopWindowVisibility(source) {
  const defaults = defaultDesktopWindowVisibility();
  if (!source || typeof source !== "object") return defaults;
  DESKTOP_TOGGLABLE_WINDOW_KEYS.forEach((key) => {
    defaults[key] = source[key] === true;
  });
  return defaults;
}

function normalizeDesktopWindowSizes(source) {
  const defaults = defaultDesktopWindowSizes();
  if (!source || typeof source !== "object") return defaults;
  DESKTOP_TOGGLABLE_WINDOW_KEYS.forEach((key) => {
    defaults[key] = sanitizeDesktopWindowSize(source[key]);
  });
  return defaults;
}

function normalizeDesktopWindowMaximized(source) {
  const defaults = defaultDesktopWindowMaximized();
  if (!source || typeof source !== "object") return defaults;
  DESKTOP_TOGGLABLE_WINDOW_KEYS.forEach((key) => {
    defaults[key] = source[key] === true;
  });
  return defaults;
}

function desktopWindowEntries() {
  return [
    { key: "travel", element: travelCardEl },
    { key: "fleet", element: fleetCardEl },
    { key: "news", element: newsCardEl },
    { key: "planetDetail", element: planetDetailCardEl },
    { key: "detail", element: factionDetailCardEl },
    { key: "mapTools", element: viewerToolsCardEl },
    { key: "viewerHead", element: viewerHeadEl },
  ].filter((entry) => entry.element);
}

function normalizeMobilePanel(panel) {
  const value = String(panel || "").trim();
  if (!value) return null;
  if (value === MOBILE_MENU_PANEL) return MOBILE_MENU_PANEL;
  return MOBILE_FULL_SCREEN_PANELS.has(value) ? value : null;
}

function isMobileFullScreenPanel(panel = state?.mobilePanel) {
  return MOBILE_FULL_SCREEN_PANELS.has(panel);
}

function setMobileMenuSheetOffset(offsetPx = 0) {
  if (!mobileMenuSheetEl) return;
  mobileMenuSheetEl.style.setProperty("--mobile-sheet-drag-offset", `${Math.round(Number(offsetPx) || 0)}px`);
}

function applyMobilePanelExpanded(panel) {
  switch (panel) {
    case "travel":
      applyPanelExpanded("travel", true);
      break;
    case "fleet":
      applyPanelExpanded("fleet", true);
      break;
    case "news":
      applyPanelExpanded("news", true);
      break;
    case "planetDetail":
      applyPanelExpanded("planetDetail", true);
      break;
    case "detail":
      applyPanelExpanded("detail", true);
      break;
    case "filters":
      applyPanelExpanded("mapTools", true);
      break;
    default:
      break;
  }
}

function bindMobileMenuSheet() {
  if (!mobileMenuHandleEl || !mobileMenuSheetEl) return;

  const beginGesture = (event) => {
    if (!state.isMobileView || isMobileFullScreenPanel(state.mobilePanel)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    mobileMenuGesture = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      startedOpen: state.mobilePanel === MOBILE_MENU_PANEL,
      moved: false,
    };
    mobileMenuHandleEl.setPointerCapture?.(event.pointerId);
    mobileMenuSheetEl.classList.add("is-dragging");
    setMobileMenuSheetOffset(0);
  };

  const updateGesture = (event) => {
    if (!mobileMenuGesture || event.pointerId !== mobileMenuGesture.pointerId) return;
    const delta = event.clientY - mobileMenuGesture.startY;
    mobileMenuGesture.lastY = event.clientY;
    mobileMenuGesture.moved = mobileMenuGesture.moved || Math.abs(delta) > 6;

    const offset = mobileMenuGesture.startedOpen
      ? clamp(delta, -18, 340)
      : clamp(delta, -280, 24);

    if (mobileMenuGesture.moved) {
      event.preventDefault();
    }

    setMobileMenuSheetOffset(offset);
  };

  const finishGesture = (event) => {
    if (!mobileMenuGesture || event.pointerId !== mobileMenuGesture.pointerId) return;
    const delta = mobileMenuGesture.lastY - mobileMenuGesture.startY;
    const startedOpen = mobileMenuGesture.startedOpen;
    const moved = mobileMenuGesture.moved;

    mobileMenuHandleEl.releasePointerCapture?.(event.pointerId);
    mobileMenuSheetEl.classList.remove("is-dragging");
    mobileMenuGesture = null;
    setMobileMenuSheetOffset(0);

    if (!state.isMobileView || isMobileFullScreenPanel(state.mobilePanel)) return;

    if (moved) {
      mobileMenuClickLockedUntil = Date.now() + 220;
    }

    if (startedOpen) {
      setMobilePanel(delta > MOBILE_MENU_CLOSE_THRESHOLD_PX ? null : MOBILE_MENU_PANEL);
      return;
    }

    setMobilePanel(delta < -MOBILE_MENU_OPEN_THRESHOLD_PX ? MOBILE_MENU_PANEL : null);
  };

  mobileMenuHandleEl.addEventListener("pointerdown", beginGesture);
  mobileMenuHandleEl.addEventListener("pointermove", updateGesture);
  mobileMenuHandleEl.addEventListener("pointerup", finishGesture);
  mobileMenuHandleEl.addEventListener("pointercancel", finishGesture);
  mobileMenuHandleEl.addEventListener("click", (event) => {
    if (!state.isMobileView || isMobileFullScreenPanel(state.mobilePanel)) return;
    if (Date.now() < mobileMenuClickLockedUntil) {
      event.preventDefault();
      return;
    }
    setMobilePanel(state.mobilePanel === MOBILE_MENU_PANEL ? null : MOBILE_MENU_PANEL);
  });
}

const planetDetailRefs = {
  clearButton: planetDetailClearButton,
  kind: planetDetailKind,
  empty: planetDetailEmpty,
  body: planetDetailBody,
  grid: planetDetailGrid,
  name: planetDetailName,
  region: planetDetailRegion,
  desc: planetDetailDesc,
  facts: planetDetailFacts,
  positionLabel: planetDetailPositionLabel,
  position: planetDetailPosition,
  factionLabel: planetDetailFactionLabel,
  faction: planetDetailFaction,
  climateLabel: planetDetailClimateLabel,
  climate: planetDetailClimate,
  speciesLabel: planetDetailSpeciesLabel,
  species: planetDetailSpecies,
  sourceLabel: planetDetailSourceLabel,
  source: planetDetailSource,
  wikiLabel: planetDetailWikiLabel,
  wiki: planetDetailWiki,
  event: planetDetailEvent,
  notes: planetDetailNotes,
  media: planetDetailMedia,
  orbitSlot: planetDetailOrbitSlot,
  mapSlot: planetDetailMapSlot,
  actions: planetDetailActions,
  setTravelStartButton: planetDetailSetTravelStartButton,
  setTravelTargetButton: planetDetailSetTravelTargetButton,
};

const factionDetailRefs = {
  clearButton: detailClearButton,
  kind: detailKind,
  empty: detailEmpty,
  body: detailBody,
  grid: detailGrid,
  name: detailName,
  region: detailRegion,
  desc: detailDesc,
  positionLabel: detailPositionLabel,
  position: detailPosition,
  factionLabel: detailFactionLabel,
  faction: detailFaction,
  climateLabel: detailClimateLabel,
  climate: detailClimate,
  speciesLabel: detailSpeciesLabel,
  species: detailSpecies,
  sourceLabel: detailSourceLabel,
  source: detailSource,
  wikiLabel: detailWikiLabel,
  wiki: detailWiki,
  notes: detailNotes,
  media: detailMedia,
  orbitSlot: detailOrbitSlot,
  mapSlot: detailMapSlot,
  actions: detailActions,
  setTravelStartButton: detailSetTravelStartButton,
  setTravelTargetButton: detailSetTravelTargetButton,
};

function defaultMapFilters() {
  return {
    republic: true,
    separatist: true,
    blacksun: true,
    hutt: true,
    pyke: true,
    ohnaka: true,
    routes: true,
    profiledOnly: false,
    sectorArmies: false,
  };
}

const state = {
  viewer: null,
  htmlOverlay: null,
  overlayRoot: null,
  overlayPlane: null,
  overlaySvg: null,
  overlayDynamic: null,
  screenOverlayCanvas: null,
  screenOverlayCtx: null,
  imageWidth: 0,
  imageHeight: 0,
  currentGrid: "L-9",
  showRejected: false,
  selectedDetailKey: null,
  selectedFactionKey: null,
  hoveredKey: null,
  searchPulseKey: null,
  searchPulseTimer: null,
  searchHits: [],
  knownByKey: new Map(),
  savedByKey: new Map(),
  reviewByKey: new Map(),
  routeByKey: new Map(),
  shipCatalog: [],
  shipCatalogById: new Map(),
  planetFactions: new Map(),
  governmentPlanetFactions: new Map(),
  underworldPlanetFactions: new Map(),
  planetProfiles: new Map(),
  factionProfiles: new Map(),
  planetOverrides: {},
  planetOverridesLoaded: false,
  planetAliasTargets: new Map(),
  planetAliasesByTarget: new Map(),
  mapMode: "government",
  planetProfileLoadRequested: false,
  planetProfileLoadPromise: null,
  supplementalPlanetKeys: new Set(),
  dataSources: [],
  jsonDataCache: new Map(),
  jsonFetchPromises: new Map(),
  progressiveStartupScheduled: false,
  progressiveStartupPromise: null,
  dragState: null,
  isMobileView: false,
  mobilePanel: null,
  touchGestureLockUntil: 0,
  multiTouchActive: false,
  overlayRenderQueued: false,
  overlaySettleTimer: null,
  viewerBusy: false,
  viewMode: "2d",
  factionFragments: [],
  factionFragmentKey: "",
  factionItems: new Map(),
  factionItemsKey: "",
  staticOverlayVersion: 0,
  lastStaticOverlayKey: "",
  lastCanvasOverlayKey: "",
  gridCalibration: null,
  baseVectorPaths: [],
  vectorPaths: [],
  hyperspaceRouteDefs: [],
  hyperspaceNetwork: null,
  gridGuides: [],
  gridMarkers: new Map(),
  travelStartKey: null,
  travelTargetKey: null,
  travelStartText: "",
  travelTargetText: "",
  travelHyperdriveClass: 1,
  travelFleetId: "",
  travelResult: null,
  travelGraph: null,
  travelNeedsRun: true,
  fleetStore: null,
  fleetAuth: null,
  fleetSyncTimer: 0,
  fleetSyncState: "local",
  fleetSyncMessage: "",
  fleetSyncInFlight: false,
  fleetAdminUsers: [],
  fleetAdminUserId: "",
  selectedFleetShipId: "",
  newsItems: [],
  newsLoaded: false,
  newsLoading: false,
  newsReadIds: new Set(),
  newsAdminSaving: false,
  sectorArmyTerritoryDrafts: null,
  sectorArmyEditor: {
    available: false,
    enabled: false,
    selectedId: 1,
    selectedPointIndex: -1,
    shipTableEditId: null,
    labelMode: false,
    modifyMode: false,
    // editor mode: 'view' | 'sector' | 'vertex' | 'curve'
    mode: "view",
    validation: [],
    exportText: "",
    dragging: null,
    undoStack: {},
    redoStack: {},
  },
  filters: defaultMapFilters(),
  panelExpanded: {
    travel: true,
    fleet: true,
    news: true,
    planetDetail: true,
    detail: true,
    mapTools: true,
  },
  desktopWindowVisibility: defaultDesktopWindowVisibility(),
  desktopWindowOffsets: defaultDesktopWindowOffsets(),
  desktopWindowSizes: defaultDesktopWindowSizes(),
  desktopWindowMaximized: defaultDesktopWindowMaximized(),
  desktopWindowDrag: null,
  desktopWindowSizePersistTimer: 0,
  desktopWindowZIndex: 80,
  three: {
    renderer: null,
    scene: null,
    camera: null,
    dataGroup: null,
    backdropGroup: null,
    orbitGroup: null,
    orbitTemplate: null,
    raycaster: null,
    pointer: null,
    textures: new Map(),
    focus: null,
    targetFocus: null,
    yaw: THREE_VIEW_DEFAULT_YAW,
    targetYaw: THREE_VIEW_DEFAULT_YAW,
    pitch: THREE_VIEW_DEFAULT_PITCH,
    targetPitch: THREE_VIEW_DEFAULT_PITCH,
    distance: THREE_VIEW_DEFAULT_DISTANCE,
    targetDistance: THREE_VIEW_DEFAULT_DISTANCE,
    dragging: false,
    dragMoved: false,
    pointerDown: false,
    dragPointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
    animationFrame: 0,
    rebuildKey: "",
    pointCloud: null,
    pointKeys: [],
    planetPositions: new Map(),
    visiblePlanets: [],
    routeObjects: new Map(),
    factionObjects: new Map(),
    routeConnectionCache: new Map(),
    routeConnectionGraph: null,
    hoverMarker: null,
    selectionMarker: null,
    mode: "galaxy",
    orbitItemKey: null,
    jumpTargets: [],
    jumpCursor: 0,
    navigationSignature: "",
    fastTravel: null,
    pendingTravelLanding: null,
    hoverClientX: 0,
    hoverClientY: 0,
    performanceKey: "",
    lastVisualSignature: "",
    lastHoverSampleAt: 0,
    activeTouches: new Map(),
    pinchDistance: 0,
    pinchTargetDistance: 0,
    pinching: false,
    justPinchedUntil: 0,
  },
  intro: {
    active: Boolean(landingIntroEl),
    progress: 0,
    targetProgress: 0,
    animationFrame: 0,
    lastTime: 0,
    dataReady: false,
    prewarmStarted: false,
    prewarmReady: false,
    prewarmPromise: null,
    stars: [],
    canvasWidth: 0,
    canvasHeight: 0,
    pixelRatio: 1,
    startedAt: 0,
    readyAt: 0,
    touchLastY: 0,
    completeTimer: 0,
  },
  threeTransition: {
    active: false,
    visible: false,
    deferSceneData: false,
    progress: 0,
    animationFrame: 0,
    startedAt: 0,
    readyAt: 0,
    promise: null,
    sceneDataTimer: 0,
    completeTimer: 0,
    stars: [],
    canvasWidth: 0,
    canvasHeight: 0,
    pixelRatio: 1,
  },
};

function normalizeNameKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeGridLabel(value) {
  const cleaned = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "");
  const match = cleaned.match(/^([A-V])\-?([1-9]|1[0-9]|2[0-2])$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

const ALL_KNOWN_FACTIONS = new Set([
  "separatist",
  "republic",
  "blacksun",
  "hutt",
  "pyke",
  "ohnaka",
]);

function normalizeFaction(value) {
  const faction = String(value || "")
    .trim()
    .toLowerCase();
  return ALL_KNOWN_FACTIONS.has(faction) ? faction : "";
}

function normalizeOverrideFaction(value) {
  const raw = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  if (!raw || raw === "neutral" || raw === "none" || raw === "leer" || raw === "keine") {
    return "";
  }
  return normalizeFaction(raw);
}

function planetDataOverride(record) {
  if (!record?.nameKey) return null;
  const dynamic = Object.entries(state?.planetOverrides || {}).find(
    ([name]) => {
      const key = normalizeNameKey(name);
      if (key === record.nameKey) return true;
      return (state.planetAliasTargets.get(key) || []).includes(record.nameKey);
    }
  )?.[1];
  return {
    ...(PLANET_DATA_OVERRIDES[record.nameKey] || {}),
    ...(dynamic || {}),
  };
}

function normalizeMapFilters(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    republic: source.republic !== false,
    separatist: source.separatist !== false,
    blacksun: source.blacksun !== false,
    hutt: source.hutt !== false,
    pyke: source.pyke !== false,
    ohnaka: source.ohnaka !== false,
    routes: source.routes !== false,
    profiledOnly: Boolean(source.profiledOnly),
    sectorArmies: Boolean(source.sectorArmies),
  };
}

function normalizeViewMode(value) {
  return String(value || "").trim().toLowerCase() === "3d" ? "3d" : "2d";
}

function createLocalId(prefix = "id") {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}-${random}`;
}

function fleetFactionLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "republic") return "Republik";
  if (key === "separatist") return "KUS";
  return "Republik";
}

function normalizeFleetFaction(value) {
  const key = String(value || "").trim().toLowerCase();
  return key === "separatist" ? "separatist" : "republic";
}

function normalizeFleetQuantity(value) {
  const number = Math.floor(Number(value) || 0);
  return Math.max(1, Math.min(9999, number));
}

function formatFleetNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("de-DE").format(Math.round(number));
}

function rawSectorArmies() {
  try {
    const base = Array.isArray(window.SW_SECTOR_ARMIES) ? window.SW_SECTOR_ARMIES : [];
    // apply local drafts for army numbers if present
    const rawDraft = localStorage.getItem(SECTOR_ARMY_DATA_STORAGE_KEY);
    const drafts = rawDraft ? JSON.parse(rawDraft) : [];
    const draftById = new Map(Array.isArray(drafts) ? drafts.map((d) => [Number(d?.id), d]) : []);
    return base.map((army) => {
      const id = Number(army?.id);
      const draft = draftById.get(id);
      if (!draft) return army;
      // shallow merge republic/cis overrides
      return {
        ...army,
        republic: { ...(army.republic || {}), ...(draft.republic || {}) },
        cis: { ...(army.cis || {}), ...(draft.cis || {}) },
        fleetTables: {
          ...(army.fleetTables || {}),
          ...(draft.fleetTables || {}),
        },
      };
    });
  } catch (_error) {
    return Array.isArray(window.SW_SECTOR_ARMIES) ? window.SW_SECTOR_ARMIES : [];
  }
}

function rawSectorTerritories() {
  return Array.isArray(window.SW_SECTOR_ARMY_TERRITORIES) ? window.SW_SECTOR_ARMY_TERRITORIES : [];
}

function rawStrategicFleetAssets() {
  return Array.isArray(window.SW_STRATEGIC_FLEET_ASSETS) ? window.SW_STRATEGIC_FLEET_ASSETS : [];
}

function sectorArmyStatusMeta(status) {
  return SECTOR_ARMY_STATUS_META[String(status || "").trim()] || {
    label: "Lage offen",
    fill: "rgba(210, 219, 230, 0.12)",
    stroke: "rgba(210, 219, 230, 0.58)",
    glow: "rgba(210, 219, 230, 0.18)",
  };
}

function sectorArmyById(id) {
  const numericId = Number(id);
  return rawSectorArmies().find((entry) => Number(entry?.id) === numericId) || null;
}

function normalizeSectorPoint(point) {
  if (Array.isArray(point)) {
    return normalizePoint01({ x: point[0], y: point[1] });
  }
  return normalizePoint01(point);
}

function normalizeSectorPointList(points) {
  if (!Array.isArray(points)) return [];
  return points.map(normalizeSectorPoint).filter(Boolean);
}

function sectorPointToTuple(point) {
  const normalized = normalizeSectorPoint(point) || { x: 0.5, y: 0.5 };
  return [Number(normalized.x.toFixed(4)), Number(normalized.y.toFixed(4))];
}

function normalizeSectorCurves(curves) {
  if (!curves || typeof curves !== "object") return {};
  const out = {};
  Object.entries(curves).forEach(([key, val]) => {
    const p = normalizeSectorPoint(val);
    if (!p) return;
    out[String(Number(key))] = [Number(p.x.toFixed(4)), Number(p.y.toFixed(4))];
  });
  return out;
}

function sectorArmyFallbackCenter(index) {
  const columns = 5;
  const row = Math.floor(index / columns);
  const col = index % columns;
  return {
    x: clamp01(0.18 + col * 0.16),
    y: clamp01(0.18 + row * 0.16),
  };
}

function sectorArmyTerritoryBaseList() {
  const territoryById = new Map(rawSectorTerritories().map((entry) => [Number(entry?.id), entry]));
  return rawSectorArmies().map((army, index) => {
    const base = territoryById.get(Number(army.id)) || {};
    const fallbackCenter = sectorArmyFallbackCenter(index);
    const polygon = normalizeSectorPointList(base.polygon);
    const labelPosition = normalizeSectorPoint(base.labelPosition) || polygonCentroidNorm(polygon) || fallbackCenter;
    return {
      id: Number(army.id),
      name: String(base.name || army.name || `Sektorarmee ${army.id}`),
      status: String(base.status || army.status || ""),
      labelPosition: sectorPointToTuple(labelPosition),
      polygon: polygon.map(sectorPointToTuple),
      anchorPlanets: Array.isArray(base.anchorPlanets) ? base.anchorPlanets.map(String) : [],
      locked: Boolean(base.locked),
      notes: String(base.notes || ""),
    };
  });
}

function loadSectorArmyTerritoryDrafts() {
  if (Array.isArray(state.sectorArmyTerritoryDrafts)) return state.sectorArmyTerritoryDrafts;
  try {
    const raw = localStorage.getItem(SECTOR_ARMY_TERRITORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.territories) ? parsed.territories : [];
    state.sectorArmyTerritoryDrafts = entries
      .map((entry) => normalizeSectorTerritory(entry, sectorArmyById(entry?.id)))
      .filter(Boolean);
  } catch (_error) {
    state.sectorArmyTerritoryDrafts = [];
  }
  return state.sectorArmyTerritoryDrafts;
}

function persistSectorArmyTerritoryDrafts() {
  try {
    localStorage.setItem(SECTOR_ARMY_TERRITORY_STORAGE_KEY, JSON.stringify(loadSectorArmyTerritoryDrafts()));
  } catch (_error) {
    setStatus("Sektorarmee-Grenzen konnten lokal nicht gespeichert werden.");
  }
}

function normalizeSectorTerritory(entry, army = null) {
  if (!entry || typeof entry !== "object") return null;
  const id = Number(entry.id || army?.id);
  if (!Number.isFinite(id)) return null;
  const polygon = normalizeSectorPointList(entry.polygon);
  const labelPosition = normalizeSectorPoint(entry.labelPosition) || polygonCentroidNorm(polygon) || sectorArmyFallbackCenter(id - 1);
  return {
    id,
    name: String(entry.name || army?.name || `Sektorarmee ${id}`),
    status: String(entry.status || army?.status || ""),
    labelPosition: sectorPointToTuple(labelPosition),
    polygon: polygon.map(sectorPointToTuple),
    curves: normalizeSectorCurves(entry.curves),
    anchorPlanets: Array.isArray(entry.anchorPlanets)
      ? entry.anchorPlanets.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    locked: Boolean(entry.locked),
    notes: String(entry.notes || ""),
  };
}

function sectorArmyTerritories() {
  const base = sectorArmyTerritoryBaseList();
  const draftById = new Map(loadSectorArmyTerritoryDrafts().map((entry) => [Number(entry.id), entry]));
  return base.map((entry) => normalizeSectorTerritory({ ...entry, ...(draftById.get(Number(entry.id)) || {}) }, sectorArmyById(entry.id)));
}

function sectorArmyTerritoryById(id) {
  const numericId = Number(id);
  return sectorArmyTerritories().find((entry) => Number(entry?.id) === numericId) || null;
}

function setSectorArmyTerritoryDraft(territory) {
  const normalized = normalizeSectorTerritory(territory, sectorArmyById(territory?.id));
  if (!normalized) return null;
  const drafts = loadSectorArmyTerritoryDrafts().filter((entry) => Number(entry.id) !== Number(normalized.id));
  drafts.push(normalized);
  drafts.sort((left, right) => Number(left.id) - Number(right.id));
  state.sectorArmyTerritoryDrafts = drafts;
  persistSectorArmyTerritoryDrafts();
  return normalized;
}

function updateSectorArmyTerritoryDraft(id, updater) {
  const current = sectorArmyTerritoryById(id);
  if (!current) return null;
  const patch = typeof updater === "function" ? updater({ ...current }) : updater;
  return setSectorArmyTerritoryDraft({ ...current, ...(patch || {}) });
}

function resetSectorArmyTerritoryDrafts() {
  state.sectorArmyTerritoryDrafts = [];
  try {
    localStorage.removeItem(SECTOR_ARMY_TERRITORY_STORAGE_KEY);
  } catch (_error) {
    // Lokal gespeicherte Editor-Daten sind optional.
  }
}

function polygonCentroidNorm(points) {
  const normalized = normalizeSectorPointList(points);
  if (!normalized.length) return null;
  const sum = normalized.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 }
  );
  return {
    x: clamp01(sum.x / normalized.length),
    y: clamp01(sum.y / normalized.length),
  };
}

function sectorArmyTerritoryStatus(army, territory) {
  const territoryStatus = String(territory?.status || "").trim();
  if (SECTOR_ARMY_STATUS_META[territoryStatus]) return territoryStatus;
  return String(army?.status || territoryStatus || "");
}

function sectorArmyDisplayTitle(army) {
  return String(army?.display?.title || `${army?.id || "?"}. Sektorarmee - ${army?.name || "Unbekannt"}`);
}

function sectorArmyDisplayStatus(army, territory = null) {
  const status = sectorArmyTerritoryStatus(army, territory);
  return String(army?.display?.dominanceHint || sectorArmyStatusMeta(status).label);
}

function sectorArmyItem(army, territory) {
  if (!army || !territory) return null;
  const label = normalizeSectorPoint(territory.labelPosition) || polygonCentroidNorm(territory.polygon) || { x: 0.5, y: 0.5 };
  const status = sectorArmyTerritoryStatus(army, territory);
  return {
    kind: "sectorArmy",
    nameKey: `sector-army-${army.id}`,
    name: sectorArmyDisplayTitle(army),
    shortName: String(army.name || territory.name || ""),
    army,
    territory,
    status,
    x: label.x,
    y: label.y,
    grid: guessGridFromPoint(label.x, label.y),
  };
}

function sectorArmyItems() {
  const territoryById = new Map(sectorArmyTerritories().map((entry) => [Number(entry.id), entry]));
  return rawSectorArmies()
    .map((army) => sectorArmyItem(army, territoryById.get(Number(army.id))))
    .filter(Boolean);
}

function sectorArmyItemByKey(key) {
  return sectorArmyItems().find((item) => item.nameKey === key) || null;
}

function strategicFleetAssetItems() {
  return rawStrategicFleetAssets()
    .map((asset, index) => {
      const position = normalizeSectorPoint(asset?.position) || {
        x: index ? 0.73 : 0.43,
        y: index ? 0.4 : 0.45,
      };
      return {
        kind: "strategicAsset",
        nameKey: `strategic-asset-${normalizeNameKey(asset?.id || asset?.name || index)}`,
        name: String(asset?.name || `Strategische Reserve ${index + 1}`),
        asset,
        status: "reserve",
        x: position.x,
        y: position.y,
        grid: guessGridFromPoint(position.x, position.y),
      };
    })
    .filter(Boolean);
}

function strategicFleetAssetItemByKey(key) {
  return strategicFleetAssetItems().find((item) => item.nameKey === key) || null;
}

function sectorArmyLayerEnabled() {
  if (state.mapMode === "underworld") return false;
  return Boolean(state.filters.sectorArmies || state.sectorArmyEditor.enabled);
}

function visibleSectorArmyItems() {
  return sectorArmyLayerEnabled() ? sectorArmyItems() : [];
}

function visibleStrategicFleetAssetItems() {
  return sectorArmyLayerEnabled() ? strategicFleetAssetItems() : [];
}

function isSectorArmyLayerItem(item) {
  return item?.kind === "sectorArmy" || item?.kind === "strategicAsset";
}

function sectorArmyPolygonPoints(territory) {
  return normalizeSectorPointList(territory?.polygon);
}

function sectorFleetDataKey(factionKey) {
  return factionKey === "cis" ? "cis" : "republic";
}

function sectorFleetDisplayLabel(factionKey) {
  return factionKey === "cis" ? "KUS" : "Republik";
}

function sectorFleetFieldLabels(factionKey) {
  return factionKey === "cis" ? CIS_SECTOR_FIELD_LABELS : REPUBLIC_SECTOR_FIELD_LABELS;
}

function normalizeSectorAvailabilityQuantity(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(9999, number));
}

function validateSectorAvailabilityInput(input) {
  const raw = String(input?.value || "").trim();
  const valid = raw !== "" && /^\d+$/.test(raw);
  input?.classList?.toggle("is-invalid", !valid);
  return valid;
}

function allocateSectorFreeCounts(entries, freeTotal) {
  const totals = entries.map((entry) => ({
    key: entry.shipKey,
    total: normalizeSectorAvailabilityQuantity(entry.totalBase),
  }));
  const allocation = {};
  let remainingFree = Math.min(
    normalizeSectorAvailabilityQuantity(freeTotal),
    totals.reduce((sum, entry) => sum + entry.total, 0)
  );
  let remainingTotal = totals.reduce((sum, entry) => sum + entry.total, 0);
  totals.forEach((entry, index) => {
    if (!entry.total || !remainingFree) {
      allocation[entry.key] = 0;
      remainingTotal -= entry.total;
      return;
    }
    const isLast = index === totals.length - 1;
    const share = isLast
      ? Math.min(entry.total, remainingFree)
      : Math.min(entry.total, Math.floor((remainingFree * entry.total) / Math.max(1, remainingTotal)));
    allocation[entry.key] = share;
    remainingFree -= share;
    remainingTotal -= entry.total;
  });
  if (remainingFree > 0) {
    totals.forEach((entry) => {
      if (!remainingFree) return;
      const room = Math.max(0, entry.total - (allocation[entry.key] || 0));
      const extra = Math.min(room, remainingFree);
      allocation[entry.key] = (allocation[entry.key] || 0) + extra;
      remainingFree -= extra;
    });
  }
  return allocation;
}

function sectorFleetAvailabilityRows(army, factionKey) {
  const dataKey = sectorFleetDataKey(factionKey);
  const labels = sectorFleetFieldLabels(factionKey);
  const fleetData = army?.[dataKey] || {};
  const savedTable = army?.fleetTables?.[dataKey] || army?.fleetTables?.[factionKey] || {};
  const entries = Object.entries(labels).map(([shipKey, label]) => ({
    shipKey,
    label,
    totalBase: normalizeSectorAvailabilityQuantity(fleetData?.[shipKey]),
  }));
  const freeAllocation = allocateSectorFreeCounts(entries, fleetData?.free);
  return entries.map((entry) => {
    const saved = savedTable?.[entry.shipKey] && typeof savedTable[entry.shipKey] === "object" ? savedTable[entry.shipKey] : null;
    const values = {};
    if (saved) {
      SECTOR_SHIP_AVAILABILITY_KEYS.forEach((key) => {
        values[key] = normalizeSectorAvailabilityQuantity(saved[key]);
      });
    } else {
      const free = Math.min(entry.totalBase, freeAllocation[entry.shipKey] || 0);
      values.free = free;
      values.frontBound = Math.max(0, entry.totalBase - free);
      values.garrison = 0;
      values.repair = 0;
      values.locked = 0;
    }
    const total = SECTOR_SHIP_AVAILABILITY_KEYS.reduce((sum, key) => sum + normalizeSectorAvailabilityQuantity(values[key]), 0);
    return {
      ...entry,
      values,
      total,
    };
  });
}

function sectorFleetAvailabilityTotals(rows) {
  const totals = {
    free: 0,
    frontBound: 0,
    garrison: 0,
    repair: 0,
    locked: 0,
    total: 0,
  };
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    SECTOR_SHIP_AVAILABILITY_KEYS.forEach((key) => {
      totals[key] += normalizeSectorAvailabilityQuantity(row?.values?.[key]);
    });
    totals.total += normalizeSectorAvailabilityQuantity(row?.total);
  });
  return totals;
}

function sectorFleetAvailabilityDraft(rows) {
  const table = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const values = {};
    SECTOR_SHIP_AVAILABILITY_KEYS.forEach((key) => {
      values[key] = normalizeSectorAvailabilityQuantity(row?.values?.[key]);
    });
    table[row.shipKey] = values;
  });
  return table;
}

function sectorFleetComputedSummary(army, factionKey) {
  const rows = sectorFleetAvailabilityRows(army, factionKey);
  const totals = sectorFleetAvailabilityTotals(rows);
  return {
    total: totals.total,
    free: totals.free,
  };
}

function isSectorArmyBoundaryEditActive(id) {
  return (
    state.mapMode !== "underworld" &&
    state.sectorArmyEditor.enabled &&
    Number(state.sectorArmyEditor.selectedId) === Number(id)
  );
}

function isSectorArmyTableEditActive(id) {
  return sectorArmyEditorAvailable() && Number(state.sectorArmyEditor.shipTableEditId) === Number(id);
}

function sectorAvailabilityCellMarkup(id, factionKey, row, field, editable) {
  const value = normalizeSectorAvailabilityQuantity(row?.values?.[field.key]);
  if (editable) {
    return `
      <input
        type="number"
        min="0"
        max="9999"
        step="1"
        inputmode="numeric"
        data-sector-ship-input="1"
        data-sector-id="${Number(id)}"
        data-sector-faction="${escapeHtml(sectorFleetDataKey(factionKey))}"
        data-sector-ship-key="${escapeHtml(row.shipKey)}"
        data-sector-category="${escapeHtml(field.key)}"
        value="${value}"
      />`;
  }
  return `<span class="sector-availability-chip ${field.cssClass}">${formatFleetNumber(value)}</span>`;
}

function sectorFleetAvailabilityTableMarkup(army, factionKey) {
  const id = Number(army?.id);
  const editable = isSectorArmyTableEditActive(id);
  const rows = sectorFleetAvailabilityRows(army, factionKey);
  const totals = sectorFleetAvailabilityTotals(rows);
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <th scope="row">${escapeHtml(row.label)}</th>
          ${SECTOR_SHIP_AVAILABILITY_FIELDS.map(
        (field) => `<td class="sector-availability-cell ${field.cssClass}">${sectorAvailabilityCellMarkup(id, factionKey, row, field, editable)}</td>`
      ).join("")}
          <td class="sector-availability-total">${formatFleetNumber(row.total)}</td>
        </tr>`
    )
    .join("");
  return `
    <div class="sector-ship-table-wrap ${editable ? "is-editing" : ""}">
      <div class="sector-ship-table-head">
        <strong>${escapeHtml(sectorFleetDisplayLabel(factionKey))}</strong>
        <span>${editable ? "Bearbeitung aktiv" : "nur Ansicht"}</span>
      </div>
      <table class="sector-ship-table">
        <thead>
          <tr>
            <th scope="col">Schiffstyp</th>
            ${SECTOR_SHIP_AVAILABILITY_FIELDS.map((field) => `<th scope="col">${escapeHtml(field.label)}</th>`).join("")}
            <th scope="col">Gesamt</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr>
            <th scope="row">Summe</th>
            ${SECTOR_SHIP_AVAILABILITY_FIELDS.map((field) => `<td>${formatFleetNumber(totals[field.key])}</td>`).join("")}
            <td>${formatFleetNumber(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function sectorArmyDetailActionsMarkup(army) {
  if (!sectorArmyEditorAvailable()) return "";
  const id = Number(army?.id);
  const boundaryActive = isSectorArmyBoundaryEditActive(id);
  const tableActive = isSectorArmyTableEditActive(id);
  return `
    <div class="sector-army-admin-actions">
      <button type="button" class="ghost-button compact ${boundaryActive ? "is-active" : ""}" data-sector-detail-action="${boundaryActive ? "stop-boundary-edit" : "start-boundary-edit"
    }" data-sector-id="${id}">
        ${boundaryActive ? "Grenzen sperren" : "Grenzen bearbeiten"}
      </button>
      <button type="button" class="ghost-button compact ${tableActive ? "is-active" : ""}" data-sector-detail-action="${tableActive ? "stop-table-edit" : "start-table-edit"
    }" data-sector-id="${id}">
        ${tableActive ? "Tabelle sperren" : "Schiffstabelle bearbeiten"}
      </button>
    </div>
  `;
}

function sectorArmyDetailNotesMarkup(army, territory) {
  const notes = [territory?.notes, territory?.locked ? "Grenze ist gesperrt." : ""].filter(Boolean);
  const actions = sectorArmyDetailActionsMarkup(army);
  return `
    ${actions}
    ${notes.length ? `<div class="sector-army-notes">${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div>` : ""}
  `;
}

function polygonToSvgPoints(points) {
  return normalizeSectorPointList(points)
    .map((point) => `${(point.x * state.imageWidth).toFixed(2)},${(point.y * state.imageHeight).toFixed(2)}`)
    .join(" ");
}

function pointInPolygon(point, polygon) {
  const normalized = normalizeSectorPoint(point);
  const points = normalizeSectorPointList(polygon);
  if (!normalized || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const pi = points[i];
    const pj = points[j];
    const intersects =
      pi.y > normalized.y !== pj.y > normalized.y &&
      normalized.x < ((pj.x - pi.x) * (normalized.y - pi.y)) / ((pj.y - pi.y) || 0.000001) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonBoundsNorm(points) {
  const normalized = normalizeSectorPointList(points);
  if (!normalized.length) return null;
  return normalized.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    { left: 1, top: 1, right: 0, bottom: 0 }
  );
}

function sectorArmyBoundsPx(item) {
  const bounds = polygonBoundsNorm(item?.territory?.polygon);
  if (!bounds) return null;
  return {
    left: bounds.left * state.imageWidth,
    top: bounds.top * state.imageHeight,
    width: Math.max(180, (bounds.right - bounds.left) * state.imageWidth),
    height: Math.max(180, (bounds.bottom - bounds.top) * state.imageHeight),
  };
}

function sectorArmyItemAtNorm(point) {
  if (!sectorArmyLayerEnabled()) return null;
  const hits = sectorArmyItems().filter((item) => pointInPolygon(point, item.territory?.polygon));
  if (!hits.length) return null;
  return hits
    .map((item) => {
      const bounds = polygonBoundsNorm(item.territory?.polygon);
      const area = bounds ? Math.max(0.000001, (bounds.right - bounds.left) * (bounds.bottom - bounds.top)) : 1;
      return { item, area };
    })
    .sort((left, right) => left.area - right.area)[0].item;
}

function findNearestStrategicAssetItem(targetX, targetY, tolerancePx) {
  if (!sectorArmyLayerEnabled()) return { item: null, distanceSq: Number.POSITIVE_INFINITY };
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  visibleStrategicFleetAssetItems().forEach((item) => {
    const dx = targetX - item.x * state.imageWidth;
    const dy = targetY - item.y * state.imageHeight;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > tolerancePx * tolerancePx || distanceSq >= bestDistanceSq) return;
    best = item;
    bestDistanceSq = distanceSq;
  });
  return { item: best, distanceSq: bestDistanceSq };
}

function sectorFleetBreakdownMarkup(values, labels) {
  const entries = Object.entries(labels || {});
  const rows = entries
    .map(([key, label]) => {
      const value = Number(values?.[key] || 0);
      return `
        <tr>
          <td class="fleet-label">${escapeHtml(label)}</td>
          <td class="fleet-value">${formatFleetNumber(value)}</td>
        </tr>`;
    })
    .join("");
  const total = formatFleetNumber(values?.total || 0);
  const free = formatFleetNumber(values?.free || 0);
  return `
    <table class="sector-fleet-table">
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr class="fleet-total-row"><td>Gesamt</td><td>${total}</td></tr>
        <tr class="fleet-free-row"><td>frei</td><td>${free}</td></tr>
      </tfoot>
    </table>`;
}

function strategicAssetSummaryMarkup(asset) {
  const entries = Object.entries(asset?.assets || {});
  if (!entries.length) return "Keine Assetwerte hinterlegt.";
  return `
    <div class="sector-fleet-breakdown compact">
      ${entries
      .map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${formatFleetNumber(value)}</strong></div>`)
      .join("")}
    </div>
  `;
}

function sectorArmyEditorAvailable() {
  const available = Boolean(window.MapAdminUi?.isAdmin?.());
  state.sectorArmyEditor.available = available;
  if (!available) {
    state.sectorArmyEditor.enabled = false;
    state.sectorArmyEditor.modifyMode = false;
    state.sectorArmyEditor.labelMode = false;
    state.sectorArmyEditor.shipTableEditId = null;
  }
  return available;
}

function clearSectorArmyEditModes() {
  state.sectorArmyEditor.enabled = false;
  state.sectorArmyEditor.modifyMode = false;
  state.sectorArmyEditor.labelMode = false;
  state.sectorArmyEditor.dragging = null;
  state.sectorArmyEditor.selectedPointIndex = -1;
  state.sectorArmyEditor.shipTableEditId = null;
}

function showSectorArmyConfirmDialog({ title, message, confirmLabel, cancelLabel = "Abbrechen" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "sector-confirm-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "sector-confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "sectorConfirmTitle");

    const heading = document.createElement("h2");
    heading.id = "sectorConfirmTitle";
    heading.textContent = title;

    const copy = document.createElement("p");
    copy.textContent = message;

    const actions = document.createElement("div");
    actions.className = "sector-confirm-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ghost-button";
    cancel.textContent = cancelLabel;

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "accent-button";
    confirm.textContent = confirmLabel;

    const close = (result) => {
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(Boolean(result));
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close(false);
    };

    cancel.addEventListener("click", () => close(false));
    confirm.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(cancel, confirm);
    dialog.append(heading, copy, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    cancel.focus();
  });
}

async function requestStartSectorArmyBoundaryEdit(id) {
  if (!sectorArmyEditorAvailable()) {
    setStatus("Grenzbearbeitung ist nur im Adminzugang verfuegbar.");
    return false;
  }
  if (state.mapMode === "underworld") {
    setStatus("Im Underworld-Modus bleibt der Sektorarmee-Layer ausgeblendet.");
    return false;
  }
  const numericId = Number(id);
  if (!sectorArmyById(numericId)) return false;
  const confirmed = await showSectorArmyConfirmDialog({
    title: "Grenzen bearbeiten?",
    message:
      "Du bist dabei, die Grenzen dieser Sektorarmee zu bearbeiten. Aenderungen an den Grenzen koennen die Darstellung auf der Karte beeinflussen. Bitte bestaetige, dass du diese Sektorarmee bewusst bearbeiten moechtest.",
    confirmLabel: "Bearbeitung starten",
  });
  if (!confirmed) return false;
  state.sectorArmyEditor.selectedId = numericId;
  state.sectorArmyEditor.enabled = true;
  state.sectorArmyEditor.mode = "vertex";
  state.sectorArmyEditor.modifyMode = true;
  state.sectorArmyEditor.labelMode = false;
  state.filters.sectorArmies = true;
  setStatus("Grenzbearbeitung fuer diese Sektorarmee aktiv.");
  renderAll();
  persistSession();
  addSectorEditorKeyListeners();
  return true;
}

function stopSectorArmyBoundaryEdit() {
  state.sectorArmyEditor.enabled = false;
  state.sectorArmyEditor.modifyMode = false;
  state.sectorArmyEditor.labelMode = false;
  state.sectorArmyEditor.dragging = null;
  state.sectorArmyEditor.selectedPointIndex = -1;
  state.sectorArmyEditor.mode = "view";
  setStatus("Sektorarmee-Grenzen wieder gesperrt.");
  renderAll();
  persistSession();
  removeSectorEditorKeyListeners();
}

async function requestStartSectorArmyTableEdit(id) {
  if (!sectorArmyEditorAvailable()) {
    setStatus("Schiffstabellen sind nur im Adminzugang bearbeitbar.");
    return false;
  }
  const numericId = Number(id);
  if (!sectorArmyById(numericId)) return false;
  const confirmed = await showSectorArmyConfirmDialog({
    title: "Schiffstabelle bearbeiten?",
    message:
      "Du bist dabei, die Schiffszahlen dieser Sektorarmee zu bearbeiten. Die Werte beeinflussen die militaerische Lagekarte und die angezeigte Verfuegbarkeit der Flotten. Bitte bestaetige, dass du die Tabelle bewusst bearbeiten moechtest.",
    confirmLabel: "Tabelle bearbeiten",
  });
  if (!confirmed) return false;
  state.sectorArmyEditor.selectedId = numericId;
  state.sectorArmyEditor.shipTableEditId = numericId;
  setStatus("Schiffstabelle fuer diese Sektorarmee ist bearbeitbar.");
  renderAll();
  persistSession();
  return true;
}

function stopSectorArmyTableEdit() {
  state.sectorArmyEditor.shipTableEditId = null;
  setStatus("Schiffstabelle wieder gesperrt.");
  renderAll();
  persistSession();
}

function selectedSectorArmyEditorTerritory() {
  return sectorArmyTerritoryById(state.sectorArmyEditor.selectedId) || sectorArmyTerritories()[0] || null;
}

function selectedSectorArmyEditorItem() {
  const territory = selectedSectorArmyEditorTerritory();
  return territory ? sectorArmyItem(sectorArmyById(territory.id), territory) : null;
}

function validateSectorArmyTerritory(territory) {
  const messages = [];
  const polygon = sectorArmyPolygonPoints(territory);
  if (polygon.length < 3) messages.push("Mindestens drei Polygonpunkte setzen.");
  if (!normalizeSectorPoint(territory?.labelPosition)) messages.push("Labelposition fehlt.");
  if (!Array.isArray(territory?.anchorPlanets) || !territory.anchorPlanets.length) {
    messages.push("Ankerplaneten fehlen noch.");
  }
  if (String(territory?.notes || "").toLowerCase().includes("platzhalter")) {
    messages.push("Grenze ist noch als Platzhalter markiert.");
  }
  return messages;
}

function sectorArmyTerritoryExportPayload() {
  return sectorArmyTerritories().map((territory) => normalizeSectorTerritory(territory, sectorArmyById(territory.id)));
}

function loadSectorArmyDataDrafts() {
  try {
    const raw = localStorage.getItem(SECTOR_ARMY_DATA_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function persistSectorArmyDataDrafts(drafts) {
  try {
    localStorage.setItem(SECTOR_ARMY_DATA_STORAGE_KEY, JSON.stringify(Array.isArray(drafts) ? drafts : []));
  } catch (_error) {
    setStatus("Sektorarmee-Daten konnten lokal nicht gespeichert werden.");
  }
}

function setSectorArmyDataDraft(draft) {
  if (!draft || typeof draft !== "object") return null;
  const id = Number(draft.id);
  if (!Number.isFinite(id)) return null;
  const drafts = loadSectorArmyDataDrafts().filter((d) => Number(d.id) !== id);
  drafts.push({ ...draft, id });
  persistSectorArmyDataDrafts(drafts);
  return draft;
}

function updateSectorArmyDataDraft(id, updater) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const current = sectorArmyById(numericId) || {};
  const drafts = loadSectorArmyDataDrafts();
  const existing = drafts.find((d) => Number(d.id) === numericId) || {};
  const patch = typeof updater === "function" ? updater({ ...existing, ...current }) : updater || {};
  const next = { ...(existing || {}), ...(patch || {}), id: numericId };
  // normalize numeric fields if present
  if (next.republic) {
    next.republic = {
      ...(existing.republic || {}),
      ...(next.republic || {}),
    };
  }
  if (next.cis) {
    next.cis = {
      ...(existing.cis || {}),
      ...(next.cis || {}),
    };
  }
  // save
  const filtered = drafts.filter((d) => Number(d.id) !== numericId);
  filtered.push(next);
  persistSectorArmyDataDrafts(filtered);
  return next;
}

function resetSectorArmyDataDrafts() {
  try {
    localStorage.removeItem(SECTOR_ARMY_DATA_STORAGE_KEY);
  } catch (_error) { }
}

// --- Editor undo / export helpers ---
function pushSectorArmyEditorUndo(id) {
  try {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    state.sectorArmyEditor.undoStack = state.sectorArmyEditor.undoStack || {};
    state.sectorArmyEditor.redoStack = state.sectorArmyEditor.redoStack || {};
    state.sectorArmyEditor.undoStack[numericId] = state.sectorArmyEditor.undoStack[numericId] || [];
    // new action clears redo history for this territory
    state.sectorArmyEditor.redoStack[numericId] = [];
    const currentTerritory = sectorArmyTerritoryById(numericId) || null;
    const currentArmy = sectorArmyById(numericId) || null;
    // store a deep copy of both territory and army-data draft
    state.sectorArmyEditor.undoStack[numericId].push(
      JSON.parse(
        JSON.stringify({ territory: currentTerritory, army: { ...(currentArmy || {}) } })
      )
    );
    // keep stack bounded
    if (state.sectorArmyEditor.undoStack[numericId].length > 30) state.sectorArmyEditor.undoStack[numericId].shift();
  } catch (_error) {
    // best-effort
  }
}

function undoSectorArmyEditorChange(id) {
  try {
    const numericId = Number(id);
    const stack = (state.sectorArmyEditor.undoStack || {})[numericId] || [];
    if (!stack.length) {
      setStatus("Nichts zum Rueckgaengig machen.");
      return null;
    }
    // push current state onto redo stack so redo is possible
    state.sectorArmyEditor.redoStack = state.sectorArmyEditor.redoStack || {};
    state.sectorArmyEditor.redoStack[numericId] = state.sectorArmyEditor.redoStack[numericId] || [];
    const currentTerritory = sectorArmyTerritoryById(numericId) || null;
    const currentArmy = sectorArmyById(numericId) || null;
    state.sectorArmyEditor.redoStack[numericId].push(
      JSON.parse(
        JSON.stringify({ territory: currentTerritory, army: { ...(currentArmy || {}) } })
      )
    );

    const prev = stack.pop();
    if (!prev) return null;
    if (prev.territory) setSectorArmyTerritoryDraft(prev.territory);
    if (prev.army) {
      // save army draft of only republic/cis fields
      const draft = { id: numericId };
      if (prev.army.republic) draft.republic = prev.army.republic;
      if (prev.army.cis) draft.cis = prev.army.cis;
      setSectorArmyDataDraft(draft);
    }
    renderAll();
    setStatus("Aenderung rueckgaengig.");
    return prev;
  } catch (_error) {
    setStatus("Undo fehlgeschlagen.");
    return null;
  }
}

function redoSectorArmyEditorChange(id) {
  try {
    const numericId = Number(id);
    state.sectorArmyEditor.redoStack = state.sectorArmyEditor.redoStack || {};
    const rstack = state.sectorArmyEditor.redoStack[numericId] || [];
    if (!rstack.length) {
      setStatus("Keine Wiederherstellung moeglich.");
      return null;
    }
    // save current to undo stack
    state.sectorArmyEditor.undoStack = state.sectorArmyEditor.undoStack || {};
    state.sectorArmyEditor.undoStack[numericId] = state.sectorArmyEditor.undoStack[numericId] || [];
    const currentTerritory = sectorArmyTerritoryById(numericId) || null;
    const currentArmy = sectorArmyById(numericId) || null;
    state.sectorArmyEditor.undoStack[numericId].push(
      JSON.parse(JSON.stringify({ territory: currentTerritory, army: { ...(currentArmy || {}) } }))
    );
    // pop redo and apply
    const next = state.sectorArmyEditor.redoStack[numericId].pop();
    if (!next) return null;
    if (next.territory) setSectorArmyTerritoryDraft(next.territory);
    if (next.army) {
      const draft = { id: numericId };
      if (next.army.republic) draft.republic = next.army.republic;
      if (next.army.cis) draft.cis = next.army.cis;
      setSectorArmyDataDraft(draft);
    }
    renderAll();
    setStatus("Aenderung wiederhergestellt.");
    return next;
  } catch (_error) {
    setStatus("Redo fehlgeschlagen.");
    return null;
  }
}

function exportSectorArmyTerritory(id, format = "json") {
  const territory = sectorArmyTerritoryById(id);
  if (!territory) return "";
  const normalized = normalizeSectorTerritory(territory, sectorArmyById(territory.id));
  if (format === "ts") return `export const sectorArmyTerritories = ${JSON.stringify([normalized], null, 2)} as const;\n`;
  return JSON.stringify({ territories: [normalized] }, null, 2);
}

function exportSectorArmyTerritories(format = "json") {
  const payload = sectorArmyTerritoryExportPayload();
  if (format === "ts") {
    return `export const sectorArmyTerritories = ${JSON.stringify(payload, null, 2)} as const;\n`;
  }
  return JSON.stringify({ territories: payload }, null, 2);
}

function importSectorArmyTerritoriesFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const cleaned = raw
    .replace(/^export\s+const\s+\w+\s*=\s*/i, "")
    .replace(/\s+as\s+const;?\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.territories) ? parsed.territories : [];
  if (!entries.length) return false;
  state.sectorArmyTerritoryDrafts = entries
    .map((entry) => normalizeSectorTerritory(entry, sectorArmyById(entry?.id)))
    .filter(Boolean);
  persistSectorArmyTerritoryDrafts();
  return true;
}

function setSectorArmyEditorSelectedId(id) {
  const numericId = Number(id);
  if (!sectorArmyById(numericId)) return;
  state.sectorArmyEditor.selectedId = numericId;
  state.sectorArmyEditor.selectedPointIndex = -1;
  state.sectorArmyEditor.validation = [];
}

function setSectorArmyEditorLabelPosition(point) {
  const normalized = normalizeSectorPoint(point);
  if (!normalized) return;
  pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
  updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, {
    labelPosition: sectorPointToTuple(normalized),
  });
  state.sectorArmyEditor.labelMode = false;
  state.sectorArmyEditor.validation = [];
  setStatus("Sektorarmee-Labelposition gesetzt.");
}

function addSectorArmyEditorPoint(point) {
  const normalized = normalizeSectorPoint(point);
  if (!normalized) return;
  pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
  const next = updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, (territory) => {
    const polygon = sectorArmyPolygonPoints(territory).map(sectorPointToTuple);
    polygon.push(sectorPointToTuple(normalized));
    return { polygon };
  });
  state.sectorArmyEditor.selectedPointIndex = Math.max(0, (next?.polygon?.length || 1) - 1);
  state.sectorArmyEditor.validation = [];
  setStatus("Polygonpunkt gesetzt.");
}

function removeSectorArmyEditorPoint(index = state.sectorArmyEditor.selectedPointIndex) {
  const territory = selectedSectorArmyEditorTerritory();
  const polygon = sectorArmyPolygonPoints(territory).map(sectorPointToTuple);
  const removeIndex = Number.isInteger(index) && index >= 0 ? index : polygon.length - 1;
  if (removeIndex < 0 || removeIndex >= polygon.length) return;
  pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
  polygon.splice(removeIndex, 1);
  updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, { polygon });
  state.sectorArmyEditor.selectedPointIndex = Math.min(removeIndex, polygon.length - 1);
  state.sectorArmyEditor.validation = [];
  setStatus("Polygonpunkt entfernt.");
}

function findNearestSectorSegment(territory, point) {
  const polygon = sectorArmyPolygonPoints(territory);
  if (!polygon || polygon.length < 2) return { index: -1, distanceSq: Number.POSITIVE_INFINITY };
  const closed = polygon.length > 2;
  let bestIndex = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < (closed ? polygon.length : polygon.length - 1); i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = (point.x - a.x);
    const wy = (point.y - a.y);
    const denom = vx * vx + vy * vy;
    const t = denom > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / denom)) : 0;
    const px = a.x + t * vx;
    const py = a.y + t * vy;
    const dx = point.x - px;
    const dy = point.y - py;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDist) {
      bestDist = distSq;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distanceSq: bestDist };
}

function insertSectorArmyEditorPointAtSegment(index, point) {
  const territory = selectedSectorArmyEditorTerritory();
  if (!territory) return null;
  const polygon = sectorArmyPolygonPoints(territory).map(sectorPointToTuple);
  const insertIndex = Math.min(Math.max(0, Number(index) + 1), polygon.length);
  pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
  polygon.splice(insertIndex, 0, sectorPointToTuple(point));
  updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, { polygon });
  state.sectorArmyEditor.selectedPointIndex = insertIndex;
  state.sectorArmyEditor.validation = [];
  setStatus("Polygonpunkt eingefuegt.");
  renderAll();
  return true;
}

function beginSectorArmyEditorDrag(event, type, pointIndex = -1) {
  if (!state.sectorArmyEditor.enabled) return;
  // Gate allowed drag types by explicit editor mode (or Alt to override).
  const mode = state.sectorArmyEditor.mode || "view";
  const allowed = new Set();
  if (mode === "sector") {
    allowed.add("translate");
    allowed.add("label");
  } else if (mode === "vertex") {
    allowed.add("point");
    allowed.add("label");
    allowed.add("translate");
  } else if (mode === "curve") {
    allowed.add("curve");
    allowed.add("point");
    allowed.add("label");
    allowed.add("translate");
  }
  if (!allowed.has(type) && !event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  const dragging = {
    type,
    pointIndex,
    pointerId: event.pointerId,
  };
  // record undo snapshot at drag start to avoid polluting stack on every pointermove
  if (type === "point" || type === "label" || type === "translate" || type === "curve") {
    pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
  }
  if (type === "translate") {
    // capture the polygon snapshot and start client position for delta calculation
    const territory = selectedSectorArmyEditorTerritory();
    dragging.startClientX = event.clientX;
    dragging.startClientY = event.clientY;
    dragging.originalPolygon = sectorArmyPolygonPoints(territory).map((p) => sectorPointToTuple(p));
  }
  state.sectorArmyEditor.dragging = dragging;
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function updateSectorArmyEditorDrag(event) {
  const drag = state.sectorArmyEditor.dragging;
  if (!drag) return;
  const point = clientToImageNorm(event.clientX, event.clientY);
  if (!point) return;
  if (drag.type === "label") {
    updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, {
      labelPosition: sectorPointToTuple(point),
    });
  } else if (drag.type === "curve") {
    // set quadratic control point for the segment at drag.pointIndex
    updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, (territory) => {
      const curves = { ...(territory?.curves || {}) };
      curves[String(drag.pointIndex)] = sectorPointToTuple(point);
      return { curves };
    });
  } else if (drag.type === "point") {
    updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, (territory) => {
      const polygon = sectorArmyPolygonPoints(territory).map(sectorPointToTuple);
      if (drag.pointIndex >= 0 && drag.pointIndex < polygon.length) {
        polygon[drag.pointIndex] = sectorPointToTuple(point);
      }
      return { polygon };
    });
    state.sectorArmyEditor.selectedPointIndex = drag.pointIndex;
  } else if (drag.type === "translate") {
    // translate the whole polygon by the pointer delta
    const start = clientToImageNorm(drag.startClientX, drag.startClientY);
    if (!start || !Array.isArray(drag.originalPolygon)) return;
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;
    updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, (territory) => {
      const original = drag.originalPolygon || [];
      const polygon = original
        .map((tuple) => {
          const nx = clamp01(Number(tuple[0]) + deltaX);
          const ny = clamp01(Number(tuple[1]) + deltaY);
          return [Number(nx.toFixed(4)), Number(ny.toFixed(4))];
        })
        .map(sectorPointToTuple);
      return { polygon };
    });
  }
  renderOverlay();
  renderSectorArmyEditor();
}

function finishSectorArmyEditorDrag() {
  if (!state.sectorArmyEditor.dragging) return;
  state.sectorArmyEditor.dragging = null;
  state.sectorArmyEditor.validation = [];
  renderAll();
}

// keyboard handlers for editor (undo/redo/delete)
let _sectorEditorKeydownHandler = null;
function addSectorEditorKeyListeners() {
  if (_sectorEditorKeydownHandler) return;
  _sectorEditorKeydownHandler = function (event) {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
    if (event.key === "Delete") {
      removeSectorArmyEditorPoint();
      renderAll();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redoSectorArmyEditorChange(state.sectorArmyEditor.selectedId);
      } else {
        undoSectorArmyEditorChange(state.sectorArmyEditor.selectedId);
      }
    }
  };
  document.addEventListener("keydown", _sectorEditorKeydownHandler);
}

function removeSectorEditorKeyListeners() {
  if (!_sectorEditorKeydownHandler) return;
  document.removeEventListener("keydown", _sectorEditorKeydownHandler);
  _sectorEditorKeydownHandler = null;
}

function handleSectorArmyEditorCanvasClick(originalEvent) {
  if (!state.sectorArmyEditor.enabled || state.mapMode === "underworld") return false;
  const touchPoint = originalEvent?.changedTouches?.[0] || originalEvent?.touches?.[0] || null;
  const clientX = typeof originalEvent?.clientX === "number" ? originalEvent.clientX : touchPoint?.clientX;
  const clientY = typeof originalEvent?.clientY === "number" ? originalEvent.clientY : touchPoint?.clientY;
  if (typeof clientX !== "number" || typeof clientY !== "number") return false;
  const point = clientToImageNorm(clientX, clientY);
  if (!point) return false;
  const mode = state.sectorArmyEditor.mode || "view";
  if (!(mode === "vertex" || mode === "curve" || state.sectorArmyEditor.labelMode || originalEvent.shiftKey)) return false;
  if (originalEvent.shiftKey || state.sectorArmyEditor.labelMode) {
    setSectorArmyEditorLabelPosition(point);
  } else {
    addSectorArmyEditorPoint(point);
  }
  renderAll();
  return true;
}

function normalizeFleetShipEntry(entry, fallbackIndex = 0) {
  const shipId = String(entry?.shipId || entry?.shipClassId || entry?.ship_id || entry?.id || "").trim();
  if (!shipId) return null;
  const entryId = String(
    (entry?.shipId ? entry?.id : "") || entry?.entryId || entry?.instanceId || entry?.uid || ""
  ).trim();
  return {
    id: entryId || createLocalId(`ship-${fallbackIndex}`),
    shipId,
    callsign: String(entry?.callsign || entry?.name || "").trim(),
    fuelHours: Number.isFinite(Number(entry?.fuelHours)) ? Number(entry.fuelHours) : null,
    createdAt: String(entry?.createdAt || new Date().toISOString()),
  };
}

function normalizeFleetShipEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const expanded = [];
  entries.forEach((entry, index) => {
    const base = normalizeFleetShipEntry(entry, index);
    if (!base) return;
    const quantity = normalizeFleetQuantity(entry?.quantity || 1);
    for (let copyIndex = 0; copyIndex < quantity; copyIndex += 1) {
      expanded.push({
        ...base,
        id: copyIndex === 0 ? base.id : createLocalId(`ship-${index}-${copyIndex}`),
      });
    }
  });
  return expanded;
}

function normalizeFleetRecord(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || createLocalId("fleet")).trim();
  const name = String(entry.name || "Unbenannte Flotte").trim();
  const ships = normalizeFleetShipEntries(entry.ships);
  return {
    id,
    name: name || "Unbenannte Flotte",
    faction: normalizeFleetFaction(entry.faction),
    ships,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function normalizeFleetProfile(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || createLocalId("profile")).trim();
  const name = String(entry.name || FLEET_DEFAULT_PROFILE_NAME).trim();
  const fleets = Array.isArray(entry.fleets)
    ? entry.fleets.map(normalizeFleetRecord).filter(Boolean)
    : [];
  const activeFleetId = String(entry.activeFleetId || entry.selectedFleetId || "").trim();
  return {
    id,
    name: name || FLEET_DEFAULT_PROFILE_NAME,
    fleets,
    activeFleetId: fleets.some((fleet) => fleet.id === activeFleetId) ? activeFleetId : fleets[0]?.id || "",
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function defaultFleetStore() {
  const profileId = createLocalId("profile");
  return {
    activeProfileId: profileId,
    profiles: {
      [profileId]: {
        id: profileId,
        name: FLEET_DEFAULT_PROFILE_NAME,
        fleets: [],
        activeFleetId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function normalizeFleetStore(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rawProfiles = Array.isArray(source.profiles)
    ? source.profiles
    : Object.values(source.profiles || {});
  const profiles = {};
  rawProfiles
    .map(normalizeFleetProfile)
    .filter(Boolean)
    .forEach((profile) => {
      profiles[profile.id] = profile;
    });

  if (!Object.keys(profiles).length) {
    return defaultFleetStore();
  }

  const requestedProfileId = String(source.activeProfileId || "").trim();
  const activeProfileId = profiles[requestedProfileId] ? requestedProfileId : Object.keys(profiles)[0];
  return { activeProfileId, profiles };
}

function ensureFleetStore() {
  if (!state.fleetStore) {
    state.fleetStore = defaultFleetStore();
  }
  const profile = activeFleetProfile();
  if (!profile) {
    state.fleetStore = defaultFleetStore();
  }
  return state.fleetStore;
}

function fleetProfilesArray() {
  const store = ensureFleetStore();
  return Object.values(store.profiles).sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function activeFleetProfile() {
  const store = state.fleetStore || defaultFleetStore();
  if (!state.fleetStore) state.fleetStore = store;
  return store.profiles[store.activeProfileId] || Object.values(store.profiles)[0] || null;
}

function currentProfileFleets() {
  return activeFleetProfile()?.fleets || [];
}

function activeFleet() {
  const profile = activeFleetProfile();
  if (!profile) return null;
  return profile.fleets.find((fleet) => fleet.id === profile.activeFleetId) || null;
}

function selectedTravelFleet() {
  const id = String(state.travelFleetId || "").trim();
  if (!id) return null;
  return currentProfileFleets().find((fleet) => fleet.id === id) || null;
}

function fleetShipById(shipId) {
  return state.shipCatalogById.get(String(shipId || "").trim()) || null;
}

function fleetShipTotal(fleet) {
  return Array.isArray(fleet?.ships) ? fleet.ships.length : 0;
}

function fleetAutoStats(fleet) {
  const stats = {
    ships: 0,
    optimalDamage: 0,
    shieldsSbd: 0,
    hullRu: 0,
    crew: 0,
    slowestHyperdriveClass: null,
    slowestMglt: null,
  };
  (fleet?.ships || []).forEach((entry) => {
    const ship = fleetShipById(entry.shipId);
    if (!ship) return;
    stats.ships += 1;
    ["optimalDamage", "shieldsSbd", "hullRu", "crew"].forEach((key) => {
      const value = Number(ship[key]);
      if (Number.isFinite(value)) stats[key] += value;
    });
    const hyperdrive = Number(ship.hyperdriveClass);
    if (Number.isFinite(hyperdrive)) {
      stats.slowestHyperdriveClass =
        stats.slowestHyperdriveClass == null ? hyperdrive : Math.max(stats.slowestHyperdriveClass, hyperdrive);
    }
    const mglt = Number(ship.mglt);
    if (Number.isFinite(mglt)) {
      stats.slowestMglt = stats.slowestMglt == null ? mglt : Math.min(stats.slowestMglt, mglt);
    }
  });
  return stats;
}

function fleetSummaryLabel(fleet) {
  const stats = fleetAutoStats(fleet);
  const parts = [
    fleetFactionLabel(fleet?.faction),
    `${formatFleetNumber(stats.ships)} Schiffe`,
  ];
  return parts.join(" / ");
}

function fleetStoreStats(store = ensureFleetStore()) {
  const profiles = Object.values(store?.profiles || {});
  const fleets = profiles.flatMap((profile) => (Array.isArray(profile.fleets) ? profile.fleets : []));
  return {
    profiles: profiles.length,
    fleets: fleets.length,
    ships: fleets.reduce((sum, fleet) => sum + fleetShipTotal(fleet), 0),
  };
}

function fleetStoreHasData(store = ensureFleetStore()) {
  const stats = fleetStoreStats(store);
  return stats.fleets > 0 || stats.ships > 0;
}

function adminFleetToken() {
  return window.MapAdminUi?.getToken?.() || sessionStorage.getItem("swmap_admin_token") || "";
}

function handleAdminUnauthorized(message = "Admin-Sitzung abgelaufen. Bitte neu einloggen.") {
  if (window.MapAdminUi?.clearToken) {
    window.MapAdminUi.clearToken();
  } else {
    sessionStorage.removeItem("swmap_admin_token");
    window.dispatchEvent(new CustomEvent("swmap-admin-auth-changed", { detail: { isAdmin: false } }));
  }
  if (typeof window.MapAdminUi?.openLoginModal === "function") {
    window.MapAdminUi.openLoginModal();
  }
  setStatus(message);
  return message;
}

function isFleetAdminView() {
  return Boolean(state.fleetAdminUserId);
}

function setFleetAccountFeedback(message = "", isError = false) {
  state.fleetSyncMessage = message;
  if (fleetAccountFeedback) {
    fleetAccountFeedback.textContent = message;
    fleetAccountFeedback.classList.toggle("error", Boolean(isError));
  }
}

function setFleetAdminFeedback(message = "", isError = false) {
  if (fleetAdminFeedback) {
    fleetAdminFeedback.textContent = message;
    fleetAdminFeedback.classList.toggle("error", Boolean(isError));
  }
}

function normalizeFleetAuth(payload) {
  if (!payload || typeof payload !== "object") return null;
  const token = String(payload.token || "").trim();
  const user = payload.user && typeof payload.user === "object" ? payload.user : null;
  const id = String(user?.id || "").trim();
  if (!token || !id) return null;
  return {
    token,
    user: {
      id,
      username: String(user.username || "").trim(),
      displayName: String(user.displayName || user.username || "").trim(),
      role: String(user.role || "user").trim(),
    },
  };
}

function saveFleetAuth(auth) {
  state.fleetAuth = normalizeFleetAuth(auth);
  if (state.fleetAuth) {
    localStorage.setItem(FLEET_AUTH_STORAGE_KEY, JSON.stringify(state.fleetAuth));
  } else {
    localStorage.removeItem(FLEET_AUTH_STORAGE_KEY);
  }
}

function loadFleetAuthFromStorage() {
  try {
    const raw = localStorage.getItem(FLEET_AUTH_STORAGE_KEY);
    state.fleetAuth = normalizeFleetAuth(raw ? JSON.parse(raw) : null);
  } catch (_error) {
    state.fleetAuth = null;
    localStorage.removeItem(FLEET_AUTH_STORAGE_KEY);
  }
}

async function fleetApi(path, options = {}, token = state.fleetAuth?.token) {
  const headers = {
    ...(options.headers || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.detail = json.detail || "";
    throw error;
  }
  return json;
}

function applyFleetStore(store, options = {}) {
  state.fleetStore = normalizeFleetStore(store);
  state.travelFleetId = "";
  state.selectedFleetShipId = "";
  if (options.persistLocal !== false && !isFleetAdminView()) {
    try {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(ensureFleetStore()));
    } catch (_error) {
      // Local cache is optional when cloud sync is active.
    }
  }
}

async function saveFleetStoreToCloud(options = {}) {
  if (state.fleetSyncInFlight) return false;
  const adminUserId = String(state.fleetAdminUserId || "").trim();
  const token = adminUserId ? adminFleetToken() : state.fleetAuth?.token;
  if (!token) return false;
  state.fleetSyncInFlight = true;
  state.fleetSyncState = "syncing";
  renderFleetPanel();
  try {
    const body = adminUserId
      ? { userId: adminUserId, store: ensureFleetStore() }
      : { store: ensureFleetStore() };
    await fleetApi(
      "/api/fleets/store",
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
    state.fleetSyncState = adminUserId ? "admin" : "synced";
    if (adminUserId) {
      const index = state.fleetAdminUsers.findIndex((entry) => entry.user?.id === adminUserId);
      if (index >= 0) {
        state.fleetAdminUsers[index] = {
          ...state.fleetAdminUsers[index],
          store: ensureFleetStore(),
          stats: fleetStoreStats(ensureFleetStore()),
        };
      }
    }
    if (!options.silent) {
      setFleetAccountFeedback(adminUserId ? "Admin-Aenderung gespeichert." : "Flotten synchronisiert.");
    }
    return true;
  } catch (error) {
    state.fleetSyncState = "error";
    if (error.status === 401 && !adminUserId) {
      saveFleetAuth(null);
    }
    if (!options.silent) {
      setFleetAccountFeedback(`Sync fehlgeschlagen: ${error.message}`, true);
    }
    return false;
  } finally {
    state.fleetSyncInFlight = false;
    renderFleetPanel();
  }
}

function queueFleetCloudSave() {
  const hasCloudTarget = Boolean(state.fleetAuth?.token || state.fleetAdminUserId);
  if (!hasCloudTarget) return;
  if (state.fleetSyncTimer) window.clearTimeout(state.fleetSyncTimer);
  state.fleetSyncTimer = window.setTimeout(() => {
    state.fleetSyncTimer = 0;
    void saveFleetStoreToCloud({ silent: true });
  }, FLEET_SYNC_DEBOUNCE_MS);
}

function persistFleetStore(options = {}) {
  try {
    if (!isFleetAdminView()) {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(ensureFleetStore()));
    }
  } catch (_error) {
    setStatus("Flotten konnten lokal nicht gespeichert werden.");
  }
  if (options.cloud !== false) {
    queueFleetCloudSave();
  }
}

function loadFleetStoreFromStorage() {
  try {
    const raw = localStorage.getItem(FLEET_STORAGE_KEY);
    state.fleetStore = normalizeFleetStore(raw ? JSON.parse(raw) : null);
  } catch (_error) {
    state.fleetStore = defaultFleetStore();
    state.dataSources.push("Lokale Flotten konnten nicht geladen werden");
  }
}

async function syncFleetLogin(action) {
  const username = String(fleetUsernameInput?.value || "").trim();
  const password = String(fleetPasswordInput?.value || "");
  if (!username || !password) {
    setFleetAccountFeedback("Benutzername und Passwort eintragen.", true);
    return;
  }
  const localStoreBeforeLogin = ensureFleetStore();
  const localHadData = fleetStoreHasData(localStoreBeforeLogin);
  const button = action === "register" ? fleetRegisterButton : fleetLoginButton;
  if (button) button.disabled = true;
  setFleetAccountFeedback(action === "register" ? "Registriere Account..." : "Logge ein...");
  try {
    const json = await fleetApi("/api/fleets/auth", {
      method: "POST",
      body: JSON.stringify({ action, username, password }),
    }, "");
    saveFleetAuth({ token: json.token, user: json.user });
    state.fleetAdminUserId = "";
    state.fleetAdminUsers = [];
    const remoteStore = normalizeFleetStore(json.store);
    if (localHadData && !fleetStoreHasData(remoteStore)) {
      state.fleetStore = localStoreBeforeLogin;
      await saveFleetStoreToCloud({ silent: true });
      setFleetAccountFeedback("Eingeloggt. Lokale Flotten wurden in den Account uebernommen.");
    } else {
      applyFleetStore(remoteStore);
      persistFleetStore({ cloud: false });
      setFleetAccountFeedback(`Eingeloggt als ${json.user?.displayName || json.user?.username || username}.`);
    }
    if (fleetPasswordInput) fleetPasswordInput.value = "";
    renderAll();
  } catch (error) {
    setFleetAccountFeedback(error.message || "Login fehlgeschlagen.", true);
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadFleetCloudStore(options = {}) {
  if (!state.fleetAuth?.token) return false;
  setFleetAccountFeedback(options.silent ? state.fleetSyncMessage : "Lade Flotten vom Server...");
  try {
    const json = await fleetApi("/api/fleets/store", { method: "GET" }, state.fleetAuth.token);
    applyFleetStore(json.store);
    persistFleetStore({ cloud: false });
    state.fleetSyncState = "synced";
    if (!options.silent) setFleetAccountFeedback("Server-Flotten geladen.");
    renderAll();
    return true;
  } catch (error) {
    if (error.status === 401) saveFleetAuth(null);
    state.fleetSyncState = "error";
    if (!options.silent) setFleetAccountFeedback(`Server konnte nicht geladen werden: ${error.message}`, true);
    renderAll();
    return false;
  }
}

function logoutFleetAccount() {
  saveFleetAuth(null);
  state.fleetSyncState = "local";
  state.fleetSyncMessage = "";
  setFleetAccountFeedback("Abgemeldet. Lokale Flotten bleiben in diesem Browser.");
  renderAll();
}

async function loadFleetAdminUsers() {
  const token = adminFleetToken();
  if (!token) {
    setFleetAdminFeedback("Bitte zuerst als Admin einloggen.", true);
    return;
  }
  if (fleetAdminLoadButton) fleetAdminLoadButton.disabled = true;
  setFleetAdminFeedback("Lade alle Flotten-User...");
  try {
    const json = await fleetApi("/api/fleets/store?all=1", { method: "GET" }, token);
    state.fleetAdminUsers = Array.isArray(json.users) ? json.users : [];
    if (!state.fleetAdminUsers.length) {
      state.fleetAdminUserId = "";
      setFleetAdminFeedback("Noch keine Flotten-User vorhanden.");
      renderAll();
      return;
    }
    selectFleetAdminUser(state.fleetAdminUsers[0].user?.id || "");
    setFleetAdminFeedback(`${state.fleetAdminUsers.length} User geladen.`);
  } catch (error) {
    setFleetAdminFeedback(`Admin-Laden fehlgeschlagen: ${error.message}`, true);
  } finally {
    if (fleetAdminLoadButton) fleetAdminLoadButton.disabled = false;
    renderAll();
  }
}

function selectFleetAdminUser(userId) {
  const id = String(userId || "").trim();
  const entry = state.fleetAdminUsers.find((item) => item.user?.id === id);
  if (!entry) return;
  state.fleetAdminUserId = id;
  state.fleetSyncState = "admin";
  applyFleetStore(entry.store, { persistLocal: false });
  setFleetAdminFeedback(`Admin-Ansicht: ${entry.user.displayName || entry.user.username}`);
  renderAll();
}

function exitFleetAdminView() {
  state.fleetAdminUserId = "";
  if (state.fleetAuth?.token) {
    void loadFleetCloudStore({ silent: true });
  } else {
    loadFleetStoreFromStorage();
  }
  state.fleetSyncState = state.fleetAuth?.token ? "synced" : "local";
  setFleetAdminFeedback("");
  renderAll();
}

function activeMapFilterCount(filters = state.filters) {
  const factionKeys = state.mapMode === "underworld" ? UNDERWORLD_FACTION_KEYS : GOVERNMENT_FACTION_KEYS;
  let count = 0;
  factionKeys.forEach((key) => {
    if (filters[key] === false) count += 1;
  });
  if (filters.routes === false) count += 1;
  if (filters.profiledOnly) count += 1;
  if (state.mapMode !== "underworld" && filters.sectorArmies) count += 1;
  return count;
}

function mapFilterSignature(filters = state.filters) {
  return [
    state.mapMode === "underworld" ? "uw1" : "uw0",
    filters.republic ? "r1" : "r0",
    filters.separatist ? "s1" : "s0",
    filters.blacksun ? "b1" : "b0",
    filters.hutt ? "h1" : "h0",
    filters.pyke ? "py1" : "py0",
    filters.ohnaka ? "o1" : "o0",
    filters.routes ? "t1" : "t0",
    filters.profiledOnly ? "profile1" : "profile0",
    filters.sectorArmies ? "a1" : "a0",
  ].join(":");
}

function filterFactionShortLabel(key) {
  if (key === "republic") return "Republik";
  if (key === "separatist") return "Separatisten";
  if (key === "blacksun") return "Black Sun";
  if (key === "hutt") return "Hutten";
  if (key === "pyke") return "Pyke";
  if (key === "ohnaka") return "Hondo Ohnaka";
  return FACTION_LABELS[key] || key;
}

function mapFilterSummaryText(filters = state.filters) {
  const parts = [];
  const factionKeys = state.mapMode === "underworld" ? UNDERWORLD_FACTION_KEYS : GOVERNMENT_FACTION_KEYS;
  const hiddenFactionCount = factionKeys.filter((key) => filters[key] === false).length;
  if (hiddenFactionCount) {
    const activeFactions = factionKeys.filter((key) => filters[key] !== false).map(filterFactionShortLabel);
    parts.push(activeFactions.length ? `Nur ${activeFactions.join(", ")}` : "Keine Fraktion");
  }
  if (!filters.routes) {
    parts.push("ohne Routen");
  }
  if (filters.profiledOnly) {
    parts.push("nur mit Profil");
  }
  if (state.mapMode !== "underworld" && filters.sectorArmies) {
    parts.push("Sektorarmeen");
  }
  return parts.length ? parts.join(" / ") : "Alle sichtbar";
}

function factionDisplayName(value) {
  const faction = normalizeFaction(value);
  return faction ? FACTION_LABELS[faction] || faction : "Neutral";
}

function normalizeProfileSources(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const title = String(entry.title || entry.name || "").trim();
      const url = String(entry.url || entry.href || "").trim();
      if (!title && !url) return null;
      return {
        title: title || url,
        url,
      };
    })
    .filter(Boolean);
}

function normalizePositiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normalizePlanetProfileEntry(name, value) {
  if (!value || typeof value !== "object") return null;
  const nameKey = normalizeNameKey(name);
  if (!nameKey) return null;
  const faction = normalizeFaction(value.faction);
  return {
    name: String(value.name || name || "").trim(),
    nameKey,
    faction,
    climate: String(value.climate || "").trim(),
    terrain: String(value.terrain || "").trim(),
    species_population: String(value.species_population || value.speciesPopulation || "").trim(),
    lore: String(value.lore || value.summary || value.desc || "").trim(),
    notes: String(value.notes || value.continuity_note || "").trim(),
    orbit_image: String(value.orbit_image || "").trim(),
    orbit_image_alt: String(value.orbit_image_alt || "").trim(),
    map_image: String(value.map_image || "").trim(),
    map_image_alt: String(value.map_image_alt || "").trim(),
    map_href: String(value.map_href || "").trim(),
    map_label: String(value.map_label || "").trim(),
    size_body_type: String(value.size_body_type || value.body_type || "").trim().toLowerCase(),
    diameter_km: normalizePositiveNumber(value.diameter_km),
    radius_km: normalizePositiveNumber(value.radius_km),
    size_confidence: String(value.size_confidence || "").trim().toLowerCase(),
    size_evidence: String(value.size_evidence || "").trim(),
    size_notes: String(value.size_notes || "").trim(),
    sources: normalizeProfileSources(value.sources),
  };
}

function normalizeFactionProfileEntry(faction, value) {
  const key = normalizeFaction(faction);
  if (!key) return null;
  const source = value && typeof value === "object" ? value : DEFAULT_FACTION_PROFILES[key];
  if (!source) return null;
  return {
    faction: key,
    name: String(source.name || factionDisplayName(key)).trim(),
    summary: String(source.summary || source.desc || "").trim(),
    government: String(source.government || "").trim(),
    strength: String(source.strength || "").trim(),
    main_planet: String(source.main_planet || source.mainPlanet || FACTION_MAIN_PLANETS[key] || "").trim(),
    sources: normalizeProfileSources(source.sources),
  };
}

function factionPlanetCandidates(faction) {
  return allRenderableMapItems().filter((item) => item.kind !== "route" && normalizeFaction(item.faction) === faction);
}

function chooseFactionMainPlanet(faction, preferredPlanet = "") {
  const preferred = String(preferredPlanet || "").trim();
  const fallback = String(FACTION_MAIN_PLANETS[faction] || "").trim();
  const candidates = factionPlanetCandidates(faction);
  if (!candidates.length) {
    return preferred || fallback || "Unbekannt";
  }

  const byKey = new Map(
    candidates.map((item) => [item.nameKey || normalizeNameKey(item.name), item])
  );
  for (const name of [preferred, fallback]) {
    const key = normalizeNameKey(name);
    if (!key) continue;
    const match = byKey.get(key);
    if (match) return match.name;
  }

  return candidates
    .slice()
    .sort((left, right) => {
      const leftPriority = PLANET_LABEL_PRIORITIES[left.nameKey || normalizeNameKey(left.name)] || 0;
      const rightPriority = PLANET_LABEL_PRIORITIES[right.nameKey || normalizeNameKey(right.name)] || 0;
      if (leftPriority !== rightPriority) return rightPriority - leftPriority;
      return left.name.localeCompare(right.name, "de");
    })[0]
    ?.name || preferred || fallback || "Unbekannt";
}

function planetFactionStyle(item) {
  if (!item || item.kind === "route") return null;
  const faction = normalizeFaction(item.faction);
  return faction ? FACTION_VISUALS[faction] || null : null;
}

function setFactionCssVars(target, style) {
  if (!target || !style) return;
  target.style.setProperty("--pin-dot-fill", style.dotFill);
  target.style.setProperty("--pin-dot-shadow", style.pinDotShadow);
  target.style.setProperty("--pin-label-color", style.pinLabelColor);
  target.style.setProperty("--pin-label-border", style.pinLabelBorder);
  target.style.setProperty("--selection-ring-color", style.selectionRingColor);
  target.style.setProperty("--selection-ring-bg", style.selectionRingBg);
  target.style.setProperty("--selection-ring-shadow", style.selectionRingShadow);
  target.style.setProperty("--selection-dot-fill", style.selectionDotFill);
  target.style.setProperty("--selection-dot-border", style.selectionDotBorder);
  target.style.setProperty("--selection-badge-color", style.pinLabelColor);
  target.style.setProperty("--selection-badge-border", style.pinLabelBorder);
  target.style.setProperty("--hover-fill", style.hoverFill);
  target.style.setProperty("--hover-border", style.hoverBorder);
  target.style.setProperty("--hover-shadow", style.hoverShadow);
  target.style.setProperty("--hover-badge-color", style.pinLabelColor);
  target.style.setProperty("--hover-badge-border", style.pinLabelBorder);
}

function applyFactionRecord(record) {
  if (!record || !record.nameKey) return record;
  const explicitFaction = normalizeFaction(record.faction);
  const mappedFaction = explicitFaction || state.planetFactions.get(record.nameKey) || "";
  if (mappedFaction) {
    record.faction = mappedFaction;
  } else {
    delete record.faction;
  }
  return record;
}

function aliasExclusionsFromFactionPayload(payload) {
  const excluded = new Set();
  const conflicts = Array.isArray(payload?.meta?.conflicts) ? payload.meta.conflicts : [];
  conflicts.forEach((entry) => {
    const canonicalKey = normalizeNameKey(entry?.name);
    (Array.isArray(entry?.source_names) ? entry.source_names : []).forEach((name) => {
      const key = normalizeNameKey(name);
      if (key && key !== canonicalKey) excluded.add(key);
    });
  });
  Object.keys(payload?.meta?.rejected_aliases || {}).forEach((name) => {
    const key = normalizeNameKey(name);
    if (key) excluded.add(key);
  });
  return excluded;
}

function importPlanetAliasesFromFactionPayload(payload) {
  const aliasTargets = new Map();
  const aliasesByTarget = new Map();
  const excluded = aliasExclusionsFromFactionPayload(payload);
  Object.entries(payload?.meta?.aliases_applied || {}).forEach(([aliasName, targets]) => {
    const aliasKey = normalizeNameKey(aliasName);
    if (!aliasKey || excluded.has(aliasKey)) return;
    const targetKeys = (Array.isArray(targets) ? targets : [targets])
      .map((target) => normalizeNameKey(target))
      .filter(Boolean);
    if (!targetKeys.length) return;
    aliasTargets.set(aliasKey, targetKeys);
    targetKeys.forEach((targetKey) => {
      const aliases = aliasesByTarget.get(targetKey) || [];
      if (!aliases.includes(aliasName)) aliases.push(aliasName);
      aliasesByTarget.set(targetKey, aliases);
    });
  });
  state.planetAliasTargets = aliasTargets;
  state.planetAliasesByTarget = aliasesByTarget;
}

function planetOverrideTargetKeys(name) {
  const key = normalizeNameKey(name);
  if (!key) return [];
  const keys = new Set([key]);
  (state.planetAliasTargets.get(key) || []).forEach((targetKey) => {
    if (targetKey) keys.add(targetKey);
  });
  return Array.from(keys);
}

function isNeutralFactionOverrideValue(raw) {
  return !raw || raw === "neutral" || raw === "none" || raw === "leer" || raw === "keine";
}

function applyModeFactionOverrideToMaps(nameKey, value, mode) {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  const faction = normalizeOverrideFaction(raw);
  const isNeutral = isNeutralFactionOverrideValue(raw);
  const modeKey = mode === "underworld" ? "underworld" : "government";
  const allowed = modeKey === "underworld" ? UNDERWORLD_FACTION_KEYS : GOVERNMENT_FACTION_KEYS;
  const targetMap = modeKey === "underworld" ? state.underworldPlanetFactions : state.governmentPlanetFactions;
  if (isNeutral) {
    targetMap.delete(nameKey);
    if (state.mapMode === modeKey) state.planetFactions.delete(nameKey);
    return;
  }
  if (!faction || !allowed.includes(faction)) return;
  targetMap.set(nameKey, faction);
  if (state.mapMode === modeKey) state.planetFactions.set(nameKey, faction);
}

function applyFactionOverrideToMaps(nameKey, value) {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  const faction = normalizeOverrideFaction(raw);
  if (isNeutralFactionOverrideValue(raw)) {
    applyModeFactionOverrideToMaps(nameKey, value, "government");
    return;
  }
  if (GOVERNMENT_FACTION_KEYS.includes(faction)) {
    applyModeFactionOverrideToMaps(nameKey, value, "government");
  } else if (UNDERWORLD_FACTION_KEYS.includes(faction)) {
    applyModeFactionOverrideToMaps(nameKey, value, "underworld");
  }
}

function applyUnderworldFactionOverrideToMaps(nameKey, value) {
  applyModeFactionOverrideToMaps(nameKey, value, "underworld");
}

function parseGridLabel(value) {
  const label = normalizeGridLabel(value);
  if (!label) return null;
  const [letter, number] = label.split("-");
  return { col: GRID_LETTERS.indexOf(letter), row: Number(number) - 1, label };
}

function nextGridLabel(current, delta) {
  const parsed = parseGridLabel(current) || parseGridLabel("L-9");
  const flat = parsed.row * GRID_LETTERS.length + parsed.col;
  const total = GRID_LETTERS.length * GRID_ROWS;
  const next = (flat + delta + total) % total;
  const col = next % GRID_LETTERS.length;
  const row = Math.floor(next / GRID_LETTERS.length);
  return `${GRID_LETTERS[col]}-${row + 1}`;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePoint01(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: clamp01(x),
    y: clamp01(y),
  };
}

function normalizeVectorPoint(point) {
  const anchor = normalizePoint01(point?.anchor || point);
  if (!anchor) return null;
  return {
    anchor,
    in: normalizePoint01(point?.in) || { ...anchor },
    out: normalizePoint01(point?.out) || { ...anchor },
    mode: point?.mode === "smooth" ? "smooth" : "corner",
    ...(point?.planet_name ? { planet_name: String(point.planet_name) } : {}),
  };
}

function normalizeStoredVectorPath(path) {
  if (!path || typeof path !== "object") return null;
  const points = (Array.isArray(path.points) ? path.points : [])
    .map((point) => normalizeVectorPoint(point))
    .filter(Boolean);
  if (points.length < 2) return null;
  return {
    id: String(path.id || ""),
    layer_id: String(path.layer_id || path.id || ""),
    name: String(path.name || ""),
    closed: Boolean(path.closed),
    draft: Boolean(path.draft),
    opacity_pct: Number(path.opacity_pct ?? 96),
    fill_tone: String(path.fill_tone || ""),
    path_kind: String(path.path_kind || ""),
    stroke_tone: String(path.stroke_tone || ""),
    label_anchor: normalizePoint01(path.label_anchor),
    label_rotation_deg: Number(path.label_rotation_deg || 0),
    label_font_scale: Number(path.label_font_scale || 1),
    route_id: String(path.route_id || ""),
    route_planets: Array.isArray(path.route_planets) ? path.route_planets.map((name) => String(name)) : [],
    layer_group_id: String(path.layer_group_id || ""),
    layer_group_name: String(path.layer_group_name || ""),
    travel_kind: String(path.travel_kind || ""),
    suppress_label: Boolean(path.suppress_label),
    source_url: String(path.source_url || ""),
    points,
  };
}

function routeSelectionKey(path, index = 0) {
  const rawKey = path?.route_id || path?.id || path?.layer_id || path?.name || `hyperspace-route-${index + 1}`;
  return `route:${normalizeNameKey(rawKey)}`;
}

function uniqueRoutePlanetNames(values) {
  const seen = new Set();
  const names = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const name = String(value || "").trim();
    if (!name) return;
    const key = normalizeNameKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
}

function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function sampleVectorPathPolyline(path, subdivisions = 8) {
  const points = Array.isArray(path?.points) ? path.points : [];
  if (points.length < 2) return [];

  const samples = [];
  const segmentCount = path?.closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const anchor = normalizePoint01(current?.anchor);
    const outPoint = normalizePoint01(current?.out) || anchor;
    const inPoint = normalizePoint01(next?.in) || normalizePoint01(next?.anchor);
    const nextAnchor = normalizePoint01(next?.anchor);
    if (!anchor || !outPoint || !inPoint || !nextAnchor) continue;

    if (!samples.length) {
      samples.push(anchor);
    }
    for (let step = 1; step <= subdivisions; step += 1) {
      samples.push(cubicBezierPoint(anchor, outPoint, inPoint, nextAnchor, step / subdivisions));
    }
  }

  return samples;
}

function vectorPathImageSamples(path) {
  if (!state.imageWidth || !state.imageHeight) return [];
  return sampleVectorPathPolyline(path).map((point) => ({
    x: point.x * state.imageWidth,
    y: point.y * state.imageHeight,
  }));
}

function nearestPointOnPolyline(samples, targetX, targetY) {
  if (!Array.isArray(samples) || samples.length < 2) return null;
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1];
    const end = samples[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? clamp(((targetX - start.x) * dx + (targetY - start.y) * dy) / lengthSq, 0, 1) : 0;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    const distanceSq = (targetX - x) ** 2 + (targetY - y) ** 2;
    if (distanceSq >= bestDistanceSq) continue;
    bestDistanceSq = distanceSq;
    best = {
      x,
      y,
      tangentX: dx,
      tangentY: dy,
    };
  }

  return best;
}

function routeSampleBounds(samples) {
  if (!samples.length) return null;
  return samples.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    {
      left: samples[0].x,
      top: samples[0].y,
      right: samples[0].x,
      bottom: samples[0].y,
    }
  );
}

function routeAnchorPoint(path, samples = []) {
  const labelAnchor = normalizePoint01(path?.label_anchor);
  if (labelAnchor) return labelAnchor;
  const anchors = Array.isArray(path?.points)
    ? path.points.map((point) => normalizePoint01(point?.anchor)).filter(Boolean)
    : [];
  if (anchors.length) {
    const mid = anchors[Math.floor(anchors.length / 2)];
    if (mid) return mid;
  }
  if (samples.length) {
    return samples[Math.floor(samples.length / 2)] || samples[0];
  }
  return { x: 0.5, y: 0.5 };
}

function routePlanetNamesFromPath(path) {
  return uniqueRoutePlanetNames(
    path?.route_planets?.length ? path.route_planets : (path?.points || []).map((point) => point?.planet_name)
  );
}

function isSelectableSideRoutePath(path) {
  if (!path || typeof path !== "object") return false;
  if (String(path?.path_kind || "").trim() === "hyperspace-route") return false;
  const hasEnoughGeometry = Array.isArray(path?.points) && path.points.length >= 2;
  if (!hasEnoughGeometry) return false;

  const travelKind = String(path?.travel_kind || "").trim();
  if (travelKind === "hyperspace-side-route") return true;
  if (normalizeNameKey(path?.layer_group_id) === HYPERSPACE_LAYER_GROUP_ID) return true;
  return (
    normalizeNameKey(path?.name) === LEGACY_SIDE_ROUTE_NAME &&
    routePlanetNamesFromPath(path).length > 0
  );
}

function selectableSideRoutePath(path, index) {
  if (!isSelectableSideRoutePath(path)) return null;
  const planetNames = routePlanetNamesFromPath(path);
  const derivedName =
    String(path?.name || "").trim() && normalizeNameKey(path?.name) !== LEGACY_SIDE_ROUTE_NAME
      ? String(path.name)
      : planetNames.length >= 2
        ? `${planetNames[0]} -> ${planetNames[planetNames.length - 1]}`
        : planetNames[0] || `Nebenroute ${path?.id || path?.layer_id || index + 1}`;
  return {
    ...path,
    name: derivedName,
    route_id: String(path?.route_id || path?.id || path?.layer_id || `side-route-${index + 1}`),
    route_planets: planetNames,
  };
}

function buildHyperspaceRouteItem(path, index) {
  const planetNames = routePlanetNamesFromPath(path);
  const routeSamples = sampleVectorPathPolyline(path);
  const anchor = routeAnchorPoint(path, routeSamples);
  const routePlanetCount = planetNames.length;
  return {
    kind: "route",
    name: String(path?.name || `Hyperraumroute ${index + 1}`),
    nameKey: routeSelectionKey(path, index),
    route_id: String(path?.route_id || path?.id || path?.layer_id || `hyperspace-route-${index + 1}`),
    route_planets: planetNames,
    route_planet_count: routePlanetCount,
    route_samples: routeSamples,
    route_bounds: routeSampleBounds(routeSamples),
    source_url: String(path?.source_url || ""),
    region: "Hyperraumroute",
    desc: routePlanetCount
      ? `Beinhaltet ${routePlanetCount} ${routePlanetCount === 1 ? "Planet" : "Planeten"} entlang dieser Hyperraumroute.`
      : "Keine Planetenliste fuer diese Hyperraumroute hinterlegt.",
    x: anchor.x,
    y: anchor.y,
    grid: guessGridFromPoint(anchor.x, anchor.y),
    vector_path: path,
  };
}

function buildSelectableRouteItems() {
  const items = [];
  const seenRouteIds = new Set();

  const addRoute = (path, index) => {
    if (!path) return;
    const item = buildHyperspaceRouteItem(path, index);
    const routeId = String(item?.route_id || "").trim();
    if (!routeId || seenRouteIds.has(routeId)) return;
    seenRouteIds.add(routeId);
    items.push(item);
  };

  state.vectorPaths.forEach((path, index) => {
    if (String(path?.path_kind || "").trim() !== "hyperspace-route") return;
    addRoute(path, index);
  });

  const baseOffset = state.vectorPaths.length;
  (Array.isArray(state.baseVectorPaths) ? state.baseVectorPaths : []).forEach((path, index) => {
    addRoute(selectableSideRoutePath(path, baseOffset + index), baseOffset + index);
  });

  return items;
}

function alphaIndexLabel(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let value = Math.max(0, Number(index) || 0);
  let label = "";
  while (true) {
    label = alphabet[value % 26] + label;
    value = Math.floor(value / 26) - 1;
    if (value < 0) return label;
  }
}

function gridLineLabel(axis, index) {
  if (axis === "vertical") {
    if (index >= 0 && index < GRID_LETTERS.length) return GRID_LETTERS[index];
    return alphaIndexLabel(index);
  }
  return `${index + 1}`;
}

function primaryLineGridGuide() {
  return state.gridGuides.find((guide) => String(guide?.kind) === "line-grid") || null;
}

function knownGridSamples() {
  const samples = [];
  state.knownByKey.forEach((item) => {
    const parsed = parseGridLabel(item.grid);
    if (!parsed) return;
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
    if (item.x < 0 || item.x > 1 || item.y < 0 || item.y > 1) return;
    samples.push({ col: parsed.col, row: parsed.row, x: item.x * state.imageWidth, y: item.y * state.imageHeight });
  });
  return samples;
}

function buildGuideAxisStarts(guide, axis) {
  if (!guide || !state.imageWidth || !state.imageHeight) return [];
  const isVertical = axis === "x";
  const sourceLine = isVertical ? guide.vertical_line || {} : guide.horizontal_line || {};
  const baseStart = Number((sourceLine.start_px || [0, 0])[isVertical ? 0 : 1] || 0);
  const spacing = Number(guide[isVertical ? "spacing_x_px" : "spacing_y_px"] || 0);
  const copies = Number(guide[isVertical ? "copies_x" : "copies_y"] || 0);
  const starts = [];
  for (let index = 0; index <= copies; index += 1) {
    const value = baseStart + index * spacing;
    const imagePoint = isVertical ? guidePxToImage(value, 0) : guidePxToImage(0, value);
    starts.push(isVertical ? imagePoint.x : imagePoint.y);
  }
  return starts;
}

function scoreGridAxisOffset(axisStarts, spacing, sampleAxisKey, sampleIndexKey, offset) {
  const samples = knownGridSamples();
  if (!samples.length || !spacing) return 0;
  let hits = 0;
  samples.forEach((sample) => {
    const index = sample[sampleIndexKey] - offset;
    const start = axisStarts[0] + index * spacing;
    const end = start + spacing;
    if (sample[sampleAxisKey] >= start && sample[sampleAxisKey] < end) {
      hits += 1;
    }
  });
  return hits;
}

function bestGridAxisOffset(axisStarts, spacing, sampleAxisKey, sampleIndexKey) {
  let bestOffset = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let offset = -3; offset <= 3; offset += 1) {
    const score = scoreGridAxisOffset(axisStarts, spacing, sampleAxisKey, sampleIndexKey, offset);
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return bestOffset;
}

function calibratedGridGeometry() {
  if (state.gridCalibration) return state.gridCalibration;
  const guide = primaryLineGridGuide();
  if (!guide || !state.imageWidth || !state.imageHeight) return null;
  const xStarts = buildGuideAxisStarts(guide, "x");
  const yStarts = buildGuideAxisStarts(guide, "y");
  if (!xStarts.length || !yStarts.length) return null;
  const spacingX = (Number(guide.spacing_x_px || 0) / CALIBRATION_BASE_WIDTH) * state.imageWidth;
  const spacingY = (Number(guide.spacing_y_px || 0) / CALIBRATION_BASE_HEIGHT) * state.imageHeight;
  if (!spacingX || !spacingY) return null;
  state.gridCalibration = {
    xStarts,
    yStarts,
    spacingX,
    spacingY,
    colOffset: bestGridAxisOffset(xStarts, spacingX, "x", "col"),
    rowOffset: bestGridAxisOffset(yStarts, spacingY, "y", "row"),
  };
  return state.gridCalibration;
}

function calibratedAxisBoundary(starts, spacing, index) {
  if (!starts.length) return 0;
  return starts[0] + index * spacing;
}

function calibratedCellSizePx() {
  const geometry = calibratedGridGeometry();
  if (!geometry) return null;
  return { width: geometry.spacingX, height: geometry.spacingY };
}

function guessGridFromPoint(x, y) {
  const geometry = calibratedGridGeometry();
  if (geometry && state.imageWidth && state.imageHeight) {
    const px = Number(x || 0) * state.imageWidth;
    const py = Number(y || 0) * state.imageHeight;
    const col = clamp(
      Math.floor((px - geometry.xStarts[0]) / geometry.spacingX) + geometry.colOffset,
      0,
      GRID_LETTERS.length - 1
    );
    const row = clamp(
      Math.floor((py - geometry.yStarts[0]) / geometry.spacingY) + geometry.rowOffset,
      0,
      GRID_ROWS - 1
    );
    return `${GRID_LETTERS[col]}-${row + 1}`;
  }
  const col = Math.min(GRID_LETTERS.length - 1, Math.max(0, Math.floor(x * GRID_LETTERS.length)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y * GRID_ROWS)));
  return `${GRID_LETTERS[col]}-${row + 1}`;
}

function gridNeighbors(grid, radius = 1) {
  const parsed = parseGridLabel(grid);
  if (!parsed) return [];
  const labels = [];
  for (let row = Math.max(0, parsed.row - radius); row <= Math.min(GRID_ROWS - 1, parsed.row + radius); row += 1) {
    for (let col = Math.max(0, parsed.col - radius); col <= Math.min(GRID_LETTERS.length - 1, parsed.col + radius); col += 1) {
      labels.push(`${GRID_LETTERS[col]}-${row + 1}`);
    }
  }
  return labels;
}

function gridBoundsPx(grid) {
  const parsed = parseGridLabel(grid);
  if (!parsed || !state.imageWidth || !state.imageHeight) return null;
  const geometry = calibratedGridGeometry();
  if (geometry) {
    const startColIndex = parsed.col - geometry.colOffset;
    const startRowIndex = parsed.row - geometry.rowOffset;
    const left = calibratedAxisBoundary(geometry.xStarts, geometry.spacingX, startColIndex);
    const right = calibratedAxisBoundary(geometry.xStarts, geometry.spacingX, startColIndex + 1);
    const top = calibratedAxisBoundary(geometry.yStarts, geometry.spacingY, startRowIndex);
    const bottom = calibratedAxisBoundary(geometry.yStarts, geometry.spacingY, startRowIndex + 1);
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
      right,
      bottom,
    };
  }
  const cellW = state.imageWidth / GRID_LETTERS.length;
  const cellH = state.imageHeight / GRID_ROWS;
  return {
    left: parsed.col * cellW,
    top: parsed.row * cellH,
    width: cellW,
    height: cellH,
    right: (parsed.col + 1) * cellW,
    bottom: (parsed.row + 1) * cellH,
  };
}

function formatCoord(value) {
  return Number(value || 0).toFixed(4);
}

function setStatus(text) {
  if (statusBar) {
    statusBar.textContent = text;
  }
}

function scheduleBackgroundTask(task, options = {}) {
  const delay = Math.max(0, Number(options.delay) || 0);
  const timeout = Math.max(400, Number(options.timeout) || 1200);
  return new Promise((resolve, reject) => {
    const runTask = () => {
      Promise.resolve()
        .then(task)
        .then(resolve)
        .catch(reject);
    };
    const queueTask = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => runTask(), { timeout });
        return;
      }
      window.setTimeout(runTask, Math.min(160, timeout));
    };
    if (delay > 0) {
      window.setTimeout(queueTask, delay);
      return;
    }
    queueTask();
  });
}

function loadThreeModuleIfNeeded() {
  if (typeof THREE !== "undefined") {
    return Promise.resolve(window.THREE || THREE);
  }
  if (typeof window.loadThreeModule === "function") {
    return window.loadThreeModule();
  }
  if (window.__threeLoadPromise) {
    return window.__threeLoadPromise;
  }
  return Promise.reject(new Error("Three.js loader unavailable"));
}

function landingIntroPromptVerb() {
  return state.isMobileView ? "wischen" : "scrollen";
}

function renderLandingIntroCopy() {
  if (!landingIntroEl) return;
  if (landingPromptVerb) {
    landingPromptVerb.textContent = landingIntroPromptVerb();
  }
  if (landingPromptHint) {
    landingPromptHint.textContent = state.intro.dataReady
      ? "um die Sternenkarte freizulegen"
      : "Galaxie wird vorbereitet";
  }
}

function setLandingIntroProgress(progress) {
  const next = clamp(Number(progress) || 0, 0, 1);
  state.intro.progress = next;
  document.body.style.setProperty("--intro-progress", next.toFixed(4));
}

function landingIntroCanComplete(now = performance.now()) {
  if (!state.intro.dataReady) return false;
  const startedAt = Number(state.intro.startedAt) || 0;
  const readyAt = Number(state.intro.readyAt) || 0;
  return (
    now - startedAt >= LANDING_INTRO_MIN_ACTIVE_MS &&
    (!readyAt || now - readyAt >= LANDING_INTRO_READY_HOLD_MS)
  );
}

function rebuildLandingStars() {
  if (!landingStarfieldCanvas) return;
  const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
  const starCount = state.isMobileView ? LANDING_STARFIELD_DENSITY.mobile : LANDING_STARFIELD_DENSITY.desktop;
  state.intro.canvasWidth = width;
  state.intro.canvasHeight = height;
  state.intro.pixelRatio = pixelRatio;
  landingStarfieldCanvas.width = Math.floor(width * pixelRatio);
  landingStarfieldCanvas.height = Math.floor(height * pixelRatio);
  state.intro.stars = Array.from({ length: starCount }, () => {
    const bright = Math.random();
    return {
      x: Math.random(),
      y: Math.random(),
      radius: bright > 0.965 ? 1.55 + Math.random() * 1.35 : 0.24 + Math.random() * 1.08,
      alpha: bright > 0.93 ? 0.72 + Math.random() * 0.22 : 0.16 + Math.random() * 0.5,
      speed: 0.42 + Math.random() * 1.45,
      phase: Math.random() * Math.PI * 2,
      depth: 0.35 + Math.random() * 1.45,
      drift: (Math.random() - 0.5) * 0.09,
    };
  });
}

function drawLandingStarfield(now) {
  if (!landingStarfieldCanvas) return;
  const width = state.intro.canvasWidth;
  const height = state.intro.canvasHeight;
  const pixelRatio = state.intro.pixelRatio || 1;
  if (!width || !height) return;
  const context = landingStarfieldCanvas.getContext("2d");
  if (!context) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, landingStarfieldCanvas.width, landingStarfieldCanvas.height);
  context.scale(pixelRatio, pixelRatio);

  const background = context.createRadialGradient(width * 0.5, height * 0.32, 0, width * 0.5, height * 0.5, width * 0.76);
  background.addColorStop(0, "rgba(13, 24, 40, 0.55)");
  background.addColorStop(0.45, "rgba(5, 10, 18, 0.22)");
  background.addColorStop(1, "rgba(1, 3, 8, 0)");
  context.fillStyle = "#02050c";
  context.fillRect(0, 0, width, height);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const driftX = state.intro.progress * width * -0.05;
  const driftY = state.intro.progress * height * -0.11;
  for (const star of state.intro.stars) {
    const pulse = 0.55 + 0.45 * Math.sin(now * 0.0007 * star.speed + star.phase);
    const alpha = clamp(star.alpha * pulse, 0.06, 1);
    const x = ((star.x * width + driftX * star.depth + Math.sin(now * 0.00009 + star.phase) * width * star.drift) % width + width) % width;
    const y = ((star.y * height + driftY * star.depth) % height + height) % height;
    const radius = star.radius * (state.isMobileView ? 0.82 : 1);

    context.beginPath();
    context.fillStyle = `rgba(245, 249, 255, ${alpha.toFixed(3)})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (radius >= 1.35) {
      context.fillStyle = `rgba(208, 227, 255, ${(alpha * 0.24).toFixed(3)})`;
      context.fillRect(x - radius * 3.8, y - 0.45, radius * 7.6, 0.9);
      context.fillRect(x - 0.45, y - radius * 3.8, 0.9, radius * 7.6);
    }
  }
}

function tickLandingIntro(now) {
  state.intro.animationFrame = 0;
  if (!landingIntroEl || landingIntroEl.classList.contains("hidden")) return;

  const canComplete = landingIntroCanComplete(now);
  const targetLimit = state.intro.dataReady
    ? canComplete
      ? 1
      : LANDING_INTRO_READY_PROGRESS_LOCK
    : LANDING_INTRO_PROGRESS_LOCK;
  const target = clamp(state.intro.targetProgress, 0, targetLimit);
  const deltaTime = state.intro.lastTime ? Math.min(48, now - state.intro.lastTime) : 16;
  state.intro.lastTime = now;

  if (state.intro.active) {
    const smoothing = clamp(0.12 + deltaTime / 280, 0.12, 0.28);
    const nextProgress = state.intro.progress + (target - state.intro.progress) * smoothing;
    if (Math.abs(nextProgress - state.intro.progress) > 0.0002) {
      setLandingIntroProgress(nextProgress);
    }
    if (canComplete && state.intro.targetProgress >= LANDING_INTRO_COMPLETE_PROGRESS && nextProgress >= 0.992) {
      completeLandingIntro();
    }
  }

  drawLandingStarfield(now);
  state.intro.animationFrame = window.requestAnimationFrame(tickLandingIntro);
}

function startLandingIntroLoop() {
  if (!landingIntroEl || state.intro.animationFrame) return;
  state.intro.lastTime = 0;
  state.intro.animationFrame = window.requestAnimationFrame(tickLandingIntro);
}

function stopLandingIntroLoop() {
  if (!state.intro.animationFrame) return;
  window.cancelAnimationFrame(state.intro.animationFrame);
  state.intro.animationFrame = 0;
}

function initLandingIntro() {
  if (!landingIntroEl) return;
  const bootstrapProgress = clamp(Number(window.__landingIntroBootstrap?.progress) || 0, 0, 0.985);
  if (typeof window.__landingIntroBootstrap?.detach === "function") {
    window.__landingIntroBootstrap.detach();
  }
  document.body.classList.add("intro-active");
  document.body.classList.remove("intro-complete");
  landingIntroEl.classList.remove("hidden");
  landingIntroEl.setAttribute("aria-hidden", "false");
  state.intro.active = true;
  state.intro.progress = bootstrapProgress;
  state.intro.targetProgress = bootstrapProgress;
  state.intro.lastTime = 0;
  state.intro.dataReady = false;
  state.intro.startedAt = performance.now();
  state.intro.readyAt = 0;
  state.intro.touchLastY = 0;
  if (state.intro.completeTimer) {
    window.clearTimeout(state.intro.completeTimer);
    state.intro.completeTimer = 0;
  }
  renderLandingIntroCopy();
  setLandingIntroProgress(bootstrapProgress);
  rebuildLandingStars();
  startLandingIntroLoop();
}

function nudgeLandingIntro(delta) {
  if (!state.intro.active) return;
  const change = Number(delta) || 0;
  if (!change) return;
  state.intro.targetProgress = clamp(state.intro.targetProgress + change, 0, 1.08);
  startLandingIntroLoop();
}

function markLandingIntroReady() {
  state.intro.dataReady = true;
  if (!state.intro.readyAt) {
    state.intro.readyAt = performance.now();
  }
  renderLandingIntroCopy();
  if (state.intro.targetProgress >= LANDING_INTRO_COMPLETE_PROGRESS) {
    startLandingIntroLoop();
  }
}

function completeLandingIntro() {
  if (!landingIntroEl || !state.intro.active) return;
  state.intro.active = false;
  state.intro.targetProgress = 1;
  setLandingIntroProgress(1);
  document.body.classList.remove("intro-active");
  document.body.classList.add("intro-complete");
  landingIntroEl.setAttribute("aria-hidden", "true");
  if (state.intro.completeTimer) {
    window.clearTimeout(state.intro.completeTimer);
  }
  state.intro.completeTimer = window.setTimeout(() => {
    landingIntroEl.classList.add("hidden");
    stopLandingIntroLoop();
    state.intro.completeTimer = 0;
  }, 680);
}

function waitMs(duration) {
  const delay = Math.max(0, Number(duration) || 0);
  if (!delay) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function setThreeTransitionProgress(progress) {
  const next = clamp(Number(progress) || 0, 0, 1);
  state.threeTransition.progress = next;
  viewerFrameEl?.style.setProperty("--three-transition-progress", next.toFixed(4));
}

function rebuildThreeTransitionStars() {
  if (!threeTransitionStarfieldCanvas) return;
  const width = Math.max(1, viewerFrameEl?.clientWidth || window.innerWidth || 1);
  const height = Math.max(1, viewerFrameEl?.clientHeight || window.innerHeight || 1);
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
  const starCount = state.isMobileView ? THREE_VIEW_TRANSITION_STARFIELD_DENSITY.mobile : THREE_VIEW_TRANSITION_STARFIELD_DENSITY.desktop;
  state.threeTransition.canvasWidth = width;
  state.threeTransition.canvasHeight = height;
  state.threeTransition.pixelRatio = pixelRatio;
  threeTransitionStarfieldCanvas.width = Math.floor(width * pixelRatio);
  threeTransitionStarfieldCanvas.height = Math.floor(height * pixelRatio);
  state.threeTransition.stars = Array.from({ length: starCount }, () => {
    const bright = Math.random();
    return {
      x: Math.random(),
      y: Math.random(),
      radius: bright > 0.962 ? 1.35 + Math.random() * 1.45 : 0.26 + Math.random() * 1.08,
      alpha: bright > 0.92 ? 0.68 + Math.random() * 0.24 : 0.14 + Math.random() * 0.46,
      speed: 0.4 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.12,
      depth: 0.42 + Math.random() * 1.4,
    };
  });
}

function drawThreeTransitionStarfield(now) {
  if (!threeTransitionStarfieldCanvas || !state.threeTransition.visible) return;
  const width = state.threeTransition.canvasWidth;
  const height = state.threeTransition.canvasHeight;
  const pixelRatio = state.threeTransition.pixelRatio || 1;
  if (!width || !height) return;
  const context = threeTransitionStarfieldCanvas.getContext("2d");
  if (!context) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, threeTransitionStarfieldCanvas.width, threeTransitionStarfieldCanvas.height);
  context.scale(pixelRatio, pixelRatio);

  const progress = state.threeTransition.progress;
  const background = context.createLinearGradient(0, 0, width, 0);
  background.addColorStop(0, "rgba(1, 4, 10, 0)");
  background.addColorStop(0.3, "rgba(2, 7, 14, 0.18)");
  background.addColorStop(0.68, "rgba(2, 6, 12, 0.78)");
  background.addColorStop(1, "rgba(1, 3, 8, 0.96)");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const driftX = progress * width * 0.1;
  const driftY = progress * height * -0.06;
  const streak = 1 + progress * 6.4;
  for (const star of state.threeTransition.stars) {
    const pulse = 0.52 + 0.48 * Math.sin(now * 0.0008 * star.speed + star.phase);
    const alpha = clamp(star.alpha * pulse, 0.05, 1);
    const x = ((star.x * width + driftX * star.depth + Math.sin(now * 0.00012 + star.phase) * width * star.drift) % width + width) % width;
    const y = ((star.y * height + driftY * star.depth) % height + height) % height;
    const radius = star.radius * (state.isMobileView ? 0.82 : 1);

    context.beginPath();
    context.fillStyle = `rgba(240, 247, 255, ${alpha.toFixed(3)})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (radius >= 1.15) {
      context.fillStyle = `rgba(186, 219, 255, ${(alpha * 0.22).toFixed(3)})`;
      context.fillRect(x - radius * streak * 1.2, y - 0.45, radius * streak * 2.4, 0.9);
    }
  }
}

function threeTransitionBaseProgress(now = performance.now()) {
  const startedAt = Number(state.threeTransition.startedAt) || now;
  const elapsed = Math.max(0, now - startedAt);
  const minPhase = clamp01(elapsed / THREE_VIEW_TRANSITION_MIN_MS);
  const eased = 1 - Math.pow(1 - minPhase, 2.3);
  const waitingTail = Math.min(Math.max(0, elapsed - THREE_VIEW_TRANSITION_MIN_MS) / 7000, 0.04);
  return clamp(eased * THREE_VIEW_TRANSITION_PROGRESS_LOCK + waitingTail, 0, 0.985);
}

function startThreeTransitionLoop() {
  if (!state.threeTransition.visible || state.threeTransition.animationFrame) return;
  const tick = (now) => {
    state.threeTransition.animationFrame = 0;
    if (!state.threeTransition.visible) return;
    const baseTarget = threeTransitionBaseProgress(now);
    const finishStartAt = Math.max(
      Number(state.threeTransition.readyAt) || 0,
      (Number(state.threeTransition.startedAt) || now) + THREE_VIEW_TRANSITION_MIN_MS
    );
    const finishFactor =
      state.threeTransition.readyAt && now >= finishStartAt
        ? clamp01((now - finishStartAt) / THREE_VIEW_TRANSITION_READY_HOLD_MS)
        : 0;
    const finishEased = finishFactor > 0 ? 1 - Math.pow(1 - finishFactor, 2.1) : 0;
    const target = state.threeTransition.readyAt ? clamp(baseTarget + (1 - baseTarget) * finishEased, 0, 1) : baseTarget;
    const nextProgress =
      state.threeTransition.progress + (target - state.threeTransition.progress) * (state.threeTransition.readyAt ? 0.14 : 0.08);
    if (Math.abs(nextProgress - state.threeTransition.progress) > 0.0002) {
      setThreeTransitionProgress(nextProgress);
    }
    drawThreeTransitionStarfield(now);
    state.threeTransition.animationFrame = window.requestAnimationFrame(tick);
  };
  state.threeTransition.animationFrame = window.requestAnimationFrame(tick);
}

function stopThreeTransitionLoop() {
  if (!state.threeTransition.animationFrame) return;
  window.cancelAnimationFrame(state.threeTransition.animationFrame);
  state.threeTransition.animationFrame = 0;
}

function clearThreeTransitionSceneDataTimer() {
  if (!state.threeTransition.sceneDataTimer) return;
  window.clearTimeout(state.threeTransition.sceneDataTimer);
  state.threeTransition.sceneDataTimer = 0;
}

function scheduleThreeTransitionSceneDataCommit() {
  clearThreeTransitionSceneDataTimer();
  state.threeTransition.sceneDataTimer = window.setTimeout(() => {
    state.threeTransition.sceneDataTimer = 0;
    if (state.viewMode !== "3d") {
      state.threeTransition.deferSceneData = false;
      return;
    }
    state.threeTransition.deferSceneData = false;
    rebuildThreeSceneData(true);
    syncThreeInteractionState(true);
    renderAll();
    startThreeAnimation();
    setStatus("3D-Karte bereit. Ziehen dreht die Galaxie, Mausrad zoomt zur Mausposition.");
  }, 70);
}

function finalizeThreeTransitionVisibility() {
  state.threeTransition.visible = false;
  state.threeTransition.readyAt = 0;
  state.threeTransition.completeTimer = 0;
  setThreeTransitionProgress(0);
  stopThreeTransitionLoop();
  renderViewMode();
}

function completeThreeViewTransition(success = true) {
  if (state.threeTransition.completeTimer) {
    window.clearTimeout(state.threeTransition.completeTimer);
    state.threeTransition.completeTimer = 0;
  }

  state.threeTransition.active = false;
  stopThreeTransitionLoop();
  setThreeTransitionProgress(success ? 1 : 0);
  renderViewMode();

  if (!success) {
    state.viewMode = "2d";
    state.threeTransition.deferSceneData = false;
    clearThreeTransitionSceneDataTimer();
    stopThreeAnimation();
    renderAll();
    persistSession();
    finalizeThreeTransitionVisibility();
    return;
  }

  renderAll();
  persistSession();
  scheduleThreeTransitionSceneDataCommit();
  state.threeTransition.completeTimer = window.setTimeout(finalizeThreeTransitionVisibility, THREE_VIEW_TRANSITION_FADE_MS);
}

async function beginThreeViewTransition() {
  if (state.threeTransition.promise) return state.threeTransition.promise;
  if (state.viewMode === "3d" && !state.threeTransition.active) {
    renderViewMode();
    return true;
  }

  state.viewMode = "3d";
  state.threeTransition.active = true;
  state.threeTransition.visible = true;
  state.threeTransition.deferSceneData = true;
  state.threeTransition.startedAt = performance.now();
  state.threeTransition.readyAt = 0;
  clearThreeTransitionSceneDataTimer();
  if (state.threeTransition.completeTimer) {
    window.clearTimeout(state.threeTransition.completeTimer);
    state.threeTransition.completeTimer = 0;
  }
  rebuildThreeTransitionStars();
  setThreeTransitionProgress(0);
  startThreeTransitionLoop();
  renderAll();
  setStatus("3D-Raum wird geladen...");

  state.threeTransition.promise = (async () => {
    try {
      await waitMs(360);
      await loadThreeModuleIfNeeded();
      if (!ensureThreeScene()) {
        throw new Error("Three scene unavailable");
      }
      resizeThreeRenderer();
      const focusTarget = primarySelectedItem();
      if (focusTarget) {
        focusThreeOnItem(focusTarget, true);
      } else {
        focusThreeOnGrid(state.currentGrid, true);
      }
      startThreeAnimation();
      state.threeTransition.readyAt = performance.now();

      const elapsed = performance.now() - state.threeTransition.startedAt;
      if (elapsed < THREE_VIEW_TRANSITION_MIN_MS) {
        await waitMs(THREE_VIEW_TRANSITION_MIN_MS - elapsed);
      }
      const readyElapsed = performance.now() - state.threeTransition.readyAt;
      if (readyElapsed < THREE_VIEW_TRANSITION_READY_HOLD_MS) {
        await waitMs(THREE_VIEW_TRANSITION_READY_HOLD_MS - readyElapsed);
      }
      setStatus("3D-Karte bereit. Ziehen dreht die Galaxie, Mausrad zoomt zur Mausposition.");
      completeThreeViewTransition(true);
      return true;
    } catch (_error) {
      setStatus("Three.js konnte nicht geladen werden.");
      completeThreeViewTransition(false);
      return false;
    } finally {
      state.threeTransition.promise = null;
    }
  })();

  return state.threeTransition.promise;
}

function panelBodyByName(name) {
  return document.getElementById(`${name}PanelBody`);
}

function applyPanelExpanded(name, expanded) {
  const nextExpanded = Boolean(expanded);
  state.panelExpanded[name] = nextExpanded;

  const toggle = document.querySelector(`[data-panel-toggle="${name}"]`);
  if (toggle) {
    toggle.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
  }

  const body = panelBodyByName(name);
  if (body) {
    body.hidden = !nextExpanded;
  }

  const card = toggle?.closest(".collapsible-card") || body?.closest(".collapsible-card");
  if (card) {
    card.classList.toggle("is-collapsed", !nextExpanded);
  }
}

function togglePanelExpanded(name) {
  applyPanelExpanded(name, !state.panelExpanded[name]);
  persistSession();
}

function desktopWindowEntry(key) {
  return desktopWindowEntries().find((entry) => entry.key === key) || null;
}

function isDesktopWindowVisible(key) {
  if (key === "viewerHead") return true;
  return !state.isMobileView && state.desktopWindowVisibility[key] === true;
}

function isDesktopWindowMaximized(key) {
  return !state.isMobileView && state.desktopWindowMaximized[key] === true;
}

function renderDesktopWindowVisibility() {
  const desktopMode = !state.isMobileView;
  document.body.classList.toggle("desktop-launcher-mode", desktopMode);

  DESKTOP_TOGGLABLE_WINDOW_KEYS.forEach((key) => {
    const entry = desktopWindowEntry(key);
    if (entry?.element) {
      const isOpen = desktopMode && state.desktopWindowVisibility[key] === true;
      const isMaximized = isOpen && state.desktopWindowMaximized[key] === true;
      entry.element.classList.toggle("is-open", isOpen);
      entry.element.classList.toggle("is-maximized", isMaximized);
      entry.element.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  });

  desktopWindowOpenButtons.forEach((button) => {
    const key = String(button.dataset.windowOpen || "").trim();
    const active = desktopMode && state.desktopWindowVisibility[key] === true;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  desktopWindowMaximizeButtons.forEach((button) => {
    const key = String(button.dataset.windowMaximize || "").trim();
    const active = desktopMode && state.desktopWindowMaximized[key] === true;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.setAttribute("aria-label", active ? "Fenster wiederherstellen" : "Fenster maximieren");
    button.title = active ? "Wiederherstellen" : "Maximieren";
  });
}

function setDesktopWindowVisible(key, visible, persist = true) {
  if (!(key in state.desktopWindowVisibility)) return;
  state.desktopWindowVisibility[key] = Boolean(visible);
  renderDesktopWindowVisibility();
  if (state.desktopWindowVisibility[key]) {
    bringDesktopWindowToFront(key);
    applyDesktopWindowLayout(false);
    if (key === "news") {
      markNewsItemsRead();
      renderNewsPanel();
    }
  }
  if (persist) {
    persistSession();
  }
}

function setDesktopWindowMaximized(key, maximized, persist = true) {
  if (!(key in state.desktopWindowMaximized) || state.isMobileView) return;
  state.desktopWindowMaximized[key] = Boolean(maximized);
  if (state.desktopWindowMaximized[key]) {
    state.desktopWindowVisibility[key] = true;
    bringDesktopWindowToFront(key);
  }
  renderDesktopWindowVisibility();
  applyDesktopWindowLayout(false);
  if (persist) {
    persistSession();
  }
}

function applyDesktopWindowSize(key) {
  const entry = desktopWindowEntry(key);
  if (!entry?.element || !DESKTOP_TOGGLABLE_WINDOW_KEYS.includes(key)) return;
  if (state.isMobileView) {
    entry.element.style.width = "";
    entry.element.style.height = "";
    return;
  }
  const size = sanitizeDesktopWindowSize(state.desktopWindowSizes[key]);
  state.desktopWindowSizes[key] = size;
  if (size.width > 0) {
    entry.element.style.width = `${size.width}px`;
  }
  if (size.height > 0) {
    entry.element.style.height = `${size.height}px`;
  }
}

function applyDesktopWindowOffset(key) {
  const entry = desktopWindowEntry(key);
  if (!entry?.element) return;
  if (state.isMobileView) {
    entry.element.style.translate = "";
    entry.element.style.zIndex = "";
    entry.element.classList.remove("is-window-dragging");
    return;
  }
  if (isDesktopWindowMaximized(key)) {
    entry.element.style.translate = "";
    return;
  }
  const offset = sanitizeDesktopWindowOffset(state.desktopWindowOffsets[key]);
  state.desktopWindowOffsets[key] = offset;
  entry.element.style.translate = `${offset.x}px ${offset.y}px`;
}

function clampDesktopWindowOffset(key, margin = DESKTOP_WINDOW_MARGIN) {
  const entry = desktopWindowEntry(key);
  if (!entry?.element || state.isMobileView || isDesktopWindowMaximized(key)) return;
  let offset = sanitizeDesktopWindowOffset(state.desktopWindowOffsets[key]);
  entry.element.style.translate = `${offset.x}px ${offset.y}px`;
  const rect = entry.element.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  if (rect.left < margin) {
    offset.x += Math.round(margin - rect.left);
  }
  if (rect.top < margin) {
    offset.y += Math.round(margin - rect.top);
  }
  if (rect.right > window.innerWidth - margin) {
    offset.x -= Math.round(rect.right - (window.innerWidth - margin));
  }
  if (rect.bottom > window.innerHeight - margin) {
    offset.y -= Math.round(rect.bottom - (window.innerHeight - margin));
  }

  state.desktopWindowOffsets[key] = offset;
  entry.element.style.translate = `${offset.x}px ${offset.y}px`;
}

function applyDesktopWindowLayout(persist = false) {
  desktopWindowEntries().forEach(({ key }) => {
    applyDesktopWindowSize(key);
    applyDesktopWindowOffset(key);
  });
  if (!state.isMobileView) {
    desktopWindowEntries()
      .filter(({ key }) => isDesktopWindowVisible(key))
      .forEach(({ key }) => clampDesktopWindowOffset(key));
  }
  if (persist) {
    persistSession();
  }
}

function bringDesktopWindowToFront(key) {
  const entry = desktopWindowEntry(key);
  if (!entry?.element || state.isMobileView) return;
  state.desktopWindowZIndex += 1;
  entry.element.style.zIndex = String(state.desktopWindowZIndex);
}

function startDesktopWindowDrag(key, pointerId, clientX, clientY) {
  if (state.isMobileView || isDesktopWindowMaximized(key)) return;
  const entry = desktopWindowEntry(key);
  if (!entry?.element) return;
  bringDesktopWindowToFront(key);
  const offset = sanitizeDesktopWindowOffset(state.desktopWindowOffsets[key]);
  state.desktopWindowDrag = {
    key,
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    startOffsetX: offset.x,
    startOffsetY: offset.y,
  };
  entry.element.classList.add("is-window-dragging");
  document.body.classList.add("desktop-window-dragging");
}

function updateDesktopWindowDrag(pointerId, clientX, clientY) {
  const drag = state.desktopWindowDrag;
  if (!drag || drag.pointerId !== pointerId) return;
  const nextOffset = {
    x: Math.round(drag.startOffsetX + (clientX - drag.startClientX)),
    y: Math.round(drag.startOffsetY + (clientY - drag.startClientY)),
  };
  state.desktopWindowOffsets[drag.key] = nextOffset;
  applyDesktopWindowOffset(drag.key);
  clampDesktopWindowOffset(drag.key);
}

function stopDesktopWindowDrag(pointerId = null, persist = true) {
  const drag = state.desktopWindowDrag;
  if (!drag || (pointerId != null && drag.pointerId !== pointerId)) return;
  const entry = desktopWindowEntry(drag.key);
  if (entry?.element) {
    entry.element.classList.remove("is-window-dragging");
  }
  state.desktopWindowDrag = null;
  document.body.classList.remove("desktop-window-dragging");
  if (persist) {
    persistSession();
  }
}

function bindDesktopWindowDrag() {
  document.querySelectorAll("[data-window-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (state.isMobileView) return;
      const key = String(handle.dataset.windowHandle || "").trim();
      if (!key) return;
      event.preventDefault();
      startDesktopWindowDrag(key, event.pointerId, event.clientX, event.clientY);
      handle.setPointerCapture?.(event.pointerId);
    });
  });

  window.addEventListener("pointermove", (event) => {
    updateDesktopWindowDrag(event.pointerId, event.clientX, event.clientY);
  });
  window.addEventListener("pointerup", (event) => {
    stopDesktopWindowDrag(event.pointerId, true);
  });
  window.addEventListener("pointercancel", (event) => {
    stopDesktopWindowDrag(event.pointerId, true);
  });
}

function scheduleDesktopWindowSizePersist() {
  if (state.desktopWindowSizePersistTimer) {
    window.clearTimeout(state.desktopWindowSizePersistTimer);
  }
  state.desktopWindowSizePersistTimer = window.setTimeout(() => {
    state.desktopWindowSizePersistTimer = 0;
    persistSession();
  }, 220);
}

function bindDesktopWindowResizePersistence() {
  if (typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver((entries) => {
    let changed = false;
    entries.forEach((entry) => {
      const key = String(entry.target?.dataset?.windowKey || "").trim();
      if (!DESKTOP_TOGGLABLE_WINDOW_KEYS.includes(key)) return;
      if (!isDesktopWindowVisible(key) || isDesktopWindowMaximized(key) || state.isMobileView) return;
      const rect = entry.target.getBoundingClientRect();
      const nextSize = sanitizeDesktopWindowSize({
        width: rect.width,
        height: rect.height,
      });
      if (nextSize.width < 240 || nextSize.height < 140) return;
      const currentSize = sanitizeDesktopWindowSize(state.desktopWindowSizes[key]);
      if (Math.abs(currentSize.width - nextSize.width) < 2 && Math.abs(currentSize.height - nextSize.height) < 2) {
        return;
      }
      state.desktopWindowSizes[key] = nextSize;
      changed = true;
    });
    if (changed) {
      scheduleDesktopWindowSizePersist();
    }
  });
  desktopWindowEntries()
    .filter(({ key }) => DESKTOP_TOGGLABLE_WINDOW_KEYS.includes(key))
    .forEach(({ element }) => observer.observe(element));
}

function hasPersistentPathLabel(path) {
  if (!path) return false;
  if (String(path?.path_kind || "").trim() === "hyperspace-route") return true;
  return ALWAYS_VISIBLE_PATH_LABELS.has(normalizeNameKey(path?.name));
}

function isMainHyperspaceRoutePath(path) {
  return String(path?.path_kind || "").trim() === "hyperspace-route";
}

function isSideHyperspaceRoutePath(path) {
  if (!path || isMainHyperspaceRoutePath(path)) return false;
  if (String(path?.travel_kind || "").trim() === "hyperspace-side-route") return true;
  if (normalizeNameKey(path?.layer_group_id) === HYPERSPACE_LAYER_GROUP_ID) return true;
  return normalizeNameKey(path?.name) === LEGACY_SIDE_ROUTE_NAME;
}

function invalidateStaticOverlay() {
  state.staticOverlayVersion += 1;
  state.lastStaticOverlayKey = "";
  state.lastCanvasOverlayKey = "";
  state.factionFragments = [];
  state.factionFragmentKey = "";
  state.factionItems = new Map();
  state.factionItemsKey = "";
  state.gridCalibration = null;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSvgId(value) {
  return String(value || "id").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function normalizeLayerKey(value) {
  return normalizeNameKey(value);
}

function layerStrokeColor(value) {
  if (value && typeof value === "object") {
    if (isMainHyperspaceRoutePath(value)) return "#c3cbd4";
    if (value.stroke_tone) return String(value.stroke_tone);
    return VECTOR_LAYER_COLORS[normalizeLayerKey(value.name || value.layer_id)] || "#d2dbe6";
  }
  return VECTOR_LAYER_COLORS[normalizeLayerKey(value)] || "#d2dbe6";
}

function hexToRgba(hex, alpha) {
  const cleaned = String(hex || "").trim();
  const match = cleaned.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return `rgba(210, 219, 230, ${alpha})`;
  const int = Number.parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createBlankMapDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CALIBRATION_BASE_WIDTH}" height="${CALIBRATION_BASE_HEIGHT}" viewBox="0 0 ${CALIBRATION_BASE_WIDTH} ${CALIBRATION_BASE_HEIGHT}">
      <rect width="100%" height="100%" fill="transparent" />
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isTouchGestureLocked() {
  return state.multiTouchActive || Date.now() < state.touchGestureLockUntil;
}

function lockTouchSelection(duration = 420) {
  state.touchGestureLockUntil = Math.max(state.touchGestureLockUntil, Date.now() + duration);
}

function itemHasDetails(item) {
  if (!item) return false;
  if (isSectorArmyLayerItem(item)) return true;
  if (item.kind === "route" || item.kind === "faction") return true;
  return Boolean(item.name);
}

function itemHasGeneratedProfile(item) {
  if (!item || item.kind === "route" || item.kind === "faction" || isSectorArmyLayerItem(item)) return false;
  return Boolean(item.nameKey && state.planetProfiles.has(item.nameKey));
}

function factionVisibleByFilters(source) {
  const faction = normalizeFaction(typeof source === "string" ? source : source?.faction);
  if (faction === "republic") return state.filters.republic;
  if (faction === "separatist") return state.filters.separatist;
  if (faction === "blacksun") return state.filters.blacksun;
  if (faction === "hutt") return state.filters.hutt;
  if (faction === "pyke") return state.filters.pyke;
  if (faction === "ohnaka") return state.filters.ohnaka;
  return true;
}

function routeVisibleByFilters(_route) {
  return state.filters.routes;
}

function planetVisibleByFilters(item) {
  if (!item || item.kind === "route" || item.kind === "faction") return false;
  if (!factionVisibleByFilters(item)) return false;
  if (state.filters.profiledOnly && !itemHasGeneratedProfile(item)) return false;
  return true;
}

function mapItemVisible(item) {
  if (!item) return false;
  if (item.kind === "route") return routeVisibleByFilters(item);
  if (item.kind === "faction") return factionVisibleByFilters(item);
  if (isSectorArmyLayerItem(item)) return sectorArmyLayerEnabled();
  return planetVisibleByFilters(item);
}

function visibleRenderableMapItems() {
  return allRenderableMapItems().filter((item) => planetVisibleByFilters(item));
}

function visibleRouteItems() {
  return Array.from(state.routeByKey.values()).filter((item) => routeVisibleByFilters(item));
}

function visibleFactionItems() {
  return Array.from(ensureFactionItems().values()).filter((item) => factionVisibleByFilters(item));
}

function visibleFactionFragments(fragments = ensureFactionFragments()) {
  return (Array.isArray(fragments) ? fragments : []).filter((fragment) => factionVisibleByFilters(fragment));
}

function visibleVectorPaths() {
  return state.vectorPaths.filter((path) => {
    if (state.filters.routes) return true;
    return !isMainHyperspaceRoutePath(path) && !isSideHyperspaceRoutePath(path);
  });
}

function setMobilePanel(panel) {
  const nextPanel = state.isMobileView ? normalizeMobilePanel(panel) : null;
  state.mobilePanel = nextPanel;
  document.body.classList.toggle("mobile-panel-open", Boolean(state.mobilePanel));
  document.body.classList.toggle("mobile-screen-open", isMobileFullScreenPanel(nextPanel));
  document.body.dataset.mobilePanel = state.mobilePanel ? String(state.mobilePanel).toLowerCase() : "";
  applyMobilePanelExpanded(nextPanel);
  travelCardEl?.classList.toggle("mobile-screen-active", nextPanel === "travel");
  fleetCardEl?.classList.toggle("mobile-screen-active", nextPanel === "fleet");
  newsCardEl?.classList.toggle("mobile-screen-active", nextPanel === "news");
  planetDetailCardEl?.classList.toggle("mobile-screen-active", nextPanel === "planetDetail");
  factionDetailCardEl?.classList.toggle("mobile-screen-active", nextPanel === "detail");
  viewerToolsCardEl?.classList.toggle("mobile-screen-active", nextPanel === "filters");
  sidebarLeft?.classList.toggle(
    "sidebar-open",
    nextPanel === "travel" || nextPanel === "fleet" || nextPanel === "news" || nextPanel === "planetDetail"
  );
  sidebarRight?.classList.toggle("sidebar-open", nextPanel === "detail");
  if (mobileTravelButton) {
    mobileTravelButton.classList.remove("active");
  }
  if (nextPanel === "news") {
    markNewsItemsRead();
    renderNewsPanel();
  }
  setMobileMenuSheetOffset(0);
}

function updateResponsiveMode() {
  const previousMobile = state.isMobileView;
  state.isMobileView = MOBILE_MEDIA_QUERY.matches;
  document.body.classList.toggle("mobile-view", state.isMobileView);
  if (previousMobile !== state.isMobileView) {
    stopDesktopWindowDrag(null, false);
  }
  if (state.isMobileView) {
    state.hoveredKey = null;
    osdViewerEl.classList.remove("desktop-point-hover");
  }
  if (state.isMobileView && state.viewMode === "3d") {
    setViewMode("2d");
    setStatus("3D-Ansicht ist auf Mobilgeraeten nur auf dem Desktop verfuegbar.");
  }
  if (!state.isMobileView) {
    setMobilePanel(null);
  } else {
    setMobilePanel(normalizeMobilePanel(state.mobilePanel));
  }
  if (previousMobile !== state.isMobileView) {
    invalidateStaticOverlay();
    renderLandingIntroCopy();
    if (landingIntroEl && !landingIntroEl.classList.contains("hidden")) {
      rebuildLandingStars();
    }
  }
  renderDesktopWindowVisibility();
  applyDesktopWindowLayout(false);
}

function renderMapToolsTitle() {
  if (!mapToolsTitle) return;
  mapToolsTitle.textContent = state.isMobileView ? "Filter" : "Filter & Legende";
}

function renderMobileTravelButton() {
  if (!mobileTravelButton) return;
  if (state.isMobileView) {
    mobileTravelButton.disabled = true;
    mobileTravelButton.classList.remove("active");
    mobileTravelButton.classList.add("is-disabled");
    mobileTravelButton.setAttribute("aria-disabled", "true");
    mobileTravelButton.setAttribute("aria-label", "Reiseicon ist in der mobilen Ansicht deaktiviert");
    return;
  }
  const disabled = state.isMobileView && state.viewMode === "3d";
  mobileTravelButton.disabled = disabled;
  mobileTravelButton.classList.toggle("is-disabled", disabled);
  if (disabled) {
    mobileTravelButton.classList.remove("active");
  }
  mobileTravelButton.setAttribute("aria-disabled", disabled ? "true" : "false");
  mobileTravelButton.setAttribute(
    "aria-label",
    disabled ? "Reiseoption im mobilen 3D-Modus vorerst deaktiviert" : "Reiserechner"
  );
  if (disabled && state.mobilePanel === "travel") {
    setMobilePanel(null);
  }
}

function viewportImageBounds(marginPx = 0) {
  if (!state.viewer || !state.imageWidth || !state.imageHeight) return null;
  try {
    const viewportRect = state.viewer.viewport.getBounds(true);
    const topLeft = state.viewer.viewport.viewportToImageCoordinates(
      new OpenSeadragon.Point(viewportRect.x, viewportRect.y)
    );
    const bottomRight = state.viewer.viewport.viewportToImageCoordinates(
      new OpenSeadragon.Point(viewportRect.x + viewportRect.width, viewportRect.y + viewportRect.height)
    );
    return {
      left: Math.max(0, Math.min(topLeft.x, bottomRight.x) - marginPx),
      top: Math.max(0, Math.min(topLeft.y, bottomRight.y) - marginPx),
      right: Math.min(state.imageWidth, Math.max(topLeft.x, bottomRight.x) + marginPx),
      bottom: Math.min(state.imageHeight, Math.max(topLeft.y, bottomRight.y) + marginPx),
    };
  } catch (_error) {
    return null;
  }
}

function currentOverlayMetrics() {
  const bounds = viewportImageBounds(0);
  const visibleWidth = bounds ? Math.max(1, bounds.right - bounds.left) : Math.max(1, state.imageWidth);
  const viewerWidth = Math.max(1, osdViewerEl.clientWidth || 1);
  const screenScale = viewerWidth / visibleWidth;
  const imagePerScreenPx = 1 / screenScale;
  const zoomFactor = state.imageWidth ? state.imageWidth / visibleWidth : 1;
  const mobileDotDetailFactor = clamp((Math.log2(zoomFactor + 1) - 0.35) / 1.9, 0, 1);
  const dotScreenRadius = state.isMobileView
    ? clamp(0.46 + mobileDotDetailFactor * 0.4, 0.46, 0.86)
    : clamp(1.6 + mobileDotDetailFactor * 1.6, 1.6, 3.2);
  const reviewScreenRadius = clamp(dotScreenRadius * 1.28, 1.35, 2.55);
  const dotRadius = clamp(dotScreenRadius / Math.max(screenScale, 0.001), 0.08, 18);
  const reviewRadius = clamp(reviewScreenRadius / Math.max(screenScale, 0.001), 0.1, 24);
  const rimStroke = clamp(imagePerScreenPx * (state.isMobileView ? 1.65 : 1.3), 0.85, 28);
  const guideStroke = clamp(imagePerScreenPx * (state.isMobileView ? 1.3 : 1.05), 0.65, 24);
  const markerRadius = clamp(imagePerScreenPx * (state.isMobileView ? 4.4 : 3.8), 2.4, 70);
  const selectionRadius = clamp(imagePerScreenPx * 6.2, 4.5, 96);
  const dotStroke = clamp(0.72 / Math.max(screenScale, 0.001), 0.24, 6);
  const mainRouteScreenWidth = clamp(
    (state.isMobileView ? 2.8 : 3.25) - Math.log2(Math.max(zoomFactor, 1)) * (state.isMobileView ? 0.42 : 0.5),
    state.isMobileView ? 1.35 : 1.55,
    state.isMobileView ? 2.8 : 3.25
  );
  const sideRouteScreenWidth = clamp(
    dotScreenRadius * (state.isMobileView ? 0.84 : 0.92),
    state.isMobileView ? 0.8 : 0.92,
    state.isMobileView ? 1.5 : 1.7
  );
  const pathLabelScreenSize = clamp(
    (state.isMobileView ? 9.2 : 10.4) + Math.log2(zoomFactor + 1) * (state.isMobileView ? 0.75 : 0.95),
    state.isMobileView ? 8.8 : 10,
    state.isMobileView ? 14.2 : 17.5
  );
  const pathLabelSize = clamp(pathLabelScreenSize / Math.max(screenScale, 0.001), 4.5, 170);
  const markerLabelSize = clamp(imagePerScreenPx * 10.5, 4, 110);
  const screenPlanetLabelSize = clamp(8.2 + Math.min(4.6, Math.log2(zoomFactor + 1) * 1.18), 8.2, 12.8);
  const screenAxisLabelSize = clamp(10 + Math.min(4, Math.log2(zoomFactor + 1) * 1.4), 10, 15);
  const planetLabelFontSize = clamp(screenPlanetLabelSize / screenScale, 6, 140);
  const axisLabelFontSize = clamp(screenAxisLabelSize / screenScale, 6, 140);
  const imageTextOutlineWidth = clamp(3.2 / screenScale, 1.1, 28);
  const imageLabelOffsetX = clamp((screenPlanetLabelSize + 7) / screenScale, 7, 90);
  const imageLabelOffsetY = clamp((screenPlanetLabelSize * 0.25) / screenScale, 3, 42);
  const showPathLabels = false;
  return {
    screenScale,
    zoomFactor,
    dotRadius,
    dotScreenRadius,
    reviewRadius,
    rimStroke,
    guideStroke,
    markerRadius,
    selectionRadius,
    dotStroke,
    mainRouteScreenWidth,
    sideRouteScreenWidth,
    pathLabelSize,
    markerLabelSize,
    screenPlanetLabelSize,
    screenAxisLabelSize,
    planetLabelFontSize,
    axisLabelFontSize,
    imageTextOutlineWidth,
    imageLabelOffsetX,
    imageLabelOffsetY,
    showPathLabels,
    signature: [
      dotRadius.toFixed(2),
      dotScreenRadius.toFixed(2),
      reviewRadius.toFixed(2),
      rimStroke.toFixed(2),
      guideStroke.toFixed(2),
      markerRadius.toFixed(2),
      dotStroke.toFixed(2),
      mainRouteScreenWidth.toFixed(2),
      sideRouteScreenWidth.toFixed(2),
      screenScale.toFixed(4),
      pathLabelSize.toFixed(2),
      markerLabelSize.toFixed(2),
      screenPlanetLabelSize.toFixed(2),
      screenAxisLabelSize.toFixed(2),
      imageTextOutlineWidth.toFixed(2),
      showPathLabels ? 1 : 0,
      state.isMobileView ? 1 : 0,
    ].join("|"),
  };
}

function sortedNumericQuantile(values, t) {
  if (!Array.isArray(values) || !values.length) return 0;
  const clampedT = clamp(Number(t) || 0, 0, 1);
  const index = (values.length - 1) * clampedT;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(values.length - 1, lowerIndex + 1);
  const fraction = index - lowerIndex;
  return values[lowerIndex] * (1 - fraction) + values[upperIndex] * fraction;
}

function factionFragmentVisual(faction) {
  return FACTION_FRAGMENT_VISUALS[normalizeFaction(faction)] || FACTION_FRAGMENT_VISUALS.republic;
}

function clusterFactionPoints(points, linkDistancePx) {
  if (!Array.isArray(points) || !points.length) return [];
  const parent = points.map((_, index) => index);
  const size = points.map(() => 1);
  const linkDistanceSq = linkDistancePx ** 2;

  const find = (index) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (size[leftRoot] < size[rightRoot]) {
      parent[leftRoot] = rightRoot;
      size[rightRoot] += size[leftRoot];
      return;
    }
    parent[rightRoot] = leftRoot;
    size[leftRoot] += size[rightRoot];
  };

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    for (let inner = index + 1; inner < points.length; inner += 1) {
      const other = points[inner];
      const dx = current.x - other.x;
      const dy = current.y - other.y;
      if (dx * dx + dy * dy <= linkDistanceSq) {
        union(index, inner);
      }
    }
  }

  const clusters = new Map();
  points.forEach((point, index) => {
    const root = find(index);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(point);
  });
  return Array.from(clusters.values()).sort((left, right) => right.length - left.length);
}

function buildFactionFragmentProfile(faction, cluster, index) {
  if (!Array.isArray(cluster) || !cluster.length || !state.imageWidth || !state.imageHeight) return null;
  const centerX = cluster.reduce((sum, point) => sum + point.x, 0) / cluster.length;
  const centerY = cluster.reduce((sum, point) => sum + point.y, 0) / cluster.length;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  cluster.forEach((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  });
  covXX /= cluster.length;
  covYY /= cluster.length;
  covXY /= cluster.length;

  const angleRad = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);
  const majorDistances = [];
  const minorDistances = [];

  cluster.forEach((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    majorDistances.push(Math.abs(dx * cosAngle + dy * sinAngle));
    minorDistances.push(Math.abs(-dx * sinAngle + dy * cosAngle));
  });

  majorDistances.sort((left, right) => left - right);
  minorDistances.sort((left, right) => left - right);

  const minDim = Math.min(state.imageWidth, state.imageHeight);
  const largeCluster = cluster.length >= GOVERNMENT_CORE_CLUSTER_MIN_PLANETS;
  const padding = clamp(minDim * (largeCluster ? 0.026 : cluster.length >= 45 ? 0.022 : 0.018), 90, 170);
  const majorExtent = sortedNumericQuantile(majorDistances, largeCluster ? 0.92 : 0.88);
  const minorExtent = sortedNumericQuantile(minorDistances, cluster.length >= 65 ? 0.9 : 0.86);
  const isUnderworld = UNDERWORLD_FACTION_KEYS.includes(faction);
  const isGovernment = GOVERNMENT_FACTION_KEYS.includes(faction);
  const coreRxCap = isUnderworld ? state.imageWidth * 0.11 : state.imageWidth * 0.34;
  const coreRyCap = isUnderworld ? state.imageHeight * 0.11 : state.imageHeight * 0.28;
  const ambientRxCap = isUnderworld ? state.imageWidth * 0.16 : state.imageWidth * 0.4;
  const ambientRyCap = isUnderworld ? state.imageHeight * 0.16 : state.imageHeight * 0.34;
  const coreRx = clamp(majorExtent * 1.18 + padding, 130, coreRxCap);
  const coreRy = clamp(minorExtent * 1.28 + padding * 0.82, 110, coreRyCap);
  const ambientRx = clamp(coreRx * 1.24, coreRx + 60, ambientRxCap);
  const ambientRy = clamp(coreRy * 1.22, coreRy + 52, ambientRyCap);
  const governmentBannerSize = Math.min(ambientRx, ambientRy) * (largeCluster ? 0.86 : 1.55);
  const bannerSizeCap = isUnderworld ? 360 : largeCluster ? 320 : 520;
  const bannerSizeMin = isGovernment && !largeCluster ? 150 : 110;
  const bannerSizeBase = isGovernment ? governmentBannerSize : Math.min(coreRx, coreRy) * 1.22;
  const bannerSize = clamp(bannerSizeBase, bannerSizeMin, bannerSizeCap);
  const outerRadius = Math.hypot(ambientRx, ambientRy);

  return {
    id: `fragment-${faction}-${index + 1}`,
    faction,
    count: cluster.length,
    cx: centerX,
    cy: centerY,
    angleRad,
    angleDeg: (angleRad * 180) / Math.PI,
    coreRx,
    coreRy,
    ambientRx,
    ambientRy,
    bannerSize,
    bounds: {
      left: centerX - outerRadius,
      top: centerY - outerRadius,
      right: centerX + outerRadius,
      bottom: centerY + outerRadius,
    },
  };
}

function ensureFactionFragments() {
  if (!state.imageWidth || !state.imageHeight) return [];
  const cacheKey = `${state.imageWidth}x${state.imageHeight}|${state.staticOverlayVersion}|${state.planetFactions.size}`;
  if (state.factionFragmentKey === cacheKey) {
    return state.factionFragments;
  }

  // Nur Fraktionen die zum aktuellen Modus gehoeren bekommen Fragments.
  // So kann kein Republik-Banner im Underworld auftauchen, auch wenn ein
  // Item-Record noch stale faction-Daten haette.
  const pointsByFaction =
    state.mapMode === "underworld"
      ? { blacksun: [], hutt: [], pyke: [], ohnaka: [] }
      : { republic: [], separatist: [] };

  allRenderableMapItems().forEach((item) => {
    const faction = normalizeFaction(item?.faction);
    if (!faction || item?.kind === "review" || item?.kind === "route") return;
    if (!pointsByFaction[faction]) return;
    const position = itemImagePosition(item);
    pointsByFaction[faction].push({
      key: item.nameKey,
      x: position.x,
      y: position.y,
    });
  });

  const baseLink = Math.min(state.imageWidth, state.imageHeight) * FACTION_FRAGMENT_LINK_DISTANCE_RATIO;
  const fragments = Object.entries(pointsByFaction)
    .flatMap(([faction, points]) => {
      if (!points.length) return [];
      const isUnderworld = UNDERWORLD_FACTION_KEYS.includes(faction);
      const linkDistance = isUnderworld ? baseLink * 2.6 : baseLink;
      const minPlanets = isUnderworld
        ? 2
        : FACTION_FRAGMENT_MIN_PLANETS_BY_FACTION[faction] || FACTION_FRAGMENT_MIN_PLANETS;
      return clusterFactionPoints(points, linkDistance)
        .filter((cluster) => cluster.length >= minPlanets)
        .map((cluster, index) => buildFactionFragmentProfile(faction, cluster, index))
        .filter(Boolean);
    })
    .sort((left, right) => right.count - left.count);

  // Anker-Banner: garantiert dass an konfigurierten Hauptplaneten /
  // Extra-Ankern (z.B. Coruscant + Mustafar fuer Black Sun) immer ein
  // Banner sitzt, auch wenn diese Welten geographisch isoliert sind.
  if (state.mapMode === "underworld") {
    UNDERWORLD_FACTION_KEYS.forEach((faction) => {
      const anchorNames = [
        FACTION_MAIN_PLANETS[faction],
        ...(FACTION_EXTRA_ANCHORS[faction] || []),
      ].filter(Boolean);
      anchorNames.forEach((name) => {
        const key = normalizeNameKey(name);
        const point = (pointsByFaction[faction] || []).find((p) => p.key === key);
        if (!point) return;
        const alreadyCovered = fragments.some((f) => {
          if (f.faction !== faction) return false;
          return (
            f.bounds.left <= point.x &&
            point.x <= f.bounds.right &&
            f.bounds.top <= point.y &&
            point.y <= f.bounds.bottom
          );
        });
        if (alreadyCovered) return;
        const anchor = buildFactionFragmentProfile(faction, [point], fragments.length);
        if (anchor) fragments.push(anchor);
      });
    });
  }

  state.factionFragments = fragments;
  state.factionFragmentKey = cacheKey;
  return fragments;
}

function fragmentInBounds(fragment, bounds) {
  if (!fragment || !bounds) return true;
  return !(
    fragment.bounds.right < bounds.left ||
    fragment.bounds.left > bounds.right ||
    fragment.bounds.bottom < bounds.top ||
    fragment.bounds.top > bounds.bottom
  );
}

function buildFactionGradientStops(faction, layer = "core") {
  const visual = factionFragmentVisual(faction);
  if (layer === "ambient") {
    return [
      { offset: 0, color: hexToRgba(visual.ambientHex, 0.12) },
      { offset: 0.55, color: hexToRgba(visual.ambientHex, 0.045) },
      { offset: 1, color: hexToRgba(visual.ambientHex, 0) },
    ];
  }
  return [
    { offset: 0, color: hexToRgba(visual.coreHex, 0.26) },
    { offset: 0.34, color: hexToRgba(visual.glowHex, 0.19) },
    { offset: 0.72, color: hexToRgba(visual.glowHex, 0.075) },
    { offset: 1, color: hexToRgba(visual.glowHex, 0) },
  ];
}

function drawGradientEllipse(ctx, cx, cy, rx, ry, angleRad, stops) {
  if (!ctx || !rx || !ry) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function polarPoint(radius, angleDeg) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function hexagonVertices(radius) {
  return [0, 60, 120, 180, 240, 300].map((angle) => polarPoint(radius, angle));
}

function svgPoints(points) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function drawRepublicBannerCanvas(ctx, size, color) {
  const ringRadius = size * 0.42;
  const lineWidth = size * 0.08;
  const spokeInner = size * 0.17;
  const spokeOuter = ringRadius - lineWidth * 0.6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineCap = "square";
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((angle) => {
    const start = polarPoint(spokeInner, angle);
    const end = polarPoint(spokeOuter, angle);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSeparatistBannerCanvas(ctx, size, color) {
  const outerRadius = size * 0.47;
  const innerRadius = size * 0.16;
  const lineWidth = size * 0.075;
  const outerVertices = hexagonVertices(outerRadius);
  const innerVertices = hexagonVertices(innerRadius);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  outerVertices.forEach((point, index) => {
    if (!index) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  innerVertices.forEach((point, index) => {
    if (!index) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();

  innerVertices.forEach((point, index) => {
    const outerPoint = outerVertices[index];
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(outerPoint.x, outerPoint.y);
    ctx.stroke();
  });
  ctx.restore();
}

const factionLogoImageCache = {};
function getFactionLogoImage(faction) {
  const url = FACTION_LOGO_URLS[faction];
  if (!url) return null;
  if (factionLogoImageCache[faction]) return factionLogoImageCache[faction];
  const entry = { img: new Image(), ready: false, failed: false, tintedCanvas: null, tintedColor: "" };
  factionLogoImageCache[faction] = entry;
  entry.img.onload = () => {
    entry.ready = true;
    state.lastCanvasOverlayKey = "";
    state.lastStaticOverlayKey = "";
    invalidateStaticOverlay();
    if (state.viewer) renderOverlay();
  };
  entry.img.onerror = () => {
    entry.failed = true;
    console.warn(`[underworld] Logo ${url} konnte nicht geladen werden.`);
  };
  entry.img.src = url;
  return entry;
}

function getTintedFactionLogo(faction, color) {
  const entry = getFactionLogoImage(faction);
  if (!entry || !entry.ready || entry.failed) return null;
  if (entry.tintedCanvas && entry.tintedColor === color) return entry.tintedCanvas;
  const w = entry.img.naturalWidth || 256;
  const h = entry.img.naturalHeight || 256;
  if (!w || !h) return null;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ictx = off.getContext("2d");
  // Original Logo zeichnen
  ictx.drawImage(entry.img, 0, 0, w, h);
  // Tint per source-in: nur die nicht-transparenten Pixel werden eingefaerbt.
  ictx.globalCompositeOperation = "source-in";
  ictx.fillStyle = color;
  ictx.fillRect(0, 0, w, h);
  entry.tintedCanvas = off;
  entry.tintedColor = color;
  return off;
}

function drawFactionBannerCanvas(ctx, fragment) {
  if (!ctx || !fragment) return;
  const visual = factionFragmentVisual(fragment.faction);
  const bannerColor = hexToRgba(visual.bannerHex, visual.bannerOpacity);
  const isGovernmentFaction = GOVERNMENT_FACTION_KEYS.includes(fragment.faction);

  ctx.save();
  ctx.translate(fragment.cx, fragment.cy);
  const tintedLogo = isGovernmentFaction ? getTintedFactionLogo(fragment.faction, visual.bannerHex) : null;
  const logo = tintedLogo ? null : getFactionLogoImage(fragment.faction);
  if (tintedLogo || (logo && logo.ready && !logo.failed)) {
    const image = tintedLogo || logo.img;
    const size = fragment.bannerSize;
    if (isGovernmentFaction) {
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.shadowColor = visual.glowHex;
      ctx.shadowBlur = Math.max(22, size * 0.2);
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    // Regierungssiegel nutzen die Fraktionsfarbe als transparente Logo-Maske.
    ctx.shadowColor = isGovernmentFaction ? visual.glowHex : "transparent";
    ctx.shadowBlur = isGovernmentFaction ? Math.max(8, size * 0.08) : 0;
    ctx.globalAlpha = isGovernmentFaction ? 0.66 : 0.38;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else if (fragment.faction === "separatist") {
    drawSeparatistBannerCanvas(ctx, fragment.bannerSize, bannerColor);
  } else if (fragment.faction === "republic") {
    drawRepublicBannerCanvas(ctx, fragment.bannerSize, bannerColor);
  }
  ctx.restore();
}

function buildFactionFragmentSvgDefs() {
  return `
    <defs>
      ${Object.entries(FACTION_FRAGMENT_VISUALS)
      .map(
        ([faction, visual]) => `
            <radialGradient id="fragment-${faction}-ambient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${visual.ambientHex}" stop-opacity="0.12" />
              <stop offset="55%" stop-color="${visual.ambientHex}" stop-opacity="0.045" />
              <stop offset="100%" stop-color="${visual.ambientHex}" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="fragment-${faction}-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${visual.coreHex}" stop-opacity="0.26" />
              <stop offset="34%" stop-color="${visual.glowHex}" stop-opacity="0.19" />
              <stop offset="72%" stop-color="${visual.glowHex}" stop-opacity="0.075" />
              <stop offset="100%" stop-color="${visual.glowHex}" stop-opacity="0" />
            </radialGradient>
            <filter id="fragment-${faction}-logo-glow" x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="14" result="logoGlow" />
              <feMerge>
                <feMergeNode in="logoGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          `
      )
      .join("")}
    </defs>
  `;
}

function buildRepublicBannerSvg(size, color) {
  const ringRadius = size * 0.42;
  const lineWidth = size * 0.08;
  const spokeInner = size * 0.17;
  const spokeOuter = ringRadius - lineWidth * 0.6;
  const spokes = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((angle) => {
      const start = polarPoint(spokeInner, angle);
      const end = polarPoint(spokeOuter, angle);
      return `<line x1="${start.x.toFixed(2)}" y1="${start.y.toFixed(2)}" x2="${end.x.toFixed(
        2
      )}" y2="${end.y.toFixed(2)}" class="faction-banner-spoke" stroke="${color}" stroke-width="${lineWidth.toFixed(
        2
      )}" stroke-linecap="square" />`;
    })
    .join("");
  return `
    <g class="faction-banner republic">
      <circle
        cx="0"
        cy="0"
        r="${ringRadius.toFixed(2)}"
        fill="none"
        class="faction-banner-outline"
        stroke="${color}"
        stroke-width="${lineWidth.toFixed(2)}"
        stroke-linecap="round"
      />
      ${spokes}
      <circle cx="0" cy="0" r="${(size * 0.17).toFixed(2)}" class="faction-banner-core" fill="${color}" />
    </g>
  `;
}

function buildSeparatistBannerSvg(size, color) {
  const outerRadius = size * 0.47;
  const innerRadius = size * 0.16;
  const lineWidth = size * 0.075;
  const outerVertices = hexagonVertices(outerRadius);
  const innerVertices = hexagonVertices(innerRadius);
  const spokes = innerVertices
    .map((point, index) => {
      const outerPoint = outerVertices[index];
      return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${outerPoint.x.toFixed(
        2
      )}" y2="${outerPoint.y.toFixed(2)}" class="faction-banner-spoke" stroke="${color}" stroke-width="${lineWidth.toFixed(
        2
      )}" stroke-linecap="round" />`;
    })
    .join("");
  return `
    <g class="faction-banner separatist">
      <polygon
        points="${svgPoints(outerVertices)}"
        fill="none"
        class="faction-banner-outline"
        stroke="${color}"
        stroke-width="${lineWidth.toFixed(2)}"
        stroke-linejoin="round"
      />
      ${spokes}
      <polygon points="${svgPoints(innerVertices)}" class="faction-banner-core" fill="${color}" />
    </g>
  `;
}

function buildFactionBannerSvg(fragment) {
  const visual = factionFragmentVisual(fragment?.faction);
  const color = hexToRgba(visual.bannerHex, visual.bannerOpacity);
  const logoUrl = FACTION_LOGO_URLS[fragment?.faction];
  if (logoUrl) {
    const isGovernmentFaction = GOVERNMENT_FACTION_KEYS.includes(fragment.faction);
    const size = fragment.bannerSize;
    const x = (-size / 2).toFixed(2);
    const y = (-size / 2).toFixed(2);
    const width = size.toFixed(2);
    const height = size.toFixed(2);
    if (isGovernmentFaction) {
      const maskId = `faction-banner-mask-${safeSvgId(fragment.id || fragment.faction)}`;
      return `
        <g class="faction-banner ${fragment.faction}">
          <mask id="${maskId}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}" style="mask-type: alpha;">
            <image
              href="${escapeHtml(logoUrl)}"
              x="${x}"
              y="${y}"
              width="${width}"
              height="${height}"
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
          <rect
            x="${x}"
            y="${y}"
            width="${width}"
            height="${height}"
            fill="${visual.glowHex}"
            opacity="0.34"
            filter="url(#fragment-${fragment.faction}-logo-glow)"
            mask="url(#${maskId})"
          />
          <rect
            x="${x}"
            y="${y}"
            width="${width}"
            height="${height}"
            fill="${visual.bannerHex}"
            opacity="0.66"
            mask="url(#${maskId})"
          />
        </g>
      `;
    }
    return `
      <g class="faction-banner ${fragment.faction}">
        <image
          href="${escapeHtml(logoUrl)}"
          x="${x}"
          y="${y}"
          width="${width}"
          height="${height}"
          opacity="0.85"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    `;
  }
  if (fragment?.faction === "separatist") {
    return buildSeparatistBannerSvg(fragment.bannerSize, color);
  }
  return buildRepublicBannerSvg(fragment.bannerSize, color);
}

function buildFactionFragmentSvgMarkup(fragments) {
  if (!Array.isArray(fragments) || !fragments.length) return "";
  return fragments
    .map((fragment) => {
      const visual = factionFragmentVisual(fragment.faction);
      const factionKey = `faction:${fragment.faction}`;
      return `
        <g
          class="faction-fragment ${fragment.faction}"
          data-faction-key="${factionKey}"
          style="--banner-glow: ${visual.glowHex}; --banner-accent: ${visual.glowHex};"
        >
          <g transform="translate(${fragment.cx.toFixed(2)} ${fragment.cy.toFixed(2)}) rotate(${fragment.angleDeg.toFixed(2)})">
            <ellipse cx="0" cy="0" rx="${fragment.ambientRx.toFixed(2)}" ry="${fragment.ambientRy.toFixed(
        2
      )}" fill="url(#fragment-${fragment.faction}-ambient)" />
            <ellipse cx="0" cy="0" rx="${fragment.coreRx.toFixed(2)}" ry="${fragment.coreRy.toFixed(
        2
      )}" fill="url(#fragment-${fragment.faction}-core)" />
          </g>
          <g transform="translate(${fragment.cx.toFixed(2)} ${fragment.cy.toFixed(2)})">
            ${buildFactionBannerSvg(fragment)}
          </g>
        </g>
      `;
    })
    .join("");
}

function updateFactionFragmentInteractionState() {
  if (!state.overlaySvg || state.isMobileView) return;
  const hoveredKey = hoveredItem()?.kind === "faction" ? hoveredItem().nameKey : "";
  const selectedKey = selectedFactionItem()?.nameKey || "";
  state.overlaySvg.querySelectorAll(".faction-fragment[data-faction-key]").forEach((node) => {
    const key = String(node.getAttribute("data-faction-key") || "");
    node.classList.toggle("is-hovered", Boolean(hoveredKey) && key === hoveredKey);
    node.classList.toggle("is-selected", Boolean(selectedKey) && key === selectedKey);
  });
}

function factionFitsCurrentMode(faction) {
  if (!faction) return false;
  if (state.mapMode === "underworld") return UNDERWORLD_FACTION_KEYS.includes(faction);
  return GOVERNMENT_FACTION_KEYS.includes(faction);
}

function applyPlanetProfileRecord(record) {
  if (!record || !record.nameKey) return record;
  const profile = state.planetProfiles.get(record.nameKey);
  if (!profile) return record;
  const profileFaction = normalizeFaction(profile.faction);
  const fallbackFaction = factionFitsCurrentMode(profileFaction) ? profileFaction : "";
  return {
    ...record,
    // record.faction kommt aus state.planetFactions (Mode-aware) — die hat
    // immer Vorrang. Profile-Faktion wird nur uebernommen wenn sie zur
    // aktuellen Karte passt (im Underworld-Mode keine Government-Faktionen).
    faction: record.faction || fallbackFaction,
    climate: profile.climate || record.climate || "",
    terrain: profile.terrain || record.terrain || "",
    species_population: profile.species_population || record.species_population || "",
    lore: profile.lore || record.lore || record.desc || "",
    desc: profile.lore || record.desc || profile.notes || "",
    profile_notes: profile.notes || record.profile_notes || "",
    sources: profile.sources?.length ? profile.sources : record.sources || [],
    orbit_image: profile.orbit_image || record.orbit_image || "",
    orbit_image_alt: profile.orbit_image_alt || record.orbit_image_alt || "",
    map_image: profile.map_image || record.map_image || "",
    map_image_alt: profile.map_image_alt || record.map_image_alt || "",
    event_title: profile.event_title || record.event_title || "",
    event_text: profile.event_text || record.event_text || "",
    event_image: profile.event_image || record.event_image || "",
    map_href: profile.map_href || record.map_href || "",
    map_label: profile.map_label || record.map_label || "",
    size_body_type: profile.size_body_type || record.size_body_type || "",
    diameter_km: profile.diameter_km || record.diameter_km || null,
    radius_km: profile.radius_km || record.radius_km || null,
    size_confidence: profile.size_confidence || record.size_confidence || "",
    size_evidence: profile.size_evidence || record.size_evidence || "",
    size_notes: profile.size_notes || record.size_notes || "",
  };
}

function planetFactionOverrideForCurrentMode(override) {
  if (!override || typeof override !== "object") return { present: false, faction: "" };
  const mode = state.mapMode === "underworld" ? "underworld" : "government";
  const key = mode === "underworld" ? "underworld_faction" : "faction";
  const allowed = mode === "underworld" ? UNDERWORLD_FACTION_KEYS : GOVERNMENT_FACTION_KEYS;
  const hasModeOverride = Object.prototype.hasOwnProperty.call(override, key);

  if (hasModeOverride) {
    const raw = String(override[key] == null ? "" : override[key]).trim().toLowerCase();
    const faction = normalizeOverrideFaction(raw);
    if (isNeutralFactionOverrideValue(raw)) return { present: true, faction: "" };
    return allowed.includes(faction) ? { present: true, faction } : { present: false, faction: "" };
  }

  if (mode === "underworld" && Object.prototype.hasOwnProperty.call(override, "faction")) {
    const raw = String(override.faction == null ? "" : override.faction).trim().toLowerCase();
    const faction = normalizeOverrideFaction(raw);
    if (UNDERWORLD_FACTION_KEYS.includes(faction)) return { present: true, faction };
  }

  return { present: false, faction: "" };
}

function applyPlanetDataOverrides(record) {
  if (!record || !record.nameKey) return record;
  const override = planetDataOverride(record);
  if (!override || !Object.keys(override).length) return record;
  const next = { ...record };
  for (const key of PLANET_OVERRIDE_FIELDS) {
    if (isPlanetFactionOverrideField(key)) continue;
    if (override[key] !== undefined) {
      next[key] = override[key] == null ? "" : String(override[key]);
    }
  }
  const factionOverride = planetFactionOverrideForCurrentMode(override);
  const nextFaction = factionOverride.present ? factionOverride.faction : record.faction;
  return {
    ...next,
    faction: nextFaction,
    region: String(override.region || record.region || "Unknown").trim(),
  };
}

function applyPlanetEnrichments(record) {
  return applyPlanetDataOverrides(applyPlanetProfileRecord(applyFactionRecord(record)));
}

function ensureFactionItems() {
  if (!state.imageWidth || !state.imageHeight) return state.factionItems;
  const fragments = ensureFactionFragments();
  const cacheKey = `${state.factionFragmentKey}|${state.factionProfiles.size}|${state.planetFactions.size}`;
  if (state.factionItemsKey === cacheKey) return state.factionItems;

  const items = new Map();
  fragments.forEach((fragment) => {
    const key = `faction:${fragment.faction}`;
    const profile = state.factionProfiles.get(fragment.faction) || DEFAULT_FACTION_PROFILES[fragment.faction] || null;
    const current =
      items.get(key) ||
      {
        kind: "faction",
        faction: fragment.faction,
        name: profile?.name || factionDisplayName(fragment.faction),
        nameKey: key,
        region: "Fraktion",
        desc: profile?.summary || "",
        summary: profile?.summary || "",
        government: profile?.government || "",
        strength: profile?.strength || "",
        sources: normalizeProfileSources(profile?.sources),
        x: fragment.cx / state.imageWidth,
        y: fragment.cy / state.imageHeight,
        representativeCount: 0,
        fragment_count: 0,
        main_planet: profile?.main_planet || FACTION_MAIN_PLANETS[fragment.faction] || "",
        fragment_bounds: {
          left: fragment.bounds.left,
          top: fragment.bounds.top,
          right: fragment.bounds.right,
          bottom: fragment.bounds.bottom,
        },
        fragments: [],
      };

    if (fragment.count > current.representativeCount) {
      current.representativeCount = fragment.count;
      current.x = fragment.cx / state.imageWidth;
      current.y = fragment.cy / state.imageHeight;
    }
    current.fragment_count += 1;
    current.fragment_bounds.left = Math.min(current.fragment_bounds.left, fragment.bounds.left);
    current.fragment_bounds.top = Math.min(current.fragment_bounds.top, fragment.bounds.top);
    current.fragment_bounds.right = Math.max(current.fragment_bounds.right, fragment.bounds.right);
    current.fragment_bounds.bottom = Math.max(current.fragment_bounds.bottom, fragment.bounds.bottom);
    current.fragments.push(fragment);
    items.set(key, current);
  });

  const factionPlanetCounts = Object.fromEntries([...GOVERNMENT_FACTION_KEYS, ...UNDERWORLD_FACTION_KEYS].map((key) => [key, 0]));
  state.planetFactions.forEach((value) => {
    const faction = normalizeFaction(value);
    if (faction) factionPlanetCounts[faction] += 1;
  });

  items.forEach((item, key) => {
    const profile = state.factionProfiles.get(item.faction) || DEFAULT_FACTION_PROFILES[item.faction] || null;
    item.name = profile?.name || item.name;
    item.desc = profile?.summary || item.desc;
    item.summary = profile?.summary || item.summary;
    item.government = profile?.government || item.government;
    item.strength = profile?.strength || item.strength;
    item.sources = normalizeProfileSources(profile?.sources);
    item.controlled_planets = factionPlanetCounts[item.faction] || 0;
    item.main_planet = chooseFactionMainPlanet(item.faction, profile?.main_planet || item.main_planet);
    item.fragment_summary = `${item.fragment_count} Fraktionsfragmente auf der Karte`;
    items.set(key, item);
  });

  state.factionItems = items;
  state.factionItemsKey = cacheKey;
  return items;
}

function allRenderableMapItems() {
  const merged = new Map();
  state.knownByKey.forEach((item, key) => {
    merged.set(key, item);
  });
  state.savedByKey.forEach((item, key) => {
    merged.set(key, item);
  });
  return Array.from(merged.values());
}

function travelPlanetItems() {
  return allRenderableMapItems().slice().sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function getTravelPlanetByKey(key) {
  const item = key ? getSelectableItemByKey(key) : null;
  return item && item.kind !== "route" ? item : null;
}

function getTravelPlanetByName(value) {
  const key = normalizeNameKey(value);
  return key ? getTravelPlanetByKey(key) : null;
}

function selectedTravelPlanet(kind) {
  return kind === "start" ? getTravelPlanetByKey(state.travelStartKey) : getTravelPlanetByKey(state.travelTargetKey);
}

function setTravelPlanet(kind, item) {
  if (kind === "start") {
    state.travelStartKey = item ? item.nameKey : null;
    state.travelStartText = item ? item.name : "";
    return;
  }
  state.travelTargetKey = item ? item.nameKey : null;
  state.travelTargetText = item ? item.name : "";
}

function travelShortRunThresholdPx() {
  const cellSize = calibratedCellSizePx();
  const fallbackWidth = state.imageWidth ? state.imageWidth / GRID_LETTERS.length : 273;
  const fallbackHeight = state.imageHeight ? state.imageHeight / GRID_ROWS : 245;
  const minCellSize = Math.min(cellSize?.width || fallbackWidth, cellSize?.height || fallbackHeight);
  return clamp(minCellSize * HYPERSPACE_TRAVEL_SHORT_RUN_RATIO, 10, 64);
}

function appendGridRun(list, run) {
  const grid = normalizeGridLabel(run?.grid);
  if (!grid) return;
  const lengthPx = Number(run?.lengthPx || 0);
  const previous = list[list.length - 1];
  if (previous && previous.grid === grid) {
    previous.lengthPx += lengthPx;
    return;
  }
  list.push({ grid, lengthPx });
}

function mergeGridRuns(runs) {
  const merged = [];
  (Array.isArray(runs) ? runs : []).forEach((run) => appendGridRun(merged, run));
  return merged;
}

function collapseBounceGridRuns(runs, thresholdPx) {
  const collapsed = [];
  for (let index = 0; index < runs.length; index += 1) {
    const current = runs[index];
    const previous = collapsed[collapsed.length - 1];
    const next = runs[index + 1];
    if (previous && next && previous.grid === next.grid && current.lengthPx <= thresholdPx) {
      previous.lengthPx += current.lengthPx + next.lengthPx;
      index += 1;
      continue;
    }
    appendGridRun(collapsed, current);
  }
  return collapsed;
}

function collapseShortGridClusters(runs, thresholdPx) {
  const collapsed = [];
  for (let index = 0; index < runs.length;) {
    if (runs[index].lengthPx > thresholdPx) {
      appendGridRun(collapsed, runs[index]);
      index += 1;
      continue;
    }

    let cursor = index;
    while (cursor < runs.length && runs[cursor].lengthPx <= thresholdPx) {
      cursor += 1;
    }

    if (cursor - index >= 2) {
      const totals = new Map();
      let totalLengthPx = 0;
      for (let clusterIndex = index; clusterIndex < cursor; clusterIndex += 1) {
        const run = runs[clusterIndex];
        totalLengthPx += run.lengthPx;
        totals.set(run.grid, (totals.get(run.grid) || 0) + run.lengthPx);
      }

      let dominantGrid = runs[index].grid;
      let dominantLengthPx = -1;
      totals.forEach((lengthPx, grid) => {
        if (lengthPx <= dominantLengthPx) return;
        dominantGrid = grid;
        dominantLengthPx = lengthPx;
      });
      appendGridRun(collapsed, { grid: dominantGrid, lengthPx: totalLengthPx });
      index = cursor;
      continue;
    }

    appendGridRun(collapsed, runs[index]);
    index += 1;
  }
  return collapsed;
}

function simplifyGridRuns(runs) {
  let working = mergeGridRuns(runs);
  const thresholdPx = travelShortRunThresholdPx();

  for (let pass = 0; pass < 6; pass += 1) {
    const before = JSON.stringify(working);
    working = collapseBounceGridRuns(working, thresholdPx);
    working = collapseShortGridClusters(working, thresholdPx);
    working = mergeGridRuns(working);
    if (JSON.stringify(working) === before) break;
  }

  return working;
}

function gridRunsFromSamplePath(samples) {
  if (!Array.isArray(samples) || !samples.length) return [];

  const runs = [];
  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1];
    const end = samples[index];
    const deltaX = (Number(end.x) - Number(start.x)) * state.imageWidth;
    const deltaY = (Number(end.y) - Number(start.y)) * state.imageHeight;
    const lengthPx = Math.hypot(deltaX, deltaY);
    const grid = guessGridFromPoint((Number(start.x) + Number(end.x)) * 0.5, (Number(start.y) + Number(end.y)) * 0.5);
    appendGridRun(runs, { grid, lengthPx });
  }

  if (!runs.length) {
    const only = samples[0];
    appendGridRun(runs, { grid: guessGridFromPoint(only.x, only.y), lengthPx: 0 });
  }

  return simplifyGridRuns(runs);
}

function gridSequenceFromSamplePath(samples, startGrid, endGrid) {
  const sequence = gridRunsFromSamplePath(samples).map((run) => run.grid);
  const normalizedStart = normalizeGridLabel(startGrid);
  const normalizedEnd = normalizeGridLabel(endGrid);

  if (normalizedStart && sequence[0] !== normalizedStart) {
    sequence.unshift(normalizedStart);
  }
  if (normalizedEnd && sequence[sequence.length - 1] !== normalizedEnd) {
    sequence.push(normalizedEnd);
  }

  return mergeGridRuns(sequence.map((grid) => ({ grid, lengthPx: 0 }))).map((run) => run.grid);
}

function travelTimeAlpha(hyperdriveClass) {
  const shipClass = Number(hyperdriveClass) || 1;
  if (shipClass <= 0.5) return 2.08;
  if (shipClass <= 1.0) {
    const factor = (shipClass - 0.5) / 0.5;
    return 2.08 + factor * (1.68 - 2.08);
  }
  const factor = (shipClass - 1.0) / 9.0;
  return 1.68 + factor * (1.2 - 1.68);
}

function formatTravelTime(hyperdriveClass, gridDistance) {
  const shipClass = Math.max(0.1, Number(hyperdriveClass) || 1);
  const distance = Math.max(0, Number(gridDistance) || 0);
  const hours = HYPERSPACE_TRAVEL_BASE_HOURS * Math.pow(distance / HYPERSPACE_TRAVEL_BASE_GRID, travelTimeAlpha(shipClass)) * shipClass;

  if (hours < 1 / 60) return "< 1 min";
  if (hours < 1) return `${Math.round(hours * 60)} min`;

  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  if (fullHours >= 24) {
    const days = Math.floor(fullHours / 24);
    const remainingHours = fullHours % 24;
    if (!remainingHours && !minutes) return `${days} Tage`;
    if (!remainingHours) return `${days} Tage ${minutes} min`;
    return `${days} Tage ${remainingHours} h${minutes ? ` ${minutes} min` : ""}`;
  }
  return `${fullHours} h${minutes ? ` ${minutes} min` : ""}`;
}

function travelSamplePathFromLine(startItem, targetItem) {
  const deltaX = (Number(targetItem.x) - Number(startItem.x)) * state.imageWidth;
  const deltaY = (Number(targetItem.y) - Number(startItem.y)) * state.imageHeight;
  const lengthPx = Math.hypot(deltaX, deltaY);
  const steps = Math.max(1, Math.ceil(lengthPx / HYPERSPACE_TRAVEL_SAMPLE_STEP_PX));
  const samples = [];

  for (let step = 0; step <= steps; step += 1) {
    const factor = steps ? step / steps : 0;
    samples.push({
      x: Number(startItem.x) + (Number(targetItem.x) - Number(startItem.x)) * factor,
      y: Number(startItem.y) + (Number(targetItem.y) - Number(startItem.y)) * factor,
    });
  }

  return samples;
}

function travelPlanetCandidateKeys(value) {
  const baseKey = normalizeNameKey(value);
  if (!baseKey) return [];

  const candidateKeys = new Set([baseKey]);
  const canonical = ROUTE_PLANET_ALIASES[baseKey];
  if (canonical) {
    candidateKeys.add(normalizeNameKey(canonical));
  }
  Object.entries(ROUTE_PLANET_ALIASES).forEach(([aliasKey, canonicalName]) => {
    if (normalizeNameKey(canonicalName) === baseKey) {
      candidateKeys.add(aliasKey);
    }
  });
  return Array.from(candidateKeys);
}

function getTravelPlanetByRouteName(value) {
  for (const key of travelPlanetCandidateKeys(value)) {
    const item = getTravelPlanetByKey(key);
    if (item) return item;
  }
  return null;
}

function travelPixelDistanceBetweenItems(startItem, targetItem) {
  const deltaX = (Number(targetItem.x) - Number(startItem.x)) * state.imageWidth;
  const deltaY = (Number(targetItem.y) - Number(startItem.y)) * state.imageHeight;
  return Math.hypot(deltaX, deltaY);
}

function travelNodeRouteKey(nodeId, routeId) {
  return `${nodeId}::${routeId}`;
}

function travelPlanetNodeId(item, graph) {
  if (!item || !graph) return null;

  for (const candidateKey of travelPlanetCandidateKeys(item.nameKey)) {
    const nodeId = graph.planetNodeByKey.get(candidateKey);
    if (nodeId) return nodeId;
  }
  return null;
}

function travelNodeSlug(value) {
  return normalizeNameKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "node";
}

function buildRouteTravelProfileFromItem(routeItem) {
  if (!routeItem?.vector_path || !state.imageWidth || !state.imageHeight) {
    return null;
  }

  const baseSteps = Math.max(16, Number(state.hyperspaceNetwork?.sample_steps) || 16);
  const coarseSamples = sampleVectorPathPolyline(routeItem.vector_path, baseSteps);
  if (coarseSamples.length < 2) return null;

  const samples = [{ x: Number(coarseSamples[0].x), y: Number(coarseSamples[0].y), distance: 0 }];
  let cumulative = 0;

  for (let index = 1; index < coarseSamples.length; index += 1) {
    const start = coarseSamples[index - 1];
    const end = coarseSamples[index];
    const deltaX = Number(end.x) - Number(start.x);
    const deltaY = Number(end.y) - Number(start.y);
    const lengthPx = Math.hypot(deltaX * state.imageWidth, deltaY * state.imageHeight);
    const steps = Math.max(1, Math.ceil(lengthPx / HYPERSPACE_TRAVEL_SAMPLE_STEP_PX));

    for (let step = 1; step <= steps; step += 1) {
      const factor = step / steps;
      const previous = samples[samples.length - 1];
      const point = {
        x: Number(start.x) + deltaX * factor,
        y: Number(start.y) + deltaY * factor,
      };
      cumulative += Math.hypot(point.x - Number(previous.x), point.y - Number(previous.y));
      samples.push({
        x: point.x,
        y: point.y,
        distance: cumulative,
      });
    }
  }

  return {
    routeId: String(routeItem.route_id || routeItem.nameKey || ""),
    samples,
    length: cumulative,
    bounds: routeSampleBounds(samples),
  };
}

function estimateDistanceOnRouteProfile(profile, x, y) {
  if (!profile?.samples?.length || profile.samples.length < 2) return 0;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  let bestDistance = 0;

  for (let index = 1; index < profile.samples.length; index += 1) {
    const start = profile.samples[index - 1];
    const end = profile.samples[index];
    const dx = Number(end.x) - Number(start.x);
    const dy = Number(end.y) - Number(start.y);
    const lengthSq = dx * dx + dy * dy;
    const factor = lengthSq ? clamp(((Number(x) - Number(start.x)) * dx + (Number(y) - Number(start.y)) * dy) / lengthSq, 0, 1) : 0;
    const px = Number(start.x) + dx * factor;
    const py = Number(start.y) + dy * factor;
    const distanceSq = (Number(x) - px) ** 2 + (Number(y) - py) ** 2;
    if (distanceSq >= bestDistanceSq) continue;
    bestDistanceSq = distanceSq;
    bestDistance =
      Number(start.distance) + (Number(end.distance) - Number(start.distance)) * factor;
  }

  return bestDistance;
}

function travelSegmentIntersectionInfo(startA, endA, startB, endB, toleranceNorm = 0) {
  const ax = Number(startA.x);
  const ay = Number(startA.y);
  const bx = Number(endA.x);
  const by = Number(endA.y);
  const cx = Number(startB.x);
  const cy = Number(startB.y);
  const dx = Number(endB.x);
  const dy = Number(endB.y);

  const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denominator;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denominator;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) {
    return null;
  }

  const x = ax + (bx - ax) * clamp(t, 0, 1);
  const y = ay + (by - ay) * clamp(t, 0, 1);
  if (toleranceNorm > 0) {
    const distanceSq =
      distanceSqToSegment(x, y, cx, cy, dx, dy) + distanceSqToSegment(x, y, ax, ay, bx, by);
    if (distanceSq > toleranceNorm * toleranceNorm * 2.5) {
      return null;
    }
  }

  return {
    x,
    y,
    aT: clamp(t, 0, 1),
    bT: clamp(u, 0, 1),
  };
}

function buildHyperspaceTravelGraph() {
  if (state.travelGraph) return state.travelGraph;
  if (!state.imageWidth || !state.imageHeight || !state.routeByKey.size) {
    return null;
  }

  const routeItems = Array.from(state.routeByKey.values()).filter((item) => item?.vector_path);
  if (!routeItems.length) return null;

  const routeItemById = new Map(
    routeItems
      .map((item) => [String(item.route_id || ""), item])
      .filter(([routeId]) => routeId)
  );
  const routeProfiles = new Map();
  routeItemById.forEach((item, routeId) => {
    const profile = buildRouteTravelProfileFromItem(item);
    if (profile) {
      routeProfiles.set(routeId, profile);
    }
  });
  if (!routeProfiles.size) return null;

  const routeNameById = new Map(
    Array.from(routeItemById.entries()).map(([routeId, item]) => [routeId, String(item.name || routeId)])
  );
  (Array.isArray(state.hyperspaceNetwork?.route_summaries) ? state.hyperspaceNetwork.route_summaries : []).forEach((summary) => {
    const routeId = String(summary?.route_id || "");
    if (!routeId) return;
    routeNameById.set(routeId, String(summary?.name || routeNameById.get(routeId) || routeId));
  });

  const nodeRecords = new Map();
  const planetNodeByKey = new Map();

  const ensureNode = (nodeId, base = {}) => {
    const existing = nodeRecords.get(nodeId);
    if (existing) {
      if (base.kind === "planet") existing.kind = "planet";
      if (!existing.name && base.name) existing.name = String(base.name);
      if (!Number.isFinite(existing.x) && Number.isFinite(base.x)) existing.x = Number(base.x);
      if (!Number.isFinite(existing.y) && Number.isFinite(base.y)) existing.y = Number(base.y);
      if (!existing.transfer_kind && base.transfer_kind) {
        existing.transfer_kind = String(base.transfer_kind);
      }
      return existing;
    }

    const created = {
      id: String(nodeId),
      kind: base.kind === "planet" ? "planet" : "intersection",
      transfer_kind: String(base.transfer_kind || ""),
      name: base.name ? String(base.name) : "",
      x: Number(base.x),
      y: Number(base.y),
      membershipsByRoute: new Map(),
      routeIds: new Set(),
    };
    nodeRecords.set(created.id, created);
    return created;
  };

  const addNodeMembership = (nodeId, base, membership) => {
    const routeId = String(membership?.route_id || "");
    const distance = Number(membership?.distance);
    if (!routeId || !routeProfiles.has(routeId) || !Number.isFinite(distance)) {
      return;
    }

    const node = ensureNode(nodeId, base);
    node.routeIds.add(routeId);
    const current = node.membershipsByRoute.get(routeId);
    if (!current || distance < Number(current.distance)) {
      node.membershipsByRoute.set(routeId, {
        route_id: routeId,
        distance,
        source: String(membership?.source || base.transfer_kind || "route-geometry"),
      });
    }
    if (node.kind === "planet" && node.name) {
      planetNodeByKey.set(normalizeNameKey(node.name), node.id);
    }
  };

  (Array.isArray(state.hyperspaceNetwork?.nodes) ? state.hyperspaceNetwork.nodes : []).forEach((node) => {
    const memberships = (Array.isArray(node?.memberships) ? node.memberships : []).filter((membership) =>
      routeProfiles.has(String(membership?.route_id || ""))
    );
    if (!memberships.length) return;

    const isPlanet = String(node?.kind || "") === "planet" || Boolean(String(node?.name || "").trim());
    const displayName = String(node?.name || "").trim();
    const nodeId = isPlanet
      ? `planet:${travelNodeSlug(displayName || String(node?.id || ""))}`
      : String(node?.id || `intersection:${travelNodeSlug(displayName || "route")}`);

    memberships.forEach((membership) => {
      addNodeMembership(
        nodeId,
        {
          kind: isPlanet ? "planet" : String(node?.kind || "intersection"),
          transfer_kind: String(node?.transfer_kind || ""),
          name: displayName,
          x: Number(node?.x),
          y: Number(node?.y),
        },
        membership
      );
    });
  });

  routeItemById.forEach((routeItem, routeId) => {
    const profile = routeProfiles.get(routeId);
    if (!profile) return;

    uniqueRoutePlanetNames(routeItem.route_planets).forEach((planetName) => {
      const planet = getRoutePlanet(planetName);
      if (!planet) return;
      const nodeId = `planet:${travelNodeSlug(planet.name)}`;
      addNodeMembership(
        nodeId,
        {
          kind: "planet",
          transfer_kind: "route-planet",
          name: planet.name,
          x: Number(planet.x),
          y: Number(planet.y),
        },
        {
          route_id: routeId,
          distance: estimateDistanceOnRouteProfile(profile, Number(planet.x), Number(planet.y)),
          source: "route-planet-list",
        }
      );
    });
  });

  const maxImageDimension = Math.max(1, state.imageWidth, state.imageHeight);
  const intersectionTolerance = 8 / maxImageDimension;
  const mergeTolerance = 14 / maxImageDimension;
  const rawIntersections = [];
  const profileEntries = Array.from(routeProfiles.entries());

  for (let leftIndex = 0; leftIndex < profileEntries.length; leftIndex += 1) {
    const [leftRouteId, leftProfile] = profileEntries[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < profileEntries.length; rightIndex += 1) {
      const [rightRouteId, rightProfile] = profileEntries[rightIndex];
      const leftBounds = leftProfile.bounds;
      const rightBounds = rightProfile.bounds;
      if (
        leftBounds &&
        rightBounds &&
        (
          leftBounds.right < rightBounds.left - intersectionTolerance ||
          rightBounds.right < leftBounds.left - intersectionTolerance ||
          leftBounds.bottom < rightBounds.top - intersectionTolerance ||
          rightBounds.bottom < leftBounds.top - intersectionTolerance
        )
      ) {
        continue;
      }

      for (let leftSampleIndex = 1; leftSampleIndex < leftProfile.samples.length; leftSampleIndex += 1) {
        const aStart = leftProfile.samples[leftSampleIndex - 1];
        const aEnd = leftProfile.samples[leftSampleIndex];
        const aLeft = Math.min(Number(aStart.x), Number(aEnd.x));
        const aRight = Math.max(Number(aStart.x), Number(aEnd.x));
        const aTop = Math.min(Number(aStart.y), Number(aEnd.y));
        const aBottom = Math.max(Number(aStart.y), Number(aEnd.y));

        for (let rightSampleIndex = 1; rightSampleIndex < rightProfile.samples.length; rightSampleIndex += 1) {
          const bStart = rightProfile.samples[rightSampleIndex - 1];
          const bEnd = rightProfile.samples[rightSampleIndex];
          const bLeft = Math.min(Number(bStart.x), Number(bEnd.x));
          const bRight = Math.max(Number(bStart.x), Number(bEnd.x));
          const bTop = Math.min(Number(bStart.y), Number(bEnd.y));
          const bBottom = Math.max(Number(bStart.y), Number(bEnd.y));

          if (
            aRight < bLeft - intersectionTolerance ||
            bRight < aLeft - intersectionTolerance ||
            aBottom < bTop - intersectionTolerance ||
            bBottom < aTop - intersectionTolerance
          ) {
            continue;
          }

          const hit = travelSegmentIntersectionInfo(aStart, aEnd, bStart, bEnd, intersectionTolerance);
          if (!hit) continue;

          rawIntersections.push({
            leftRouteId,
            rightRouteId,
            x: hit.x,
            y: hit.y,
            leftDistance:
              Number(aStart.distance) + (Number(aEnd.distance) - Number(aStart.distance)) * Number(hit.aT),
            rightDistance:
              Number(bStart.distance) + (Number(bEnd.distance) - Number(bStart.distance)) * Number(hit.bT),
          });
        }
      }
    }
  }

  const clusters = [];
  rawIntersections.forEach((hit) => {
    const cluster = clusters.find(
      (candidate) =>
        candidate.leftRouteId === hit.leftRouteId &&
        candidate.rightRouteId === hit.rightRouteId &&
        Math.hypot(Number(candidate.x) - Number(hit.x), Number(candidate.y) - Number(hit.y)) <= mergeTolerance
    );

    if (!cluster) {
      clusters.push({
        leftRouteId: hit.leftRouteId,
        rightRouteId: hit.rightRouteId,
        x: Number(hit.x),
        y: Number(hit.y),
        leftDistance: Number(hit.leftDistance),
        rightDistance: Number(hit.rightDistance),
        count: 1,
      });
      return;
    }

    cluster.x = (Number(cluster.x) * cluster.count + Number(hit.x)) / (cluster.count + 1);
    cluster.y = (Number(cluster.y) * cluster.count + Number(hit.y)) / (cluster.count + 1);
    cluster.leftDistance =
      (Number(cluster.leftDistance) * cluster.count + Number(hit.leftDistance)) / (cluster.count + 1);
    cluster.rightDistance =
      (Number(cluster.rightDistance) * cluster.count + Number(hit.rightDistance)) / (cluster.count + 1);
    cluster.count += 1;
  });

  clusters.forEach((cluster) => {
    const alreadyKnown = Array.from(nodeRecords.values()).some((node) => {
      if (!node.membershipsByRoute.has(cluster.leftRouteId) || !node.membershipsByRoute.has(cluster.rightRouteId)) {
        return false;
      }
      return Math.hypot(Number(node.x) - Number(cluster.x), Number(node.y) - Number(cluster.y)) <= mergeTolerance * 1.2;
    });
    if (alreadyKnown) return;

    const nodeId = `intersection:${travelNodeSlug(cluster.leftRouteId)}:${travelNodeSlug(cluster.rightRouteId)}:${Math.round(Number(cluster.x) * 10000)}:${Math.round(Number(cluster.y) * 10000)}`;
    addNodeMembership(
      nodeId,
      {
        kind: "intersection",
        transfer_kind: "geometric-intersection",
        x: Number(cluster.x),
        y: Number(cluster.y),
      },
      {
        route_id: cluster.leftRouteId,
        distance: Number(cluster.leftDistance),
        source: "geometric-intersection",
      }
    );
    addNodeMembership(
      nodeId,
      {
        kind: "intersection",
        transfer_kind: "geometric-intersection",
        x: Number(cluster.x),
        y: Number(cluster.y),
      },
      {
        route_id: cluster.rightRouteId,
        distance: Number(cluster.rightDistance),
        source: "geometric-intersection",
      }
    );
  });

  const nodeById = new Map();
  const adjacency = new Map();
  const nodeRouteDistances = new Map();

  const routeOccurrences = new Map(Array.from(routeProfiles.keys()).map((routeId) => [routeId, []]));
  Array.from(nodeRecords.values())
    .sort((left, right) => {
      const kindScore = left.kind === right.kind ? 0 : left.kind === "planet" ? -1 : 1;
      if (kindScore) return kindScore;
      return (left.name || left.id).localeCompare(right.name || right.id, "de");
    })
    .forEach((record) => {
      const memberships = Array.from(record.membershipsByRoute.values()).sort(
        (left, right) => left.distance - right.distance || left.route_id.localeCompare(right.route_id, "de")
      );
      if (!memberships.length) return;

      const routeIds = memberships.map((membership) => membership.route_id);
      const finalized = {
        id: String(record.id),
        kind: record.kind === "planet" ? "planet" : "intersection",
        transfer_kind:
          record.kind === "planet"
            ? routeIds.length > 1
              ? "shared-planet"
              : "route-planet"
            : record.transfer_kind || "geometric-intersection",
        x: Number(record.x),
        y: Number(record.y),
        route_ids: routeIds,
        memberships: memberships.map((membership) => ({
          route_id: membership.route_id,
          distance: Number(membership.distance),
          source: membership.source,
        })),
        ...(record.name ? { name: record.name } : {}),
      };

      nodeById.set(finalized.id, finalized);
      adjacency.set(finalized.id, []);
      if (finalized.kind === "planet" && finalized.name) {
        planetNodeByKey.set(normalizeNameKey(finalized.name), finalized.id);
      }

      finalized.memberships.forEach((membership) => {
        nodeRouteDistances.set(travelNodeRouteKey(finalized.id, membership.route_id), Number(membership.distance));
        if (routeOccurrences.has(membership.route_id)) {
          routeOccurrences.get(membership.route_id).push({
            nodeId: finalized.id,
            distance: Number(membership.distance),
          });
        }
      });
    });

  const edges = [];
  routeOccurrences.forEach((occurrences, routeId) => {
    const deduped = new Map();
    occurrences.forEach((occurrence) => {
      const current = deduped.get(occurrence.nodeId);
      if (!current || occurrence.distance < current.distance) {
        deduped.set(occurrence.nodeId, occurrence);
      }
    });

    const ordered = Array.from(deduped.values()).sort(
      (left, right) => left.distance - right.distance || left.nodeId.localeCompare(right.nodeId, "de")
    );

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const weight = Number(current.distance) - Number(previous.distance);
      if (!(weight > 1e-9)) continue;

      const edge = {
        id: `edge:${travelNodeSlug(routeId)}:${index}`,
        route_id: routeId,
        layer_id: routeId,
        from_node_id: previous.nodeId,
        to_node_id: current.nodeId,
        length: weight,
      };
      edges.push(edge);
      adjacency.get(previous.nodeId).push({
        fromNodeId: previous.nodeId,
        toNodeId: current.nodeId,
        edge,
        weight,
      });
      adjacency.get(current.nodeId).push({
        fromNodeId: current.nodeId,
        toNodeId: previous.nodeId,
        edge,
        weight,
      });
    }
  });

  state.travelGraph = {
    nodeById,
    adjacency,
    nodeRouteDistances,
    planetNodeByKey,
    routeNameById,
    routeItemById,
    routeProfiles,
    edges,
  };
  return state.travelGraph;
}

function buildRouteTravelProfile(routeId) {
  const graph = buildHyperspaceTravelGraph();
  return graph?.routeProfiles.get(routeId) || null;
}

function interpolateRouteProfileSample(samples, distance) {
  if (!Array.isArray(samples) || !samples.length) return null;
  const target = clamp(Number(distance) || 0, 0, Number(samples[samples.length - 1].distance) || 0);
  if (target <= Number(samples[0].distance)) {
    return { x: Number(samples[0].x), y: Number(samples[0].y), distance: target };
  }
  if (target >= Number(samples[samples.length - 1].distance)) {
    const last = samples[samples.length - 1];
    return { x: Number(last.x), y: Number(last.y), distance: target };
  }

  let low = 1;
  let high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) * 0.5);
    if (Number(samples[middle].distance) < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const end = samples[low];
  const start = samples[low - 1];
  const span = Math.max(1e-9, Number(end.distance) - Number(start.distance));
  const factor = clamp((target - Number(start.distance)) / span, 0, 1);
  return {
    x: Number(start.x) + (Number(end.x) - Number(start.x)) * factor,
    y: Number(start.y) + (Number(end.y) - Number(start.y)) * factor,
    distance: target,
  };
}

function extractRouteIntervalSamples(profile, startDistance, endDistance) {
  if (!profile?.samples?.length) return [];

  const reverse = Number(startDistance) > Number(endDistance);
  const low = reverse ? Number(endDistance) : Number(startDistance);
  const high = reverse ? Number(startDistance) : Number(endDistance);
  const samples = [interpolateRouteProfileSample(profile.samples, low)];

  profile.samples.forEach((sample) => {
    const distance = Number(sample.distance);
    if (distance <= low + 1e-9 || distance >= high - 1e-9) return;
    samples.push({
      x: Number(sample.x),
      y: Number(sample.y),
      distance,
    });
  });

  samples.push(interpolateRouteProfileSample(profile.samples, high));

  const interval = [];
  samples.forEach((sample) => {
    const previous = interval[interval.length - 1];
    if (
      previous &&
      Math.abs(Number(previous.x) - Number(sample.x)) < 1e-9 &&
      Math.abs(Number(previous.y) - Number(sample.y)) < 1e-9
    ) {
      return;
    }
    interval.push(sample);
  });

  return reverse ? interval.reverse() : interval;
}

function runHyperspaceSearch(startItem) {
  const graph = buildHyperspaceTravelGraph();
  if (!graph) return null;

  const startNodeId = travelPlanetNodeId(startItem, graph);
  if (!startNodeId) return null;

  const stateKey = (nodeId, routeId) => `${nodeId}::${routeId || "start"}`;
  const distances = new Map([[stateKey(startNodeId, ""), 0]]);
  const previous = new Map();
  const visited = new Set();

  while (true) {
    let currentKey = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    distances.forEach((distance, key) => {
      if (visited.has(key) || distance >= currentDistance) return;
      currentKey = key;
      currentDistance = distance;
    });

    if (!currentKey) break;
    const [currentNodeId, currentRouteId = ""] = currentKey.split("::");
    visited.add(currentKey);

    (graph.adjacency.get(currentNodeId) || []).forEach((traversal) => {
      const nextRouteId = String(traversal.edge?.route_id || "");
      const nextKey = stateKey(traversal.toNodeId, nextRouteId);
      if (visited.has(nextKey)) return;
      const switchPenalty =
        currentRouteId && nextRouteId && currentRouteId !== nextRouteId ? HYPERSPACE_ROUTE_SWITCH_PENALTY : 0;
      const candidate = currentDistance + traversal.weight + switchPenalty;
      if (candidate >= (distances.get(nextKey) ?? Number.POSITIVE_INFINITY)) return;
      distances.set(nextKey, candidate);
      previous.set(nextKey, { traversal, previousKey: currentKey });
    });
  }

  return {
    graph,
    startNodeId,
    distances,
    previous,
    stateKey,
  };
}

function bestHyperspaceTerminal(search, targetNodeId) {
  if (!search || !targetNodeId) return null;

  let bestTerminalKey = null;
  let bestTerminalDistance = Number.POSITIVE_INFINITY;
  search.distances.forEach((distance, key) => {
    const [nodeId] = key.split("::");
    if (nodeId !== targetNodeId || distance >= bestTerminalDistance) return;
    bestTerminalKey = key;
    bestTerminalDistance = distance;
  });
  if (!bestTerminalKey) return null;

  return {
    key: bestTerminalKey,
    distance: bestTerminalDistance,
  };
}

function reconstructHyperspacePath(search, terminal) {
  if (!search || !terminal?.key) return null;

  const terminalNodeId = terminal.key.split("::")[0];
  const nodeIds = [terminalNodeId];
  const traversals = [];
  let cursorKey = terminal.key;
  while (cursorKey !== search.stateKey(search.startNodeId, "")) {
    const step = search.previous.get(cursorKey);
    if (!step) return null;
    traversals.unshift(step.traversal);
    nodeIds.unshift(step.traversal.fromNodeId);
    cursorKey = step.previousKey;
  }

  return {
    nodeIds,
    traversals,
    length: terminal.distance || 0,
  };
}

function findShortestHyperspacePath(startItem, targetItem) {
  const search = runHyperspaceSearch(startItem);
  if (!search) return null;

  const targetNodeId = travelPlanetNodeId(targetItem, search.graph);
  if (!targetNodeId) return null;
  return reconstructHyperspacePath(search, bestHyperspaceTerminal(search, targetNodeId));
}

function findClosestReachablePartnerPath(startItem, targetItem) {
  const search = runHyperspaceSearch(startItem);
  if (!search) return null;

  let bestCandidate = null;
  search.distances.forEach((distance, key) => {
    const [nodeId] = key.split("::");
    if (nodeId === search.startNodeId) return;

    const node = search.graph.nodeById.get(nodeId);
    if (node?.kind !== "planet" || !node.name) return;

    const partnerItem = getTravelPlanetByRouteName(node.name);
    if (!partnerItem || partnerItem.nameKey === targetItem.nameKey) return;

    const targetDistance = travelPixelDistanceBetweenItems(partnerItem, targetItem);
    const currentBestDistance = bestCandidate ? Number(bestCandidate.targetDistance) : Number.POSITIVE_INFINITY;
    const currentBestPathLength = bestCandidate ? Number(bestCandidate.pathLength) : Number.POSITIVE_INFINITY;
    const partnerName = String(partnerItem.name || node.name);

    if (
      targetDistance > currentBestDistance + 1e-6 ||
      (
        Math.abs(targetDistance - currentBestDistance) <= 1e-6 &&
        (
          distance > currentBestPathLength + 1e-6 ||
          (
            Math.abs(distance - currentBestPathLength) <= 1e-6 &&
            bestCandidate &&
            partnerName.localeCompare(bestCandidate.partnerItem.name, "de") >= 0
          )
        )
      )
    ) {
      return;
    }

    bestCandidate = {
      key,
      pathLength: distance,
      targetDistance,
      partnerItem,
    };
  });

  if (!bestCandidate) return null;

  const path = reconstructHyperspacePath(search, {
    key: bestCandidate.key,
    distance: bestCandidate.pathLength,
  });
  if (!path?.traversals?.length) return null;

  return {
    partnerItem: bestCandidate.partnerItem,
    path,
  };
}

function buildTravelTransferSummary(transferPlanets, hasUnnamedIntersectionTransfer) {
  if (transferPlanets.length) {
    return `Transfer ueber ${transferPlanets.join(" -> ")}.`;
  }
  if (hasUnnamedIntersectionTransfer) {
    return "Transfer ueber einen Routen-Schnittpunkt.";
  }
  return "Direkt ueber die verknuepfte Hyperraumroute berechnet.";
}

function buildHyperspaceRouteDetails(path, graph = buildHyperspaceTravelGraph()) {
  if (!graph || !path?.traversals?.length) return null;

  const samplePath = [];
  const routeNames = [];

  path.traversals.forEach((traversal) => {
    const routeId = String(traversal.edge?.route_id || "");
    const fromDistance = graph.nodeRouteDistances.get(travelNodeRouteKey(traversal.fromNodeId, routeId));
    const toDistance = graph.nodeRouteDistances.get(travelNodeRouteKey(traversal.toNodeId, routeId));
    if (!Number.isFinite(fromDistance) || !Number.isFinite(toDistance)) return;

    const profile = buildRouteTravelProfile(routeId);
    const intervalSamples = extractRouteIntervalSamples(profile, fromDistance, toDistance);
    if (!intervalSamples.length) return;

    if (!samplePath.length) {
      samplePath.push(...intervalSamples.map((sample) => ({ x: Number(sample.x), y: Number(sample.y) })));
    } else {
      samplePath.push(...intervalSamples.slice(1).map((sample) => ({ x: Number(sample.x), y: Number(sample.y) })));
    }

    const routeName = graph.routeNameById.get(routeId) || routeId;
    if (!routeNames.length || routeNames[routeNames.length - 1] !== routeName) {
      routeNames.push(routeName);
    }
  });

  if (!samplePath.length) return null;
  const transferNodes = path.nodeIds
    .slice(1, -1)
    .map((nodeId) => graph.nodeById.get(nodeId))
    .filter((node) => Array.isArray(node?.route_ids) && node.route_ids.length > 1);
  const transferPlanets = transferNodes
    .filter((node) => node?.name)
    .map((node) => String(node.name));
  const hasUnnamedIntersectionTransfer = transferNodes.some((node) => !node?.name);

  return {
    samplePath,
    routeNames,
    transferPlanets,
    hasUnnamedIntersectionTransfer,
  };
}

function buildHyperspaceTravelResult(startItem, targetItem, path) {
  const graph = buildHyperspaceTravelGraph();
  if (!graph) return null;

  const routeDetails = buildHyperspaceRouteDetails(path, graph);
  if (!routeDetails?.samplePath?.length) return null;

  const startGrid = normalizeGridLabel(startItem.grid) || guessGridFromPoint(startItem.x, startItem.y);
  const targetGrid = normalizeGridLabel(targetItem.grid) || guessGridFromPoint(targetItem.x, targetItem.y);
  const gridSequence = gridSequenceFromSamplePath(routeDetails.samplePath, startGrid, targetGrid);

  return {
    status: "ok",
    mode: "route",
    modeLabel: "Hyperraumroute",
    summaryMessage: buildTravelTransferSummary(routeDetails.transferPlanets, routeDetails.hasUnnamedIntersectionTransfer),
    routeNames: routeDetails.routeNames,
    routeText: routeDetails.routeNames.join(" -> "),
    endpointText: `${startGrid} -> ${targetGrid}`,
    gridSequence,
    gridDistance: Math.max(0, gridSequence.length - 1),
    samplePath: routeDetails.samplePath,
  };
}

function buildRouteSubspaceTravelResult(startItem, targetItem, partnerItem, path) {
  const graph = buildHyperspaceTravelGraph();
  if (!graph) return null;

  const routeDetails = buildHyperspaceRouteDetails(path, graph);
  if (!routeDetails?.samplePath?.length) return null;

  const subspacePath = travelSamplePathFromLine(partnerItem, targetItem);
  const samplePath = routeDetails.samplePath.map((sample) => ({
    x: Number(sample.x),
    y: Number(sample.y),
  }));
  if (subspacePath.length > 1) {
    samplePath.push(...subspacePath.slice(1).map((sample) => ({
      x: Number(sample.x),
      y: Number(sample.y),
    })));
  }

  const startGrid = normalizeGridLabel(startItem.grid) || guessGridFromPoint(startItem.x, startItem.y);
  const targetGrid = normalizeGridLabel(targetItem.grid) || guessGridFromPoint(targetItem.x, targetItem.y);
  const gridSequence = gridSequenceFromSamplePath(samplePath, startGrid, targetGrid);
  const summaryParts = [];
  if (routeDetails.transferPlanets.length || routeDetails.hasUnnamedIntersectionTransfer) {
    summaryParts.push(buildTravelTransferSummary(routeDetails.transferPlanets, routeDetails.hasUnnamedIntersectionTransfer));
  }
  summaryParts.push(`Hyperraum bis ${partnerItem.name}, dann ueber Subraum zum Ziel.`);

  const routeTextParts = [];
  if (routeDetails.routeNames.length) {
    routeTextParts.push(routeDetails.routeNames.join(" -> "));
  }
  routeTextParts.push(`Hyperraum bis ${partnerItem.name}, dann ueber Subraum`);

  return {
    status: "ok",
    mode: "route-subspace",
    modeLabel: "Hyperraum + Subraum",
    summaryMessage: summaryParts.join(" "),
    routeNames: routeDetails.routeNames,
    routeText: routeTextParts.join(" | "),
    endpointText: `${startGrid} -> ${targetGrid}`,
    gridSequence,
    gridDistance: Math.max(0, gridSequence.length - 1),
    samplePath,
    pathSegments: [
      {
        kind: "route",
        samplePath: routeDetails.samplePath,
      },
      {
        kind: "subspace",
        samplePath: subspacePath,
      },
    ],
    partnerItem,
  };
}

function buildDirectTravelResult(startItem, targetItem, reason) {
  const startGrid = normalizeGridLabel(startItem.grid) || guessGridFromPoint(startItem.x, startItem.y);
  const targetGrid = normalizeGridLabel(targetItem.grid) || guessGridFromPoint(targetItem.x, targetItem.y);
  const samplePath = travelSamplePathFromLine(startItem, targetItem);
  const gridSequence = gridSequenceFromSamplePath(samplePath, startGrid, targetGrid);

  return {
    status: "ok",
    mode: "direct",
    modeLabel: "Direkte Gridlinie",
    summaryMessage: reason || "Keine passende Hyperraumroute gefunden, daher direkte Gridlinie verwendet.",
    routeNames: [],
    routeText: reason || "Direkte Verbindung",
    endpointText: `${startGrid} -> ${targetGrid}`,
    gridSequence,
    gridDistance: Math.max(0, gridSequence.length - 1),
    samplePath,
  };
}

function computeTravelResult() {
  if (!state.imageWidth || !state.imageHeight) {
    return {
      status: "info",
      mode: "grid",
      modeLabel: "Grid",
      summaryMessage: "Karte wird noch initialisiert.",
    };
  }

  const hyperdriveClass = Math.max(0.1, Number(state.travelHyperdriveClass) || 1);
  const startText = String(state.travelStartText || "").trim();
  const targetText = String(state.travelTargetText || "").trim();
  const startItem = selectedTravelPlanet("start");
  const targetItem = selectedTravelPlanet("target");

  if (startText && !startItem) {
    return {
      status: "error",
      mode: "grid",
      modeLabel: "Grid",
      summaryMessage: `Startplanet "${startText}" wurde nicht gefunden.`,
    };
  }
  if (targetText && !targetItem) {
    return {
      status: "error",
      mode: "grid",
      modeLabel: "Grid",
      summaryMessage: `Zielplanet "${targetText}" wurde nicht gefunden.`,
    };
  }
  if (!startItem || !targetItem) {
    return {
      status: "info",
      mode: "grid",
      modeLabel: "Grid",
      summaryMessage: "Start- und Zielplanet waehlen, um die Reise zu berechnen.",
    };
  }

  let result = null;
  if (startItem.nameKey === targetItem.nameKey) {
    result = buildDirectTravelResult(startItem, targetItem, "Start und Ziel sind identisch.");
  } else {
    const path = findShortestHyperspacePath(startItem, targetItem);
    result = path?.traversals?.length
      ? buildHyperspaceTravelResult(startItem, targetItem, path)
      : null;
    if (!result) {
      const fallback = findClosestReachablePartnerPath(startItem, targetItem);
      result = fallback?.path?.traversals?.length
        ? buildRouteSubspaceTravelResult(startItem, targetItem, fallback.partnerItem, fallback.path)
        : null;
    }
    if (!result) {
      result = buildDirectTravelResult(
        startItem,
        targetItem,
        "Keine verbundene Hyperraumroute gefunden, daher direkte Gridlinie verwendet."
      );
    }
  }

  result.startItem = startItem;
  result.targetItem = targetItem;
  result.hyperdriveClass = hyperdriveClass;
  result.timeText = formatTravelTime(hyperdriveClass, result.gridDistance);
  return result;
}

function itemImagePosition(item) {
  return {
    x: Number(item.x || 0) * state.imageWidth,
    y: Number(item.y || 0) * state.imageHeight,
  };
}

function itemSelectionWeight(item) {
  if (item.kind === "review") return 0;
  if (item.kind === "saved") return 1;
  return 2;
}

function itemInBounds(item, bounds) {
  if (!bounds) return true;
  const { x, y } = itemImagePosition(item);
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

function overlayBoundsSignature(bounds) {
  if (!bounds) return "all";
  return [
    Math.round(bounds.left),
    Math.round(bounds.top),
    Math.round(bounds.right),
    Math.round(bounds.bottom),
  ].join(":");
}

function shouldShowAllPlanetLabels(metrics) {
  const threshold = state.isMobileView ? PLANET_LABEL_ALL_VISIBLE_ZOOM.mobile : PLANET_LABEL_ALL_VISIBLE_ZOOM.desktop;
  if (Number(metrics?.zoomFactor || 0) >= threshold) return true;
  if (!state.viewer?.viewport) return false;
  const currentZoom = Number(state.viewer.viewport.getZoom?.(true) || state.viewer.viewport.getZoom?.() || 0);
  const maxZoom = Number(state.viewer.viewport.getMaxZoom?.() || 0);
  if (!Number.isFinite(currentZoom) || !Number.isFinite(maxZoom) || maxZoom <= 0) return false;
  return currentZoom / maxZoom >= (state.isMobileView ? 0.96 : 0.92);
}

function visiblePlanetLabelItems(bounds, metrics = currentOverlayMetrics()) {
  const showAllVisibleLabels = shouldShowAllPlanetLabels(metrics);
  const candidates = visibleRenderableMapItems()
    .filter((item) => item.kind !== "review")
    .filter((item) => showAllVisibleLabels || (PLANET_LABEL_PRIORITIES[item.nameKey] || 0) > 0)
    .filter((item) => itemInBounds(item, bounds));

  if (!candidates.length) return [];

  const density = planetLabelDensityConfig(metrics, candidates.length);
  const entries = candidates
    .map((item) => buildPlanetLabelEntry(item, metrics, density))
    .filter(Boolean)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.centerDistanceSq !== b.centerDistanceSq) return a.centerDistanceSq - b.centerDistanceSq;
      return a.item.name.localeCompare(b.item.name, "de");
    });

  if (density.showAllVisible && entries.length <= density.maxLabels) {
    return entries.sort((a, b) => a.labelScreenY - b.labelScreenY || a.labelScreenX - b.labelScreenX);
  }

  const accepted = [];
  const occupied = [];
  for (const entry of entries) {
    if (accepted.length >= density.maxLabels) break;
    const labelBox = estimatePlanetLabelBox(entry, density.fontSize, density);
    const intersects = occupied.some((box) => boxesOverlap(labelBox, box));
    if (intersects) continue;
    accepted.push(entry);
    occupied.push(labelBox);
  }

  return accepted.sort((a, b) => a.labelScreenY - b.labelScreenY || a.labelScreenX - b.labelScreenX);
}

function planetLabelPriority(item) {
  const basePriority = PLANET_LABEL_PRIORITIES[item.nameKey] || 0;
  const savedBoost = item.kind === "saved" ? 10 : 0;
  const coreBoost = /core/i.test(item.region || "") ? 4 : 0;
  return basePriority + savedBoost + coreBoost;
}

function planetLabelDensityConfig(metrics, candidateCount) {
  const zoom = metrics.zoomFactor;
  if (shouldShowAllPlanetLabels(metrics)) {
    return {
      maxLabels: candidateCount,
      fontSize: Math.min(state.isMobileView ? 10.4 : 13.8, metrics.screenPlanetLabelSize + (state.isMobileView ? -0.4 : 0.75)),
      padX: state.isMobileView ? 1 : 6,
      padY: state.isMobileView ? 1 : 3,
      // Bei absolutem Maximum-Zoom auch auf Mobile alle Labels zeigen — User
      // will Namen lesen koennen, leichtes Ueberlappen ist akzeptabel.
      showAllVisible: true,
    };
  }
  if (zoom < 4.5) {
    return {
      maxLabels: state.isMobileView ? 5 : 8,
      fontSize: Math.max(8.4, metrics.screenPlanetLabelSize - 0.25),
      padX: state.isMobileView ? 26 : 34,
      padY: state.isMobileView ? 8 : 10,
      showAllVisible: false,
    };
  }
  if (zoom < 8) {
    return {
      maxLabels: state.isMobileView ? 7 : 12,
      fontSize: metrics.screenPlanetLabelSize,
      padX: state.isMobileView ? 16 : 21,
      padY: 7,
      showAllVisible: false,
    };
  }
  return {
    maxLabels: Math.min(candidateCount, state.isMobileView ? 24 : 32),
    fontSize: Math.min(state.isMobileView ? 12.2 : 13.2, metrics.screenPlanetLabelSize),
    padX: state.isMobileView ? 10 : 10,
    padY: state.isMobileView ? 5 : 4,
    // Desktop schaltet ab Zoom>=8 frueh auf "alles anzeigen" - so wars vorher
    // und Desktop-User wollen lieber leichte Ueberlappung als versteckte Namen.
    showAllVisible: !state.isMobileView,
  };
}

function planetLabelWidthPx(text, fontSize) {
  return Math.max(fontSize * 2.2, String(text || "").length * fontSize * 0.58 + 8);
}

function resolvePlanetLabelLayout(screen, radiusScreen, text, density) {
  const viewerWidth = Math.max(1, osdViewerEl?.clientWidth || 1);
  const viewerHeight = Math.max(1, osdViewerEl?.clientHeight || 1);
  const fontSize = Math.max(6, Number(density?.fontSize) || 10);
  const width = planetLabelWidthPx(text, fontSize);
  const height = fontSize * 1.2;
  const gap = Math.max(6, Math.round((Number(density?.padX) || 0) * 0.3));
  const safeX = Math.max(4, (Number(density?.padX) || 0) * 0.5);
  const safeY = Math.max(4, (Number(density?.padY) || 0) + 2);
  const anchorRight = screen.x + radiusScreen + gap;
  const anchorLeft = screen.x - radiusScreen - gap;
  const fitsRight = anchorRight + width <= viewerWidth - safeX;
  const fitsLeft = anchorLeft - width >= safeX;
  const useLeft = !fitsRight && fitsLeft;
  const minY = safeY + height * 0.7;
  const maxY = Math.max(minY, viewerHeight - safeY - height * 0.45);
  const y = clamp(screen.y - radiusScreen * 0.1, minY, maxY);

  if (useLeft) {
    const x = clamp(anchorLeft, safeX + width, viewerWidth - safeX);
    return {
      x,
      y,
      width,
      height,
      textAnchor: "right",
      box: {
        left: x - width - safeX * 0.35,
        top: y - height * 0.7 - safeY,
        right: x + safeX * 0.35,
        bottom: y + height * 0.45 + safeY,
      },
    };
  }

  const maxStartX = Math.max(safeX, viewerWidth - safeX - width);
  const x = clamp(anchorRight, safeX, maxStartX);
  return {
    x,
    y,
    width,
    height,
    textAnchor: "left",
    box: {
      left: x - safeX * 0.35,
      top: y - height * 0.7 - safeY,
      right: x + width + safeX * 0.35,
      bottom: y + height * 0.45 + safeY,
    },
  };
}

function buildPlanetLabelEntry(item, metrics, density = planetLabelDensityConfig(metrics, 1)) {
  const screen = imagePxToScreen(item.x * state.imageWidth, item.y * state.imageHeight);
  if (!screen) return null;
  const visual = planetDotVisual(item, metrics);
  const radiusScreen = Math.max(1.8, visual.radius * metrics.screenScale);
  const layout = resolvePlanetLabelLayout(screen, radiusScreen, item.name, density);
  const imageAnchor = layout ? screenPxToImage(layout.x, layout.y) : null;
  if (!layout) return null;
  const viewerCenterX = (osdViewerEl.clientWidth || 0) * 0.5;
  const viewerCenterY = (osdViewerEl.clientHeight || 0) * 0.5;
  return {
    item,
    dotScreenX: screen.x,
    dotScreenY: screen.y,
    labelScreenX: layout.x,
    labelScreenY: layout.y,
    labelImageX: imageAnchor?.x ?? null,
    labelImageY: imageAnchor?.y ?? null,
    labelTextAnchor: layout.textAnchor,
    labelBox: layout.box,
    radiusScreen,
    priority: planetLabelPriority(item),
    centerDistanceSq: (screen.x - viewerCenterX) ** 2 + (screen.y - viewerCenterY) ** 2,
  };
}

function estimatePlanetLabelBox(entry, fontSize, density) {
  if (entry?.labelBox) return entry.labelBox;
  const width = Math.max(fontSize * 2.2, entry.item.name.length * fontSize * 0.58 + 8);
  const height = fontSize * 1.2;
  return {
    left: entry.labelScreenX - density.padX * 0.5,
    top: entry.labelScreenY - height * 0.7 - density.padY,
    right: entry.labelScreenX + width + density.padX * 0.5,
    bottom: entry.labelScreenY + height * 0.45 + density.padY,
  };
}

function boxesOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function getTiledImage() {
  if (!state.viewer || !state.viewer.world || state.viewer.world.getItemCount() < 1) return null;
  return state.viewer.world.getItemAt(0);
}

function imagePxToScreen(x, y) {
  const tiledImage = getTiledImage();
  if (!tiledImage || !state.viewer) return null;
  const viewportPoint = tiledImage.imageToViewportCoordinates(x, y);
  const pixelPoint = state.viewer.viewport.pixelFromPoint(viewportPoint, true);
  return { x: pixelPoint.x, y: pixelPoint.y };
}

function screenPxToImage(x, y) {
  const tiledImage = getTiledImage();
  if (!tiledImage || !state.viewer) return null;
  const viewportPoint = state.viewer.viewport.pointFromPixel(new OpenSeadragon.Point(x, y), true);
  const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint);
  return {
    x: imagePoint.x,
    y: imagePoint.y,
  };
}

function guidePxToImage(pxX, pxY) {
  return {
    x: (Number(pxX || 0) / CALIBRATION_BASE_WIDTH) * state.imageWidth,
    y: (Number(pxY || 0) / CALIBRATION_BASE_HEIGHT) * state.imageHeight,
  };
}

function ensureScreenOverlayCanvas() {
  if (state.screenOverlayCanvas) return;
  const canvas = document.createElement("canvas");
  canvas.className = "map-screen-overlay";
  canvas.setAttribute("aria-hidden", "true");
  osdViewerEl.appendChild(canvas);
  state.screenOverlayCanvas = canvas;
  state.screenOverlayCtx = canvas.getContext("2d");
}

function resizeScreenOverlayCanvas() {
  if (!state.screenOverlayCanvas) return;
  const width = Math.max(1, osdViewerEl.clientWidth || 1);
  const height = Math.max(1, osdViewerEl.clientHeight || 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(width * dpr);
  const targetHeight = Math.round(height * dpr);
  if (state.screenOverlayCanvas.width !== targetWidth || state.screenOverlayCanvas.height !== targetHeight) {
    state.screenOverlayCanvas.width = targetWidth;
    state.screenOverlayCanvas.height = targetHeight;
  }
  state.screenOverlayCanvas.style.width = `${width}px`;
  state.screenOverlayCanvas.style.height = `${height}px`;
}

function scheduleOverlayRender() {
  if (state.overlayRenderQueued) return;
  state.viewerBusy = true;
  if (state.overlaySettleTimer) {
    window.clearTimeout(state.overlaySettleTimer);
  }
  state.overlayRenderQueued = true;
  requestAnimationFrame(() => {
    state.overlayRenderQueued = false;
    renderStaticCanvasOverlay();
    renderDynamicOverlay();
  });
  state.overlaySettleTimer = window.setTimeout(() => {
    state.viewerBusy = false;
    renderOverlay();
  }, state.isMobileView ? 150 : 90);
}

function sourceLabel(item) {
  if (item?.kind === "sectorArmy") return "Sektorarmee";
  if (item?.kind === "strategicAsset") return "Strategische Reserve";
  if (item.kind === "route") return "Hyperraumroute";
  if (item.kind === "faction") return "Fraktion";
  if (item.kind === "saved" && item.approximate) return "Fraktionsdaten";
  if (item.kind === "saved") return "Kalibrierte Daten";
  if (item.kind === "review") return "Review-Daten";
  return "Planetendaten";
}

function detailSourceText(item) {
  if (isSectorArmyLayerItem(item)) {
    return "Sektorarmeen & Flottenlage";
  }
  if (item?.kind === "faction") {
    return "Wookieepedia / Klonkriegsprofil";
  }
  if (item?.kind === "route" && item.source_url) {
    try {
      return new URL(item.source_url).hostname.replace(/^www\./i, "");
    } catch (_error) {
      return item.source_url;
    }
  }
  return sourceLabel(item);
}

function searchItemMetaText(item) {
  if (item?.kind === "sectorArmy") {
    const army = item.army || {};
    return `${sectorArmyDisplayStatus(army, item.territory)} - Rep ${formatFleetNumber(army.republic?.total)} / KUS ${formatFleetNumber(
      army.cis?.total
    )}`;
  }
  if (item?.kind === "strategicAsset") {
    const faction = item.asset?.faction === "cis" ? "KUS" : "Republik";
    return `${faction} - ${item.asset?.locationHint || "Strategische Reserve"}`;
  }
  if (item?.kind === "route") {
    return `${sourceLabel(item)} - ${Number(item.route_planet_count || 0)} Planeten`;
  }
  if (item?.kind === "faction") {
    return `${sourceLabel(item)} - ${Number(item.controlled_planets || 0)} Planeten`;
  }
  const grid = normalizeGridLabel(item?.grid) || guessGridFromPoint(item?.x, item?.y) || "-";
  return `${grid} - ${sourceLabel(item)}`;
}

function mergePlanetRecord(base, overrides = {}) {
  const merged = {
    ...base,
    ...overrides,
  };
  merged.grid = normalizeGridLabel(merged.grid) || guessGridFromPoint(merged.x, merged.y);
  merged.nameKey = normalizeNameKey(merged.name);
  merged.region = merged.region || base?.region || "Unknown";
  merged.terrain = merged.terrain || base?.terrain || "Unbekannt";
  merged.desc = merged.desc || base?.desc || "Keine Beschreibung vorhanden.";
  merged.kind = merged.kind || "known";
  merged.decision = merged.decision || (merged.kind === "review" ? "review" : "saved");
  return applyPlanetEnrichments(merged);
}

function buildKnownIndex() {
  PLANETS.forEach((planet) => {
    const record = mergePlanetRecord(planet, { kind: "known" });
    state.knownByKey.set(record.nameKey, record);
  });
}

function getKnownPlanet(name) {
  return state.knownByKey.get(normalizeNameKey(name)) || null;
}

function getRoutePlanet(name) {
  const key = normalizeNameKey(name);
  const resolvedName = ROUTE_PLANET_ALIASES[key] || name;
  const resolvedKey = normalizeNameKey(resolvedName);
  return (
    state.savedByKey.get(key) ||
    state.knownByKey.get(key) ||
    state.savedByKey.get(resolvedKey) ||
    state.knownByKey.get(resolvedKey) ||
    null
  );
}

function vectorPathPointsFromAnchors(anchors, tension = 0.78) {
  const normalizedAnchors = anchors.map((point) => normalizePoint01(point)).filter(Boolean);
  if (normalizedAnchors.length < 2) return [];

  const points = normalizedAnchors.map((anchor, index) => ({
    anchor,
    in: { ...anchor },
    out: { ...anchor },
    mode: index === 0 || index === normalizedAnchors.length - 1 ? "corner" : "smooth",
  }));

  const handleScale = clamp(Number(tension) || 0.78, 0, 1.4) / 6;
  for (let index = 0; index < normalizedAnchors.length - 1; index += 1) {
    const p0 = normalizedAnchors[index - 1] || normalizedAnchors[index];
    const p1 = normalizedAnchors[index];
    const p2 = normalizedAnchors[index + 1];
    const p3 = normalizedAnchors[index + 2] || normalizedAnchors[index + 1];

    points[index].out = {
      x: clamp01(p1.x + (p2.x - p0.x) * handleScale),
      y: clamp01(p1.y + (p2.y - p0.y) * handleScale),
    };
    points[index + 1].in = {
      x: clamp01(p2.x - (p3.x - p1.x) * handleScale),
      y: clamp01(p2.y - (p3.y - p1.y) * handleScale),
    };
  }

  return points;
}

function buildHyperspaceRouteVectorPath(route, index) {
  const fallbackId = `hyperspace-route-${index + 1}`;
  const storedPath = normalizeStoredVectorPath(route?.vector_path);
  if (storedPath) {
    return {
      ...storedPath,
      id: route?.id || storedPath.id || fallbackId,
      layer_id: route?.layer_id || route?.id || storedPath.layer_id || fallbackId,
      name: route?.name || storedPath.name || fallbackId,
      closed: false,
      draft: false,
      opacity_pct: Number(storedPath.opacity_pct ?? route?.opacity_pct ?? 96),
      path_kind: "hyperspace-route",
      stroke_tone: route?.stroke_tone || storedPath.stroke_tone || "#ffffff",
      label_anchor: normalizePoint01(route?.label_anchor) || storedPath.label_anchor,
      label_rotation_deg: Number(route?.label_rotation_deg ?? storedPath.label_rotation_deg ?? 0),
      label_font_scale: Number(route?.label_font_scale ?? storedPath.label_font_scale ?? 1),
      source_url: route?.source_url || storedPath.source_url || "",
      route_id: route?.id || storedPath.route_id || fallbackId,
      route_planets: Array.isArray(route?.planets)
        ? route.planets.map((name) => String(name))
        : storedPath.route_planets,
    };
  }

  const routePlanets = [];
  const seen = new Set();
  (Array.isArray(route?.planets) ? route.planets : []).forEach((name) => {
    const item = getRoutePlanet(name);
    if (!item || seen.has(item.nameKey)) return;
    seen.add(item.nameKey);
    routePlanets.push(item);
  });

  if (routePlanets.length < 2) return null;

  const points = vectorPathPointsFromAnchors(
    routePlanets.map((item) => ({ x: item.x, y: item.y })),
    route?.tension
  );
  if (points.length < 2) return null;

  return {
    id: route?.id || fallbackId,
    layer_id: route?.layer_id || route?.id || fallbackId,
    name: route?.name || fallbackId,
    closed: false,
    draft: false,
    opacity_pct: Number(route?.opacity_pct ?? 96),
    path_kind: "hyperspace-route",
    stroke_tone: route?.stroke_tone || "#ffffff",
    label_anchor: normalizePoint01(route?.label_anchor),
    label_rotation_deg: Number(route?.label_rotation_deg || 0),
    label_font_scale: Number(route?.label_font_scale || 1),
    source_url: route?.source_url || "",
    route_id: route?.id || fallbackId,
    route_planets: routePlanets.map((item) => item.name),
    points,
  };
}

function rebuildVectorPaths() {
  const basePaths = Array.isArray(state.baseVectorPaths) ? state.baseVectorPaths : [];
  const hyperspacePaths = (Array.isArray(state.hyperspaceRouteDefs) ? state.hyperspaceRouteDefs : [])
    .map((route, index) => buildHyperspaceRouteVectorPath(route, index))
    .filter(Boolean);
  state.vectorPaths = [...basePaths, ...hyperspacePaths];
  state.routeByKey = new Map(buildSelectableRouteItems().map((route) => [route.nameKey, route]));
  state.travelGraph = null;
  invalidateStaticOverlay();
}

function reviewCandidatesArray() {
  return Array.from(state.reviewByKey.values());
}

function savedPlanetsArray() {
  return Array.from(state.savedByKey.values());
}

function allSearchItems() {
  const merged = new Map();
  visibleRenderableMapItems().forEach((item) => merged.set(item.nameKey, item));
  visibleFactionItems().forEach((item) => merged.set(item.nameKey, item));
  visibleRouteItems().forEach((item) => merged.set(item.nameKey, item));
  visibleSectorArmyItems().forEach((item) => merged.set(item.nameKey, item));
  visibleStrategicFleetAssetItems().forEach((item) => merged.set(item.nameKey, item));
  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function mapItemSearchText(item) {
  if (!item) return "";
  if (item.kind === "sectorArmy") {
    return [
      item.name,
      item.shortName,
      sectorArmyDisplayStatus(item.army, item.territory),
      ...(item.territory?.anchorPlanets || []),
    ]
      .map(normalizeNameKey)
      .filter(Boolean)
      .join(" ");
  }
  if (item.kind === "strategicAsset") {
    return [item.name, item.asset?.faction, item.asset?.locationHint, ...Object.keys(item.asset?.assets || {})]
      .map(normalizeNameKey)
      .filter(Boolean)
      .join(" ");
  }
  const aliases = state.planetAliasesByTarget.get(item.nameKey) || [];
  return [item.name, ...aliases].map(normalizeNameKey).filter(Boolean).join(" ");
}

function visibleReviewCandidates() {
  const labels = new Set(gridNeighbors(state.currentGrid, 0));
  return reviewCandidatesArray()
    .filter((item) => state.showRejected || item.decision !== "reject")
    .filter((item) => labels.has(normalizeGridLabel(item.grid) || guessGridFromPoint(item.x, item.y)))
    .sort((a, b) => {
      const scoreA = Number(a.review_confidence || a.conf || 0);
      const scoreB = Number(b.review_confidence || b.conf || 0);
      return scoreB - scoreA;
    });
}

function contextItems() {
  const labels = new Set(gridNeighbors(state.currentGrid, 1));
  const merged = new Map();
  state.knownByKey.forEach((item, key) => {
    if (labels.has(normalizeGridLabel(item.grid))) merged.set(key, item);
  });
  state.savedByKey.forEach((item, key) => {
    if (labels.has(normalizeGridLabel(item.grid))) merged.set(key, item);
  });
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function getSelectableItemByKey(key) {
  if (!key) return null;
  return (
    state.routeByKey.get(key) ||
    ensureFactionItems().get(key) ||
    sectorArmyItemByKey(key) ||
    strategicFleetAssetItemByKey(key) ||
    state.savedByKey.get(key) ||
    state.knownByKey.get(key) ||
    null
  );
}

function selectedDetailItem() {
  return getSelectableItemByKey(state.selectedDetailKey);
}

function selectedFactionItem() {
  const item = getSelectableItemByKey(state.selectedFactionKey);
  return item?.kind === "faction" ? item : null;
}

function primarySelectedItem() {
  return selectedDetailItem() || selectedFactionItem() || null;
}

function hoveredItem() {
  return getSelectableItemByKey(state.hoveredKey);
}

function setSelectedDetail(item) {
  state.selectedDetailKey = item ? item.nameKey : null;
  if (
    state.three.mode === "orbit" &&
    (!item || item.kind === "route" || item.kind === "faction" || item.nameKey !== state.three.orbitItemKey)
  ) {
    exitThreeOrbitMode(true);
  }
  if (state.isMobileView) {
    if (item && itemHasDetails(item)) {
      setMobilePanel("planetDetail");
    } else if (!item) {
      setMobilePanel(null);
    }
  } else if (item && itemHasDetails(item)) {
    // Auf Desktop das Planeten-Fenster automatisch oeffnen damit Orbit-
    // und Stadt-Bild direkt sichtbar sind, ohne dass der User extra den
    // "Planeten"-Launcher anklicken muss.
    setDesktopWindowVisible("planetDetail", true);
  }
  renderSidebar();
  renderOverlay();
  syncThreeInteractionState();
  persistSession();
}

function setSelectedFaction(item) {
  state.selectedFactionKey = item ? item.nameKey : null;
  if (item && state.three.mode === "orbit") {
    exitThreeOrbitMode(true);
  }
  if (state.isMobileView) {
    if (item && itemHasDetails(item)) {
      setMobilePanel("detail");
    } else if (!item && state.mobilePanel === "detail") {
      setMobilePanel(null);
    }
  } else if (item && itemHasDetails(item)) {
    setDesktopWindowVisible("detail", true);
  }
  renderSidebar();
  renderOverlay();
  syncThreeInteractionState();
  persistSession();
}

function selectMapItem(item) {
  if (!item) return;
  if (item.kind !== "route" && item.kind !== "faction" && !isSectorArmyLayerItem(item) && !itemHasGeneratedProfile(item)) {
    void ensurePlanetProfilesLoaded();
  }
  if (item.kind === "faction") {
    setSelectedFaction(item);
    return;
  }
  setSelectedDetail(item);
}

function setHovered(item) {
  const nextKey = item ? item.nameKey : null;
  if (state.hoveredKey === nextKey) return;
  state.hoveredKey = nextKey;
  osdViewerEl.classList.toggle("desktop-point-hover", Boolean(nextKey) && !state.isMobileView);
  if (threeViewerEl) {
    threeViewerEl.classList.toggle("is-hovered", state.viewMode === "3d" && Boolean(nextKey));
  }
  renderDynamicOverlay();
  updateFactionFragmentInteractionState();
  syncThreeInteractionState();
}

function createOverlayPlane() {
  ensureScreenOverlayCanvas();
  resizeScreenOverlayCanvas();
  state.htmlOverlay = state.viewer.htmlOverlay({ scale: state.imageWidth });
  state.overlayRoot = state.htmlOverlay.element();
  state.overlayRoot.style.zIndex = "2";
  state.overlayRoot.style.pointerEvents = "none";
  state.overlayPlane = document.createElement("div");
  state.overlayPlane.className = "overlay-plane";
  state.overlayPlane.style.width = `${state.imageWidth}px`;
  state.overlayPlane.style.height = `${state.imageHeight}px`;
  state.overlaySvg = document.createElementNS(SVG_NS, "svg");
  state.overlaySvg.setAttribute("class", "map-data-overlay");
  state.overlaySvg.setAttribute("width", `${state.imageWidth}`);
  state.overlaySvg.setAttribute("height", `${state.imageHeight}`);
  state.overlaySvg.setAttribute("viewBox", `0 0 ${state.imageWidth} ${state.imageHeight}`);
  state.overlaySvg.setAttribute("aria-hidden", "true");
  state.overlayPlane.appendChild(state.overlaySvg);

  state.overlayDynamic = document.createElement("div");
  state.overlayDynamic.className = "overlay-dynamic";
  state.overlayPlane.appendChild(state.overlayDynamic);

  state.overlayRoot.appendChild(state.overlayPlane);
}

function resetOverlayPlane() {
  if (!state.overlayPlane) return;
  if (state.overlaySvg) state.overlaySvg.innerHTML = "";
  if (state.overlayDynamic) state.overlayDynamic.innerHTML = "";
}

function makeGridBox(label, tone) {
  const bounds = gridBoundsPx(label);
  if (!bounds) return null;
  const box = document.createElement("div");
  box.className = `grid-box ${tone}`;
  box.style.left = `${bounds.left}px`;
  box.style.top = `${bounds.top}px`;
  box.style.width = `${bounds.width}px`;
  box.style.height = `${bounds.height}px`;
  box.dataset.grid = label;

  const badge = document.createElement("div");
  badge.className = "grid-badge";
  badge.textContent = label;
  box.appendChild(badge);
  return box;
}

function svgPathFromVectorPath(path) {
  const points = Array.isArray(path?.points) ? path.points : [];
  if (points.length < 2 || !state.imageWidth || !state.imageHeight) return "";

  const pointXY = (point, key) => {
    const source = point?.[key] || point?.anchor || { x: 0, y: 0 };
    return {
      x: Number(source.x || 0) * state.imageWidth,
      y: Number(source.y || 0) * state.imageHeight,
    };
  };

  const start = pointXY(points[0], "anchor");
  const commands = [`M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`];
  const segmentCount = path?.closed ? points.length : points.length - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const control1 = pointXY(current, "out");
    const control2 = pointXY(next, "in");
    const anchor = pointXY(next, "anchor");
    commands.push(
      `C ${control1.x.toFixed(2)} ${control1.y.toFixed(2)} ${control2.x.toFixed(2)} ${control2.y.toFixed(
        2
      )} ${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)}`
    );
  }

  if (path?.closed) commands.push("Z");
  return commands.join(" ");
}

function vectorPathStrokeWidth(path, metrics) {
  if (path?.name === "Grid") return metrics.guideStroke;
  if (isMainHyperspaceRoutePath(path)) {
    return clamp(metrics.mainRouteScreenWidth / Math.max(metrics.screenScale, 0.001), 0.8, 24);
  }
  if (isSideHyperspaceRoutePath(path)) {
    return clamp(metrics.sideRouteScreenWidth / Math.max(metrics.screenScale, 0.001), 0.55, 18);
  }
  return metrics.rimStroke;
}

function vectorPathStrokeOpacity(path, opacityBase) {
  if (isMainHyperspaceRoutePath(path)) return clamp(opacityBase * 0.54, 0.16, 0.68);
  return path?.name === "Grid" ? opacityBase * 0.74 : opacityBase * 0.88;
}

function vectorPathLabelData(path, metrics) {
  const isPersistentLabel = hasPersistentPathLabel(path);
  if (!metrics.showPathLabels && !isPersistentLabel) return null;

  const labelText = String(path?.label || path?.name || "").trim();
  if (!labelText) return null;

  const labelAnchor = normalizePoint01(path?.label_anchor);
  const fontScale = clamp(Number(path?.label_font_scale || 1), 0.55, 2);
  const fontSize = metrics.pathLabelSize * fontScale;

  if (isPersistentLabel && String(path?.path_kind || "").trim() === "hyperspace-route") {
    const routeSamples = vectorPathImageSamples(path);
    const fallbackPoint = routeSamples[Math.floor(routeSamples.length / 2)] || routeSamples[0] || {
      x: (labelAnchor?.x || 0.5) * state.imageWidth,
      y: (labelAnchor?.y || 0.5) * state.imageHeight,
    };
    const anchorImage = labelAnchor
      ? { x: labelAnchor.x * state.imageWidth, y: labelAnchor.y * state.imageHeight }
      : fallbackPoint;
    const projected = nearestPointOnPolyline(routeSamples, anchorImage.x, anchorImage.y) || {
      ...fallbackPoint,
      tangentX: 1,
      tangentY: 0,
    };
    const tangentLength = Math.hypot(projected.tangentX || 0, projected.tangentY || 0) || 1;
    const normalX = -projected.tangentY / tangentLength;
    const normalY = projected.tangentX / tangentLength;
    const sideHint = labelAnchor
      ? Math.sign((anchorImage.x - projected.x) * normalX + (anchorImage.y - projected.y) * normalY) || 1
      : 1;
    const offsetPx = clamp(7 / Math.max(metrics.screenScale, 0.001), 5, 22);
    const rotationDeg = Number(path?.label_rotation_deg || 0) || (Math.atan2(projected.tangentY, projected.tangentX) * 180) / Math.PI;
    return {
      text: labelText,
      x: clamp(projected.x + normalX * offsetPx * sideHint, 0, state.imageWidth),
      y: clamp(projected.y + normalY * offsetPx * sideHint, 0, state.imageHeight),
      fontSize,
      rotationDeg,
      textAnchor: "middle",
      dominantBaseline: "middle",
    };
  }

  if (labelAnchor) {
    return {
      text: labelText,
      x: labelAnchor.x * state.imageWidth,
      y: labelAnchor.y * state.imageHeight,
      fontSize,
      rotationDeg: Number(path?.label_rotation_deg || 0),
      textAnchor: "middle",
      dominantBaseline: "middle",
    };
  }

  const firstAnchor = normalizePoint01(path?.points?.[0]?.anchor) || { x: 0, y: 0 };
  return {
    text: labelText,
    x: firstAnchor.x * state.imageWidth + metrics.rimStroke * 3,
    y: firstAnchor.y * state.imageHeight - metrics.rimStroke * 2,
    fontSize,
    rotationDeg: 0,
    textAnchor: "start",
    dominantBaseline: "auto",
  };
}

function gridGuideSegments(guide) {
  if (!guide) return [];
  const segments = [];
  if (guide.kind === "line-grid") {
    const vertical = guide.vertical_line || {};
    const horizontal = guide.horizontal_line || {};
    const spacingX = Number(guide.spacing_x_px || 0);
    const spacingY = Number(guide.spacing_y_px || 0);
    const copiesX = Number(guide.copies_x || 0);
    const copiesY = Number(guide.copies_y || 0);
    for (let index = 0; index <= copiesX; index += 1) {
      segments.push({
        axis: "vertical",
        index,
        start: [
          Number((vertical.start_px || [0, 0])[0]) + index * spacingX,
          Number((vertical.start_px || [0, 0])[1]),
        ],
        end: [
          Number((vertical.end_px || [0, 0])[0]) + index * spacingX,
          Number((vertical.end_px || [0, 0])[1]),
        ],
      });
    }
    for (let index = 0; index <= copiesY; index += 1) {
      segments.push({
        axis: "horizontal",
        index,
        start: [
          Number((horizontal.start_px || [0, 0])[0]),
          Number((horizontal.start_px || [0, 0])[1]) + index * spacingY,
        ],
        end: [
          Number((horizontal.end_px || [0, 0])[0]),
          Number((horizontal.end_px || [0, 0])[1]) + index * spacingY,
        ],
      });
    }
  }
  return segments;
}

function drawCanvasBezierPath(ctx, path) {
  const points = Array.isArray(path?.points) ? path.points : [];
  if (points.length < 2 || !state.imageWidth || !state.imageHeight) return;

  const pointXY = (point, key) => {
    const source = point?.[key] || point?.anchor || { x: 0, y: 0 };
    return imagePxToScreen(Number(source.x || 0) * state.imageWidth, Number(source.y || 0) * state.imageHeight);
  };

  const start = pointXY(points[0], "anchor");
  if (!start) return;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  const segmentCount = path?.closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const control1 = pointXY(current, "out");
    const control2 = pointXY(next, "in");
    const anchor = pointXY(next, "anchor");
    if (!control1 || !control2 || !anchor) continue;
    ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, anchor.x, anchor.y);
  }

  if (path?.closed) ctx.closePath();
}

function drawCanvasText(ctx, text, x, y, options = {}) {
  const {
    fontSize = 12,
    align = "left",
    baseline = "middle",
    fill = "rgba(241, 247, 255, 0.94)",
    stroke = "rgba(4, 14, 23, 0.94)",
    strokeWidth = 3,
    weight = 600,
    rotationDeg = 0,
  } = options;
  ctx.save();
  ctx.translate(x, y);
  if (rotationDeg) {
    ctx.rotate((rotationDeg * Math.PI) / 180);
  }
  ctx.font = `${weight} ${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = "round";
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function renderStaticCanvasOverlay() {
  if (!state.screenOverlayCanvas || !state.screenOverlayCtx || !state.viewer || !state.imageWidth || !state.imageHeight) {
    return;
  }

  const metrics = currentOverlayMetrics();
  const bounds = viewportImageBounds(Math.max(96, state.imageWidth * 0.015));
  const labelBounds = viewportImageBounds(0);
  const factionFragments = visibleFactionFragments(ensureFactionFragments());
  const overlayKey = `${state.staticOverlayVersion}|${mapFilterSignature()}|${metrics.signature}|${state.showRejected ? 1 : 0}|${state.currentGrid}|${overlayBoundsSignature(
    bounds
  )}|labels:${overlayBoundsSignature(labelBounds)}`;
  if (state.lastCanvasOverlayKey === overlayKey && !state.viewerBusy) {
    return;
  }
  state.lastCanvasOverlayKey = overlayKey;

  resizeScreenOverlayCanvas();
  const ctx = state.screenOverlayCtx;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = state.screenOverlayCanvas.width / dpr;
  const height = state.screenOverlayCanvas.height / dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, state.screenOverlayCanvas.width, state.screenOverlayCanvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const screenGuideWidth = Math.max(0.9, metrics.guideStroke * metrics.screenScale);
  const screenDotStroke = Math.max(0.75, metrics.dotStroke * metrics.screenScale);

  factionFragments
    .filter((fragment) => fragmentInBounds(fragment, bounds))
    .forEach((fragment) => {
      const center = imagePxToScreen(fragment.cx, fragment.cy);
      if (!center) return;
      const scale = metrics.screenScale;
      drawGradientEllipse(
        ctx,
        center.x,
        center.y,
        fragment.ambientRx * scale,
        fragment.ambientRy * scale,
        fragment.angleRad,
        buildFactionGradientStops(fragment.faction, "ambient")
      );
      drawGradientEllipse(
        ctx,
        center.x,
        center.y,
        fragment.coreRx * scale,
        fragment.coreRy * scale,
        fragment.angleRad,
        buildFactionGradientStops(fragment.faction, "core")
      );
      drawFactionBannerCanvas(ctx, {
        ...fragment,
        cx: center.x,
        cy: center.y,
        bannerSize: fragment.bannerSize * scale,
      });
    });

  state.gridGuides.forEach((guide) => {
    gridGuideSegments(guide).forEach((segment) => {
      const startImage = guidePxToImage(segment.start[0], segment.start[1]);
      const endImage = guidePxToImage(segment.end[0], segment.end[1]);
      const start = imagePxToScreen(startImage.x, startImage.y);
      const end = imagePxToScreen(endImage.x, endImage.y);
      if (!start || !end) return;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineCap = "round";
      ctx.lineWidth = screenGuideWidth;
      ctx.strokeStyle = segment.axis === "horizontal" ? "rgba(255, 233, 170, 0.26)" : "rgba(147, 245, 238, 0.42)";
      ctx.stroke();
    });
  });

  state.gridGuides.forEach((guide) => {
    gridGuideSegments(guide).forEach((segment) => {
      const startImage = guidePxToImage(segment.start[0], segment.start[1]);
      const endImage = guidePxToImage(segment.end[0], segment.end[1]);
      const start = imagePxToScreen(startImage.x, startImage.y);
      const end = imagePxToScreen(endImage.x, endImage.y);
      if (!start || !end) return;
      const label = gridLineLabel(segment.axis, segment.index);
      if (segment.axis === "vertical") {
        drawCanvasText(ctx, label, start.x, start.y + 10, {
          fontSize: metrics.screenAxisLabelSize,
          align: "center",
          baseline: "top",
        });
        drawCanvasText(ctx, label, end.x, end.y - 10, {
          fontSize: metrics.screenAxisLabelSize,
          align: "center",
          baseline: "bottom",
        });
      } else {
        drawCanvasText(ctx, label, start.x + 10, start.y, {
          fontSize: metrics.screenAxisLabelSize,
          align: "left",
          baseline: "middle",
        });
        drawCanvasText(ctx, label, end.x - 10, end.y, {
          fontSize: metrics.screenAxisLabelSize,
          align: "right",
          baseline: "middle",
        });
      }
    });
  });

  visibleVectorPaths().forEach((path) => {
    const stroke = layerStrokeColor(path);
    const opacityBase = clamp(Number(path.opacity_pct || 100) / 100, 0.18, 1);
    const strokeWidth = vectorPathStrokeWidth(path, metrics);
    const strokeOpacity = vectorPathStrokeOpacity(path, opacityBase);
    ctx.save();
    drawCanvasBezierPath(ctx, path);
    if (path.closed && path.fill_tone) {
      ctx.fillStyle = hexToRgba(path.fill_tone, opacityBase * 0.18);
      ctx.fill();
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = path?.name === "Grid" ? screenGuideWidth : Math.max(1, strokeWidth * metrics.screenScale);
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = strokeOpacity;
    ctx.stroke();
    ctx.restore();

    const label = vectorPathLabelData(path, metrics);
    if (label) {
      const screen = imagePxToScreen(label.x, label.y);
      if (screen) {
        drawCanvasText(ctx, label.text, screen.x, screen.y, {
          fontSize: Math.max(8, label.fontSize * metrics.screenScale),
          align: label.textAnchor === "middle" ? "center" : label.textAnchor,
          baseline: label.dominantBaseline === "middle" ? "middle" : "alphabetic",
          strokeWidth: Math.max(2.25, metrics.imageTextOutlineWidth * metrics.screenScale),
          rotationDeg: label.rotationDeg,
        });
      }
    }
  });

  const isUnderworld = state.mapMode === "underworld";
  visibleRenderableMapItems()
    .filter((item) => {
      if (!bounds) return true;
      const { x, y } = itemImagePosition(item);
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    })
    .sort((a, b) => itemSelectionWeight(b) - itemSelectionWeight(a))
    .forEach((item) => {
      const screen = imagePxToScreen(item.x * state.imageWidth, item.y * state.imageHeight);
      if (!screen) return;
      const visual = planetDotVisual(item, metrics);
      const radius = Math.max(1.8, visual.radius * metrics.screenScale);
      const inCurrentGrid = normalizeGridLabel(item.grid) === state.currentGrid;
      // Im Underworld-Modus werden Welten ohne Underworld-Fraktion stark gedimmt,
      // damit die Fraktionsplaneten visuell hervortreten.
      const dimNonFaction = isUnderworld && !item.faction;
      const fillOpacity = dimNonFaction ? visual.fillOpacity * 0.18 : visual.fillOpacity;
      const strokeOpacity = dimNonFaction
        ? visual.strokeOpacity * 0.18
        : (inCurrentGrid ? Math.min(1, visual.strokeOpacity + 0.12) : visual.strokeOpacity);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = visual.fill;
      ctx.globalAlpha = fillOpacity;
      ctx.fill();
      ctx.lineWidth = screenDotStroke;
      ctx.strokeStyle = visual.stroke;
      ctx.globalAlpha = strokeOpacity;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (itemHasPlanetEvent(item)) {
        drawCanvasEventFlame(ctx, screen.x, screen.y, radius, metrics);
      }
    });

  const labelEntries = visiblePlanetLabelItems(labelBounds, metrics);
  const density = planetLabelDensityConfig(metrics, labelEntries.length);
  labelEntries.forEach((entry) => {
    const factionStyle = planetFactionStyle(entry.item);
    drawCanvasText(ctx, entry.item.name, entry.labelScreenX, entry.labelScreenY, {
      fontSize: density.fontSize,
      align: entry.labelTextAnchor === "right" ? "right" : "left",
      baseline: "middle",
      fill: factionStyle?.labelFill || "rgba(245, 249, 255, 0.96)",
    });
  });
}

function planetDotVisual(item, metrics) {
  if (item.kind === "review") {
    if (item.decision === "reject") {
      return {
        radius: metrics.reviewRadius,
        fill: "#ff8d8d",
        fillOpacity: 0.62,
        stroke: "#ffe0e0",
        strokeOpacity: 0.24,
      };
    }
    return {
      radius: metrics.reviewRadius,
      fill: "#7be6de",
      fillOpacity: 0.95,
      stroke: "#dcfffb",
      strokeOpacity: 0.3,
    };
  }
  const factionStyle = planetFactionStyle(item);
  if (factionStyle) {
    return {
      radius: metrics.dotRadius,
      fill: factionStyle.dotFill,
      fillOpacity: factionStyle.dotFillOpacity,
      stroke: factionStyle.dotStroke,
      strokeOpacity: factionStyle.dotStrokeOpacity,
    };
  }
  const neutral = item.kind === "saved" ? NEUTRAL_PLANET_VISUALS.saved : NEUTRAL_PLANET_VISUALS.known;
  return {
    radius: item.kind === "saved" ? metrics.dotRadius : metrics.dotRadius * 0.92,
    fill: neutral.fill,
    fillOpacity: neutral.fillOpacity,
    stroke: neutral.stroke,
    strokeOpacity: neutral.strokeOpacity,
  };
}

function itemHasPlanetEvent(item) {
  return Boolean(String(item?.event_title || item?.event_text || item?.event_image || "").trim());
}

function drawCanvasEventFlame(ctx, x, y, radius, metrics) {
  const size = Math.max(radius * 3.1, metrics?.dotScreenRadius ? metrics.dotScreenRadius * 4.2 : 14);
  const ox = x + radius * 1.42;
  const oy = y - radius * 1.76;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.54, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 68, 34, 0.1)";
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, size * 0.07);
  ctx.strokeStyle = "rgba(255, 221, 135, 0.74)";
  ctx.stroke();
  ctx.shadowColor = "rgba(255, 88, 34, 0.92)";
  ctx.shadowBlur = Math.max(6, size * 0.44);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.58);
  ctx.bezierCurveTo(size * 0.42, -size * 0.22, size * 0.34, size * 0.28, 0, size * 0.52);
  ctx.bezierCurveTo(-size * 0.36, size * 0.26, -size * 0.38, -size * 0.2, 0, -size * 0.58);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 95, 45, 0.96)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(size * 0.02, -size * 0.25);
  ctx.bezierCurveTo(size * 0.22, 0, size * 0.16, size * 0.28, 0, size * 0.42);
  ctx.bezierCurveTo(-size * 0.18, size * 0.22, -size * 0.14, -size * 0.04, size * 0.02, -size * 0.25);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 220, 120, 0.96)";
  ctx.fill();
  ctx.restore();
}

function renderStaticOverlay() {
  if (!state.overlaySvg || !state.imageWidth || !state.imageHeight) return;
  const metrics = currentOverlayMetrics();
  const labelBounds = viewportImageBounds(0);
  const factionFragments = visibleFactionFragments(ensureFactionFragments());
  const overlayKey = `${state.staticOverlayVersion}|${mapFilterSignature()}|${metrics.signature}|${state.showRejected ? 1 : 0}|${state.currentGrid}|${overlayBoundsSignature(
    labelBounds
  )}`;
  if (state.lastStaticOverlayKey === overlayKey) return;
  state.lastStaticOverlayKey = overlayKey;

  const guideMarkup = state.gridGuides
    .flatMap((guide) =>
      gridGuideSegments(guide).map(
        (segment) => `
          <line
            class="guide-line ${segment.axis}"
            x1="${segment.start[0].toFixed(2)}"
            y1="${segment.start[1].toFixed(2)}"
            x2="${segment.end[0].toFixed(2)}"
            y2="${segment.end[1].toFixed(2)}"
            stroke-width="${metrics.guideStroke.toFixed(2)}"
          />
        `
      )
    )
    .join("");

  const axisMarkup = state.gridGuides
    .flatMap((guide) =>
      gridGuideSegments(guide).flatMap((segment) => {
        const startImage = guidePxToImage(segment.start[0], segment.start[1]);
        const endImage = guidePxToImage(segment.end[0], segment.end[1]);
        const label = gridLineLabel(segment.axis, segment.index);
        if (segment.axis === "vertical") {
          return [
            `<text class="axis-label vertical" x="${startImage.x.toFixed(2)}" y="${(startImage.y + metrics.axisLabelFontSize * 1.05).toFixed(
              2
            )}" font-size="${metrics.axisLabelFontSize.toFixed(2)}" stroke-width="${metrics.imageTextOutlineWidth.toFixed(
              2
            )}" text-anchor="middle" dominant-baseline="hanging">${escapeHtml(
              label
            )}</text>`,
            `<text class="axis-label vertical" x="${endImage.x.toFixed(2)}" y="${(endImage.y - metrics.axisLabelFontSize * 0.55).toFixed(
              2
            )}" font-size="${metrics.axisLabelFontSize.toFixed(2)}" stroke-width="${metrics.imageTextOutlineWidth.toFixed(
              2
            )}" text-anchor="middle" dominant-baseline="auto">${escapeHtml(
              label
            )}</text>`,
          ];
        }
        return [
          `<text class="axis-label horizontal" x="${(startImage.x + metrics.axisLabelFontSize * 0.95).toFixed(2)}" y="${startImage.y.toFixed(
            2
          )}" font-size="${metrics.axisLabelFontSize.toFixed(2)}" stroke-width="${metrics.imageTextOutlineWidth.toFixed(
            2
          )}" text-anchor="start" dominant-baseline="middle">${escapeHtml(
            label
          )}</text>`,
          `<text class="axis-label horizontal" x="${(endImage.x - metrics.axisLabelFontSize * 0.95).toFixed(2)}" y="${endImage.y.toFixed(
            2
          )}" font-size="${metrics.axisLabelFontSize.toFixed(2)}" stroke-width="${metrics.imageTextOutlineWidth.toFixed(
            2
          )}" text-anchor="end" dominant-baseline="middle">${escapeHtml(
            label
          )}</text>`,
        ];
      })
    )
    .join("");

  const factionMarkup = buildFactionFragmentSvgMarkup(factionFragments);

  const rimMarkup = visibleVectorPaths()
    .map((path, index) => {
      const d = svgPathFromVectorPath(path);
      if (!d) return "";
      const stroke = layerStrokeColor(path);
      const opacityBase = clamp(Number(path.opacity_pct || 100) / 100, 0.18, 1);
      const strokeOpacity = vectorPathStrokeOpacity(path, opacityBase);
      const strokeWidth = vectorPathStrokeWidth(path, metrics);
      const fillColor = path.fill_tone ? hexToRgba(path.fill_tone, opacityBase * 0.18) : "none";
      const label = vectorPathLabelData(path, metrics);
      return `
        <g class="rim-layer rim-${index}">
          <path
            d="${d}"
            fill="${fillColor}"
            stroke="${stroke}"
            stroke-opacity="${strokeOpacity.toFixed(3)}"
            stroke-width="${strokeWidth.toFixed(2)}"
          />
          ${label
          ? `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" font-size="${label.fontSize.toFixed(
            2
          )}" stroke-width="${metrics.imageTextOutlineWidth.toFixed(2)}" text-anchor="${label.textAnchor}" dominant-baseline="${label.dominantBaseline
          }"${label.rotationDeg ? ` transform="rotate(${label.rotationDeg.toFixed(2)} ${label.x.toFixed(2)} ${label.y.toFixed(2)})"` : ""
          }>${escapeHtml(label.text)}</text>`
          : ""
        }
        </g>
      `;
    })
    .join("");

  const labelEntries = visiblePlanetLabelItems(labelBounds, metrics);
  const labelDensity = planetLabelDensityConfig(metrics, labelEntries.length);
  const svgLabelFontSize = clamp(labelDensity.fontSize / metrics.screenScale, 6, 140);
  const planetLabelMarkup = labelEntries
    .map((entry) => {
      const { item } = entry;
      const { x, y } = itemImagePosition(item);
      const visual = planetDotVisual(item, metrics);
      const factionStyle = planetFactionStyle(item);
      return `
        <text
          class="planet-name-label ${item.kind}"
          x="${Number(entry.labelImageX ?? x + visual.radius + metrics.imageLabelOffsetX).toFixed(2)}"
          y="${Number(entry.labelImageY ?? y - metrics.imageLabelOffsetY).toFixed(2)}"
          font-size="${svgLabelFontSize.toFixed(2)}"
          stroke-width="${metrics.imageTextOutlineWidth.toFixed(2)}"
          fill="${factionStyle?.labelFill || "rgba(245, 249, 255, 0.96)"}"
          text-anchor="${entry.labelTextAnchor === "right" ? "end" : "start"}"
          dominant-baseline="middle"
        >${escapeHtml(item.name)}</text>
      `;
    })
    .join("");

  const planetMarkup = visibleRenderableMapItems()
    .sort((a, b) => itemSelectionWeight(b) - itemSelectionWeight(a))
    .map((item) => {
      const { x, y } = itemImagePosition(item);
      const visual = planetDotVisual(item, metrics);
      const inCurrentGrid = normalizeGridLabel(item.grid) === state.currentGrid;
      return `
        <circle
          class="planet-dot ${item.kind} ${item.decision || ""} ${inCurrentGrid ? "in-grid" : ""}"
          cx="${x.toFixed(2)}"
          cy="${y.toFixed(2)}"
          r="${visual.radius.toFixed(2)}"
          fill="${visual.fill}"
          fill-opacity="${visual.fillOpacity.toFixed(3)}"
          stroke="${visual.stroke}"
          stroke-opacity="${(inCurrentGrid ? visual.strokeOpacity + 0.12 : visual.strokeOpacity).toFixed(3)}"
          stroke-width="${metrics.dotStroke.toFixed(2)}"
        />
      `;
    })
    .join("");

  state.overlaySvg.innerHTML = `
    ${buildFactionFragmentSvgDefs()}
    <g class="layer-faction-fragments">${factionMarkup}</g>
    <g class="layer-grid-guides">${guideMarkup}</g>
    <g class="layer-axis-labels">${axisMarkup}</g>
    <g class="layer-rims">${rimMarkup}</g>
    <g class="layer-planets">${planetMarkup}</g>
    <g class="layer-planet-labels">${planetLabelMarkup}</g>
  `;
}

function makeSelectionMarker(item, metrics, showLabel) {
  const marker = document.createElement("div");
  marker.className = `selection-marker ${item.kind} ${item.decision || ""} ${showLabel ? "" : "compact"}`.trim();
  marker.style.left = `${item.x * state.imageWidth}px`;
  marker.style.top = `${item.y * state.imageHeight}px`;
  marker.style.setProperty("--selection-size", `${Math.round(metrics.selectionRadius * 2)}px`);
  setFactionCssVars(marker, planetFactionStyle(item));

  const ring = document.createElement("span");
  ring.className = "selection-ring";
  marker.appendChild(ring);

  const center = document.createElement("span");
  center.className = "selected-pin-anchor";
  marker.appendChild(center);

  if (showLabel) {
    const badge = document.createElement("span");
    badge.className = "selection-badge";
    badge.textContent = item.name;
    marker.appendChild(badge);
  }

  return marker;
}

function makeHoverMarker(item, metrics) {
  const marker = document.createElement("div");
  marker.className = `hover-marker ${item.kind} ${item.decision || ""}`.trim();
  marker.style.left = `${item.x * state.imageWidth}px`;
  marker.style.top = `${item.y * state.imageHeight}px`;
  marker.style.setProperty("--hover-size", `${Math.round(metrics.dotRadius * 4.4)}px`);
  setFactionCssVars(marker, planetFactionStyle(item));

  const dot = document.createElement("span");
  dot.className = "hover-pin-anchor";
  marker.appendChild(dot);

  const badge = document.createElement("span");
  badge.className = "hover-badge";
  badge.textContent = item.name;
  const hoverLabelScreenSize = clamp(metrics.screenPlanetLabelSize + 2, 10, 22);
  const hoverLabelFontSize = clamp(hoverLabelScreenSize / metrics.screenScale, 8, 72);
  const hoverLabelPadY = clamp((hoverLabelScreenSize * 0.26) / metrics.screenScale, 2.4, 18);
  const hoverLabelPadX = clamp((hoverLabelScreenSize * 0.5) / metrics.screenScale, 5, 28);
  const hoverLabelRadius = clamp((hoverLabelScreenSize * 0.95) / metrics.screenScale, 8, 38);
  const hoverLabelBorderWidth = clamp(1 / metrics.screenScale, 0.7, 3);
  badge.style.fontSize = `${hoverLabelFontSize}px`;
  badge.style.padding = `${hoverLabelPadY}px ${hoverLabelPadX}px`;
  badge.style.borderRadius = `${hoverLabelRadius}px`;
  badge.style.borderWidth = `${hoverLabelBorderWidth}px`;
  marker.appendChild(badge);

  return marker;
}

function makeSearchPulseMarker(item, metrics) {
  const marker = document.createElement("div");
  marker.className = `search-pulse-marker ${item.kind} ${item.decision || ""}`.trim();
  marker.style.left = `${item.x * state.imageWidth}px`;
  marker.style.top = `${item.y * state.imageHeight}px`;
  marker.style.setProperty("--search-pulse-size", `${Math.round(metrics.selectionRadius * 2.8)}px`);
  setFactionCssVars(marker, planetFactionStyle(item));

  const ring = document.createElement("span");
  ring.className = "search-pulse-ring";
  marker.appendChild(ring);

  const core = document.createElement("span");
  core.className = "search-pulse-core";
  marker.appendChild(core);

  const badge = document.createElement("span");
  badge.className = "search-pulse-badge";
  badge.textContent = item.name;
  marker.appendChild(badge);

  return marker;
}

function makeEventMarker(item, metrics) {
  const marker = document.createElement("div");
  marker.className = "event-flame-marker";
  marker.style.left = `${item.x * state.imageWidth}px`;
  marker.style.top = `${item.y * state.imageHeight}px`;
  const eventSize = clamp(metrics.markerRadius * 1.42, 18, 68);
  marker.style.setProperty("--event-size", `${Math.round(eventSize)}px`);

  const pulse = document.createElement("span");
  pulse.className = "event-flame-pulse";
  marker.appendChild(pulse);

  const icon = document.createElement("span");
  icon.className = "event-flame-icon";
  marker.appendChild(icon);

  if (!state.isMobileView && metrics.zoomFactor > 1.75) {
    const label = document.createElement("span");
    label.className = "event-flame-label";
    label.textContent = "Event";
    marker.appendChild(label);
  }

  return marker;
}

function makeRouteHighlightMarkup(item, metrics, variant = "hover") {
  const d = svgPathFromVectorPath(item?.vector_path);
  if (!d) return "";
  const baseWidth = vectorPathStrokeWidth(item.vector_path, metrics);
  const coreWidth = baseWidth * (variant === "selected" ? 2.2 : 1.85);
  const haloWidth = baseWidth * (variant === "selected" ? 3.7 : 3.1);
  const haloOpacity = variant === "selected" ? 0.42 : 0.28;
  const coreOpacity = variant === "selected" ? 0.96 : 0.9;
  const label = vectorPathLabelData(item?.vector_path, metrics);
  const labelStrokeWidth = clamp(metrics.imageTextOutlineWidth * 0.9, 1.1, 14);
  const labelFill = variant === "selected" ? "rgba(112, 201, 255, 0.98)" : "rgba(92, 186, 255, 0.94)";
  const labelStroke = variant === "selected" ? "rgba(12, 48, 81, 0.94)" : "rgba(12, 48, 81, 0.78)";
  return `
    <g class="route-highlight ${variant}">
      <path
        class="route-highlight-halo"
        d="${d}"
        fill="none"
        stroke="rgba(12, 48, 81, ${haloOpacity.toFixed(3)})"
        stroke-width="${haloWidth.toFixed(2)}"
      />
      <path
        class="route-highlight-core"
        d="${d}"
        fill="none"
        stroke="rgba(92, 186, 255, ${coreOpacity.toFixed(3)})"
        stroke-width="${coreWidth.toFixed(2)}"
      />
      ${label
      ? `<text
              class="route-highlight-label"
              x="${label.x.toFixed(2)}"
              y="${label.y.toFixed(2)}"
              fill="${labelFill}"
              stroke="${labelStroke}"
              stroke-width="${labelStrokeWidth.toFixed(2)}"
              font-size="${label.fontSize.toFixed(2)}"
              text-anchor="${label.textAnchor}"
              dominant-baseline="${label.dominantBaseline}"${label.rotationDeg ? ` transform="rotate(${label.rotationDeg.toFixed(2)} ${label.x.toFixed(2)} ${label.y.toFixed(2)})"` : ""
      }
            >${escapeHtml(label.text)}</text>`
      : ""
    }
    </g>
  `;
}

function makeRouteHighlightLayer(entries, metrics) {
  const markup = entries
    .map(({ item, variant }) => makeRouteHighlightMarkup(item, metrics, variant))
    .filter(Boolean)
    .join("");
  if (!markup) return null;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("route-highlight-overlay");
  svg.setAttribute("width", `${state.imageWidth}`);
  svg.setAttribute("height", `${state.imageHeight}`);
  svg.setAttribute("viewBox", `0 0 ${state.imageWidth} ${state.imageHeight}`);
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = markup;
  return svg;
}

function svgPathFromSamples(samples) {
  if (!Array.isArray(samples) || samples.length < 2) return "";
  return samples
    .map((point, index) => {
      const x = (Number(point.x) * state.imageWidth).toFixed(2);
      const y = (Number(point.y) * state.imageHeight).toFixed(2);
      return `${index ? "L" : "M"} ${x} ${y}`;
    })
    .join(" ");
}

function travelOverlaySegments(result) {
  if (Array.isArray(result?.pathSegments) && result.pathSegments.length) {
    return result.pathSegments
      .map((segment) => ({
        kind: segment?.kind === "route" ? "route" : "subspace",
        samplePath: Array.isArray(segment?.samplePath) ? segment.samplePath : [],
      }))
      .filter((segment) => segment.samplePath.length >= 2);
  }

  if (!Array.isArray(result?.samplePath) || result.samplePath.length < 2) {
    return [];
  }

  return [{
    kind: result.mode === "route" ? "route" : "subspace",
    samplePath: result.samplePath,
  }];
}

function travelOverlayStrokeStyle(kind, metrics) {
  const isRoute = kind === "route";
  const strokeWidth = clamp(metrics.rimStroke * (isRoute ? 2.1 : 1.7), 1.4, 26);
  return {
    strokeWidth,
    haloWidth: strokeWidth * 2.2,
    stroke: isRoute ? "rgba(109, 227, 215, 0.98)" : "rgba(229, 185, 109, 0.96)",
    dashArray: isRoute ? "" : `${(strokeWidth * 2.3).toFixed(2)} ${(strokeWidth * 1.35).toFixed(2)}`,
  };
}

function makeTravelPathLayer(result, metrics) {
  const segments = travelOverlaySegments(result);
  if (!segments.length) return null;

  const start = segments[0].samplePath[0];
  const end = segments[segments.length - 1].samplePath[segments[segments.length - 1].samplePath.length - 1];
  const transitionPoints = segments.slice(0, -1).map((segment) => segment.samplePath[segment.samplePath.length - 1]);
  const maxStrokeWidth = segments.reduce((maxWidth, segment) => {
    const style = travelOverlayStrokeStyle(segment.kind, metrics);
    return Math.max(maxWidth, style.strokeWidth);
  }, 1.4);
  const svg = document.createElementNS(SVG_NS, "svg");
  const segmentMarkup = segments.map((segment) => {
    const d = svgPathFromSamples(segment.samplePath);
    if (!d) return "";
    const style = travelOverlayStrokeStyle(segment.kind, metrics);
    return `
      <path
        d="${d}"
        fill="none"
        stroke="rgba(3, 14, 24, 0.78)"
        stroke-width="${style.haloWidth.toFixed(2)}"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="${d}"
        fill="none"
        stroke="${style.stroke}"
        stroke-width="${style.strokeWidth.toFixed(2)}"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${style.dashArray ? `stroke-dasharray="${style.dashArray}"` : ""}
      />
    `;
  }).join("");
  const transitionMarkup = transitionPoints.map((point) => `
      <circle
        cx="${(Number(point.x) * state.imageWidth).toFixed(2)}"
        cy="${(Number(point.y) * state.imageHeight).toFixed(2)}"
        r="${clamp(maxStrokeWidth * 0.7, 2, 11).toFixed(2)}"
        fill="rgba(255, 245, 220, 0.94)"
        stroke="rgba(229, 185, 109, 0.92)"
        stroke-width="${clamp(maxStrokeWidth * 0.16, 0.8, 2.4).toFixed(2)}"
      />
  `).join("");

  svg.classList.add("route-highlight-overlay");
  svg.setAttribute("width", `${state.imageWidth}`);
  svg.setAttribute("height", `${state.imageHeight}`);
  svg.setAttribute("viewBox", `0 0 ${state.imageWidth} ${state.imageHeight}`);
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <g class="travel-path-overlay ${result.mode}">
      ${segmentMarkup}
      ${transitionMarkup}
      <circle
        cx="${(Number(start.x) * state.imageWidth).toFixed(2)}"
        cy="${(Number(start.y) * state.imageHeight).toFixed(2)}"
        r="${clamp(maxStrokeWidth * 0.95, 2.4, 14).toFixed(2)}"
        fill="rgba(229, 185, 109, 0.98)"
        stroke="rgba(255, 247, 224, 0.94)"
        stroke-width="${clamp(maxStrokeWidth * 0.2, 0.8, 2.6).toFixed(2)}"
      />
      <circle
        cx="${(Number(end.x) * state.imageWidth).toFixed(2)}"
        cy="${(Number(end.y) * state.imageHeight).toFixed(2)}"
        r="${clamp(maxStrokeWidth * 0.95, 2.4, 14).toFixed(2)}"
        fill="rgba(109, 227, 215, 0.98)"
        stroke="rgba(236, 250, 248, 0.96)"
        stroke-width="${clamp(maxStrokeWidth * 0.2, 0.8, 2.6).toFixed(2)}"
      />
    </g>
  `;
  return svg;
}

function sectorArmyTooltipLines(item) {
  if (item?.kind === "strategicAsset") {
    const faction = item.asset?.faction === "cis" ? "KUS" : "Republik";
    return [
      item.name,
      `${faction} - ${item.asset?.locationHint || "Strategische Reserve"}`,
      item.asset?.movable ? "beweglich" : "nicht frei beweglich",
    ];
  }
  const army = item?.army || {};
  const status = sectorArmyDisplayStatus(army, item?.territory);
  const republicSummary = sectorFleetComputedSummary(army, "republic");
  const cisSummary = sectorFleetComputedSummary(army, "cis");
  return [
    sectorArmyDisplayTitle(army),
    status,
    `Rep ${formatFleetNumber(republicSummary.total)} / frei ${formatFleetNumber(republicSummary.free)} - KUS ${formatFleetNumber(
      cisSummary.total
    )} / frei ${formatFleetNumber(cisSummary.free)}`,
  ];
}

function makeSectorArmyTooltipMarkup(item, metrics) {
  if (!item) return "";
  const lines = sectorArmyTooltipLines(item).filter(Boolean).slice(0, 3);
  const fontSize = clamp(11 / Math.max(metrics.screenScale, 0.001), 8, 92);
  const lineHeight = fontSize * 1.35;
  const padX = fontSize * 0.82;
  const padY = fontSize * 0.72;
  const width = clamp(
    Math.max(...lines.map((line) => String(line).length), 12) * fontSize * 0.58 + padX * 2,
    150 / Math.max(metrics.screenScale, 0.001),
    560 / Math.max(metrics.screenScale, 0.001)
  );
  const height = padY * 2 + lineHeight * lines.length;
  const x = clamp(item.x * state.imageWidth + fontSize * 1.4, 0, Math.max(0, state.imageWidth - width));
  const y = clamp(item.y * state.imageHeight - height - fontSize * 1.1, 0, Math.max(0, state.imageHeight - height));
  return `
    <g class="sector-army-tooltip" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
      <rect width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${(fontSize * 0.55).toFixed(2)}" />
      ${lines
      .map(
        (line, index) =>
          `<text x="${padX.toFixed(2)}" y="${(padY + fontSize + index * lineHeight).toFixed(2)}" font-size="${fontSize.toFixed(
            2
          )}" class="${index === 0 ? "title" : ""}">${escapeHtml(line)}</text>`
      )
      .join("")}
    </g>
  `;
}

function makeSectorArmyLayer(metrics) {
  if (!sectorArmyLayerEnabled() || !state.imageWidth || !state.imageHeight) return null;
  const hovered = hoveredItem();
  const selected = selectedDetailItem();
  const labelFontSize = clamp((state.isMobileView ? 9 : 10.5) / Math.max(metrics.screenScale, 0.001), 7, 110);
  const numberFontSize = clamp(labelFontSize * 1.18, 8, 130);
  const strokeWidth = clamp(1.3 / Math.max(metrics.screenScale, 0.001), 0.7, 20);
  const activeStrokeWidth = clamp(2.1 / Math.max(metrics.screenScale, 0.001), 1.1, 28);

  const regionMarkup = sectorArmyItems()
    .map((item) => {
      const points = sectorArmyPolygonPoints(item.territory);
      if (points.length < 3) return "";
      const meta = sectorArmyStatusMeta(item.status);
      const pointText = polygonToSvgPoints(points);
      const hasCurves = item?.territory && item.territory.curves && Object.keys(item.territory.curves).length > 0;
      let pathD = null;
      let curveHandlesMarkup = "";
      if (hasCurves) {
        const w = state.imageWidth;
        const h = state.imageHeight;
        const closed = points.length > 2;
        let d = `M ${(points[0].x * w).toFixed(2)} ${(points[0].y * h).toFixed(2)}`;
        for (let i = 0; i < (closed ? points.length : points.length - 1); i += 1) {
          const next = points[(i + 1) % points.length];
          const ctrl = (item.territory.curves || {})[String(i)];
          if (ctrl && Array.isArray(ctrl) && ctrl.length >= 2) {
            const cx = Number(ctrl[0]) * w;
            const cy = Number(ctrl[1]) * h;
            d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${(next.x * w).toFixed(2)} ${(next.y * h).toFixed(2)}`;
          } else {
            d += ` L ${(next.x * w).toFixed(2)} ${(next.y * h).toFixed(2)}`;
          }
        }
        if (closed) d += " Z";
        pathD = d;
        // build curve handles markup
        curveHandlesMarkup = Object.entries(item.territory.curves || {})
          .map(([k, ctrl]) => {
            const idx = Number(k);
            if (!Array.isArray(ctrl) || ctrl.length < 2) return "";
            const cx = Number(ctrl[0]) * state.imageWidth;
            const cy = Number(ctrl[1]) * state.imageHeight;
            const a = points[idx];
            const b = points[(idx + 1) % points.length];
            return `
              <g class="sector-army-curve-handle" data-sector-editor-curve="${idx}">
                <line x1="${(a.x * state.imageWidth).toFixed(2)}" y1="${(a.y * state.imageHeight).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                <line x1="${(b.x * state.imageWidth).toFixed(2)}" y1="${(b.y * state.imageHeight).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                <circle class="sector-army-curve-control" data-sector-editor-curve="${idx}" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="6" />
              </g>
            `;
          })
          .join("");
      }
      const labelX = item.x * state.imageWidth;
      const labelY = item.y * state.imageHeight;
      const isHovered = hovered?.nameKey === item.nameKey;
      const isSelected = selected?.nameKey === item.nameKey;
      const isEditorSelected =
        state.sectorArmyEditor.enabled && Number(state.sectorArmyEditor.selectedId) === Number(item.army?.id);
      const classes = [
        "sector-army-region",
        `status-${String(item.status || "unknown").replace(/[^a-z0-9-]/gi, "-")}`,
        isHovered ? "is-hovered" : "",
        isSelected ? "is-selected" : "",
        isEditorSelected ? "is-editor-selected" : "",
        String(item.territory?.notes || "").toLowerCase().includes("platzhalter") ? "is-placeholder" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <g class="${classes}" data-sector-key="${escapeHtml(item.nameKey)}" style="--sector-glow:${meta.glow};">
          ${pathD
          ? `<path d="${pathD}" fill="${meta.fill}" stroke="${meta.stroke}" stroke-width="${(
            isHovered || isSelected || isEditorSelected ? activeStrokeWidth : strokeWidth
          ).toFixed(2)}" />`
          : `<polygon points="${pointText}" fill="${meta.fill}" stroke="${meta.stroke}" stroke-width="${(
            isHovered || isSelected || isEditorSelected ? activeStrokeWidth : strokeWidth
          ).toFixed(2)}" />`}
          ${curveHandlesMarkup}
          <text
            class="sector-army-number"
            x="${labelX.toFixed(2)}"
            y="${(labelY - labelFontSize * 0.38).toFixed(2)}"
            font-size="${numberFontSize.toFixed(2)}"
            text-anchor="middle"
          >${escapeHtml(item.army?.display?.numberLabel || item.army?.id || "")}</text>
          <text
            class="sector-army-label"
            x="${labelX.toFixed(2)}"
            y="${(labelY + labelFontSize * 0.9).toFixed(2)}"
            font-size="${labelFontSize.toFixed(2)}"
            text-anchor="middle"
          >${escapeHtml(item.shortName || item.army?.name || "")}</text>
        </g>
      `;
    })
    .join("");

  const assetMarkup = visibleStrategicFleetAssetItems()
    .map((item) => {
      const meta = sectorArmyStatusMeta("reserve");
      const x = item.x * state.imageWidth;
      const y = item.y * state.imageHeight;
      const size = clamp(12 / Math.max(metrics.screenScale, 0.001), 8, 110);
      const isHovered = hovered?.nameKey === item.nameKey;
      const isSelected = selected?.nameKey === item.nameKey;
      return `
        <g class="strategic-asset-marker ${isHovered ? "is-hovered" : ""} ${isSelected ? "is-selected" : ""}" data-sector-key="${escapeHtml(
        item.nameKey
      )}" style="--sector-glow:${meta.glow};" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
          <circle r="${(size * 1.18).toFixed(2)}" fill="${meta.fill}" stroke="${meta.stroke}" stroke-width="${strokeWidth.toFixed(2)}" />
          <path
            d="M 0 ${(-size).toFixed(2)} L ${(size * 0.82).toFixed(2)} ${(size * 0.72).toFixed(2)} L ${(-size * 0.82).toFixed(
        2
      )} ${(size * 0.72).toFixed(2)} Z"
            fill="rgba(255, 237, 174, 0.94)"
            stroke="rgba(5, 14, 24, 0.88)"
            stroke-width="${(strokeWidth * 0.72).toFixed(2)}"
          />
          <text x="0" y="${(size * 2.15).toFixed(2)}" font-size="${labelFontSize.toFixed(2)}" text-anchor="middle">${escapeHtml(
        item.asset?.faction === "cis" ? "KUS Reserve" : "Rep Reserve"
      )}</text>
        </g>
      `;
    })
    .join("");

  const activeTerritory = selectedSectorArmyEditorTerritory();
  const editorPoints =
    state.sectorArmyEditor.enabled && activeTerritory
      ? sectorArmyPolygonPoints(activeTerritory)
        .map((point, index) => {
          const x = point.x * state.imageWidth;
          const y = point.y * state.imageHeight;
          const selectedPoint = index === state.sectorArmyEditor.selectedPointIndex;
          const radius = clamp((selectedPoint ? 7 : 5.4) / Math.max(metrics.screenScale, 0.001), 4, 70);
          return `<circle class="sector-army-editor-handle ${selectedPoint ? "is-selected" : ""}" data-sector-editor-point="${index}" cx="${x.toFixed(
            2
          )}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" />`;
        })
        .join("")
      : "";
  const activeLabel = normalizeSectorPoint(activeTerritory?.labelPosition);
  const labelHandle =
    state.sectorArmyEditor.enabled && activeLabel
      ? `
        <g class="sector-army-label-handles">
          <circle class="sector-army-editor-label-handle" data-sector-editor-label="1" cx="${(activeLabel.x * state.imageWidth).toFixed(
        2
      )}" cy="${(activeLabel.y * state.imageHeight).toFixed(2)}" r="${clamp(7 / Math.max(metrics.screenScale, 0.001), 5, 80).toFixed(
        2
      )}" />
          <circle class="sector-army-editor-translate-handle" data-sector-editor-translate="1" cx="${(activeLabel.x * state.imageWidth).toFixed(
        2
      )}" cy="${(activeLabel.y * state.imageHeight).toFixed(2)}" r="${clamp(5 / Math.max(metrics.screenScale, 0.001), 4, 44).toFixed(2)}" />
        </g>
      `
      : "";
  const tooltipMarkup = !state.isMobileView && hovered && isSectorArmyLayerItem(hovered) ? makeSectorArmyTooltipMarkup(hovered, metrics) : "";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("sector-army-layer");
  svg.setAttribute("width", `${state.imageWidth}`);
  svg.setAttribute("height", `${state.imageHeight}`);
  svg.setAttribute("viewBox", `0 0 ${state.imageWidth} ${state.imageHeight}`);
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <g class="sector-army-regions">${regionMarkup}</g>
    <g class="strategic-assets">${assetMarkup}</g>
    <g class="sector-army-editor-points">${editorPoints}${labelHandle}</g>
    ${tooltipMarkup}
  `;
  bindSectorArmyLayerInteractions(svg);
  return svg;
}

function bindSectorArmyLayerInteractions(svg) {
  svg.querySelectorAll("[data-sector-key]").forEach((node) => {
    // support pointerdown to start translating whole polygon when editor is enabled
    node.addEventListener("pointerdown", (event) => {
      // Only start translate when sector/modify mode is active (or Alt is held)
      if (!state.sectorArmyEditor.enabled) return;
      const mode = state.sectorArmyEditor.mode || "view";
      if (!(mode === "sector" || state.sectorArmyEditor.modifyMode) && !event.altKey) return;
      // select this territory for editing
      const key = node.getAttribute("data-sector-key");
      const item = getSelectableItemByKey(key);
      if (!item) return;
      if (item.kind === "sectorArmy") {
        const itemId = Number(item.army?.id);
        if (itemId !== Number(state.sectorArmyEditor.selectedId)) return;
      }
      beginSectorArmyEditorDrag(event, "translate", -1);
      renderSectorArmyEditor();
    });
    node.addEventListener("mouseenter", () => {
      const item = getSelectableItemByKey(node.getAttribute("data-sector-key"));
      if (item) setHovered(item);
    });
    node.addEventListener("mouseleave", () => {
      if (!state.isMobileView) setHovered(null);
    });
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const item = getSelectableItemByKey(node.getAttribute("data-sector-key"));
      if (!item) return;
      if (item.kind === "sectorArmy") {
        const itemId = Number(item.army?.id || state.sectorArmyEditor.selectedId);
        if (isSectorArmyBoundaryEditActive(itemId) && handleSectorArmyEditorCanvasClick(event)) {
          return;
        }
        if (!state.sectorArmyEditor.enabled) {
          state.sectorArmyEditor.selectedId = itemId;
        }
      }
      selectMapItem(item);
    });
    node.addEventListener("dblclick", (event) => {
      // insert a point on nearest segment when in vertex/curve mode
      if (!state.sectorArmyEditor.enabled) return;
      const mode = state.sectorArmyEditor.mode || "view";
      if (!(mode === "vertex" || mode === "curve")) return;
      event.preventDefault();
      event.stopPropagation();
      const clientX = event.clientX;
      const clientY = event.clientY;
      const pt = clientToImageNorm(clientX, clientY);
      if (!pt) return;
      const item = getSelectableItemByKey(node.getAttribute("data-sector-key"));
      if (!item || item.kind !== "sectorArmy") return;
      const territory = item.territory;
      const nearest = findNearestSectorSegment(territory, pt);
      // threshold in px
      const distPx = Math.sqrt(nearest.distanceSq) * Math.max(state.imageWidth || 0, state.imageHeight || 0);
      if (distPx <= 18) {
        insertSectorArmyEditorPointAtSegment(nearest.index, pt);
      }
    });
  });
  svg.querySelectorAll("[data-sector-editor-point]").forEach((handle) => {
    const pointIndex = Number(handle.getAttribute("data-sector-editor-point"));
    handle.addEventListener("pointerdown", (event) => {
      state.sectorArmyEditor.selectedPointIndex = pointIndex;
      beginSectorArmyEditorDrag(event, "point", pointIndex);
      renderSectorArmyEditor();
    });
  });
  svg.querySelectorAll("[data-sector-editor-label]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const mode = state.sectorArmyEditor.mode || "view";
      if (!(mode === "sector" || state.sectorArmyEditor.modifyMode) && !event.altKey) return;
      beginSectorArmyEditorDrag(event, "label", -1);
    });
  });
  svg.querySelectorAll("[data-sector-editor-translate]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const mode = state.sectorArmyEditor.mode || "view";
      if (!(mode === "sector" || state.sectorArmyEditor.modifyMode) && !event.altKey) return;
      beginSectorArmyEditorDrag(event, "translate", -1);
      renderSectorArmyEditor();
    });
  });
  svg.querySelectorAll("[data-sector-editor-curve]").forEach((handle) => {
    const segIndex = Number(handle.getAttribute("data-sector-editor-curve"));
    handle.addEventListener("pointerdown", (event) => {
      beginSectorArmyEditorDrag(event, "curve", segIndex);
      renderSectorArmyEditor();
    });
  });
}

function renderDynamicOverlay() {
  if (!state.overlayDynamic) return;
  state.overlayDynamic.innerHTML = "";

  const metrics = currentOverlayMetrics();
  const mobileSimplified = state.isMobileView && (state.viewerBusy || metrics.zoomFactor < 1.35);
  const gridRadius = mobileSimplified ? 0 : 1;
  const neighborLabels = gridNeighbors(state.currentGrid, gridRadius);

  neighborLabels.forEach((label) => {
    const tone = label === state.currentGrid ? "current" : "neighbor";
    const box = makeGridBox(label, tone);
    if (!box) return;
    if (mobileSimplified && tone !== "current") {
      box.classList.add("quiet");
    }
    if (mobileSimplified && tone === "current") {
      box.classList.add("focus-only");
    }
    state.overlayDynamic.appendChild(box);
  });

  const item = selectedDetailItem();
  const routeHighlights = [];
  if (item?.kind === "route" && routeVisibleByFilters(item)) {
    routeHighlights.push({ item, variant: "selected" });
  }
  const hovered = hoveredItem();
  if (hovered?.kind === "route" && routeVisibleByFilters(hovered) && hovered.nameKey !== item?.nameKey && !state.isMobileView) {
    routeHighlights.push({ item: hovered, variant: "hover" });
  }
  const routeHighlightLayer = makeRouteHighlightLayer(routeHighlights, metrics);
  if (routeHighlightLayer) {
    state.overlayDynamic.appendChild(routeHighlightLayer);
  }
  if (state.travelResult?.status === "ok") {
    const travelPathLayer = makeTravelPathLayer(state.travelResult, metrics);
    if (travelPathLayer) {
      state.overlayDynamic.appendChild(travelPathLayer);
    }
  }
  const sectorArmyLayer = makeSectorArmyLayer(metrics);
  if (sectorArmyLayer) {
    state.overlayDynamic.appendChild(sectorArmyLayer);
  }
  visibleRenderableMapItems()
    .filter(itemHasPlanetEvent)
    .forEach((eventItem) => {
      state.overlayDynamic.appendChild(makeEventMarker(eventItem, metrics));
    });
  const searchPulseItem = getSelectableItemByKey(state.searchPulseKey);
  if (
    searchPulseItem &&
    searchPulseItem.kind !== "route" &&
    searchPulseItem.kind !== "faction" &&
    !isSectorArmyLayerItem(searchPulseItem) &&
    mapItemVisible(searchPulseItem)
  ) {
    state.overlayDynamic.appendChild(makeSearchPulseMarker(searchPulseItem, metrics));
  }
  if (item && item.kind !== "route" && item.kind !== "faction" && !isSectorArmyLayerItem(item) && mapItemVisible(item)) {
    const marker = makeSelectionMarker(item, metrics, !state.viewerBusy || !state.isMobileView);
    state.overlayDynamic.appendChild(marker);
  }
  if (
    hovered &&
    hovered.kind !== "route" &&
    hovered.kind !== "faction" &&
    !isSectorArmyLayerItem(hovered) &&
    mapItemVisible(hovered) &&
    hovered.nameKey !== item?.nameKey &&
    !state.isMobileView
  ) {
    state.overlayDynamic.appendChild(makeHoverMarker(hovered, metrics));
  }
  updateFactionFragmentInteractionState();
}

function attachPinInteractions(pinEl, item) {
  if (!ALLOW_PIN_DRAG) return;
  if (item.kind === "known") return;

  pinEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.dragState = {
      key: item.nameKey,
      pointerId: event.pointerId,
      moved: false,
    };
    pinEl.setPointerCapture(event.pointerId);
  });

  pinEl.addEventListener("pointermove", (event) => {
    if (!state.dragState || state.dragState.key !== item.nameKey) return;
    const next = clientToImageNorm(event.clientX, event.clientY);
    if (!next) return;
    state.dragState.moved = true;
    item.x = clamp01(next.x);
    item.y = clamp01(next.y);
    item.grid = guessGridFromPoint(item.x, item.y);
    persistSession();
    renderOverlay();
    renderSidebar();
  });

  const stopDrag = (event) => {
    if (!state.dragState || state.dragState.key !== item.nameKey) return;
    if (pinEl.hasPointerCapture(event.pointerId)) {
      pinEl.releasePointerCapture(event.pointerId);
    }
    const moved = state.dragState.moved;
    state.dragState = null;
    if (!moved) {
      selectMapItem(item);
      return;
    }
    selectMapItem(item);
    setStatus(`${item.name} verschoben auf ${guessGridFromPoint(item.x, item.y)}.`);
  };

  pinEl.addEventListener("pointerup", stopDrag);
  pinEl.addEventListener("pointercancel", stopDrag);
}

function makePin(item) {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = `map-pin ${item.kind} ${item.decision || ""}`;
  pin.style.left = `${item.x * state.imageWidth}px`;
  pin.style.top = `${item.y * state.imageHeight}px`;
  pin.dataset.key = item.nameKey;
  setFactionCssVars(pin, planetFactionStyle(item));

  const dot = document.createElement("span");
  dot.className = "map-pin-dot";
  pin.appendChild(dot);

  const label = document.createElement("span");
  label.className = "map-pin-label";
  label.textContent = item.name;
  pin.appendChild(label);

  if (state.selectedDetailKey === item.nameKey) {
    pin.classList.add("selected");
  }
  if (normalizeGridLabel(item.grid) === state.currentGrid) {
    pin.classList.add("in-grid");
  }
  if (item.kind === "review") {
    pin.classList.add("show-label");
  }

  pin.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isTouchGestureLocked()) return;
    if (!itemHasDetails(item)) {
      setStatus(`${item.name}: Noch keine Detailinformationen verfuegbar.`);
      return;
    }
    setSelectedDetail(item);
  });

  attachPinInteractions(pin, item);
  return pin;
}

function renderOverlay() {
  if (!state.overlayPlane) return;
  if (state.overlaySvg && state.overlaySvg.childNodes.length) {
    state.overlaySvg.innerHTML = "";
    state.lastStaticOverlayKey = "";
  }
  renderStaticCanvasOverlay();
  renderDynamicOverlay();
  updateFactionFragmentInteractionState();
}

function renderReviewList() {
  return;
}

function renderContextList() {
  if (!contextList || !contextCount) return;
  const items = contextItems();
  contextList.innerHTML = "";
  contextCount.textContent = `${items.length}`;

  if (!items.length) {
    contextList.innerHTML = '<li class="empty-state">Keine Planeten im aktuellen Umfeld gefunden.</li>';
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = `item-row compact ${state.selectedDetailKey === item.nameKey ? "selected" : ""}`;
    li.innerHTML = `
      <button type="button" class="item-button">
        <span class="item-title">${item.name}</span>
        <span class="item-meta">${normalizeGridLabel(item.grid)} - ${sourceLabel(item)}</span>
      </button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      if (!itemHasDetails(item)) {
        setStatus(`${item.name}: Noch keine Detailinformationen verfuegbar.`);
        return;
      }
      setSelectedDetail(item);
      focusItem(item, false);
    });
    contextList.appendChild(li);
  });
}

function renderGridMeta() {
  if (!gridStats || !gridMeta) return;
  const currentBounds = gridBoundsPx(state.currentGrid);
  const sameGridKnown = contextItems().filter((item) => normalizeGridLabel(item.grid) === state.currentGrid);
  gridStats.textContent = `${state.currentGrid}`;
  gridMeta.innerHTML = `
    <div class="meta-line"><strong>Planeten im Grid:</strong> ${sameGridKnown.length}</div>
    <div class="meta-line"><strong>Planeten im Umfeld:</strong> ${contextItems().length}</div>
    <div class="meta-line"><strong>Bounds:</strong> ${currentBounds ? `${Math.round(currentBounds.left)}-${Math.round(currentBounds.right)} px` : "?"}</div>
  `;
}

function syncTravelStateFromField(kind, value) {
  const trimmed = String(value || "").trim();
  const item = trimmed ? getTravelPlanetByName(trimmed) : null;

  if (kind === "start") {
    state.travelStartKey = item ? item.nameKey : null;
    state.travelStartText = item ? item.name : trimmed;
    return item;
  }

  state.travelTargetKey = item ? item.nameKey : null;
  state.travelTargetText = item ? item.name : trimmed;
  return item;
}

function syncTravelDraftFromInputs() {
  syncTravelStateFromField("start", travelStartInput.value);
  syncTravelStateFromField("target", travelTargetInput.value);
  state.travelHyperdriveClass = Math.max(0.1, Number(travelHyperdriveInput.value) || 1);
}

function markTravelDirty() {
  state.travelNeedsRun = true;
  state.travelResult = null;
}

function clearTravelPlanner() {
  state.travelStartKey = null;
  state.travelTargetKey = null;
  state.travelStartText = "";
  state.travelTargetText = "";
  state.travelHyperdriveClass = 1;
  state.travelFleetId = "";
  state.travelNeedsRun = false;
  state.travelResult = null;
  renderAll();
  persistSession();
  setStatus("Reiserechner zurueckgesetzt.");
}

function fleetShipOptionLabel(ship) {
  if (!ship) return "";
  return `${ship.name} - ${fleetFactionLabel(ship.faction)} - ${ship.category}`;
}

function fleetShipSearchText(ship) {
  return normalizeNameKey(
    [
      ship?.name,
      ship?.category,
      ship?.role,
      ship?.manufacturer,
      ship?.factionName,
      fleetFactionLabel(ship?.faction),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function filteredFleetShipCatalog() {
  const faction = String(fleetShipFactionFilter?.value || "all").trim();
  return state.shipCatalog.filter((ship) => faction === "all" || ship.faction === faction);
}

function resolveFleetShipFromQuery(query) {
  const value = String(query || "").trim();
  if (!value) return null;
  const direct = state.shipCatalog.find((ship) => fleetShipOptionLabel(ship) === value);
  if (direct) return direct;
  const key = normalizeNameKey(value);
  return filteredFleetShipCatalog().find((ship) => fleetShipSearchText(ship).includes(key)) || null;
}

function activeFleetProfileName() {
  return activeFleetProfile()?.name || FLEET_DEFAULT_PROFILE_NAME;
}

function markActiveFleetProfileUpdated() {
  const profile = activeFleetProfile();
  if (profile) {
    profile.updatedAt = new Date().toISOString();
  }
}

function setActiveFleetId(fleetId, persist = true) {
  const profile = activeFleetProfile();
  if (!profile) return;
  const id = String(fleetId || "").trim();
  profile.activeFleetId = profile.fleets.some((fleet) => fleet.id === id) ? id : "";
  state.selectedFleetShipId = "";
  markActiveFleetProfileUpdated();
  if (persist) persistFleetStore();
  renderAll();
}

function saveFleetProfileName() {
  const profile = activeFleetProfile();
  if (!profile || !fleetProfileNameInput) return;
  const name = String(fleetProfileNameInput.value || "").trim();
  if (!name) {
    setStatus("Bitte einen Kommandonamen eintragen.");
    return;
  }
  profile.name = name;
  profile.updatedAt = new Date().toISOString();
  persistFleetStore();
  renderAll();
  setStatus(`Kommandoprofil "${name}" gespeichert.`);
}

function createFleetProfileFromInput() {
  ensureFleetStore();
  const name = String(fleetProfileNameInput?.value || "").trim() || FLEET_DEFAULT_PROFILE_NAME;
  const id = createLocalId("profile");
  state.fleetStore.profiles[id] = {
    id,
    name,
    fleets: [],
    activeFleetId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.fleetStore.activeProfileId = id;
  state.travelFleetId = "";
  persistFleetStore();
  persistSession();
  renderAll();
  setStatus(`Neues Kommandoprofil "${name}" angelegt.`);
}

function saveFleetFromForm() {
  const profile = activeFleetProfile();
  if (!profile || !fleetNameInput) return;
  const name = String(fleetNameInput.value || "").trim();
  if (!name) {
    setStatus("Bitte einen Flottennamen eintragen.");
    return;
  }
  const active = activeFleet();
  const now = new Date().toISOString();
  if (active) {
    active.name = name;
    active.faction = normalizeFleetFaction(fleetFactionInput?.value);
    active.updatedAt = now;
    setStatus(`Flotte "${active.name}" gespeichert.`);
  } else {
    const fleet = {
      id: createLocalId("fleet"),
      name,
      faction: normalizeFleetFaction(fleetFactionInput?.value),
      ships: [],
      createdAt: now,
      updatedAt: now,
    };
    profile.fleets.unshift(fleet);
    profile.activeFleetId = fleet.id;
    setStatus(`Flotte "${fleet.name}" erstellt.`);
  }
  markActiveFleetProfileUpdated();
  persistFleetStore();
  renderAll();
}

function deleteActiveFleet() {
  const profile = activeFleetProfile();
  const fleet = activeFleet();
  if (!profile || !fleet) return;
  const ok = window.confirm(`Flotte "${fleet.name}" wirklich loeschen?`);
  if (!ok) return;
  profile.fleets = profile.fleets.filter((entry) => entry.id !== fleet.id);
  profile.activeFleetId = profile.fleets[0]?.id || "";
  if (state.travelFleetId === fleet.id) state.travelFleetId = "";
  state.selectedFleetShipId = "";
  markActiveFleetProfileUpdated();
  persistFleetStore();
  persistSession();
  renderAll();
  setStatus(`Flotte "${fleet.name}" geloescht.`);
}

function addShipToActiveFleet() {
  const fleet = activeFleet();
  if (!fleet) {
    setStatus("Bitte zuerst eine Flotte erstellen oder auswaehlen.");
    return;
  }
  const ship = resolveFleetShipFromQuery(fleetShipSearchInput?.value);
  if (!ship) {
    setStatus("Dieses Schiff wurde im Katalog nicht gefunden.");
    return;
  }
  const quantity = normalizeFleetQuantity(fleetShipQuantityInput?.value || 1);
  let lastEntryId = "";
  for (let index = 0; index < quantity; index += 1) {
    const entry = {
      id: createLocalId("ship"),
      shipId: ship.id,
      callsign: "",
      fuelHours: null,
      createdAt: new Date().toISOString(),
    };
    fleet.ships.push(entry);
    lastEntryId = entry.id;
  }
  fleet.updatedAt = new Date().toISOString();
  state.selectedFleetShipId = lastEntryId;
  markActiveFleetProfileUpdated();
  persistFleetStore();
  if (fleetShipSearchInput) fleetShipSearchInput.value = "";
  if (fleetShipQuantityInput) fleetShipQuantityInput.value = "1";
  renderAll();
  setStatus(`${quantity} einzelne ${ship.name} zu "${fleet.name}" hinzugefuegt.`);
}

function updateActiveFleetShip(entryId, delta) {
  const fleet = activeFleet();
  if (!fleet) return;
  const entry = fleet.ships.find((item) => item.id === entryId);
  if (!entry) return;
  if (delta < 0) {
    removeActiveFleetShip(entryId);
    return;
  }
  const clone = {
    ...entry,
    id: createLocalId("ship"),
    callsign: "",
    fuelHours: null,
    createdAt: new Date().toISOString(),
  };
  fleet.ships.push(clone);
  state.selectedFleetShipId = clone.id;
  fleet.updatedAt = new Date().toISOString();
  markActiveFleetProfileUpdated();
  persistFleetStore();
  renderAll();
}

function removeActiveFleetShip(entryId) {
  const fleet = activeFleet();
  if (!fleet) return;
  fleet.ships = fleet.ships.filter((entry) => entry.id !== entryId);
  if (state.selectedFleetShipId === entryId) state.selectedFleetShipId = "";
  fleet.updatedAt = new Date().toISOString();
  markActiveFleetProfileUpdated();
  persistFleetStore();
  renderAll();
}

function renderTravelFleetSelect() {
  if (!travelFleetSelect) return;
  const fleets = currentProfileFleets();
  if (state.travelFleetId && !fleets.some((fleet) => fleet.id === state.travelFleetId)) {
    state.travelFleetId = "";
  }
  travelFleetSelect.innerHTML = [
    '<option value="">Keine Flotte</option>',
    ...fleets.map(
      (fleet) =>
        `<option value="${escapeHtml(fleet.id)}">${escapeHtml(fleet.name)} (${formatFleetNumber(
          fleetShipTotal(fleet)
        )} Schiffe)</option>`
    ),
  ].join("");
  if (document.activeElement !== travelFleetSelect) {
    travelFleetSelect.value = state.travelFleetId || "";
  }
}

function fleetCategoryRank(category) {
  const key = String(category || "Unsortiert").trim();
  const index = FLEET_CATEGORY_ORDER.findIndex((entry) => entry.toLowerCase() === key.toLowerCase());
  return index >= 0 ? index : FLEET_CATEGORY_ORDER.length;
}

function sortedFleetShipEntries(fleet) {
  return [...(fleet?.ships || [])].sort((left, right) => {
    const leftShip = fleetShipById(left.shipId);
    const rightShip = fleetShipById(right.shipId);
    const categorySort = fleetCategoryRank(leftShip?.category) - fleetCategoryRank(rightShip?.category);
    if (categorySort) return categorySort;
    const nameSort = String(leftShip?.name || left.shipId).localeCompare(String(rightShip?.name || right.shipId), "de");
    if (nameSort) return nameSort;
    return String(left.id || "").localeCompare(String(right.id || ""), "de");
  });
}

function renderFleetPanel() {
  if (!fleetSummaryChip) return;
  const profile = activeFleetProfile();
  const profiles = fleetProfilesArray();
  const fleets = currentProfileFleets();
  const fleet = activeFleet();
  const totalShips = fleets.reduce((sum, entry) => sum + fleetShipTotal(entry), 0);
  const catalogCount = state.shipCatalog.length;
  const adminAvailable = Boolean(window.MapAdminUi?.isAdmin?.());
  const adminEntry = state.fleetAdminUsers.find((entry) => entry.user?.id === state.fleetAdminUserId) || null;

  if (fleetAccountStatus) {
    const isAdminView = Boolean(adminEntry);
    fleetAccountStatus.textContent = isAdminView
      ? `Admin: ${adminEntry.user.username}`
      : state.fleetAuth?.user
        ? `Cloud: ${state.fleetAuth.user.username}`
        : "Lokal";
    fleetAccountStatus.className = `pill ${state.fleetAuth?.user || isAdminView ? "accent" : "muted"}`;
  }
  if (fleetUsernameInput && document.activeElement !== fleetUsernameInput) {
    fleetUsernameInput.value = state.fleetAuth?.user?.username || fleetUsernameInput.value || "";
  }
  if (fleetLoginButton) fleetLoginButton.disabled = Boolean(state.fleetAuth?.token);
  if (fleetRegisterButton) fleetRegisterButton.disabled = Boolean(state.fleetAuth?.token);
  if (fleetLogoutButton) fleetLogoutButton.disabled = !state.fleetAuth?.token;
  if (fleetSyncButton) fleetSyncButton.disabled = !state.fleetAuth?.token && !state.fleetAdminUserId;
  if (fleetAdminBlock) fleetAdminBlock.classList.toggle("hidden", !adminAvailable);
  if (fleetAdminStatus) {
    const count = state.fleetAdminUsers.length;
    fleetAdminStatus.textContent = adminEntry
      ? `${adminEntry.user.username}`
      : count
        ? `${count} User`
        : "nicht geladen";
    fleetAdminStatus.className = `pill ${adminEntry || count ? "accent" : "muted"}`;
  }
  if (fleetAdminUserSelect) {
    fleetAdminUserSelect.innerHTML = state.fleetAdminUsers.length
      ? state.fleetAdminUsers
        .map((entry) => {
          const user = entry.user || {};
          const stats = entry.stats || fleetStoreStats(entry.store);
          return `<option value="${escapeHtml(user.id)}">${escapeHtml(user.username || user.id)} - ${formatFleetNumber(
            stats.fleets || 0
          )} Flotten / ${formatFleetNumber(stats.ships || 0)} Schiffe</option>`;
        })
        .join("")
      : '<option value="">Keine User geladen</option>';
    if (document.activeElement !== fleetAdminUserSelect) {
      fleetAdminUserSelect.value = state.fleetAdminUserId || "";
    }
  }

  fleetSummaryChip.textContent = `${fleets.length} Flotten`;
  fleetSummaryChip.className = `pill ${fleets.length ? "accent" : "muted"}`;

  if (fleetProfileSelect) {
    fleetProfileSelect.innerHTML = profiles
      .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`)
      .join("");
    if (document.activeElement !== fleetProfileSelect) {
      fleetProfileSelect.value = profile?.id || "";
    }
  }
  if (fleetProfileNameInput && document.activeElement !== fleetProfileNameInput) {
    fleetProfileNameInput.value = activeFleetProfileName();
  }
  if (fleetCountStat) fleetCountStat.textContent = formatFleetNumber(fleets.length);
  if (fleetShipCountStat) fleetShipCountStat.textContent = formatFleetNumber(totalShips);
  if (fleetCatalogCountStat) fleetCatalogCountStat.textContent = formatFleetNumber(catalogCount);

  if (fleetNameInput && document.activeElement !== fleetNameInput) {
    fleetNameInput.value = fleet?.name || "";
  }
  if (fleetFactionInput && document.activeElement !== fleetFactionInput) {
    fleetFactionInput.value = fleet?.faction || "republic";
  }
  if (fleetSaveButton) fleetSaveButton.textContent = fleet ? "Flotte speichern" : "Flotte erstellen";
  if (fleetDeleteButton) fleetDeleteButton.disabled = !fleet;
  if (fleetNewButton) fleetNewButton.disabled = !fleet && !String(fleetNameInput?.value || "").trim();

  if (fleetList) {
    fleetList.innerHTML = fleets.length
      ? fleets
        .map((entry) => {
          const stats = fleetAutoStats(entry);
          return `
              <button type="button" class="fleet-row ${entry.id === fleet?.id ? "is-active" : ""}" data-fleet-id="${escapeHtml(
            entry.id
          )}">
                <span class="fleet-row-title">${escapeHtml(entry.name)}</span>
                <span class="fleet-row-meta">${escapeHtml(fleetFactionLabel(entry.faction))} / ${formatFleetNumber(
            stats.ships
          )} Schiffe / Damage ${formatFleetNumber(stats.optimalDamage)}</span>
              </button>
            `;
        })
        .join("")
      : '<div class="detail-empty">Noch keine Flotte in diesem Profil.</div>';
  }

  if (fleetEmptyState) fleetEmptyState.classList.toggle("hidden", Boolean(fleet));
  if (fleetActiveBody) fleetActiveBody.classList.toggle("hidden", !fleet);
  if (!fleet) {
    if (fleetShipOptions) fleetShipOptions.innerHTML = "";
    if (fleetShipDetail) fleetShipDetail.classList.add("hidden");
    return;
  }

  const stats = fleetAutoStats(fleet);
  if (fleetActiveTitle) fleetActiveTitle.textContent = fleet.name;
  if (fleetActiveMeta) fleetActiveMeta.textContent = fleetSummaryLabel(fleet);
  if (fleetActiveStats) {
    fleetActiveStats.innerHTML = `
      <div><span>Damage</span><strong>${formatFleetNumber(stats.optimalDamage)}</strong></div>
      <div><span>SBD</span><strong>${formatFleetNumber(stats.shieldsSbd)}</strong></div>
      <div><span>RU</span><strong>${formatFleetNumber(stats.hullRu)}</strong></div>
    `;
  }

  const catalog = filteredFleetShipCatalog();
  if (fleetShipOptions) {
    fleetShipOptions.innerHTML = catalog
      .map((ship) => `<option value="${escapeHtml(fleetShipOptionLabel(ship))}"></option>`)
      .join("");
  }
  if (fleetShipCatalogCount) {
    fleetShipCatalogCount.textContent = catalogCount
      ? `${formatFleetNumber(catalog.length)} von ${formatFleetNumber(catalogCount)} Schiffen im Suchkatalog`
      : "Schiffskatalog wird geladen...";
  }

  if (fleetShipList) {
    fleetShipList.innerHTML = fleet.ships.length
      ? sortedFleetShipEntries(fleet)
        .map((entry, index, entries) => {
          const ship = fleetShipById(entry.shipId);
          const previousShip = index > 0 ? fleetShipById(entries[index - 1].shipId) : null;
          const showCategory = !previousShip || previousShip.category !== ship?.category;
          const categoryHeader = showCategory
            ? `<div class="fleet-ship-category">${escapeHtml(ship?.category || "Unsortiert")}</div>`
            : "";
          if (!ship) {
            return `
                ${categoryHeader}
                <div class="fleet-ship-row">
                  <div>
                    <span class="fleet-ship-title">Unbekanntes Schiff</span>
                    <span class="fleet-ship-meta">${escapeHtml(entry.shipId)}</span>
                  </div>
                  <div class="fleet-ship-tools">
                    <button type="button" data-ship-action="remove" data-ship-entry-id="${escapeHtml(entry.id)}">x</button>
                  </div>
                </div>
              `;
          }
          return `
              ${categoryHeader}
              <div class="fleet-ship-row ${state.selectedFleetShipId === entry.id ? "is-active" : ""}">
                <button type="button" class="fleet-ship-main" data-ship-action="detail" data-ship-entry-id="${escapeHtml(
            entry.id
          )}">
                  <span class="fleet-ship-title">${escapeHtml(ship.name)} <span class="fleet-instance-tag">#${formatFleetNumber(index + 1)}</span></span>
                  <span class="fleet-ship-meta">${escapeHtml(fleetFactionLabel(ship.faction))} / ${escapeHtml(
            ship.category
          )} / Damage ${formatFleetNumber(ship.optimalDamage || 0)}</span>
                </button>
                <div class="fleet-ship-tools">
                  <button type="button" data-ship-action="inc" data-ship-entry-id="${escapeHtml(entry.id)}">+</button>
                  <button type="button" data-ship-action="remove" data-ship-entry-id="${escapeHtml(entry.id)}">x</button>
                </div>
              </div>
            `;
        })
        .join("")
      : '<div class="detail-empty">Noch keine Schiffe in dieser Flotte.</div>';
  }

  const selectedEntry = (fleet?.ships || []).find((entry) => entry.id === state.selectedFleetShipId) || null;
  const selectedShip = selectedEntry ? fleetShipById(selectedEntry.shipId) : fleetShipById(state.selectedFleetShipId);
  if (fleetShipDetail) {
    if (!selectedShip) {
      fleetShipDetail.classList.add("hidden");
      fleetShipDetail.innerHTML = "";
    } else {
      fleetShipDetail.classList.remove("hidden");
      fleetShipDetail.innerHTML = `
        <div><strong>${escapeHtml(selectedShip.name)}</strong></div>
        <div>Einzelschiff-ID: ${escapeHtml(selectedEntry?.id || "Katalog")}</div>
        <div>${escapeHtml(fleetFactionLabel(selectedShip.faction))} / ${escapeHtml(selectedShip.category)} / ${escapeHtml(
        selectedShip.role || "Unbekannte Rolle"
      )}</div>
        <div>Laenge ${formatFleetNumber(selectedShip.lengthMeters)} m / Hyperantrieb ${selectedShip.hyperdriveClass == null ? "-" : escapeHtml(selectedShip.hyperdriveClass)
        } / MGLT ${formatFleetNumber(selectedShip.mglt)}</div>
        <div>SBD ${formatFleetNumber(selectedShip.shieldsSbd)} / RU ${formatFleetNumber(
          selectedShip.hullRu
        )} / Damage ${formatFleetNumber(selectedShip.optimalDamage || 0)}</div>
        <div><strong>Hauptbewaffnung:</strong> ${escapeHtml(selectedShip.primaryWeapons || "-")}</div>
      `;
    }
  }
}

function normalizeNewsItem(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || "").trim();
  const title = String(entry.title || "").trim();
  const body = String(entry.body || entry.text || "").trim();
  if (!id || (!title && !body)) return null;
  return {
    id,
    title: title || "Ankuendigung",
    body,
    imageUrl: String(entry.imageUrl || entry.image || "").trim(),
    createdAt: String(entry.createdAt || entry.publishedAt || ""),
    updatedAt: String(entry.updatedAt || ""),
  };
}

function newsItemsSorted(items = state.newsItems) {
  return [...items].sort((left, right) => {
    const rightTime = Date.parse(right.createdAt || right.updatedAt || "") || 0;
    const leftTime = Date.parse(left.createdAt || left.updatedAt || "") || 0;
    return rightTime - leftTime;
  });
}

function loadNewsReadState() {
  try {
    const raw = localStorage.getItem(NEWS_READ_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    state.newsReadIds = new Set(Array.isArray(list) ? list.map((id) => String(id)) : []);
  } catch (_error) {
    state.newsReadIds = new Set();
  }
}

function persistNewsReadState() {
  localStorage.setItem(NEWS_READ_STORAGE_KEY, JSON.stringify(Array.from(state.newsReadIds)));
}

function unreadNewsItems() {
  return state.newsItems.filter((item) => !state.newsReadIds.has(item.id));
}

function isNewsPanelVisible() {
  return state.isMobileView ? state.mobilePanel === "news" : state.desktopWindowVisibility.news === true;
}

function renderNewsUnreadBadges() {
  const unread = unreadNewsItems().length;
  [newsUnreadDockBadge, newsUnreadMobileBadge].forEach((badge) => {
    if (!badge) return;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.classList.toggle("hidden", unread <= 0);
  });
}

function markNewsItemsRead() {
  if (!state.newsItems.length) {
    renderNewsUnreadBadges();
    return;
  }
  let changed = false;
  state.newsItems.forEach((item) => {
    if (!state.newsReadIds.has(item.id)) {
      state.newsReadIds.add(item.id);
      changed = true;
    }
  });
  if (changed) persistNewsReadState();
  renderNewsUnreadBadges();
}

async function loadNewsItems() {
  if (state.newsLoading) return false;
  state.newsLoading = true;
  try {
    const res = await fetch("/api/news", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    state.newsItems = (Array.isArray(json.items) ? json.items : []).map(normalizeNewsItem).filter(Boolean);
    state.newsLoaded = true;
    if (isNewsPanelVisible()) markNewsItemsRead();
    renderAll();
    return true;
  } catch (_error) {
    state.newsLoaded = false;
    renderNewsPanel();
    return false;
  } finally {
    state.newsLoading = false;
  }
}

function setNewsAdminFeedback(message = "", isError = false) {
  if (!newsAdminFeedback) return;
  newsAdminFeedback.textContent = message;
  newsAdminFeedback.classList.toggle("error", Boolean(isError));
}

async function uploadNewsImageFile() {
  const token = adminFleetToken();
  const file = newsImageFileInput?.files?.[0];
  if (!token || !file) return;
  if (file.size > 5 * 1024 * 1024) {
    setNewsAdminFeedback("Bild ist zu gross (max 5 MB).", true);
    return;
  }
  setNewsAdminFeedback("Bild wird hochgeladen...");
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Bild konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });
    const res = await fetch("/api/news/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      throw new Error(handleAdminUnauthorized());
    }
    if (!res.ok) throw new Error(json.error || `Upload fehlgeschlagen (${res.status})`);
    if (newsImageUrlInput) newsImageUrlInput.value = json.url || "";
    setNewsAdminFeedback("Bild hochgeladen. Ankuendigung kann veroeffentlicht werden.");
  } catch (error) {
    setNewsAdminFeedback(`Fehler: ${error?.message || error}`, true);
  }
}

async function publishNewsItem() {
  if (state.newsAdminSaving) return;
  const token = adminFleetToken();
  if (!token) {
    setNewsAdminFeedback("Bitte zuerst als Admin einloggen.", true);
    return;
  }
  const title = String(newsTitleInput?.value || "").trim();
  const body = String(newsBodyInput?.value || "").trim();
  const imageUrl = String(newsImageUrlInput?.value || "").trim();
  if (!title && !body) {
    setNewsAdminFeedback("Titel oder Text eintragen.", true);
    return;
  }
  state.newsAdminSaving = true;
  if (newsPublishButton) newsPublishButton.disabled = true;
  setNewsAdminFeedback("Ankuendigung wird gespeichert...");
  try {
    const res = await fetch("/api/news", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "create", title, body, imageUrl }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      throw new Error(handleAdminUnauthorized());
    }
    if (!res.ok) throw new Error(json.error || `Speichern fehlgeschlagen (${res.status})`);
    state.newsItems = (Array.isArray(json.items) ? json.items : []).map(normalizeNewsItem).filter(Boolean);
    state.newsLoaded = true;
    if (newsTitleInput) newsTitleInput.value = "";
    if (newsBodyInput) newsBodyInput.value = "";
    if (newsImageUrlInput) newsImageUrlInput.value = "";
    if (newsImageFileInput) newsImageFileInput.value = "";
    setNewsAdminFeedback("Ankuendigung veroeffentlicht.");
    renderAll();
  } catch (error) {
    setNewsAdminFeedback(`Fehler: ${error?.message || error}`, true);
  } finally {
    state.newsAdminSaving = false;
    if (newsPublishButton) newsPublishButton.disabled = false;
  }
}

async function deleteNewsItem(id) {
  const token = adminFleetToken();
  if (!token || !id) return;
  if (!window.confirm("Diese News wirklich loeschen?")) return;
  setNewsAdminFeedback("News wird geloescht...");
  try {
    const res = await fetch("/api/news", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "delete", id }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      throw new Error(handleAdminUnauthorized());
    }
    if (!res.ok) throw new Error(json.error || `Loeschen fehlgeschlagen (${res.status})`);
    state.newsItems = (Array.isArray(json.items) ? json.items : []).map(normalizeNewsItem).filter(Boolean);
    state.newsReadIds.delete(id);
    persistNewsReadState();
    setNewsAdminFeedback("News geloescht.");
    renderAll();
  } catch (error) {
    setNewsAdminFeedback(`Fehler: ${error?.message || error}`, true);
  }
}

function renderNewsPanel() {
  if (!newsSummaryChip) return;
  const adminAvailable = Boolean(window.MapAdminUi?.isAdmin?.());
  const unreadBeforeOpen = unreadNewsItems().length;
  if (isNewsPanelVisible()) {
    markNewsItemsRead();
  } else {
    renderNewsUnreadBadges();
  }
  const unread = isNewsPanelVisible() ? 0 : unreadBeforeOpen;
  newsSummaryChip.textContent = unread > 0 ? `${formatFleetNumber(unread)} neu` : `${formatFleetNumber(state.newsItems.length)} Meldungen`;
  newsSummaryChip.className = `pill ${unread > 0 ? "accent" : "muted"}`;
  if (newsUnreadHint) {
    newsUnreadHint.textContent = unreadBeforeOpen > 0 ? `${formatFleetNumber(unreadBeforeOpen)} ungelesene Meldungen` : "";
    newsUnreadHint.classList.toggle("hidden", unreadBeforeOpen <= 0 || isNewsPanelVisible());
  }
  if (newsAdminBlock) newsAdminBlock.classList.toggle("hidden", !adminAvailable);
  if (newsAdminStatus) {
    newsAdminStatus.textContent = adminAvailable ? "Admin" : "gesperrt";
    newsAdminStatus.className = `pill ${adminAvailable ? "accent" : "muted"}`;
  }
  if (!newsList) return;
  const items = newsItemsSorted();
  if (!state.newsLoaded && !items.length) {
    newsList.innerHTML = state.newsLoading
      ? '<div class="detail-empty">News werden geladen...</div>'
      : '<div class="detail-empty">Noch keine News geladen.</div>';
    return;
  }
  newsList.innerHTML = items.length
    ? items
      .map((item) => {
        const isUnread = !state.newsReadIds.has(item.id);
        const timestamp = Date.parse(item.createdAt || "");
        const date = Number.isFinite(timestamp)
          ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp))
          : "";
        return `
            <article class="news-item ${isUnread ? "is-unread" : ""}" data-news-id="${escapeHtml(item.id)}">
              ${item.imageUrl ? `<img class="news-item-image" src="${escapeHtml(item.imageUrl)}" alt="" />` : ""}
              <div class="news-item-body">
                <div class="news-item-meta">
                  <span>${escapeHtml(date || "Gerade eben")}</span>
                  ${isUnread ? '<span class="pill accent">neu</span>' : ""}
                </div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.body).replace(/\n/g, "<br>")}</p>
                ${adminAvailable
            ? `<button type="button" class="ghost-button news-delete-button" data-news-action="delete" data-news-id="${escapeHtml(
              item.id
            )}">Loeschen</button>`
            : ""
          }
              </div>
            </article>
          `;
      })
      .join("")
    : '<div class="detail-empty">Noch keine Ankuendigungen.</div>';
}

function travelDraftSummary() {
  const startItem = selectedTravelPlanet("start");
  const targetItem = selectedTravelPlanet("target");
  const startText = String(state.travelStartText || "").trim();
  const targetText = String(state.travelTargetText || "").trim();
  const fleet = selectedTravelFleet();
  const fleetText = fleet ? ` mit ${fleet.name}` : "";

  if (startText && !startItem) {
    return {
      modeLabel: "Grid",
      summaryMessage: `Startplanet "${startText}" wurde nicht gefunden.`,
    };
  }
  if (targetText && !targetItem) {
    return {
      modeLabel: "Grid",
      summaryMessage: `Zielplanet "${targetText}" wurde nicht gefunden.`,
    };
  }
  if (!startItem || !targetItem) {
    return {
      modeLabel: "Grid",
      summaryMessage: "Start- und Zielplanet waehlen und dann auf Start klicken, um die Route zu berechnen.",
    };
  }
  return {
    modeLabel: "Bereit",
    summaryMessage: `Bereit fuer ${startItem.name} -> ${targetItem.name}${fleetText}. Start klicken, um die Reise zu berechnen.`,
  };
}

function runTravelCalculation() {
  syncTravelDraftFromInputs();
  state.travelResult = computeTravelResult();
  state.travelNeedsRun = false;
  renderAll();
  persistSession();
  if (state.travelResult?.status === "ok") {
    const fleet = selectedTravelFleet();
    const fleetText = fleet ? ` mit ${fleet.name}` : "";
    setStatus(
      `${state.travelResult.startItem.name} -> ${state.travelResult.targetItem.name}${fleetText}: ${state.travelResult.gridDistance} Grids, ${state.travelResult.timeText}.`
    );
  } else if (state.travelResult?.summaryMessage) {
    setStatus(state.travelResult.summaryMessage);
  }
}

function renderTravelPlanner() {
  const startItem = selectedTravelPlanet("start");
  const targetItem = selectedTravelPlanet("target");
  if (startItem && !state.travelStartText) {
    state.travelStartText = startItem.name;
  }
  if (targetItem && !state.travelTargetText) {
    state.travelTargetText = targetItem.name;
  }

  if (document.activeElement !== travelStartInput) {
    travelStartInput.value = state.travelStartText;
  }
  if (document.activeElement !== travelTargetInput) {
    travelTargetInput.value = state.travelTargetText;
  }
  if (document.activeElement !== travelHyperdriveInput) {
    travelHyperdriveInput.value = `${state.travelHyperdriveClass}`;
  }
  renderTravelFleetSelect();

  travelPlanetOptions.innerHTML = travelPlanetItems()
    .map((item) => `<option value="${escapeHtml(item.name)}"></option>`)
    .join("");

  const displayState = state.travelNeedsRun || !state.travelResult ? travelDraftSummary() : state.travelResult;
  travelModeChip.textContent = displayState.modeLabel || "Grid";
  travelModeChip.classList.toggle(
    "accent",
    !state.travelNeedsRun && state.travelResult?.status === "ok" && state.travelResult.mode !== "direct"
  );
  travelModeChip.classList.toggle(
    "muted",
    state.travelNeedsRun || !(state.travelResult?.status === "ok" && state.travelResult.mode !== "direct")
  );
  travelSummary.textContent = displayState.summaryMessage;

  if (state.travelNeedsRun || state.travelResult?.status !== "ok") {
    travelResult.classList.add("hidden");
    return;
  }

  travelResult.classList.remove("hidden");
  travelGridDistance.textContent = `${state.travelResult.gridDistance}`;
  travelTime.textContent = state.travelResult.timeText;
  travelModeText.textContent = state.travelResult.modeLabel;
  if (travelFleetMeta) {
    const fleet = selectedTravelFleet();
    travelFleetMeta.textContent = fleet ? `${fleet.name} (${formatFleetNumber(fleetShipTotal(fleet))} Schiffe)` : "Keine Flotte";
  }
  travelRouteNames.textContent = state.travelResult.routeText || "-";
  travelEndpointGrids.textContent = state.travelResult.endpointText || "-";
  travelGridSequence.innerHTML = state.travelResult.gridSequence.length
    ? state.travelResult.gridSequence
      .map((grid) => `<span class="travel-grid-chip">${escapeHtml(grid)}</span>`)
      .join("")
    : '<span class="empty-state">Keine Grid-Folge verfuegbar.</span>';
}

const DETAIL_FACT_KEYS = ["position", "faction", "climate", "species", "source", "wiki"];

function setDetailFactLabels(refs, labels = {}) {
  refs.positionLabel.textContent = labels.position || "Position";
  refs.factionLabel.textContent = labels.faction || "Fraktion";
  refs.climateLabel.textContent = labels.climate || "Klima & Terrain";
  refs.speciesLabel.textContent = labels.species || "Spezies & Bevoelkerung";
  refs.sourceLabel.textContent = labels.source || "Quelle";
  refs.wikiLabel.textContent = labels.wiki || "Wiki";
}

function setDetailFactVisibility(refs, visibleKeys = DETAIL_FACT_KEYS) {
  const visible = new Set(visibleKeys);
  DETAIL_FACT_KEYS.forEach((key) => {
    const labelNode = refs[`${key}Label`];
    const valueNode = refs[key];
    const row = valueNode?.closest("div") || labelNode?.closest("div");
    if (!row) return;
    row.classList.remove("detail-fact-wide", "detail-fact-table");
    row.classList.toggle("hidden", !visible.has(key));
  });
}

function sourceLinksMarkup(sources) {
  const entries = normalizeProfileSources(sources);
  if (!entries.length) return "Noch keine Wookieepedia-Quelle verknuepft.";
  return entries
    .map((entry) => {
      const label = escapeHtml(entry.title || entry.url || "Wookieepedia");
      if (!entry.url) return `<span>${label}</span>`;
      return `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer noopener">${label}</a>`;
    })
    .join("<br>");
}

function planetSeedRng(name) {
  let h = 2166136261 >>> 0;
  const str = String(name || "Unknown");
  for (let i = 0; i < str.length; i++) {
    h = (h ^ str.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  let s = h || 1;
  return function () {
    s = Math.imul(s ^ (s >>> 15), 0x85ebca77) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae3d) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0xffffffff;
  };
}

function planetBiomeKey(item) {
  const c = String(item.climate || "").toLowerCase();
  const t = String(item.terrain || "").toLowerCase();
  const both = `${c} ${t}`;
  if (/eis|tundra|subarktisch|gletscher|polar|frozen|frigid|arctic/.test(both)) return "ice";
  if (/vulkan|lava|volcanic|molten|magma|asche/.test(both)) return "lava";
  if (/toxisch|saurig|korrosiv|toxic|acidic|noxious/.test(both)) return "toxic";
  if (/sumpf|feucht|tropisch|jungle|dschungel|mangroven|marsch|swamp|humid|tropical|rainforest|wet/.test(both)) return "swamp";
  if (/aquat|marin|ozean|ocean|aquatic|sea|maritime|water world/.test(both)) return "ocean";
  if (/wuesten|trocken|wueste|sand|salzpfanne|salzwueste|duene|desert|arid|dry|barren/.test(both)) return "desert";
  if (/stuermisch|gas|permanente winde|stormy|gas giant|cloudy/.test(both)) return "storm";
  if (/ecumenopolis|city megastructure|industrial urban|industriestaedte/.test(both)) return "urban";
  if (/mediterran|temperiert|kontinental|subtropisch|temperate|mild/.test(both)) return "terran";
  return "terran";
}

function planetBiomePalette(biome, faction) {
  const palettes = {
    terran: { core: "#4a7a4a", land: "#3d5e34", ocean: "#1e4f6c", clouds: "#e8eef0", glow: "#7fbfe6", deep: "#1a2c3a" },
    desert: { core: "#c08a55", land: "#a06530", ocean: "#7a4720", clouds: "#f1d8a8", glow: "#f3b96b", deep: "#5a3010" },
    ice: { core: "#bcd5e4", land: "#7da0b6", ocean: "#3a5e7e", clouds: "#ffffff", glow: "#9ed1ff", deep: "#22394e" },
    ocean: { core: "#2e6e97", land: "#1f4f6e", ocean: "#0f3047", clouds: "#dfeef6", glow: "#73c2e3", deep: "#0a1f30" },
    swamp: { core: "#3d5e2c", land: "#2a4520", ocean: "#1e2f1a", clouds: "#a3b88a", glow: "#7ab84d", deep: "#15220e" },
    lava: { core: "#5b1a0e", land: "#911f0c", ocean: "#22120a", clouds: "#ffb47a", glow: "#ff5a2a", deep: "#0d0604" },
    toxic: { core: "#6f7a1a", land: "#48560f", ocean: "#1f2810", clouds: "#cfdb70", glow: "#9bb04a", deep: "#1c220a" },
    storm: { core: "#5c5b75", land: "#3e3d52", ocean: "#1c1c2e", clouds: "#cfd2e3", glow: "#9aa3d8", deep: "#0e0e1c" },
    urban: { core: "#5a5e6e", land: "#7d7f8c", ocean: "#3a3d4a", clouds: "#f7e7a8", glow: "#ffc66d", deep: "#1a1c25" },
  };
  const p = Object.assign({}, palettes[biome] || palettes.terran);
  if (faction === "republic") p.glow = "#ff7a8c";
  else if (faction === "separatist") p.glow = "#5fa8ff";
  return p;
}

function lightenHex(hex, amount) {
  const m = String(hex || "").replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  const int = Number.parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

function drawProceduralOrbit(ctx, size, item) {
  const rand = planetSeedRng(item.name);
  const biome = planetBiomeKey(item);
  const palette = planetBiomePalette(biome, item.faction);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  // Space background
  ctx.fillStyle = "#04080d";
  ctx.fillRect(0, 0, size, size);

  // Stars
  for (let i = 0; i < 70; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const dist = Math.hypot(sx - cx, sy - cy);
    if (dist < r + 4) continue;
    const sr = rand() * 0.9 + 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + rand() * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Atmosphere outer glow
  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.2);
  glowGrad.addColorStop(0, hexToRgba(palette.glow, 0.32));
  glowGrad.addColorStop(1, hexToRgba(palette.glow, 0));
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, size, size);

  // Planet base sphere
  const lightX = cx - r * 0.35;
  const lightY = cy - r * 0.35;
  const baseGrad = ctx.createRadialGradient(lightX, lightY, r * 0.05, cx, cy, r);
  baseGrad.addColorStop(0, lightenHex(palette.core, 0.35));
  baseGrad.addColorStop(0.55, palette.core);
  baseGrad.addColorStop(1, palette.deep);
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Surface features (clipped to sphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const blobs = 9 + Math.floor(rand() * 9);
  for (let i = 0; i < blobs; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * r * 0.85;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    const br = r * (0.08 + rand() * 0.24);
    const fill = rand() < 0.55 ? palette.land : palette.ocean;
    ctx.fillStyle = hexToRgba(fill.startsWith("#") ? fill : "#3d5e34", 0.5 + rand() * 0.4);
    ctx.beginPath();
    ctx.ellipse(bx, by, br, br * (0.55 + rand() * 0.7), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cloud bands
  const bands = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < bands; i++) {
    const yPos = cy + (rand() - 0.5) * r * 1.6;
    const thickness = r * (0.04 + rand() * 0.12);
    ctx.fillStyle = hexToRgba(palette.clouds.startsWith("#") ? palette.clouds : "#e8eef0", 0.1 + rand() * 0.18);
    ctx.beginPath();
    ctx.ellipse(cx, yPos, r * 1.05, thickness, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar caps for cold worlds
  if (biome === "ice" || (biome === "terran" && rand() > 0.55)) {
    const capAlpha = biome === "ice" ? 0.85 : 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${capAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.85, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.85, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lava cracks for lava worlds
  if (biome === "lava") {
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(255, 138, 61, 0.7)`;
      ctx.lineWidth = r * 0.03;
      ctx.beginPath();
      const startA = rand() * Math.PI * 2;
      const startR = rand() * r * 0.7;
      let lx = cx + Math.cos(startA) * startR;
      let ly = cy + Math.sin(startA) * startR;
      ctx.moveTo(lx, ly);
      const segments = 4 + Math.floor(rand() * 4);
      for (let s = 0; s < segments; s++) {
        lx += (rand() - 0.5) * r * 0.3;
        ly += (rand() - 0.5) * r * 0.3;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
  }

  ctx.restore();

  // Terminator shadow
  const shadGrad = ctx.createRadialGradient(cx + r * 0.45, cy + r * 0.35, r * 0.1, cx, cy, r);
  shadGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadGrad.addColorStop(0.7, "rgba(0, 0, 0, 0)");
  shadGrad.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = shadGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  const highGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, r * 0.6);
  highGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  highGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function renderProceduralOrbitSlot(slot, item) {
  const canvas = document.createElement("canvas");
  canvas.className = "orbit-procedural";
  const cssSize = 240;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${item.name || "Planet"} aus dem Orbit`);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  drawProceduralOrbit(ctx, cssSize, item);
  slot.innerHTML = "";
  slot.appendChild(canvas);
}

function detailMediaImageSrc(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^(data:|blob:|\/|\.\/|assets\/)/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) {
    return `/api/planets/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith("//")) {
    return `/api/planets/image-proxy?url=${encodeURIComponent(`https:${url}`)}`;
  }
  return url;
}

function renderDetailMedia(refs, item) {
  const isPlanet = item?.kind !== "route" && item?.kind !== "faction" && !isSectorArmyLayerItem(item);
  refs.media.classList.toggle("hidden", !isPlanet);
  if (!isPlanet) {
    if (window.PlanetMapSystem?.clearSlot) {
      window.PlanetMapSystem.clearSlot(refs.mapSlot);
    }
    return;
  }

  if (item.orbit_image) {
    refs.orbitSlot.innerHTML = `<img src="${escapeHtml(detailMediaImageSrc(item.orbit_image))}" alt="${escapeHtml(
      item.orbit_image_alt || `${item.name} aus dem Orbit`
    )}" />`;
  } else {
    renderProceduralOrbitSlot(refs.orbitSlot, item);
  }

  if (item.map_image) {
    refs.mapSlot.innerHTML = `<img src="${escapeHtml(detailMediaImageSrc(item.map_image))}" alt="${escapeHtml(
      item.map_image_alt || `${item.name} Planetenkarte`
    )}" />`;
    return;
  }

  if (window.PlanetMapSystem?.renderSlot && window.PlanetMapSystem.renderSlot(refs.mapSlot, item)) {
    return;
  }

  if (item.map_href) {
    refs.mapSlot.innerHTML = `<a class="detail-media-link" href="${escapeHtml(item.map_href)}">${escapeHtml(
      item.map_label || "Zur Planetenkarte"
    )}</a>`;
  } else {
    refs.mapSlot.innerHTML = '<div class="detail-media-placeholder">Planetenkarte folgt spaeter.</div>';
  }
}

function renderPlanetEvent(refs, item) {
  if (!refs.event) return;
  const eventText = String(item?.event_text || "").trim();
  const rawEventTitle = String(item?.event_title || "").trim();
  const eventTitle = rawEventTitle || "Aktives RPG-Event";
  const eventImage = String(item?.event_image || "").trim();
  if (!rawEventTitle && !eventText && !eventImage) {
    refs.event.classList.add("hidden");
    refs.event.innerHTML = "";
    return;
  }
  refs.event.classList.remove("hidden");
  refs.event.innerHTML = `
    <div class="planet-event-head">
      <span class="planet-event-icon" aria-hidden="true"></span>
      <div>
        <div class="planet-event-kicker">RPG-Event</div>
        <div class="planet-event-title">${escapeHtml(eventTitle)}</div>
      </div>
    </div>
    ${eventImage ? `<img class="planet-event-image" src="${escapeHtml(eventImage)}" alt="${escapeHtml(eventTitle)}" />` : ""}
    ${eventText ? `<div class="planet-event-text">${escapeHtml(eventText).replace(/\n/g, "<br>")}</div>` : ""}
  `;
}

function renderPlanetDetail(refs, item) {
  const notes = item.profile_notes || item.review_notes || item.ocr_text || "";
  const grid = normalizeGridLabel(item.grid) || guessGridFromPoint(item.x, item.y);
  const positionText = `${item.region || "Unbekannter Rim"} - Grid ${grid}`;
  const climateParts = [item.climate, item.terrain].filter(Boolean);
  setDetailFactLabels(refs, {
    position: "Position",
    faction: "Fraktion",
    climate: "Klima & Terrain",
    species: "Spezies & Bevoelkerung",
    source: "Quelle",
    wiki: "Wiki",
  });
  setDetailFactVisibility(refs, []);
  refs.facts?.classList.add("hidden");
  refs.grid.textContent = positionText;
  refs.name.textContent = item.name;
  refs.region.textContent = item.region || "Unknown";
  refs.desc.textContent = item.lore || item.desc || item.review_notes || "Keine Beschreibung vorhanden.";
  refs.position.textContent = positionText;
  refs.faction.textContent = factionDisplayName(item.faction);
  refs.climate.textContent = climateParts.length ? climateParts.join(" - ") : "Profil folgt per Ollama.";
  refs.species.textContent = item.species_population || "Profil folgt per Ollama.";
  refs.source.textContent = detailSourceText(item);
  refs.wiki.innerHTML = sourceLinksMarkup(item.sources);
  renderPlanetEvent(refs, item);
  refs.notes.textContent = notes;
  refs.notes.classList.toggle("hidden", !notes);
  renderDetailMedia(refs, item);
  refs.setTravelStartButton.textContent =
    selectedTravelPlanet("start")?.nameKey === item.nameKey ? "Start gesetzt" : "Als Start";
  refs.setTravelTargetButton.textContent =
    selectedTravelPlanet("target")?.nameKey === item.nameKey ? "Ziel gesetzt" : "Als Ziel";
  if (window.MapAdminUi && typeof window.MapAdminUi.onPlanetRendered === "function") {
    try {
      window.MapAdminUi.onPlanetRendered(refs, item);
    } catch (_e) {
      // Admin-UI darf den Detail-Render nie zerschiessen.
    }
  }
}

function renderFactionDetail(refs, item) {
  setDetailFactLabels(refs, {
    position: "Zugehoerige Planeten",
    faction: "Hauptplanet",
    source: "Quelle",
    wiki: "Wiki",
  });
  setDetailFactVisibility(refs, ["position", "faction", "source", "wiki"]);
  refs.facts?.classList.remove("hidden");
  refs.grid.textContent = `${item.fragment_summary || "Fraktionspraesenz"}`;
  refs.name.textContent = item.name;
  refs.region.textContent = "Klonkriege - 20 BBY";
  refs.desc.textContent = item.summary || item.desc || "Keine Beschreibung vorhanden.";
  refs.position.textContent = `${item.controlled_planets || 0}`;
  refs.faction.textContent = item.main_planet || "Unbekannt";
  refs.source.textContent = detailSourceText(item);
  refs.wiki.innerHTML = sourceLinksMarkup(item.sources);
  if (refs.event) {
    refs.event.classList.add("hidden");
    refs.event.innerHTML = "";
  }
  refs.notes.textContent = "";
  refs.notes.classList.add("hidden");
  renderDetailMedia(refs, { kind: "faction" });
}

function renderRouteDetail(refs, item) {
  const planetCount = Number(item.route_planet_count || 0);
  const notes = item.route_planets?.length ? `Verlauf: ${item.route_planets.join(" -> ")}` : "";
  const routeGrid = guessGridFromPoint(item.x, item.y);
  item.grid = routeGrid;
  setDetailFactLabels(refs, {
    position: "Anker",
    faction: "Fraktion",
    climate: "Klima & Terrain",
    species: "Spezies & Bevoelkerung",
    source: "Quelle",
    wiki: "Planeten",
  });
  setDetailFactVisibility(refs);
  refs.facts?.classList.remove("hidden");
  refs.grid.textContent = `Grid ${normalizeGridLabel(routeGrid)}`;
  refs.name.textContent = item.name;
  refs.region.textContent = "Hyperraumroute";
  refs.desc.textContent = item.desc || "Keine Beschreibung vorhanden.";
  refs.position.textContent = `${normalizeGridLabel(routeGrid)} - x=${formatCoord(item.x)} y=${formatCoord(item.y)}`;
  refs.faction.textContent = "-";
  refs.climate.textContent = "Hyperraumkorridor";
  refs.species.textContent = `${planetCount} angebundene Planeten`;
  refs.source.textContent = detailSourceText(item);
  refs.wiki.textContent = planetCount ? `${planetCount}` : "0";
  if (refs.event) {
    refs.event.classList.add("hidden");
    refs.event.innerHTML = "";
  }
  refs.notes.textContent = notes;
  refs.notes.classList.toggle("hidden", !notes);
  renderDetailMedia(refs, item);
}

function renderSectorArmyDetail(refs, item) {
  const army = item.army || {};
  const territory = item.territory || {};
  const status = sectorArmyDisplayStatus(army, territory);
  const grid = normalizeGridLabel(item.grid) || guessGridFromPoint(item.x, item.y);
  const anchors = Array.isArray(territory.anchorPlanets) ? territory.anchorPlanets : [];
  setDetailFactLabels(refs, {
    position: "Operationsraum",
    faction: "Lage",
    climate: "Schiffstabelle Republik",
    species: "Schiffstabelle KUS",
    source: "Quelle",
    wiki: "Ankerplaneten",
  });
  setDetailFactVisibility(refs);
  refs.climate?.closest("div")?.classList.add("detail-fact-wide", "detail-fact-table");
  refs.species?.closest("div")?.classList.add("detail-fact-wide", "detail-fact-table");
  refs.facts?.classList.remove("hidden");
  refs.grid.textContent = `Grid ${normalizeGridLabel(grid)}`;
  refs.name.textContent = sectorArmyDisplayTitle(army);
  refs.region.textContent = "Sektorarmeen & Flottenlage";
  refs.desc.textContent = army.notes || "Feste OOC-Schiffszahlen. IC-Nutzung nur mit Aufklaerung/Begruendung.";
  refs.position.textContent = `${normalizeGridLabel(grid)} - ${sectorArmyPolygonPoints(territory).length} Grenzpunkte`;
  refs.faction.textContent = status;
  refs.climate.innerHTML = sectorFleetAvailabilityTableMarkup(army, "republic");
  refs.species.innerHTML = sectorFleetAvailabilityTableMarkup(army, "cis");
  refs.source.textContent = detailSourceText(item);
  refs.wiki.innerHTML = anchors.length
    ? anchors.map((name) => `<span class="sector-anchor-chip">${escapeHtml(name)}</span>`).join("")
    : '<span class="muted-inline">Noch keine Anker gesetzt.</span>';
  if (refs.event) {
    refs.event.classList.add("hidden");
    refs.event.innerHTML = "";
  }
  const notesMarkup = sectorArmyDetailNotesMarkup(army, territory);
  refs.notes.innerHTML = notesMarkup;
  refs.notes.classList.toggle("hidden", !notesMarkup.trim());
  renderDetailMedia(refs, { kind: "route" });
}

function renderStrategicAssetDetail(refs, item) {
  const asset = item.asset || {};
  const grid = normalizeGridLabel(item.grid) || guessGridFromPoint(item.x, item.y);
  setDetailFactLabels(refs, {
    position: "Stationierung",
    faction: "Fraktion",
    climate: "Assets",
    species: "Beweglichkeit",
    source: "Quelle",
    wiki: "Transfer UI",
  });
  setDetailFactVisibility(refs);
  refs.facts?.classList.remove("hidden");
  refs.grid.textContent = `Grid ${normalizeGridLabel(grid)}`;
  refs.name.textContent = item.name;
  refs.region.textContent = "Strategische Reserve";
  refs.desc.textContent = asset.notes || "Strategisches Flotten-Asset. Nicht Teil normaler Transfers.";
  refs.position.textContent = asset.locationHint || `Grid ${normalizeGridLabel(grid)}`;
  refs.faction.textContent = asset.faction === "cis" ? "KUS" : "Republik";
  refs.climate.innerHTML = strategicAssetSummaryMarkup(asset);
  refs.species.textContent = asset.movable ? "beweglich" : "nicht frei beweglich";
  refs.source.textContent = detailSourceText(item);
  refs.wiki.textContent = asset.visibleInNormalTransferUi ? "sichtbar" : "ausgeblendet";
  if (refs.event) {
    refs.event.classList.add("hidden");
    refs.event.innerHTML = "";
  }
  refs.notes.textContent = asset.notes || "";
  refs.notes.classList.toggle("hidden", !asset.notes);
  renderDetailMedia(refs, { kind: "route" });
}

function renderPlanetPanel() {
  const item = selectedDetailItem();
  planetDetailRefs.clearButton.classList.toggle("hidden", !item);
  if (!item) {
    planetDetailRefs.kind.textContent = "leer";
    planetDetailRefs.empty.classList.remove("hidden");
    planetDetailRefs.body.classList.add("hidden");
    planetDetailRefs.actions.classList.add("hidden");
    if (planetDetailRefs.event) {
      planetDetailRefs.event.classList.add("hidden");
      planetDetailRefs.event.innerHTML = "";
    }
    renderDetailMedia(planetDetailRefs, { kind: "route" });
    return;
  }

  planetDetailRefs.kind.textContent = sourceLabel(item);
  planetDetailRefs.empty.classList.add("hidden");
  planetDetailRefs.body.classList.remove("hidden");
  if (item.kind === "route") {
    planetDetailRefs.actions.classList.add("hidden");
    renderRouteDetail(planetDetailRefs, item);
    return;
  }
  if (item.kind === "sectorArmy") {
    planetDetailRefs.actions.classList.add("hidden");
    renderSectorArmyDetail(planetDetailRefs, item);
    return;
  }
  if (item.kind === "strategicAsset") {
    planetDetailRefs.actions.classList.add("hidden");
    renderStrategicAssetDetail(planetDetailRefs, item);
    return;
  }
  planetDetailRefs.actions.classList.remove("hidden");
  renderPlanetDetail(planetDetailRefs, item);
}

function renderFactionPanel() {
  const item = selectedFactionItem();
  factionDetailRefs.clearButton.classList.toggle("hidden", !item);
  if (!item) {
    factionDetailRefs.kind.textContent = "leer";
    factionDetailRefs.empty.classList.remove("hidden");
    factionDetailRefs.body.classList.add("hidden");
    factionDetailRefs.actions.classList.add("hidden");
    renderDetailMedia(factionDetailRefs, { kind: "faction" });
    return;
  }

  factionDetailRefs.kind.textContent = "Fraktion";
  factionDetailRefs.empty.classList.add("hidden");
  factionDetailRefs.body.classList.remove("hidden");
  factionDetailRefs.actions.classList.add("hidden");
  renderFactionDetail(factionDetailRefs, item);
}

function renderSectorArmyEditor() {
  if (!sectorArmyEditorMount) return;
  const available = sectorArmyEditorAvailable();
  // Enforce strict flow: only show the full editor UI when an admin explicitly started
  // a boundary edit via the Infopanel confirmation. The mount should remain hidden
  // to prevent starting edits from the Legend/Filter panel.
  const editingActive = available && state.sectorArmyEditor.enabled;
  sectorArmyEditorMount.classList.toggle("hidden", !editingActive);
  if (!editingActive) {
    sectorArmyEditorMount.innerHTML = "";
    return;
  }

  const territories = sectorArmyTerritories();
  if (!sectorArmyById(state.sectorArmyEditor.selectedId) && territories[0]) {
    state.sectorArmyEditor.selectedId = territories[0].id;
  }
  const territory = selectedSectorArmyEditorTerritory();
  const army = sectorArmyById(territory?.id);
  const polygon = sectorArmyPolygonPoints(territory);
  const label = normalizeSectorPoint(territory?.labelPosition);
  const validation = state.sectorArmyEditor.validation.length
    ? state.sectorArmyEditor.validation
    : validateSectorArmyTerritory(territory);
  const statusValue = String(territory?.status || army?.status || "");
  const statusOptions = [
    ["unbearbeitet", "Originalstatus verwenden"],
    ...Object.entries(SECTOR_ARMY_STATUS_META).map(([key, meta]) => [key, meta.label]),
  ]
    .map(
      ([key, labelText]) =>
        `<option value="${escapeHtml(key)}" ${key === statusValue ? "selected" : ""}>${escapeHtml(labelText)}</option>`
    )
    .join("");
  const pointRows = polygon.length
    ? polygon
      .map(
        (point, index) => `
            <button type="button" class="sector-editor-point-row ${index === state.sectorArmyEditor.selectedPointIndex ? "is-selected" : ""
          }" data-sector-editor-action="select-point" data-index="${index}" ${state.sectorArmyEditor.enabled ? "" : "disabled"}>
              <span>#${index + 1}</span>
              <code>${point.x.toFixed(4)}, ${point.y.toFixed(4)}</code>
            </button>
          `
      )
      .join("")
    : '<div class="empty-state">Noch keine Polygonpunkte gesetzt.</div>';
  const exportText = state.sectorArmyEditor.exportText || "";
  const boundaryEditing = isSectorArmyBoundaryEditActive(territory?.id);
  const editDisabled = boundaryEditing ? "" : "disabled";

  sectorArmyEditorMount.innerHTML = `
    <div class="sector-army-editor ${boundaryEditing ? "is-enabled" : ""}">
      <div class="sector-editor-head">
        <div>
          <strong>Sektorarmee-Editor</strong>
          <span>${boundaryEditing ? "Klick setzt Punkte, Shift+Klick setzt Label" : "Grenzen sind gesperrt"}</span>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <button type="button" class="ghost-button compact" data-sector-editor-action="toggle">
            ${boundaryEditing ? "Bearbeitung beenden" : "Grenzen bearbeiten"}
          </button>
          <button type="button" class="ghost-button compact ${state.sectorArmyEditor.mode === "sector" ? "is-active" : ""}" data-sector-editor-action="mode" data-mode="sector" ${editDisabled}>Sektor</button>
          <button type="button" class="ghost-button compact ${state.sectorArmyEditor.mode === "vertex" ? "is-active" : ""}" data-sector-editor-action="mode" data-mode="vertex" ${editDisabled}>Vertex</button>
          <button type="button" class="ghost-button compact ${state.sectorArmyEditor.mode === "curve" ? "is-active" : ""}" data-sector-editor-action="mode" data-mode="curve" ${editDisabled}>Curve</button>
          <button type="button" class="ghost-button compact ${state.sectorArmyEditor.modifyMode ? "is-active" : ""}" data-sector-editor-action="modify" ${editDisabled}>
            ${state.sectorArmyEditor.modifyMode ? "Modify aus" : "Modify an"}
          </button>
        </div>
      </div>
      <div class="sector-editor-grid">
        <label>
          <span>Sektorarmee</span>
          <select data-sector-editor-field="selectedId">
            ${territories
      .map((entry) => {
        const entryArmy = sectorArmyById(entry.id);
        return `<option value="${entry.id}" ${Number(entry.id) === Number(state.sectorArmyEditor.selectedId) ? "selected" : ""}>${entry.id
          }. ${escapeHtml(entryArmy?.name || entry.name)}</option>`;
      })
      .join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select data-sector-editor-field="status" ${editDisabled}>${statusOptions}</select>
        </label>
      </div>
      <div class="sector-editor-lock-note">
        Schiffszahlen werden im Sektorarmee-Infopanel ueber "Schiffstabelle bearbeiten" freigeschaltet.
      </div>
      <div class="sector-editor-actions">
        <button type="button" class="ghost-button compact" data-sector-editor-action="focus">Fokussieren</button>
        <button type="button" class="ghost-button compact ${state.sectorArmyEditor.labelMode ? "is-active" : ""}" data-sector-editor-action="label-mode" ${editDisabled}>Label setzen</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="add-center" ${editDisabled}>Punkt am Label</button>
        <button type="button" class="danger-button compact" data-sector-editor-action="remove-point" ${editDisabled}>Punkt loeschen</button>
        <button type="button" class="danger-button compact" data-sector-editor-action="delete-territory" ${editDisabled}>Gebiet loeschen</button>
      </div>
      <label class="sector-editor-wide">
        <span>Ankerplaneten</span>
        <input type="text" data-sector-editor-field="anchors" value="${escapeHtml((territory?.anchorPlanets || []).join(", "))}" ${editDisabled} />
      </label>
      <label class="sector-editor-wide">
        <span>Notizen</span>
        <textarea rows="2" data-sector-editor-field="notes" ${editDisabled}>${escapeHtml(territory?.notes || "")}</textarea>
      </label>
      <label class="sector-editor-check">
        <input type="checkbox" data-sector-editor-field="locked" ${territory?.locked ? "checked" : ""} ${editDisabled} />
        <span>Grenze sperren</span>
      </label>
      <div class="sector-editor-meta">
        <span>${polygon.length} Punkte</span>
        <span>Label ${label ? `${label.x.toFixed(3)}, ${label.y.toFixed(3)}` : "fehlt"}</span>
      </div>
      <div class="sector-editor-points">${pointRows}</div>
      <div class="sector-editor-validation ${validation.length ? "has-warnings" : "is-ok"}">
        ${validation.length ? validation.map((message) => `<span>${escapeHtml(message)}</span>`).join("") : "<span>Grenze sieht technisch gueltig aus.</span>"}
      </div>
      <div class="sector-editor-actions">
        <button type="button" class="ghost-button compact" data-sector-editor-action="validate">Validieren</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="undo" ${editDisabled}>Rückgängig</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="redo" ${editDisabled}>Wiederherstellen</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="export-selected-json">Export Sektor</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="export-json">JSON exportieren</button>
        <button type="button" class="ghost-button compact" data-sector-editor-action="export-ts">TS exportieren</button>
        <button type="button" class="danger-button compact" data-sector-editor-action="reset" ${editDisabled}>Lokal verwerfen</button>
      </div>
      <textarea class="sector-editor-export" rows="5" data-sector-editor-field="exportText" placeholder="Export erscheint hier, Import-JSON hier einfuegen.">${escapeHtml(
        exportText
      )}</textarea>
      <div class="sector-editor-actions">
        <button type="button" class="accent-button compact" data-sector-editor-action="import" ${editDisabled}>Import anwenden</button>
      </div>
    </div>
  `;
}

function renderMapTools() {
  if (mapToolsSummaryChip) {
    mapToolsSummaryChip.textContent = mapFilterSummaryText();
    mapToolsSummaryChip.className = `pill ${activeMapFilterCount() ? "accent" : "muted"}`;
  }

  mapFilterButtons.forEach((button) => {
    const key = String(button.dataset.filterKey || "").trim();
    if (!key || !(key in state.filters)) return;
    const sectorBlocked = key === "sectorArmies" && state.mapMode === "underworld";
    const pressed = !sectorBlocked && Boolean(state.filters[key]);
    button.classList.toggle("is-active", pressed);
    button.classList.toggle("is-disabled", sectorBlocked);
    button.disabled = sectorBlocked;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    button.setAttribute("aria-disabled", sectorBlocked ? "true" : "false");
    if (sectorBlocked) {
      button.title = "Sektorarmeen bleiben im Underworld-Modus ausgeblendet";
    } else {
      button.removeAttribute("title");
    }
  });
  renderSectorArmyEditor();
}

function mapCountLabel(visibleCount, totalCount, label) {
  return visibleCount === totalCount ? `${totalCount} ${label}` : `${visibleCount}/${totalCount} ${label}`;
}

function renderSidebar() {
  renderMapToolsTitle();
  renderMobileTravelButton();
  renderMapTools();
  renderGridMeta();
  renderTravelPlanner();
  renderFleetPanel();
  renderNewsPanel();
  renderContextList();
  renderPlanetPanel();
  renderFactionPanel();
  applyDesktopWindowLayout(false);
}

function persistSession() {
  const payload = {
    currentGrid: state.currentGrid,
    selectedDetailKey: state.selectedDetailKey,
    selectedFactionKey: state.selectedFactionKey,
    viewMode: state.viewMode,
    filters: state.filters,
    panelExpanded: state.panelExpanded,
    desktopWindowVisibility: state.desktopWindowVisibility,
    panelWindowOffsets: state.desktopWindowOffsets,
    desktopWindowSizes: state.desktopWindowSizes,
    desktopWindowMaximized: state.desktopWindowMaximized,
    travelStartKey: state.travelStartKey,
    travelTargetKey: state.travelTargetKey,
    travelStartText: state.travelStartText,
    travelTargetText: state.travelTargetText,
    travelHyperdriveClass: state.travelHyperdriveClass,
    travelFleetId: state.travelFleetId,
    saved: Object.fromEntries(
      savedPlanetsArray().map((item) => [
        item.name,
        {
          x: Number(item.x.toFixed(4)),
          y: Number(item.y.toFixed(4)),
          grid: normalizeGridLabel(item.grid),
          region: item.region || "Unknown",
        },
      ])
    ),
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function loadSessionFromStorage() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.currentGrid) state.currentGrid = normalizeGridLabel(payload.currentGrid) || state.currentGrid;
    Object.entries(payload.saved || {}).forEach(([name, item]) => {
      upsertSavedPlanet({
        name,
        x: Number(item.x),
        y: Number(item.y),
        grid: item.grid,
        region: item.region,
      });
    });
    state.selectedDetailKey = normalizeNameKey(payload.selectedDetailKey || payload.selectedKey);
    state.selectedFactionKey = String(payload.selectedFactionKey || "").trim();
    state.viewMode = normalizeViewMode(payload.viewMode);
    state.filters = normalizeMapFilters(payload.filters);
    // Prevent sector armies filter from being re-enabled automatically for non-admin users.
    // The editor/sector layer should only show by explicit user action or when admin/dev flags are set.
    try {
      const available = sectorArmyEditorAvailable();
      if (!available) state.filters.sectorArmies = false;
    } catch (_error) {
      // ignore errors and keep the normalized filters
    }
    if (payload.panelExpanded && typeof payload.panelExpanded === "object") {
      state.panelExpanded = {
        ...state.panelExpanded,
        travel: payload.panelExpanded.travel !== false,
        fleet: payload.panelExpanded.fleet !== false,
        news: payload.panelExpanded.news !== false,
        planetDetail: payload.panelExpanded.planetDetail !== false,
        detail: payload.panelExpanded.detail !== false,
        mapTools: payload.panelExpanded.mapTools !== false,
      };
    }
    state.desktopWindowVisibility = normalizeDesktopWindowVisibility(payload.desktopWindowVisibility);
    state.desktopWindowOffsets = normalizeDesktopWindowOffsets(payload.panelWindowOffsets);
    state.desktopWindowSizes = normalizeDesktopWindowSizes(payload.desktopWindowSizes);
    state.desktopWindowMaximized = normalizeDesktopWindowMaximized(payload.desktopWindowMaximized);
    state.travelStartKey = normalizeNameKey(payload.travelStartKey);
    state.travelTargetKey = normalizeNameKey(payload.travelTargetKey);
    state.travelStartText = String(payload.travelStartText || "");
    state.travelTargetText = String(payload.travelTargetText || "");
    state.travelHyperdriveClass = Math.max(0.1, Number(payload.travelHyperdriveClass) || 1);
    state.travelFleetId = String(payload.travelFleetId || "");
    state.travelNeedsRun = Boolean(
      state.travelStartKey || state.travelTargetKey || state.travelStartText || state.travelTargetText
    );
    state.dataSources.push("Lokale Browser-Session wiederhergestellt");
  } catch (_error) {
    state.dataSources.push("Lokale Browser-Session konnte nicht geladen werden");
  }
}

function upsertSavedPlanet(item) {
  const known = getKnownPlanet(item.name);
  const record = mergePlanetRecord(known || item, {
    ...item,
    kind: "saved",
    decision: "saved",
  });
  state.savedByKey.set(record.nameKey, record);
  invalidateStaticOverlay();
}

function upsertReviewCandidate(item) {
  const known = getKnownPlanet(item.name);
  const record = mergePlanetRecord(known || item, {
    ...item,
    kind: "review",
    decision: item.decision || "review",
  });
  record.review_notes = item.review_notes || item.notes || "";
  record.review_confidence = Number(item.review_confidence || item.confidence || item.conf || 0);
  record.conf = Number(item.conf || 0);
  record.ocr_text = item.ocr_text || item.text || "";
  record.exists_in_wiki = Boolean(item.exists_in_wiki || item.wiki?.exists);
  record.wiki = item.wiki || {};
  state.reviewByKey.set(record.nameKey, record);
  invalidateStaticOverlay();
}

function importCalibratedPayload(payload, sourceLabelText) {
  Object.entries(payload || {}).forEach(([name, item]) => {
    upsertSavedPlanet({ name, ...item });
  });
  rebuildVectorPaths();
  state.dataSources.push(sourceLabelText);
  persistSession();
  renderAll();
}

function importPlanetFactionsPayload(payload, sourceLabelText) {
  importPlanetAliasesFromFactionPayload(payload);
  const factions = new Map();
  Object.entries(payload?.factions || {}).forEach(([name, value]) => {
    const faction = normalizeFaction(typeof value === "string" ? value : value?.faction);
    if (!faction) return;
    factions.set(normalizeNameKey(name), faction);
  });
  state.governmentPlanetFactions = factions;
  if (state.mapMode === "government") {
    state.planetFactions = new Map(factions);
  }

  state.supplementalPlanetKeys.forEach((key) => {
    state.savedByKey.delete(key);
  });
  state.supplementalPlanetKeys.clear();

  [state.knownByKey, state.savedByKey, state.reviewByKey, state.gridMarkers].forEach((collection) => {
    collection.forEach((item, key) => {
      collection.set(key, applyPlanetEnrichments({ ...item }));
    });
  });

  Object.entries(payload?.supplemental_planets || {}).forEach(([name, item]) => {
    const record = mergePlanetRecord(item, {
      name,
      kind: "saved",
      decision: "saved",
      approximate: Boolean(item?.approximate),
    });
    state.savedByKey.set(record.nameKey, record);
    state.supplementalPlanetKeys.add(record.nameKey);
  });

  state.dataSources.push(sourceLabelText);
  invalidateStaticOverlay();
  persistSession();
  renderAll();
}

function importUnderworldFactionsPayload(payload, sourceLabelText) {
  const factions = new Map();
  Object.entries(payload?.factions || {}).forEach(([name, value]) => {
    const faction = normalizeFaction(typeof value === "string" ? value : value?.faction);
    if (!faction) return;
    factions.set(normalizeNameKey(name), faction);
  });
  state.underworldPlanetFactions = factions;
  if (state.mapMode === "underworld") {
    state.planetFactions = new Map(factions);
    [state.knownByKey, state.savedByKey, state.reviewByKey, state.gridMarkers].forEach((collection) => {
      collection.forEach((item, key) => {
        collection.set(key, applyPlanetEnrichments({ ...item }));
      });
    });
    invalidateStaticOverlay();
    renderAll();
  }
  if (sourceLabelText) state.dataSources.push(sourceLabelText);
}

function setMapMode(mode) {
  const next = mode === "underworld" ? "underworld" : "government";
  if (state.mapMode === next) return;
  showMapModeOverlay(next);
  // Doppelt requestAnimationFrame: erst Overlay zeichnen lassen,
  // dann den schweren Mode-Switch starten.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      performMapModeSwitch(next);
    });
  });
}

function performMapModeSwitch(next) {
  state.mapMode = next;
  if (next === "underworld") {
    state.filters = {
      ...state.filters,
      sectorArmies: false,
    };
    clearSectorArmyEditModes();
    if (isSectorArmyLayerItem(selectedDetailItem())) {
      state.selectedDetailKey = null;
    }
    if (isSectorArmyLayerItem(hoveredItem())) {
      state.hoveredKey = null;
    }
  }
  const source =
    next === "underworld" ? state.underworldPlanetFactions : state.governmentPlanetFactions;
  state.planetFactions = new Map(source || []);
  state.factionFragments = [];
  state.factionFragmentKey = "";
  state.factionItems = new Map();
  state.factionItemsKey = "";
  state.lastCanvasOverlayKey = "";
  state.lastStaticOverlayKey = "";
  // Stale faction-Felder loeschen, damit applyFactionRecord die neue
  // Mode-Map konsultiert statt der alten enrichments.
  [state.knownByKey, state.savedByKey, state.reviewByKey, state.gridMarkers].forEach((collection) => {
    collection.forEach((item, key) => {
      const cleared = { ...item };
      delete cleared.faction;
      collection.set(key, applyPlanetEnrichments(cleared));
    });
  });
  document.body.classList.toggle("map-mode-underworld", next === "underworld");
  document.body.classList.toggle("map-mode-government", next === "government");
  updateMapModeToggleButton();
  syncFactionFilterChipsForMode();
  invalidateStaticOverlay();
  renderAll();
  // Overlay nach kurzer Verzoegerung verstecken, damit der User den
  // Wechsel sieht und die Karte nicht hart umflackert.
  setTimeout(hideMapModeOverlay, 320);
}

function showMapModeOverlay(mode) {
  let overlay = document.getElementById("mapModeTransitionOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mapModeTransitionOverlay";
    overlay.className = "map-mode-transition-overlay";
    overlay.innerHTML = `
      <div class="map-mode-transition-card">
        <div class="map-mode-transition-spinner" aria-hidden="true"></div>
        <div class="map-mode-transition-text"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const text = overlay.querySelector(".map-mode-transition-text");
  if (text) {
    text.textContent =
      mode === "underworld"
        ? "Wechsle in den Unterwelt-Modus..."
        : "Zurueck zur Clone-Wars-Karte...";
  }
  overlay.classList.add("is-visible");
}

function hideMapModeOverlay() {
  const overlay = document.getElementById("mapModeTransitionOverlay");
  if (overlay) overlay.classList.remove("is-visible");
}

function updateMapModeToggleButton() {
  const btn = document.getElementById("mapModeToggleButton");
  if (!btn) return;
  if (state.mapMode === "underworld") {
    btn.textContent = "Clone Wars";
    btn.setAttribute("aria-pressed", "true");
    btn.title = "Zur regulaeren Clone-Wars-Karte zurueckwechseln";
  } else {
    btn.textContent = "Underworld";
    btn.setAttribute("aria-pressed", "false");
    btn.title = "Zur Underworld-Ansicht wechseln";
  }
}

function syncFactionFilterChipsForMode() {
  const isUnderworld = state.mapMode === "underworld";
  document.querySelectorAll('[data-filter-key]').forEach((chip) => {
    const key = chip.getAttribute("data-filter-key");
    if (GOVERNMENT_FACTION_KEYS.includes(key)) {
      chip.classList.toggle("filter-chip-hidden", isUnderworld);
      chip.style.display = "";
    } else if (UNDERWORLD_FACTION_KEYS.includes(key)) {
      chip.classList.toggle("filter-chip-hidden", !isUnderworld);
      chip.style.display = "";
    }
  });
}

function normalizeFleetShipCatalogEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || "").trim();
  const name = String(entry.name || "").trim();
  if (!id || !name) return null;
  const faction = String(entry.faction || "").trim() === "separatist" ? "separatist" : "republic";
  return {
    ...entry,
    id,
    name,
    faction,
    factionName: String(entry.factionName || fleetFactionLabel(faction)).trim(),
    category: String(entry.category || "Unsortiert").trim(),
    role: String(entry.role || "").trim(),
    manufacturer: String(entry.manufacturer || "").trim(),
    lengthMeters: Number.isFinite(Number(entry.lengthMeters)) ? Number(entry.lengthMeters) : null,
    crew: Number.isFinite(Number(entry.crew)) ? Number(entry.crew) : null,
    passengers: Number.isFinite(Number(entry.passengers)) ? Number(entry.passengers) : null,
    hyperdriveClass: Number.isFinite(Number(entry.hyperdriveClass)) ? Number(entry.hyperdriveClass) : null,
    backupHyperdriveClass: Number.isFinite(Number(entry.backupHyperdriveClass))
      ? Number(entry.backupHyperdriveClass)
      : null,
    shieldsSbd: Number.isFinite(Number(entry.shieldsSbd)) ? Number(entry.shieldsSbd) : null,
    hullRu: Number.isFinite(Number(entry.hullRu)) ? Number(entry.hullRu) : null,
    mglt: Number.isFinite(Number(entry.mglt)) ? Number(entry.mglt) : null,
    dpf: Number.isFinite(Number(entry.dpf)) ? Number(entry.dpf) : null,
    optimalDamage: Number.isFinite(Number(entry.optimalDamage)) ? Number(entry.optimalDamage) : null,
  };
}

function importFleetShipsPayload(payload, sourceLabelText) {
  const ships = (Array.isArray(payload?.ships) ? payload.ships : [])
    .map(normalizeFleetShipCatalogEntry)
    .filter(Boolean)
    .sort((left, right) => {
      const factionSort = left.faction.localeCompare(right.faction);
      if (factionSort) return factionSort;
      const categorySort = fleetCategoryRank(left.category) - fleetCategoryRank(right.category);
      if (categorySort) return categorySort;
      return left.name.localeCompare(right.name, "de");
    });
  state.shipCatalog = ships;
  state.shipCatalogById = new Map(ships.map((ship) => [ship.id, ship]));
  state.dataSources.push(sourceLabelText);
  renderAll();
}

async function loadUnderworldFactionsJson() {
  const data = await tryFetchJson("underworld_factions.json");
  if (data && data.factions) {
    importUnderworldFactionsPayload(data, "underworld_factions.json automatisch geladen");
  }
}

function importPlanetProfilesPayload(payload, sourceLabelText) {
  const profiles = new Map();
  Object.entries(payload?.profiles || {}).forEach(([name, value]) => {
    const entry = normalizePlanetProfileEntry(name, value);
    if (entry) profiles.set(entry.nameKey, entry);
  });
  state.planetProfiles = profiles;

  const factions = new Map();
  Object.keys(DEFAULT_FACTION_PROFILES).forEach((faction) => {
    const fallback = normalizeFactionProfileEntry(faction, DEFAULT_FACTION_PROFILES[faction]);
    if (fallback) factions.set(faction, fallback);
  });
  Object.entries(payload?.factions || {}).forEach(([faction, value]) => {
    const entry = normalizeFactionProfileEntry(faction, value);
    if (entry) factions.set(entry.faction, entry);
  });
  state.factionProfiles = factions;

  [state.knownByKey, state.savedByKey, state.reviewByKey, state.gridMarkers].forEach((collection) => {
    collection.forEach((item, key) => {
      collection.set(key, applyPlanetEnrichments({ ...item }));
    });
  });

  state.dataSources.push(sourceLabelText);
  invalidateStaticOverlay();
  renderAll();
}

function importVectorPathsPayload(payload, sourceLabelText) {
  state.baseVectorPaths = Array.isArray(payload?.paths)
    ? payload.paths.filter((path) => normalizeNameKey(path?.name) !== "republik fraktion")
    : [];
  rebuildVectorPaths();
  state.dataSources.push(sourceLabelText);
  renderAll();
}

function importHyperspaceRoutesPayload(payload, sourceLabelText) {
  state.hyperspaceRouteDefs = Array.isArray(payload?.routes) ? payload.routes : [];
  state.hyperspaceNetwork =
    payload?.network && typeof payload.network === "object" ? payload.network : null;
  state.travelGraph = null;
  rebuildVectorPaths();
  state.dataSources.push(sourceLabelText);
  renderAll();
}

function importGridGuidesPayload(payload, sourceLabelText) {
  state.gridGuides = Array.isArray(payload?.guides) ? payload.guides : [];
  state.dataSources.push(sourceLabelText);
  invalidateStaticOverlay();
  renderAll();
}

function importGridMarkersPayload(payload, sourceLabelText) {
  state.gridMarkers = new Map(
    Object.entries(payload || {}).map(([name, item]) => [name, mergePlanetRecord(item, { name, kind: "grid" })])
  );
  state.dataSources.push(sourceLabelText);
  invalidateStaticOverlay();
  renderAll();
}

function importReviewPayload(payload, sourceLabelText) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  candidates.forEach((item) => upsertReviewCandidate(item));
  if (payload?.grid) {
    state.currentGrid = normalizeGridLabel(payload.grid) || state.currentGrid;
  }
  state.dataSources.push(sourceLabelText);
  persistSession();
  renderAll();
}

async function tryFetchJson(path) {
  const cacheKey = String(path || "").trim();
  if (!cacheKey) return null;
  if (state.jsonDataCache.has(cacheKey)) {
    return state.jsonDataCache.get(cacheKey);
  }
  if (state.jsonFetchPromises.has(cacheKey)) {
    return state.jsonFetchPromises.get(cacheKey);
  }

  const request = (() => {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), JSON_FETCH_TIMEOUT_MS) : 0;
    return fetch(cacheKey, {
      cache: "default",
      signal: controller?.signal,
    })
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (payload) {
          state.jsonDataCache.set(cacheKey, payload);
        }
        return payload;
      })
      .catch(() => null)
      .finally(() => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        state.jsonFetchPromises.delete(cacheKey);
      });
  })();

  state.jsonFetchPromises.set(cacheKey, request);
  try {
    return await request;
  } catch (_error) {
    return null;
  }
}

async function loadCoreJsonData() {
  const [calibrated, factions, vectorPaths, hyperspaceRoutes, gridGuides, gridMarkers, fleetShips] = await Promise.all([
    tryFetchJson("calibrated_planets.json"),
    tryFetchJson("planet_factions.json"),
    tryFetchJson("rim_curves.json"),
    tryFetchJson("hyperspace_routes.json"),
    tryFetchJson("grid_guides.json"),
    tryFetchJson("grid_markers.json"),
    tryFetchJson("data/fleet_ships.json"),
  ]);

  if (calibrated) {
    importCalibratedPayload(calibrated, "calibrated_planets.json automatisch geladen");
  }
  if (factions) {
    importPlanetFactionsPayload(factions, "planet_factions.json automatisch geladen");
  }
  if (vectorPaths && Array.isArray(vectorPaths.paths)) {
    importVectorPathsPayload(vectorPaths, "rim_curves.json automatisch geladen");
  }
  if (hyperspaceRoutes && Array.isArray(hyperspaceRoutes.routes)) {
    importHyperspaceRoutesPayload(hyperspaceRoutes, "hyperspace_routes.json automatisch geladen");
  }
  if (gridGuides && Array.isArray(gridGuides.guides)) {
    importGridGuidesPayload(gridGuides, "grid_guides.json automatisch geladen");
  }
  if (gridMarkers) {
    importGridMarkersPayload(gridMarkers, "grid_markers.json automatisch geladen");
  }
  if (fleetShips && Array.isArray(fleetShips.ships)) {
    importFleetShipsPayload(fleetShips, "fleet_ships.json automatisch geladen");
  }
  if (!state.factionProfiles.size) {
    importPlanetProfilesPayload({ factions: DEFAULT_FACTION_PROFILES, profiles: {} }, "Standard-Fraktionsprofile geladen");
  }
  loadPlanetOverrides();
  loadUnderworldFactionsJson();
}

async function loadDeferredVisualJsonData() {
  if (state.hyperspaceRouteDefs.length) {
    return true;
  }
  const hyperspaceRoutes = await tryFetchJson("hyperspace_routes.json");
  if (hyperspaceRoutes && Array.isArray(hyperspaceRoutes.routes)) {
    importHyperspaceRoutesPayload(hyperspaceRoutes, "hyperspace_routes.json im Hintergrund geladen");
  }
  return Boolean(hyperspaceRoutes && Array.isArray(hyperspaceRoutes.routes));
}

async function loadDeferredProfileJsonData() {
  const profiles = await tryFetchJson("planet_profiles.json");
  if (profiles && (profiles.profiles || profiles.factions)) {
    importPlanetProfilesPayload(profiles, "planet_profiles.json im Hintergrund geladen");
  }
  applyAllPlanetOverrides();
}

const PLANET_OVERRIDE_FIELDS = [
  "climate",
  "terrain",
  "species_population",
  "lore",
  "notes",
  "orbit_image",
  "orbit_image_alt",
  "map_image",
  "map_image_alt",
  "event_title",
  "event_text",
  "event_image",
  "faction",
  "underworld_faction",
];

function isPlanetFactionOverrideField(key) {
  return key === "faction" || key === "underworld_faction";
}

function applyPlanetOverrideToState(name, fields) {
  if (!name || !fields || typeof fields !== "object") return;
  const targetKeys = planetOverrideTargetKeys(name);
  if (!targetKeys.length) return;

  targetKeys.forEach((nameKey) => {
    const profile = state.planetProfiles.get(nameKey);
    if (profile) {
      for (const key of PLANET_OVERRIDE_FIELDS) {
        if (isPlanetFactionOverrideField(key)) continue;
        if (fields[key] !== undefined) {
          profile[key] = fields[key] == null ? "" : String(fields[key]);
        }
      }
    }

    if (fields.faction !== undefined) {
      applyFactionOverrideToMaps(nameKey, fields.faction);
    }
    if (fields.underworld_faction !== undefined) {
      applyUnderworldFactionOverrideToMaps(nameKey, fields.underworld_faction);
    }

    [state.knownByKey, state.savedByKey, state.reviewByKey, state.gridMarkers].forEach((collection) => {
      if (collection.has(nameKey)) {
        const current = { ...collection.get(nameKey) };
        for (const key of PLANET_OVERRIDE_FIELDS) {
          if (isPlanetFactionOverrideField(key)) continue;
          if (fields[key] !== undefined) {
            current[key] = fields[key] == null ? "" : String(fields[key]);
          }
        }
        collection.set(nameKey, applyPlanetEnrichments(current));
      }
    });
  });
}

function applyAllPlanetOverrides() {
  const overrides = state.planetOverrides;
  if (!overrides || typeof overrides !== "object") return;
  let any = false;
  for (const [name, fields] of Object.entries(overrides)) {
    applyPlanetOverrideToState(name, fields);
    any = true;
  }
  if (any) {
    invalidateStaticOverlay();
    renderAll();
  }
}

function loadLocalPlanetOverrides() {
  try {
    const raw = localStorage.getItem(PLANET_OVERRIDES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function saveLocalPlanetOverrides() {
  try {
    localStorage.setItem(PLANET_OVERRIDES_STORAGE_KEY, JSON.stringify(state.planetOverrides || {}));
    return true;
  } catch (_error) {
    return false;
  }
}

async function loadPlanetOverrides() {
  const localOverrides = loadLocalPlanetOverrides();
  try {
    // Avoid noisy 404s on a local static server that doesn't expose the API.
    if (window.location.protocol === "file:" || ["127.0.0.1", "localhost"].includes(window.location.hostname)) {
      state.planetOverrides = localOverrides;
      state.planetOverridesLoaded = true;
      applyAllPlanetOverrides();
      return;
    }
    const res = await fetch("/api/planets/overrides", { cache: "no-cache" });
    if (!res.ok) {
      // treat as missing but avoid throwing to keep the console clean for expected 404s
      state.planetOverrides = localOverrides;
      state.planetOverridesLoaded = true;
      applyAllPlanetOverrides();
      return;
    }
    const json = await res.json().catch(() => ({}));
    state.planetOverrides = {
      ...((json && json.overrides) || {}),
      ...localOverrides,
    };
    state.planetOverridesLoaded = true;
    applyAllPlanetOverrides();
  } catch (_e) {
    state.planetOverrides = localOverrides;
    state.planetOverridesLoaded = true;
    applyAllPlanetOverrides();
  }
}

function setLocalPlanetOverride(name, fields, options = {}) {
  if (!name) return;
  const planetName = String(name).trim();
  if (!planetName) return;
  if (!state.planetOverrides || typeof state.planetOverrides !== "object") {
    state.planetOverrides = {};
  }
  const current = state.planetOverrides[planetName] || {};
  const next = { ...current };
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === null || value === "" || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  if (Object.keys(next).length === 0) {
    delete state.planetOverrides[planetName];
  } else {
    state.planetOverrides[planetName] = next;
  }
  applyPlanetOverrideToState(planetName, fields || {});
  if (options.persist !== false) {
    saveLocalPlanetOverrides();
  }
  invalidateStaticOverlay();
  renderAll();
}

function clearLocalPlanetOverride(name, options = {}) {
  const planetName = String(name || "").trim();
  if (!planetName || !state.planetOverrides || typeof state.planetOverrides !== "object") return;
  delete state.planetOverrides[planetName];
  if (options.persist !== false) {
    saveLocalPlanetOverrides();
  }
}

window.MapAdminApi = window.MapAdminApi || {};
window.MapAdminApi.setLocalOverride = setLocalPlanetOverride;
window.MapAdminApi.clearLocalOverride = clearLocalPlanetOverride;
window.MapAdminApi.applyAll = applyAllPlanetOverrides;
window.MapAdminApi.getOverrides = () => state.planetOverrides;
window.MapAdminApi.getMapMode = () => state.mapMode;

function ensurePlanetProfilesLoaded() {
  if (state.planetProfiles.size) {
    return Promise.resolve(true);
  }
  if (state.planetProfileLoadPromise) {
    return state.planetProfileLoadPromise;
  }
  state.planetProfileLoadRequested = true;
  state.planetProfileLoadPromise = loadDeferredProfileJsonData()
    .then(() => state.planetProfiles.size > 0)
    .catch(() => false)
    .finally(() => {
      if (!state.planetProfiles.size) {
        state.planetProfileLoadRequested = false;
      }
      state.planetProfileLoadPromise = null;
    });
  return state.planetProfileLoadPromise;
}

function scheduleProgressiveStartupLoads() {
  if (state.progressiveStartupScheduled) {
    return state.progressiveStartupPromise || Promise.resolve(false);
  }
  state.progressiveStartupScheduled = true;
  const loadingMessage = "2D-Karte bereit. Profile werden im Hintergrund vorbereitet.";
  setStatus(loadingMessage);

  state.progressiveStartupPromise = scheduleBackgroundTask(() => loadDeferredVisualJsonData(), { delay: 180, timeout: 1500 })
    .then(() => scheduleBackgroundTask(() => loadDeferredProfileJsonData(), { delay: 2200, timeout: 4200 }))
    .then((ready) => {
      if (statusBar?.textContent === loadingMessage) {
        setStatus(
          ready
            ? "Karte komplett geladen. 3D wird erst beim Umschalten geladen."
            : "Karte bereit. 3D wird erst beim Umschalten geladen."
        );
      }
    })
    .catch(() => undefined)
    .finally(() => {
      state.progressiveStartupPromise = null;
    });

  return state.progressiveStartupPromise;
}

function threeDesktopNavigationEnabled() {
  return !state.isMobileView;
}

function threeWorldScaleMultiplier() {
  return threeDesktopNavigationEnabled() ? 18 : 1;
}

function threeWorldWidth() {
  return THREE_VIEW_WORLD_WIDTH * threeWorldScaleMultiplier();
}

function threeWorldHeight() {
  return THREE_VIEW_WORLD_HEIGHT * threeWorldScaleMultiplier();
}

function threeDefaultGalaxyDistance() {
  return threeDesktopNavigationEnabled() ? THREE_VIEW_DEFAULT_DISTANCE * 10.5 : THREE_VIEW_DEFAULT_DISTANCE;
}

function threeGalaxyMinDistance() {
  return threeDesktopNavigationEnabled() ? 2.8 : THREE_VIEW_MIN_DISTANCE;
}

function threeGalaxyMaxDistance() {
  return threeDesktopNavigationEnabled() ? THREE_VIEW_MAX_DISTANCE * 18 : THREE_VIEW_MAX_DISTANCE;
}

function threePlanetFocusDistance() {
  return threeDesktopNavigationEnabled() ? 680 : 88;
}

function threePlanetExitFocusDistance() {
  return threeDesktopNavigationEnabled() ? 820 : 92;
}

function threeBeaconActivationDistance() {
  if (!threeDesktopNavigationEnabled()) return 0;
  return Math.sqrt(threeDefaultGalaxyDistance() * threeGalaxyMinDistance());
}

function threeFastTravelDurationMs() {
  return threeDesktopNavigationEnabled() ? 780 : 0;
}

function threeFastTravelLandingDistance(item) {
  const orbitProfile = item ? threeOrbitDistanceProfile(item) : null;
  if (!threeDesktopNavigationEnabled()) return orbitProfile?.viewDistance || THREE_ORBIT_VIEW_DISTANCE;
  return clamp(
    Math.max(threePlanetFocusDistance() * 0.78, (orbitProfile?.exitDistance || 42) * 6.8),
    260,
    920
  );
}

function threeStableNoise(seed) {
  const text = String(seed || "galaxy");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function threeDiscHeightOffset(seed, normalizedX, normalizedY) {
  const baseSeed = `${String(seed || "disc")}|${normalizedX.toFixed(4)}|${normalizedY.toFixed(4)}`;
  const primary = threeStableNoise(`${baseSeed}:primary`) * 2 - 1;
  const secondary = threeStableNoise(`${baseSeed}:secondary`) * 2 - 1;
  return primary * THREE_VIEW_DISC_VARIANCE + secondary * THREE_VIEW_DISC_MICRO_VARIANCE;
}

function threeWorldVectorFromNormalized(x, y, seed = "") {
  const normalizedX = clamp01(Number(x) || 0);
  const normalizedY = clamp01(Number(y) || 0);
  const worldX = (normalizedX - 0.5) * threeWorldWidth();
  const worldZ = (0.5 - normalizedY) * threeWorldHeight();
  const worldY = threeDiscHeightOffset(seed, normalizedX, normalizedY);
  return new THREE.Vector3(worldX, worldY, worldZ);
}

function threeWorldVectorFromItem(item, extraLift = 0) {
  const seed =
    item?.nameKey ||
    item?.name ||
    `${normalizeNameKey(item?.region)}|${Number(item?.x || 0).toFixed(4)}|${Number(item?.y || 0).toFixed(4)}`;
  const vector = threeWorldVectorFromNormalized(item?.x, item?.y, seed);
  vector.y += Number(extraLift) || 0;
  return vector;
}

function planetOrbitReferenceClass(item) {
  const explicitType = String(item?.size_body_type || "").trim().toLowerCase();
  if (explicitType === "gas_giant" || explicitType === "moon" || explicitType === "terrestrial" || explicitType === "artificial") {
    return explicitType;
  }
  const text = [item?.terrain, item?.desc, item?.lore, item?.orbit_image_alt]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(gasriese|gas giant|gasplanet)/.test(text)) {
    return "gasGiant";
  }
  if (/(^|[^a-z])(mond|moon)([^a-z]|$)/.test(text)) {
    return "moon";
  }
  return "terrestrial";
}

function openspaceReferenceRadiusKmForPlanet(item) {
  const explicitRadius = normalizePositiveNumber(item?.radius_km);
  if (explicitRadius) {
    return explicitRadius;
  }
  const explicitDiameter = normalizePositiveNumber(item?.diameter_km);
  if (explicitDiameter) {
    return explicitDiameter * 0.5;
  }
  return DEFAULT_PLANET_RADIUS_KM;
}

function threeOrbitSceneRadius(item) {
  const referenceRadiusKm = openspaceReferenceRadiusKmForPlanet(item);
  const relativeRadius = Math.max(referenceRadiusKm / OPENSPACE_REFERENCE_RADII_KM.terrestrial, 0.01);
  const scaleFactor = clamp(
    Math.pow(relativeRadius, THREE_ORBIT_RADIUS_EXPONENT),
    THREE_ORBIT_RADIUS_MIN_FACTOR,
    THREE_ORBIT_RADIUS_MAX_FACTOR
  );
  return THREE_ORBIT_SPHERE_RADIUS * scaleFactor;
}

// Follow OpenSpace's model: zoom is measured as height above the surface, not just distance to the center.
function threeOrbitDistanceProfile(item) {
  const radius = threeOrbitSceneRadius(item);
  const minSurfaceDistance = clamp(radius * THREE_ORBIT_SURFACE_MIN_RATIO, 0.42, 2.35);
  const viewSurfaceDistance = clamp(radius * THREE_ORBIT_SURFACE_VIEW_RATIO, 2.1, 9.6);
  const maxSurfaceDistance = clamp(radius * THREE_ORBIT_SURFACE_MAX_RATIO, 16, 52);
  const viewDistance = radius + viewSurfaceDistance;
  const minDistance = radius + minSurfaceDistance;
  const maxDistance = radius + maxSurfaceDistance;
  return {
    radius,
    viewDistance,
    minDistance,
    maxDistance,
    exitDistance: clamp(radius + maxSurfaceDistance * 0.86, viewDistance + 2.5, maxDistance - 1.5),
  };
}

function threeNormalizedBoundsFromPixels(bounds) {
  if (!bounds || !state.imageWidth || !state.imageHeight) return null;
  return {
    left: clamp01(bounds.left / state.imageWidth),
    top: clamp01(bounds.top / state.imageHeight),
    right: clamp01(bounds.right / state.imageWidth),
    bottom: clamp01(bounds.bottom / state.imageHeight),
  };
}

function threeFocusVectorFromBounds(bounds, region = "") {
  if (!bounds) return new THREE.Vector3(0, 0, 0);
  const centerX = (bounds.left + bounds.right) * 0.5;
  const centerY = (bounds.top + bounds.bottom) * 0.5;
  const focus = threeWorldVectorFromNormalized(centerX, centerY, `focus:${region}`);
  focus.y = 0;
  return focus;
}

function threeDistanceForBounds(bounds, extraDistance = 0) {
  const width = Math.max(0.04, (bounds?.right || 0) - (bounds?.left || 0));
  const height = Math.max(0.04, (bounds?.bottom || 0) - (bounds?.top || 0));
  const span = Math.max(width * threeWorldWidth(), height * threeWorldHeight());
  return clamp(118 + span * 2.6 + extraDistance, threeGalaxyMinDistance(), threeGalaxyMaxDistance());
}

function threePlanetBaseHex(item) {
  const faction = normalizeFaction(item?.faction);
  if (faction === "republic") return "#ff5f7c";
  if (faction === "separatist") return "#63b9ff";
  if (faction === "hutt") return "#ffd86f";
  if (faction === "blacksun") return "#ff9a2f";
  if (faction === "pyke") return "#6ee984";
  if (faction === "ohnaka") return "#d29aff";
  return "#f8fbff";
}

function ensureThreeTexture(key, factory) {
  if (state.three.textures.has(key)) {
    return state.three.textures.get(key);
  }
  const texture = factory();
  if ("colorSpace" in texture && THREE?.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  state.three.textures.set(key, texture);
  return texture;
}

function createThreeCanvasTexture(draw, size = 256, height = size) {
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.floor(Number(size) || 256));
  const resolvedHeight = Math.max(1, Math.floor(Number(height) || width));
  canvas.width = width;
  canvas.height = resolvedHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  draw(ctx, width, resolvedHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createThreePointTexture() {
  return createThreeCanvasTexture((ctx, size) => {
    const center = size * 0.5;
    const radius = size * 0.42;
    const gradient = ctx.createRadialGradient(center, center, size * 0.05, center, center, radius);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.98)");
    gradient.addColorStop(0.78, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createThreeRingTexture() {
  return createThreeCanvasTexture((ctx, size) => {
    const center = size * 0.5;
    const radius = size * 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.96)";
    ctx.lineWidth = size * 0.075;
    ctx.shadowColor = "rgba(255,255,255,0.66)";
    ctx.shadowBlur = size * 0.085;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function createThreeGlowTexture() {
  return createThreeCanvasTexture((ctx, size) => {
    const center = size * 0.5;
    const radius = size * 0.48;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.96)");
    gradient.addColorStop(0.28, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.62, "rgba(255,255,255,0.14)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function threeRimRegionConfig(name) {
  const key = normalizeNameKey(name);
  return THREE_RIM_HUD_REGIONS.find((entry) => normalizeNameKey(entry.name) === key) || null;
}

function createThreeRimLabelTexture(text, accentHex) {
  const label = String(text || "").trim() || "Rim";
  const accent = new THREE.Color(accentHex || "#8de6ff");
  const width = 512;
  const height = 140;
  return createThreeCanvasTexture((ctx, canvasWidth, canvasHeight) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const radius = 42;
    const inset = 10;
    ctx.beginPath();
    ctx.moveTo(inset + radius, inset);
    ctx.lineTo(canvasWidth - inset - radius, inset);
    ctx.quadraticCurveTo(canvasWidth - inset, inset, canvasWidth - inset, inset + radius);
    ctx.lineTo(canvasWidth - inset, canvasHeight - inset - radius);
    ctx.quadraticCurveTo(canvasWidth - inset, canvasHeight - inset, canvasWidth - inset - radius, canvasHeight - inset);
    ctx.lineTo(inset + radius, canvasHeight - inset);
    ctx.quadraticCurveTo(inset, canvasHeight - inset, inset, canvasHeight - inset - radius);
    ctx.lineTo(inset, inset + radius);
    ctx.quadraticCurveTo(inset, inset, inset + radius, inset);
    ctx.closePath();

    const fill = ctx.createLinearGradient(0, inset, 0, canvasHeight - inset);
    fill.addColorStop(0, "rgba(5, 16, 28, 0.84)");
    fill.addColorStop(1, "rgba(4, 10, 18, 0.58)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = `rgba(${Math.round(accent.r * 255)}, ${Math.round(accent.g * 255)}, ${Math.round(accent.b * 255)}, 0.72)`;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(${Math.round(accent.r * 255)}, ${Math.round(accent.g * 255)}, ${Math.round(accent.b * 255)}, 0.2)`;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(240, 247, 255, 0.96)";
    ctx.font = "700 44px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.08em";
    ctx.fillText(label.toUpperCase(), canvasWidth * 0.5, canvasHeight * 0.52);
  }, width, height);
}

function createThreeNoiseStarTexture() {
  const texture = createThreeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = "#010308";
    ctx.fillRect(0, 0, width, height);

    const image = ctx.createImageData(width, height);
    const data = image.data;
    for (let y = 0; y < height; y += 1) {
      const latitude = ((y / Math.max(1, height - 1)) - 0.5) * Math.PI;
      const sinLat = Math.sin(latitude);
      const cosLat = Math.cos(latitude);
      for (let x = 0; x < width; x += 1) {
        const longitude = (x / width) * Math.PI * 2;
        const waveA = 0.5 + 0.5 * Math.sin(longitude * 2 + sinLat * 1.8 + Math.cos(longitude * 5 - latitude * 2.4) * 0.7);
        const waveB = 0.5 + 0.5 * Math.cos(longitude * 4 - latitude * 1.9 + Math.sin(longitude * 7 + latitude * 3.8) * 0.55);
        const waveC = 0.5 + 0.5 * Math.sin(longitude * 9 + latitude * 5.2);
        const waveD = 0.5 + 0.5 * Math.cos(longitude * 13 - latitude * 8.1);
        const dustBase = clamp01(waveA * 0.34 + waveB * 0.29 + waveC * 0.21 + waveD * 0.16);
        const dust = Math.pow(dustBase, 3.1) * (0.72 + cosLat * 0.28);
        const horizonGlow = Math.pow(Math.max(0, 1 - Math.abs(sinLat)), 1.6);
        const offset = (y * width + x) * 4;
        data[offset] = 2 + dust * 18 + horizonGlow * 1.6;
        data[offset + 1] = 5 + dust * 24 + horizonGlow * 2.2;
        data[offset + 2] = 11 + dust * 42 + horizonGlow * 5.4;
        data[offset + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const drawWrappedGlow = (x, y, radius, innerColor, outerColor) => {
      [-width, 0, width].forEach((offsetX) => {
        const gradient = ctx.createRadialGradient(x + offsetX, y, 0, x + offsetX, y, radius);
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(0.42, outerColor);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    [
      ["rgba(102, 166, 255, 0.1)", "rgba(102, 166, 255, 0.04)"],
      ["rgba(154, 128, 255, 0.08)", "rgba(154, 128, 255, 0.03)"],
      ["rgba(106, 240, 224, 0.07)", "rgba(106, 240, 224, 0.028)"],
      ["rgba(255, 184, 122, 0.05)", "rgba(255, 184, 122, 0.02)"],
    ].forEach((palette, index, palettes) => {
      const repeats = 4;
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        const centerX = ((index + repeat * palettes.length) / (repeats * palettes.length)) * width + Math.random() * width * 0.05;
        const centerY = Math.random() * height;
        const radius = Math.min(width, height) * (0.12 + Math.random() * 0.24);
        drawWrappedGlow(centerX, centerY, radius, palette[0], palette[1]);
      }
    });

    for (let index = 0; index < 4; index += 1) {
      const bandY = height * (0.26 + index * 0.16 + Math.random() * 0.05);
      const bandGradient = ctx.createLinearGradient(0, bandY - height * 0.12, 0, bandY + height * 0.12);
      bandGradient.addColorStop(0, "rgba(0,0,0,0)");
      bandGradient.addColorStop(0.5, "rgba(166, 208, 255, 0.03)");
      bandGradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bandGradient;
      ctx.fillRect(0, bandY - height * 0.12, width, height * 0.24);
    }

    const drawWrappedStar = (x, y, radius, fillStyle) => {
      [-width, 0, width].forEach((offsetX) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const starCount = Math.floor(width * 1.52);
    for (let index = 0; index < starCount; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() < 0.982 ? 0.12 + Math.random() * 0.24 : 0.42 + Math.random() * 0.3;
      const alpha = 0.14 + Math.random() * 0.48;
      const coolBias = Math.random();
      const red = Math.round(235 + (1 - coolBias) * 14);
      const green = Math.round(240 + coolBias * 10);
      const blue = Math.round(248 + coolBias * 7);
      drawWrappedStar(x, y, radius, `rgba(${red},${green},${blue},${alpha.toFixed(3)})`);
      if (radius > 0.58) {
        [-width, 0, width].forEach((offsetX) => {
          ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.1).toFixed(3)})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(x + offsetX - radius * 1.8, y);
          ctx.lineTo(x + offsetX + radius * 1.8, y);
          ctx.moveTo(x + offsetX, y - radius * 1.8);
          ctx.lineTo(x + offsetX, y + radius * 1.8);
          ctx.stroke();
        });
      }
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.14, width * 0.5, height * 0.5, width * 0.6);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }, 2048, 1024);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function applyThreeEnvironmentBackground(scene) {
  if (!scene) return;
  const texture = ensureThreeTexture("noise-stars", createThreeNoiseStarTexture);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  if ("backgroundIntensity" in scene) {
    scene.backgroundIntensity = 1;
  }
  if ("backgroundBlurriness" in scene) {
    scene.backgroundBlurriness = 0;
  }
  if ("backgroundRotation" in scene && scene.backgroundRotation?.set) {
    scene.backgroundRotation.set(0, 0, 0);
  }
}

function createThreeTwinkleStarField({
  count,
  bounds,
  sizeRange,
  opacity,
  clusterScale,
  clusterRatio = 0.56,
}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const clusterCenters = [
    new THREE.Vector3(-220, 26, -180),
    new THREE.Vector3(210, -20, -140),
    new THREE.Vector3(-110, 18, 160),
    new THREE.Vector3(170, -14, 190),
    new THREE.Vector3(0, 34, -46),
    new THREE.Vector3(0, -26, 62),
  ];
  const palette = [
    new THREE.Color("#f7fbff"),
    new THREE.Color("#d7ebff"),
    new THREE.Color("#ffe9cf"),
    new THREE.Color("#c6ddff"),
  ];

  const scatterAround = (center, scale) =>
    center + (Math.random() + Math.random() + Math.random() + Math.random() - 2) * scale;

  for (let index = 0; index < count; index += 1) {
    const useCluster = Math.random() < clusterRatio;
    let x;
    let y;
    let z;
    if (useCluster) {
      const center = clusterCenters[index % clusterCenters.length];
      x = scatterAround(center.x, clusterScale.x);
      y = scatterAround(center.y, clusterScale.y);
      z = scatterAround(center.z, clusterScale.z);
    } else {
      x = (Math.random() - 0.5) * bounds.x * 2;
      y = (Math.random() - 0.5) * bounds.y * 2;
      z = (Math.random() - 0.5) * bounds.z * 2;
    }
    positions.set([x, y, z], index * 3);
    const sizeMix = Math.pow(Math.random(), 0.32);
    sizes[index] = THREE.MathUtils.lerp(sizeRange.min, sizeRange.max, sizeMix);
    phases[index] = Math.random() * Math.PI * 2;
    twinkles[index] = 0.65 + Math.random() * 1.9;
    const paletteColor = palette[index % palette.length].clone();
    const tintMix = Math.random() * 0.34;
    const brightness = 0.5 + Math.random() * 0.8;
    const color = paletteColor.lerp(new THREE.Color("#ffffff"), tintMix).multiplyScalar(brightness);
    colors.set([color.r, color.g, color.b], index * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("aTwinkle", new THREE.Float32BufferAttribute(twinkles, 1));

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: opacity },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      attribute float aSize;
      attribute float aPhase;
      attribute float aTwinkle;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(1.0, abs(mvPosition.z));
        float twinkle = 0.72 + 0.28 * sin(uTime * aTwinkle + aPhase);
        float attenuation = clamp(320.0 / dist, 0.38, 3.2);
        gl_PointSize = clamp(aSize * attenuation * twinkle, 0.65, 8.4);
        gl_Position = projectionMatrix * mvPosition;
        vColor = color * (0.72 + twinkle * 0.42);
        vAlpha = 0.7 + twinkle * 0.3;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float dist = length(centered);
        float halo = smoothstep(0.5, 0.04, dist);
        float core = smoothstep(0.23, 0.0, dist);
        float alpha = (halo * 0.62 + core * 0.48) * uOpacity * vAlpha;
        if (alpha < 0.01) discard;
        vec3 color = vColor * (0.7 + core * 0.42);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -11;
  points.userData = {
    twinkleUniforms: uniforms,
  };
  return points;
}

function createThreeStarLayer({ count, size, opacity, bounds, clusterScale, clusterRatio = 0.68 }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color("#f3f9ff");
  const cool = new THREE.Color("#d9ecff");
  const clusterCenters = [
    new THREE.Vector3(-210, 24, -180),
    new THREE.Vector3(170, -16, -220),
    new THREE.Vector3(210, 36, 180),
    new THREE.Vector3(-180, -24, 210),
    new THREE.Vector3(0, 46, -120),
    new THREE.Vector3(0, -36, 140),
    new THREE.Vector3(110, 0, 0),
    new THREE.Vector3(-120, 10, 24),
  ];

  const scatterAround = (center, scale) =>
    center + (Math.random() + Math.random() + Math.random() + Math.random() - 2) * scale;

  for (let index = 0; index < count; index += 1) {
    const useCluster = Math.random() < clusterRatio;
    let x;
    let y;
    let z;
    if (useCluster) {
      const center = clusterCenters[index % clusterCenters.length];
      x = scatterAround(center.x, clusterScale.x);
      y = scatterAround(center.y, clusterScale.y);
      z = scatterAround(center.z, clusterScale.z);
    } else {
      x = (Math.random() - 0.5) * bounds.x * 2;
      y = (Math.random() - 0.5) * bounds.y * 2;
      z = (Math.random() - 0.5) * bounds.z * 2;
    }
    positions.set([x, y, z], index * 3);
    const mix = Math.random() * 0.22;
    const brightness = 0.42 + Math.random() * 0.58;
    const color = base.clone().lerp(cool, mix).multiplyScalar(brightness);
    colors.set([color.r, color.g, color.b], index * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    map: ensureThreeTexture("glow", createThreeGlowTexture),
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -12;
  return points;
}

function threeLowPowerMode() {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const cores = Number(navigator.hardwareConcurrency || 0);
  return state.isMobileView || Boolean(reducedMotion) || (cores > 0 && cores <= 4);
}

function threePerformanceProfile() {
  return threeLowPowerMode() ? THREE_PERFORMANCE_PRESETS.lowPower : THREE_PERFORMANCE_PRESETS.default;
}

function threePerformanceKey() {
  return threeLowPowerMode() ? "low-power" : "default";
}

function simplifyThreeSamples(samples) {
  if (!Array.isArray(samples) || samples.length <= 2) return Array.isArray(samples) ? samples : [];
  const budget = Math.max(2, threePerformanceProfile().routePointBudget);
  if (samples.length <= budget) return samples;

  const lastIndex = samples.length - 1;
  const step = Math.max(1, Math.ceil(lastIndex / (budget - 1)));
  const simplified = [samples[0]];
  for (let index = step; index < lastIndex; index += step) {
    simplified.push(samples[index]);
  }
  simplified.push(samples[lastIndex]);
  return simplified;
}

function threeDistanceLimits() {
  if (state.three.mode === "orbit") {
    const orbitItem = activeThreeOrbitItem();
    const orbitProfile = orbitItem ? threeOrbitDistanceProfile(orbitItem) : null;
    return orbitProfile
      ? { min: orbitProfile.minDistance, max: orbitProfile.maxDistance }
      : { min: THREE_ORBIT_MIN_DISTANCE, max: THREE_ORBIT_MAX_DISTANCE };
  }
  return { min: threeGalaxyMinDistance(), max: threeGalaxyMaxDistance() };
}

function clampThreeDistance(value) {
  const limits = threeDistanceLimits();
  return clamp(value, limits.min, limits.max);
}

function activeThreeOrbitItem() {
  const item = getSelectableItemByKey(state.three.orbitItemKey);
  return item && item.kind !== "route" && item.kind !== "faction" ? item : null;
}

function createThreeEllipseLine(radiusX, radiusZ, y, color, opacity = 0.3) {
  const points = [];
  const segments = threePerformanceProfile().orbitRingSegments;
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.LineLoop(geometry, material);
}

function threeRimVectorPaths() {
  const allowed = new Set(THREE_RIM_HUD_REGIONS.map((entry) => normalizeNameKey(entry.name)));
  return (Array.isArray(state.baseVectorPaths) ? state.baseVectorPaths : []).filter(
    (path) => allowed.has(normalizeNameKey(path?.name)) && String(path?.path_kind || "").trim() !== "hyperspace-route"
  );
}

function threeRimVectorAnchor(path, targetDirection) {
  const anchors = (Array.isArray(path?.points) ? path.points : [])
    .map((point) => normalizePoint01(point?.anchor))
    .filter(Boolean);
  if (!anchors.length) return routeAnchorPoint(path, sampleVectorPathPolyline(path, 4));

  let best = anchors[0];
  let bestScore = -Infinity;
  anchors.forEach((anchor) => {
    const dx = anchor.x - 0.5;
    const dz = 0.5 - anchor.y;
    const length = Math.hypot(dx, dz) || 1;
    const score = (dx / length) * (targetDirection?.x || 0) + (dz / length) * (targetDirection?.z || 0);
    if (score > bestScore) {
      bestScore = score;
      best = anchor;
    }
  });
  return best;
}

function buildThreeRimRibbonGeometry(samples, height, lateralOffset = 0) {
  if (!Array.isArray(samples) || samples.length < 2) return null;
  const positions = [];
  const uvs = [];
  const indices = [];
  const cumulative = [0];

  for (let index = 1; index < samples.length; index += 1) {
    cumulative[index] = cumulative[index - 1] + samples[index].distanceTo(samples[index - 1]);
  }
  const totalLength = Math.max(1, cumulative[cumulative.length - 1] || 1);

  const centerPoints = samples.map((point, index) => {
    const previous = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangent = next.clone().sub(previous);
    tangent.y = 0;
    if (tangent.lengthSq() <= 0.0001) {
      tangent.set(1, 0, 0);
    } else {
      tangent.normalize();
    }
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    return point.clone().addScaledVector(normal, lateralOffset);
  });

  centerPoints.forEach((center, index) => {
    const bottom = center.clone();
    bottom.y -= height;
    const top = center.clone();
    top.y += height;
    positions.push(bottom.x, bottom.y, bottom.z, top.x, top.y, top.z);
    const u = cumulative[index] / totalLength;
    uvs.push(u, 0, u, 1);
  });

  for (let index = 0; index < centerPoints.length - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createThreeRimLightRibbon(samples, accentHex, { height, opacity, lateralOffset = 0, shimmerPhase = 0 }) {
  const geometry = buildThreeRimRibbonGeometry(samples, height, lateralOffset);
  if (!geometry) return null;
  const color = new THREE.Color(accentHex || "#8de6ff");
  const uniforms = {
    uColor: { value: color },
    uOpacity: { value: opacity },
    uTime: { value: 0 },
    uPhase: { value: shimmerPhase + lateralOffset * 0.8 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uPhase;
      varying vec2 vUv;

      void main() {
        float vertical = max(0.0, 1.0 - abs(vUv.y * 2.0 - 1.0));
        float verticalGlow = pow(vertical, 1.85);
        float halo = pow(vertical, 1.24);
        float shimmer = 0.76 + 0.24 * sin(vUv.x * 34.0 - uTime * 0.85 + uPhase);
        float grain = 0.92 + 0.08 * sin(vUv.x * 160.0 + uTime * 0.45 + uPhase * 1.7);
        float alpha = halo * shimmer * grain * uOpacity;
        if (alpha < 0.008) discard;
        vec3 color = uColor * (0.56 + verticalGlow * 0.54 + shimmer * 0.08);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  mesh.userData.rimLightUniforms = uniforms;
  mesh.raycast = () => null;
  return mesh;
}

function createThreeRimLabelSprite(name, accentHex) {
  const texture = createThreeRimLabelTexture(name, accentHex);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.92,
  });
  material.userData = {
    ...(material.userData || {}),
    disposeMap: true,
  };
  const sprite = new THREE.Sprite(material);
  const widthScale = clamp(18 + String(name || "").length * 0.64, 20, 32);
  sprite.scale.set(widthScale, 6.1, 1);
  sprite.renderOrder = 4;
  sprite.raycast = () => null;
  return sprite;
}

function createThreeRimLightGroup(path) {
  const config = threeRimRegionConfig(path?.name);
  const samples = sampleVectorPathPolyline(path, THREE_RIM_SAMPLE_SUBDIVISIONS).map((point, index) => {
    const world = threeWorldVectorFromNormalized(point.x, point.y, `rim:${normalizeNameKey(path?.name)}:${index}`);
    world.y += 0.35;
    return world;
  });
  if (samples.length < 2) return null;

  const group = new THREE.Group();
  const accentHex = config?.accent || VECTOR_LAYER_COLORS[normalizeNameKey(path?.name)] || "#8de6ff";
  THREE_RIM_LIGHT_LAYERS.forEach((layer) => {
    layer.offsets.forEach((offset) => {
      const ribbon = createThreeRimLightRibbon(samples, accentHex, {
        height: layer.height,
        opacity: layer.opacity,
        lateralOffset: offset,
        shimmerPhase: layer.shimmerPhase,
      });
      if (ribbon) group.add(ribbon);
    });
  });

  const anchor = threeRimVectorAnchor(path, config?.direction || { x: 0, z: 1 });
  if (anchor) {
    const label = createThreeRimLabelSprite(path.name, accentHex);
    label.position.copy(threeWorldVectorFromNormalized(anchor.x, anchor.y, `rim-label:${normalizeNameKey(path?.name)}`));
    label.position.y += THREE_RIM_LABEL_LIFT;
    group.add(label);
  }

  group.userData = {
    kind: "rim-light",
    rimName: path?.name || "",
  };
  return group;
}

function createThreeBackdropGroup() {
  const profile = threePerformanceProfile();
  const group = new THREE.Group();
  const travelFieldScale = threeDesktopNavigationEnabled() ? 7.4 : 1;

  const ultraField = createThreeStarLayer({
    count: Math.max(460, Math.floor(profile.starCount * 0.52)),
    size: 0.34,
    opacity: 0.24,
    bounds: { x: 1220, y: 300, z: 1220 },
    clusterScale: { x: 180, y: 34, z: 180 },
    clusterRatio: 0.28,
  });
  ultraField.renderOrder = -16;
  ultraField.userData = {
    followCameraFactor: 0.035,
    spinSpeed: -0.0012,
  };
  group.add(ultraField);

  const farField = createThreeStarLayer({
    count: Math.max(520, Math.floor(profile.starCount * 0.28)),
    size: 0.48,
    opacity: 0.36,
    bounds: { x: 920, y: 220, z: 920 },
    clusterScale: { x: 148, y: 28, z: 148 },
    clusterRatio: 0.44,
  });
  farField.renderOrder = -14;
  farField.userData = {
    followCameraFactor: 0.06,
    spinSpeed: 0.0017,
  };
  group.add(farField);

  const midField = createThreeStarLayer({
    count: Math.max(420, Math.floor(profile.starCount * 0.14)),
    size: 0.62,
    opacity: 0.5,
    bounds: { x: 640, y: 134, z: 640 },
    clusterScale: { x: 72, y: 16, z: 72 },
    clusterRatio: 0.72,
  });
  midField.renderOrder = -12;
  midField.userData = {
    followCameraFactor: 0.095,
    spinSpeed: -0.0024,
  };
  group.add(midField);

  const nearField = createThreeStarLayer({
    count: Math.max(260, Math.floor(profile.starCount * 0.05)),
    size: 0.86,
    opacity: 0.74,
    bounds: { x: 420, y: 80, z: 420 },
    clusterScale: { x: 34, y: 10, z: 34 },
    clusterRatio: 0.82,
  });
  nearField.renderOrder = -10;
  nearField.userData = {
    followCameraFactor: 0.14,
    spinSpeed: 0.0034,
  };
  group.add(nearField);

  const galacticDust = createThreeStarLayer({
    count: Math.max(160, Math.floor(profile.starCount * 0.03)),
    size: threeLowPowerMode() ? 2.2 : 2.8,
    opacity: threeLowPowerMode() ? 0.04 : 0.06,
    bounds: { x: 260, y: 46, z: 260 },
    clusterScale: { x: 22, y: 6, z: 22 },
    clusterRatio: 0.9,
  });
  galacticDust.renderOrder = -9;
  galacticDust.userData = {
    followCameraFactor: 0.18,
    spinSpeed: -0.0042,
  };
  group.add(galacticDust);

  const twinkleField = createThreeTwinkleStarField({
    count: profile.twinkleStarCount,
    sizeRange: threeLowPowerMode() ? { min: 0.68, max: 2.05 } : { min: 0.72, max: 2.65 },
    opacity: threeLowPowerMode() ? 0.3 : 0.42,
    bounds: { x: 1180 * travelFieldScale, y: 270 * Math.max(1, travelFieldScale * 0.35), z: 1180 * travelFieldScale },
    clusterScale: { x: 220 * travelFieldScale, y: 42 * Math.max(1, travelFieldScale * 0.35), z: 220 * travelFieldScale },
    clusterRatio: 0.38,
  });
  twinkleField.renderOrder = -11;
  twinkleField.userData = {
    ...twinkleField.userData,
    wrapToCamera: true,
    cellSize: 520 * travelFieldScale,
  };
  group.add(twinkleField);

  const travelerField = createThreeTwinkleStarField({
    count: profile.travelerStarCount,
    sizeRange: threeLowPowerMode() ? { min: 0.9, max: 2.8 } : { min: 0.95, max: 3.4 },
    opacity: threeLowPowerMode() ? 0.46 : 0.6,
    bounds: { x: 420 * travelFieldScale, y: 108 * Math.max(1, travelFieldScale * 0.32), z: 420 * travelFieldScale },
    clusterScale: { x: 88 * travelFieldScale, y: 20 * Math.max(1, travelFieldScale * 0.32), z: 88 * travelFieldScale },
    clusterRatio: 0.2,
  });
  travelerField.renderOrder = -8;
  travelerField.userData = {
    ...travelerField.userData,
    wrapToCamera: true,
    cellSize: 180 * travelFieldScale,
  };
  group.add(travelerField);

  if (!threeLowPowerMode() && (profile.interplanetaryStarCount || 0) > 0) {
    const interplanetaryField = createThreeStarLayer({
      count: profile.interplanetaryStarCount,
      size: 0.18,
      opacity: 0.82,
      bounds: { x: 540, y: 118, z: 540 },
      clusterScale: { x: 112, y: 24, z: 112 },
      clusterRatio: 0.08,
    });
    interplanetaryField.renderOrder = -7;
    interplanetaryField.userData = {
      wrapToCamera: true,
      cellSize: 220,
    };
    group.add(interplanetaryField);
  }

  group.userData = {
    animated: true,
  };

  return group;
}

function updateThreeBackdropAnimation(timeMs) {
  if (!state.three.backdropGroup || !state.three.camera) return;
  const time = Math.max(0, Number(timeMs || 0)) * 0.001;
  const cameraPosition = state.three.camera.position;
  if (state.three.scene?.backgroundRotation?.set) {
    state.three.scene.backgroundRotation.set(0, time * THREE_BACKGROUND_ROTATION_SPEED, 0);
  }
  state.three.backdropGroup.children.forEach((child) => {
    if (child.userData?.twinkleUniforms?.uTime) {
      child.userData.twinkleUniforms.uTime.value = time;
    }
    if (Number.isFinite(child.userData?.followCameraFactor)) {
      child.position.copy(cameraPosition).multiplyScalar(child.userData.followCameraFactor);
    }
    if (child.userData?.wrapToCamera) {
      const cellSize = Math.max(1, Number(child.userData.cellSize) || 1);
      const yCellSize = Math.max(12, cellSize * 0.26);
      child.position.set(
        Math.round(cameraPosition.x / cellSize) * cellSize,
        Math.round(cameraPosition.y / yCellSize) * yCellSize,
        Math.round(cameraPosition.z / cellSize) * cellSize
      );
    }
    if (Number.isFinite(child.userData?.spinSpeed)) {
      child.rotation.y = time * child.userData.spinSpeed;
    }
    if (Number.isFinite(child.userData?.spinSpeedSecondary)) {
      child.rotation.z = time * child.userData.spinSpeedSecondary;
    }
  });
}

function updateThreeRimLightAnimation(timeMs) {
  if (!state.three.dataGroup) return;
  const time = Math.max(0, Number(timeMs || 0)) * 0.001;
  state.three.dataGroup.traverse((node) => {
    if (node.userData?.rimLightUniforms?.uTime) {
      node.userData.rimLightUniforms.uTime.value = time;
    }
  });
}

function threeSceneNeedsContinuousAnimation() {
  if (state.viewMode !== "3d") return false;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const backdropAnimated = Boolean(state.three.backdropGroup?.userData?.animated) && !reducedMotion;
  return backdropAnimated || Boolean(state.three.fastTravel) || Boolean(state.three.pendingTravelLanding);
}

function createThreePlanetCloud(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const positions = new Float32Array(items.length * 3);
  const colors = new Float32Array(items.length * 3);
  const baseColors = new Float32Array(items.length * 3);
  state.three.planetPositions = new Map();
  state.three.visiblePlanets = items.slice();

  items.forEach((item, index) => {
    const position = threeWorldVectorFromItem(item, THREE_VIEW_PLANET_LIFT);
    positions.set([position.x, position.y, position.z], index * 3);
    state.three.planetPositions.set(item.nameKey, position.clone());
    const color = new THREE.Color(threePlanetBaseHex(item));
    colors.set([color.r, color.g, color.b], index * 3);
    baseColors.set([color.r, color.g, color.b], index * 3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.userData.baseColors = baseColors;

  const material = new THREE.PointsMaterial({
    size: threePerformanceProfile().pointSize,
    map: ensureThreeTexture("point", createThreePointTexture),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true,
    alphaTest: 0.08,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData = {
    pickable: true,
    kind: "planet",
  };
  state.three.pointKeys = items.map((item) => item.nameKey);
  return points;
}

function currentThreePointScaleFactor() {
  const distance = Math.max(1, Number(state.three.distance || THREE_VIEW_DEFAULT_DISTANCE));
  const normalized = distance / threeDefaultGalaxyDistance();
  return clamp(
    Math.pow(normalized, THREE_POINT_SIZE_DISTANCE_EXPONENT),
    THREE_POINT_SIZE_MIN_FACTOR,
    THREE_POINT_SIZE_MAX_FACTOR
  );
}

function currentThreePointWorldSize() {
  return threePerformanceProfile().pointSize * currentThreePointScaleFactor();
}

function updateThreePointMaterial() {
  const material = state.three.pointCloud?.material;
  if (!material) return;
  const pointScaleFactor = currentThreePointScaleFactor();
  const nextSize = currentThreePointWorldSize();
  if (Math.abs(Number(material.size || 0) - nextSize) > 0.01) {
    material.size = nextSize;
    material.needsUpdate = true;
  }
  if (state.three.raycaster) {
    state.three.raycaster.params.Points.threshold = clamp(
      threePerformanceProfile().rayPointThreshold * Math.max(0.55, Math.pow(pointScaleFactor, 0.44)),
      1.8,
      10
    );
  }
  if (state.three.selectionMarker) {
    const markerScale = clamp(threePerformanceProfile().markerScale * Math.max(0.58, Math.pow(pointScaleFactor, 0.38)), 0.58, 1.26);
    state.three.selectionMarker.scale.set(13.5 * markerScale, 13.5 * markerScale, 1);
  }
}

function nearestThreeRouteSampleIndex(samples, targetX, targetY) {
  if (!Array.isArray(samples) || !samples.length) {
    return { index: -1, distanceSq: Number.POSITIVE_INFINITY };
  }
  let bestIndex = -1;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  samples.forEach((sample, index) => {
    const dx = Number(sample?.x) - Number(targetX);
    const dy = Number(sample?.y) - Number(targetY);
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= bestDistanceSq) return;
    bestIndex = index;
    bestDistanceSq = distanceSq;
  });
  return { index: bestIndex, distanceSq: bestDistanceSq };
}

function buildThreeRouteAnchors(item, samples) {
  if (!Array.isArray(samples) || !samples.length) return [];
  const anchors = [];

  const addPlanetAnchor = (planet, targetX, targetY) => {
    if (!planet || !Number.isFinite(Number(targetX)) || !Number.isFinite(Number(targetY))) return;
    const closest = nearestThreeRouteSampleIndex(samples, targetX, targetY);
    if (closest.index < 0) return;
    anchors.push({
      sampleIndex: closest.index,
      distanceSq: closest.distanceSq,
      world: threeWorldVectorFromItem(planet, THREE_VIEW_PLANET_LIFT),
    });
  };

  (Array.isArray(item?.vector_path?.points) ? item.vector_path.points : []).forEach((point) => {
    const planetName = String(point?.planet_name || "").trim();
    const anchor = normalizePoint01(point?.anchor);
    if (!planetName || !anchor) return;
    addPlanetAnchor(getRoutePlanet(planetName), anchor.x, anchor.y);
  });

  if (anchors.length < 2) {
    (Array.isArray(item?.route_planets) ? item.route_planets : []).forEach((name) => {
      const planet = getRoutePlanet(name);
      if (!planet) return;
      addPlanetAnchor(planet, Number(planet.x), Number(planet.y));
    });
  }

  const byIndex = new Map();
  anchors.forEach((anchor) => {
    const existing = byIndex.get(anchor.sampleIndex);
    if (!existing || anchor.distanceSq < existing.distanceSq) {
      byIndex.set(anchor.sampleIndex, anchor);
    }
  });

  return Array.from(byIndex.values()).sort((left, right) => left.sampleIndex - right.sampleIndex);
}

function threeRouteHeightForIndex(sampleIndex, anchors, fallbackY) {
  if (!anchors.length) return fallbackY;
  if (sampleIndex <= anchors[0].sampleIndex) return anchors[0].world.y;
  if (sampleIndex >= anchors[anchors.length - 1].sampleIndex) return anchors[anchors.length - 1].world.y;

  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const next = anchors[index];
    if (sampleIndex < previous.sampleIndex || sampleIndex > next.sampleIndex) continue;
    if (sampleIndex === previous.sampleIndex) return previous.world.y;
    if (sampleIndex === next.sampleIndex) return next.world.y;
    const span = Math.max(1, next.sampleIndex - previous.sampleIndex);
    const factor = clamp((sampleIndex - previous.sampleIndex) / span, 0, 1);
    return (
      THREE.MathUtils.lerp(previous.world.y, next.world.y, factor) +
      Math.sin(factor * Math.PI) * THREE_VIEW_ROUTE_ARC_HEIGHT
    );
  }

  return fallbackY;
}

function createThreeRouteLine(item) {
  const samples = simplifyThreeSamples(Array.isArray(item?.route_samples) ? item.route_samples : []);
  if (samples.length < 2) return null;
  const anchors = buildThreeRouteAnchors(item, samples);
  const anchorByIndex = new Map(anchors.map((anchor) => [anchor.sampleIndex, anchor]));
  const positions = new Float32Array(samples.length * 3);
  samples.forEach((sample, index) => {
    const anchored = anchorByIndex.get(index);
    const point = anchored
      ? anchored.world.clone()
      : threeWorldVectorFromNormalized(sample.x, sample.y, `route:${item.nameKey}:${index}`);
    if (!anchored) {
      point.y = threeRouteHeightForIndex(index, anchors, point.y);
    }
    positions.set([point.x, point.y, point.z], index * 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: "#ced7e6",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.userData = {
    pickable: true,
    kind: "route",
    itemKey: item.nameKey,
  };
  line.renderOrder = 2;
  return line;
}

function createThreeFactionMarker(item) {
  const profile = threePerformanceProfile();
  const faction = normalizeFaction(item?.faction);
  const colorHex = faction === "republic" ? "#ff6884" : "#68baff";
  const color = new THREE.Color(colorHex);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: ensureThreeTexture("glow", createThreeGlowTexture),
      color,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: false,
    })
  );
  glow.scale.set(17 * profile.markerScale, 17 * profile.markerScale, 1);
  glow.visible = !threeLowPowerMode();

  const outline = new THREE.Mesh(
    new THREE.RingGeometry(
      faction === "separatist" ? 3.05 : 3.45,
      faction === "separatist" ? 5.5 : 5.25,
      faction === "separatist" ? 6 : 40
    ),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  outline.rotation.x = -Math.PI * 0.5;

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(faction === "separatist" ? 1.24 : 1.45, faction === "separatist" ? 6 : 20),
    new THREE.MeshBasicMaterial({
      color: "#eff7ff",
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  core.rotation.x = -Math.PI * 0.5;

  const group = new THREE.Group();
  group.position.copy(threeWorldVectorFromItem(item, 8.2));
  group.add(glow, outline, core);
  group.userData = {
    kind: "faction",
    itemKey: item.nameKey,
    baseColor: color.clone(),
  };
  [glow, outline, core].forEach((child) => {
    child.userData = {
      pickable: true,
      kind: "faction",
      itemKey: item.nameKey,
    };
  });
  return group;
}

function createThreeMarkerSprite(color) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: ensureThreeTexture("ring", createThreeRingTexture),
      color,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.visible = false;
  sprite.renderOrder = 12;
  return sprite;
}

function ensureThreeRouteConnectionCache() {
  const graph = buildHyperspaceTravelGraph();
  if (!graph) {
    state.three.routeConnectionCache = new Map();
    state.three.routeConnectionGraph = null;
    return state.three.routeConnectionCache;
  }
  if (state.three.routeConnectionGraph === graph && state.three.routeConnectionCache.size) {
    return state.three.routeConnectionCache;
  }

  const routeMembers = new Map();
  graph.nodeById.forEach((node) => {
    if (node?.kind !== "planet" || !Array.isArray(node.route_ids) || !node.route_ids.length) return;
    node.route_ids.forEach((routeId) => {
      const distance = Number(graph.nodeRouteDistances.get(travelNodeRouteKey(node.id, routeId)));
      if (!Number.isFinite(distance)) return;
      if (!routeMembers.has(routeId)) routeMembers.set(routeId, []);
      routeMembers.get(routeId).push({
        name: String(node.name || ""),
        nameKey: normalizeNameKey(node.name),
        distance,
      });
    });
  });

  const byPlanet = new Map();
  routeMembers.forEach((members, routeId) => {
    members.sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name, "de"));
    members.forEach((member, index) => {
      [members[index - 1], members[index + 1]].filter(Boolean).forEach((neighbor) => {
        if (!neighbor?.nameKey || neighbor.nameKey === member.nameKey) return;
        if (!byPlanet.has(member.nameKey)) byPlanet.set(member.nameKey, new Map());
        const neighborMap = byPlanet.get(member.nameKey);
        if (!neighborMap.has(neighbor.nameKey)) {
          neighborMap.set(neighbor.nameKey, {
            planetKey: neighbor.nameKey,
            planetName: neighbor.name,
            routeIds: new Set(),
            routeNames: new Set(),
          });
        }
        const entry = neighborMap.get(neighbor.nameKey);
        entry.routeIds.add(routeId);
        entry.routeNames.add(graph.routeNameById.get(routeId) || routeId);
      });
    });
  });

  const cache = new Map();
  byPlanet.forEach((neighborMap, planetKey) => {
    cache.set(
      planetKey,
      Array.from(neighborMap.values()).map((entry) => ({
        planetKey: entry.planetKey,
        planetName: entry.planetName,
        routeIds: Array.from(entry.routeIds),
        routeNames: Array.from(entry.routeNames),
      }))
    );
  });

  state.three.routeConnectionCache = cache;
  state.three.routeConnectionGraph = graph;
  return cache;
}

function routeConnectionsForPlanet(item) {
  if (!item?.nameKey) return [];
  const graph = buildHyperspaceTravelGraph();
  if (!graph) return [];

  const nodeId = graph.planetNodeByKey.get(item.nameKey);
  const node = nodeId ? graph.nodeById.get(nodeId) : null;
  if (!node || !Array.isArray(node.route_ids) || !node.route_ids.length) return [];

  const byPlanet = new Map();
  node.route_ids.forEach((routeId) => {
    const routeNodes = Array.from(graph.nodeById.values())
      .filter((candidate) => candidate.kind === "planet")
      .map((candidate) => ({
        node: candidate,
        distance: Number(graph.nodeRouteDistances.get(travelNodeRouteKey(candidate.id, routeId))),
      }))
      .filter((candidate) => Number.isFinite(candidate.distance))
      .sort((left, right) => left.distance - right.distance || left.node.id.localeCompare(right.node.id, "de"));

    const currentIndex = routeNodes.findIndex((candidate) => candidate.node.id === nodeId);
    if (currentIndex < 0) return;

    [routeNodes[currentIndex - 1], routeNodes[currentIndex + 1]].filter(Boolean).forEach((candidate) => {
      const neighborPlanet = getRoutePlanet(candidate.node.name);
      if (!neighborPlanet || neighborPlanet.nameKey === item.nameKey) return;
      const key = neighborPlanet.nameKey;
      const existing = byPlanet.get(key) || {
        planet: neighborPlanet,
        routeIds: new Set(),
        routeNames: new Set(),
      };
      existing.routeIds.add(routeId);
      existing.routeNames.add(graph.routeNameById.get(routeId) || routeId);
      byPlanet.set(key, existing);
    });
  });

  return Array.from(byPlanet.values())
    .map((entry) => {
      const direction = threeWorldVectorFromItem(entry.planet, THREE_VIEW_PLANET_LIFT)
        .sub(threeWorldVectorFromItem(item, THREE_VIEW_PLANET_LIFT))
        .setY(0);
      if (direction.lengthSq() <= 0.0001) return null;
      direction.normalize();
      return {
        ...entry,
        direction,
        routeText: Array.from(entry.routeNames).join(" · "),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftAngle = Math.atan2(left.direction.z, left.direction.x);
      const rightAngle = Math.atan2(right.direction.z, right.direction.x);
      return leftAngle - rightAngle || left.planet.name.localeCompare(right.planet.name, "de");
    });
}

function createOrbitRouteStream(connection, index, radius) {
  const direction = connection.direction;
  const tangential = direction.clone().setY(0).normalize();
  const lift = 0.6 + index * 0.24;
  const start = tangential.clone().multiplyScalar(radius * 1.02).add(new THREE.Vector3(0, lift, 0));
  const bend = tangential.clone().multiplyScalar(radius * 1.68).add(new THREE.Vector3(0, 1.7 + index * 0.1, 0));
  const end = tangential.clone().multiplyScalar(radius * 3.5 + index * 0.85).add(new THREE.Vector3(0, 2.2, 0));
  const curve = new THREE.CatmullRomCurve3([start, bend, end]);
  const points = curve.getPoints(threeLowPowerMode() ? 10 : 18);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const outer = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: "#8fefff",
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const inner = new THREE.Line(
    geometry.clone(),
    new THREE.LineBasicMaterial({
      color: "#f3feff",
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const anchor = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: ensureThreeTexture("glow", createThreeGlowTexture),
      color: "#7cecff",
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  anchor.position.copy(start);
  anchor.scale.set(2.8, 2.8, 1);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.3, 8),
    new THREE.MeshBasicMaterial({
      color: "#dffaff",
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
  );
  arrow.position.copy(end);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangential.clone().normalize());

  const group = new THREE.Group();
  group.add(outer, inner, anchor, arrow);
  return group;
}

function createThreeOrbitPresentation(item) {
  const profile = threePerformanceProfile();
  const group = new THREE.Group();
  const orbitDistanceProfile = threeOrbitDistanceProfile(item);
  const radius = orbitDistanceProfile.radius;
  const sphereSegments = threeLowPowerMode() ? 18 : 28;
  const routeConnections = routeConnectionsForPlanet(item);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, sphereSegments, sphereSegments),
    new THREE.MeshPhongMaterial({
      color: "#65f1ff",
      emissive: "#30d8ff",
      emissiveIntensity: 0.64,
      transparent: true,
      opacity: 0.16,
      shininess: 90,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.84, Math.max(12, sphereSegments - 4), Math.max(12, sphereSegments - 4)),
    new THREE.MeshPhongMaterial({
      color: "#e9ffff",
      emissive: "#8ff6ff",
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.016, Math.max(12, sphereSegments - 6), Math.max(12, sphereSegments - 6)),
    new THREE.MeshBasicMaterial({
      color: "#89efff",
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: ensureThreeTexture("glow", createThreeGlowTexture),
      color: "#63e7ff",
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.set(radius * 5.2, radius * 5.2, 1);

  const ring = createThreeEllipseLine(radius * 1.25, radius * 0.74, 0, "#8cecff", 0.18);
  ring.rotation.x = -Math.PI * 0.5;
  ring.rotation.z = 0.36;

  const polarRing = createThreeEllipseLine(radius * 0.9, radius * 1.18, 0, "#88e4ff", 0.14);
  polarRing.rotation.z = Math.PI * 0.5;
  polarRing.rotation.x = 0.44;

  group.add(shell, core, wire, halo, ring, polarRing);

  routeConnections.forEach((connection, index) => {
    group.add(createOrbitRouteStream(connection, index, radius));
  });

  group.position.copy(threeWorldVectorFromItem(item, 1.2));
  group.userData = {
    kind: "orbit",
    itemKey: item.nameKey,
    connectionCount: routeConnections.length,
    markerScale: profile.markerScale,
    orbitRadius: radius,
    orbitReferenceClass: planetOrbitReferenceClass(item),
  };
  return group;
}

function markThreeSharedAsset(object) {
  if (!object) return object;
  object.userData = {
    ...(object.userData || {}),
    sharedAsset: true,
  };
  return object;
}

function routeConnectionsForPlanet(item) {
  if (!item?.nameKey) return [];
  const cache = ensureThreeRouteConnectionCache();
  return (cache.get(item.nameKey) || [])
    .map((entry) => {
      const planet = getRoutePlanet(entry.planetName) || getSelectableItemByKey(entry.planetKey);
      if (!planet || planet.nameKey === item.nameKey) return null;
      const direction = threeWorldVectorFromItem(planet, THREE_VIEW_PLANET_LIFT)
        .sub(threeWorldVectorFromItem(item, THREE_VIEW_PLANET_LIFT))
        .setY(0);
      if (direction.lengthSq() <= 0.0001) return null;
      direction.normalize();
      return {
        planet,
        routeIds: new Set(entry.routeIds),
        routeNames: new Set(entry.routeNames),
        direction,
        routeText: entry.routeNames.join(" Â· "),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftAngle = Math.atan2(left.direction.z, left.direction.x);
      const rightAngle = Math.atan2(right.direction.z, right.direction.x);
      return leftAngle - rightAngle || left.planet.name.localeCompare(right.planet.name, "de");
    });
}

function ensureThreeOrbitTemplate() {
  if (state.three.orbitTemplate) return state.three.orbitTemplate;
  const sphereSegments = threeLowPowerMode() ? 18 : 28;
  const template = new THREE.Group();

  const shell = markThreeSharedAsset(
    new THREE.Mesh(
      new THREE.SphereGeometry(1, sphereSegments, sphereSegments),
      new THREE.MeshPhongMaterial({
        color: "#65f1ff",
        emissive: "#30d8ff",
        emissiveIntensity: 0.64,
        transparent: true,
        opacity: 0.16,
        shininess: 90,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );

  const core = markThreeSharedAsset(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.84, Math.max(12, sphereSegments - 4), Math.max(12, sphereSegments - 4)),
      new THREE.MeshPhongMaterial({
        color: "#e9ffff",
        emissive: "#8ff6ff",
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );

  const wire = markThreeSharedAsset(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.016, Math.max(12, sphereSegments - 6), Math.max(12, sphereSegments - 6)),
      new THREE.MeshBasicMaterial({
        color: "#89efff",
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );

  const halo = markThreeSharedAsset(
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: ensureThreeTexture("glow", createThreeGlowTexture),
        color: "#63e7ff",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  halo.scale.set(5.2, 5.2, 1);

  const ring = markThreeSharedAsset(createThreeEllipseLine(1.25, 0.74, 0, "#8cecff", 0.18));
  ring.rotation.x = -Math.PI * 0.5;
  ring.rotation.z = 0.36;

  const polarRing = markThreeSharedAsset(createThreeEllipseLine(0.9, 1.18, 0, "#88e4ff", 0.14));
  polarRing.rotation.z = Math.PI * 0.5;
  polarRing.rotation.x = 0.44;

  const routesGroup = new THREE.Group();
  routesGroup.name = "orbit-routes";

  template.add(shell, core, wire, halo, ring, polarRing, routesGroup);
  state.three.orbitTemplate = template;
  return template;
}

function createThreeOrbitPresentation(item) {
  const profile = threePerformanceProfile();
  const group = ensureThreeOrbitTemplate().clone(true);
  const orbitDistanceProfile = threeOrbitDistanceProfile(item);
  const radius = orbitDistanceProfile.radius;
  const routeConnections = routeConnectionsForPlanet(item);
  const routesGroup = group.getObjectByName("orbit-routes");
  if (routesGroup) {
    while (routesGroup.children.length) {
      const child = routesGroup.children[routesGroup.children.length - 1];
      routesGroup.remove(child);
      disposeThreeObject(child);
    }
  }

  routeConnections.forEach((connection, index) => {
    routesGroup?.add(createOrbitRouteStream(connection, index, 1));
  });

  group.scale.setScalar(radius);
  group.position.copy(threeWorldVectorFromItem(item, 1.2));
  group.userData = {
    kind: "orbit",
    itemKey: item.nameKey,
    connectionCount: routeConnections.length,
    markerScale: profile.markerScale,
    orbitRadius: radius,
    orbitReferenceClass: planetOrbitReferenceClass(item),
  };
  return group;
}

function disposeThreeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeThreeMaterial(entry));
    return;
  }
  if (material.userData?.disposeMap && material.map?.dispose) {
    material.map.dispose();
  }
  material.dispose?.();
}

function disposeThreeObject(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.userData?.sharedAsset) return;
    if (node.geometry?.dispose) node.geometry.dispose();
    if (node.material) disposeThreeMaterial(node.material);
  });
}

function clearThreeDataGroup() {
  if (!state.three.dataGroup) return;
  while (state.three.dataGroup.children.length) {
    const child = state.three.dataGroup.children[state.three.dataGroup.children.length - 1];
    state.three.dataGroup.remove(child);
    disposeThreeObject(child);
  }
  state.three.pointCloud = null;
  state.three.pointKeys = [];
  state.three.planetPositions = new Map();
  state.three.visiblePlanets = [];
  state.three.routeObjects = new Map();
  state.three.factionObjects = new Map();
  state.three.jumpTargets = [];
  state.three.jumpCursor = 0;
  state.three.navigationSignature = "";
  state.three.lastVisualSignature = "";
}

function clearThreeOrbitGroup() {
  if (!state.three.orbitGroup) return;
  while (state.three.orbitGroup.children.length) {
    const child = state.three.orbitGroup.children[state.three.orbitGroup.children.length - 1];
    state.three.orbitGroup.remove(child);
    disposeThreeObject(child);
  }
}

function destroyThreeScene() {
  stopThreeAnimation();
  clearThreeDataGroup();
  clearThreeOrbitGroup();
  if (state.three.backdropGroup) {
    disposeThreeObject(state.three.backdropGroup);
    state.three.scene?.remove(state.three.backdropGroup);
  }
  if (state.three.hoverMarker) {
    disposeThreeObject(state.three.hoverMarker);
    state.three.scene?.remove(state.three.hoverMarker);
  }
  if (state.three.selectionMarker) {
    disposeThreeObject(state.three.selectionMarker);
    state.three.scene?.remove(state.three.selectionMarker);
  }
  state.three.renderer?.dispose?.();
  if (threeViewerEl) {
    threeViewerEl.innerHTML = "";
  }
  state.three.renderer = null;
  state.three.scene = null;
  state.three.camera = null;
  state.three.dataGroup = null;
  state.three.backdropGroup = null;
  state.three.orbitGroup = null;
  state.three.orbitTemplate = null;
  state.three.raycaster = null;
  state.three.pointer = null;
  state.three.pointCloud = null;
  state.three.pointKeys = [];
  state.three.planetPositions = new Map();
  state.three.visiblePlanets = [];
  state.three.routeObjects = new Map();
  state.three.factionObjects = new Map();
  state.three.routeConnectionCache = new Map();
  state.three.routeConnectionGraph = null;
  state.three.jumpTargets = [];
  state.three.jumpCursor = 0;
  state.three.fastTravel = null;
  state.three.pendingTravelLanding = null;
  state.three.hoverMarker = null;
  state.three.selectionMarker = null;
  state.three.mode = "galaxy";
  state.three.orbitItemKey = null;
  state.three.rebuildKey = "";
  state.three.performanceKey = "";
  state.three.lastVisualSignature = "";
  state.three.activeTouches = new Map();
  state.three.pinchDistance = 0;
  state.three.pinchTargetDistance = 0;
  state.three.pinching = false;
  state.three.justPinchedUntil = 0;
}

function ensureThreeScene() {
  const performanceKey = threePerformanceKey();
  if (state.three.renderer && state.three.scene && state.three.camera && state.three.performanceKey === performanceKey) {
    return true;
  }
  if (state.three.renderer && state.three.performanceKey !== performanceKey) {
    destroyThreeScene();
  }
  if (!threeViewerEl || typeof THREE === "undefined") return false;

  try {
    const profile = threePerformanceProfile();
    const renderer = new THREE.WebGLRenderer({
      antialias: profile.antialias,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
    if ("outputColorSpace" in renderer && THREE?.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ("outputEncoding" in renderer && THREE?.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    threeViewerEl.innerHTML = "";
    threeViewerEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    applyThreeEnvironmentBackground(scene);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.12, Math.max(2600, threeGalaxyMaxDistance() * 1.4));
    const defaultFocus = new THREE.Vector3(0, 0, 0);

    const ambientLight = new THREE.AmbientLight("#e8f1ff", 1.02);
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.72);
    keyLight.position.set(180, 210, 120);
    const fillLight = new THREE.DirectionalLight("#f6fbff", 0.26);
    fillLight.position.set(-120, 74, -180);
    scene.add(ambientLight, keyLight, fillLight);

    const backdropGroup = createThreeBackdropGroup();
    const dataGroup = new THREE.Group();
    const orbitGroup = new THREE.Group();
    orbitGroup.visible = false;
    scene.add(backdropGroup, dataGroup, orbitGroup);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = profile.rayPointThreshold;
    raycaster.params.Line.threshold = profile.rayLineThreshold;

    const hoverMarker = createThreeMarkerSprite("#9edfff");
    hoverMarker.scale.set(10 * profile.markerScale, 10 * profile.markerScale, 1);
    const selectionMarker = createThreeMarkerSprite("#6de3d7");
    selectionMarker.scale.set(13.5 * profile.markerScale, 13.5 * profile.markerScale, 1);
    scene.add(hoverMarker, selectionMarker);

    state.three.renderer = renderer;
    state.three.scene = scene;
    state.three.camera = camera;
    state.three.dataGroup = dataGroup;
    state.three.backdropGroup = backdropGroup;
    state.three.orbitGroup = orbitGroup;
    state.three.raycaster = raycaster;
    state.three.pointer = new THREE.Vector2(0, 0);
    state.three.focus = defaultFocus.clone();
    state.three.targetFocus = defaultFocus.clone();
    state.three.distance = threeDefaultGalaxyDistance();
    state.three.targetDistance = threeDefaultGalaxyDistance();
    state.three.hoverMarker = hoverMarker;
    state.three.selectionMarker = selectionMarker;
    state.three.mode = "galaxy";
    state.three.orbitItemKey = null;
    state.three.orbitTemplate = null;
    state.three.routeConnectionCache = new Map();
    state.three.routeConnectionGraph = null;
    state.three.fastTravel = null;
    state.three.pendingTravelLanding = null;
    state.three.performanceKey = performanceKey;
    state.three.rebuildKey = "";
    state.three.lastVisualSignature = "";

    ensureThreeOrbitTemplate();
    resizeThreeRenderer();
    return true;
  } catch (_error) {
    return false;
  }
}

function resizeThreeRenderer() {
  if (!state.three.renderer || !state.three.camera || !threeViewerEl) return;
  const profile = threePerformanceProfile();
  const rect = threeViewerEl.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width || 1));
  const height = Math.max(1, Math.floor(rect.height || 1));
  state.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
  state.three.renderer.setSize(width, height, false);
  state.three.camera.aspect = width / height;
  state.three.camera.updateProjectionMatrix();
}

function prewarmThreeScene() {
  if (state.intro.prewarmStarted) {
    return state.intro.prewarmPromise || Promise.resolve(state.intro.prewarmReady);
  }
  state.intro.prewarmStarted = true;
  state.intro.prewarmPromise = loadThreeModuleIfNeeded()
    .then(() => {
      if (!ensureThreeScene() || !state.imageWidth || !state.imageHeight) return false;
      resizeThreeRenderer();
      rebuildThreeSceneData(true);
      updateThreeCamera();
      updateThreeBackdropAnimation(performance.now());
      if (state.three.renderer && state.three.scene && state.three.camera) {
        state.three.renderer.render(state.three.scene, state.three.camera);
      }
      state.intro.prewarmReady = true;
      return true;
    })
    .catch(() => false);
  return state.intro.prewarmPromise;
}

function buildThreeSceneKey(planets, routes, factions) {
  return [
    state.imageWidth,
    state.imageHeight,
    mapFilterSignature(),
    threeWorldScaleMultiplier(),
    planets.length,
    routes.length,
    factions.length,
    state.savedByKey.size,
    state.knownByKey.size,
    state.routeByKey.size,
    state.factionItemsKey,
    state.planetProfiles.size,
    state.planetFactions.size,
    threeRimVectorPaths().length,
    threePerformanceKey(),
  ].join("::");
}

function rebuildThreeSceneData(force = false) {
  if (!ensureThreeScene() || !state.imageWidth || !state.imageHeight) return;
  const planets = visibleRenderableMapItems();
  const routes = visibleRouteItems();
  const factions = visibleFactionItems();
  const nextKey = buildThreeSceneKey(planets, routes, factions);
  if (!force && state.three.rebuildKey === nextKey) {
    syncThreeInteractionState();
    return;
  }

  clearThreeDataGroup();

  threeRimVectorPaths().forEach((path) => {
    const rimGroup = createThreeRimLightGroup(path);
    if (rimGroup) {
      state.three.dataGroup.add(rimGroup);
    }
  });

  const planetCloud = createThreePlanetCloud(planets);
  if (planetCloud) {
    state.three.pointCloud = planetCloud;
    state.three.dataGroup.add(planetCloud);
  }

  routes.slice(0, threePerformanceProfile().routeRenderLimit).forEach((item) => {
    const line = createThreeRouteLine(item);
    if (!line) return;
    state.three.routeObjects.set(item.nameKey, line);
    state.three.dataGroup.add(line);
  });

  factions.forEach((item) => {
    const marker = createThreeFactionMarker(item);
    state.three.factionObjects.set(item.nameKey, marker);
    state.three.dataGroup.add(marker);
  });

  state.three.dataGroup.visible = state.three.mode !== "orbit";
  state.three.rebuildKey = nextKey;
  ensureThreeRouteConnectionCache();
  ensureThreeOrbitTemplate();
  computeThreeJumpTargets(true);
  updateThreePointMaterial();
  syncThreeInteractionState(true);
}

function projectThreeWorldToOverlay(vector) {
  if (!vector || !state.three.camera || !viewerFrameEl) return null;
  const rect = viewerFrameEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const projected = vector.clone().project(state.three.camera);
  if (![projected.x, projected.y, projected.z].every(Number.isFinite)) return null;
  return {
    x: (projected.x * 0.5 + 0.5) * rect.width,
    y: (-projected.y * 0.5 + 0.5) * rect.height,
    z: projected.z,
    rect,
  };
}

function threePointScreenRadius(vector) {
  if (!vector || !state.three.camera || !viewerFrameEl) return 10;
  const rect = viewerFrameEl.getBoundingClientRect();
  const distance = Math.max(1, state.three.camera.position.distanceTo(vector));
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(state.three.camera.fov * 0.5)) * distance;
  const pixelsPerWorldUnit = rect.height / Math.max(viewHeight, 0.001);
  return clamp(currentThreePointWorldSize() * pixelsPerWorldUnit * 0.58, 5, 26);
}

function threeScreenDirectionFromWorld(direction) {
  if (!direction || !state.three.camera) return null;
  const cameraSpace = direction.clone().transformDirection(state.three.camera.matrixWorldInverse);
  const dx = cameraSpace.x;
  const dy = -cameraSpace.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0.0001) return null;
  return {
    x: dx / length,
    y: dy / length,
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function cardinalDirectionLabel(direction) {
  const angle = Math.atan2(direction.x, direction.z);
  if (angle >= -Math.PI * 0.25 && angle < Math.PI * 0.25) return "N";
  if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) return "O";
  if (angle >= -Math.PI * 0.75 && angle < -Math.PI * 0.25) return "W";
  return "S";
}

function threeDiscRadiusFromNormalizedPoint(point) {
  const dx = ((point?.x || 0) - 0.5) / 0.5;
  const dz = (0.5 - (point?.y || 0)) / 0.5;
  return Math.hypot(dx, dz);
}

function threeDiscRadiusFromWorld(vector) {
  if (!vector) return 0;
  return threeDiscRadiusFromNormalizedPoint({
    x: vector.x / threeWorldWidth() + 0.5,
    y: 0.5 - vector.z / threeWorldHeight() + 0,
  });
}

function screenDirectionCompassLabel(direction) {
  if (!direction) return "";
  const vertical = direction.y <= -0.34 ? "N" : direction.y >= 0.34 ? "S" : "";
  const horizontal = direction.x >= 0.34 ? "O" : direction.x <= -0.34 ? "W" : "";
  return `${vertical}${horizontal}` || "Mitte";
}

function buildThreeRimHudMarkup() {
  if (!state.three.camera || !viewerFrameEl) return "";
  const rimPaths = Array.isArray(state.baseVectorPaths) ? state.baseVectorPaths : [];
  if (!rimPaths.length) return "";

  const rect = viewerFrameEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return "";
  const centerX = rect.width * 0.5;
  const centerY = rect.height * 0.5;
  const baseRadius = clamp(Math.min(rect.width, rect.height) * 0.4, 132, 226);
  const focusRadius = threeDiscRadiusFromWorld(state.three.targetFocus || state.three.focus || new THREE.Vector3());
  const indicators = THREE_RIM_HUD_REGIONS.map((entry) => {
    const path = rimPaths.find((candidate) => normalizeNameKey(candidate?.name) === normalizeNameKey(entry.name));
    if (!path) return null;
    const screenDirection = threeScreenDirectionFromWorld(new THREE.Vector3(entry.direction.x, 0, entry.direction.z));
    if (!screenDirection) return null;
    const radiusSamples = (Array.isArray(path.points) ? path.points : [])
      .map((point) => normalizePoint01(point?.anchor))
      .filter(Boolean);
    const radius =
      radiusSamples.reduce((accumulator, point) => accumulator + threeDiscRadiusFromNormalizedPoint(point), 0) /
      Math.max(1, radiusSamples.length);
    const orbitRadius = baseRadius + (radius - focusRadius) * 14 + (entry.name === "Core" ? -10 : 0) + (entry.name === "Mid Rim" ? 16 : 0);
    return {
      ...entry,
      x: centerX + screenDirection.x * orbitRadius,
      y: centerY + screenDirection.y * orbitRadius,
      angleDeg: screenDirection.angleDeg,
      screenDirection,
      rect,
      radius,
    };
  }).filter(Boolean);
  if (!indicators.length) return "";

  let activeName = "";
  let smallestDistance = Infinity;
  indicators.forEach((indicator) => {
    const distance = Math.abs(indicator.radius - focusRadius);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      activeName = indicator.name;
    }
  });

  const sortedForLayout = [...indicators].sort((left, right) => left.y - right.y);
  for (let index = 1; index < sortedForLayout.length; index += 1) {
    const previous = sortedForLayout[index - 1];
    const current = sortedForLayout[index];
    if (Math.abs(previous.x - current.x) < 124 && current.y - previous.y < 34) {
      current.y = previous.y + 34;
    }
  }

  return indicators
    .map((indicator) => {
      const active = indicator.name === activeName;
      const bottomSafeInset = threeViewerHint && !threeViewerHint.classList.contains("hidden") ? 96 : 40;
      const left = clamp(indicator.x, 44, Math.max(44, indicator.rect.width - 44));
      const top = clamp(indicator.y, 36, Math.max(36, indicator.rect.height - bottomSafeInset));
      return `
        <div
          class="three-rim-indicator ${active ? "is-active" : ""}"
          style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;--rim-accent:${indicator.accent};--rim-angle:${indicator.angleDeg.toFixed(1)}deg;"
        >
          <span class="three-rim-indicator-arrow"></span>
          <span class="three-rim-indicator-copy">
            <span class="three-rim-indicator-name">${escapeHtml(indicator.name)}</span>
            <span class="three-rim-indicator-meta">${active ? "im Fokus" : screenDirectionCompassLabel(indicator.screenDirection)}</span>
          </span>
        </div>
      `;
    })
    .join("");
}

function threeScreenDirectionToWorldTarget(vector) {
  if (!vector || !state.three.camera) return null;
  const direction = vector.clone().sub(state.three.camera.position);
  if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() <= 0.0001) return null;
  return threeScreenDirectionFromWorld(direction);
}

function threeGalaxyApproachDistance(item) {
  const orbitProfile = item ? threeOrbitDistanceProfile(item) : null;
  if (!threeDesktopNavigationEnabled()) return threePlanetFocusDistance();
  return clamp(
    Math.max((orbitProfile?.exitDistance || 42) * 3.2, threePlanetFocusDistance() * 0.2),
    96,
    220
  );
}

function threeGalaxyOrbitEnterDistance(item) {
  const orbitProfile = item ? threeOrbitDistanceProfile(item) : null;
  if (!threeDesktopNavigationEnabled()) return orbitProfile?.exitDistance || THREE_ORBIT_EXIT_DISTANCE;
  return clamp(
    Math.max((orbitProfile?.exitDistance || 42) * 1.16, (orbitProfile?.viewDistance || THREE_ORBIT_VIEW_DISTANCE) * 1.08),
    42,
    92
  );
}

function formatThreeNavigationDistance(distance) {
  const sectorUnits = Math.max(0, Number(distance) || 0) * 3.4;
  if (sectorUnits >= 1000) return `${(sectorUnits / 1000).toFixed(1)}k SE`;
  if (sectorUnits >= 100) return `${sectorUnits.toFixed(0)} SE`;
  if (sectorUnits >= 10) return `${sectorUnits.toFixed(1)} SE`;
  return `${sectorUnits.toFixed(2)} SE`;
}

function threeNavigationAnchorItem() {
  const selected = selectedDetailItem();
  if (selected && selected.kind !== "route" && selected.kind !== "faction" && mapItemVisible(selected)) {
    return selected;
  }
  const hovered = hoveredItem();
  if (hovered && hovered.kind !== "route" && hovered.kind !== "faction" && mapItemVisible(hovered)) {
    return hovered;
  }
  const focus = state.three.targetFocus || state.three.focus;
  if (!focus || !state.three.planetPositions.size) return null;
  let bestItem = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  state.three.visiblePlanets.forEach((item) => {
    const vector = state.three.planetPositions.get(item.nameKey);
    if (!vector) return;
    const distance = focus.distanceToSquared(vector);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestItem = item;
    }
  });
  return bestItem;
}

function syncThreeJumpTargets(targets, signature) {
  const nextTargets = Array.isArray(targets) ? targets : [];
  const previousActiveKey =
    state.three.jumpTargets[state.three.jumpCursor]?.item?.nameKey || selectedDetailItem()?.nameKey || hoveredItem()?.nameKey || "";
  state.three.jumpTargets = nextTargets;
  state.three.navigationSignature = signature || "";
  if (!nextTargets.length) {
    state.three.jumpCursor = 0;
    return nextTargets;
  }
  const preservedIndex = nextTargets.findIndex((entry) => entry.item?.nameKey === previousActiveKey);
  if (preservedIndex >= 0) {
    state.three.jumpCursor = preservedIndex;
    return nextTargets;
  }
  state.three.jumpCursor = clamp(state.three.jumpCursor, 0, nextTargets.length - 1);
  return nextTargets;
}

function computeThreeJumpTargets(force = false) {
  const navigationEnabled =
    state.viewMode === "3d" &&
    state.three.mode === "galaxy" &&
    threeDesktopNavigationEnabled() &&
    state.three.camera &&
    state.three.visiblePlanets.length &&
    state.three.targetDistance <= threeBeaconActivationDistance();
  if (!navigationEnabled) {
    return syncThreeJumpTargets([], "");
  }

  const anchorItem = threeNavigationAnchorItem();
  const focus = (state.three.targetFocus || state.three.focus || new THREE.Vector3()).clone();
  const anchorWorld = anchorItem
    ? state.three.planetPositions.get(anchorItem.nameKey)?.clone() || threeWorldVectorFromItem(anchorItem, THREE_VIEW_PLANET_LIFT)
    : focus.clone();
  const signature = [
    state.three.rebuildKey,
    anchorItem?.nameKey || "",
    selectedDetailItem()?.nameKey || "",
    hoveredItem()?.nameKey || "",
    Math.round((focus.x || 0) * 10) / 10,
    Math.round((focus.y || 0) * 10) / 10,
    Math.round((focus.z || 0) * 10) / 10,
    Math.round((state.three.targetDistance || state.three.distance || 0) * 10) / 10,
  ].join("|");
  if (!force && signature === state.three.navigationSignature && state.three.jumpTargets.length) {
    return state.three.jumpTargets;
  }

  const directConnections = anchorItem ? routeConnectionsForPlanet(anchorItem) : [];
  const directByKey = new Map();
  directConnections.forEach((connection, index) => {
    if (!connection?.planet?.nameKey) return;
    directByKey.set(connection.planet.nameKey, {
      routeText: String(connection.routeText || "").trim(),
      cardinal: cardinalDirectionLabel(connection.direction),
      order: index,
    });
  });

  const candidates = state.three.visiblePlanets
    .filter((item) => item?.nameKey && item.nameKey !== anchorItem?.nameKey)
    .map((item) => {
      const world =
        state.three.planetPositions.get(item.nameKey)?.clone() || threeWorldVectorFromItem(item, THREE_VIEW_PLANET_LIFT);
      const referenceDistance = anchorWorld.distanceTo(world);
      const cameraDistance = state.three.camera.position.distanceTo(world);
      const direct = directByKey.get(item.nameKey) || null;
      const projected = projectThreeWorldToOverlay(world);
      const onScreen =
        projected &&
        projected.z > -1 &&
        projected.z < 1 &&
        projected.x >= -48 &&
        projected.x <= projected.rect.width + 48 &&
        projected.y >= -48 &&
        projected.y <= projected.rect.height + 48;
      return {
        item,
        anchorItem,
        anchorWorld,
        world,
        referenceDistance,
        cameraDistance,
        direct,
        priority: direct ? -1200 + direct.order : onScreen ? -140 : 0,
      };
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      if (Math.abs(left.referenceDistance - right.referenceDistance) > 0.001) {
        return left.referenceDistance - right.referenceDistance;
      }
      if (Math.abs(left.cameraDistance - right.cameraDistance) > 0.001) {
        return left.cameraDistance - right.cameraDistance;
      }
      return left.item.name.localeCompare(right.item.name, "de");
    })
    .slice(0, 5)
    .map((entry) => {
      const direction = entry.world.clone().sub(entry.anchorWorld).setY(0);
      if (direction.lengthSq() > 0.0001) {
        direction.normalize();
      }
      return {
        item: entry.item,
        anchorItem: entry.anchorItem,
        anchorWorld: entry.anchorWorld,
        world: entry.world,
        distanceWorld: entry.referenceDistance,
        distanceLabel: formatThreeNavigationDistance(entry.referenceDistance),
        routeText: entry.direct?.routeText || "",
        cardinal: entry.direct?.cardinal || cardinalDirectionLabel(direction),
        direction,
      };
    });

  return syncThreeJumpTargets(candidates, signature);
}

function buildThreeJumpHudMarkup(targets) {
  if (!Array.isArray(targets) || !targets.length || !viewerFrameEl || !state.three.camera) return "";
  const rect = viewerFrameEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return "";

  const centerX = rect.width * 0.5;
  const centerY = rect.height * 0.5;
  const safeTop = threeNavHud && !threeNavHud.classList.contains("hidden") ? 118 : 64;
  const safeBottom = rect.height - (threeViewerHint && !threeViewerHint.classList.contains("hidden") ? 112 : 44);
  const safeLeft = 76;
  const safeRight = rect.width - 76;
  const edgeRadius = Math.min(rect.width, rect.height) * 0.34;

  const layout = targets
    .map((target, index) => {
      const projection = projectThreeWorldToOverlay(target.world);
      const onScreen =
        projection &&
        projection.z > -0.98 &&
        projection.z < 1.02 &&
        projection.x >= 0 &&
        projection.x <= rect.width &&
        projection.y >= 0 &&
        projection.y <= rect.height;
      let direction =
        onScreen && projection
          ? {
            x: projection.x - centerX,
            y: projection.y - centerY,
          }
          : threeScreenDirectionToWorldTarget(target.world);
      const magnitude = Math.hypot(direction?.x || 0, direction?.y || 0) || 1;
      direction = {
        x: (direction?.x || 0.78) / magnitude,
        y: (direction?.y || -0.22) / magnitude,
      };

      const anchorX = onScreen && projection ? projection.x : centerX + direction.x * edgeRadius;
      const anchorY = onScreen && projection ? projection.y : centerY + direction.y * (edgeRadius * 0.84);
      const offset = onScreen ? 84 + index * 8 : 0;
      const left = clamp(anchorX + direction.x * offset, safeLeft, safeRight);
      const top = clamp(anchorY + direction.y * offset, safeTop, safeBottom);
      const lineTargetX = onScreen && projection ? projection.x : anchorX;
      const lineTargetY = onScreen && projection ? projection.y : anchorY;
      const lineDx = lineTargetX - left;
      const lineDy = lineTargetY - top;
      const lineLength = clamp(Math.hypot(lineDx, lineDy), 28, 196);
      const lineAngle = (Math.atan2(lineDy, lineDx) * 180) / Math.PI;
      return {
        ...target,
        index,
        onScreen,
        left,
        top,
        lineLength,
        lineAngle,
      };
    })
    .filter(Boolean);

  const sortedForLayout = [...layout].sort((left, right) => left.top - right.top);
  for (let index = 1; index < sortedForLayout.length; index += 1) {
    const previous = sortedForLayout[index - 1];
    const current = sortedForLayout[index];
    if (Math.abs(previous.left - current.left) < 212 && current.top - previous.top < 66) {
      current.top = clamp(previous.top + 66, safeTop, safeBottom);
    }
  }

  return layout
    .map((target) => {
      const active = target.index === state.three.jumpCursor;
      const detailText = target.routeText ? `${target.distanceLabel} / ${target.cardinal} / ${target.routeText}` : `${target.distanceLabel} / ${target.cardinal}`;
      return `
        <button
          type="button"
          class="three-jump-beacon ${active ? "is-active" : ""}"
          data-key="${escapeHtml(target.item.nameKey)}"
          data-index="${target.index}"
          style="left:${target.left.toFixed(1)}px;top:${target.top.toFixed(1)}px;--jump-angle:${target.lineAngle.toFixed(1)}deg;"
        >
          <span class="three-jump-beacon-line" style="width:${target.lineLength.toFixed(1)}px;transform:translateY(-50%) rotate(${target.lineAngle.toFixed(1)}deg);"></span>
          <span class="three-jump-beacon-dot"></span>
          <span class="three-jump-beacon-name">${escapeHtml(target.item.name)}</span>
          <span class="three-jump-beacon-meta">${escapeHtml(detailText)}</span>
        </button>
      `;
    })
    .join("");
}

function beginThreeFastTravel(item) {
  if (!item || item.kind === "route" || item.kind === "faction" || !ensureThreeScene()) return;
  if (state.three.mode === "orbit") {
    exitThreeOrbitMode(true);
  }
  const destination = state.three.planetPositions.get(item.nameKey)?.clone() || threeWorldVectorFromItem(item, 3.5);
  const startFocus = (state.three.targetFocus || state.three.focus || new THREE.Vector3()).clone();
  const startDistance = clamp(
    state.three.targetDistance || state.three.distance || threePlanetFocusDistance(),
    threeGalaxyMinDistance(),
    threeGalaxyMaxDistance()
  );
  const endDistance = clampThreeDistance(threeFastTravelLandingDistance(item));
  state.three.fastTravel = {
    itemKey: item.nameKey,
    startTime: performance.now(),
    duration: threeFastTravelDurationMs(),
    startFocus,
    endFocus: destination,
    startDistance,
    endDistance,
  };
  state.three.pendingTravelLanding = null;
  setHovered(null);
  selectMapItem(item);
  const currentIndex = computeThreeJumpTargets(true).findIndex((entry) => entry.item?.nameKey === item.nameKey);
  if (currentIndex >= 0) {
    state.three.jumpCursor = currentIndex;
  }
  startThreeAnimation();
  setStatus(`Schnellsprung nach ${item.name} eingeleitet.`);
}

function updateThreeFastTravel(now) {
  const travel = state.three.fastTravel;
  if (!travel) return;
  const duration = Math.max(120, Number(travel.duration) || 0);
  const progress = clamp01((now - travel.startTime) / duration);
  const eased = THREE.MathUtils.smootherstep(progress, 0, 1);
  const warpLift = Math.sin(progress * Math.PI) * Math.max(4.2, threeWorldScaleMultiplier() * 0.7);
  const focus = travel.startFocus.clone().lerp(travel.endFocus, eased);
  focus.y += warpLift;
  const distancePulse = Math.sin(progress * Math.PI) * Math.max(8, Math.min(38, threePlanetFocusDistance() * 0.04));
  const distance = clampThreeDistance(THREE.MathUtils.lerp(travel.startDistance, travel.endDistance, eased) + distancePulse);
  state.three.focus = focus.clone();
  state.three.targetFocus = focus.clone();
  state.three.distance = distance;
  state.three.targetDistance = distance;

  if (progress >= 1) {
    state.three.focus = travel.endFocus.clone();
    state.three.targetFocus = travel.endFocus.clone();
    state.three.distance = travel.endDistance;
    state.three.targetDistance = travel.endDistance;
    state.three.pendingTravelLanding = travel.itemKey;
    state.three.fastTravel = null;
  }
}

function completeThreeFastTravelLanding() {
  if (!state.three.pendingTravelLanding) return;
  const item = getSelectableItemByKey(state.three.pendingTravelLanding);
  state.three.pendingTravelLanding = null;
  if (!item || item.kind === "route" || item.kind === "faction") return;
  selectMapItem(item);
  enterThreeOrbitMode(item, true);
  setStatus(`Schnellsprung abgeschlossen: ${item.name}.`);
}

function navigateThreeJumpTarget(step) {
  const targets = computeThreeJumpTargets();
  if (targets.length <= 1 || state.three.fastTravel) return;
  const nextIndex = (state.three.jumpCursor + step + targets.length) % targets.length;
  state.three.jumpCursor = nextIndex;
  const target = targets[nextIndex];
  if (!target?.item) return;
  beginThreeFastTravel(target.item);
}

function resolveThreeJumpButtonAtClientPoint(clientX, clientY) {
  if (!threeJumpHud || threeJumpHud.classList.contains("hidden")) return null;
  const buttons = Array.from(threeJumpHud.querySelectorAll("button[data-key]"));
  return (
    buttons.find((button) => {
      const rect = button.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null
  );
}

function renderThreeUiOverlay(cameraUpdated = false) {
  if (state.viewMode === "3d" && state.three.camera && !cameraUpdated) {
    updateThreeCamera();
  }
  const orbitItem = activeThreeOrbitItem();
  const hovered = hoveredItem();
  const orbitConnections = orbitItem ? routeConnectionsForPlanet(orbitItem) : [];
  const showDesktopNavigation =
    state.viewMode === "3d" && state.three.mode === "galaxy" && threeDesktopNavigationEnabled() && !state.isMobileView;
  const jumpTargets = showDesktopNavigation ? computeThreeJumpTargets() : syncThreeJumpTargets([], "");
  const activeJumpTarget = jumpTargets[state.three.jumpCursor] || jumpTargets[0] || null;
  const anchorItem = activeJumpTarget?.anchorItem || threeNavigationAnchorItem();
  const showHover =
    state.viewMode === "3d" &&
    state.three.mode === "galaxy" &&
    !state.isMobileView &&
    hovered &&
    hovered.kind !== "route" &&
    hovered.kind !== "faction";

  if (threeHoverLabel) {
    threeHoverLabel.classList.toggle("hidden", !showHover);
    if (showHover) {
      const hoverWorld = threeWorldVectorFromItem(hovered, THREE_VIEW_PLANET_LIFT);
      const projected = projectThreeWorldToOverlay(hoverWorld);
      const factionStyle = planetFactionStyle(hovered);
      if (!projected) {
        threeHoverLabel.classList.add("hidden");
      } else {
        const ringSize = Math.round(threePointScreenRadius(hoverWorld) * 2.05 + 6);
        threeHoverLabel.innerHTML = `
          <span class="three-hover-ring"></span>
          <span class="three-hover-chip">${escapeHtml(hovered.name)}</span>
        `;
        threeHoverLabel.style.left = `${clamp(projected.x, 16, Math.max(16, projected.rect.width - 16))}px`;
        threeHoverLabel.style.top = `${clamp(projected.y, 16, Math.max(16, projected.rect.height - 16))}px`;
        threeHoverLabel.style.setProperty("--three-hover-size", `${ringSize}px`);
        threeHoverLabel.style.setProperty("--three-hover-ring", factionStyle?.hoverBorder || "rgba(146, 228, 255, 0.94)");
        threeHoverLabel.style.setProperty("--three-hover-glow", factionStyle?.hoverShadow || "rgba(146, 228, 255, 0.2)");
        threeHoverLabel.style.setProperty("--three-hover-chip", factionStyle?.pinLabelColor || "rgba(233, 247, 255, 0.94)");
        threeHoverLabel.style.setProperty("--three-hover-chip-border", factionStyle?.pinLabelBorder || "rgba(146, 228, 255, 0.26)");
      }
    }
  }

  if (threeRimHud) {
    const showRimHud = false;
    threeRimHud.classList.toggle("hidden", !showRimHud);
    if (showRimHud) {
      const markup = buildThreeRimHudMarkup();
      if (markup) {
        threeRimHud.innerHTML = markup;
      } else {
        threeRimHud.classList.add("hidden");
        threeRimHud.innerHTML = "";
      }
    } else {
      threeRimHud.innerHTML = "";
    }
  }

  if (threeTravelFlash) {
    const showTravelFlash = showDesktopNavigation && Boolean(state.three.fastTravel);
    threeTravelFlash.classList.toggle("hidden", !showTravelFlash);
    if (showTravelFlash) {
      const progress = clamp01(
        (performance.now() - state.three.fastTravel.startTime) / Math.max(120, state.three.fastTravel.duration || 0)
      );
      const flashOpacity = clamp01(Math.sin(progress * Math.PI) * 0.86 + Math.sin(progress * Math.PI * 6.4) * 0.1);
      threeTravelFlash.style.opacity = flashOpacity.toFixed(3);
      threeTravelFlash.style.filter = `blur(${(10 + progress * 18).toFixed(1)}px)`;
    } else {
      threeTravelFlash.style.opacity = "0";
      threeTravelFlash.style.filter = "";
    }
  }

  if (threeNavHud) {
    threeNavHud.classList.toggle("hidden", !showDesktopNavigation);
    if (showDesktopNavigation) {
      let title = "3D Navigation";
      let message = `Weiter heranzoomen, bis die Sprung-Beacons fuer die naechsten Planeten eingeblendet werden.`;
      if (state.three.fastTravel) {
        const target = getSelectableItemByKey(state.three.fastTravel.itemKey);
        title = "Fast Travel";
        message = target
          ? `Blinkkorridor aktiv. Anflug auf ${target.name}. Die Orbit-Sphaere wird ohne Nachladen vorbereitet.`
          : "Blinkkorridor aktiv. Ziel wird vorbereitet.";
      } else if (activeJumpTarget) {
        title = anchorItem ? `Nahraum um ${anchorItem.name}` : "Naechste Systeme";
        message = `${jumpTargets.length} Ziele im Direktbereich. Aktiver Sprung: ${activeJumpTarget.item.name} (${activeJumpTarget.distanceLabel}, ${activeJumpTarget.cardinal}). Klick auf einen Punkt oder nutze die Pfeile.`;
      }
      threeNavHud.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
    } else {
      threeNavHud.innerHTML = "";
    }
  }

  if (threeJumpHud) {
    const showJumpHud = showDesktopNavigation && jumpTargets.length > 0 && !state.three.fastTravel;
    threeJumpHud.classList.toggle("hidden", !showJumpHud);
    if (showJumpHud) {
      threeJumpHud.innerHTML = buildThreeJumpHudMarkup(jumpTargets);
    } else {
      threeJumpHud.innerHTML = "";
    }
  }

  if (threeNavArrows) {
    const showNavArrows = showDesktopNavigation && jumpTargets.length > 0;
    threeNavArrows.classList.toggle("hidden", !showNavArrows);
    if (threePrevPlanetButton) {
      const previousTarget = jumpTargets.length
        ? jumpTargets[(state.three.jumpCursor - 1 + jumpTargets.length) % jumpTargets.length]
        : null;
      threePrevPlanetButton.disabled = jumpTargets.length <= 1 || !previousTarget || Boolean(state.three.fastTravel);
      threePrevPlanetButton.title = previousTarget ? `Sprung zu ${previousTarget.item.name}` : "";
    }
    if (threeNextPlanetButton) {
      const nextTarget = jumpTargets.length ? jumpTargets[(state.three.jumpCursor + 1) % jumpTargets.length] : null;
      threeNextPlanetButton.disabled = jumpTargets.length <= 1 || !nextTarget || Boolean(state.three.fastTravel);
      threeNextPlanetButton.title = nextTarget ? `Sprung zu ${nextTarget.item.name}` : "";
    }
  }

  if (threeOrbitHud) {
    const showOrbitHud = state.viewMode === "3d" && state.three.mode === "orbit" && Boolean(orbitItem);
    threeOrbitHud.classList.toggle("hidden", !showOrbitHud);
    if (showOrbitHud) {
      const routeCount = orbitConnections.length;
      if (threeOrbitTitle) {
        threeOrbitTitle.textContent = orbitItem.name;
      }
      if (threeOrbitSubtitle) {
        threeOrbitSubtitle.textContent = routeCount
          ? `Hologramm-Orbit · ${routeCount} direkte Hyperraum-${routeCount === 1 ? "Verbindung" : "Verbindungen"} · weiter herauszoomen fuer die Galaxie`
          : "Hologramm-Orbit · keine direkten Hyperraumverbindungen · weiter herauszoomen fuer die Galaxie";
      }
    }
  }

  if (threeOrbitCompass) {
    const showCompass = state.viewMode === "3d" && state.three.mode === "orbit" && Boolean(orbitItem);
    threeOrbitCompass.classList.toggle("hidden", !showCompass);
    if (showCompass && orbitItem) {
      const centerProjection = projectThreeWorldToOverlay(threeWorldVectorFromItem(orbitItem, 1.2));
      if (!centerProjection) {
        threeOrbitCompass.classList.add("hidden");
      } else {
        const centerX = centerProjection.x;
        const centerY = centerProjection.y;
        const connectionRadius = clamp(Math.min(centerProjection.rect.width, centerProjection.rect.height) * 0.24, 88, 188);
        const compassRadius = clamp(connectionRadius * 0.42, 44, 72);
        const compassSize = state.isMobileView ? 88 : 104;
        const compassCenter = compassSize * 0.5;
        const neighborMarkup = orbitConnections
          .map((connection) => {
            const screenDirection = threeScreenDirectionFromWorld(connection.direction);
            if (!screenDirection) return "";
            const left = centerX + screenDirection.x * connectionRadius;
            const top = centerY + screenDirection.y * connectionRadius;
            return `
              <div class="three-orbit-neighbor" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;">
                <span class="three-orbit-neighbor-arrow" style="--orbit-angle:${screenDirection.angleDeg.toFixed(1)}deg;"></span>
                <span class="three-orbit-neighbor-copy">
                  <span class="three-orbit-neighbor-name">${escapeHtml(connection.planet.name)}</span>
                  <span class="three-orbit-neighbor-meta">${escapeHtml(
              `${cardinalDirectionLabel(connection.direction)} · ${connection.routeText || "Hyperraum"}`
            )}</span>
                </span>
              </div>
            `;
          })
          .join("");
        const compassMarkup = [
          { axis: "north", label: "N", direction: new THREE.Vector3(0, 0, 1) },
          { axis: "east", label: "O", direction: new THREE.Vector3(1, 0, 0) },
          { axis: "south", label: "S", direction: new THREE.Vector3(0, 0, -1) },
          { axis: "west", label: "W", direction: new THREE.Vector3(-1, 0, 0) },
        ]
          .map((entry) => {
            const screenDirection = threeScreenDirectionFromWorld(entry.direction);
            if (!screenDirection) return "";
            const left = compassCenter + screenDirection.x * compassRadius * 0.56;
            const top = compassCenter + screenDirection.y * compassRadius * 0.56;
            return `<span class="three-orbit-rose-label" data-axis="${entry.axis}" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;">${entry.label}</span>`;
          })
          .join("");
        threeOrbitCompass.innerHTML = `${neighborMarkup}<div class="three-orbit-rose" style="width:${compassSize}px;height:${compassSize}px;">${compassMarkup}</div>`;
      }
    } else {
      threeOrbitCompass.innerHTML = "";
    }
  }
}

function enterThreeOrbitMode(item, immediate = false) {
  if (!item || item.kind === "route" || item.kind === "faction" || isSectorArmyLayerItem(item) || !ensureThreeScene()) return;
  state.three.fastTravel = null;
  state.three.pendingTravelLanding = null;
  clearThreeOrbitGroup();
  const orbitPresentation = createThreeOrbitPresentation(item);
  const orbitDistanceProfile = threeOrbitDistanceProfile(item);
  state.three.orbitGroup.add(orbitPresentation);
  state.three.orbitGroup.visible = true;
  state.three.dataGroup.visible = false;
  state.three.mode = "orbit";
  state.three.orbitItemKey = item.nameKey;
  if (threeViewerHint) {
    threeViewerHint.classList.add("hidden");
  }
  setThreeFocus(orbitPresentation.position, orbitDistanceProfile.viewDistance, immediate);
  syncThreeInteractionState(true);
  renderThreeUiOverlay();
  startThreeAnimation();
}

function exitThreeOrbitMode(immediate = false) {
  const orbitItem = activeThreeOrbitItem();
  clearThreeOrbitGroup();
  if (state.three.orbitGroup) {
    state.three.orbitGroup.visible = false;
  }
  if (state.three.dataGroup) {
    state.three.dataGroup.visible = true;
  }
  state.three.mode = "galaxy";
  state.three.orbitItemKey = null;
  if (threeViewerHint && state.viewMode === "3d") {
    threeViewerHint.classList.remove("hidden");
  }
  if (orbitItem) {
    setThreeFocus(threeWorldVectorFromItem(orbitItem, 3.5), threePlanetExitFocusDistance(), immediate);
  }
  syncThreeInteractionState(true);
  renderThreeUiOverlay();
}

function updateThreePlanetColors(selectedPlanetKey, hoveredPlanetKey) {
  const points = state.three.pointCloud;
  const geometry = points?.geometry;
  const colorAttribute = geometry?.getAttribute?.("color");
  const baseColors = geometry?.userData?.baseColors;
  if (!colorAttribute || !baseColors) return;

  const selectionColor = new THREE.Color("#6de3d7");
  const hoverColor = new THREE.Color("#dff6ff");

  for (let index = 0; index < state.three.pointKeys.length; index += 1) {
    const offset = index * 3;
    let red = baseColors[offset];
    let green = baseColors[offset + 1];
    let blue = baseColors[offset + 2];
    const key = state.three.pointKeys[index];

    if (key === hoveredPlanetKey) {
      red = red * 0.36 + hoverColor.r * 0.64;
      green = green * 0.36 + hoverColor.g * 0.64;
      blue = blue * 0.36 + hoverColor.b * 0.64;
    }
    if (key === selectedPlanetKey) {
      red = red * 0.28 + selectionColor.r * 0.72;
      green = green * 0.28 + selectionColor.g * 0.72;
      blue = blue * 0.28 + selectionColor.b * 0.72;
    }

    colorAttribute.array[offset] = red;
    colorAttribute.array[offset + 1] = green;
    colorAttribute.array[offset + 2] = blue;
  }

  colorAttribute.needsUpdate = true;
}

function syncThreeInteractionState(force = false) {
  if (!state.three.renderer) return;

  const hovered = hoveredItem();
  const selectedDetail = selectedDetailItem();
  const selectedFaction = selectedFactionItem();
  const selectedPlanet = selectedDetail && selectedDetail.kind !== "route" && selectedDetail.kind !== "faction" ? selectedDetail : null;
  const hoveredPlanet = hovered && hovered.kind !== "route" && hovered.kind !== "faction" ? hovered : null;
  const selectedRouteKey = selectedDetail?.kind === "route" ? selectedDetail.nameKey : "";
  const hoveredRouteKey = hovered?.kind === "route" ? hovered.nameKey : "";
  const selectedFactionKey = selectedFaction?.nameKey || "";
  const hoveredFactionKey = hovered?.kind === "faction" ? hovered.nameKey : "";
  const visualSignature = [
    selectedPlanet?.nameKey || "",
    hoveredPlanet?.nameKey || "",
    selectedRouteKey,
    hoveredRouteKey,
    selectedFactionKey,
    hoveredFactionKey,
    state.viewMode,
    state.three.mode,
    state.three.orbitItemKey || "",
    state.three.rebuildKey,
  ].join("|");

  if (!force && state.three.lastVisualSignature === visualSignature) {
    return;
  }
  state.three.lastVisualSignature = visualSignature;

  updateThreePlanetColors(selectedPlanet?.nameKey || "", hoveredPlanet?.nameKey || "");

  state.three.routeObjects.forEach((line, key) => {
    const isSelected = key === selectedRouteKey;
    const isHovered = key === hoveredRouteKey;
    line.material.color.set(isSelected ? "#6de3d7" : isHovered ? "#f4f9ff" : "#c9d2e2");
    line.material.opacity = isSelected ? 0.94 : isHovered ? 0.66 : 0.24;
  });

  state.three.factionObjects.forEach((group, key) => {
    const baseColor = group.userData.baseColor?.clone?.() || new THREE.Color("#9cc9ff");
    const isSelected = key === selectedFactionKey;
    const isHovered = key === hoveredFactionKey;
    const glow = group.children[0];
    const outline = group.children[1];
    const core = group.children[2];
    outline.material.color.copy(
      isSelected ? new THREE.Color("#6de3d7") : isHovered ? baseColor.clone().lerp(new THREE.Color("#ffffff"), 0.32) : baseColor
    );
    outline.material.opacity = isSelected ? 1 : isHovered ? 0.98 : 0.9;
    core.material.opacity = isSelected ? 1 : isHovered ? 0.96 : 0.9;
    glow.material.opacity = isSelected ? 0.62 : isHovered ? 0.48 : 0.38;
    group.scale.setScalar(isSelected ? 1.26 : isHovered ? 1.12 : 1);
    glow.scale.setScalar(isSelected ? 19 : isHovered ? 18.2 : 17);
  });

  if (state.three.hoverMarker) {
    state.three.hoverMarker.visible = false;
  }

  if (state.three.selectionMarker) {
    if (state.three.mode === "galaxy" && selectedPlanet && mapItemVisible(selectedPlanet)) {
      state.three.selectionMarker.visible = true;
      state.three.selectionMarker.position.copy(threeWorldVectorFromItem(selectedPlanet, 6.2));
    } else {
      state.three.selectionMarker.visible = false;
    }
  }

  if (threeViewerEl) {
    threeViewerEl.classList.toggle("is-hovered", state.viewMode === "3d" && Boolean(hovered));
  }

  renderThreeUiOverlay();

  if (state.viewMode === "3d") {
    startThreeAnimation();
  }
}

function updateThreeCamera() {
  if (!state.three.camera) return;
  if (!state.three.focus) {
    state.three.focus = new THREE.Vector3(0, 0, 0);
    state.three.targetFocus = state.three.focus.clone();
  }

  const damping = state.three.dragging ? 0.22 : 0.1;
  state.three.focus.lerp(state.three.targetFocus || state.three.focus, damping);
  state.three.yaw = THREE.MathUtils.lerp(state.three.yaw, state.three.targetYaw, damping);
  state.three.pitch = THREE.MathUtils.lerp(state.three.pitch, state.three.targetPitch, damping);
  state.three.distance = THREE.MathUtils.lerp(state.three.distance, state.three.targetDistance, damping);

  state.three.camera.position
    .copy(state.three.focus)
    .add(threeCameraDirectionVector(state.three.yaw, state.three.pitch).multiplyScalar(state.three.distance));
  state.three.camera.lookAt(state.three.focus);
}

function threeCameraDirectionVector(yaw = state.three.yaw, pitch = state.three.pitch) {
  return new THREE.Vector3(
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw)
  );
}

function syncThreeTargetsToCurrentView() {
  const focus = (state.three.focus || state.three.targetFocus || new THREE.Vector3()).clone();
  const distance = clampThreeDistance(state.three.distance || state.three.targetDistance || threeDefaultGalaxyDistance());
  state.three.focus = focus.clone();
  state.three.targetFocus = focus.clone();
  state.three.targetYaw = state.three.yaw;
  state.three.targetPitch = state.three.pitch;
  state.three.distance = distance;
  state.three.targetDistance = distance;
}

function threePointerVectorFromClient(clientX, clientY, rect = threeViewerEl?.getBoundingClientRect()) {
  if (typeof THREE === "undefined" || !rect?.width || !rect?.height) return null;
  return new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
}

function threeRayFromPointer(pointer, camera) {
  if (typeof THREE === "undefined" || !pointer || !camera) return null;
  const origin = camera.position.clone();
  const target = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
  const direction = target.sub(origin);
  if (!direction.lengthSq()) return null;
  return {
    origin,
    direction: direction.normalize(),
  };
}

function threeRayIntersectionAtPlaneHeight(ray, planeY) {
  if (!ray) return null;
  const deltaY = ray.direction.y;
  if (Math.abs(deltaY) < 0.0001) return null;
  const distance = (planeY - ray.origin.y) / deltaY;
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance));
}

function threeFocusFromCursorZoom(clientX, clientY, nextDistance) {
  if (typeof THREE === "undefined" || !state.three.camera || !threeViewerEl) return null;
  const rect = threeViewerEl.getBoundingClientRect();
  const pointer = threePointerVectorFromClient(clientX, clientY, rect);
  if (!pointer) return null;
  const currentFocus = (state.three.focus || state.three.targetFocus || new THREE.Vector3()).clone();
  const anchor = threeRayIntersectionAtPlaneHeight(threeRayFromPointer(pointer, state.three.camera), currentFocus.y);
  if (!anchor) return null;
  const tempCamera = state.three.camera.clone();
  tempCamera.position.copy(currentFocus).add(threeCameraDirectionVector(state.three.yaw, state.three.pitch).multiplyScalar(nextDistance));
  tempCamera.lookAt(currentFocus);
  tempCamera.updateProjectionMatrix();
  tempCamera.updateMatrixWorld(true);
  const shiftedAnchor = threeRayIntersectionAtPlaneHeight(threeRayFromPointer(pointer, tempCamera), currentFocus.y);
  if (!shiftedAnchor) return null;
  return currentFocus.add(anchor.sub(shiftedAnchor));
}

function threeCameraSettled() {
  const focusTarget = state.three.targetFocus || state.three.focus;
  if (!state.three.focus || !focusTarget) return true;
  return (
    state.three.focus.distanceToSquared(focusTarget) <= THREE_CAMERA_SETTLE_EPSILON.focus &&
    Math.abs(state.three.yaw - state.three.targetYaw) <= THREE_CAMERA_SETTLE_EPSILON.angle &&
    Math.abs(state.three.pitch - state.three.targetPitch) <= THREE_CAMERA_SETTLE_EPSILON.angle &&
    Math.abs(state.three.distance - state.three.targetDistance) <= THREE_CAMERA_SETTLE_EPSILON.distance
  );
}

function renderThreeFrame() {
  if (state.viewMode !== "3d" || !state.three.renderer || !state.three.scene || !state.three.camera) {
    state.three.animationFrame = 0;
    return;
  }

  const now = performance.now();
  const overlayNeedsUpdate =
    state.three.dragging || !threeCameraSettled() || Boolean(state.three.fastTravel) || Boolean(state.three.pendingTravelLanding);
  updateThreeFastTravel(now);
  if (state.three.pendingTravelLanding) {
    completeThreeFastTravelLanding();
  }
  updateThreeCamera();
  updateThreeBackdropAnimation(now);
  updateThreeRimLightAnimation(now);
  updateThreePointMaterial();
  state.three.renderer.render(state.three.scene, state.three.camera);
  if (overlayNeedsUpdate) {
    renderThreeUiOverlay(true);
  }
  if (state.three.dragging || !threeCameraSettled() || threeSceneNeedsContinuousAnimation()) {
    state.three.animationFrame = window.requestAnimationFrame(renderThreeFrame);
    return;
  }
  state.three.animationFrame = 0;
}

function startThreeAnimation() {
  if (state.viewMode !== "3d" || state.three.animationFrame) return;
  state.three.animationFrame = window.requestAnimationFrame(renderThreeFrame);
}

function stopThreeAnimation() {
  if (!state.three.animationFrame) return;
  window.cancelAnimationFrame(state.three.animationFrame);
  state.three.animationFrame = 0;
}

function setThreeFocus(vector, distance, immediate = false) {
  if (!vector) return;
  state.three.targetFocus = vector.clone();
  state.three.targetDistance = clampThreeDistance(distance);
  if (immediate || !state.three.focus) {
    state.three.focus = vector.clone();
    state.three.distance = state.three.targetDistance;
  }
  startThreeAnimation();
}

function focusThreeOnGrid(grid, immediate = false) {
  const bounds = gridBoundsPx(grid);
  const normalizedBounds = threeNormalizedBoundsFromPixels(bounds);
  if (!normalizedBounds) return;
  const focus = threeFocusVectorFromBounds(normalizedBounds, "");
  setThreeFocus(focus, threeDistanceForBounds(normalizedBounds, 84), immediate);
}

function focusThreeOnItem(item, immediate = false, options = {}) {
  if (!ensureThreeScene() || !item) return;
  const distanceOverride = Number(options?.distance);

  if (item.kind === "route" && item.route_bounds) {
    const focus = threeFocusVectorFromBounds(item.route_bounds, "");
    setThreeFocus(focus, threeDistanceForBounds(item.route_bounds, 44), immediate);
    return;
  }

  if (item.kind === "faction" && item.fragment_bounds) {
    const bounds = threeNormalizedBoundsFromPixels(item.fragment_bounds);
    const focus = threeFocusVectorFromBounds(bounds, "");
    setThreeFocus(focus, threeDistanceForBounds(bounds, 70), immediate);
    return;
  }

  const targetDistance = Number.isFinite(distanceOverride) ? distanceOverride : threePlanetFocusDistance();
  setThreeFocus(threeWorldVectorFromItem(item, 3.5), targetDistance, immediate);
}

function activateThreePlanetInDesktopGalaxy(item) {
  if (!item || item.kind === "route" || item.kind === "faction") return;
  const selectedPlanet = selectedDetailItem();
  const isSamePlanet = selectedPlanet?.nameKey === item.nameKey;
  const closeEnoughForOrbit =
    Math.min(state.three.distance || Number.POSITIVE_INFINITY, state.three.targetDistance || Number.POSITIVE_INFINITY) <=
    threeGalaxyOrbitEnterDistance(item);

  selectMapItem(item);
  if (isSamePlanet && closeEnoughForOrbit) {
    enterThreeOrbitMode(item);
    return;
  }

  const approachDistance = Math.min(
    Math.min(state.three.distance || Number.POSITIVE_INFINITY, state.three.targetDistance || Number.POSITIVE_INFINITY),
    threeGalaxyApproachDistance(item)
  );
  focusThreeOnItem(item, false, { distance: approachDistance });
  setStatus(`${item.name} im Galaxiemodus angeflogen. Noch naeher zoomen oder erneut klicken, um den Orbit zu oeffnen.`);
}

function resolveThreeIntersection(intersection) {
  if (!intersection?.object) return null;
  if (intersection.object === state.three.pointCloud && Number.isInteger(intersection.index)) {
    return {
      kind: "planet",
      itemKey: state.three.pointKeys[intersection.index],
      priority: 0,
    };
  }

  let node = intersection.object;
  while (node) {
    const itemKey = String(node.userData?.itemKey || "").trim();
    if (node.userData?.pickable && itemKey) {
      return {
        kind: String(node.userData.kind || ""),
        itemKey,
        priority: node.userData.kind === "faction" ? 1 : node.userData.kind === "route" ? 2 : 0,
      };
    }
    node = node.parent;
  }
  return null;
}

function pickThreeItem(clientX, clientY) {
  if (!ensureThreeScene() || !state.three.camera || !state.three.dataGroup || !threeViewerEl) return null;
  const rect = threeViewerEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  state.three.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.three.pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  state.three.raycaster.setFromCamera(state.three.pointer, state.three.camera);

  const intersections = state.three.raycaster.intersectObjects(state.three.dataGroup.children, true);
  let best = null;

  intersections.forEach((intersection) => {
    const resolved = resolveThreeIntersection(intersection);
    if (!resolved?.itemKey) return;
    const item = getSelectableItemByKey(resolved.itemKey);
    if (!item || !mapItemVisible(item)) return;
    if (
      !best ||
      resolved.priority < best.priority ||
      (resolved.priority === best.priority && intersection.distance < best.distance)
    ) {
      best = {
        item,
        priority: resolved.priority,
        distance: intersection.distance,
      };
    }
  });

  return best?.item || null;
}

function bindThreeInteractions() {
  if (!threeViewerEl) return;

  const touchDistance = () => {
    const touches = Array.from(state.three.activeTouches.values());
    if (touches.length < 2) return 0;
    const [first, second] = touches;
    return Math.hypot(second.x - first.x, second.y - first.y);
  };

  const updatePinchDistance = () => {
    if (state.three.activeTouches.size < 2) {
      state.three.pinching = false;
      state.multiTouchActive = false;
      state.three.pinchDistance = 0;
      return false;
    }

    const distance = touchDistance();
    if (!(distance > 0)) return false;
    if (!state.three.pinching) {
      state.three.pinching = true;
      state.multiTouchActive = true;
      state.three.pinchDistance = distance;
      state.three.pinchTargetDistance = state.three.targetDistance;
      state.three.justPinchedUntil = Date.now() + 280;
      lockTouchSelection(620);
      state.three.pointerDown = false;
      state.three.dragging = false;
      state.three.dragMoved = true;
      setHovered(null);
      return true;
    }

    const scaleFactor = distance / Math.max(state.three.pinchDistance, 1);
    state.three.targetDistance = clampThreeDistance(state.three.pinchTargetDistance / Math.max(scaleFactor, 0.001));
    state.three.justPinchedUntil = Date.now() + 280;
    lockTouchSelection(620);
    startThreeAnimation();
    return true;
  };

  const clearPointerState = (event) => {
    if (state.three.dragPointerId != null && threeViewerEl.hasPointerCapture?.(state.three.dragPointerId)) {
      threeViewerEl.releasePointerCapture(state.three.dragPointerId);
    }
    if (event?.pointerType === "touch") {
      state.three.activeTouches.delete(event.pointerId);
      if (!updatePinchDistance() && state.multiTouchActive) {
        state.multiTouchActive = false;
        lockTouchSelection(240);
      }
    }
    state.three.pointerDown = false;
    state.three.dragging = false;
    state.three.dragPointerId = null;
    state.three.lastHoverSampleAt = 0;
    if (event && state.viewMode === "3d" && !state.three.dragMoved && Date.now() >= state.three.justPinchedUntil) {
      state.three.hoverClientX = event.clientX;
      state.three.hoverClientY = event.clientY;
      setHovered(pickThreeItem(event.clientX, event.clientY));
    }
  };

  threeViewerEl.addEventListener("pointerdown", (event) => {
    if (state.viewMode !== "3d") return;
    if (state.three.fastTravel) return;
    if (event.pointerType === "touch") {
      state.three.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (updatePinchDistance()) {
        return;
      }
      lockTouchSelection(320);
    }
    state.three.pointerDown = true;
    state.three.dragging = true;
    state.three.dragMoved = false;
    state.three.dragPointerId = event.pointerId;
    state.three.lastPointerX = event.clientX;
    state.three.lastPointerY = event.clientY;
    threeViewerEl.setPointerCapture?.(event.pointerId);
  });

  threeViewerEl.addEventListener("pointermove", (event) => {
    if (state.viewMode !== "3d") return;
    if (state.three.fastTravel) return;
    state.three.hoverClientX = event.clientX;
    state.three.hoverClientY = event.clientY;
    if (event.pointerType === "touch" && state.three.activeTouches.has(event.pointerId)) {
      state.three.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (updatePinchDistance()) {
        return;
      }
    }

    if (state.three.pointerDown) {
      const deltaX = event.clientX - state.three.lastPointerX;
      const deltaY = event.clientY - state.three.lastPointerY;
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        state.three.dragMoved = true;
      }
      state.three.targetYaw -= deltaX * 0.0054;
      state.three.targetPitch = clamp(state.three.targetPitch + deltaY * 0.0046, -1.46, 1.46);
      state.three.lastPointerX = event.clientX;
      state.three.lastPointerY = event.clientY;
      if (state.three.dragMoved) {
        setHovered(null);
      }
      startThreeAnimation();
      return;
    }

    if (threePerformanceProfile().hoverThrottleMs > 0) {
      const now = performance.now();
      if (now - state.three.lastHoverSampleAt < threePerformanceProfile().hoverThrottleMs) {
        return;
      }
      state.three.lastHoverSampleAt = now;
    }

    setHovered(pickThreeItem(event.clientX, event.clientY));
    renderThreeUiOverlay();
  });

  threeViewerEl.addEventListener("pointerup", (event) => {
    if (state.viewMode !== "3d") return;
    if (state.three.fastTravel) return;
    const moved = state.three.dragMoved;
    clearPointerState(event);
    if (moved || Date.now() < state.three.justPinchedUntil) return;
    const item = pickThreeItem(event.clientX, event.clientY);
    if (!item) return;
    if (!itemHasDetails(item)) {
      setStatus(`${item.name}: Noch keine Detailinformationen verfuegbar.`);
      return;
    }
    if (item.kind !== "route" && item.kind !== "faction") {
      if (state.three.mode === "galaxy" && threeDesktopNavigationEnabled()) {
        activateThreePlanetInDesktopGalaxy(item);
      } else {
        focusItem(item);
        enterThreeOrbitMode(item);
      }
    } else {
      if (state.three.mode === "orbit") {
        exitThreeOrbitMode(true);
      }
      focusItem(item);
    }
  });

  threeViewerEl.addEventListener("pointercancel", clearPointerState);
  threeViewerEl.addEventListener("pointerleave", () => {
    if (state.viewMode !== "3d" || state.three.pointerDown) return;
    setHovered(null);
    renderThreeUiOverlay();
  });

  threeViewerEl.addEventListener(
    "wheel",
    (event) => {
      if (state.viewMode !== "3d") return;
      if (state.three.fastTravel) return;
      event.preventDefault();

      const scaleFactor = Math.exp(event.deltaY * (state.three.mode === "orbit" ? 0.0025 : 0.0021));
      const orbitProfile = state.three.mode === "orbit" ? threeOrbitDistanceProfile(activeThreeOrbitItem()) : null;
      syncThreeTargetsToCurrentView();
      const nextDistance = clampThreeDistance(state.three.distance * scaleFactor);
      if (state.three.mode === "galaxy") {
        const nextFocus = threeFocusFromCursorZoom(event.clientX, event.clientY, nextDistance);
        if (nextFocus) {
          state.three.targetFocus = nextFocus;
        }
      }
      state.three.targetDistance = nextDistance;
      if (state.three.mode === "orbit" && event.deltaY > 0 && nextDistance >= (orbitProfile?.exitDistance || THREE_ORBIT_EXIT_DISTANCE)) {
        exitThreeOrbitMode();
        return;
      }
      startThreeAnimation();
    },
    { passive: false }
  );
}

function setViewMode(mode) {
  const nextMode = normalizeViewMode(mode);
  if (state.isMobileView && nextMode === "3d") {
    state.viewMode = "2d";
    renderViewMode();
    setStatus("3D-Ansicht ist auf Mobilgeraeten deaktiviert.");
    return;
  }
  if (state.threeTransition.active) return;
  if (nextMode === state.viewMode) {
    renderViewMode();
    return;
  }

  if (nextMode === "3d") {
    void beginThreeViewTransition();
    return;
  }

  state.viewMode = nextMode;
  if (state.viewMode === "3d") {
    rebuildThreeSceneData();
    const focusTarget = primarySelectedItem();
    if (focusTarget) {
      focusThreeOnItem(focusTarget, true);
    } else {
      focusThreeOnGrid(state.currentGrid, true);
    }
  } else {
    state.threeTransition.deferSceneData = false;
    clearThreeTransitionSceneDataTimer();
    state.three.fastTravel = null;
    state.three.pendingTravelLanding = null;
    stopThreeAnimation();
    if (threeViewerEl) {
      threeViewerEl.classList.remove("is-hovered");
    }
  }

  persistSession();
  renderAll();
}

function renderViewMode() {
  state.viewMode = normalizeViewMode(state.viewMode);
  renderMobileTravelButton();
  osdViewerEl.classList.toggle("desktop-point-hover", state.viewMode === "2d" && Boolean(state.hoveredKey) && !state.isMobileView);
  if (viewerFrameEl) {
    viewerFrameEl.classList.toggle("is-3d", state.viewMode === "3d");
    viewerFrameEl.classList.toggle("is-three-transitioning", state.threeTransition.active);
  }
  if (threeViewerEl) {
    threeViewerEl.setAttribute("aria-hidden", state.viewMode === "3d" ? "false" : "true");
    threeViewerEl.classList.toggle("is-hovered", state.viewMode === "3d" && Boolean(hoveredItem()));
  }
  if (threeTransitionOverlayEl) {
    threeTransitionOverlayEl.classList.toggle("is-visible", state.threeTransition.visible);
    threeTransitionOverlayEl.setAttribute("aria-hidden", state.threeTransition.visible ? "false" : "true");
  }
  if (threeViewerHint) {
    threeViewerHint.classList.toggle("hidden", state.viewMode !== "3d" || state.three.mode === "orbit" || state.threeTransition.visible);
  }
  if (viewerHelpText) {
    viewerHelpText.textContent = VIEW_HELP_TEXT[state.viewMode] || VIEW_HELP_TEXT["2d"];
  }
  if (viewModeToggleButton) {
    const currentMode = state.viewMode === "3d" ? "3d" : "2d";
    const nextModeLabel = currentMode === "3d" ? "2D" : "3D";
    viewModeToggleButton.textContent = currentMode;
    viewModeToggleButton.classList.toggle("is-3d", currentMode === "3d");
    viewModeToggleButton.classList.toggle("hidden", state.isMobileView);
    viewModeToggleButton.setAttribute("aria-pressed", currentMode === "3d" ? "true" : "false");
    viewModeToggleButton.setAttribute("aria-label", `Zu ${nextModeLabel} wechseln`);
    viewModeToggleButton.title = `Zu ${nextModeLabel} wechseln`;
    viewModeToggleButton.disabled = state.threeTransition.active || state.isMobileView;
  }

  if (state.viewMode === "3d" && typeof THREE === "undefined") {
    if (state.threeTransition.active) {
      return;
    }
    loadThreeModuleIfNeeded()
      .then(() => {
        if (state.viewMode === "3d") {
          renderViewMode();
        }
      })
      .catch(() => setStatus("Three.js konnte nicht geladen werden."));
    return;
  }

  if (state.viewMode === "3d") {
    if (state.threeTransition.active && !state.three.renderer) {
      return;
    }
    if (!ensureThreeScene()) {
      state.viewMode = "2d";
      renderViewMode();
      return;
    }
    resizeThreeRenderer();
    if (!state.threeTransition.deferSceneData) {
      rebuildThreeSceneData();
      syncThreeInteractionState();
    }
    startThreeAnimation();
  } else {
    if (state.three.mode === "orbit") {
      exitThreeOrbitMode(true);
    }
    stopThreeAnimation();
    renderThreeUiOverlay();
  }
}

function focusGrid(grid) {
  const label = normalizeGridLabel(grid);
  const bounds = gridBoundsPx(label);
  if (!label || !bounds || !state.viewer) return;
  state.currentGrid = label;
  if (gridInput) {
    gridInput.value = label;
  }

  const tiledImage = state.viewer.world.getItemAt(0);
  if (tiledImage && typeof tiledImage.imageToViewportRectangle === "function") {
    const rect = tiledImage.imageToViewportRectangle(bounds.left, bounds.top, bounds.width, bounds.height);
    state.viewer.viewport.fitBounds(rect, true);
  }
  if (state.viewMode === "3d") {
    if (state.three.mode === "orbit") {
      exitThreeOrbitMode(true);
    }
    focusThreeOnGrid(label);
  }
  if (state.isMobileView) setMobilePanel(null);
  persistSession();
  renderAll();
  setStatus(`Grid ${label} fokussiert.`);
}

function focusItem(item, select = true) {
  if (!item || !state.viewer) return;
  if (select) selectMapItem(item);
  if (state.viewMode === "3d") {
    if (
      state.three.mode === "orbit" &&
      (item.kind === "route" || item.kind === "faction" || item.nameKey !== state.three.orbitItemKey)
    ) {
      exitThreeOrbitMode(true);
    }
    focusThreeOnItem(item);
  }
  const tiledImage = state.viewer.world.getItemAt(0);
  if (!tiledImage || typeof tiledImage.imageToViewportRectangle !== "function") return;

  if (item.kind === "route") {
    const bounds = item.route_bounds;
    if (!bounds) return;
    const rect = tiledImage.imageToViewportRectangle(
      bounds.left * state.imageWidth,
      bounds.top * state.imageHeight,
      Math.max(220, (bounds.right - bounds.left) * state.imageWidth),
      Math.max(220, (bounds.bottom - bounds.top) * state.imageHeight)
    );
    state.viewer.viewport.fitBounds(rect, true);
    return;
  }

  if (item.kind === "faction" && item.fragment_bounds) {
    const bounds = item.fragment_bounds;
    const rect = tiledImage.imageToViewportRectangle(
      bounds.left,
      bounds.top,
      Math.max(220, bounds.right - bounds.left),
      Math.max(220, bounds.bottom - bounds.top)
    );
    state.viewer.viewport.fitBounds(rect, true);
    return;
  }

  if (item.kind === "sectorArmy") {
    const bounds = sectorArmyBoundsPx(item);
    if (bounds) {
      const padding = Math.max(bounds.width, bounds.height) * 0.18;
      const rect = tiledImage.imageToViewportRectangle(
        Math.max(0, bounds.left - padding),
        Math.max(0, bounds.top - padding),
        Math.min(state.imageWidth, bounds.width + padding * 2),
        Math.min(state.imageHeight, bounds.height + padding * 2)
      );
      state.viewer.viewport.fitBounds(rect, true);
      return;
    }
  }

  const centerX = item.x * state.imageWidth;
  const centerY = item.y * state.imageHeight;
  const cellSize = calibratedCellSizePx();
  const width = Math.max(220, (cellSize?.width || state.imageWidth / GRID_LETTERS.length) * 1.5);
  const height = Math.max(220, (cellSize?.height || state.imageHeight / GRID_ROWS) * 1.5);
  const rect = tiledImage.imageToViewportRectangle(centerX - width / 2, centerY - height / 2, width, height);
  state.viewer.viewport.fitBounds(rect, true);
}

function pulseSearchItem(item) {
  if (!item || item.kind === "route" || item.kind === "faction") return;
  state.searchPulseKey = item.nameKey;
  if (state.searchPulseTimer) {
    window.clearTimeout(state.searchPulseTimer);
  }
  renderOverlay();
  state.searchPulseTimer = window.setTimeout(() => {
    if (state.searchPulseKey === item.nameKey) {
      state.searchPulseKey = null;
      renderOverlay();
    }
    state.searchPulseTimer = null;
  }, 2600);
}

function clientToImageNorm(clientX, clientY) {
  if (!state.viewer || !state.imageWidth || !state.imageHeight) return null;
  const rect = osdViewerEl.getBoundingClientRect();
  const webPoint = new OpenSeadragon.Point(clientX - rect.left, clientY - rect.top);
  const viewportPoint = state.viewer.viewport.pointFromPixel(webPoint, true);
  const imagePoint = state.viewer.viewport.viewportToImageCoordinates(viewportPoint);
  return {
    x: clamp01(imagePoint.x / state.imageWidth),
    y: clamp01(imagePoint.y / state.imageHeight),
  };
}

function distanceSqToSegment(pointX, pointY, startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  if (!dx && !dy) {
    return (pointX - startX) ** 2 + (pointY - startY) ** 2;
  }
  const t = clamp(((pointX - startX) * dx + (pointY - startY) * dy) / (dx * dx + dy * dy), 0, 1);
  const projX = startX + dx * t;
  const projY = startY + dy * t;
  return (pointX - projX) ** 2 + (pointY - projY) ** 2;
}

function findNearestPlanetItem(targetX, targetY, tolerance) {
  const toleranceSq = tolerance * tolerance;
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  visibleRenderableMapItems().forEach((item) => {
    const { x, y } = itemImagePosition(item);
    const dx = x - targetX;
    const dy = y - targetY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > toleranceSq) return;

    if (
      distanceSq < bestDistanceSq - 0.001 ||
      (Math.abs(distanceSq - bestDistanceSq) < 0.001 &&
        best &&
        itemSelectionWeight(item) < itemSelectionWeight(best))
    ) {
      best = item;
      bestDistanceSq = distanceSq;
    }
  });

  return { item: best, distanceSq: bestDistanceSq };
}

function findNearestFactionItem(targetX, targetY, tolerance) {
  const items = ensureFactionItems();
  if (!items.size) {
    return { item: null, distanceSq: Number.POSITIVE_INFINITY };
  }

  const distanceToRepublicBanner = (fragment, localX, localY) => {
    const ringRadius = fragment.bannerSize * 0.42;
    const lineWidth = fragment.bannerSize * 0.08;
    return Math.abs(Math.hypot(localX, localY) - ringRadius) - lineWidth * 0.92;
  };

  const distanceToSeparatistBanner = (fragment, localX, localY) => {
    const outerRadius = fragment.bannerSize * 0.47;
    const lineWidth = fragment.bannerSize * 0.075;
    const outerVertices = hexagonVertices(outerRadius);
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < outerVertices.length; index += 1) {
      const start = outerVertices[index];
      const end = outerVertices[(index + 1) % outerVertices.length];
      best = Math.min(best, Math.sqrt(distanceSqToSegment(localX, localY, start.x, start.y, end.x, end.y)) - lineWidth * 0.92);
    }
    return best;
  };

  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  items.forEach((item) => {
    if (!factionVisibleByFilters(item)) return;
    (Array.isArray(item.fragments) ? item.fragments : []).forEach((fragment) => {
      const localX = targetX - fragment.cx;
      const localY = targetY - fragment.cy;
      const outlineDistance =
        fragment.faction === "separatist"
          ? distanceToSeparatistBanner(fragment, localX, localY)
          : distanceToRepublicBanner(fragment, localX, localY);
      if (outlineDistance > Math.max(6, tolerance * 0.46)) return;
      const distanceSq = Math.max(0, outlineDistance) ** 2;
      if (distanceSq >= bestDistanceSq) return;
      best = item;
      bestDistanceSq = distanceSq;
    });
  });

  return { item: best, distanceSq: bestDistanceSq };
}

function findNearestRouteItem(target, tolerance) {
  if (!state.routeByKey.size || !state.imageWidth || !state.imageHeight) {
    return { item: null, distanceSq: Number.POSITIVE_INFINITY };
  }

  const toleranceSq = tolerance * tolerance;
  const targetX = target.x * state.imageWidth;
  const targetY = target.y * state.imageHeight;
  const toleranceNormX = tolerance / Math.max(1, state.imageWidth);
  const toleranceNormY = tolerance / Math.max(1, state.imageHeight);
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  visibleRouteItems().forEach((item) => {
    const bounds = item.route_bounds;
    if (
      bounds &&
      (target.x < bounds.left - toleranceNormX ||
        target.x > bounds.right + toleranceNormX ||
        target.y < bounds.top - toleranceNormY ||
        target.y > bounds.bottom + toleranceNormY)
    ) {
      return;
    }

    const samples = Array.isArray(item.route_samples) ? item.route_samples : [];
    for (let index = 1; index < samples.length; index += 1) {
      const start = samples[index - 1];
      const end = samples[index];
      const distanceSq = distanceSqToSegment(
        targetX,
        targetY,
        start.x * state.imageWidth,
        start.y * state.imageHeight,
        end.x * state.imageWidth,
        end.y * state.imageHeight
      );
      if (distanceSq > toleranceSq || distanceSq >= bestDistanceSq) continue;
      best = item;
      bestDistanceSq = distanceSq;
    }
  });

  return { item: best, distanceSq: bestDistanceSq };
}

function findNearestRenderableItem(clientX, clientY) {
  const target = clientToImageNorm(clientX, clientY);
  if (!target) return null;
  const bounds = viewportImageBounds(0);
  const imagePxPerScreenPx = bounds
    ? Math.max(1, bounds.right - bounds.left) / Math.max(1, osdViewerEl.clientWidth || 1)
    : Math.max(1, state.imageWidth) / Math.max(1, osdViewerEl.clientWidth || 1);
  const targetX = target.x * state.imageWidth;
  const targetY = target.y * state.imageHeight;
  const factionTolerance = imagePxPerScreenPx * (state.isMobileView ? 34 : 24);
  const planetTolerance = imagePxPerScreenPx * (state.isMobileView ? 28 : 18);
  const routeTolerance = imagePxPerScreenPx * (state.isMobileView ? 24 : 14);
  const strategicAssetTolerance = imagePxPerScreenPx * (state.isMobileView ? 32 : 22);
  const factionHit = findNearestFactionItem(targetX, targetY, factionTolerance);
  const planetHit = findNearestPlanetItem(targetX, targetY, planetTolerance);
  const routeHit = findNearestRouteItem(target, routeTolerance);
  const strategicAssetHit = findNearestStrategicAssetItem(targetX, targetY, strategicAssetTolerance);
  const sectorArmyHit = sectorArmyItemAtNorm(target);

  if (planetHit.item && Math.sqrt(planetHit.distanceSq) <= planetTolerance * 0.92) {
    return planetHit.item;
  }
  if (strategicAssetHit.item && Math.sqrt(strategicAssetHit.distanceSq) <= strategicAssetTolerance * 0.9) {
    return strategicAssetHit.item;
  }
  if (!planetHit.item && !routeHit.item) return strategicAssetHit.item || sectorArmyHit || factionHit.item;
  if (!routeHit.item) {
    if (!planetHit.item) return strategicAssetHit.item || sectorArmyHit || factionHit.item;
    return factionHit.item ? factionHit.item : planetHit.item;
  }
  if (!planetHit.item) {
    if (strategicAssetHit.item) return strategicAssetHit.item;
    if (factionHit.item) {
      const factionDistance = Math.sqrt(factionHit.distanceSq);
      const routeDistance = Math.sqrt(routeHit.distanceSq);
      return factionDistance / Math.max(1, factionTolerance) < routeDistance / Math.max(1, routeTolerance)
        ? factionHit.item
        : routeHit.item;
    }
    return sectorArmyHit || routeHit.item;
  }

  const planetDistance = Math.sqrt(planetHit.distanceSq);
  const routeDistance = Math.sqrt(routeHit.distanceSq);
  const factionDistance = Math.sqrt(factionHit.distanceSq);
  const factionScore = factionHit.item ? factionDistance / Math.max(1, factionTolerance) : Number.POSITIVE_INFINITY;
  if (planetDistance <= planetTolerance * 0.45) {
    return planetHit.item;
  }
  const planetScore = (planetDistance / planetTolerance) * 0.82;
  const routeScore = routeDistance / routeTolerance;
  if (factionHit.item && factionScore < Math.min(routeScore, planetScore) * 0.96) {
    return factionHit.item;
  }
  const precise = routeScore < planetScore ? routeHit.item : planetHit.item;
  return precise || strategicAssetHit.item || sectorArmyHit;
}

function renderSearchResults() {
  const query = normalizeNameKey(searchInput.value);
  if (!query) {
    state.searchHits = [];
    searchResults.classList.remove("open");
    searchResults.innerHTML = "";
    return;
  }
  const hits = allSearchItems()
    .filter((item) => mapItemSearchText(item).includes(query))
    .slice(0, state.isMobileView ? 6 : 10);
  state.searchHits = hits;
  searchResults.innerHTML = hits
    .map(
      (item) => `
        <li>
          <button type="button" class="search-hit" data-key="${item.nameKey}">
            <span>${item.name}</span>
            <span class="sd-region">${searchItemMetaText(item)}</span>
          </button>
        </li>
      `
    )
    .join("");
  searchResults.classList.toggle("open", hits.length > 0);
}

function setMapFilter(key, value) {
  if (!(key in state.filters)) return;
  if (key === "sectorArmies" && state.mapMode === "underworld") {
    state.filters = {
      ...state.filters,
      sectorArmies: false,
    };
    clearSectorArmyEditModes();
    setStatus("Sektorarmeen bleiben im Underworld-Modus ausgeblendet.");
    renderAll();
    persistSession();
    return;
  }
  state.filters = {
    ...state.filters,
    [key]: Boolean(value),
  };

  if (!mapItemVisible(hoveredItem())) {
    setHovered(null);
  }

  invalidateStaticOverlay();
  renderAll();
  if (searchInput.value.trim()) {
    renderSearchResults();
  }
  persistSession();
}

function toggleMapFilter(key) {
  if (!(key in state.filters)) return;
  setMapFilter(key, !state.filters[key]);
}

function commitSectorArmyEditorField(field, target) {
  if (!field) return;
  if (field === "selectedId") {
    setSectorArmyEditorSelectedId(target.value);
    renderAll();
    return;
  }
  if (field === "exportText") {
    state.sectorArmyEditor.exportText = target.value;
    return;
  }
  const id = state.sectorArmyEditor.selectedId;
  if (!isSectorArmyBoundaryEditActive(id)) {
    setStatus("Grenzen sind gesperrt. Starte die Bearbeitung zuerst im Infopanel.");
    renderAll();
    return;
  }
  if (field === "status") {
    pushSectorArmyEditorUndo(id);
    updateSectorArmyTerritoryDraft(id, { status: String(target.value || "unbearbeitet") });
  } else if (field === "rep_total") {
    pushSectorArmyEditorUndo(id);
    const val = normalizeFleetQuantity(target.value);
    updateSectorArmyDataDraft(id, { republic: { ...(sectorArmyById(id)?.republic || {}), total: val } });
  } else if (field === "rep_free") {
    pushSectorArmyEditorUndo(id);
    const val = normalizeFleetQuantity(target.value);
    updateSectorArmyDataDraft(id, { republic: { ...(sectorArmyById(id)?.republic || {}), free: val } });
  } else if (field === "cis_total") {
    pushSectorArmyEditorUndo(id);
    const val = normalizeFleetQuantity(target.value);
    updateSectorArmyDataDraft(id, { cis: { ...(sectorArmyById(id)?.cis || {}), total: val } });
  } else if (field === "cis_free") {
    pushSectorArmyEditorUndo(id);
    const val = normalizeFleetQuantity(target.value);
    updateSectorArmyDataDraft(id, { cis: { ...(sectorArmyById(id)?.cis || {}), free: val } });
  } else if (field === "locked") {
    pushSectorArmyEditorUndo(id);
    updateSectorArmyTerritoryDraft(id, { locked: Boolean(target.checked) });
  } else if (field === "anchors") {
    const anchorPlanets = String(target.value || "")
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    pushSectorArmyEditorUndo(id);
    updateSectorArmyTerritoryDraft(id, { anchorPlanets });
  } else if (field === "notes") {
    pushSectorArmyEditorUndo(id);
    updateSectorArmyTerritoryDraft(id, { notes: String(target.value || "") });
  }
  state.sectorArmyEditor.validation = [];
  renderAll();
}

async function handleSectorArmyEditorAction(action, source) {
  if (!action) return;
  const item = selectedSectorArmyEditorItem();
  if (action === "toggle") {
    if (state.sectorArmyEditor.enabled) {
      stopSectorArmyBoundaryEdit();
      return;
    }
    await requestStartSectorArmyBoundaryEdit(state.sectorArmyEditor.selectedId);
    return;
  } else if (action === "modify") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) {
      setStatus("Grenzen sind gesperrt. Starte die Bearbeitung zuerst im Infopanel.");
      renderAll();
      return;
    }
    // legacy toggle: switch between vertex mode and sector mode
    const nextMode = state.sectorArmyEditor.modifyMode ? "sector" : "vertex";
    state.sectorArmyEditor.mode = nextMode;
    state.sectorArmyEditor.modifyMode = nextMode === "vertex" || nextMode === "curve";
    setStatus(state.sectorArmyEditor.modifyMode ? "Modify-Modus aktiv." : "Modify-Modus deaktiviert.");
  } else if (action === "focus" && item) {
    focusItem(item, false);
  } else if (action === "label-mode") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    state.sectorArmyEditor.labelMode = !state.sectorArmyEditor.labelMode;
    setStatus(state.sectorArmyEditor.labelMode ? "Naechster Kartenklick setzt das Label." : "Labelmodus aus.");
  } else if (action === "add-center") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    const territory = selectedSectorArmyEditorTerritory();
    addSectorArmyEditorPoint(normalizeSectorPoint(territory?.labelPosition) || polygonCentroidNorm(territory?.polygon) || { x: 0.5, y: 0.5 });
  } else if (action === "remove-point") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    removeSectorArmyEditorPoint();
  } else if (action === "delete-territory") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    const confirmed = await showSectorArmyConfirmDialog({
      title: "Gebiet loeschen?",
      message:
        "Dieses Gebiet wird aus der lokalen Sektorarmee-Grenze entfernt. Du kannst es spaeter ueber neue Polygonpunkte wieder aufbauen.",
      confirmLabel: "Gebiet loeschen",
    });
    if (!confirmed) return;
    pushSectorArmyEditorUndo(state.sectorArmyEditor.selectedId);
    updateSectorArmyTerritoryDraft(state.sectorArmyEditor.selectedId, { polygon: [] });
    state.sectorArmyEditor.selectedPointIndex = -1;
    state.sectorArmyEditor.validation = [];
    setStatus("Sektorarmee-Gebiet geloescht.");
  } else if (action === "select-point") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    state.sectorArmyEditor.selectedPointIndex = Number(source?.dataset?.index);
  } else if (action === "validate") {
    state.sectorArmyEditor.validation = validateSectorArmyTerritory(selectedSectorArmyEditorTerritory());
    setStatus(state.sectorArmyEditor.validation.length ? "Grenze hat noch Hinweise." : "Grenze technisch gueltig.");
  } else if (action === "export-json") {
    state.sectorArmyEditor.exportText = exportSectorArmyTerritories("json");
    setStatus("Sektorarmee-Grenzen als JSON exportiert.");
  } else if (action === "export-selected-json") {
    state.sectorArmyEditor.exportText = exportSectorArmyTerritory(state.sectorArmyEditor.selectedId, "json");
    setStatus("Aktueller Sektor als JSON exportiert.");
  } else if (action === "undo") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    undoSectorArmyEditorChange(state.sectorArmyEditor.selectedId);
  } else if (action === "redo") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    redoSectorArmyEditorChange(state.sectorArmyEditor.selectedId);
  } else if (action === "mode") {
    const mode = String(source?.dataset?.mode || "view");
    state.sectorArmyEditor.mode = mode;
    state.sectorArmyEditor.modifyMode = mode === "vertex" || mode === "curve";
    setStatus(`Editor-Modus: ${mode}`);
  } else if (action === "export-ts") {
    state.sectorArmyEditor.exportText = exportSectorArmyTerritories("ts");
    setStatus("Sektorarmee-Grenzen als TypeScript exportiert.");
  } else if (action === "import") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    try {
      const textarea = sectorArmyEditorMount?.querySelector('[data-sector-editor-field="exportText"]');
      if (!importSectorArmyTerritoriesFromText(textarea?.value || state.sectorArmyEditor.exportText)) {
        setStatus("Import enthaelt keine Sektorarmee-Grenzen.");
      } else {
        state.sectorArmyEditor.validation = [];
        setStatus("Sektorarmee-Grenzen importiert.");
      }
    } catch (_error) {
      setStatus("Import konnte nicht gelesen werden.");
    }
  } else if (action === "reset") {
    if (!isSectorArmyBoundaryEditActive(state.sectorArmyEditor.selectedId)) return;
    resetSectorArmyTerritoryDrafts();
    state.sectorArmyEditor.validation = [];
    state.sectorArmyEditor.exportText = "";
    setStatus("Lokale Sektorarmee-Grenzen verworfen.");
  }
  renderAll();
  persistSession();
}

async function handleSectorArmyDetailAction(action, source) {
  const id = Number(source?.dataset?.sectorId || selectedDetailItem()?.army?.id || state.sectorArmyEditor.selectedId);
  if (!Number.isFinite(id)) return;
  if (action === "start-boundary-edit") {
    await requestStartSectorArmyBoundaryEdit(id);
  } else if (action === "stop-boundary-edit") {
    stopSectorArmyBoundaryEdit();
  } else if (action === "start-table-edit") {
    await requestStartSectorArmyTableEdit(id);
  } else if (action === "stop-table-edit") {
    stopSectorArmyTableEdit();
  }
}

function commitSectorArmyShipInput(input) {
  if (!input || !validateSectorAvailabilityInput(input)) {
    setStatus("Leere oder ungueltige Schiffswerte werden nicht gespeichert.");
    return;
  }
  const id = Number(input.dataset.sectorId);
  if (!isSectorArmyTableEditActive(id)) {
    setStatus("Schiffstabelle ist gesperrt. Starte die Tabellenbearbeitung zuerst im Infopanel.");
    renderAll();
    return;
  }
  const factionKey = sectorFleetDataKey(input.dataset.sectorFaction);
  const shipKey = String(input.dataset.sectorShipKey || "").trim();
  const category = String(input.dataset.sectorCategory || "").trim();
  if (!shipKey || !SECTOR_SHIP_AVAILABILITY_KEYS.includes(category)) return;
  const value = normalizeSectorAvailabilityQuantity(input.value);
  const army = sectorArmyById(id);
  if (!army) return;
  const rows = sectorFleetAvailabilityRows(army, factionKey).map((row) => ({
    ...row,
    values: { ...(row.values || {}) },
  }));
  const row = rows.find((entry) => entry.shipKey === shipKey);
  if (!row) return;
  row.values[category] = value;
  row.total = SECTOR_SHIP_AVAILABILITY_KEYS.reduce((sum, key) => sum + normalizeSectorAvailabilityQuantity(row.values[key]), 0);
  const table = sectorFleetAvailabilityDraft(rows);
  const totals = sectorFleetAvailabilityTotals(rows);
  const dataKey = sectorFleetDataKey(factionKey);
  updateSectorArmyDataDraft(id, {
    fleetTables: {
      ...(army.fleetTables || {}),
      [dataKey]: table,
    },
    [dataKey]: {
      ...(army[dataKey] || {}),
      total: totals.total,
      free: totals.free,
    },
  });
  setStatus(`${sectorFleetDisplayLabel(factionKey)}-Schiffstabelle aktualisiert.`);
  renderAll();
  persistSession();
}

function renderAll() {
  renderSidebar();
  renderOverlay();
  renderViewMode();
  renderDesktopWindowVisibility();
}

function bindEvents() {
  const commitTravelPlanetInput = (kind) => {
    const input = kind === "start" ? travelStartInput : travelTargetInput;
    const value = String(input.value || "").trim();
    const label = kind === "start" ? "Startplanet" : "Zielplanet";
    const item = syncTravelStateFromField(kind, value);
    markTravelDirty();

    if (!value) {
      renderAll();
      persistSession();
      return;
    }

    if (item) {
      setStatus(`${label}: ${item.name}`);
    } else {
      setStatus(`${label} "${value}" wurde nicht gefunden.`);
    }

    renderAll();
    persistSession();
  };

  const commitTravelHyperdrive = () => {
    state.travelHyperdriveClass = Math.max(0.1, Number(travelHyperdriveInput.value) || 1);
    markTravelDirty();
    renderAll();
    persistSession();
  };

  bindDesktopWindowDrag();
  bindDesktopWindowResizePersistence();
  bindMobileMenuSheet();
  searchInput.addEventListener("input", renderSearchResults);
  mobileMenuOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panel = normalizeMobilePanel(button.dataset.mobileOpen);
      if (!panel) return;
      setMobilePanel(panel);
    });
  });
  mobileMenuCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panel = normalizeMobilePanel(button.dataset.mobileClose) || MOBILE_MENU_PANEL;
      setMobilePanel(panel);
    });
  });
  if (landingIntroEl) {
    landingIntroEl.addEventListener(
      "wheel",
      (event) => {
        if (!state.intro.active) return;
        event.preventDefault();
        const delta = clamp(event.deltaY / Math.max(window.innerHeight * 1.24, 620), -0.1, 0.14);
        nudgeLandingIntro(delta);
      },
      { passive: false }
    );
    landingIntroEl.addEventListener(
      "touchstart",
      (event) => {
        if (!state.intro.active) return;
        const touch = event.touches?.[0];
        state.intro.touchLastY = touch ? touch.clientY : 0;
      },
      { passive: true }
    );
    landingIntroEl.addEventListener(
      "touchmove",
      (event) => {
        if (!state.intro.active) return;
        const touch = event.touches?.[0];
        if (!touch) return;
        const previousY = state.intro.touchLastY || touch.clientY;
        state.intro.touchLastY = touch.clientY;
        const delta = clamp((previousY - touch.clientY) / Math.max(window.innerHeight * 3.4, 1100), -0.04, 0.06);
        if (!delta) return;
        event.preventDefault();
        nudgeLandingIntro(delta);
      },
      { passive: false }
    );
    landingIntroEl.addEventListener(
      "touchend",
      () => {
        state.intro.touchLastY = 0;
      },
      { passive: true }
    );
  }
  window.addEventListener("resize", () => {
    if (landingIntroEl && !landingIntroEl.classList.contains("hidden")) {
      rebuildLandingStars();
      startLandingIntroLoop();
    }
    if (state.threeTransition.visible) {
      rebuildThreeTransitionStars();
      startThreeTransitionLoop();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (!state.intro.active) return;
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      nudgeLandingIntro(0.08);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      nudgeLandingIntro(-0.07);
    }
  });
  window.addEventListener("keydown", (event) => {
    if (!state.sectorArmyEditor.enabled) return;
    const tag = String(document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSectorArmyEditorPoint();
      renderAll();
    }
  });
  mapFilterButtons.forEach((button) => {
    const key = String(button.dataset.filterKey || "").trim();
    if (!key || !(key in state.filters)) return;
    button.addEventListener("click", () => toggleMapFilter(key));
  });
  if (sectorArmyFleetButton) {
    sectorArmyFleetButton.addEventListener("click", () => {
      if (state.mapMode === "underworld") {
        setMapFilter("sectorArmies", false);
        return;
      }
      setMapFilter("sectorArmies", true);
      if (!state.isMobileView) {
        setDesktopWindowVisible("mapTools", true, false);
      }
      setStatus("Sektorarmeen & Flottenlage eingeblendet. Bearbeitung startet erst im Infopanel nach Warnhinweis.");
    });
  }
  if (sectorArmyEditorMount) {
    sectorArmyEditorMount.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sector-editor-action]");
      if (!button) return;
      event.preventDefault();
      void handleSectorArmyEditorAction(button.dataset.sectorEditorAction, button);
    });
    sectorArmyEditorMount.addEventListener("change", (event) => {
      const field = event.target?.dataset?.sectorEditorField;
      if (!field) return;
      commitSectorArmyEditorField(field, event.target);
    });
    sectorArmyEditorMount.addEventListener("input", (event) => {
      const field = event.target?.dataset?.sectorEditorField;
      if (field === "exportText") {
        state.sectorArmyEditor.exportText = event.target.value;
      }
    });
  }
  if (planetDetailRefs.body) {
    planetDetailRefs.body.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sector-detail-action]");
      if (!button) return;
      event.preventDefault();
      void handleSectorArmyDetailAction(button.dataset.sectorDetailAction, button);
    });
    planetDetailRefs.body.addEventListener("input", (event) => {
      const input = event.target?.closest?.("[data-sector-ship-input]");
      if (!input) return;
      validateSectorAvailabilityInput(input);
    });
    planetDetailRefs.body.addEventListener("change", (event) => {
      const input = event.target?.closest?.("[data-sector-ship-input]");
      if (!input) return;
      commitSectorArmyShipInput(input);
    });
  }
  document.addEventListener("pointermove", updateSectorArmyEditorDrag);
  document.addEventListener("pointerup", finishSectorArmyEditorDrag);
  document.addEventListener("pointercancel", finishSectorArmyEditorDrag);
  searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-key]");
    if (!button) return;
    const key = button.dataset.key;
    const item = getSelectableItemByKey(key);
    if (!item) return;
    focusItem(item, false);
    pulseSearchItem(item);
    setStatus(`${item.name} auf der Karte fokussiert. Anklicken oeffnet die Details.`);
    searchInput.value = item.name;
    searchResults.classList.remove("open");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) {
      searchResults.classList.remove("open");
    }
  });

  let pendingHoverPoint = null;
  let hoverFrameQueued = false;
  osdViewerEl.addEventListener("mousemove", (event) => {
    if (state.isMobileView || isTouchGestureLocked()) {
      pendingHoverPoint = null;
      setHovered(null);
      return;
    }
    pendingHoverPoint = { x: event.clientX, y: event.clientY };
    if (hoverFrameQueued) return;
    hoverFrameQueued = true;
    requestAnimationFrame(() => {
      hoverFrameQueued = false;
      const point = pendingHoverPoint;
      pendingHoverPoint = null;
      if (!point) return;
      if (state.isMobileView || isTouchGestureLocked()) {
        setHovered(null);
        return;
      }
      setHovered(findNearestRenderableItem(point.x, point.y));
    });
  });
  osdViewerEl.addEventListener("mouseleave", () => {
    pendingHoverPoint = null;
    setHovered(null);
  });
  bindThreeInteractions();

  if (threeJumpHud) {
    const stopThreeNavPointerEvent = (event) => {
      event.stopPropagation();
    };
    const triggerThreeJumpTarget = (event) => {
      const button = event.target.closest("button[data-key]");
      if (!button || state.three.fastTravel) return;
      event.preventDefault();
      event.stopPropagation();
      const item = getSelectableItemByKey(button.dataset.key);
      if (!item) return;
      const index = Number(button.dataset.index);
      if (Number.isInteger(index) && index >= 0) {
        state.three.jumpCursor = index;
      }
      beginThreeFastTravel(item);
    };
    threeJumpHud.addEventListener("pointerdown", stopThreeNavPointerEvent);
    threeJumpHud.addEventListener("pointerup", triggerThreeJumpTarget);
    threeJumpHud.addEventListener("click", triggerThreeJumpTarget);
  }

  const captureThreeJumpInteraction = (event, trigger = false) => {
    if (state.viewMode !== "3d" || state.isMobileView) return;
    const button = resolveThreeJumpButtonAtClientPoint(event.clientX, event.clientY);
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (!trigger || state.three.fastTravel) return;
    const item = getSelectableItemByKey(button.dataset.key);
    if (!item) return;
    const index = Number(button.dataset.index);
    if (Number.isInteger(index) && index >= 0) {
      state.three.jumpCursor = index;
    }
    beginThreeFastTravel(item);
  };

  document.addEventListener(
    "pointerdown",
    (event) => {
      captureThreeJumpInteraction(event, false);
    },
    true
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      captureThreeJumpInteraction(event, true);
    },
    true
  );
  document.addEventListener(
    "mousedown",
    (event) => {
      captureThreeJumpInteraction(event, false);
    },
    true
  );
  document.addEventListener(
    "mouseup",
    (event) => {
      captureThreeJumpInteraction(event, true);
    },
    true
  );

  if (threePrevPlanetButton) {
    const handlePrevPlanet = (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateThreeJumpTarget(-1);
    };
    threePrevPlanetButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    threePrevPlanetButton.addEventListener("click", handlePrevPlanet);
  }

  if (threeNextPlanetButton) {
    const handleNextPlanet = (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateThreeJumpTarget(1);
    };
    threeNextPlanetButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    threeNextPlanetButton.addEventListener("click", handleNextPlanet);
  }

  if (mobileTravelButton) {
    mobileTravelButton.addEventListener("click", () => {
      if (state.isMobileView && state.viewMode === "3d") {
        setStatus("Mobil ist die Reiseoption im 3D-Modus vorerst deaktiviert.");
        return;
      }
      setMobilePanel(state.mobilePanel === "travel" ? null : "travel");
    });
  }

  if (gridPrev && gridNext && gridFocus && gridInput) {
    gridPrev.addEventListener("click", () => focusGrid(nextGridLabel(state.currentGrid, -1)));
    gridNext.addEventListener("click", () => focusGrid(nextGridLabel(state.currentGrid, 1)));
    gridFocus.addEventListener("click", () => focusGrid(gridInput.value));
    gridInput.addEventListener("change", () => focusGrid(gridInput.value));
    gridInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") focusGrid(gridInput.value);
    });
  }

  document.querySelectorAll("[data-panel-toggle]").forEach((toggle) => {
    const panelName = String(toggle.getAttribute("data-panel-toggle") || "").trim();
    if (!panelName) return;
    toggle.addEventListener("click", () => togglePanelExpanded(panelName));
  });

  desktopWindowOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.windowOpen || "").trim();
      if (!key || state.isMobileView) return;
      setDesktopWindowVisible(key, true, false);
      applyDesktopWindowLayout(false);
      persistSession();
    });
  });

  desktopWindowCloseButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = String(button.dataset.windowClose || "").trim();
      if (!key || state.isMobileView) return;
      setDesktopWindowVisible(key, false);
    });
  });

  desktopWindowMaximizeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = String(button.dataset.windowMaximize || "").trim();
      if (!key || state.isMobileView) return;
      setDesktopWindowMaximized(key, !state.desktopWindowMaximized[key]);
    });
  });

  travelStartInput.addEventListener("change", () => commitTravelPlanetInput("start"));
  travelStartInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commitTravelPlanetInput("start");
  });
  travelTargetInput.addEventListener("change", () => commitTravelPlanetInput("target"));
  travelTargetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commitTravelPlanetInput("target");
  });
  travelHyperdriveInput.addEventListener("change", commitTravelHyperdrive);
  travelHyperdriveInput.addEventListener("input", commitTravelHyperdrive);
  if (travelFleetSelect) {
    travelFleetSelect.addEventListener("change", () => {
      state.travelFleetId = String(travelFleetSelect.value || "");
      markTravelDirty();
      renderAll();
      persistSession();
    });
  }
  travelRunButton.addEventListener("click", runTravelCalculation);
  if (travelClearButton) {
    travelClearButton.addEventListener("click", clearTravelPlanner);
  }
  travelSwapButton.addEventListener("click", () => {
    const nextStartKey = state.travelTargetKey;
    const nextStartText = state.travelTargetText;
    state.travelTargetKey = state.travelStartKey;
    state.travelTargetText = state.travelStartText;
    state.travelStartKey = nextStartKey;
    state.travelStartText = nextStartText;
    markTravelDirty();
    renderAll();
    persistSession();
  });
  if (fleetProfileSelect) {
    fleetProfileSelect.addEventListener("change", () => {
      const store = ensureFleetStore();
      const id = String(fleetProfileSelect.value || "").trim();
      if (!store.profiles[id]) return;
      store.activeProfileId = id;
      state.travelFleetId = "";
      state.selectedFleetShipId = "";
      persistFleetStore();
      persistSession();
      renderAll();
      setStatus(`Kommandoprofil "${activeFleetProfileName()}" geladen.`);
    });
  }
  if (fleetLoginButton) {
    fleetLoginButton.addEventListener("click", () => {
      void syncFleetLogin("login");
    });
  }
  if (fleetRegisterButton) {
    fleetRegisterButton.addEventListener("click", () => {
      void syncFleetLogin("register");
    });
  }
  if (fleetLogoutButton) {
    fleetLogoutButton.addEventListener("click", logoutFleetAccount);
  }
  if (fleetSyncButton) {
    fleetSyncButton.addEventListener("click", () => {
      if (state.fleetAdminUserId) {
        void saveFleetStoreToCloud();
      } else {
        void loadFleetCloudStore();
      }
    });
  }
  [fleetUsernameInput, fleetPasswordInput].forEach((input) => {
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void syncFleetLogin("login");
      }
    });
  });
  if (fleetAdminLoadButton) {
    fleetAdminLoadButton.addEventListener("click", () => {
      void loadFleetAdminUsers();
    });
  }
  if (fleetAdminExitButton) {
    fleetAdminExitButton.addEventListener("click", exitFleetAdminView);
  }
  if (fleetAdminUserSelect) {
    fleetAdminUserSelect.addEventListener("change", () => {
      selectFleetAdminUser(fleetAdminUserSelect.value);
    });
  }
  if (fleetProfileSaveButton) {
    fleetProfileSaveButton.addEventListener("click", saveFleetProfileName);
  }
  if (fleetProfileCreateButton) {
    fleetProfileCreateButton.addEventListener("click", createFleetProfileFromInput);
  }
  if (fleetSaveButton) {
    fleetSaveButton.addEventListener("click", saveFleetFromForm);
  }
  if (fleetNewButton) {
    fleetNewButton.addEventListener("click", () => {
      setActiveFleetId("", false);
      if (fleetNameInput) fleetNameInput.value = "";
      if (fleetFactionInput) fleetFactionInput.value = "republic";
      renderAll();
    });
  }
  if (fleetDeleteButton) {
    fleetDeleteButton.addEventListener("click", deleteActiveFleet);
  }
  if (fleetList) {
    fleetList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-fleet-id]");
      if (!button) return;
      setActiveFleetId(button.dataset.fleetId);
    });
  }
  if (fleetShipFactionFilter) {
    fleetShipFactionFilter.addEventListener("change", renderFleetPanel);
  }
  if (fleetShipSearchInput) {
    fleetShipSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addShipToActiveFleet();
      }
    });
  }
  if (fleetShipAddButton) {
    fleetShipAddButton.addEventListener("click", addShipToActiveFleet);
  }
  if (fleetShipList) {
    fleetShipList.addEventListener("click", (event) => {
      const control = event.target.closest("[data-ship-action]");
      if (!control) return;
      const entryId = String(control.dataset.shipEntryId || control.dataset.shipId || "").trim();
      const action = String(control.dataset.shipAction || "").trim();
      if (!entryId || !action) return;
      if (action === "inc") {
        updateActiveFleetShip(entryId, 1);
      } else if (action === "dec") {
        updateActiveFleetShip(entryId, -1);
      } else if (action === "remove") {
        removeActiveFleetShip(entryId);
      } else if (action === "detail") {
        state.selectedFleetShipId = state.selectedFleetShipId === entryId ? "" : entryId;
        renderFleetPanel();
      }
    });
  }
  if (newsPublishButton) {
    newsPublishButton.addEventListener("click", () => {
      void publishNewsItem();
    });
  }
  if (newsImageFileInput) {
    newsImageFileInput.addEventListener("change", () => {
      void uploadNewsImageFile();
    });
  }
  if (newsList) {
    newsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-news-action]");
      if (!button) return;
      const action = String(button.dataset.newsAction || "").trim();
      const id = String(button.dataset.newsId || "").trim();
      if (action === "delete") {
        void deleteNewsItem(id);
      }
    });
  }
  if (viewModeToggleButton) {
    viewModeToggleButton.addEventListener("click", () => {
      setViewMode(state.viewMode === "3d" ? "2d" : "3d");
    });
  }
  const mapModeToggleButton = document.getElementById("mapModeToggleButton");
  if (mapModeToggleButton) {
    mapModeToggleButton.addEventListener("click", () => {
      setMapMode(state.mapMode === "underworld" ? "government" : "underworld");
    });
    updateMapModeToggleButton();
  }
  planetDetailSetTravelStartButton.addEventListener("click", () => {
    const item = selectedDetailItem();
    if (!item || item.kind === "route") return;
    setTravelPlanet("start", item);
    markTravelDirty();
    setStatus(`Startplanet auf ${item.name} gesetzt.`);
    renderAll();
    persistSession();
  });
  planetDetailSetTravelTargetButton.addEventListener("click", () => {
    const item = selectedDetailItem();
    if (!item || item.kind === "route") return;
    setTravelPlanet("target", item);
    markTravelDirty();
    setStatus(`Zielplanet auf ${item.name} gesetzt.`);
    renderAll();
    persistSession();
  });

  if (planetDetailClearButton) {
    planetDetailClearButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedDetail(null);
      persistSession();
    });
  }

  if (detailClearButton) {
    detailClearButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedFaction(null);
      persistSession();
    });
  }

  if (resetSelectionButton) {
    resetSelectionButton.addEventListener("click", () => {
      setSelectedDetail(null);
      setSelectedFaction(null);
      persistSession();
    });
  }

  MOBILE_MEDIA_QUERY.addEventListener("change", () => {
    updateResponsiveMode();
    renderAll();
  });

  window.addEventListener("resize", () => {
    updateResponsiveMode();
    scheduleOverlayRender();
    resizeThreeRenderer();
    if (state.viewMode === "3d") {
      startThreeAnimation();
    }
  });
  window.addEventListener("swmap-admin-auth-changed", () => {
    if (!window.MapAdminUi?.isAdmin?.() && state.fleetAdminUserId) {
      exitFleetAdminView();
      return;
    }
    try {
      if (!window.MapAdminUi?.isAdmin?.()) clearSectorArmyEditModes();
      sectorArmyEditorAvailable();
    } catch (_error) {
      // fall back to simply rendering
    }
    renderAll();
  });
  window.addEventListener("swmap-news-refresh", () => {
    void loadNewsItems();
  });
}

function initViewer() {
  state.viewer = OpenSeadragon({
    element: osdViewerEl,
    drawer: ["canvas"],
    tileSources: {
      type: "image",
      url: createBlankMapDataUrl(),
    },
    showNavigationControl: false,
    showZoomControl: false,
    showHomeControl: false,
    showFullPageControl: false,
    showRotationControl: false,
    visibilityRatio: 1,
    constrainDuringPan: true,
    minZoomLevel: 0.6,
    maxZoomPixelRatio: state.isMobileView ? 2.2 : 1.8,
    blendTime: state.isMobileView ? 0.04 : 0.08,
    animationTime: state.isMobileView ? 0.72 : 0.95,
    springStiffness: state.isMobileView ? 9 : 7,
    gestureSettingsTouch: {
      pinchToZoom: true,
      flickEnabled: true,
      clickToZoom: false,
      dblClickToZoom: true,
    },
  });

  osdViewerEl.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        state.multiTouchActive = true;
        lockTouchSelection(600);
      }
    },
    { passive: true }
  );
  osdViewerEl.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        state.multiTouchActive = true;
        lockTouchSelection(600);
      }
    },
    { passive: true }
  );
  const resetTouchState = (event) => {
    if (event.touches && event.touches.length > 1) {
      state.multiTouchActive = true;
      lockTouchSelection(420);
      return;
    }
    if (state.multiTouchActive) {
      state.multiTouchActive = false;
      lockTouchSelection(220);
      return;
    }
    state.multiTouchActive = false;
  };
  osdViewerEl.addEventListener("touchend", resetTouchState, { passive: true });
  osdViewerEl.addEventListener("touchcancel", resetTouchState, { passive: true });

  state.viewer.addHandler("canvas-click", (event) => {
    if (!event.quick || isTouchGestureLocked()) return;
    const originalEvent = event.originalEvent;
    const touchPoint = originalEvent?.changedTouches?.[0] || originalEvent?.touches?.[0] || null;
    const clientX = typeof originalEvent?.clientX === "number" ? originalEvent.clientX : touchPoint?.clientX;
    const clientY = typeof originalEvent?.clientY === "number" ? originalEvent.clientY : touchPoint?.clientY;
    if (typeof clientX !== "number" || typeof clientY !== "number") {
      return;
    }

    if (handleSectorArmyEditorCanvasClick(originalEvent)) {
      event.preventDefaultAction = true;
      return;
    }

    const item = findNearestRenderableItem(clientX, clientY);
    if (!item) return;
    event.preventDefaultAction = true;

    if (!itemHasDetails(item)) {
      setStatus(`${item.name}: Noch keine Detailinformationen verfuegbar.`);
      return;
    }

    focusItem(item);
  });

  state.viewer.addHandler("open", () => {
    const tiledImage = state.viewer.world.getItemAt(0);
    const size = tiledImage.getContentSize();
    state.imageWidth = Number(size?.x) || CALIBRATION_BASE_WIDTH;
    state.imageHeight = Number(size?.y) || CALIBRATION_BASE_HEIGHT;
    createOverlayPlane();
    focusGrid(state.currentGrid);
    renderAll();
    setStatus("Viewer bereit. Grid waehlen oder Planeten und Hyperraumrouten erkunden.");
  });
  state.viewer.addHandler("animation", scheduleOverlayRender);
  state.viewer.addHandler("animation-finish", () => {
    if (state.overlaySettleTimer) {
      window.clearTimeout(state.overlaySettleTimer);
    }
    state.viewerBusy = false;
    renderOverlay();
  });
  state.viewer.addHandler("resize", scheduleOverlayRender);
}

async function init() {
  buildKnownIndex();
  loadSessionFromStorage();
  loadFleetStoreFromStorage();
  loadFleetAuthFromStorage();
  loadNewsReadState();
  // Always start in 2D; 3D stays an explicit user action after the intro.
  state.viewMode = "2d";
  updateResponsiveMode();
  initLandingIntro();
  bindEvents();
  applyPanelExpanded("travel", state.panelExpanded.travel);
  applyPanelExpanded("fleet", state.panelExpanded.fleet);
  applyPanelExpanded("news", state.panelExpanded.news);
  applyPanelExpanded("planetDetail", state.panelExpanded.planetDetail);
  applyPanelExpanded("detail", state.panelExpanded.detail);
  applyPanelExpanded("mapTools", state.panelExpanded.mapTools);
  applyDesktopWindowLayout(false);
  initViewer();
  await loadCoreJsonData();
  void loadNewsItems();
  if (state.fleetAuth?.token) {
    void loadFleetCloudStore({ silent: true });
  }
  renderAll();
  markLandingIntroReady();
  void scheduleProgressiveStartupLoads();
  if (state.filters.profiledOnly) {
    void ensurePlanetProfilesLoaded();
  }
}

window.render_game_to_text = () =>
  JSON.stringify({
    currentGrid: state.currentGrid,
    view_mode: state.viewMode,
    mobile: state.isMobileView,
    selected_detail: selectedDetailItem()
      ? {
        name: selectedDetailItem().name,
        grid: normalizeGridLabel(selectedDetailItem().grid),
        kind: selectedDetailItem().kind,
        x: Number(selectedDetailItem().x?.toFixed?.(4) || selectedDetailItem().x || 0),
        y: Number(selectedDetailItem().y?.toFixed?.(4) || selectedDetailItem().y || 0),
      }
      : null,
    selected_faction: selectedFactionItem()
      ? {
        name: selectedFactionItem().name,
        kind: selectedFactionItem().kind,
        fragments: Number(selectedFactionItem().fragment_count || 0),
      }
      : null,
    hovered_item: hoveredItem()
      ? {
        name: hoveredItem().name,
        kind: hoveredItem().kind,
      }
      : null,
    counts: {
      planets: allRenderableMapItems().length,
      visible_planets: visibleRenderableMapItems().length,
      routes: state.routeByKey.size,
      visible_routes: visibleRouteItems().length,
      sector_armies: sectorArmyItems().length,
      visible_sector_armies: visibleSectorArmyItems().length,
      strategic_assets: strategicFleetAssetItems().length,
      calibrated: state.savedByKey.size,
      vectors: state.vectorPaths.length,
      guides: state.gridGuides.length,
      markers: state.gridMarkers.size,
    },
    filters: state.filters,
    overlay: {
      busy: state.viewerBusy,
      zoomFactor: Number(currentOverlayMetrics().zoomFactor.toFixed(2)),
    },
    three: {
      ready: Boolean(state.three.renderer),
      points: state.three.pointKeys.length,
      routes: state.three.routeObjects.size,
      factions: state.three.factionObjects.size,
      performance: threePerformanceKey(),
      mode: state.three.mode,
      orbit_item: activeThreeOrbitItem()?.name || null,
      distance: Number((state.three.distance || 0).toFixed(2)),
    },
    coordinates: "x/y are normalized image coordinates with origin at top-left; x grows right, y grows down.",
  });

window.advanceTime = () => {
  renderOverlay();
};

init();
