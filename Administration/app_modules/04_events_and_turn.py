# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **EVENTS KATEGORIE**
# Unterkapitel: Lifecycle, Messages und Reaktionsverarbeitung.
@bot.before_invoke
async def _bind_runtime_scope_before_command(ctx: commands.Context):
    await runtime_scope_lock.acquire()
    setattr(ctx, "_runtime_scope_lock_acquired", True)
    try:
        guild_id = ctx.guild.id if ctx.guild else None
        set_active_guild_context(guild_id)
    except Exception:
        if runtime_scope_lock.locked():
            runtime_scope_lock.release()
        setattr(ctx, "_runtime_scope_lock_acquired", False)
        raise


@bot.after_invoke
async def _flush_runtime_scope_after_command(ctx: commands.Context):
    try:
        save_active_scope_all()
    finally:
        if getattr(ctx, "_runtime_scope_lock_acquired", False) and runtime_scope_lock.locked():
            runtime_scope_lock.release()
        setattr(ctx, "_runtime_scope_lock_acquired", False)


@bot.check
async def _enforce_setting_capability_for_commands(ctx: commands.Context):
    if ctx.guild is None:
        return True
    ensure_guild_setting(ctx.guild.id)
    capability = get_required_setting_capability_for_command(ctx)
    if not capability:
        return True
    if guild_setting_supports(ctx.guild.id, capability):
        return True
    raise commands.CheckFailure(build_setting_capability_error(ctx.guild.id, capability))


@bot.event
async def on_ready():
    print(f"Eingeloggt als {bot.user} (ID: {bot.user.id})")
    for guild in bot.guilds:
        ensure_guild_setting(guild.id)
        set_active_guild_context(guild.id)
        if guild_setting_supports(guild.id, "economy"):
            ensure_all_stocks_structure()
        try:
            sync_state_territory_lore_index(save_changes=True)
        except Exception:
            pass
        if (
            guild_setting_supports(guild.id, "turn_system")
            and turn_state.get("enabled")
            and int(turn_state.get("guild_id") or 0) == guild.id
        ):
            refresh_turn_requirements(guild)
            save_turn_state()
            await update_turn_prompt_message(guild)
    set_active_guild_context(None)
    try:
        sync_state_territory_lore_index(save_changes=True)
    except Exception:
        pass


@bot.event
async def on_message(message: discord.Message):
    if message.webhook_id is not None:
        return
    if message.author.bot:
        return
    if str(message.content or "").startswith("Eco "):
        await bot.process_commands(message)
        return

    async with runtime_scope_lock:
        if message.guild:
            set_active_guild_context(message.guild.id)

        # Zug-System: Spieleraktionen fuer die aktuelle Runde erfassen.
        if (
            active_setting_supports("turn_system")
            and
            turn_state.get("enabled")
            and message.guild
            and message.guild.id == turn_state.get("guild_id")
            and turn_state.get("role_id")
        ):
            member = message.author if isinstance(message.author, discord.Member) else None
            if member and any(role.id == int(turn_state["role_id"]) for role in member.roles):
                append_turn_action(message)
                save_turn_state()

        company_entity_id, company_channel_kind = get_company_channel_binding(message.channel.id)
        if active_setting_supports("economy") and company_channel_kind == "office" and company_entity_id and str(message.content or "").strip():
            if can_user_manage_entity(message.author, company_entity_id):
                try:
                    reply = await ask_company_management_npc(
                        company_entity_id,
                        str(message.content),
                        message.author.display_name,
                        message.channel,
                    )
                    _, management_name = get_company_support_npc_names(company_entity_id)
                    await send_npc_reply(message.channel, management_name, reply)
                except RuntimeError as err:
                    await message.channel.send(f"Management-KI aktuell limitiert: {err}")
                return

        # NPC-Interaktion bleibt wie gewuenscht: !NPCName Nachricht
        if active_setting_supports("npc_ai") and message.content.startswith("!"):
            try:
                content = message.content[1:].strip()
                npc_name, user_message = content.split(" ", 1)
            except ValueError:
                await message.channel.send("Fehler: Format muss `!NPCName Nachricht` sein.")
                return

            if npc_name not in npc_profiles:
                await message.channel.send(f"Fehler: NPC `{npc_name}` existiert nicht.")
                return

            try:
                reply = await ask_npc_progressive(
                    npc_name=npc_name,
                    player_message=user_message,
                    username=message.author.name,
                    channel=message.channel,
                )
                await send_npc_reply(message.channel, npc_name, reply)
                await maybe_store_npc_event_in_lore(
                    npc_name=npc_name,
                    npc_output=reply,
                    channel_name=message.channel.name,
                    source="user_trigger",
                )
            except RuntimeError as err:
                await message.channel.send(f"KI aktuell limitiert: {err}")
            return

        # Antworten auf interaktive Bot-Rueckfrage
        if message.reference and message.reference.message_id in help_tracker:
            tracker = help_tracker[message.reference.message_id]
            if message.author.id == tracker["user_id"]:
                mode = tracker.get("mode", "intent")
                if mode == "codehelp":
                    await answer_code_question(message.channel, message.content)
                else:
                    await route_intent_from_text(message.channel, message.author, message.content)
                del help_tracker[message.reference.message_id]
            return


