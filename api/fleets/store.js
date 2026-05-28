const { requireAuth, isAdminPayload } = require("../_lib/auth.js");
const {
  publicUser,
  defaultFleetStore,
  normalizeFleetStore,
  getUsers,
  getStores,
  setStores,
  fleetStoreStats,
} = require("../_lib/fleet-data.js");

function currentUserId(payload) {
  return String(payload?.sub || "").trim();
}

module.exports = async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const users = await getUsers();
    const stores = await getStores();
    const admin = isAdminPayload(payload);

    if (req.method === "GET") {
      if (admin && String(req.query?.all || "") === "1") {
        const result = Object.values(users)
          .map((user) => {
            const store = normalizeFleetStore(stores[user.id] || defaultFleetStore());
            return {
              user: publicUser(user),
              store,
              stats: fleetStoreStats(store),
            };
          })
          .sort((left, right) => left.user.username.localeCompare(right.user.username));
        res.status(200).json({ users: result });
        return;
      }

      const requestedUserId = String(req.query?.userId || "").trim();
      const userId = admin && requestedUserId ? requestedUserId : currentUserId(payload);
      if (!admin && userId !== currentUserId(payload)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!admin && !users[userId]) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const store = normalizeFleetStore(stores[userId] || defaultFleetStore());
      stores[userId] = store;
      await setStores(stores);
      res.status(200).json({
        user: publicUser(users[userId]) || { id: userId, username: userId, role: admin ? "admin-target" : "user" },
        store,
        stats: fleetStoreStats(store),
      });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const requestedUserId = String(body.userId || req.query?.userId || "").trim();
      const userId = admin && requestedUserId ? requestedUserId : currentUserId(payload);
      if (!admin && userId !== currentUserId(payload)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!admin && !users[userId]) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const store = normalizeFleetStore(body.store);
      stores[userId] = store;
      await setStores(stores);
      res.status(200).json({
        ok: true,
        user: publicUser(users[userId]) || { id: userId, username: userId, role: admin ? "admin-target" : "user" },
        store,
        stats: fleetStoreStats(store),
      });
      return;
    }

    res.setHeader("Allow", "GET, PUT, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({
      error: "Fleet store failed",
      detail: String(e?.message || e),
    });
  }
};
