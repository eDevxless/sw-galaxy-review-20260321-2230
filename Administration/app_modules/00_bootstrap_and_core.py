# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# ...existing code...
import asyncio
import datetime
import difflib
import hashlib
import heapq
import io
import json
import math
import os
import random
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import discord
from discord.ext import commands
try:
    import torch  # type: ignore[import-not-found]
except Exception:
    torch = None

BOT_TOKEN = os.getenv("BOT_TOKEN")

# **STATE-CHANNEL HELFER KATEGORIE**
# Unterkapitel: Robust Channels/Foren/Kategorien aufloesen und loeschen.
async def _fetch_guild_channel_any(guild: Optional[discord.Guild], channel_id: Optional[int]):
    if guild is None or not channel_id:
        return None
    cid = int(channel_id)
    channel = guild.get_channel(cid) or guild.get_thread(cid)
    if channel is not None:
        return channel
    try:
        return await guild.fetch_channel(cid)
    except Exception:
        return None


async def _delete_guild_channel_any(
    guild: Optional[discord.Guild], channel_id: Optional[int], reason: str = ""
) -> tuple[bool, str]:
    channel = await _fetch_guild_channel_any(guild, channel_id)
    if channel is None:
        return False, "not_found"
    try:
        await channel.delete(reason=reason[:400] if reason else None)
        return True, str(channel_id)
    except Exception as exc:
        return False, f"{channel_id}: {exc}"


# === State Wizard Setup Function ===
async def _finalize_state_wizard_setup(
    state_entity_id,
    guild,
    channel,
    territory_count: Optional[int] = None,
    territory_names: Optional[list[str]] = None,
):
    state_entity = economy_data["entities"].get(str(state_entity_id))
    if not state_entity:
        return False, "State-Entity nicht gefunden."

    state_name = str(state_entity.get("name", state_entity_id))
    normalized_territories: list[str] = []
    seen_territories: set[str] = set()
    for raw_name in territory_names or []:
        text = str(raw_name or "").strip()
        if not text:
            continue
        key = text.lower()
        if key in seen_territories:
            continue
        seen_territories.add(key)
        normalized_territories.append(text[:80])

    if normalized_territories:
        territory_names = normalized_territories[:20]
    else:
        if territory_count is None:
            return False, "Bitte gib mindestens ein Territorium an."
        if not guild_setting_supports(guild.id if guild else None, "experimental_territory_autogen"):
            return False, "Dieses Setting verlangt eine manuelle Territorienliste."
        try:
            territory_total = max(3, min(20, int(territory_count)))
        except Exception:
            return False, "Territorienzahl ungueltig."
        try:
            territory_names = generate_territory_names(state_name, territory_total)
        except Exception:
            territory_names = [f"{state_name[:12]}-{i+1}" for i in range(territory_total)]

    if not territory_names:
        return False, "Es konnten keine Territorien vorbereitet werden."

    state_entity.setdefault("territories", territory_names)
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {})
    profile["territory_count"] = int(len(territory_names))
    profile["territories"] = territory_names

    # Create Discord category for the state
    category_name = f"Staat {state_name}"
    discord_category = None
    if guild is not None:
        # Bei Re-Edit alte Territoriumsforen/Channels entfernen, damit keine Duplikate bleiben.
        old_territory_ids = set()
        for raw_id in profile.get("territory_channel_ids", []) or []:
            try:
                old_territory_ids.add(int(raw_id))
            except Exception:
                continue
        for forum in profile.get("territory_forums", []) or []:
            try:
                old_territory_ids.add(int((forum or {}).get("channel_id")))
            except Exception:
                continue
        for chan_id in sorted(old_territory_ids):
            await _delete_guild_channel_any(
                guild,
                chan_id,
                reason=f"State {state_name}: Territorien werden neu erstellt",
            )

        try:
            existing_category = discord.utils.get(guild.categories, name=category_name)
            if existing_category:
                discord_category = existing_category
            else:
                discord_category = await guild.create_category(category_name)
            profile["discord_category_id"] = discord_category.id if discord_category else None
        except Exception:
            discord_category = None

        # Create law-log and contract-log channels as text channels
        try:
            law_log_channel = discord.utils.get(discord_category.channels, name="law-log") if discord_category else None
            if not law_log_channel and discord_category:
                law_log_channel = await guild.create_text_channel("law-log", category=discord_category)
            profile["law_log_channel_id"] = law_log_channel.id if law_log_channel else None
        except Exception:
            profile["law_log_channel_id"] = None

        try:
            contract_log_channel = (
                discord.utils.get(discord_category.channels, name="contract-log") if discord_category else None
            )
            if not contract_log_channel and discord_category:
                contract_log_channel = await guild.create_text_channel("contract-log", category=discord_category)
            profile["contract_log_channel_id"] = contract_log_channel.id if contract_log_channel else None
        except Exception:
            profile["contract_log_channel_id"] = None

        # Create territory channels as forums
        territory_channel_ids = []
        for territory_name in territory_names:
            try:
                channel_name = territory_name
                territory_channel = discord.utils.get(discord_category.channels, name=channel_name) if discord_category else None
                if not territory_channel and discord_category:
                    territory_channel = await guild.create_forum(channel_name, category=discord_category)
                if territory_channel:
                    territory_channel_ids.append(territory_channel.id)
            except Exception:
                continue
        profile["territory_channel_ids"] = territory_channel_ids

    svg = _generate_state_svg_map(state_name, territory_names)
    save_state_map_svg(
        state_entity_id=str(state_entity_id),
        state_name=state_name,
        territories=territory_names,
        svg=svg,
        guild_id=guild.id if guild else None,
    )
    if guild is not None:
        rebuild_world_map_for_guild(guild.id)

    try:
        sync_state_territory_lore_index(save_changes=True)
    except Exception:
        pass

    save_economy()
    territory_preview = ", ".join(territory_names[:8]) + (" ..." if len(territory_names) > 8 else "")
    return (
        True,
        f"State-Wizard abgeschlossen fuer Entity {state_entity_id} mit {len(territory_names)} Territorien "
        f"und Kategorie '{category_name}'.\nTerritorien: {territory_preview}",
    )


intents = discord.Intents.default()
intents.members = True
intents.message_content = True
bot = commands.Bot(
    command_prefix="Eco ",
    intents=intents,
    help_command=None,
    allowed_mentions=discord.AllowedMentions.none(),
)

DEVICE = "GPU" if torch and torch.cuda.is_available() else "CPU"
print(f"System erkannt: {DEVICE}")

# **KI-PROVIDER KONFIGURATION**
# Unterkapitel: Unterstuetzung fuer verschiedene KI-Provider (Gemini, Ollama)

# Gemini (Google) Konfiguration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_RPM_LIMIT = 15
GEMINI_RPD_LIMIT = 200

# Ollama (Lokal) Konfiguration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "false").lower() in ("true", "1", "yes")

# Aktueller Provider: "ollama", "gemini" oder "external_openai"
LLM_PROVIDER = "ollama" if OLLAMA_ENABLED else "gemini"

LANGUAGE_MODE = "auto"

BASE_PERSONA = (
    "Du schreibst nicht als KI-Chatbot, sondern als eine Rollenspielfigur oder Gruppe. "
    "Je nachdem, ob du eine Gruppe bist, dann schreibst du im Plural oder mit 'man', "
    "oder ein Charakter, dann schreibst du mit Singular. "
    "Schreibe immer unter 1000 Zeichen und schreibe nichts ausser das, "
    "was deine vorgegebene Persona sagen oder tun wuerde. "
    "Sei handlungsorientiert: Jede Antwort muss die Story sichtbar voranbringen. "
    "Vermeide leeren Smalltalk. Fuehre Konflikte, Entscheidungen, Allianzen, Risiken "
    "oder konkrete naechste Schritte ein.\n\n"
)

STORY_PROGRESSION_DIRECTIVE = (
    "Story-Progressionsregel: "
    "Jede Antwort enthaelt mindestens einen konkreten Fortschrittspunkt, z. B. "
    "eine Entscheidung, eine Aktion, eine Forderung, eine Verhandlung, ein Risiko "
    "oder eine Konsequenz. "
    "Wenn moeglich, knuepfe direkt an bestehende Lore-Events an und erzeuge Anschluss."
)

NO_STALL_DIRECTIVE = (
    "Stillstandsregel: Beende keine Antwort mit reinem Atmosphaeren-Text. "
    "Jede Antwort muss einen neuen Hebel fuer die naechste Szene liefern."
)

# **STORAGE-BASIS KATEGORIE**
# Unterkapitel: Datei-Pfade fuer neue Datenstruktur + Legacy-Kompatibilitaet.
APP_DIR = Path(__file__).resolve().parent
DATA_ROOT_DIR = APP_DIR / "data"
GLOBAL_DATA_DIR = DATA_ROOT_DIR / "global"
GUILDS_DATA_DIR = DATA_ROOT_DIR / "guilds"

NPC_DATA_DIR = GLOBAL_DATA_DIR / "npc"
NPC_PROFILE_DIR = NPC_DATA_DIR / "profiles"
NPC_MEMORY_DIR = NPC_DATA_DIR / "memory"
NPC_GROUP_DIR = NPC_DATA_DIR / "groups"

ECONOMY_SPLIT_DIR = GLOBAL_DATA_DIR / "economy"
STATE_ENTITY_DIR = GLOBAL_DATA_DIR / "states"

APP_CONFIG_FILE = GLOBAL_DATA_DIR / "app_config.json"
MIGRATIONS_FILE = GLOBAL_DATA_DIR / "migrations.json"
USAGE_FILE = GLOBAL_DATA_DIR / "ai_usage.json"
AI_SECRETS_FILE = GLOBAL_DATA_DIR / "ai_secrets.json"
NPC_FILE = GLOBAL_DATA_DIR / "npc_profiles.json"
LORE_FILE = GLOBAL_DATA_DIR / "lore.json"
MEMORY_FILE = GLOBAL_DATA_DIR / "npc_memory.json"
RELIC_FILE = GLOBAL_DATA_DIR / "npc_relics.json"
ECONOMY_FILE = GLOBAL_DATA_DIR / "economy.json"
TURN_FILE = GLOBAL_DATA_DIR / "turn_system.json"
CONTRACT_PROPOSALS_FILE = GLOBAL_DATA_DIR / "contract_proposals.json"

LEGACY_FILE_NAMES = {
    "npc_profiles": "npc_profiles.json",
    "lore": "lore.json",
    "npc_memory": "npc_memory.json",
    "npc_relics": "npc_relics.json",
    "economy": "economy.json",
    "turn_system": "turn_system.json",
    "contract_proposals": "contract_proposals.json",
    "ai_usage": "ai_usage.json",
}

STORAGE_SCHEMA_VERSION = 1
TRANSACTION_TAIL_LIMIT = 5000
DEFAULT_LORE = {"description": "", "events": [], "rules": [], "states": [], "territories": []}

help_tracker = {}
webhook_cache = {}
npc_conversation_running = False
contract_proposals = {}

VALID_NPC_TYPES = {"character", "group"}
EVENT_PRIORITIES = {"none", "low", "medium", "high"}
FREE_AI_MAX_EVENTS = 250

free_ai_channels = set()
free_ai_tasks = {}
free_ai_channel_settings = {}
free_ai_limit_notified = set()
free_ai_auto_throttle_enabled = True
free_ai_throttle_override = {}
turn_resolution_lock = asyncio.Lock()

FREE_AI_DELAY_PRESETS = {
    "very_fast": 20,
    "fast": 45,
    "normal": 90,
    "slow": 180,
    "randomized": None,
}

DEFAULT_RELICS = {
    "relics": [
        {
            "id": "aurum-core",
            "name": "Aurum Core",
            "rarity": "mythisch",
            "description": "Ein glimmender Kern, der Maerkte kippen lassen kann.",
        },
        {
            "id": "ledger-crown",
            "name": "Ledger Crown",
            "rarity": "legendary",
            "description": "Eine Krone, die jeden Handel zur politischen Aussage macht.",
        },
        {
            "id": "void-seal",
            "name": "Void Seal",
            "rarity": "episch",
            "description": "Ein Siegel, das Konflikte in Vertraege oder Kriege verwandelt.",
        },
    ],
    "holders": {},
    "history": [],
}

DEFAULT_ECONOMY = {
    "entities": {},
    "accounts": {},
    "inventories": {},
    "stocks": {},
    "stock_history": {},
    "market_categories": [
        "raw_resources",
        "consumer_goods",
        "food_and_beverages",
        "services",
        "arts_and_culture",
        "entertainment_media",
        "information_technology",
        "mobility_transport",
        "energy_utilities",
        "heavy_industry",
        "military",
        "healthcare_medical",
        "public_state_offers",
        "real_estate",
        "finance_insurance",
    ],
    "products": {},
    "contracts": {},
    "loans": {},
    "insurances": {},
    "salaries": {},
    "settings": {
        "entrepreneur_role_id": None,
        "employer_role_id": None,
        "state_chief_role_id": None,
        "judiciary_role_id": None,
        "state_limit_by_guild": {},
        "states": [],
        "currency": {
            "code": "ECO",
            "name": "Economicon",
            "symbol": "ECO",
            "emoji": "",
            "image_url": "",
        },
        "loan_policy": {
            "bank_entity_name": "Zentralbank",
            "default_interest_pct_per_turn": 1.5,
            "max_term_turns": 12,
            "max_principal_per_loan": 25000.0,
            "max_total_debt_per_entity": 60000.0,
            "penalty_pct_per_missed_turn": 2.0,
        },
        "website_bridge": {
            "pending_planet_factions": {},
            "change_log": [],
            "last_deploy_at": None,
            "last_deploy_status": "",
            "last_deploy_url": "",
            "last_deploy_summary": "",
        },
    },
    "state_maps": {},
    "company_forums": {},
    "holdings": {},
    "transactions": [],
    "next_ids": {"entity": 1, "account": 1, "tx": 1, "loan": 1, "insurance": 1},
}

CATEGORY_ALIASES = {
    "resources": "raw_resources",
    "resource": "raw_resources",
    "konsum": "consumer_goods",
    "consumption": "consumer_goods",
    "dienstleistung": "services",
    "dienstleistungen": "services",
    "service": "services",
    "services": "services",
    "kunst": "arts_and_culture",
    "unterhaltung": "entertainment_media",
    "entertainment": "entertainment_media",
    "technik": "information_technology",
    "technology": "information_technology",
    "mobilitaet": "mobility_transport",
    "mobilität": "mobility_transport",
    "mobility": "mobility_transport",
    "waffen": "military",
    "weapons": "military",
    "defense_weapons": "military",
    "militaer": "military",
    "militär": "military",
    "military": "military",
    "staatliche_angebote": "public_state_offers",
    "state_offers": "public_state_offers",
}

MIN_TURN_ROLE_MEMBERS = 2

DEFAULT_TURN_STATE = {
    "enabled": False,
    "guild_id": None,
    "channel_id": None,
    "message_id": None,
    "role_id": None,
    "turn_index": 1,
    "required_user_ids": [],
    "completed_user_ids": [],
    "player_actions": [],
    "queued_econ_actions": [],
    "turn_reports": [],
    "indicators": {"market_index": 1000.0, "inflation": 2.0, "sentiment": 50.0},
    "npc_state_strategy": {
        "relations": {},
        "history": [],
        "last_turn_results": [],
        "last_resolved_turn": None,
    },
}