@bot.event
async def on_raw_reaction_add(payload: discord.RawReactionActionEvent):
    async with runtime_scope_lock:
        set_active_guild_context(payload.guild_id if payload.guild_id else None)
        if payload.user_id == bot.user.id:
            return
        if not guild_setting_supports(payload.guild_id, "turn_system"):
            return
        if not turn_state.get("enabled"):
            return
        if payload.guild_id != turn_state.get("guild_id"):
            return
        if payload.message_id != turn_state.get("message_id"):
            return
        if str(payload.emoji) != "\u2705":
            return

        guild = bot.get_guild(payload.guild_id)
        if guild is None:
            return
        refresh_turn_requirements(guild)

        member = guild.get_member(payload.user_id)
        if member is None or member.bot:
            return
        role_id = turn_state.get("role_id")
        if not role_id or not any(role.id == int(role_id) for role in member.roles):
            return

        completed = set(int(uid) for uid in turn_state.get("completed_user_ids", []))
        completed.add(member.id)
        turn_state["completed_user_ids"] = sorted(completed)
        save_turn_state()
        await update_turn_prompt_message(guild)

        if is_turn_complete():
            await finalize_turn_and_report(guild, reason="all_ready")


@bot.event
async def on_raw_reaction_remove(payload: discord.RawReactionActionEvent):
    async with runtime_scope_lock:
        set_active_guild_context(payload.guild_id if payload.guild_id else None)
        if not turn_state.get("enabled"):
            return
        if not guild_setting_supports(payload.guild_id, "turn_system"):
            return
        if payload.guild_id != turn_state.get("guild_id"):
            return
        if payload.message_id != turn_state.get("message_id"):
            return
        if str(payload.emoji) != "\u2705":
            return

        guild = bot.get_guild(payload.guild_id)
        if guild is None:
            return
        refresh_turn_requirements(guild)

        completed = set(int(uid) for uid in turn_state.get("completed_user_ids", []))
        if payload.user_id in completed:
            completed.remove(payload.user_id)
            turn_state["completed_user_ids"] = sorted(completed)
            save_turn_state()
            await update_turn_prompt_message(guild)


# **HOME & HILFE KATEGORIE**
# Unterkapitel: Einstiegspunkte fuer Menue und Command-Katalog.
@bot.command(name="help")
async def help_command(ctx: commands.Context, *, user_plan: Optional[str] = None):
    if user_plan:
        await route_intent_from_text(ctx.channel, ctx.author, user_plan)
        return

    await show_intent_menu(ctx.channel, ctx.author.id, ctx.author)


@bot.command(name="start")
async def start_command(ctx: commands.Context):
    await show_intent_menu(ctx.channel, ctx.author.id, ctx.author)


@bot.command(name="home")
async def home_command(ctx: commands.Context):
    await show_intent_menu(ctx.channel, ctx.author.id, ctx.author)


@bot.command(name="commands")
async def commands_catalog_command(ctx: commands.Context, category: Optional[str] = None):
    key = str(category or "all").strip().lower()
    sections = COMMAND_CATEGORY_ALIASES.get(key)
    current_setting_id = get_guild_setting_id(ctx.guild.id) if ctx.guild else get_active_setting_id()
    if sections is None:
        available = []
        for alias, alias_sections in COMMAND_CATEGORY_ALIASES.items():
            if get_available_command_sections_for_setting(alias_sections, current_setting_id):
                available.append(alias)
        await ctx.send(
            f"Unbekannte Kategorie `{key}`.\n"
            f"Verfuegbar: {', '.join(sorted(available))}\n"
            "Nutze z. B. `Eco commands economy` oder `Eco commands laws`."
        )
        return
    visible_sections = get_available_command_sections_for_setting(sections, current_setting_id)
    if not visible_sections:
        await ctx.send(f"Kategorie `{key}` ist im aktuellen Setting `{get_setting_label(current_setting_id)}` nicht verfuegbar.")
        return
    title = f"Commands ({key})"
    await ctx.send(render_command_catalog(visible_sections, title, setting_id=current_setting_id))


