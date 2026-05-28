(function () {
  "use strict";

  const TOKEN_STORAGE_KEY = "swmap_admin_token";

  function decodeBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(normalized + padding);
  }

  function tokenLooksCurrent(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return false;
    try {
      const payload = JSON.parse(decodeBase64Url(parts[0]));
      const role = String(payload?.role || payload?.sub || "").toLowerCase();
      if (role !== "admin") return false;
      if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return false;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function storedAdminToken() {
    try {
      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
      if (tokenLooksCurrent(token)) return token;
      if (token) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (_error) {
      return "";
    }
    return "";
  }

  function parentHasAdminAccess() {
    try {
      return Boolean(window.parent && window.parent !== window && window.parent.MapAdminUi?.isAdmin?.());
    } catch (_error) {
      return false;
    }
  }

  function isAdmin() {
    return Boolean(storedAdminToken() || parentHasAdminAccess());
  }

  function forcePublicUrlForViewers(admin) {
    if (admin) return;
    const path = window.location.pathname.replace(/\\/g, "/");
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (/\/coruscant-city-map\/(?:city-map|planet-city-map)\.html$/i.test(path)) {
      if (!["public", "1", "true"].includes(String(params.get("view") || "").toLowerCase())) {
        params.set("view", "public");
        changed = true;
      }
    }

    if (/\/planet-world-editor\/?$/i.test(path) && params.get("readonly") !== "1") {
      params.set("readonly", "1");
      changed = true;
    }

    if (changed) {
      history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    }
  }

  function applyClassState() {
    if (!document.body) return;
    document.body.classList.toggle("sw-map-admin", window.SW_MAP_IS_ADMIN);
    document.body.classList.toggle("sw-map-readonly", !window.SW_MAP_IS_ADMIN);
  }

  const admin = isAdmin();
  window.SW_MAP_IS_ADMIN = admin;
  window.SW_MAP_READ_ONLY = !admin;
  window.SW_MAP_ACCESS_GRANTED = true;
  forcePublicUrlForViewers(admin);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyClassState, { once: true });
  } else {
    applyClassState();
  }
})();
