# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
import copy
import shutil


STAR_WARS_WEBSITE_ROOT = APP_DIR.parent / "Website" / "Version 8"
STAR_WARS_WEBSITE_STAGE_DIR = STAR_WARS_WEBSITE_ROOT / ".bot-deploy-staging"
STAR_WARS_WEBSITE_PLANET_INDEX_FILE = STAR_WARS_WEBSITE_ROOT / "calibrated_planets.json"
STAR_WARS_WEBSITE_PLANET_FACTIONS_FILE = STAR_WARS_WEBSITE_ROOT / "planet_factions.json"
STAR_WARS_WEBSITE_NETLIFY_STATE_FILE = STAR_WARS_WEBSITE_ROOT / ".netlify" / "state.json"
STAR_WARS_WEBSITE_SOURCE_FILES = [
    "index.html",
    "styles.css",
    "script.js",
    "config.js",
    "favicon.svg",
    "image.jpg",
    "image.png",
    "calibrated_planets.json",
    "planet_profiles.json",
    "rim_curves.json",
    "hyperspace_routes.json",
    "grid_guides.json",
    "grid_markers.json",
    "planets.js",
]
STAR_WARS_WEBSITE_FACTIONS = {
    "republic": {
        "label": "Galaktische Republik",
        "aliases": {
            "republic",
            "republik",
            "galaktische republik",
            "galactic republic",
        },
    },
    "separatist": {
        "label": "Separatisten",
        "aliases": {
            "separatist",
            "separatists",
            "separatisten",
            "kus",
            "konfoederation unabhaengiger systeme",
            "konfoderation unabhaengiger systeme",
            "confederacy of independent systems",
            "cis",
        },
    },
}
STAR_WARS_WEBSITE_NEUTRAL_ALIASES = {
    "",
    "neutral",
    "none",
    "leer",
    "keine",
    "remove",
    "clear",
    "unassigned",
    "ohne",
}
STAR_WARS_WEBSITE_MAX_CHANGE_LOG = 60


def _sw_web_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _sw_web_norm_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _sw_web_faction_label(faction_key: str) -> str:
    key = str(faction_key or "").strip().lower()
    if not key:
        return "Neutral"
    return str((STAR_WARS_WEBSITE_FACTIONS.get(key) or {}).get("label") or key)


def _sw_web_normalize_faction_key(value: str) -> Optional[str]:
    key = _sw_web_norm_text(value)
    if key in STAR_WARS_WEBSITE_NEUTRAL_ALIASES:
        return ""
    for faction_key, payload in STAR_WARS_WEBSITE_FACTIONS.items():
        aliases = set(payload.get("aliases", set()) or set())
        aliases.add(faction_key)
        if key in aliases:
            return faction_key
    return None


def _sw_web_project_ready() -> tuple[bool, str]:
    if not STAR_WARS_WEBSITE_ROOT.exists():
        return False, f"Website-Projekt nicht gefunden: {STAR_WARS_WEBSITE_ROOT}"
    if not STAR_WARS_WEBSITE_PLANET_INDEX_FILE.exists():
        return False, "calibrated_planets.json fehlt im Website-Projekt."
    if not STAR_WARS_WEBSITE_PLANET_FACTIONS_FILE.exists():
        return False, "planet_factions.json fehlt im Website-Projekt."
    return True, ""


def _sw_web_load_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return _clone_default(fallback)


def _sw_web_write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _sw_web_load_planet_index() -> dict[str, str]:
    raw = _sw_web_load_json(STAR_WARS_WEBSITE_PLANET_INDEX_FILE, {})
    out: dict[str, str] = {}
    if isinstance(raw, dict):
        for planet_name in raw.keys():
            text = str(planet_name or "").strip()
            if text:
                out[_sw_web_norm_text(text)] = text
    return out