DEFAULT_GUILD_SETTING_ID = "test"

SETTING_REGISTRY = {
    "test": {
        "id": "test",
        "label": "Test",
        "description": (
            "Experimentelles Kern-Setting mit KI-NPCs, Wirtschaft, Turn-System, FreeAI "
            "und automatischer Territorien-Namensgenerierung."
        ),
        "capabilities": {
            "lore",
            "states",
            "npc_ai",
            "economy",
            "turn_system",
            "free_ai",
            "experimental_territory_autogen",
        },
        "home_actions": ["lore", "state", "turns", "economy", "npc", "free_ai"],
    },
    "star_wars": {
        "id": "star_wars",
        "label": "Star Wars",
        "description": (
            "Servergebundenes Star-Wars-Setting mit globalem Lore-System und manueller "
            "Territorien-/Planetenpflege."
        ),
        "capabilities": {
            "lore",
            "states",
            "manual_territory_list",
            "website_sync",
        },
        "home_actions": ["lore", "state"],
    },
}

SETTING_CAPABILITY_LABELS = {
    "lore": "Lore-System",
    "states": "Staaten-/Gebietsstruktur",
    "npc_ai": "KI-NPCs",
    "economy": "Wirtschaft",
    "turn_system": "Turn-System",
    "free_ai": "Free AI",
    "experimental_territory_autogen": "experimentelle Territorien-Autogenerierung",
    "manual_territory_list": "manuelle Territorienlisten",
    "website_sync": "Star-Wars-Website-Sync",
}

SETTING_COMMAND_CAPABILITIES = {
    "freeai": "free_ai",
    "create_npc": "npc_ai",
    "delete_npc": "npc_ai",
    "edit_npc_avatar": "npc_ai",
    "edit_npc_profile": "npc_ai",
    "delete_memory": "npc_ai",
    "list_npcs": "npc_ai",
    "conversation_npcs": "npc_ai",
    "relics": "npc_ai",
    "turn": "turn_system",
    "econ": "economy",
    "state_control_set": "npc_ai",
    "sw": "website_sync",
    "deploy": "website_sync",
    "steckbrief": "website_sync",
    "einheit": "website_sync",
    "flotte": "website_sync",
}


def _clone_default(value):
    try:
        return json.loads(json.dumps(value))
    except Exception:
        return value


def _is_non_empty_payload(value) -> bool:
    if value is None:
        return False
    if isinstance(value, dict):
        return len(value) > 0
    if isinstance(value, list):
        return len(value) > 0
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _storage_path(path_like) -> Path:
    return path_like if isinstance(path_like, Path) else Path(str(path_like))


def ensure_file(path_like, default_data):
    path = _storage_path(path_like)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path_like, fallback):
    path = _storage_path(path_like)
    try:
        content = path.read_text(encoding="utf-8").strip()
        return _clone_default(fallback) if not content else json.loads(content)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return _clone_default(fallback)


def write_json(path_like, data):
    path = _storage_path(path_like)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f"{path.name}.tmp_{os.getpid()}_{int(time.time() * 1000)}")
    try:
        temp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


def get_guild_data_dir(guild_id: int) -> Path:
    return GUILDS_DATA_DIR / str(int(guild_id))


def ensure_guild_data_layout(guild_id: int):
    base = get_guild_data_dir(guild_id)
    base.mkdir(parents=True, exist_ok=True)
    economy_dir = base / "economy"
    economy_dir.mkdir(parents=True, exist_ok=True)
    (economy_dir / "transactions").mkdir(parents=True, exist_ok=True)
    (base / "npc" / "profiles").mkdir(parents=True, exist_ok=True)
    (base / "npc" / "memory").mkdir(parents=True, exist_ok=True)
    (base / "npc" / "groups").mkdir(parents=True, exist_ok=True)
    (base / "states").mkdir(parents=True, exist_ok=True)


def _storage_paths_for_scope(guild_id: Optional[int] = None) -> dict:
    if guild_id is None:
        return {
            "scope": "global",
            "guild_id": None,
            "base_dir": GLOBAL_DATA_DIR,
            "npc_file": NPC_FILE,
            "lore_file": LORE_FILE,
            "memory_file": MEMORY_FILE,
            "relic_file": RELIC_FILE,
            "economy_file": ECONOMY_FILE,
            "turn_file": TURN_FILE,
            "contract_proposals_file": CONTRACT_PROPOSALS_FILE,
            "npc_profile_dir": NPC_PROFILE_DIR,
            "npc_memory_dir": NPC_MEMORY_DIR,
            "npc_group_dir": NPC_GROUP_DIR,
            "economy_split_dir": ECONOMY_SPLIT_DIR,
            "transactions_log_dir": ECONOMY_SPLIT_DIR / "transactions",
            "state_entity_dir": STATE_ENTITY_DIR,
        }

    gid = int(guild_id)
    ensure_guild_data_layout(gid)
    base = get_guild_data_dir(gid)
    return {
        "scope": "guild",
        "guild_id": gid,
        "base_dir": base,
        "npc_file": base / "npc_profiles.json",
        "lore_file": base / "lore.json",
        "memory_file": base / "npc_memory.json",
        "relic_file": base / "npc_relics.json",
        "economy_file": base / "economy.json",
        "turn_file": base / "turn_system.json",
        "contract_proposals_file": base / "contract_proposals.json",
        "npc_profile_dir": base / "npc" / "profiles",
        "npc_memory_dir": base / "npc" / "memory",
        "npc_group_dir": base / "npc" / "groups",
        "economy_split_dir": base / "economy",
        "transactions_log_dir": base / "economy" / "transactions",
        "state_entity_dir": base / "states",
    }


def _legacy_candidates(file_name: str) -> list[Path]:
    out = []
    cwd = Path.cwd() / file_name
    app = APP_DIR / file_name
    if cwd not in out:
        out.append(cwd)
    if app not in out:
        out.append(app)
    return out


def _first_existing_legacy_file(key: str) -> Optional[Path]:
    file_name = LEGACY_FILE_NAMES.get(key)
    if not file_name:
        return None
    for path in _legacy_candidates(file_name):
        if path.exists():
            return path
    return None


def _read_primary_or_legacy_json(primary_path, fallback, legacy_key: Optional[str] = None):
    primary_value = read_json(primary_path, _clone_default(fallback))
    if _is_non_empty_payload(primary_value):
        return primary_value
    if not legacy_key:
        return primary_value
    legacy_path = _first_existing_legacy_file(legacy_key)
    if not legacy_path:
        return primary_value
    legacy_value = read_json(legacy_path, _clone_default(fallback))
    return legacy_value if _is_non_empty_payload(legacy_value) else primary_value


def _npc_file_name(npc_name: str) -> str:
    raw = str(npc_name or "").strip()
    slug = re.sub(r"[^A-Za-z0-9_-]+", "_", raw).strip("_")
    if not slug:
        slug = "npc"
    sig = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]
    return f"{slug[:48]}__{sig}.json"


def _load_npc_profiles_from_split(profile_dir: Optional[Path] = None) -> dict:
    directory = profile_dir or NPC_PROFILE_DIR
    out = {}
    for path in sorted(directory.glob("*.json")):
        row = read_json(path, {})
        if not isinstance(row, dict):
            continue
        name = str(row.get("name", "")).strip()
        if not name:
            continue
        out[name] = {
            "type": str(row.get("type", "character")),
            "prompt": str(row.get("prompt", "")),
            "icon_url": str(row.get("icon_url", "")),
        }
    return out


def _save_npc_profiles_split(data: dict, profile_dir: Optional[Path] = None, group_dir: Optional[Path] = None):
    directory = profile_dir or NPC_PROFILE_DIR
    groups_directory = group_dir or NPC_GROUP_DIR
    directory.mkdir(parents=True, exist_ok=True)
    groups_directory.mkdir(parents=True, exist_ok=True)
    desired = set()
    group_desired = set()
    for npc_name, payload in (data or {}).items():
        file_name = _npc_file_name(str(npc_name))
        desired.add(file_name)
        row = {
            "name": str(npc_name),
            "type": str((payload or {}).get("type", "character")),
            "prompt": str((payload or {}).get("prompt", "")),
            "icon_url": str((payload or {}).get("icon_url", "")),
            "schema_version": STORAGE_SCHEMA_VERSION,
        }
        write_json(directory / file_name, row)
        if row["type"] == "group":
            group_desired.add(file_name)
            write_json(groups_directory / file_name, row)

    for existing in directory.glob("*.json"):
        if existing.name not in desired:
            try:
                existing.unlink()
            except OSError:
                pass
    for existing in groups_directory.glob("*.json"):
        if existing.name not in group_desired:
            try:
                existing.unlink()
            except OSError:
                pass


def _load_npc_memory_from_split(memory_dir: Optional[Path] = None) -> dict:
    directory = memory_dir or NPC_MEMORY_DIR
    out = {}
    for path in sorted(directory.glob("*.json")):
        row = read_json(path, {})
        if not isinstance(row, dict):
            continue
        name = str(row.get("name", "")).strip()
        memory = row.get("memory")
        if not name or not isinstance(memory, dict):
            continue
        out[name] = memory
    return out


def _save_npc_memory_split(data: dict, memory_dir: Optional[Path] = None):
    directory = memory_dir or NPC_MEMORY_DIR
    directory.mkdir(parents=True, exist_ok=True)
    desired = set()
    for npc_name, memory in (data or {}).items():
        file_name = _npc_file_name(str(npc_name))
        desired.add(file_name)
        write_json(
            directory / file_name,
            {
                "name": str(npc_name),
                "memory": memory if isinstance(memory, dict) else {},
                "schema_version": STORAGE_SCHEMA_VERSION,
            },
        )
    for existing in directory.glob("*.json"):
        if existing.name not in desired:
            try:
                existing.unlink()
            except OSError:
                pass


ECONOMY_SPLIT_KEYS = [
    "entities",
    "accounts",
    "inventories",
    "stocks",
    "stock_history",
    "market_categories",
    "products",
    "contracts",
    "loans",
    "insurances",
    "salaries",
    "settings",
    "state_maps",
    "company_forums",
    "holdings",
    "transactions",
    "next_ids",
]


def _save_economy_split_files(data: dict, split_dir: Optional[Path] = None):
    directory = split_dir or ECONOMY_SPLIT_DIR
    directory.mkdir(parents=True, exist_ok=True)
    for key in ECONOMY_SPLIT_KEYS:
        write_json(
            directory / f"{key}.json",
            {
                "schema_version": STORAGE_SCHEMA_VERSION,
                "key": key,
                "data": _clone_default((data or {}).get(key)),
            },
        )


def _transaction_month_slug(ts: Optional[int] = None) -> str:
    if ts is None:
        return datetime.datetime.utcnow().strftime("%Y-%m")
    try:
        return datetime.datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m")
    except Exception:
        return datetime.datetime.utcnow().strftime("%Y-%m")


def _append_transactions_jsonl(rows: list[dict], log_dir: Optional[Path] = None) -> int:
    directory = log_dir or (ECONOMY_SPLIT_DIR / "transactions")
    directory.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, list[dict]] = {}
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        ts = row.get("ts")
        month = _transaction_month_slug(int(ts)) if ts is not None else _transaction_month_slug(None)
        grouped.setdefault(month, []).append(row)
    written = 0
    for month, chunk in grouped.items():
        file_path = directory / f"{month}.jsonl"
        with open(file_path, "a", encoding="utf-8") as f:
            for entry in chunk:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                written += 1
    return written


def _load_transactions_from_jsonl(log_dir: Optional[Path] = None, limit: int = TRANSACTION_TAIL_LIMIT) -> list[dict]:
    directory = log_dir or (ECONOMY_SPLIT_DIR / "transactions")
    if not directory.exists():
        return []
    files = sorted(directory.glob("*.jsonl"))
    if not files:
        return []
    cap = max(1, int(limit))
    out: list[dict] = []
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    raw = line.strip()
                    if not raw:
                        continue
                    try:
                        row = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(row, dict):
                        out.append(row)
                        if len(out) > cap:
                            del out[: len(out) - cap]
        except OSError:
            continue
    return out


def _bootstrap_transaction_logs_if_missing(
    rows: list[dict],
    log_dir: Optional[Path] = None,
    *,
    max_rows: int = TRANSACTION_TAIL_LIMIT,
) -> int:
    directory = log_dir or (ECONOMY_SPLIT_DIR / "transactions")
    directory.mkdir(parents=True, exist_ok=True)
    if any(directory.glob("*.jsonl")):
        return 0
    subset = [r for r in (rows or []) if isinstance(r, dict)]
    if not subset:
        return 0
    cap = max(1, int(max_rows))
    if len(subset) > cap:
        subset = subset[-cap:]
    return _append_transactions_jsonl(subset, directory)


def _load_economy_split_files(split_dir: Optional[Path] = None) -> tuple[dict, int]:
    directory = split_dir or ECONOMY_SPLIT_DIR
    out = {}
    found = 0
    for key in ECONOMY_SPLIT_KEYS:
        path = directory / f"{key}.json"
        if not path.exists():
            continue
        raw = read_json(path, None)
        if raw is None:
            continue
        value = None
        if isinstance(raw, dict) and "data" in raw:
            file_key = str(raw.get("key", key))
            if file_key != key and file_key:
                # Defensive: key mismatch ignorieren, um inkonsistente Dateien nicht blind zu uebernehmen.
                continue
            value = raw.get("data")
        else:
            value = raw
        out[key] = _clone_default(value)
        found += 1
    return out, found


def _save_state_entity_files(data: dict, state_dir: Optional[Path] = None):
    directory = state_dir or STATE_ENTITY_DIR
    directory.mkdir(parents=True, exist_ok=True)
    desired = set()
    entities = (data or {}).get("entities", {})
    if not isinstance(entities, dict):
        entities = {}
    for state_id, entity in entities.items():
        if str((entity or {}).get("type", "")).lower() != "state":
            continue
        file_name = f"state_{str(state_id)}.json"
        desired.add(file_name)
        write_json(
            directory / file_name,
            {
                "schema_version": STORAGE_SCHEMA_VERSION,
                "id": str(state_id),
                "entity": _clone_default(entity),
            },
        )
    for existing in directory.glob("state_*.json"):
        if existing.name not in desired:
            try:
                existing.unlink()
            except OSError:
                pass


def _copy_split_json_files(src_dir: Path, dst_dir: Path, pattern: str = "*.json") -> int:
    if not src_dir.exists():
        return 0
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src in src_dir.glob(pattern):
        if not src.is_file():
            continue
        payload = read_json(src, None)
        if payload is None:
            continue
        write_json(dst_dir / src.name, payload)
        copied += 1
    return copied


def _copy_raw_files(src_dir: Path, dst_dir: Path, pattern: str) -> int:
    if not src_dir.exists():
        return 0
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src in src_dir.glob(pattern):
        if not src.is_file():
            continue
        try:
            content = src.read_bytes()
            (dst_dir / src.name).write_bytes(content)
            copied += 1
        except OSError:
            continue
    return copied


