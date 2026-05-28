# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
def _json_short(value, max_len: int = 240) -> str:
    try:
        raw = json.dumps(value, ensure_ascii=False)
    except Exception:
        raw = str(value)
    return raw if len(raw) <= max_len else (raw[: max_len - 3] + "...")


async def append_state_law_log(
    state_entity: dict,
    action: str,
    detail: str,
    *,
    path: str = "",
    old_value=None,
    new_value=None,
    actor_name: str = "System",
    actor_user_id: Optional[int] = None,
    importance: str = "high",
    guild: Optional[discord.Guild] = None,
):
    ensure_entity_profile_structure(state_entity)
    profile = state_entity.get("profile", {})
    state_name = str(state_entity.get("name", "State"))
    entry = {
        "turn": int(turn_state.get("turn_index", 1)),
        "ts": int(time.time()),
        "state_entity_id": str(state_entity.get("id")),
        "state_name": state_name,
        "action": str(action or "update"),
        "path": str(path or ""),
        "detail": str(detail or "")[:600],
        "old_value": old_value,
        "new_value": new_value,
        "actor_name": str(actor_name or "System")[:120],
        "actor_user_id": int(actor_user_id) if actor_user_id else None,
        "importance": str(importance or "high").lower(),
    }
    logs = profile.setdefault("law_log", [])
    logs.append(entry)
    if len(logs) > 400:
        del logs[:-400]
    save_economy()

    if guild is None:
        return
    chan_id = profile.get("law_log_channel_id")
    if not chan_id:
        return
    channel = guild.get_channel(int(chan_id))
    if channel is None:
        return
    try:
        head = f"[LAW-LOG] {state_name} | Turn #{entry['turn']} | {entry['action']}"
        path_line = f"\nPath: `{entry['path']}`" if entry.get("path") else ""
        old_line = f"\nAlt: `{_json_short(entry.get('old_value'))}`" if entry.get("old_value") is not None else ""
        new_line = f"\nNeu: `{_json_short(entry.get('new_value'))}`" if entry.get("new_value") is not None else ""
        actor_line = f"\nVon: {entry.get('actor_name')}"
        await channel.send(f"{head}{path_line}\n{entry.get('detail','-')}{old_line}{new_line}{actor_line}")
    except Exception:
        pass


def collect_high_importance_law_events_for_turn(turn_index: int) -> list[dict]:
    out = []
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        ensure_entity_profile_structure(entity)
        for entry in entity.get("profile", {}).get("law_log", []) or []:
            if int(entry.get("turn", 0) or 0) != int(turn_index):
                continue
            if str(entry.get("importance", "")).lower() != "high":
                continue
            out.append(
                {
                    "kind": "law_change",
                    "importance_score": 100.0,
                    "text": (
                        f"Law-Update {entry.get('state_name')}: {entry.get('detail')}"
                        + (f" (Path: {entry.get('path')})" if entry.get("path") else "")
                    ),
                }
            )
    return out


def get_state_entity_for_actor(actor_entity: Optional[dict]) -> Optional[dict]:
    if not actor_entity:
        return None
    ensure_entity_profile_structure(actor_entity)
    profile = actor_entity.get("profile", {})
    state_entity_id = profile.get("state_entity_id")
    if state_entity_id:
        state_entity = get_entity(str(state_entity_id))
        if state_entity and str(state_entity.get("type", "")).lower() == "state":
            return state_entity
    state_name = profile.get("state", "")
    return find_state_entity_by_name(state_name)


def _law_get_path(data: dict, path: str, default=None):
    cur = data
    for part in [p for p in str(path or "").split(".") if p]:
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur.get(part)
    return cur


def _law_set_path(data: dict, path: str, value):
    parts = [p for p in str(path or "").split(".") if p]
    if not parts:
        return False
    cur = data
    for part in parts[:-1]:
        node = cur.get(part)
        if not isinstance(node, dict):
            node = {}
            cur[part] = node
        cur = node
    cur[parts[-1]] = value
    return True


def _law_unset_path(data: dict, path: str) -> bool:
    parts = [p for p in str(path or "").split(".") if p]
    if not parts:
        return False
    cur = data
    for part in parts[:-1]:
        if not isinstance(cur, dict) or part not in cur or not isinstance(cur.get(part), dict):
            return False
        cur = cur.get(part)
    if not isinstance(cur, dict) or parts[-1] not in cur:
        return False
    cur.pop(parts[-1], None)
    return True


def _law_coerce_scalar(raw: str):
    text = str(raw or "").strip()
    if text == "":
        return ""
    low = text.lower()
    if low == "true":
        return True
    if low == "false":
        return False
    if low == "null":
        return None
    try:
        if re.fullmatch(r"-?\d+", text):
            return int(text)
        if re.fullmatch(r"-?\d+\.\d+", text):
            return float(text)
    except Exception:
        pass
    if text.startswith("{") or text.startswith("[") or text.startswith('"'):
        try:
            return json.loads(text)
        except Exception:
            pass
    return text


def _law_normalize_value_for_path(path: str, value):
    lower_path = str(path or "").lower()
    if isinstance(value, str):
        if "category" in lower_path:
            return normalize_category(value)
        if "keyword" in lower_path or "action" in lower_path or "actor" in lower_path:
            return value.strip().lower()
        if "symbol" in lower_path:
            return value.strip().upper()
    return value


def _actor_key_for_entity(entity: Optional[dict]) -> str:
    etype = str((entity or {}).get("type", "")).lower()
    if etype in {"person", "company", "npc"}:
        return etype
    return "other"


def _law_list_contains(values: list[str], target: str) -> bool:
    needle = str(target or "").strip().lower()
    return needle in set(_norm_unique_text_list(values))


def _law_keywords_match(values: list[str], text: str) -> bool:
    hay = str(text or "").strip().lower()
    if not hay:
        return False
    for key in _norm_unique_text_list(values):
        if key and key in hay:
            return True
    return False


def is_explicitly_allowed_by_law(buyer: Optional[dict], product: dict) -> bool:
    if not buyer or not product:
        return False
    buyer_type = str(buyer.get("type", "")).lower()
    if buyer_type not in {"person", "company"}:
        return False
    state_entity = get_state_entity_for_actor(buyer)
    if not state_entity:
        return False
    ensure_state_law_engine(state_entity)
    perms = state_entity.get("profile", {}).get("laws", {}).get("permissions", {})
    scope = "person" if buyer_type == "person" else "company"
    category = normalize_category(product.get("category", ""))
    name_text = str(product.get("name", "")).strip().lower()
    return _law_list_contains(perms.get(f"{scope}_allow_categories", []), category) or _law_keywords_match(
        perms.get(f"{scope}_allow_keywords", []), name_text
    )


def evaluate_permission_law(
    buyer: Optional[dict],
    product: dict,
) -> tuple[bool, str]:
    if not buyer or not product:
        return True, ""
    buyer_type = str(buyer.get("type", "")).lower()
    if buyer_type not in {"person", "company"}:
        return True, ""

    state_entity = get_state_entity_for_actor(buyer)
    if not state_entity:
        return True, ""
    ensure_state_law_engine(state_entity)
    perms = state_entity.get("profile", {}).get("laws", {}).get("permissions", {})

    scope = "person" if buyer_type == "person" else "company"
    category = normalize_category(product.get("category", ""))
    name_text = str(product.get("name", "")).strip().lower()

    allow_categories = perms.get(f"{scope}_allow_categories", [])
    deny_categories = perms.get(f"{scope}_deny_categories", [])
    allow_keywords = perms.get(f"{scope}_allow_keywords", [])
    deny_keywords = perms.get(f"{scope}_deny_keywords", [])
    whitelist_mode = bool(perms.get(f"{scope}_whitelist_mode", False))

    if _law_list_contains(deny_categories, category) or _law_keywords_match(deny_keywords, name_text):
        return False, f"Judikative in {state_entity.get('name')} verbietet dieses Produkt fuer {scope}."

    if _law_list_contains(allow_categories, category) or _law_keywords_match(allow_keywords, name_text):
        return True, ""

    if whitelist_mode:
        return False, f"Judikative in {state_entity.get('name')}: {scope}-Whitelist aktiv, Produkt nicht freigegeben."
    return True, ""


def evaluate_action_permission_law(actor_entity: Optional[dict], action_name: str) -> tuple[bool, str]:
    if not actor_entity:
        return True, ""
    actor = _actor_key_for_entity(actor_entity)
    if actor not in {"person", "company"}:
        return True, ""
    state_entity = get_state_entity_for_actor(actor_entity)
    if not state_entity:
        return True, ""
    ensure_state_law_engine(state_entity)
    perms = state_entity.get("profile", {}).get("laws", {}).get("permissions", {})
    action = str(action_name or "").strip().lower()
    deny_actions = perms.get(f"{actor}_deny_actions", []) or []
    allow_actions = perms.get(f"{actor}_allow_actions", []) or []
    whitelist_mode = bool(perms.get(f"{actor}_action_whitelist_mode", False))

    if _law_list_contains(deny_actions, action):
        return False, f"Judikative in {state_entity.get('name')} verbietet Aktion `{action}` fuer {actor}."
    if _law_list_contains(allow_actions, action):
        return True, ""
    if whitelist_mode:
        return False, f"Judikative in {state_entity.get('name')}: Action-Whitelist fuer {actor} aktiv."
    return True, ""


def evaluate_negotiation_law(
    buyer: Optional[dict],
    product: dict,
    contract_total: float,
) -> tuple[bool, str]:
    if not buyer or not product:
        return True, ""
    buyer_type = str(buyer.get("type", "")).lower()
    if buyer_type not in {"person", "company"}:
        return True, ""
    if contract_total <= 0:
        return True, ""

    state_entity = get_state_entity_for_actor(buyer)
    if not state_entity:
        return True, ""
    ensure_state_law_engine(state_entity)
    laws = state_entity.get("profile", {}).get("laws", {})
    limits_map = (
        laws.get("limits", {})
        .get("contracts", {})
        .get("max_total_by_actor_category", {})
    )
    limits = limits_map.get("person" if buyer_type == "person" else "company", {}) or {}
    category = normalize_category(product.get("category", ""))
    limit = limits.get(category)
    if limit is None:
        return True, ""
    if float(contract_total) <= float(limit):
        return True, ""
    return (
        False,
        f"Judikative in {state_entity.get('name')}: Verhandlungslimit fuer {category} ist {format_money(float(limit))} "
        f"(angeboten: {format_money(float(contract_total))}).",
    )