def _sw_web_resolve_planet_name(raw_name: str) -> tuple[Optional[str], list[str]]:
    planet_index = _sw_web_load_planet_index()
    key = _sw_web_norm_text(raw_name)
    if not key:
        return None, []
    if key in planet_index:
        return planet_index[key], []
    candidates = difflib.get_close_matches(key, list(planet_index.keys()), n=5, cutoff=0.55)
    return None, [planet_index[candidate] for candidate in candidates if candidate in planet_index]


def _sw_web_load_source_faction_payload() -> dict:
    payload = _sw_web_load_json(
        STAR_WARS_WEBSITE_PLANET_FACTIONS_FILE,
        {"meta": {}, "factions": {}, "supplemental_planets": []},
    )
    if not isinstance(payload, dict):
        payload = {"meta": {}, "factions": {}, "supplemental_planets": []}
    if not isinstance(payload.get("meta"), dict):
        payload["meta"] = {}
    if not isinstance(payload.get("factions"), dict):
        payload["factions"] = {}
    if not isinstance(payload.get("supplemental_planets"), list):
        payload["supplemental_planets"] = []
    return payload


def _sw_web_source_faction_map(payload: Optional[dict] = None) -> dict[str, str]:
    source = payload if isinstance(payload, dict) else _sw_web_load_source_faction_payload()
    out: dict[str, str] = {}
    for raw_name, raw_value in (source.get("factions", {}) or {}).items():
        planet_name = str(raw_name or "").strip()
        if not planet_name:
            continue
        faction_value = raw_value if isinstance(raw_value, str) else (raw_value or {}).get("faction")
        faction_key = _sw_web_normalize_faction_key(str(faction_value or ""))
        if faction_key is None:
            continue
        out[planet_name] = faction_key
    return out


def _sw_web_ensure_bridge_state() -> dict:
    settings = economy_data.setdefault("settings", {})
    bridge = settings.setdefault("website_bridge", {})
    if not isinstance(bridge, dict):
        bridge = {}
        settings["website_bridge"] = bridge
    pending = bridge.get("pending_planet_factions", {})
    if not isinstance(pending, dict):
        pending = {}
        bridge["pending_planet_factions"] = pending
    change_log = bridge.get("change_log", [])
    if not isinstance(change_log, list):
        change_log = []
        bridge["change_log"] = change_log
    bridge.setdefault("last_deploy_at", None)
    bridge.setdefault("last_deploy_status", "")
    bridge.setdefault("last_deploy_url", "")
    bridge.setdefault("last_deploy_summary", "")
    return bridge


def _sw_web_pending_faction_map(bridge: Optional[dict] = None) -> dict[str, str]:
    state = bridge if isinstance(bridge, dict) else _sw_web_ensure_bridge_state()
    out: dict[str, str] = {}
    for raw_name, raw_value in (state.get("pending_planet_factions", {}) or {}).items():
        planet_name = str(raw_name or "").strip()
        if not planet_name:
            continue
        faction_key = _sw_web_normalize_faction_key(str(raw_value or ""))
        if faction_key is None:
            continue
        out[planet_name] = faction_key
    state["pending_planet_factions"] = out
    return out


def _sw_web_effective_faction_map(bridge: Optional[dict] = None, source_payload: Optional[dict] = None) -> dict[str, str]:
    effective = dict(_sw_web_source_faction_map(source_payload))
    pending = _sw_web_pending_faction_map(bridge)
    for planet_name, faction_key in pending.items():
        if faction_key:
            effective[planet_name] = faction_key
        else:
            effective.pop(planet_name, None)
    return effective


def _sw_web_record_change(
    bridge: dict,
    *,
    planet_name: str,
    source_faction: str,
    effective_before: str,
    desired_faction: str,
    updated_by_user_id: Optional[int],
) -> None:
    entry = {
        "planet": str(planet_name or ""),
        "source_faction": str(source_faction or ""),
        "effective_before": str(effective_before or ""),
        "desired_faction": str(desired_faction or ""),
        "updated_by_user_id": int(updated_by_user_id) if updated_by_user_id else None,
        "updated_at": _sw_web_now_iso(),
    }
    change_log = list(bridge.get("change_log", []) or [])
    change_log.append(entry)
    bridge["change_log"] = change_log[-STAR_WARS_WEBSITE_MAX_CHANGE_LOG:]