def _ensure_storage_layout():
    for directory in [
        DATA_ROOT_DIR,
        GLOBAL_DATA_DIR,
        GUILDS_DATA_DIR,
        NPC_DATA_DIR,
        NPC_PROFILE_DIR,
        NPC_MEMORY_DIR,
        NPC_GROUP_DIR,
        ECONOMY_SPLIT_DIR,
        STATE_ENTITY_DIR,
    ]:
        directory.mkdir(parents=True, exist_ok=True)
    (ECONOMY_SPLIT_DIR / "transactions").mkdir(parents=True, exist_ok=True)

    ensure_file(
        APP_CONFIG_FILE,
        {
            "schema_version": STORAGE_SCHEMA_VERSION,
            "storage_layout": "data/global + data/guilds",
        },
    )
    ensure_file(
        MIGRATIONS_FILE,
        {
            "schema_version": STORAGE_SCHEMA_VERSION,
            "applied": [],
            "history": [],
        },
    )


def _migration_mark_applied(name: str):
    data = read_json(MIGRATIONS_FILE, {"schema_version": STORAGE_SCHEMA_VERSION, "applied": [], "history": []})
    applied = data.setdefault("applied", [])
    history = data.setdefault("history", [])
    if name not in applied:
        applied.append(name)
        history.append({"name": name, "ts": int(time.time())})
        write_json(MIGRATIONS_FILE, data)


def migrate_legacy_storage_to_data_v1(force: bool = False) -> dict:
    _ensure_storage_layout()
    moved = []
    copied = []

    mapping = [
        ("npc_profiles", NPC_FILE, {}),
        ("lore", LORE_FILE, DEFAULT_LORE),
        ("npc_memory", MEMORY_FILE, {}),
        ("npc_relics", RELIC_FILE, DEFAULT_RELICS),
        ("economy", ECONOMY_FILE, DEFAULT_ECONOMY),
        ("turn_system", TURN_FILE, DEFAULT_TURN_STATE),
        ("contract_proposals", CONTRACT_PROPOSALS_FILE, {}),
        ("ai_usage", USAGE_FILE, {"day": "", "requests_today": 0, "minute_start": 0.0, "requests_this_minute": 0, "last_limit_error": ""}),
    ]

    for key, target_path, default_value in mapping:
        current = read_json(target_path, _clone_default(default_value))
        if _is_non_empty_payload(current) and not force:
            continue
        legacy = _first_existing_legacy_file(key)
        if not legacy:
            continue
        legacy_data = read_json(legacy, _clone_default(default_value))
        if not _is_non_empty_payload(legacy_data):
            continue
        write_json(target_path, legacy_data)
        moved.append(key)
        copied.append(str(legacy))

    _migration_mark_applied("legacy_to_data_v1")
    return {"moved_keys": moved, "legacy_sources": copied}


def _load_npc_profiles_data() -> dict:
    split = _load_npc_profiles_from_split()
    if split:
        return split
    combined = _read_primary_or_legacy_json(NPC_FILE, {}, "npc_profiles")
    if isinstance(combined, dict):
        return combined
    return {}


def _load_npc_memory_data() -> dict:
    split = _load_npc_memory_from_split()
    if split:
        return split
    combined = _read_primary_or_legacy_json(MEMORY_FILE, {}, "npc_memory")
    if isinstance(combined, dict):
        return combined
    return {}


def _load_economy_data() -> dict:
    split, found = _load_economy_split_files(ECONOMY_SPLIT_DIR)
    data = _read_primary_or_legacy_json(ECONOMY_FILE, DEFAULT_ECONOMY.copy(), "economy")
    if not isinstance(data, dict):
        data = DEFAULT_ECONOMY.copy()
    if found > 0:
        for key, value in split.items():
            data[key] = value
    _bootstrap_transaction_logs_if_missing(data.get("transactions", []), ECONOMY_SPLIT_DIR / "transactions")
    tx_tail = _load_transactions_from_jsonl(ECONOMY_SPLIT_DIR / "transactions", limit=TRANSACTION_TAIL_LIMIT)
    if tx_tail:
        data["transactions"] = tx_tail
    return data


def storage_status_snapshot(guild_id: Optional[int] = None) -> dict:
    _ensure_storage_layout()
    paths = _storage_paths_for_scope(guild_id)
    npc_profile_files = len(list(paths["npc_profile_dir"].glob("*.json")))
    npc_memory_files = len(list(paths["npc_memory_dir"].glob("*.json")))
    npc_group_files = len(list(paths["npc_group_dir"].glob("*.json")))
    state_entity_files = len(list(paths["state_entity_dir"].glob("state_*.json")))
    econ_split_files = len(list(paths["economy_split_dir"].glob("*.json")))
    tx_log_files = len(list(paths["transactions_log_dir"].glob("*.jsonl")))
    return {
        "schema_version": STORAGE_SCHEMA_VERSION,
        "scope": paths["scope"],
        "guild_id": paths["guild_id"],
        "data_root": str(DATA_ROOT_DIR),
        "scope_dir": str(paths["base_dir"]),
        "global_dir": str(GLOBAL_DATA_DIR),
        "guilds_dir": str(GUILDS_DATA_DIR),
        "npc_profile_files": npc_profile_files,
        "npc_memory_files": npc_memory_files,
        "npc_group_files": npc_group_files,
        "state_entity_files": state_entity_files,
        "economy_split_files": econ_split_files,
        "transaction_log_files": tx_log_files,
    }


_ensure_storage_layout()
migrate_legacy_storage_to_data_v1(force=False)

DEFAULT_AI_USAGE = {
    "day": "",
    "requests_today": 0,
    "minute_start": 0.0,
    "requests_this_minute": 0,
    "attempts_today": 0,
    "attempts_this_minute": 0,
    "last_limit_error": "",
    "last_provider_status": "",
    "last_provider_message": "",
    "last_request_at": "",
    "last_success_at": "",
}
DEFAULT_AI_SECRETS = {
    "external_api_key": "",
}
DEFAULT_APP_CONFIG = {
    "schema_version": STORAGE_SCHEMA_VERSION,
    "storage_layout": "data/global + data/guilds",
    "primary_seeded_guild_id": None,
    "settings": {
        "guild_active_setting_id": {},
    },
    "security": {
        "admin_role_ids_by_guild": {},
    },
    "ai": {
        "provider": "ollama",
        "gemini_model": GEMINI_MODEL,
        "ollama_model": OLLAMA_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "allow_gemini_fallback_when_ollama_unavailable": False,
        "enforce_local_gemini_quota": False,
        "local_gemini_rpm_soft_limit": GEMINI_RPM_LIMIT,
        "local_gemini_rpd_soft_limit": GEMINI_RPD_LIMIT,
        "external_openai": {
            "provider_label": "External API",
            "endpoint_url": "",
            "model": "",
            "auth_header_name": "Authorization",
            "auth_scheme": "Bearer",
            "enabled": False,
            "timeout_seconds": 90,
        },
    },
}

ensure_file(APP_CONFIG_FILE, DEFAULT_APP_CONFIG)
ensure_file(NPC_FILE, {})
ensure_file(LORE_FILE, DEFAULT_LORE)
ensure_file(MEMORY_FILE, {})
ensure_file(RELIC_FILE, DEFAULT_RELICS)
ensure_file(ECONOMY_FILE, DEFAULT_ECONOMY)
ensure_file(TURN_FILE, DEFAULT_TURN_STATE)
ensure_file(CONTRACT_PROPOSALS_FILE, {})
ensure_file(USAGE_FILE, DEFAULT_AI_USAGE)
ensure_file(AI_SECRETS_FILE, DEFAULT_AI_SECRETS)

app_config = read_json(APP_CONFIG_FILE, DEFAULT_APP_CONFIG)
if not isinstance(app_config, dict):
    app_config = _clone_default(DEFAULT_APP_CONFIG)
for key, value in DEFAULT_APP_CONFIG.items():
    if key not in app_config:
        app_config[key] = value
if not isinstance(app_config.get("security"), dict):
    app_config["security"] = _clone_default(DEFAULT_APP_CONFIG["security"])
for key, value in DEFAULT_APP_CONFIG["security"].items():
    if key not in app_config["security"]:
        app_config["security"][key] = value
if not isinstance(app_config.get("settings"), dict):
    app_config["settings"] = _clone_default(DEFAULT_APP_CONFIG["settings"])
for key, value in DEFAULT_APP_CONFIG["settings"].items():
    if key not in app_config["settings"]:
        app_config["settings"][key] = _clone_default(value)
if not isinstance(app_config.get("ai"), dict):
    app_config["ai"] = _clone_default(DEFAULT_APP_CONFIG["ai"])
for key, value in DEFAULT_APP_CONFIG["ai"].items():
    if key not in app_config["ai"]:
        app_config["ai"][key] = value
if not isinstance(app_config["ai"].get("external_openai"), dict):
    app_config["ai"]["external_openai"] = _clone_default(DEFAULT_APP_CONFIG["ai"]["external_openai"])
for key, value in DEFAULT_APP_CONFIG["ai"]["external_openai"].items():
    if key not in app_config["ai"]["external_openai"]:
        app_config["ai"]["external_openai"][key] = value
write_json(APP_CONFIG_FILE, app_config)

ai_secrets = read_json(AI_SECRETS_FILE, DEFAULT_AI_SECRETS)
if not isinstance(ai_secrets, dict):
    ai_secrets = _clone_default(DEFAULT_AI_SECRETS)
for key, value in DEFAULT_AI_SECRETS.items():
    if key not in ai_secrets:
        ai_secrets[key] = _clone_default(value)
write_json(AI_SECRETS_FILE, ai_secrets)


def save_app_config():
    write_json(APP_CONFIG_FILE, app_config)


def save_ai_secrets():
    write_json(AI_SECRETS_FILE, ai_secrets)


def list_available_settings() -> list[dict]:
    return [SETTING_REGISTRY[key] for key in sorted(SETTING_REGISTRY.keys())]


def is_valid_setting_id(setting_id: Optional[str]) -> bool:
    return str(setting_id or "").strip().lower() in SETTING_REGISTRY


def get_setting_definition(setting_id: Optional[str]) -> dict:
    sid = str(setting_id or DEFAULT_GUILD_SETTING_ID).strip().lower()
    return SETTING_REGISTRY.get(sid, SETTING_REGISTRY[DEFAULT_GUILD_SETTING_ID])


def get_setting_label(setting_id: Optional[str]) -> str:
    return str(get_setting_definition(setting_id).get("label", DEFAULT_GUILD_SETTING_ID))


def get_setting_world_terms(guild_id: Optional[int] = None) -> dict:
    setting_id = get_guild_setting_id(guild_id) if guild_id is not None else get_active_setting_id()
    if setting_id == "star_wars":
        return {
            "entity_singular": "Faction",
            "entity_plural": "Factions",
            "entity_editor": "Faction-Editor",
            "wizard_title": "Faction Wizard",
            "territory_singular": "Planet",
            "territory_plural": "Planets",
            "territory_wizard": "Planets",
            "player_control_label": "Player-Faction",
            "npc_control_label": "NPC-Faction",
        }
    return {
        "entity_singular": "State",
        "entity_plural": "States",
        "entity_editor": "State-Editor",
        "wizard_title": "State Wizard",
        "territory_singular": "Territorium",
        "territory_plural": "Territorien",
        "territory_wizard": "Territorien",
        "player_control_label": "Spieler-Staat",
        "npc_control_label": "NPC-Staat",
    }


def _settings_config_store() -> dict:
    settings_cfg = app_config.setdefault("settings", _clone_default(DEFAULT_APP_CONFIG["settings"]))
    raw_map = settings_cfg.setdefault("guild_active_setting_id", {})
    if not isinstance(raw_map, dict):
        raw_map = {}
        settings_cfg["guild_active_setting_id"] = raw_map
    return raw_map


def get_guild_setting_id(guild_id: Optional[int]) -> Optional[str]:
    if guild_id is None:
        return None
    raw_map = _settings_config_store()
    key = str(int(guild_id))
    raw_value = str(raw_map.get(key, "") or "").strip().lower()
    if raw_value in SETTING_REGISTRY:
        return raw_value
    raw_map[key] = DEFAULT_GUILD_SETTING_ID
    save_app_config()
    return DEFAULT_GUILD_SETTING_ID


def ensure_guild_setting(guild_id: Optional[int]) -> Optional[str]:
    return get_guild_setting_id(guild_id)


def set_guild_setting_id(guild_id: int, setting_id: str) -> str:
    sid = str(setting_id or "").strip().lower()
    if sid not in SETTING_REGISTRY:
        raise ValueError(f"Unbekanntes Setting: {setting_id}")
    raw_map = _settings_config_store()
    raw_map[str(int(guild_id))] = sid
    save_app_config()
    return sid


def get_active_setting_id() -> Optional[str]:
    return get_guild_setting_id(ACTIVE_GUILD_ID)


def get_active_setting_definition() -> dict:
    return get_setting_definition(get_active_setting_id())


def guild_setting_supports(guild_id: Optional[int], capability: str) -> bool:
    if guild_id is None:
        return True
    caps = set(get_setting_definition(get_guild_setting_id(guild_id)).get("capabilities", set()) or set())
    return str(capability or "").strip().lower() in caps


def active_setting_supports(capability: str) -> bool:
    return guild_setting_supports(ACTIVE_GUILD_ID, capability)


def get_setting_home_actions(setting_id: Optional[str]) -> list[str]:
    actions = list(get_setting_definition(setting_id).get("home_actions", []) or [])
    return [str(action) for action in actions if str(action)]


def get_command_root_name(ctx: commands.Context) -> str:
    command = getattr(ctx, "command", None)
    if command is None:
        return ""
    root_parent = getattr(command, "root_parent", None)
    if root_parent is not None:
        return str(root_parent.name or "").strip().lower()
    return str(command.name or "").strip().lower()


def get_required_setting_capability_for_command(ctx: commands.Context) -> Optional[str]:
    root_name = get_command_root_name(ctx)
    if not root_name:
        return None
    return SETTING_COMMAND_CAPABILITIES.get(root_name)


def build_setting_capability_error(guild_id: Optional[int], capability: str, feature_label: Optional[str] = None) -> str:
    current_label = get_setting_label(get_guild_setting_id(guild_id))
    feature = str(feature_label or SETTING_CAPABILITY_LABELS.get(capability, capability) or "Dieser Bereich")
    if capability in {"npc_ai", "economy", "turn_system", "free_ai", "experimental_territory_autogen"}:
        return f"{feature} ist nur im Setting `Test` verfuegbar. Aktuelles Server-Setting: {current_label}."
    return f"{feature} ist im aktuellen Server-Setting `{current_label}` nicht verfuegbar."


def _configured_admin_role_ids_for_guild(guild_id: Optional[int]) -> set[int]:
    if guild_id is None:
        return set()
    security_cfg = app_config.get("security", {}) if isinstance(app_config, dict) else {}
    raw_map = security_cfg.get("admin_role_ids_by_guild", {}) if isinstance(security_cfg, dict) else {}
    raw_ids = raw_map.get(str(int(guild_id)), []) if isinstance(raw_map, dict) else []
    out = set()
    for raw in raw_ids or []:
        try:
            out.add(int(raw))
        except (TypeError, ValueError):
            continue
    return out


