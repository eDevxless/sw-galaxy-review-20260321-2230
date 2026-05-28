const crypto = require("crypto");
const { getJson, setJson } = require("./store.js");

const NEWS_KEY = "news-items-v1";
const MAX_NEWS_ITEMS = 80;

function cleanString(value, max = 5000) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function publicNewsItem(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = cleanString(entry.id, 120);
  const title = cleanString(entry.title, 160);
  const body = cleanString(entry.body, 8000);
  if (!id || (!title && !body)) return null;
  return {
    id,
    title: title || "Ankuendigung",
    body,
    imageUrl: cleanString(entry.imageUrl, 1200),
    createdAt: cleanString(entry.createdAt, 40),
    updatedAt: cleanString(entry.updatedAt, 40),
  };
}

function sortNewsItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(publicNewsItem)
    .filter(Boolean)
    .sort((left, right) => {
      const rightTime = Date.parse(right.createdAt || right.updatedAt || "") || 0;
      const leftTime = Date.parse(left.createdAt || left.updatedAt || "") || 0;
      return rightTime - leftTime;
    })
    .slice(0, MAX_NEWS_ITEMS);
}

async function readNewsItems() {
  const data = (await getJson(NEWS_KEY)) || [];
  return sortNewsItems(Array.isArray(data) ? data : []);
}

async function writeNewsItems(items) {
  const next = sortNewsItems(items);
  await setJson(NEWS_KEY, next);
  return next;
}

async function createNewsItem(fields = {}) {
  const now = new Date().toISOString();
  const item = publicNewsItem({
    id: `news-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
    title: cleanString(fields.title, 160) || "Ankuendigung",
    body: cleanString(fields.body || fields.text, 8000),
    imageUrl: cleanString(fields.imageUrl || fields.image, 1200),
    createdAt: now,
    updatedAt: now,
  });
  if (!item) {
    throw new Error("Titel oder Text erforderlich");
  }
  const items = await readNewsItems();
  const next = await writeNewsItems([item, ...items]);
  return { item, items: next };
}

async function deleteNewsItem(id) {
  const newsId = cleanString(id, 120);
  const items = await readNewsItems();
  return writeNewsItems(items.filter((item) => item.id !== newsId));
}

function newsSignature(fields = {}) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: cleanString(fields.title, 220),
        body: cleanString(fields.body || fields.text, 10000),
        imageUrl: cleanString(fields.imageUrl || fields.image, 1400),
      })
    )
    .digest("hex")
    .slice(0, 24);
}

module.exports = {
  cleanString,
  publicNewsItem,
  readNewsItems,
  writeNewsItems,
  createNewsItem,
  deleteNewsItem,
  newsSignature,
};
