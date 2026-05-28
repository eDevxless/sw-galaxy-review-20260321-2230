# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **NPC-STAATEN STRATEGIE KATEGORIE**
# Unterkapitel: KI-Strategiekern fuer Krieg, Handel, Diplomatie und Intrige.

STRATEGY_ACTION_LABELS = {
    "trade": "Handel",
    "diplomacy": "Diplomatie",
    "intrigue": "Intrige",
    "war": "Krieg",
}


def _state_strategy_store() -> dict:
    store = turn_state.get("npc_state_strategy")
    if not isinstance(store, dict):
        store = {}
        turn_state["npc_state_strategy"] = store
    relations = store.get("relations")
    if not isinstance(relations, dict):
        relations = {}
        store["relations"] = relations
    history = store.get("history")
    if not isinstance(history, list):
        history = []
        store["history"] = history
    last_results = store.get("last_turn_results")
    if not isinstance(last_results, list):
        last_results = []
        store["last_turn_results"] = last_results
    if "last_resolved_turn" not in store:
        store["last_resolved_turn"] = None
    return store


def _state_strategy_entity_id(entity: Optional[dict]) -> str:
    return str((entity or {}).get("id", ""))


def _state_strategy_entity_name(entity: Optional[dict]) -> str:
    return str((entity or {}).get("name", "Unbekannter Staat"))


def _state_strategy_relation_get(store: dict, left_state_id: str, right_state_id: str) -> float:
    left = str(left_state_id or "")
    right = str(right_state_id or "")
    if not left or not right or left == right:
        return 0.0
    relations = store.setdefault("relations", {})
    left_map = relations.setdefault(left, {})
    right_map = relations.setdefault(right, {})
    if right not in left_map and left in right_map:
        left_map[right] = float(right_map.get(left, 0.0) or 0.0)
    if left not in right_map and right in left_map:
        right_map[left] = float(left_map.get(right, 0.0) or 0.0)
    return float(left_map.get(right, 0.0) or 0.0)


def _state_strategy_relation_set(store: dict, left_state_id: str, right_state_id: str, value: float):
    left = str(left_state_id or "")
    right = str(right_state_id or "")
    if not left or not right or left == right:
        return
    score = round(float(clamp(float(value), -100.0, 100.0)), 2)
    relations = store.setdefault("relations", {})
    relations.setdefault(left, {})[right] = score
    relations.setdefault(right, {})[left] = score


def _state_strategy_relation_adjust(store: dict, left_state_id: str, right_state_id: str, delta: float):
    cur = _state_strategy_relation_get(store, left_state_id, right_state_id)
    _state_strategy_relation_set(store, left_state_id, right_state_id, cur + float(delta))


def _state_strategy_state_entities() -> list[dict]:
    out = []
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        ensure_entity_profile_structure(entity)
        out.append(entity)
    out.sort(key=lambda x: str(x.get("name", "")).lower())
    return out


def _state_strategy_npc_entities() -> list[dict]:
    out = []
    for entity in _state_strategy_state_entities():
        profile = entity.get("profile", {})
        mode = str(profile.get("state_control_mode", "player")).strip().lower()
        is_npc = bool(profile.get("is_npc_state", False)) or mode == "npc"
        strategy_enabled = bool(profile.get("npc_strategy_enabled", False))
        if is_npc and strategy_enabled:
            out.append(entity)
    return out


def _state_strategy_get_account_id(state_entity: dict) -> Optional[str]:
    return get_primary_account_id(_state_strategy_entity_id(state_entity))


def _state_strategy_get_balance(state_entity: dict) -> float:
    account_id = _state_strategy_get_account_id(state_entity)
    if not account_id:
        return 0.0
    account = get_account(account_id)
    if not account:
        return 0.0
    return float(account.get("balance", 0.0) or 0.0)


def _state_strategy_add_balance(account_id: Optional[str], delta: float) -> float:
    if not account_id:
        return 0.0
    account = get_account(account_id)
    if not account:
        return 0.0
    old_balance = float(account.get("balance", 0.0) or 0.0)
    new_balance = round(max(0.0, old_balance + float(delta)), 2)
    account["balance"] = new_balance
    return round(new_balance - old_balance, 2)


