const { getJson, setJson } = require("../_lib/store.js");
const { requireAdminAuth } = require("../_lib/auth.js");
const DEFAULT_DATA = require("../../faction-territories.json");

const KEY = "faction-territories-v1";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_PAYLOAD_CHARS = 5_000_000;

function cleanText(value, fallback = "", max = 160) {
  return String(value == null ? "" : value).trim().slice(0, max) || fallback;
}

function point(value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < -0.25 || x > 1.25 || y < -0.25 || y > 1.25) {
    throw new Error("Pfadpunkt außerhalb des zulässigen Kartenbereichs.");
  }
  return { x, y };
}

function normalizeNode(value) {
  const anchor = point(value?.anchor || value);
  const inHandle = value?.in ? point(value.in) : null;
  const outHandle = value?.out ? point(value.out) : null;
  return {
    anchor,
    in: inHandle,
    out: outHandle,
    nodeType: ["smooth", "symmetric", "sharp"].includes(value?.nodeType) ? value.nodeType : "smooth",
  };
}

function normalizeData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Ungültiges Gebietsdokument.");
  const factions = (Array.isArray(raw.factions) ? raw.factions : []).slice(0, 32).map((entry, index) => {
    const id = cleanText(entry?.id, `faction-${index + 1}`, 64);
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) throw new Error(`Ungültige Fraktionskennung: ${id}.`);
    const color = String(entry?.color || "").toLowerCase();
    if (!HEX_COLOR.test(color)) throw new Error(`Ungültige Hauptfarbe für ${id}.`);
    const secondaryColor = String(entry?.secondaryColor || color).toLowerCase();
    if (!HEX_COLOR.test(secondaryColor)) throw new Error(`Ungültige Sekundärfarbe für ${id}.`);
    return {
      id,
      name: cleanText(entry?.name, id, 120),
      color,
      secondaryColor,
      bannerUrl: cleanText(entry?.bannerUrl, "", 1200),
      scope: ["government", "underworld", "both"].includes(entry?.scope) ? entry.scope : "both",
      visible: entry?.visible !== false,
      locked: Boolean(entry?.locked),
    };
  });
  const factionIds = new Set(factions.map((entry) => entry.id));
  const territories = (Array.isArray(raw.territories) ? raw.territories : []).slice(0, 500).map((entry, index) => {
    const points = (Array.isArray(entry?.points) ? entry.points : []).slice(0, 2000).map(normalizeNode);
    if (points.length < 3) throw new Error(`Gebiet ${index + 1} benötigt mindestens drei Ankerpunkte.`);
    const factionId = cleanText(entry?.factionId);
    if (!factionIds.has(factionId)) throw new Error(`Ungültige Fraktion für Gebiet ${index + 1}.`);
    const fillColor = String(entry?.fillColor || factions.find((candidate) => candidate.id === factionId)?.color || "").toLowerCase();
    if (!HEX_COLOR.test(fillColor)) throw new Error(`Ungültige Füllfarbe für Gebiet ${index + 1}.`);
    const strokeColor = String(entry?.strokeColor || "").toLowerCase();
    if (!HEX_COLOR.test(strokeColor)) throw new Error(`Ungültige Linienfarbe für Gebiet ${index + 1}.`);
    return {
      id: cleanText(entry?.id, `territory-${index + 1}`, 80),
      name: cleanText(entry?.name, `Gebiet ${index + 1}`, 120),
      factionId,
      points,
      closed: true,
      fillColor,
      fillOpacity: Math.max(0, Math.min(1, Number(entry?.fillOpacity ?? 0.25) || 0)),
      strokeColor,
      strokeWidth: Math.max(0.2, Math.min(24, Number(entry?.strokeWidth ?? 2) || 2)),
      visible: entry?.visible !== false,
      locked: Boolean(entry?.locked),
      assignmentEnabled: entry?.assignmentEnabled !== false,
      zIndex: Math.max(-10000, Math.min(10000, Number(entry?.zIndex ?? index) || 0)),
    };
  });
  const images = (Array.isArray(raw.images) ? raw.images : []).slice(0, 100).map((entry, index) => {
    const factionId = cleanText(entry?.factionId);
    if (factionId && !factionIds.has(factionId)) throw new Error(`Ungültige Fraktion für Grafik ${index + 1}.`);
    const x = Number(entry?.x);
    const y = Number(entry?.y);
    const width = Number(entry?.width);
    const height = Number(entry?.height);
    const rotation = Number(entry?.rotation || 0);
    const opacity = Number(entry?.opacity ?? 1);
    if (![x, y, width, height, rotation, opacity].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error(`Ungültige Position oder Größe für Grafik ${index + 1}.`);
    }
    const url = cleanText(entry?.url, "", 4_000_000);
    if (!url || !(url.startsWith("https://") || url.startsWith("/assets/") || /^data:image\/(?:png|webp|jpeg);base64,/.test(url))) {
      throw new Error(`Ungültige Bildquelle für Grafik ${index + 1}.`);
    }
    return {
      id: cleanText(entry?.id, `image-${index + 1}`, 80),
      name: cleanText(entry?.name, "Fraktionsgrafik", 160),
      filename: cleanText(entry?.filename, "", 160),
      factionId,
      layerId: cleanText(entry?.layerId, "banners", 64),
      url,
      x,
      y,
      width: Math.min(2, width),
      height: Math.min(2, height),
      rotation: ((rotation % 360) + 360) % 360,
      opacity: Math.max(0, Math.min(1, opacity)),
      visible: entry?.visible !== false,
      locked: Boolean(entry?.locked),
      zIndex: Math.max(-10000, Math.min(10000, Number(entry?.zIndex ?? index) || 0)),
    };
  });
  const layers = (Array.isArray(raw.layers) ? raw.layers : DEFAULT_DATA.layers).slice(0, 32).map((entry, index) => ({
    id: cleanText(entry?.id, `layer-${index + 1}`, 64),
    type: cleanText(entry?.type, "territories", 40),
    name: cleanText(entry?.name, `Ebene ${index + 1}`, 120),
    visible: entry?.visible !== false,
    locked: Boolean(entry?.locked),
    opacity: Math.max(0, Math.min(100, Number(entry?.opacity ?? 100) || 0)),
    order: Math.max(-10000, Math.min(10000, Number(entry?.order ?? index) || 0)),
  }));
  const territoryBootstrapFactions = Array.isArray(raw.territoryBootstrapFactions)
    ? [...new Set(raw.territoryBootstrapFactions.map((id) => String(id || "").trim().toLowerCase()).filter((id) => factionIds.has(id)))].slice(0, 32)
    : [];
  return { version: 1, factions, territories, images, layers, territoryBootstrapFactions };
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const data = await getJson(KEY);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ data: data ? normalizeData(data) : DEFAULT_DATA });
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ data: DEFAULT_DATA, warning: "Territorien-Speicher nicht verbunden." });
    }
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdminAuth(req, res)) return;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  let rawSize = 0;
  try { rawSize = JSON.stringify(body.data || {}).length; } catch (_error) { rawSize = MAX_PAYLOAD_CHARS + 1; }
  if (rawSize > MAX_PAYLOAD_CHARS) {
    res.status(413).json({ error: "Gebietsdaten überschreiten die maximale Größe." });
    return;
  }
  let data;
  try {
    data = normalizeData(body.data);
  } catch (error) {
    res.status(400).json({ error: String(error?.message || error) });
    return;
  }
  try {
    await setJson(KEY, data);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("[faction-territories] save failed:", error?.message || error);
    res.status(503).json({ error: `Territorien-Speicher nicht verfügbar: ${String(error?.message || error)}` });
  }
};
