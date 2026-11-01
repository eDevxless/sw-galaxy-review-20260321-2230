const { put } = require("@vercel/blob");
const { requireAdminAuth } = require("../_lib/auth.js");

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT = new Map([
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
]);

function matchesMime(buffer, mime) {
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdminAuth(req, res)) return;
  const { filename, dataUrl } = req.body && typeof req.body === "object" ? req.body : {};
  if (typeof filename !== "string" || typeof dataUrl !== "string" || dataUrl.length > Math.ceil(MAX_BYTES * 1.4)) {
    res.status(400).json({ error: "Dateiname und Bilddaten bis 5 MB werden benötigt." });
    return;
  }
  const match = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: "Erlaubt sind PNG-, WebP- und JPEG-Bilder." });
    return;
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_BYTES || !matchesMime(buffer, mime)) {
    res.status(400).json({ error: "Die Bilddaten passen nicht zum Dateiformat oder überschreiten 5 MB." });
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: "Banner-Upload ist nicht konfiguriert (Vercel Blob)." });
    return;
  }
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || `banner.${MIME_EXT.get(mime)}`;
  try {
    const blob = await put(`factions/${safeName}`, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    });
    res.status(200).json({ url: blob.url, contentType: mime, size: buffer.length });
  } catch (error) {
    res.status(500).json({ error: "Banner-Upload fehlgeschlagen.", detail: String(error?.message || error) });
  }
};