def _state_strategy_apply_indicator_delta(
    *,
    market_delta: float = 0.0,
    inflation_delta: float = 0.0,
    sentiment_delta: float = 0.0,
):
    indicators = turn_state.get("indicators")
    if not isinstance(indicators, dict):
        indicators = {"market_index": 1000.0, "inflation": 2.0, "sentiment": 50.0}
        turn_state["indicators"] = indicators
    market = float(indicators.get("market_index", 1000.0) or 1000.0) + float(market_delta)
    inflation = float(indicators.get("inflation", 2.0) or 2.0) + float(inflation_delta)
    sentiment = float(indicators.get("sentiment", 50.0) or 50.0) + float(sentiment_delta)
    indicators["market_index"] = round(clamp(market, 600.0, 2400.0), 2)
    indicators["inflation"] = round(clamp(inflation, -2.0, 25.0), 2)
    indicators["sentiment"] = round(clamp(sentiment, 0.0, 100.0), 2)


def _state_strategy_power_score(state_entity: dict) -> float:
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {})
    linked = get_entities_by_state(str(state_entity.get("name", "")))
    company_count = len(linked.get("company", []))
    person_count = len(linked.get("person", []))
    npc_count = len(linked.get("npc", []))
    territory_count = len(profile.get("territories", []) or [])
    balance_score = _state_strategy_get_balance(state_entity) / 25000.0
    total = (
        float(balance_score)
        + (company_count * 1.8)
        + (person_count * 0.25)
        + (npc_count * 0.65)
        + (territory_count * 0.5)
    )
    return round(clamp(total, 0.1, 200.0), 2)


def _state_strategy_weighted_choice(weights: dict[str, float]) -> Optional[str]:
    clean = []
    total = 0.0
    for key, weight in weights.items():
        w = float(weight or 0.0)
        if w <= 0:
            continue
        clean.append((key, w))
        total += w
    if total <= 0:
        return None
    ticket = random.random() * total
    walked = 0.0
    for key, weight in clean:
        walked += weight
        if ticket <= walked:
            return key
    return clean[-1][0] if clean else None


def _state_strategy_choose_target(actor: dict, all_states: list[dict], store: dict) -> Optional[dict]:
    actor_id = _state_strategy_entity_id(actor)
    if not actor_id:
        return None
    actor_power = _state_strategy_power_score(actor)
    weights: dict[str, float] = {}
    by_id: dict[str, dict] = {}
    for candidate in all_states:
        target_id = _state_strategy_entity_id(candidate)
        if not target_id or target_id == actor_id:
            continue
        relation = _state_strategy_relation_get(store, actor_id, target_id)
        target_power = _state_strategy_power_score(candidate)
        tension = abs(relation)
        power_gap = abs(actor_power - target_power)
        weight = 1.0 + (tension * 0.04) + (power_gap * 0.10)
        if relation >= 35:
            weight += 0.8
        if relation <= -35:
            weight += 1.2
        weights[target_id] = float(max(0.1, weight))
        by_id[target_id] = candidate
    chosen_id = _state_strategy_weighted_choice(weights)
    if not chosen_id:
        return None
    return by_id.get(chosen_id)


def _state_strategy_choose_action(actor: dict, target: dict, store: dict) -> str:
    actor_id = _state_strategy_entity_id(actor)
    target_id = _state_strategy_entity_id(target)
    relation = _state_strategy_relation_get(store, actor_id, target_id)
    actor_power = _state_strategy_power_score(actor)
    target_power = _state_strategy_power_score(target)
    power_delta = actor_power - target_power
    actor_balance = _state_strategy_get_balance(actor)

    weights = {
        "trade": 3.0,
        "diplomacy": 2.5,
        "intrigue": 2.0,
        "war": 1.0,
    }
    if relation >= 35:
        weights["trade"] += 2.8
        weights["diplomacy"] += 2.2
        weights["intrigue"] -= 0.8
        weights["war"] -= 0.8
    if relation <= -25:
        weights["intrigue"] += 2.2
        weights["war"] += 1.8
        weights["trade"] -= 1.3
        weights["diplomacy"] -= 0.8
    if relation <= -55 and power_delta > 0.75:
        weights["war"] += 2.8
    if relation >= 60:
        weights["war"] -= 1.2
        weights["intrigue"] -= 0.4
    if power_delta < -1.0:
        weights["war"] -= 1.4
        weights["diplomacy"] += 0.7
    if actor_balance < 8000.0:
        weights["trade"] += 2.5
        weights["war"] -= 1.0

    action = _state_strategy_weighted_choice(weights)
    return action if action in STRATEGY_ACTION_LABELS else "diplomacy"