def _sw_web_clean_territories(values) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        name = str(raw or "").strip()
        if not name:
            continue
        key = _sw_web_norm_text(name)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(name[:80])
    return cleaned


def _sw_web_refresh_state_map_payload(state_entity: dict, guild_id: Optional[int]) -> None:
    if not isinstance(state_entity, dict):
        return
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {}) or {}
    territories = _sw_web_clean_territories(profile.get("territories", []) or [])
    state_entity["territories"] = list(territories)
    profile["territories"] = list(territories)
    profile["territory_count"] = len(territories)
    svg = _generate_state_svg_map(str(state_entity.get("name", state_entity.get("id", "Faction"))), territories)
    save_state_map_svg(
        state_entity_id=str(state_entity.get("id")),
        state_name=str(state_entity.get("name", state_entity.get("id", "Faction"))),
        territories=territories,
        svg=svg,
        guild_id=guild_id,
    )


def _sw_web_find_state_entity_by_aliases(aliases: set[str]) -> Optional[dict]:
    if not aliases:
        return None
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        entity_name = _sw_web_norm_text(str(entity.get("name", "")))
        if entity_name in aliases:
            return entity
    return None


def _sw_web_resolve_faction_entity(faction_key: str, owner_user_id: Optional[int] = None) -> Optional[dict]:
    if not faction_key:
        return None
    faction_payload = STAR_WARS_WEBSITE_FACTIONS.get(faction_key) or {}
    label = str(faction_payload.get("label") or faction_key).strip()
    aliases = {_sw_web_norm_text(label), _sw_web_norm_text(faction_key)}
    aliases.update(_sw_web_norm_text(alias) for alias in (faction_payload.get("aliases", set()) or set()))
    entity = _sw_web_find_state_entity_by_aliases(aliases)
    if entity:
        return entity
    entity_id, _ = ensure_state_entity(label)
    try:
        set_state_control_mode(entity_id, "player", owner_user_id=owner_user_id)
    except Exception:
        pass
    return get_entity(entity_id)


def _sw_web_sync_bot_faction_membership(
    planet_name: str,
    faction_key: str,
    guild_id: Optional[int],
    owner_user_id: Optional[int],
) -> dict:
    canonical_planet = str(planet_name or "").strip()
    planet_key = _sw_web_norm_text(canonical_planet)
    changed_entities: list[dict] = []
    removed_from: list[str] = []

    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {}) or {}
        territories = _sw_web_clean_territories(profile.get("territories", []) or entity.get("territories", []) or [])
        new_territories = [name for name in territories if _sw_web_norm_text(name) != planet_key]
        if len(new_territories) != len(territories):
            removed_from.append(str(entity.get("name", entity.get("id", ""))))
            entity["territories"] = list(new_territories)
            profile["territories"] = list(new_territories)
            profile["territory_count"] = len(new_territories)
            changed_entities.append(entity)

    assigned_to = None
    if faction_key:
        target_entity = _sw_web_resolve_faction_entity(faction_key, owner_user_id=owner_user_id)
        if target_entity:
            ensure_entity_profile_structure(target_entity)
            profile = target_entity.get("profile", {}) or {}
            territories = _sw_web_clean_territories(profile.get("territories", []) or target_entity.get("territories", []) or [])
            if all(_sw_web_norm_text(name) != planet_key for name in territories):
                territories.append(canonical_planet)
            territories = _sw_web_clean_territories(territories)
            target_entity["territories"] = list(territories)
            profile["territories"] = list(territories)
            profile["territory_count"] = len(territories)
            changed_entities.append(target_entity)
            assigned_to = str(target_entity.get("name", target_entity.get("id", "")))

    seen_entity_ids: set[str] = set()
    for entity in changed_entities:
        entity_id = str(entity.get("id"))
        if not entity_id or entity_id in seen_entity_ids:
            continue
        seen_entity_ids.add(entity_id)
        _sw_web_refresh_state_map_payload(entity, guild_id)

    if guild_id:
        try:
            rebuild_world_map_for_guild(int(guild_id))
        except Exception:
            pass
    try:
        sync_state_territory_lore_index(save_changes=True)
    except Exception:
        pass
    save_economy()
    return {
        "removed_from": removed_from,
        "assigned_to": assigned_to,
        "changed_entity_count": len(seen_entity_ids),
    }