@bot.group(name="setting", invoke_without_command=True)
async def setting_group(ctx: commands.Context):
    if ctx.guild is None:
        await ctx.send("Setting-Verwaltung ist nur auf einem Server verfuegbar.")
        return
    setting_id = get_guild_setting_id(ctx.guild.id)
    setting_def = get_setting_definition(setting_id)
    await ctx.send(
        f"Aktives Server-Setting: `{setting_def.get('label', setting_id)}`\n"
        f"{setting_def.get('description', '')}\n"
        "Commands: `Eco setting status`, `Eco setting list`, `Eco setting set <setting_id>`"
    )


@setting_group.command(name="status")
async def setting_status(ctx: commands.Context):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return
    setting_id = get_guild_setting_id(ctx.guild.id)
    setting_def = get_setting_definition(setting_id)
    actions = ", ".join(get_setting_home_actions(setting_id)) or "-"
    caps = ", ".join(sorted(setting_def.get("capabilities", []))) or "-"
    await ctx.send(
        f"Server-Setting: `{setting_def.get('label', setting_id)}`\n"
        f"- ID: `{setting_id}`\n"
        f"- Bereiche: {actions}\n"
        f"- Capabilities: {caps}"
    )


@setting_group.command(name="list")
async def setting_list(ctx: commands.Context):
    lines = ["Verfuegbare Settings:"]
    for setting in list_available_settings():
        lines.append(f"- `{setting.get('id')}`: {setting.get('label')} | {setting.get('description')}")
    await send_long_message(ctx.channel, "\n".join(lines))


@setting_group.command(name="set")
@commands.has_role("Admin")
async def setting_set(ctx: commands.Context, setting_id: str):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return
    try:
        normalized = set_guild_setting_id(ctx.guild.id, setting_id)
    except ValueError:
        choices = ", ".join(f"`{setting.get('id')}`" for setting in list_available_settings())
        await ctx.send(f"Unbekanntes Setting. Verfuegbar: {choices}")
        return
    await ctx.send(
        f"Server-Setting gesetzt: `{get_setting_label(normalized)}`\n"
        "Nutze `Eco home`, um die neuen Bereiche anzuzeigen."
    )


# **STATE BASIS KATEGORIE**
# Unterkapitel: State-Limits, State-Erstellung und Karten.
@bot.command(name="state_limit_set")
@commands.has_role("Admin")
async def state_limit_set(ctx: commands.Context, limit: int):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return
    limit = int(clamp(int(limit), 2, 20))
    set_guild_state_limit(ctx.guild.id, limit)
    await ctx.send(f"State-Limit fuer diesen Server gesetzt: {limit}")


@bot.command(name="create_state")
@commands.has_role("Admin")
async def create_state(ctx: commands.Context, *, name: str):
    terms = get_setting_world_terms(ctx.guild.id if ctx.guild else None)
    state_name = str(name or "").strip()
    if not state_name:
        await ctx.send(f"Bitte einen {terms['entity_singular']}-Namen angeben.")
        return
    entity_id, _ = ensure_state_entity(state_name)
    state_entity = get_entity(entity_id)
    ensure_entity_profile_structure(state_entity)
    p = state_entity.get("profile", {})
    if not p.get("state"):
        p["state"] = state_name
    if not active_setting_supports("npc_ai"):
        set_state_control_mode(entity_id, "player", owner_user_id=ctx.author.id)
    save_economy()

    lore_check = _find_lore_state_name_matches(state_name)
    lore_hint = ""
    if not lore_check.get("in_lore"):
        close = lore_check.get("close", [])
        lore_hint = (
            f"\nLore-Hinweis: {terms['entity_singular']}-Name wird in Lore aktuell nicht erkannt."
            + (f" Aehnliche {terms['entity_plural']}: {', '.join(close)}" if close else "")
        )

    await ctx.send(
        (
            f"{terms['entity_singular']} vorbereitet: `{state_name}` (ID: {entity_id}).\n"
            "**Schritt 1: Typ waehlen**\n"
            f"- `{terms['player_control_label']}`: menschlich gefuehrte {terms['entity_singular']}\n"
            f"- `{terms['npc_control_label']}`: KI-gefuehrte {terms['entity_singular']}\n"
            f"Danach startet der {terms['territory_wizard']}-Wizard automatisch.\n"
            "Falls abgebrochen: `Eco edit_state <id|name>`."
            + lore_hint
        )
        if active_setting_supports("npc_ai")
        else _manual_state_wizard_text(state_name, entity_id, lore_hint, ctx.guild.id if ctx.guild else None),
        view=(
            CreateStateTypeView(
                owner_id=ctx.author.id,
                state_entity_id=entity_id,
                state_name=state_name,
                lore_hint=lore_hint,
                guild_id=ctx.guild.id if ctx.guild else None,
            )
            if active_setting_supports("npc_ai")
            else CreateStateManualWizardView(
                owner_id=ctx.author.id,
                state_entity_id=entity_id,
                guild_id=ctx.guild.id if ctx.guild else None,
            )
        ),
    )