def _state_strategy_apply_trade(actor: dict, target: dict, store: dict, turn_index: int) -> dict:
    actor_id = _state_strategy_entity_id(actor)
    target_id = _state_strategy_entity_id(target)
    actor_name = _state_strategy_entity_name(actor)
    target_name = _state_strategy_entity_name(target)
    relation = _state_strategy_relation_get(store, actor_id, target_id)
    actor_acc = _state_strategy_get_account_id(actor)
    target_acc = _state_strategy_get_account_id(target)
    base = random.uniform(280.0, 1750.0)
    relation_bonus = max(0.0, relation) * random.uniform(2.0, 5.0)
    actor_gain = round(base + (relation_bonus * 0.55), 2)
    target_gain = round((base * 0.85) + (relation_bonus * 0.45), 2)
    actor_delta = _state_strategy_add_balance(actor_acc, actor_gain)
    target_delta = _state_strategy_add_balance(target_acc, target_gain)
    _state_strategy_relation_adjust(store, actor_id, target_id, random.uniform(4.0, 11.0))
    _state_strategy_apply_indicator_delta(
        market_delta=random.uniform(3.0, 11.0),
        inflation_delta=random.uniform(0.0, 0.12),
        sentiment_delta=random.uniform(0.6, 2.5),
    )
    record_transaction(
        "state_trade_growth",
        {
            "turn": int(turn_index),
            "from_state_id": actor_id,
            "to_state_id": target_id,
            "amount_actor": actor_delta,
            "amount_target": target_delta,
            "note": "npc_state_strategy_trade",
        },
    )
    return {
        "turn": int(turn_index),
        "action": "trade",
        "actor_state_id": actor_id,
        "actor_state_name": actor_name,
        "target_state_id": target_id,
        "target_state_name": target_name,
        "importance_score": 38.0,
        "text": (
            f"{actor_name} schliesst Handelsabkommen mit {target_name}: "
            f"+{format_money(actor_delta)} / +{format_money(target_delta)}."
        ),
    }


def _state_strategy_apply_diplomacy(actor: dict, target: dict, store: dict, turn_index: int) -> dict:
    actor_id = _state_strategy_entity_id(actor)
    target_id = _state_strategy_entity_id(target)
    actor_name = _state_strategy_entity_name(actor)
    target_name = _state_strategy_entity_name(target)
    delta = random.uniform(7.0, 16.0)
    _state_strategy_relation_adjust(store, actor_id, target_id, delta)
    _state_strategy_apply_indicator_delta(
        market_delta=random.uniform(0.5, 3.0),
        inflation_delta=random.uniform(-0.05, 0.04),
        sentiment_delta=random.uniform(1.2, 4.0),
    )
    record_transaction(
        "state_diplomacy",
        {
            "turn": int(turn_index),
            "state_id": actor_id,
            "target_state_id": target_id,
            "relation_delta": round(delta, 2),
            "note": "npc_state_strategy_diplomacy",
        },
    )
    return {
        "turn": int(turn_index),
        "action": "diplomacy",
        "actor_state_id": actor_id,
        "actor_state_name": actor_name,
        "target_state_id": target_id,
        "target_state_name": target_name,
        "importance_score": 28.0,
        "text": f"{actor_name} verbessert diplomatische Beziehungen zu {target_name}.",
    }


