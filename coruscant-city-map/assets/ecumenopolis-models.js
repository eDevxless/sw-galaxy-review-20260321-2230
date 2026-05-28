(function () {
  "use strict";

  const MAP_SIZE = 5000;
  const CENTER = MAP_SIZE / 2;
  const TAU = Math.PI * 2;
  const MODEL_ID_START = 200000;

  const PROFILE_PRESETS = {
    core: {
      label: "Kernwelt-Megacity",
      ringCount: 10,
      radialCount: 28,
      innerRadius: 230,
      outerRadius: 2380,
      lotArc: 28,
      lotRadial: 28,
      skipChance: 0.018,
      streetJitter: 0.035,
      districtWave: 5,
      heightBase: 34,
      heightRange: 86,
      heightScale: 1.12,
      landmarkHeight: 185,
      chordCount: 18,
      plazaCount: 8,
    },
    trade: {
      label: "Hyperraum-Handelsmegacity",
      ringCount: 10,
      radialCount: 26,
      innerRadius: 280,
      outerRadius: 2370,
      lotArc: 30,
      lotRadial: 30,
      skipChance: 0.024,
      streetJitter: 0.06,
      districtWave: 7,
      heightBase: 30,
      heightRange: 78,
      heightScale: 1.04,
      landmarkHeight: 165,
      chordCount: 24,
      plazaCount: 10,
    },
    underworld: {
      label: "Vertikale Unterwelt-Megacity",
      ringCount: 11,
      radialCount: 30,
      innerRadius: 170,
      outerRadius: 2420,
      lotArc: 24,
      lotRadial: 25,
      skipChance: 0.009,
      streetJitter: 0.09,
      districtWave: 9,
      heightBase: 44,
      heightRange: 122,
      heightScale: 1.34,
      landmarkHeight: 230,
      chordCount: 28,
      plazaCount: 5,
    },
    industrial: {
      label: "Industrie- und Werftmegacity",
      ringCount: 9,
      radialCount: 24,
      innerRadius: 310,
      outerRadius: 2360,
      lotArc: 42,
      lotRadial: 44,
      skipChance: 0.016,
      streetJitter: 0.055,
      districtWave: 4,
      heightBase: 26,
      heightRange: 68,
      heightScale: 1.0,
      landmarkHeight: 150,
      chordCount: 30,
      plazaCount: 7,
    },
    military: {
      label: "Militaerische Festungswelt",
      ringCount: 10,
      radialCount: 28,
      innerRadius: 260,
      outerRadius: 2340,
      lotArc: 32,
      lotRadial: 32,
      skipChance: 0.02,
      streetJitter: 0.025,
      districtWave: 6,
      heightBase: 28,
      heightRange: 72,
      heightScale: 1.06,
      landmarkHeight: 175,
      chordCount: 20,
      plazaCount: 12,
    },
    ancient: {
      label: "Alte Schichtenstadt",
      ringCount: 10,
      radialCount: 24,
      innerRadius: 300,
      outerRadius: 2360,
      lotArc: 34,
      lotRadial: 36,
      skipChance: 0.052,
      streetJitter: 0.08,
      districtWave: 8,
      heightBase: 22,
      heightRange: 70,
      heightScale: 0.95,
      landmarkHeight: 145,
      chordCount: 15,
      plazaCount: 14,
    },
    aquatic: {
      label: "Damm- und Kanalmegacity",
      ringCount: 9,
      radialCount: 22,
      innerRadius: 320,
      outerRadius: 2350,
      lotArc: 38,
      lotRadial: 38,
      skipChance: 0.06,
      streetJitter: 0.065,
      districtWave: 6,
      heightBase: 24,
      heightRange: 68,
      heightScale: 0.98,
      landmarkHeight: 150,
      chordCount: 26,
      plazaCount: 15,
    },
    separatist: {
      label: "Techno-Union Druckstadt",
      ringCount: 10,
      radialCount: 26,
      innerRadius: 260,
      outerRadius: 2350,
      lotArc: 32,
      lotRadial: 34,
      skipChance: 0.028,
      streetJitter: 0.045,
      districtWave: 5,
      heightBase: 32,
      heightRange: 86,
      heightScale: 1.14,
      landmarkHeight: 190,
      chordCount: 18,
      plazaCount: 9,
    },
  };

  const PLANET_OVERRIDES = {
    alsakan: {
      profile: "core",
      signature: "axis-rings",
      landmarks: ["Alsakan Axis Forum", "Founding Houses Archive", "Republican Relay Crown", "Old Senate Embassy", "Azure Transit Ring"],
      tuning: { radialCount: 32, ringCount: 11, plazaCount: 12, streetJitter: 0.02 },
    },
    anaxes: {
      profile: "military",
      signature: "defense-grid",
      landmarks: ["Anaxes War College", "Azure Shield Command", "Fleet Doctrine Spire", "Citadel Transit Gate", "Officer Quarter Crown"],
      tuning: { radialCount: 30, chordCount: 16, plazaCount: 15 },
    },
    arramanx: {
      profile: "trade",
      signature: "freight-spines",
      landmarks: ["Arramanx Exchange Spire", "Outer Dock Authority", "Freeport Ledger Hall", "Freight Crown", "Transit Nexus"],
    },
    axxila: {
      profile: "industrial",
      signature: "foundry-strips",
      landmarks: ["Axxila Corporate Stack", "Perlemian Freight Crown", "Foundry Belt Control", "Deep Dock Exchange", "Lower Grid Authority"],
      tuning: { chordCount: 34, lotArc: 38, lotRadial: 42 },
    },
    "cademimu v": {
      profile: "industrial",
      signature: "orbital-yards",
      landmarks: ["Cademimu Shipline Control", "Munitions Ledger Hall", "Orbital Elevator Yard", "Factory Senate", "Canal Freight Crown"],
    },
    cademimu: {
      profile: "industrial",
      signature: "orbital-yards",
      landmarks: ["Cademimu Shipline Control", "Munitions Ledger Hall", "Orbital Elevator Yard", "Factory Senate", "Canal Freight Crown"],
    },
    carratos: {
      profile: "trade",
      signature: "broken-freeport",
      landmarks: ["Carratos Port Authority", "Independent Senate Hall", "Smuggler Customs Stack", "Corellian Exchange", "Upper Habitat Grid"],
      tuning: { streetJitter: 0.085, skipChance: 0.05 },
    },
    coruschal: {
      profile: "core",
      signature: "archive-web",
      landmarks: ["Coruschal Civic Crown", "Midline Senate Annex", "High Archive Spiral", "Orbital Transfer Seat", "Republic Relay Park"],
    },
    denon: {
      profile: "trade",
      signature: "megahub-cross",
      landmarks: ["Denon Zentralspitze", "Denon Orbitaltransfer", "Megahub Zollkrone", "Aurek Frachtforum", "Verwaltungskorridor M-13"],
      tuning: { chordCount: 32, radialCount: 30 },
    },
    dramassia: {
      profile: "core",
      signature: "civic-terraces",
      landmarks: ["Dramassia Civic Crown", "Senatorial Relay Hall", "Deep Archive Plaza", "Executive Transit Ring", "Upper City Forum"],
    },
    "empress teta": {
      profile: "ancient",
      signature: "royal-ruins",
      landmarks: ["Tetan Royal Crown", "Carbonite Guild Hall", "Ancient Trade Spiral", "Imperial Archive", "Koros Transit Gate"],
      tuning: { plazaCount: 18, skipChance: 0.09 },
    },
    "kaiserin teta": {
      profile: "ancient",
      signature: "royal-ruins",
      landmarks: ["Tetan Royal Crown", "Carbonite Guild Hall", "Ancient Trade Spiral", "Imperial Archive", "Koros Transit Gate"],
      tuning: { plazaCount: 18, skipChance: 0.09 },
    },
    erkit: {
      profile: "trade",
      signature: "dryport-sprawl",
      landmarks: ["Erkit Dryport Crown", "Merchant Tower", "Outer Rim Customs", "Habitat Ring Control", "Spice Ledger Hall"],
      tuning: { skipChance: 0.055, streetJitter: 0.075 },
    },
    fondor: {
      profile: "industrial",
      signature: "shipyard-belts",
      landmarks: ["Fondor Shipyard Crown", "Orbital Gantry Control", "Drive Core Exchange", "Worker Habitat Senate", "Dry Dock Command"],
      tuning: { chordCount: 38, lotArc: 44, lotRadial: 48, landmarkHeight: 175 },
    },
    gerrenthum: {
      profile: "core",
      signature: "finance-crown",
      landmarks: ["Gerrenthum Civic Spire", "Coreward Relay Forum", "High Finance Ring", "Transit Court", "Archive Crown"],
    },
    humbarine: {
      profile: "core",
      signature: "republican-crown",
      landmarks: ["Humbarine Senate Crown", "Core Exchange Spiral", "Republic Customs Hall", "Habitat Ministry", "Skyhook Transfer"],
      tuning: { ringCount: 11, radialCount: 30 },
    },
    jutrand: {
      profile: "trade",
      signature: "midrim-hub",
      landmarks: ["Jutrand Hub Crown", "Mid-Rim Ledger", "Transit Mandate Hall", "Dockmaster Spire", "Corporate Ring"],
    },
    otrand: {
      profile: "trade",
      signature: "midrim-hub",
      landmarks: ["Otrand Hub Crown", "Mid-Rim Ledger", "Transit Mandate Hall", "Dockmaster Spire", "Corporate Ring"],
    },
    karideph: {
      profile: "trade",
      signature: "blue-dock-grid",
      landmarks: ["Karideph Megahub Crown", "Hyperlane Customs", "Merchant Senate Annex", "Blue Dock Control", "Cargo Exchange Ring"],
      tuning: { chordCount: 34, plazaCount: 9 },
    },
    kassido: {
      profile: "aquatic",
      signature: "canal-delta",
      landmarks: ["Kassido Tide Authority", "Canal Transit Crown", "Floodgate Exchange", "Harbor Habitat Ring", "Reservoir Senate"],
      tuning: { skipChance: 0.11, chordCount: 34 },
    },
    lianna: {
      profile: "industrial",
      signature: "corporate-yards",
      landmarks: ["Lianna Corporate Crown", "Sienar Systems Forum", "Driveyard Control", "Executive Transit Ring", "Factory Grid Senate"],
      tuning: { radialCount: 26, chordCount: 32 },
    },
    malador: {
      profile: "ancient",
      signature: "reclaimed-scars",
      landmarks: ["Malador Archive Crown", "Old Republic Ruin Forum", "Reclaimed Transit Ring", "Vinebreak Authority", "Lower City Relic Gate"],
      tuning: { skipChance: 0.12, plazaCount: 20 },
    },
    metellos: {
      profile: "underworld",
      signature: "stacked-lower-city",
      landmarks: ["Metellos Stack Crown", "Lower Level Transit", "Corporate Shadow Hall", "Refugee Grid Authority", "Waste Heat Exchange"],
      tuning: { radialCount: 32, ringCount: 12, streetJitter: 0.075 },
    },
    "nar shaddaa": {
      profile: "underworld",
      signature: "hutt-neon-spiral",
      landmarks: ["Hutt-Kartellspitze", "Vertikaler Basar", "Schmugglerschacht S-12", "Glitzerkorridor", "Mondhafen Promenade"],
      tuning: { radialCount: 34, ringCount: 12, heightScale: 1.5, chordCount: 36, skipChance: 0.008 },
    },
    skako: {
      profile: "separatist",
      signature: "pressure-domes",
      landmarks: ["Skako Druckdom-Zentrale", "Techno-Union Forum", "Pressure Rail Crown", "Wat Tambor Archive", "Foundry Dome Exchange"],
      tuning: { plazaCount: 16, streetJitter: 0.025 },
    },
    sump: {
      profile: "aquatic",
      signature: "marsh-docks",
      landmarks: ["Sump Tide Crown", "Marsh Habitat Authority", "Canal Exchange", "Flood Shield Gate", "Dock Ring Senate"],
      tuning: { skipChance: 0.13, chordCount: 36 },
    },
    taris: {
      profile: "ancient",
      signature: "uppercity-ruins",
      landmarks: ["Taris Upper City Crown", "Undercity Access Gate", "Restored Transit Spiral", "Outcast Relief Forum", "Ancient Promenade"],
      tuning: { ringCount: 11, skipChance: 0.1, plazaCount: 18 },
    },
    thisspias: {
      profile: "ancient",
      signature: "serpentine-regency",
      landmarks: ["Thisspias Coil Forum", "Regency Transit Crown", "Temple Archive", "Serpentine Habitat Ring", "Diplomatic Spire"],
      tuning: { streetJitter: 0.095, radialCount: 24 },
    },
  };

  function cleanText(value, fallback) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text || fallback;
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ecumenopolis";
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rngFromSeed(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let next = state;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function polar(radius, angle) {
    return {
      x: CENTER + Math.cos(angle) * radius,
      z: CENTER + Math.sin(angle) * radius,
    };
  }

  function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      area += point.x * next.z - next.x * point.z;
    }
    return Math.abs(area / 2);
  }

  function pointDistanceSq(point, x, z) {
    const dx = point.position.x - x;
    const dz = point.position.z - z;
    return dx * dx + dz * dz;
  }

  function parsePopulation(value) {
    const text = String(value || "").toLowerCase();
    if (!text) return 75000000000;
    const numberMatches = text.match(/\d+(?:[.,]\d+)?/g) || [];
    const values = numberMatches.map((entry) => Number(entry.replace(",", "."))).filter(Number.isFinite);
    const base = values.length ? values.reduce((sum, entry) => sum + entry, 0) / values.length : 75;
    let multiplier = 1;
    if (/billionen|trillion/.test(text)) multiplier = 1000000000000;
    else if (/milliarden|billion/.test(text)) multiplier = 1000000000;
    else if (/millionen|million/.test(text)) multiplier = 1000000;
    else if (/tausend|thousand/.test(text)) multiplier = 1000;
    return Math.max(1, Math.round(base * multiplier));
  }

  function inferProfile(name, params) {
    const text = [
      name,
      params.get("profile"),
      params.get("region"),
      params.get("terrain"),
      params.get("climate"),
      params.get("faction"),
      params.get("species"),
      params.get("desc"),
    ].filter(Boolean).join(" ").toLowerCase();

    if (/nar shaddaa|hutt|smuggl|schmuggl|crime|unterwelt|kartell|pirate|black sun/.test(text)) return "underworld";
    if (/anaxes|military|militaer|fleet|flotte|war|krieg|citadel|fortress/.test(text)) return "military";
    if (/fondor|lianna|skako|cademimu|axxila|industrial|industrie|shipyard|werft|factory|fabrik|techno/.test(text)) return "industrial";
    if (/taris|malador|empress teta|kaiserin teta|ancient|ruin|old republic|relic/.test(text)) return "ancient";
    if (/kassido|sump|ocean|meer|wasser|aquat|sumpf|marsh|kanal|canal/.test(text)) return "aquatic";
    if (/denon|karideph|trade|handel|hyperraum|megahub|fracht|freight|dock|port/.test(text)) return "trade";
    if (/separatist|techno-union|bankenklan|handelsfoederation/.test(text)) return "separatist";
    return "core";
  }

  function buildSpec() {
    const params = new URLSearchParams(window.location.search);
    const name = cleanText(params.get("name") || params.get("planet"), "Ecumenopolis");
    const key = normalize(name);
    const override = PLANET_OVERRIDES[key] || {};
    const requestedProfile = normalize(params.get("profile"));
    const profileKey = override.profile || (PROFILE_PRESETS[requestedProfile] ? requestedProfile : inferProfile(name, params));
    const preset = PROFILE_PRESETS[profileKey] || PROFILE_PRESETS.core;
    const tuning = override.tuning || {};
    const seedSource = [
      params.get("seed"),
      name,
      params.get("grid"),
      params.get("region"),
      params.get("terrain"),
      params.get("climate"),
      profileKey,
    ].filter(Boolean).join("|");
    const seed = hashString(seedSource || name);
    const populationText = cleanText(params.get("species") || params.get("population"), "");
    const population = parsePopulation(populationText);
    const populationBoost = clamp((Math.log10(population) - 8) / 7, 0, 1);

    return {
      name,
      key,
      slug: slugify(name),
      grid: cleanText(params.get("grid"), ""),
      region: cleanText(params.get("region"), ""),
      terrain: cleanText(params.get("terrain"), ""),
      climate: cleanText(params.get("climate"), ""),
      faction: cleanText(params.get("faction"), ""),
      populationText,
      population,
      seed,
      profileKey,
      signature: override.signature || profileKey,
      profile: {
        ...preset,
        ...tuning,
        heightScale: (tuning.heightScale || preset.heightScale) * (0.94 + populationBoost * 0.22),
        skipChance: clamp((tuning.skipChance ?? preset.skipChance) - populationBoost * 0.018, 0.006, 0.16),
      },
      landmarks: override.landmarks || defaultLandmarks(name, profileKey),
    };
  }

  function defaultLandmarks(name, profileKey) {
    const generic = {
      core: ["Civic Crown", "Senate Relay", "Archive Spiral", "Orbital Transfer", "Executive Transit Ring"],
      trade: ["Megahub Crown", "Customs Exchange", "Freight Ring", "Merchant Forum", "Orbital Dock Authority"],
      underworld: ["Shadow Crown", "Vertical Bazaar", "Syndicate Forum", "Lower Dock Gate", "Neon Transit Stack"],
      industrial: ["Shipyard Crown", "Foundry Control", "Drive Core Exchange", "Worker Habitat Ring", "Orbital Gantry"],
      military: ["Command Citadel", "Fleet Academy", "Shield Control", "Garrison Ring", "Doctrine Archive"],
      ancient: ["Old City Crown", "Relic Archive", "Reclaimed Transit Ring", "Upper Ruin Forum", "Ancient Promenade"],
      aquatic: ["Tide Crown", "Canal Authority", "Harbor Exchange", "Floodgate Control", "Reservoir Senate"],
      separatist: ["Droidworks Crown", "Techno-Union Forum", "Pressure Dome Control", "Assembly Ring", "Foundry Exchange"],
    };
    return (generic[profileKey] || generic.core).map((entry) => `${name} ${entry}`);
  }

  function makeRadii(profile, random) {
    const radii = [profile.innerRadius];
    const usable = profile.outerRadius - profile.innerRadius;
    for (let index = 1; index <= profile.ringCount; index += 1) {
      const t = index / profile.ringCount;
      const eased = Math.pow(t, 0.94);
      const jitter = (random() - 0.5) * 34 * (1 - Math.abs(0.5 - t));
      radii.push(clamp(profile.innerRadius + usable * eased + jitter, profile.innerRadius + 24, profile.outerRadius));
    }
    radii[radii.length - 1] = profile.outerRadius;
    return radii.sort((a, b) => a - b);
  }

  function makeAngles(profile, random) {
    const angles = [];
    const offset = random() * TAU;
    for (let index = 0; index < profile.radialCount; index += 1) {
      const base = offset + (index / profile.radialCount) * TAU;
      const jitter = (random() - 0.5) * profile.streetJitter;
      angles.push(base + jitter);
    }
    return angles.sort((a, b) => a - b);
  }

  function arcPoints(radius, startAngle, endAngle, steps) {
    const points = [];
    for (let index = 0; index <= steps; index += 1) {
      points.push(polar(radius, lerp(startAngle, endAngle, index / steps)));
    }
    return points;
  }

  function addStreet(streets, type, points) {
    if (points.length < 2) return;
    streets.push({
      id: streets.length + 1,
      type,
      points: points.map((point) => ({ x: round(point.x), z: round(point.z) })),
    });
  }

  function buildStreetPlan(spec, radii, angles, random) {
    const streets = [];
    const profile = spec.profile;

    for (let index = 0; index < radii.length; index += 1) {
      const radius = radii[index];
      const type = index % 5 === 0 ? "main" : index % 2 === 0 ? "major" : "minor";
      const segmentCount = spec.profileKey === "underworld" ? 3 : spec.profileKey === "aquatic" ? 4 : 1;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const gap = segmentCount === 1 ? 0 : 0.09 + random() * 0.05;
        const start = (segment / segmentCount) * TAU + gap;
        const end = ((segment + 1) / segmentCount) * TAU - gap;
        addStreet(streets, type, arcPoints(radius, start, end, Math.max(40, Math.round(radius / 34))));
      }
    }

    angles.forEach((angle, index) => {
      const type = index % 7 === 0 ? "main" : index % 3 === 0 ? "major" : "minor";
      const bend = (random() - 0.5) * profile.streetJitter * 2.4;
      const points = [
        polar(profile.innerRadius * 0.45, angle + bend * 0.2),
        polar(profile.outerRadius * 0.42, angle + bend),
        polar(profile.outerRadius + 180, angle - bend * 0.6),
      ];
      addStreet(streets, type, points);
    });

    for (let index = 0; index < profile.chordCount; index += 1) {
      const angle = random() * TAU;
      const offset = (random() - 0.5) * 900;
      const normal = angle + Math.PI / 2;
      const center = { x: CENTER + Math.cos(normal) * offset, z: CENTER + Math.sin(normal) * offset };
      const span = 2350 + random() * 350;
      const wave = (random() - 0.5) * 260;
      const points = [
        { x: center.x - Math.cos(angle) * span, z: center.z - Math.sin(angle) * span },
        { x: center.x + Math.cos(normal) * wave, z: center.z + Math.sin(normal) * wave },
        { x: center.x + Math.cos(angle) * span, z: center.z + Math.sin(angle) * span },
      ];
      addStreet(streets, index % 4 === 0 ? "main" : "major", points);
    }

    return streets;
  }

  function makeVoidZones(spec, random) {
    const zones = [];
    const profile = spec.profile;
    for (let index = 0; index < profile.plazaCount; index += 1) {
      const angle = random() * TAU;
      const radius = lerp(profile.innerRadius + 140, profile.outerRadius - 260, random());
      const point = polar(radius, angle);
      const size = lerp(120, spec.profileKey === "industrial" ? 300 : 220, random());
      zones.push({
        x: point.x,
        z: point.z,
        radius: size,
        skip: spec.profileKey === "underworld" ? 0.35 : 0.68,
      });
    }
    if (spec.profileKey === "aquatic") {
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * TAU + random() * 0.25;
        const point = polar(lerp(700, 1900, random()), angle);
        zones.push({ x: point.x, z: point.z, radius: 260 + random() * 260, skip: 0.88 });
      }
    }
    if (spec.profileKey === "ancient") {
      for (let index = 0; index < 5; index += 1) {
        const point = polar(lerp(950, 2250, random()), random() * TAU);
        zones.push({ x: point.x, z: point.z, radius: 180 + random() * 280, skip: 0.76 });
      }
    }
    return zones;
  }

  function shouldSkipLot(x, z, zones, random, baseChance) {
    if (random() < baseChance) return true;
    for (const zone of zones) {
      const dx = x - zone.x;
      const dz = z - zone.z;
      if (dx * dx + dz * dz < zone.radius * zone.radius && random() < zone.skip) return true;
    }
    return false;
  }

  function makeBuilding(spec, id, blockId, ring, center, random, radialIndex, sectorIndex) {
    const profile = spec.profile;
    const distance = Math.hypot(center.x - CENTER, center.z - CENTER) / profile.outerRadius;
    const density = 1 - clamp(distance, 0, 1);
    const district = (Math.sin(sectorIndex * profile.districtWave + spec.seed * 0.0001) + 1) / 2;
    const landmarkPulse = Math.max(0, 1 - Math.abs(distance - 0.34) * 3.2);
    const height = (
      profile.heightBase +
      random() * profile.heightRange +
      density * 72 +
      district * 44 +
      landmarkPulse * 34 +
      (radialIndex % 5 === 0 ? 22 : 0)
    ) * profile.heightScale;
    const area = polygonArea(ring);
    const xs = ring.map((point) => point.x);
    const zs = ring.map((point) => point.z);
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...zs) - Math.min(...zs);
    return {
      id,
      blockId,
      position: { x: round(center.x), y: 0, z: round(center.z) },
      dimensions: {
        width: round(width),
        depth: round(depth),
        height: round(height),
        footprintArea: round(area),
      },
      ring: ring.map((point) => ({ x: round(point.x), z: round(point.z) })),
      height: round(height),
    };
  }

  function buildBuildings(spec, radii, angles, random) {
    const profile = spec.profile;
    const buildings = [];
    const zones = makeVoidZones(spec, random);
    const idBase = MODEL_ID_START + (spec.seed % 700000);
    let nextId = idBase;
    let blockId = 0;

    for (let ringIndex = 0; ringIndex < radii.length - 1; ringIndex += 1) {
      const inner = radii[ringIndex] + 10;
      const outer = radii[ringIndex + 1] - 10;
      if (outer - inner < 26) continue;
      const radialCells = clamp(Math.round((outer - inner) / profile.lotRadial), 2, spec.profileKey === "industrial" ? 8 : 12);

      for (let sectorIndex = 0; sectorIndex < angles.length; sectorIndex += 1) {
        const startAngle = angles[sectorIndex];
        let endAngle = angles[(sectorIndex + 1) % angles.length];
        if (endAngle <= startAngle) endAngle += TAU;
        const midRadius = (inner + outer) / 2;
        const angularCells = clamp(Math.round((midRadius * (endAngle - startAngle)) / profile.lotArc), 2, spec.profileKey === "industrial" ? 12 : 18);

        for (let radialIndex = 0; radialIndex < radialCells; radialIndex += 1) {
          const r0 = lerp(inner, outer, radialIndex / radialCells) + 4;
          const r1 = lerp(inner, outer, (radialIndex + 1) / radialCells) - 4;
          for (let angularIndex = 0; angularIndex < angularCells; angularIndex += 1) {
            const a0 = lerp(startAngle, endAngle, angularIndex / angularCells) + 0.006;
            const a1 = lerp(startAngle, endAngle, (angularIndex + 1) / angularCells) - 0.006;
            if (a1 <= a0 || r1 <= r0) continue;
            const centerRadius = (r0 + r1) / 2;
            const centerAngle = (a0 + a1) / 2;
            const center = polar(centerRadius, centerAngle);
            if (shouldSkipLot(center.x, center.z, zones, random, profile.skipChance)) continue;
            const inset = spec.profileKey === "industrial" ? 2 + random() * 2 : 1.5 + random() * 2.5;
            const ring = [
              polar(r0 + inset, a0 + 0.004),
              polar(r0 + inset, a1 - 0.004),
              polar(r1 - inset, a1 - 0.004),
              polar(r1 - inset, a0 + 0.004),
            ];
            const building = makeBuilding(spec, nextId, blockId, ring, center, random, radialIndex, sectorIndex);
            buildings.push(building);
            nextId += 1;
          }
        }
        blockId += 1;
      }
    }

    return buildings;
  }

  function createLandmarkTargets(spec) {
    const targets = [];
    const count = Math.max(5, spec.landmarks.length);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * TAU + ((spec.seed % 360) / 360) * TAU + (index % 2 ? 0.18 : -0.08);
      const radius = index === 0 ? 320 : lerp(620, 1880, ((index * 37 + spec.seed) % 100) / 100);
      targets.push({
        name: spec.landmarks[index % spec.landmarks.length],
        kind: index % 3 === 0 ? "Staatlich" : index % 3 === 1 ? "Privatwirtschaftlich" : "Privat",
        ...polar(radius, angle),
      });
    }
    return targets;
  }

  function createAdminData(spec, buildings) {
    const adminData = {};
    const used = new Set();
    const targets = createLandmarkTargets(spec);
    for (const target of targets) {
      let best = null;
      let bestDistance = Infinity;
      for (const building of buildings) {
        if (used.has(building.id)) continue;
        const distance = pointDistanceSq(building, target.x, target.z);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = building;
        }
      }
      if (!best) continue;
      used.add(best.id);
      best.height = Math.max(best.height, spec.profile.landmarkHeight);
      best.dimensions.height = best.height;
      adminData[String(best.id)] = {
        name: target.name,
        kind: target.kind,
        description: landmarkDescription(spec, target.name),
        imageDataUrl: "",
      };
    }
    return adminData;
  }

  function landmarkDescription(spec, name) {
    const facts = [
      spec.region ? `Region: ${spec.region}` : "",
      spec.grid ? `Grid: ${spec.grid}` : "",
      spec.terrain ? `Terrain: ${spec.terrain}` : "",
      spec.populationText ? spec.populationText : "",
    ].filter(Boolean).join(" | ");
    const suffix = facts ? ` ${facts}` : "";
    return `${name} ist ein planetenspezifischer Knoten innerhalb der ${spec.profile.label} von ${spec.name}.${suffix}`;
  }

  function stableUnit(value) {
    return hashString(value) / 4294967295;
  }

  function transformPointFactory(spec) {
    const profile = spec.profile;
    const signature = spec.signature || spec.profileKey;
    const rotation = ((spec.seed % 3600) / 3600) * TAU;
    const industrialStretch = /yard|strip|foundry|ship/i.test(signature) ? 0.18 : 0;
    const aquaticStretch = /canal|marsh|dock/i.test(signature) ? 0.12 : 0;
    const stretchX = 0.9 + stableUnit(`${spec.seed}:stretch-x`) * 0.18 + industrialStretch;
    const stretchZ = 0.9 + stableUnit(`${spec.seed}:stretch-z`) * 0.18 - industrialStretch * 0.45 + aquaticStretch;
    const phase = stableUnit(`${spec.seed}:phase`) * TAU;
    const swirl = profile.streetJitter * (
      /spiral|serpentine/i.test(signature) ? 3.2 :
      spec.profileKey === "underworld" ? 2.2 :
      /axis|grid|crown/i.test(signature) ? 0.7 :
      1.35
    );
    const radialScale = /industrial|shipyard|yard|strip/i.test(signature) ? 0.96 : spec.profileKey === "aquatic" ? 0.93 : 1;

    return function transformPoint(point) {
      const sourceX = Number(point.x ?? 0);
      const sourceZ = Number(point.z ?? point.y ?? 0);
      const dx = sourceX - CENTER;
      const dz = sourceZ - CENTER;
      let radius = Math.hypot(dx, dz);
      let angle = Math.atan2(dz, dx) + rotation;
      const districtWave = Math.sin(angle * profile.districtWave + radius / 420 + phase);
      const sectorWave = Math.sin(angle * 3 - radius / 760 + phase * 0.7);
      angle += districtWave * swirl + sectorWave * 0.025;
      radius *= radialScale * (0.965 + districtWave * 0.035 + sectorWave * 0.025);
      let x = Math.cos(angle) * radius * stretchX;
      let z = Math.sin(angle) * radius * stretchZ;
      if (/shipyard|yard|foundry|strip/i.test(signature)) {
        const band = Math.sin((z + CENTER) / 155 + phase) * 84;
        x += band + Math.sin((x + CENTER) / 390 + phase * 0.8) * 42;
        z *= 0.88;
      }
      if (/freight|megahub|dock|dryport|freeport|hub|cross/i.test(signature)) {
        x += Math.sin((z + CENTER) / 255 + phase) * 125;
        z += Math.sin((x + CENTER) / 360 + phase * 1.7) * 72;
      }
      if (/canal|marsh/i.test(signature)) {
        const canal = Math.sin((x + CENTER) / 205 + Math.sin((z + CENTER) / 560 + phase));
        x += canal * 120;
        z += Math.sin((x + z) / 380 + phase) * 90;
      }
      if (/ruin|reclaimed|ancient|royal|uppercity/i.test(signature)) {
        const fracture = Math.sign(Math.sin(angle * 7 + phase)) * Math.pow(Math.abs(Math.sin(radius / 430 + phase)), 1.7);
        x += fracture * 92;
        z -= fracture * 48;
      }
      if (/pressure|dome/i.test(signature)) {
        const lobe = Math.sin(angle * 6 + phase) * 0.16;
        x *= 1 + lobe;
        z *= 1 - lobe * 0.55;
      }
      if (/axis|civic|republican|finance|archive/i.test(signature)) {
        x += Math.sin(angle * 2 + phase) * 36;
        z += Math.cos(angle * 4 + phase) * 28;
      }
      if (/defense|grid|military/i.test(signature) || spec.profileKey === "military") {
        x = Math.round(x / 18) * 18;
        z = Math.round(z / 18) * 18;
      }
      return {
        x: round(clamp(CENTER + x, 0, MAP_SIZE)),
        z: round(clamp(CENTER + z, 0, MAP_SIZE)),
      };
    };
  }

  function transformDropZones(spec) {
    const random = rngFromSeed(spec.seed ^ 0x9e3779b9);
    const zones = makeVoidZones(spec, random).map((zone) => ({
      ...zone,
      skip: spec.profileKey === "aquatic" || spec.profileKey === "ancient" ? Math.max(zone.skip, 0.72) : zone.skip * 0.35,
    }));
    const signature = spec.signature || spec.profileKey;
    if (/shipyard|yard|foundry|strip/i.test(signature)) {
      for (let index = 0; index < 7; index += 1) {
        zones.push({
          kind: "line",
          angle: index % 2 ? 0.03 : Math.PI / 2 + 0.08,
          offset: -1700 + index * 560 + (random() - 0.5) * 120,
          width: 70 + random() * 65,
          skip: 0.64,
        });
      }
    }
    if (/freight|megahub|dock|dryport|freeport|hub|cross/i.test(signature)) {
      for (let index = 0; index < 5; index += 1) {
        zones.push({
          kind: "line",
          angle: -0.72 + index * 0.36 + (random() - 0.5) * 0.12,
          offset: -1150 + index * 570,
          width: 54 + random() * 42,
          skip: 0.45,
        });
      }
    }
    if (/canal|marsh/i.test(signature)) {
      for (let index = 0; index < 9; index += 1) {
        zones.push({
          kind: "wave",
          angle: index * 0.44 + random() * 0.18,
          offset: -1800 + index * 450,
          width: 88 + random() * 78,
          phase: random() * TAU,
          skip: 0.82,
        });
      }
    }
    if (/ruin|reclaimed|ancient|royal|uppercity/i.test(signature)) {
      for (let index = 0; index < 10; index += 1) {
        zones.push({
          kind: "wedge",
          angle: (index / 10) * TAU + random() * 0.16,
          width: 0.08 + random() * 0.08,
          inner: 520 + random() * 720,
          outer: 2450,
          skip: 0.56,
        });
      }
    }
    if (/pressure|dome/i.test(signature)) {
      for (let index = 0; index < 6; index += 1) {
        const point = polar(720 + random() * 1500, (index / 6) * TAU + random() * 0.35);
        zones.push({ x: point.x, z: point.z, radius: 210 + random() * 140, skip: 0.52 });
      }
    }
    return zones;
  }

  function shouldDropTransformedBuilding(spec, building, zones) {
    if (spec.profileKey === "underworld" || spec.profileKey === "military") return false;
    const center = building.position;
    for (const zone of zones) {
      let hit = false;
      if (zone.kind === "line") {
        const x = center.x - CENTER;
        const z = center.z - CENTER;
        const distance = Math.abs(Math.cos(zone.angle) * x + Math.sin(zone.angle) * z - zone.offset);
        hit = distance < zone.width;
      } else if (zone.kind === "wave") {
        const x = center.x - CENTER;
        const z = center.z - CENTER;
        const axis = Math.cos(zone.angle) * x + Math.sin(zone.angle) * z;
        const wave = Math.sin(axis / 310 + zone.phase) * 140;
        const cross = Math.abs(-Math.sin(zone.angle) * x + Math.cos(zone.angle) * z - zone.offset - wave);
        hit = cross < zone.width;
      } else if (zone.kind === "wedge") {
        const dx = center.x - CENTER;
        const dz = center.z - CENTER;
        const radius = Math.hypot(dx, dz);
        const angle = Math.atan2(dz, dx);
        const delta = Math.abs(Math.atan2(Math.sin(angle - zone.angle), Math.cos(angle - zone.angle)));
        hit = radius > zone.inner && radius < zone.outer && delta < zone.width;
      } else {
        const dx = center.x - zone.x;
        const dz = center.z - zone.z;
        hit = dx * dx + dz * dz < zone.radius * zone.radius;
      }
      if (hit) {
        return stableUnit(`${spec.seed}:${building.id}:drop`) < zone.skip;
      }
    }
    return false;
  }

  function signatureHeightMultiplier(spec, center, index) {
    const signature = spec.signature || spec.profileKey;
    const x = center.x - CENTER;
    const z = center.z - CENTER;
    const radius = Math.hypot(x, z) / (MAP_SIZE / 2);
    const angle = Math.atan2(z, x);
    const signal = stableUnit(`${spec.seed}:${index}:height-zone`);
    if (/shipyard|yard|foundry|strip/i.test(signature)) {
      const belt = Math.abs(Math.sin((x + spec.seed % 997) / 290)) < 0.24 || Math.abs(Math.cos((z - spec.seed % 811) / 330)) < 0.18;
      return belt ? 1.38 : 0.82 + signal * 0.18;
    }
    if (/freight|megahub|dock|dryport|freeport|hub|cross/i.test(signature)) {
      const corridor = Math.abs(Math.sin((x * 0.78 + z * 1.16 + spec.seed % 1100) / 360)) < 0.22;
      return corridor || radius < 0.34 ? 1.46 : 0.88 + signal * 0.22;
    }
    if (/neon|underworld|stacked|shadow/i.test(signature)) {
      const neon = Math.abs(Math.sin(angle * 5 + radius * 9 + spec.seed * 0.0003)) < 0.28;
      return neon || signal > 0.68 ? 1.55 : 0.94 + signal * 0.18;
    }
    if (/canal|marsh/i.test(signature)) {
      const harbor = Math.abs(Math.sin((x + z + spec.seed % 700) / 260)) < 0.22;
      return harbor || radius < 0.28 ? 1.32 : 0.74 + signal * 0.2;
    }
    if (/ruin|reclaimed|ancient|royal|uppercity|serpentine/i.test(signature)) {
      const relic = radius < 0.32 || Math.abs(Math.sin(angle * 3 + spec.seed)) < 0.14;
      return relic ? 1.22 : 0.62 + signal * 0.28;
    }
    if (/pressure|dome/i.test(signature)) {
      const dome = Math.abs(Math.sin(angle * 6 + radius * 7)) < 0.24;
      return dome || radius < 0.3 ? 1.48 : 0.82 + signal * 0.18;
    }
    if (/defense|grid|military/i.test(signature)) {
      const bastion = radius < 0.48 || Math.abs(Math.sin(angle * 4)) < 0.2;
      return bastion ? 1.36 : 0.88 + signal * 0.16;
    }
    if (/axis|civic|republican|finance|archive/i.test(signature)) {
      const axis = radius < 0.28 || Math.abs(Math.sin(angle * 8)) < 0.1;
      return axis ? 1.28 : 0.9 + signal * 0.16;
    }
    return 0.92 + signal * 0.18;
  }

  function transformBaseModel(baseModel, spec) {
    if (!baseModel || !Array.isArray(baseModel.buildings) || !baseModel.buildings.length) {
      return createModel(spec);
    }
    const transformPoint = transformPointFactory(spec);
    const idOffset = MODEL_ID_START + (spec.seed % 700000);
    const zones = transformDropZones(spec);
    const heightScale = spec.profile.heightScale * (
      spec.profileKey === "industrial" ? 0.82 :
      spec.profileKey === "underworld" ? 1.18 :
      spec.profileKey === "ancient" ? 0.78 :
      0.96
    );

    const buildings = [];
    baseModel.buildings.forEach((source, index) => {
      const ring = Array.isArray(source.ring) ? source.ring.map(transformPoint) : [];
      if (ring.length < 3) return;
      const center = ring.reduce((sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }), { x: 0, z: 0 });
      center.x /= ring.length;
      center.z /= ring.length;
      const xs = ring.map((point) => point.x);
      const zs = ring.map((point) => point.z);
      const width = Math.max(...xs) - Math.min(...xs);
      const depth = Math.max(...zs) - Math.min(...zs);
      const baseHeight = Number(source.height ?? source.dimensions?.height ?? 1);
      const distance = Math.hypot(center.x - CENTER, center.z - CENTER) / (MAP_SIZE / 2);
      const district = 0.92 + Math.sin(index * 0.017 + spec.seed * 0.00001) * 0.12;
      const signatureMultiplier = signatureHeightMultiplier(spec, center, index);
      const height = Math.max(4, baseHeight * heightScale * district * signatureMultiplier * (1.04 - distance * 0.12));
      const building = {
        id: idOffset + index,
        blockId: Number(source.blockId ?? 0) + (spec.seed % 997),
        position: { x: round(center.x), y: 0, z: round(center.z) },
        dimensions: {
          width: round(width),
          depth: round(depth),
          height: round(height),
          footprintArea: round(polygonArea(ring)),
        },
        ring: ring.map((point) => ({ x: round(point.x), z: round(point.z) })),
        height: round(height),
      };
      if (!shouldDropTransformedBuilding(spec, building, zones)) buildings.push(building);
    });

    const sourceLines = Array.isArray(baseModel.streets) ? baseModel.streets : baseModel.streets?.lines || [];
    const streets = sourceLines.map((line, index) => ({
      id: index + 1,
      type: line.type || line.axis || "minor",
      points: (line.points || []).map(transformPoint),
    })).filter((line) => line.points.length > 1);

    const adminData = createAdminData(spec, buildings);
    return {
      model: {
        metadata: {
          modelId: `ecumenopolis-${spec.slug}`,
          width: MAP_SIZE,
          height: MAP_SIZE,
          planetName: spec.name,
          grid: spec.grid,
          region: spec.region,
          terrain: spec.terrain,
          climate: spec.climate,
          populationText: spec.populationText,
          populationEstimate: spec.population,
          profile: spec.profileKey,
          profileLabel: spec.profile.label,
          signature: spec.signature,
          seed: String(spec.seed),
          buildingCount: buildings.length,
          streetCount: streets.length,
          template: "coruscant-city-map",
        },
        buildings,
        streets: { lines: streets },
      },
      adminData,
    };
  }

  function createModel(spec) {
    const random = rngFromSeed(spec.seed);
    const radii = makeRadii(spec.profile, random);
    const angles = makeAngles(spec.profile, random);
    const streets = buildStreetPlan(spec, radii, angles, random);
    const buildings = buildBuildings(spec, radii, angles, random);
    const adminData = createAdminData(spec, buildings);

    return {
      model: {
        metadata: {
          modelId: `ecumenopolis-${spec.slug}`,
          width: MAP_SIZE,
          height: MAP_SIZE,
          planetName: spec.name,
          grid: spec.grid,
          region: spec.region,
          terrain: spec.terrain,
          climate: spec.climate,
          populationText: spec.populationText,
          populationEstimate: spec.population,
          profile: spec.profileKey,
          profileLabel: spec.profile.label,
          signature: spec.signature,
          seed: String(spec.seed),
          buildingCount: buildings.length,
          streetCount: streets.length,
        },
        buildings,
        streets: { lines: streets },
      },
      adminData,
    };
  }

  function patchFetch(model, adminData, spec) {
    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    let activeModel = model;
    let activeAdminData = adminData;
    let transformedModelPromise = null;

    function getActiveModel() {
      if (!nativeFetch) return Promise.resolve(activeModel);
      if (!transformedModelPromise) {
        transformedModelPromise = nativeFetch("./models/megacity-public.json", { cache: "default" })
          .then((response) => {
            if (!response.ok) throw new Error("Coruscant template model could not be loaded");
            return response.json();
          })
          .then((templateModel) => {
            const transformed = transformBaseModel(templateModel, spec);
            activeModel = transformed.model;
            activeAdminData = transformed.adminData;
            window.__planetCityMap = activeModel;
            window.__planetCityAdminData = activeAdminData;
            window.__coruscantCityMapFileData = {
              publicModel: activeModel,
              adminData: activeAdminData,
            };
            window.dispatchEvent(new CustomEvent("planet-city-map:model-ready", {
              detail: { model: activeModel, adminData: activeAdminData },
            }));
            return activeModel;
          })
          .catch((error) => {
            console.warn(error);
            return activeModel;
          });
      }
      return transformedModelPromise;
    }

    window.fetch = function patchedFetch(input, init) {
      const rawUrl = typeof input === "string" ? input : input && input.url;
      const url = rawUrl ? new URL(rawUrl, window.location.href) : null;
      const path = url ? url.pathname.replace(/\\/g, "/") : "";
      if (/\/models\/megacity-(public|current)\.json$/i.test(path)) {
        return getActiveModel().then((currentModel) => new Response(JSON.stringify(currentModel), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }));
      }
      if (/\/data\/building-admin-data\.json$/i.test(path)) {
        return getActiveModel().then(() => new Response(JSON.stringify(activeAdminData), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }));
      }
      if (!nativeFetch) return Promise.reject(new Error("Fetch is not available"));
      return nativeFetch(input, init);
    };
  }

  const spec = buildSpec();
  const generated = createModel(spec);

  window.__planetCityMapSpec = spec;
  window.__planetCityMap = generated.model;
  window.__planetCityAdminData = generated.adminData;
  window.__coruscantCityMapFileData = {
    publicModel: generated.model,
    adminData: generated.adminData,
  };

  patchFetch(generated.model, generated.adminData, spec);

  document.title = `${spec.name} City Map`;
  window.addEventListener("DOMContentLoaded", () => {
    const cityMap = document.getElementById("cityMap");
    if (cityMap) cityMap.setAttribute("aria-label", `${spec.name} 2D Karte`);
    const search = document.getElementById("buildingSearch");
    if (search) search.setAttribute("placeholder", `${spec.name} Gebaeude suchen`);
  });
})();