def _sw_web_build_effective_payload(bridge: Optional[dict] = None) -> dict:
    source_payload = _sw_web_load_source_faction_payload()
    effective_map = _sw_web_effective_faction_map(bridge, source_payload)
    payload = copy.deepcopy(source_payload)
    payload["factions"] = {
        name: effective_map[name]
        for name in sorted(effective_map.keys(), key=lambda value: _sw_web_norm_text(value))
    }
    meta = payload.setdefault("meta", {})
    meta["generated_at"] = _sw_web_now_iso()
    meta["bot_sync_pending_count"] = len(_sw_web_pending_faction_map(bridge))
    meta["bot_sync_source"] = "Economicon Discord Bot"
    return payload


def _sw_web_prepare_stage_dir(payload: dict) -> Path:
    if STAR_WARS_WEBSITE_STAGE_DIR.exists():
        shutil.rmtree(STAR_WARS_WEBSITE_STAGE_DIR)
    STAR_WARS_WEBSITE_STAGE_DIR.mkdir(parents=True, exist_ok=True)

    missing_files = []
    for filename in STAR_WARS_WEBSITE_SOURCE_FILES:
        src = STAR_WARS_WEBSITE_ROOT / filename
        if not src.exists():
            missing_files.append(filename)
            continue
        shutil.copy2(src, STAR_WARS_WEBSITE_STAGE_DIR / filename)
    if missing_files:
        raise FileNotFoundError("Fehlende Website-Dateien: " + ", ".join(missing_files))

    _sw_web_write_json(STAR_WARS_WEBSITE_STAGE_DIR / "planet_factions.json", payload)
    return STAR_WARS_WEBSITE_STAGE_DIR


def _sw_web_load_netlify_site_id() -> str:
    payload = _sw_web_load_json(STAR_WARS_WEBSITE_NETLIFY_STATE_FILE, {})
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("siteId") or "").strip()


def _sw_web_extract_first_url(text: str) -> str:
    match = re.search(r"https://[^\s]+\.netlify\.app[^\s]*", str(text or ""))
    return str(match.group(0)) if match else ""