def evaluate_contract_min_total_law(product: dict, offered_total: float, buyer: Optional[dict]) -> tuple[bool, str]:
    if not product:
        return True, ""
    if offered_total is None or float(offered_total) <= 0:
        return True, ""
    state_entity = get_state_entity_for_actor(buyer)
    if not state_entity:
        return True, ""
    ensure_state_law_engine(state_entity)
    min_map = (
        state_entity.get("profile", {})
        .get("laws", {})
        .get("limits", {})
        .get("contracts", {})
        .get("min_total_by_category", {})
        or {}
    )
    category = normalize_category(product.get("category", ""))
    min_total = min_map.get(category)
    if min_total is None:
        return True, ""
    if float(offered_total) >= float(min_total):
        return True, ""
    return (
        False,
        f"Judikative in {state_entity.get('name')}: Mindest-Vertragswert fuer {category} ist "
        f"{format_money(float(min_total))} (angeboten: {format_money(float(offered_total))}).",
    )


def evaluate_stock_buy_law(actor_entity: Optional[dict], stock: dict, qty: int) -> tuple[bool, str]:
    if not actor_entity or not stock or qty <= 0:
        return True, ""
    actor = _actor_key_for_entity(actor_entity)
    if actor not in {"person", "company"}:
        return True, ""

    state_entity = get_state_entity_for_actor(actor_entity)
    if not state_entity:
        return True, ""
    ensure_state_law_engine(state_entity)

    ok, reason = evaluate_action_permission_law(actor_entity, "stock_buy")
    if not ok:
        return False, reason

    limits = state_entity.get("profile", {}).get("laws", {}).get("limits", {}).get("stocks", {})
    entity_id = str(actor_entity.get("id"))
    symbol = str(stock.get("symbol", "")).upper()
    outstanding = int(stock.get("outstanding", 0) or 0)
    current = int(get_holding(entity_id, symbol))
    next_holding = current + int(qty)

    max_units_actor = (limits.get("max_holding_units_by_actor", {}) or {}).get(actor)
    if max_units_actor is not None and float(max_units_actor) > 0 and next_holding > int(float(max_units_actor)):
        return (
            False,
            f"Judikative in {state_entity.get('name')}: max Bestand fuer {actor} ist {int(float(max_units_actor))} Anteile.",
        )

    max_units_sym = (
        ((limits.get("max_holding_units_by_actor_symbol", {}) or {}).get(actor, {}) or {}).get(symbol)
    )
    if max_units_sym is not None and float(max_units_sym) > 0 and next_holding > int(float(max_units_sym)):
        return (
            False,
            f"Judikative in {state_entity.get('name')}: max Bestand fuer {actor} in {symbol} ist {int(float(max_units_sym))}.",
        )

    if outstanding > 0:
        next_pct = (float(next_holding) / float(outstanding)) * 100.0
        max_pct_actor = (limits.get("max_holding_pct_by_actor", {}) or {}).get(actor)
        if max_pct_actor is not None and float(max_pct_actor) > 0 and next_pct > float(max_pct_actor):
            return (
                False,
                f"Judikative in {state_entity.get('name')}: max Anteil fuer {actor} ist {float(max_pct_actor):.2f}% "
                f"(nach Kauf waeren es {next_pct:.2f}%).",
            )
        max_pct_sym = (
            ((limits.get("max_holding_pct_by_actor_symbol", {}) or {}).get(actor, {}) or {}).get(symbol)
        )
        if max_pct_sym is not None and float(max_pct_sym) > 0 and next_pct > float(max_pct_sym):
            return (
                False,
                f"Judikative in {state_entity.get('name')}: max Anteil fuer {actor} in {symbol} ist "
                f"{float(max_pct_sym):.2f}% (nach Kauf waeren es {next_pct:.2f}%).",
            )

    max_buys_turn = (limits.get("max_new_buys_per_turn_by_actor", {}) or {}).get(actor)
    if max_buys_turn is not None and float(max_buys_turn) > 0:
        current_turn = int(turn_state.get("turn_index", 1))
        buy_count = 0
        for tx in economy_data.get("transactions", []):
            if str(tx.get("type", "")) != "buy_stock":
                continue
            if int(tx.get("turn", -1)) != current_turn:
                continue
            if str(tx.get("entity_id", "")) != str(actor_entity.get("id")):
                continue
            buy_count += 1
        if buy_count >= int(float(max_buys_turn)):
            return (
                False,
                f"Judikative in {state_entity.get('name')}: max Kaufvorgaenge pro Zug fuer {actor} ist "
                f"{int(float(max_buys_turn))}.",
            )
    return True, ""


def _entity_has_state_supply_product(entity_id: str) -> bool:
    for product in economy_data.get("products", {}).values():
        ensure_product_structure(product)
        if not product.get("active", True):
            continue
        if str(product.get("owner_entity_id")) != str(entity_id):
            continue
        if bool(product.get("is_state_offer")) or normalize_category(product.get("category", "")) == "public_state_offers":
            return True
    return False


def _entity_active_product_categories(entity_id: str) -> set[str]:
    cats = set()
    for product in economy_data.get("products", {}).values():
        ensure_product_structure(product)
        if not product.get("active", True):
            continue
        if str(product.get("owner_entity_id")) != str(entity_id):
            continue
        cats.add(normalize_category(product.get("category", "")))
    return cats


def _calculate_state_subsidy_payouts(state_entity: dict) -> list[tuple[str, float, list[str]]]:
    ensure_state_law_engine(state_entity)
    subsidies_mod = (
        state_entity.get("profile", {})
        .get("laws", {})
        .get("modifiers", {})
        .get("subsidies", {})
    )
    direct_map = subsidies_mod.get("direct_per_turn_by_category", {}) or {}
    direct_company_map = subsidies_mod.get("direct_per_turn_by_company_id", {}) or {}
    if not direct_map and not direct_company_map:
        return []

    payouts: list[tuple[str, float, list[str]]] = []
    state_entity_id = str(state_entity.get("id"))
    for other_id, other in economy_data.get("entities", {}).items():
        if str(other.get("type", "")).lower() != "company":
            continue
        ensure_entity_profile_structure(other)
        op = other.get("profile", {})
        linked_by_id = str(op.get("state_entity_id") or "") == state_entity_id
        linked_by_name = (
            str(op.get("state", "")).strip().lower()
            == str(state_entity.get("name", "")).strip().lower()
        )
        if not (linked_by_id or linked_by_name):
            continue
        company_cats = _entity_active_product_categories(str(other_id))
        hit = []
        total = float(direct_company_map.get(str(other_id), 0.0) or 0.0)
        for cat, amount in direct_map.items():
            cat_norm = normalize_category(cat)
            if cat_norm in company_cats and float(amount) > 0:
                total += float(amount)
                hit.append(cat_norm)
        total = round(total, 2)
        if total > 0:
            payouts.append((str(other_id), total, sorted(set(hit))))
    return payouts


def compute_effective_tax_pct(base_pct: float, state_entity: dict, target_entity: dict) -> float:
    pct = float(base_pct)
    actor = _actor_key_for_entity(target_entity)
    ensure_state_law_engine(state_entity)
    tax_mod = (
        state_entity.get("profile", {})
        .get("laws", {})
        .get("modifiers", {})
        .get("tax", {})
    )

    flat_discount = float((tax_mod.get("flat_discount_pct_by_actor", {}) or {}).get(actor, 0.0) or 0.0)
    pct -= flat_discount

    if _entity_has_state_supply_product(str(target_entity.get("id"))):
        prod_discount = float(
            (tax_mod.get("producer_discount_pct_for_state_supply_by_actor", {}) or {}).get(actor, 0.0) or 0.0
        )
        pct -= prod_discount

    if actor == "company":
        cat_discounts = tax_mod.get("producer_discount_pct_by_category", {}) or {}
        best = 0.0
        company_cats = _entity_active_product_categories(str(target_entity.get("id")))
        for cat in company_cats:
            val = float(cat_discounts.get(cat, 0.0) or 0.0)
            if val > best:
                best = val
        pct -= best
        subsidies_tax_credit = (
            state_entity.get("profile", {})
            .get("laws", {})
            .get("modifiers", {})
            .get("subsidies", {})
            .get("tax_credit_pct_by_category", {})
            or {}
        )
        sub_best = 0.0
        for cat in company_cats:
            val = float(subsidies_tax_credit.get(cat, 0.0) or 0.0)
            if val > sub_best:
                sub_best = val
        pct -= sub_best

    min_pct = float((tax_mod.get("min_tax_pct_by_actor", {}) or {}).get(actor, 0.0) or 0.0)
    max_pct = float((tax_mod.get("max_tax_pct_by_actor", {}) or {}).get(actor, 100.0) or 100.0)
    pct = clamp(pct, min_pct, max_pct)
    return max(0.0, pct)


CONTRACT_CLAUSE_CATALOG = {
    "product_delivery": "Produktlieferung",
    "service_scope": "Dienstleistungsumfang",
    "price_total": "Preis / Volumen",
    "payment_schedule": "Zahlungsplan",
    "stock_transfer": "Aktienuebertragung",
    "salary_per_turn": "Gehalt pro Zug",
    "obligation": "Verpflichtung / Pflicht",
    "permissions_change": "Permissions-Regel",
    "tax_discount": "Steuerkondition",
    "subsidy": "Subvention",
}

