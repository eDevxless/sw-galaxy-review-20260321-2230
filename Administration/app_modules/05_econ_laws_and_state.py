# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **ECONOMY CORE KATEGORIE**
# Unterkapitel: Hauptgruppe, Setup und Rollenverwaltung.
@bot.group(name="econ", invoke_without_command=True)
async def econ_group(ctx: commands.Context):
    await ctx.send(
        render_command_catalog(
            ["econ_core", "econ_stocks", "econ_shop", "econ_inventory", "econ_contracts", "econ_states", "econ_profiles", "econ_laws"],
            "Economy Befehle:",
        )
    )


@econ_group.command(name="setup")
@commands.has_role("Admin")
async def econ_setup(ctx: commands.Context):
    ensure_entity_and_account("Zentralbank", "bank", 500000.0)
    ensure_entity_and_account("Staat", "state", 800000.0)
    if not economy_data.get("stocks"):
        state_entity = find_entity_by_name("Staat")
        if state_entity:
            create_stock("ECO", str(state_entity["id"]), 10.0, 1000000)
            create_stock("IND", str(state_entity["id"]), 22.0, 600000)
    ensure_npc_economy_entities()
    record_stock_snapshot(int(turn_state.get("turn_index", 1)))
    save_economy()
    await ctx.send("Wirtschaftssystem initialisiert.")


@econ_group.group(name="roles", invoke_without_command=True)
@commands.has_role("Admin")
async def econ_roles(ctx: commands.Context):
    settings = economy_data.get("settings", {})
    await ctx.send(
        "Nutze:\n"
        "- `Eco econ roles entrepreneur @rolle`\n"
        "- `Eco econ roles employer @rolle`\n"
        "- `Eco econ roles state_chief @rolle`\n"
        "- `Eco econ roles judiciary @rolle`\n"
        f"Aktuell entrepreneur_role_id={settings.get('entrepreneur_role_id')} "
        f"employer_role_id={settings.get('employer_role_id')} "
        f"state_chief_role_id={settings.get('state_chief_role_id')} "
        f"judiciary_role_id={settings.get('judiciary_role_id')}"
    )


@econ_roles.command(name="entrepreneur")
@commands.has_role("Admin")
async def econ_roles_entrepreneur(ctx: commands.Context, role: discord.Role):
    economy_data["settings"]["entrepreneur_role_id"] = role.id
    save_economy()
    await ctx.send(f"Entrepreneur-Rolle gesetzt: {role.mention}")


@econ_roles.command(name="employer")
@commands.has_role("Admin")
async def econ_roles_employer(ctx: commands.Context, role: discord.Role):
    economy_data["settings"]["employer_role_id"] = role.id
    save_economy()
    await ctx.send(f"Employer-Rolle gesetzt: {role.mention}")


@econ_roles.command(name="state_chief")
@commands.has_role("Admin")
async def econ_roles_state_chief(ctx: commands.Context, role: discord.Role):
    economy_data["settings"]["state_chief_role_id"] = role.id
    save_economy()
    await ctx.send(f"State-Chief-Rolle gesetzt: {role.mention}")


@econ_roles.command(name="judiciary")
@commands.has_role("Admin")
async def econ_roles_judiciary(ctx: commands.Context, role: discord.Role):
    economy_data["settings"]["judiciary_role_id"] = role.id
    save_economy()
    await ctx.send(f"Judikative-Rolle gesetzt: {role.mention}")


# **STATE-VERWALTUNG KATEGORIE**
# Unterkapitel: States pflegen und gegen Lore abgleichen.
@econ_group.group(name="states", invoke_without_command=True)
@commands.has_role("Admin")
async def econ_states(ctx: commands.Context):
    states = get_defined_states()
    await ctx.send(
        "States verwalten:\n"
        "- `Eco edit_state <id|name>`\n"
        "- `Eco delete_state <id|name>`\n"
        "- `Eco econ states add <name>`\n"
        "- `Eco econ states remove <name>`\n"
        "- `Eco econ states list`\n"
        "- `Eco econ states check_lore`\n"
        f"Aktuell: {', '.join(states) if states else '(keine)'}"
    )


@econ_states.command(name="add")
@commands.has_role("Admin")
async def econ_states_add(ctx: commands.Context, *, name: str):
    state = name.strip()
    if not state:
        await ctx.send("State-Name darf nicht leer sein.")
        return
    states = economy_data["settings"].setdefault("states", [])
    if state not in states:
        states.append(state)
        save_economy()
    await ctx.send(f"State hinzugefuegt: {state}")


@econ_states.command(name="remove")
@commands.has_role("Admin")
async def econ_states_remove(ctx: commands.Context, *, name: str):
    states = economy_data["settings"].setdefault("states", [])
    if name in states:
        states.remove(name)
        save_economy()
        await ctx.send(f"State entfernt: {name}")
        return
    await ctx.send("State nicht gefunden.")


@econ_states.command(name="list")
@commands.has_role("Admin")
async def econ_states_list(ctx: commands.Context):
    states = get_defined_states()
    await ctx.send("States:\n" + ("\n".join(f"- {s}" for s in states) if states else "- (keine)"))


@econ_states.command(name="check_lore")
@commands.has_role("Admin")
async def econ_states_check_lore(ctx: commands.Context):
    missing = find_missing_states_in_lore()
    if not missing:
        await ctx.send("Lore-Check OK: Alle definierten Staaten sind in der Lore erwaehnt.")
        return
    await ctx.send("Lore-Check FEHLT:\n" + "\n".join(f"- {s}" for s in missing))


def _resolve_state_entity_from_ref(state_ref: str) -> Optional[dict]:
    raw = str(state_ref or "").strip()
    if not raw:
        return None
    by_id = economy_data.get("entities", {}).get(raw)
    if by_id and str(by_id.get("type", "")).lower() == "state":
        return by_id
    by_name = find_state_entity_by_name(raw)
    if by_name and str(by_name.get("type", "")).lower() == "state":
        return by_name
    return None


def _norm_law_actor(value: str) -> Optional[str]:
    v = str(value or "").strip().lower()
    if v in {"person", "personen", "private"}:
        return "person"
    if v in {"company", "unternehmen", "firma", "firmen"}:
        return "company"
    return None


def _law_target_key(actor: str, scope: str, mode: str) -> Optional[str]:
    if scope == "category":
        return f"{actor}_{mode}_categories"
    if scope == "keyword":
        return f"{actor}_{mode}_keywords"
    if scope == "action":
        return f"{actor}_{mode}_actions"
    return None