def _sw_web_build_status_text() -> str:
    ready, reason = _sw_web_project_ready()
    lines = ["Star Wars Website Sync"]
    lines.append(f"- Projektpfad: {STAR_WARS_WEBSITE_ROOT}")
    lines.append(f"- Netlify Site ID: {_sw_web_load_netlify_site_id() or '-'}")
    if not ready:
        lines.append(f"- Status: {reason}")
        return "\n".join(lines)

    bridge = _sw_web_ensure_bridge_state()
    pending = _sw_web_pending_faction_map(bridge)
    effective = _sw_web_effective_faction_map(bridge)
    faction_counts = {"republic": 0, "separatist": 0, "neutral": 0}
    for faction_key in effective.values():
        if faction_key == "republic":
            faction_counts["republic"] += 1
        elif faction_key == "separatist":
            faction_counts["separatist"] += 1
        else:
            faction_counts["neutral"] += 1

    lines.append(f"- Ausstehende Aenderungen: {len(pending)}")
    lines.append(
        "- Effektiver Stand: "
        f"{_sw_web_faction_label('republic')} {faction_counts['republic']} | "
        f"{_sw_web_faction_label('separatist')} {faction_counts['separatist']}"
    )
    last_status = str(bridge.get("last_deploy_status") or "").strip() or "-"
    last_at = str(bridge.get("last_deploy_at") or "").strip() or "-"
    last_url = str(bridge.get("last_deploy_url") or "").strip() or "-"
    lines.append(f"- Letzter Deploy: {last_status} | {last_at}")
    lines.append(f"- Letzte URL: {last_url}")

    if pending:
        lines.append("")
        lines.append("Pending:")
        source_map = _sw_web_source_faction_map()
        for planet_name in sorted(pending.keys(), key=lambda value: _sw_web_norm_text(value))[:20]:
            source_label = _sw_web_faction_label(source_map.get(planet_name, ""))
            target_label = _sw_web_faction_label(pending.get(planet_name, ""))
            lines.append(f"- {planet_name}: {source_label} -> {target_label}")
        if len(pending) > 20:
            lines.append(f"- ... und {len(pending) - 20} weitere")
    return "\n".join(lines)


@bot.group(name="sw", invoke_without_command=True)
@commands.has_role("Admin")
async def sw_group(ctx: commands.Context):
    await ctx.send(render_command_catalog(["star_wars_web"], "Star Wars Website:"))


@sw_group.command(name="status")
@commands.has_role("Admin")
async def sw_status(ctx: commands.Context):
    await send_long_message(ctx.channel, _sw_web_build_status_text())


@sw_group.command(name="planet")
@commands.has_role("Admin")
async def sw_planet(ctx: commands.Context, *, payload: str):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return

    ready, reason = _sw_web_project_ready()
    if not ready:
        await ctx.send(reason)
        return

    parts = [part.strip() for part in str(payload or "").split("|", 1)]
    if len(parts) != 2 or not parts[0] or not parts[1]:
        await ctx.send("Nutze: `Eco sw planet <planet> | <republic|separatist|neutral>`")
        return

    planet_name, suggestions = _sw_web_resolve_planet_name(parts[0])
    if not planet_name:
        hint = f" Meintest du: {', '.join(suggestions[:5])}" if suggestions else ""
        await ctx.send(f"Planet nicht gefunden.{hint}")
        return

    faction_key = _sw_web_normalize_faction_key(parts[1])
    if faction_key is None:
        await ctx.send("Unbekannte Fraktion. Erlaubt: `republic`, `separatist`, `neutral`.")
        return

    bridge = _sw_web_ensure_bridge_state()
    pending = _sw_web_pending_faction_map(bridge)
    source_payload = _sw_web_load_source_faction_payload()
    source_map = _sw_web_source_faction_map(source_payload)
    source_faction = str(source_map.get(planet_name, "") or "")
    effective_before = str(_sw_web_effective_faction_map(bridge, source_payload).get(planet_name, "") or "")

    if faction_key == source_faction:
        pending.pop(planet_name, None)
    else:
        pending[planet_name] = faction_key
    bridge["pending_planet_factions"] = pending

    sync_result = _sw_web_sync_bot_faction_membership(
        planet_name=planet_name,
        faction_key=faction_key,
        guild_id=ctx.guild.id,
        owner_user_id=ctx.author.id,
    )
    _sw_web_record_change(
        bridge,
        planet_name=planet_name,
        source_faction=source_faction,
        effective_before=effective_before,
        desired_faction=faction_key,
        updated_by_user_id=ctx.author.id,
    )
    save_economy()

    removed_from = list(sync_result.get("removed_from", []) or [])
    assigned_to = str(sync_result.get("assigned_to") or "").strip() or _sw_web_faction_label(faction_key)
    pending_count = len(_sw_web_pending_faction_map(bridge))
    target_label = _sw_web_faction_label(faction_key)
    source_label = _sw_web_faction_label(source_faction)
    if faction_key == source_faction:
        deploy_note = "Kein Pending-Deploy noetig, Quelle und Ziel sind identisch."
    else:
        deploy_note = f"Ausstehende Deploy-Aenderungen: {pending_count}. Nutze `Eco deploy` zum Veröffentlichen."

    move_note = ""
    if removed_from:
        move_note = f"\nBot-Sync: entfernt aus {', '.join(sorted(set(removed_from)))} und jetzt bei {assigned_to}."
    elif faction_key:
        move_note = f"\nBot-Sync: jetzt bei {assigned_to}."
    else:
        move_note = "\nBot-Sync: Planet ist jetzt neutral und keiner Faction zugeordnet."

    await ctx.send(
        f"Planet-Zuordnung aktualisiert: `{planet_name}` | {source_label} -> {target_label}."
        f"{move_note}\n{deploy_note}"
    )


