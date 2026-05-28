const crypto = require("crypto");
const { makeAdminToken } = require("../_lib/auth.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res
      .status(500)
      .json({ error: "Server misconfigured: ADMIN_PASSWORD not set" });
    return;
  }
  const password =
    req.body && typeof req.body === "object" ? req.body.password : null;
  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Password required" });
    return;
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: "Wrong password" });
    return;
  }
  const token = makeAdminToken();
  res.status(200).json({ token });
};
