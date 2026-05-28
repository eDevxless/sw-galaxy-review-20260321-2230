const { requireAdminAuth } = require("./_lib/auth.js");
const { cleanString, createNewsItem, deleteNewsItem, readNewsItems } = require("./_lib/news-data.js");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const items = await readNewsItems();
      res.setHeader("Cache-Control", "public, max-age=10, s-maxage=30");
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({ error: "News konnten nicht geladen werden", detail: String(error?.message || error) });
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
  const action = cleanString(body.action, 20) || "create";

  try {
    if (action === "delete") {
      const next = await deleteNewsItem(body.id);
      res.status(200).json({ ok: true, items: next });
      return;
    }

    const title = cleanString(body.title, 160);
    const text = cleanString(body.body || body.text, 8000);
    const imageUrl = cleanString(body.imageUrl || body.image, 1200);
    if (!title && !text) {
      res.status(400).json({ error: "Titel oder Text erforderlich" });
      return;
    }

    const result = await createNewsItem({ title, body: text, imageUrl });
    res.status(200).json({ ok: true, item: result.item, items: result.items });
  } catch (error) {
    res.status(500).json({ error: "News konnten nicht gespeichert werden", detail: String(error?.message || error) });
  }
};
