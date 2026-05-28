# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **PROFILE KATEGORIE**
# Unterkapitel: Entity-Profile ansehen, setzen und mit States verlinken.
@econ_group.group(name="profile", invoke_without_command=True)
async def econ_profile(ctx: commands.Context):
    await ctx.send(
        "Profile:\n"
        "- `Eco econ profile view <entity_id|name>`\n"
        "- `Eco econ profile set <entity_id|name> | <state> | <territory> | <city> | <beschreibung> | [image_url]`\n"
        "- `Eco econ profile link_state <entity> <state_entity>`\n"
        "- `Eco econ state_profile_set <state_entity|name> | <state> | <territory> | <city> | <beschreibung> | [emblem_url]`\n"
        "- `Eco econ success view <entity>`\n"
        "- `Eco econ success set <entity> | <feld> | <wert 0-100>`\n"
        "- `Eco econ company_types`\n"
        "- `Eco econ company_ops_set <entity> | <stil> | [unterkategorie]`\n"
        "- `Eco econ insurance ...`\n"
        "Alternativ Bild als Attachment im selben Command senden."
    )


def _resolve_entity_id(input_value: str) -> Optional[str]:
    raw = str(input_value).strip()
    if raw in economy_data.get("entities", {}):
        return raw
    found = find_entity_by_name(raw)
    if found:
        return str(found["id"])
    return None


def _resolve_product_id_ref(input_value: str) -> Optional[str]:
    raw = str(input_value or "").strip()
    if not raw:
        return None
    if raw in economy_data.get("products", {}):
        return raw
    lowered = raw.lower()
    for product_id, product in economy_data.get("products", {}).items():
        if str(product.get("name", "")).strip().lower() == lowered:
            return str(product_id)
    return None


def _can_edit_entity_success(ctx: commands.Context, entity: Optional[dict]) -> bool:
    if not entity:
        return False
    if user_has_admin_role(ctx.author):
        return True
    entity_type = str(entity.get("type", "")).lower()
    if entity_type == "state":
        state_chief_role_id = get_econ_setting_int("state_chief_role_id")
        return user_has_role_id(ctx.author, state_chief_role_id)
    return int(entity.get("owner_user_id") or 0) == ctx.author.id


def _company_subtype_help_lines() -> list[str]:
    lines = []
    for key, preset in sorted((COMPANY_SUBTYPE_PRESETS or {}).items()):
        rec = ", ".join(preset.get("recommended_insurance", []) or []) or "-"
        lines.append(f"- {key}: {preset.get('label', key)} | Empfohlen: {rec}")
    return lines or ["- Keine Unterkategorien definiert."]


def _collect_manageable_accounts(member: discord.abc.User) -> list[tuple[str, str, dict]]:
    refs: list[tuple[str, str, dict]] = []
    seen: set[str] = set()

    player_entity_id, _ = get_or_create_player_entity(member.id, member.display_name)

    for entity_id in [player_entity_id] + list(economy_data.get("entities", {}).keys()):
        entity_id = str(entity_id)
        if entity_id in seen:
            continue
        if entity_id != player_entity_id and not can_user_manage_entity(member, entity_id):
            continue
        seen.add(entity_id)
        for account_id in get_entity_account_ids(entity_id):
            acc = get_account(account_id)
            if not acc:
                continue
            refs.append((entity_id, str(account_id), acc))
    return refs


def _resolve_actor_account(
    member: discord.abc.User,
    account_selector: Optional[str],
) -> tuple[Optional[str], Optional[str], Optional[dict], str]:
    player_entity_id, player_private_account_id = get_or_create_player_entity(member.id, member.display_name)
    if not account_selector:
        acc = get_account(player_private_account_id)
        return player_entity_id, player_private_account_id, acc, ""

    selector = str(account_selector).strip()
    if not selector:
        acc = get_account(player_private_account_id)
        return player_entity_id, player_private_account_id, acc, ""

    # Schnellzugriff ueber Kontotyp-Keyword.
    selector_type = normalize_account_type(selector, fallback="")
    if selector_type in {"private", "company", "savings", "state", "npc", "bank", "general"}:
        refs = [
            (eid, aid, acc)
            for eid, aid, acc in _collect_manageable_accounts(member)
            if normalize_account_type(acc.get("account_type"), fallback="general") == selector_type
        ]
        if selector_type == "private":
            acc = get_account(player_private_account_id)
            return player_entity_id, player_private_account_id, acc, ""
        if len(refs) == 1:
            return refs[0][0], refs[0][1], refs[0][2], ""
        if len(refs) > 1:
            names = ", ".join(str(acc.get("name", aid)) for _, aid, acc in refs[:8])
            return None, None, None, f"Mehrere Konten fuer Typ `{selector_type}` gefunden: {names}. Bitte Namen angeben."

    # Direkte Account-ID.
    acc_by_id = get_account(selector)
    if acc_by_id:
        entity_id = str(acc_by_id.get("entity_id", ""))
        if can_user_manage_entity(member, entity_id):
            return entity_id, str(selector), acc_by_id, ""
        return None, None, None, "Keine Berechtigung fuer dieses Konto."

    # Konto per Name `Typ-Inhaber`.
    entity_id, account_id = find_manageable_account_by_name(member, selector)
    if entity_id and account_id:
        acc = get_account(account_id)
        return entity_id, account_id, acc, ""

    # Fallback: Entity-Ref -> primaeres Konto.
    maybe_entity_id = _resolve_entity_id(selector)
    if maybe_entity_id:
        if not can_user_manage_entity(member, maybe_entity_id):
            return None, None, None, "Keine Berechtigung fuer diese Entitaet."
        account_id = get_primary_account_id(maybe_entity_id)
        if not account_id:
            return None, None, None, "Entitaet hat kein Konto."
        return maybe_entity_id, account_id, get_account(account_id), ""

    candidates = _collect_manageable_accounts(member)
    hint = ", ".join(str(acc.get("name", aid)) for _, aid, acc in candidates[:10]) or "-"
    return None, None, None, f"Konto nicht gefunden. Verfuegbare Konten: {hint}"


@econ_profile.command(name="view")
async def econ_profile_view(ctx: commands.Context, *, entity_ref: str):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity:
        await ctx.send("Entitaet nicht gefunden.")
        return
    ensure_entity_profile_structure(entity)
    if str(entity.get("type", "")).lower() == "state":
        text = build_state_profile_text(entity_id)
        image_url = entity.get("profile", {}).get("emblem_url", "") or entity.get("profile", {}).get("image_url", "")
    else:
        text = build_company_profile_text(entity_id)
        image_url = entity.get("profile", {}).get("image_url", "")
    if image_url and image_url.startswith(("http://", "https://")):
        embed = discord.Embed(description=text)
        embed.set_image(url=image_url)
        await ctx.send(embed=embed)
        return
    await ctx.send(text)


