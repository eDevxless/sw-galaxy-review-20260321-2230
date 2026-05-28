from __future__ import annotations

import asyncio
import datetime as dt
import json
import os
import re
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Optional

import discord
from discord import app_commands
from discord.ext import commands


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "steckbrief_bot.sqlite3"
COMMAND_PREFIX = os.getenv("COMMAND_PREFIX", "Eco ")


def _load_local_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    try:
        raw_text = env_path.read_text(encoding="utf-8-sig")
    except OSError:
        return

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


_load_local_env_file(BASE_DIR / ".env")
BOT_TOKEN: Optional[str] = os.getenv("BOT_TOKEN")
TARGET_GUILD_ID: Optional[str] = os.getenv("DISCORD_GUILD_ID") or os.getenv("GUILD_ID")


PROFILE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "character": {
        "title": "Charakter-Steckbrief",
        "singular": "Charakter",
        "required": {"name", "species", "faction", "personality", "backstory"},
        "sections": [
            {
                "key": "identification",
                "label": "Identifikation",
                "fields": [
                    {"key": "name", "label": "Name", "required": True},
                    {"key": "alias", "label": "Alias"},
                    {"key": "species", "label": "Spezies", "required": True},
                    {"key": "gender", "label": "Geschlecht"},
                    {"key": "birth_year", "label": "Geburtsjahr"},
                ],
            },
            {
                "key": "origin",
                "label": "Herkunft & Rolle",
                "fields": [
                    {"key": "homeworld", "label": "Heimatwelt"},
                    {"key": "faction", "label": "Fraktion", "required": True},
                    {"key": "rank", "label": "Rang / Position"},
                    {"key": "height", "label": "Größe"},
                    {"key": "body", "label": "Körperbau"},
                ],
            },
            {
                "key": "visual",
                "label": "Visuelles Profil",
                "fields": [
                    {"key": "eyes", "label": "Augenfarbe"},
                    {"key": "hair", "label": "Haarfarbe"},
                    {"key": "features", "label": "Besondere Merkmale", "long": True},
                    {"key": "outfit", "label": "Kleidung / Rüstung", "long": True},
                ],
            },
            {
                "key": "personality",
                "label": "Persönlichkeit",
                "fields": [
                    {"key": "personality", "label": "Persönlichkeit", "required": True, "long": True},
                    {"key": "traits", "label": "Eigenschaften", "long": True},
                    {"key": "strengths", "label": "Stärken", "long": True},
                    {"key": "weaknesses", "label": "Schwächen", "long": True},
                    {"key": "fears", "label": "Ängste", "long": True},
                ],
            },
            {
                "key": "combat",
                "label": "Kampfdaten",
                "fields": [
                    {"key": "primary_weapon", "label": "Primärbewaffnung"},
                    {"key": "secondary_gear", "label": "Sekundärausrüstung"},
                    {"key": "melee", "label": "Nahkampffähigkeiten", "long": True},
                    {"key": "ranged", "label": "Fernkampffähigkeiten", "long": True},
                    {"key": "tactics", "label": "Taktisches Verständnis", "long": True},
                ],
            },
            {
                "key": "skills",
                "label": "Fachkenntnisse",
                "fields": [
                    {"key": "tech", "label": "Technikkenntnisse", "long": True},
                    {"key": "piloting", "label": "Piloten-Fähigkeiten", "long": True},
                    {"key": "training", "label": "Spezialausbildung", "long": True},
                ],
            },
            {
                "key": "force",
                "label": "Machtfähigkeiten",
                "fields": [
                    {"key": "midi_chlorians", "label": "Midichlorianer-Wert"},
                    {"key": "lightsaber_forms", "label": "Lichtschwertkampfform(en)"},
                    {"key": "force_powers", "label": "Bekannte Machtfähigkeiten", "long": True},
                    {"key": "force_rank", "label": "Rang / Position"},
                ],
            },
            {
                "key": "possessions",
                "label": "Besitztümer",
                "fields": [
                    {"key": "ship", "label": "Schiff / Fahrzeug"},
                    {"key": "finances", "label": "Finanziell"},
                    {"key": "collectibles", "label": "Sammlerstücke"},
                    {"key": "other_possessions", "label": "Sonstiges", "long": True},
                ],
            },
            {
                "key": "history_details",
                "label": "Vorgeschichte Details",
                "fields": [
                    {"key": "parents", "label": "Eltern"},
                    {"key": "family_status", "label": "Familienstatus"},
                    {"key": "motivation", "label": "Motivation", "long": True},
                ],
            },
            {
                "key": "other",
                "label": "Sonstiges",
                "fields": [
                    {"key": "motto", "label": "Motto / Zitat", "long": True},
                ],
            },
        ],
        "steps": [
            {"key": "identification", "type": "modal", "section": "identification"},
            {"key": "origin", "type": "modal", "section": "origin"},
            {"key": "visual", "type": "modal", "section": "visual"},
            {"key": "personality", "type": "modal", "section": "personality"},
            {"key": "combat", "type": "modal", "section": "combat"},
            {"key": "skills", "type": "modal", "section": "skills"},
            {"key": "force_choice", "type": "force_choice", "label": "Machtfähigkeiten"},
            {"key": "possessions", "type": "modal", "section": "possessions"},
            {"key": "history_details", "type": "modal", "section": "history_details"},
            {
                "key": "backstory",
                "type": "collector",
                "data_key": "backstory",
                "label": "Vorgeschichte",
                "required": True,
                "hint": "Sende jetzt die Vorgeschichte als normale Nachricht. `skip` speichert den Schritt leer.",
            },
            {"key": "other", "type": "modal", "section": "other"},
            {
                "key": "uploads",
                "type": "collector",
                "data_key": "uploads",
                "label": "Bild / Theme / Synchro",
                "hint": "Sende Bild-Upload, Theme-Link, Synchro-Link oder `skip`.",
            },
        ],
    },
    "unit": {
        "title": "Einheiten-Steckbrief",
        "singular": "Einheit",
        "required": {"unit_name", "faction", "specialization"},
        "sections": [
            {
                "key": "basic",
                "label": "Grunddaten",
                "fields": [
                    {"key": "unit_name", "label": "Name der Einheit", "required": True},
                    {"key": "faction", "label": "Fraktion", "required": True},
                    {"key": "specialization", "label": "Spezialisierung", "required": True},
                    {"key": "strength", "label": "Mannstärke"},
                    {"key": "base", "label": "Heimatbasis"},
                ],
            },
            {
                "key": "equipment",
                "label": "Ausrüstung",
                "fields": [
                    {"key": "primary_weapon", "label": "Primärbewaffnung"},
                    {"key": "secondary_gear", "label": "Sekundärausrüstung"},
                    {"key": "special_gear", "label": "Spezialausrüstung"},
                    {"key": "vehicles", "label": "Fahrzeuge"},
                    {"key": "ships", "label": "Schiffe"},
                ],
            },
            {
                "key": "abilities",
                "label": "Fähigkeiten",
                "fields": [
                    {"key": "role", "label": "Taktische Rolle", "long": True},
                    {"key": "melee", "label": "Nahkampffähigkeiten", "long": True},
                    {"key": "ranged", "label": "Fernkampffähigkeiten", "long": True},
                    {"key": "training", "label": "Spezialausbildung", "long": True},
                ],
            },
            {
                "key": "advanced",
                "label": "Erweiterte Fähigkeiten",
                "fields": [
                    {"key": "tactics", "label": "Taktisches Verständnis", "long": True},
                    {"key": "tech", "label": "Technikkenntnisse", "long": True},
                    {"key": "piloting", "label": "Piloten-Fähigkeiten", "long": True},
                    {"key": "limits", "label": "Schwächen / Limitierungen", "long": True},
                ],
            },
            {
                "key": "other",
                "label": "Sonstiges",
                "fields": [
                    {"key": "motto", "label": "Motto / Rufzeichen"},
                    {"key": "area", "label": "Einsatzgebiet / Aufgabe", "long": True},
                    {"key": "reputation", "label": "Ruf", "long": True},
                ],
            },
        ],
        "steps": [
            {"key": "basic", "type": "modal", "section": "basic"},
            {"key": "equipment", "type": "modal", "section": "equipment"},
            {"key": "abilities", "type": "modal", "section": "abilities"},
            {"key": "advanced", "type": "modal", "section": "advanced"},
            {"key": "other", "type": "modal", "section": "other"},
            {
                "key": "image_design",
                "type": "collector",
                "data_key": "image_design",
                "label": "Bild / Design",
                "hint": "Sende jetzt ein Bild, einen Design-Link oder `skip`.",
            },
        ],
    },
    "fleet": {
        "title": "Flotten-Steckbrief",
        "singular": "Flotte",
        "required": {"fleet_name", "faction", "commander"},
        "sections": [
            {
                "key": "basic",
                "label": "Grunddaten",
                "fields": [
                    {"key": "fleet_name", "label": "Name der Flotte", "required": True},
                    {"key": "faction", "label": "Fraktion", "required": True},
                    {"key": "commander", "label": "Kommandant", "required": True},
                    {"key": "area", "label": "Operationsgebiet"},
                    {"key": "doctrine", "label": "Doktrin", "long": True},
                ],
            },
            {
                "key": "description",
                "label": "Kurzbeschreibung",
                "fields": [
                    {"key": "description", "label": "Kurzbeschreibung", "long": True},
                ],
            },
        ],
        "steps": [
            {"key": "basic", "type": "modal", "section": "basic"},
            {"key": "description", "type": "modal", "section": "description"},
            {"key": "fleet_ships", "type": "fleet_ships", "label": "Schiffe"},
        ],
    },
}


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                guild_id INTEGER,
                owner_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                status TEXT NOT NULL,
                step INTEGER NOT NULL DEFAULT 0,
                data TEXT NOT NULL,
                ships TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                channel_id INTEGER,
                control_message_id INTEGER,
                published_channel_id INTEGER,
                published_message_id INTEGER
            )
            """
        )
        con.execute("CREATE INDEX IF NOT EXISTS idx_profiles_scope ON profiles(guild_id, owner_id, kind, updated_at)")


def _json_loads(raw: str, fallback: Any) -> Any:
    try:
        value = json.loads(raw)
    except Exception:
        return fallback
    return value if isinstance(value, type(fallback)) else fallback


def _definition(kind: str) -> dict[str, Any]:
    return PROFILE_DEFINITIONS.get(str(kind or "").strip().lower(), PROFILE_DEFINITIONS["character"])


def _get_section(kind: str, section_key: str) -> dict[str, Any]:
    for section in _definition(kind).get("sections", []):
        if section.get("key") == section_key:
            return section
    raise KeyError(f"Unknown section {section_key!r} for {kind!r}")


def _all_fields(kind: str) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for section in _definition(kind).get("sections", []):
        fields.extend(section.get("fields", []))
    for step in _definition(kind).get("steps", []):
        if step.get("type") == "collector":
            fields.append({"key": step.get("data_key"), "label": step.get("label"), "required": step.get("required", False)})
    return fields


def _field_label(kind: str, key: str) -> str:
    for field in _all_fields(kind):
        if field.get("key") == key:
            return str(field.get("label") or key)
    if key == "fleet_ships":
        return "mindestens ein Schiff"
    return key


def _completed_steps(profile: dict[str, Any]) -> set[str]:
    data = profile.setdefault("data", {})
    raw = data.get("_completed_steps", [])
    return {str(item) for item in raw if str(item).strip()} if isinstance(raw, list) else set()


def _mark_step_complete(profile: dict[str, Any], step_key: str) -> None:
    data = profile.setdefault("data", {})
    completed = _completed_steps(profile)
    completed.add(str(step_key))
    data["_completed_steps"] = sorted(completed)


def _row_to_profile(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "guild_id": row["guild_id"],
        "owner_id": row["owner_id"],
        "kind": row["kind"],
        "status": row["status"],
        "step": row["step"],
        "data": _json_loads(row["data"], {}),
        "ships": _json_loads(row["ships"], []),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "channel_id": row["channel_id"],
        "control_message_id": row["control_message_id"],
        "published_channel_id": row["published_channel_id"],
        "published_message_id": row["published_message_id"],
    }


def _load_profile(profile_id: str) -> Optional[dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as con:
        con.row_factory = sqlite3.Row
        row = con.execute("SELECT * FROM profiles WHERE id = ?", (str(profile_id),)).fetchone()
    return _row_to_profile(row) if row else None


def _save_profile(profile: dict[str, Any]) -> None:
    profile["updated_at"] = _now_iso()
    profile["step"] = _progress(profile)[0]
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """
            INSERT INTO profiles (
                id, guild_id, owner_id, kind, status, step, data, ships,
                created_at, updated_at, channel_id, control_message_id,
                published_channel_id, published_message_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                guild_id = excluded.guild_id,
                owner_id = excluded.owner_id,
                kind = excluded.kind,
                status = excluded.status,
                step = excluded.step,
                data = excluded.data,
                ships = excluded.ships,
                updated_at = excluded.updated_at,
                channel_id = excluded.channel_id,
                control_message_id = excluded.control_message_id,
                published_channel_id = excluded.published_channel_id,
                published_message_id = excluded.published_message_id
            """,
            (
                profile["id"],
                profile.get("guild_id"),
                int(profile["owner_id"]),
                profile["kind"],
                profile.get("status", "in_progress"),
                int(profile.get("step", 0)),
                json.dumps(profile.get("data", {}), ensure_ascii=False),
                json.dumps(profile.get("ships", []), ensure_ascii=False),
                profile.get("created_at") or _now_iso(),
                profile["updated_at"],
                profile.get("channel_id"),
                profile.get("control_message_id"),
                profile.get("published_channel_id"),
                profile.get("published_message_id"),
            ),
        )


def _create_profile(guild_id: Optional[int], owner_id: int, kind: str) -> dict[str, Any]:
    now = _now_iso()
    profile = {
        "id": uuid.uuid4().hex[:10],
        "guild_id": guild_id,
        "owner_id": int(owner_id),
        "kind": kind,
        "status": "in_progress",
        "step": 0,
        "data": {"_completed_steps": []},
        "ships": [],
        "created_at": now,
        "updated_at": now,
        "channel_id": None,
        "control_message_id": None,
        "published_channel_id": None,
        "published_message_id": None,
    }
    _save_profile(profile)
    return profile


def _list_profiles(guild_id: Optional[int], user: discord.abc.User, kind: Optional[str] = None) -> list[dict[str, Any]]:
    params: list[Any] = []
    where = []
    if guild_id is None:
        where.append("guild_id IS NULL")
    else:
        where.append("guild_id = ?")
        params.append(int(guild_id))
    if not _is_admin(user):
        where.append("owner_id = ?")
        params.append(int(user.id))
    if kind:
        where.append("kind = ?")
        params.append(kind)
    sql = "SELECT * FROM profiles WHERE " + " AND ".join(where) + " ORDER BY updated_at DESC LIMIT 25"
    with sqlite3.connect(DB_PATH) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(sql, params).fetchall()
    return [_row_to_profile(row) for row in rows]


def _is_admin(user: discord.abc.User) -> bool:
    return isinstance(user, discord.Member) and bool(getattr(user.guild_permissions, "administrator", False))


def _same_guild_scope(profile: dict[str, Any], guild_id: Optional[int]) -> bool:
    stored = profile.get("guild_id")
    return stored is None or guild_id is None or int(stored) == int(guild_id)


def _can_edit(user: discord.abc.User, profile: dict[str, Any]) -> bool:
    return int(getattr(user, "id", 0)) == int(profile.get("owner_id") or 0) or _is_admin(user)


def _visible_name(profile: dict[str, Any]) -> str:
    data = profile.get("data", {})
    for key in ("name", "unit_name", "fleet_name"):
        value = str(data.get(key) or "").strip()
        if value:
            return value
    return f"{_definition(profile.get('kind', 'character'))['singular']} {profile.get('id')}"


def _step_done(profile: dict[str, Any], step: dict[str, Any]) -> bool:
    step_type = step.get("type")
    if step_type == "fleet_ships":
        return bool(profile.get("ships"))
    return str(step.get("key")) in _completed_steps(profile)


def _next_step(profile: dict[str, Any]) -> Optional[dict[str, Any]]:
    for step in _definition(profile.get("kind", "character")).get("steps", []):
        if not _step_done(profile, step):
            return step
    return None


def _progress(profile: dict[str, Any]) -> tuple[int, str]:
    steps = _definition(profile.get("kind", "character")).get("steps", [])
    total = max(1, len(steps))
    done = sum(1 for step in steps if _step_done(profile, step))
    percent = int(round(done / total * 100))
    filled = max(0, min(10, int(round(percent / 10))))
    return percent, "[" + ("#" * filled) + ("-" * (10 - filled)) + f"] {percent}%"


def _required_missing(profile: dict[str, Any]) -> list[str]:
    kind = str(profile.get("kind") or "character")
    data = profile.get("data", {})
    missing = []
    for key in sorted(_definition(kind).get("required", set())):
        if not str(data.get(key) or "").strip():
            missing.append(_field_label(kind, key))
    if kind == "fleet" and not profile.get("ships"):
        missing.append("mindestens ein Schiff")
    return missing


def _clean_value(value: Any, fallback: str = "-") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _truncate(text: str, limit: int = 1900) -> str:
    value = str(text or "")
    if len(value) <= limit:
        return value
    return value[: limit - 18].rstrip() + "\n...[gekürzt]"


def _split_text(text: str, chunk_size: int = 1900) -> list[str]:
    chunks: list[str] = []
    current = ""
    for line in str(text).splitlines():
        candidate = f"{current}\n{line}" if current else line
        if len(candidate) <= chunk_size:
            current = candidate
            continue
        if current:
            chunks.append(current)
        while len(line) > chunk_size:
            chunks.append(line[:chunk_size])
            line = line[chunk_size:]
        current = line
    if current:
        chunks.append(current)
    return chunks or ["-"]


def _sum_numbers(value: Any) -> int:
    normalized = str(value or "").replace(".", "").replace(",", "")
    return sum(int(match) for match in re.findall(r"\d+", normalized))


def _control_embed(profile: dict[str, Any]) -> discord.Embed:
    definition = _definition(profile.get("kind", "character"))
    _, bar = _progress(profile)
    next_step = _next_step(profile)
    missing = _required_missing(profile)
    embed = discord.Embed(
        title=definition["title"],
        description=(
            "Wizard mit Autosave. Kurze Angaben laufen über Modals, lange Texte und Uploads über normale Nachrichten."
        ),
        color=discord.Color.blurple(),
    )
    embed.add_field(name="ID", value=f"`{profile.get('id')}`", inline=True)
    embed.add_field(name="Status", value=f"`{profile.get('status', 'in_progress')}`", inline=True)
    embed.add_field(name="Name", value=_visible_name(profile), inline=False)
    embed.add_field(name="Fortschritt", value=f"`{bar}`", inline=False)
    embed.add_field(
        name="Nächster Schritt",
        value=str(next_step.get("label") or _section_label(profile.get("kind", "character"), next_step.get("section"))) if next_step else "Vorschau prüfen und veröffentlichen",
        inline=False,
    )
    if missing:
        embed.add_field(name="Noch Pflicht", value=", ".join(missing[:8]), inline=False)
    return embed


def _section_label(kind: str, section_key: Optional[str]) -> str:
    if not section_key:
        return "Weiter"
    try:
        return str(_get_section(kind, section_key).get("label") or section_key)
    except KeyError:
        return str(section_key)


def _format_rows(title: str, rows: list[tuple[str, Any]]) -> list[str]:
    lines = [f"═════★【 {title} 】★═════"]
    for label, value in rows:
        lines.append(f"◇ {label}: {_clean_value(value)}")
    return lines


def _format_profile(profile: dict[str, Any]) -> str:
    kind = str(profile.get("kind") or "character")
    data = profile.get("data", {})
    if kind == "character":
        lines = [
            "╔═════════════════════════════════╗",
            "       Republikanischer/Konföderierter Datenbankeintrag",
            "╚═════════════════════════════════╝",
            "",
        ]
        lines += _format_rows(
            "Identifikation",
            [
                ("Name", data.get("name")),
                ("Alias", data.get("alias")),
                ("Spezies", data.get("species")),
                ("Geschlecht", data.get("gender")),
                ("Geburtsjahr", data.get("birth_year")),
                ("Heimatwelt", data.get("homeworld")),
                ("Fraktion", data.get("faction")),
                ("Rang / Position", data.get("rank")),
            ],
        )
        lines += [""] + _format_rows(
            "Visuelles Profil",
            [
                ("Größe", data.get("height")),
                ("Körperbau", data.get("body")),
                ("Augenfarbe", data.get("eyes")),
                ("Haarfarbe", data.get("hair")),
                ("Besondere Merkmale", data.get("features")),
                ("Kleidung / Rüstung", data.get("outfit")),
            ],
        )
        lines += [""] + _format_rows(
            "Psychologisches Profil",
            [
                ("Persönlichkeit", data.get("personality")),
                ("Eigenschaften", data.get("traits")),
                ("Stärken", data.get("strengths")),
                ("Schwächen", data.get("weaknesses")),
                ("Ängste", data.get("fears")),
            ],
        )
        lines += [""] + _format_rows(
            "Kampffähigkeiten & -ausrüstung",
            [
                ("Primärbewaffnung", data.get("primary_weapon")),
                ("Sekundärausrüstung", data.get("secondary_gear")),
                ("Nahkampffähigkeiten", data.get("melee")),
                ("Fernkampffähigkeiten", data.get("ranged")),
                ("Taktisches Verständnis", data.get("tactics")),
                ("Technikkenntnisse", data.get("tech")),
                ("Piloten-Fähigkeiten", data.get("piloting")),
                ("Spezialausbildung", data.get("training")),
            ],
        )
        lines += [""] + _format_rows(
            "Machtfähigkeiten [Optional]",
            [
                ("Machtsensitivität", data.get("force_sensitive")),
                ("Midichlorianer-Wert", data.get("midi_chlorians")),
                ("Lichtschwertkampfform(en)", data.get("lightsaber_forms")),
                ("Bekannte Machtfähigkeiten", data.get("force_powers")),
                ("Rang / Position", data.get("force_rank")),
            ],
        )
        lines += [""] + _format_rows(
            "Besitztümer",
            [
                ("Schiff / Fahrzeug", data.get("ship")),
                ("Finanziell", data.get("finances")),
                ("Sammlerstücke", data.get("collectibles")),
                ("Sonstiges", data.get("other_possessions")),
            ],
        )
        lines += [""] + _format_rows(
            "Vorgeschichte",
            [
                ("Eltern", data.get("parents")),
                ("Familienstatus", data.get("family_status")),
                ("Motivation", data.get("motivation")),
                ("Vorgeschichte", data.get("backstory")),
            ],
        )
        lines += [""] + _format_rows(
            "Sonstiges",
            [
                ("Motto / Zitat", data.get("motto")),
                ("Bild / Theme / Synchro", data.get("uploads")),
            ],
        )
        return "\n".join(lines)

    if kind == "unit":
        lines = []
        lines += _format_rows(
            "Einheitsprofil",
            [
                ("Name der Einheit", data.get("unit_name")),
                ("Fraktion / Zugehörigkeit", data.get("faction")),
                ("Spezialisierung", data.get("specialization")),
                ("Mannstärke", data.get("strength")),
                ("Heimatbasis", data.get("base")),
            ],
        )
        lines += [""] + _format_rows(
            "Ausrüstung & Fahrzeuge",
            [
                ("Primärbewaffnung", data.get("primary_weapon")),
                ("Sekundärausrüstung", data.get("secondary_gear")),
                ("Spezialausrüstung", data.get("special_gear")),
                ("Fahrzeuge", data.get("vehicles")),
                ("Schiffe", data.get("ships")),
                ("Sonstiges", data.get("image_design")),
            ],
        )
        lines += [""] + _format_rows(
            "Fähigkeiten & Besonderheiten",
            [
                ("Taktische Rolle", data.get("role")),
                ("Nahkampffähigkeiten", data.get("melee")),
                ("Fernkampffähigkeiten", data.get("ranged")),
                ("Taktisches Verständnis", data.get("tactics")),
                ("Technikkenntnisse", data.get("tech")),
                ("Piloten-Fähigkeiten", data.get("piloting")),
                ("Spezialausbildung", data.get("training")),
                ("Schwächen / Limitierungen", data.get("limits")),
            ],
        )
        lines += [""] + _format_rows(
            "Sonstiges",
            [
                ("Motto / Rufzeichen", data.get("motto")),
                ("Einsatzgebiet / Aufgabe", data.get("area")),
                ("Ruf", data.get("reputation")),
                ("Bild / Design", data.get("image_design")),
            ],
        )
        return "\n".join(lines)

    ships = profile.get("ships", [])
    total_passengers = sum(_sum_numbers(ship.get("passengers")) for ship in ships)
    total_fighters = sum(_sum_numbers(ship.get("fighters")) for ship in ships)
    total_vehicles = sum(_sum_numbers(ship.get("vehicles")) for ship in ships)
    lines = []
    lines += _format_rows(
        "Grunddaten",
        [
            ("Name der Flotte", data.get("fleet_name")),
            ("Fraktion", data.get("faction")),
            ("Kommandant", data.get("commander")),
            ("Operationsgebiet", data.get("area")),
            ("Doktrin", data.get("doctrine")),
            ("Kurzbeschreibung", data.get("description")),
        ],
    )
    lines += ["", "═════★【 Flottenübersicht 】★═════"]
    if not ships:
        lines.append("◇ Keine Schiffe eingetragen")
    for index, ship in enumerate(ships, start=1):
        lines.extend(
            [
                f"{index}. {_clean_value(ship.get('name'), _clean_value(ship.get('ship_class'), 'Unbenanntes Schiff'))}",
                f"◇ Klasse: {_clean_value(ship.get('ship_class'))}",
                f"◇ Kommandant: {_clean_value(ship.get('commander'))}",
                f"◇ Passagiere: {_clean_value(ship.get('passengers'))}",
                f"◇ Jäger/Raumfahrzeuge: {_clean_value(ship.get('fighters'))}",
                f"◇ Bodenfahrzeuge: {_clean_value(ship.get('vehicles'))}",
                f"◇ Besonderheit: {_clean_value(ship.get('special'))}",
                "",
            ]
        )
    lines += _format_rows(
        "Gesamtbestand",
        [
            ("Passagiere", total_passengers),
            ("Jäger/Raumfahrzeuge", total_fighters),
            ("Bodenfahrzeuge", total_vehicles),
        ],
    )
    return "\n".join(lines)


async def _refresh_control_message(profile: dict[str, Any]) -> None:
    channel_id = profile.get("channel_id")
    message_id = profile.get("control_message_id")
    if not channel_id or not message_id:
        return
    try:
        channel = bot.get_channel(int(channel_id)) or await bot.fetch_channel(int(channel_id))
        message = await channel.fetch_message(int(message_id))  # type: ignore[attr-defined]
        await message.edit(embed=_control_embed(profile), view=ProfileControlView(str(profile["id"])))
    except Exception:
        return


class ProfileSectionModal(discord.ui.Modal):
    def __init__(self, profile_id: str, kind: str, section_key: str):
        self.profile_id = str(profile_id)
        self.kind = str(kind)
        self.section_key = str(section_key)
        section = _get_section(kind, section_key)
        super().__init__(title=str(section.get("label") or "Abschnitt")[:45])
        profile = _load_profile(profile_id) or {"data": {}}
        data = profile.get("data", {})
        self.items_by_field: list[tuple[dict[str, Any], discord.ui.TextInput]] = []
        for field in section.get("fields", [])[:5]:
            max_length = int(field.get("max_length") or (1800 if field.get("long") else 120))
            text_input = discord.ui.TextInput(
                label=str(field.get("label") or field.get("key"))[:45],
                style=discord.TextStyle.paragraph if field.get("long") else discord.TextStyle.short,
                required=bool(field.get("required", False)),
                max_length=max_length,
                default=str(data.get(field.get("key")) or "")[:max_length] or None,
            )
            self.items_by_field.append((field, text_input))
            self.add_item(text_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Wizard gehört nicht dir.", ephemeral=True)
            return

        data = profile.setdefault("data", {})
        for field, text_input in self.items_by_field:
            data[str(field.get("key"))] = str(text_input.value or "").strip()
        if self.section_key == "force":
            data["force_sensitive"] = "Ja"
            _mark_step_complete(profile, "force_choice")
        else:
            _mark_step_complete(profile, self.section_key)
        _save_profile(profile)
        await interaction.response.send_message("Abschnitt gespeichert.", ephemeral=True)
        await _refresh_control_message(profile)


class FleetShipCoreModal(discord.ui.Modal):
    def __init__(self, profile_id: str, ship_id: Optional[str] = None):
        self.profile_id = str(profile_id)
        self.ship_id = ship_id
        super().__init__(title="Schiff eintragen" if ship_id is None else "Schiff bearbeiten")
        ship = self._ship()
        self.name_input = discord.ui.TextInput(label="Schiffsname", required=False, max_length=120, default=ship.get("name") or None)
        self.class_input = discord.ui.TextInput(label="Klasse", required=True, max_length=120, default=ship.get("ship_class") or None)
        self.commander_input = discord.ui.TextInput(label="Kommandant", required=False, max_length=120, default=ship.get("commander") or None)
        self.passengers_input = discord.ui.TextInput(label="Passagiere", required=False, max_length=120, default=ship.get("passengers") or None)
        self.fighters_input = discord.ui.TextInput(label="Jäger/Raumfahrzeuge", required=False, max_length=120, default=ship.get("fighters") or None)
        for item in (self.name_input, self.class_input, self.commander_input, self.passengers_input, self.fighters_input):
            self.add_item(item)

    def _ship(self) -> dict[str, Any]:
        if not self.ship_id:
            return {}
        profile = _load_profile(self.profile_id)
        if not profile:
            return {}
        return next((ship for ship in profile.get("ships", []) if ship.get("id") == self.ship_id), {})

    async def on_submit(self, interaction: discord.Interaction) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or profile.get("kind") != "fleet" or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Flotte nicht gefunden.", ephemeral=True)
            return
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Diese Flotte gehört nicht dir.", ephemeral=True)
            return

        ships = profile.setdefault("ships", [])
        ship_id = self.ship_id or uuid.uuid4().hex[:8]
        ship = next((item for item in ships if item.get("id") == ship_id), None)
        if ship is None:
            ship = {"id": ship_id, "vehicles": "", "special": ""}
            ships.append(ship)
        ship.update(
            {
                "name": str(self.name_input.value or "").strip(),
                "ship_class": str(self.class_input.value or "").strip(),
                "commander": str(self.commander_input.value or "").strip(),
                "passengers": str(self.passengers_input.value or "").strip(),
                "fighters": str(self.fighters_input.value or "").strip(),
            }
        )
        _mark_step_complete(profile, "fleet_ships")
        _save_profile(profile)
        await interaction.response.send_message(
            "Schiff gespeichert. Du kannst jetzt Details ergänzen oder weitere Schiffe hinzufügen.",
            view=FleetShipAfterSaveView(self.profile_id, ship_id),
            ephemeral=True,
        )
        await _refresh_control_message(profile)


class FleetShipDetailsModal(discord.ui.Modal):
    def __init__(self, profile_id: str, ship_id: str):
        self.profile_id = str(profile_id)
        self.ship_id = str(ship_id)
        super().__init__(title="Schiffdetails")
        ship = self._ship()
        self.vehicles_input = discord.ui.TextInput(
            label="Bodenfahrzeuge",
            required=False,
            max_length=600,
            style=discord.TextStyle.paragraph,
            default=ship.get("vehicles") or None,
        )
        self.special_input = discord.ui.TextInput(
            label="Besonderheit",
            required=False,
            max_length=1000,
            style=discord.TextStyle.paragraph,
            default=ship.get("special") or None,
        )
        self.add_item(self.vehicles_input)
        self.add_item(self.special_input)

    def _ship(self) -> dict[str, Any]:
        profile = _load_profile(self.profile_id)
        if not profile:
            return {}
        return next((ship for ship in profile.get("ships", []) if ship.get("id") == self.ship_id), {})

    async def on_submit(self, interaction: discord.Interaction) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Flotte nicht gefunden.", ephemeral=True)
            return
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Diese Flotte gehört nicht dir.", ephemeral=True)
            return
        ship = next((item for item in profile.get("ships", []) if item.get("id") == self.ship_id), None)
        if ship is None:
            await interaction.response.send_message("Schiff nicht gefunden.", ephemeral=True)
            return
        ship["vehicles"] = str(self.vehicles_input.value or "").strip()
        ship["special"] = str(self.special_input.value or "").strip()
        _mark_step_complete(profile, "fleet_ships")
        _save_profile(profile)
        await interaction.response.send_message("Schiffdetails gespeichert.", ephemeral=True)
        await _refresh_control_message(profile)


class FleetShipAfterSaveView(discord.ui.View):
    def __init__(self, profile_id: str, ship_id: str):
        super().__init__(timeout=600)
        self.profile_id = profile_id
        self.ship_id = ship_id

    @discord.ui.button(label="Details ergänzen", style=discord.ButtonStyle.secondary)
    async def details(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await interaction.response.send_modal(FleetShipDetailsModal(self.profile_id, self.ship_id))

    @discord.ui.button(label="Weiteres Schiff", style=discord.ButtonStyle.success)
    async def add_another(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await interaction.response.send_modal(FleetShipCoreModal(self.profile_id))


class ForceChoiceView(discord.ui.View):
    def __init__(self, profile_id: str):
        super().__init__(timeout=600)
        self.profile_id = profile_id

    @discord.ui.button(label="Ja", style=discord.ButtonStyle.success)
    async def yes(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await interaction.response.send_modal(ProfileSectionModal(self.profile_id, "character", "force"))

    @discord.ui.button(label="Nein", style=discord.ButtonStyle.secondary)
    async def no(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Wizard gehört nicht dir.", ephemeral=True)
            return
        profile.setdefault("data", {})["force_sensitive"] = "Nein"
        _mark_step_complete(profile, "force_choice")
        _save_profile(profile)
        await interaction.response.send_message("Machtfähigkeiten übersprungen.", ephemeral=True)
        await _refresh_control_message(profile)


class FleetShipsView(discord.ui.View):
    def __init__(self, profile_id: str):
        super().__init__(timeout=600)
        self.profile_id = profile_id

    @discord.ui.button(label="Schiff hinzufügen", style=discord.ButtonStyle.success)
    async def add_ship(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await interaction.response.send_modal(FleetShipCoreModal(self.profile_id))

    @discord.ui.button(label="Schiffe bearbeiten", style=discord.ButtonStyle.secondary)
    async def edit_ships(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not profile.get("ships"):
            await interaction.response.send_message("Noch keine Schiffe vorhanden.", ephemeral=True)
            return
        await interaction.response.send_message("Wähle ein Schiff.", view=FleetShipSelectView(self.profile_id), ephemeral=True)

    @discord.ui.button(label="Fertig", style=discord.ButtonStyle.primary)
    async def done(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Flotte nicht gefunden.", ephemeral=True)
            return
        _mark_step_complete(profile, "fleet_ships")
        _save_profile(profile)
        await interaction.response.send_message("Schiffsliste gespeichert.", ephemeral=True)
        await _refresh_control_message(profile)


class FleetShipSelect(discord.ui.Select):
    def __init__(self, profile_id: str, ships: list[dict[str, Any]]):
        self.profile_id = profile_id
        options = []
        for ship in ships[:25]:
            label = _clean_value(ship.get("name"), _clean_value(ship.get("ship_class"), "Unbenanntes Schiff"))[:100]
            options.append(discord.SelectOption(label=label, value=str(ship.get("id"))))
        super().__init__(placeholder="Schiff auswählen", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_modal(FleetShipCoreModal(self.profile_id, self.values[0]))


class FleetShipSelectView(discord.ui.View):
    def __init__(self, profile_id: str):
        super().__init__(timeout=600)
        profile = _load_profile(profile_id)
        if profile and profile.get("ships"):
            self.add_item(FleetShipSelect(profile_id, profile.get("ships", [])))


class EditSectionSelect(discord.ui.Select):
    def __init__(self, profile: dict[str, Any]):
        self.profile_id = str(profile["id"])
        self.kind = str(profile["kind"])
        options: list[discord.SelectOption] = []
        for step in _definition(self.kind).get("steps", []):
            if step.get("type") == "modal":
                label = _section_label(self.kind, step.get("section"))
            else:
                label = str(step.get("label") or step.get("key"))
            options.append(discord.SelectOption(label=label[:100], value=str(step.get("key"))))
        super().__init__(placeholder="Abschnitt bearbeiten", min_values=1, max_values=1, options=options[:25])

    async def callback(self, interaction: discord.Interaction) -> None:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Wizard gehört nicht dir.", ephemeral=True)
            return
        selected = self.values[0]
        step = next((item for item in _definition(self.kind).get("steps", []) if item.get("key") == selected), None)
        if not step:
            await interaction.response.send_message("Abschnitt nicht gefunden.", ephemeral=True)
            return
        await _open_step(interaction, profile, step)


class EditSectionView(discord.ui.View):
    def __init__(self, profile: dict[str, Any]):
        super().__init__(timeout=600)
        self.add_item(EditSectionSelect(profile))


class PreviewActionView(discord.ui.View):
    def __init__(self, profile_id: str):
        super().__init__(timeout=600)
        self.profile_id = profile_id

    @discord.ui.button(label="Veröffentlichen", style=discord.ButtonStyle.success)
    async def publish(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await _publish_profile(interaction, self.profile_id)

    @discord.ui.button(label="Bearbeiten", style=discord.ButtonStyle.secondary)
    async def edit(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        profile = _load_profile(self.profile_id)
        if not profile:
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return
        await interaction.response.send_message("Wähle einen Abschnitt.", view=EditSectionView(profile), ephemeral=True)

    @discord.ui.button(label="Abbrechen", style=discord.ButtonStyle.danger)
    async def cancel(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await _cancel_profile(interaction, self.profile_id)


class ProfileControlView(discord.ui.View):
    def __init__(self, profile_id: str):
        super().__init__(timeout=1800)
        self.profile_id = str(profile_id)
        self._build()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        profile = _load_profile(self.profile_id)
        if not profile or not _same_guild_scope(profile, interaction.guild_id):
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return False
        if not _can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Wizard gehört nicht dir.", ephemeral=True)
            return False
        return True

    def _add_button(self, label: str, style: discord.ButtonStyle, row: int, callback) -> None:
        button = discord.ui.Button(label=label, style=style, row=row)
        button.callback = callback
        self.add_item(button)

    def _build(self) -> None:
        async def next_step(interaction: discord.Interaction) -> None:
            profile = _load_profile(self.profile_id)
            if not profile:
                await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
                return
            step = _next_step(profile)
            if not step:
                await _show_preview(interaction, self.profile_id)
                return
            await _open_step(interaction, profile, step)

        async def preview(interaction: discord.Interaction) -> None:
            await _show_preview(interaction, self.profile_id)

        async def edit(interaction: discord.Interaction) -> None:
            profile = _load_profile(self.profile_id)
            if not profile:
                await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
                return
            await interaction.response.send_message("Wähle einen Abschnitt.", view=EditSectionView(profile), ephemeral=True)

        async def publish(interaction: discord.Interaction) -> None:
            await _publish_profile(interaction, self.profile_id)

        async def cancel(interaction: discord.Interaction) -> None:
            await _cancel_profile(interaction, self.profile_id)

        profile = _load_profile(self.profile_id)
        next_label = "Start" if profile and not _completed_steps(profile) and not profile.get("ships") else "Weiter"
        self._add_button(next_label, discord.ButtonStyle.primary, 0, next_step)
        self._add_button("Vorschau", discord.ButtonStyle.secondary, 0, preview)
        self._add_button("Bearbeiten", discord.ButtonStyle.secondary, 0, edit)
        self._add_button("Veröffentlichen", discord.ButtonStyle.success, 1, publish)
        self._add_button("Abbrechen", discord.ButtonStyle.danger, 1, cancel)
        if profile and profile.get("kind") == "fleet":
            async def ships(interaction: discord.Interaction) -> None:
                await interaction.response.send_message("Verwalte die Schiffe dieser Flotte.", view=FleetShipsView(self.profile_id), ephemeral=True)

            self._add_button("Schiffe", discord.ButtonStyle.primary, 2, ships)


async def _open_step(interaction: discord.Interaction, profile: dict[str, Any], step: dict[str, Any]) -> None:
    step_type = step.get("type")
    if step_type == "modal":
        await interaction.response.send_modal(ProfileSectionModal(str(profile["id"]), str(profile["kind"]), str(step.get("section"))))
        return
    if step_type == "force_choice":
        await interaction.response.send_message("Ist der Charakter machtsensitiv?", view=ForceChoiceView(str(profile["id"])), ephemeral=True)
        return
    if step_type == "collector":
        await _collect_message(interaction, str(profile["id"]), step)
        return
    if step_type == "fleet_ships":
        await interaction.response.send_message("Füge Schiffe hinzu oder bearbeite vorhandene Einträge.", view=FleetShipsView(str(profile["id"])), ephemeral=True)
        return
    await interaction.response.send_message("Dieser Schritt ist noch nicht verfügbar.", ephemeral=True)


async def _collect_message(interaction: discord.Interaction, profile_id: str, step: dict[str, Any]) -> None:
    profile = _load_profile(profile_id)
    if not profile or not _same_guild_scope(profile, interaction.guild_id):
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    if not interaction.channel:
        await interaction.response.send_message("Dieser Schritt braucht einen Textkanal.", ephemeral=True)
        return
    await interaction.response.send_message(str(step.get("hint") or "Sende deine Antwort oder `skip`.")[:1900], ephemeral=True)

    def check(message: discord.Message) -> bool:
        return (
            message.author.id == interaction.user.id
            and message.channel.id == interaction.channel_id
            and not message.author.bot
        )

    try:
        message = await bot.wait_for("message", check=check, timeout=600)
    except asyncio.TimeoutError:
        profile = _load_profile(profile_id) or profile
        profile["status"] = "paused"
        _save_profile(profile)
        await interaction.followup.send("Timeout. Die Session wurde pausiert und kann später fortgesetzt werden.", ephemeral=True)
        await _refresh_control_message(profile)
        return

    text = str(message.content or "").strip()
    value = ""
    if text.lower() != "skip":
        attachments = [attachment.url for attachment in message.attachments]
        value = "\n".join(part for part in [text, *attachments] if str(part or "").strip())
    profile = _load_profile(profile_id) or profile
    profile.setdefault("data", {})[str(step.get("data_key"))] = value
    _mark_step_complete(profile, str(step.get("key")))
    if profile.get("status") == "paused":
        profile["status"] = "in_progress"
    _save_profile(profile)
    try:
        await message.add_reaction("✅")
    except Exception:
        pass
    await interaction.followup.send("Eingabe gespeichert.", ephemeral=True)
    await _refresh_control_message(profile)


async def _show_preview(interaction: discord.Interaction, profile_id: str) -> None:
    profile = _load_profile(profile_id)
    if not profile or not _same_guild_scope(profile, interaction.guild_id):
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    text = _format_profile(profile)
    await interaction.response.send_message(_truncate(text), view=PreviewActionView(profile_id), ephemeral=True)


async def _publish_profile(interaction: discord.Interaction, profile_id: str) -> None:
    profile = _load_profile(profile_id)
    if not profile or not _same_guild_scope(profile, interaction.guild_id):
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    missing = _required_missing(profile)
    if missing:
        await interaction.response.send_message("Noch offen: " + ", ".join(missing), ephemeral=True)
        return
    if not interaction.channel:
        await interaction.response.send_message("Kein Zielkanal gefunden.", ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True)
    first_message: Optional[discord.Message] = None
    for chunk in _split_text(_format_profile(profile)):
        sent = await interaction.channel.send(chunk)
        if first_message is None:
            first_message = sent
    profile["status"] = "published"
    profile["published_channel_id"] = interaction.channel_id
    profile["published_message_id"] = first_message.id if first_message else None
    _save_profile(profile)
    await _refresh_control_message(profile)
    await interaction.followup.send("Steckbrief veröffentlicht.", ephemeral=True)


async def _cancel_profile(interaction: discord.Interaction, profile_id: str) -> None:
    profile = _load_profile(profile_id)
    if not profile or not _same_guild_scope(profile, interaction.guild_id):
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    profile["status"] = "canceled"
    _save_profile(profile)
    await interaction.response.send_message("Wizard abgebrochen. Die gespeicherten Angaben bleiben erhalten.", ephemeral=True)
    await _refresh_control_message(profile)


async def _start_profile_in_channel(channel: discord.abc.Messageable, author: discord.abc.User, guild_id: Optional[int], kind: str) -> dict[str, Any]:
    profile = _create_profile(guild_id, int(author.id), kind)
    message = await channel.send(embed=_control_embed(profile), view=ProfileControlView(str(profile["id"])))
    profile["channel_id"] = message.channel.id
    profile["control_message_id"] = message.id
    _save_profile(profile)
    return profile


async def _send_existing_control(channel: discord.abc.Messageable, author: discord.abc.User, guild_id: Optional[int], profile_id: str, kind: str) -> None:
    profile = _load_profile(profile_id)
    if not profile or profile.get("kind") != kind or not _same_guild_scope(profile, guild_id):
        await channel.send("Steckbrief nicht gefunden.")
        return
    if not _can_edit(author, profile):
        await channel.send("Dieser Steckbrief gehört nicht dir.")
        return
    message = await channel.send(embed=_control_embed(profile), view=ProfileControlView(str(profile["id"])))
    profile["channel_id"] = message.channel.id
    profile["control_message_id"] = message.id
    _save_profile(profile)


async def _slash_start(interaction: discord.Interaction, kind: str) -> None:
    profile = _create_profile(interaction.guild_id, int(interaction.user.id), kind)
    await interaction.response.send_message(embed=_control_embed(profile), view=ProfileControlView(str(profile["id"])))
    message = await interaction.original_response()
    profile["channel_id"] = message.channel.id
    profile["control_message_id"] = message.id
    _save_profile(profile)


async def _slash_edit(interaction: discord.Interaction, profile_id: str, kind: str) -> None:
    profile = _load_profile(profile_id)
    if not profile or profile.get("kind") != kind or not _same_guild_scope(profile, interaction.guild_id):
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    if not _can_edit(interaction.user, profile):
        await interaction.response.send_message("Dieser Steckbrief gehört nicht dir.", ephemeral=True)
        return
    await interaction.response.send_message(embed=_control_embed(profile), view=ProfileControlView(str(profile["id"])))
    message = await interaction.original_response()
    profile["channel_id"] = message.channel.id
    profile["control_message_id"] = message.id
    _save_profile(profile)


async def _slash_list(interaction: discord.Interaction, kind: str) -> None:
    rows = _list_profiles(interaction.guild_id, interaction.user, kind)
    if not rows:
        await interaction.response.send_message("Keine Einträge gefunden.", ephemeral=True)
        return
    lines = [f"**{_definition(kind)['title']}**"]
    for profile in rows:
        lines.append(f"- `{profile['id']}` | {profile['status']} | {_visible_name(profile)}")
    await interaction.response.send_message(_truncate("\n".join(lines)), ephemeral=True)


intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(
    command_prefix=COMMAND_PREFIX,
    intents=intents,
    allowed_mentions=discord.AllowedMentions.none(),
    help_command=None,
)


@bot.event
async def on_ready() -> None:
    if not getattr(bot, "_slash_synced", False):
        bot._slash_synced = True
        try:
            if TARGET_GUILD_ID:
                guild = discord.Object(id=int(TARGET_GUILD_ID))
                bot.tree.copy_global_to(guild=guild)
                await bot.tree.sync(guild=guild)
            else:
                await bot.tree.sync()
            print("Steckbrief Slash-Commands synchronisiert.")
        except Exception as exc:
            print(f"Slash-Sync fehlgeschlagen: {exc}")
    print(f"Eingeloggt als {bot.user} ({bot.user.id if bot.user else 'unknown'})")


@bot.event
async def on_command_error(ctx: commands.Context, error: commands.CommandError) -> None:
    if isinstance(error, commands.CommandNotFound):
        return
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("Da fehlt noch ein Argument. Beispiel: `Eco steckbrief bearbeiten <id>`")
        return
    await ctx.send(f"Fehler: {error}")


@bot.command(name="hilfe")
async def help_command(ctx: commands.Context) -> None:
    await ctx.send(
        "Befehle: `Eco steckbrief erstellen`, `Eco einheit erstellen`, `Eco flotte erstellen`.\n"
        "Slash: `/steckbrief erstellen`, `/einheit erstellen`, `/flotte erstellen`."
    )


@bot.group(name="steckbrief", invoke_without_command=True)
async def prefix_steckbrief(ctx: commands.Context) -> None:
    await ctx.send("Charakter: `Eco steckbrief erstellen`, `Eco steckbrief bearbeiten <id>`, `Eco steckbrief liste`")


@prefix_steckbrief.command(name="erstellen")
async def prefix_steckbrief_create(ctx: commands.Context) -> None:
    await _start_profile_in_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "character")


@prefix_steckbrief.command(name="bearbeiten")
async def prefix_steckbrief_edit(ctx: commands.Context, profile_id: str) -> None:
    await _send_existing_control(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id, "character")


@prefix_steckbrief.command(name="liste")
async def prefix_steckbrief_list(ctx: commands.Context) -> None:
    rows = _list_profiles(ctx.guild.id if ctx.guild else None, ctx.author, "character")
    text = "\n".join(f"`{profile['id']}` | {profile['status']} | {_visible_name(profile)}" for profile in rows) or "Keine Einträge gefunden."
    await ctx.send(_truncate(text))


@bot.group(name="einheit", invoke_without_command=True)
async def prefix_einheit(ctx: commands.Context) -> None:
    await ctx.send("Einheit: `Eco einheit erstellen`, `Eco einheit bearbeiten <id>`, `Eco einheit liste`")


@prefix_einheit.command(name="erstellen")
async def prefix_einheit_create(ctx: commands.Context) -> None:
    await _start_profile_in_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "unit")


@prefix_einheit.command(name="bearbeiten")
async def prefix_einheit_edit(ctx: commands.Context, profile_id: str) -> None:
    await _send_existing_control(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id, "unit")


@prefix_einheit.command(name="liste")
async def prefix_einheit_list(ctx: commands.Context) -> None:
    rows = _list_profiles(ctx.guild.id if ctx.guild else None, ctx.author, "unit")
    text = "\n".join(f"`{profile['id']}` | {profile['status']} | {_visible_name(profile)}" for profile in rows) or "Keine Einträge gefunden."
    await ctx.send(_truncate(text))


@bot.group(name="flotte", invoke_without_command=True)
async def prefix_flotte(ctx: commands.Context) -> None:
    await ctx.send("Flotte: `Eco flotte erstellen`, `Eco flotte bearbeiten <id>`, `Eco flotte liste`")


@prefix_flotte.command(name="erstellen")
async def prefix_flotte_create(ctx: commands.Context) -> None:
    await _start_profile_in_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "fleet")


@prefix_flotte.command(name="bearbeiten")
async def prefix_flotte_edit(ctx: commands.Context, profile_id: str) -> None:
    await _send_existing_control(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id, "fleet")


@prefix_flotte.command(name="liste")
async def prefix_flotte_list(ctx: commands.Context) -> None:
    rows = _list_profiles(ctx.guild.id if ctx.guild else None, ctx.author, "fleet")
    text = "\n".join(f"`{profile['id']}` | {profile['status']} | {_visible_name(profile)}" for profile in rows) or "Keine Einträge gefunden."
    await ctx.send(_truncate(text))


slash_steckbrief = app_commands.Group(name="steckbrief", description="Charakter-Steckbriefe")
slash_einheit = app_commands.Group(name="einheit", description="Einheiten-Steckbriefe")
slash_flotte = app_commands.Group(name="flotte", description="Flotten-Steckbriefe")


@slash_steckbrief.command(name="erstellen", description="Neuen Charakter-Steckbrief starten")
async def slash_steckbrief_create(interaction: discord.Interaction) -> None:
    await _slash_start(interaction, "character")


@slash_steckbrief.command(name="bearbeiten", description="Charakter-Steckbrief fortsetzen")
@app_commands.describe(profile_id="ID des Steckbriefs")
async def slash_steckbrief_edit(interaction: discord.Interaction, profile_id: str) -> None:
    await _slash_edit(interaction, profile_id, "character")


@slash_steckbrief.command(name="liste", description="Eigene Charakter-Steckbriefe anzeigen")
async def slash_steckbrief_list(interaction: discord.Interaction) -> None:
    await _slash_list(interaction, "character")


@slash_einheit.command(name="erstellen", description="Neue Einheit erstellen")
async def slash_einheit_create(interaction: discord.Interaction) -> None:
    await _slash_start(interaction, "unit")


@slash_einheit.command(name="bearbeiten", description="Einheiten-Steckbrief fortsetzen")
@app_commands.describe(profile_id="ID der Einheit")
async def slash_einheit_edit(interaction: discord.Interaction, profile_id: str) -> None:
    await _slash_edit(interaction, profile_id, "unit")


@slash_einheit.command(name="liste", description="Eigene Einheiten anzeigen")
async def slash_einheit_list(interaction: discord.Interaction) -> None:
    await _slash_list(interaction, "unit")


@slash_flotte.command(name="erstellen", description="Neue Flotte erstellen")
async def slash_flotte_create(interaction: discord.Interaction) -> None:
    await _slash_start(interaction, "fleet")


@slash_flotte.command(name="bearbeiten", description="Flotten-Steckbrief fortsetzen")
@app_commands.describe(profile_id="ID der Flotte")
async def slash_flotte_edit(interaction: discord.Interaction, profile_id: str) -> None:
    await _slash_edit(interaction, profile_id, "fleet")


@slash_flotte.command(name="liste", description="Eigene Flotten anzeigen")
async def slash_flotte_list(interaction: discord.Interaction) -> None:
    await _slash_list(interaction, "fleet")


bot.tree.add_command(slash_steckbrief)
bot.tree.add_command(slash_einheit)
bot.tree.add_command(slash_flotte)


_init_db()


if __name__ == "__main__":
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN ist nicht gesetzt. Lege ihn in Administration/.env als BOT_TOKEN=... ab.")
    bot.run(BOT_TOKEN)