def _deep_merge_dict(base: dict, patch: dict) -> dict:
    for k, v in (patch or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _deep_merge_dict(base[k], v)
        else:
            base[k] = json.loads(json.dumps(v))
    return base


def get_law_preset_catalog() -> dict:
    return {
        "liberal_market": {
            "description": "Wenig Restriktionen, hoehere Vertrags- und Aktienfreiheit fuer Unternehmen.",
            "laws": {
                "permissions": {
                    "company_allow_actions": ["contract_buy", "contract_sell", "stock_buy", "stock_sell"],
                    "person_allow_actions": ["contract_buy", "stock_buy", "stock_sell"],
                },
                "limits": {
                    "contracts": {
                        "max_total_by_actor_category": {
                            "company": {"military": 2000000, "heavy_industry": 3000000},
                            "person": {"military": 150000},
                        }
                    },
                    "stocks": {
                        "max_holding_pct_by_actor": {"company": 30.0, "person": 8.0},
                    },
                },
            },
        },
        "social_state": {
            "description": "Sozialstaatlich: moderate Kontrolle, spuerbare Steuerentlastung fuer Personen.",
            "laws": {
                "modifiers": {
                    "tax": {
                        "flat_discount_pct_by_actor": {"person": 1.5, "company": 0.5},
                        "min_tax_pct_by_actor": {"person": 0.0, "company": 0.0},
                    }
                },
                "limits": {
                    "stocks": {
                        "max_holding_pct_by_actor": {"company": 15.0, "person": 6.0},
                    }
                },
            },
        },
        "defense_state": {
            "description": "Sicherheitsorientiert: Military streng limitiert, teils nur staatliche Kanaele.",
            "laws": {
                "permissions": {
                    "person_deny_categories": ["military"],
                    "company_allow_categories": ["military"],
                    "company_allow_actions": ["contract_buy", "contract_sell"],
                },
                "limits": {
                    "contracts": {
                        "max_total_by_actor_category": {
                            "company": {"military": 500000},
                            "person": {"military": 0},
                        }
                    }
                },
            },
        },
        "green_transition": {
            "description": "Foerdert nachhaltige/oeffentliche Produktion ueber Steueranreize.",
            "laws": {
                "modifiers": {
                    "tax": {
                        "producer_discount_pct_by_category": {
                            "energy_utilities": 2.0,
                            "public_state_offers": 2.5,
                            "mobility_transport": 1.0,
                        }
                    },
                    "subsidies": {
                        "direct_per_turn_by_category": {
                            "energy_utilities": 120.0,
                            "public_state_offers": 160.0,
                        }
                    },
                }
            },
        },
        "startup_hub": {
            "description": "Gruenderfreundlich: starke Entlastung fuer staatliche Zulieferer-Unternehmen.",
            "laws": {
                "permissions": {
                    "company_allow_actions": ["stock_buy", "stock_sell", "contract_buy", "contract_sell"],
                },
                "modifiers": {
                    "tax": {
                        "flat_discount_pct_by_actor": {"company": 2.0},
                        "producer_discount_pct_for_state_supply_by_actor": {"company": 2.0},
                    }
                },
                "limits": {
                    "stocks": {
                        "max_holding_pct_by_actor": {"company": 20.0},
                    }
                },
            },
        },
        "strict_compliance": {
            "description": "Hohe Kontrolle: Whitelists aktiv, enge Verhandlungslimits, konservative Aktiengrenzen.",
            "laws": {
                "permissions": {
                    "person_whitelist_mode": True,
                    "company_whitelist_mode": True,
                    "person_action_whitelist_mode": True,
                    "company_action_whitelist_mode": True,
                    "person_allow_actions": ["stock_sell"],
                    "company_allow_actions": ["contract_buy", "contract_sell", "stock_buy", "stock_sell"],
                    "company_allow_categories": ["public_state_offers", "raw_resources", "consumer_goods"],
                    "person_allow_categories": ["consumer_goods", "food_and_beverages"],
                },
                "limits": {
                    "contracts": {
                        "max_total_by_actor_category": {
                            "company": {"military": 100000, "heavy_industry": 350000},
                            "person": {"consumer_goods": 50000},
                        }
                    },
                    "stocks": {
                        "max_holding_pct_by_actor": {"company": 8.0, "person": 3.0},
                        "max_holding_units_by_actor": {"company": 25000, "person": 5000},
                    },
                },
            },
        },
    }


def apply_law_preset_to_state(state_entity: dict, preset_name: str, mode: str = "merge") -> tuple[bool, str]:
    catalog = get_law_preset_catalog()
    key = str(preset_name or "").strip().lower()
    preset = catalog.get(key)
    if not preset:
        return False, "Preset nicht gefunden."
    ensure_state_law_engine(state_entity)
    profile = state_entity.get("profile", {})
    laws = profile.setdefault("laws", {})
    if str(mode or "").strip().lower() == "replace":
        laws.clear()
        laws.update(default_state_law_engine())
    _deep_merge_dict(laws, preset.get("laws", {}))
    ensure_state_law_engine(state_entity)
    return True, ""


LAW_AREA_PRESET_MAP = {
    "market": "liberal_market",
    "social": "social_state",
    "defense": "defense_state",
    "corporation": "startup_hub",
    "startup": "startup_hub",
}

LAW_CATEGORY_AREAS = {
    "market": ["market", "corporation"],
    "government": ["social", "defense"],
}


def get_law_area_info(area_key: str) -> dict:
    area = str(area_key or "").strip().lower()
    if area == "startup":
        area = "corporation"
    data = {
        "market": {
            "title": "Market",
            "desc": "Freier Markt, hohe Vertragsfreiheit, mehr Handelsdynamik.",
        },
        "social": {
            "title": "Social",
            "desc": "Sozialstaatlich, steuerliche Entlastung und Stabilitaet fuer Personen.",
        },
        "defense": {
            "title": "Defense",
            "desc": "Sicherheitsorientiert, kontrollierte Military- und Hochrisiko-Transaktionen.",
        },
        "corporation": {
            "title": "Corporation",
            "desc": "Unternehmensfreundlich, steuerliche Anreize und mehr Wachstumsspielraum.",
        },
    }
    return data.get(area, data["market"])


def get_law_category_info(category_key: str) -> dict:
    key = str(category_key or "").strip().lower()
    data = {
        "market": {
            "title": "Market",
            "desc": "Wirtschaftsnahe Gesetze fuer Handel, Unternehmen und Investitionen.",
        },
        "government": {
            "title": "Government",
            "desc": "Staatsnahe Gesetze fuer Gesellschaft, Sicherheit und Kontrolle.",
        },
    }
    return data.get(key, data["market"])


def get_law_category_for_area(area_key: str) -> str:
    area = str(area_key or "").strip().lower()
    if area == "startup":
        area = "corporation"
    for cat, areas in LAW_CATEGORY_AREAS.items():
        if area in areas:
            return cat
    return "market"


def get_law_module_info(module_key: str) -> dict:
    mod = str(module_key or "").strip().lower()
    data = {
        "permissions": {
            "title": "Permissions",
            "desc": "Legt fest, was Akteure tun duerfen: Produktkategorien, Keywords und globale Aktionen.",
            "examples": [
                "permissions.company_allow_actions",
                "permissions.person_deny_categories",
            ],
        },
        "limits": {
            "title": "Limits",
            "desc": "Setzt harte Obergrenzen: Vertragswerte, Aktienanteile, Max-Bestaende.",
            "examples": [
                "limits.contracts.max_total_by_actor_category.company.military",
                "limits.contracts.min_total_by_category.services",
                "limits.stocks.max_holding_pct_by_actor.company",
                "limits.stocks.max_new_buys_per_turn_by_actor.company",
            ],
        },
        "modifiers": {
            "title": "Modifiers",
            "desc": "Modifiziert Berechnungen: Steuer-Rabatte, Subventionen, Foerderlogik, Min-/Max-Korridore.",
            "examples": [
                "modifiers.tax.flat_discount_pct_by_actor.company",
                "modifiers.tax.producer_discount_pct_by_category.public_state_offers",
                "modifiers.subsidies.direct_per_turn_by_category.energy_utilities",
                "modifiers.subsidies.max_total_per_state_turn",
            ],
        },
        "addons": {
            "title": "Addons",
            "desc": "Freie Zusatz-Felder fuer Hausregeln und spaetere System-Hooks.",
            "examples": [
                "addons.state_priority_sector",
                "addons.crisis_mode",
            ],
        },
    }
    return data.get(mod, data["permissions"])


def _build_law_wizard_text(state_entity: dict, area_key: str, module_key: str) -> str:
    ensure_state_law_engine(state_entity)
    category_key = get_law_category_for_area(area_key)
    category = get_law_category_info(category_key)
    area = get_law_area_info(area_key)
    module = get_law_module_info(module_key)
    preset = LAW_AREA_PRESET_MAP.get(area_key, "liberal_market")
    state_id = str(state_entity.get("id"))
    lines = ["**JUDIKATIVE LAW-WIZARD** 🏛️"]
    lines.append(f"**Schritt 1:** Staat wählen\n→ `{state_entity.get('name')}` (ID: {state_id})")
    lines.append(f"**Schritt 2:** Kategorie wählen\n→ {category['title']} — {category['desc']}")
    lines.append(f"**Schritt 3:** Bereich wählen\n→ {area['title']} — {area['desc']} (Preset: `{preset}`)")
    lines.append(f"**Schritt 4:** Modul wählen\n→ {module['title']} — {module['desc']}")
    lines.append("")
    lines.append("**Was bewirkt dieses Modul?**")
    lines.append(f"{module['desc']}")
    lines.append("")
    lines.append("**Direkte Baukasten-Beispiele:**")
    for path in module["examples"]:
        lines.append(f"- `Eco econ laws get {state_id} | {path}`")
    if module_key == "permissions":
        lines.append(f"- `Eco econ laws add {state_id} | permissions.company_allow_actions | stock_buy` (Erlaubt Unternehmen die Aktion 'stock_buy')")
    elif module_key == "limits":
        lines.append(f"- `Eco econ laws set {state_id} | limits.stocks.max_holding_pct_by_actor.company | 12.5` (Setzt Aktienlimit für Unternehmen)")
    elif module_key == "modifiers":
        lines.append(f"- `Eco econ laws set {state_id} | modifiers.tax.flat_discount_pct_by_actor.company | 1.5` (Steuerrabatt für Unternehmen)")
    else:
        lines.append(f"- `Eco econ laws set {state_id} | addons.crisis_mode | true` (Aktiviert Krisenmodus)")
    lines.append("")
    lines.append("**Wizard-Nutzung:**\n1. Wähle Bereich und Modul über die Buttons.\n2. Wende ein Preset an oder passe einzelne Werte an.\n3. Alle Änderungen sind sofort wirksam und werden im Law-Log dokumentiert.")
    lines.append("")
    lines.append("**Tipp:** Nutze die Schema-Hilfe für empfohlene Law-Pfade und Beispiele.")
    return "\n".join(lines)


# **LAW-WIZARD KATEGORIE**
# Unterkapitel: Interaktive State-/Bereichs-/Modulauswahl fuer den Law-Builder.
class LawStateSelect(discord.ui.Select):
    def __init__(self, owner_id: int, state_options: list[dict]):
        options = []
        for entity in state_options[:25]:
            options.append(
                discord.SelectOption(
                    label=str(entity.get("name", "State"))[:100],
                    value=str(entity.get("id")),
                    description=f"State-ID {entity.get('id')}",
                )
            )
        super().__init__(
            placeholder="Staat auswaehlen...",
            min_values=1,
            max_values=1,
            options=options,
        )
        self.owner_id = owner_id

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.owner_id:
            await interaction.response.send_message(
                "Dieses Menue gehoert nicht dir. Starte dein eigenes mit `Eco econ laws start`.",
                ephemeral=True,
            )
            return
        state_entity = get_entity(str(self.values[0]))
        if not state_entity or str(state_entity.get("type", "")).lower() != "state":
            await interaction.response.send_message("State nicht gefunden.", ephemeral=True)
            return
        view = LawsBuilderView(owner_id=self.owner_id, state_entity_id=str(state_entity.get("id")))
        await interaction.response.edit_message(content=view.render_text(), view=view)


class LawsStateSelectView(OwnerOnlyView):
    def __init__(self, owner_id: int, state_options: list[dict]):
        super().__init__(owner_id=owner_id, timeout=420)
        self.add_item(LawStateSelect(owner_id=owner_id, state_options=state_options))


class LawsBuilderView(OwnerOnlyView):
    def __init__(self, owner_id: int, state_entity_id: str):
        super().__init__(owner_id=owner_id, timeout=420)
        self.state_entity_id = str(state_entity_id)
        self.category_key = "market"
        self.area_key = "market"
        self.module_key = "permissions"
        self._sync_buttons()

    def _sync_buttons(self):
        self.category_market.style = (
            discord.ButtonStyle.success if self.category_key == "market" else discord.ButtonStyle.secondary
        )
        self.category_government.style = (
            discord.ButtonStyle.success if self.category_key == "government" else discord.ButtonStyle.secondary
        )

        self.area_market.style = discord.ButtonStyle.success if self.area_key == "market" else discord.ButtonStyle.secondary
        self.area_startup.style = discord.ButtonStyle.success if self.area_key == "corporation" else discord.ButtonStyle.secondary
        self.area_social.style = discord.ButtonStyle.success if self.area_key == "social" else discord.ButtonStyle.secondary
        self.area_defense.style = discord.ButtonStyle.success if self.area_key == "defense" else discord.ButtonStyle.secondary
        self.area_market.disabled = self.category_key != "market"
        self.area_startup.disabled = self.category_key != "market"
        self.area_social.disabled = self.category_key != "government"
        self.area_defense.disabled = self.category_key != "government"

        self.mod_permissions.style = (
            discord.ButtonStyle.primary if self.module_key == "permissions" else discord.ButtonStyle.secondary
        )
        self.mod_limits.style = discord.ButtonStyle.primary if self.module_key == "limits" else discord.ButtonStyle.secondary
        self.mod_modifiers.style = (
            discord.ButtonStyle.primary if self.module_key == "modifiers" else discord.ButtonStyle.secondary
        )
        self.mod_addons.style = discord.ButtonStyle.primary if self.module_key == "addons" else discord.ButtonStyle.secondary

    def _state_entity(self) -> Optional[dict]:
        state_entity = get_entity(self.state_entity_id)
        if not state_entity or str(state_entity.get("type", "")).lower() != "state":
            return None
        return state_entity

    def render_text(self) -> str:
        state_entity = self._state_entity()
        if not state_entity:
            return "State nicht gefunden. Starte den Wizard neu: `Eco econ laws start`"
        return _build_law_wizard_text(state_entity, self.area_key, self.module_key)

    async def _refresh(self, interaction: discord.Interaction):
        self._sync_buttons()
        await interaction.response.edit_message(content=self.render_text(), view=self)

    async def _apply_preset(self, interaction: discord.Interaction, mode: str):
        state_entity = self._state_entity()
        if not state_entity:
            await interaction.response.send_message("State nicht gefunden.", ephemeral=True)
            return
        if not user_can_manage_laws(interaction.user):
            await interaction.response.send_message(
                "Nur Admin, State-Chief oder Judikative darf Laws setzen.",
                ephemeral=True,
            )
            return
        preset = LAW_AREA_PRESET_MAP.get(self.area_key, "liberal_market")
        ok, msg = apply_law_preset_to_state(state_entity, preset, mode=mode)
        if not ok:
            await interaction.response.send_message(msg, ephemeral=True)
            return
        save_economy()
        self._sync_buttons()
        await interaction.response.edit_message(
            content=self.render_text() + f"\n\nPreset `{preset}` angewendet ({mode}).",
            view=self,
        )

    @discord.ui.button(label="Market", style=discord.ButtonStyle.success, row=0)
    async def category_market(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.category_key = "market"
        if self.area_key not in LAW_CATEGORY_AREAS["market"]:
            self.area_key = "market"
        await self._refresh(interaction)

    @discord.ui.button(label="Government", style=discord.ButtonStyle.secondary, row=0)
    async def category_government(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.category_key = "government"
        if self.area_key not in LAW_CATEGORY_AREAS["government"]:
            self.area_key = "social"
        await self._refresh(interaction)

    @discord.ui.button(label="Corporation", style=discord.ButtonStyle.secondary, row=1)
    async def area_startup(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.area_key = "corporation"
        self.category_key = "market"
        await self._refresh(interaction)

    @discord.ui.button(label="Social", style=discord.ButtonStyle.secondary, row=1)
    async def area_social(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.area_key = "social"
        self.category_key = "government"
        await self._refresh(interaction)

    @discord.ui.button(label="Verteidigung", style=discord.ButtonStyle.secondary, row=1)
    async def area_defense(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.area_key = "defense"
        self.category_key = "government"
        await self._refresh(interaction)

    @discord.ui.button(label="Markt-Bereich", style=discord.ButtonStyle.success, row=1)
    async def area_market(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.area_key = "market"
        self.category_key = "market"
        await self._refresh(interaction)

    @discord.ui.button(label="Zugriffsregeln (Permissions)", style=discord.ButtonStyle.primary, row=2)
    async def mod_permissions(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.module_key = "permissions"
        await self._refresh(interaction)

    @discord.ui.button(label="Grenzen (Limits)", style=discord.ButtonStyle.secondary, row=2)
    async def mod_limits(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.module_key = "limits"
        await self._refresh(interaction)

    @discord.ui.button(label="Modifikatoren (Modifiers)", style=discord.ButtonStyle.secondary, row=2)
    async def mod_modifiers(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.module_key = "modifiers"
        await self._refresh(interaction)

    @discord.ui.button(label="Zusatzfunktionen (Addons)", style=discord.ButtonStyle.secondary, row=2)
    async def mod_addons(self, interaction: discord.Interaction, _: discord.ui.Button):
        self.module_key = "addons"
        await self._refresh(interaction)

    @discord.ui.button(label="Preset anwenden (Zusammenführen)", style=discord.ButtonStyle.success, row=3)
    async def apply_merge(self, interaction: discord.Interaction, _: discord.ui.Button):
        await self._apply_preset(interaction, "merge")

    @discord.ui.button(label="Preset anwenden (Ersetzen)", style=discord.ButtonStyle.danger, row=3)
    async def apply_replace(self, interaction: discord.Interaction, _: discord.ui.Button):
        await self._apply_preset(interaction, "replace")

    @discord.ui.button(label="Schema & Beispiele", style=discord.ButtonStyle.secondary, row=3)
    async def show_schema_hint(self, interaction: discord.Interaction, _: discord.ui.Button):
        state_entity = self._state_entity()
        if not state_entity:
            await interaction.response.send_message("State nicht gefunden.", ephemeral=True)
            return
        sid = str(state_entity.get("id"))
        await interaction.response.send_message(
            "Baukasten-Hilfe:\n"
            f"- `Eco econ laws schema`\n"
            f"- `Eco econ laws get {sid} | permissions.company_allow_actions`\n"
            f"- `Eco econ laws set {sid} | limits.stocks.max_holding_pct_by_actor.company | 10`\n"
            f"- `Eco econ laws set {sid} | limits.contracts.min_total_by_category.services | 500`\n"
            f"- `Eco econ laws set {sid} | limits.stocks.max_new_buys_per_turn_by_actor.company | 3`\n"
        )


class CreateStateTerritoryModal(discord.ui.Modal):
    territory_count_input = discord.ui.TextInput(
        label="Wie viele Territorien? (3-20)",
        max_length=2,
        placeholder="z. B. 8",
    )

    def __init__(self, state_entity_id: str, guild_id: Optional[int] = None):
        terms = get_setting_world_terms(guild_id)
        super().__init__(title=f"{terms['wizard_title']}: {terms['territory_wizard']}")
        self.state_entity_id = str(state_entity_id)
        self.guild_id = guild_id
        self.territory_count_input.label = f"Wie viele {terms['territory_plural']}? (3-20)"
        self.territory_count_input.placeholder = "z. B. 8"

    async def on_submit(self, interaction: discord.Interaction):
        # Stolperfallen vermeiden: Nur Admins, Input validieren, Exception-Handling
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message("Dir fehlt die Rolle `Admin`.", ephemeral=True)
            return
        raw = str(self.territory_count_input.value or "").strip()
        try:
            count = int(raw)
        except Exception:
            await interaction.response.send_message("Bitte eine ganze Zahl zwischen 3 und 20 angeben.", ephemeral=True)
            return
        if count < 3 or count > 20:
            terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
            await interaction.response.send_message(
                f"{terms['territory_plural']} muessen zwischen 3 und 20 liegen.",
                ephemeral=True,
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            ok, msg = await _finalize_state_wizard_setup(
                state_entity_id=self.state_entity_id,
                guild=interaction.guild,
                channel=interaction.channel,
                territory_count=count,
            )
        except Exception as e:
            await interaction.followup.send(f"Fehler beim Setup: {e}", ephemeral=True)
            return
        if not ok:
            await interaction.followup.send(msg, ephemeral=True)
            return
        state_entity = get_entity(self.state_entity_id)
        map_payload = get_state_map_payload(str(state_entity.get("id"))) if state_entity else None
        if map_payload:
            try:
                await interaction.followup.send(
                    ephemeral=True,
                    **_build_map_message_payload(
                        msg,
                        map_payload["svg"],
                        f"state_map_{self.state_entity_id}.svg",
                    ),
                )
            except Exception as e:
                await interaction.followup.send(f"Setup ok, aber Fehler beim Senden der Karte: {e}", ephemeral=True)
        else:
            await interaction.followup.send(msg, ephemeral=True)


def _parse_manual_territory_names(raw_text: str) -> list[str]:
    out = []
    seen = set()
    for raw in re.split(r"[\n,;]+", str(raw_text or "")):
        name = str(raw or "").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(name[:80])
    return out


class CreateStateTerritoryListModal(discord.ui.Modal):
    territory_names_input = discord.ui.TextInput(
        label="Territorien / Planeten / Regionen",
        style=discord.TextStyle.paragraph,
        max_length=1500,
        placeholder="Je Zeile oder per Komma trennen",
    )

    def __init__(self, state_entity_id: str, guild_id: Optional[int] = None):
        terms = get_setting_world_terms(guild_id)
        super().__init__(title=f"{terms['wizard_title']}: {terms['territory_wizard']}-Liste")
        self.state_entity_id = str(state_entity_id)
        self.guild_id = guild_id
        self.territory_names_input.label = f"{terms['territory_plural']}"
        self.territory_names_input.placeholder = "Je Zeile oder per Komma trennen"

    async def on_submit(self, interaction: discord.Interaction):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message("Dir fehlt die Rolle `Admin`.", ephemeral=True)
            return
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        names = _parse_manual_territory_names(str(self.territory_names_input.value or ""))
        if not names:
            await interaction.response.send_message(
                f"Bitte gib mindestens einen {terms['territory_singular']} an.",
                ephemeral=True,
            )
            return
        if len(names) > 20:
            await interaction.response.send_message(
                f"Maximal 20 {terms['territory_plural']} pro {terms['entity_singular']} auf einmal.",
                ephemeral=True,
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            ok, msg = await _finalize_state_wizard_setup(
                state_entity_id=self.state_entity_id,
                guild=interaction.guild,
                channel=interaction.channel,
                territory_names=names,
            )
        except Exception as e:
            await interaction.followup.send(f"Fehler beim Setup: {e}", ephemeral=True)
            return
        if not ok:
            await interaction.followup.send(msg, ephemeral=True)
            return
        state_entity = get_entity(self.state_entity_id)
        map_payload = get_state_map_payload(str(state_entity.get("id"))) if state_entity else None
        if map_payload:
            try:
                await interaction.followup.send(
                    ephemeral=True,
                    **_build_map_message_payload(
                        msg,
                        map_payload["svg"],
                        f"state_map_{self.state_entity_id}.svg",
                    ),
                )
            except Exception as e:
                await interaction.followup.send(f"Setup ok, aber Fehler beim Senden der Karte: {e}", ephemeral=True)
        else:
            await interaction.followup.send(msg, ephemeral=True)


class CreateStateTypeView(OwnerOnlyView):
    def __init__(
        self,
        owner_id: int,
        state_entity_id: str,
        state_name: str,
        lore_hint: str = "",
        guild_id: Optional[int] = None,
    ):
        super().__init__(owner_id=owner_id, timeout=420)
        self.state_entity_id = str(state_entity_id)
        self.state_name = str(state_name or "").strip() or str(state_entity_id)
        self.lore_hint = str(lore_hint or "")
        self.guild_id = guild_id
        terms = get_setting_world_terms(guild_id)
        self.player_state.label = terms["player_control_label"]
        self.npc_state.label = terms["npc_control_label"]

    def _build_wizard_text(self, control_mode: str) -> str:
        terms = get_setting_world_terms(self.guild_id)
        mode = str(control_mode or "player").lower()
        label = terms["npc_control_label"] if mode == "npc" else terms["player_control_label"]
        return (
            f"{terms['entity_singular']} vorbereitet: `{self.state_name}` (ID: {self.state_entity_id}).\n"
            f"Ausgewaehlter Typ: **{label}**\n"
            "Wizard:\n"
            f"- Schritt 1: {terms['territory_plural']}-Zahl (3-20) festlegen\n"
            f"- Schritt 2: {terms['territory_plural']} werden KI-basiert benannt\n"
            f"- Schritt 3: Struktur wird erstellt (Kategorie + {terms['territory_plural']}-Foren)\n"
            "- Schritt 4: Karte wird generiert\n"
            + self.lore_hint
        )

    async def _apply_mode(self, interaction: discord.Interaction, control_mode: str):
        ok, reason = set_state_control_mode(
            self.state_entity_id,
            control_mode,
            owner_user_id=interaction.user.id,
        )
        if not ok:
            await interaction.response.send_message(reason, ephemeral=True)
            return

        view = CreateStateWizardView(
            owner_id=interaction.user.id,
            state_entity_id=self.state_entity_id,
            guild_id=interaction.guild.id if interaction.guild else self.guild_id,
        )
        await interaction.response.edit_message(
            content=self._build_wizard_text(control_mode),
            view=view,
        )

    @discord.ui.button(label="Spieler-Staat", style=discord.ButtonStyle.primary, row=0)
    async def player_state(self, interaction: discord.Interaction, _: discord.ui.Button):
        await self._apply_mode(interaction, "player")

    @discord.ui.button(label="NPC-Staat", style=discord.ButtonStyle.danger, row=0)
    async def npc_state(self, interaction: discord.Interaction, _: discord.ui.Button):
        await self._apply_mode(interaction, "npc")

    @discord.ui.button(label="Abbrechen", style=discord.ButtonStyle.secondary, row=1)
    async def cancel(self, interaction: discord.Interaction, _: discord.ui.Button):
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        await interaction.response.edit_message(
            content=f"{terms['entity_singular']}-Erstellung abgebrochen.",
            view=None,
        )


class CreateStateWizardView(OwnerOnlyView):
    def __init__(self, owner_id: int, state_entity_id: str, guild_id: Optional[int] = None):
        super().__init__(owner_id=owner_id, timeout=420)
        self.state_entity_id = str(state_entity_id)
        self.guild_id = guild_id
        terms = get_setting_world_terms(guild_id)
        self.set_territories.label = f"{terms['territory_plural']} festlegen"

    @discord.ui.button(label="Territorien festlegen", style=discord.ButtonStyle.primary)
    async def set_territories(self, interaction: discord.Interaction, _: discord.ui.Button):
        # Stolperfallen vermeiden: Nur Admins dürfen, robust gegen Fehler
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message("Dir fehlt die Rolle `Admin`.", ephemeral=True)
            return
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        try:
            modal = CreateStateTerritoryModal(
                state_entity_id=self.state_entity_id,
                guild_id=interaction.guild.id if interaction.guild else self.guild_id,
            )
            await interaction.response.send_modal(modal)
        except Exception as e:
            await interaction.response.send_message(
                f"Fehler beim Öffnen des {terms['territory_plural']}-Dialogs: {e}",
                ephemeral=True,
            )
            return

    @discord.ui.button(label="Abbrechen", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, _: discord.ui.Button):
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        try:
            await interaction.response.edit_message(
                content=f"{terms['wizard_title']} geschlossen.",
                view=None,
            )
        except Exception as e:
            await interaction.response.send_message(f"Fehler beim Abbrechen: {e}", ephemeral=True)
        return


class CreateStateManualWizardView(OwnerOnlyView):
    def __init__(self, owner_id: int, state_entity_id: str, guild_id: Optional[int] = None):
        super().__init__(owner_id=owner_id, timeout=420)
        self.state_entity_id = str(state_entity_id)
        self.guild_id = guild_id
        terms = get_setting_world_terms(guild_id)
        self.set_territories.label = f"{terms['territory_plural']} eingeben"

    @discord.ui.button(label="Territorien eingeben", style=discord.ButtonStyle.primary)
    async def set_territories(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not user_has_admin_role(interaction.user):
            await interaction.response.send_message("Dir fehlt die Rolle `Admin`.", ephemeral=True)
            return
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        try:
            modal = CreateStateTerritoryListModal(
                state_entity_id=self.state_entity_id,
                guild_id=interaction.guild.id if interaction.guild else self.guild_id,
            )
            await interaction.response.send_modal(modal)
        except Exception as e:
            await interaction.response.send_message(
                f"Fehler beim Oeffnen des {terms['territory_plural']}-Dialogs: {e}",
                ephemeral=True,
            )
            return

    @discord.ui.button(label="Abbrechen", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, _: discord.ui.Button):
        terms = get_setting_world_terms(interaction.guild.id if interaction.guild else self.guild_id)
        try:
            await interaction.response.edit_message(
                content=f"{terms['wizard_title']} geschlossen.",
                view=None,
            )
        except Exception as e:
            await interaction.response.send_message(f"Fehler beim Abbrechen: {e}", ephemeral=True)
        return


# **LAW-COMMANDS KATEGORIE**
# Unterkapitel: Presets, Path-Operationen, Whitelist/Permissions und Limits.
@econ_group.group(name="laws", invoke_without_command=True)
async def econ_laws(ctx: commands.Context):
    await ctx.send(
        "Judikative/Law-Engine:\n"
        "- `Eco econ laws start [state]`\n"
        "- `Eco econ laws categories`\n"
        "- `Eco econ laws view <state>`\n"
        "- `Eco econ laws schema`\n"
        "- `Eco econ laws preset_list`\n"
        "- `Eco econ laws preset_show <preset>`\n"
        "- `Eco econ laws preset_apply <state> <preset> [merge|replace]`\n"
        "- `Eco econ laws get <state> | <path>`\n"
        "- `Eco econ laws set <state> | <path> | <value>`\n"
        "- `Eco econ laws unset <state> | <path>`\n"
        "- `Eco econ laws add <state> | <path> | <value>`\n"
        "- `Eco econ laws remove <state> | <path> | <value>`\n"
        "- `Eco econ laws log <state> [limit]`\n"
        "- `Eco econ laws whitelist <state> <person|company> <on|off>`\n"
        "- `Eco econ laws permission <state> <person|company> <category|keyword|action> <allow|deny|clear> <target>`\n"
        "- `Eco econ laws negotiation_limit <state> <person|company> <category> <max_total>`\n"
        "- `Eco econ laws negotiation_clear <state> <person|company> <category>`\n"
        "Hinweis: Laws greifen aktuell in Vertraege, Steuern und Aktienhandel."
    )


@econ_laws.command(name="categories")
async def econ_laws_categories(ctx: commands.Context):
    await ctx.send(
        "Law-Kategorien:\n"
        "- `permissions`: Zugriffsregeln (Produkte + globale Aktionen, z. B. `stock_buy`, `contract_buy`).\n"
        "- `limits`: Harte Obergrenzen (Vertragswerte, Aktienanteile, Bestandslimits, usw.).\n"
        "- `modifiers`: Mathematische Anpassungen (z. B. Steuer-Rabatte, Subventionen, Boni, Multiplikatoren).\n"
        "- `addons`: Freie Zusatzeintraege/Feature-Flags fuer spaetere Hooks."
    )


@econ_laws.command(name="start")
async def econ_laws_start(ctx: commands.Context, *, state_ref: str = ""):
    state_entity = _resolve_state_entity_from_ref(state_ref) if state_ref.strip() else None
    if state_entity:
        view = LawsBuilderView(owner_id=ctx.author.id, state_entity_id=str(state_entity.get("id")))
        await ctx.send(view.render_text(), view=view)
        return

    state_entities = [
        e for e in economy_data.get("entities", {}).values() if str(e.get("type", "")).lower() == "state"
    ]
    state_entities.sort(key=lambda x: str(x.get("name", "")).lower())
    if not state_entities:
        await ctx.send("Keine State-Entitaeten gefunden. Erstelle zuerst einen Staat.")
        return
    if len(state_entities) == 1:
        view = LawsBuilderView(owner_id=ctx.author.id, state_entity_id=str(state_entities[0].get("id")))
        await ctx.send(view.render_text(), view=view)
        return

    await ctx.send(
        "**JUDIKATIVE BUILDER**\n"
        "Schritt 1: Waehle einen Staat.\n"
        "Danach waehlst du Kategorie (`market`/`government`), Unterkategorie "
        "(`market`, `corporation`, `social`, `defense`) und Modul "
        "(`permissions/limits/modifiers/addons`).",
        view=LawsStateSelectView(owner_id=ctx.author.id, state_options=state_entities),
    )


@econ_laws.command(name="schema")
async def econ_laws_schema(ctx: commands.Context):
    await ctx.send(
        "Empfohlene Law-Pfade:\n"
        "- `permissions.person_allow_categories` (list)\n"
        "- `permissions.person_deny_categories` (list)\n"
        "- `permissions.company_allow_actions` (list; z. B. `stock_buy`)\n"
        "- `permissions.company_deny_actions` (list)\n"
        "- `permissions.person_action_whitelist_mode` (bool)\n"
        "- `limits.contracts.max_total_by_actor_category.company.military` (number)\n"
        "- `limits.contracts.min_total_by_category.services` (number)\n"
        "- `limits.stocks.max_holding_pct_by_actor.company` (number)\n"
        "- `limits.stocks.max_holding_units_by_actor.company` (number)\n"
        "- `limits.stocks.max_new_buys_per_turn_by_actor.company` (number)\n"
        "- `limits.stocks.max_holding_pct_by_actor_symbol.company.ECO` (number)\n"
        "- `modifiers.tax.flat_discount_pct_by_actor.company` (number)\n"
        "- `modifiers.tax.producer_discount_pct_for_state_supply_by_actor.company` (number)\n"
        "- `modifiers.tax.producer_discount_pct_by_category.public_state_offers` (number)\n"
        "- `modifiers.subsidies.direct_per_turn_by_category.energy_utilities` (number)\n"
        "- `modifiers.subsidies.direct_per_turn_by_company_id.<entity_id>` (number)\n"
        "- `modifiers.subsidies.tax_credit_pct_by_category.public_state_offers` (number)\n"
        "- `modifiers.subsidies.max_total_per_state_turn` (number)\n"
        "- `addons.contract.allowed_clause_types_by_actor.<person|company|state>` (list)\n"
        "- `addons.contract.blocked_clause_types_by_actor.<person|company|state>` (list)\n"
        "- `addons.contract.allowed_clause_types_by_counterparty.<person|company|state>` (list)\n"
        "- `addons.<dein_flag>` (any)"
    )


@econ_laws.command(name="preset_list")
async def econ_laws_preset_list(ctx: commands.Context):
    catalog = get_law_preset_catalog()
    lines = ["Law-Presets:"]
    for name, item in catalog.items():
        lines.append(f"- {name}: {item.get('description', '-')}")
    await ctx.send("\n".join(lines))


@econ_laws.command(name="preset_show")
async def econ_laws_preset_show(ctx: commands.Context, preset: str):
    catalog = get_law_preset_catalog()
    key = str(preset or "").strip().lower()
    item = catalog.get(key)
    if not item:
        await ctx.send("Preset nicht gefunden. `Eco econ laws preset_list`")
        return
    await ctx.send(
        f"Preset `{key}`:\n"
        f"- Beschreibung: {item.get('description', '-')}\n"
        f"- Inhalt: `{json.dumps(item.get('laws', {}), ensure_ascii=False)}`"
    )


@econ_laws.command(name="preset_apply")
async def econ_laws_preset_apply(ctx: commands.Context, state_ref: str, preset: str, mode: str = "merge"):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    mode_norm = str(mode or "merge").strip().lower()
    if mode_norm not in {"merge", "replace"}:
        await ctx.send("Mode muss `merge` oder `replace` sein.")
        return
    ok, msg = apply_law_preset_to_state(state_entity, preset, mode=mode_norm)
    if not ok:
        await ctx.send(msg)
        return
    save_economy()
    await append_state_law_log(
        state_entity,
        action="preset_apply",
        detail=f"Preset `{preset.strip().lower()}` angewendet (mode={mode_norm}).",
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(
        f"Preset angewendet: state={state_entity.get('name')} preset={preset.strip().lower()} mode={mode_norm}"
    )


@econ_laws.command(name="get")
async def econ_laws_get(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 2:
        await ctx.send("Format: `Eco econ laws get <state> | <path>`")
        return
    state_entity = _resolve_state_entity_from_ref(parts[0])
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    val = _law_get_path(laws, parts[1], default=None)
    await ctx.send(f"{state_entity.get('name')} | {parts[1]} = `{json.dumps(val, ensure_ascii=False)}`")


@econ_laws.command(name="set")
async def econ_laws_set(ctx: commands.Context, *, payload: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send("Format: `Eco econ laws set <state> | <path> | <value>`")
        return
    state_entity = _resolve_state_entity_from_ref(parts[0])
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    path = parts[1]
    old_value = _law_get_path(laws, path, default=None)
    value = _law_normalize_value_for_path(path, _law_coerce_scalar(parts[2]))
    if not _law_set_path(laws, path, value):
        await ctx.send("Pfad ungueltig.")
        return
    ensure_state_law_engine(state_entity)
    save_economy()
    await append_state_law_log(
        state_entity,
        action="set",
        detail=f"Gesetz gesetzt auf `{path}`.",
        path=path,
        old_value=old_value,
        new_value=value,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Law gesetzt: {state_entity.get('name')} | {path} = `{json.dumps(value, ensure_ascii=False)}`")


@econ_laws.command(name="unset")
async def econ_laws_unset(ctx: commands.Context, *, payload: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 2:
        await ctx.send("Format: `Eco econ laws unset <state> | <path>`")
        return
    state_entity = _resolve_state_entity_from_ref(parts[0])
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    old_value = _law_get_path(laws, parts[1], default=None)
    ok = _law_unset_path(laws, parts[1])
    ensure_state_law_engine(state_entity)
    save_economy()
    if not ok:
        await ctx.send("Pfad nicht gefunden.")
        return
    await append_state_law_log(
        state_entity,
        action="unset",
        detail=f"Gesetzspfad entfernt: `{parts[1]}`.",
        path=parts[1],
        old_value=old_value,
        new_value=None,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Law entfernt: {state_entity.get('name')} | {parts[1]}")


@econ_laws.command(name="add")
async def econ_laws_add(ctx: commands.Context, *, payload: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send("Format: `Eco econ laws add <state> | <path> | <value>`")
        return
    state_entity = _resolve_state_entity_from_ref(parts[0])
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    path = parts[1]
    current = _law_get_path(laws, path, default=None)
    if current is None:
        current = []
    if not isinstance(current, list):
        await ctx.send("Pfad ist keine Liste.")
        return
    value = _law_normalize_value_for_path(path, _law_coerce_scalar(parts[2]))
    old_value = list(current)
    if value not in current:
        current.append(value)
    _law_set_path(laws, path, current)
    ensure_state_law_engine(state_entity)
    save_economy()
    await append_state_law_log(
        state_entity,
        action="add",
        detail=f"Listeneintrag hinzugefuegt: `{value}`.",
        path=path,
        old_value=old_value,
        new_value=current,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Listeneintrag hinzugefuegt: {state_entity.get('name')} | {path} += `{value}`")


@econ_laws.command(name="remove")
async def econ_laws_remove(ctx: commands.Context, *, payload: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send("Format: `Eco econ laws remove <state> | <path> | <value>`")
        return
    state_entity = _resolve_state_entity_from_ref(parts[0])
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    path = parts[1]
    current = _law_get_path(laws, path, default=None)
    if not isinstance(current, list):
        await ctx.send("Pfad ist keine Liste.")
        return
    value = _law_normalize_value_for_path(path, _law_coerce_scalar(parts[2]))
    old_value = list(current)
    current = [v for v in current if v != value]
    _law_set_path(laws, path, current)
    ensure_state_law_engine(state_entity)
    save_economy()
    await append_state_law_log(
        state_entity,
        action="remove",
        detail=f"Listeneintrag entfernt: `{value}`.",
        path=path,
        old_value=old_value,
        new_value=current,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Listeneintrag entfernt: {state_entity.get('name')} | {path} -= `{value}`")


@econ_laws.command(name="view")
async def econ_laws_view(ctx: commands.Context, *, state_ref: str):
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    perms = laws.get("permissions", {})
    limits = laws.get("limits", {})
    modifiers = laws.get("modifiers", {})
    addons = laws.get("addons", {})
    lines = [f"**Laws fuer {state_entity.get('name')}**"]
    lines.append(
        f"- Whitelist person/company: {bool(perms.get('person_whitelist_mode'))} / "
        f"{bool(perms.get('company_whitelist_mode'))}"
    )
    lines.append(
        f"- Action-Whitelist person/company: {bool(perms.get('person_action_whitelist_mode'))} / "
        f"{bool(perms.get('company_action_whitelist_mode'))}"
    )
    lines.append(
        f"- Allow categories person/company: {', '.join(perms.get('person_allow_categories', [])) or '-'} / "
        f"{', '.join(perms.get('company_allow_categories', [])) or '-'}"
    )
    lines.append(
        f"- Deny categories person/company: {', '.join(perms.get('person_deny_categories', [])) or '-'} / "
        f"{', '.join(perms.get('company_deny_categories', [])) or '-'}"
    )
    lines.append(
        f"- Allow keywords person/company: {', '.join(perms.get('person_allow_keywords', [])) or '-'} / "
        f"{', '.join(perms.get('company_allow_keywords', [])) or '-'}"
    )
    lines.append(
        f"- Deny keywords person/company: {', '.join(perms.get('person_deny_keywords', [])) or '-'} / "
        f"{', '.join(perms.get('company_deny_keywords', [])) or '-'}"
    )
    lines.append(
        f"- Allow actions person/company: {', '.join(perms.get('person_allow_actions', [])) or '-'} / "
        f"{', '.join(perms.get('company_allow_actions', [])) or '-'}"
    )
    lines.append(
        f"- Deny actions person/company: {', '.join(perms.get('person_deny_actions', [])) or '-'} / "
        f"{', '.join(perms.get('company_deny_actions', [])) or '-'}"
    )
    contracts_limits = (limits.get("contracts", {}).get("max_total_by_actor_category", {}) or {})
    person_limits = contracts_limits.get("person", {}) or {}
    company_limits = contracts_limits.get("company", {}) or {}
    lines.append(
        "- Contract limits person: "
        + (", ".join(f"{k}:{float(v):.2f}" for k, v in person_limits.items()) if person_limits else "-")
    )
    lines.append(
        "- Contract limits company: "
        + (", ".join(f"{k}:{float(v):.2f}" for k, v in company_limits.items()) if company_limits else "-")
    )
    stock_limits = limits.get("stocks", {}) or {}
    lines.append(
        "- Stocks limits: "
        f"actor_units={json.dumps(stock_limits.get('max_holding_units_by_actor', {}), ensure_ascii=False)} | "
        f"actor_pct={json.dumps(stock_limits.get('max_holding_pct_by_actor', {}), ensure_ascii=False)}"
    )
    tax_mod = modifiers.get("tax", {}) or {}
    lines.append(
        "- Tax modifiers: "
        f"flat={json.dumps(tax_mod.get('flat_discount_pct_by_actor', {}), ensure_ascii=False)} | "
        f"state_supply={json.dumps(tax_mod.get('producer_discount_pct_for_state_supply_by_actor', {}), ensure_ascii=False)}"
    )
    lines.append(
        "- Addons keys: "
        + (", ".join(addons.keys()) if isinstance(addons, dict) and addons else "-")
    )
    await ctx.send("\n".join(lines))


@econ_laws.command(name="log")
async def econ_laws_log(ctx: commands.Context, state_ref: str, limit: int = 12):
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    ensure_entity_profile_structure(state_entity)
    rows = state_entity.get("profile", {}).get("law_log", []) or []
    if not rows:
        await ctx.send(f"Kein Law-Log vorhanden fuer {state_entity.get('name')}.")
        return
    lim = int(clamp(int(limit), 1, 40))
    lines = [f"**Law-Log: {state_entity.get('name')} (letzte {lim})**"]
    for entry in rows[-lim:]:
        lines.append(
            f"- Turn {int(entry.get('turn', 0) or 0)} | {entry.get('action','-')} | "
            f"{entry.get('detail','-')}"
        )
    await ctx.send("\n".join(lines))


@econ_laws.command(name="whitelist")
async def econ_laws_whitelist(ctx: commands.Context, state_ref: str, actor: str, switch: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    actor_norm = _norm_law_actor(actor)
    if not actor_norm:
        await ctx.send("Actor muss `person` oder `company` sein.")
        return
    sw = str(switch or "").strip().lower()
    if sw not in {"on", "off"}:
        await ctx.send("Switch muss `on` oder `off` sein.")
        return
    ensure_state_law_engine(state_entity)
    perms = state_entity.get("profile", {}).get("laws", {}).get("permissions", {})
    key = f"{actor_norm}_whitelist_mode"
    old_value = bool(perms.get(key, False))
    new_value = sw == "on"
    perms[key] = new_value
    save_economy()
    await append_state_law_log(
        state_entity,
        action="whitelist",
        detail=f"Whitelist-Modus fuer {actor_norm} gesetzt: {sw}.",
        path=f"permissions.{key}",
        old_value=old_value,
        new_value=new_value,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Whitelist fuer {actor_norm} in {state_entity.get('name')} gesetzt: {sw}.")


@econ_laws.command(name="permission")
async def econ_laws_permission(
    ctx: commands.Context,
    state_ref: str,
    actor: str,
    scope: str,
    mode: str,
    *,
    target: str,
):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    actor_norm = _norm_law_actor(actor)
    if not actor_norm:
        await ctx.send("Actor muss `person` oder `company` sein.")
        return
    scope_norm = str(scope or "").strip().lower()
    if scope_norm not in {"category", "keyword", "action"}:
        await ctx.send("Scope muss `category`, `keyword` oder `action` sein.")
        return
    mode_norm = str(mode or "").strip().lower()
    if mode_norm not in {"allow", "deny", "clear"}:
        await ctx.send("Mode muss `allow`, `deny` oder `clear` sein.")
        return
    target_value = str(target or "").strip()
    if not target_value:
        await ctx.send("Target darf nicht leer sein.")
        return

    ensure_state_law_engine(state_entity)
    perms = state_entity.get("profile", {}).get("laws", {}).get("permissions", {})
    old_snap = {}
    all_keys = [
        _law_target_key(actor_norm, scope_norm, "allow"),
        _law_target_key(actor_norm, scope_norm, "deny"),
    ]
    for k in all_keys:
        if k:
            old_snap[k] = list(perms.get(k, []))
    if mode_norm == "clear":
        keys = [
            _law_target_key(actor_norm, scope_norm, "allow"),
            _law_target_key(actor_norm, scope_norm, "deny"),
        ]
    else:
        keys = [_law_target_key(actor_norm, scope_norm, mode_norm)]
    for key in keys:
        if not key:
            continue
        current = _norm_unique_text_list(perms.get(key, []))
        if scope_norm == "category":
            val = normalize_category(target_value)
        else:
            val = target_value.lower()
        if mode_norm == "clear":
            current = [x for x in current if x != val]
        elif val not in current:
            current.append(val)
        perms[key] = current
    save_economy()
    new_snap = {}
    for k in all_keys:
        if k:
            new_snap[k] = list(perms.get(k, []))
    await append_state_law_log(
        state_entity,
        action="permission",
        detail=(
            f"Permission gesetzt: actor={actor_norm}, scope={scope_norm}, "
            f"mode={mode_norm}, target={target_value}."
        ),
        path=f"permissions.{actor_norm}_{scope_norm}",
        old_value=old_snap,
        new_value=new_snap,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(
        f"Law gesetzt in {state_entity.get('name')}: actor={actor_norm} scope={scope_norm} "
        f"mode={mode_norm} target={target_value}"
    )


@econ_laws.command(name="negotiation_limit")
async def econ_laws_negotiation_limit(
    ctx: commands.Context,
    state_ref: str,
    actor: str,
    category: str,
    max_total: float,
):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    actor_norm = _norm_law_actor(actor)
    if not actor_norm:
        await ctx.send("Actor muss `person` oder `company` sein.")
        return
    cat = normalize_category(category)
    if not cat:
        await ctx.send("Kategorie darf nicht leer sein.")
        return
    max_total = round(float(max_total), 2)
    if max_total <= 0:
        await ctx.send("`max_total` muss > 0 sein.")
        return
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    neg = laws.get("negotiation", {})
    legacy_key = "person_max_total_by_category" if actor_norm == "person" else "company_max_total_by_category"
    old_value = (neg.get(legacy_key, {}) or {}).get(cat)
    neg.setdefault(legacy_key, {})[cat] = max_total
    limits_map = laws.setdefault("limits", {}).setdefault("contracts", {}).setdefault("max_total_by_actor_category", {})
    limits_map.setdefault(actor_norm, {})[cat] = max_total
    save_economy()
    await append_state_law_log(
        state_entity,
        action="negotiation_limit",
        detail=f"Negotiation-Limit gesetzt fuer {actor_norm}/{cat}.",
        path=f"limits.contracts.max_total_by_actor_category.{actor_norm}.{cat}",
        old_value=old_value,
        new_value=max_total,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(
        f"Negotiation-Limit gesetzt in {state_entity.get('name')}: "
        f"{actor_norm} / {cat} <= {format_money(max_total)}"
    )


@econ_laws.command(name="negotiation_clear")
async def econ_laws_negotiation_clear(ctx: commands.Context, state_ref: str, actor: str, category: str):
    if not user_can_manage_laws(ctx.author):
        await ctx.send("Nur Admin, State-Chief oder Judikative darf Laws setzen.")
        return
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    actor_norm = _norm_law_actor(actor)
    if not actor_norm:
        await ctx.send("Actor muss `person` oder `company` sein.")
        return
    cat = normalize_category(category)
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    neg = laws.get("negotiation", {})
    legacy_key = "person_max_total_by_category" if actor_norm == "person" else "company_max_total_by_category"
    current = neg.get(legacy_key, {}) or {}
    old_value = current.get(cat)
    current.pop(cat, None)
    neg[legacy_key] = current
    limits_map = laws.setdefault("limits", {}).setdefault("contracts", {}).setdefault("max_total_by_actor_category", {})
    actor_map = limits_map.get(actor_norm, {}) or {}
    actor_map.pop(cat, None)
    limits_map[actor_norm] = actor_map
    save_economy()
    await append_state_law_log(
        state_entity,
        action="negotiation_clear",
        detail=f"Negotiation-Limit entfernt fuer {actor_norm}/{cat}.",
        path=f"limits.contracts.max_total_by_actor_category.{actor_norm}.{cat}",
        old_value=old_value,
        new_value=None,
        actor_name=ctx.author.display_name,
        actor_user_id=ctx.author.id,
        importance="high",
        guild=ctx.guild,
    )
    await ctx.send(f"Negotiation-Limit entfernt in {state_entity.get('name')}: {actor_norm}/{cat}")


# **COMPANY BASIS KATEGORIE**
# Unterkapitel: Unternehmens-Entity schnell erstellen.
@econ_group.command(name="company_create")
async def econ_company_create(ctx: commands.Context, *, company_name: str):
    ent_role = get_econ_setting_int("entrepreneur_role_id")
    if not (user_has_role_id(ctx.author, ent_role) or user_has_admin_role(ctx.author)):
        await ctx.send("Du brauchst die Entrepreneur-Rolle oder Admin.")
        return
    entity = find_entity_by_name(company_name)
    if entity:
        await ctx.send("Unternehmen existiert bereits.")
        return
    # Eigentuemer immer mit Privatkonto sicherstellen.
    get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    entity_id = create_entity(company_name, "company", owner_user_id=ctx.author.id)
    set_entity_profile(entity_id, city="", territory="", state="", description=f"Gegruendet von {ctx.author.display_name}")
    company_entity = get_entity(entity_id)
    if company_entity:
        ensure_entity_profile_structure(company_entity)
        company_entity["profile"]["leadership_style"] = "ausgewogen"
        company_entity["profile"]["company_subtype"] = company_entity["profile"].get("company_subtype", "") or ""
    create_account(entity_id, initial_balance=8000.0, account_type="company", owner_label=company_name)
    ensure_company_support_npcs(entity_id)
    response_lines = [f"Unternehmen erstellt: #{entity_id} `{company_name}`"]
    if ctx.guild:
        ok, msg = await ensure_company_discord_structure(ctx.guild, entity_id)
        response_lines.append(msg)
    else:
        save_economy()
    await ctx.send("\n".join(response_lines))


# Unterkapitel: Firmeneigentuemer per Admin setzen (relevant fuer Aktien-Kauferloese).
@econ_group.command(name="company_owner_set")
@commands.has_role("Admin")
async def econ_company_owner_set(ctx: commands.Context, entity_ref: str, new_owner: discord.Member):
    raw_ref = str(entity_ref).strip()
    entity = get_entity(raw_ref) if raw_ref in economy_data.get("entities", {}) else find_entity_by_name(raw_ref)
    if not entity:
        await ctx.send("Unternehmen nicht gefunden.")
        return
    if str(entity.get("type", "")).lower() != "company":
        await ctx.send("Ziel muss eine Entitaet vom Typ `company` sein.")
        return

    entity_id = str(entity.get("id"))
    old_owner = int(entity.get("owner_user_id") or 0)
    entity["owner_user_id"] = int(new_owner.id)

    # Sicherstellen, dass ein Spielerprofil/Konto fuer den neuen Besitzer existiert.
    get_or_create_player_entity(new_owner.id, new_owner.display_name)

    save_economy()
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, entity_id)

    await ctx.send(
        f"Eigentuemer gesetzt: `{entity.get('name')}` -> {new_owner.mention} "
        f"(alt: {old_owner if old_owner else '-'}, neu: {new_owner.id})"
    )


