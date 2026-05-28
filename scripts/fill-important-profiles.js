// Befuellt climate/terrain/species_population/orbit_image fuer die wichtigen
// Klonkriegs-Welten (Legends, 20 VSY) in planet_profiles.json.
// Bestehende, nicht-leere Werte werden NICHT ueberschrieben.
// orbit_image wird immer gesetzt (vorher ohnehin leer).

const fs = require("fs");
const path = require("path");

const profilesPath = path.join(__dirname, "..", "planet_profiles.json");
const data = JSON.parse(fs.readFileSync(profilesPath, "utf8"));

const fp = (name) =>
  `https://starwars.fandom.com/wiki/Special:FilePath/${encodeURIComponent(name)}`;

const updates = {
  // ===== REPUBLIK =====
  Coruscant: {
    orbit_image: fp("Coruscant.jpg"),
  },
  Alderaan: {
    climate: "Temperiert",
    orbit_image: fp("Alderaan.jpg"),
  },
  Naboo: {
    orbit_image: fp("Naboo.jpg"),
  },
  Chandrila: {
    climate: "Temperiert",
    terrain: "Grasebenen · Sanfte Huegel · Kuestenseen · Hanna City",
    species_population:
      "Spezies: Mensch (Chandrilaner) · Bevoelkerung: ca. 1,2 Milliarden",
    orbit_image: fp("Chandrila.jpg"),
  },
  Kamino: {
    climate: "Stuermisch · Andauernde Regenfaelle · Ozeanisch",
    orbit_image: fp("Kamino.jpg"),
  },
  Kuat: {
    climate: "Temperiert",
    terrain: "Berge · Waelder · Industrie-Urban · Kuat Drive Yards (Orbit)",
    species_population:
      "Spezies: Mensch (Kuati-Adel) · Bevoelkerung: ca. 7 Milliarden",
    orbit_image: fp("Kuat.jpg"),
  },
  Fondor: {
    climate: "Temperiert",
    terrain: "Industrie-Komplexe · Werften im Orbit · Felsige Oberflaeche",
    species_population:
      "Spezies: Mensch · Bevoelkerung: ca. 5 Milliarden",
    orbit_image: fp("Fondor.jpg"),
  },
  Anaxes: {
    climate: "Temperiert",
    terrain:
      "Gebirgsketten · Marineakademie-Komplexe · Verteidigungsfestungen · Heeresparaden-Plaetze",
    species_population:
      "Spezies: Mensch · Bevoelkerung: ca. 3 Milliarden",
    orbit_image: fp("Anaxes.jpg"),
  },
  Corellia: {
    orbit_image: fp("Corellia.jpg"),
  },
  Dac: {
    climate: "Aquatisch · Temperiert",
    terrain: "Ozeane · Korallenstaedte · Unterwasserstaedte",
    species_population:
      "Spezies: Mon Calamari · Quarren · Bevoelkerung: ca. 27 Milliarden",
    orbit_image: fp("Mon Cala.jpg"),
  },
  Ryloth: {
    climate:
      "Tidal-locked · Tagseite heiss · Nachtseite eisig · Twilight Zone bewohnbar",
    terrain:
      "Wuesten · Hoehlensysteme · Berge · Schluchten · Lessu-Hauptstadt",
    species_population: "Spezies: Twi'lek · Bevoelkerung: ca. 1,5 Milliarden",
    orbit_image: fp("Ryloth.jpg"),
  },
  Christophsis: {
    climate: "Temperiert · Trocken",
    terrain: "Kristalline Tuerme aus blauem Kristall · Felsformationen · Grossstaedte",
    species_population: "Spezies: Mensch · Bevoelkerung: ca. 700 Millionen",
    orbit_image: fp("Christophsis.jpg"),
  },
  "Ord Mantell": {
    climate: "Temperiert",
    terrain: "Insel-Kontinente · Ozeane · Schrottplaetze · Worlport-Slums",
    species_population: "Spezies: Mensch · Bevoelkerung: ca. 2 Milliarden",
    orbit_image: fp("Ord Mantell.jpg"),
  },
  Eriadu: {
    climate: "Industriell belastet · Dunstig",
    terrain: "Industrie-Ebenen · Toxische Suempfe · Megacities",
    species_population: "Spezies: Mensch · Bevoelkerung: ca. 22 Milliarden",
    orbit_image: fp("Eriadu.jpg"),
  },
  Bothawui: {
    climate: "Temperiert",
    terrain: "Waelder · Berge · Hochebenen · Drev'starn-Hauptstadt",
    species_population: "Spezies: Bothan · Bevoelkerung: ca. 4 Milliarden",
    orbit_image: fp("Bothawui.jpg"),
  },
  Carida: {
    climate: "Vielfaeltig - Wueste, Eis, Tropen (fuer Trainingszwecke)",
    terrain: "Geographisch divers · Akademie-Komplexe · Trainingsgelaende",
    orbit_image: fp("Carida.jpg"),
  },
  Bogden: {
    climate: "Variabel · Mond-System mit 13 Monden",
    terrain: "Felsige Mond-Oberflaechen · Hoehlensysteme · Heilige Staetten",
    species_population:
      "Spezies: Bog-wing (einheimisch) · Jedi-Pilger · Kleine Mensch-Population",
    orbit_image: fp("Bogden.jpg"),
  },
  Sullust: {
    climate: "Vulkanisch · Toxische Aussenatmosphaere",
    terrain:
      "Vulkane · Lavafelder · Untergrundstadt Pirin · Kavernensysteme",
    species_population: "Spezies: Sullustan · Bevoelkerung: ca. 18 Milliarden",
    orbit_image: fp("Sullust.jpg"),
  },
  Pantora: {
    climate: "Eisig",
    terrain: "Eisplaneten-Mond · Polare Tundra · Eisstaedte",
    species_population: "Spezies: Pantoraner · Bevoelkerung: ca. 5 Milliarden",
    orbit_image: fp("Pantora.jpg"),
  },
  Belsavis: {
    climate: "Eisig mit geothermalen Rissen",
    terrain:
      "Eisflaechen · Geothermale Spalten · Tropische Schluchten · Gefaengnisanlagen · Rakata-Ruinen",
    species_population:
      "Spezies: Mensch (Wachen) · Haeftlinge diverser Spezies · Esh-kha (alt)",
    orbit_image: fp("Belsavis.jpg"),
  },

  // ===== SEPARATISTEN / KUS =====
  Raxus: {
    climate: "Temperiert",
    terrain: "Plateau-Staedte · Industrie · Konfoederations-Senatsgebaeude",
    species_population: "Spezies: Mensch · Bevoelkerung: ca. 4 Milliarden",
    orbit_image: fp("Raxus Secundus.jpg"),
  },
  Serenno: {
    climate: "Temperiert",
    terrain: "Berge · Waelder · Adelssitze · Schluchten · Haus Serenno",
    species_population:
      "Spezies: Mensch (Serenno-Adelshaeuser) · Bevoelkerung: ca. 4,5 Milliarden",
    orbit_image: fp("Serenno.jpg"),
  },
  Geonosis: {
    orbit_image: fp("Geonosis.jpg"),
  },
  Muunilinst: {
    climate: "Temperiert",
    terrain: "Gebirge · Bankenmetropolen · Geldminen",
    species_population: "Spezies: Muun · Bevoelkerung: ca. 8 Milliarden",
    orbit_image: fp("Muunilinst.jpg"),
  },
  "Cato Neimoidia": {
    climate: "Wolkig · Saurig",
    terrain:
      "Schluchten · Bruekenstaedte ueber Saureseen · Trade-Federation-Hochburg",
    species_population:
      "Spezies: Neimoidianer · Bevoelkerung: ca. 2 Milliarden",
    orbit_image: fp("Cato Neimoidia.jpg"),
  },
  Skako: {
    climate: "Stuermisch · Hochenergie-Atmosphaere",
    terrain: "Wolkenstaedte · Hochebenen · Plasma-Stuerme",
    species_population: "Spezies: Skakoaner · Bevoelkerung: ca. 3 Milliarden",
    orbit_image: fp("Skako.jpg"),
  },
  Kalee: {
    climate: "Heiss und feucht",
    terrain: "Dichte Dschungel · Suempfe · Sumpfsavannen",
    species_population:
      "Spezies: Kaleesh · Bevoelkerung: ca. 2,5 Milliarden",
    orbit_image: fp("Kalee.jpg"),
  },
  Vjun: {
    climate: "Saurer Regen · Bewoelkt",
    terrain: "Felsige Hochebenen · Bast Castle · Saureseen",
    species_population:
      "Spezies: Mensch (wenige Bewohner) · Dookus persoenlicher Stab",
    orbit_image: fp("Vjun.jpg"),
  },
  Hypori: {
    climate: "Heiss und trocken",
    terrain: "Wueste · Schiffsfriedhoefe · Droidenfabrik-Ruinen",
    species_population:
      "Spezies: Keine indigenen · Sep-Personal · Geonosianer-Vorarbeiter",
    orbit_image: fp("Hypori.jpg"),
  },
  "Boz Pity": {
    climate: "Duester, kuehl",
    terrain: "Friedhoefe und Statuen · Plateaus · Tempel-Ruinen",
    species_population:
      "Spezies: Aubacca (ausgestorben) · Sep-Garnison",
    orbit_image: fp("Boz Pity.jpg"),
  },
  Mygeeto: {
    climate: "Eisig",
    terrain:
      "Kristall-Eis-Stadt · Gletscher · Bankenanlagen · Kristallminen",
    species_population:
      "Spezies: Lurmen-Kolonisten · Mygeetoaner · Banken-Personal",
    orbit_image: fp("Mygeeto.jpg"),
  },
  Saleucami: {
    climate: "Trocken · Heiss",
    terrain:
      "Wuesten · Suempfe · Vulkanische Hochlagen · Klontruppen-Farmen",
    species_population:
      "Spezies: Mensch (Bauern) · Sep-Sympathisanten",
    orbit_image: fp("Saleucami.jpg"),
  },
  Praesitlyn: {
    climate: "Temperiert",
    terrain: "Weite Ebenen · Comm-Relais-Stationen · Industrie-Komplexe",
    species_population: "Spezies: Mensch · Bevoelkerung: ca. 800 Millionen",
    orbit_image: fp("Praesitlyn.jpg"),
  },
  Jabiim: {
    climate: "Konstanter Sturm und Regen",
    terrain: "Schlamm-Ebenen · Bergketten · Mineralminen",
    species_population:
      "Spezies: Jabiimi (Mensch) · Bevoelkerung: ca. 800 Millionen",
    orbit_image: fp("Jabiim.jpg"),
  },
  Umbara: {
    climate: "Permanent finster · Sonnenlos",
    terrain:
      "Schattenwaelder · Biolumineszente Pflanzen · Tiefe Schluchten",
    species_population: "Spezies: Umbaraner · Bevoelkerung: ca. 4 Milliarden",
    orbit_image: fp("Umbara.jpg"),
  },
  "Polis Massa": {
    climate: "Vakuum (Asteroidenfeld) · Druck-Domes",
    terrain:
      "Asteroidenguertel-Reste · Ausgrabungsstaetten · Forschungs-Bunker",
    species_population:
      "Spezies: Polis-Massaner (Kolonisten) · Wissenschaftler",
    orbit_image: fp("Polis Massa.jpg"),
  },
  Florrum: {
    climate: "Heiss · Vulkanisch · Saeuredaempfe",
    terrain: "Saureseen · Vulkane · Piraten-Outposts",
    species_population:
      "Spezies: Weequay (Hondos Crew) · Diverse Schmuggler",
    orbit_image: fp("Florrum.jpg"),
  },
  Atzerri: {
    climate: "Tropisch",
    terrain: "Inseln · Maerkte · Handelsplattformen · Free-Trade-Zonen",
    species_population:
      "Spezies: Mensch · Diverse Schmuggler-Spezies · Bevoelkerung: ca. 2 Milliarden",
    orbit_image: fp("Atzerri.jpg"),
  },
  Falleen: {
    climate: "Tropisch · Feucht",
    terrain: "Dschungel · Adelspalaeste · Kuestenstaedte",
    species_population: "Spezies: Falleen · Bevoelkerung: ca. 4 Milliarden",
    orbit_image: fp("Falleen.jpg"),
  },
  Toydaria: {
    climate: "Heiss und feucht",
    terrain: "Suempfe · Schwimmende Staedte · Schlamm-Lagunen",
    species_population:
      "Spezies: Toydarianer · Bevoelkerung: ca. 5 Milliarden",
    orbit_image: fp("Toydaria.jpg"),
  },
  Devaron: {
    climate: "Temperiert · Trocken in Sued-Hemisphaere",
    terrain: "Wueste · Berge · Waelder im Norden · Religioese Tempel",
    species_population:
      "Spezies: Devaronier (Devaranier maennl. / Devaronier weibl.) · Bevoelkerung: ca. 3 Milliarden",
    orbit_image: fp("Devaron.jpg"),
  },
  "Yag'Dhul": {
    climate: "Hochkomplex · Tidale Extreme durch drei Monde",
    terrain:
      "Hoehlensysteme · Bergruecken · Mathematisch perfekte Stadtarchitektur",
    species_population: "Spezies: Givin · Bevoelkerung: ca. 350 Millionen",
    orbit_image: fp("Yag'Dhul.jpg"),
  },
  Subterrel: {
    climate: "Vulkanisch · Dunkel",
    terrain: "Untergrundbergwerke · Lavaspalten · Tibanna-Foerderkomplexe",
    species_population:
      "Spezies: Mensch · Bergleute · ca. 200 Millionen",
    orbit_image: fp("Subterrel.jpg"),
  },
  Dorin: {
    climate: "Toxisch fuer Nicht-Kel-Dor (Helium-Atmosphaere)",
    terrain: "Wolkenstaedte · Helium-Stuerme · Hochgebirge",
    species_population: "Spezies: Kel Dor · Bevoelkerung: ca. 1,2 Milliarden",
    orbit_image: fp("Dorin.jpg"),
  },
  Ossus: {
    climate: "Temperiert (post-disaster)",
    terrain:
      "Verkohlte Waelder · Bibliotheks-Ruinen · Jedi-Tempel-Reste · Felsschluchten",
    species_population:
      "Spezies: Ysanna (Nachfahren der alten Jedi) · Sep-Garnison",
    orbit_image: fp("Ossus.jpg"),
  },
  Aleen: {
    climate: "Temperiert",
    terrain:
      "Huegel · Hoehlen · Unterirdische Welt der Kindalo · Aleen-Capitol",
    species_population:
      "Spezies: Aleena · Kindalo (unterirdisch) · Bevoelkerung: ca. 500 Millionen",
    orbit_image: fp("Aleen.jpg"),
  },
  Maridun: {
    climate: "Tropisch · Feucht",
    terrain: "Savannen · Waelder · Geysir-Felder",
    species_population:
      "Spezies: Lurmen (Kolonisten) · Amani · Mastiff Phalone (Raubtiere)",
    orbit_image: fp("Maridun.jpg"),
  },
};

// Apply
const profiles = data.profiles;
let touched = 0;
let skipped = 0;
const missing = [];
for (const [name, fields] of Object.entries(updates)) {
  const profile = profiles[name];
  if (!profile) {
    missing.push(name);
    continue;
  }
  let changed = false;
  for (const [key, value] of Object.entries(fields)) {
    if (key === "orbit_image") {
      profile.orbit_image = value;
      profile.orbit_image_alt = `${name} aus dem Orbit`;
      changed = true;
      continue;
    }
    const current = (profile[key] || "").trim();
    if (!current) {
      profile[key] = value;
      changed = true;
    }
  }
  if (changed) touched += 1;
  else skipped += 1;
}

if (missing.length) {
  console.log("Nicht im Profil-Index:", missing.join(", "));
}
console.log(`Aktualisiert: ${touched}, unveraendert: ${skipped}`);

fs.writeFileSync(profilesPath, JSON.stringify(data, null, 2), "utf8");
console.log("planet_profiles.json gespeichert.");