def _resolve_state_entity_quick(state_ref: str) -> Optional[dict]:
    raw = str(state_ref or "").strip()
    if not raw:
        return None
    by_id = economy_data.get("entities", {}).get(raw)
    if by_id and str(by_id.get("type", "")).lower() == "state":
        return by_id
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        if str(entity.get("name", "")).strip().lower() == raw.lower():
            return entity
    return None


def _state_progress_text(state_entity: dict) -> str:
    terms = get_setting_world_terms(get_active_guild_id())
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {}) or {}
    mode = str(profile.get("state_control_mode", "player")).strip().lower()
    mode_label = terms["npc_control_label"] if mode == "npc" else terms["player_control_label"]
    territories = list(profile.get("territories", []) or [])
    category_id = profile.get("discord_category_id") or profile.get("state_category_channel_id")
    return (
        f"Typ: {mode_label} | {terms['territory_plural']}: {len(territories)} | "
        f"Kategorie: {category_id or '-'}"
    )


def _manual_state_wizard_text(state_name: str, state_id: str, lore_hint: str = "", guild_id: Optional[int] = None) -> str:
    terms = get_setting_world_terms(guild_id)
    return (
        f"{terms['entity_singular']} vorbereitet: `{state_name}` (ID: {state_id}).\n"
        f"**Schritt 1: {terms['territory_plural']} manuell eingeben**\n"
        f"- Dieses Setting nutzt keine automatische {terms['territory_singular']}-Namensgenerierung.\n"
        f"- Gib die {terms['territory_plural']} als Liste ein.\n"
        f"- Danach wird die Struktur erstellt (Kategorie + {terms['territory_plural']}-Foren).\n"
        "- Anschliessend wird die Karte generiert."
        + str(lore_hint or "")
    )


async def _delete_state_discord_structure(guild: Optional[discord.Guild], state_entity: dict) -> dict:
    if guild is None:
        return {"targets": 0, "deleted": 0, "errors": ["Kein Guild-Kontext: Discord-Kanaele nicht geloescht."]}

    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {}) or {}
    state_name = str(state_entity.get("name", state_entity.get("id", "State")))
    category_id = int(profile.get("discord_category_id") or profile.get("state_category_channel_id") or 0)

    channel_ids: set[int] = set()
    for key in ("law_log_channel_id", "contract_log_channel_id"):
        try:
            val = int(profile.get(key) or 0)
            if val > 0:
                channel_ids.add(val)
        except Exception:
            continue
    for raw in profile.get("territory_channel_ids", []) or []:
        try:
            val = int(raw)
            if val > 0:
                channel_ids.add(val)
        except Exception:
            continue
    for forum in profile.get("territory_forums", []) or []:
        try:
            val = int((forum or {}).get("channel_id") or 0)
            if val > 0:
                channel_ids.add(val)
        except Exception:
            continue

    cat_obj = await _fetch_guild_channel_any(guild, category_id) if category_id else None
    if isinstance(cat_obj, discord.CategoryChannel):
        for child in list(cat_obj.channels):
            try:
                channel_ids.add(int(child.id))
            except Exception:
                continue

    deleted = 0
    errors: list[str] = []
    for channel_id in sorted(channel_ids):
        ok, info = await _delete_guild_channel_any(
            guild,
            channel_id,
            reason=f"State-Loeschung: {state_name}",
        )
        if ok:
            deleted += 1
        elif info != "not_found":
            errors.append(info)

    if category_id:
        ok, info = await _delete_guild_channel_any(
            guild,
            category_id,
            reason=f"State-Loeschung: {state_name}",
        )
        if ok:
            deleted += 1
        elif info != "not_found":
            errors.append(info)

    return {"targets": len(channel_ids) + (1 if category_id else 0), "deleted": deleted, "errors": errors}