def _member_has_admin_access(member: discord.abc.User) -> bool:
    if not isinstance(member, discord.Member):
        return False
    if getattr(member.guild_permissions, "administrator", False):
        return True
    configured_role_ids = _configured_admin_role_ids_for_guild(member.guild.id if member.guild else None)
    if configured_role_ids and any(role.id in configured_role_ids for role in member.roles):
        return True
    return any(role.name == "Admin" for role in member.roles)


_ORIGINAL_COMMANDS_HAS_ROLE = commands.has_role


def _patched_has_role(item):
    role_name = str(item or "")
    if role_name.lower() != "admin":
        return _ORIGINAL_COMMANDS_HAS_ROLE(item)

    async def predicate(ctx: commands.Context):
        if _member_has_admin_access(ctx.author):
            return True
        raise commands.MissingRole(role_name)

    return commands.check(predicate)


commands.has_role = _patched_has_role


def _env_truthy(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "ja", "on"}


def _normalize_llm_provider(raw_provider: Optional[str]) -> str:
    provider = str(raw_provider or "").strip().lower()
    if provider in {"external", "external_api", "external_openai", "openai_compatible"}:
        return "external_openai"
    if provider == "gemini":
        return "gemini"
    return "ollama"


def get_external_openai_config() -> dict:
    ai_cfg = app_config.get("ai", {}) if isinstance(app_config, dict) else {}
    ext = ai_cfg.get("external_openai", {}) if isinstance(ai_cfg, dict) else {}
    if not isinstance(ext, dict):
        ext = {}
    merged = _clone_default(DEFAULT_APP_CONFIG["ai"]["external_openai"])
    for key, value in ext.items():
        merged[key] = value
    return merged


def get_external_openai_api_key() -> str:
    return str(ai_secrets.get("external_api_key", "") or "").strip()


def _normalize_openai_endpoint_url(raw_url: str) -> str:
    text = str(raw_url or "").strip()
    if not text:
        return ""
    while text.endswith("/"):
        text = text[:-1]
    low = text.lower()
    if low.endswith("/chat/completions"):
        return text
    if low.endswith("/v1"):
        return f"{text}/chat/completions"
    return f"{text}/v1/chat/completions"


def mask_secret(value: str) -> str:
    raw = str(value or "")
    if not raw:
        return "(nicht gesetzt)"
    if len(raw) <= 6:
        return "*" * len(raw)
    return f"{raw[:3]}...{raw[-3:]}"


def set_llm_provider(provider: str):
    global OLLAMA_ENABLED, LLM_PROVIDER
    LLM_PROVIDER = _normalize_llm_provider(provider)
    OLLAMA_ENABLED = LLM_PROVIDER == "ollama"
    persist_ai_runtime_config()


def get_llm_provider_label(provider: Optional[str] = None) -> str:
    normalized = _normalize_llm_provider(provider or LLM_PROVIDER)
    if normalized == "external_openai":
        ext_cfg = get_external_openai_config()
        return str(ext_cfg.get("provider_label") or "External API")
    if normalized == "gemini":
        return "Gemini"
    return "Ollama"


def configure_external_openai_provider(
    provider_label: str,
    endpoint_url: str,
    model: str,
    api_key: Optional[str] = None,
    *,
    auth_header_name: str = "Authorization",
    auth_scheme: str = "Bearer",
):
    ext_cfg = app_config.setdefault("ai", {}).setdefault(
        "external_openai",
        _clone_default(DEFAULT_APP_CONFIG["ai"]["external_openai"]),
    )
    ext_cfg["provider_label"] = str(provider_label or "External API").strip()[:80] or "External API"
    ext_cfg["endpoint_url"] = _normalize_openai_endpoint_url(endpoint_url)
    ext_cfg["model"] = str(model or "").strip()[:200]
    ext_cfg["auth_header_name"] = str(auth_header_name or "Authorization").strip()[:80] or "Authorization"
    ext_cfg["auth_scheme"] = str(auth_scheme or "Bearer").strip()[:40]
    ext_cfg["enabled"] = bool(ext_cfg["endpoint_url"] and ext_cfg["model"])
    try:
        ext_cfg["timeout_seconds"] = max(10, min(300, int(ext_cfg.get("timeout_seconds", 90) or 90)))
    except (TypeError, ValueError):
        ext_cfg["timeout_seconds"] = 90
    if api_key is not None:
        ai_secrets["external_api_key"] = str(api_key).strip()
        save_ai_secrets()
    save_app_config()


def external_openai_is_ready() -> bool:
    ext_cfg = get_external_openai_config()
    return bool(ext_cfg.get("enabled") and ext_cfg.get("endpoint_url") and ext_cfg.get("model") and get_external_openai_api_key())


def build_ai_provider_status_text() -> str:
    lines = [f"Provider: {get_llm_provider_label()} ({LLM_PROVIDER})"]
    lines.append(f"Ollama aktiv: {'ja' if _check_ollama_available() else 'nein'} | URL: {OLLAMA_BASE_URL} | Modell: {OLLAMA_MODEL}")
    lines.append(f"Gemini Modell: {GEMINI_MODEL} | Key gesetzt: {'ja' if bool(GEMINI_API_KEY) else 'nein'}")
    ext_cfg = get_external_openai_config()
    lines.append(
        "Externe API: "
        f"{ext_cfg.get('provider_label', 'External API')} | "
        f"bereit: {'ja' if external_openai_is_ready() else 'nein'} | "
        f"Endpoint: {ext_cfg.get('endpoint_url') or '-'} | "
        f"Modell: {ext_cfg.get('model') or '-'} | "
        f"Key: {mask_secret(get_external_openai_api_key())}"
    )
    lines.append(
        "Gemini-Fallback bei Ollama-Ausfall: "
        f"{'AN' if _allow_gemini_fallback_when_ollama_unavailable() else 'AUS'}"
    )
    return "\n".join(lines)


env_provider = os.getenv("LLM_PROVIDER")
config_provider = _normalize_llm_provider(app_config.get("ai", {}).get("provider", "ollama"))
GEMINI_MODEL = str(os.getenv("GEMINI_MODEL") or app_config["ai"].get("gemini_model") or GEMINI_MODEL).strip()
OLLAMA_BASE_URL = str(os.getenv("OLLAMA_BASE_URL") or app_config["ai"].get("ollama_base_url") or OLLAMA_BASE_URL).strip()
OLLAMA_MODEL = str(os.getenv("OLLAMA_MODEL") or app_config["ai"].get("ollama_model") or OLLAMA_MODEL).strip()
if env_provider:
    LLM_PROVIDER = _normalize_llm_provider(env_provider)
elif os.getenv("OLLAMA_ENABLED") is not None and _env_truthy("OLLAMA_ENABLED", False):
    LLM_PROVIDER = "ollama"
else:
    LLM_PROVIDER = config_provider
OLLAMA_ENABLED = LLM_PROVIDER == "ollama"


def persist_ai_runtime_config():
    ai_cfg = app_config.setdefault("ai", _clone_default(DEFAULT_APP_CONFIG["ai"]))
    ai_cfg["provider"] = "ollama" if OLLAMA_ENABLED else "gemini"
    ai_cfg["gemini_model"] = GEMINI_MODEL
    ai_cfg["ollama_model"] = OLLAMA_MODEL
    ai_cfg["ollama_base_url"] = OLLAMA_BASE_URL
    save_app_config()


def _normalize_scope_payload(payload: dict) -> dict:
    out = payload if isinstance(payload, dict) else {}
    out.setdefault("npc_profiles", {})
    out.setdefault("lore_data", _clone_default(DEFAULT_LORE))
    out.setdefault("npc_memory", {})
    out.setdefault("relic_data", _clone_default(DEFAULT_RELICS))
    out.setdefault("economy_data", _clone_default(DEFAULT_ECONOMY))
    out.setdefault("turn_state", _clone_default(DEFAULT_TURN_STATE))
    out.setdefault("contract_proposals", {})

    if not isinstance(out["npc_profiles"], dict):
        out["npc_profiles"] = {}
    if not isinstance(out["npc_memory"], dict):
        out["npc_memory"] = {}
    if not isinstance(out["contract_proposals"], dict):
        out["contract_proposals"] = {}
    if not isinstance(out["lore_data"], dict):
        out["lore_data"] = _clone_default(DEFAULT_LORE)
    if not isinstance(out["relic_data"], dict):
        out["relic_data"] = _clone_default(DEFAULT_RELICS)
    if not isinstance(out["economy_data"], dict):
        out["economy_data"] = _clone_default(DEFAULT_ECONOMY)
    if not isinstance(out["turn_state"], dict):
        out["turn_state"] = _clone_default(DEFAULT_TURN_STATE)

    lore_local = out["lore_data"]
    relic_local = out["relic_data"]
    economy_local = out["economy_data"]
    turn_local = out["turn_state"]

    for key, default_value in DEFAULT_LORE.items():
        if key not in lore_local:
            lore_local[key] = _clone_default(default_value)

    for key, default_value in DEFAULT_RELICS.items():
        if key not in relic_local:
            relic_local[key] = _clone_default(default_value)

    for key, default_value in DEFAULT_ECONOMY.items():
        if key not in economy_local:
            economy_local[key] = _clone_default(default_value)
    economy_local.setdefault("settings", {})
    economy_local["settings"].setdefault("state_limit_by_guild", {})
    economy_local["settings"].setdefault(
        "loan_policy",
        _clone_default(DEFAULT_ECONOMY["settings"]["loan_policy"]),
    )
    economy_local.setdefault("state_maps", {})
    economy_local.setdefault("inventories", {})
    if "services" not in economy_local.get("market_categories", []):
        economy_local.setdefault("market_categories", []).append("services")
    if "next_ids" not in economy_local:
        economy_local["next_ids"] = {}
    for id_key in ("entity", "account", "tx", "product", "contract", "loan", "insurance"):
        if id_key not in economy_local["next_ids"]:
            economy_local["next_ids"][id_key] = 1

    for key, default_value in DEFAULT_TURN_STATE.items():
        if key not in turn_local:
            turn_local[key] = _clone_default(default_value)

    return out


def _seed_guild_scope_from_global_if_needed(guild_id: int, paths: dict):
    existing = [
        paths["npc_file"],
        paths["lore_file"],
        paths["memory_file"],
        paths["relic_file"],
        paths["economy_file"],
        paths["turn_file"],
        paths["contract_proposals_file"],
    ]
    if any(_storage_path(p).exists() for p in existing):
        return
    if app_config.get("primary_seeded_guild_id") is not None:
        return

    global_paths = _storage_paths_for_scope(None)
    seeded_any = False
    mapping = [
        ("npc_file", {}),
        ("lore_file", DEFAULT_LORE),
        ("memory_file", {}),
        ("relic_file", DEFAULT_RELICS),
        ("economy_file", DEFAULT_ECONOMY),
        ("turn_file", DEFAULT_TURN_STATE),
        ("contract_proposals_file", {}),
    ]
    for key, fallback in mapping:
        data = read_json(global_paths[key], _clone_default(fallback))
        if _is_non_empty_payload(data):
            write_json(paths[key], data)
            seeded_any = True

    copied_split = 0
    copied_split += _copy_split_json_files(global_paths["npc_profile_dir"], paths["npc_profile_dir"])
    copied_split += _copy_split_json_files(global_paths["npc_memory_dir"], paths["npc_memory_dir"])
    copied_split += _copy_split_json_files(global_paths["npc_group_dir"], paths["npc_group_dir"])
    copied_split += _copy_split_json_files(global_paths["economy_split_dir"], paths["economy_split_dir"])
    copied_split += _copy_raw_files(global_paths["transactions_log_dir"], paths["transactions_log_dir"], "*.jsonl")
    copied_split += _copy_split_json_files(global_paths["state_entity_dir"], paths["state_entity_dir"], pattern="state_*.json")
    if copied_split > 0:
        seeded_any = True
    if seeded_any:
        app_config["primary_seeded_guild_id"] = int(guild_id)
        save_app_config()


def _load_scope_payload(guild_id: Optional[int]) -> dict:
    paths = _storage_paths_for_scope(guild_id)
    if guild_id is not None:
        _seed_guild_scope_from_global_if_needed(int(guild_id), paths)
    ensure_file(paths["npc_file"], {})
    ensure_file(paths["lore_file"], DEFAULT_LORE)
    ensure_file(paths["memory_file"], {})
    ensure_file(paths["relic_file"], DEFAULT_RELICS)
    ensure_file(paths["economy_file"], DEFAULT_ECONOMY)
    ensure_file(paths["turn_file"], DEFAULT_TURN_STATE)
    ensure_file(paths["contract_proposals_file"], {})

    split_economy, split_found = _load_economy_split_files(paths["economy_split_dir"])
    economy_monolith = read_json(paths["economy_file"], _clone_default(DEFAULT_ECONOMY))
    if not isinstance(economy_monolith, dict):
        economy_monolith = _clone_default(DEFAULT_ECONOMY)
    if split_found > 0:
        for key, value in split_economy.items():
            economy_monolith[key] = _clone_default(value)
    _bootstrap_transaction_logs_if_missing(
        economy_monolith.get("transactions", []),
        paths["transactions_log_dir"],
        max_rows=TRANSACTION_TAIL_LIMIT,
    )
    tx_tail = _load_transactions_from_jsonl(paths["transactions_log_dir"], limit=TRANSACTION_TAIL_LIMIT)
    if tx_tail:
        economy_monolith["transactions"] = tx_tail

    payload = {
        "npc_profiles": _load_npc_profiles_from_split(paths["npc_profile_dir"]),
        "lore_data": read_json(paths["lore_file"], _clone_default(DEFAULT_LORE)),
        "npc_memory": _load_npc_memory_from_split(paths["npc_memory_dir"]),
        "relic_data": read_json(paths["relic_file"], _clone_default(DEFAULT_RELICS)),
        "economy_data": economy_monolith,
        "turn_state": read_json(paths["turn_file"], _clone_default(DEFAULT_TURN_STATE)),
        "contract_proposals": read_json(paths["contract_proposals_file"], {}),
    }
    if not payload["npc_profiles"]:
        payload["npc_profiles"] = read_json(paths["npc_file"], {})
    if not payload["npc_memory"]:
        payload["npc_memory"] = read_json(paths["memory_file"], {})
    return _normalize_scope_payload(payload)


ACTIVE_GUILD_ID: Optional[int] = None
_RUNTIME_SCOPE_CACHE: dict[str, dict] = {}
runtime_scope_lock = asyncio.Lock()


def _runtime_scope_key(guild_id: Optional[int]) -> str:
    return "__global__" if guild_id is None else str(int(guild_id))


def _bind_payload_to_globals(payload: dict):
    global npc_profiles, lore_data, npc_memory, relic_data, economy_data, turn_state, contract_proposals
    npc_profiles = payload["npc_profiles"]
    lore_data = payload["lore_data"]
    npc_memory = payload["npc_memory"]
    relic_data = payload["relic_data"]
    economy_data = payload["economy_data"]
    turn_state = payload["turn_state"]
    contract_proposals = payload["contract_proposals"]


