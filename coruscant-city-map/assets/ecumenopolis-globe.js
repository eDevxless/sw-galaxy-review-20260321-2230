(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const PROFILE_COLORS = {
    core: { base: "#283a45", land: "#6f8f8c", light: "#9fd8ff", glow: "#8bd8ff", accent: "#e1c46f" },
    trade: { base: "#172734", land: "#4c7b92", light: "#9fe4ff", glow: "#5bb8ff", accent: "#f5c66a" },
    underworld: { base: "#110d21", land: "#28405e", light: "#42e6d3", glow: "#a752ff", accent: "#ffcc55" },
    industrial: { base: "#1d2428", land: "#5a615f", light: "#ffb35a", glow: "#ff7b36", accent: "#91d5ff" },
    military: { base: "#172536", land: "#506c7d", light: "#b8e6ff", glow: "#4fa6ff", accent: "#ffdd88" },
    ancient: { base: "#1f2d25", land: "#6c8563", light: "#d3c28a", glow: "#7ce0ad", accent: "#e0bc72" },
    aquatic: { base: "#08233b", land: "#1f6a7d", light: "#98f4ff", glow: "#4ed7ff", accent: "#d1fff7" },
    separatist: { base: "#20241f", land: "#67705e", light: "#b6ff95", glow: "#a9f06b", accent: "#f0b66a" },
  };
  const PLANET_SURFACE_THEMES = {
    alsakan: "forest",
    anaxes: "forest",
    arramanx: "urban",
    axxila: "rock",
    "cademimu v": "lava",
    cademimu: "lava",
    carratos: "urban",
    coruschal: "urban",
    coruscant: "urban",
    denon: "ocean",
    dramassia: "urban",
    "empress teta": "reclaimed",
    "kaiserin teta": "reclaimed",
    erkit: "desert",
    fondor: "industrial",
    gerrenthum: "lava",
    humbarine: "ocean",
    jutrand: "desert",
    otrand: "desert",
    karideph: "forest",
    kassido: "ocean",
    lianna: "rock",
    malador: "forest",
    metellos: "swamp",
    "nar shaddaa": "swamp",
    skako: "storm",
    sump: "swamp",
    taris: "forest",
    thisspias: "rock",
  };

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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

  function colorMix(a, b, t) {
    const parse = (value) => {
      const hex = value.replace("#", "");
      return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    };
    const left = parse(a);
    const right = parse(b);
    const next = left.map((channel, index) => Math.round(channel + (right[index] - channel) * t));
    return `rgb(${next[0]}, ${next[1]}, ${next[2]})`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function spec() {
    const current = window.__planetCityMapSpec || {};
    const params = new URLSearchParams(window.location.search);
    const coruscantPage = /\/city-map(?:-editor)?\.html$/i.test(window.location.pathname.replace(/\\/g, "/"));
    const name = current.name || params.get("name") || (coruscantPage ? "Coruscant" : "Ecumenopolis");
    const profileKey = current.profileKey || current.profile || params.get("profile") || "core";
    const signature = current.signature || profileKey;
    const seed = Number(current.seed) || hashString(`${name}|${profileKey}|${signature}`);
    return {
      name,
      profileKey,
      signature,
      seed,
      grid: current.grid || params.get("grid") || (coruscantPage ? "L-9" : ""),
      region: current.region || params.get("region") || (coruscantPage ? "Deep Core" : ""),
      terrain: current.terrain || params.get("terrain") || "",
      climate: current.climate || params.get("climate") || "",
      description: current.description || current.desc || current.lore || params.get("desc") || "",
      populationText: current.populationText || params.get("species") || "",
    };
  }

  function surfacePalette(profileKey) {
    return PROFILE_COLORS[profileKey] || PROFILE_COLORS.core;
  }

  function drawTextureCanvas(planet) {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    const random = rngFromSeed(planet.seed ^ 0xa53f91);
    const colors = surfacePalette(planet.profileKey);
    const signature = normalize(planet.signature);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colorMix(colors.base, "#ffffff", 0.09));
    gradient.addColorStop(0.48, colors.base);
    gradient.addColorStop(1, colorMix(colors.base, "#000000", 0.32));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.62;
    for (let i = 0; i < 220; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const radius = 28 + random() * 170;
      const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
      blob.addColorStop(0, colorMix(colors.land, colors.light, random() * 0.25));
      blob.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (0.7 + random()), radius * (0.25 + random() * 0.58), random() * TAU, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = colorMix(colors.land, colors.glow, 0.35);
    ctx.lineWidth = signature.includes("military") ? 1.7 : 1.1;
    const bandCount = signature.includes("shipyard") || signature.includes("yard") ? 22 : signature.includes("canal") ? 18 : 14;
    for (let i = 0; i < bandCount; i += 1) {
      const y = (canvas.height / bandCount) * i + random() * 26;
      ctx.beginPath();
      for (let x = -30; x <= canvas.width + 30; x += 22) {
        const wobble = Math.sin(x / (80 + random() * 80) + i + planet.seed * 0.0001) * (signature.includes("axis") ? 5 : 22);
        const yy = y + wobble + Math.sin((x + y) / 260) * 14;
        if (x === -30) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    if (signature.includes("shipyard") || signature.includes("yard") || signature.includes("foundry")) {
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 5;
      for (let i = 0; i < 10; i += 1) {
        const x = (i + 0.5) * canvas.width / 10 + (random() - 0.5) * 42;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(i) * 140, canvas.height);
        ctx.stroke();
      }
    }

    if (signature.includes("canal") || signature.includes("marsh")) {
      ctx.globalAlpha = 0.64;
      ctx.strokeStyle = "#86f7ff";
      ctx.lineWidth = 7;
      for (let i = 0; i < 9; i += 1) {
        const y = (i + 0.3) * canvas.height / 9;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 24) {
          const yy = y + Math.sin(x / 130 + i) * 42 + Math.sin(x / 41) * 9;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    }

    if (signature.includes("neon") || signature.includes("underworld") || signature.includes("stacked")) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = colors.glow;
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.01) {
          const angle = t * TAU * 2.2 + i;
          const radius = t * 360;
          const x = canvas.width * 0.5 + Math.cos(angle) * radius * 1.8;
          const y = canvas.height * 0.52 + Math.sin(angle) * radius * 0.85;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 0.82;
    ctx.fillStyle = colors.light;
    const lightCount = signature.includes("underworld") ? 15500 : signature.includes("industrial") ? 11000 : 13000;
    for (let i = 0; i < lightCount; i += 1) {
      const x = random() * canvas.width;
      const latitudeBias = Math.pow(random(), 0.8);
      const y = canvas.height * 0.5 + (latitudeBias - 0.5) * canvas.height * 0.88 + Math.sin(x / 120 + planet.seed) * 18;
      const size = random() > 0.93 ? 1.6 : 0.85;
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = colors.accent;
    for (let i = 0; i < 80; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + random() * 2.8, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    return canvas;
  }

  function modelBounds(model) {
    return {
      width: Number(model?.metadata?.width) || 5000,
      height: Number(model?.metadata?.height) || 5000,
    };
  }

  function cityTextureSize(model) {
    const count = Array.isArray(model?.buildings) ? model.buildings.length : 0;
    const largeViewport = Math.max(window.innerWidth || 0, window.innerHeight || 0) >= 900;
    const maxTexture = Math.min(Number(window.__planetGlobeTextureLimit) || 4096, 8192);
    const candidate = count > 50000 && largeViewport ? { width: 8192, height: 4096 }
      : count > 50000 ? { width: 4096, height: 2048 }
      : count > 20000 && largeViewport ? { width: 4096, height: 2048 }
      : count > 20000 ? { width: 3072, height: 1536 }
      : largeViewport ? { width: 3072, height: 1536 }
      : { width: 2048, height: 1024 };
    if (candidate.width <= maxTexture) return candidate;
    return { width: maxTexture, height: Math.round(maxTexture / 2) };
  }

  function modelStreets(model) {
    if (Array.isArray(model?.streets)) return model.streets;
    return model?.streets?.lines || [];
  }

  function modelCoordinates(point, bounds) {
    return {
      x: clamp(Number(point?.x ?? 0), 0, bounds.width),
      z: clamp(Number(point?.z ?? point?.y ?? 0), 0, bounds.height),
    };
  }

  function coordsToUv(point, bounds) {
    const coords = modelCoordinates(point, bounds);
    return {
      u: coords.x / bounds.width,
      v: 1 - coords.z / bounds.height,
    };
  }

  function uvToCoords(uv, bounds) {
    return {
      x: clamp(Number(uv?.x ?? 0) * bounds.width, 0, bounds.width),
      z: clamp((1 - Number(uv?.y ?? 0)) * bounds.height, 0, bounds.height),
    };
  }

  function surfacePointFromUv(THREE, uv, radius) {
    const phi = uv.u * TAU;
    const theta = (1 - uv.v) * Math.PI;
    return new THREE.Vector3(
      -Math.cos(phi) * Math.sin(theta) * radius,
      Math.cos(theta) * radius,
      Math.sin(phi) * Math.sin(theta) * radius
    );
  }

  function surfacePointFromModel(THREE, point, bounds, radius) {
    return surfacePointFromUv(THREE, coordsToUv(point, bounds), radius);
  }

  function projectedPoint(point, bounds, canvas) {
    const sourceX = Number(point?.x ?? 0);
    const sourceZ = Number(point?.z ?? point?.y ?? 0);
    return {
      x: (sourceX / bounds.width) * canvas.width,
      y: (sourceZ / bounds.height) * canvas.height,
    };
  }

  function streetPathLength(points) {
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const dx = Number(current.x || 0) - Number(previous.x || 0);
      const dz = Number(current.z ?? current.y ?? 0) - Number(previous.z ?? previous.y ?? 0);
      length += Math.hypot(dx, dz);
    }
    return length;
  }

  function planetSurfaceText(planet, model) {
    const metadata = model?.metadata || {};
    return normalize([
      planet.name,
      planet.profileKey,
      planet.signature,
      planet.terrain,
      planet.climate,
      planet.description,
      metadata.terrain,
      metadata.climate,
      metadata.profile,
      metadata.profileLabel,
      metadata.signature,
      metadata.planetName,
    ].filter(Boolean).join(" "));
  }

  function surfaceTheme(planet, model) {
    const key = normalize(planet.name);
    if (PLANET_SURFACE_THEMES[key]) return PLANET_SURFACE_THEMES[key];
    const text = planetSurfaceText(planet, model);
    if (/sumpf|swamp|marsh|bog|feucht|matsch|sludge|unterwelt|hutt|moon|nal hutta/.test(text)) return "swamp";
    if (/ozean|ocean|meer|wasser|aquat|marine|tide|harbor|hafen|dock|canal|kanal|tiefsee/.test(text)) return "ocean";
    if (/wald|waeld|forest|jungle|dschungel|vines|fung|garden|garten|savann/.test(text)) return "forest";
    if (/lava|vulkan|volcan|geysir|asche|heiss|hot|magma/.test(text)) return "lava";
    if (/wuest|desert|steppe|salz|dryport|karawan/.test(text)) return "desert";
    if (/fels|rock|cliff|canyon|mountain|berg|cavern|valley|plateau|hochebene/.test(text)) return "rock";
    if (/storm|sturm|plasma|wolken|cloud|hochwind|wind/.test(text)) return "storm";
    if (/shipyard|werft|industrie|industrial|factory|fabrik|foundry|yard|orbital/.test(text)) return "industrial";
    if (/ruin|ancient|reclaimed|royal|old republic|relic/.test(text)) return "reclaimed";
    if (planet.profileKey === "aquatic") return "ocean";
    if (planet.profileKey === "industrial") return "industrial";
    if (planet.profileKey === "ancient") return "reclaimed";
    return "urban";
  }

  function corridorBounds(canvas, random, index, count, theme) {
    const centerOffset = (index - (count - 1) / 2) * canvas.width * 0.14;
    const baseWidth = theme === "urban" ? 0.13 : theme === "ocean" ? 0.24 : theme === "forest" || theme === "swamp" ? 0.2 : 0.18;
    const width = canvas.width * (baseWidth + random() * 0.055);
    const center = canvas.width * 0.5 + centerOffset + (random() - 0.5) * canvas.width * 0.055;
    const wobble = canvas.width * (theme === "urban" ? 0.018 : 0.042);
    const roughness = canvas.width * (theme === "urban" ? 0.006 : theme === "ocean" ? 0.014 : 0.022);
    const phase = random() * TAU;
    return { center, width, wobble, roughness, phase };
  }

  function corridorCenterAt(corridor, t) {
    return corridor.center +
      Math.sin(t * TAU * 1.15 + corridor.phase) * corridor.wobble +
      Math.sin(t * TAU * 2.45 + corridor.phase * 0.6) * corridor.wobble * 0.34;
  }

  function corridorHalfWidth(corridor, t, inset = 0) {
    const width = Math.max(8, corridor.width - inset * 2);
    const taper = 0.86 + Math.sin(t * Math.PI) * 0.16;
    return width * 0.5 * taper;
  }

  function pointInCorridor(point, corridor, canvas, inset = 0) {
    const t = clamp(point.y / canvas.height, 0, 1);
    const center = corridorCenterAt(corridor, t);
    return Math.abs(point.x - center) <= corridorHalfWidth(corridor, t, inset);
  }

  function traceCorridor(ctx, canvas, corridor, inset = 0) {
    const steps = 76;
    const left = [];
    const right = [];
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const y = t * canvas.height;
      const center = corridorCenterAt(corridor, t);
      const half = corridorHalfWidth(corridor, t, inset);
      const edgeLeft =
        Math.sin(t * TAU * 5.3 + corridor.phase * 1.7) * corridor.roughness +
        Math.sin(t * TAU * 9.1 + corridor.phase * 0.4) * corridor.roughness * 0.42;
      const edgeRight =
        Math.sin(t * TAU * 4.7 + corridor.phase * 1.1 + 1.8) * corridor.roughness +
        Math.sin(t * TAU * 8.4 + corridor.phase * 0.7) * corridor.roughness * 0.4;
      left.push({ x: center - half + edgeLeft, y });
      right.push({ x: center + half + edgeRight, y });
    }
    ctx.beginPath();
    left.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    for (let index = right.length - 1; index >= 0; index -= 1) {
      const point = right[index];
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
  }

  function drawCorridorBase(ctx, canvas, corridor, palette, options = {}) {
    const gradient = ctx.createLinearGradient(corridor.center - corridor.width * 0.55, 0, corridor.center + corridor.width * 0.55, 0);
    gradient.addColorStop(0, palette.edge);
    gradient.addColorStop(0.48, palette.base);
    gradient.addColorStop(1, palette.edge);
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 0.84;
    traceCorridor(ctx, canvas, corridor, options.inset ?? canvas.width * 0.018);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  function canvasLayer(canvas) {
    const layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerCtx = layer.getContext("2d");
    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = "high";
    return { layer, layerCtx };
  }

  function drawOrganicCorridorMask(ctx, canvas, corridor, random, options = {}) {
    const scale = canvas.width / 1536;
    const blobCount = Math.round((options.blobs || 72) * scale);
    const notchCount = Math.round((options.notches || 30) * scale);
    const blur = options.blur ?? 13 * scale;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.filter = `blur(${Math.max(3, blur)}px)`;
    ctx.globalAlpha = options.baseAlpha ?? 0.58;
    traceCorridor(ctx, canvas, corridor, options.inset ?? canvas.width * 0.002);
    ctx.fill();
    ctx.filter = "none";

    for (let index = 0; index < blobCount; index += 1) {
      const y = random() * canvas.height;
      const t = y / canvas.height;
      const half = corridorHalfWidth(corridor, t, -canvas.width * 0.012);
      const x = corridorCenterAt(corridor, t) + (random() - 0.5) * half * 1.36;
      const radiusX = half * (0.16 + random() * 0.52);
      const radiusY = (34 + random() * 150) * scale;
      ctx.globalAlpha = options.blobAlpha ?? 0.34;
      ctx.filter = `blur(${Math.max(4, (7 + random() * 16) * scale)}px)`;
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, random() * TAU, 0, TAU);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "destination-out";
    for (let index = 0; index < notchCount; index += 1) {
      const y = random() * canvas.height;
      const t = y / canvas.height;
      const half = corridorHalfWidth(corridor, t, -canvas.width * 0.004);
      const edge = random() > 0.5 ? -1 : 1;
      const x = corridorCenterAt(corridor, t) + edge * half * (0.74 + random() * 0.45);
      const radiusX = half * (0.11 + random() * 0.24);
      const radiusY = (26 + random() * 110) * scale;
      ctx.globalAlpha = options.notchAlpha ?? 0.2;
      ctx.filter = `blur(${Math.max(5, (8 + random() * 18) * scale)}px)`;
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMaskedCorridorSurface(ctx, canvas, corridor, random, maskOptions, drawSurface) {
    const { layer, layerCtx } = canvasLayer(canvas);
    const mask = canvasLayer(canvas);
    drawSurface(layerCtx);
    drawOrganicCorridorMask(mask.layerCtx, canvas, corridor, random, maskOptions);
    layerCtx.save();
    layerCtx.globalCompositeOperation = "destination-in";
    layerCtx.drawImage(mask.layer, 0, 0);
    layerCtx.restore();
    ctx.save();
    ctx.globalAlpha = maskOptions.alpha ?? 1;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  function corridorGradient(ctx, canvas, corridor, palette) {
    const gradient = ctx.createLinearGradient(corridor.center - corridor.width * 0.7, 0, corridor.center + corridor.width * 0.7, 0);
    gradient.addColorStop(0, palette.edge);
    gradient.addColorStop(0.28, palette.mid || palette.base);
    gradient.addColorStop(0.5, palette.base);
    gradient.addColorStop(0.72, palette.mid || palette.base);
    gradient.addColorStop(1, palette.edge);
    return gradient;
  }

  function randomCorridorPoint(canvas, corridor, random, spread = 1) {
    const y = random() * canvas.height;
    const t = y / canvas.height;
    const half = corridorHalfWidth(corridor, t, 0);
    return {
      x: corridorCenterAt(corridor, t) + (random() - 0.5) * half * 2 * spread,
      y,
      t,
      half,
    };
  }

  function buildOpenBiomeArea(canvas, model, random, theme) {
    const buildings = Array.isArray(model?.buildings) ? model.buildings : [];
    if (!buildings.length) return null;
    const bounds = modelBounds(model);
    const gridW = 176;
    const gridH = 88;
    const total = gridW * gridH;
    const occupied = new Uint8Array(total);
    const expanded = new Uint8Array(total);
    const valid = new Uint8Array(total);
    const centerX = bounds.width * 0.5;
    const centerZ = bounds.height * 0.5;
    const maxRadius = Math.min(bounds.width, bounds.height) * 0.42;
    const minRadius = Math.min(bounds.width, bounds.height) * 0.035;

    for (let gy = 0; gy < gridH; gy += 1) {
      for (let gx = 0; gx < gridW; gx += 1) {
        const x = ((gx + 0.5) / gridW) * bounds.width;
        const z = ((gy + 0.5) / gridH) * bounds.height;
        const radius = Math.hypot(x - centerX, z - centerZ);
        if (radius > minRadius && radius < maxRadius) valid[gy * gridW + gx] = 1;
      }
    }

    for (const building of buildings) {
      const box = buildingBounds(building);
      if (!box) continue;
      const pad = Math.max(16, Math.min(58, buildingHitRadius(building) * 0.9));
      const minGX = clamp(Math.floor(((box.minX - pad) / bounds.width) * gridW), 0, gridW - 1);
      const maxGX = clamp(Math.ceil(((box.maxX + pad) / bounds.width) * gridW), 0, gridW - 1);
      const minGY = clamp(Math.floor(((box.minZ - pad) / bounds.height) * gridH), 0, gridH - 1);
      const maxGY = clamp(Math.ceil(((box.maxZ + pad) / bounds.height) * gridH), 0, gridH - 1);
      for (let gy = minGY; gy <= maxGY; gy += 1) {
        for (let gx = minGX; gx <= maxGX; gx += 1) {
          occupied[gy * gridW + gx] = 1;
        }
      }
    }

    const grow = theme === "ocean" ? 2 : theme === "forest" || theme === "swamp" ? 3 : 2;
    for (let gy = 0; gy < gridH; gy += 1) {
      for (let gx = 0; gx < gridW; gx += 1) {
        if (!occupied[gy * gridW + gx]) continue;
        for (let dy = -grow; dy <= grow; dy += 1) {
          for (let dx = -grow; dx <= grow; dx += 1) {
            if (dx * dx + dy * dy > grow * grow + 0.25) continue;
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
            expanded[ny * gridW + nx] = 1;
          }
        }
      }
    }

    const seen = new Uint8Array(total);
    const components = [];
    const neighbors = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (let index = 0; index < total; index += 1) {
      if (seen[index] || expanded[index] || !valid[index]) continue;
      const stack = [index];
      const cells = [];
      let minGX = gridW;
      let minGY = gridH;
      let maxGX = 0;
      let maxGY = 0;
      let radialSum = 0;
      let edgeTouches = 0;
      seen[index] = 1;
      while (stack.length) {
        const current = stack.pop();
        const gx = current % gridW;
        const gy = Math.floor(current / gridW);
        const x = ((gx + 0.5) / gridW) * bounds.width;
        const z = ((gy + 0.5) / gridH) * bounds.height;
        cells.push(current);
        minGX = Math.min(minGX, gx);
        minGY = Math.min(minGY, gy);
        maxGX = Math.max(maxGX, gx);
        maxGY = Math.max(maxGY, gy);
        radialSum += Math.hypot(x - centerX, z - centerZ) / maxRadius;
        if (gx < 3 || gx > gridW - 4 || gy < 3 || gy > gridH - 4) edgeTouches += 1;
        for (const [dx, dy] of neighbors) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
          const next = ny * gridW + nx;
          if (seen[next] || expanded[next] || !valid[next]) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
      if (cells.length < 18) continue;
      const width = maxGX - minGX + 1;
      const height = maxGY - minGY + 1;
      const elongated = Math.max(width / Math.max(1, height), height / Math.max(1, width));
      const radialMean = radialSum / cells.length;
      if (edgeTouches / cells.length > 0.08 || radialMean > 0.86) continue;
      const radialPenalty = radialMean > 0.72 ? 0.22 : radialMean > 0.64 ? 0.54 : 1;
      const centrality = 1 + Math.max(0, 0.72 - radialMean) * 1.35;
      const score = cells.length * (0.9 + Math.min(elongated, 5) * 0.16) * radialPenalty * centrality;
      components.push({ cells, minGX, minGY, maxGX, maxGY, score });
    }

    components.sort((a, b) => b.score - a.score);
    const component = components[0];
    if (!component) return null;

    const mask = canvasLayer(canvas);
    const cellW = canvas.width / gridW;
    const cellH = canvas.height / gridH;
    mask.layerCtx.save();
    mask.layerCtx.fillStyle = "#ffffff";
    mask.layerCtx.globalAlpha = 0.98;
    for (const cell of component.cells) {
      const gx = cell % gridW;
      const gy = Math.floor(cell / gridW);
      mask.layerCtx.fillRect((gx - 0.12) * cellW, (gy - 0.12) * cellH, cellW * 1.24, cellH * 1.24);
    }
    mask.layerCtx.filter = `blur(${Math.max(2, canvas.width * 0.0012)}px)`;
    mask.layerCtx.globalAlpha = 0.28;
    for (const cell of component.cells) {
      if (random() < 0.78) continue;
      const gx = cell % gridW;
      const gy = Math.floor(cell / gridW);
      const x = (gx + 0.5 + (random() - 0.5) * 0.6) * cellW;
      const y = (gy + 0.5 + (random() - 0.5) * 0.6) * cellH;
      mask.layerCtx.beginPath();
      mask.layerCtx.ellipse(x, y, cellW * (0.75 + random() * 1.15), cellH * (0.7 + random() * 0.9), random() * TAU, 0, TAU);
      mask.layerCtx.fill();
    }
    mask.layerCtx.restore();

    const minX = component.minGX * cellW;
    const maxX = (component.maxGX + 1) * cellW;
    const minY = component.minGY * cellH;
    const maxY = (component.maxGY + 1) * cellH;
    const corridor = {
      center: (minX + maxX) * 0.5,
      width: Math.max(canvas.width * 0.14, (maxX - minX) * 1.35),
      wobble: Math.max(canvas.width * 0.018, (maxX - minX) * 0.08),
      roughness: canvas.width * (theme === "ocean" ? 0.012 : 0.018),
      phase: random() * TAU,
      yMin: minY,
      yMax: maxY,
      area: component.cells.length,
      coverage: component.cells.length / total,
      elongation: Math.max(
        (component.maxGX - component.minGX + 1) / Math.max(1, component.maxGY - component.minGY + 1),
        (component.maxGY - component.minGY + 1) / Math.max(1, component.maxGX - component.minGX + 1)
      ),
    };
    return { mask: mask.layer, corridor };
  }

  function passagePalette(theme, colors) {
    if (theme === "ocean") return { base: "#1f728d", edge: "rgba(7, 32, 53, 0.82)", mid: "#2c94a8", detail: "#67c7d4", accent: "#c8fbff" };
    if (theme === "forest" || theme === "reclaimed") return { base: "#254d34", edge: "rgba(12, 32, 24, 0.8)", mid: "#3d6d3e", detail: "#5f8f55", accent: "#a7ce83" };
    if (theme === "swamp") return { base: "#213d33", edge: "rgba(10, 26, 24, 0.84)", mid: "#3f6749", detail: "#547f57", accent: "#93c977" };
    if (theme === "industrial") return { base: colorMix(colors.base, "#6d7780", 0.38), edge: "rgba(20, 28, 31, 0.78)", mid: "#687b82", detail: "#9ab0ba", accent: colors.accent };
    if (theme === "lava") return { base: "#4a2a22", edge: "rgba(26, 18, 18, 0.88)", mid: "#703224", detail: "#9e4628", accent: "#ffad45" };
    if (theme === "rock") return { base: "#4e5b5c", edge: "rgba(33, 42, 44, 0.82)", mid: "#657271", detail: "#8c9792", accent: "#c4cac2" };
    if (theme === "desert") return { base: "#7a6847", edge: "rgba(75, 62, 45, 0.78)", mid: "#97835c", detail: "#b5a06d", accent: "#e2cb92" };
    if (theme === "storm") return { base: "#445766", edge: "rgba(30, 42, 53, 0.82)", mid: "#5f7685", detail: "#82aebe", accent: "#c2f7ff" };
    return { base: colorMix(colors.base, colors.land, 0.54), edge: "rgba(22, 38, 48, 0.72)", mid: colorMix(colors.land, colors.light, 0.28), detail: colors.light, accent: colors.glow };
  }

  function drawBiomePassage(ctx, canvas, theme, corridor, random, colors, scale) {
    const palette = passagePalette(theme, colors);
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: theme === "urban" ? 0.86 : 0.96,
      baseAlpha: theme === "ocean" ? 0.82 : 0.68,
      blobAlpha: theme === "forest" || theme === "swamp" ? 0.52 : 0.38,
      notchAlpha: 0.18,
      blobs: theme === "forest" || theme === "swamp" ? 124 : 90,
      notches: 34,
      blur: (theme === "ocean" ? 18 : 15) * scale,
      inset: -canvas.width * 0.006,
    }, (layerCtx) => {
      drawThemedOpenAreaTexture(layerCtx, canvas, theme, corridor, random, colors, scale);
    });
  }

  function drawThemedCorridorLayer(ctx, canvas, theme, corridor, random, colors, scale) {
    drawBiomePassage(ctx, canvas, theme, corridor, random, colors, scale);
  }

  function drawOpenWaterTexture(ctx, canvas, corridor, random, palette, scale) {
    ctx.fillStyle = corridorGradient(ctx, canvas, corridor, palette);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 92; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.02);
      const radius = (44 + random() * 180) * scale;
      const depth = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      depth.addColorStop(0, random() > 0.5 ? "rgba(116, 211, 229, 0.2)" : "rgba(4, 29, 48, 0.32)");
      depth.addColorStop(0.65, "rgba(31, 120, 148, 0.13)");
      depth.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = depth;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius * (0.75 + random() * 1.0), radius * (0.2 + random() * 0.36), random() * TAU, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.01);
    ctx.clip();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = palette.accent;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let index = 0; index < 130 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 0.98);
      const length = (18 + random() * 62) * scale;
      const bend = (random() - 0.5) * 12 * scale;
      ctx.lineWidth = Math.max(0.35, (0.35 + random() * 0.55) * scale);
      ctx.beginPath();
      ctx.moveTo(point.x - length * 0.5, point.y);
      ctx.quadraticCurveTo(point.x, point.y + bend, point.x + length * 0.5, point.y + (random() - 0.5) * 8 * scale);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.11;
    for (let index = 0; index < 260 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.0);
      const size = (0.28 + random() * 0.75) * scale;
      ctx.fillStyle = random() > 0.62 ? palette.detail : palette.mid;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, size * (1.2 + random() * 2.2), size * (0.6 + random()), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawThemedOpenAreaTexture(ctx, canvas, theme, corridor, random, colors, scale) {
    if (theme === "ocean") {
      const palette = { base: "#1f728d", edge: "rgba(7, 32, 53, 0.82)", mid: "#2c94a8", detail: "#67c7d4", accent: "#c8fbff" };
      drawOpenWaterTexture(ctx, canvas, corridor, random, palette, scale);
      return;
    }
    if (theme === "forest" || theme === "reclaimed") {
      const palette = { base: "#254d34", edge: "rgba(12, 32, 24, 0.8)", mid: "#3d6d3e", detail: "#5f8f55", accent: "#a7ce83" };
      drawCanopyTexture(ctx, canvas, corridor, random, palette, scale);
      return;
    }
    if (theme === "swamp") {
      const palette = { base: "#213d33", edge: "rgba(10, 26, 24, 0.84)", mid: "#3f6749", detail: "#547f57", accent: "#93c977" };
      drawSwampTexture(ctx, canvas, corridor, random, palette, scale);
      return;
    }
    const fallbackPalette = {
      industrial: { base: colorMix(colors.base, "#6d7780", 0.38), edge: "rgba(20, 28, 31, 0.78)", mid: "#687b82", detail: "#9ab0ba", accent: colors.accent },
      lava: { base: "#4a2a22", edge: "rgba(26, 18, 18, 0.88)", mid: "#703224", detail: "#9e4628", accent: "#ffad45" },
      rock: { base: "#4e5b5c", edge: "rgba(33, 42, 44, 0.82)", mid: "#657271", detail: "#8c9792", accent: "#c4cac2" },
      desert: { base: "#7a6847", edge: "rgba(75, 62, 45, 0.78)", mid: "#97835c", detail: "#b5a06d", accent: "#e2cb92" },
      storm: { base: "#445766", edge: "rgba(30, 42, 53, 0.82)", mid: "#5f7685", detail: "#82aebe", accent: "#c2f7ff" },
    }[theme] || { base: colorMix(colors.base, colors.land, 0.54), edge: "rgba(22, 38, 48, 0.72)", mid: colorMix(colors.land, colors.light, 0.28), detail: colors.light, accent: colors.glow };
    ctx.fillStyle = corridorGradient(ctx, canvas, corridor, fallbackPalette);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFineNoise(ctx, canvas, corridor, random, fallbackPalette, 760, 0.22, 0.45 * scale, 4.2 * scale);
    drawFlowLines(ctx, canvas, corridor, random, { count: 18, alpha: 0.16, color: fallbackPalette.accent, width: 0.65, minWidth: 0.4, length: 0.28, frequency: 1.4, wobble: 14 });
  }

  function drawWaterTexture(ctx, canvas, corridor, random, palette, scale) {
    ctx.fillStyle = corridorGradient(ctx, canvas, corridor, palette);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 92 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.05);
      const radius = (30 + random() * 150) * scale;
      const depth = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      depth.addColorStop(0, random() > 0.54 ? "rgba(116, 211, 229, 0.28)" : "rgba(4, 29, 48, 0.42)");
      depth.addColorStop(0.62, random() > 0.45 ? "rgba(39, 126, 151, 0.16)" : "rgba(9, 58, 91, 0.2)");
      depth.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = depth;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius * (0.7 + random() * 1.1), radius * (0.18 + random() * 0.38), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = "#c9fbff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let index = 0; index < 42 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 0.95);
      ctx.lineWidth = Math.max(0.55, (0.42 + random() * 0.7) * scale);
      ctx.beginPath();
      for (let step = 0; step <= 54; step += 1) {
        const localT = step / 54;
        const y = point.y + (localT - 0.5) * canvas.height * (0.15 + random() * 0.16);
        const yy = ((y % canvas.height) + canvas.height) % canvas.height;
        const yt = yy / canvas.height;
        const x = corridorCenterAt(corridor, yt) + (point.x - corridorCenterAt(corridor, point.t)) +
          Math.sin(localT * TAU * (1.1 + random() * 0.9) + index) * 18 * scale;
        if (step === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    drawFineNoise(ctx, canvas, corridor, random, palette, 560, 0.17, 0.35 * scale, 1.5 * scale);
  }

  function drawCanopyTexture(ctx, canvas, corridor, random, palette, scale) {
    ctx.fillStyle = corridorGradient(ctx, canvas, corridor, palette);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 135 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.1);
      const radius = (18 + random() * 92) * scale;
      const canopy = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      canopy.addColorStop(0, random() > 0.5 ? "rgba(128, 173, 92, 0.34)" : "rgba(23, 66, 40, 0.38)");
      canopy.addColorStop(0.58, "rgba(53, 105, 55, 0.2)");
      canopy.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = canopy;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius * (0.72 + random() * 1.2), radius * (0.26 + random() * 0.54), random() * TAU, 0, TAU);
      ctx.fill();
    }
    drawFineNoise(ctx, canvas, corridor, random, palette, 980, 0.24, 0.38 * scale, 2.4 * scale);
    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.008);
    ctx.clip();
    ctx.globalAlpha = 0.18;
    for (let index = 0; index < 520 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 0.96);
      const size = (0.65 + random() * 2.4) * scale;
      ctx.fillStyle = random() > 0.6 ? palette.accent : palette.detail;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, size * (0.8 + random() * 1.8), size * (0.45 + random() * 0.8), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSwampTexture(ctx, canvas, corridor, random, palette, scale) {
    ctx.fillStyle = corridorGradient(ctx, canvas, corridor, palette);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 105 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.08);
      const radius = (16 + random() * 86) * scale;
      const pool = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      pool.addColorStop(0, random() > 0.54 ? "rgba(104, 160, 114, 0.48)" : "rgba(35, 88, 82, 0.52)");
      pool.addColorStop(0.48, random() > 0.45 ? "rgba(70, 107, 53, 0.26)" : "rgba(28, 72, 62, 0.28)");
      pool.addColorStop(1, "rgba(10, 31, 29, 0)");
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius * (0.82 + random() * 1.15), radius * (0.2 + random() * 0.48), random() * TAU, 0, TAU);
      ctx.fill();
    }
    drawFineNoise(ctx, canvas, corridor, random, palette, 860, 0.23, 0.45 * scale, 3.0 * scale);
    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.01);
    ctx.clip();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "#a6df8d";
    ctx.lineWidth = Math.max(0.4, 0.55 * scale);
    ctx.lineCap = "round";
    for (let index = 0; index < 120 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 0.98);
      const length = (14 + random() * 48) * scale;
      const bend = (random() - 0.5) * 10 * scale;
      ctx.beginPath();
      ctx.moveTo(point.x - length * 0.5, point.y);
      ctx.quadraticCurveTo(point.x, point.y + bend, point.x + length * 0.5, point.y + (random() - 0.5) * 9 * scale);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16;
    for (let index = 0; index < 340 * scale; index += 1) {
      const point = randomCorridorPoint(canvas, corridor, random, 1.0);
      const size = (0.7 + random() * 2.8) * scale;
      ctx.fillStyle = random() > 0.5 ? palette.detail : palette.mid;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, size * (0.9 + random() * 1.6), size * (0.45 + random() * 0.8), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCorridorFeather(ctx, canvas, corridor, palette, scale) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let layer = 5; layer >= 0; layer -= 1) {
      traceCorridor(ctx, canvas, corridor, -canvas.width * (0.012 + layer * 0.005));
      ctx.fillStyle = layer > 1 ? palette.edge : palette.base;
      ctx.globalAlpha = 0.045 + (5 - layer) * 0.018;
      ctx.filter = `blur(${Math.max(2, (layer + 1) * 1.6 * scale)}px)`;
      ctx.fill();
    }
    ctx.filter = "none";
    ctx.restore();
  }

  function fillCorridorClip(ctx, canvas, corridor, inset, draw) {
    ctx.save();
    traceCorridor(ctx, canvas, corridor, inset);
    ctx.clip();
    draw();
    ctx.restore();
  }

  function drawFineNoise(ctx, canvas, corridor, random, palette, density, alpha, minSize, maxSize) {
    const count = Math.round(density * (canvas.width / 1536));
    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.012);
    ctx.clip();
    ctx.globalAlpha = alpha;
    for (let index = 0; index < count; index += 1) {
      const y = random() * canvas.height;
      const t = y / canvas.height;
      const half = corridorHalfWidth(corridor, t, canvas.width * 0.018);
      const x = corridorCenterAt(corridor, t) + (random() - 0.5) * half * 1.9;
      const size = minSize + random() * (maxSize - minSize);
      ctx.fillStyle = random() > 0.58 ? palette.detail : random() > 0.18 ? palette.mid : palette.accent;
      ctx.beginPath();
      ctx.ellipse(x, y, size * (0.7 + random() * 1.5), size * (0.42 + random() * 0.72), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFlowLines(ctx, canvas, corridor, random, options) {
    const scale = canvas.width / 1536;
    const count = Math.round(options.count * scale);
    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.015);
    ctx.clip();
    ctx.globalAlpha = options.alpha;
    ctx.strokeStyle = options.color;
    ctx.lineWidth = Math.max(options.minWidth || 0.5, options.width * scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (options.shadow) {
      ctx.shadowColor = options.shadow;
      ctx.shadowBlur = (options.shadowBlur || 4) * scale;
    }
    for (let index = 0; index < count; index += 1) {
      const yBase = random() * canvas.height;
      const lateral = (random() - 0.5) * corridor.width * 0.72;
      ctx.beginPath();
      for (let step = 0; step <= 44; step += 1) {
        const t = step / 44;
        const y = yBase + (t - 0.5) * canvas.height * options.length;
        const yy = ((y % canvas.height) + canvas.height) % canvas.height;
        const yyT = yy / canvas.height;
        const x = corridorCenterAt(corridor, yyT) + lateral +
          Math.sin(t * TAU * options.frequency + index + corridor.phase) * options.wobble * scale;
        if (step === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCorridorSpeckles(ctx, canvas, corridor, random, palette, count, radiusMin, radiusMax, alpha = 0.5) {
    ctx.save();
    traceCorridor(ctx, canvas, corridor, -canvas.width * 0.02);
    ctx.clip();
    ctx.globalAlpha = alpha;
    for (let index = 0; index < count; index += 1) {
      const x = corridor.center + (random() - 0.5) * corridor.width * 1.08;
      const y = random() * canvas.height;
      const radius = radiusMin + random() * (radiusMax - radiusMin);
      ctx.fillStyle = random() > 0.22 ? palette.detail : palette.accent;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (0.65 + random() * 1.6), radius * (0.45 + random() * 0.9), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOceanCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#1f728d", edge: "rgba(7, 32, 53, 0.82)", mid: "#2c94a8", detail: "#67c7d4", accent: "#c8fbff" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.96,
      baseAlpha: 0.74,
      blobAlpha: 0.44,
      notchAlpha: 0.18,
      blobs: 94,
      notches: 36,
      blur: 16 * scale,
      inset: -canvas.width * 0.006,
    }, (layerCtx) => {
      drawWaterTexture(layerCtx, canvas, corridor, random, palette, scale);
    });
    drawFlowLines(ctx, canvas, corridor, random, { count: 26, alpha: 0.28, color: "#cdf8ff", width: 0.9, minWidth: 0.6, length: 0.34, frequency: 1.7, wobble: 14, shadow: "#76dfff", shadowBlur: 3 });
    drawFlowLines(ctx, canvas, corridor, random, { count: 14, alpha: 0.18, color: "#75c8db", width: 2.2, minWidth: 0.9, length: 0.5, frequency: 0.8, wobble: 22 });
  }

  function drawForestCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#254d34", edge: "rgba(12, 32, 24, 0.8)", mid: "#3d6d3e", detail: "#5f8f55", accent: "#a7ce83" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.94,
      baseAlpha: 0.62,
      blobAlpha: 0.5,
      notchAlpha: 0.24,
      blobs: 118,
      notches: 48,
      blur: 15 * scale,
      inset: -canvas.width * 0.002,
    }, (layerCtx) => {
      drawCanopyTexture(layerCtx, canvas, corridor, random, palette, scale);
    });
    drawFlowLines(ctx, canvas, corridor, random, { count: 22, alpha: 0.14, color: "#c2e79a", width: 0.5, minWidth: 0.36, length: 0.2, frequency: 2.6, wobble: 9 });
  }

  function drawSwampCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#213d33", edge: "rgba(10, 26, 24, 0.84)", mid: "#3f6749", detail: "#547f57", accent: "#93c977" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.95,
      baseAlpha: 0.66,
      blobAlpha: 0.48,
      notchAlpha: 0.22,
      blobs: 104,
      notches: 42,
      blur: 16 * scale,
      inset: -canvas.width * 0.002,
    }, (layerCtx) => {
      drawSwampTexture(layerCtx, canvas, corridor, random, palette, scale);
    });
    drawFlowLines(ctx, canvas, corridor, random, { count: 18, alpha: 0.18, color: "#9bdc93", width: 0.65, minWidth: 0.45, length: 0.28, frequency: 2.2, wobble: 15 });
  }

  function drawIndustrialCorridor(ctx, canvas, corridor, random, colors, scale) {
    const palette = { base: colorMix(colors.base, "#6d7780", 0.38), edge: "rgba(20, 28, 31, 0.78)", mid: "#687b82", detail: "#9ab0ba", accent: colors.accent };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.92,
      baseAlpha: 0.58,
      blobAlpha: 0.34,
      notchAlpha: 0.18,
      blobs: 76,
      notches: 26,
      blur: 12 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      fillCorridorClip(layerCtx, canvas, corridor, canvas.width * 0.01, () => {
        layerCtx.globalAlpha = 0.34;
        layerCtx.strokeStyle = palette.detail;
        layerCtx.lineWidth = Math.max(0.7, 1.2 * scale);
        for (let index = 0; index < 54; index += 1) {
          const x = corridor.center - corridor.width * 0.5 + random() * corridor.width;
          layerCtx.beginPath();
          layerCtx.moveTo(x, 0);
          layerCtx.lineTo(x + Math.sin(index) * 54 * scale, canvas.height);
          layerCtx.stroke();
        }
        layerCtx.globalAlpha = 0.24;
        layerCtx.strokeStyle = "rgba(255, 230, 150, 0.72)";
        layerCtx.lineWidth = Math.max(0.55, 0.9 * scale);
        for (let y = 0; y <= canvas.height; y += 34 * scale) {
          layerCtx.beginPath();
          layerCtx.moveTo(corridor.center - corridor.width * 0.45, y);
          layerCtx.lineTo(corridor.center + corridor.width * 0.45, y + Math.sin(y * 0.01) * 28 * scale);
          layerCtx.stroke();
        }
        layerCtx.globalAlpha = 0.3;
        for (let index = 0; index < 185 * scale; index += 1) {
          const y = random() * canvas.height;
          const t = y / canvas.height;
          const x = corridorCenterAt(corridor, t) + (random() - 0.5) * corridorHalfWidth(corridor, t) * 1.72;
          const w = 5 * scale + random() * 22 * scale;
          const h = 3 * scale + random() * 14 * scale;
          layerCtx.fillStyle = random() > 0.72 ? palette.accent : palette.mid;
          layerCtx.fillRect(x, y, w, h);
        }
      });
    });
  }

  function drawLavaCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#4a2a22", edge: "rgba(26, 18, 18, 0.88)", mid: "#703224", detail: "#9e4628", accent: "#ffad45" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.95,
      baseAlpha: 0.64,
      blobAlpha: 0.4,
      notchAlpha: 0.18,
      blobs: 88,
      notches: 32,
      blur: 14 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawFineNoise(layerCtx, canvas, corridor, random, palette, 520, 0.24, 0.7 * scale, 5.5 * scale);
      fillCorridorClip(layerCtx, canvas, corridor, canvas.width * 0.012, () => {
        layerCtx.globalAlpha = 0.58;
        layerCtx.strokeStyle = palette.accent;
        layerCtx.lineWidth = Math.max(1.2, 2.2 * scale);
        layerCtx.shadowColor = "#ff5b27";
        layerCtx.shadowBlur = 9 * scale;
        for (let index = 0; index < 22; index += 1) {
          const start = random() * canvas.height;
          layerCtx.beginPath();
          for (let step = 0; step <= 46; step += 1) {
            const localT = step / 46;
            const y = start + (localT - 0.2) * canvas.height * (0.32 + random() * 0.22);
            const yy = ((y % canvas.height) + canvas.height) % canvas.height;
            const t = yy / canvas.height;
            const x = corridorCenterAt(corridor, t) + Math.sin(localT * TAU * 1.8 + index) * corridorHalfWidth(corridor, t) * 0.55 + (random() - 0.5) * 8 * scale;
            if (step === 0) layerCtx.moveTo(x, yy);
            else layerCtx.lineTo(x, yy);
          }
          layerCtx.stroke();
        }
      });
    });
  }

  function drawRockCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#4e5b5c", edge: "rgba(33, 42, 44, 0.82)", mid: "#657271", detail: "#8c9792", accent: "#c4cac2" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.9,
      baseAlpha: 0.56,
      blobAlpha: 0.34,
      notchAlpha: 0.22,
      blobs: 82,
      notches: 44,
      blur: 12 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawFineNoise(layerCtx, canvas, corridor, random, palette, 700, 0.28, 0.7 * scale, 5.2 * scale);
      drawFlowLines(layerCtx, canvas, corridor, random, { count: 28, alpha: 0.22, color: "#d7ddd4", width: 0.7, minWidth: 0.45, length: 0.34, frequency: 1.1, wobble: 5 });
    });
  }

  function drawDesertCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#7a6847", edge: "rgba(75, 62, 45, 0.78)", mid: "#97835c", detail: "#b5a06d", accent: "#e2cb92" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.9,
      baseAlpha: 0.58,
      blobAlpha: 0.34,
      notchAlpha: 0.2,
      blobs: 76,
      notches: 30,
      blur: 13 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawFineNoise(layerCtx, canvas, corridor, random, palette, 760, 0.2, 0.45 * scale, 3.8 * scale);
      drawFlowLines(layerCtx, canvas, corridor, random, { count: 42, alpha: 0.2, color: "#f3dfad", width: 0.65, minWidth: 0.4, length: 0.42, frequency: 0.7, wobble: 18 });
    });
  }

  function drawStormCorridor(ctx, canvas, corridor, random, scale) {
    const palette = { base: "#445766", edge: "rgba(30, 42, 53, 0.82)", mid: "#5f7685", detail: "#82aebe", accent: "#c2f7ff" };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.92,
      baseAlpha: 0.54,
      blobAlpha: 0.36,
      notchAlpha: 0.2,
      blobs: 92,
      notches: 36,
      blur: 15 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawFineNoise(layerCtx, canvas, corridor, random, palette, 760, 0.18, 0.8 * scale, 8 * scale);
      drawFlowLines(layerCtx, canvas, corridor, random, { count: 42, alpha: 0.28, color: palette.accent, width: 1, minWidth: 0.55, length: 0.36, frequency: 1.6, wobble: 28, shadow: palette.accent, shadowBlur: 5 });
    });
  }

  function drawUrbanCorridor(ctx, canvas, corridor, random, colors, scale) {
    const palette = { base: colorMix(colors.base, colors.land, 0.54), edge: "rgba(22, 38, 48, 0.72)", mid: colorMix(colors.land, colors.light, 0.28), detail: colors.light, accent: colors.glow };
    drawCorridorFeather(ctx, canvas, corridor, palette, scale);
    drawMaskedCorridorSurface(ctx, canvas, corridor, random, {
      alpha: 0.86,
      baseAlpha: 0.48,
      blobAlpha: 0.28,
      notchAlpha: 0.16,
      blobs: 62,
      notches: 22,
      blur: 10 * scale,
    }, (layerCtx) => {
      layerCtx.fillStyle = corridorGradient(layerCtx, canvas, corridor, palette);
      layerCtx.fillRect(0, 0, canvas.width, canvas.height);
      fillCorridorClip(layerCtx, canvas, corridor, canvas.width * 0.008, () => {
        layerCtx.globalAlpha = 0.28;
        layerCtx.strokeStyle = "rgba(228, 247, 255, 0.74)";
        layerCtx.lineWidth = Math.max(0.55, 0.9 * scale);
        const spacing = 10 * scale;
        for (let y = 0; y <= canvas.height; y += spacing * 1.15) {
          const t = y / canvas.height;
          const center = corridorCenterAt(corridor, t);
          const half = corridorHalfWidth(corridor, t, canvas.width * 0.014);
          layerCtx.beginPath();
          layerCtx.moveTo(center - half, y);
          layerCtx.lineTo(center + half, y + Math.sin(y * 0.012) * 14 * scale);
          layerCtx.stroke();
        }
        for (let xOffset = -corridor.width * 0.48; xOffset <= corridor.width * 0.48; xOffset += spacing * 1.1) {
          layerCtx.beginPath();
          for (let step = 0; step <= 40; step += 1) {
            const t = step / 40;
            const y = t * canvas.height;
            const x = corridorCenterAt(corridor, t) + xOffset + Math.sin(t * TAU + xOffset * 0.02) * 12 * scale;
            if (step === 0) layerCtx.moveTo(x, y);
            else layerCtx.lineTo(x, y);
          }
          layerCtx.stroke();
        }
        layerCtx.globalAlpha = 0.48;
        for (let index = 0; index < 720 * scale; index += 1) {
          const y = random() * canvas.height;
          const t = y / canvas.height;
          const x = corridorCenterAt(corridor, t) + (random() - 0.5) * corridorHalfWidth(corridor, t) * 1.72;
          const size = (random() > 0.82 ? 1.75 : 0.95) * scale;
          layerCtx.fillStyle = random() > 0.55 ? colors.light : palette.mid;
          layerCtx.fillRect(x, y, size, size);
        }
      });
    });
  }

  function drawReclaimedCorridor(ctx, canvas, corridor, random, colors, scale) {
    drawForestCorridor(ctx, canvas, corridor, random, scale);
    ctx.save();
    traceCorridor(ctx, canvas, corridor, canvas.width * 0.018);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colorMix(colors.accent, "#ffffff", 0.24);
    ctx.lineWidth = Math.max(0.8, 1.3 * scale);
    for (let index = 0; index < 20; index += 1) {
      const x = corridor.center + (random() - 0.5) * corridor.width * 0.88;
      ctx.beginPath();
      ctx.moveTo(x, random() * canvas.height);
      ctx.lineTo(x + (random() - 0.5) * 90 * scale, random() * canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSurfaceCorridor(ctx, canvas, planet, model, colors) {
    const theme = surfaceTheme(planet, model);
    if (theme === "urban" && normalize(planet.name) === "coruscant") return;
    const random = rngFromSeed((Number(planet.seed) || 1) ^ hashString(`surface:${theme}:${planet.name}`));
    const scale = canvas.width / 1536;
    const openArea = buildOpenBiomeArea(canvas, model, random, theme);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    if (openArea && openArea.corridor?.coverage > 0.025 && openArea.corridor?.elongation > 1.8) {
      const { layer, layerCtx } = canvasLayer(canvas);
      drawThemedOpenAreaTexture(layerCtx, canvas, theme, openArea.corridor, random, colors, scale);
      layerCtx.save();
      layerCtx.globalCompositeOperation = "destination-in";
      layerCtx.drawImage(openArea.mask, 0, 0);
      layerCtx.restore();
      ctx.drawImage(layer, 0, 0);
    } else {
      const corridor = corridorBounds(canvas, random, 0, 1, theme);
      drawThemedCorridorLayer(ctx, canvas, theme, corridor, random, colors, scale);
    }
    ctx.restore();
  }

  function drawModelBackground(ctx, canvas, planet, colors) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colorMix(colors.base, "#ffffff", 0.18));
    gradient.addColorStop(0.42, colorMix(colors.base, colors.land, 0.34));
    gradient.addColorStop(1, colorMix(colors.base, "#000000", 0.46));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const random = rngFromSeed(planet.seed ^ 0x9bc5);
    ctx.globalAlpha = 0.34;
    for (let index = 0; index < 150; index += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const radius = (38 + random() * 190) * (canvas.width / 3072);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, colorMix(colors.land, colors.glow, 0.28));
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (0.9 + random() * 0.8), radius * (0.32 + random() * 0.36), random() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStreetTexture(ctx, canvas, model, colors) {
    const bounds = modelBounds(model);
    const streets = modelStreets(model);
    const styles = {
      minor: { color: "rgba(186, 232, 255, 0.2)", width: 0.44 },
      major: { color: "rgba(214, 245, 255, 0.42)", width: 0.86 },
      main: { color: "rgba(241, 253, 255, 0.58)", width: 1.32 },
    };
    const scale = canvas.width / 1536;
    const longStreetThreshold = Math.max(bounds.width, bounds.height) * 0.74;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const street of streets) {
      const type = street.type || street.axis || "minor";
      const style = styles[type] || styles.minor;
      const points = street.points || [];
      if (points.length < 2) continue;
      const veryLong = streetPathLength(points) > longStreetThreshold;
      ctx.strokeStyle = veryLong ? "rgba(126, 211, 255, 0.1)" : style.color;
      ctx.lineWidth = veryLong ? Math.max(0.65, 0.32 * scale) : Math.max(0.7, style.width * scale);
      ctx.beginPath();
      points.forEach((point, index) => {
        const mapped = projectedPoint(point, bounds, canvas);
        if (index === 0) ctx.moveTo(mapped.x, mapped.y);
        else ctx.lineTo(mapped.x, mapped.y);
      });
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 2.6 * scale;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 7 * scale;
    for (const street of streets.filter((entry) => (entry.type || entry.axis) === "main")) {
      const points = street.points || [];
      if (points.length < 2) continue;
      if (streetPathLength(points) > longStreetThreshold) continue;
      ctx.beginPath();
      points.forEach((point, index) => {
        const mapped = projectedPoint(point, bounds, canvas);
        if (index === 0) ctx.moveTo(mapped.x, mapped.y);
        else ctx.lineTo(mapped.x, mapped.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  function buildingColor(building, planet, colors, adminEntry) {
    if (adminEntry?.kind === "Staatlich") return "#d59a32";
    if (adminEntry?.kind === "Privatwirtschaftlich") return "#347fbd";
    if (adminEntry?.kind === "Privat") return "#62a46a";

    const height = Number(building.height || building.dimensions?.height || 0);
    const signature = normalize(planet.signature);
    if (signature.includes("shipyard") || signature.includes("foundry") || signature.includes("yard")) {
      if (height > 140) return colorMix(colors.accent, "#ffffff", 0.16);
      if (height > 80) return "#6f8f8c";
      return "#4f6f67";
    }
    if (signature.includes("neon") || signature.includes("underworld") || signature.includes("spiral")) {
      if (height > 150) return "#44d9c9";
      if (height > 85) return "#3486c8";
      return "#5b7fa3";
    }
    if (signature.includes("canal") || signature.includes("marsh")) {
      if (height > 120) return "#9af6ff";
      if (height > 76) return "#49a7bd";
      return "#5e968f";
    }
    if (signature.includes("ruin") || signature.includes("ancient") || signature.includes("royal")) {
      if (height > 110) return "#cdbb7d";
      if (height > 70) return "#6f8f78";
      return "#526d61";
    }
    if (height > 145) return colorMix(colors.light, "#ffffff", 0.3);
    if (height > 85) return "#5ba6d8";
    return "#6aa17c";
  }

  function drawBuildingsTexture(ctx, canvas, planet, model, adminData, colors) {
    const bounds = modelBounds(model);
    const buildings = Array.isArray(model?.buildings) ? model.buildings : [];
    const scale = canvas.width / 1536;
    ctx.save();
    ctx.globalAlpha = 0.82;
    for (const building of buildings) {
      const ring = Array.isArray(building.ring) ? building.ring : [];
      if (ring.length < 3) continue;
      const adminEntry = adminData?.[String(building.id)];
      ctx.fillStyle = buildingColor(building, planet, colors, adminEntry);
      ctx.beginPath();
      ring.forEach((point, index) => {
        const mapped = projectedPoint(point, bounds, canvas);
        if (index === 0) ctx.moveTo(mapped.x, mapped.y);
        else ctx.lineTo(mapped.x, mapped.y);
      });
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = colors.light;
    for (let index = 0; index < buildings.length; index += 19) {
      const building = buildings[index];
      const center = building.position || {};
      const mapped = projectedPoint({ x: center.x, z: center.z }, bounds, canvas);
      const height = Number(building.height || building.dimensions?.height || 0);
      const size = height > 130 ? 0.95 * scale : 0.48 * scale;
      ctx.beginPath();
      ctx.arc(mapped.x, mapped.y, size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLandmarkTexture(ctx, canvas, model, adminData) {
    const bounds = modelBounds(model);
    const buildingById = new Map((model?.buildings || []).map((building) => [String(building.id), building]));
    const entries = Object.entries(adminData || {}).filter(([, entry]) => entry?.name);
    const scale = canvas.width / 1536;
    ctx.save();
    for (const [id, entry] of entries) {
      const building = buildingById.get(id);
      if (!building?.position) continue;
      const mapped = projectedPoint({ x: building.position.x, z: building.position.z }, bounds, canvas);
      ctx.fillStyle = "#f0b94c";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(mapped.x, mapped.y, 6 * scale, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 235, 165, 0.8)";
      ctx.beginPath();
      ctx.arc(mapped.x, mapped.y, 13 * scale, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCityMapTextureCanvas(planet, model, adminData) {
    if (!model?.buildings?.length) return drawTextureCanvas(planet);
    const size = cityTextureSize(model);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const colors = surfacePalette(model.metadata?.profile || planet.profileKey);
    drawModelBackground(ctx, canvas, planet, colors);
    drawBuildingsTexture(ctx, canvas, planet, model, adminData || {}, colors);
    drawStreetTexture(ctx, canvas, model, colors);
    drawSurfaceCorridor(ctx, canvas, planet, model, colors);
    drawLandmarkTexture(ctx, canvas, model, adminData || {});
    ctx.globalAlpha = 1;
    return canvas;
  }

  function pointInPolygon(x, z, ring) {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const point = ring[index];
      const last = ring[previous];
      const intersects = ((point.z > z) !== (last.z > z))
        && (x < ((last.x - point.x) * (z - point.z)) / ((last.z - point.z) || 1) + point.x);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pointSegmentDistanceSq(x, z, a, b) {
    const ax = Number(a?.x || 0);
    const az = Number(a?.z ?? a?.y ?? 0);
    const bx = Number(b?.x || 0);
    const bz = Number(b?.z ?? b?.y ?? 0);
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / lengthSq, 0, 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const ex = x - px;
    const ez = z - pz;
    return ex * ex + ez * ez;
  }

  function ringDistanceSq(x, z, ring) {
    let best = Infinity;
    for (let index = 0; index < ring.length; index += 1) {
      const current = ring[index];
      const next = ring[(index + 1) % ring.length];
      best = Math.min(best, pointSegmentDistanceSq(x, z, current, next));
    }
    return best;
  }

  function buildingBounds(building) {
    const ring = Array.isArray(building?.ring) ? building.ring : [];
    if (!ring.length) return null;
    const xs = ring.map((point) => Number(point.x || 0));
    const zs = ring.map((point) => Number(point.z || 0));
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  function buildingHitRadius(building) {
    const area = Number(building?.dimensions?.footprintArea || 0);
    const width = Number(building?.dimensions?.width || 0);
    const depth = Number(building?.dimensions?.depth || 0);
    const footprint = Math.max(Math.sqrt(Math.max(area, 0)), width, depth);
    return clamp(footprint * 0.72, 12, 34);
  }

  function buildingKind(building, adminEntry) {
    if (adminEntry?.kind) return adminEntry.kind;
    const height = Number(building?.height || building?.dimensions?.height || 0);
    if (height > 150) return "Staatlich";
    if (height > 85) return "Privatwirtschaftlich";
    return "Privat";
  }

  function buildingName(building, adminEntry, planet) {
    if (adminEntry?.name) return adminEntry.name;
    return `Gebaeude ${building.id}`;
  }

  function featureFromBuilding(building, adminEntry, planet, bounds) {
    const height = Math.round(Number(building?.height || building?.dimensions?.height || 0));
    const footprint = Math.round(Number(building?.dimensions?.footprintArea || 0));
    const coords = modelCoordinates(building?.position || {}, bounds);
    const named = Boolean(adminEntry?.name);
    return {
      id: String(building.id),
      kind: buildingKind(building, adminEntry),
      name: buildingName(building, adminEntry, planet),
      description: adminEntry?.description || `Ein einzelnes Gebaeude innerhalb der 3D-Stadtkarte von ${planet.name}.`,
      metrics: [
        height ? `${height} m Hoehe` : "",
        footprint ? `${footprint.toLocaleString("de-DE")} m2 Grundflaeche` : "",
        `X ${Math.round(coords.x)} / Z ${Math.round(coords.z)}`,
      ].filter(Boolean),
      building,
      coords,
      named,
    };
  }

  function createInteractiveIndex(model, adminData, planet) {
    const bounds = modelBounds(model);
    const buildings = (Array.isArray(model?.buildings) ? model.buildings : []).map((building) => ({
      building,
      adminEntry: adminData?.[String(building.id)] || null,
      bounds: buildingBounds(building),
      hitRadius: buildingHitRadius(building),
    })).filter((entry) => entry.bounds && entry.building?.position);
    const landmarks = buildings
      .filter((entry) => entry.adminEntry?.name)
      .map((entry) => featureFromBuilding(entry.building, entry.adminEntry, planet, bounds));
    return { bounds, buildings, landmarks };
  }

  function featureAtCoords(index, coords, planet) {
    if (!index?.buildings?.length) return null;
    let nearest = null;
    let nearestDistanceSq = Infinity;
    for (const entry of index.buildings) {
      const bounds = entry.bounds;
      if (coords.x >= bounds.minX && coords.x <= bounds.maxX && coords.z >= bounds.minZ && coords.z <= bounds.maxZ) {
        if (pointInPolygon(coords.x, coords.z, entry.building.ring || [])) {
          return featureFromBuilding(entry.building, entry.adminEntry, planet, index.bounds);
        }
      }
      const radius = entry.hitRadius || 0;
      if (
        coords.x < bounds.minX - radius ||
        coords.x > bounds.maxX + radius ||
        coords.z < bounds.minZ - radius ||
        coords.z > bounds.maxZ + radius
      ) {
        continue;
      }
      const distanceSq = ringDistanceSq(coords.x, coords.z, entry.building.ring || []);
      if (distanceSq <= radius * radius && distanceSq < nearestDistanceSq) {
        nearest = entry;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest ? featureFromBuilding(nearest.building, nearest.adminEntry, planet, index.bounds) : null;
  }

  function markerColor(kind, colors) {
    if (kind === "Staatlich") return 0xe0a83f;
    if (kind === "Privatwirtschaftlich") return 0x4da9f5;
    if (kind === "Privat") return 0x79c982;
    return Number.parseInt(colors.accent.replace("#", ""), 16) || 0xf0b94c;
  }

  function parseColor(value) {
    const text = String(value || "#ffffff").trim();
    if (text.startsWith("#")) {
      const hex = text.slice(1);
      const expanded = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
      return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16) / 255);
    }
    const channels = text.match(/\d+(\.\d+)?/g);
    if (channels && channels.length >= 3) return channels.slice(0, 3).map((channel) => Number(channel) / 255);
    return [1, 1, 1];
  }

  function createPointSprite(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.32, "rgba(255, 255, 255, 0.78)");
    gradient.addColorStop(0.72, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  function createSurfaceDetailLayer(THREE, model, adminData, planet, colors, sprite) {
    const buildings = Array.isArray(model?.buildings) ? model.buildings : [];
    const bounds = modelBounds(model);
    const positions = [];
    const colorValues = [];
    const maxPoints = Math.max(1, Math.min(buildings.length, 90000));
    const stride = Math.max(1, Math.ceil(buildings.length / maxPoints));

    for (let index = 0; index < buildings.length; index += stride) {
      const building = buildings[index];
      if (!building?.position) continue;
      const height = Number(building.height || building.dimensions?.height || 0);
      const surfaceRadius = 2.015 + clamp(height / 7000, 0, 0.028);
      const point = surfacePointFromModel(THREE, building.position, bounds, surfaceRadius);
      const adminEntry = adminData?.[String(building.id)];
      const rgb = parseColor(buildingColor(building, planet, colors, adminEntry));
      const boost = adminEntry?.name ? 1.26 : height > 130 ? 1.02 : 0.76;
      positions.push(point.x, point.y, point.z);
      colorValues.push(
        clamp(rgb[0] * boost, 0, 1),
        clamp(rgb[1] * boost, 0, 1),
        clamp(rgb[2] * boost, 0, 1)
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorValues, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.66,
      size: 0.012,
      sizeAttenuation: true,
      alphaTest: 0.02,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Points(geometry, material);
  }

  function createDetailPanel(pane) {
    const panel = document.createElement("aside");
    panel.className = "planet-globe-detail";
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <button class="planet-globe-detail-close" type="button" aria-label="Detailfenster schliessen"></button>
      <p class="planet-globe-detail-kicker"></p>
      <h2></h2>
      <p class="planet-globe-detail-description"></p>
      <div class="planet-globe-detail-meta"></div>
    `;
    pane.appendChild(panel);
    const refs = {
      panel,
      close: panel.querySelector(".planet-globe-detail-close"),
      kicker: panel.querySelector(".planet-globe-detail-kicker"),
      title: panel.querySelector("h2"),
      description: panel.querySelector(".planet-globe-detail-description"),
      meta: panel.querySelector(".planet-globe-detail-meta"),
    };
    refs.close.addEventListener("click", () => {
      panel.hidden = true;
      pane.dispatchEvent(new CustomEvent("planet-globe-detail-cleared"));
    });
    return refs;
  }

  function createStarField(THREE, scene, random) {
    const positions = [];
    for (let i = 0; i < 900; i += 1) {
      const radius = 9 + random() * 16;
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      positions.push(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius,
        Math.sin(phi) * Math.sin(theta) * radius
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xbfd9ff, size: 0.025, transparent: true, opacity: 0.7 })
    );
    scene.add(points);
  }

  function configureTexture(texture, renderer, THREE) {
    if (!texture) return;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy?.() || 8, 16);
    texture.minFilter = THREE.LinearMipmapLinearFilter || THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }

  function disposeTree(object) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
  }

  function fetchJson(path, options = {}) {
    if (!window.fetch) return Promise.reject(new Error("Fetch is not available"));
    return window.fetch(path, options).then((response) => {
      if (!response.ok) throw new Error(`${path} could not be loaded`);
      return response.json();
    });
  }

  function loadAdminData() {
    return fetchJson("./data/building-admin-data.json", { cache: "no-cache" }).catch(() => ({}));
  }

  async function ensureCityData() {
    if (window.__planetCityMap?.buildings?.length) {
      return {
        model: window.__planetCityMap,
        adminData: window.__planetCityAdminData || {},
      };
    }
    if (window.__coruscantCityMapFileData?.publicModel?.buildings?.length) {
      window.__planetCityMap = window.__coruscantCityMapFileData.publicModel;
      window.__planetCityAdminData = window.__coruscantCityMapFileData.adminData || {};
      return {
        model: window.__planetCityMap,
        adminData: window.__planetCityAdminData,
      };
    }

    const [model, adminData] = await Promise.all([
      fetchJson("./models/megacity-public.json", { cache: "default" }),
      loadAdminData(),
    ]);
    window.__planetCityMap = model;
    window.__planetCityAdminData = adminData || {};
    window.__coruscantCityMapFileData = {
      ...(window.__coruscantCityMapFileData || {}),
      publicModel: model,
      adminData: window.__planetCityAdminData,
    };
    window.dispatchEvent(new CustomEvent("planet-city-map:model-ready", {
      detail: { model, adminData: window.__planetCityAdminData },
    }));
    return { model, adminData: window.__planetCityAdminData };
  }

  async function bootstrapGlobe() {
    const pane = document.getElementById("planetGlobePane");
    const canvas = document.getElementById("planetGlobeCanvas");
    const twoD = document.querySelector("[data-planet-view='2d']");
    const threeD = document.querySelector("[data-planet-view='3d']");
    const zoomButtons = Array.from(document.querySelectorAll("[data-planet-zoom]"));
    const hudTitle = document.getElementById("planetGlobeTitle");
    const hudMeta = document.getElementById("planetGlobeMeta");
    const THREE = window.THREE;
    if (!pane || !canvas || !twoD || !threeD || !THREE) return;
    if (pane.dataset.globeReady === "true") return;
    pane.dataset.globeReady = "true";

    const planet = spec();
    const cityData = await ensureCityData().catch((error) => {
      console.warn(error);
      return { model: window.__planetCityMap, adminData: window.__planetCityAdminData || {} };
    });
    const initialModel = cityData.model;
    const initialAdminData = cityData.adminData || {};
    const random = rngFromSeed(planet.seed ^ 0x633d);
    if (hudTitle) hudTitle.textContent = planet.name;
    if (hudMeta) {
      const facts = [
        planet.profileKey ? `Profil: ${planet.profileKey}` : "",
        planet.grid ? `Grid ${planet.grid}` : "",
        planet.region,
        planet.populationText,
      ].filter(Boolean);
      hudMeta.textContent = facts.join(" | ");
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    const qualityRatio = Math.max(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(Math.min(qualityRatio, 3));
    window.__planetGlobeTextureLimit = renderer.capabilities.maxTextureSize || 4096;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050912);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 6.4);

    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const sun = new THREE.DirectionalLight(0xffffff, 1.55);
    sun.position.set(3, 4, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7dd8ff, 0.9);
    rim.position.set(-4, 1, -3);
    scene.add(rim);

    const texture = new THREE.CanvasTexture(drawCityMapTextureCanvas(planet, initialModel, initialAdminData));
    configureTexture(texture, renderer, THREE);
    const palette = surfacePalette(planet.profileKey);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 256, 128),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.62,
        metalness: planet.profileKey === "industrial" || planet.profileKey === "underworld" ? 0.48 : 0.3,
        emissive: new THREE.Color(palette.glow),
        emissiveMap: texture,
        emissiveIntensity: planet.profileKey === "underworld" ? 0.18 : 0.1,
      })
    );
    root.add(sphere);
    root.rotation.x = -0.08;
    root.rotation.y = -0.34;

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.07, 192, 96),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.glow),
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    root.add(atmosphere);

    const markerGroup = new THREE.Group();
    root.add(markerGroup);
    const detailGroup = new THREE.Group();
    root.add(detailGroup);
    const pointSprite = createPointSprite(THREE);
    createStarField(THREE, scene, random);

    let active = false;
    let frame = 0;
    const defaultZoom = 7.2;
    let zoom = defaultZoom;
    let fitZoom = defaultZoom;
    let userZoomed = false;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragDistance = 0;
    let interactiveIndex = createInteractiveIndex(initialModel, initialAdminData, planet);
    let markerMeshes = [];
    let surfaceDetailLayer = null;
    let selectedFeatureId = "";
    let textureKey = "";
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const detail = createDetailPanel(pane);
    const markerGeometry = new THREE.SphereGeometry(0.036, 18, 10);
    const markerHaloGeometry = new THREE.TorusGeometry(0.076, 0.007, 8, 28);
    const markerNormal = new THREE.Vector3(0, 0, 1);
    const worldPosition = new THREE.Vector3();
    const worldCenter = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const projectedMarker = new THREE.Vector3();

    function renderScene() {
      camera.position.z = zoom;
      renderer.render(scene, camera);
    }

    function setZoom(nextZoom) {
      userZoomed = true;
      zoom = clamp(nextZoom, 3.05, 18);
      renderScene();
    }

    function resetZoom() {
      userZoomed = false;
      zoom = Math.max(defaultZoom, fitZoom);
      renderScene();
    }

    function disposeObject(object) {
      if (object.geometry && object.geometry !== markerGeometry && object.geometry !== markerHaloGeometry) {
        object.geometry.dispose();
      }
      if (object.material) object.material.dispose();
    }

    function clearMarkers() {
      markerMeshes = [];
      while (markerGroup.children.length) {
        const child = markerGroup.children.pop();
        child.traverse(disposeObject);
      }
    }

    function rebuildSurfaceDetails(model, adminData) {
      if (surfaceDetailLayer) {
        detailGroup.remove(surfaceDetailLayer);
        disposeTree(surfaceDetailLayer);
        surfaceDetailLayer = null;
      }
      if (!model?.buildings?.length) return;
      surfaceDetailLayer = createSurfaceDetailLayer(THREE, model, adminData || {}, planet, palette, pointSprite);
      detailGroup.add(surfaceDetailLayer);
    }

    function featureForObject(object) {
      let current = object;
      while (current) {
        if (current.userData?.feature) return current.userData.feature;
        current = current.parent;
      }
      return null;
    }

    function updateMarkerSelection(featureId) {
      selectedFeatureId = featureId || "";
      for (const marker of markerGroup.children) {
        const selected = marker.userData?.feature?.id === selectedFeatureId;
        marker.scale.setScalar(selected ? 1.58 : 1);
        marker.children.forEach((child) => {
          if (!child.material) return;
          child.material.opacity = selected ? 1 : Number(child.userData.defaultOpacity || 0.86);
        });
      }
      renderScene();
    }

    function hideFeature() {
      detail.panel.hidden = true;
      updateMarkerSelection("");
    }

    function showFeature(feature) {
      if (!feature) {
        hideFeature();
        return;
      }
      detail.kicker.textContent = feature.kind || "Gebaeude";
      detail.title.textContent = feature.name || "Unbenannter Knoten";
      detail.description.textContent = feature.description || "";
      detail.meta.replaceChildren();
      (feature.metrics || []).forEach((metric) => {
        const chip = document.createElement("span");
        chip.textContent = metric;
        detail.meta.appendChild(chip);
      });
      detail.panel.hidden = false;
      updateMarkerSelection(feature.id);
    }

    function rebuildMarkers() {
      clearMarkers();
      if (!interactiveIndex?.landmarks?.length) return;
      const bounds = interactiveIndex.bounds;
      interactiveIndex.landmarks.forEach((feature) => {
        const color = markerColor(feature.kind, palette);
        const position = surfacePointFromModel(THREE, feature.coords, bounds, 2.105);
        const normal = position.clone().normalize();
        const group = new THREE.Group();
        group.position.copy(position);
        group.userData.feature = feature;

        const dotMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.96,
          depthTest: true,
        });
        const dot = new THREE.Mesh(markerGeometry, dotMaterial);
        dot.userData.feature = feature;
        dot.userData.defaultOpacity = 0.96;
        group.add(dot);

        const haloMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.56,
          depthTest: true,
          side: THREE.DoubleSide,
        });
        const halo = new THREE.Mesh(markerHaloGeometry, haloMaterial);
        halo.quaternion.setFromUnitVectors(markerNormal, normal);
        halo.userData.feature = feature;
        halo.userData.defaultOpacity = 0.56;
        group.add(halo);

        markerGroup.add(group);
        markerMeshes.push(dot, halo);
      });
      if (selectedFeatureId) updateMarkerSelection(selectedFeatureId);
    }

    function rebuildInteractiveLayer(model, adminData) {
      if (!model?.buildings?.length) return;
      interactiveIndex = createInteractiveIndex(model, adminData || {}, planet);
      rebuildSurfaceDetails(model, adminData || {});
      rebuildMarkers();
    }

    function mapTextureKey(model) {
      const metadata = model?.metadata || {};
      return [
        metadata.modelId || metadata.planetName || "",
        metadata.buildingCount || model?.buildings?.length || 0,
        metadata.streetCount || modelStreets(model).length || 0,
        metadata.seed || "",
      ].join("|");
    }

    function applyMapTexture(model, adminData) {
      if (!model?.buildings?.length) return;
      const nextKey = mapTextureKey(model);
      if (nextKey === textureKey) return;
      textureKey = nextKey;
      texture.image = drawCityMapTextureCanvas(planet, model, adminData || {});
      configureTexture(texture, renderer, THREE);
      texture.needsUpdate = true;
      rebuildInteractiveLayer(model, adminData || {});
      renderScene();
    }

    function pointerFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function screenMarkerFeature(event) {
      const rect = canvas.getBoundingClientRect();
      root.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      root.getWorldPosition(worldCenter);
      camera.getWorldPosition(cameraWorldPosition);
      let closest = null;
      let closestDistance = Infinity;
      for (const marker of markerGroup.children) {
        const feature = marker.userData?.feature;
        if (!feature) continue;
        marker.getWorldPosition(worldPosition);
        const normal = worldPosition.clone().sub(worldCenter).normalize();
        const toCamera = cameraWorldPosition.clone().sub(worldPosition).normalize();
        if (normal.dot(toCamera) < 0.1) continue;
        projectedMarker.copy(worldPosition).project(camera);
        if (projectedMarker.z < -1 || projectedMarker.z > 1) continue;
        const x = rect.left + ((projectedMarker.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - projectedMarker.y) / 2) * rect.height;
        const dx = event.clientX - x;
        const dy = event.clientY - y;
        const distance = Math.hypot(dx, dy);
        if (distance < 34 && distance < closestDistance) {
          closest = feature;
          closestDistance = distance;
        }
      }
      return closest;
    }

    function pickFeature(event) {
      if (!active) return null;
      const markerFeature = screenMarkerFeature(event);
      if (markerFeature) return markerFeature;
      pointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([sphere, ...markerMeshes], true);
      for (const hit of hits) {
        const markerFeature = featureForObject(hit.object);
        if (markerFeature) return markerFeature;
        if (hit.object === sphere && hit.uv && interactiveIndex) {
          return featureAtCoords(interactiveIndex, uvToCoords(hit.uv, interactiveIndex.bounds), planet);
        }
      }
      return null;
    }

    function resize() {
      const width = Math.max(1, pane.clientWidth);
      const height = Math.max(1, pane.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const fovRadians = (camera.fov * Math.PI) / 180;
      const verticalFit = 2.42 / Math.tan(fovRadians / 2);
      const horizontalFit = 2.42 / (Math.tan(fovRadians / 2) * Math.max(0.2, camera.aspect));
      fitZoom = Math.max(verticalFit, horizontalFit, 7.2);
      if (!userZoomed) zoom = Math.max(defaultZoom, fitZoom);
      if (active) renderScene();
    }

    function render() {
      if (!active) return;
      renderScene();
      frame = 0;
    }

    function setMode(mode) {
      active = mode === "3d";
      pane.hidden = !active;
      document.body.classList.toggle("is-globe-mode", active);
      twoD.classList.toggle("is-active", !active);
      threeD.classList.toggle("is-active", active);
      twoD.setAttribute("aria-pressed", active ? "false" : "true");
      threeD.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) {
        resize();
        if (!frame) frame = window.requestAnimationFrame(render);
      } else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    twoD.addEventListener("click", () => setMode("2d"));
    threeD.addEventListener("click", () => setMode("3d"));
    zoomButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.planetZoom;
        if (action === "in") setZoom(zoom - 0.82);
        else if (action === "out") setZoom(zoom + 0.82);
        else resetZoom();
      });
    });
    pane.addEventListener("planet-globe-detail-cleared", () => updateMarkerSelection(""));
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      dragDistance = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      root.rotation.y += dx * 0.006;
      root.rotation.x += dy * 0.004;
      root.rotation.x = Math.max(-0.82, Math.min(0.82, root.rotation.x));
      lastX = event.clientX;
      lastY = event.clientY;
      renderScene();
    });
    canvas.addEventListener("pointerup", (event) => {
      const wasClick = dragDistance < 8;
      dragging = false;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (wasClick) showFeature(pickFeature(event));
    });
    canvas.addEventListener("pointercancel", (event) => {
      dragging = false;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      setZoom(zoom + Math.sign(event.deltaY) * 0.42);
    }, { passive: false });

    canvas.style.cursor = "grab";
    rebuildSurfaceDetails(initialModel, initialAdminData);
    rebuildMarkers();
    resize();
    renderScene();
    window.addEventListener("planet-city-map:model-ready", (event) => {
      applyMapTexture(event.detail?.model, event.detail?.adminData);
    });
    window.setTimeout(() => applyMapTexture(window.__planetCityMap, window.__planetCityAdminData), 2500);
    window.setTimeout(() => applyMapTexture(window.__planetCityMap, window.__planetCityAdminData), 7000);
    window.__ecumenopolisGlobeDebug = {
      renderer,
      scene,
      camera,
      root,
      markerGroup,
      detailGroup,
      setMode,
      render: renderScene,
      applyMapTexture,
      pickFeature,
      getInteractiveIndex: () => interactiveIndex,
    };
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (window.THREE) {
      bootstrapGlobe().catch((error) => console.warn(error));
      return;
    }
    const wait = window.setInterval(() => {
      if (!window.THREE) return;
      window.clearInterval(wait);
      bootstrapGlobe().catch((error) => console.warn(error));
    }, 40);
    window.setTimeout(() => window.clearInterval(wait), 5000);
  });
})();
