// Admin-UI fuer die Star-Wars-Map. Wird auf jeder Seite geladen, aktiviert
// sich aber nur, wenn ein gueltiges Token vorliegt und der User die URL
// ?admin=1 oeffnet.

(function () {
  const TOKEN_STORAGE_KEY = "swmap_admin_token";
  const ADMIN_QUERY_FLAG = "admin";
  const IMAGE_UPLOAD_TIMEOUT_MS = 25000;
  const GOVERNMENT_FACTION_OPTIONS = [
    { value: "republic", label: "Republik (rot)" },
    { value: "separatist", label: "Separatisten / KUS (blau)" },
    { value: "neutral", label: "Neutral (weiss)" },
  ];
  const UNDERWORLD_FACTION_OPTIONS = [
    { value: "blacksun", label: "Black Sun" },
    { value: "hutt", label: "Huttenkartelle" },
    { value: "pyke", label: "Pyke-Syndikat" },
    { value: "ohnaka", label: "Hondo Ohnakas Bande" },
    { value: "neutral", label: "Neutral / keine Underworld-Zugehoerigkeit" },
  ];

  const state = {
    token: initialToken(),
    activeItem: null,
    panelEl: null,
    panelKey: "",
    statusPillEl: null,
  };

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

  function initialToken() {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
    if (urlHasAdminFlag() && tokenLooksCurrent(token)) return token;
    if (token) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return "";
  }

  function isAdmin() {
    if (!urlHasAdminFlag()) return false;
    if (tokenLooksCurrent(state.token)) return true;
    if (state.token) saveToken("");
    return false;
  }

  function saveToken(token) {
    const nextToken = tokenLooksCurrent(token) ? token : "";
    state.token = nextToken;
    if (nextToken) sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    renderStatusPill();
    window.dispatchEvent(
      new CustomEvent("swmap-admin-auth-changed", {
        detail: { isAdmin: isAdmin() },
      })
    );
  }

  function urlHasAdminFlag() {
    const params = new URLSearchParams(window.location.search);
    return params.has(ADMIN_QUERY_FLAG);
  }

  function maybeShowLoginModal() {
    if (isAdmin()) {
      renderStatusPill();
      return;
    }
    if (urlHasAdminFlag()) {
      openLoginModal();
    }
  }

  function openLoginModal() {
    if (document.getElementById("adminLoginModal")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.id = "adminLoginModal";
    backdrop.innerHTML = `
      <div class="admin-modal-card" role="dialog" aria-labelledby="adminLoginTitle">
        <h2 id="adminLoginTitle">Admin-Login</h2>
        <p>Passwort eingeben, um die Karte zu bearbeiten.</p>
        <label for="adminPasswordInput">Passwort</label>
        <input type="password" id="adminPasswordInput" autocomplete="current-password" autofocus />
        <div class="admin-modal-error" id="adminLoginError" role="alert"></div>
        <div class="admin-modal-actions">
          <button type="button" class="secondary" data-action="cancel">Abbrechen</button>
          <button type="button" data-action="submit">Einloggen</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const passwordInput = backdrop.querySelector("#adminPasswordInput");
    const errorEl = backdrop.querySelector("#adminLoginError");
    const submitBtn = backdrop.querySelector('[data-action="submit"]');
    const cancelBtn = backdrop.querySelector('[data-action="cancel"]');

    const close = () => backdrop.remove();
    cancelBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });

    const submit = async () => {
      const password = passwordInput.value;
      if (!password) {
        errorEl.textContent = "Passwort darf nicht leer sein.";
        return;
      }
      submitBtn.disabled = true;
      errorEl.textContent = "";
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          errorEl.textContent = detail.error || `Login fehlgeschlagen (${res.status})`;
          submitBtn.disabled = false;
          return;
        }
        const json = await res.json();
        if (!json.token) {
          errorEl.textContent = "Server hat kein Token zurueckgegeben.";
          submitBtn.disabled = false;
          return;
        }
        saveToken(json.token);
        close();
      } catch (e) {
        errorEl.textContent = `Netzwerkfehler: ${e?.message || e}`;
        submitBtn.disabled = false;
      }
    };

    submitBtn.addEventListener("click", submit);
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
      if (event.key === "Escape") close();
    });
  }

  function renderStatusPill() {
    if (!state.statusPillEl) {
      state.statusPillEl = document.createElement("div");
      state.statusPillEl.className = "admin-status-pill";
      document.body.appendChild(state.statusPillEl);
    }
    if (!isAdmin() && !urlHasAdminFlag()) {
      state.statusPillEl.remove();
      state.statusPillEl = null;
      return;
    }
    state.statusPillEl.classList.toggle("is-active", isAdmin());
    if (isAdmin()) {
      state.statusPillEl.innerHTML = `
        Admin
        <button type="button" data-action="logout" title="Abmelden">Abmelden</button>
      `;
      state.statusPillEl
        .querySelector('[data-action="logout"]')
        ?.addEventListener("click", () => {
          saveToken("");
          if (state.panelEl) state.panelEl.remove();
          state.panelEl = null;
        });
    } else {
      state.statusPillEl.innerHTML = `
        <button type="button" data-action="open-login">Admin-Login</button>
      `;
      state.statusPillEl
        .querySelector('[data-action="open-login"]')
        ?.addEventListener("click", openLoginModal);
    }
  }

  // ===== Edit-Panel im Planeten-Detail =====

  function ensurePanel(refs, item) {
    const container = refs?.body || refs?.media?.parentElement;
    if (!container) return null;
    const wantedKey = item?.nameKey || item?.name || "";
    if (state.panelEl && state.panelEl.parentElement !== container) {
      state.panelEl.remove();
      state.panelEl = null;
    }
    if (state.panelEl && state.panelKey === wantedKey) {
      return state.panelEl;
    }
    if (state.panelEl) {
      state.panelEl.remove();
      state.panelEl = null;
    }
    const panel = document.createElement("div");
    panel.className = "admin-edit-panel";
    container.appendChild(panel);
    state.panelEl = panel;
    state.panelKey = wantedKey;
    return panel;
  }

  function currentMapMode() {
    const apiMode = window.MapAdminApi?.getMapMode?.();
    if (apiMode === "underworld" || apiMode === "government") return apiMode;
    return document.body.classList.contains("map-mode-underworld") ? "underworld" : "government";
  }

  function factionOptionsForMode(mode) {
    return mode === "underworld" ? UNDERWORLD_FACTION_OPTIONS : GOVERNMENT_FACTION_OPTIONS;
  }

  function normalizeSelectedFaction(value, mode) {
    const faction = String(value || "").trim().toLowerCase();
    const allowed = factionOptionsForMode(mode).map((option) => option.value);
    return allowed.includes(faction) ? faction : "neutral";
  }

  function renderFactionOptions(selectedFaction, mode) {
    return factionOptionsForMode(mode)
      .map(
        (option) =>
          `<option value="${option.value}" ${selectedFaction === option.value ? "selected" : ""}>${escapeText(
            option.label
          )}</option>`
      )
      .join("");
  }

  function normalizeImageUrlValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("//")) return `https:${raw}`;
    if (/^www\./i.test(raw)) return `https://${raw}`;
    return raw;
  }

  function imagePreviewSrc(value) {
    const url = normalizeImageUrlValue(value);
    if (!url) return "";
    if (/^(data:|blob:|\/|\.\/|assets\/)/i.test(url)) return url;
    if (/^https?:\/\//i.test(url)) {
      return `/api/planets/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  function compactImageLabel(value) {
    const url = normalizeImageUrlValue(value);
    if (!url) return "";
    if (url.startsWith("data:")) {
      const approxBytes = Math.round((url.length * 3) / 4);
      const approxKb = Math.max(1, Math.round(approxBytes / 1024));
      return `Eingebettetes Bild (${approxKb} KB)`;
    }
    if (url.length <= 86) return url;
    return `${url.slice(0, 48)}...${url.slice(-24)}`;
  }

  function renderImagePreview(previewEl, value, emptyText, removeAction) {
    if (!previewEl) return;
    const url = normalizeImageUrlValue(value);
    if (!url) {
      previewEl.innerHTML = `<div class="preview-meta">${escapeText(emptyText)}</div>`;
      return;
    }
    previewEl.innerHTML = `
      <img src="${escapeAttr(imagePreviewSrc(url))}" alt="" />
      <div class="preview-meta" title="${url.startsWith("data:") ? "" : escapeAttr(url)}">${escapeText(
      compactImageLabel(url)
    )}</div>
      <button type="button" class="danger" data-action="${escapeAttr(removeAction)}">Entfernen</button>
    `;
    const img = previewEl.querySelector("img");
    const meta = previewEl.querySelector(".preview-meta");
    img?.addEventListener("error", () => {
      if (meta) {
        meta.textContent = "Bild konnte nicht geladen werden. Bitte direkte Bild-URL oder Bildseite pruefen.";
      }
    });
  }

  function storedImageInputValue(inputEl) {
    return inputEl?.dataset?.imageValue || inputEl?.value || "";
  }

  function clearStoredImageInputValue(inputEl) {
    if (!inputEl) return;
    delete inputEl.dataset.imageValue;
    delete inputEl.dataset.imageLabel;
    inputEl.classList.remove("is-compact-image-value");
    inputEl.value = "";
  }

  function bindImageUrlPreview(inputEl, previewEl, emptyText, removeAction) {
    const sync = () => {
      const currentLabel = inputEl.dataset.imageLabel || "";
      const currentStored = inputEl.dataset.imageValue || "";
      const sourceValue = currentStored && inputEl.value === currentLabel ? currentStored : inputEl.value;
      const normalized = normalizeImageUrlValue(sourceValue);
      if (normalized.startsWith("data:")) {
        const label = compactImageLabel(normalized);
        inputEl.dataset.imageValue = normalized;
        inputEl.dataset.imageLabel = label;
        inputEl.value = label;
        inputEl.classList.add("is-compact-image-value");
      } else {
        delete inputEl.dataset.imageValue;
        delete inputEl.dataset.imageLabel;
        inputEl.classList.remove("is-compact-image-value");
        if (inputEl.value !== normalized) inputEl.value = normalized;
      }
      renderImagePreview(previewEl, normalized, emptyText, removeAction);
    };
    inputEl.addEventListener("input", sync);
    inputEl.addEventListener("change", sync);
    sync();
    return sync;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function renderPanel(panel, item) {
    const mapMode = currentMapMode();
    const f = normalizeSelectedFaction(item.faction, mapMode);
    panel.innerHTML = `
      <h3>Admin · Bearbeiten</h3>
      <div>
        <label for="admEditFaction">Fraktion</label>
        <select id="admEditFaction" name="faction">
          ${renderFactionOptions(f, mapMode)}
        </select>
      </div>
      <div class="field-row">
        <div>
          <label for="admEditClimate">Klima</label>
          <input type="text" id="admEditClimate" value="${escapeAttr(item.climate || "")}" />
        </div>
        <div>
          <label for="admEditTerrain">Terrain</label>
          <input type="text" id="admEditTerrain" value="${escapeAttr(item.terrain || "")}" />
        </div>
      </div>
      <div>
        <label for="admEditSpecies">Spezies & Bevoelkerung</label>
        <input type="text" id="admEditSpecies" value="${escapeAttr(item.species_population || "")}" />
      </div>
      <div>
        <label for="admEditLore">Lore / Beschreibung</label>
        <textarea id="admEditLore">${escapeText(item.lore || item.desc || "")}</textarea>
      </div>
      <div class="admin-event-editor">
        <label for="admEventTitle">RPG-Event Titel</label>
        <input type="text" id="admEventTitle" value="${escapeAttr(item.event_title || "")}" placeholder="z.B. Belagerung von ${escapeAttr(
      item.name || "Planet"
    )}" />
        <label for="admEventText">RPG-Event Text</label>
        <textarea id="admEventText" placeholder="Beschreibung, Lagebild oder Missionshinweis">${escapeText(
      item.event_text || ""
    )}</textarea>
        <input type="text" id="admEventImage" placeholder="Optionales Event-Bild (https://...)" value="${escapeAttr(
      item.event_image || ""
    )}" />
      </div>
      <div>
        <label>Orbit-Bild</label>
        <div class="admin-image-preview" id="admOrbitPreview">
          ${item.orbit_image
        ? `<img src="${escapeAttr(item.orbit_image)}" alt="" /><div class="preview-meta">${escapeText(
          item.orbit_image
        )}</div><button type="button" class="danger" data-action="orbit-remove">Entfernen</button>`
        : `<div class="preview-meta">Kein Bild gesetzt — prozedurales Bild wird gezeigt.</div>`
      }
        </div>
        <label class="file-pick" for="admOrbitFile">Orbit-Bild hochladen (max 5 MB)</label>
        <input type="file" id="admOrbitFile" accept="image/*" />
        <input type="text" id="admOrbitUrl" placeholder="oder URL einfuegen (https://...)" value="${escapeAttr(
        item.orbit_image || ""
      )}" />
      </div>
      <div>
        <label>Planetenkarte (Bild)</label>
        <div class="admin-image-preview" id="admMapPreview">
          ${item.map_image
        ? `<img src="${escapeAttr(item.map_image)}" alt="" /><div class="preview-meta">${escapeText(
          item.map_image
        )}</div><button type="button" class="danger" data-action="map-remove">Entfernen</button>`
        : `<div class="preview-meta">Kein Bild gesetzt.</div>`
      }
        </div>
        <label class="file-pick" for="admMapFile">Planetenkarte hochladen (max 5 MB)</label>
        <input type="file" id="admMapFile" accept="image/*" />
        <input type="text" id="admMapUrl" placeholder="oder URL einfuegen (https://...)" value="${escapeAttr(
        item.map_image || ""
      )}" />
      </div>
      <div class="actions">
        <button type="button" class="secondary" data-action="reset">Override loeschen</button>
        <button type="button" data-action="save">Speichern</button>
      </div>
      <div class="admin-edit-feedback" id="admFeedback"></div>
    `;

    const factionSel = panel.querySelector("#admEditFaction");
    const climate = panel.querySelector("#admEditClimate");
    const terrain = panel.querySelector("#admEditTerrain");
    const species = panel.querySelector("#admEditSpecies");
    const lore = panel.querySelector("#admEditLore");
    const eventTitle = panel.querySelector("#admEventTitle");
    const eventText = panel.querySelector("#admEventText");
    const eventImage = panel.querySelector("#admEventImage");
    const orbitUrl = panel.querySelector("#admOrbitUrl");
    const orbitFile = panel.querySelector("#admOrbitFile");
    const orbitPreview = panel.querySelector("#admOrbitPreview");
    const mapUrl = panel.querySelector("#admMapUrl");
    const mapFile = panel.querySelector("#admMapFile");
    const mapPreview = panel.querySelector("#admMapPreview");
    const feedback = panel.querySelector("#admFeedback");
    const saveBtn = panel.querySelector('[data-action="save"]');
    const resetBtn = panel.querySelector('[data-action="reset"]');
    const LOCAL_IMAGE_FALLBACK_MAX_CHARS = 1800000;
    const syncOrbitPreview = bindImageUrlPreview(
      orbitUrl,
      orbitPreview,
      "Kein Bild gesetzt - prozedurales Bild wird gezeigt.",
      "orbit-remove"
    );
    const syncMapPreview = bindImageUrlPreview(mapUrl, mapPreview, "Kein Bild gesetzt.", "map-remove");
    const removeOrbitBtn = orbitPreview?.querySelector('[data-action="orbit-remove"]');
    const removeMapBtn = mapPreview?.querySelector('[data-action="map-remove"]');

    function bindUpload(fileInputEl, urlInputEl, kindLabel, onUrlChanged) {
      fileInputEl.addEventListener("change", async () => {
        const file = fileInputEl.files && fileInputEl.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          feedback.textContent = "Datei zu gross (max 5 MB).";
          feedback.classList.add("error");
          return;
        }
        feedback.classList.remove("error");
        feedback.textContent = `${kindLabel} wird hochgeladen …`;
        let dataUrl = "";
        try {
          dataUrl = await readFileAsDataUrl(file);
          const res = await fetchWithTimeout("/api/planets/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.token}`,
            },
            body: JSON.stringify({ filename: file.name, dataUrl }),
          }, IMAGE_UPLOAD_TIMEOUT_MS);
          if (!res.ok) {
            const detail = await res.json().catch(() => ({}));
            throw new Error(
              `${detail.error || "Upload fehlgeschlagen"}${detail.detail ? " — " + detail.detail : ""
              } (${res.status})`
            );
          }
          const json = await res.json();
          urlInputEl.value = json.url;
          onUrlChanged?.();
          feedback.textContent = `${kindLabel} hochgeladen — jetzt 'Speichern' klicken.`;
        } catch (e) {
          if (dataUrl && dataUrl.length <= LOCAL_IMAGE_FALLBACK_MAX_CHARS) {
            urlInputEl.value = dataUrl;
            onUrlChanged?.();
            feedback.classList.remove("error");
            feedback.textContent = `${kindLabel} konnte nicht zum Server hochgeladen werden, wurde aber lokal vorgemerkt. Jetzt 'Speichern' klicken.`;
          } else {
            feedback.classList.add("error");
            const message = e?.name === "AbortError" ? "Upload-Zeitlimit erreicht" : e?.message || e;
            feedback.textContent = `Fehler: ${message}. Bitte alternativ eine Bild-URL einfuegen.`;
          }
        }
      });
    }

    bindUpload(orbitFile, orbitUrl, "Orbit-Bild", syncOrbitPreview);
    bindUpload(mapFile, mapUrl, "Planetenkarte", syncMapPreview);

    if (removeOrbitBtn) {
      removeOrbitBtn.addEventListener("click", () => {
        clearStoredImageInputValue(orbitUrl);
        syncOrbitPreview();
        feedback.classList.remove("error");
        feedback.textContent = "Orbit-Bild auf 'leer' gesetzt — 'Speichern' klicken um zu uebernehmen.";
      });
    }
    if (removeMapBtn) {
      removeMapBtn.addEventListener("click", () => {
        clearStoredImageInputValue(mapUrl);
        syncMapPreview();
        feedback.classList.remove("error");
        feedback.textContent = "Planetenkarte auf 'leer' gesetzt — 'Speichern' klicken um zu uebernehmen.";
      });
    }

    orbitPreview?.addEventListener("click", (event) => {
      if (!event.target.closest('[data-action="orbit-remove"]')) return;
      clearStoredImageInputValue(orbitUrl);
      syncOrbitPreview();
      feedback.classList.remove("error");
      feedback.textContent = "Orbit-Bild auf 'leer' gesetzt - 'Speichern' klicken um zu uebernehmen.";
    });
    mapPreview?.addEventListener("click", (event) => {
      if (!event.target.closest('[data-action="map-remove"]')) return;
      clearStoredImageInputValue(mapUrl);
      syncMapPreview();
      feedback.classList.remove("error");
      feedback.textContent = "Planetenkarte auf 'leer' gesetzt - 'Speichern' klicken um zu uebernehmen.";
    });

    saveBtn.addEventListener("click", async () => {
      const factionField = mapMode === "underworld" ? "underworld_faction" : "faction";
      const fields = {
        [factionField]: factionSel.value || "neutral",
        climate: climate.value,
        terrain: terrain.value,
        species_population: species.value,
        lore: lore.value,
        event_title: eventTitle.value,
        event_text: eventText.value,
        event_image: eventImage.value,
        orbit_image: normalizeImageUrlValue(storedImageInputValue(orbitUrl)),
        map_image: normalizeImageUrlValue(storedImageInputValue(mapUrl)),
      };
      saveBtn.disabled = true;
      feedback.classList.remove("error");
      feedback.textContent = "Speichere …";
      try {
        const res = await fetch("/api/planets/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.token}`,
          },
          body: JSON.stringify({ name: item.name, fields }),
        });
        if (res.status === 401) {
          saveToken("");
          throw new Error("Sitzung abgelaufen. Bitte neu einloggen.");
        }
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(`${detail.error || "Speichern fehlgeschlagen"}${detail.detail ? " — " + detail.detail : ""} (${res.status})`);
        }
        // Lokal direkt anwenden
        if (window.MapAdminApi?.setLocalOverride) {
          window.MapAdminApi.setLocalOverride(item.name, fields);
        }
        const json = await res.json().catch(() => ({}));
        if (json.newsItem) {
          window.dispatchEvent(new CustomEvent("swmap-news-refresh", { detail: { source: "planet-event" } }));
        }
        feedback.textContent = json.newsItem ? "Gespeichert. Event wurde im News-Kanal veroeffentlicht." : "Gespeichert.";
      } catch (e) {
        if (window.MapAdminApi?.setLocalOverride) {
          window.MapAdminApi.setLocalOverride(item.name, fields);
          feedback.classList.remove("error");
          feedback.textContent =
            "Server-Speichern nicht erreichbar. Aenderung wurde lokal in diesem Browser gespeichert.";
        } else {
          feedback.classList.add("error");
          feedback.textContent = `Fehler: ${e?.message || e}`;
        }
      } finally {
        saveBtn.disabled = false;
      }
    });

    resetBtn.addEventListener("click", async () => {
      if (!confirm(`Override fuer ${item.name} wirklich loeschen?`)) return;
      resetBtn.disabled = true;
      feedback.classList.remove("error");
      feedback.textContent = "Loesche Override …";
      try {
        const res = await fetch("/api/planets/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.token}`,
          },
          body: JSON.stringify({ name: item.name, action: "delete" }),
        });
        if (res.status === 401) {
          saveToken("");
          throw new Error("Sitzung abgelaufen. Bitte neu einloggen.");
        }
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error || `Loeschen fehlgeschlagen (${res.status})`);
        }
        window.MapAdminApi?.clearLocalOverride?.(item.name);
        feedback.textContent =
          "Override geloescht. Lade die Seite neu, um Original-Daten zu sehen.";
      } catch (e) {
        if (window.MapAdminApi?.clearLocalOverride) {
          window.MapAdminApi.clearLocalOverride(item.name);
          feedback.classList.remove("error");
          feedback.textContent =
            "Server-Loeschen nicht erreichbar. Lokaler Override wurde geloescht; bitte Seite neu laden.";
        } else {
          feedback.classList.add("error");
          feedback.textContent = `Fehler: ${e?.message || e}`;
        }
      } finally {
        resetBtn.disabled = false;
      }
    });
  }

  function onPlanetRendered(refs, item) {
    if (!isAdmin() || !item || item.kind === "route" || item.kind === "faction") {
      if (state.panelEl) {
        state.panelEl.remove();
        state.panelEl = null;
        state.panelKey = "";
      }
      state.activeItem = item || null;
      return;
    }
    state.activeItem = item;
    const panel = ensurePanel(refs, item);
    if (panel) renderPanel(panel, item);
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeText(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Read failed"));
      reader.readAsDataURL(file);
    });
  }

  window.MapAdminUi = {
    onPlanetRendered,
    isAdmin,
    getToken: () => (isAdmin() ? state.token : ""),
    clearToken: () => saveToken(""),
    openLoginModal,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeShowLoginModal);
  } else {
    maybeShowLoginModal();
  }
})();