@bot.group(name="deploy", invoke_without_command=True)
@commands.has_role("Admin")
async def deploy_group(ctx: commands.Context):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return

    ready, reason = _sw_web_project_ready()
    if not ready:
        await ctx.send(reason)
        return

    bridge = _sw_web_ensure_bridge_state()
    pending = _sw_web_pending_faction_map(bridge)
    if not pending:
        await ctx.send("Keine ausstehenden Website-Aenderungen vorhanden.")
        return

    await ctx.send(f"Deploy gestartet. Veroeffentliche {len(pending)} ausstehende Website-Aenderungen ...")

    try:
        effective_payload = _sw_web_build_effective_payload(bridge)
        stage_dir = _sw_web_prepare_stage_dir(effective_payload)
        cmd = [
            "npx",
            "--yes",
            "netlify",
            "deploy",
            "--prod",
            "--dir",
            str(stage_dir),
            "--message",
            f"Economicon bot deploy guild={ctx.guild.id} pending={len(pending)}",
        ]
        site_id = _sw_web_load_netlify_site_id()
        if site_id:
            cmd.extend(["--site", site_id])
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(STAR_WARS_WEBSITE_ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        output = "\n".join(
            chunk for chunk in [stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")] if chunk
        ).strip()
        if process.returncode != 0:
            bridge["last_deploy_at"] = _sw_web_now_iso()
            bridge["last_deploy_status"] = "failed"
            bridge["last_deploy_summary"] = output[-1500:]
            bridge["last_deploy_url"] = ""
            save_economy()
            excerpt = output[-1200:] if output else "Kein Output vorhanden."
            await send_long_message(ctx.channel, f"Deploy fehlgeschlagen.\n\n{excerpt}")
            return

        _sw_web_write_json(STAR_WARS_WEBSITE_PLANET_FACTIONS_FILE, effective_payload)
        bridge["pending_planet_factions"] = {}
        bridge["last_deploy_at"] = _sw_web_now_iso()
        bridge["last_deploy_status"] = "success"
        bridge["last_deploy_url"] = _sw_web_extract_first_url(output)
        bridge["last_deploy_summary"] = f"{len(pending)} Aenderungen deployed."
        save_economy()

        url_line = f"\nURL: {bridge['last_deploy_url']}" if bridge.get("last_deploy_url") else ""
        await ctx.send(
            f"Deploy abgeschlossen. {len(pending)} Website-Aenderungen wurden veroeffentlicht.{url_line}"
        )
    except Exception as exc:
        bridge["last_deploy_at"] = _sw_web_now_iso()
        bridge["last_deploy_status"] = "failed"
        bridge["last_deploy_summary"] = str(exc)[:1500]
        bridge["last_deploy_url"] = ""
        save_economy()
        await ctx.send(f"Deploy fehlgeschlagen: {exc}")


@deploy_group.command(name="status")
@commands.has_role("Admin")
async def deploy_status(ctx: commands.Context):
    await send_long_message(ctx.channel, _sw_web_build_status_text())
