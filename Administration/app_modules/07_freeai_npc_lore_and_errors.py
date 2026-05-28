# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **FREEAI KATEGORIE**
# Unterkapitel: Aktivierung, Status, Frequenz und Auto-Throttle.
@bot.group(name="freeai", invoke_without_command=True)
async def freeai_group(ctx: commands.Context):
    await ctx.send(
        render_command_catalog(["freeai"], "Free AI Befehle:")
        + "\nBeim Stoppen werden Lore-Events und NPC-Memories automatisch komprimiert."
    )


@freeai_group.command(name="on")
@commands.has_role("Admin")
async def freeai_on(ctx: commands.Context, *channels: discord.TextChannel):
    target_channels = list(channels) if channels else [ctx.channel]
    if len(npc_profiles) < 2:
        await ctx.send("Mindestens 2 NPCs sind noetig, um Free AI zu starten.")
        return

    started = []
    already = []
    for channel in target_channels:
        if channel.id in free_ai_channels:
            already.append(channel.mention)
            continue
        start_free_ai_channel(channel.id)
        started.append(channel.mention)

    parts = []
    if started:
        parts.append(f"Gestartet: {', '.join(started)}")
    if already:
        parts.append(f"Bereits aktiv: {', '.join(already)}")
    await ctx.send(" | ".join(parts) if parts else "Keine Channels aktiviert.")


@freeai_group.command(name="off")
@commands.has_role("Admin")
async def freeai_off(ctx: commands.Context, scope: Optional[str] = None):
    had_active = bool(free_ai_channels)
    channel_was_active = ctx.channel.id in free_ai_channels
    if scope and scope.lower() == "all":
        for channel_id in list(free_ai_channels):
            stop_free_ai_channel(channel_id)
        if had_active:
            await ctx.send("Free AI gestoppt. Komprimiere Lore-Events und NPC-Memories...")
            lore_count, npc_count = await finalize_free_ai_session_state()
            await ctx.send(
                f"Abschluss fertig. Lore-Eintraege: {lore_count} | NPC-Memories komprimiert: {npc_count}"
            )
        else:
            await ctx.send("Free AI war nicht aktiv.")
        return

    stop_free_ai_channel(ctx.channel.id)
    if channel_was_active:
        await ctx.send(
            f"Free AI in {ctx.channel.mention} gestoppt. Komprimiere Lore-Events und NPC-Memories..."
        )
        lore_count, npc_count = await finalize_free_ai_session_state()
        await ctx.send(
            f"Abschluss fertig. Lore-Eintraege: {lore_count} | NPC-Memories komprimiert: {npc_count}"
        )
    else:
        await ctx.send(f"In {ctx.channel.mention} war Free AI nicht aktiv.")


@freeai_group.command(name="status")
async def freeai_status(ctx: commands.Context):
    snapshot = get_ai_quota_snapshot()
    quota_line = (
        f"Erfolge heute/minute: {snapshot['used_today']}/{snapshot['used_minute']} | "
        f"Versuche heute/minute: {snapshot['attempts_today']}/{snapshot['attempts_minute']}"
    )
    if not free_ai_channels:
        await ctx.send(
            "Free AI ist aktuell in keinem Channel aktiv.\n"
            f"Auto-Throttle: {'AN' if free_ai_auto_throttle_enabled else 'AUS'}\n"
            f"KI-Status: {quota_line}"
        )
        return

    rows = []
    for channel_id in sorted(free_ai_channels):
        channel = bot.get_channel(channel_id)
        channel_label = channel.mention if channel else f"`{channel_id}`"
        base_mode = get_free_ai_mode(channel_id)
        effective_mode = get_effective_free_ai_mode(channel_id)
        mode_label = get_free_ai_mode_label(base_mode)
        if effective_mode != base_mode:
            mode_label += f" -> gedrosselt: {get_free_ai_mode_label(effective_mode)}"
        rows.append(f"- {channel_label}: {mode_label}")
    await ctx.send(
        "Free AI aktiv in:\n"
        + "\n".join(rows)
        + "\n\n"
        + f"Auto-Throttle: {'AN' if free_ai_auto_throttle_enabled else 'AUS'}\n"
        + f"KI-Status: {quota_line}"
    )