@econ_profile.command(name="set")
async def econ_profile_set(ctx: commands.Context, *, payload: str):
    # Format: entity | state | territory | city | description
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 5:
        await ctx.send(
            "Format: `Eco econ profile set <entity> | <state> | <territory> | <city> | <beschreibung> | [image_url]`"
        )
        return
    entity_id = _resolve_entity_id(parts[0])
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    owner_ok = user_has_admin_role(ctx.author) or (entity and int(entity.get("owner_user_id") or 0) == ctx.author.id)
    if not owner_ok:
        await ctx.send("Nur Eigentuemer oder Admin darf dieses Profil bearbeiten.")
        return
    image_url = parts[5] if len(parts) > 5 else ""
    if not image_url and ctx.message.attachments:
        image_url = ctx.message.attachments[0].url
    set_entity_profile(
        entity_id,
        description=parts[4],
        state=parts[1],
        territory=parts[2],
        city=parts[3],
        image_url=image_url if image_url else None,
    )
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, entity_id)
    await ctx.send("Profil aktualisiert.")


@econ_profile.command(name="link_state")
async def econ_profile_link_state(ctx: commands.Context, entity_ref: str, *, state_ref: str):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    state_entity_id = _resolve_entity_id(state_ref)
    if not state_entity_id:
        await ctx.send("State-Entitaet nicht gefunden.")
        return
    state_entity = get_entity(state_entity_id)
    if not state_entity or str(state_entity.get("type", "")).lower() != "state":
        await ctx.send("Ziel ist kein State.")
        return
    entity = get_entity(entity_id)
    owner_ok = user_has_admin_role(ctx.author) or (entity and int(entity.get("owner_user_id") or 0) == ctx.author.id)
    if not owner_ok:
        await ctx.send("Nur Eigentuemer oder Admin darf verlinken.")
        return
    set_entity_profile(entity_id, state=state_entity.get("name", ""), state_entity_id=state_entity_id)
    await ctx.send(f"State-Verknuepfung gesetzt: {entity.get('name')} -> {state_entity.get('name')}")