CONTRACT_ALLOWED_BY_COUNTERPARTY = {
    "person": [
        "product_delivery",
        "service_scope",
        "price_total",
        "payment_schedule",
        "stock_transfer",
        "obligation",
    ],
    "company": [
        "product_delivery",
        "service_scope",
        "price_total",
        "payment_schedule",
        "stock_transfer",
        "salary_per_turn",
        "obligation",
    ],
    "state": list(CONTRACT_CLAUSE_CATALOG.keys()),
}


def get_contract_allowed_clause_types(counterparty_type: str) -> list[str]:
    c = str(counterparty_type or "").strip().lower()
    return list(CONTRACT_ALLOWED_BY_COUNTERPARTY.get(c, CONTRACT_ALLOWED_BY_COUNTERPARTY["person"]))


def _get_contract_clause_rules_from_laws(actor_entity: Optional[dict]) -> dict:
    state_entity = get_state_entity_for_actor(actor_entity)
    if not state_entity:
        return {}
    ensure_state_law_engine(state_entity)
    addons = state_entity.get("profile", {}).get("laws", {}).get("addons", {}) or {}
    contract_rules = addons.get("contract", {}) or {}
    return contract_rules if isinstance(contract_rules, dict) else {}


def evaluate_contract_clause_policy(
    actor_entity: Optional[dict],
    clause_type: str,
    counterparty_type: str,
) -> tuple[bool, str]:
    ctype = str(clause_type or "").strip().lower()
    allowed = get_contract_allowed_clause_types(counterparty_type)
    if ctype not in allowed:
        return False, f"Klausel `{ctype}` ist fuer Gegenpartei-Typ `{counterparty_type}` nicht zulaessig."

    ok, reason = evaluate_action_permission_law(actor_entity, f"contract_clause_{ctype}")
    if not ok:
        return False, reason

    actor = _actor_key_for_entity(actor_entity)
    rules = _get_contract_clause_rules_from_laws(actor_entity)
    deny_actor = (rules.get("blocked_clause_types_by_actor", {}) or {}).get(actor, []) or []
    allow_actor = (rules.get("allowed_clause_types_by_actor", {}) or {}).get(actor, []) or []
    if deny_actor and ctype in set(str(x).strip().lower() for x in deny_actor):
        return False, f"Law verbietet Klausel `{ctype}` fuer {actor}."
    if allow_actor:
        allow_set = set(str(x).strip().lower() for x in allow_actor)
        if ctype not in allow_set:
            return False, f"Law erlaubt fuer {actor} nur: {', '.join(sorted(allow_set))}."

    by_counterparty = rules.get("allowed_clause_types_by_counterparty", {}) or {}
    cp_list = by_counterparty.get(str(counterparty_type or "").lower())
    if isinstance(cp_list, list) and cp_list:
        cp_set = set(str(x).strip().lower() for x in cp_list)
        if ctype not in cp_set:
            return False, f"Law erlaubt fuer Gegenpartei `{counterparty_type}` diese Klausel nicht."
    return True, ""


def build_contract_clause_text(clauses: list[dict]) -> str:
    if not clauses:
        return "Keine Zusatzklauseln."
    lines = []
    for idx, c in enumerate(clauses, start=1):
        side = "Angebot" if c.get("side") == "offer" else "Forderung"
        ctype = str(c.get("type", ""))
        label = CONTRACT_CLAUSE_CATALOG.get(ctype, ctype)
        desc = str(c.get("description", "")).strip() or "-"
        v1 = str(c.get("value_a", "")).strip()
        v2 = str(c.get("value_b", "")).strip()
        extra = []
        if v1:
            extra.append(f"A={v1}")
        if v2:
            extra.append(f"B={v2}")
        suffix = f" ({', '.join(extra)})" if extra else ""
        lines.append(f"{idx}. {side} | {label}: {desc}{suffix}")
    return "\n".join(lines)


def _extract_product_terms_from_clauses(clauses: list[dict]) -> tuple[Optional[str], Optional[float], Optional[int]]:
    for c in clauses:
        if str(c.get("type", "")).lower() != "product_delivery":
            continue
        desc = str(c.get("description", ""))
        m = re.search(r"#(\d+)", desc)
        pid = m.group(1) if m else (str(c.get("value_a", "")).strip() or None)
        try:
            qty = int(float(c.get("value_b", 1) or 1))
        except Exception:
            qty = 1
        # price may come from price_total clause
        unit = None
        return pid, unit, max(1, qty)
    return None, None, None


def _extract_price_from_clauses(clauses: list[dict]) -> Optional[float]:
    for c in clauses:
        if str(c.get("type", "")).lower() != "price_total":
            continue
        for key in ("value_a", "value_b", "description"):
            raw = str(c.get(key, "")).replace(",", ".")
            m = re.search(r"(-?\d+(?:\.\d+)?)", raw)
            if m:
                try:
                    val = round(float(m.group(1)), 2)
                except Exception:
                    continue
                if val > 0:
                    return val
    return None


def ensure_contract_wizard_product(
    seller_entity_id: str,
    counterparty_type: str,
    clauses: list[dict],
) -> tuple[str, float, int]:
    pid, unit, qty = _extract_product_terms_from_clauses(clauses)
    price_total = _extract_price_from_clauses(clauses) or 100.0
    if pid:
        product = get_product(pid)
        if product:
            if unit is None:
                unit = round(price_total / max(1, int(qty or 1)), 2)
            return str(pid), float(unit), int(max(1, qty or 1))
    # fallback: create abstract contract product
    category = "services" if str(counterparty_type).lower() in {"person", "company"} else "public_state_offers"
    pname = "Vertragsgegenstand (Wizard)"
    product_id = create_product(
        owner_entity_id=str(seller_entity_id),
        category=category,
        name=pname,
        base_price=round(price_total, 2),
        is_state_offer=(category == "public_state_offers"),
        description="Automatisch aus Contract-Wizard erstellt.",
    )
    return str(product_id), round(price_total, 2), 1


def create_contract(
    seller_entity_id: str,
    buyer_entity_id: str,
    product_id: str,
    unit_price: float,
    quantity: int,
    terms: str,
    meta: Optional[dict] = None,
) -> str:
    contract_id = str(_next_id("contract"))
    economy_data["contracts"][contract_id] = {
        "id": contract_id,
        "seller_entity_id": str(seller_entity_id),
        "buyer_entity_id": str(buyer_entity_id),
        "product_id": str(product_id),
        "unit_price": round(float(unit_price), 2),
        "quantity": int(quantity),
        "total_price": round(float(unit_price) * int(quantity), 2),
        "terms": terms[:500],
        "status": "pending_buyer",
        "created_turn": int(turn_state.get("turn_index", 1)),
        "signed_by_seller": True,
        "signed_by_buyer": False,
        "executed_turn": None,
        "meta": meta or {},
    }
    save_economy()
    return contract_id


def validate_contract_policy(
    seller_entity_id: str,
    buyer_entity_id: str,
    product_id: str,
    offered_total: Optional[float] = None,
    quantity: int = 1,
) -> tuple[bool, str]:
    product = get_product(product_id)
    if not product:
        return False, "Produkt nicht gefunden."
    category = normalize_category(product.get("category", ""))
    qty = max(1, int(quantity or 1))

    buyer = get_entity(str(buyer_entity_id))
    seller = get_entity(str(seller_entity_id))
    if not buyer or not seller:
        return False, "Verkaeufer oder Kaeufer nicht gefunden."
    buyer_type = str((buyer or {}).get("type", "")).lower()
    seller_type = str((seller or {}).get("type", "")).lower()
    if is_product_inventory_tracked(product):
        available = get_inventory_qty(str(seller_entity_id), str(product_id))
        if available < qty:
            return False, f"Verkaeuferbestand zu niedrig: {available}/{qty} fuer Produkt #{product_id}."

    # Judikative-Policy: permissions (allow/deny/whitelist) auf Kategorie + Produktname.
    ok, reason = evaluate_action_permission_law(seller, "contract_sell")
    if not ok:
        return False, reason
    ok, reason = evaluate_action_permission_law(buyer, "contract_buy")
    if not ok:
        return False, reason
    ok, reason = evaluate_permission_law(buyer, product)
    if not ok:
        return False, reason

    # Person/Firma duerfen Military nur vom Staat beziehen.
    if category == "military" and buyer_type in {"person", "company"} and seller_type != "state":
        # Ausnahme: explizite Freigabe durch Judikative des Heimatstaates.
        if not is_explicitly_allowed_by_law(buyer, product):
            return False, "Military-Produkte duerfen fuer Person/Firma nur per Vertrag mit einem Staat erworben werden."

    # Judikative-Policy: Verhandlungs-/Ultimatum-Limits je Kategorie.
    if offered_total is not None:
        ok, reason = evaluate_contract_min_total_law(product, float(offered_total), buyer)
        if not ok:
            return False, reason
        ok, reason = evaluate_negotiation_law(buyer, product, float(offered_total))
        if not ok:
            return False, reason
    return True, ""


def sign_contract(contract_id: str, signer_entity_id: str) -> tuple[bool, str]:
    contract = economy_data.get("contracts", {}).get(str(contract_id))
    if not contract:
        return False, "Vertrag nicht gefunden."
    if contract.get("status") not in {"pending_buyer", "pending_seller"}:
        return False, f"Vertrag ist nicht signierbar (Status: {contract.get('status')})."

    if str(contract.get("buyer_entity_id")) == str(signer_entity_id):
        contract["signed_by_buyer"] = True
    if str(contract.get("seller_entity_id")) == str(signer_entity_id):
        contract["signed_by_seller"] = True

    if contract.get("signed_by_buyer") and contract.get("signed_by_seller"):
        contract["status"] = "active"
        save_economy()
        return True, "Vertrag beidseitig signiert und aktiv."
    save_economy()
    return True, "Signatur gespeichert."


