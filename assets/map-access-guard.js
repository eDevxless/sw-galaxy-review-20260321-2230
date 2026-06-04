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
    if (!urlHasAdminFlag()) return "";
    try {
      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
      if (tokenLooksCurrent(token)) return token;
      if (token) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (_error) {
      return "";
    }
    return "";
  }

  function urlHasAdminFlag() {
    const params = new URLSearchParams(window.location.search);
    return params.has("admin");
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

  function normalizePlanetWorldEditorPath() {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (!/\/planet-world-editor$/i.test(path)) return false;
    window.location.replace(`${window.location.pathname}/${window.location.search}${window.location.hash}`);
    return true;
  }

  function forcePublicUrlForViewers(admin) {
    if (admin) return;
    const path = window.location.pathname.replace(/\\/g, "/");
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (/\/coruscant-city-map\/city-map-editor\.html$/i.test(path)) {
      window.location.replace(`./city-map.html?view=public${window.location.hash}`);
      return;
    }

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

  function isCityMapPage() {
    return /\/coruscant-city-map\/(?:city-map|planet-city-map)\.html$/i.test(
      window.location.pathname.replace(/\\/g, "/")
    );
  }

  function applyCityMapReadOnlyControls() {
    if (window.SW_MAP_IS_ADMIN || !isCityMapPage() || !document.body) return;

    document
      .querySelectorAll(
        [
          "#infoName",
          "#infoImageInput",
          "#infoImageUrl",
          "#infoType",
          "#infoDescription",
          "#removeImageBtn",
          "#exportDataBtn"
        ].join(",")
      )
      .forEach((element) => {
        element.setAttribute("aria-disabled", "true");
        if ("readOnly" in element) element.readOnly = true;
        if ("disabled" in element) element.disabled = true;
        if (element.id !== "exportDataBtn") element.tabIndex = -1;
      });

    document.querySelectorAll(".image-actions, .image-url-field, .editor-footer").forEach((element) => {
      element.setAttribute("hidden", "");
    });
  }

  function blockCityMapReadOnlyEvent(event) {
    if (window.SW_MAP_IS_ADMIN || !isCityMapPage()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("#infoName, #infoImageInput, #infoImageUrl, #infoType, #infoDescription, #removeImageBtn, #exportDataBtn, .image-actions, .image-url-field")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function setupCityMapReadOnlyMode() {
    if (window.SW_MAP_IS_ADMIN || !isCityMapPage()) return;
    applyCityMapReadOnlyControls();
    document.addEventListener("click", blockCityMapReadOnlyEvent, true);
    document.addEventListener("input", blockCityMapReadOnlyEvent, true);
    document.addEventListener("change", blockCityMapReadOnlyEvent, true);
    document.addEventListener("keydown", blockCityMapReadOnlyEvent, true);
    new MutationObserver(applyCityMapReadOnlyControls).observe(document.body, { childList: true, subtree: true });
  }

  if (normalizePlanetWorldEditorPath()) return;

  const admin = isAdmin();
  window.SW_MAP_IS_ADMIN = admin;
  window.SW_MAP_READ_ONLY = !admin;
  window.SW_MAP_ACCESS_GRANTED = true;
  forcePublicUrlForViewers(admin);

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        applyClassState();
        setupCityMapReadOnlyMode();
      },
      { once: true }
    );
  } else {
    applyClassState();
    setupCityMapReadOnlyMode();
  }
})();
