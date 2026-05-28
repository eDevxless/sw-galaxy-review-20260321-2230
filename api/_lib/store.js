const { createClient } = require("redis");

let client = null;
let connecting = null;

function getRedisUrl() {
  return (
    process.env.REDIS_URL ||
    process.env.KV_URL ||
    process.env.UPSTASH_REDIS_URL ||
    null
  );
}

async function getClient() {
  const url = getRedisUrl();
  if (!url) {
    throw new Error(
      "REDIS_URL not set. Connect a Redis database to this Vercel project."
    );
  }
  if (client && client.isReady) return client;
  if (!client) {
    client = createClient({
      url,
      socket: {
        connectTimeout: 8000,
        reconnectStrategy: false,
      },
    });
    client.on("error", (err) => {
      // Only log; let calls fail loudly when used.
      console.error("[redis] client error:", err?.message || err);
    });
  }
  if (!client.isOpen) {
    if (!connecting) {
      connecting = client.connect().catch((err) => {
        connecting = null;
        throw err;
      });
    }
    await connecting;
    connecting = null;
  }
  return client;
}

async function getJson(key) {
  const c = await getClient();
  const raw = await c.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

async function setJson(key, value) {
  const c = await getClient();
  await c.set(key, JSON.stringify(value));
}

module.exports = { getClient, getJson, setJson };
