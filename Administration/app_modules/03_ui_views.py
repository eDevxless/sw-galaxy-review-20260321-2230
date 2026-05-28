# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
class OwnerOnlyView(discord.ui.View):
    def __init__(self, owner_id: int, timeout: float = 300):
        super().__init__(timeout=timeout)
        self.owner_id = owner_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.owner_id:
            await interaction.response.send_message(
                "Dieses Menue gehoert nicht dir. Starte dein eigenes mit `Eco start`.",
                ephemeral=True,
            )
            return False
        return True


class CreateNpcModal(discord.ui.Modal):
    name_input = discord.ui.TextInput(label="NPC Name", max_length=50)
    prompt_input = discord.ui.TextInput(
        label="NPC Beschreibung/Prompt",
        style=discord.TextStyle.paragraph,
        max_length=1000,
    )
    avatar_input = discord.ui.TextInput(
        label="Avatar URL (optional)",
        required=False,
        max_length=400,
    )

    def __init__(self, npc_type: str):
        super().__init__(title="NPC erstellen")
        self.npc_type = npc_type

    async def on_submit(self, interaction: discord.Interaction):
        if interaction.guild and not guild_setting_supports(interaction.guild.id, "npc_ai"):
            await interaction.response.send_message(
                build_setting_capability_error(interaction.guild.id, "npc_ai", "KI-NPC-Erstellung"),
                ephemeral=True,
            )
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return

        name = self.name_input.value.strip()
        prompt = self.prompt_input.value.strip()
        icon_url = self.avatar_input.value.strip()

        if not name:
            await interaction.response.send_message("Name darf nicht leer sein.", ephemeral=True)
            return
        if name in npc_profiles:
            await interaction.response.send_message(
                f"NPC `{name}` existiert bereits.", ephemeral=True
            )
            return

        npc_profiles[name] = {
            "type": normalize_npc_type(self.npc_type),
            "prompt": prompt,
            "icon_url": icon_url,
        }
        save_npc_profiles()
        await interaction.response.send_message(
            f"NPC `{name}` wurde erstellt (Typ: `{normalize_npc_type(self.npc_type)}`).\n"
            "Hinweis: Fuer Staaten nutze `Eco create_state <Name>`.",
            ephemeral=True,
        )


class DeleteNpcModal(discord.ui.Modal):
    name_input = discord.ui.TextInput(label="NPC Name", max_length=50)

    def __init__(self):
        super().__init__(title="NPC loeschen")

    async def on_submit(self, interaction: discord.Interaction):
        if interaction.guild and not guild_setting_supports(interaction.guild.id, "npc_ai"):
            await interaction.response.send_message(
                build_setting_capability_error(interaction.guild.id, "npc_ai", "KI-NPC-Verwaltung"),
                ephemeral=True,
            )
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return

        name = self.name_input.value.strip()
        if name not in npc_profiles:
            await interaction.response.send_message(
                f"NPC `{name}` existiert nicht.", ephemeral=True
            )
            return

        del npc_profiles[name]
        save_npc_profiles()

        keys_to_remove = [key for key in webhook_cache if key[1] == name]
        for key in keys_to_remove:
            del webhook_cache[key]

        deleted_count = await delete_npc_everywhere(interaction.guild, name)
        await interaction.response.send_message(
            f"NPC `{name}` geloescht. Entfernte Webhooks: {deleted_count}.",
            ephemeral=True,
        )


class EditNpcAvatarModal(discord.ui.Modal):
    name_input = discord.ui.TextInput(label="NPC Name", max_length=50)
    avatar_input = discord.ui.TextInput(label="Neue Avatar URL", max_length=400)

    def __init__(self):
        super().__init__(title="NPC Avatar bearbeiten")

    async def on_submit(self, interaction: discord.Interaction):
        if interaction.guild and not guild_setting_supports(interaction.guild.id, "npc_ai"):
            await interaction.response.send_message(
                build_setting_capability_error(interaction.guild.id, "npc_ai", "KI-NPC-Verwaltung"),
                ephemeral=True,
            )
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return

        name = self.name_input.value.strip()
        if name not in npc_profiles:
            await interaction.response.send_message(
                f"NPC `{name}` existiert nicht.", ephemeral=True
            )
            return

        npc_profiles[name]["icon_url"] = self.avatar_input.value.strip()
        save_npc_profiles()
        await interaction.response.send_message(
            f"Avatar von `{name}` aktualisiert.", ephemeral=True
        )


class EditNpcProfileModal(discord.ui.Modal):
    name_input = discord.ui.TextInput(label="NPC Name", max_length=50)
    prompt_input = discord.ui.TextInput(
        label="Neuer Prompt",
        style=discord.TextStyle.paragraph,
        max_length=1000,
    )

    def __init__(self):
        super().__init__(title="NPC Profil bearbeiten")

    async def on_submit(self, interaction: discord.Interaction):
        if interaction.guild and not guild_setting_supports(interaction.guild.id, "npc_ai"):
            await interaction.response.send_message(
                build_setting_capability_error(interaction.guild.id, "npc_ai", "KI-NPC-Verwaltung"),
                ephemeral=True,
            )
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return

        name = self.name_input.value.strip()
        if name not in npc_profiles:
            await interaction.response.send_message(
                f"NPC `{name}` existiert nicht.", ephemeral=True
            )
            return

        npc_profiles[name]["prompt"] = self.prompt_input.value.strip()
        save_npc_profiles()
        await interaction.response.send_message(
            f"Profil von `{name}` aktualisiert.", ephemeral=True
        )


class SetLoreModal(discord.ui.Modal):
    lore_input = discord.ui.TextInput(
        label="Weltbeschreibung",
        style=discord.TextStyle.paragraph,
        max_length=1500,
    )

    def __init__(self):
        super().__init__(title="Lore setzen")

    async def on_submit(self, interaction: discord.Interaction):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return
        lore_data["description"] = self.lore_input.value.strip()
        save_lore()
        await interaction.response.send_message("Lore aktualisiert.", ephemeral=True)


class AddEventModal(discord.ui.Modal):
    event_input = discord.ui.TextInput(label="Event", style=discord.TextStyle.paragraph, max_length=500)

    def __init__(self):
        super().__init__(title="Event hinzufuegen")

    async def on_submit(self, interaction: discord.Interaction):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return
        lore_data["events"].append(self.event_input.value.strip())
        save_lore()
        await interaction.response.send_message("Event hinzugefuegt.", ephemeral=True)