def execute_active_contracts_for_turn(turn_index: int) -> list[str]:
    summaries = []
    for contract in economy_data.get("contracts", {}).values():
        if contract.get("status") != "active":
            continue
        if contract.get("executed_turn") is not None:
            continue
        seller_entity_id = str(contract.get("seller_entity_id"))
        buyer_entity_id = str(contract.get("buyer_entity_id"))
        product_id = str(contract.get("product_id"))
        qty = max(1, int(contract.get("quantity", 1) or 1))
        product = get_product(product_id)
        seller_acc = get_primary_account_id(str(contract.get("seller_entity_id")))
        buyer_acc = get_primary_account_id(str(contract.get("buyer_entity_id")))
        total = float(contract.get("total_price", 0.0))
        if not seller_acc or not buyer_acc:
            contract["status"] = "failed"
            summaries.append(f"Vertrag #{contract.get('id')}: fehlendes Konto.")
            continue
        if is_product_inventory_tracked(product):
            available = get_inventory_qty(seller_entity_id, product_id)
            if available < qty:
                contract["status"] = "failed"
                summaries.append(
                    f"Vertrag #{contract.get('id')} fehlgeschlagen: Bestand zu niedrig "
                    f"({available}/{qty}) fuer Produkt #{product_id}."
                )
                continue
        ok, msg = transfer_funds(
            from_account_id=buyer_acc,
            to_account_id=seller_acc,
            amount=total,
            note=f"contract_{contract.get('id')}",
        )
        if ok:
            if is_product_inventory_tracked(product):
                inv_ok, inv_msg = transfer_inventory(seller_entity_id, buyer_entity_id, product_id, qty)
                if not inv_ok:
                    contract["status"] = "failed"
                    summaries.append(
                        f"Vertrag #{contract.get('id')} Zahlung erfolgt, Inventartransfer fehlgeschlagen: {inv_msg}"
                    )
                    continue
            contract["status"] = "completed"
            contract["executed_turn"] = int(turn_index)
            if is_product_inventory_tracked(product):
                summaries.append(f"Vertrag #{contract.get('id')} ausgefuehrt ({format_money(total)}, Menge {qty}).")
            else:
                summaries.append(f"Vertrag #{contract.get('id')} ausgefuehrt ({format_money(total)}).")
        else:
            contract["status"] = "failed"
            summaries.append(f"Vertrag #{contract.get('id')} fehlgeschlagen: {msg}")
    save_economy()
    return summaries


def set_salary(employer_entity_id: str, employee_user_id: int, amount: float, note: str = ""):
    economy_data["salaries"][str(employee_user_id)] = {
        "employee_user_id": int(employee_user_id),
        "employer_entity_id": str(employer_entity_id),
        "amount": round(float(amount), 2),
        "note": note[:200],
        "active": True,
    }
    save_economy()


def execute_salary_payouts_for_turn() -> list[str]:
    summaries = []
    for employee_id, entry in list(economy_data.get("salaries", {}).items()):
        if not entry.get("active"):
            continue
        employer_acc = get_primary_account_id(str(entry.get("employer_entity_id")))
        employee_entity_id, employee_acc = get_or_create_player_entity(int(employee_id), f"user-{employee_id}")
        if not employer_acc or not employee_acc:
            summaries.append(f"Gehalt {employee_id}: Konto fehlt.")
            continue
        amount = float(entry.get("amount", 0.0))
        ok, msg = transfer_funds(
            from_account_id=employer_acc,
            to_account_id=employee_acc,
            amount=amount,
            note=f"salary_{employee_id}",
        )
        if ok:
            summaries.append(f"Gehalt ausgezahlt an <@{employee_id}>: {format_money(amount)}")
        else:
            summaries.append(f"Gehalt an <@{employee_id}> fehlgeschlagen: {msg}")
    return summaries


def execute_state_incomes_for_turn() -> list[str]:
    summaries = []
    for entity_id, entity in economy_data.get("entities", {}).items():
        if str(entity.get("type", "")).lower() != "state":
            continue
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {})
        state_name = str(entity.get("name", ""))
        account_id = get_primary_account_id(str(entity_id))
        if not account_id:
            account_id = create_account(str(entity_id), "Staatskasse", 0.0)
        acc = get_account(account_id)

        # Struktur-Einkommen haengt von Anzahl der Akteure in diesem Staat ab.
        linked = get_entities_by_state(state_name)
        person_count = len(linked["person"])
        company_count = len(linked["company"])
        npc_count = len(linked["npc"])
        structural_income = (person_count * 12.0) + (company_count * 85.0) + (npc_count * 20.0)

        tax_person = float(profile.get("tax_pct_person", 0.0) or 0.0)
        tax_company = float(profile.get("tax_pct_company", 0.0) or 0.0)
        tax_npc = float(profile.get("tax_pct_npc", 0.0) or 0.0)

        tax_collected = 0.0
        for other_id, other in economy_data.get("entities", {}).items():
            if str(other.get("type", "")).lower() == "state":
                continue
            ensure_entity_profile_structure(other)
            op = other.get("profile", {})
            linked_by_id = str(op.get("state_entity_id") or "") == str(entity_id)
            linked_by_name = (str(op.get("state", "")).strip().lower() == state_name.strip().lower())
            if not (linked_by_id or linked_by_name):
                continue

            etype = str(other.get("type", "")).lower()
            pct = 0.0
            if etype == "person":
                pct = tax_person
            elif etype == "company":
                pct = tax_company
            elif etype == "npc":
                pct = tax_npc
            pct = compute_effective_tax_pct(pct, entity, other)
            if pct <= 0:
                continue

            source_acc_id = get_primary_account_id(str(other_id))
            if not source_acc_id:
                continue
            source_acc = get_account(source_acc_id)
            if not source_acc:
                continue
            base = float(source_acc.get("balance", 0.0))
            tax_amount = round(max(0.0, base * (pct / 100.0)), 2)
            if tax_amount <= 0:
                continue
            ok, msg = transfer_funds(
                from_account_id=source_acc_id,
                to_account_id=account_id,
                amount=tax_amount,
                note=f"state_tax_{entity_id}",
            )
            if ok:
                tax_collected += tax_amount

        total_income = round(structural_income + tax_collected, 2)
        if structural_income > 0:
            acc["balance"] = round(float(acc.get("balance", 0.0)) + structural_income, 2)
            record_transaction(
                "state_structural_income",
                {
                    "entity_id": str(entity_id),
                    "amount": round(structural_income, 2),
                    "note": "population_and_companies",
                },
            )

        subsidy_paid = 0.0
        subsidy_count = 0
        subsidies_cfg = (
            entity.get("profile", {})
            .get("laws", {})
            .get("modifiers", {})
            .get("subsidies", {})
            or {}
        )
        subsidy_cap = float(subsidies_cfg.get("max_total_per_state_turn", 0.0) or 0.0)
        subsidy_payouts = _calculate_state_subsidy_payouts(entity)
        subsidy_payouts.sort(key=lambda x: float(x[1]), reverse=True)
        for target_entity_id, amount, hit_categories in subsidy_payouts:
            if amount <= 0:
                continue
            if subsidy_cap > 0:
                remaining_budget = round(max(0.0, subsidy_cap - subsidy_paid), 2)
                if remaining_budget <= 0:
                    break
                amount = min(float(amount), remaining_budget)
            target_acc_id = get_primary_account_id(str(target_entity_id))
            if not target_acc_id:
                continue
            ok, _ = transfer_funds(
                from_account_id=account_id,
                to_account_id=target_acc_id,
                amount=float(amount),
                note=f"state_subsidy_{entity_id}",
            )
            if not ok:
                continue
            subsidy_paid += float(amount)
            subsidy_count += 1
            record_transaction(
                "state_subsidy",
                {
                    "state_entity_id": str(entity_id),
                    "target_entity_id": str(target_entity_id),
                    "amount": round(float(amount), 2),
                    "categories": hit_categories,
                },
            )

        total_income = round(structural_income + tax_collected - subsidy_paid, 2)
        profile["income_per_turn"] = total_income
        profile["last_tax_collected"] = round(tax_collected, 2)
        summaries.append(
            f"{entity.get('name', entity_id)}: +{format_money(total_income)} "
            f"(struktur {format_money(structural_income)}, steuern {format_money(tax_collected)}, subventionen -{format_money(subsidy_paid)} an {subsidy_count})"
        )
    save_economy()
    return summaries


def execute_yearly_dividends_for_turn(turn_index: int) -> list[str]:
    if int(turn_index) % 12 != 0:
        return []

    summaries = []
    ensure_all_stocks_structure()
    for sym, stock in economy_data.get("stocks", {}).items():
        ensure_stock_structure(stock)
        company_entity_id = str(stock.get("company_entity_id"))
        company_acc_id = get_primary_account_id(company_entity_id)
        if not company_acc_id:
            summaries.append(f"{sym}: keine Dividende (kein Emittentenkonto).")
            continue
        company_acc = get_account(company_acc_id)
        if not company_acc:
            summaries.append(f"{sym}: keine Dividende (Konto nicht gefunden).")
            continue

        yield_pct = float(stock.get("dividend_yield_pct", 0.0) or 0.0)
        if yield_pct <= 0:
            summaries.append(f"{sym}: Dividende 0% (ausgesetzt).")
            continue

        price = float(stock.get("price", 0.0) or 0.0)
        per_share = round(max(0.0, price * (yield_pct / 100.0)), 4)
        if per_share <= 0:
            summaries.append(f"{sym}: keine Dividende (Preis zu niedrig).")
            continue

        # Auszahlung an alle Holder ausser Emittent selbst.
        payouts = []
        total_due = 0.0
        for holder_entity_id, holdings in economy_data.get("holdings", {}).items():
            qty = int(holdings.get(sym, 0) or 0)
            if qty <= 0:
                continue
            if str(holder_entity_id) == company_entity_id:
                continue
            holder_acc_id = get_primary_account_id(str(holder_entity_id))
            if not holder_acc_id:
                continue
            amount = round(per_share * qty, 2)
            if amount <= 0:
                continue
            payouts.append((holder_entity_id, holder_acc_id, qty, amount))
            total_due += amount

        if not payouts:
            summaries.append(f"{sym}: keine Dividende (keine externen Anteilseigner).")
            continue

        available = float(company_acc.get("balance", 0.0))
        payout_factor = 1.0
        if total_due > available and total_due > 0:
            payout_factor = available / total_due

        paid_total = 0.0
        paid_holders = 0
        for holder_entity_id, holder_acc_id, qty, amount in payouts:
            payout = round(amount * payout_factor, 2)
            if payout <= 0:
                continue
            ok, msg = transfer_funds(
                from_account_id=company_acc_id,
                to_account_id=holder_acc_id,
                amount=payout,
                note=f"dividend_{sym}_turn_{turn_index}",
            )
            if ok:
                paid_total += payout
                paid_holders += 1

        summaries.append(
            f"{sym}: Dividende ausgeschuettet ({format_money(paid_total)} an {paid_holders} Holder, "
            f"Yield {yield_pct:.2f}%)."
        )
    return summaries