def get_active_guild_id() -> Optional[int]:
    return ACTIVE_GUILD_ID


def save_active_scope_all():
    save_npc_profiles()
    save_lore()
    save_memory()
    save_relics()
    save_economy()
    save_turn_state()
    save_contract_proposals()


def set_active_guild_context(guild_id: Optional[int], force_reload: bool = False):
    global ACTIVE_GUILD_ID
    normalized = None if guild_id is None else int(guild_id)
    if ACTIVE_GUILD_ID == normalized and not force_reload:
        return

    if ACTIVE_GUILD_ID is not None or not force_reload:
        try:
            save_active_scope_all()
        except Exception:
            pass

    key = _runtime_scope_key(normalized)
    if force_reload or key not in _RUNTIME_SCOPE_CACHE:
        _RUNTIME_SCOPE_CACHE[key] = _load_scope_payload(normalized)
    payload = _RUNTIME_SCOPE_CACHE[key]
    payload = _normalize_scope_payload(payload)
    _RUNTIME_SCOPE_CACHE[key] = payload
    _bind_payload_to_globals(payload)
    ACTIVE_GUILD_ID = normalized
    ensure_currency_profile()


# Initial: global scope laden.
_RUNTIME_SCOPE_CACHE[_runtime_scope_key(None)] = _load_scope_payload(None)
_bind_payload_to_globals(_RUNTIME_SCOPE_CACHE[_runtime_scope_key(None)])
ai_usage = _read_primary_or_legacy_json(USAGE_FILE, _clone_default(DEFAULT_AI_USAGE), "ai_usage")
if not isinstance(ai_usage, dict):
    ai_usage = _clone_default(DEFAULT_AI_USAGE)
for key, value in DEFAULT_AI_USAGE.items():
    if key not in ai_usage:
        ai_usage[key] = _clone_default(value)


# === Currency Helper Functions ===
def ensure_currency_profile():
    """Ensure currency settings exist in economy_data"""
    economy_data.setdefault("settings", {})
    economy_data["settings"].setdefault("currency", {
        "code": "ECO",
        "name": "Economicon",
        "symbol": "ECO",
        "emoji": "",
        "image_url": "",
    })


def get_currency_profile() -> dict:
    """Get the current currency profile"""
    ensure_currency_profile()
    return economy_data["settings"]["currency"]


def currency_unit_label(amount: Optional[float] = None) -> str:
    """Get the currency unit label (symbol or emoji + code)"""
    profile = get_currency_profile()
    emoji = profile.get("emoji", "")
    symbol = profile.get("symbol", "ECO")
    code = profile.get("code", "ECO")
    
    if emoji:
        label = f"{emoji} {code}"
    else:
        label = symbol
    
    if amount is not None:
        return f"{amount:.2f} {label}"
    return label


def format_money(amount: float) -> str:
    """Format an amount with the currency symbol"""
    profile = get_currency_profile()
    emoji = profile.get("emoji", "")
    symbol = profile.get("symbol", "ECO")
    
    if emoji:
        return f"{amount:.2f} {emoji}"
    return f"{amount:.2f} {symbol}"


# Initialize currency on startup
ensure_currency_profile()


def _active_scope_paths() -> dict:
    return _storage_paths_for_scope(ACTIVE_GUILD_ID)


def _refresh_runtime_cache_for_active_scope():
    key = _runtime_scope_key(ACTIVE_GUILD_ID)
    _RUNTIME_SCOPE_CACHE[key] = {
        "npc_profiles": npc_profiles,
        "lore_data": lore_data,
        "npc_memory": npc_memory,
        "relic_data": relic_data,
        "economy_data": economy_data,
        "turn_state": turn_state,
        "contract_proposals": contract_proposals,
    }


def append_transaction_entry(tx: dict):
    if not isinstance(tx, dict):
        return
    economy_data.setdefault("transactions", [])
    rows = economy_data["transactions"]
    if not isinstance(rows, list):
        rows = []
    rows.append(tx)
    if len(rows) > TRANSACTION_TAIL_LIMIT:
        rows = rows[-TRANSACTION_TAIL_LIMIT:]
    economy_data["transactions"] = rows
    paths = _active_scope_paths()
    _append_transactions_jsonl([tx], paths["transactions_log_dir"])
    _refresh_runtime_cache_for_active_scope()


def save_npc_profiles():
    paths = _active_scope_paths()
    write_json(paths["npc_file"], npc_profiles)
    _save_npc_profiles_split(
        npc_profiles,
        profile_dir=paths["npc_profile_dir"],
        group_dir=paths["npc_group_dir"],
    )
    _refresh_runtime_cache_for_active_scope()


def save_lore():
    paths = _active_scope_paths()
    write_json(paths["lore_file"], lore_data)
    _refresh_runtime_cache_for_active_scope()


def save_memory():
    paths = _active_scope_paths()
    write_json(paths["memory_file"], npc_memory)
    _save_npc_memory_split(npc_memory, memory_dir=paths["npc_memory_dir"])
    _refresh_runtime_cache_for_active_scope()


def save_relics():
    paths = _active_scope_paths()
    write_json(paths["relic_file"], relic_data)
    _refresh_runtime_cache_for_active_scope()


def save_economy():
    paths = _active_scope_paths()
    rows = economy_data.get("transactions", [])
    if isinstance(rows, list) and len(rows) > TRANSACTION_TAIL_LIMIT:
        economy_data["transactions"] = rows[-TRANSACTION_TAIL_LIMIT:]
    write_json(paths["economy_file"], economy_data)
    _save_economy_split_files(economy_data, split_dir=paths["economy_split_dir"])
    _save_state_entity_files(economy_data, state_dir=paths["state_entity_dir"])
    _refresh_runtime_cache_for_active_scope()


def save_turn_state():
    paths = _active_scope_paths()
    write_json(paths["turn_file"], turn_state)
    _refresh_runtime_cache_for_active_scope()


def save_ai_usage():
    write_json(USAGE_FILE, ai_usage)


def save_contract_proposals():
    paths = _active_scope_paths()
    write_json(paths["contract_proposals_file"], contract_proposals)
    _refresh_runtime_cache_for_active_scope()


def sync_storage_split_views():
    paths = _active_scope_paths()
    _save_npc_profiles_split(
        npc_profiles,
        profile_dir=paths["npc_profile_dir"],
        group_dir=paths["npc_group_dir"],
    )
    _save_npc_memory_split(npc_memory, memory_dir=paths["npc_memory_dir"])
    _save_economy_split_files(economy_data, split_dir=paths["economy_split_dir"])
    _save_state_entity_files(economy_data, state_dir=paths["state_entity_dir"])
    _refresh_runtime_cache_for_active_scope()


sync_storage_split_views()


def split_text_chunks(text: str, chunk_size: int = 1900) -> list[str]:
    raw = str(text or "")
    if not raw:
        return [""]
    return [raw[i : i + chunk_size] for i in range(0, len(raw), chunk_size)]


async def send_long_message(channel, text: str, **kwargs):
    chunks = split_text_chunks(text, chunk_size=1900)
    for chunk in chunks:
        await channel.send(chunk, **kwargs)


async def send_long_interaction_message(
    interaction: discord.Interaction, text: str, *, ephemeral: bool = True
):
    chunks = split_text_chunks(text, chunk_size=1900)
    if not interaction.response.is_done():
        await interaction.response.send_message(chunks[0], ephemeral=ephemeral)
    else:
        await interaction.followup.send(chunks[0], ephemeral=ephemeral)
    for chunk in chunks[1:]:
        await interaction.followup.send(chunk, ephemeral=ephemeral)


def _today_quota_pacific() -> str:
    try:
        return datetime.datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
    except ZoneInfoNotFoundError:
        return datetime.datetime.utcnow().date().isoformat()


def _now_utc_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


def _ai_soft_quota_limits() -> tuple[bool, int, int]:
    ai_cfg = app_config.get("ai", {}) if isinstance(app_config, dict) else {}
    enforce = bool(ai_cfg.get("enforce_local_gemini_quota", False))
    try:
        rpm = max(0, int(ai_cfg.get("local_gemini_rpm_soft_limit", GEMINI_RPM_LIMIT) or 0))
    except (TypeError, ValueError):
        rpm = GEMINI_RPM_LIMIT
    try:
        rpd = max(0, int(ai_cfg.get("local_gemini_rpd_soft_limit", GEMINI_RPD_LIMIT) or 0))
    except (TypeError, ValueError):
        rpd = GEMINI_RPD_LIMIT
    return enforce, rpm, rpd


def _allow_gemini_fallback_when_ollama_unavailable() -> bool:
    ai_cfg = app_config.get("ai", {}) if isinstance(app_config, dict) else {}
    return bool(ai_cfg.get("allow_gemini_fallback_when_ollama_unavailable", False))


def _trim_provider_message(text: str, limit: int = 300) -> str:
    raw = str(text or "").strip().replace("\r", " ").replace("\n", " ")
    return raw[:limit]


def _refresh_ai_usage_windows():
    today = _today_quota_pacific()
    if ai_usage.get("day") != today:
        ai_usage["day"] = today
        ai_usage["requests_today"] = 0
        ai_usage["attempts_today"] = 0

    now = time.monotonic()
    minute_start = float(ai_usage.get("minute_start", 0.0) or 0.0)
    if minute_start <= 0.0:
        ai_usage["minute_start"] = now
        ai_usage["requests_this_minute"] = 0
        ai_usage["attempts_this_minute"] = 0
    elif now - minute_start >= 60:
        ai_usage["minute_start"] = now
        ai_usage["requests_this_minute"] = 0
        ai_usage["attempts_this_minute"] = 0


def _register_ai_attempt():
    _refresh_ai_usage_windows()
    ai_usage["attempts_today"] = int(ai_usage.get("attempts_today", 0)) + 1
    ai_usage["attempts_this_minute"] = int(ai_usage.get("attempts_this_minute", 0)) + 1
    ai_usage["last_request_at"] = _now_utc_iso()
    save_ai_usage()


def _register_ai_success():
    _refresh_ai_usage_windows()
    ai_usage["requests_today"] = int(ai_usage.get("requests_today", 0)) + 1
    ai_usage["requests_this_minute"] = int(ai_usage.get("requests_this_minute", 0)) + 1
    ai_usage["last_limit_error"] = ""
    ai_usage["last_provider_status"] = "ok"
    ai_usage["last_provider_message"] = ""
    ai_usage["last_success_at"] = _now_utc_iso()
    save_ai_usage()


def _register_ai_provider_error(code: str, message: str):
    ai_usage["last_limit_error"] = code
    ai_usage["last_provider_status"] = code
    ai_usage["last_provider_message"] = _trim_provider_message(message)
    save_ai_usage()


def get_ai_quota_snapshot() -> dict:
    _refresh_ai_usage_windows()
    used_today = int(ai_usage.get("requests_today", 0))
    used_minute = int(ai_usage.get("requests_this_minute", 0))
    attempts_today = int(ai_usage.get("attempts_today", 0))
    attempts_minute = int(ai_usage.get("attempts_this_minute", 0))
    enforce_soft, rpm_soft_limit, rpd_soft_limit = _ai_soft_quota_limits()
    remaining_day = max(0, rpd_soft_limit - used_today) if rpd_soft_limit > 0 else None
    remaining_minute = max(0, rpm_soft_limit - used_minute) if rpm_soft_limit > 0 else None
    return {
        "day": ai_usage.get("day", _today_quota_pacific()),
        "used_today": used_today,
        "attempts_today": attempts_today,
        "remaining_day": remaining_day,
        "used_minute": used_minute,
        "attempts_minute": attempts_minute,
        "remaining_minute": remaining_minute,
        "rpd_limit": rpd_soft_limit,
        "rpm_limit": rpm_soft_limit,
        "soft_limit_enforced": enforce_soft,
        "last_limit_error": str(ai_usage.get("last_limit_error", "") or ""),
        "last_provider_status": str(ai_usage.get("last_provider_status", "") or ""),
        "last_provider_message": str(ai_usage.get("last_provider_message", "") or ""),
        "last_request_at": str(ai_usage.get("last_request_at", "") or ""),
        "last_success_at": str(ai_usage.get("last_success_at", "") or ""),
    }


def _language_instruction(user_text: Optional[str] = None, forced_language: Optional[str] = None) -> str:
    if forced_language and forced_language.lower() != "auto":
        return f"Antworte ausschliesslich auf {forced_language}."
    if LANGUAGE_MODE.lower() != "auto":
        return f"Antworte ausschliesslich auf {LANGUAGE_MODE}."
    if user_text:
        snippet = str(user_text).strip().replace("\n", " ")[:240]
        return (
            "Sprache: Antworte in derselben Sprache wie die folgende Nutzereingabe. "
            f"Nutzereingabe: {snippet}"
        )
    return "Sprache: Antworte in Englisch, falls keine Eingabesprache erkennbar ist."


def build_llm_messages(
    messages: list[dict], user_text: Optional[str] = None, forced_language: Optional[str] = None
) -> list[dict]:
    lang_rule = {"role": "system", "content": _language_instruction(user_text, forced_language)}
    return [lang_rule, *messages]


def _messages_to_prompt(messages: list[dict]) -> str:
    lines = []
    for msg in messages:
        role = str(msg.get("role", "user")).upper()
        content = str(msg.get("content", "")).strip()
        if content:
            lines.append(f"{role}: {content}")
    lines.append("ASSISTANT: Antworte jetzt.")
    return "\n\n".join(lines)


def _gemini_chat_sync(messages: list[dict]) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API-Key fehlt. Setze GEMINI_API_KEY in Administration/.env.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": _messages_to_prompt(messages),
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.8,
            "topP": 0.95,
            "maxOutputTokens": 900,
        },
    }
    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(f"Gemini HTTP {e.code}: {body[:300]}")

    candidates = data.get("candidates", [])
    if not candidates:
        return "Fehler: Keine Antwort vom Modell."
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    return text or "Fehler: Leere Modellantwort."


def _extract_openai_message_text(content) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if isinstance(item, dict):
                if isinstance(item.get("text"), str):
                    parts.append(item.get("text", ""))
                    continue
                if item.get("type") == "text" and isinstance(item.get("text"), str):
                    parts.append(item.get("text", ""))
        return "".join(parts).strip()
    return ""