def _state_strategy_apply_intrigue(actor: dict, target: dict, store: dict, turn_index: int) -> dict:
    actor_id = _state_strategy_entity_id(actor)
    target_id = _state_strategy_entity_id(target)
    actor_name = _state_strategy_entity_name(actor)
    target_name = _state_strategy_entity_name(target)
    actor_power = _state_strategy_power_score(actor)
    target_power = _state_strategy_power_score(target)
    relation = _state_strategy_relation_get(store, actor_id, target_id)
    actor_acc = _state_strategy_get_account_id(actor)
    target_acc = _state_strategy_get_account_id(target)

    success_chance = 0.45 + ((actor_power - target_power) * 0.03)
    if relation <= -30:
        success_chance += 0.10
    success_chance = float(clamp(success_chance, 0.20, 0.85))
    success = random.random() <= success_chance
    stolen = 0.0
    actor_cost = 0.0
    if success and actor_acc and target_acc:
        steal_amount = round(random.uniform(180.0, 1400.0), 2)
        ok, _ = transfer_funds(target_acc, actor_acc, steal_amount, note="npc_state_strategy_intrigue")
        if ok:
            stolen = steal_amount
        else:
            success = False
    if not success:
        prep_cost = round(random.uniform(80.0, 540.0), 2)
        actor_cost = abs(_state_strategy_add_balance(actor_acc, -prep_cost))

    relation_delta = random.uniform(-20.0, -11.0) if success else random.uniform(-12.0, -6.0)
    _state_strategy_relation_adjust(store, actor_id, target_id, relation_delta)
    _state_strategy_apply_indicator_delta(
        market_delta=random.uniform(-4.0, 1.0),
        inflation_delta=random.uniform(0.0, 0.10),
        sentiment_delta=random.uniform(-2.6, -0.4),
    )
    record_transaction(
        "state_intrigue",
        {
            "turn": int(turn_index),
            "state_id": actor_id,
            "target_state_id": target_id,
            "success": bool(success),
            "stolen": round(stolen, 2),
            "actor_cost": round(actor_cost, 2),
            "note": "npc_state_strategy_intrigue",
        },
    )
    if success:
        text = f"{actor_name} fuehrt erfolgreiche Intrige gegen {target_name} durch ({format_money(stolen)} abgeschopft)."
        score = 58.0
    else:
        text = f"{actor_name} scheitert mit Intrige gegen {target_name} (Kosten: {format_money(actor_cost)})."
        score = 34.0
    return {
        "turn": int(turn_index),
        "action": "intrigue",
        "actor_state_id": actor_id,
        "actor_state_name": actor_name,
        "target_state_id": target_id,
        "target_state_name": target_name,
        "importance_score": score,
        "text": text,
    }