class AddRuleModal(discord.ui.Modal):
    rule_input = discord.ui.TextInput(label="Regel", style=discord.TextStyle.paragraph, max_length=500)

    def __init__(self):
        super().__init__(title="Regel hinzufuegen")

    async def on_submit(self, interaction: discord.Interaction):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dir fehlt die Rolle `Admin`.", ephemeral=True
            )
            return
        lore_data["rules"].append(self.rule_input.value.strip())
        save_lore()
        await interaction.response.send_message("Regel hinzugefuegt.", ephemeral=True)


class NPCTypeView(OwnerOnlyView):
    @discord.ui.select(
        placeholder="NPC-Typ auswaehlen...",
        min_values=1,
        max_values=1,
        options=[
            discord.SelectOption(label="character", description="Ein einzelner Charakter"),
            discord.SelectOption(label="group", description="Eine Gruppe"),
        ],
    )
    async def select_npc_type(self, interaction: discord.Interaction, select: discord.ui.Select):
        npc_type = normalize_npc_type(select.values[0])
        await interaction.response.send_modal(CreateNpcModal(npc_type=npc_type))


class DeleteNpcView(OwnerOnlyView):
    @discord.ui.button(label="NPC loeschen", style=discord.ButtonStyle.danger)
    async def delete_npc_button(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(DeleteNpcModal())


class EditNpcMenuView(OwnerOnlyView):
    @discord.ui.button(label="Avatar aendern", style=discord.ButtonStyle.primary)
    async def edit_avatar(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(EditNpcAvatarModal())

    @discord.ui.button(label="Profil aendern", style=discord.ButtonStyle.secondary)
    async def edit_profile(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(EditNpcProfileModal())


class LoreMenuView(OwnerOnlyView):
    @discord.ui.button(label="Lore setzen", style=discord.ButtonStyle.primary)
    async def set_lore_button(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(SetLoreModal())

    @discord.ui.button(label="Event hinzufuegen", style=discord.ButtonStyle.secondary)
    async def add_event_button(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(AddEventModal())

    @discord.ui.button(label="Regel hinzufuegen", style=discord.ButtonStyle.secondary)
    async def add_rule_button(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(AddRuleModal())

    @discord.ui.button(label="Lore anzeigen", style=discord.ButtonStyle.success)
    async def view_lore_button(self, interaction: discord.Interaction, _: discord.ui.Button):
        msg = build_lore_overview_text()
        await send_long_interaction_message(interaction, msg, ephemeral=True)


# Dynamische Buttons für Unterkategorien

# **HOME UI KATEGORIE**
# Unterkapitel: Schritt 1/2 Auswahl der Hauptkategorie.
class HomeAreaSelect(discord.ui.Select):
    def __init__(self, owner_id: int, user_is_admin: bool):
        self.owner_id = owner_id
        self.user_is_admin = user_is_admin
        payloads = get_home_area_option_payloads(user_is_admin)
        options = [
            discord.SelectOption(
                label=str(item.get("label", "Bereich"))[:100],
                value=str(item.get("value", "")),
                description=str(item.get("description", ""))[:100],
            )
            for item in payloads
        ]
        if not options:
            options = [
                discord.SelectOption(
                    label="Keine Bereiche",
                    value="none",
                    description="Home-Bereiche sind nicht verfuegbar.",
                )
            ]
        super().__init__(
            placeholder="Schritt 1/2: Hauptbereich waehlen...",
            min_values=1,
            max_values=1,
            options=options[:25],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction):
        area_key = str(self.values[0])
        if area_key == "none":
            await interaction.response.send_message("Keine Home-Bereiche verfuegbar.", ephemeral=True)
            return
        view = HomeTopicView(
            owner_id=self.owner_id,
            user_is_admin=self.user_is_admin,
            area_key=area_key,
        )
        await interaction.response.edit_message(
            content=build_home_area_text(area_key, self.user_is_admin),
            view=view,
        )


# Unterkapitel: Root-Ansicht mit Kurzinfo und Einstieg in den Wizard.
class HomeRootView(OwnerOnlyView):
    def __init__(self, owner_id: int, user_is_admin: bool):
        super().__init__(owner_id=owner_id, timeout=300)
        self.user_is_admin = user_is_admin
        self.add_item(HomeAreaSelect(owner_id=owner_id, user_is_admin=user_is_admin))

    @discord.ui.button(label="Kurzinfo", style=discord.ButtonStyle.secondary, row=1)
    async def quick_info(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_message(
            _discord_safe_text(
                "Eco Home fuehrt dich jetzt in 2 Schritten: Hauptbereich -> Teilbereich. "
                "Viele Economy-Befehle akzeptieren optional `[konto]` "
                "(Name im Schema `Typ-Inhaber`). "
                "Jede Antwort bleibt unter dem Discord-Limit.",
            ),
            ephemeral=True,
        )


# Unterkapitel: Schritt 2/2 Auswahl der Teilbereiche.
class HomeTopicSelect(discord.ui.Select):
    def __init__(self, owner_id: int, user_is_admin: bool, area_key: str):
        self.owner_id = owner_id
        self.user_is_admin = user_is_admin
        self.area_key = str(area_key)
        payloads = get_home_topic_option_payloads(self.area_key, self.user_is_admin)
        options = [
            discord.SelectOption(
                label=str(item.get("label", "Teilbereich"))[:100],
                value=str(item.get("value", "")),
                description=str(item.get("description", ""))[:100],
            )
            for item in payloads
        ]
        if not options:
            options = [
                discord.SelectOption(
                    label="Keine Teilbereiche",
                    value="none",
                    description="Fuer diesen Bereich gibt es aktuell keine Eintraege.",
                )
            ]
        super().__init__(
            placeholder="Schritt 2/2: Teilbereich waehlen...",
            min_values=1,
            max_values=1,
            options=options[:25],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction):
        topic_key = str(self.values[0])
        if topic_key == "none":
            await interaction.response.send_message("Keine Teilbereiche verfuegbar.", ephemeral=True)
            return
        await interaction.response.edit_message(
            content=build_home_topic_text(self.area_key, topic_key, self.user_is_admin),
            view=self.view,
        )


# Unterkapitel: Navigation innerhalb eines Bereichs (Zurueck/Refresh).
class HomeTopicView(OwnerOnlyView):
    def __init__(self, owner_id: int, user_is_admin: bool, area_key: str):
        super().__init__(owner_id=owner_id, timeout=300)
        self.user_is_admin = user_is_admin
        self.area_key = str(area_key)
        self.add_item(
            HomeTopicSelect(
                owner_id=owner_id,
                user_is_admin=user_is_admin,
                area_key=self.area_key,
            )
        )

    @discord.ui.button(label="Zurueck", style=discord.ButtonStyle.secondary, row=1)
    async def back(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.edit_message(
            content=build_home_root_text(self.user_is_admin),
            view=HomeRootView(owner_id=self.owner_id, user_is_admin=self.user_is_admin),
        )

    @discord.ui.button(label="Bereich neu laden", style=discord.ButtonStyle.primary, row=1)
    async def refresh_area(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.edit_message(
            content=build_home_area_text(self.area_key, self.user_is_admin),
            view=self,
        )


# **MAP-VISUALIZER KATEGORIE**
# Unterkapitel: Interaktive Auswahl fuer Weltkarte, Staatskarte und Atlas.
def _get_map_visualizer_state_options() -> list[dict]:
    states = [e for e in economy_data.get("entities", {}).values() if str(e.get("type", "")).lower() == "state"]
    states.sort(key=lambda x: str(x.get("name", "")).lower())
    options = []
    for entity in states[:25]:
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {}) or {}
        terr_count = len(profile.get("territories", []) or [])
        options.append(
            {
                "label": str(entity.get("name", f"State {entity.get('id')}"))[:100],
                "value": str(entity.get("id")),
                "description": f"ID {entity.get('id')} | Territorien: {terr_count}"[:100],
            }
        )
    return options


def build_map_atlas_text() -> str:
    states = [e for e in economy_data.get("entities", {}).values() if str(e.get("type", "")).lower() == "state"]
    states.sort(key=lambda x: str(x.get("name", "")).lower())
    if not states:
        return "Map-Atlas: Keine States vorhanden."

    lines = ["**Map-Atlas**", "Uebersicht aller States im aktuellen Scope:"]
    for entity in states:
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {}) or {}
        state_id = str(entity.get("id"))
        state_name = str(entity.get("name", state_id))
        territories = list(profile.get("territories", []) or [])
        lines.append(f"- #{state_id} {state_name} | Territorien: {len(territories)}")
        if territories:
            lines.append(f"  {', '.join(str(t) for t in territories[:8])}" + (" ..." if len(territories) > 8 else ""))
    lines.append("")
    lines.append("Tipp: `Eco show_map world` oder `Eco show_map <state>`")
    return _discord_safe_text("\n".join(lines), limit=1900)


class MapStateSelect(discord.ui.Select):
    def __init__(self, owner_id: int, guild_id: int):
        self.owner_id = owner_id
        self.guild_id = int(guild_id)
        payloads = _get_map_visualizer_state_options()
        options = [
            discord.SelectOption(
                label=str(item.get("label", "State"))[:100],
                value=str(item.get("value", "")),
                description=str(item.get("description", ""))[:100],
            )
            for item in payloads
        ]
        if not options:
            options = [
                discord.SelectOption(
                    label="Keine States",
                    value="none",
                    description="Erstelle zuerst einen Staat mit `Eco create_state`.",
                )
            ]
        super().__init__(
            placeholder="Staatskarte waehlen...",
            min_values=1,
            max_values=1,
            options=options[:25],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction):
        selected = str(self.values[0])
        if selected == "none":
            await interaction.response.send_message("Keine States verfuegbar.", ephemeral=True)
            return
        if not isinstance(self.view, MapVisualizerView):
            await interaction.response.send_message("Map-View nicht verfuegbar.", ephemeral=True)
            return
        await self.view.send_state_map(interaction, selected)


class MapVisualizerView(OwnerOnlyView):
    def __init__(self, owner_id: int, guild_id: int):
        super().__init__(owner_id=owner_id, timeout=420)
        self.guild_id = int(guild_id)
        self.add_item(MapStateSelect(owner_id=owner_id, guild_id=guild_id))

    async def send_world_map(self, interaction: discord.Interaction):
        payload = economy_data.get("state_maps", {}).get(_world_map_key(self.guild_id))
        if not payload:
            payload = rebuild_world_map_for_guild(self.guild_id)
        if not payload:
            await interaction.response.send_message(
                "Weltkarte nicht verfuegbar. Lege zuerst States mit Territorien an.",
                ephemeral=True,
            )
            return
        await interaction.response.send_message(
            ephemeral=True,
            **_build_map_message_payload(
                f"Weltkarte (States: {payload.get('state_count', 0)})",
                payload["svg"],
                f"world_map_{self.guild_id}.svg",
            ),
        )

    async def send_state_map(self, interaction: discord.Interaction, state_ref: str):
        payload = get_state_map_payload(str(state_ref))
        if not payload:
            state_entity = economy_data.get("entities", {}).get(str(state_ref))
            if state_entity and str(state_entity.get("type", "")).lower() == "state":
                ensure_entity_profile_structure(state_entity)
                territories = state_entity.get("profile", {}).get("territories", []) or []
                if territories:
                    svg = _generate_state_svg_map(str(state_entity.get("name", "")), territories)
                    save_state_map_svg(
                        state_entity_id=str(state_entity.get("id")),
                        state_name=str(state_entity.get("name", "")),
                        territories=territories,
                        svg=svg,
                        guild_id=self.guild_id,
                    )
                    payload = get_state_map_payload(str(state_entity.get("id")))
        if not payload:
            await interaction.response.send_message("Keine Karte fuer diesen Staat gefunden.", ephemeral=True)
            return
        await interaction.response.send_message(
            ephemeral=True,
            **_build_map_message_payload(
                f"Staatskarte: {payload.get('state_name', state_ref)}",
                payload["svg"],
                f"state_map_{payload.get('state_entity_id', 'x')}.svg",
            ),
        )

    @discord.ui.button(label="Weltkarte", style=discord.ButtonStyle.primary, row=1)
    async def world_map(self, interaction: discord.Interaction, _: discord.ui.Button):
        await self.send_world_map(interaction)

    @discord.ui.button(label="Atlas", style=discord.ButtonStyle.secondary, row=1)
    async def atlas(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_message(build_map_atlas_text(), ephemeral=True)

    @discord.ui.button(label="Neu laden", style=discord.ButtonStyle.success, row=1)
    async def reload(self, interaction: discord.Interaction, _: discord.ui.Button):
        refreshed = MapVisualizerView(owner_id=self.owner_id, guild_id=self.guild_id)
        await interaction.response.edit_message(
            content=(
                "**Map-Visualizer**\n"
                "Waehle einen State fuer die Staatskarte oder nutze die Buttons "
                "fuer Weltkarte/Atlas."
            ),
            view=refreshed,
        )


def build_setting_home_text(guild: Optional[discord.Guild]) -> str:
    guild_id = guild.id if guild else None
    setting_id = get_guild_setting_id(guild_id)
    setting_def = get_setting_definition(setting_id)
    actions = get_setting_home_actions(setting_id)
    action_labels = {
        "lore": "Lore",
        "state": "States & Gebiete",
        "turns": "Turn-System",
        "economy": "Wirtschaft",
        "npc": "KI-NPCs",
        "free_ai": "Free AI",
    }
    lines = [
        f"**Server-Setting: {setting_def.get('label', setting_id or '-')}**",
        str(setting_def.get("description", "") or "").strip(),
    ]
    if actions:
        readable_actions = [action_labels.get(action, action) for action in actions]
        lines.append(f"Verfuegbare Bereiche: {', '.join(readable_actions)}")
    if guild is not None:
        lines.append("Admins koennen das Server-Setting ueber das Auswahlfeld unten wechseln.")
    return "\n".join(line for line in lines if line)


async def _ensure_setting_feature_for_interaction(
    interaction: discord.Interaction,
    capability: str,
    feature_label: str,
) -> bool:
    guild = interaction.guild
    if guild is None:
        return True
    if guild_setting_supports(guild.id, capability):
        return True
    await interaction.response.send_message(
        build_setting_capability_error(guild.id, capability, feature_label),
        ephemeral=True,
    )
    return False


class ServerSettingSelect(discord.ui.Select):
    def __init__(self, owner_id: int, guild_id: int):
        self.owner_id = int(owner_id)
        self.guild_id = int(guild_id)
        current_setting_id = get_guild_setting_id(guild_id)
        options = []
        for setting in list_available_settings():
            sid = str(setting.get("id"))
            options.append(
                discord.SelectOption(
                    label=str(setting.get("label", sid)),
                    value=sid,
                    description=str(setting.get("description", ""))[:100],
                    default=sid == current_setting_id,
                )
            )
        super().__init__(
            placeholder="Server-Setting waehlen...",
            min_values=1,
            max_values=1,
            options=options[:25],
            row=4,
        )

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.owner_id:
            await interaction.response.send_message("Dieses Menue gehoert nicht dir.", ephemeral=True)
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Nur Admins koennen das Server-Setting aendern.",
                ephemeral=True,
            )
            return
        selected_setting = str(self.values[0] or "").strip().lower()
        try:
            set_guild_setting_id(self.guild_id, selected_setting)
        except ValueError as err:
            await interaction.response.send_message(str(err), ephemeral=True)
            return
        await interaction.response.edit_message(
            content=build_setting_home_text(interaction.guild),
            view=HomeButtonsView(owner_id=self.owner_id, guild_id=self.guild_id),
        )


async def handle_menu_action(interaction: discord.Interaction, value: str):
    current_setting_id = get_guild_setting_id(interaction.guild.id) if interaction.guild else get_active_setting_id()
    if value == "create_npc":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Erstellung"):
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dafuer brauchst du die Rolle `Admin`.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "Waehle den Typ fuer den neuen NPC:",
            view=NPCTypeView(owner_id=interaction.user.id),
            ephemeral=True,
        )
        return

    if value == "edit_npc":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Verwaltung"):
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dafuer brauchst du die Rolle `Admin`.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "Waehle, was du bearbeiten willst:",
            view=EditNpcMenuView(owner_id=interaction.user.id),
            ephemeral=True,
        )
        return

    if value == "delete_npc":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Verwaltung"):
            return
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dafuer brauchst du die Rolle `Admin`.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "Ich oeffne das Loeschen-Formular:",
            view=DeleteNpcView(owner_id=interaction.user.id),
            ephemeral=True,
        )
        return

    if value == "lore":
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message(
                "Dafuer brauchst du die Rolle `Admin`.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "Lore-Menue:",
            view=LoreMenuView(owner_id=interaction.user.id),
            ephemeral=True,
        )
        return

    if value == "list_npcs":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Liste"):
            return
        await interaction.response.defer(ephemeral=True)
        lines = ["Aktuelle NPCs:"]
        if not npc_profiles:
            await interaction.followup.send("Es sind derzeit keine NPCs definiert.", ephemeral=True)
            return
        for name, data in npc_profiles.items():
            npc_type = data.get("type", "unbekannt")
            icon_url = data.get("icon_url") or "-"
            lines.append(f"- {name} (Typ: {npc_type}) | Avatar: {icon_url}")
        await interaction.followup.send("\n".join(lines), ephemeral=True)
        return

    if value == "talk_npc":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Interaktion"):
            return
        example = next(iter(npc_profiles.keys()), "NPCName")
        await interaction.response.send_message(
            f"Schreibe einfach: `!{example} Deine Nachricht`",
            ephemeral=True,
        )
        return

    if value == "free_ai":
        if not await _ensure_setting_feature_for_interaction(interaction, "free_ai", "Free AI"):
            return
        await interaction.response.send_message(
            render_command_catalog(["freeai"], "Free AI:", setting_id=current_setting_id),
            ephemeral=True,
        )
        return

    if value == "turns":
        if not await _ensure_setting_feature_for_interaction(interaction, "turn_system", "Turn-System"):
            return
        await interaction.response.send_message(
            render_command_catalog(["turn"], "Turn-System:", setting_id=current_setting_id),
            ephemeral=True,
        )
        return

    if value == "economy":
        if not await _ensure_setting_feature_for_interaction(interaction, "economy", "Wirtschaft"):
            return
        await interaction.response.send_message(
            render_command_catalog(
                ["econ_core", "econ_shop", "econ_stocks", "econ_inventory", "econ_states"],
                "Economy:",
                setting_id=current_setting_id,
            ),
            ephemeral=True,
        )
        return

    if value == "shop":
        if not await _ensure_setting_feature_for_interaction(interaction, "economy", "Shop"):
            return
        await interaction.response.send_message(
            render_command_catalog(["econ_shop"], "Shop:", setting_id=current_setting_id),
            ephemeral=True,
        )
        return

    if value == "currency":
        if not await _ensure_setting_feature_for_interaction(interaction, "economy", "Waehrung"):
            return
        await interaction.response.send_message(
            render_command_catalog(["econ_core"], "Waehrung:", setting_id=current_setting_id),
            ephemeral=True,
        )
        return

    if value == "state":
        prefix = ""
        if interaction.guild and not guild_setting_supports(interaction.guild.id, "experimental_territory_autogen"):
            terms = get_setting_world_terms(interaction.guild.id)
            prefix = f"Hinweis: In diesem Setting muessen {terms['territory_plural']} manuell als Liste eingegeben werden.\n\n"
        await interaction.response.send_message(
            prefix + render_command_catalog(["state_maps", "econ_states"], "State:", setting_id=current_setting_id),
            ephemeral=True,
        )
        return

    if value == "npc":
        if not await _ensure_setting_feature_for_interaction(interaction, "npc_ai", "KI-NPC-Bereich"):
            return
        await interaction.response.send_message(
            "NPC-Bereich:\n"
            "- Direkte Interaktion: `!NPCName Nachricht`\n"
            "- Liste: `Eco list_npcs`\n"
            "- Admin: `Eco create_npc`, `Eco edit_npc_profile`, `Eco delete_npc`",
            ephemeral=True,
        )
        return

    await interaction.response.send_message("Unbekannte Auswahl.", ephemeral=True)


class MainMenuView(OwnerOnlyView):
    @discord.ui.select(
        placeholder="Was moechtest du machen?",
        min_values=1,
        max_values=1,
        options=[
            discord.SelectOption(label="NPC erstellen", value="create_npc"),
            discord.SelectOption(label="NPC bearbeiten", value="edit_npc"),
            discord.SelectOption(label="NPC loeschen", value="delete_npc"),
            discord.SelectOption(label="Turn-System", value="turns"),
            discord.SelectOption(label="Economy", value="economy"),
            discord.SelectOption(label="Shop", value="shop"),
            discord.SelectOption(label="Lore verwalten", value="lore"),
            discord.SelectOption(label="Free AI steuern", value="free_ai"),
            discord.SelectOption(label="NPC Liste anzeigen", value="list_npcs"),
            discord.SelectOption(label="Mit NPC sprechen", value="talk_npc"),
        ],
    )
    async def select_action(self, interaction: discord.Interaction, select: discord.ui.Select):
        await handle_menu_action(interaction, select.values[0])


class HomeButtonsView(OwnerOnlyView):
    def __init__(self, owner_id: int, guild_id: Optional[int] = None):
        super().__init__(owner_id=owner_id, timeout=300)
        self.guild_id = int(guild_id) if guild_id else None
        if self.guild_id is not None:
            self.add_item(ServerSettingSelect(owner_id=owner_id, guild_id=self.guild_id))
            actions = set(get_setting_home_actions(get_guild_setting_id(self.guild_id)))
            if "lore" not in actions:
                self.remove_item(self.btn_lore)
            if "state" not in actions:
                self.remove_item(self.btn_state)
            if "turns" not in actions:
                self.remove_item(self.btn_turns)
            if "npc" not in actions:
                self.remove_item(self.btn_npc)
            if "economy" not in actions:
                self.remove_item(self.btn_economy)
            if "free_ai" not in actions:
                self.remove_item(self.btn_free_ai)

    @discord.ui.button(label="Lore", style=discord.ButtonStyle.secondary, row=0)
    async def btn_lore(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "lore")

    @discord.ui.button(label="State", style=discord.ButtonStyle.primary, row=1)
    async def btn_state(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "state")

    @discord.ui.button(label="Turn-System", style=discord.ButtonStyle.primary, row=2)
    async def btn_turns(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "turns")

    @discord.ui.button(label="NPC", style=discord.ButtonStyle.success, row=3)
    async def btn_npc(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "npc")

    @discord.ui.button(label="Wirtschaft", style=discord.ButtonStyle.secondary, row=3)
    async def btn_economy(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "economy")

    @discord.ui.button(label="Free AI", style=discord.ButtonStyle.secondary, row=3)
    async def btn_free_ai(self, interaction: discord.Interaction, _: discord.ui.Button):
        await handle_menu_action(interaction, "free_ai")


async def show_intent_menu(channel, owner_id: int, author):
    guild = getattr(author, "guild", None)
    guild_id = guild.id if guild else None
    if guild_id is not None:
        ensure_guild_setting(guild_id)
    await channel.send(
        build_setting_home_text(guild),
        view=HomeButtonsView(owner_id=owner_id, guild_id=guild_id),
    )


async def route_intent_from_text(channel, author, text: str):
    raw = str(text or "").strip().lower()
    guild = getattr(author, "guild", None)
    guild_id = guild.id if guild else None
    current_setting_id = get_guild_setting_id(guild_id) if guild_id is not None else get_active_setting_id()
    if "lore" in raw:
        await channel.send("Lore-Menue: Nutze `Eco home` und waehle `Lore`.")
        return
    if any(token in raw for token in ("staat", "state", "territor", "planet", "map")):
        prefix = ""
        if guild_id is not None and not guild_setting_supports(guild_id, "experimental_territory_autogen"):
            terms = get_setting_world_terms(guild_id)
            prefix = f"Hinweis: {terms['territory_plural']} werden in diesem Setting manuell gelistet.\n\n"
        await channel.send(prefix + render_command_catalog(["state_maps", "econ_states"], "State:", setting_id=current_setting_id))
        return
    if any(token in raw for token in ("economy", "econ", "markt", "shop", "wirtschaft")):
        if guild_id is not None and not guild_setting_supports(guild_id, "economy"):
            await channel.send(build_setting_capability_error(guild_id, "economy", "Wirtschaft"))
            return
        await channel.send(
            render_command_catalog(
                ["econ_core", "econ_shop", "econ_stocks", "econ_inventory", "econ_states"],
                "Economy:",
                setting_id=current_setting_id,
            )
        )
        return
    if "turn" in raw:
        if guild_id is not None and not guild_setting_supports(guild_id, "turn_system"):
            await channel.send(build_setting_capability_error(guild_id, "turn_system", "Turn-System"))
            return
        await channel.send(render_command_catalog(["turn"], "Turn-System:", setting_id=current_setting_id))
        return
    if "npc" in raw:
        if guild_id is not None and not guild_setting_supports(guild_id, "npc_ai"):
            await channel.send(build_setting_capability_error(guild_id, "npc_ai", "KI-NPCs"))
            return
        await channel.send(
            "NPC-Bereich:\n"
            "- Direkte Interaktion: `!NPCName Nachricht`\n"
            "- Liste: `Eco list_npcs`\n"
            "- Admin: `Eco create_npc`, `Eco edit_npc_profile`, `Eco delete_npc`"
        )
        return
    if "free ai" in raw or "freeai" in raw:
        if guild_id is not None and not guild_setting_supports(guild_id, "free_ai"):
            await channel.send(build_setting_capability_error(guild_id, "free_ai", "Free AI"))
            return
        await channel.send(render_command_catalog(["freeai"], "Free AI:", setting_id=current_setting_id))
        return
    await show_intent_menu(channel, getattr(author, "id", 0), author)


class FreeAIFrequencyView(OwnerOnlyView):
    def __init__(self, owner_id: int, channel_id: int):
        super().__init__(owner_id=owner_id, timeout=180)
        self.channel_id = channel_id

    @discord.ui.select(
        placeholder="FreeAI Frequenz waehlen...",
        min_values=1,
        max_values=1,
        options=[
            discord.SelectOption(label="Sehr schnell", value="very_fast", description="Alle 20 Sekunden"),
            discord.SelectOption(label="Schnell", value="fast", description="Alle 45 Sekunden"),
            discord.SelectOption(label="Normal", value="normal", description="Alle 90 Sekunden"),
            discord.SelectOption(label="Langsam", value="slow", description="Alle 180 Sekunden"),
            discord.SelectOption(
                label="Randomisiert",
                value="randomized",
                description="KI waehlt die naechste Pause dynamisch",
            ),
        ],
    )
    async def select_frequency(self, interaction: discord.Interaction, select: discord.ui.Select):
        mode = select.values[0]
        free_ai_channel_settings[self.channel_id] = mode
        await interaction.response.send_message(
            f"FreeAI Frequenz gesetzt: {get_free_ai_mode_label(mode)}",
            ephemeral=True,
        )


class ExternalAIProviderModal(discord.ui.Modal):
    provider_label_input = discord.ui.TextInput(
        label="Anbietername",
        default="External API",
        max_length=80,
    )
    endpoint_input = discord.ui.TextInput(
        label="Basis-URL oder voller Chat-Endpoint",
        placeholder="https://api.example.com/v1  oder  https://.../chat/completions",
        max_length=300,
    )
    model_input = discord.ui.TextInput(
        label="Modellname",
        placeholder="z. B. gpt-4o-mini / mistral-small / ...",
        max_length=200,
    )
    api_key_input = discord.ui.TextInput(
        label="API-Key",
        style=discord.TextStyle.paragraph,
        required=False,
        max_length=500,
    )

    def __init__(self):
        ext_cfg = get_external_openai_config()
        super().__init__(title="Externe KI konfigurieren")
        self.provider_label_input.default = str(ext_cfg.get("provider_label", "External API") or "External API")
        self.endpoint_input.default = str(ext_cfg.get("endpoint_url", "") or "")
        self.model_input.default = str(ext_cfg.get("model", "") or "")

    async def on_submit(self, interaction: discord.Interaction):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message("Dir fehlen Admin-Rechte.", ephemeral=True)
            return

        provider_label = self.provider_label_input.value.strip()
        endpoint = self.endpoint_input.value.strip()
        model = self.model_input.value.strip()
        api_key = self.api_key_input.value.strip()
        if not endpoint or not model:
            await interaction.response.send_message(
                "Endpoint und Modell duerfen nicht leer sein.",
                ephemeral=True,
            )
            return
        if not api_key and not get_external_openai_api_key():
            await interaction.response.send_message(
                "Bitte beim ersten Einrichten einen API-Key angeben.",
                ephemeral=True,
            )
            return

        configure_external_openai_provider(
            provider_label=provider_label,
            endpoint_url=endpoint,
            model=model,
            api_key=api_key if api_key else None,
        )
        set_llm_provider("external_openai")
        await interaction.response.send_message(
            "Externe API gespeichert und aktiviert.\n"
            + build_ai_provider_status_text(),
            ephemeral=True,
        )


class AIProviderControlView(OwnerOnlyView):
    def __init__(self, owner_id: int):
        super().__init__(owner_id=owner_id, timeout=420)

    def _render_text(self) -> str:
        lines = [
            "**KI-Provider-Regler**",
            build_ai_provider_status_text(),
            "",
            "Buttons:",
            "- `Ollama aktivieren`: lokaler Standard",
            "- `Gemini aktivieren`: falls Key vorhanden",
            "- `Externe API aktivieren`: nutzt deine gespeicherte externe OpenAI-kompatible API",
            "- `Externe API konfigurieren`: Endpoint, Modell und Key setzen",
            "- `Fallback`: nur relevant, wenn Ollama aktiv ist",
        ]
        return "\n".join(lines)

    async def _require_admin(self, interaction: discord.Interaction) -> bool:
        if user_has_admin_role(interaction.user):
            return True
        await interaction.response.send_message("Dir fehlen Admin-Rechte.", ephemeral=True)
        return False

    @discord.ui.button(label="Ollama aktivieren", style=discord.ButtonStyle.success, row=0)
    async def enable_ollama(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not await self._require_admin(interaction):
            return
        if not _check_ollama_available():
            await interaction.response.send_message(
                "Ollama ist aktuell nicht erreichbar.",
                ephemeral=True,
            )
            return
        set_llm_provider("ollama")
        await interaction.response.edit_message(content=self._render_text(), view=self)

    @discord.ui.button(label="Gemini aktivieren", style=discord.ButtonStyle.secondary, row=0)
    async def enable_gemini(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not await self._require_admin(interaction):
            return
        if not GEMINI_API_KEY:
            await interaction.response.send_message(
                "GEMINI_API_KEY fehlt in `Administration/.env`.",
                ephemeral=True,
            )
            return
        set_llm_provider("gemini")
        await interaction.response.edit_message(content=self._render_text(), view=self)

    @discord.ui.button(label="Externe API aktivieren", style=discord.ButtonStyle.primary, row=0)
    async def enable_external(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not await self._require_admin(interaction):
            return
        if not external_openai_is_ready():
            await interaction.response.send_message(
                "Die externe API ist noch nicht fertig konfiguriert.",
                ephemeral=True,
            )
            return
        set_llm_provider("external_openai")
        await interaction.response.edit_message(content=self._render_text(), view=self)

    @discord.ui.button(label="Externe API konfigurieren", style=discord.ButtonStyle.primary, row=1)
    async def configure_external(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not await self._require_admin(interaction):
            return
        await interaction.response.send_modal(ExternalAIProviderModal())

    @discord.ui.button(label="Fallback AN/AUS", style=discord.ButtonStyle.secondary, row=1)
    async def toggle_fallback(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not await self._require_admin(interaction):
            return
        ai_cfg = app_config.setdefault("ai", {})
        ai_cfg["allow_gemini_fallback_when_ollama_unavailable"] = not bool(
            ai_cfg.get("allow_gemini_fallback_when_ollama_unavailable", False)
        )
        save_app_config()
        await interaction.response.edit_message(content=self._render_text(), view=self)

    @discord.ui.button(label="Status aktualisieren", style=discord.ButtonStyle.secondary, row=1)
    async def refresh_status(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.edit_message(content=self._render_text(), view=self)


class ShopMenuView(OwnerOnlyView):
    def __init__(self, owner_id: int, category: Optional[str] = None, page: int = 1):
        super().__init__(owner_id=owner_id, timeout=300)
        self.category = normalize_category(category) if category else None
        self.page = page
        self.total_pages = 1
        self._sync_buttons()

    def _sync_buttons(self):
        self.prev_btn.disabled = self.page <= 1
        self.next_btn.disabled = self.page >= self.total_pages

    def _render(self) -> str:
        text, total = build_shop_page(page=self.page, per_page=8, category=self.category)
        self.total_pages = total
        self.page = max(1, min(self.page, self.total_pages))
        self._sync_buttons()
        return text

    @discord.ui.button(label="Zurueck", style=discord.ButtonStyle.secondary)
    async def prev_btn(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.page = max(1, self.page - 1)
        text = self._render()
        await interaction.response.edit_message(content=text, view=self)

    @discord.ui.button(label="Weiter", style=discord.ButtonStyle.primary)
    async def next_btn(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.page = min(self.total_pages, self.page + 1)
        text = self._render()
        await interaction.response.edit_message(content=text, view=self)


def _resolve_member_from_ref(guild: Optional[discord.Guild], raw_ref: str) -> Optional[discord.Member]:
    if guild is None:
        return None
    text = str(raw_ref or "").strip()
    if not text:
        return None
    m = re.search(r"<@!?(\d+)>", text)
    if m:
        mid = int(m.group(1))
        return guild.get_member(mid)
    if text.isdigit():
        return guild.get_member(int(text))
    low = text.lower()
    for member in guild.members:
        if member.bot:
            continue
        if member.display_name.lower() == low or member.name.lower() == low:
            return member
    return None


def _counterparty_type_label(counterparty_type: str) -> str:
    c = str(counterparty_type or "").lower()
    return {"person": "Privatperson", "company": "Unternehmen", "state": "Staat"}.get(c, c)


class ContractClauseModal(discord.ui.Modal):
    description_input = discord.ui.TextInput(
        label="Klauselbeschreibung",
        style=discord.TextStyle.paragraph,
        max_length=300,
        required=True,
    )
    value_a_input = discord.ui.TextInput(
        label="Wert A (optional, z. B. Produkt-ID oder Betrag)",
        required=False,
        max_length=100,
    )
    value_b_input = discord.ui.TextInput(
        label="Wert B (optional, z. B. Menge/Rate)",
        required=False,
        max_length=100,
    )

    def __init__(self, wizard_view: "ContractWizardView", side: str, clause_type: str):
        title = "Angebot-Klausel" if side == "offer" else "Forderung-Klausel"
        super().__init__(title=title)
        self.wizard_view = wizard_view
        self.side = side
        self.clause_type = clause_type

    async def on_submit(self, interaction: discord.Interaction):
        actor_entity = get_entity(self.wizard_view.creator_entity_id)
        ok, reason = evaluate_contract_clause_policy(
            actor_entity,
            self.clause_type,
            self.wizard_view.counterparty_type,
        )
        if not ok:
            await interaction.response.send_message(reason, ephemeral=True)
            return
        self.wizard_view.clauses.append(
            {
                "side": self.side,
                "type": self.clause_type,
                "description": str(self.description_input.value).strip(),
                "value_a": str(self.value_a_input.value).strip(),
                "value_b": str(self.value_b_input.value).strip(),
            }
        )
        await interaction.response.send_message(
            f"Klausel hinzugefuegt: {CONTRACT_CLAUSE_CATALOG.get(self.clause_type, self.clause_type)}",
            ephemeral=True,
        )


class ContractClauseSelect(discord.ui.Select):
    def __init__(self, wizard_view: "ContractWizardView", side: str):
        self.wizard_view = wizard_view
        self.side = side
        options = []
        for ctype in wizard_view.allowed_clause_types:
            options.append(
                discord.SelectOption(
                    label=CONTRACT_CLAUSE_CATALOG.get(ctype, ctype),
                    value=ctype,
                    description=f"{'Angebot' if side == 'offer' else 'Forderung'}",
                )
            )
        placeholder = "Angebot waehlen..." if side == "offer" else "Forderung waehlen..."
        super().__init__(placeholder=placeholder, min_values=1, max_values=1, options=options[:25], row=0 if side == "offer" else 1)

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.wizard_view.owner_id:
            await interaction.response.send_message("Dieses Vertragsmenue gehoert nicht dir.", ephemeral=True)
            return
        clause_type = str(self.values[0])
        actor_entity = get_entity(self.wizard_view.creator_entity_id)
        ok, reason = evaluate_contract_clause_policy(actor_entity, clause_type, self.wizard_view.counterparty_type)
        if not ok:
            await interaction.response.send_message(reason, ephemeral=True)
            return
        await interaction.response.send_modal(ContractClauseModal(self.wizard_view, self.side, clause_type))


class ContractProposalResponseView(discord.ui.View):
    def __init__(self, proposal_id: str, target_user_id: int):
        super().__init__(timeout=86400)
        self.proposal_id = proposal_id
        self.target_user_id = int(target_user_id)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.target_user_id:
            await interaction.response.send_message("Nur die markierte Gegenpartei kann entscheiden.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Ja, annehmen", style=discord.ButtonStyle.success)
    async def accept(self, interaction: discord.Interaction, _: discord.ui.Button):
        proposal = contract_proposals.get(self.proposal_id)
        if not proposal:
            await interaction.response.send_message("Vorschlag nicht mehr verfuegbar.", ephemeral=True)
            return
        seller_entity_id = str(proposal["creator_entity_id"])
        buyer_entity_id, _ = get_or_create_player_entity(int(proposal["target_user_id"]), interaction.user.display_name)
        clauses = list(proposal.get("clauses", []))
        product_id, unit_price, qty = ensure_contract_wizard_product(
            seller_entity_id=seller_entity_id,
            counterparty_type=str(proposal.get("counterparty_type", "person")),
            clauses=clauses,
        )
        total = round(float(unit_price) * int(qty), 2)
        allowed, reason = validate_contract_policy(
            seller_entity_id,
            buyer_entity_id,
            product_id,
            offered_total=total,
            quantity=qty,
        )
        if not allowed:
            await interaction.response.send_message(f"Vertrag kann laut Law/Policy nicht aktiviert werden: {reason}", ephemeral=True)
            return
        terms = str(proposal.get("summary", "Vertrags-Wizard"))
        meta = {
            "wizard": True,
            "counterparty_type": proposal.get("counterparty_type"),
            "clauses": clauses,
            "created_by_user_id": int(proposal.get("creator_user_id")),
            "accepted_by_user_id": int(proposal.get("target_user_id")),
        }
        cid = create_contract(
            seller_entity_id=seller_entity_id,
            buyer_entity_id=buyer_entity_id,
            product_id=product_id,
            unit_price=float(unit_price),
            quantity=int(qty),
            terms=terms[:500],
            meta=meta,
        )
        sign_contract(cid, buyer_entity_id)
        contract_proposals.pop(self.proposal_id, None)
        save_contract_proposals()
        self.accept.disabled = True
        self.reject.disabled = True
        await interaction.response.edit_message(
            content=f"Vertrag angenommen und erstellt: #{cid}\n{terms}",
            view=self,
        )

    @discord.ui.button(label="Nein, ablehnen", style=discord.ButtonStyle.danger)
    async def reject(self, interaction: discord.Interaction, _: discord.ui.Button):
        proposal = contract_proposals.pop(self.proposal_id, None)
        save_contract_proposals()
        self.accept.disabled = True
        self.reject.disabled = True
        await interaction.response.edit_message(
            content=f"Vertrag abgelehnt.\n{proposal.get('summary', '') if proposal else ''}",
            view=self,
        )


class ContractCounterpartyModal(discord.ui.Modal):
    counterparty_input = discord.ui.TextInput(
        label="Gegenpartei (@user, ID oder Name)",
        max_length=120,
    )

    def __init__(self, wizard_view: "ContractWizardView"):
        super().__init__(title="Gegenpartei setzen")
        self.wizard_view = wizard_view

    async def on_submit(self, interaction: discord.Interaction):
        guild = interaction.guild
        target = _resolve_member_from_ref(guild, str(self.counterparty_input.value))
        if not target:
            await interaction.response.send_message("Gegenpartei nicht gefunden.", ephemeral=True)
            return
        if target.bot:
            await interaction.response.send_message("Bots sind keine gueltige Gegenpartei.", ephemeral=True)
            return
        if target.id == self.wizard_view.owner_id:
            await interaction.response.send_message("Du kannst keinen Vertrag mit dir selbst abschliessen.", ephemeral=True)
            return
        if not self.wizard_view.clauses:
            await interaction.response.send_message("Bitte zuerst mindestens eine Klausel hinzufuegen.", ephemeral=True)
            return

        summary = self.wizard_view.render_summary(target)
        proposal_id = f"proposal_{int(time.time()*1000)}_{random.randint(1000, 9999)}"
        contract_proposals[proposal_id] = {
            "proposal_id": proposal_id,
            "creator_user_id": int(self.wizard_view.owner_id),
            "creator_entity_id": str(self.wizard_view.creator_entity_id),
            "counterparty_type": self.wizard_view.counterparty_type,
            "target_user_id": int(target.id),
            "clauses": list(self.wizard_view.clauses),
            "summary": summary,
            "created_turn": int(turn_state.get("turn_index", 1)),
        }
        save_contract_proposals()
        view = ContractProposalResponseView(proposal_id=proposal_id, target_user_id=target.id)
        await interaction.response.send_message(
            f"Vertragsentwurf vorbereitet und an {target.mention} gesendet.",
            ephemeral=True,
        )
        await interaction.channel.send(
            f"{target.mention} bitte Vertrag pruefen:\n{summary}",
            view=view,
        )


class ContractWizardView(OwnerOnlyView):
    def __init__(self, owner_id: int, creator_entity_id: str, counterparty_type: str):
        super().__init__(owner_id=owner_id, timeout=900)
        self.creator_entity_id = str(creator_entity_id)
        self.counterparty_type = str(counterparty_type).lower()
        self.allowed_clause_types = get_contract_allowed_clause_types(self.counterparty_type)
        self.clauses: list[dict] = []
        self.add_item(ContractClauseSelect(self, "offer"))
        self.add_item(ContractClauseSelect(self, "demand"))

    def render_text(self) -> str:
        lines = [
            "**Contract-Wizard**",
            f"- Gegenpartei-Typ: {_counterparty_type_label(self.counterparty_type)}",
            "- Angebots-/Forderungs-Klauseln per Dropdown hinzufügen.",
            "- Hinweis: Eigenes Inventarsystem gibt es derzeit nicht; Besitz laeuft ueber Produkte/Portfolio.",
            "",
            "Erlaubte Klauseln fuer diesen Typ:",
            ", ".join(CONTRACT_CLAUSE_CATALOG.get(x, x) for x in self.allowed_clause_types),
            "",
            "Aktueller Entwurf:",
            build_contract_clause_text(self.clauses),
        ]
        return "\n".join(lines)

    def render_summary(self, target: discord.Member) -> str:
        return (
            f"**Vertragsentwurf von <@{self.owner_id}> an {target.mention}**\n"
            f"- Gegenpartei-Typ: {_counterparty_type_label(self.counterparty_type)}\n"
            f"- Klauseln:\n{build_contract_clause_text(self.clauses)}\n"
            "Entscheidung: Ja/Nein"
        )

    @discord.ui.button(label="Zusammenfassung", style=discord.ButtonStyle.secondary, row=2)
    async def summary(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.edit_message(content=self.render_text(), view=self)

    @discord.ui.button(label="Klauseln zuruecksetzen", style=discord.ButtonStyle.secondary, row=2)
    async def reset_clauses(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.clauses = []
        await interaction.response.edit_message(content=self.render_text(), view=self)

    @discord.ui.button(label="Gegenpartei setzen & senden", style=discord.ButtonStyle.success, row=2)
    async def set_counterparty(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(ContractCounterpartyModal(self))


class ContractCounterpartyTypeSelect(discord.ui.Select):
    def __init__(self, owner_id: int):
        options = [
            discord.SelectOption(label="Privatperson", value="person", description="Privater Akteur"),
            discord.SelectOption(label="Unternehmen", value="company", description="Firma/Konzern"),
            discord.SelectOption(label="Staat", value="state", description="Regierungsakteur"),
        ]
        super().__init__(placeholder="Berufung der Gegenpartei...", min_values=1, max_values=1, options=options)
        self.owner_id = owner_id

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.owner_id:
            await interaction.response.send_message("Dieses Vertragsmenue gehoert nicht dir.", ephemeral=True)
            return
        creator_entity_id, _ = get_or_create_player_entity(interaction.user.id, interaction.user.display_name)
        view = ContractWizardView(owner_id=self.owner_id, creator_entity_id=creator_entity_id, counterparty_type=str(self.values[0]))
        await interaction.response.edit_message(content=view.render_text(), view=view)


class ContractCounterpartyTypeView(OwnerOnlyView):
    def __init__(self, owner_id: int):
        super().__init__(owner_id=owner_id, timeout=600)
        self.add_item(ContractCounterpartyTypeSelect(owner_id=owner_id))