def _external_openai_chat_sync(messages: list[dict]) -> str:
    ext_cfg = get_external_openai_config()
    endpoint_url = str(ext_cfg.get("endpoint_url", "") or "").strip()
    model = str(ext_cfg.get("model", "") or "").strip()
    api_key = get_external_openai_api_key()
    if not endpoint_url or not model:
        raise RuntimeError("Externe API ist nicht vollstaendig konfiguriert (Endpoint/Modell fehlt).")
    if not api_key:
        raise RuntimeError("Externe API hat keinen gespeicherten API-Key.")

    auth_header_name = str(ext_cfg.get("auth_header_name", "Authorization") or "Authorization").strip() or "Authorization"
    auth_scheme = str(ext_cfg.get("auth_scheme", "Bearer") or "Bearer").strip()
    timeout_seconds = max(10, min(300, int(ext_cfg.get("timeout_seconds", 90) or 90)))
    auth_value = f"{auth_scheme} {api_key}".strip() if auth_scheme else api_key
    payload = {
        "model": model,
        "messages": [
            {
                "role": str(msg.get("role", "user")),
                "content": str(msg.get("content", "")),
            }
            for msg in messages
        ],
        "temperature": 0.8,
        "top_p": 0.95,
        "max_tokens": 900,
        "stream": False,
    }
    req = urllib.request.Request(
        url=endpoint_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            auth_header_name: auth_value,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(f"External API HTTP {e.code}: {body[:300]}")
    except Exception as e:
        raise RuntimeError(f"Externe API-Verbindung fehlgeschlagen: {str(e)[:220]}")

    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError(f"Externe API lieferte keine Choices: {json.dumps(data, ensure_ascii=False)[:220]}")
    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    text = _extract_openai_message_text(message.get("content"))
    return text or "Fehler: Leere Modellantwort von externer API."


def _ollama_chat_sync(messages: list[dict]) -> str:
    """Ollama local LLM chat - no API limits, runs on your PC"""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    # Convert messages to Ollama format
    ollama_messages = []
    for msg in messages:
        role = str(msg.get("role", "user"))
        if role == "system":
            role = "system"
        elif role == "assistant":
            role = "assistant"
        else:
            role = "user"
        ollama_messages.append({
            "role": role,
            "content": str(msg.get("content", ""))
        })
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": False,
        "options": {
            "temperature": 0.8,
            "num_predict": 900,
        }
    }
    
    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(f"Ollama HTTP {e.code}: {body[:300]}")
    except Exception as e:
        raise RuntimeError(f"Ollama-Verbindung fehlgeschlagen: {str(e)[:200]}")
    
    message = data.get("message", {})
    text = message.get("content", "").strip()
    return text or "Fehler: Leere Modellantwort von Ollama."