def record_stock_snapshot(turn_index: int):
    history = economy_data.setdefault("stock_history", {})
    for sym, stock in economy_data.get("stocks", {}).items():
        rows = history.setdefault(sym, [])
        rows.append({"turn": int(turn_index), "price": round(float(stock.get("price", 0.0)), 2)})
        if len(rows) > 500:
            history[sym] = rows[-500:]
    save_economy()


def sparkline(values: list[float]) -> str:
    if not values:
        return "-"
    chars = "▁▂▃▄▅▆▇█"
    mn = min(values)
    mx = max(values)
    if mx <= mn:
        return chars[0] * len(values)
    result = []
    for v in values:
        idx = int((v - mn) / (mx - mn) * (len(chars) - 1))
        result.append(chars[idx])
    return "".join(result)


def get_stock_performance(symbol: str) -> Optional[dict]:
    sym = symbol.upper()
    rows = economy_data.get("stock_history", {}).get(sym, [])
    if not rows:
        return None
    prices = [float(r.get("price", 0.0)) for r in rows]
    start = prices[0]
    current = prices[-1]
    high = max(prices)
    low = min(prices)
    change_pct = ((current - start) / start * 100.0) if start else 0.0
    return {
        "symbol": sym,
        "start": start,
        "current": current,
        "high": high,
        "low": low,
        "change_pct": round(change_pct, 2),
        "chart": sparkline(prices[-40:]),
        "points": len(prices),
    }


def get_company_symbols(entity_id: str) -> list[str]:
    symbols = []
    for sym, stock in economy_data.get("stocks", {}).items():
        if str(stock.get("company_entity_id")) == str(entity_id):
            symbols.append(sym)
    return sorted(symbols)


def get_stock_investor_distribution(symbol: str) -> list[tuple[str, float, int]]:
    sym = str(symbol or "").upper()
    stock = economy_data.get("stocks", {}).get(sym, {}) or {}
    outstanding = int(stock.get("outstanding", 0) or 0)
    entries: list[tuple[str, int]] = []
    held_total = 0
    for holder_entity_id, holdings in economy_data.get("holdings", {}).items():
        qty = int((holdings or {}).get(sym, 0) or 0)
        if qty <= 0:
            continue
        held_total += qty
        entries.append((get_entity_name(str(holder_entity_id)), qty))
    entries.sort(key=lambda x: x[1], reverse=True)

    base = outstanding if outstanding > 0 else held_total
    if base <= 0:
        return []
    dist = [(name, round((qty / base) * 100.0, 2), qty) for name, qty in entries]
    if outstanding > held_total:
        rest_qty = outstanding - held_total
        dist.append(("Unallocated", round((rest_qty / base) * 100.0, 2), rest_qty))
    return dist


def render_investor_pie_text(distribution: list[tuple[str, float, int]], max_segments: int = 5) -> str:
    if not distribution:
        return "  (kein Anlegerbestand)"
    top = distribution[:max_segments]
    if len(distribution) > max_segments:
        other_pct = round(sum(p for _, p, _ in distribution[max_segments:]), 2)
        other_qty = int(sum(q for _, _, q in distribution[max_segments:]))
        top.append(("Others", other_pct, other_qty))

    labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    slots_total = 12
    slot_labels = []
    for idx, (_, pct, _) in enumerate(top):
        cnt = int(round((pct / 100.0) * slots_total))
        if pct > 0 and cnt == 0:
            cnt = 1
        slot_labels.extend([labels[idx]] * cnt)
    if len(slot_labels) < slots_total:
        slot_labels.extend(["."] * (slots_total - len(slot_labels)))
    slot_labels = slot_labels[:slots_total]

    coords = [(3, 0), (4, 1), (5, 2), (6, 3), (5, 4), (4, 5), (3, 6), (2, 5), (1, 4), (0, 3), (1, 2), (2, 1)]
    grid = [[" " for _ in range(7)] for _ in range(7)]
    for i, (x, y) in enumerate(coords):
        grid[y][x] = slot_labels[i]
    chart = "\n".join("".join(row).rstrip() for row in grid)
    legend = []
    for idx, (name, pct, qty) in enumerate(top):
        legend.append(f"  {labels[idx]} = {name}: {pct:.2f}% ({qty})")
    return "  Kreisdiagramm:\n" + "\n".join(f"  {line}" for line in chart.splitlines()) + "\n" + "\n".join(legend)


def build_company_profile_text(entity_id: str) -> str:
    entity = get_entity(entity_id)
    if not entity:
        return "Unternehmen nicht gefunden."
    ensure_entity_profile_structure(entity)
    p = entity["profile"]
    tax = get_entity_tax_info(entity_id)
    account_id = get_primary_account_id(entity_id)
    balance = float(get_account(account_id).get("balance", 0.0)) if account_id and get_account(account_id) else 0.0
    owner_user_id = int(entity.get("owner_user_id") or 0)
    owner_text = f"<@{owner_user_id}> ({owner_user_id})" if owner_user_id > 0 else "-"
    symbols = get_company_symbols(entity_id)
    symbol_text = ", ".join(symbols) if symbols else "keine gelisteten Aktien"
    outstanding_debt = 0.0
    active_loan_count = 0
    success = compute_entity_success_metrics(entity_id)
    factor_text = format_success_factors_text(entity_id)
    active_insurances = []
    try:
        active_insurances = get_active_insurance_policies(entity_id)
    except Exception:
        active_insurances = []
    try:
        outstanding_debt = float(get_total_outstanding_debt(entity_id) or 0.0)
        active_loan_count = len(get_loans_for_entity(entity_id, statuses={"active", "delinquent"}))
    except Exception:
        outstanding_debt = 0.0
        active_loan_count = 0
    etype = str(entity.get("type", "")).lower()
    title = "Akteursprofil"
    if etype == "company":
        title = "Unternehmensprofil"
    elif etype == "person":
        title = "Personenprofil"
    elif etype == "npc":
        title = "NPC-Profil"

    if etype == "person":
        personal_accounts = get_accounts_for_entity(entity_id)
        personal_text = ", ".join(
            f"{row['name']}: {format_money(float(row['balance']))}" for row in personal_accounts[:8]
        ) or "-"
        company_rows = get_owned_company_accounts(owner_user_id)
        company_text = ", ".join(
            f"{row['account_name']} ({row['entity_name']}): {format_money(float(row['balance']))}"
            for row in company_rows[:8]
        ) or "-"
        balance_block = (
            f"- Privat-/Personenkonten: {personal_text}\n"
            f"- Firmenkonten (Eigentum): {company_text}\n"
        )
    elif etype == "company":
        company_account_id = get_primary_account_id(entity_id, account_type="company") or get_primary_account_id(entity_id)
        company_account = get_account(company_account_id) if company_account_id else None
        company_account_name = str(company_account.get("name", company_account_id or "-")) if company_account else "-"
        company_balance = float(company_account.get("balance", 0.0) or 0.0) if company_account else 0.0
        balance_block = f"- Firmenkonto: {company_account_name} ({format_money(company_balance)})\n"
    else:
        balance_block = f"- Balance: {format_money(balance)}\n"

    debt_block = (
        f"- Kredite aktiv: {active_loan_count}\n"
        f"- Offene Kreditschuld: {format_money(outstanding_debt)}\n"
    )

    return (
        f"**{title}: {entity.get('name')}**\n"
        f"- Typ: {entity.get('type')}\n"
        f"- Eigentuemer: {owner_text}\n"
        f"- State: {p.get('state') or '-'}\n"
        f"- Territory: {p.get('territory') or '-'}\n"
        f"- City: {p.get('city') or '-'}\n"
        f"- Fuehrungsstil: {p.get('leadership_style') or 'ausgewogen'}\n"
        f"- Unterkategorie: {p.get('company_subtype') or '-'}\n"
        f"- Bild: {p.get('image_url') or '-'}\n"
        f"{balance_block}"
        f"{debt_block}"
        f"- Produktionslage: {factor_text}\n"
        f"- Erfolg: {success['score']:.2f}/100 ({success['label']})\n"
        f"- Produktionsbonus: x{float(success.get('production_multiplier', 1.0)):.2f}\n"
        f"- Ausfallrisiko: {float(success.get('failure_risk_pct', 0.0)):.2f}%\n"
        f"- Versicherungen aktiv: {len(active_insurances)}\n"
        f"- Steuerstaat: {tax['state_name']}\n"
        f"- Steuer: {tax['tax_pct']:.2f}% "
        f"(erwartet naechster Zug: {format_money(tax['expected_tax'])})\n"
        f"- Aktien: {symbol_text}\n"
        f"- Beschreibung:\n{p.get('description') or '-'}"
    )


