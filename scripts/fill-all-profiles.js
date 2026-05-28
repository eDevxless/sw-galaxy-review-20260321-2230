// Fuellt climate/terrain/species_population/lore fuer ALLE Planeten in
// planet_profiles.json deterministisch (Name-Hash). Bestehende, nicht-leere
// Felder werden nicht ueberschrieben. Nur Auto-Stub-Lore wird ersetzt.

const fs = require("fs");
const path = require("path");

const profilesPath = path.join(__dirname, "..", "planet_profiles.json");
const data = JSON.parse(fs.readFileSync(profilesPath, "utf8"));

// FNV-1a Hash
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (h ^ str.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 15), 0x85ebca77) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae3d) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0xffffffff;
  };
}

function weighted(rand, options) {
  const total = options.reduce((sum, o) => sum + o[1], 0);
  let r = rand() * total;
  for (const [val, w] of options) {
    r -= w;
    if (r <= 0) return val;
  }
  return options[options.length - 1][0];
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// ===== KLIMA =====
const CLIMATES = [
  ["Temperiert", 22],
  ["Temperiert · Wechselhaft", 8],
  ["Subtropisch", 7],
  ["Tropisch · Feucht", 8],
  ["Trocken · Heiss", 8],
  ["Wuestenartig · Heiss am Tag · Eisig in der Nacht", 6],
  ["Kontinental · Vier Jahreszeiten", 6],
  ["Subarktisch · Lange Winter", 5],
  ["Eisig · Tundra", 5],
  ["Stuermisch · Permanente Hochwinde", 4],
  ["Bewoelkt · Mild · Hohe Luftfeuchtigkeit", 4],
  ["Vulkanisch · Geothermal aktiv", 3],
  ["Aquatisch · Marin", 3],
  ["Sumpfig · Feuchtwarm", 3],
  ["Toxisch · Atemschutz erforderlich", 2],
  ["Saurig · Korrosiver Niederschlag", 2],
  ["Mediterran", 4],
];

// ===== TERRAIN =====
const TERRAINS_NATURAL = [
  "Waelder",
  "Bergregenwaelder",
  "Dschungel",
  "Steppen",
  "Grasebenen",
  "Savannen",
  "Berge",
  "Hochland",
  "Plateaus",
  "Schluchten",
  "Canyons",
  "Wuesten",
  "Salzwuesten",
  "Sandduenen",
  "Ozeane",
  "Inselketten",
  "Korallenriffe",
  "Tiefseegraeben",
  "Suempfe",
  "Mangrovenwaelder",
  "Marschland",
  "Eisflaechen",
  "Gletscher",
  "Tundra",
  "Vulkane",
  "Lavafelder",
  "Ascheebenen",
  "Hoehlensysteme",
  "Seenplatten",
  "Flussdeltas",
  "Geysir-Felder",
  "Geothermische Becken",
  "Salzpfannen",
  "Mooswaelder",
  "Felsfeldern",
];

const TERRAINS_CIVILIZED = [
  "Industriestaedte",
  "Handelszentren",
  "Hafenstaedte",
  "Spaceports",
  "Akademien",
  "Bergbau-Komplexe",
  "Plantagen",
  "Kuestenstaedte",
  "Festungen",
  "Klosterbergstationen",
  "Forschungsstationen",
  "Untergrundstaedte",
  "Stammesdoerfer",
  "Schwarzmarkt-Posten",
];

// ===== SPEZIES =====
const SPECIES_COMMON = [
  ["Mensch", 60],
  ["Twi'lek", 6],
  ["Rodianer", 5],
  ["Bothan", 4],
  ["Sullustaner", 4],
  ["Devaronier", 4],
  ["Duros", 5],
  ["Aqualisch", 3],
  ["Trandoshaner", 3],
  ["Quarren", 2],
  ["Mon Calamari", 2],
  ["Zabrak", 4],
  ["Ithorianer", 3],
  ["Kel Dor", 2],
  ["Bith", 2],
  ["Gran", 3],
  ["Klatooinianer", 2],
  ["Nikto", 2],
  ["Mirialaner", 2],
  ["Togruta", 2],
  ["Nautolaner", 2],
  ["Cathar", 2],
  ["Falleen", 2],
  ["Hutt-Vasallen", 2],
  ["Aleena", 1],
  ["Givin", 1],
  ["Iktotchi", 1],
  ["Tholothianer", 1],
  ["Mikkianer", 1],
  ["Sluissi", 1],
  ["Selonianer", 1],
  ["Drall", 1],
  ["Verpine", 1],
  ["Sakiyaner", 1],
  ["Snivvianer", 1],
  ["Weequay", 1],
  ["Wroonianer", 1],
];

// ===== LORE-FRAGMENTE =====
const FEATURES = [
  "die mehrlagigen Bergbau-Stollen unter der Aequatorebene",
  "die antiken Felsformationen am Nordpol",
  "die ueberhitzten Geysir-Felder im Hochland",
  "ein Netzwerk aus Hyperraum-Frachtstationen im Orbit",
  "die schwimmenden Markthallen ueber dem Aequator-Ozean",
  "die Klosterbergstationen alter Eremiten",
  "ein ausgedehntes Hoehlennetzwerk mit selbstleuchtenden Pilzkulturen",
  "die kristallinen Salzfelder",
  "die orbitalen Gravity-Wells fuer Frachtumschlag",
  "die ausgedehnten Plantagen-Komplexe",
  "ein altes Kult-Heiligtum unbekannter Herkunft",
  "die einst blockfreie Senatsdiplomatie",
  "die rauen Nordmeer-Fischerflotten",
  "die ungewoehnliche atmosphaerische Komposition",
  "Sith- oder Jedi-Ruinen am Suedpol",
  "ihre extrem lange Tag-Nacht-Periode",
  "die schwer regulierten Schmuggler-Routen unter der Oberflaeche",
  "die saisonalen Pilger-Karawanen",
  "die seltenen Erze und ihre Umschlagstationen",
  "die nahezu autarke Selbstversorgung trotz Krieg",
  "die isolierten Hochlandstaemme",
  "ihre extrem stabile Atmosphaere fuer Praezisionsoptik",
  "die metallisch glaenzenden Sandebenen",
  "die zwei sich kreuzenden Hyperraumrouten",
  "alte Pacht-Vertraege mit der Handelsfoederation",
  "ihre tiefen Foerderstollen im Permafrost",
  "die archaeologisch bedeutsamen Megalithanlagen",
  "die schwimmenden Sky-Cities ueber Sturmzonen",
];

const FACTION_LORE = {
  republic:
    "Im Klonkrieg blieb {name} republiktreu und stellte Frachtkapazitaeten, Akademiestandorte oder Garnisonen zur Verfuegung. {extra}",
  separatist:
    "Mit Beginn der Klonkriege schloss sich {name} der Konfoederation an - oft aus Frustration ueber Steuerlast oder Vernachlaessigung durch den Senat der Core-Welten. {extra}",
  neutral:
    "{name} erklaerte sich offiziell neutral, blieb aber stets unter Beobachtung beider Lager und diente in vielen Faellen als Hintertuer fuer Diplomatie und Schmuggel.",
};

const REPUBLIC_EXTRAS = [
  "Eine kleine Klonkampftruppe operiert hier zur Sicherung der Hyperraumknoten.",
  "Lokale Fabriken liefern Ersatzteile fuer Republikflotten der Mid Rim.",
  "Kleine Jedi-Konsulate vermitteln in saisonalen Stammeskonflikten.",
  "Senatorische Hilfsgesandtschaften pflegen Versorgungsabkommen.",
  "Eine Republikgarnison sichert die wichtigsten Spaceports.",
];

const SEPARATIST_EXTRAS = [
  "Geonosianische Droidenfabriken halten lokale Werkstaetten beschaeftigt.",
  "Techno-Union-Ingenieure bauen die alten Industrieanlagen um.",
  "Bankenklan-Filialen verwalten Sep-Kriegsanleihen.",
  "Die Handelsfoederation laesst hier Konvois zwischenstationieren.",
  "Konfoederations-Patrouillen sichern die Hyperraumkante des Sektors.",
];

const ECONOMY_HOOKS = [
  "Die Hauptwirtschaft basiert auf",
  "Lokal dominieren",
  "Wirtschaftlich praegen",
  "Wichtigste Exportgueter sind",
];

const ECONOMY_GOODS = [
  "Mineralabbau und Roherzhandel",
  "Agraranbau und seltene Gewuerze",
  "Werftarbeit und Reparaturwerkstaetten",
  "Hyperraum-Logistik und Frachtumschlag",
  "Tourismus und kulturelle Pilgerreisen",
  "Pharmazeutik und Heilkraeuter",
  "Waffenhandel und Sicherheitsdienste",
  "Holzverarbeitung und exotische Faserstoffe",
  "Kristall- und Edelsteinminen",
  "Fischerei und maritime Aquakultur",
  "Daten-Hosting und Hyperraum-Comm",
  "Kunsthandwerk und Gildenproduktion",
];

function generateLore(name, profile, rand) {
  const region = (profile.region || "").trim() || "Outer Rim";
  const climate = (profile.climate || "Temperiert").split(" · ")[0].toLowerCase();
  const faction = profile.faction || "neutral";
  const feature = pick(rand, FEATURES);

  let extra = "";
  if (faction === "republic") extra = pick(rand, REPUBLIC_EXTRAS);
  else if (faction === "separatist") extra = pick(rand, SEPARATIST_EXTRAS);

  const factionTpl = FACTION_LORE[faction] || FACTION_LORE.neutral;
  const factionText = factionTpl.replace(/\{name\}/g, name).replace(/\{extra\}/g, extra);

  const economy = `${pick(rand, ECONOMY_HOOKS)} ${pick(rand, ECONOMY_GOODS)}.`;

  return `${name} ist eine ${climate}e Welt in der Region ${region}. Bekannt fuer ${feature}. ${economy} ${factionText}`;
}

function generateClimate(rand) {
  return weighted(rand, CLIMATES);
}

function generateTerrain(rand) {
  const naturalCount = 2 + Math.floor(rand() * 2);
  const civilCount = rand() < 0.55 ? 1 : 0;
  const used = new Set();
  const out = [];
  for (let i = 0; i < naturalCount; i++) {
    let t;
    let attempts = 0;
    do {
      t = pick(rand, TERRAINS_NATURAL);
      attempts += 1;
    } while (used.has(t) && attempts < 8);
    if (!used.has(t)) {
      used.add(t);
      out.push(t);
    }
  }
  for (let i = 0; i < civilCount; i++) {
    let t;
    let attempts = 0;
    do {
      t = pick(rand, TERRAINS_CIVILIZED);
      attempts += 1;
    } while (used.has(t) && attempts < 8);
    if (!used.has(t)) {
      used.add(t);
      out.push(t);
    }
  }
  return out.join(" · ");
}

function generateSpecies(rand) {
  const speciesCount = rand() < 0.35 ? 2 : 1;
  const seen = new Set();
  const list = [];
  for (let i = 0; i < speciesCount; i++) {
    let s;
    let attempts = 0;
    do {
      s = weighted(rand, SPECIES_COMMON);
      attempts += 1;
    } while (seen.has(s) && attempts < 8);
    if (!seen.has(s)) {
      seen.add(s);
      list.push(s);
    }
  }
  // population
  const popMagnitude = rand();
  let pop;
  if (popMagnitude < 0.05) {
    pop = `${(1 + Math.floor(rand() * 9)) * 100} Tausend`;
  } else if (popMagnitude < 0.4) {
    pop = `${(1 + Math.floor(rand() * 9))}${rand() < 0.5 ? "" : "00"} Millionen`;
  } else {
    pop = `${(1 + Math.floor(rand() * 19))} Milliarden`;
  }
  return `Spezies: ${list.join(" · ")} · Bevoelkerung: ca. ${pop}`;
}

function isStubLore(lore) {
  if (!lore) return true;
  const trimmed = lore.trim();
  if (!trimmed) return true;
  if (/liegt im \? und ist auf der Karte/i.test(trimmed)) return true;
  if (/Automatisch aus Raster.*platziert/i.test(trimmed)) return true;
  // really short fallback texts
  if (
    /Quelle nennt als Zugehoerigkeit/i.test(trimmed) &&
    trimmed.length < 200
  )
    return true;
  return false;
}

const profiles = data.profiles;
let touched = 0;
let already = 0;
let lorePatched = 0;
for (const [name, profile] of Object.entries(profiles)) {
  const seed = hash(name);
  const rand = makeRng(seed || 1);
  let changed = false;

  if (!profile.climate || !profile.climate.trim()) {
    profile.climate = generateClimate(rand);
    changed = true;
  }
  if (!profile.terrain || !profile.terrain.trim()) {
    profile.terrain = generateTerrain(rand);
    changed = true;
  }
  if (!profile.species_population || !profile.species_population.trim()) {
    profile.species_population = generateSpecies(rand);
    changed = true;
  }
  if (isStubLore(profile.lore)) {
    profile.lore = generateLore(name, profile, rand);
    lorePatched += 1;
    changed = true;
  }

  if (changed) touched += 1;
  else already += 1;
}

fs.writeFileSync(profilesPath, JSON.stringify(data, null, 2), "utf8");
console.log(
  `Aktualisiert: ${touched} Planeten · Schon vollstaendig: ${already} · Lore neu generiert: ${lorePatched}`
);
console.log("planet_profiles.json gespeichert.");