@freeai_group.command(name="frequency")
@commands.has_role("Admin")
async def freeai_frequency(ctx: commands.Context, channel: Optional[discord.TextChannel] = None):
    target = channel or ctx.channel
    view = FreeAIFrequencyView(owner_id=ctx.author.id, channel_id=target.id)
    current_label = get_free_ai_mode_label(get_free_ai_mode(target.id))
    await ctx.send(
        f"Frequenz fuer {target.mention} einstellen.\nAktuell: {current_label}",
        view=view,
    )


@freeai_group.group(name="autothrottle", invoke_without_command=True)
@commands.has_role("Admin")
async def freeai_autothrottle(ctx: commands.Context):
    await ctx.send("Nutze: `Eco freeai autothrottle on`, `off` oder `status`.")


@freeai_autothrottle.command(name="on")
@commands.has_role("Admin")
async def freeai_autothrottle_on(ctx: commands.Context):
    global free_ai_auto_throttle_enabled
    free_ai_auto_throttle_enabled = True
    await ctx.send("FreeAI Auto-Throttle ist jetzt AN.")


@freeai_autothrottle.command(name="off")
@commands.has_role("Admin")
async def freeai_autothrottle_off(ctx: commands.Context):
    global free_ai_auto_throttle_enabled
    free_ai_auto_throttle_enabled = False
    free_ai_throttle_override.clear()
    await ctx.send("FreeAI Auto-Throttle ist jetzt AUS.")


@freeai_autothrottle.command(name="status")
@commands.has_role("Admin")
async def freeai_autothrottle_status(ctx: commands.Context):
    await ctx.send(
        f"FreeAI Auto-Throttle: {'AN' if free_ai_auto_throttle_enabled else 'AUS'}"
    )


# **KI-HILFE KATEGORIE**
# Unterkapitel: Quota-Anzeige, Sprache und Codefragen.
@bot.command(name="aiquota")
async def aiquota(ctx: commands.Context):
    snapshot = get_ai_quota_snapshot()
    remaining_day = snapshot["remaining_day"]
    remaining_min = snapshot["remaining_minute"]

    # Zeige aktuellen Provider
    provider_info = f"\n- Provider: **{get_llm_provider_label()}**"
    if LLM_PROVIDER == "ollama":
        provider_info += f" (Modell: `{OLLAMA_MODEL}`)"
        ollama_available = _check_ollama_available()
        provider_info += f" - {'Online' if ollama_available else 'Offline'}"
    elif LLM_PROVIDER == "external_openai":
        ext_cfg = get_external_openai_config()
        provider_info += (
            f" ({ext_cfg.get('provider_label') or 'External API'})"
            f"\n- Externer Endpoint: {ext_cfg.get('endpoint_url') or '-'}"
            f"\n- Externes Modell: {ext_cfg.get('model') or '-'}"
            f"\n- Externer Key: {mask_secret(get_external_openai_api_key())}"
        )
    else:
        provider_info += f" (Modell: `{GEMINI_MODEL}`)"

    soft_limit_text = "aus"
    if snapshot["soft_limit_enforced"]:
        soft_limit_text = (
            f"AN ({snapshot['rpm_limit']}/Minute, {snapshot['rpd_limit']}/Tag)"
        )

    text = (
        f"KI-Status (Quota-Tag: {snapshot['day']} Pacific)\n"
        f"- Erfolgreiche Requests heute: {snapshot['used_today']}\n"
        f"- Erfolgreiche Requests letzte Minute: {snapshot['used_minute']}\n"
        f"- Versuche heute gesamt: {snapshot['attempts_today']}\n"
        f"- Versuche letzte Minute: {snapshot['attempts_minute']}\n"
        f"- Lokaler Soft-Limit-Schutz: {soft_limit_text}\n"
        f"- Lokaler Rest Tag: {remaining_day if remaining_day is not None else 'unbegrenzt'}\n"
        f"- Lokaler Rest Minute: {remaining_min if remaining_min is not None else 'unbegrenzt'}\n"
        f"- Letzter Provider-Status: {snapshot['last_provider_status'] or 'unbekannt'}\n"
        f"- Letzte Provider-Meldung: {snapshot['last_provider_message'] or '-'}\n"
        f"- Letzte Anfrage: {snapshot['last_request_at'] or '-'}\n"
        f"- Letzter Erfolg: {snapshot['last_success_at'] or '-'}"
        f"{provider_info}"
    )
    await ctx.send(text)