def _delete_state_data(state_entity: dict, guild_id: Optional[int]) -> dict:
    state_id = str(state_entity.get("id"))
    state_name = str(state_entity.get("name", state_id))
    entities = economy_data.setdefault("entities", {})
    accounts = economy_data.setdefault("accounts", {})
    holdings = economy_data.setdefault("holdings", {})
    inventories = economy_data.setdefault("inventories", {})
    stocks = economy_data.setdefault("stocks", {})
    stock_history = economy_data.setdefault("stock_history", {})
    contracts = economy_data.setdefault("contracts", {})
    salaries = economy_data.setdefault("salaries", {})
    products = economy_data.setdefault("products", {})
    company_forums = economy_data.setdefault("company_forums", {})
    maps = economy_data.setdefault("state_maps", {})
    settings_states = economy_data.setdefault("settings", {}).setdefault("states", [])
    if not isinstance(settings_states, list):
        settings_states = []
        economy_data.setdefault("settings", {})["states"] = settings_states

    removed_accounts = [aid for aid, acc in list(accounts.items()) if str(acc.get("entity_id")) == state_id]
    for aid in removed_accounts:
        accounts.pop(aid, None)

    holdings.pop(state_id, None)
    inventories.pop(state_id, None)
    company_forums.pop(state_id, None)

    removed_symbols = [sym for sym, stock in list(stocks.items()) if str(stock.get("company_entity_id")) == state_id]
    for sym in removed_symbols:
        stocks.pop(sym, None)
        stock_history.pop(sym, None)
    for h in holdings.values():
        if not isinstance(h, dict):
            continue
        for sym in removed_symbols:
            h.pop(sym, None)

    removed_contracts = []
    for cid, contract in list(contracts.items()):
        if str(contract.get("seller_entity_id")) == state_id or str(contract.get("buyer_entity_id")) == state_id:
            contracts.pop(cid, None)
            removed_contracts.append(str(cid))

    removed_salaries = []
    for uid, row in list(salaries.items()):
        if str((row or {}).get("employer_entity_id")) == state_id:
            salaries.pop(uid, None)
            removed_salaries.append(str(uid))

    removed_products = []
    for pid, product in list(products.items()):
        owner_id = str((product or {}).get("owner_entity_id"))
        manufacturer_id = str((product or {}).get("manufacturer_entity_id"))
        if owner_id == state_id:
            products.pop(pid, None)
            removed_products.append(str(pid))
            continue
        if manufacturer_id == state_id:
            product["manufacturer_entity_id"] = owner_id
    for inv in inventories.values():
        if not isinstance(inv, dict):
            continue
        for pid in removed_products:
            inv.pop(str(pid), None)

    old_len = len(settings_states)
    settings_states[:] = [s for s in settings_states if str(s).strip().lower() != state_name.strip().lower()]
    removed_settings_states = old_len - len(settings_states)

    for eid, entity in entities.items():
        if str(eid) == state_id:
            continue
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {}) or {}
        if str(profile.get("state_entity_id") or "") == state_id:
            profile["state_entity_id"] = None
            if str(profile.get("state", "")).strip().lower() == state_name.strip().lower():
                profile["state"] = ""

    entities.pop(state_id, None)

    state_map = maps.pop(_state_map_key(state_id), None)
    world_guild_ids = set()
    if guild_id:
        world_guild_ids.add(int(guild_id))
    try:
        if state_map and state_map.get("guild_id") is not None:
            world_guild_ids.add(int(state_map.get("guild_id")))
    except Exception:
        pass
    for gid in sorted(world_guild_ids):
        maps.pop(_world_map_key(gid), None)

    strategy_store = turn_state.get("npc_state_strategy", {})
    if isinstance(strategy_store, dict):
        relations = strategy_store.get("relations", {})
        if isinstance(relations, dict):
            relations.pop(state_id, None)
            for left_id, row in list(relations.items()):
                if isinstance(row, dict):
                    row.pop(state_id, None)
                    relations[left_id] = row
        id_keys = {
            "state_id",
            "state_entity_id",
            "actor_state_id",
            "target_state_id",
            "left_state_id",
            "right_state_id",
            "source_state_id",
            "destination_state_id",
        }
        for list_key in ("history", "last_turn_results"):
            rows = strategy_store.get(list_key, [])
            if not isinstance(rows, list):
                continue
            filtered = []
            for row in rows:
                if not isinstance(row, dict):
                    filtered.append(row)
                    continue
                if any(str(row.get(k, "")) == state_id for k in id_keys):
                    continue
                filtered.append(row)
            strategy_store[list_key] = filtered

    return {
        "state_id": state_id,
        "state_name": state_name,
        "removed_accounts": len(removed_accounts),
        "removed_symbols": len(removed_symbols),
        "removed_contracts": len(removed_contracts),
        "removed_salaries": len(removed_salaries),
        "removed_products": len(removed_products),
        "removed_settings_states": removed_settings_states,
        "world_guild_ids": sorted(world_guild_ids),
    }