def _state_strategy_apply_war(actor: dict, target: dict, store: dict, turn_index: int) -> dict:
    actor_id = _state_strategy_entity_id(actor)
    target_id = _state_strategy_entity_id(target)
    actor_name = _state_strategy_entity_name(actor)
    target_name = _state_strategy_entity_name(target)
    actor_acc = _state_strategy_get_account_id(actor)
    target_acc = _state_strategy_get_account_id(target)
    actor_power = _state_strategy_power_score(actor)
    target_power = _state_strategy_power_score(target)

    actor_roll = actor_power + random.uniform(-2.5, 2.5)
    target_roll = target_power + random.uniform(-2.5, 2.5)
    actor_win = actor_roll >= target_roll

    attacker_cost = abs(_state_strategy_add_balance(actor_acc, -random.uniform(900.0, 2900.0)))
    defender_cost = abs(_state_strategy_add_balance(target_acc, -random.uniform(900.0, 2900.0)))
    spoils = 0.0
    if actor_acc and target_acc:
        if actor_win:
            spoils_amount = round(random.uniform(220.0, 1800.0), 2)
            ok, _ = transfer_funds(target_acc, actor_acc, spoils_amount, note="npc_state_strategy_war_spoils")
            if ok:
                spoils = spoils_amount
        else:
            spoils_amount = round(random.uniform(160.0, 1400.0), 2)
            ok, _ = transfer_funds(actor_acc, target_acc, spoils_amount, note="npc_state_strategy_war_spoils")
            if ok:
                spoils = -spoils_amount

    _state_strategy_relation_adjust(store, actor_id, target_id, random.uniform(-55.0, -32.0))
    _state_strategy_apply_indicator_delta(
        market_delta=random.uniform(-14.0, -4.0),
        inflation_delta=random.uniform(0.12, 0.55),
        sentiment_delta=random.uniform(-8.0, -2.0),
    )
    record_transaction(
        "state_war",
        {
            "turn": int(turn_index),
            "attacker_state_id": actor_id,
            "defender_state_id": target_id,
            "attacker_win": bool(actor_win),
            "attacker_cost": round(attacker_cost, 2),
            "defender_cost": round(defender_cost, 2),
            "spoils": round(spoils, 2),
            "note": "npc_state_strategy_war",
        },
    )
    if actor_win:
        outcome = f"{actor_name} setzt sich gegen {target_name} durch"
    else:
        outcome = f"{actor_name} wird von {target_name} zurueckgedraengt"
    spoil_text = f", Beuteeffekt: {format_money(spoils)}" if abs(spoils) > 0.0 else ""
    return {
        "turn": int(turn_index),
        "action": "war",
        "actor_state_id": actor_id,
        "actor_state_name": actor_name,
        "target_state_id": target_id,
        "target_state_name": target_name,
        "importance_score": 95.0,
        "text": (
            f"{outcome}. Kriegskosten: {format_money(attacker_cost)} / {format_money(defender_cost)}"
            f"{spoil_text}."
        ),
    }


def run_npc_state_strategy_for_turn(turn_index: int) -> list[dict]:
    store = _state_strategy_store()
    current_turn = int(turn_index)
    if int(store.get("last_resolved_turn", -1) or -1) == current_turn:
        return list(store.get("last_turn_results", []))

    all_states = _state_strategy_state_entities()
    npc_states = _state_strategy_npc_entities()
    results: list[dict] = []
    if len(all_states) < 2 or not npc_states:
        store["last_turn_results"] = []
        store["last_resolved_turn"] = current_turn
        save_turn_state()
        return []

    random.shuffle(npc_states)
    for actor in npc_states:
        target = _state_strategy_choose_target(actor, all_states, store)
        if not target:
            continue
        action = _state_strategy_choose_action(actor, target, store)
        try:
            if action == "trade":
                result = _state_strategy_apply_trade(actor, target, store, current_turn)
            elif action == "diplomacy":
                result = _state_strategy_apply_diplomacy(actor, target, store, current_turn)
            elif action == "intrigue":
                result = _state_strategy_apply_intrigue(actor, target, store, current_turn)
            else:
                result = _state_strategy_apply_war(actor, target, store, current_turn)
            results.append(result)
        except Exception as exc:
            results.append(
                {
                    "turn": current_turn,
                    "action": action,
                    "actor_state_id": _state_strategy_entity_id(actor),
                    "actor_state_name": _state_strategy_entity_name(actor),
                    "target_state_id": _state_strategy_entity_id(target),
                    "target_state_name": _state_strategy_entity_name(target),
                    "importance_score": 12.0,
                    "text": (
                        f"{_state_strategy_entity_name(actor)} konnte Strategieaktion "
                        f"{STRATEGY_ACTION_LABELS.get(action, action)} nicht ausfuehren: {exc}"
                    ),
                }
            )

    history = store.setdefault("history", [])
    history.extend(results)
    if len(history) > 600:
        del history[:-600]
    store["last_turn_results"] = results
    store["last_resolved_turn"] = current_turn
    save_economy()
    save_turn_state()
    return results


def get_npc_state_strategy_events_for_turn(turn_index: int) -> list[dict]:
    store = _state_strategy_store()
    current_turn = int(turn_index)
    out = []
    for row in store.get("last_turn_results", []):
        if int(row.get("turn", -1) or -1) != current_turn:
            continue
        text = str(row.get("text", "")).strip()
        if not text:
            continue
        out.append(
            {
                "kind": "state_strategy",
                "importance_score": float(row.get("importance_score", 20.0) or 20.0),
                "text": text,
            }
        )
    return out