@bot.command(name="ai_setup")
@commands.has_role("Admin")
async def ai_setup(ctx: commands.Context):
    view = AIProviderControlView(owner_id=ctx.author.id)
    await ctx.send(view._render_text(), view=view)


@bot.command(name="change_ai_provider")
@commands.has_role("Admin")
async def change_ai_provider(ctx: commands.Context, provider: Optional[str] = None):
    """Change between 'gemini', 'ollama' and 'external' AI provider"""
    global OLLAMA_ENABLED, LLM_PROVIDER
    
    if not provider:
        current = get_llm_provider_label()
        await ctx.send(
            f"Aktueller Provider: **{current}**\n"
            f"Verfuegbare Provider: `ollama`, `gemini`, `external`\n"
            "Nutze alternativ `Eco ai_setup` fuer das Menue."
        )
        return
    
    provider_clean = _normalize_llm_provider(provider)
    
    if provider_clean == "ollama":
        # Check if Ollama is available first
        if not _check_ollama_available():
            await ctx.send(
                "Ollama ist nicht verfuegbar! Bitte stelle sicher, dass Ollama laeuft.\n"
                "Starte Ollama mit: `ollama serve`\n"
                "Oder lade ein Modell: `ollama pull gemma3:12b`"
            )
            return
        set_llm_provider("ollama")
        await ctx.send(
            f"Provider gewechselt zu **OLLAMA** (lokal, keine Limits!)\n"
            f"Modell: `{OLLAMA_MODEL}`\n"
            "Hinweis: Ollama muss laufen, damit der Bot funktioniert. "
            "Ein automatischer Gemini-Fallback ist standardmaessig aus."
        )
    elif provider_clean == "gemini":
        if not GEMINI_API_KEY:
            await ctx.send("GEMINI_API_KEY fehlt in `Administration/.env`.")
            return
        set_llm_provider("gemini")
        await ctx.send(
            "Provider gewechselt zu **GEMINI** (Google API)\n"
            f"Modell: `{GEMINI_MODEL}`\n"
            "Hinweis: Die echten Limits kommen von deinem Google-Projekt in AI Studio/Billing."
        )
    elif provider_clean == "external_openai":
        if not external_openai_is_ready():
            await ctx.send(
                "Die externe API ist noch nicht fertig konfiguriert.\n"
                "Nutze `Eco ai_setup` und dann `Externe API konfigurieren`."
            )
            return
        set_llm_provider("external_openai")
        ext_cfg = get_external_openai_config()
        await ctx.send(
            "Provider gewechselt zu **EXTERNAL API**\n"
            f"Anbieter: `{ext_cfg.get('provider_label') or 'External API'}`\n"
            f"Endpoint: `{ext_cfg.get('endpoint_url')}`\n"
            f"Modell: `{ext_cfg.get('model')}`"
        )
    else:
        await ctx.send(
            f"Unbekannter Provider: `{provider}`\n"
            "Verfuegbare Provider: `ollama`, `gemini`, `external`"
        )