@bot.command(name="edit_state")
@commands.has_role("Admin")
async def edit_state(ctx: commands.Context, *, state_ref: str = ""):
    terms = get_setting_world_terms(ctx.guild.id if ctx.guild else None)
    if not str(state_ref or "").strip():
        states = [e for e in economy_data.get("entities", {}).values() if str(e.get("type", "")).lower() == "state"]
        states.sort(key=lambda x: str(x.get("name", "")).lower())
        if not states:
            await ctx.send(f"Keine {terms['entity_plural']}-Entitaeten gefunden. Erstelle zuerst eine {terms['entity_singular']} mit `Eco create_state <Name>`.")
            return
        lines = [f"{terms['entity_editor']}: Verfuegbare {terms['entity_plural']}", "Nutze: `Eco edit_state <id|name>`"]
        for state_entity in states[:30]:
            lines.append(
                f"- #{state_entity.get('id')} {state_entity.get('name')}: {_state_progress_text(state_entity)}"
            )
        await send_long_message(ctx.channel, "\n".join(lines))
        return

    state_entity = _resolve_state_entity_quick(state_ref)
    if not state_entity:
        await ctx.send(f"{terms['entity_singular']} nicht gefunden. Nutze `Eco edit_state` fuer eine Liste.")
        return

    state_id = str(state_entity.get("id"))
    state_name = str(state_entity.get("name", state_id))
    lore_check = _find_lore_state_name_matches(state_name)
    lore_hint = ""
    if not lore_check.get("in_lore"):
        close = lore_check.get("close", [])
        lore_hint = (
            f"\nLore-Hinweis: {terms['entity_singular']}-Name wird in Lore aktuell nicht erkannt."
            + (f" Aehnliche {terms['entity_plural']}: {', '.join(close)}" if close else "")
        )
    if not active_setting_supports("npc_ai"):
        set_state_control_mode(state_id, "player", owner_user_id=ctx.author.id)
    await ctx.send(
        (
            f"{terms['entity_editor']} geoeffnet: `{state_name}` (ID: {state_id})\n"
            f"Aktueller Stand: {_state_progress_text(state_entity)}\n"
            f"Waehle jetzt den {terms['entity_singular']}-Typ und setze danach (neu) die {terms['territory_plural']}."
        )
        if active_setting_supports("npc_ai")
        else (
            f"{terms['entity_editor']} geoeffnet: `{state_name}` (ID: {state_id})\n"
            f"Aktueller Stand: {_state_progress_text(state_entity)}\n"
            f"**Schritt 1: {terms['territory_plural']} manuell eingeben**\n"
            f"- Dieses Setting nutzt keine automatische {terms['territory_singular']}-Namensgenerierung.\n"
            f"- Gib die {terms['territory_plural']} als Liste ein.\n"
            f"- Danach wird die Struktur erstellt (Kategorie + {terms['territory_plural']}-Foren).\n"
            "- Anschliessend wird die Karte generiert."
            + lore_hint
        ),
        view=(
            CreateStateTypeView(
                owner_id=ctx.author.id,
                state_entity_id=state_id,
                state_name=state_name,
                lore_hint=lore_hint,
                guild_id=ctx.guild.id if ctx.guild else None,
            )
            if active_setting_supports("npc_ai")
            else CreateStateManualWizardView(
                owner_id=ctx.author.id,
                state_entity_id=state_id,
                guild_id=ctx.guild.id if ctx.guild else None,
            )
        ),
    )


@bot.command(name="delete_state")
@commands.has_role("Admin")
async def delete_state(ctx: commands.Context, *, state_ref: str):
    state_entity = _resolve_state_entity_quick(state_ref)
    if not state_entity:
        await ctx.send("State nicht gefunden. Nutze Name oder ID, z. B. `Eco delete_state 12`.")
        return

    state_id = str(state_entity.get("id"))
    state_name = str(state_entity.get("name", state_id))
    await ctx.send(f"Loesche State `{state_name}` (ID: {state_id}) inkl. Channels/Foren und Daten...")

    discord_result = await _delete_state_discord_structure(ctx.guild, state_entity)
    cleanup = _delete_state_data(state_entity, guild_id=ctx.guild.id if ctx.guild else None)
    for gid in cleanup.get("world_guild_ids", []):
        try:
            rebuild_world_map_for_guild(int(gid))
        except Exception:
            continue

    save_economy()
    save_turn_state()
    sync_state_territory_lore_index(save_changes=True)

    lines = [
        f"State geloescht: `{state_name}` (ID: {state_id})",
        f"- Discord-Kanaele geloescht: {discord_result.get('deleted', 0)}/{discord_result.get('targets', 0)}",
        f"- Entfernte Konten: {cleanup.get('removed_accounts', 0)}",
        f"- Entfernte Aktien-Symbole: {cleanup.get('removed_symbols', 0)}",
        f"- Entfernte Vertraege: {cleanup.get('removed_contracts', 0)}",
        f"- Entfernte Gehaltszuweisungen: {cleanup.get('removed_salaries', 0)}",
        f"- Entfernte Produkte: {cleanup.get('removed_products', 0)}",
    ]
    errors = discord_result.get("errors", []) or []
    if errors:
        lines.append("- Kanal-Fehler (Auszug):")
        for err in errors[:6]:
            lines.append(f"  - {err}")
    await send_long_message(ctx.channel, "\n".join(lines))