def build_npc_strategy_status_text() -> str:
    store = _state_strategy_store()
    all_states = _state_strategy_state_entities()
    npc_states = _state_strategy_npc_entities()
    lines = ["**NPC-STATE STRATEGIE STATUS**"]
    lines.append(f"- Staaten gesamt: {len(all_states)}")
    lines.append(f"- NPC-Staaten aktiv: {len(npc_states)}")
    lines.append(f"- Letzt aufgeloester Zug: {store.get('last_resolved_turn')}")
    last_results = store.get("last_turn_results", []) or []
    lines.append(f"- Letzte Strategiezuege (Aktionen): {len(last_results)}")
    if npc_states:
        lines.append("")
        lines.append("Aktive NPC-Staaten:")
        for entity in npc_states[:25]:
            sid = _state_strategy_entity_id(entity)
            p = entity.get("profile", {})
            lines.append(
                f"- {entity.get('name')} (ID: {sid}) | Modus: {p.get('state_control_mode')} | "
                f"Strategie: {bool(p.get('npc_strategy_enabled', False))}"
            )
    if last_results:
        lines.append("")
        lines.append("Letzte Aktionen:")
        for row in last_results[:20]:
            action = STRATEGY_ACTION_LABELS.get(str(row.get("action", "")), str(row.get("action", "")))
            lines.append(f"- [{action}] {row.get('text')}")
    return "\n".join(lines)


def _resolve_state_entity_from_any_ref(state_ref: str) -> Optional[dict]:
    raw = str(state_ref or "").strip()
    if not raw:
        return None
    entity = get_entity(raw)
    if entity and str(entity.get("type", "")).lower() == "state":
        return entity
    return find_state_entity_by_name(raw)


# **STRATEGIE-COMMANDS KATEGORIE**
# Unterkapitel: Kontrolle und Debugging fuer den KI-Strategiekern.
@turn_group.command(name="strategy_status")
async def turn_strategy_status(ctx: commands.Context):
    await send_long_message(ctx.channel, build_npc_strategy_status_text())


@turn_group.command(name="strategy_run")
@commands.has_role("Admin")
async def turn_strategy_run(ctx: commands.Context):
    if not turn_state.get("enabled"):
        await ctx.send("Turn-System ist nicht aktiv.")
        return
    if ctx.guild is None or ctx.guild.id != turn_state.get("guild_id"):
        await ctx.send("Befehl nur auf dem konfigurierten Turn-Server nutzbar.")
        return
    turn_index = int(turn_state.get("turn_index", 1))
    results = run_npc_state_strategy_for_turn(turn_index)
    if not results:
        await ctx.send(f"Keine Strategieaktionen fuer Zug #{turn_index} ausgefuehrt.")
        return
    lines = [f"NPC-Strategie fuer Zug #{turn_index} ausgefuehrt ({len(results)} Aktionen):"]
    for row in results[:25]:
        action = STRATEGY_ACTION_LABELS.get(str(row.get("action", "")), str(row.get("action", "")))
        lines.append(f"- [{action}] {row.get('text')}")
    await send_long_message(ctx.channel, "\n".join(lines))


@bot.command(name="state_control_set")
@commands.has_role("Admin")
async def state_control_set(ctx: commands.Context, state_ref: str, mode: str):
    state_entity = _resolve_state_entity_from_any_ref(state_ref)
    if not state_entity:
        await ctx.send("Staat nicht gefunden.")
        return
    mode_norm = str(mode or "").strip().lower()
    if mode_norm not in {"player", "npc"}:
        await ctx.send("Modus muss `player` oder `npc` sein.")
        return
    ok, reason = set_state_control_mode(str(state_entity.get("id")), mode_norm, owner_user_id=ctx.author.id)
    if not ok:
        await ctx.send(reason)
        return
    label = "NPC-Staat" if mode_norm == "npc" else "Spieler-Staat"
    await ctx.send(f"Steuerung fuer `{state_entity.get('name')}` gesetzt: {label}.")
