const { list, put } = require("@vercel/blob");

const STORE_PREFIX = "map-store/";

function blobPrefix(key) {
  return `${STORE_PREFIX}${encodeURIComponent(String(key))}-`;
}

function blobPath(key) {
  return `${blobPrefix(key)}${Date.now()}.json`;
}

async function latestBlob(key) {
  const result = await list({ prefix: blobPrefix(key), limit: 1000 });
  return (result.blobs || [])
    .sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt))[0] || null;
}

async function getJson(key) {
  const blob = await latestBlob(key);
  if (!blob) return null;

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Stored map data could not be read (${response.status}).`);
  return response.json();
}

async function setJson(key, value) {
  await put(blobPath(key), JSON.stringify(value), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
  });
}

module.exports = { getJson, setJson };
