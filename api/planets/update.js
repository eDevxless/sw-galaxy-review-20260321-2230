const { getJson, setJson } = require("../_lib/store.js");
const { requireAdminAuth } = require("../_lib/auth.js");
const { createNewsItem, newsSignature } = require("../_lib/news-data.js");

const KEY = "planet-overrides";
const ALLOWED_FIELDS = new Set([
  "faction",
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
  "underworld_faction",
]);
const ALLOWED_FACTIONS = new Set(["republic", "separatist", "blacksun", "hutt", "pyke", "ohnaka", "neutral", ""]);
const ALLOWED_UNDERWORLD_FACTIONS = new Set(["blacksun", "hutt", "pyke", "ohnaka", "neutral", ""]);

function eventNewsFields(planetName, eventFields) {
  const title = String(eventFields.event_title || "").trim();
  const text = String(eventFields.event_text || "").trim();
  const imageUrl = String(eventFields.event_image || "").trim();
  const displayTitle = title || `Aktives Event auf ${planetName}`;
  const bodyParts = [
    `Auf ${planetName} wurde ein RPG-Event gestartet.`,
    text,
  ].filter(Boolean);
  return {
    title: `RPG-Event: ${displayTitle}`,
    body: bodyParts.join("\n\n"),
    imageUrl,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdminAuth(req, res)) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { name, fields, action } = body;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Planet name required" });
    return;
  }
  const planetName = name.trim();

  try {
    const all = (await getJson(KEY)) || {};

    if (action === "delete") {
      delete all[planetName];
      await setJson(KEY, all);
      res.status(200).json({ ok: true, planet: null });
      return;
    }

    if (!fields || typeof fields !== "object") {
      res.status(400).json({ error: "fields object required" });
      return;
    }

    const current = all[planetName] || {};
    const next = { ...current };
    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      if (value === null || value === undefined) {
        delete next[key];
        continue;
      }
      if (key === "faction" || key === "underworld_faction") {
        const v = String(value).toLowerCase().trim();
        const allowed = key === "underworld_faction" ? ALLOWED_UNDERWORLD_FACTIONS : ALLOWED_FACTIONS;
        if (!allowed.has(v)) continue;
        if (!v) {
          delete next[key];
        } else {
          next[key] = v;
        }
        continue;
      }
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed) {
        delete next[key];
      } else {
        next[key] = trimmed;
      }
    }

    const eventActive = Boolean(next.event_title || next.event_text || next.event_image);
    let newsItem = null;
    if (eventActive) {
      const newsFields = eventNewsFields(planetName, next);
      const signature = newsSignature(newsFields);
      if (signature !== current.event_news_signature) {
        const result = await createNewsItem(newsFields);
        newsItem = result.item;
        next.event_news_id = newsItem.id;
        next.event_news_signature = signature;
      }
    } else {
      delete next.event_news_id;
      delete next.event_news_signature;
    }

    if (Object.keys(next).length === 0) {
      delete all[planetName];
    } else {
      all[planetName] = next;
    }
    await setJson(KEY, all);
    res.status(200).json({ ok: true, planet: all[planetName] || null, newsItem });
  } catch (e) {
    res.status(500).json({
      error: "Save failed",
      detail: String(e?.message || e),
    });
  }
};