@bot.command(name="change_ollama_model")
@commands.has_role("Admin")
async def change_ollama_model(ctx: commands.Context, model: Optional[str] = None):
    """Change the Ollama model being used"""
    global OLLAMA_MODEL
    
    if not model:
        current = OLLAMA_MODEL
        await ctx.send(
            f"Aktuelles Ollama-Modell: `{current}`\n"
            "Verfuegbare Modelle auf deinem PC:\n"
            "- gemma3:12b (empfohlen)\n"
            "- llama3.2\n"
            "- mistral\n"
            "- phi3\n"
            "- llama3.1\n"
            "\nNutze: `Eco change_ollama_model gemma3:12b`"
        )
        return
    
    model_clean = model.strip()
    
    # Verify the model exists by checking Ollama
    if not _check_ollama_available():
        await ctx.send(
            "Ollama ist nicht verfuegbar! Bitte stelle sicher, dass Ollama laeuft.\n"
            "Starte Ollama mit: `ollama serve`"
        )
        return
    
    # Try to use the model (Ollama will error if model doesn't exist)
    test_url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        req = urllib.request.Request(url=test_url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            model_names = [m.get("name", "").split(":")[0] for m in models]
            
            # Check if requested model exists
            model_base = model_clean.split(":")[0]
            if not any(model_base in m for m in model_names):
                available = ", ".join([m.get("name", "") for m in models[:10]])
                await ctx.send(
                    f"Modell `{model_clean}` nicht gefunden!\n"
                    f"Verfuegbare Modelle: {available}\n"
                    "Lade ein neues Modell mit: `ollama pull <name>`"
                )
                return
    except Exception as e:
        await ctx.send(f"Fehler beim Pruefen der Modelle: {e}")
        return
    
    OLLAMA_MODEL = model_clean
    persist_ai_runtime_config()
    await ctx.send(
        f"Ollama-Modell geaendert zu: `{OLLAMA_MODEL}`\n"
        "Das neue Modell wird bei der naechsten KI-Anfrage verwendet."
    )


@bot.command(name="language")
async def language(ctx: commands.Context, mode: Optional[str] = None):
    global LANGUAGE_MODE
    if not mode:
        current = LANGUAGE_MODE
        await ctx.send(
            f"Sprachmodus: `{current}`. Beispiele: `Eco language auto`, `Eco language en`, `Eco language de`."
        )
        return

    mode_clean = mode.strip().lower()
    if mode_clean == "auto":
        LANGUAGE_MODE = "auto"
        await ctx.send(
            "Sprachmodus auf `auto` gesetzt. Antworten folgen automatisch der Nutzersprache."
        )
        return

    # 2-5 Zeichen fuer Sprachcodes wie en, de, fr, es, pt-br.
    if 2 <= len(mode_clean) <= 5 and all(ch.isalpha() or ch == "-" for ch in mode_clean):
        LANGUAGE_MODE = mode_clean
        await ctx.send(f"Sprachmodus fest gesetzt: `{LANGUAGE_MODE}`.")
        return

    await ctx.send("Ungueltiger Sprachmodus. Nutze `auto` oder ein Sprachkuerzel wie `en`, `de`, `fr`.")


@bot.command(name="codehelp")
async def codehelp_command(ctx: commands.Context, *, question: Optional[str] = None):
    if question:
        await answer_code_question(ctx.channel, question)
        return
    prompt_msg = await ctx.send(
        "Stelle deine Code-Frage als Antwort auf diese Nachricht."
    )
    help_tracker[prompt_msg.id] = {"user_id": ctx.author.id, "mode": "codehelp"}


# **NPC-VERWALTUNG KATEGORIE**
# Unterkapitel: NPCs erstellen, bearbeiten, loeschen und listen.
@bot.command(name="create_npc")
@commands.has_role("Admin")
async def create_npc(ctx: commands.Context, name: str, npc_type: str, *, prompt: str):
    raw_type = str(npc_type or "").strip().lower()
    if raw_type in {"state", "staat", "country", "nation", "npc_state", "state_npc"}:
        await ctx.send(
            "Wenn du einen Staat erstellen willst, nutze bitte "
            "`Eco create_state <Name>` statt `Eco create_npc`."
        )
        return
    npc_type = normalize_npc_type(npc_type)
    if npc_type not in VALID_NPC_TYPES:
        await ctx.send("`npc_type` muss `character` oder `group` sein.")
        return
    if name in npc_profiles:
        await ctx.send(f"NPC `{name}` existiert bereits.")
        return

    npc_profiles[name] = {"type": npc_type, "prompt": prompt, "icon_url": ""}
    save_npc_profiles()
    await ctx.send(
        f"NPC `{name}` erstellt. Typ: `{npc_type}`.\n"
        "Setze optional ein Bild mit: `Eco edit_npc_avatar <Name> <URL>`\n"
        "Hinweis: Fuer Staaten bitte `Eco create_state <Name>` verwenden."
    )


@bot.command(name="delete_npc")
@commands.has_role("Admin")
async def delete_npc(ctx: commands.Context, name: str):
    if name not in npc_profiles:
        await ctx.send(f"NPC `{name}` existiert nicht.")
        return

    del npc_profiles[name]
    save_npc_profiles()

    keys_to_remove = [key for key in webhook_cache if key[1] == name]
    for key in keys_to_remove:
        del webhook_cache[key]

    deleted_count = 0
    for channel in ctx.guild.text_channels:
        try:
            for wh in await channel.webhooks():
                if wh.name == f"NPC Webhook - {name}":
                    await wh.delete()
                    deleted_count += 1
        except discord.DiscordException:
            pass

    await ctx.send(f"NPC `{name}` wurde geloescht. Entfernte Webhooks: {deleted_count}.")


@bot.command(name="edit_npc_avatar")
@commands.has_role("Admin")
async def edit_npc_avatar(ctx: commands.Context, name: str, icon_url: str):
    if name not in npc_profiles:
        await ctx.send(f"NPC `{name}` existiert nicht.")
        return

    npc_profiles[name]["icon_url"] = icon_url
    save_npc_profiles()

    keys_to_remove = [key for key in webhook_cache if key[1] == name]
    for key in keys_to_remove:
        del webhook_cache[key]

    await ctx.send(f"Avatar von `{name}` aktualisiert.")


@bot.command(name="edit_npc_profile")
@commands.has_role("Admin")
async def edit_npc_profile(ctx: commands.Context, name: str, *, new_prompt: str):
    if name not in npc_profiles:
        await ctx.send(f"NPC `{name}` existiert nicht.")
        return

    npc_profiles[name]["prompt"] = new_prompt
    save_npc_profiles()
    await ctx.send(f"Profil von `{name}` aktualisiert.")


@bot.command(name="delete_memory")
async def delete_memory(ctx: commands.Context, npc_name: str):
    if npc_name not in npc_memory:
        await ctx.send(f"Kein Memory fuer `{npc_name}` gefunden.")
        return

    del npc_memory[npc_name]
    save_memory()
    await ctx.send(f"Memory fuer `{npc_name}` geloescht.")


@bot.command(name="list_npcs")
async def list_npcs(ctx: commands.Context):
    if not npc_profiles:
        await ctx.send("Es sind derzeit keine NPCs definiert.")
        return

    lines = ["Aktuelle NPCs:"]
    for name, data in npc_profiles.items():
        npc_type = data.get("type", "unbekannt")
        icon_url = data.get("icon_url") or "-"
        lines.append(f"- {name} (Typ: {npc_type}) | Avatar: {icon_url}")
    await ctx.send("\n".join(lines))


@bot.command(name="relics")
async def relics(ctx: commands.Context):
    lines = ["Welt-Relikte:"]
    holders = relic_data.get("holders", {})
    for relic in relic_data.get("relics", []):
        rid = relic.get("id", "-")
        owner = holders.get(rid, "niemand")
        lines.append(
            f"- {relic.get('name', rid)} [{relic.get('rarity', 'mystisch')}]: Besitzer `{owner}`"
        )

    if relic_data.get("history"):
        lines.append("")
        lines.append("Letzte Transfers:")
        for h in relic_data["history"][-8:]:
            lines.append(
                f"- {h.get('relic_name', h.get('relic_id', '-'))}: "
                f"{h.get('from') or 'Welt'} -> {h.get('to', '-')}"
            )
    await ctx.send("\n".join(lines))


# **LORE KATEGORIE**
# Unterkapitel: Weltbeschreibung, Events und Regeln pflegen.
@bot.command(name="set_lore")
@commands.has_role("Admin")
async def set_lore(ctx: commands.Context, *, text: str):
    lore_data["description"] = text
    save_lore()
    await ctx.send("Allgemeine Weltbeschreibung aktualisiert.")


@bot.command(name="edit_lore")
@commands.has_role("Admin")
async def edit_lore(ctx: commands.Context, *, text: str):
    lore_data["description"] = text
    save_lore()
    await ctx.send("Allgemeine Weltbeschreibung bearbeitet.")


@bot.command(name="add_event")
@commands.has_role("Admin")
async def add_event(ctx: commands.Context, *, event: str):
    lore_data["events"].append(event)
    save_lore()
    await ctx.send(f"Ereignis hinzugefuegt: {event}")


@bot.command(name="remove_event")
@commands.has_role("Admin")
async def remove_event(ctx: commands.Context, *, event: str):
    if event not in lore_data["events"]:
        await ctx.send(f"Ereignis nicht gefunden: {event}")
        return

    lore_data["events"].remove(event)
    save_lore()
    await ctx.send(f"Ereignis entfernt: {event}")


@bot.command(name="add_rule")
@commands.has_role("Admin")
async def add_rule(ctx: commands.Context, *, rule: str):
    lore_data["rules"].append(rule)
    save_lore()
    await ctx.send(f"Regel hinzugefuegt: {rule}")


@bot.command(name="remove_rule")
@commands.has_role("Admin")
async def remove_rule(ctx: commands.Context, *, rule: str):
    if rule not in lore_data["rules"]:
        await ctx.send(f"Regel nicht gefunden: {rule}")
        return

    lore_data["rules"].remove(rule)
    save_lore()
    await ctx.send(f"Regel entfernt: {rule}")


@bot.command(name="view_lore")
async def view_lore(ctx: commands.Context):
    msg = build_lore_overview_text()
    await send_long_message(ctx.channel, msg)


@bot.command(name="conversation_npcs")
async def conversation_npcs(
    ctx: commands.Context, npc1: str, npc2: str, turns: int, *, topic: Optional[str] = None
):
    global npc_conversation_running

    if npc_conversation_running:
        await ctx.send("Es laeuft bereits eine NPC-Konversation.")
        return
    if npc1 not in npc_profiles or npc2 not in npc_profiles:
        await ctx.send("Mindestens einer der NPCs existiert nicht.")
        return
    if turns <= 0:
        await ctx.send("`turns` muss groesser als 0 sein.")
        return

    npc_conversation_running = True
    try:
        await ctx.send(f"Starte Konversation zwischen `{npc1}` und `{npc2}` ({turns} Zuege pro NPC).")
        current_speaker = npc1
        other_npc = npc2
        last_message = topic if topic else f"{current_speaker} beginnt das Gespraech."

        for _ in range(turns * 2):
            try:
                reply = await ask_npc_progressive(current_speaker, last_message, current_speaker, ctx.channel)
                await send_npc_reply(ctx.channel, current_speaker, reply)
                await maybe_store_npc_event_in_lore(
                    npc_name=current_speaker,
                    npc_output=reply,
                    channel_name=ctx.channel.name,
                    source="conversation_npcs",
                )
                last_message = reply
                current_speaker, other_npc = other_npc, current_speaker
                await asyncio.sleep(0.8)
            except RuntimeError as err:
                await ctx.send(f"Konversation pausiert (KI-Limit): {err}")
                break

        await ctx.send("NPC-Konversation beendet.")
    finally:
        npc_conversation_running = False


# **ERROR-HANDLING KATEGORIE**
# Unterkapitel: Zentrale Behandlung von Command-Fehlern.
@bot.event
async def on_command_error(ctx: commands.Context, error):
    if getattr(ctx, "_runtime_scope_lock_acquired", False):
        try:
            save_active_scope_all()
        except Exception:
            pass
        if runtime_scope_lock.locked():
            runtime_scope_lock.release()
        setattr(ctx, "_runtime_scope_lock_acquired", False)
    if isinstance(error, commands.MissingRole):
        await ctx.send(
            "Dir fehlen Admin-Rechte fuer diesen Command. "
            "Erlaubt sind Guild-Administrator, eine konfigurierte Admin-Rolle oder eine Rolle namens `Admin`."
        )
        return
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("Fehlende Argumente. Nutze `Eco help` fuer Hilfe.")
        return
    if isinstance(error, commands.CheckFailure):
        await ctx.send(str(error))
        return
    if isinstance(error, commands.CommandNotFound):
        return
    await ctx.send(f"Fehler: {error}")