def get_entities_by_state(state_name: str) -> dict:
    state_key = (state_name or "").strip().lower()
    state_entity = find_state_entity_by_name(state_name)
    state_entity_id = str(state_entity["id"]) if state_entity else None
    groups = {"company": [], "person": [], "npc": []}
    if not state_key:
        return groups
    for entity in economy_data.get("entities", {}).values():
        ensure_entity_profile_structure(entity)
        p = entity.get("profile", {})
        entity_state = str(p.get("state", "")).strip().lower()
        entity_state_id = str(p.get("state_entity_id")) if p.get("state_entity_id") else None
        if state_entity_id:
            if entity_state_id != state_entity_id:
                continue
        else:
            if entity_state != state_key:
                continue
        etype = str(entity.get("type", "")).lower()
        if etype in groups:
            groups[etype].append(entity.get("name", str(entity.get("id"))))
    return groups


def get_entity_tax_info(entity_id: str) -> dict:
    entity = get_entity(entity_id)
    if not entity:
        return {"state_name": "-", "tax_pct": 0.0, "expected_tax": 0.0}
    ensure_entity_profile_structure(entity)
    p = entity.get("profile", {})
    state_entity_id = p.get("state_entity_id")
    state_entity = get_entity(str(state_entity_id)) if state_entity_id else find_state_entity_by_name(p.get("state", ""))
    if not state_entity:
        return {"state_name": "-", "tax_pct": 0.0, "expected_tax": 0.0}
    ensure_entity_profile_structure(state_entity)
    sp = state_entity.get("profile", {})
    etype = str(entity.get("type", "")).lower()
    if etype == "person":
        pct = float(sp.get("tax_pct_person", 0.0) or 0.0)
    elif etype == "company":
        pct = float(sp.get("tax_pct_company", 0.0) or 0.0)
    elif etype == "npc":
        pct = float(sp.get("tax_pct_npc", 0.0) or 0.0)
    else:
        pct = 0.0
    account_id = get_primary_account_id(entity_id)
    balance = float(get_account(account_id).get("balance", 0.0)) if account_id and get_account(account_id) else 0.0
    expected = round(max(0.0, balance * (pct / 100.0)), 2)
    return {"state_name": state_entity.get("name", "-"), "tax_pct": round(pct, 2), "expected_tax": expected}


def build_state_profile_text(entity_id: str) -> str:
    entity = get_entity(entity_id)
    if not entity:
        return "Staat nicht gefunden."
    ensure_entity_profile_structure(entity)
    p = entity.get("profile", {})
    ensure_state_law_engine(entity)
    laws = p.get("laws", {})
    perms = laws.get("permissions", {})
    limits = laws.get("limits", {})
    modifiers = laws.get("modifiers", {})
    addons = laws.get("addons", {})
    contract_limits = (limits.get("contracts", {}).get("max_total_by_actor_category", {}) or {})
    stock_limits = limits.get("stocks", {}) or {}
    tax_mod = modifiers.get("tax", {}) or {}
    law_summary = (
        f"Whitelist P/C: {bool(perms.get('person_whitelist_mode'))}/{bool(perms.get('company_whitelist_mode'))}, "
        f"Allow-Cats P/C: {len(perms.get('person_allow_categories', []))}/{len(perms.get('company_allow_categories', []))}, "
        f"Deny-Cats P/C: {len(perms.get('person_deny_categories', []))}/{len(perms.get('company_deny_categories', []))}, "
        f"Contract-Limits P/C: {len((contract_limits.get('person', {}) or {}))}/"
        f"{len((contract_limits.get('company', {}) or {}))}, "
        f"Stock-Limit-Maps: {len(stock_limits)}, "
        f"Tax-Mod-Maps: {len(tax_mod)}, "
        f"Addons-Keys: {len(addons) if isinstance(addons, dict) else 0}"
    )
    account_id = get_primary_account_id(entity_id)
    balance = 0.0
    if account_id:
        acc = get_account(account_id)
        if acc:
            balance = float(acc.get("balance", 0.0))
    state_name = entity.get("name", "")
    links = get_entities_by_state(state_name)
    companies = ", ".join(links["company"][:30]) if links["company"] else "-"
    persons = ", ".join(links["person"][:30]) if links["person"] else "-"
    npcs = ", ".join(links["npc"][:30]) if links["npc"] else "-"
    territory_names = p.get("territories", []) or []
    territories_text = ", ".join(str(t) for t in territory_names[:30]) if territory_names else (p.get("territory") or "-")
    law_log_count = len(p.get("law_log", []) or [])
    law_log_channel_id = p.get("law_log_channel_id")
    state_control_mode = str(p.get("state_control_mode", "player")).lower()
    state_control_label = "NPC-Staat" if state_control_mode == "npc" else "Spieler-Staat"
    success = compute_state_success_metrics(entity_id)
    factor_text = format_success_factors_text(entity_id)
    return (
        f"**Staatsprofil: {state_name}**\n"
        f"- Steuerung: {state_control_label}\n"
        f"- State: {p.get('state') or state_name}\n"
        f"- Territory: {territories_text}\n"
        f"- City (Regierungssitz): {p.get('city') or '-'}\n"
        f"- Einkommen pro Zug: {format_money(float(p.get('income_per_turn', 0.0)))}\n"
        f"- Letzte Steuerertraege: {format_money(float(p.get('last_tax_collected', 0.0)))}\n"
        f"- Balance: {format_money(balance)}\n"
        f"- Produktionsgegebenheiten: {factor_text}\n"
        f"- Regierungserfolg: {success['score']:.2f}/100 ({success['label']})\n"
        f"- Produktionsklima: x{float(success.get('production_multiplier', 1.0)):.2f}\n"
        f"- Verwaltungs-/Ausfallrisiko: {float(success.get('failure_risk_pct', 0.0)):.2f}%\n"
        f"- Emblem: {p.get('emblem_url') or '-'}\n"
        f"- Steuer Person/Firma/NPC: "
        f"{float(p.get('tax_pct_person', 0.0)):.2f}% / "
        f"{float(p.get('tax_pct_company', 0.0)):.2f}% / "
        f"{float(p.get('tax_pct_npc', 0.0)):.2f}%\n"
        f"- Judikative/Laws: {law_summary}\n"
        f"- Law-Log Eintraege: {law_log_count}\n"
        f"- Law-Log Kanal: {law_log_channel_id or '-'}\n"
        f"- Zugehoerige Unternehmen: {companies}\n"
        f"- Zugehoerige Personen: {persons}\n"
        f"- Zugehoerige NPCs: {npcs}\n"
        f"- Beschreibung:\n{p.get('description') or '-'}"
    )


def build_company_stock_text(entity_id: str) -> str:
    entity = get_entity(entity_id)
    if not entity:
        return "Unternehmen nicht gefunden."
    symbols = get_company_symbols(entity_id)
    lines = [f"**Aktienhistorie: {entity.get('name')}**", f"Stand Zug #{turn_state.get('turn_index', 1)}"]
    if not symbols:
        lines.append("Keine gelisteten Aktien.")
        return "\n".join(lines)
    for sym in symbols:
        perf = get_stock_performance(sym)
        if not perf:
            continue
        dist = get_stock_investor_distribution(sym)
        lines.append(
            f"- {sym}: {format_money(perf['current'])} | Perf {perf['change_pct']}% | "
            f"H {format_money(perf['high'])} / L {format_money(perf['low'])}"
        )
        lines.append(f"  {perf['chart']}")
        lines.append(render_investor_pie_text(dist))
    return "\n".join(lines)


async def _fetch_message_safe(channel, message_id: Optional[int]):
    if not channel or not message_id:
        return None
    try:
        return await channel.fetch_message(int(message_id))
    except Exception:
        return None


async def sync_company_forum_posts(guild: discord.Guild, entity_id: str):
    forums = economy_data.get("company_forums", {})
    cfg = forums.get(str(entity_id))
    if not cfg or not guild:
        return

    profile_thread = guild.get_thread(int(cfg.get("profile_thread_id", 0))) if cfg.get("profile_thread_id") else None
    stock_thread = guild.get_thread(int(cfg.get("stock_thread_id", 0))) if cfg.get("stock_thread_id") else None

    if profile_thread:
        msg = await _fetch_message_safe(profile_thread, cfg.get("profile_message_id"))
        text = build_company_profile_text(entity_id)
        if msg:
            try:
                await msg.edit(content=text)
            except Exception:
                pass

    if stock_thread:
        msg = await _fetch_message_safe(stock_thread, cfg.get("stock_message_id"))
        text = build_company_stock_text(entity_id)
        if msg:
            try:
                await msg.edit(content=text)
            except Exception:
                pass

def create_entity(name: str, entity_type: str, owner_user_id: Optional[int] = None) -> str:
    entity_id = str(_next_id("entity"))
    economy_data["entities"][entity_id] = {
        "id": entity_id,
        "name": name,
        "type": entity_type,
        "owner_user_id": owner_user_id,
        "profile": {
            "description": "",
            "state": "",
            "territory": "",
            "city": "",
            "tags": [],
        },
    }
    economy_data["holdings"].setdefault(entity_id, {})
    save_economy()
    return entity_id


def get_entity(entity_id: str) -> Optional[dict]:
    return economy_data.get("entities", {}).get(str(entity_id))


def ensure_entity_profile_structure(entity: dict):
    profile = entity.setdefault("profile", {})
    profile.setdefault("description", "")
    profile.setdefault("state", "")
    profile.setdefault("state_entity_id", None)
    profile.setdefault("territory", "")
    profile.setdefault("city", "")
    profile.setdefault("image_url", "")
    profile.setdefault("emblem_url", "")
    profile.setdefault("income_per_turn", 0.0)
    profile.setdefault("last_tax_collected", 0.0)
    profile.setdefault("tax_pct_person", 0.0)
    profile.setdefault("tax_pct_company", 0.0)
    profile.setdefault("tax_pct_npc", 0.0)
    profile.setdefault("territories", [])
    profile.setdefault("state_category_channel_id", None)
    profile.setdefault("territory_forums", [])
    profile.setdefault("laws", {})
    profile.setdefault("law_log", [])
    profile.setdefault("law_log_channel_id", None)
    profile.setdefault("state_control_mode", "player")
    profile.setdefault("is_npc_state", False)
    profile.setdefault("npc_strategy_enabled", False)
    profile.setdefault("tags", [])
    profile.setdefault("leadership_style", "ausgewogen")
    profile.setdefault("company_subtype", "")
    profile.setdefault("government_focus", "")
    profile.setdefault("success_factors", {})
    profile.setdefault("production_notes", "")