@bot.command(name="show_map")
async def show_map(ctx: commands.Context, *, state_ref: str):
    ref = str(state_ref or "").strip()
    if not ref:
        await ctx.send("Nutze: `Eco show_map <Staat|world>`")
        return
    if ref.lower() in {"world", "welt"}:
        if ctx.guild is None:
            await ctx.send("Weltkarte nur auf einem Server verfuegbar.")
            return
        payload = economy_data.get("state_maps", {}).get(_world_map_key(ctx.guild.id))
        if not payload:
            payload = rebuild_world_map_for_guild(ctx.guild.id)
        if not payload:
            await ctx.send("Noch keine Weltkarte verfuegbar.")
            return
        await ctx.send(
            **_build_map_message_payload(
                f"Weltkarte (States: {payload.get('state_count', 0)})",
                payload["svg"],
                f"world_map_{ctx.guild.id}.svg",
            )
        )
        return

    payload = get_state_map_payload(ref)
    if not payload:
        state_entity = _resolve_state_entity_from_ref(ref)
        if state_entity:
            ensure_entity_profile_structure(state_entity)
            territories = state_entity.get("profile", {}).get("territories", []) or []
            if territories:
                svg = _generate_state_svg_map(str(state_entity.get("name", "")), territories)
                save_state_map_svg(
                    state_entity_id=str(state_entity.get("id")),
                    state_name=str(state_entity.get("name", "")),
                    territories=territories,
                    svg=svg,
                    guild_id=ctx.guild.id if ctx.guild else None,
                )
                payload = get_state_map_payload(str(state_entity.get("name", "")))
    if not payload:
        await ctx.send("Keine Karte fuer diesen Staat gefunden.")
        return
    await ctx.send(
        **_build_map_message_payload(
            f"Staatskarte: {payload.get('state_name', ref)}",
            payload["svg"],
            f"state_map_{payload.get('state_entity_id', 'x')}.svg",
        )
    )


@bot.command(name="map_tool")
async def map_tool(ctx: commands.Context):
    if ctx.guild is None:
        await ctx.send("Map-Visualizer ist nur auf einem Server verfuegbar.")
        return
    await ctx.send(
        "**Map-Visualizer**\n"
        "Waehle einen State fuer die Staatskarte oder nutze die Buttons "
        "fuer Weltkarte/Atlas.",
        view=MapVisualizerView(owner_id=ctx.author.id, guild_id=ctx.guild.id),
    )


# **TURN-SYSTEM KATEGORIE**
# Unterkapitel: Setup, Status, Historie und Turn-Abschluss.
@bot.group(name="turn", invoke_without_command=True)
async def turn_group(ctx: commands.Context):
    await ctx.send(render_command_catalog(["turn"], "Turn-System Befehle:"))


@turn_group.command(name="setup")
@commands.has_role("Admin")
async def turn_setup(ctx: commands.Context, channel: discord.TextChannel, role: discord.Role):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return

    role_members = get_turn_role_members(ctx.guild, role.id)
    if not has_minimum_turn_role_members(ctx.guild, role.id):
        await ctx.send(
            f"Turn-System kann erst aktiviert werden, wenn mindestens {MIN_TURN_ROLE_MEMBERS} "
            f"Personen die Rolle {role.mention} haben. Aktuell: {len(role_members)}."
        )
        return

    turn_state["enabled"] = True
    turn_state["guild_id"] = ctx.guild.id
    turn_state["channel_id"] = channel.id
    turn_state["role_id"] = role.id
    turn_state["completed_user_ids"] = []
    turn_state["player_actions"] = []
    if not turn_state.get("turn_index"):
        turn_state["turn_index"] = 1

    refresh_turn_requirements(ctx.guild)
    turn_state["message_id"] = await create_turn_prompt_message(channel)
    save_turn_state()

    completed, required = get_turn_progress()
    missing_states = find_missing_states_in_lore()
    role_status = f"{required} Rollenmitglieder"
    if required < MIN_TURN_ROLE_MEMBERS:
        role_status += f" (mindestens {MIN_TURN_ROLE_MEMBERS} noetig)"
    lore_hint = (
        f" | Lore-Hinweis: fehlende States -> {', '.join(missing_states[:10])}"
        if missing_states
        else " | Lore-Hinweis: States in Lore vorhanden"
    )
    await ctx.send(
        f"Turn-System aktiv. Channel: {channel.mention} | Rolle: {role.mention} | "
        f"Teilnehmer: {completed}/{required} | {role_status}{lore_hint}"
    )