@econ_group.command(name="state_profile_set")
@commands.has_role("Admin")
async def econ_state_profile_set(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 5:
        await ctx.send(
            "Format: `Eco econ state_profile_set <state_entity> | <state> | <territory> | <city> | <beschreibung> | [emblem_url]`"
        )
        return
    entity_id = _resolve_entity_id(parts[0])
    if not entity_id:
        await ctx.send("Staats-Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity or str(entity.get("type", "")).lower() != "state":
        await ctx.send("Das Ziel muss eine Entitaet vom Typ `state` sein.")
        return
    emblem_url = parts[5] if len(parts) > 5 else ""
    if not emblem_url and ctx.message.attachments:
        emblem_url = ctx.message.attachments[0].url
    set_entity_profile(
        entity_id=entity_id,
        state=parts[1],
        territory=parts[2],
        city=parts[3],
        description=parts[4],
        emblem_url=emblem_url if emblem_url else None,
    )
    await ctx.send("Staatsprofil aktualisiert.")


@econ_group.group(name="success", invoke_without_command=True)
async def econ_success(ctx: commands.Context):
    await ctx.send(
        "Erfolg & Produktionslage:\n"
        "- `Eco econ success view <entity_id|name>`\n"
        "- `Eco econ success set <entity> | <feld> | <wert 0-100>`"
    )


@econ_success.command(name="view")
async def econ_success_view(ctx: commands.Context, *, entity_ref: str):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity:
        await ctx.send("Entitaet nicht gefunden.")
        return
    metrics = compute_entity_success_metrics(entity_id)
    factors = ensure_entity_success_factors(entity)
    lines = [f"**Erfolgsprofil: {entity.get('name', entity_id)}**"]
    lines.append(f"- Typ: {entity.get('type', '-')}")
    lines.append(f"- Erfolgswert: {float(metrics.get('score', 0.0)):.2f}/100 ({metrics.get('label', '-')})")
    lines.append(f"- Produktionsfaktor: x{float(metrics.get('production_multiplier', 1.0)):.2f}")
    lines.append(f"- Ausfallrisiko: {float(metrics.get('failure_risk_pct', 0.0)):.2f}%")
    if str(entity.get("type", "")).lower() == "state":
        lines.append(f"- Treasury-Health: {float(metrics.get('treasury_health', 0.0)):.2f}")
        lines.append(f"- Steuerdruck: {float(metrics.get('tax_pressure', 0.0)):.2f}")
    else:
        lines.append(f"- Finanzgesundheit: {float(metrics.get('financial_health', 0.0)):.2f}")
        lines.append(f"- Schulden-Druck: {float(metrics.get('debt_pressure', 0.0)):.2f}")
        lines.append(f"- Staatsklima: {float(metrics.get('state_climate', 0.0)):.2f}")
    lines.append("- Faktoren:")
    for key, value in factors.items():
        lines.append(f"  {SUCCESS_FACTOR_LABELS.get(key, key)}: {float(value):.2f}")
    await ctx.send("\n".join(lines))


@econ_success.command(name="set")
async def econ_success_set(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send("Format: `Eco econ success set <entity> | <feld> | <wert 0-100>`")
        return
    entity_id = _resolve_entity_id(parts[0])
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity:
        await ctx.send("Entitaet nicht gefunden.")
        return
    if not _can_edit_entity_success(ctx, entity):
        await ctx.send("Nur Eigentuemer, State-Chief oder Admin darf diese Erfolgsfaktoren aendern.")
        return
    try:
        value = float(parts[2].replace(",", "."))
    except Exception:
        await ctx.send("Ungueltiger Wert.")
        return
    ok, msg = set_entity_success_factor(entity_id, parts[1], value)
    await ctx.send(msg)


@econ_group.command(name="tax_set")
async def econ_tax_set(
    ctx: commands.Context,
    state_ref: str,
    person_pct: float,
    company_pct: float,
    npc_pct: float = 0.0,
):
    state_chief_role_id = get_econ_setting_int("state_chief_role_id")
    if not (user_has_admin_role(ctx.author) or user_has_role_id(ctx.author, state_chief_role_id)):
        await ctx.send("Nur Admin oder State-Chief darf Steuern setzen.")
        return

    state_entity_id = _resolve_entity_id(state_ref)
    if not state_entity_id:
        await ctx.send("Staat nicht gefunden.")
        return
    state_entity = get_entity(state_entity_id)
    if not state_entity or str(state_entity.get("type", "")).lower() != "state":
        await ctx.send("Ziel muss eine State-Entitaet sein.")
        return

    person_pct = clamp(float(person_pct), 0.0, 100.0)
    company_pct = clamp(float(company_pct), 0.0, 100.0)
    npc_pct = clamp(float(npc_pct), 0.0, 100.0)

    ensure_entity_profile_structure(state_entity)
    state_entity["profile"]["tax_pct_person"] = round(person_pct, 2)
    state_entity["profile"]["tax_pct_company"] = round(company_pct, 2)
    state_entity["profile"]["tax_pct_npc"] = round(npc_pct, 2)
    save_economy()
    await ctx.send(
        f"Steuern fuer {state_entity.get('name')} gesetzt: "
        f"Person {person_pct:.2f}% | Firma {company_pct:.2f}% | NPC {npc_pct:.2f}%"
    )


@econ_group.command(name="company_forum_create")
@commands.has_role("Admin")
async def econ_company_forum_create(ctx: commands.Context, *, entity_ref: str):
    if ctx.guild is None:
        await ctx.send("Nur auf einem Server verfuegbar.")
        return
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Unternehmen nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity or str(entity.get("type", "")).lower() != "company":
        await ctx.send("Die automatische Firmenstruktur ist aktuell nur fuer Unternehmen verfuegbar.")
        return
    ok, msg = await ensure_company_discord_structure(ctx.guild, entity_id)
    await ctx.send(msg)


@econ_group.command(name="company_types")
async def econ_company_types(ctx: commands.Context):
    await ctx.send("Unterkategorien fuer Firmen:\n" + "\n".join(_company_subtype_help_lines()))


@econ_group.command(name="company_ops_set")
async def econ_company_ops_set(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 2:
        await ctx.send("Format: `Eco econ company_ops_set <entity> | <fuehrungsstil> | [unterkategorie]`")
        return
    entity_id = _resolve_entity_id(parts[0])
    if not entity_id:
        await ctx.send("Unternehmen nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity or str(entity.get("type", "")).lower() != "company":
        await ctx.send("Ziel muss ein Unternehmen sein.")
        return
    if not can_user_manage_entity(ctx.author, entity_id):
        await ctx.send("Nur Eigentuemer oder Admin darf die Firmenparameter setzen.")
        return
    ensure_entity_profile_structure(entity)
    leadership_style = parts[1].strip().lower() or "ausgewogen"
    subtype = parts[2].strip().lower() if len(parts) > 2 else ""
    entity["profile"]["leadership_style"] = leadership_style[:60]
    if subtype:
        entity["profile"]["company_subtype"] = subtype[:60]
    save_economy()
    await ctx.send(
        f"Firmenparameter aktualisiert: `{entity.get('name')}` | Stil `{leadership_style}` | "
        f"Unterkategorie `{entity['profile'].get('company_subtype') or '-'}`"
    )


@econ_group.group(name="insurance", invoke_without_command=True)
async def econ_insurance(ctx: commands.Context):
    await ctx.send(
        "Versicherungen:\n"
        "- `Eco econ insurance types [unterkategorie]`\n"
        "- `Eco econ insurance mine [entity]`\n"
        "- `Eco econ insurance buy <entity> <policy_type>`\n"
        "- `Eco econ insurance cancel <policy_id>`"
    )


@econ_insurance.command(name="types")
async def econ_insurance_types(ctx: commands.Context, *, subtype: str = ""):
    subtype_key = str(subtype or "").strip().lower()
    lines = ["**Versicherungstypen**"]
    for key, preset in sorted((INSURANCE_POLICY_PRESETS or {}).items()):
        lines.append(
            f"- {key}: {preset.get('label', key)} | Praemie/Zug {float(preset.get('premium_per_turn', 0.0)):.2f} | "
            f"Limit {float(preset.get('coverage_limit', 0.0)):.2f}"
        )
    if subtype_key:
        preset = (COMPANY_SUBTYPE_PRESETS or {}).get(subtype_key)
        if preset:
            rec = ", ".join(preset.get("recommended_insurance", []) or []) or "-"
            lines.append("")
            lines.append(f"Empfehlung fuer `{subtype_key}`: {rec}")
    await ctx.send("\n".join(lines))


@econ_insurance.command(name="mine")
async def econ_insurance_mine(ctx: commands.Context, *, entity_ref: str = ""):
    if entity_ref.strip():
        entity_id = _resolve_entity_id(entity_ref)
        if not entity_id:
            await ctx.send("Entitaet nicht gefunden.")
            return
    else:
        entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    entity = get_entity(entity_id)
    if entity and str(entity.get("type", "")).lower() == "company" and not can_user_manage_entity(ctx.author, entity_id):
        await ctx.send("Keine Berechtigung fuer diese Firmenversicherung.")
        return
    await ctx.send(build_insurance_overview_text(entity_id))


@econ_insurance.command(name="buy")
async def econ_insurance_buy(ctx: commands.Context, entity_ref: str, policy_type: str):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if not entity or str(entity.get("type", "")).lower() != "company":
        await ctx.send("Versicherungen koennen aktuell nur fuer Unternehmen abgeschlossen werden.")
        return
    if not can_user_manage_entity(ctx.author, entity_id):
        await ctx.send("Nur Eigentuemer oder Admin darf diese Versicherung abschliessen.")
        return
    ok, msg = issue_insurance_policy(entity_id, policy_type)
    await ctx.send(msg)


@econ_insurance.command(name="cancel")
async def econ_insurance_cancel(ctx: commands.Context, policy_id: str):
    policy = (economy_data.get("insurances", {}) or {}).get(str(policy_id))
    if not policy:
        await ctx.send("Versicherung nicht gefunden.")
        return
    insured_entity_id = str(policy.get("insured_entity_id"))
    if not can_user_manage_entity(ctx.author, insured_entity_id):
        await ctx.send("Nur Eigentuemer oder Admin darf diese Versicherung beenden.")
        return
    ok, msg = cancel_insurance_policy(policy_id)
    await ctx.send(msg)


# **SHOP/PRODUKTE KATEGORIE**
# Unterkapitel: Kategorien, Produkte, Inventar und Shop-Navigation.
@econ_group.command(name="category_list")
async def econ_category_list(ctx: commands.Context):
    cats = economy_data.get("market_categories", [])
    await ctx.send("Kategorien:\n" + "\n".join(f"- {c}" for c in cats))


@econ_group.command(name="category_add")
@commands.has_role("Admin")
async def econ_category_add(ctx: commands.Context, *, category: str):
    cat = normalize_category(category)
    if not cat:
        await ctx.send("Kategorie darf nicht leer sein.")
        return
    cats = economy_data.setdefault("market_categories", [])
    if cat not in cats:
        cats.append(cat)
        save_economy()
    await ctx.send(f"Kategorie aktiv: `{cat}`")


@econ_group.command(name="product_create_admin")
@commands.has_role("Admin")
async def econ_product_create_admin(ctx: commands.Context, category: str, price: float, *, payload: str):
    cat = normalize_category(category)
    if not category_exists(cat):
        await ctx.send("Kategorie nicht vorhanden. `Eco econ category_list`")
        return
    parts = [p.strip() for p in payload.split("|")]
    name = parts[0] if parts else ""
    description = parts[1] if len(parts) > 1 else ""
    image_url = parts[2] if len(parts) > 2 else ""
    if not image_url and ctx.message.attachments:
        image_url = ctx.message.attachments[0].url
    manufacturer_id = None
    if len(parts) > 3 and parts[3]:
        manufacturer_id = _resolve_entity_id(parts[3])
    owner_entity_id, _ = ensure_entity_and_account("Staat", "state", 800000.0)
    pid = create_product(
        owner_entity_id,
        cat,
        name,
        price,
        is_state_offer=(cat == "public_state_offers"),
        description=description,
        image_url=image_url,
        manufacturer_entity_id=manufacturer_id or owner_entity_id,
    )
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, owner_entity_id)
        if manufacturer_id:
            await sync_company_forum_posts(ctx.guild, manufacturer_id)
    response_lines = [f"Produkt erstellt: #{pid} `{name}` ({cat}) @ {format_money(price)}"]
    if description.strip():
        _, ai_msg = await infer_and_apply_product_recipe_from_description(pid, allow_overwrite=False)
        response_lines.append(f"Rezept-KI: {ai_msg}")
    await ctx.send("\n".join(response_lines))


@econ_group.command(name="product_create")
async def econ_product_create(ctx: commands.Context, category: str, price: float, *, payload: str):
    role_id = get_econ_setting_int("entrepreneur_role_id")
    if not user_has_role_id(ctx.author, role_id):
        await ctx.send("Du brauchst die Entrepreneur-Rolle fuer Produkt-Erstellung.")
        return
    cat = normalize_category(category)
    if not category_exists(cat):
        await ctx.send("Kategorie nicht vorhanden. `Eco econ category_list`")
        return
    parts = [p.strip() for p in payload.split("|")]
    name = parts[0] if parts else ""
    description = parts[1] if len(parts) > 1 else ""
    image_url = parts[2] if len(parts) > 2 else ""
    if not image_url and ctx.message.attachments:
        image_url = ctx.message.attachments[0].url
    manufacturer_id = None
    if len(parts) > 3 and parts[3]:
        manufacturer_id = _resolve_entity_id(parts[3])
    entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    pid = create_product(
        entity_id,
        cat,
        name,
        price,
        is_state_offer=False,
        description=description,
        image_url=image_url,
        manufacturer_entity_id=manufacturer_id or entity_id,
    )
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, entity_id)
        if manufacturer_id:
            await sync_company_forum_posts(ctx.guild, manufacturer_id)
    response_lines = [f"Dein Produkt erstellt: #{pid} `{name}` ({cat}) @ {format_money(price)}"]
    if description.strip():
        _, ai_msg = await infer_and_apply_product_recipe_from_description(pid, allow_overwrite=False)
        response_lines.append(f"Rezept-KI: {ai_msg}")
    await ctx.send("\n".join(response_lines))


@econ_group.command(name="products")
async def econ_products(ctx: commands.Context, category: Optional[str] = None):
    cat_filter = normalize_category(category) if category else None
    rows = []
    for product in economy_data.get("products", {}).values():
        if not product.get("active", True):
            continue
        if cat_filter and normalize_category(product.get("category", "")) != cat_filter:
            continue
        rows.append(
            f"- #{product['id']} {product['name']} | {product['category']} | "
            f"{float(product['base_price']):.2f} ECO | Hersteller: {get_entity_name(product.get('manufacturer_entity_id'))}"
        )
    if not rows:
        await ctx.send("Keine Produkte gefunden.")
        return
    await ctx.send("Produkte:\n" + "\n".join(rows[:60]))


@econ_group.command(name="product_view")
async def econ_product_view(ctx: commands.Context, product_id: str):
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    text = build_product_profile_text(product_id)
    image_url = product.get("image_url", "")
    if image_url and image_url.startswith(("http://", "https://")):
        embed = discord.Embed(description=text)
        embed.set_image(url=image_url)
        await ctx.send(embed=embed)
        return
    await ctx.send(text)


@econ_group.command(name="product_profile_set")
async def econ_product_profile_set(ctx: commands.Context, product_id: str, *, payload: str):
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    owner_entity = get_entity(owner_entity_id)
    owner_ok = user_has_admin_role(ctx.author) or (
        owner_entity and int(owner_entity.get("owner_user_id") or 0) == ctx.author.id
    )
    if not owner_ok:
        await ctx.send("Nur Produktanbieter oder Admin darf dieses Profil aendern.")
        return

    parts = [p.strip() for p in payload.split("|")]
    description = parts[0] if parts else ""
    image_url = parts[1] if len(parts) > 1 else ""
    manufacturer_ref = parts[2] if len(parts) > 2 else ""

    if not image_url and ctx.message.attachments:
        image_url = ctx.message.attachments[0].url
    manufacturer_id = _resolve_entity_id(manufacturer_ref) if manufacturer_ref else None

    product["description"] = description[:1200]
    if image_url:
        product["image_url"] = image_url[:500]
    if manufacturer_id:
        product["manufacturer_entity_id"] = manufacturer_id
    ensure_product_structure(product)
    save_economy()
    response_lines = ["Produktprofil aktualisiert."]
    if description.strip():
        allow_ai_refresh = not product_has_recipe(product) or str(product.get("recipe_source", "")).lower() == "ai"
        _, ai_msg = await infer_and_apply_product_recipe_from_description(product_id, allow_overwrite=allow_ai_refresh)
        response_lines.append(f"Rezept-KI: {ai_msg}")
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, owner_entity_id)
        if manufacturer_id:
            await sync_company_forum_posts(ctx.guild, manufacturer_id)
    await ctx.send("\n".join(response_lines))


@econ_group.command(name="recipe_set")
async def econ_recipe_set(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send(
            "Format: `Eco econ recipe_set <produkt_id|name> | <output_qty> | <zutat>:<qty>, <zutat>:<qty>`"
        )
        return

    product_id = _resolve_product_id_ref(parts[0])
    if not product_id:
        await ctx.send("Produkt nicht gefunden.")
        return
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    if not can_user_manage_entity(ctx.author, owner_entity_id):
        await ctx.send("Nur Anbieter/Eigentuemer oder Admin darf Rezepte setzen.")
        return

    try:
        output_qty = max(1, int(float(parts[1].replace(",", "."))))
    except Exception:
        await ctx.send("Ungueltige Ausgabemenge.")
        return

    recipe_inputs = []
    for raw_item in parts[2].split(","):
        item = raw_item.strip()
        if not item:
            continue
        if ":" not in item:
            await ctx.send(f"Ungueltiger Rezeptteil `{item}`. Format ist `<zutat>:<qty>`.")
            return
        ingredient_ref, qty_text = [x.strip() for x in item.split(":", 1)]
        ingredient_id = _resolve_product_id_ref(ingredient_ref)
        if not ingredient_id:
            await ctx.send(f"Zutat nicht gefunden: `{ingredient_ref}`.")
            return
        try:
            qty = max(1, int(float(qty_text.replace(",", "."))))
        except Exception:
            await ctx.send(f"Ungueltige Mengenangabe fuer `{ingredient_ref}`.")
            return
        recipe_inputs.append({"product_id": ingredient_id, "qty": qty})

    ok, msg = set_product_recipe(product_id, recipe_inputs, output_qty=output_qty)
    await ctx.send(msg)


@econ_group.command(name="recipe_clear")
async def econ_recipe_clear(ctx: commands.Context, *, product_ref: str):
    product_id = _resolve_product_id_ref(product_ref)
    if not product_id:
        await ctx.send("Produkt nicht gefunden.")
        return
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    if not can_user_manage_entity(ctx.author, owner_entity_id):
        await ctx.send("Nur Anbieter/Eigentuemer oder Admin darf Rezepte loeschen.")
        return
    ok, msg = clear_product_recipe(product_id)
    await ctx.send(msg)


@econ_group.command(name="recipe_ai")
async def econ_recipe_ai(ctx: commands.Context, *, product_ref: str):
    product_id = _resolve_product_id_ref(product_ref)
    if not product_id:
        await ctx.send("Produkt nicht gefunden.")
        return
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    if not can_user_manage_entity(ctx.author, owner_entity_id):
        await ctx.send("Nur Anbieter/Eigentuemer oder Admin darf die Rezept-KI dafuer ausfuehren.")
        return
    ok, msg = await infer_and_apply_product_recipe_from_description(product_id, allow_overwrite=True)
    await ctx.send(msg)


@econ_group.command(name="produce")
async def econ_produce(ctx: commands.Context, product_ref: str, batches: int = 1):
    product_id = _resolve_product_id_ref(product_ref)
    if not product_id:
        await ctx.send("Produkt nicht gefunden.")
        return
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    if not can_user_manage_entity(ctx.author, owner_entity_id):
        await ctx.send("Nur Anbieter/Eigentuemer oder Admin darf dieses Produkt herstellen.")
        return
    ok, msg = produce_product_batches(owner_entity_id, product_id, batches=batches)
    await ctx.send(msg)


def _resolve_inventory_target_entity(ctx: commands.Context, target_ref: str) -> Optional[str]:
    raw = str(target_ref or "").strip()
    if not raw:
        return None
    mention_match = re.fullmatch(r"<@!?(\d+)>", raw)
    if mention_match:
        user_id = int(mention_match.group(1))
        member = ctx.guild.get_member(user_id) if ctx.guild else None
        if member:
            entity_id, _ = get_or_create_player_entity(member.id, member.display_name)
            return str(entity_id)
    if raw.isdigit() and ctx.guild:
        member = ctx.guild.get_member(int(raw))
        if member:
            entity_id, _ = get_or_create_player_entity(member.id, member.display_name)
            return str(entity_id)
    return _resolve_entity_id(raw)


@econ_group.command(name="inventory")
async def econ_inventory(ctx: commands.Context, *, entity_ref: str = ""):
    if entity_ref.strip():
        entity_id = _resolve_inventory_target_entity(ctx, entity_ref)
        if not entity_id:
            await ctx.send("Entitaet nicht gefunden.")
            return
        if not can_user_manage_entity(ctx.author, entity_id):
            await ctx.send("Du darfst dieses Inventar nicht einsehen.")
            return
    else:
        entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    await ctx.send(build_inventory_text(entity_id))


@econ_group.command(name="inventory_transfer")
async def econ_inventory_transfer(ctx: commands.Context, product_id: str, qty: int, *, target_ref: str):
    if int(qty) <= 0:
        await ctx.send("Menge muss > 0 sein.")
        return
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    if not is_product_inventory_tracked(product):
        await ctx.send("Dieses Produkt ist nicht inventarpflichtig (z. B. Dienstleistung).")
        return
    from_entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    to_entity_id = _resolve_inventory_target_entity(ctx, target_ref)
    if not to_entity_id:
        await ctx.send("Zielentitaet nicht gefunden.")
        return
    if str(from_entity_id) == str(to_entity_id):
        await ctx.send("Quelle und Ziel sind identisch.")
        return
    ok, msg = transfer_inventory(from_entity_id, to_entity_id, str(product_id), int(qty))
    if not ok:
        await ctx.send(f"Transfer fehlgeschlagen: {msg}")
        return
    await ctx.send(
        f"Transfer erfolgreich: {int(qty)}x #{product_id} "
        f"von {get_entity_name(from_entity_id)} zu {get_entity_name(to_entity_id)}."
    )


@econ_group.command(name="product_stock_set")
async def econ_product_stock_set(ctx: commands.Context, product_id: str, qty: int):
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    if not is_product_inventory_tracked(product):
        await ctx.send("Dieses Produkt ist nicht inventarpflichtig (z. B. Dienstleistung).")
        return
    owner_entity_id = str(product.get("owner_entity_id"))
    if not can_user_manage_entity(ctx.author, owner_entity_id):
        await ctx.send("Nur Anbieter/Eigentuemer oder Admin darf den Bestand setzen.")
        return
    set_inventory_qty(owner_entity_id, str(product_id), int(qty))
    save_economy()
    await ctx.send(
        f"Bestand gesetzt: {get_entity_name(owner_entity_id)} haelt "
        f"{get_inventory_qty(owner_entity_id, str(product_id))}x #{product_id}."
    )


@econ_group.command(name="inventory_set")
@commands.has_role("Admin")
async def econ_inventory_set(ctx: commands.Context, *, payload: str):
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        await ctx.send("Format: `Eco econ inventory_set <entity> | <product_id> | <qty>`")
        return
    entity_id = _resolve_inventory_target_entity(ctx, parts[0])
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    product = get_product(parts[1])
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    if not is_product_inventory_tracked(product):
        await ctx.send("Dieses Produkt ist nicht inventarpflichtig.")
        return
    try:
        qty = int(float(parts[2].replace(",", ".")))
    except Exception:
        await ctx.send("Ungueltige Menge.")
        return
    set_inventory_qty(entity_id, str(product.get("id")), qty)
    save_economy()
    await ctx.send(
        f"Inventar gesetzt: {get_entity_name(entity_id)} -> "
        f"{get_inventory_qty(entity_id, str(product.get('id')))}x #{product.get('id')}."
    )


@econ_group.command(name="shop")
async def econ_shop(ctx: commands.Context, page: int = 1, category: Optional[str] = None):
    text, _ = build_shop_page(page=page, per_page=8, category=category)
    await ctx.send(text)


@econ_group.command(name="shop_menu")
async def econ_shop_menu(ctx: commands.Context, category: Optional[str] = None):
    view = ShopMenuView(owner_id=ctx.author.id, category=category, page=1)
    text = view._render()
    await ctx.send(text, view=view)


@econ_group.command(name="shop_search")
async def econ_shop_search(ctx: commands.Context, *, payload: str):
    parsed = parse_shop_search_payload(payload)
    category = parsed.get("category")
    provider = parsed.get("provider")
    state = parsed.get("state")
    query = parsed.get("query")

    items = filter_products(category=category, provider=provider, state=state, query=query)
    if not items:
        await ctx.send("Keine Shop-Produkte passend zur Suche gefunden.")
        return

    lines = ["**SHOP SUCHE**"]
    lines.append(f"- Query: {query or '-'}")
    lines.append(f"- Kategorie: {category or '-'}")
    lines.append(f"- Anbieter: {provider or '-'}")
    lines.append(f"- State: {state or '-'}")
    lines.append("")
    for p in items[:20]:
        manufacturer = get_entity_name(p.get("manufacturer_entity_id"))
        lines.append(
            f"- #{p['id']} {p['name']} | {p['category']} | {float(p['base_price']):.2f} ECO | {manufacturer}"
        )
    lines.append("")
    lines.append("Details: `Eco econ product_view <id>`")
    await ctx.send("\n".join(lines))


# **VERTRAEGE KATEGORIE**
# Unterkapitel: Vertragswizard, Erstellung, Signatur und Uebersicht.
@econ_group.command(name="contract")
async def econ_contract_wizard(ctx: commands.Context):
    await ctx.send(
        "**Du erstellst einen Vertrag.**\n"
        "Welche Berufung hat die Gegenpartei?",
        view=ContractCounterpartyTypeView(owner_id=ctx.author.id),
    )


@econ_group.command(name="contract_create")
async def econ_contract_create(
    ctx: commands.Context,
    buyer: discord.Member,
    product_id: str,
    qty: int,
    unit_price: float,
    *,
    terms: str = "",
):
    product = get_product(product_id)
    if not product:
        await ctx.send("Produkt nicht gefunden.")
        return
    seller_entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    buyer_entity_id, _ = get_or_create_player_entity(buyer.id, buyer.display_name)
    offered_total = round(float(unit_price) * int(qty), 2)
    allowed, reason = validate_contract_policy(
        seller_entity_id,
        buyer_entity_id,
        product_id,
        offered_total=offered_total,
        quantity=qty,
    )
    if not allowed:
        await ctx.send(reason)
        return
    cid = create_contract(seller_entity_id, buyer_entity_id, product_id, unit_price, qty, terms or "Standardvertrag")
    await ctx.send(
        f"Vertrag #{cid} erstellt. Fixpreis: {unit_price:.2f} ECO x {qty} = {unit_price*qty:.2f} ECO. "
        f"Kauefer muss signieren: `Eco econ contract_sign {cid}`"
    )


@econ_group.command(name="contract_sign")
async def econ_contract_sign(ctx: commands.Context, contract_id: str):
    signer_entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    ok, msg = sign_contract(contract_id, signer_entity_id)
    await ctx.send(msg)


@econ_group.command(name="contracts")
async def econ_contracts(ctx: commands.Context):
    rows = []
    for c in economy_data.get("contracts", {}).values():
        rows.append(
            f"- #{c['id']} status={c['status']} product={c['product_id']} "
            f"total={float(c['total_price']):.2f} turn={c.get('created_turn')}"
        )
    if not rows:
        await ctx.send("Keine Vertraege.")
        return
    await ctx.send("Vertraege:\n" + "\n".join(rows[:80]))


@econ_group.command(name="salary_set")
async def econ_salary_set(ctx: commands.Context, employee: discord.Member, amount: float):
    employer_role_id = get_econ_setting_int("employer_role_id")
    if not user_has_role_id(ctx.author, employer_role_id):
        await ctx.send("Du brauchst die Employer-Rolle.")
        return
    employer_entity_id, _ = get_or_create_player_entity(ctx.author.id, ctx.author.display_name)
    set_salary(employer_entity_id, employee.id, amount, note=f"set_by_{ctx.author.id}")
    await ctx.send(f"Gehalt gesetzt: {employee.mention} -> {amount:.2f} ECO pro Zug.")


# **AKTIEN & MARKT KATEGORIE**
# Unterkapitel: Kurse, Kaeufe/Verkaeufe, Marktbericht und Transfers.
@econ_group.command(name="stock_chart")
async def econ_stock_chart(ctx: commands.Context, symbol: str):
    perf = get_stock_performance(symbol)
    if not perf:
        await ctx.send("Keine Historie fuer dieses Symbol.")
        return
    await ctx.send(
        f"Aktiengrafik {perf['symbol']} ({perf['points']} Punkte)\n"
        f"{perf['chart']}\n"
        f"Start: {perf['start']:.2f} | Aktuell: {perf['current']:.2f} | "
        f"High: {perf['high']:.2f} | Low: {perf['low']:.2f} | "
        f"Performance: {perf['change_pct']}%"
    )


@econ_group.command(name="market")
async def econ_market(ctx: commands.Context):
    stocks = economy_data.get("stocks", {})
    if not stocks:
        await ctx.send("Keine Aktien gelistet.")
        return
    lines = ["Markt:"]
    for sym, stock in sorted(stocks.items()):
        lines.append(f"- {sym}: {float(stock.get('price', 0)):.2f} ECO")
    await ctx.send("\n".join(lines))


@econ_group.command(name="stock_create")
@commands.has_role("Admin")
async def econ_stock_create(
    ctx: commands.Context, symbol: str, price: float, outstanding: int, *, company_ref: Optional[str] = None
):
    if company_ref:
        resolved = _resolve_entity_id(company_ref)
        if not resolved:
            await ctx.send("Unternehmen fuer Aktie nicht gefunden.")
            return
        company_entity_id = resolved
    else:
        state_entity = find_entity_by_name("Staat")
        company_entity_id = str(state_entity["id"]) if state_entity else ensure_entity_and_account("Staat", "state")[0]
    issuer = get_entity(company_entity_id)
    if not issuer:
        await ctx.send("Aktien-Emittent nicht gefunden.")
        return
    issuer_type = str(issuer.get("type", "")).lower()
    if issuer_type not in {"company", "state", "bank"}:
        await ctx.send("Aktien-Emittent muss Typ `company`, `state` oder `bank` sein.")
        return
    create_stock(symbol, company_entity_id, price, outstanding)
    if ctx.guild:
        await sync_company_forum_posts(ctx.guild, company_entity_id)
    company_name = (get_entity(company_entity_id) or {}).get("name", company_entity_id)
    await ctx.send(f"Aktie `{symbol.upper()}` erstellt (Unternehmen: {company_name}).")


@econ_group.command(name="stock_dividend")
@commands.has_role("Admin")
async def econ_stock_dividend(ctx: commands.Context, symbol: str, yield_pct: float):
    sym = symbol.strip().upper()
    stock = economy_data.get("stocks", {}).get(sym)
    if not stock:
        await ctx.send("Aktie nicht gefunden.")
        return
    if yield_pct < 0 or yield_pct > 100:
        await ctx.send("Bitte eine Dividendenquote zwischen 0 und 100 angeben.")
        return

    ensure_stock_structure(stock)
    stock["dividend_yield_pct"] = round(float(yield_pct), 4)
    save_economy()
    await ctx.send(f"Dividendenquote fuer `{sym}` auf {float(stock['dividend_yield_pct']):.2f}% gesetzt.")


@econ_group.command(name="balance")
async def econ_balance(ctx: commands.Context, *, konto: Optional[str] = None):
    entity_id, account_id, acc, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    entity = get_entity(str(entity_id))
    debt_total = 0.0
    active_loans = 0
    try:
        debt_total = float(get_total_outstanding_debt(str(entity_id)) or 0.0)
        active_loans = len(get_loans_for_entity(str(entity_id), statuses={"active", "delinquent"}))
    except Exception:
        debt_total = 0.0
        active_loans = 0
    await ctx.send(
        f"Kontostand `{acc.get('name', account_id)}` ({entity.get('name', entity_id) if entity else entity_id}): "
        f"{float(acc.get('balance', 0)):.2f} ECO\n"
        f"Aktive Kredite: {active_loans} | Offene Schuld: {debt_total:.2f} ECO"
    )


@econ_group.command(name="portfolio")
async def econ_portfolio(ctx: commands.Context, *, konto: Optional[str] = None):
    entity_id, account_id, acc, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    holdings = economy_data.get("holdings", {}).get(entity_id, {})
    if not holdings:
        await ctx.send("Dein Portfolio ist leer.")
        return
    lines = [f"Portfolio `{acc.get('name', account_id)}`:"]
    for sym, qty in holdings.items():
        lines.append(f"- {sym}: {qty}")
    await ctx.send("\n".join(lines))


def _user_can_queue_turn_econ(ctx: commands.Context) -> bool:
    if not turn_state.get("enabled"):
        return False
    if ctx.guild is None or ctx.guild.id != turn_state.get("guild_id"):
        return False
    role_id = turn_state.get("role_id")
    if not role_id:
        return False
    if not isinstance(ctx.author, discord.Member):
        return False
    return any(role.id == int(role_id) for role in ctx.author.roles)


@econ_group.command(name="buy")
async def econ_buy(ctx: commands.Context, symbol: str, qty: int, *, konto: Optional[str] = None):
    entity_id, account_id, _, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    if _user_can_queue_turn_econ(ctx):
        queue_econ_action(
            ctx.author.id,
            ctx.author.display_name,
            {
                "action": "buy",
                "entity_id": entity_id,
                "account_id": account_id,
                "symbol": symbol.upper(),
                "qty": int(qty),
            },
        )
        await ctx.send(f"Kaufauftrag vorgemerkt fuer Zug #{turn_state.get('turn_index')}.")
        return

    ok, msg = buy_stock(entity_id, symbol, qty, account_id=account_id)
    await ctx.send(msg)


@econ_group.command(name="sell", aliases=["stock_sell"])
async def econ_sell(ctx: commands.Context, symbol: str, qty: int, *, konto: Optional[str] = None):
    entity_id, account_id, _, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    if _user_can_queue_turn_econ(ctx):
        queue_econ_action(
            ctx.author.id,
            ctx.author.display_name,
            {
                "action": "sell",
                "entity_id": entity_id,
                "account_id": account_id,
                "symbol": symbol.upper(),
                "qty": int(qty),
            },
        )
        await ctx.send(f"Verkaufsauftrag vorgemerkt fuer Zug #{turn_state.get('turn_index')}.")
        return

    ok, msg = sell_stock(entity_id, symbol, qty, account_id=account_id)
    await ctx.send(msg)


@econ_group.command(name="buy_entity")
async def econ_buy_entity(ctx: commands.Context, entity_ref: str, symbol: str, qty: int, *, konto: Optional[str] = None):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    if not can_user_manage_entity(ctx.author, entity_id):
        await ctx.send("Keine Berechtigung fuer diese Entitaet.")
        return
    account_id = None
    if konto:
        account_id = get_primary_account_id(entity_id, account_type=normalize_account_type(konto, fallback=""))
        if not account_id:
            account_id = find_manageable_account_by_name(ctx.author, konto)[1]
        if not account_id:
            await ctx.send("Konto nicht gefunden.")
            return
        acc = get_account(account_id)
        if not acc or str(acc.get("entity_id")) != str(entity_id):
            await ctx.send("Konto gehoert nicht zu dieser Entitaet.")
            return
    ok, msg = buy_stock(entity_id, symbol, qty, account_id=account_id)
    await ctx.send(msg)


@econ_group.command(name="sell_entity")
async def econ_sell_entity(ctx: commands.Context, entity_ref: str, symbol: str, qty: int, *, konto: Optional[str] = None):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    if not can_user_manage_entity(ctx.author, entity_id):
        await ctx.send("Keine Berechtigung fuer diese Entitaet.")
        return
    account_id = None
    if konto:
        account_id = get_primary_account_id(entity_id, account_type=normalize_account_type(konto, fallback=""))
        if not account_id:
            account_id = find_manageable_account_by_name(ctx.author, konto)[1]
        if not account_id:
            await ctx.send("Konto nicht gefunden.")
            return
        acc = get_account(account_id)
        if not acc or str(acc.get("entity_id")) != str(entity_id):
            await ctx.send("Konto gehoert nicht zu dieser Entitaet.")
            return
    ok, msg = sell_stock(entity_id, symbol, qty, account_id=account_id)
    await ctx.send(msg)


@econ_group.command(name="transfer")
async def econ_transfer(ctx: commands.Context, user: discord.Member, amount: float, *, konto: Optional[str] = None):
    from_entity_id, from_account_id, _, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    to_entity_id, to_account_id = get_or_create_player_entity(user.id, user.display_name)
    if _user_can_queue_turn_econ(ctx):
        queue_econ_action(
            ctx.author.id,
            ctx.author.display_name,
            {
                "action": "transfer",
                "entity_id": from_entity_id,
                "from_account_id": from_account_id,
                "to_account_id": to_account_id,
                "amount": float(amount),
            },
        )
        await ctx.send(f"Transfer vorgemerkt fuer Zug #{turn_state.get('turn_index')}.")
        return

    ok, msg = transfer_funds(from_account_id, to_account_id, amount, note=f"live_transfer_{ctx.author.id}")
    await ctx.send(msg)


@econ_group.group(name="loans", invoke_without_command=True)
async def econ_loans(ctx: commands.Context):
    await ctx.send(
        "Kredite:\n"
        "- `Eco econ loans mine [konto]`\n"
        "- `Eco econ loans entity <entity_id|name>`\n"
        "- `Eco econ loans take <amount> [turns] [konto]`\n"
        "- `Eco econ loans repay <loan_id> <amount> [konto]`\n"
        "- `Eco econ loans bank`\n"
        "- `Eco econ loans policy`\n"
        "- `Eco econ loans policy_set <field> <value>` (Admin)"
    )


@econ_loans.command(name="mine")
async def econ_loans_mine(ctx: commands.Context, *, konto: Optional[str] = None):
    entity_id, _, _, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    await ctx.send(build_loan_overview_text(str(entity_id)))


@econ_loans.command(name="entity")
async def econ_loans_entity(ctx: commands.Context, *, entity_ref: str):
    entity_id = _resolve_entity_id(entity_ref)
    if not entity_id:
        await ctx.send("Entitaet nicht gefunden.")
        return
    if not (user_has_admin_role(ctx.author) or can_user_manage_entity(ctx.author, entity_id)):
        await ctx.send("Keine Berechtigung fuer diese Entitaet.")
        return
    await ctx.send(build_loan_overview_text(entity_id))


@econ_loans.command(name="bank")
async def econ_loans_bank(ctx: commands.Context):
    await ctx.send(build_bank_loan_status_text())


@econ_loans.command(name="take")
async def econ_loans_take(ctx: commands.Context, amount: float, turns: int = 6, *, konto: Optional[str] = None):
    entity_id, account_id, account, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    if not entity_id or not account_id or not account:
        await ctx.send("Konto nicht gefunden.")
        return
    entity = get_entity(entity_id)
    if entity and str(entity.get("type", "")).lower() == "bank":
        await ctx.send("Banken koennen ueber diesen Befehl keinen Kredit aufnehmen.")
        return
    ok, msg, _ = issue_loan_to_entity(
        borrower_entity_id=entity_id,
        borrower_account_id=account_id,
        principal=float(amount),
        term_turns=int(turns),
        note=f"requested_by_{ctx.author.id}",
    )
    await ctx.send(msg)


@econ_loans.command(name="repay")
async def econ_loans_repay(ctx: commands.Context, loan_id: str, amount: float, *, konto: Optional[str] = None):
    entity_id, account_id, _, err = _resolve_actor_account(ctx.author, konto)
    if err:
        await ctx.send(err)
        return
    if not entity_id or not account_id:
        await ctx.send("Konto nicht gefunden.")
        return
    loan = get_loan(loan_id)
    if not loan:
        await ctx.send("Kredit nicht gefunden.")
        return
    if str(loan.get("borrower_entity_id")) != str(entity_id):
        await ctx.send("Dieses Konto gehoert nicht zum Kreditnehmer.")
        return
    ok, msg = repay_loan(loan_id, account_id, float(amount), note=f"manual_by_{ctx.author.id}")
    await ctx.send(msg)


@econ_loans.command(name="policy")
async def econ_loans_policy(ctx: commands.Context):
    policy = get_loan_policy()
    await ctx.send(
        "**KREDITPOLICY**\n"
        f"- Bankentity: {policy['bank_entity_name']}\n"
        f"- Standardzins/Zug: {float(policy['default_interest_pct_per_turn']):.2f}%\n"
        f"- Max Laufzeit: {int(policy['max_term_turns'])} Zuege\n"
        f"- Max Einzelkredit: {format_money(float(policy['max_principal_per_loan']))}\n"
        f"- Max Gesamtschuld/Entity: {format_money(float(policy['max_total_debt_per_entity']))}\n"
        f"- Strafzins pro Aussetzer: {float(policy['penalty_pct_per_missed_turn']):.2f}%"
    )


@econ_loans.command(name="policy_set")
@commands.has_role("Admin")
async def econ_loans_policy_set(ctx: commands.Context, field: str, *, value: str):
    policy = get_loan_policy()
    key = str(field or "").strip().lower()
    try:
        if key == "bank_entity_name":
            text = str(value or "").strip()
            if not text:
                await ctx.send("Bankname darf nicht leer sein.")
                return
            policy["bank_entity_name"] = text[:80]
        elif key == "default_interest_pct_per_turn":
            policy[key] = round(max(0.0, float(value)), 4)
        elif key == "max_term_turns":
            policy[key] = max(1, min(60, int(value)))
        elif key == "max_principal_per_loan":
            policy[key] = round(max(1.0, float(value)), 2)
        elif key == "max_total_debt_per_entity":
            policy[key] = round(max(float(policy["max_principal_per_loan"]), float(value)), 2)
        elif key == "penalty_pct_per_missed_turn":
            policy[key] = round(max(0.0, float(value)), 4)
        else:
            await ctx.send(
                "Unbekanntes Feld. Nutze: "
                "`bank_entity_name`, `default_interest_pct_per_turn`, `max_term_turns`, "
                "`max_principal_per_loan`, `max_total_debt_per_entity`, `penalty_pct_per_missed_turn`"
            )
            return
    except (TypeError, ValueError):
        await ctx.send("Ungueltiger Wert.")
        return

    economy_data.setdefault("settings", {})["loan_policy"] = policy
    save_economy()
    await ctx.send(f"Kreditpolicy aktualisiert: `{key}` -> `{policy[key]}`")


# **WAEHRUNG KATEGORIE**
# Unterkapitel: Waehrungsprofil anzeigen und anpassen.
@econ_group.command(name="currency_view")
async def econ_currency_view(ctx: commands.Context):
    """View the current currency settings"""
    profile = get_currency_profile()
    code = profile.get("code", "ECO")
    name = profile.get("name", "Economicon")
    symbol = profile.get("symbol", "ECO")
    emoji = profile.get("emoji", "")
    image_url = profile.get("image_url", "")
    
    lines = ["**Waehrungs-Einstellungen:**"]
    lines.append(f"- Code: `{code}`")
    lines.append(f"- Name: {name}")
    lines.append(f"- Symbol: {symbol}")
    if emoji:
        lines.append(f"- Emoji: {emoji}")
    if image_url:
        lines.append(f"- Bild: {image_url}")
    
    await ctx.send("\n".join(lines))


@econ_group.command(name="currency_set")
@commands.has_role("Admin")
async def econ_currency_set(ctx: commands.Context, code: str, name: str, symbol: str, emoji: Optional[str] = None, image_url: Optional[str] = None):
    """Set the currency settings: code, name, symbol, [emoji], [image_url]"""
    if not code or not name or not symbol:
        await ctx.send("Bitte mindestens Code, Name und Symbol angeben.")
        return
    
    ensure_currency_profile()
    economy_data["settings"]["currency"]["code"] = code.upper()
    economy_data["settings"]["currency"]["name"] = name
    economy_data["settings"]["currency"]["symbol"] = symbol
    if emoji is not None:
        economy_data["settings"]["currency"]["emoji"] = emoji
    if image_url is not None:
        economy_data["settings"]["currency"]["image_url"] = image_url
    
    save_economy()
    
    new_profile = get_currency_profile()
    emoji_display = new_profile.get("emoji", "")
    await ctx.send(
        f"Waehrung aktualisiert:\n"
        f"- Code: `{new_profile['code']}`\n"
        f"- Name: {new_profile['name']}\n"
        f"- Symbol: {new_profile['symbol']}\n"
        f"- Emoji: {emoji_display or '-'}"
    )