COMPANY_SUCCESS_FACTOR_DEFAULTS = {
    "infrastructure": 50.0,
    "workforce": 50.0,
    "logistics": 50.0,
    "energy": 50.0,
    "innovation": 50.0,
    "capital_strength": 50.0,
}

STATE_SUCCESS_FACTOR_DEFAULTS = {
    "infrastructure": 50.0,
    "administration": 50.0,
    "stability": 50.0,
    "education": 50.0,
    "security": 50.0,
    "trade_policy": 50.0,
}

SUCCESS_FACTOR_LABELS = {
    "infrastructure": "Infrastruktur",
    "workforce": "Arbeitskraefte",
    "logistics": "Logistik",
    "energy": "Energie",
    "innovation": "Innovation",
    "capital_strength": "Kapital",
    "administration": "Verwaltung",
    "stability": "Stabilitaet",
    "education": "Bildung",
    "security": "Sicherheit",
    "trade_policy": "Handelspolitik",
}


def get_success_factor_defaults_for_entity(entity_or_type) -> dict:
    if isinstance(entity_or_type, dict):
        entity_type = str(entity_or_type.get("type", "")).lower()
    else:
        entity_type = str(entity_or_type or "").lower()
    if entity_type == "state":
        return dict(STATE_SUCCESS_FACTOR_DEFAULTS)
    return dict(COMPANY_SUCCESS_FACTOR_DEFAULTS)


def ensure_entity_success_factors(entity: dict) -> dict:
    ensure_entity_profile_structure(entity)
    profile = entity.setdefault("profile", {})
    factors = profile.setdefault("success_factors", {})
    defaults = get_success_factor_defaults_for_entity(entity)
    changed = False
    if not isinstance(factors, dict):
        factors = {}
        profile["success_factors"] = factors
        changed = True
    for key, default_value in defaults.items():
        raw = factors.get(key, default_value)
        try:
            normalized = round(clamp(float(raw), 0.0, 100.0), 2)
        except Exception:
            normalized = float(default_value)
        if factors.get(key) != normalized:
            factors[key] = normalized
            changed = True
    for key in list(factors.keys()):
        if key not in defaults:
            factors.pop(key, None)
            changed = True
    if changed:
        save_economy()
    return factors


def _success_score_label(score: float) -> str:
    value = float(score or 0.0)
    if value >= 85:
        return "exzellent"
    if value >= 70:
        return "stark"
    if value >= 55:
        return "stabil"
    if value >= 40:
        return "angespannt"
    if value >= 25:
        return "kritisch"
    return "prekär"


def _balance_health_score(balance: float) -> float:
    bal = max(0.0, float(balance or 0.0))
    if bal <= 0:
        return 28.0
    return round(clamp(30.0 + (math.log10(bal + 1.0) * 18.0), 30.0, 95.0), 2)


def _state_entity_link_counts(state_entity: dict) -> dict:
    state_name = str(state_entity.get("name", "") or "")
    linked = get_entities_by_state(state_name)
    return {
        "company": len(linked.get("company", []) or []),
        "person": len(linked.get("person", []) or []),
        "npc": len(linked.get("npc", []) or []),
    }


def compute_state_success_metrics(entity_id: str) -> dict:
    entity = get_entity(entity_id)
    if not entity or str(entity.get("type", "")).lower() != "state":
        return {
            "score": 50.0,
            "label": _success_score_label(50.0),
            "production_multiplier": 1.0,
            "failure_risk_pct": 30.0,
            "treasury_health": 50.0,
            "tax_pressure": 0.0,
        }
    factors = ensure_entity_success_factors(entity)
    account_id = get_primary_account_id(entity_id)
    account = get_account(account_id) if account_id else None
    balance = float(account.get("balance", 0.0) or 0.0) if account else 0.0
    treasury_health = _balance_health_score(balance)
    link_counts = _state_entity_link_counts(entity)
    activity_bonus = clamp(
        (link_counts["company"] * 2.5) + (link_counts["person"] * 0.4) + (link_counts["npc"] * 0.8),
        0.0,
        16.0,
    )
    avg_tax = (
        float(entity.get("profile", {}).get("tax_pct_person", 0.0) or 0.0)
        + float(entity.get("profile", {}).get("tax_pct_company", 0.0) or 0.0)
        + float(entity.get("profile", {}).get("tax_pct_npc", 0.0) or 0.0)
    ) / 3.0
    tax_pressure = clamp(max(0.0, avg_tax - 18.0) * 1.8, 0.0, 28.0)
    base = (
        factors["infrastructure"] * 0.22
        + factors["administration"] * 0.22
        + factors["stability"] * 0.20
        + factors["education"] * 0.14
        + factors["security"] * 0.12
        + factors["trade_policy"] * 0.10
    )
    score = clamp((base * 0.62) + (treasury_health * 0.23) + activity_bonus - (tax_pressure * 0.45), 5.0, 100.0)
    production_multiplier = round(clamp(0.70 + (score / 100.0) * 0.70, 0.70, 1.40), 3)
    failure_risk = round(clamp(55.0 - (score * 0.50), 4.0, 60.0), 2)
    return {
        "score": round(score, 2),
        "label": _success_score_label(score),
        "production_multiplier": production_multiplier,
        "failure_risk_pct": failure_risk,
        "treasury_health": treasury_health,
        "tax_pressure": round(tax_pressure, 2),
        "activity_bonus": round(activity_bonus, 2),
        "factors": factors,
        "linked_counts": link_counts,
    }


def compute_company_success_metrics(entity_id: str) -> dict:
    entity = get_entity(entity_id)
    if not entity:
        return {
            "score": 50.0,
            "label": _success_score_label(50.0),
            "production_multiplier": 1.0,
            "failure_risk_pct": 30.0,
        }
    factors = ensure_entity_success_factors(entity)
    account_id = get_primary_account_id(entity_id, account_type="company") or get_primary_account_id(entity_id)
    account = get_account(account_id) if account_id else None
    balance = float(account.get("balance", 0.0) or 0.0) if account else 0.0
    debt = 0.0
    try:
        debt = float(get_total_outstanding_debt(entity_id) or 0.0)
    except Exception:
        debt = 0.0
    financial_health = _balance_health_score(balance)
    debt_pressure = clamp((debt / max(balance + debt + 5000.0, 1.0)) * 42.0, 0.0, 30.0)
    state_entity = get_state_entity_for_actor(entity)
    state_metrics = compute_state_success_metrics(str(state_entity.get("id"))) if state_entity else None
    state_climate = float((state_metrics or {}).get("score", 50.0) or 50.0)
    base = (
        factors["infrastructure"] * 0.18
        + factors["workforce"] * 0.20
        + factors["logistics"] * 0.18
        + factors["energy"] * 0.12
        + factors["innovation"] * 0.15
        + factors["capital_strength"] * 0.17
    )
    score = clamp((base * 0.62) + (financial_health * 0.18) + (state_climate * 0.14) - debt_pressure, 5.0, 100.0)
    production_multiplier = round(clamp(0.65 + (score / 100.0) * 0.80, 0.65, 1.45), 3)
    failure_risk = round(clamp(58.0 - (score * 0.52), 3.0, 65.0), 2)
    return {
        "score": round(score, 2),
        "label": _success_score_label(score),
        "production_multiplier": production_multiplier,
        "failure_risk_pct": failure_risk,
        "financial_health": financial_health,
        "debt_pressure": round(debt_pressure, 2),
        "state_climate": round(state_climate, 2),
        "factors": factors,
    }


def compute_entity_success_metrics(entity_id: str) -> dict:
    entity = get_entity(entity_id)
    if not entity:
        return {
            "score": 50.0,
            "label": _success_score_label(50.0),
            "production_multiplier": 1.0,
            "failure_risk_pct": 30.0,
            "factors": {},
        }
    entity_type = str(entity.get("type", "")).lower()
    if entity_type == "state":
        return compute_state_success_metrics(entity_id)
    return compute_company_success_metrics(entity_id)


def format_success_factors_text(entity_id: str) -> str:
    entity = get_entity(entity_id)
    if not entity:
        return "-"
    factors = ensure_entity_success_factors(entity)
    parts = []
    for key, value in factors.items():
        parts.append(f"{SUCCESS_FACTOR_LABELS.get(key, key)} {float(value):.0f}")
    return ", ".join(parts) if parts else "-"


def set_entity_success_factor(entity_id: str, field: str, value: float) -> tuple[bool, str]:
    entity = get_entity(entity_id)
    if not entity:
        return False, "Entitaet nicht gefunden."
    factors = ensure_entity_success_factors(entity)
    defaults = get_success_factor_defaults_for_entity(entity)
    field_key = str(field or "").strip().lower()
    if field_key not in defaults:
        options = ", ".join(defaults.keys())
        return False, f"Ungueltiges Feld. Erlaubt: {options}"
    normalized = round(clamp(float(value), 0.0, 100.0), 2)
    factors[field_key] = normalized
    entity.setdefault("profile", {})["success_factors"] = factors
    save_economy()
    return True, f"{SUCCESS_FACTOR_LABELS.get(field_key, field_key)} fuer {entity.get('name')} auf {normalized:.2f} gesetzt."