@turn_group.command(name="status")
async def turn_status(ctx: commands.Context):
    if not turn_state.get("enabled"):
        await ctx.send("Turn-System ist aktuell deaktiviert.")
        return

    guild = ctx.guild if ctx.guild and ctx.guild.id == turn_state.get("guild_id") else bot.get_guild(turn_state.get("guild_id"))
    if guild:
        refresh_turn_requirements(guild)
    save_turn_state()

    completed, required = get_turn_progress()
    missing_states = find_missing_states_in_lore()
    channel = guild.get_channel(int(turn_state["channel_id"])) if guild and turn_state.get("channel_id") else None
    role = guild.get_role(int(turn_state["role_id"])) if guild and turn_state.get("role_id") else None
    role_status = f"{required}"
    if required < MIN_TURN_ROLE_MEMBERS:
        role_status += f" (mindestens {MIN_TURN_ROLE_MEMBERS} noetig - Teilnahme pausiert)"
    await ctx.send(
        f"Turn-System aktiv: Zug #{turn_state.get('turn_index', 1)}\n"
        f"- Channel: {channel.mention if channel else turn_state.get('channel_id')}\n"
        f"- Rolle: {role.mention if role else turn_state.get('role_id')}\n"
        f"- Rollenmitglieder: {role_status}\n"
        f"- Fertig: {completed}/{required}\n"
        f"- Erfasste Spieleraktionen: {len(turn_state.get('player_actions', []))}\n"
        f"- Lore-States fehlen: {', '.join(missing_states[:20]) if missing_states else 'keine'}"
    )


@turn_group.command(name="history")
async def turn_history(ctx: commands.Context):
    reports = turn_state.get("turn_reports", [])
    if not reports:
        await ctx.send("Noch keine Turn-Historie vorhanden.")
        return
    lines = ["Letzte Turn-Berichte:"]
    for rep in reports[-5:]:
        lines.append(f"- Zug #{rep.get('turn')}: Grund `{rep.get('reason')}`")
    lines.append("Details: `Eco turn report <zugnummer>`")
    await ctx.send("\n".join(lines))


@turn_group.command(name="report")
async def turn_report(ctx: commands.Context, turn_number: int):
    reports = turn_state.get("turn_reports", [])
    for rep in reports:
        if int(rep.get("turn", -1)) == int(turn_number):
            text = str(rep.get("report", ""))
            chunks = [text[i : i + 1800] for i in range(0, len(text), 1800)] or ["(leer)"]
            await ctx.send(f"Report Zug #{turn_number}:")
            for chunk in chunks:
                await ctx.send(chunk)
            return
    await ctx.send(f"Kein Report fuer Zug #{turn_number} gefunden.")


@turn_group.command(name="force_end")
@commands.has_role("Admin")
async def turn_force_end(ctx: commands.Context):
    if not turn_state.get("enabled"):
        await ctx.send("Turn-System ist nicht aktiv.")
        return
    if ctx.guild is None or ctx.guild.id != turn_state.get("guild_id"):
        await ctx.send("Dieser Befehl muss auf dem konfigurierten Server ausgefuehrt werden.")
        return

    await ctx.send("Zug wird manuell beendet und ausgewertet...")
    await finalize_turn_and_report(ctx.guild, reason="admin_force_end")


@turn_group.command(name="disable")
@commands.has_role("Admin")
async def turn_disable(ctx: commands.Context):
    turn_state["enabled"] = False
    turn_state["guild_id"] = None
    turn_state["channel_id"] = None
    turn_state["message_id"] = None
    turn_state["role_id"] = None
    turn_state["required_user_ids"] = []
    turn_state["completed_user_ids"] = []
    turn_state["player_actions"] = []
    save_turn_state()
    await ctx.send("Turn-System wurde deaktiviert.")


