const { getJson } = require("../_lib/store.js");

const KEY = "planet-overrides";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const data = (await getJson(KEY)) || {};
    res.setHeader("Cache-Control", "public, max-age=10, s-maxage=30");
    res.status(200).json({ overrides: data });
  } catch (e) {
    res.status(500).json({
      error: "Failed to load overrides",
      detail: String(e?.message || e),
    });
  }
};