def _check_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        url = f"{OLLAMA_BASE_URL}/api/tags"
        req = urllib.request.Request(url=url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


async def llm_chat(
    messages: list[dict], user_text: Optional[str] = None, forced_language: Optional[str] = None
) -> str:
    # Check if we should use Ollama
    if LLM_PROVIDER == "ollama":
        allow_fallback = _allow_gemini_fallback_when_ollama_unavailable()
        # Try Ollama first
        if _check_ollama_available():
            loop = asyncio.get_running_loop()
            try:
                full_messages = build_llm_messages(
                    messages=messages, user_text=user_text, forced_language=forced_language
                )
                result = await loop.run_in_executor(None, lambda: _ollama_chat_sync(full_messages))
                return result
            except Exception as exc:
                if not allow_fallback:
                    raise RuntimeError(f"Ollama fehlgeschlagen: {str(exc)[:220]}")
                print(f"Ollama fehlgeschlagen: {exc}. Versuche Gemini als Fallback...")
                # Continue to Gemini below
        else:
            if not allow_fallback:
                raise RuntimeError(
                    "Ollama ist als aktiver Provider gesetzt, aber aktuell nicht erreichbar. "
                    "Starte Ollama oder wechsle den Provider bewusst."
                )
            print("Ollama nicht verfuegbar. Versuche Gemini als Fallback...")

    if LLM_PROVIDER == "external_openai":
        _register_ai_attempt()
        loop = asyncio.get_running_loop()
        try:
            full_messages = build_llm_messages(
                messages=messages, user_text=user_text, forced_language=forced_language
            )
            result = await loop.run_in_executor(None, lambda: _external_openai_chat_sync(full_messages))
            _register_ai_success()
            return result
        except Exception as exc:
            _register_ai_provider_error("EXTERNAL_REQUEST_FAILED", str(exc))
            raise

    # Gemini fallback or primary provider
    _register_ai_attempt()
    enforce_soft, rpm_soft_limit, rpd_soft_limit = _ai_soft_quota_limits()
    if enforce_soft and rpd_soft_limit > 0 and int(ai_usage.get("requests_today", 0)) >= rpd_soft_limit:
        _register_ai_provider_error("LOCAL_RPD_SOFT_LIMIT", "Lokales Gemini-Tages-Softlimit erreicht.")
        raise RuntimeError(f"Lokales Gemini-Tages-Softlimit erreicht ({rpd_soft_limit}/Tag).")
    if enforce_soft and rpm_soft_limit > 0 and int(ai_usage.get("requests_this_minute", 0)) >= rpm_soft_limit:
        _register_ai_provider_error("LOCAL_RPM_SOFT_LIMIT", "Lokales Gemini-Minuten-Softlimit erreicht.")
        raise RuntimeError(f"Lokales Gemini-Minuten-Softlimit erreicht ({rpm_soft_limit}/Minute).")

    loop = asyncio.get_running_loop()
    try:
        full_messages = build_llm_messages(
            messages=messages, user_text=user_text, forced_language=forced_language
        )
        result = await loop.run_in_executor(None, lambda: _gemini_chat_sync(full_messages))
        _register_ai_success()
        return result
    except Exception as exc:
        text = str(exc)
        if "429" in text or "RESOURCE_EXHAUSTED" in text:
            _register_ai_provider_error("PROVIDER_429", text)
            raise RuntimeError(
                "Gemini lehnt aktuell mit HTTP 429 ab. "
                "Das ist meist eine Projekt-/Billing-/Quota-Grenze in Google AI Studio, "
                "nicht 'verbrauchte Bot-Tokens'."
            )
        _register_ai_provider_error("REQUEST_FAILED", text)
        raise


def safe_json_load(raw: str):
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None


def format_lore_event(priority: str, channel_name: str, text: str) -> str:
    clean_priority = priority.upper()
    clean_channel = channel_name or "unknown"
    return f"[{clean_priority}][{clean_channel}] {text.strip()}"


def keep_lore_events_bounded():
    events = lore_data.get("events", [])
    if len(events) <= FREE_AI_MAX_EVENTS:
        return

    def priority_score(event_text: str) -> int:
        if event_text.startswith("[HIGH]"):
            return 3
        if event_text.startswith("[MEDIUM]"):
            return 2
        if event_text.startswith("[LOW]"):
            return 1
        return 0

    # Hohe Prioritaet moeglichst behalten, niedrige zuerst entfernen.
    indexed = list(enumerate(events))
    indexed.sort(key=lambda item: (priority_score(item[1]), item[0]))
    remove_count = len(events) - FREE_AI_MAX_EVENTS
    remove_indices = {idx for idx, _ in indexed[:remove_count]}
    lore_data["events"] = [event for i, event in enumerate(events) if i not in remove_indices]


def get_free_ai_mode(channel_id: int) -> str:
    return free_ai_channel_settings.get(channel_id, "randomized")


def get_free_ai_mode_label(mode: str) -> str:
    labels = {
        "very_fast": "Sehr schnell (20s)",
        "fast": "Schnell (45s)",
        "normal": "Normal (90s)",
        "slow": "Langsam (180s)",
        "randomized": "Randomisiert (KI waehlt)",
    }
    return labels.get(mode, "Randomisiert (KI waehlt)")


def get_effective_free_ai_mode(channel_id: int) -> str:
    override = free_ai_throttle_override.get(channel_id)
    if override:
        return override
    return get_free_ai_mode(channel_id)


def apply_free_ai_autothrottle(channel_id: int):
    if not free_ai_auto_throttle_enabled:
        free_ai_throttle_override.pop(channel_id, None)
        return

    snapshot = get_ai_quota_snapshot()
    remaining = snapshot["remaining_day"]
    # Sanfte Drosselung je nach Restbudget.
    if remaining <= 10:
        free_ai_throttle_override[channel_id] = "slow"
    elif remaining <= 30:
        free_ai_throttle_override[channel_id] = "normal"
    elif remaining <= 60:
        free_ai_throttle_override[channel_id] = "fast"
    else:
        free_ai_throttle_override.pop(channel_id, None)


def get_relic_by_id(relic_id: str):
    for relic in relic_data.get("relics", []):
        if relic.get("id") == relic_id:
            return relic
    return None


def get_relic_owner(relic_id: str) -> Optional[str]:
    return relic_data.get("holders", {}).get(relic_id)


def set_relic_owner(relic_id: str, npc_name: Optional[str]):
    if "holders" not in relic_data:
        relic_data["holders"] = {}
    if npc_name:
        relic_data["holders"][relic_id] = npc_name
    else:
        relic_data["holders"].pop(relic_id, None)


def append_relic_history(entry: dict):
    if "history" not in relic_data:
        relic_data["history"] = []
    relic_data["history"].append(entry)
    if len(relic_data["history"]) > 80:
        relic_data["history"] = relic_data["history"][-80:]


async def announce_relic_event(
    channel,
    relic: dict,
    old_owner: Optional[str],
    new_owner: str,
    reason: str,
):
    rarity = relic.get("rarity", "mystisch")
    desc = relic.get("description", "Ein unbekanntes Artefakt.")
    title = f"RELIKT-EREIGNIS: {relic.get('name', relic.get('id', 'Relikt'))}"

    if old_owner:
        action_line = f"**{old_owner} -> {new_owner}**"
    else:
        action_line = f"**{new_owner} beansprucht das Relikt**"

    embed = discord.Embed(
        title=title,
        description=f"{action_line}\n\n{reason}",
        color=discord.Color.gold(),
    )
    embed.add_field(name="Seltenheit", value=rarity, inline=True)
    embed.add_field(name="Effekt", value=desc, inline=False)
    embed.set_footer(text="Relikte existieren ausserhalb von Gespraechen und praegen die Welt.")
    await channel.send(embed=embed)


async def maybe_trigger_relic_transfer(
    channel,
    receiver_npc: str,
    from_npc: Optional[str],
    seed_text: str,
    source: str,
) -> bool:
    if not relic_data.get("relics"):
        return False

    # Chance klein halten, damit es besonders bleibt.
    if random.random() > 0.12:
        return False

    all_relic_ids = [r.get("id") for r in relic_data["relics"] if r.get("id")]
    if not all_relic_ids:
        return False

    holders = relic_data.get("holders", {})
    from_holder_relics = []
    if from_npc:
        from_holder_relics = [rid for rid, owner in holders.items() if owner == from_npc]

    unowned_relics = [rid for rid in all_relic_ids if rid not in holders]

    chosen_relic_id = None
    old_owner = None
    if from_holder_relics and random.random() < 0.7:
        chosen_relic_id = random.choice(from_holder_relics)
        old_owner = from_npc
    elif unowned_relics:
        chosen_relic_id = random.choice(unowned_relics)
    else:
        owned_by_other = [rid for rid, owner in holders.items() if owner != receiver_npc]
        if owned_by_other:
            chosen_relic_id = random.choice(owned_by_other)
            old_owner = holders.get(chosen_relic_id)

    if not chosen_relic_id:
        return False

    relic = get_relic_by_id(chosen_relic_id)
    if not relic:
        return False

    set_relic_owner(chosen_relic_id, receiver_npc)
    channel_name = getattr(channel, "name", "unknown")
    reason = (
        "Ein Machtmoment verschiebt die Ordnung."
        if source == "free_ai"
        else "Ein kritischer Dialog kippt die Besitzverhaeltnisse."
    )
    append_relic_history(
        {
            "relic_id": chosen_relic_id,
            "relic_name": relic.get("name", chosen_relic_id),
            "from": old_owner,
            "to": receiver_npc,
            "source": source,
            "channel": channel_name,
            "context": seed_text[:280],
        }
    )
    save_relics()
    await announce_relic_event(channel, relic, old_owner, receiver_npc, reason)
    return True


async def choose_randomized_delay_seconds(channel_id: int) -> int:
    channel_name = str(channel_id)
    channel = bot.get_channel(channel_id)
    if channel is not None:
        channel_name = getattr(channel, "name", str(channel_id))

    prompt = f"""
Du steuerst das Sprechtempo autonomer NPCs.

Channel: {channel_name}
Aufgabe:
- Waehle eine ganze Zahl in Sekunden fuer die naechste Pause.
- Zielbereich: 20 bis 240 Sekunden.
- Dynamisch: mal schneller, mal langsamer, fuer natuerlichen Rhythmus.

Gib nur die Zahl aus, sonst nichts.
"""
    try:
        raw = (await llm_chat([{"role": "user", "content": prompt}])).strip()
        digits = "".join(ch for ch in raw if ch.isdigit())
        if digits:
            value = int(digits)
            return max(20, min(240, value))
    except Exception:
        pass
    return random.randint(30, 180)


async def get_free_ai_delay_seconds(channel_id: int) -> int:
    apply_free_ai_autothrottle(channel_id)
    mode = get_effective_free_ai_mode(channel_id)
    preset = FREE_AI_DELAY_PRESETS.get(mode)
    if preset is not None:
        return preset
    return await choose_randomized_delay_seconds(channel_id)


async def summarize_event_by_priority(raw_event: str, priority: str) -> str:
    if priority == "high":
        instruction = "Formuliere detailreich in 3-4 Saetzen."
    elif priority == "medium":
        instruction = "Formuliere kompakt in 1-2 Saetzen."
    else:
        instruction = "Formuliere stark komprimiert in exakt 1 kurzem Satz."

    prompt = f"""
Du bist ein Lore-Editor fuer ein Rollenspiel.

Roh-Ereignis:
{raw_event}

Aufgabe:
{instruction}
Nur den finalen Event-Text ausgeben, ohne Listen, ohne Titel.
"""
    return (await llm_chat([{"role": "user", "content": prompt}])).strip()


async def maybe_store_npc_event_in_lore(
    npc_name: str, npc_output: str, channel_name: str, source: str
) -> bool:
    eval_prompt = f"""
Du bewertest, ob ein NPC-Beitrag ein einschneidendes Lore-Ereignis ist.

Kontext:
- NPC: {npc_name}
- Quelle: {source}
- Channel: {channel_name}
- Beitrag:
{npc_output}

Gib ausschliesslich JSON aus:
{{
  "impact": "none|low|medium|high",
  "event": "kurze Rohbeschreibung des Ereignisses"
}}

Regeln:
- impact=none, wenn kein langfristig relevantes Ereignis.
- low/medium/high je nach Tragweite fuer Welt, Beziehungen, Macht, Wirtschaft, Konflikte.
- event darf bei none leer sein.
"""
    raw = (await llm_chat([{"role": "user", "content": eval_prompt}])).strip()
    data = safe_json_load(raw)
    if not isinstance(data, dict):
        return False

    impact = str(data.get("impact", "none")).strip().lower()
    event_text = str(data.get("event", "")).strip()
    if impact not in EVENT_PRIORITIES or impact == "none" or not event_text:
        return False

    compressed_event = await summarize_event_by_priority(event_text, impact)
    lore_data["events"].append(format_lore_event(impact, channel_name, compressed_event))
    keep_lore_events_bounded()
    save_lore()
    return True


def parse_lore_event_priority(event_text: str):
    text = (event_text or "").strip()
    priority = "medium"

    while text.startswith("[") and "]" in text:
        end = text.find("]")
        tag = text[1:end].strip().upper()
        if tag in {"LOW", "MEDIUM", "HIGH"}:
            priority = tag.lower()
        text = text[end + 1 :].strip()

    return priority, text or event_text


def chunk_list(items, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


async def summarize_lore_event_chunk(priority: str, events: list[str]) -> str:
    if priority == "low":
        style = "stark komprimiert in 1 Satz mit maximal 18 Woertern."
    elif priority == "medium":
        style = "deutlich komprimiert in 1-2 Saetzen."
    else:
        style = "leicht komprimiert in 2-3 Saetzen mit den wichtigsten Details."

    source_text = "\n".join(f"- {e}" for e in events)
    prompt = f"""
Komprimiere folgende Lore-Ereignisse.
Prioritaet: {priority}
Stil: {style}

Ereignisse:
{source_text}

Gib nur den komprimierten Ergebnistext aus.
"""
    return (await llm_chat([{"role": "user", "content": prompt}])).strip()


async def session_finalize_lore_events() -> int:
    events = lore_data.get("events", [])
    if not events:
        return 0

    grouped = {"low": [], "medium": [], "high": []}
    for event in events:
        priority, clean_text = parse_lore_event_priority(event)
        grouped.get(priority, grouped["medium"]).append(clean_text)

    compressed_events = []
    strategy = {"low": 10, "medium": 5, "high": 2}

    for priority in ("low", "medium", "high"):
        bucket = grouped[priority]
        if not bucket:
            continue
        for group in chunk_list(bucket, strategy[priority]):
            summary = await summarize_lore_event_chunk(priority, group)
            compressed_events.append(format_lore_event(priority, "ARCHIVE", summary))

    if not compressed_events:
        return 0

    lore_data["events"] = compressed_events
    keep_lore_events_bounded()
    save_lore()
    return len(compressed_events)


def get_short_term_dialogue_pairs(short_term: list[dict]):
    dialogue_pairs = []
    temp = []
    for msg in short_term:
        temp.append(msg)
        if len(temp) == 2 and temp[0]["role"] == "user" and temp[1]["role"] == "assistant":
            dialogue_pairs.append(temp)
            temp = []
    return dialogue_pairs


async def summarize_npc_memory_chunk(npc_name: str, pairs: list[list[dict]]) -> str:
    conversation_text = ""
    for pair in pairs:
        conversation_text += f"USER: {pair[0]['content']}\nASSISTANT: {pair[1]['content']}\n\n"

    prompt = f"""
Komprimiere die folgende NPC-Session fuer langfristiges Gedachtnis.
NPC: {npc_name}

Fokus:
- Entscheidungen
- Beziehungen
- Konflikte
- Konsequenzen fuer die Welt

Konversation:
{conversation_text}

Gib nur die kompakte Zusammenfassung aus.
"""
    return (await llm_chat([{"role": "user", "content": prompt}])).strip()


async def session_finalize_all_npc_memories() -> int:
    compressed_npcs = 0
    for npc_name in npc_profiles.keys():
        ensure_npc_memory_structure(npc_name)
        memory = npc_memory[npc_name]
        pairs = get_short_term_dialogue_pairs(memory["short_term"])
        if not pairs:
            continue

        # Letzte 2 Paare als frische Kurzzeitkontexte behalten.
        keep_pairs = 2
        pairs_to_compress = pairs if len(pairs) <= keep_pairs else pairs[:-keep_pairs]
        if not pairs_to_compress:
            continue

        for batch in chunk_list(pairs_to_compress, 8):
            summary = await summarize_npc_memory_chunk(npc_name, batch)
            memory["long_term"].append(
                {
                    "role": "system",
                    "content": f"Session-Kompression:\n{summary}",
                }
            )
            await update_core_memory(npc_name, summary)

        for pair in pairs_to_compress:
            if pair[0] in memory["short_term"]:
                memory["short_term"].remove(pair[0])
            if pair[1] in memory["short_term"]:
                memory["short_term"].remove(pair[1])

        if len(memory["long_term"]) > 40:
            memory["long_term"] = memory["long_term"][-40:]
        compressed_npcs += 1

    if compressed_npcs:
        save_memory()
    return compressed_npcs


async def finalize_free_ai_session_state():
    lore_count = await session_finalize_lore_events()
    npc_count = await session_finalize_all_npc_memories()
    return lore_count, npc_count


def build_free_ai_seed(speaker: str, listener: str) -> str:
    hooks = [
        "ein Geruecht ueber Rohstoffknappheit",
        "ein Streit ueber eine neue Marktregel",
        "ein Vorschlag fuer ein Buendnis",
        "eine Warnung vor einem drohenden Engpass",
        "ein Machtwechsel in einer Handelsgruppe",
        "ein unerwarteter Preissturz auf dem Markt",
    ]
    relation = [
        f"Reagiere direkt auf {listener}.",
        f"Fordere {listener} heraus.",
        f"Bitte {listener} um Unterstuetzung.",
        f"Verhandle mit {listener} ueber einen Kompromiss.",
    ]
    return f"{random.choice(hooks)} {random.choice(relation)}"


async def run_free_ai_for_channel(channel_id: int):
    try:
        while channel_id in free_ai_channels:
            wait_seconds = await get_free_ai_delay_seconds(channel_id)
            await asyncio.sleep(wait_seconds)
            if channel_id not in free_ai_channels:
                break
            async with runtime_scope_lock:
                channel = bot.get_channel(channel_id)
                if channel is None:
                    continue
                guild_id = getattr(getattr(channel, "guild", None), "id", None)
                set_active_guild_context(guild_id if guild_id else None)
                if len(npc_profiles) < 2:
                    continue

                npc_names = list(npc_profiles.keys())
                speaker = random.choice(npc_names)
                listener_candidates = [n for n in npc_names if n != speaker]
                if not listener_candidates:
                    continue
                listener = random.choice(listener_candidates)
                try:
                    trigger_text = build_free_ai_seed(speaker, listener)
                    reply = await ask_npc_progressive(
                        npc_name=speaker,
                        player_message=trigger_text,
                        username="FreeAI",
                        channel=channel,
                    )
                    await send_npc_reply(channel, speaker, reply)
                    await maybe_store_npc_event_in_lore(
                        npc_name=speaker,
                        npc_output=reply,
                        channel_name=getattr(channel, "name", str(channel_id)),
                        source="free_ai",
                    )

                    # Gelegentlich Gegenreaktion fuer fortlaufende Interaktion.
                    if random.random() < 0.45:
                        follow_up = await ask_npc_progressive(
                            npc_name=listener,
                            player_message=reply,
                            username=speaker,
                            channel=channel,
                        )
                        await send_npc_reply(channel, listener, follow_up)
                        await maybe_store_npc_event_in_lore(
                            npc_name=listener,
                            npc_output=follow_up,
                            channel_name=getattr(channel, "name", str(channel_id)),
                            source="free_ai",
                        )
                    free_ai_limit_notified.discard(channel_id)
                except RuntimeError as err:
                    msg = str(err)
                    if "Limit" in msg or "limit" in msg or "429" in msg:
                        if channel_id not in free_ai_limit_notified:
                            await channel.send(
                                "FreeAI pausiert kurz: KI-Limit erreicht. Versuche spaeter automatisch weiter."
                            )
                            free_ai_limit_notified.add(channel_id)
                        await asyncio.sleep(65)
                        continue
                    raise
    except asyncio.CancelledError:
        pass
    except Exception as exc:
        print(f"FreeAI Fehler in Channel {channel_id}: {exc}")
    finally:
        free_ai_tasks.pop(channel_id, None)


def start_free_ai_channel(channel_id: int):
    if channel_id in free_ai_tasks:
        return
    free_ai_channels.add(channel_id)
    free_ai_channel_settings.setdefault(channel_id, "randomized")
    free_ai_throttle_override.pop(channel_id, None)
    free_ai_tasks[channel_id] = asyncio.create_task(run_free_ai_for_channel(channel_id))


def stop_free_ai_channel(channel_id: int):
    free_ai_channels.discard(channel_id)
    task = free_ai_tasks.pop(channel_id, None)
    if task:
        task.cancel()
    free_ai_channel_settings.pop(channel_id, None)
    free_ai_limit_notified.discard(channel_id)
    free_ai_throttle_override.pop(channel_id, None)


def normalize_npc_type(value: str) -> str:
    val = (value or "").strip().lower()
    if val in {"char", "character", "figur", "npc"}:
        return "character"
    if val in {"group", "gruppe", "team"}:
        return "group"
    return val


def infer_intent(text: str) -> str:
    t = (text or "").lower()
    if any(word in t for word in ["markt", "aktie", "economy", "oekonomie", "wirtschaft"]):
        return "economy"
    if any(word in t for word in ["zug", "runde", "turn"]):
        return "turns"
    if any(word in t for word in ["language", "sprache", "idioma", "langue", "lingua"]):
        return "language"
    if any(word in t for word in ["free ai", "freeai", "autonom", "campus", "selbst"]):
        return "free_ai"
    if any(word in t for word in ["erstellen", "anlegen", "create", "neu", "npc bauen"]):
        return "create_npc"
    if any(word in t for word in ["loeschen", "löschen", "remove", "delete"]) and "npc" in t:
        return "delete_npc"
    if any(word in t for word in ["avatar", "profil", "prompt", "bearbeiten", "edit"]):
        return "edit_npc"
    if any(word in t for word in ["lore", "regel", "event", "welt"]):
        return "lore"
    if any(word in t for word in ["liste", "list", "anzeigen", "welche npcs"]):
        return "list_npcs"
    if any(word in t for word in ["reden", "talk", "chat", "sprechen", "konversation"]):
        return "talk_npc"
    return "unknown"


def user_has_admin_role(member: discord.abc.User) -> bool:
    return _member_has_admin_access(member)


def get_turn_role_members(guild: discord.Guild, role_id: int) -> list[int]:
    role = guild.get_role(role_id) if guild else None
    if role is None:
        return []
    return sorted(member.id for member in role.members if not member.bot)


def has_minimum_turn_role_members(guild: discord.Guild, role_id: int) -> bool:
    return len(get_turn_role_members(guild, role_id)) >= MIN_TURN_ROLE_MEMBERS


def refresh_turn_requirements(guild: discord.Guild):
    role_id = turn_state.get("role_id")
    if not role_id:
        turn_state["required_user_ids"] = []
        turn_state["completed_user_ids"] = []
        return

    required = get_turn_role_members(guild, int(role_id))
    completed = set(int(uid) for uid in turn_state.get("completed_user_ids", []))
    turn_state["required_user_ids"] = required
    turn_state["completed_user_ids"] = [uid for uid in required if uid in completed]


def get_turn_progress() -> tuple[int, int]:
    completed = len(turn_state.get("completed_user_ids", []))
    required = len(turn_state.get("required_user_ids", []))
    return completed, required


def is_turn_complete() -> bool:
    completed, required = get_turn_progress()
    return required >= MIN_TURN_ROLE_MEMBERS and completed >= required


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def _next_id(key: str) -> int:
    nxt = int(economy_data.get("next_ids", {}).get(key, 1))
    economy_data["next_ids"][key] = nxt + 1
    return nxt


def get_econ_setting_int(key: str) -> Optional[int]:
    val = economy_data.get("settings", {}).get(key)
    if val is None:
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def user_has_role_id(member: discord.abc.User, role_id: Optional[int]) -> bool:
    if role_id is None or not isinstance(member, discord.Member):
        return False
    return any(role.id == role_id for role in member.roles)


def user_can_manage_laws(member: discord.abc.User) -> bool:
    if user_has_admin_role(member):
        return True
    chief_role_id = get_econ_setting_int("state_chief_role_id")
    judiciary_role_id = get_econ_setting_int("judiciary_role_id")
    return user_has_role_id(member, chief_role_id) or user_has_role_id(member, judiciary_role_id)


def normalize_category(cat: str) -> str:
    key = str(cat or "").strip().lower().replace(" ", "_")
    return CATEGORY_ALIASES.get(key, key)


def category_exists(cat: str) -> bool:
    c = normalize_category(cat)
    return c in set(economy_data.get("market_categories", []))


def ensure_product_structure(product: dict):
    product.setdefault("description", "")
    product.setdefault("image_url", "")
    product.setdefault("manufacturer_entity_id", product.get("owner_entity_id"))
    product["category"] = normalize_category(product.get("category", ""))
    if "inventory_tracked" not in product:
        product["inventory_tracked"] = product["category"] != "services"
    raw_inputs = product.get("recipe_inputs", [])
    normalized_inputs = []
    if isinstance(raw_inputs, list):
        for row in raw_inputs:
            if not isinstance(row, dict):
                continue
            product_id = str(row.get("product_id", "")).strip()
            if not product_id:
                continue
            try:
                qty = max(1, int(float(row.get("qty", 1) or 1)))
            except Exception:
                qty = 1
            normalized_inputs.append({"product_id": product_id, "qty": qty})
    product["recipe_inputs"] = normalized_inputs
    try:
        output_qty = max(1, int(float(product.get("recipe_output_qty", 1) or 1)))
    except Exception:
        output_qty = 1
    product["recipe_output_qty"] = output_qty
    recipe_source = str(product.get("recipe_source", "") or "").strip().lower()
    if recipe_source not in {"", "manual", "ai"}:
        recipe_source = ""
    product["recipe_source"] = recipe_source
    confidence = str(product.get("recipe_inference_confidence", "") or "").strip().lower()
    if confidence not in {"", "low", "medium", "high"}:
        confidence = ""
    product["recipe_inference_confidence"] = confidence
    product["recipe_inference_notes"] = str(product.get("recipe_inference_notes", "") or "")[:800]
    try:
        updated_ts = int(product.get("recipe_inference_updated_ts", 0) or 0)
    except Exception:
        updated_ts = 0
    product["recipe_inference_updated_ts"] = max(0, updated_ts)


def product_has_recipe(product: Optional[dict]) -> bool:
    if not product:
        return False
    ensure_product_structure(product)
    return bool(product.get("recipe_inputs"))


def build_product_recipe_text(product: Optional[dict]) -> str:
    if not product:
        return "-"
    ensure_product_structure(product)
    inputs = product.get("recipe_inputs", []) or []
    if not inputs:
        return "-"
    parts = []
    for row in inputs[:20]:
        ingredient = get_product(str(row.get("product_id", "")))
        ingredient_name = ingredient.get("name", f"Produkt#{row.get('product_id')}") if ingredient else f"Produkt#{row.get('product_id')}"
        parts.append(f"{int(row.get('qty', 1) or 1)}x {ingredient_name} (#{row.get('product_id')})")
    output_qty = int(product.get("recipe_output_qty", 1) or 1)
    product_name = str(product.get("name", "")) or f"Produkt#{product.get('id', '-')}"
    return f"{', '.join(parts)} -> {output_qty}x {product_name}"


def is_product_inventory_tracked(product: Optional[dict]) -> bool:
    if not product:
        return False
    if "inventory_tracked" in product:
        return bool(product.get("inventory_tracked"))
    return normalize_category(product.get("category", "")) != "services"


def create_product(
    owner_entity_id: str,
    category: str,
    name: str,
    base_price: float,
    is_state_offer: bool = False,
    description: str = "",
    image_url: str = "",
    manufacturer_entity_id: Optional[str] = None,
) -> str:
    product_id = str(_next_id("product"))
    economy_data["products"][product_id] = {
        "id": product_id,
        "owner_entity_id": str(owner_entity_id),
        "category": normalize_category(category),
        "name": name.strip(),
        "base_price": round(float(base_price), 2),
        "is_state_offer": bool(is_state_offer),
        "description": description[:1200],
        "image_url": image_url[:500],
        "manufacturer_entity_id": str(manufacturer_entity_id or owner_entity_id),
        "active": True,
    }
    ensure_product_structure(economy_data["products"][product_id])
    save_economy()
    return product_id


def get_product(product_id: str) -> Optional[dict]:
    product = economy_data.get("products", {}).get(str(product_id))
    if product:
        ensure_product_structure(product)
    return product


def get_entity_name(entity_id: Optional[str]) -> str:
    if not entity_id:
        return "-"
    entity = get_entity(str(entity_id))
    return entity.get("name", str(entity_id)) if entity else str(entity_id)


def build_product_profile_text(product_id: str) -> str:
    product = get_product(product_id)
    if not product:
        return "Produkt nicht gefunden."
    manufacturer = get_entity_name(product.get("manufacturer_entity_id"))
    seller = get_entity_name(product.get("owner_entity_id"))
    inventory_mode = "Ja" if is_product_inventory_tracked(product) else "Nein (Service/virtuell)"
    recipe_text = build_product_recipe_text(product)
    recipe_source = str(product.get("recipe_source", "") or "").strip().lower()
    if recipe_source == "ai":
        recipe_source_text = f"KI ({str(product.get('recipe_inference_confidence', '') or '-').upper()})"
    elif recipe_source == "manual":
        recipe_source_text = "Manuell"
    else:
        recipe_source_text = "-"
    return (
        f"**Produkt #{product['id']}: {product['name']}**\n"
        f"- Kategorie: {product['category']}\n"
        f"- Preis: {format_money(float(product['base_price']))}\n"
        f"- Hersteller: {manufacturer}\n"
        f"- Anbieter: {seller}\n"
        f"- Inventarpflicht: {inventory_mode}\n"
        f"- Rezept: {recipe_text}\n"
        f"- Rezeptquelle: {recipe_source_text}\n"
        f"- Beschreibung:\n{product.get('description') or '-'}"
    )


def build_shop_page(page: int, per_page: int = 8, category: Optional[str] = None) -> tuple[str, int]:
    cat_filter = normalize_category(category) if category else None
    products = filter_products(category=cat_filter)
    products.sort(key=lambda x: (x.get("category", ""), x.get("name", "").lower()))
    if not products:
        return ("Shop ist leer.", 1)

    total_pages = max(1, (len(products) + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    start = (page - 1) * per_page
    batch = products[start : start + per_page]
    lines = [f"**SHOP** Seite {page}/{total_pages}"]
    if cat_filter:
        lines.append(f"Filter: {cat_filter}")
    lines.append("")
    for p in batch:
        manufacturer = get_entity_name(p.get("manufacturer_entity_id"))
        lines.append(
            f"- #{p['id']} {p['name']} | {p['category']} | {format_money(float(p['base_price']))} | {manufacturer}"
        )
    lines.append("")
    lines.append("Details: `Eco econ product_view <id>`")
    lines.append("Seiten: `Eco econ shop <seite> [kategorie]`")
    lines.append("Suche: `Eco econ shop_search <query> | category=<cat> | provider=<name> | state=<state>`")
    return ("\n".join(lines), total_pages)


def _norm_search_text(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def _text_similarity(a: str, b: str) -> float:
    a_n = _norm_search_text(a)
    b_n = _norm_search_text(b)
    if not a_n or not b_n:
        return 0.0
    return difflib.SequenceMatcher(a=a_n, b=b_n).ratio()


def filter_products(
    category: Optional[str] = None,
    provider: Optional[str] = None,
    state: Optional[str] = None,
    query: Optional[str] = None,
) -> list[dict]:
    cat_filter = normalize_category(category) if category else None
    provider_filter = (provider or "").strip().lower()
    state_filter = (state or "").strip().lower()
    query_text = (query or "").strip()

    scored = []
    for p in economy_data.get("products", {}).values():
        ensure_product_structure(p)
        if not p.get("active", True):
            continue
        if cat_filter and p.get("category") != cat_filter:
            continue

        owner = get_entity(str(p.get("owner_entity_id")))
        manufacturer = get_entity(str(p.get("manufacturer_entity_id")))
        owner_name = (owner.get("name", "") if owner else "").lower()
        manufacturer_name = (manufacturer.get("name", "") if manufacturer else "").lower()
        owner_state = (owner.get("profile", {}).get("state", "") if owner else "").lower()
        manufacturer_state = (manufacturer.get("profile", {}).get("state", "") if manufacturer else "").lower()

        if provider_filter:
            if provider_filter not in owner_name and provider_filter not in manufacturer_name:
                continue
        if state_filter:
            if state_filter not in owner_state and state_filter not in manufacturer_state:
                continue

        score = 1.0
        if query_text:
            score = max(
                _text_similarity(query_text, p.get("name", "")),
                _text_similarity(query_text, p.get("description", "")),
                _text_similarity(query_text, manufacturer_name),
                _text_similarity(query_text, owner_name),
            )
            if score < 0.28:
                continue
        scored.append((score, p))

    scored.sort(key=lambda item: (item[0], item[1].get("name", "").lower()), reverse=True)
    return [p for _, p in scored]


def parse_shop_search_payload(payload: str) -> dict:
    # query | category=... | provider=... | state=... | sort=...
    parts = [p.strip() for p in (payload or "").split("|")]
    data = {"query": "", "category": None, "provider": None, "state": None, "sort": None}
    if parts:
        data["query"] = parts[0]
        for part in parts[1:]:
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            key = key.strip().lower()
            value = value.strip()
            if key in data:
                data[key] = value
    return data


def default_state_law_engine() -> dict:
    return {
        "permissions": {
            "person_whitelist_mode": False,
            "company_whitelist_mode": False,
            "person_allow_categories": [],
            "person_deny_categories": [],
            "company_allow_categories": [],
            "company_deny_categories": [],
            "person_allow_keywords": [],
            "person_deny_keywords": [],
            "company_allow_keywords": [],
            "company_deny_keywords": [],
            "person_allow_actions": [],
            "person_deny_actions": [],
            "company_allow_actions": [],
            "company_deny_actions": [],
            "person_action_whitelist_mode": False,
            "company_action_whitelist_mode": False,
        },
        "limits": {
            "contracts": {
                "max_total_by_actor_category": {
                    "person": {},
                    "company": {},
                },
                "min_total_by_category": {},
            },
            "stocks": {
                "max_holding_units_by_actor": {},
                "max_holding_pct_by_actor": {},
                "max_new_buys_per_turn_by_actor": {},
                "max_holding_units_by_actor_symbol": {
                    "person": {},
                    "company": {},
                },
                "max_holding_pct_by_actor_symbol": {
                    "person": {},
                    "company": {},
                },
            },
        },
        "modifiers": {
            "tax": {
                "flat_discount_pct_by_actor": {},
                "producer_discount_pct_for_state_supply_by_actor": {},
                "producer_discount_pct_by_category": {},
                "min_tax_pct_by_actor": {},
                "max_tax_pct_by_actor": {},
            },
            "subsidies": {
                "direct_per_turn_by_category": {},
                "direct_per_turn_by_company_id": {},
                "tax_credit_pct_by_category": {},
                "max_total_per_state_turn": 0.0,
            },
        },
        "addons": {},
        "negotiation": {
            "person_max_total_by_category": {},
            "company_max_total_by_category": {},
        },
    }


def _norm_unique_text_list(values) -> list[str]:
    out = []
    seen = set()
    for item in values or []:
        val = str(item or "").strip().lower()
        if not val or val in seen:
            continue
        seen.add(val)
        out.append(val)
    return out


def ensure_state_law_engine(state_entity: dict):
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {})
    laws = profile.setdefault("laws", {})
    defaults = default_state_law_engine()

    perms = laws.setdefault("permissions", {})
    for key, default in defaults["permissions"].items():
        perms.setdefault(key, default if not isinstance(default, list) else [])
    for key in [
        "person_allow_categories",
        "person_deny_categories",
        "company_allow_categories",
        "company_deny_categories",
    ]:
        perms[key] = _norm_unique_text_list(normalize_category(v) for v in perms.get(key, []))
    for key in [
        "person_allow_keywords",
        "person_deny_keywords",
        "company_allow_keywords",
        "company_deny_keywords",
        "person_allow_actions",
        "person_deny_actions",
        "company_allow_actions",
        "company_deny_actions",
    ]:
        perms[key] = _norm_unique_text_list(perms.get(key, []))
    perms["person_whitelist_mode"] = bool(perms.get("person_whitelist_mode", False))
    perms["company_whitelist_mode"] = bool(perms.get("company_whitelist_mode", False))
    perms["person_action_whitelist_mode"] = bool(perms.get("person_action_whitelist_mode", False))
    perms["company_action_whitelist_mode"] = bool(perms.get("company_action_whitelist_mode", False))

    limits = laws.setdefault("limits", {})
    limits_defaults = defaults["limits"]
    for key, default in limits_defaults.items():
        if key not in limits or not isinstance(limits.get(key), dict):
            limits[key] = json.loads(json.dumps(default))
    contracts_limits = limits.setdefault("contracts", {}).setdefault("max_total_by_actor_category", {})
    for actor in ("person", "company"):
        actor_map = contracts_limits.get(actor, {}) or {}
        cleaned = {}
        for cat, limit in actor_map.items():
            cat_norm = normalize_category(cat)
            try:
                amt = round(float(limit), 2)
            except (TypeError, ValueError):
                continue
            if amt <= 0:
                continue
            cleaned[cat_norm] = amt
        contracts_limits[actor] = cleaned
    min_total_map = limits.setdefault("contracts", {}).get("min_total_by_category", {}) or {}
    min_total_clean = {}
    for cat, amount in min_total_map.items():
        cat_norm = normalize_category(cat)
        try:
            amt = round(float(amount), 2)
        except (TypeError, ValueError):
            continue
        if amt <= 0:
            continue
        min_total_clean[cat_norm] = amt
    limits.setdefault("contracts", {})["min_total_by_category"] = min_total_clean

    stocks_limits = limits.setdefault("stocks", {})
    for key in ["max_holding_units_by_actor", "max_holding_pct_by_actor", "max_new_buys_per_turn_by_actor"]:
        raw = stocks_limits.get(key, {}) or {}
        cleaned = {}
        for actor, limit in raw.items():
            actor_key = str(actor).strip().lower()
            try:
                amt = round(float(limit), 4)
            except (TypeError, ValueError):
                continue
            if amt <= 0:
                continue
            cleaned[actor_key] = amt
        stocks_limits[key] = cleaned
    for key in ["max_holding_units_by_actor_symbol", "max_holding_pct_by_actor_symbol"]:
        raw = stocks_limits.get(key, {}) or {}
        cleaned_outer = {}
        for actor, sym_map in raw.items():
            actor_key = str(actor).strip().lower()
            inner = {}
            for sym, limit in (sym_map or {}).items():
                sym_key = str(sym).strip().upper()
                try:
                    amt = round(float(limit), 4)
                except (TypeError, ValueError):
                    continue
                if amt <= 0:
                    continue
                inner[sym_key] = amt
            cleaned_outer[actor_key] = inner
        stocks_limits[key] = cleaned_outer

    modifiers = laws.setdefault("modifiers", {})
    mod_defaults = defaults["modifiers"]
    for key, default in mod_defaults.items():
        if key not in modifiers or not isinstance(modifiers.get(key), dict):
            modifiers[key] = json.loads(json.dumps(default))
    tax_mod = modifiers.setdefault("tax", {})
    for key in [
        "flat_discount_pct_by_actor",
        "producer_discount_pct_for_state_supply_by_actor",
        "min_tax_pct_by_actor",
        "max_tax_pct_by_actor",
    ]:
        raw = tax_mod.get(key, {}) or {}
        cleaned = {}
        for actor, val in raw.items():
            actor_key = str(actor).strip().lower()
            try:
                pct = round(float(val), 4)
            except (TypeError, ValueError):
                continue
            cleaned[actor_key] = pct
        tax_mod[key] = cleaned
    prod_cat_raw = tax_mod.get("producer_discount_pct_by_category", {}) or {}
    prod_cat_clean = {}
    for cat, val in prod_cat_raw.items():
        cat_norm = normalize_category(cat)
        try:
            pct = round(float(val), 4)
        except (TypeError, ValueError):
            continue
        prod_cat_clean[cat_norm] = pct
    tax_mod["producer_discount_pct_by_category"] = prod_cat_clean

    subsidies_mod = modifiers.setdefault("subsidies", {})
    for key in ["direct_per_turn_by_category", "tax_credit_pct_by_category"]:
        raw = subsidies_mod.get(key, {}) or {}
        cleaned = {}
        for cat, val in raw.items():
            cat_norm = normalize_category(cat)
            try:
                amt = round(float(val), 4)
            except (TypeError, ValueError):
                continue
            if amt <= 0:
                continue
            cleaned[cat_norm] = amt
        subsidies_mod[key] = cleaned
    raw_company_direct = subsidies_mod.get("direct_per_turn_by_company_id", {}) or {}
    company_direct_clean = {}
    for company_id, val in raw_company_direct.items():
        cid = str(company_id).strip()
        if not cid:
            continue
        try:
            amt = round(float(val), 4)
        except (TypeError, ValueError):
            continue
        if amt <= 0:
            continue
        company_direct_clean[cid] = amt
    subsidies_mod["direct_per_turn_by_company_id"] = company_direct_clean
    try:
        max_total = round(float(subsidies_mod.get("max_total_per_state_turn", 0.0) or 0.0), 4)
    except (TypeError, ValueError):
        max_total = 0.0
    subsidies_mod["max_total_per_state_turn"] = max(0.0, max_total)

    negotiation = laws.setdefault("negotiation", {})
    for key, default in defaults["negotiation"].items():
        negotiation.setdefault(key, default if not isinstance(default, dict) else {})
    for key in ["person_max_total_by_category", "company_max_total_by_category"]:
        raw = negotiation.get(key, {}) or {}
        cleaned = {}
        for cat, limit in raw.items():
            cat_norm = normalize_category(cat)
            try:
                amt = round(float(limit), 2)
            except (TypeError, ValueError):
                continue
            if amt <= 0:
                continue
            cleaned[cat_norm] = amt
        negotiation[key] = cleaned
    # Backward compatibility + migration target for old negotiation keys.
    limits_contracts = laws.setdefault("limits", {}).setdefault("contracts", {}).setdefault("max_total_by_actor_category", {})
    limits_contracts.setdefault("person", {})
    limits_contracts.setdefault("company", {})
    for cat, limit in (negotiation.get("person_max_total_by_category", {}) or {}).items():
        limits_contracts["person"][normalize_category(cat)] = round(float(limit), 2)
    for cat, limit in (negotiation.get("company_max_total_by_category", {}) or {}).items():
        limits_contracts["company"][normalize_category(cat)] = round(float(limit), 2)
