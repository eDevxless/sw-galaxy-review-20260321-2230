# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **STAR-WARS-STECKBRIEF KATEGORIE**
# Unterkapitel: Charakter-, Einheiten- und Flottenprofile als Discord-Wizard.

import uuid

try:
    from discord import app_commands
except Exception:
    app_commands = None


SW_PROFILE_KINDS = {
    "character": {
        "title": "Charakter-Steckbrief",
        "singular": "Charakter",
        "command": "steckbrief",
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
                    {"key": "height", "label": "Groesse"},
                    {"key": "body", "label": "Koerperbau"},
                ],
            },
            {
                "key": "visual",
                "label": "Visuelles Profil",
                "fields": [
                    {"key": "eyes", "label": "Augenfarbe"},
                    {"key": "hair", "label": "Haarfarbe"},
                    {"key": "features", "label": "Besondere Merkmale", "long": True},
                    {"key": "outfit", "label": "Kleidung / Ruestung", "long": True},
                ],
            },
            {
                "key": "personality",
                "label": "Persoenlichkeit",
                "fields": [
                    {"key": "personality", "label": "Persoenlichkeit", "required": True, "long": True},
                    {"key": "traits", "label": "Eigenschaften", "long": True},
                    {"key": "strengths", "label": "Staerken", "long": True},
                    {"key": "weaknesses", "label": "Schwaechen", "long": True},
                    {"key": "fears", "label": "Aengste", "long": True},
                ],
            },
            {
                "key": "combat",
                "label": "Kampfdaten",
                "fields": [
                    {"key": "primary_weapon", "label": "Primaerbewaffnung"},
                    {"key": "secondary_gear", "label": "Sekundaerausruestung"},
                    {"key": "melee", "label": "Nahkampf", "long": True},
                    {"key": "ranged", "label": "Fernkampf", "long": True},
                    {"key": "training", "label": "Spezialausbildung", "long": True},
                ],
            },
            {
                "key": "skills",
                "label": "Fachkenntnisse",
                "fields": [
                    {"key": "tactics", "label": "Taktisches Verstaendnis", "long": True},
                    {"key": "tech", "label": "Technikkenntnisse", "long": True},
                    {"key": "piloting", "label": "Pilotenfaehigkeiten", "long": True},
                ],
            },
            {
                "key": "force",
                "label": "Machtfaehigkeiten",
                "fields": [
                    {"key": "force_sensitive", "label": "Machtsensitiv?"},
                    {"key": "midi_chlorians", "label": "Midichlorianer"},
                    {"key": "lightsaber_forms", "label": "Lichtschwertformen"},
                    {"key": "force_powers", "label": "Machtfaehigkeiten", "long": True},
                    {"key": "force_rank", "label": "Rang / Position"},
                ],
            },
            {
                "key": "possessions",
                "label": "Besitztuemer",
                "fields": [
                    {"key": "ship", "label": "Schiff / Fahrzeug"},
                    {"key": "finances", "label": "Finanziell"},
                    {"key": "collectibles", "label": "Sammlerstuecke"},
                    {"key": "other_possessions", "label": "Sonstiges", "long": True},
                ],
            },
        ],
        "collectors": [
            {"key": "backstory", "label": "Vorgeschichte", "required": True, "hint": "Sende jetzt die Vorgeschichte als normale Nachricht. `skip` ueberspringt."},
            {"key": "links", "label": "Bild / Links", "hint": "Sende Bild-Upload, Theme-/Synchro-Link oder `skip`."},
        ],
    },
    "unit": {
        "title": "Einheiten-Steckbrief",
        "singular": "Einheit",
        "command": "einheit",
        "required": {"unit_name", "faction", "specialization"},
        "sections": [
            {
                "key": "basic",
                "label": "Grunddaten",
                "fields": [
                    {"key": "unit_name", "label": "Name der Einheit", "required": True},
                    {"key": "faction", "label": "Fraktion", "required": True},
                    {"key": "specialization", "label": "Spezialisierung", "required": True},
                    {"key": "strength", "label": "Mannstaerke"},
                    {"key": "base", "label": "Heimatbasis"},
                ],
            },
            {
                "key": "equipment",
                "label": "Ausruestung",
                "fields": [
                    {"key": "primary_weapon", "label": "Primaerbewaffnung"},
                    {"key": "secondary_gear", "label": "Sekundaerausruestung"},
                    {"key": "special_gear", "label": "Spezialausruestung"},
                    {"key": "vehicles", "label": "Fahrzeuge"},
                    {"key": "ships", "label": "Schiffe"},
                ],
            },
            {
                "key": "abilities",
                "label": "Faehigkeiten",
                "fields": [
                    {"key": "role", "label": "Taktische Rolle", "long": True},
                    {"key": "melee", "label": "Nahkampf", "long": True},
                    {"key": "ranged", "label": "Fernkampf", "long": True},
                    {"key": "training", "label": "Spezialausbildung", "long": True},
                ],
            },
            {
                "key": "advanced",
                "label": "Erweitert",
                "fields": [
                    {"key": "tactics", "label": "Taktisches Verstaendnis", "long": True},
                    {"key": "tech", "label": "Technikkenntnisse", "long": True},
                    {"key": "piloting", "label": "Pilotenfaehigkeiten", "long": True},
                    {"key": "limits", "label": "Schwaechen / Limits", "long": True},
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
        "collectors": [
            {"key": "image_design", "label": "Bild / Design", "hint": "Sende Bild, Design-Link oder `skip`."},
        ],
    },
    "fleet": {
        "title": "Flotten-Steckbrief",
        "singular": "Flotte",
        "command": "flotte",
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
        "collectors": [],
    },
}


def _sw_profile_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _sw_profile_store_path(guild_id: Optional[int]) -> Path:
    if guild_id is not None:
        base = get_guild_data_dir(int(guild_id))
    else:
        base = GLOBAL_DATA_DIR
    base.mkdir(parents=True, exist_ok=True)
    return base / "sw_steckbriefe.json"


def _sw_profile_empty_store() -> dict:
    return {"schema_version": 1, "profiles": {}}


def _sw_profile_load_store(guild_id: Optional[int]) -> dict:
    path = _sw_profile_store_path(guild_id)
    if not path.exists():
        return _sw_profile_empty_store()
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        payload = _sw_profile_empty_store()
    if not isinstance(payload, dict):
        payload = _sw_profile_empty_store()
    if not isinstance(payload.get("profiles"), dict):
        payload["profiles"] = {}
    payload.setdefault("schema_version", 1)
    return payload


def _sw_profile_save_store(guild_id: Optional[int], payload: dict) -> None:
    path = _sw_profile_store_path(guild_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _sw_profile_short_id() -> str:
    return uuid.uuid4().hex[:10]


def _sw_profile_kind_config(kind: str) -> dict:
    return SW_PROFILE_KINDS.get(str(kind or "").strip().lower()) or SW_PROFILE_KINDS["character"]


def _sw_profile_get(guild_id: Optional[int], profile_id: str) -> Optional[dict]:
    store = _sw_profile_load_store(guild_id)
    profile = store.get("profiles", {}).get(str(profile_id or "").strip())
    return profile if isinstance(profile, dict) else None


def _sw_profile_put(guild_id: Optional[int], profile: dict) -> None:
    store = _sw_profile_load_store(guild_id)
    profile_id = str(profile.get("id") or "").strip()
    if not profile_id:
        return
    profile["updated_at"] = _sw_profile_now_iso()
    store.setdefault("profiles", {})[profile_id] = profile
    _sw_profile_save_store(guild_id, store)


def _sw_profile_create(guild_id: Optional[int], owner_id: int, kind: str) -> dict:
    profile_id = _sw_profile_short_id()
    now = _sw_profile_now_iso()
    profile = {
        "id": profile_id,
        "kind": str(kind),
        "owner_id": int(owner_id),
        "status": "in_progress",
        "step": 0,
        "created_at": now,
        "updated_at": now,
        "channel_id": None,
        "message_id": None,
        "published_channel_id": None,
        "published_message_id": None,
        "data": {},
        "ships": [],
    }
    _sw_profile_put(guild_id, profile)
    return profile


def _sw_profile_visible_name(profile: dict) -> str:
    data = profile.get("data", {}) or {}
    for key in ("name", "unit_name", "fleet_name"):
        value = str(data.get(key) or "").strip()
        if value:
            return value
    return f"{_sw_profile_kind_config(profile.get('kind')).get('singular')} {profile.get('id')}"


def _sw_profile_user_can_edit(user, profile: dict) -> bool:
    if int(profile.get("owner_id") or 0) == int(getattr(user, "id", 0) or 0):
        return True
    try:
        return bool(user_has_admin_role(user))
    except Exception:
        return False


def _sw_profile_all_fields(kind: str) -> list[dict]:
    config = _sw_profile_kind_config(kind)
    fields = []
    for section in config.get("sections", []) or []:
        fields.extend(section.get("fields", []) or [])
    fields.extend(config.get("collectors", []) or [])
    return fields


def _sw_profile_field_label(kind: str, key: str) -> str:
    for field in _sw_profile_all_fields(kind):
        if field.get("key") == key:
            return str(field.get("label") or key)
    return key


def _sw_profile_required_missing(profile: dict) -> list[str]:
    kind = str(profile.get("kind") or "character")
    data = profile.get("data", {}) or {}
    missing = []
    for key in sorted(_sw_profile_kind_config(kind).get("required", set()) or set()):
        if not str(data.get(key) or "").strip():
            missing.append(_sw_profile_field_label(kind, key))
    if kind == "fleet" and not profile.get("ships"):
        missing.append("mindestens ein Schiff")
    return missing


def _sw_profile_section_done(profile: dict, section: dict) -> bool:
    data = profile.get("data", {}) or {}
    fields = section.get("fields", []) or []
    required = [field for field in fields if field.get("required")]
    if required:
        return all(str(data.get(field.get("key")) or "").strip() for field in required)
    return any(str(data.get(field.get("key")) or "").strip() for field in fields)


def _sw_profile_progress(profile: dict) -> tuple[int, str]:
    kind = str(profile.get("kind") or "character")
    config = _sw_profile_kind_config(kind)
    total = len(config.get("sections", []) or []) + len(config.get("collectors", []) or [])
    if kind == "fleet":
        total += 1
    done = 0
    for section in config.get("sections", []) or []:
        if _sw_profile_section_done(profile, section):
            done += 1
    data = profile.get("data", {}) or {}
    for collector in config.get("collectors", []) or []:
        if str(data.get(collector.get("key")) or "").strip():
            done += 1
    if kind == "fleet" and profile.get("ships"):
        done += 1
    total = max(1, total)
    percent = int(round((done / total) * 100))
    filled = max(0, min(10, int(round(percent / 10))))
    bar = "[" + ("#" * filled) + ("-" * (10 - filled)) + f"] {percent}%"
    return percent, bar


def _sw_profile_control_text(profile: dict) -> str:
    config = _sw_profile_kind_config(profile.get("kind"))
    _, progress = _sw_profile_progress(profile)
    missing = _sw_profile_required_missing(profile)
    status = str(profile.get("status") or "in_progress")
    name = _sw_profile_visible_name(profile)
    lines = [
        f"**{config.get('title')}**",
        f"ID: `{profile.get('id')}` | Status: `{status}`",
        f"Name: **{name}**",
        f"Fortschritt: `{progress}`",
        "",
        "Bearbeite die Abschnitte ueber die Buttons. Lange Texte und Uploads laufen als normale Nachricht.",
    ]
    if missing:
        lines.append("")
        lines.append("Noch offen: " + ", ".join(missing[:8]))
    return "\n".join(lines)[:1900]


def _sw_profile_truncate(text: str, limit: int = 1900) -> str:
    value = str(text or "")
    if len(value) <= limit:
        return value
    return value[: limit - 20].rstrip() + "\n...[gekuerzt]"


def _sw_profile_format_section(title: str, rows: list[tuple[str, str]]) -> list[str]:
    lines = [f"===== {title} ====="]
    any_value = False
    for label, value in rows:
        cleaned = str(value or "").strip()
        if not cleaned:
            continue
        any_value = True
        lines.append(f"- {label}: {cleaned}")
    if not any_value:
        lines.append("- Keine Angaben")
    return lines


def _sw_profile_extract_int(value) -> int:
    match = re.search(r"-?\d+", str(value or "").replace(".", ""))
    if not match:
        return 0
    try:
        return max(0, int(match.group(0)))
    except Exception:
        return 0


def _sw_profile_format(profile: dict) -> str:
    kind = str(profile.get("kind") or "character")
    config = _sw_profile_kind_config(kind)
    data = profile.get("data", {}) or {}
    lines = [
        f"**{config.get('title')}**",
        f"**{_sw_profile_visible_name(profile)}**",
        "",
    ]
    for section in config.get("sections", []) or []:
        rows = []
        for field in section.get("fields", []) or []:
            rows.append((str(field.get("label") or field.get("key")), data.get(field.get("key"))))
        lines.extend(_sw_profile_format_section(str(section.get("label") or section.get("key")), rows))
        lines.append("")
    for collector in config.get("collectors", []) or []:
        lines.extend(
            _sw_profile_format_section(
                str(collector.get("label") or collector.get("key")),
                [(str(collector.get("label") or collector.get("key")), data.get(collector.get("key")))],
            )
        )
        lines.append("")
    if kind == "fleet":
        ships = profile.get("ships", []) or []
        lines.append("===== Flottenuebersicht =====")
        total_passengers = 0
        total_fighters = 0
        for index, ship in enumerate(ships, start=1):
            total_passengers += _sw_profile_extract_int(ship.get("passengers"))
            total_fighters += _sw_profile_extract_int(ship.get("fighters"))
            lines.append(f"{index}. {ship.get('name') or ship.get('ship_class') or 'Unbenanntes Schiff'}")
            lines.append(f"- Klasse: {ship.get('ship_class') or '-'}")
            lines.append(f"- Kommandant: {ship.get('commander') or '-'}")
            lines.append(f"- Passagiere: {ship.get('passengers') or '-'}")
            lines.append(f"- Jaeger/Raumfahrzeuge: {ship.get('fighters') or '-'}")
            if ship.get("vehicles"):
                lines.append(f"- Bodenfahrzeuge: {ship.get('vehicles')}")
            if ship.get("special"):
                lines.append(f"- Besonderheit: {ship.get('special')}")
            lines.append("")
        if not ships:
            lines.append("- Keine Schiffe eingetragen")
        lines.extend(
            [
                "===== Gesamtbestand =====",
                f"- Passagiere: {total_passengers}",
                f"- Jaeger/Raumfahrzeuge: {total_fighters}",
                "- Bodenfahrzeuge: siehe Einzelschiffe",
                "",
            ]
        )
    return "\n".join(lines).strip()


async def _sw_profile_refresh_message(interaction: discord.Interaction, profile: dict) -> None:
    content = _sw_profile_control_text(profile)
    view = SWProfileWizardView(profile_id=str(profile.get("id")), kind=str(profile.get("kind")), owner_id=int(profile.get("owner_id") or 0))
    try:
        if getattr(interaction, "message", None):
            await interaction.message.edit(content=content, view=view)
            return
    except Exception:
        pass
    channel_id = profile.get("channel_id")
    message_id = profile.get("message_id")
    if not channel_id or not message_id:
        return
    try:
        channel = bot.get_channel(int(channel_id)) or await bot.fetch_channel(int(channel_id))
        message = await channel.fetch_message(int(message_id))
        await message.edit(content=content, view=view)
    except Exception:
        return


async def _sw_profile_save_interaction(interaction: discord.Interaction, profile: dict, note: str) -> None:
    _sw_profile_put(interaction.guild_id if interaction.guild_id else None, profile)
    await _sw_profile_refresh_message(interaction, profile)
    await interaction.followup.send(note, ephemeral=True)


class SWProfileSectionModal(discord.ui.Modal):
    def __init__(self, profile_id: str, kind: str, section_key: str):
        self.profile_id = str(profile_id)
        self.kind = str(kind)
        self.section_key = str(section_key)
        config = _sw_profile_kind_config(kind)
        self.section = next((section for section in config.get("sections", []) if section.get("key") == section_key), None)
        super().__init__(title=str((self.section or {}).get("label") or "Abschnitt")[:45])
        self.inputs_by_key = {}
        profile = _sw_profile_get(None, profile_id) or {}
        fields = (self.section or {}).get("fields", []) or []
        for field in fields[:5]:
            text_input = discord.ui.TextInput(
                label=str(field.get("label") or field.get("key"))[:45],
                required=bool(field.get("required")),
                style=discord.TextStyle.paragraph if field.get("long") else discord.TextStyle.short,
                max_length=1500 if field.get("long") else 120,
            )
            self.inputs_by_key[str(field.get("key"))] = text_input
            self.add_item(text_input)

    async def on_submit(self, interaction: discord.Interaction):
        guild_id = interaction.guild_id if interaction.guild_id else None
        profile = _sw_profile_get(guild_id, self.profile_id)
        if not profile:
            await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Steckbrief gehoert nicht dir.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        data = profile.setdefault("data", {})
        for key, text_input in self.inputs_by_key.items():
            data[key] = str(text_input.value or "").strip()
        profile["status"] = "in_progress"
        await _sw_profile_save_interaction(interaction, profile, "Abschnitt gespeichert.")


class SWFleetShipModal(discord.ui.Modal):
    name_input = discord.ui.TextInput(label="Schiffsname", required=False, max_length=120)
    class_input = discord.ui.TextInput(label="Klasse", required=True, max_length=120)
    commander_input = discord.ui.TextInput(label="Kommandant", required=False, max_length=120)
    passengers_input = discord.ui.TextInput(label="Passagiere", required=False, max_length=80)
    fighters_input = discord.ui.TextInput(label="Jaeger/Raumfahrzeuge", required=False, max_length=120)

    def __init__(self, profile_id: str):
        super().__init__(title="Schiff hinzufuegen")
        self.profile_id = str(profile_id)

    async def on_submit(self, interaction: discord.Interaction):
        guild_id = interaction.guild_id if interaction.guild_id else None
        profile = _sw_profile_get(guild_id, self.profile_id)
        if not profile:
            await interaction.response.send_message("Flotte nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Diese Flotte gehoert nicht dir.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        ship = {
            "id": _sw_profile_short_id(),
            "name": str(self.name_input.value or "").strip(),
            "ship_class": str(self.class_input.value or "").strip(),
            "commander": str(self.commander_input.value or "").strip(),
            "passengers": str(self.passengers_input.value or "").strip(),
            "fighters": str(self.fighters_input.value or "").strip(),
            "vehicles": "",
            "special": "",
        }
        profile.setdefault("ships", []).append(ship)
        await _sw_profile_save_interaction(interaction, profile, "Schiff gespeichert. Optional kannst du jetzt Details setzen.")


class SWFleetShipDetailModal(discord.ui.Modal):
    index_input = discord.ui.TextInput(label="Schiff Nr. (leer = letztes)", required=False, max_length=8)
    vehicles_input = discord.ui.TextInput(label="Bodenfahrzeuge", required=False, style=discord.TextStyle.paragraph, max_length=800)
    special_input = discord.ui.TextInput(label="Besonderheit", required=False, style=discord.TextStyle.paragraph, max_length=800)

    def __init__(self, profile_id: str):
        super().__init__(title="Schiffdetails")
        self.profile_id = str(profile_id)

    async def on_submit(self, interaction: discord.Interaction):
        guild_id = interaction.guild_id if interaction.guild_id else None
        profile = _sw_profile_get(guild_id, self.profile_id)
        if not profile:
            await interaction.response.send_message("Flotte nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Diese Flotte gehoert nicht dir.", ephemeral=True)
            return
        ships = profile.get("ships", []) or []
        if not ships:
            await interaction.response.send_message("Es gibt noch kein Schiff in dieser Flotte.", ephemeral=True)
            return
        raw_index = str(self.index_input.value or "").strip()
        index = len(ships) - 1
        if raw_index:
            try:
                index = max(0, min(len(ships) - 1, int(raw_index) - 1))
            except Exception:
                index = len(ships) - 1
        await interaction.response.defer(ephemeral=True)
        ships[index]["vehicles"] = str(self.vehicles_input.value or "").strip()
        ships[index]["special"] = str(self.special_input.value or "").strip()
        profile["ships"] = ships
        await _sw_profile_save_interaction(interaction, profile, "Schiffdetails gespeichert.")


class SWProfileWizardView(discord.ui.View):
    def __init__(self, profile_id: str, kind: str, owner_id: int, timeout: float = 1800):
        super().__init__(timeout=timeout)
        self.profile_id = str(profile_id)
        self.kind = str(kind)
        self.owner_id = int(owner_id)
        self._build_buttons()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        profile = _sw_profile_get(interaction.guild_id if interaction.guild_id else None, self.profile_id)
        if not profile or not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Wizard gehoert nicht dir.", ephemeral=True)
            return False
        return True

    def _add_button(self, label: str, style, row: int, callback):
        button = discord.ui.Button(label=label[:80], style=style, row=row)
        button.callback = callback
        self.add_item(button)

    def _build_buttons(self):
        config = _sw_profile_kind_config(self.kind)
        row = 0
        for index, section in enumerate(config.get("sections", []) or []):
            async def section_callback(interaction: discord.Interaction, section_key=section.get("key")):
                await interaction.response.send_modal(SWProfileSectionModal(self.profile_id, self.kind, str(section_key)))
            self._add_button(str(section.get("label") or section.get("key")), discord.ButtonStyle.primary, min(3, row), section_callback)
            if (index + 1) % 4 == 0:
                row += 1
        if self.kind == "fleet":
            async def add_ship(interaction: discord.Interaction):
                await interaction.response.send_modal(SWFleetShipModal(self.profile_id))
            async def ship_details(interaction: discord.Interaction):
                await interaction.response.send_modal(SWFleetShipDetailModal(self.profile_id))
            self._add_button("Schiff hinzufuegen", discord.ButtonStyle.success, 2, add_ship)
            self._add_button("Schiffdetails", discord.ButtonStyle.secondary, 2, ship_details)
        else:
            for collector in config.get("collectors", []) or []:
                async def collector_callback(interaction: discord.Interaction, collector_payload=collector):
                    await _sw_profile_collect_message(interaction, self.profile_id, collector_payload)
                self._add_button(str(collector.get("label") or collector.get("key")), discord.ButtonStyle.secondary, 3, collector_callback)

        async def preview(interaction: discord.Interaction):
            await _sw_profile_show_preview(interaction, self.profile_id)
        async def publish(interaction: discord.Interaction):
            await _sw_profile_publish(interaction, self.profile_id)
        async def cancel(interaction: discord.Interaction):
            await _sw_profile_cancel(interaction, self.profile_id)
        self._add_button("Vorschau", discord.ButtonStyle.secondary, 4, preview)
        self._add_button("Veroeffentlichen", discord.ButtonStyle.success, 4, publish)
        self._add_button("Abbrechen", discord.ButtonStyle.danger, 4, cancel)


async def _sw_profile_collect_message(interaction: discord.Interaction, profile_id: str, collector: dict) -> None:
    guild_id = interaction.guild_id if interaction.guild_id else None
    profile = _sw_profile_get(guild_id, profile_id)
    if not profile:
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    await interaction.response.send_message(str(collector.get("hint") or "Sende jetzt deine Antwort oder `skip`.")[:1900], ephemeral=True)

    def check(message: discord.Message) -> bool:
        return (
            message.author.id == interaction.user.id
            and message.channel.id == interaction.channel_id
            and not message.author.bot
        )

    try:
        message = await bot.wait_for("message", timeout=600, check=check)
    except asyncio.TimeoutError:
        await interaction.followup.send("Timeout. Der Steckbrief ist pausiert und kann spaeter fortgesetzt werden.", ephemeral=True)
        return

    text = str(message.content or "").strip()
    if text.lower() == "skip":
        value = ""
    else:
        attachments = [attachment.url for attachment in message.attachments or []]
        value = "\n".join(part for part in [text, *attachments] if str(part or "").strip())
    profile = _sw_profile_get(guild_id, profile_id) or profile
    profile.setdefault("data", {})[str(collector.get("key"))] = value
    _sw_profile_put(guild_id, profile)
    await _sw_profile_refresh_message(interaction, profile)
    try:
        await message.add_reaction("\u2705")
    except Exception:
        pass
    await interaction.followup.send("Eingabe gespeichert.", ephemeral=True)


async def _sw_profile_show_preview(interaction: discord.Interaction, profile_id: str) -> None:
    profile = _sw_profile_get(interaction.guild_id if interaction.guild_id else None, profile_id)
    if not profile:
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    text = _sw_profile_format(profile)
    await interaction.response.send_message(_sw_profile_truncate(text), ephemeral=True)


async def _sw_profile_publish(interaction: discord.Interaction, profile_id: str) -> None:
    guild_id = interaction.guild_id if interaction.guild_id else None
    profile = _sw_profile_get(guild_id, profile_id)
    if not profile:
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    missing = _sw_profile_required_missing(profile)
    if missing:
        await interaction.response.send_message("Noch offen: " + ", ".join(missing), ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True)
    text = _sw_profile_format(profile)
    messages = []
    for chunk in split_text_chunks(text, chunk_size=1900):
        messages.append(await interaction.channel.send(chunk))
    profile["status"] = "published"
    profile["published_channel_id"] = interaction.channel_id
    first_message = messages[0] if messages else None
    profile["published_message_id"] = getattr(first_message, "id", None)
    _sw_profile_put(guild_id, profile)
    await _sw_profile_refresh_message(interaction, profile)
    await interaction.followup.send("Steckbrief veroeffentlicht.", ephemeral=True)


async def _sw_profile_cancel(interaction: discord.Interaction, profile_id: str) -> None:
    guild_id = interaction.guild_id if interaction.guild_id else None
    profile = _sw_profile_get(guild_id, profile_id)
    if not profile:
        await interaction.response.send_message("Steckbrief nicht gefunden.", ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True)
    profile["status"] = "canceled"
    _sw_profile_put(guild_id, profile)
    await _sw_profile_refresh_message(interaction, profile)
    await interaction.followup.send("Wizard abgebrochen. Die gespeicherten Daten bleiben erhalten.", ephemeral=True)


async def _sw_profile_start_channel(channel, author, guild_id: Optional[int], kind: str):
    profile = _sw_profile_create(guild_id, int(author.id), kind)
    view = SWProfileWizardView(profile_id=profile["id"], kind=kind, owner_id=int(author.id))
    message = await channel.send(_sw_profile_control_text(profile), view=view)
    profile["channel_id"] = message.channel.id
    profile["message_id"] = message.id
    _sw_profile_put(guild_id, profile)
    return profile


async def _sw_profile_send_existing(channel, author, guild_id: Optional[int], profile_id: str):
    profile = _sw_profile_get(guild_id, profile_id)
    if not profile:
        await channel.send("Steckbrief nicht gefunden.")
        return
    if not _sw_profile_user_can_edit(author, profile):
        await channel.send("Dieser Steckbrief gehoert nicht dir.")
        return
    view = SWProfileWizardView(profile_id=str(profile.get("id")), kind=str(profile.get("kind")), owner_id=int(profile.get("owner_id") or 0))
    message = await channel.send(_sw_profile_control_text(profile), view=view)
    profile["channel_id"] = message.channel.id
    profile["message_id"] = message.id
    _sw_profile_put(guild_id, profile)


def _sw_profile_list_for_user(guild_id: Optional[int], user) -> list[dict]:
    store = _sw_profile_load_store(guild_id)
    profiles = list((store.get("profiles", {}) or {}).values())
    if user_has_admin_role(user):
        return sorted(profiles, key=lambda item: str(item.get("updated_at") or ""), reverse=True)
    uid = int(getattr(user, "id", 0) or 0)
    return sorted([p for p in profiles if int(p.get("owner_id") or 0) == uid], key=lambda item: str(item.get("updated_at") or ""), reverse=True)


async def _sw_profile_send_list(channel, user, guild_id: Optional[int], kind: Optional[str] = None):
    rows = _sw_profile_list_for_user(guild_id, user)
    if kind:
        rows = [row for row in rows if row.get("kind") == kind]
    if not rows:
        await channel.send("Keine Steckbriefe gefunden.")
        return
    lines = ["**Gespeicherte Star-Wars-Steckbriefe**"]
    for profile in rows[:25]:
        config = _sw_profile_kind_config(profile.get("kind"))
        lines.append(
            f"- `{profile.get('id')}` | {config.get('singular')} | {profile.get('status')} | {_sw_profile_visible_name(profile)}"
        )
    lines.append("")
    lines.append("Bearbeiten/Fortsetzen: `Eco steckbrief bearbeiten <id>` / `Eco einheit bearbeiten <id>` / `Eco flotte bearbeiten <id>`")
    await send_long_message(channel, "\n".join(lines))


@bot.group(name="steckbrief", invoke_without_command=True)
async def steckbrief_group(ctx: commands.Context):
    await ctx.send("Charakter-Steckbrief: `Eco steckbrief erstellen`, `Eco steckbrief bearbeiten <id>`, `Eco steckbrief liste`")


@steckbrief_group.command(name="erstellen")
async def steckbrief_create(ctx: commands.Context):
    await _sw_profile_start_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "character")


@steckbrief_group.command(name="bearbeiten")
async def steckbrief_edit(ctx: commands.Context, profile_id: str):
    await _sw_profile_send_existing(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id)


@steckbrief_group.command(name="liste")
async def steckbrief_list(ctx: commands.Context):
    await _sw_profile_send_list(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "character")


@bot.group(name="einheit", invoke_without_command=True)
async def einheit_group(ctx: commands.Context):
    await ctx.send("Einheiten-Steckbrief: `Eco einheit erstellen`, `Eco einheit bearbeiten <id>`, `Eco einheit liste`")


@einheit_group.command(name="erstellen")
async def einheit_create(ctx: commands.Context):
    await _sw_profile_start_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "unit")


@einheit_group.command(name="bearbeiten")
async def einheit_edit(ctx: commands.Context, profile_id: str):
    await _sw_profile_send_existing(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id)


@einheit_group.command(name="liste")
async def einheit_list(ctx: commands.Context):
    await _sw_profile_send_list(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "unit")


@bot.group(name="flotte", invoke_without_command=True)
async def flotte_group(ctx: commands.Context):
    await ctx.send("Flotten-Steckbrief: `Eco flotte erstellen`, `Eco flotte bearbeiten <id>`, `Eco flotte liste`")


@flotte_group.command(name="erstellen")
async def flotte_create(ctx: commands.Context):
    await _sw_profile_start_channel(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "fleet")


@flotte_group.command(name="bearbeiten")
async def flotte_edit(ctx: commands.Context, profile_id: str):
    await _sw_profile_send_existing(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, profile_id)


@flotte_group.command(name="liste")
async def flotte_list(ctx: commands.Context):
    await _sw_profile_send_list(ctx.channel, ctx.author, ctx.guild.id if ctx.guild else None, "fleet")


if app_commands is not None:
    slash_steckbrief = app_commands.Group(name="steckbrief", description="Charakter-Steckbriefe")
    slash_einheit = app_commands.Group(name="einheit", description="Einheiten-Steckbriefe")
    slash_flotte = app_commands.Group(name="flotte", description="Flotten-Steckbriefe")

    @slash_steckbrief.command(name="erstellen", description="Neuen Charakter-Steckbrief starten")
    async def slash_steckbrief_create(interaction: discord.Interaction):
        profile = _sw_profile_create(interaction.guild_id if interaction.guild_id else None, int(interaction.user.id), "character")
        view = SWProfileWizardView(profile_id=profile["id"], kind="character", owner_id=int(interaction.user.id))
        await interaction.response.send_message(_sw_profile_control_text(profile), view=view)
        message = await interaction.original_response()
        profile["channel_id"] = message.channel.id
        profile["message_id"] = message.id
        _sw_profile_put(interaction.guild_id if interaction.guild_id else None, profile)

    @slash_steckbrief.command(name="bearbeiten", description="Charakter-Steckbrief fortsetzen")
    async def slash_steckbrief_edit(interaction: discord.Interaction, profile_id: str):
        profile = _sw_profile_get(interaction.guild_id if interaction.guild_id else None, profile_id)
        if not profile or profile.get("kind") != "character":
            await interaction.response.send_message("Charakter-Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Steckbrief gehoert nicht dir.", ephemeral=True)
            return
        view = SWProfileWizardView(profile_id=str(profile.get("id")), kind="character", owner_id=int(profile.get("owner_id") or 0))
        await interaction.response.send_message(_sw_profile_control_text(profile), view=view)

    @slash_steckbrief.command(name="liste", description="Eigene Charakter-Steckbriefe anzeigen")
    async def slash_steckbrief_list(interaction: discord.Interaction):
        rows = [row for row in _sw_profile_list_for_user(interaction.guild_id if interaction.guild_id else None, interaction.user) if row.get("kind") == "character"]
        text = "\n".join([f"`{row.get('id')}` | {row.get('status')} | {_sw_profile_visible_name(row)}" for row in rows[:20]]) or "Keine Steckbriefe gefunden."
        await interaction.response.send_message(_sw_profile_truncate(text), ephemeral=True)

    @slash_einheit.command(name="erstellen", description="Neue Einheit erstellen")
    async def slash_einheit_create(interaction: discord.Interaction):
        profile = _sw_profile_create(interaction.guild_id if interaction.guild_id else None, int(interaction.user.id), "unit")
        view = SWProfileWizardView(profile_id=profile["id"], kind="unit", owner_id=int(interaction.user.id))
        await interaction.response.send_message(_sw_profile_control_text(profile), view=view)
        message = await interaction.original_response()
        profile["channel_id"] = message.channel.id
        profile["message_id"] = message.id
        _sw_profile_put(interaction.guild_id if interaction.guild_id else None, profile)

    @slash_einheit.command(name="bearbeiten", description="Einheiten-Steckbrief fortsetzen")
    async def slash_einheit_edit(interaction: discord.Interaction, profile_id: str):
        profile = _sw_profile_get(interaction.guild_id if interaction.guild_id else None, profile_id)
        if not profile or profile.get("kind") != "unit":
            await interaction.response.send_message("Einheiten-Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Dieser Steckbrief gehoert nicht dir.", ephemeral=True)
            return
        await interaction.response.send_message(_sw_profile_control_text(profile), view=SWProfileWizardView(profile_id=str(profile.get("id")), kind="unit", owner_id=int(profile.get("owner_id") or 0)))

    @slash_einheit.command(name="liste", description="Eigene Einheiten anzeigen")
    async def slash_einheit_list(interaction: discord.Interaction):
        rows = [row for row in _sw_profile_list_for_user(interaction.guild_id if interaction.guild_id else None, interaction.user) if row.get("kind") == "unit"]
        text = "\n".join([f"`{row.get('id')}` | {row.get('status')} | {_sw_profile_visible_name(row)}" for row in rows[:20]]) or "Keine Einheiten gefunden."
        await interaction.response.send_message(_sw_profile_truncate(text), ephemeral=True)

    @slash_flotte.command(name="erstellen", description="Neue Flotte erstellen")
    async def slash_flotte_create(interaction: discord.Interaction):
        profile = _sw_profile_create(interaction.guild_id if interaction.guild_id else None, int(interaction.user.id), "fleet")
        view = SWProfileWizardView(profile_id=profile["id"], kind="fleet", owner_id=int(interaction.user.id))
        await interaction.response.send_message(_sw_profile_control_text(profile), view=view)
        message = await interaction.original_response()
        profile["channel_id"] = message.channel.id
        profile["message_id"] = message.id
        _sw_profile_put(interaction.guild_id if interaction.guild_id else None, profile)

    @slash_flotte.command(name="bearbeiten", description="Flotten-Steckbrief fortsetzen")
    async def slash_flotte_edit(interaction: discord.Interaction, profile_id: str):
        profile = _sw_profile_get(interaction.guild_id if interaction.guild_id else None, profile_id)
        if not profile or profile.get("kind") != "fleet":
            await interaction.response.send_message("Flotten-Steckbrief nicht gefunden.", ephemeral=True)
            return
        if not _sw_profile_user_can_edit(interaction.user, profile):
            await interaction.response.send_message("Diese Flotte gehoert nicht dir.", ephemeral=True)
            return
        await interaction.response.send_message(_sw_profile_control_text(profile), view=SWProfileWizardView(profile_id=str(profile.get("id")), kind="fleet", owner_id=int(profile.get("owner_id") or 0)))

    @slash_flotte.command(name="liste", description="Eigene Flotten anzeigen")
    async def slash_flotte_list(interaction: discord.Interaction):
        rows = [row for row in _sw_profile_list_for_user(interaction.guild_id if interaction.guild_id else None, interaction.user) if row.get("kind") == "fleet"]
        text = "\n".join([f"`{row.get('id')}` | {row.get('status')} | {_sw_profile_visible_name(row)}" for row in rows[:20]]) or "Keine Flotten gefunden."
        await interaction.response.send_message(_sw_profile_truncate(text), ephemeral=True)

    for group in (slash_steckbrief, slash_einheit, slash_flotte):
        try:
            bot.tree.add_command(group)
        except Exception:
            pass

    async def _sw_profile_sync_slash_commands():
        if getattr(bot, "_sw_profiles_slash_synced", False):
            return
        bot._sw_profiles_slash_synced = True
        try:
            target_guild = os.getenv("DISCORD_GUILD_ID") or os.getenv("GUILD_ID")
            if target_guild:
                guild_object = discord.Object(id=int(target_guild))
                bot.tree.copy_global_to(guild=guild_object)
                await bot.tree.sync(guild=guild_object)
            else:
                await bot.tree.sync()
            print("Star-Wars-Steckbrief Slash-Commands synchronisiert.")
        except Exception as exc:
            print(f"Star-Wars-Steckbrief Slash-Sync fehlgeschlagen: {exc}")

    bot.add_listener(_sw_profile_sync_slash_commands, "on_ready")
