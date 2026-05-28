const crypto = require("crypto");
const { makeUserToken } = require("../_lib/auth.js");
const {
  validateUsername,
  validatePassword,
  hashPassword,
  verifyPassword,
  publicUser,
  defaultFleetStore,
  getUsers,
  setUsers,
  getStores,
  setStores,
} = require("../_lib/fleet-data.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const action = String(body.action || "login").trim().toLowerCase();
  const usernameCheck = validateUsername(body.username);
  if (!usernameCheck.ok) {
    res.status(400).json({ error: usernameCheck.error });
    return;
  }
  const passwordCheck = validatePassword(body.password);
  if (!passwordCheck.ok) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  try {
    const users = await getUsers();
    const existing = Object.values(users).find((user) => user.username === usernameCheck.username);

    if (action === "register") {
      if (existing) {
        res.status(409).json({ error: "Benutzername ist bereits vergeben." });
        return;
      }
      const now = new Date().toISOString();
      const user = {
        id: `user-${crypto.randomBytes(12).toString("hex")}`,
        username: usernameCheck.username,
        displayName: String(body.displayName || body.username || usernameCheck.username).trim().slice(0, 80),
        role: "user",
        password: hashPassword(passwordCheck.password),
        createdAt: now,
        updatedAt: now,
      };
      users[user.id] = user;
      await setUsers(users);

      const stores = await getStores();
      stores[user.id] = defaultFleetStore();
      await setStores(stores);

      res.status(200).json({
        token: makeUserToken(user),
        user: publicUser(user),
        store: stores[user.id],
      });
      return;
    }

    if (action !== "login") {
      res.status(400).json({ error: "Unknown action" });
      return;
    }
    if (!existing || !verifyPassword(passwordCheck.password, existing)) {
      res.status(403).json({ error: "Benutzername oder Passwort ist falsch." });
      return;
    }

    const stores = await getStores();
    if (!stores[existing.id]) {
      stores[existing.id] = defaultFleetStore();
      await setStores(stores);
    }

    res.status(200).json({
      token: makeUserToken(existing),
      user: publicUser(existing),
      store: stores[existing.id],
    });
  } catch (e) {
    res.status(500).json({
      error: "Fleet auth failed",
      detail: String(e?.message || e),
    });
  }
};
