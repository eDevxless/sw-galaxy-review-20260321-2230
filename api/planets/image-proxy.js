const dns = require("dns").promises;
const net = require("net");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function isPrivateIp(address) {
  if (!address) return true;
  if (address === "::1") return true;
  if (address.startsWith("127.") || address.startsWith("10.") || address.startsWith("169.254.")) return true;
  if (/^192\.168\./.test(address)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return true;
  if (/^(fc|fd)/i.test(address)) return true;
  return false;
}

async function assertSafeHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch (_error) {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https image URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local URLs are not allowed");
  }
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Private network URLs are not allowed");
  }
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("Private network URLs are not allowed");
    }
  } catch (error) {
    if (/Private network/.test(String(error?.message || ""))) throw error;
    throw new Error("Could not resolve image host");
  }
  return parsed;
}

async function fetchWithTimeout(url, accept) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: {
        Accept: accept,
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function responseBuffer(response, maxBytes) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length && length > maxBytes) {
    throw new Error("Remote file is too large");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new Error("Remote file is too large");
  }
  return buffer;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMetaContent(html, names) {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const reversedPattern = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern) || html.match(reversedPattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return "";
}

function firstImageUrlFromHtml(html, baseUrl) {
  const metaUrl = firstMetaContent(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  const imageUrl =
    metaUrl ||
    decodeHtmlEntities(html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]) ||
    decodeHtmlEntities(html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1]);
  if (!imageUrl) return "";
  try {
    return new URL(imageUrl, baseUrl).toString();
  } catch (_error) {
    return "";
  }
}

async function fetchImage(url, allowHtmlResolve) {
  const parsed = await assertSafeHttpUrl(url);
  const response = await fetchWithTimeout(parsed.toString(), "image/*,text/html;q=0.8,*/*;q=0.2");
  if (!response.ok) {
    throw new Error(`Remote server returned ${response.status}`);
  }

  const contentType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (contentType.startsWith("image/")) {
    return {
      buffer: await responseBuffer(response, MAX_IMAGE_BYTES),
      contentType,
    };
  }

  if (allowHtmlResolve && /^(text\/html|application\/xhtml\+xml)$/.test(contentType)) {
    const html = (await responseBuffer(response, MAX_HTML_BYTES)).toString("utf8");
    const imageUrl = firstImageUrlFromHtml(html, parsed.toString());
    if (imageUrl && imageUrl !== parsed.toString()) {
      return fetchImage(imageUrl, false);
    }
  }

  throw new Error("URL does not point to an image");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawUrl = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
    const image = await fetchImage(rawUrl, true);
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).send(image.buffer);
  } catch (error) {
    res.status(415).json({
      error: "Image could not be loaded",
      detail: String(error?.message || error),
    });
  }
};