def set_state_control_mode(entity_id: str, control_mode: str, owner_user_id: Optional[int] = None) -> tuple[bool, str]:
    entity = get_entity(entity_id)
    if not entity:
        return False, "State-Entity nicht gefunden."
    if str(entity.get("type", "")).lower() != "state":
        return False, "Entitaet ist kein State."

    ensure_entity_profile_structure(entity)
    mode = str(control_mode or "").strip().lower()
    if mode not in {"player", "npc"}:
        return False, "Ungueltiger State-Typ. Erlaubt: player, npc."

    profile = entity["profile"]
    profile["state_control_mode"] = mode
    is_npc = mode == "npc"
    profile["is_npc_state"] = is_npc
    profile["npc_strategy_enabled"] = bool(is_npc)

    if is_npc:
        entity["owner_user_id"] = None
    elif owner_user_id is not None:
        entity["owner_user_id"] = int(owner_user_id)

    save_economy()
    return True, f"State-Typ gesetzt: {mode}"


def set_entity_profile(
    entity_id: str,
    description: Optional[str] = None,
    state: Optional[str] = None,
    state_entity_id: Optional[str] = None,
    territory: Optional[str] = None,
    city: Optional[str] = None,
    image_url: Optional[str] = None,
    emblem_url: Optional[str] = None,
    income_per_turn: Optional[float] = None,
):
    entity = get_entity(entity_id)
    if not entity:
        return
    ensure_entity_profile_structure(entity)
    profile = entity["profile"]
    if description is not None:
        profile["description"] = description[:1000]
    if state is not None:
        profile["state"] = state[:120]
        resolved = find_state_entity_by_name(state)
        profile["state_entity_id"] = str(resolved["id"]) if resolved else None
    if state_entity_id is not None:
        profile["state_entity_id"] = str(state_entity_id) if state_entity_id else None
    if territory is not None:
        profile["territory"] = territory[:120]
    if city is not None:
        profile["city"] = city[:120]
    if image_url is not None:
        profile["image_url"] = image_url[:500]
    if emblem_url is not None:
        profile["emblem_url"] = emblem_url[:500]
    if income_per_turn is not None:
        try:
            profile["income_per_turn"] = round(float(income_per_turn), 2)
        except (TypeError, ValueError):
            pass
    save_economy()


def get_defined_states() -> list[str]:
    states = set()
    for s in economy_data.get("settings", {}).get("states", []):
        val = str(s).strip()
        if val:
            states.add(val)
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() == "state":
            name = str(entity.get("name", "")).strip()
            if name:
                states.add(name)
    return sorted(states)


def ensure_lore_state_territory_structure():
    if not isinstance(lore_data.get("states"), list):
        lore_data["states"] = []
    if not isinstance(lore_data.get("territories"), list):
        lore_data["territories"] = []


def _collect_states_and_territories_for_lore() -> tuple[list[str], dict[str, list[str]]]:
    states = get_defined_states()
    state_entities = [e for e in economy_data.get("entities", {}).values() if str(e.get("type", "")).lower() == "state"]
    state_entities.sort(key=lambda x: str(x.get("name", "")).lower())

    territories_by_state: dict[str, list[str]] = {}
    for entity in state_entities:
        state_name = str(entity.get("name", "")).strip()
        if not state_name:
            continue
        ensure_entity_profile_structure(entity)
        profile = entity.get("profile", {}) or {}
        raw_territories = list(profile.get("territories", []) or [])
        if not raw_territories:
            single = str(profile.get("territory", "") or "").strip()
            raw_territories = [single] if single else []
        cleaned: list[str] = []
        seen = set()
        for t in raw_territories:
            name = str(t or "").strip()
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(name)
        territories_by_state[state_name] = cleaned
    return states, territories_by_state


def sync_state_territory_lore_index(save_changes: bool = True) -> dict:
    ensure_lore_state_territory_structure()
    states, territories_by_state = _collect_states_and_territories_for_lore()
    territory_lines = []
    for state_name in states:
        for territory_name in territories_by_state.get(state_name, []):
            territory_lines.append(f"{territory_name} ({state_name})")
    lore_data["states"] = states
    lore_data["territories"] = territory_lines
    if save_changes:
        save_lore()
    return {
        "states": states,
        "territories": territory_lines,
        "territories_by_state": territories_by_state,
    }


def build_lore_overview_text() -> str:
    payload = sync_state_territory_lore_index(save_changes=False)
    states = payload.get("states", []) or []
    territories_by_state = payload.get("territories_by_state", {}) or {}

    lore = lore_data.get("description", "") or "Keine Beschreibung vorhanden."
    events = "\n".join(lore_data.get("events", []) or []) if (lore_data.get("events") or []) else "Keine Ereignisse."
    rules = "\n".join(lore_data.get("rules", []) or []) if (lore_data.get("rules") or []) else "Keine Regeln."
    states_text = "\n".join(f"- {s}" for s in states) if states else "Keine Staaten."

    territory_lines = []
    for state_name in states:
        terrs = territories_by_state.get(state_name, []) or []
        if not terrs:
            continue
        for territory_name in terrs:
            territory_lines.append(f"- {territory_name} ({state_name})")
    territories_text = "\n".join(territory_lines) if territory_lines else "Keine Territorien."

    return (
        f"Allgemeine Weltbeschreibung:\n{lore}\n\n"
        f"Ereignisse:\n{events}\n\n"
        f"Regeln:\n{rules}\n\n"
        f"Staaten:\n{states_text}\n\n"
        f"Territorien:\n{territories_text}"
    )


def _build_lore_search_blob() -> str:
    ensure_lore_state_territory_structure()
    parts = [
        str(lore_data.get("description", "") or ""),
        "\n".join(lore_data.get("events", []) or []),
        "\n".join(lore_data.get("rules", []) or []),
        "\n".join(lore_data.get("states", []) or []),
        "\n".join(lore_data.get("territories", []) or []),
    ]
    return "\n".join(parts)


def find_missing_states_in_lore() -> list[str]:
    states = get_defined_states()
    if not states:
        return []
    sync_state_territory_lore_index(save_changes=False)
    lore_blob = _build_lore_search_blob().lower()
    missing = []
    for state in states:
        if state.lower() not in lore_blob:
            missing.append(state)
    return missing

def find_entity_by_name(name: str) -> Optional[dict]:
    target = name.strip().lower()
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("name", "")).strip().lower() == target:
            return entity
    return None


def find_state_entity_by_name(name: str) -> Optional[dict]:
    target = str(name or "").strip().lower()
    if not target:
        return None
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "state":
            continue
        if str(entity.get("name", "")).strip().lower() == target:
            return entity
    return None


def get_guild_state_limit(guild_id: int) -> int:
    limits = economy_data.get("settings", {}).get("state_limit_by_guild", {}) or {}
    raw = limits.get(str(guild_id), 20)
    try:
        return int(clamp(int(raw), 2, 20))
    except Exception:
        return 20


def set_guild_state_limit(guild_id: int, limit: int):
    economy_data.setdefault("settings", {}).setdefault("state_limit_by_guild", {})[str(guild_id)] = int(
        clamp(int(limit), 2, 20)
    )
    save_economy()


def _find_lore_state_name_matches(state_name: str) -> dict:
    state = str(state_name or "").strip()
    if not state:
        return {"in_lore": False, "close": []}
    sync_state_territory_lore_index(save_changes=False)
    lore_blob = _build_lore_search_blob()
    in_lore = state.lower() in lore_blob.lower()
    known_states = get_defined_states()
    close = difflib.get_close_matches(state, known_states, n=5, cutoff=0.5)
    return {"in_lore": in_lore, "close": close}


def ensure_state_entity(name: str) -> tuple[str, str]:
    state_name = str(name or "").strip()
    entity = find_state_entity_by_name(state_name)
    if entity is None:
        entity_id = create_entity(state_name, "state")
    else:
        entity_id = str(entity["id"])
    account_id = get_primary_account_id(entity_id)
    if account_id is None:
        account_id = create_account(entity_id, "Staatskasse", 800000.0)
    states = economy_data.setdefault("settings", {}).setdefault("states", [])
    if state_name and state_name not in states:
        states.append(state_name)
    entity = get_entity(entity_id)
    if entity:
        ensure_entity_profile_structure(entity)
    save_economy()
    sync_state_territory_lore_index(save_changes=True)
    return entity_id, account_id


def _split_name_syllables(name: str) -> list[str]:
    text = re.sub(r"[^A-Za-zÄÖÜäöüß]", "", str(name or ""))
    if not text:
        return ["na", "ra", "ta", "la"]
    chunks = re.findall(r"[A-Za-zÄÖÜäöüß]{2,4}", text)
    if not chunks:
        chunks = [text[:3].lower()]
    out = []
    for c in chunks:
        out.append(c.lower())
        if len(c) >= 3:
            out.append(c[-2:].lower())
    return [x for x in out if len(x) >= 2][:12] or ["na", "ra", "ta", "la"]


def generate_territory_names(state_name: str, count: int) -> list[str]:
    n = int(clamp(int(count), 3, 20))
    base = _split_name_syllables(state_name)
    rnd = random.Random(f"state-territory-{state_name.lower()}-{n}")
    suffixes = ["ia", "on", "ar", "en", "or", "um", "is", "an", "al", "eth", "os", "yr"]
    names = []
    seen = set()
    tries = 0
    while len(names) < n and tries < n * 60:
        tries += 1
        a = rnd.choice(base)
        b = rnd.choice(base)
        if b == a and rnd.random() < 0.6:
            b = rnd.choice(base)
        raw = (a + b + rnd.choice(suffixes)).lower()
        raw = re.sub(r"(.)\1{2,}", r"\1\1", raw)
        name = raw.capitalize()
        if len(name) < 4:
            continue
        if name in seen:
            continue
        seen.add(name)
        names.append(name)
    while len(names) < n:
        base_part = base[len(names) % len(base)] if base else "ara"
        fallback = f"{(base_part + rnd.choice(suffixes)).capitalize()}-{len(names)+1}"
        if fallback not in seen:
            seen.add(fallback)
            names.append(fallback)
    return names


def _state_map_key(state_entity_id: str) -> str:
    return f"state_{state_entity_id}"


def _world_map_key(guild_id: int) -> str:
    return f"world_{guild_id}"


