const crypto = require("crypto");
const { getJson, setJson } = require("./store.js");

const USERS_KEY = "fleet-users-v1";
const STORES_KEY = "fleet-stores-v1";
const PBKDF2_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Benutzername: 3-32 Zeichen, nur a-z, 0-9, _ und -.",
    };
  }
  return { ok: true, username };
}

function validatePassword(value) {
  const password = String(value || "");
  if (password.length < 6 || password.length > 128) {
    return { ok: false, error: "Passwort muss 6-128 Zeichen lang sein." };
  }
  return { ok: true, password };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, PBKDF2_ITERATIONS, PASSWORD_KEY_LENGTH, "sha256")
    .toString("hex");
  return {
    salt,
    hash,
    algorithm: "pbkdf2-sha256",
    iterations: PBKDF2_ITERATIONS,
  };
}

function verifyPassword(password, user) {
  if (!user?.password?.salt || !user?.password?.hash) return false;
  const checked = crypto
    .pbkdf2Sync(
      String(password),
      user.password.salt,
      Number(user.password.iterations) || PBKDF2_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      "sha256"
    )
    .toString("hex");
  const a = Buffer.from(checked, "hex");
  const b = Buffer.from(user.password.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user.id || ""),
    username: String(user.username || ""),
    displayName: String(user.displayName || user.username || ""),
    role: String(user.role || "user"),
    createdAt: String(user.createdAt || ""),
    updatedAt: String(user.updatedAt || ""),
  };
}

function defaultFleetStore() {
  const profileId = `profile-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  return {
    activeProfileId: profileId,
    profiles: {
      [profileId]: {
        id: profileId,
        name: "Lokaler Kommandant",
        fleets: [],
        activeFleetId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function normalizePositiveInt(value, fallback = 0, max = 999999999) {
  const number = Math.floor(Number(value) || 0);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(max, number);
}

function normalizeFleetFaction(value) {
  const key = String(value || "").trim().toLowerCase();
  return key === "separatist" ? "separatist" : "republic";
}

function cleanString(value, fallback = "", max = 180) {
  const text = String(value == null ? "" : value).trim();
  return (text || fallback).slice(0, max);
}

function normalizeShipEntry(entry, fallbackIndex = 0) {
  const shipId = cleanString(entry?.shipId || entry?.shipClassId || entry?.ship_id || entry?.id, "", 120);
  if (!shipId) return null;
  const entryId = cleanString(
    (entry?.shipId ? entry?.id : "") || entry?.entryId || entry?.instanceId || entry?.uid,
    "",
    120
  );
  return {
    id: entryId || `ship-${Date.now().toString(36)}-${fallbackIndex}-${crypto.randomBytes(3).toString("hex")}`,
    shipId,
    callsign: cleanString(entry?.callsign || entry?.name, "", 80),
    fuelHours: Number.isFinite(Number(entry?.fuelHours)) ? Number(entry.fuelHours) : null,
    createdAt: cleanString(entry?.createdAt, new Date().toISOString(), 40),
  };
}

function normalizeShipEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const expanded = [];
  entries.forEach((entry, index) => {
    const base = normalizeShipEntry(entry, index);
    if (!base) return;
    const quantity = Math.max(1, normalizePositiveInt(entry?.quantity, 1, 9999));
    for (let copyIndex = 0; copyIndex < quantity; copyIndex += 1) {
      expanded.push({
        ...base,
        id:
          copyIndex === 0
            ? base.id
            : `ship-${Date.now().toString(36)}-${index}-${copyIndex}-${crypto.randomBytes(3).toString("hex")}`,
      });
    }
  });
  return expanded;
}

function normalizeFleetRecord(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = cleanString(entry.id, `fleet-${crypto.randomBytes(6).toString("hex")}`, 80);
  const now = new Date().toISOString();
  return {
    id,
    name: cleanString(entry.name, "Unbenannte Flotte", 80),
    faction: normalizeFleetFaction(entry.faction),
    ships: normalizeShipEntries(entry.ships).slice(0, 800),
    createdAt: cleanString(entry.createdAt, now, 40),
    updatedAt: cleanString(entry.updatedAt, now, 40),
  };
}

function normalizeProfile(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = cleanString(entry.id, `profile-${crypto.randomBytes(6).toString("hex")}`, 80);
  const fleets = Array.isArray(entry.fleets)
    ? entry.fleets.map(normalizeFleetRecord).filter(Boolean).slice(0, 200)
    : [];
  const activeFleetId = cleanString(entry.activeFleetId, "", 80);
  const now = new Date().toISOString();
  return {
    id,
    name: cleanString(entry.name, "Kommandoprofil", 80),
    fleets,
    activeFleetId: fleets.some((fleet) => fleet.id === activeFleetId) ? activeFleetId : fleets[0]?.id || "",
    createdAt: cleanString(entry.createdAt, now, 40),
    updatedAt: cleanString(entry.updatedAt, now, 40),
  };
}

function normalizeFleetStore(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rawProfiles = Array.isArray(source.profiles)
    ? source.profiles
    : Object.values(source.profiles || {});
  const profiles = {};
  rawProfiles
    .map(normalizeProfile)
    .filter(Boolean)
    .forEach((profile) => {
      profiles[profile.id] = profile;
    });
  if (!Object.keys(profiles).length) return defaultFleetStore();
  const activeProfileId = cleanString(source.activeProfileId, "", 80);
  return {
    activeProfileId: profiles[activeProfileId] ? activeProfileId : Object.keys(profiles)[0],
    profiles,
  };
}

async function getUsers() {
  const users = (await getJson(USERS_KEY)) || {};
  return users && typeof users === "object" ? users : {};
}

async function setUsers(users) {
  await setJson(USERS_KEY, users || {});
}

async function getStores() {
  const stores = (await getJson(STORES_KEY)) || {};
  return stores && typeof stores === "object" ? stores : {};
}

async function setStores(stores) {
  await setJson(STORES_KEY, stores || {});
}

function fleetStoreStats(store) {
  const profiles = Object.values((store && store.profiles) || {});
  const fleets = profiles.flatMap((profile) => (Array.isArray(profile.fleets) ? profile.fleets : []));
  return {
    profiles: profiles.length,
    fleets: fleets.length,
    ships: fleets.reduce(
      (sum, fleet) =>
        sum +
        (Array.isArray(fleet.ships) ? fleet.ships.length : 0),
      0
    ),
  };
}

module.exports = {
  normalizeUsername,
  validateUsername,
  validatePassword,
  hashPassword,
  verifyPassword,
  publicUser,
  defaultFleetStore,
  normalizeFleetStore,
  getUsers,
  setUsers,
  getStores,
  setStores,
  fleetStoreStats,
};
