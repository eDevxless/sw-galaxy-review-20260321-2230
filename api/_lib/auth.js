const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 1 week

function getSecret() {
  const secret =
    process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "ADMIN_TOKEN_SECRET or ADMIN_PASSWORD environment variable not set"
    );
  }
  return secret;
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  );
}

function signToken(payload) {
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let expectedSig;
  try {
    expectedSig = b64url(
      crypto.createHmac("sha256", getSecret()).update(body).digest()
    );
  } catch (_e) {
    return null;
  }
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch (_e) {
    return null;
  }
}

function makeAdminToken(name = "admin") {
  return signToken({
    sub: name,
    role: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
}

function makeUserToken(user) {
  const userId = String(user?.id || "").trim();
  if (!userId) {
    throw new Error("User id required");
  }
  return signToken({
    sub: userId,
    role: "user",
    username: String(user?.username || "").trim(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
}

function isAdminPayload(payload) {
  return Boolean(payload && (payload.role === "admin" || payload.sub === "admin"));
}

function requireAuth(req, res) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return payload;
}

function requireAdminAuth(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return null;
  if (!isAdminPayload(payload)) {
    res.status(403).json({ error: "Admin required" });
    return null;
  }
  return payload;
}

module.exports = {
  signToken,
  verifyToken,
  makeAdminToken,
  makeUserToken,
  isAdminPayload,
  requireAuth,
  requireAdminAuth,
};
