const { put } = require("@vercel/blob");
const { requireAdminAuth } = require("../_lib/auth.js");

const MAX_BYTES = 5 * 1024 * 1024;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdminAuth(req, res)) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { filename, dataUrl } = body;
  if (typeof filename !== "string" || !filename.trim()) {
    res.status(400).json({ error: "filename required" });
    return;
  }
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    res.status(400).json({ error: "dataUrl required" });
    return;
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: "Invalid dataUrl format" });
    return;
  }
  const contentType = match[1];
  if (!/^image\//.test(contentType)) {
    res.status(400).json({ error: "Only image/* uploads allowed" });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch (_error) {
    res.status(400).json({ error: "Invalid base64 payload" });
    return;
  }
  if (buffer.length > MAX_BYTES) {
    res.status(413).json({ error: `File too large (${buffer.length} > ${MAX_BYTES})` });
    return;
  }

  const safeName = String(filename).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  try {
    const blob = await put(`news/${safeName}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    res.status(200).json({ url: blob.url, contentType, size: buffer.length });
  } catch (error) {
    res.status(500).json({ error: "Upload failed", detail: String(error?.message || error) });
  }
};
