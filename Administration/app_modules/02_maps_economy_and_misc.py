# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false

# === SVG to PNG conversion helpers ===
# Alternative method using PIL directly (no GTK3 required on Windows)

# Try to use cairosvg first (best quality, but requires GTK3 on Windows)
CAIRO_AVAILABLE = False
try:
    import cairosvg
    # Test if cairosvg actually works
    test_svg = "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>"
    cairosvg.svg2png(bytestring=test_svg.encode('utf-8'), scale=1.0)
    CAIRO_AVAILABLE = True
    print("[Map] cairosvg is available and working (GTK3 detected)")
except Exception as e:
    print(f"[Map] cairosvg not functional: {e}")
    print("[Map] Will use PIL-based fallback for map images")

# PIL is always available (comes with pillow)
PIL_AVAILABLE = False
try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
    print("[Map] PIL is available")
except Exception:
    print("[Map] PIL not available")


def _svg_to_png_bytes(svg_text: str, scale: float = 2.0) -> Optional[bytes]:
    """Convert SVG to PNG. Tries cairosvg first, falls back to PIL-based rendering."""
    # Try cairosvg first (best quality)
    if CAIRO_AVAILABLE:
        try:
            png_data = cairosvg.svg2png(bytestring=svg_text.encode('utf-8'), scale=scale)
            if png_data and len(png_data) > 100:
                print(f"[Map] Converted to PNG via cairosvg ({len(png_data)} bytes)")
                return png_data
        except Exception as e:
            print(f"[Map] cairosvg conversion failed: {e}")
    
    # Fallback: Use PIL to create a simple representation
    print("[Map] Using PIL-based fallback for PNG conversion")
    return _create_png_from_svg_fallback(svg_text, scale)


def _svg_local_name(tag: str) -> str:
    return str(tag or "").rsplit("}", 1)[-1]


def _parse_svg_number(raw_value, default: float = 0.0) -> float:
    raw = str(raw_value or "").strip()
    if not raw:
        return default
    cleaned = "".join(ch for ch in raw if ch.isdigit() or ch in {".", "-"})
    if cleaned in {"", "-", ".", "-."}:
        return default
    try:
        return float(cleaned)
    except (TypeError, ValueError):
        return default


def _create_png_from_svg_fallback(svg_text: str, scale: float = 2.0) -> Optional[bytes]:
    """Create a simple PNG from SVG using PIL when cairo is unavailable."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        from io import BytesIO
        import xml.etree.ElementTree as ET

        root = ET.fromstring(svg_text)
        base_width = int(round(_parse_svg_number(root.attrib.get("width"), 0)))
        base_height = int(round(_parse_svg_number(root.attrib.get("height"), 0)))

        if base_width <= 0 or base_height <= 0:
            return None

        width = int(base_width * scale)
        height = int(base_height * scale)

        img = Image.new("RGB", (width, height), color="#9dd6ff")
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("arial.ttf", int(14 * scale))
        except Exception:
            try:
                font = ImageFont.load_default()
            except Exception:
                font = None

        for node in root.iter():
            tag = _svg_local_name(node.tag)
            if tag == "rect":
                try:
                    x = int(round(_parse_svg_number(node.attrib.get("x"), 0.0) * scale))
                    y = int(round(_parse_svg_number(node.attrib.get("y"), 0.0) * scale))
                    w = int(round(_parse_svg_number(node.attrib.get("width"), 0.0) * scale))
                    h = int(round(_parse_svg_number(node.attrib.get("height"), 0.0) * scale))
                    if w <= 0 or h <= 0:
                        continue
                    fill = str(node.attrib.get("fill") or "#cccccc").strip()
                    color = fill if fill.startswith("#") else "#cccccc"
                    draw.rectangle([x, y, x + w, y + h], fill=color, outline="#2c4a61")
                except Exception:
                    continue
            if tag != "text":
                continue
            try:
                x = int(round(_parse_svg_number(node.attrib.get("x"), 0.0) * scale))
                y = int(round(_parse_svg_number(node.attrib.get("y"), 0.0) * scale))
                text = "".join(node.itertext()).strip()
                if not text:
                    continue
                if font:
                    draw.text((x, y), text, fill="#0b1020", font=font)
            except Exception:
                continue

        output = BytesIO()
        img.save(output, format="PNG")
        png_data = output.getvalue()

        if png_data and len(png_data) > 100:
            print(f"[Map] Created PNG via PIL fallback ({len(png_data)} bytes)")
            return png_data

    except Exception as e:
        print(f"[Map] PIL fallback failed: {e}")

    return None


def _svg_to_discord_file(svg_text: str, filename: str) -> discord.File:
    """Send map as PNG if conversion possible, otherwise fall back to SVG."""
    print(f"[Map] Converting map: {filename}")
    
    # Try to create PNG
    png_bytes = _svg_to_png_bytes(svg_text, scale=2.0)
    if png_bytes and len(png_bytes) > 100:
        # Return PNG file - Discord will show this inline!
        png_filename = filename.replace(".svg", ".png")
        print(f"[Map] Sending PNG: {png_filename} ({len(png_bytes)} bytes)")
        return discord.File(fp=io.BytesIO(png_bytes), filename=png_filename)
    
    # Fallback to SVG
    print(f"[Map] PNG conversion failed - sending SVG (will require download)")
    data = svg_text.encode("utf-8")
    return discord.File(fp=io.BytesIO(data), filename=filename)


def _build_map_message_payload(label: str, svg_text: str, filename: str) -> dict:
    map_file = _svg_to_discord_file(svg_text, filename)
    payload = {"content": label, "file": map_file}
    if str(map_file.filename or "").lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
        embed = discord.Embed(color=discord.Color.blue())
        embed.set_image(url=f"attachment://{map_file.filename}")
        payload["embed"] = embed
    return payload


def _xml_escape_text(value) -> str:
    import html

    return html.escape(str(value or ""), quote=False)


def _generate_state_svg_map(state_name: str, territories: list[str]) -> str:
    n = max(1, len(territories))
    cols = 78
    rows = 50
    cell = 13
    margin = 24
    width = cols * cell + margin * 2
    height = rows * cell + margin * 2 + 36
    seed = f"map-terrain-{state_name.lower()}-{n}"
    rnd = random.Random(seed)

    def _neighbors4(x: int, y: int):
        if x > 0:
            yield (x - 1, y)
        if x + 1 < cols:
            yield (x + 1, y)
        if y > 0:
            yield (x, y - 1)
        if y + 1 < rows:
            yield (x, y + 1)

    # Heightfield: island bias + random radial bumps for coherent geography.
    elev = [[0.0 for _ in range(cols)] for _ in range(rows)]
    bumps = []
    bump_count = rnd.randint(7, 11)
    for _ in range(bump_count):
        bumps.append(
            (
                rnd.uniform(0.08, 0.92) * cols,
                rnd.uniform(0.08, 0.92) * rows,
                rnd.uniform(min(cols, rows) * 0.12, min(cols, rows) * 0.36),
                rnd.uniform(0.35, 1.15),
            )
        )
    for y in range(rows):
        for x in range(cols):
            v = 0.0
            for cx, cy, radius, amp in bumps:
                dx = x - cx
                dy = y - cy
                d = (dx * dx + dy * dy) ** 0.5
                t = max(0.0, 1.0 - d / radius)
                v += amp * (t ** 1.8)
            # soft pseudo-noise
            v += 0.20 * math.sin((x + rnd.random() * 3.0) * 0.18)
            v += 0.16 * math.cos((y + rnd.random() * 2.0) * 0.21)
            v += rnd.uniform(-0.08, 0.08)
            # edge falloff -> seas/coasts
            edge = min(x / max(1, cols - 1), y / max(1, rows - 1), (cols - 1 - x) / max(1, cols - 1), (rows - 1 - y) / max(1, rows - 1))
            v += (edge - 0.34) * 1.4
            elev[y][x] = v

    # Normalize elevation
    flat = [elev[y][x] for y in range(rows) for x in range(cols)]
    mn = min(flat)
    mx = max(flat)
    span = mx - mn if mx > mn else 1.0
    for y in range(rows):
        for x in range(cols):
            elev[y][x] = (elev[y][x] - mn) / span

    sea_level = 0.43 + rnd.uniform(-0.03, 0.03)
    water = [[elev[y][x] < sea_level for x in range(cols)] for y in range(rows)]

    # Ocean flood fill from map borders.
    ocean = [[False for _ in range(cols)] for _ in range(rows)]
    q = []
    for x in range(cols):
        q.append((x, 0))
        q.append((x, rows - 1))
    for y in range(rows):
        q.append((0, y))
        q.append((cols - 1, y))
    head = 0
    while head < len(q):
        x, y = q[head]
        head += 1
        if not (0 <= x < cols and 0 <= y < rows):
            continue
        if ocean[y][x] or not water[y][x]:
            continue
        ocean[y][x] = True
        for nx, ny in _neighbors4(x, y):
            if not ocean[ny][nx] and water[ny][nx]:
                q.append((nx, ny))

    lake = [[water[y][x] and not ocean[y][x] for x in range(cols)] for y in range(rows)]
    land = [[not water[y][x] for x in range(cols)] for y in range(rows)]
    mountain = [[land[y][x] and elev[y][x] > 0.75 for x in range(cols)] for y in range(rows)]

    # Rivers: downhill from highlands to ocean/lakes.
    river_edges = set()
    river_cells = set()
    candidates = []
    for y in range(1, rows - 1):
        for x in range(1, cols - 1):
            if not land[y][x]:
                continue
            if elev[y][x] < 0.68:
                continue
            dist_edge = min(x, y, cols - 1 - x, rows - 1 - y)
            candidates.append((elev[y][x] + dist_edge * 0.01, x, y))
    candidates.sort(reverse=True)
    river_count = min(max(2, n // 3), 7)
    used_sources = []
    for _, sx, sy in candidates:
        if len(used_sources) >= river_count:
            break
        if any((sx - ox) ** 2 + (sy - oy) ** 2 < 110 for ox, oy in used_sources):
            continue
        used_sources.append((sx, sy))
        x, y = sx, sy
        visited = set()
        for _step in range(cols + rows):
            if (x, y) in visited:
                break
            visited.add((x, y))
            river_cells.add((x, y))
            if ocean[y][x] or lake[y][x]:
                break
            next_pos = None
            best = elev[y][x]
            neigh = list(_neighbors4(x, y))
            rnd.shuffle(neigh)
            for nx, ny in neigh:
                score = elev[ny][nx]
                if water[ny][nx]:
                    score -= 0.20
                if score < best:
                    best = score
                    next_pos = (nx, ny)
            if next_pos is None:
                # carve slightly if local minimum
                for nx, ny in neigh:
                    if (nx, ny) not in visited:
                        next_pos = (nx, ny)
                        elev[ny][nx] = max(0.0, elev[y][x] - 0.01)
                        break
            if next_pos is None:
                break
            nx, ny = next_pos
            edge = (x, y, nx, ny) if (x, y) < (nx, ny) else (nx, ny, x, y)
            river_edges.add(edge)
            x, y = nx, ny

    # Territory seeds on land.
    land_cells = [(x, y) for y in range(rows) for x in range(cols) if land[y][x]]
    if not land_cells:
        # fallback to old simple map if degenerate.
        return _generate_world_svg_map(0, [{"state_name": state_name, "territory_count": len(territories)}])
    seeds = []
    seeds.append(rnd.choice(land_cells))
    while len(seeds) < n and len(seeds) < len(land_cells):
        best_cell = None
        best_dist = -1.0
        for x, y in rnd.sample(land_cells, min(1400, len(land_cells))):
            d = min((x - sx) ** 2 + (y - sy) ** 2 for sx, sy in seeds)
            if d > best_dist:
                best_dist = d
                best_cell = (x, y)
        if best_cell is None:
            break
        seeds.append(best_cell)

    terr = [[-1 for _ in range(cols)] for _ in range(rows)]
    dist = [[10**18 for _ in range(cols)] for _ in range(rows)]
    heap = []
    for idx, (sx, sy) in enumerate(seeds):
        terr[sy][sx] = idx
        dist[sy][sx] = 0.0
        heapq.heappush(heap, (0.0, sx, sy, idx))

    while heap:
        cur_cost, x, y, tid = heapq.heappop(heap)
        if cur_cost != dist[y][x]:
            continue
        for nx, ny in _neighbors4(x, y):
            if not land[ny][nx]:
                continue
            step = 1.0
            if mountain[ny][nx]:
                step += 1.4
            edge = (x, y, nx, ny) if (x, y) < (nx, ny) else (nx, ny, x, y)
            if edge in river_edges:
                step += 2.1
            if lake[ny][nx]:
                step += 9.0
            nd = cur_cost + step
            if nd < dist[ny][nx]:
                dist[ny][nx] = nd
                terr[ny][nx] = tid
                heapq.heappush(heap, (nd, nx, ny, tid))

    # Colors and drawing.
    palette = [
        "#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa",
        "#22d3ee", "#fb923c", "#f472b6", "#4ade80", "#c084fc",
        "#eab308", "#2dd4bf", "#f43f5e", "#818cf8", "#14b8a6",
        "#a3e635", "#38bdf8", "#f59e0b", "#ec4899", "#06b6d4",
    ]
    safe_state_name = _xml_escape_text(state_name)
    lines = [
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}'>",
        "<defs><linearGradient id='sea' x1='0' y1='0' x2='0' y2='1'>"
        "<stop offset='0%' stop-color='#9dd6ff' /><stop offset='100%' stop-color='#4a94c9' />"
        "</linearGradient></defs>",
        f"<rect width='{width}' height='{height}' fill='url(#sea)' />",
        f"<text x='{margin}' y='{margin}' font-size='22' font-family='Arial' fill='#0b1f33'>Karte: {safe_state_name}</text>",
    ]

    def _cell_rect(x: int, y: int):
        px = margin + x * cell
        py = margin + 16 + y * cell
        return px, py, cell, cell

    # Draw land and inland lakes.
    for y in range(rows):
        for x in range(cols):
            if not land[y][x]:
                continue
            px, py, w, h = _cell_rect(x, y)
            e = elev[y][x]
            if e > 0.78:
                fill = "#b0a79d"
            elif e > 0.62:
                fill = "#8fb07d"
            elif e > 0.50:
                fill = "#9fc78f"
            else:
                fill = "#b7d79f"
            lines.append(f"<rect x='{px}' y='{py}' width='{w}' height='{h}' fill='{fill}' />")
            if mountain[y][x]:
                lines.append(
                    f"<path d='M {px+2} {py+h-2} L {px+w/2:.1f} {py+2} L {px+w-2} {py+h-2} Z' fill='#7c6f63' opacity='0.70' />"
                )
    for y in range(rows):
        for x in range(cols):
            if not lake[y][x]:
                continue
            px, py, w, h = _cell_rect(x, y)
            lines.append(f"<rect x='{px}' y='{py}' width='{w}' height='{h}' fill='#6fb8e8' />")

    # Coastline and territory borders.
    for y in range(rows):
        for x in range(cols):
            if x + 1 < cols:
                # coastline
                if land[y][x] != land[y][x + 1]:
                    px, py, w, h = _cell_rect(x, y)
                    lx = px + w
                    ly1 = py
                    ly2 = py + h
                    lines.append(f"<line x1='{lx}' y1='{ly1}' x2='{lx}' y2='{ly2}' stroke='#2c4a61' stroke-width='1.6' />")
            tid = terr[y][x]
            if tid < 0:
                continue
            px, py, w, h = _cell_rect(x, y)
            color = palette[tid % len(palette)]
            lines.append(f"<rect x='{px}' y='{py}' width='{w}' height='{h}' fill='{color}' opacity='0.12' />")

    # Calculate territory centroids
    sums = {}
    for y in range(rows):
        for x in range(cols):
            tid = terr[y][x]
            if tid >= 0:
                if tid not in sums:
                    sums[tid] = [0.0, 0.0, 0]
                sums[tid][0] += x
                sums[tid][1] += y
                sums[tid][2] += 1

    for tid, terr_name in enumerate(territories):
        if tid not in sums:
            continue
        sx, sy, c = sums[tid]
        cx = sx / c
        cy = sy / c
        px = margin + cx * cell
        py = margin + 16 + cy * cell
        label = _xml_escape_text(terr_name)
        lines.append(
            f"<text x='{px:.1f}' y='{py:.1f}' text-anchor='middle' font-size='14' font-family='Arial' "
            "fill='#0b1020' stroke='#ffffff' stroke-width='2' paint-order='stroke'>"
            f"{label}</text>"
        )

    lines.append("</svg>")
    return "\n".join(lines)


def _generate_world_svg_map(guild_id: int, state_items: list[dict]) -> str:
    n = max(1, len(state_items))
    cols = max(2, int((n ** 0.5) + 0.999))
    rows = int((n + cols - 1) / cols)
    cell_w = 230
    cell_h = 150
    width = cols * cell_w + 40
    height = rows * cell_h + 70
    palette = [
        "#fca5a5",
        "#93c5fd",
        "#86efac",
        "#fde68a",
        "#c4b5fd",
        "#67e8f9",
        "#fdba74",
        "#f9a8d4",
    ]
    lines = [
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}'>",
        "<rect width='100%' height='100%' fill='#f8f8fa' />",
        f"<text x='20' y='30' font-size='22' font-family='Arial' fill='#1f2937'>Weltkarte (Guild {guild_id})</text>",
    ]
    for i, item in enumerate(state_items):
        r = i // cols
        c = i % cols
        x = 20 + c * cell_w
        y = 45 + r * cell_h
        w = cell_w - 12
        h = cell_h - 12
        fill = palette[i % len(palette)]
        state_name = _xml_escape_text(item.get("state_name", "State"))
        terr_count = int(item.get("territory_count", 0) or 0)
        lines.append(
            f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='14' ry='14' fill='{fill}' stroke='#0f172a' stroke-width='2' />"
        )
        lines.append(
            f"<text x='{x + 10}' y='{y + 32}' font-size='20' font-family='Arial' fill='#0f172a'>{state_name}</text>"
        )
        lines.append(
            f"<text x='{x + 10}' y='{y + 60}' font-size='14' font-family='Arial' fill='#1f2937'>Territorien: {terr_count}</text>"
        )
    lines.append("</svg>")
    return "\n".join(lines)


def save_state_map_svg(state_entity_id: str, state_name: str, territories: list[str], svg: str, guild_id: Optional[int] = None):
    maps = economy_data.setdefault("state_maps", {})
    maps[_state_map_key(state_entity_id)] = {
        "type": "state",
        "state_entity_id": str(state_entity_id),
        "state_name": state_name,
        "territories": territories,
        "territory_count": len(territories),
        "guild_id": int(guild_id) if guild_id else None,
        "svg": svg,
        "updated_turn": int(turn_state.get("turn_index", 1)),
    }
    save_economy()


def get_state_map_payload(state_ref: str) -> Optional[dict]:
    state_entity = _resolve_state_entity_from_ref(state_ref)
    if not state_entity:
        return None
    return economy_data.get("state_maps", {}).get(_state_map_key(str(state_entity.get("id"))))


def rebuild_world_map_for_guild(guild_id: int) -> Optional[dict]:
    maps = economy_data.get("state_maps", {}) or {}
    states = []
    for payload in maps.values():
        if str(payload.get("type", "")) != "state":
            continue
        pg = payload.get("guild_id")
        if pg is None or int(pg) != int(guild_id):
            continue
        states.append(payload)
    if not states:
        return None
    states.sort(key=lambda x: str(x.get("state_name", "")).lower())
    svg = _generate_world_svg_map(guild_id, states)
    world_payload = {
        "type": "world",
        "guild_id": int(guild_id),
        "state_count": len(states),
        "svg": svg,
        "updated_turn": int(turn_state.get("turn_index", 1)),
    }
    economy_data.setdefault("state_maps", {})[_world_map_key(guild_id)] = world_payload
    save_economy()
    return world_payload


def _collect_runtime_source_context(max_chars: int = 80000) -> str:
    module_dir = APP_DIR / "app_modules"
    chunks = []
    used = 0
    for path in sorted(module_dir.glob("[0-9][0-9]_*.py")):
        try:
            source = path.read_text(encoding="utf-8")
        except OSError:
            continue
        snippet = f"\n# FILE: {path.name}\n{source}\n"
        remaining = max_chars - used
        if remaining <= 0:
            break
        if len(snippet) > remaining:
            snippet = snippet[:remaining]
        chunks.append(snippet)
        used += len(snippet)
    return "".join(chunks).strip() or "Code konnte nicht gelesen werden."


async def create_state_territory_forums(
    guild: discord.Guild, state_name: str, territories: list[str]
) -> tuple[Optional[int], list[dict], list[str]]:
    warnings = []
    created = []
    category_id = None
    try:
        category = await guild.create_category(name=str(state_name)[:95])
        category_id = category.id
    except Exception as exc:
        warnings.append(f"Kategorie konnte nicht erstellt werden: {exc}")
        category = None
    for terr in territories:
        chan = None
        chan_type = "forum"
        try:
            chan = await guild.create_forum(
                name=f"{terr[:60]}",
                category=category,
                topic=f"Territorium {terr} von {state_name}",
            )
        except Exception:
            try:
                chan = await guild.create_text_channel(
                    name=f"{terr.lower().replace(' ', '-')[:90]}",
                    category=category,
                    topic=f"Territorium {terr} von {state_name}",
                )
                chan_type = "text"
            except Exception as exc:
                warnings.append(f"Kanal fuer {terr} konnte nicht erstellt werden: {exc}")
                chan = None
        if chan is not None:
            created.append({"name": terr, "channel_id": int(chan.id), "type": chan_type})
    return category_id, created, warnings


ACCOUNT_TYPE_ALIASES = {
    "private": "private",
    "privat": "private",
    "personal": "private",
    "person": "private",
    "company": "company",
    "firma": "company",
    "firmen": "company",
    "business": "company",
    "state": "state",
    "staat": "state",
    "npc": "npc",
    "bank": "bank",
    "savings": "savings",
    "sparkonto": "savings",
    "saving": "savings",
    "general": "general",
}

ACCOUNT_TYPE_LABELS = {
    "private": "Privat",
    "company": "Firma",
    "state": "Staat",
    "npc": "NPC",
    "bank": "Bank",
    "savings": "Sparkonto",
    "general": "Konto",
}


def normalize_account_type(account_type: Optional[str], fallback: str = "general") -> str:
    raw = str(account_type or "").strip().lower()
    if not raw:
        return fallback
    return ACCOUNT_TYPE_ALIASES.get(raw, raw)


def _infer_default_account_type(entity_id: str) -> str:
    entity = get_entity(str(entity_id))
    if not entity:
        return "general"
    etype = str(entity.get("type", "")).strip().lower()
    if etype == "person":
        return "private"
    if etype == "company":
        return "company"
    if etype == "state":
        return "state"
    if etype == "npc":
        return "npc"
    if etype == "bank":
        return "bank"
    return "general"


def _account_owner_label(raw: str) -> str:
    text = str(raw or "").strip()
    if not text:
        text = "Owner"
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Za-z0-9_.-]", "", text)
    return text or "Owner"


def build_account_name(account_type: Optional[str], owner_label: str) -> str:
    atype = normalize_account_type(account_type, fallback="general")
    prefix = ACCOUNT_TYPE_LABELS.get(atype, "Konto")
    return f"{prefix}-{_account_owner_label(owner_label)}"


def _ensure_account_structure(account: dict) -> bool:
    if not isinstance(account, dict):
        return False
    changed = False
    inferred = _infer_default_account_type(str(account.get("entity_id", "")))
    normalized_type = normalize_account_type(account.get("account_type"), fallback=inferred)
    if str(account.get("account_type", "")).strip().lower() != normalized_type:
        account["account_type"] = normalized_type
        changed = True
    if "name" not in account:
        owner = get_entity_name(str(account.get("entity_id", "")))
        account["name"] = build_account_name(normalized_type, owner)
        changed = True
    return changed


def _iter_entity_accounts(entity_id: str) -> list[tuple[str, dict]]:
    pairs = []
    for account_id, acc in economy_data.get("accounts", {}).items():
        if str(acc.get("entity_id")) == str(entity_id):
            pairs.append((str(account_id), acc))
    pairs.sort(key=lambda x: int(x[0]) if str(x[0]).isdigit() else 10**9)
    return pairs


def _unique_entity_account_name(entity_id: str, base_name: str, ignore_account_id: Optional[str] = None) -> str:
    target = str(base_name).strip() or "Konto-Owner"
    used = set()
    for aid, acc in _iter_entity_accounts(entity_id):
        if ignore_account_id is not None and str(aid) == str(ignore_account_id):
            continue
        used.add(str(acc.get("name", "")).strip().lower())
    if target.lower() not in used:
        return target
    idx = 2
    while f"{target}-{idx}".lower() in used:
        idx += 1
    return f"{target}-{idx}"


def ensure_account_model_structure() -> None:
    changed = False
    for account_id, account in economy_data.get("accounts", {}).items():
        if _ensure_account_structure(account):
            changed = True
        account_type = normalize_account_type(account.get("account_type"), fallback=_infer_default_account_type(str(account.get("entity_id", ""))))
        owner = get_entity_name(str(account.get("entity_id", "")))
        expected_prefix = f"{ACCOUNT_TYPE_LABELS.get(account_type, 'Konto')}-"
        current_name = str(account.get("name", "") or "").strip()
        if not current_name or not current_name.startswith(expected_prefix):
            new_name = build_account_name(account_type, owner)
            account["name"] = _unique_entity_account_name(str(account.get("entity_id", "")), new_name, ignore_account_id=str(account_id))
            changed = True
    if changed:
        save_economy()


def get_entity_account_ids(entity_id: str, account_type: Optional[str] = None) -> list[str]:
    pairs = _iter_entity_accounts(entity_id)
    if account_type is None:
        return [aid for aid, _ in pairs]
    wanted = normalize_account_type(account_type, fallback="general")
    return [aid for aid, acc in pairs if normalize_account_type(acc.get("account_type"), fallback="general") == wanted]


def get_accounts_for_entity(entity_id: str) -> list[dict]:
    rows = []
    for account_id in get_entity_account_ids(entity_id):
        acc = get_account(account_id)
        if not acc:
            continue
        rows.append(
            {
                "id": str(account_id),
                "entity_id": str(entity_id),
                "name": str(acc.get("name", "")),
                "account_type": normalize_account_type(acc.get("account_type"), fallback="general"),
                "balance": float(acc.get("balance", 0.0) or 0.0),
                "currency": str(acc.get("currency", "ECO")),
            }
        )
    return rows


def get_owned_company_accounts(owner_user_id: int) -> list[dict]:
    rows = []
    owner_id = int(owner_user_id or 0)
    if owner_id <= 0:
        return rows
    for entity in economy_data.get("entities", {}).values():
        if str(entity.get("type", "")).lower() != "company":
            continue
        if int(entity.get("owner_user_id") or 0) != owner_id:
            continue
        entity_id = str(entity.get("id"))
        company_account_id = get_primary_account_id(entity_id, account_type="company") or get_primary_account_id(entity_id)
        if not company_account_id:
            continue
        account = get_account(company_account_id)
        if not account:
            continue
        rows.append(
            {
                "entity_id": entity_id,
                "entity_name": str(entity.get("name", entity_id)),
                "account_id": str(company_account_id),
                "account_name": str(account.get("name", "")),
                "balance": float(account.get("balance", 0.0) or 0.0),
            }
        )
    rows.sort(key=lambda x: x["entity_name"].lower())
    return rows


def find_manageable_account_by_name(member: discord.abc.User, account_name: str) -> tuple[Optional[str], Optional[str]]:
    target = str(account_name or "").strip().lower()
    if not target:
        return None, None
    for account_id, acc in economy_data.get("accounts", {}).items():
        if str(acc.get("name", "")).strip().lower() != target:
            continue
        entity_id = str(acc.get("entity_id", ""))
        if can_user_manage_entity(member, entity_id):
            return entity_id, str(account_id)
    return None, None


def create_account(
    entity_id: str,
    account_name: str = "",
    initial_balance: float = 0.0,
    account_type: str = "general",
    owner_label: Optional[str] = None,
) -> str:
    entity_id = str(entity_id)
    atype = normalize_account_type(account_type, fallback=_infer_default_account_type(entity_id))
    owner = owner_label or get_entity_name(entity_id)
    generated_name = build_account_name(atype, owner)
    requested_name = str(account_name or "").strip()
    if not requested_name or "-" not in requested_name:
        requested_name = generated_name
    final_name = _unique_entity_account_name(entity_id, requested_name)

    account_id = str(_next_id("account"))
    currency_code = get_currency_profile().get("code", "ECO")
    economy_data["accounts"][account_id] = {
        "id": account_id,
        "entity_id": entity_id,
        "name": final_name,
        "account_type": atype,
        "balance": float(initial_balance),
        "currency": currency_code,
    }
    save_economy()
    return account_id


def get_primary_account_id(entity_id: str, account_type: Optional[str] = None) -> Optional[str]:
    entity_id = str(entity_id)
    pairs = _iter_entity_accounts(entity_id)
    if not pairs:
        return None
    if account_type is not None:
        wanted = normalize_account_type(account_type, fallback="general")
        for aid, acc in pairs:
            if normalize_account_type(acc.get("account_type"), fallback="general") == wanted:
                return aid
        return None

    entity = get_entity(entity_id)
    etype = str(entity.get("type", "")).lower() if entity else ""
    priority_map = {
        "person": ["private", "general", "savings"],
        "company": ["company", "general"],
        "state": ["state", "general"],
        "npc": ["npc", "general"],
        "bank": ["bank", "general"],
    }
    for wanted in priority_map.get(etype, ["general"]):
        for aid, acc in pairs:
            if normalize_account_type(acc.get("account_type"), fallback="general") == wanted:
                return aid
    return pairs[0][0]


def get_account(account_id: str) -> Optional[dict]:
    acc = economy_data.get("accounts", {}).get(str(account_id))
    if not acc:
        return None
    if _ensure_account_structure(acc):
        save_economy()
    return acc


def ensure_inventory_entry(entity_id: str):
    economy_data.setdefault("inventories", {}).setdefault(str(entity_id), {})


def get_inventory_qty(entity_id: str, product_id: str) -> int:
    inv = economy_data.get("inventories", {}).get(str(entity_id), {}) or {}
    try:
        return max(0, int(inv.get(str(product_id), 0) or 0))
    except Exception:
        return 0


def set_inventory_qty(entity_id: str, product_id: str, qty: int):
    ensure_inventory_entry(entity_id)
    eid = str(entity_id)
    pid = str(product_id)
    q = max(0, int(qty))
    if q <= 0:
        economy_data["inventories"][eid].pop(pid, None)
    else:
        economy_data["inventories"][eid][pid] = q


def add_inventory(entity_id: str, product_id: str, qty: int):
    if int(qty) <= 0:
        return
    current = get_inventory_qty(entity_id, product_id)
    set_inventory_qty(entity_id, product_id, current + int(qty))


def remove_inventory(entity_id: str, product_id: str, qty: int) -> tuple[bool, str]:
    q = int(qty)
    if q <= 0:
        return False, "Menge muss > 0 sein."
    current = get_inventory_qty(entity_id, product_id)
    if current < q:
        return False, "Nicht genug Bestand."
    set_inventory_qty(entity_id, product_id, current - q)
    return True, "OK"


def transfer_inventory(from_entity_id: str, to_entity_id: str, product_id: str, qty: int) -> tuple[bool, str]:
    ok, msg = remove_inventory(from_entity_id, product_id, qty)
    if not ok:
        return False, msg
    add_inventory(to_entity_id, product_id, qty)
    save_economy()
    return True, "Transfer erfolgreich."


def build_inventory_text(entity_id: str, title: Optional[str] = None) -> str:
    entity = get_entity(str(entity_id))
    entity_name = entity.get("name", str(entity_id)) if entity else str(entity_id)
    inv = economy_data.get("inventories", {}).get(str(entity_id), {}) or {}
    lines = [title or f"Inventar: {entity_name}"]
    if not inv:
        lines.append("- (leer)")
        return "\n".join(lines)
    rows = []
    for pid, qty in inv.items():
        product = get_product(str(pid))
        pname = product.get("name", f"Produkt#{pid}") if product else f"Produkt#{pid}"
        pcat = product.get("category", "-") if product else "-"
        rows.append((pname.lower(), f"- #{pid} {pname} | {pcat} | Menge: {int(qty)}"))
    rows.sort(key=lambda x: x[0])
    lines.extend(row for _, row in rows[:120])
    return "\n".join(lines)


def ensure_entity_and_account(name: str, entity_type: str, initial_balance: float = 1000.0) -> tuple[str, str]:
    entity = find_entity_by_name(name)
    if entity is None:
        entity_id = create_entity(name=name, entity_type=entity_type)
    else:
        entity_id = str(entity["id"])
    default_type = normalize_account_type(entity_type, fallback="general")
    account_id = get_primary_account_id(entity_id, account_type=default_type)
    if account_id is None:
        account_id = get_primary_account_id(entity_id)
    if account_id is None:
        account_id = create_account(
            entity_id,
            initial_balance=initial_balance,
            account_type=default_type,
            owner_label=name,
        )
    return entity_id, account_id


def record_transaction(tx_type: str, payload: dict):
    tx_id = str(_next_id("tx"))
    tx = {
        "id": tx_id,
        "type": tx_type,
        "turn": int(turn_state.get("turn_index", 1)),
        "ts": int(time.time()),
        **payload,
    }
    append_transaction_entry(tx)


def transfer_funds(from_account_id: str, to_account_id: str, amount: float, note: str = "") -> tuple[bool, str]:
    if amount <= 0:
        return False, "Betrag muss groesser als 0 sein."
    from_acc = get_account(from_account_id)
    to_acc = get_account(to_account_id)
    if not from_acc or not to_acc:
        return False, "Konto nicht gefunden."
    if float(from_acc["balance"]) < amount:
        return False, "Nicht genug Guthaben."

    from_acc["balance"] = round(float(from_acc["balance"]) - amount, 2)
    to_acc["balance"] = round(float(to_acc["balance"]) + amount, 2)
    record_transaction(
        "transfer",
        {
            "from_account": from_account_id,
            "to_account": to_account_id,
            "amount": round(amount, 2),
            "note": note,
        },
    )
    save_economy()
    return True, "Transfer erfolgreich."


def set_product_recipe(
    product_id: str,
    recipe_inputs: list[dict],
    output_qty: int = 1,
    source: str = "manual",
    confidence: str = "",
    notes: str = "",
) -> tuple[bool, str]:
    product = get_product(product_id)
    if not product:
        return False, "Produkt nicht gefunden."
    if not is_product_inventory_tracked(product):
        return False, "Nur inventarpflichtige Produkte koennen ein Rezept haben."

    normalized_inputs = []
    seen = set()
    for row in recipe_inputs:
        if not isinstance(row, dict):
            continue
        ingredient_id = str(row.get("product_id", "")).strip()
        if not ingredient_id or ingredient_id in seen:
            continue
        ingredient = get_product(ingredient_id)
        if not ingredient:
            return False, f"Zutat #{ingredient_id} nicht gefunden."
        if not is_product_inventory_tracked(ingredient):
            return False, f"Zutat #{ingredient_id} ist nicht inventarpflichtig."
        try:
            qty = max(1, int(float(row.get("qty", 1) or 1)))
        except Exception:
            qty = 1
        normalized_inputs.append({"product_id": ingredient_id, "qty": qty})
        seen.add(ingredient_id)

    if not normalized_inputs:
        return False, "Mindestens eine gueltige Zutat ist noetig."

    try:
        normalized_output_qty = max(1, int(float(output_qty or 1)))
    except Exception:
        normalized_output_qty = 1

    product["recipe_inputs"] = normalized_inputs
    product["recipe_output_qty"] = normalized_output_qty
    recipe_source = str(source or "manual").strip().lower()
    if recipe_source not in {"manual", "ai"}:
        recipe_source = "manual"
    recipe_confidence = str(confidence or "").strip().lower()
    if recipe_confidence not in {"", "low", "medium", "high"}:
        recipe_confidence = ""
    product["recipe_source"] = recipe_source
    product["recipe_inference_confidence"] = recipe_confidence if recipe_source == "ai" else ""
    product["recipe_inference_notes"] = str(notes or "")[:800] if recipe_source == "ai" else ""
    product["recipe_inference_updated_ts"] = int(time.time()) if recipe_source == "ai" else 0
    ensure_product_structure(product)
    save_economy()
    return True, f"Rezept fuer #{product_id} gesetzt: {build_product_recipe_text(product)}"


def clear_product_recipe(product_id: str) -> tuple[bool, str]:
    product = get_product(product_id)
    if not product:
        return False, "Produkt nicht gefunden."
    product["recipe_inputs"] = []
    product["recipe_output_qty"] = 1
    product["recipe_source"] = ""
    product["recipe_inference_confidence"] = ""
    product["recipe_inference_notes"] = ""
    product["recipe_inference_updated_ts"] = 0
    ensure_product_structure(product)
    save_economy()
    return True, f"Rezept fuer #{product_id} entfernt."


def _resolve_product_id_for_ai_recipe(ref: str, exclude_product_id: Optional[str] = None) -> Optional[str]:
    raw = str(ref or "").strip()
    if not raw:
        return None
    excluded = str(exclude_product_id) if exclude_product_id is not None else None
    if raw in economy_data.get("products", {}):
        return None if excluded and raw == excluded else str(raw)

    raw_norm = _norm_search_text(raw)
    best_id = None
    best_score = 0.0
    for product_id, product in economy_data.get("products", {}).items():
        pid = str(product_id)
        if excluded and pid == excluded:
            continue
        name = str(product.get("name", "") or "")
        if name.strip().lower() == raw.strip().lower():
            return pid
        score = max(
            _text_similarity(raw, name),
            1.0 if raw_norm and raw_norm == _norm_search_text(name) else 0.0,
        )
        if score > best_score:
            best_score = score
            best_id = pid
    if best_score >= 0.72:
        return best_id
    return None


def _build_ai_recipe_product_catalog(target_product_id: str, limit: int = 60) -> str:
    rows = []
    for product_id, product in economy_data.get("products", {}).items():
        pid = str(product_id)
        if pid == str(target_product_id):
            continue
        ensure_product_structure(product)
        if not product.get("active", True):
            continue
        if not is_product_inventory_tracked(product):
            continue
        desc = str(product.get("description", "") or "").strip().replace("\n", " ")
        desc = desc[:140] + ("..." if len(desc) > 140 else "")
        rows.append(
            (
                str(product.get("name", "") or pid).lower(),
                f"- #{pid} | {product.get('name', pid)} | {product.get('category', '-')} | {desc or '-'}",
            )
        )
    rows.sort(key=lambda x: x[0])
    selected = [line for _, line in rows[:limit]]
    return "\n".join(selected) if selected else "- keine verfuegbaren Zutatenprodukte -"


async def infer_and_apply_product_recipe_from_description(
    product_id: str,
    allow_overwrite: bool = False,
) -> tuple[bool, str]:
    product = get_product(product_id)
    if not product:
        return False, "Produkt nicht gefunden."
    ensure_product_structure(product)
    if not is_product_inventory_tracked(product):
        return False, "Fuer Service-/virtuelle Produkte wird kein Herstellungsrezept benoetigt."
    description = str(product.get("description", "") or "").strip()
    if len(description) < 20:
        return False, "Die Produktbeschreibung ist zu kurz fuer eine sinnvolle KI-Rezeptanalyse."
    if product_has_recipe(product) and not allow_overwrite and str(product.get("recipe_source", "")).lower() != "ai":
        return False, "Es existiert bereits ein manuelles Rezept. Fuer Ueberschreiben bitte `Eco econ recipe_ai <produkt>` nutzen."

    candidate_catalog = _build_ai_recipe_product_catalog(product_id)
    if candidate_catalog.startswith("- keine"):
        return False, "Es gibt noch keine verfuegbaren Zutatenprodukte, aus denen die KI ein Rezept ableiten koennte."

    prompt = f"""
Du bist ein Produktionsplaner fuer ein Wirtschaftsspiel.

Zielprodukt:
- ID: #{product.get('id')}
- Name: {product.get('name', '-')}
- Kategorie: {product.get('category', '-')}
- Beschreibung: {description}

Verfuegbare Zutatenprodukte:
{candidate_catalog}

Leite ein moeglichst plausibles Herstellungsrezept aus der Beschreibung ab.
Gib ausschliesslich JSON aus:
{{
  "output_qty": 1,
  "inputs": [
    {{"product_ref": "12", "qty": 2}}
  ],
  "confidence": "high|medium|low",
  "reason": "kurze Begruendung"
}}

Regeln:
- Verwende nur Zutaten aus der verfuegbaren Liste.
- Das Zielprodukt darf nicht seine eigene Zutat sein.
- Ganze Mengen >= 1.
- Maximal 6 Zutaten.
- Wenn die Beschreibung keine belastbare Herstellung erkennen laesst, gib ein leeres inputs-Array zurueck.
"""
    try:
        raw = (await llm_chat([{"role": "user", "content": prompt}], user_text=description)).strip()
    except Exception as exc:
        return False, f"Rezept-KI derzeit nicht verfuegbar: {str(exc)[:220]}"

    data = safe_json_load(raw)
    if not isinstance(data, dict):
        return False, "Die KI hat kein gueltiges Rezept-JSON geliefert."

    raw_inputs = data.get("inputs", [])
    if not isinstance(raw_inputs, list) or not raw_inputs:
        reason = str(data.get("reason", "") or "").strip()
        return False, ("Die KI konnte kein belastbares Rezept erkennen." + (f" Hinweis: {reason}" if reason else ""))

    resolved_inputs = []
    seen = set()
    unresolved = []
    for row in raw_inputs[:6]:
        if not isinstance(row, dict):
            continue
        raw_ref = (
            str(row.get("product_ref", "") or "")
            or str(row.get("product_id", "") or "")
            or str(row.get("name", "") or "")
        ).strip()
        ingredient_id = _resolve_product_id_for_ai_recipe(raw_ref, exclude_product_id=str(product_id))
        if not ingredient_id:
            unresolved.append(raw_ref or "?")
            continue
        if ingredient_id in seen:
            continue
        try:
            qty = max(1, int(float(row.get("qty", 1) or 1)))
        except Exception:
            qty = 1
        resolved_inputs.append({"product_id": ingredient_id, "qty": qty})
        seen.add(ingredient_id)

    if not resolved_inputs:
        return False, "Die KI nannte nur nicht aufloesbare Zutaten."

    try:
        output_qty = max(1, int(float(data.get("output_qty", 1) or 1)))
    except Exception:
        output_qty = 1
    confidence = str(data.get("confidence", "") or "").strip().lower()
    if confidence not in {"low", "medium", "high"}:
        confidence = ""
    reason = str(data.get("reason", "") or "").strip()

    ok, msg = set_product_recipe(
        product_id,
        resolved_inputs,
        output_qty=output_qty,
        source="ai",
        confidence=confidence,
        notes=reason,
    )
    if not ok:
        return False, msg

    extras = []
    if confidence:
        extras.append(f"KI-Sicherheit: {confidence.upper()}")
    if reason:
        extras.append(reason[:180])
    if unresolved:
        extras.append("Nicht zugeordnet: " + ", ".join(unresolved[:4]))
    if extras:
        msg += "\n" + " | ".join(extras)
    return True, msg


def produce_product_batches(entity_id: str, product_id: str, batches: int = 1) -> tuple[bool, str]:
    product = get_product(product_id)
    if not product:
        return False, "Produkt nicht gefunden."
    if not is_product_inventory_tracked(product):
        return False, "Dieses Produkt ist nicht inventarpflichtig."
    if not product_has_recipe(product):
        return False, "Fuer dieses Produkt ist kein Rezept hinterlegt."

    try:
        batch_count = max(1, int(batches))
    except Exception:
        return False, "Anzahl der Produktionsbatches ist ungueltig."

    ensure_product_structure(product)
    inputs = product.get("recipe_inputs", []) or []
    output_qty = int(product.get("recipe_output_qty", 1) or 1)
    missing = []
    requirements = []
    for row in inputs:
        ingredient_id = str(row.get("product_id", ""))
        per_batch = int(row.get("qty", 1) or 1)
        total_needed = per_batch * batch_count
        current = get_inventory_qty(entity_id, ingredient_id)
        requirements.append((ingredient_id, total_needed))
        if current < total_needed:
            ingredient = get_product(ingredient_id)
            ingredient_name = ingredient.get("name", f"Produkt#{ingredient_id}") if ingredient else f"Produkt#{ingredient_id}"
            missing.append(f"{ingredient_name}: {current}/{total_needed}")
    if missing:
        return False, "Nicht genug Rohstoffe. Fehlend: " + ", ".join(missing)

    for ingredient_id, total_needed in requirements:
        ok, msg = remove_inventory(entity_id, ingredient_id, total_needed)
        if not ok:
            return False, f"Produktion abgebrochen: {msg}"

    success = compute_entity_success_metrics(entity_id)
    score = float(success.get("score", 50.0) or 50.0)
    multiplier = float(success.get("production_multiplier", 1.0) or 1.0)
    base_output = output_qty * batch_count
    if score < 20.0:
        produced_qty = max(1, int(round(base_output * 0.35)))
        outcome = "Fehlproduktion"
    elif score < 35.0:
        produced_qty = max(1, int(round(base_output * max(0.55, multiplier - 0.20))))
        outcome = "schwache Produktion"
    else:
        produced_qty = max(1, int(round(base_output * multiplier)))
        outcome = "stabile Produktion"
    add_inventory(entity_id, str(product_id), produced_qty)
    record_transaction(
        "production",
        {
            "entity_id": str(entity_id),
            "product_id": str(product_id),
            "batches": int(batch_count),
            "base_output_qty": int(base_output),
            "produced_qty": int(produced_qty),
            "success_score": round(score, 2),
            "production_multiplier": round(multiplier, 3),
            "outcome": outcome,
            "inputs": [{"product_id": pid, "qty": qty} for pid, qty in requirements],
        },
    )
    save_economy()
    entity_name = get_entity_name(entity_id)
    return True, (
        f"Produktion erfolgreich: {entity_name} fertigt {produced_qty}x #{product_id} {product.get('name', '')}. "
        f"Verbrauchte Batches: {batch_count}. "
        f"Erfolg {score:.2f}/100 | Faktor x{multiplier:.2f} | {outcome}."
    )


def get_loan_policy() -> dict:
    settings = economy_data.setdefault("settings", {})
    raw = settings.setdefault("loan_policy", _clone_default(DEFAULT_ECONOMY["settings"]["loan_policy"]))
    if not isinstance(raw, dict):
        raw = _clone_default(DEFAULT_ECONOMY["settings"]["loan_policy"])
        settings["loan_policy"] = raw

    bank_entity_name = str(raw.get("bank_entity_name", "Zentralbank") or "Zentralbank").strip() or "Zentralbank"
    try:
        interest_pct = round(float(raw.get("default_interest_pct_per_turn", 1.5) or 1.5), 4)
    except (TypeError, ValueError):
        interest_pct = 1.5
    try:
        max_term_turns = max(1, min(60, int(raw.get("max_term_turns", 12) or 12)))
    except (TypeError, ValueError):
        max_term_turns = 12
    try:
        max_principal = round(max(1.0, float(raw.get("max_principal_per_loan", 25000.0) or 25000.0)), 2)
    except (TypeError, ValueError):
        max_principal = 25000.0
    try:
        max_total_debt = round(max(max_principal, float(raw.get("max_total_debt_per_entity", 60000.0) or 60000.0)), 2)
    except (TypeError, ValueError):
        max_total_debt = 60000.0
    try:
        penalty_pct = round(max(0.0, float(raw.get("penalty_pct_per_missed_turn", 2.0) or 2.0)), 4)
    except (TypeError, ValueError):
        penalty_pct = 2.0

    normalized = {
        "bank_entity_name": bank_entity_name,
        "default_interest_pct_per_turn": interest_pct,
        "max_term_turns": max_term_turns,
        "max_principal_per_loan": max_principal,
        "max_total_debt_per_entity": max_total_debt,
        "penalty_pct_per_missed_turn": penalty_pct,
    }
    settings["loan_policy"] = normalized
    return normalized


def _get_bank_entity_and_account() -> tuple[str, str]:
    policy = get_loan_policy()
    return ensure_entity_and_account(policy["bank_entity_name"], "bank", 500000.0)


def get_loan(loan_id: str) -> Optional[dict]:
    return economy_data.get("loans", {}).get(str(loan_id))


def _loan_sort_key(loan: dict) -> tuple[int, int, int]:
    status_rank = {
        "active": 0,
        "delinquent": 1,
        "repaid": 2,
    }.get(str(loan.get("status", "active")).lower(), 3)
    next_due = int(loan.get("next_due_turn", 10**9) or 10**9)
    created = int(loan.get("created_turn", 0) or 0)
    return (status_rank, next_due, created)


def get_loans_for_entity(entity_id: str, statuses: Optional[set[str]] = None) -> list[dict]:
    rows = []
    wanted = {str(s).lower() for s in (statuses or set())}
    for loan in economy_data.get("loans", {}).values():
        if str(loan.get("borrower_entity_id")) != str(entity_id):
            continue
        status = str(loan.get("status", "active")).lower()
        if wanted and status not in wanted:
            continue
        rows.append(loan)
    rows.sort(key=_loan_sort_key)
    return rows


def get_total_outstanding_debt(entity_id: str) -> float:
    total = 0.0
    for loan in get_loans_for_entity(entity_id, statuses={"active", "delinquent"}):
        total += float(loan.get("remaining_balance", 0.0) or 0.0)
    return round(total, 2)


def _close_loan_if_repaid(loan: dict) -> bool:
    remaining = round(float(loan.get("remaining_balance", 0.0) or 0.0), 2)
    if remaining > 0.009:
        return False
    loan["remaining_balance"] = 0.0
    loan["status"] = "repaid"
    loan["closed_turn"] = int(turn_state.get("turn_index", 1))
    loan["next_due_turn"] = None
    return True


def build_loan_overview_text(entity_id: str, include_closed: bool = True) -> str:
    entity = get_entity(str(entity_id))
    entity_name = entity.get("name", entity_id) if entity else str(entity_id)
    rows = get_loans_for_entity(entity_id)
    if not include_closed:
        rows = [loan for loan in rows if str(loan.get("status", "")).lower() != "repaid"]
    if not rows:
        return f"Keine Kredite fuer {entity_name}."

    lines = [f"**KREDITE fuer {entity_name}**"]
    lines.append(f"- Offene Gesamtschuld: {format_money(get_total_outstanding_debt(entity_id))}")
    for loan in rows[:30]:
        status = str(loan.get("status", "active")).lower()
        next_due = loan.get("next_due_turn")
        due_label = f"Zug #{int(next_due)}" if next_due is not None else "-"
        lines.append(
            f"- Kredit #{loan['id']} | {status} | Rest {format_money(float(loan.get('remaining_balance', 0.0) or 0.0))} "
            f"| Rate {format_money(float(loan.get('installment_amount', 0.0) or 0.0))} "
            f"| Zins/Zug {float(loan.get('interest_rate_pct_per_turn', 0.0) or 0.0):.2f}% "
            f"| Faellig: {due_label} | Aussetzer: {int(loan.get('missed_payments', 0) or 0)}"
        )
    return "\n".join(lines)


def build_bank_loan_status_text() -> str:
    bank_entity_id, bank_account_id = _get_bank_entity_and_account()
    bank_account = get_account(bank_account_id)
    active = []
    for loan in economy_data.get("loans", {}).values():
        if str(loan.get("status", "active")).lower() in {"active", "delinquent"}:
            active.append(loan)
    total_outstanding = round(sum(float(loan.get("remaining_balance", 0.0) or 0.0) for loan in active), 2)
    delinquent = sum(1 for loan in active if str(loan.get("status", "")).lower() == "delinquent")
    policy = get_loan_policy()
    return (
        "**BANK-STATUS**\n"
        f"- Bank: {get_entity_name(bank_entity_id)}\n"
        f"- Bankkonto: {format_money(float((bank_account or {}).get('balance', 0.0) or 0.0))}\n"
        f"- Aktive Kredite: {len(active)}\n"
        f"- Davon problematisch: {delinquent}\n"
        f"- Offene Gesamtschuld: {format_money(total_outstanding)}\n"
        f"- Standardzins/Zug: {float(policy.get('default_interest_pct_per_turn', 0.0)):.2f}%\n"
        f"- Max Laufzeit: {int(policy.get('max_term_turns', 12) or 12)} Zuege"
    )


def issue_loan_to_entity(
    borrower_entity_id: str,
    borrower_account_id: str,
    principal: float,
    term_turns: int,
    note: str = "",
) -> tuple[bool, str, Optional[dict]]:
    borrower_entity_id = str(borrower_entity_id)
    borrower_account_id = str(borrower_account_id)
    policy = get_loan_policy()
    principal = round(float(principal), 2)
    term_turns = int(term_turns)
    if principal <= 0:
        return False, "Kreditsumme muss groesser als 0 sein.", None
    if principal > float(policy["max_principal_per_loan"]):
        return False, f"Maximaler Einzelkredit ist {format_money(float(policy['max_principal_per_loan']))}.", None
    if term_turns <= 0 or term_turns > int(policy["max_term_turns"]):
        return False, f"Laufzeit muss zwischen 1 und {int(policy['max_term_turns'])} Zuegen liegen.", None

    borrower_account = get_account(borrower_account_id)
    if not borrower_account or str(borrower_account.get("entity_id")) != borrower_entity_id:
        return False, "Ungueltiges Zielkonto fuer den Kredit.", None

    total_existing_debt = get_total_outstanding_debt(borrower_entity_id)
    if round(total_existing_debt + principal, 2) > float(policy["max_total_debt_per_entity"]):
        return False, (
            "Maximale Gesamtschuld ueberschritten. "
            f"Limit: {format_money(float(policy['max_total_debt_per_entity']))}."
        ), None

    lender_entity_id, lender_account_id = _get_bank_entity_and_account()
    lender_account = get_account(lender_account_id)
    if not lender_account:
        return False, "Bankkonto nicht gefunden.", None
    if float(lender_account.get("balance", 0.0) or 0.0) < principal:
        return False, "Bank hat aktuell nicht genug Liquiditaet fuer diesen Kredit.", None

    interest_pct = float(policy["default_interest_pct_per_turn"])
    total_due = round(principal * (1.0 + (interest_pct / 100.0) * term_turns), 2)
    installment_amount = round(total_due / term_turns, 2)
    if installment_amount <= 0:
        return False, "Kreditsumme zu klein fuer sinnvolle Raten.", None

    loan_id = str(_next_id("loan"))
    ok, msg = transfer_funds(
        lender_account_id,
        borrower_account_id,
        principal,
        note=f"loan_issue_{loan_id}",
    )
    if not ok:
        return False, msg, None

    loan = {
        "id": loan_id,
        "borrower_entity_id": borrower_entity_id,
        "borrower_account_id": borrower_account_id,
        "lender_entity_id": lender_entity_id,
        "lender_account_id": lender_account_id,
        "principal": principal,
        "remaining_balance": total_due,
        "interest_rate_pct_per_turn": interest_pct,
        "term_turns": term_turns,
        "installment_amount": installment_amount,
        "payments_made": 0,
        "paid_total": 0.0,
        "missed_payments": 0,
        "created_turn": int(turn_state.get("turn_index", 1)),
        "next_due_turn": int(turn_state.get("turn_index", 1)) + 1,
        "status": "active",
        "note": str(note or "")[:200],
    }
    economy_data.setdefault("loans", {})[loan_id] = loan
    record_transaction(
        "loan_issue",
        {
            "loan_id": loan_id,
            "borrower_entity_id": borrower_entity_id,
            "borrower_account_id": borrower_account_id,
            "lender_entity_id": lender_entity_id,
            "lender_account_id": lender_account_id,
            "principal": principal,
            "total_due": total_due,
            "term_turns": term_turns,
            "installment_amount": installment_amount,
        },
    )
    save_economy()
    return True, (
        f"Kredit #{loan_id} ausgezahlt: {format_money(principal)} | "
        f"Gesamt rueckzahlbar: {format_money(total_due)} | "
        f"Rate/Zug: {format_money(installment_amount)}"
    ), loan


def repay_loan(loan_id: str, from_account_id: str, amount: float, note: str = "") -> tuple[bool, str]:
    loan = get_loan(loan_id)
    if not loan:
        return False, "Kredit nicht gefunden."
    if str(loan.get("status", "")).lower() == "repaid":
        return False, "Kredit ist bereits vollstaendig getilgt."
    from_account = get_account(from_account_id)
    if not from_account:
        return False, "Quellkonto nicht gefunden."
    if str(from_account.get("entity_id")) != str(loan.get("borrower_entity_id")):
        return False, "Konto gehoert nicht zum Kreditnehmer."
    amount = round(float(amount), 2)
    if amount <= 0:
        return False, "Tilgungsbetrag muss groesser als 0 sein."
    due = round(min(amount, float(loan.get("remaining_balance", 0.0) or 0.0)), 2)
    if due <= 0:
        return False, "Keine offene Restschuld vorhanden."

    ok, msg = transfer_funds(
        from_account_id,
        str(loan.get("lender_account_id")),
        due,
        note=f"loan_repay_{loan_id}" + (f"_{note}" if note else ""),
    )
    if not ok:
        return False, msg

    loan["remaining_balance"] = round(float(loan.get("remaining_balance", 0.0) or 0.0) - due, 2)
    loan["paid_total"] = round(float(loan.get("paid_total", 0.0) or 0.0) + due, 2)
    loan["last_payment_turn"] = int(turn_state.get("turn_index", 1))
    loan["status"] = "active"
    record_transaction(
        "loan_payment",
        {
            "loan_id": str(loan_id),
            "from_account_id": str(from_account_id),
            "to_account_id": str(loan.get("lender_account_id")),
            "amount": due,
            "mode": "manual",
            "note": str(note or "")[:120],
        },
    )
    closed = _close_loan_if_repaid(loan)
    save_economy()
    if closed:
        return True, f"Kredit #{loan_id} vollstaendig getilgt."
    return True, f"Kredit #{loan_id} um {format_money(due)} reduziert. Rest: {format_money(float(loan.get('remaining_balance', 0.0) or 0.0))}"


def execute_loan_payments_for_turn(turn_index: int) -> list[str]:
    summaries = []
    policy = get_loan_policy()
    penalty_pct = float(policy.get("penalty_pct_per_missed_turn", 0.0) or 0.0)
    for loan in sorted(economy_data.get("loans", {}).values(), key=_loan_sort_key):
        status = str(loan.get("status", "active")).lower()
        if status == "repaid":
            continue
        next_due_turn = int(loan.get("next_due_turn", turn_index) or turn_index)
        if next_due_turn > int(turn_index):
            continue

        due = round(min(float(loan.get("installment_amount", 0.0) or 0.0), float(loan.get("remaining_balance", 0.0) or 0.0)), 2)
        if due <= 0:
            if _close_loan_if_repaid(loan):
                summaries.append(f"Kredit #{loan.get('id')} abgeschlossen.")
            continue

        borrower_name = get_entity_name(str(loan.get("borrower_entity_id")))
        ok, msg = transfer_funds(
            str(loan.get("borrower_account_id")),
            str(loan.get("lender_account_id")),
            due,
            note=f"loan_installment_{loan.get('id')}_turn_{turn_index}",
        )
        if ok:
            loan["remaining_balance"] = round(float(loan.get("remaining_balance", 0.0) or 0.0) - due, 2)
            loan["paid_total"] = round(float(loan.get("paid_total", 0.0) or 0.0) + due, 2)
            loan["payments_made"] = int(loan.get("payments_made", 0) or 0) + 1
            loan["next_due_turn"] = int(turn_index) + 1
            loan["last_payment_turn"] = int(turn_index)
            loan["status"] = "active"
            record_transaction(
                "loan_payment",
                {
                    "loan_id": str(loan.get("id")),
                    "from_account_id": str(loan.get("borrower_account_id")),
                    "to_account_id": str(loan.get("lender_account_id")),
                    "amount": due,
                    "mode": "scheduled",
                },
            )
            if _close_loan_if_repaid(loan):
                summaries.append(f"{borrower_name}: Kredit #{loan.get('id')} voll getilgt.")
            else:
                summaries.append(
                    f"{borrower_name}: Kreditrate #{loan.get('id')} gebucht ({format_money(due)}), Rest {format_money(float(loan.get('remaining_balance', 0.0) or 0.0))}."
                )
            continue

        loan["missed_payments"] = int(loan.get("missed_payments", 0) or 0) + 1
        loan["status"] = "delinquent"
        loan["next_due_turn"] = int(turn_index) + 1
        penalty_amount = 0.0
        if penalty_pct > 0:
            penalty_amount = round(float(loan.get("remaining_balance", 0.0) or 0.0) * (penalty_pct / 100.0), 2)
            if penalty_amount > 0:
                loan["remaining_balance"] = round(float(loan.get("remaining_balance", 0.0) or 0.0) + penalty_amount, 2)
                record_transaction(
                    "loan_penalty",
                    {
                        "loan_id": str(loan.get("id")),
                        "borrower_entity_id": str(loan.get("borrower_entity_id")),
                        "amount": penalty_amount,
                        "turn": int(turn_index),
                    },
                )
        penalty_text = f" + Strafzins {format_money(penalty_amount)}" if penalty_amount > 0 else ""
        summaries.append(
            f"{borrower_name}: Kreditrate #{loan.get('id')} fehlgeschlagen ({msg}){penalty_text}."
        )
    save_economy()
    return summaries


def create_stock(symbol: str, company_entity_id: str, initial_price: float, outstanding: int):
    sym = symbol.strip().upper()
    economy_data["stocks"][sym] = {
        "symbol": sym,
        "company_entity_id": str(company_entity_id),
        "price": float(initial_price),
        "outstanding": int(outstanding),
        "dividend_yield_pct": 1.5,
    }
    save_economy()


def ensure_stock_structure(stock: dict):
    stock.setdefault("dividend_yield_pct", 1.5)


def ensure_all_stocks_structure():
    changed = False
    for stock in economy_data.get("stocks", {}).values():
        before = dict(stock)
        ensure_stock_structure(stock)
        if stock != before:
            changed = True
    if changed:
        save_economy()


def get_holding(entity_id: str, symbol: str) -> int:
    return int(economy_data.get("holdings", {}).get(str(entity_id), {}).get(symbol.upper(), 0))


def set_holding(entity_id: str, symbol: str, qty: int):
    eid = str(entity_id)
    sym = symbol.upper()
    economy_data["holdings"].setdefault(eid, {})
    if qty <= 0:
        economy_data["holdings"][eid].pop(sym, None)
    else:
        economy_data["holdings"][eid][sym] = int(qty)


def _resolve_stock_revenue_account(stock: dict) -> tuple[Optional[str], Optional[str], str]:
    # Primärziel: Firmeneigentuemer (Person) laut owner_user_id der Emittenten-Entitaet.
    company_entity_id = str((stock or {}).get("company_entity_id", "")).strip()
    if not company_entity_id:
        return None, None, "missing_company"
    issuer_entity = get_entity(company_entity_id)
    if not issuer_entity:
        return None, None, "issuer_missing"

    owner_user_id = int(issuer_entity.get("owner_user_id") or 0)
    if owner_user_id > 0:
        owner_entity_id, owner_account_id = get_or_create_player_entity(owner_user_id, f"user-{owner_user_id}")
        return owner_account_id, owner_entity_id, "owner"

    # Fallback: Emittentenkonto (z. B. Staatliche Aktien ohne Personeneigentuemer).
    issuer_account_id = get_primary_account_id(company_entity_id)
    if issuer_account_id:
        return issuer_account_id, company_entity_id, "issuer"
    return None, None, "no_target"


def buy_stock(entity_id: str, symbol: str, qty: int, account_id: Optional[str] = None) -> tuple[bool, str]:
    if qty <= 0:
        return False, "Menge muss > 0 sein."
    sym = symbol.upper()
    stock = economy_data.get("stocks", {}).get(sym)
    if not stock:
        return False, "Aktie nicht gefunden."
    ensure_stock_structure(stock)
    outstanding = int(stock.get("outstanding", 0) or 0)
    if outstanding > 0:
        held_total = 0
        for holdings in economy_data.get("holdings", {}).values():
            held_total += int((holdings or {}).get(sym, 0) or 0)
        available = outstanding - held_total
        if available <= 0:
            return False, "Keine freien Aktien mehr verfuegbar."
        if qty > available:
            return False, f"Nur noch {available} Aktien verfuegbar."
    actor_entity = get_entity(str(entity_id))
    ok, reason = evaluate_stock_buy_law(actor_entity, stock, int(qty))
    if not ok:
        return False, reason
    use_account_id = str(account_id or "").strip() or get_primary_account_id(entity_id)
    if not use_account_id:
        return False, "Kein Konto fuer Entitaet."
    acc = get_account(use_account_id)
    if not acc or str(acc.get("entity_id")) != str(entity_id):
        return False, "Ungueltiges Konto fuer Entitaet."
    cost = round(float(stock["price"]) * qty, 2)
    if float(acc["balance"]) < cost:
        return False, "Nicht genug Guthaben fuer Kauf."

    revenue_account_id, revenue_entity_id, revenue_mode = _resolve_stock_revenue_account(stock)
    if not revenue_account_id:
        return False, "Aktienkauf nicht moeglich: Emittent ohne gueltiges Einnahmekonto."
    revenue_acc = get_account(revenue_account_id)
    if not revenue_acc:
        return False, "Aktienkauf nicht moeglich: Zielkonto nicht gefunden."

    acc["balance"] = round(float(acc["balance"]) - cost, 2)
    revenue_acc["balance"] = round(float(revenue_acc.get("balance", 0.0) or 0.0) + cost, 2)
    current = get_holding(entity_id, sym)
    set_holding(entity_id, sym, current + qty)
    stock["price"] = round(max(0.1, float(stock["price"]) * (1.0 + min(0.08, qty / 1000))), 2)
    record_transaction(
        "buy_stock",
        {
            "entity_id": entity_id,
            "symbol": sym,
            "qty": qty,
            "cost": cost,
            "buyer_account_id": use_account_id,
            "revenue_account_id": revenue_account_id,
            "revenue_entity_id": revenue_entity_id,
            "revenue_mode": revenue_mode,
        },
    )
    save_economy()
    return True, f"{qty}x {sym} gekauft."


def sell_stock(entity_id: str, symbol: str, qty: int, account_id: Optional[str] = None) -> tuple[bool, str]:
    if qty <= 0:
        return False, "Menge muss > 0 sein."
    sym = symbol.upper()
    stock = economy_data.get("stocks", {}).get(sym)
    if not stock:
        return False, "Aktie nicht gefunden."
    ensure_stock_structure(stock)
    actor_entity = get_entity(str(entity_id))
    ok, reason = evaluate_action_permission_law(actor_entity, "stock_sell")
    if not ok:
        return False, reason
    owned = get_holding(entity_id, sym)
    if owned < qty:
        return False, "Nicht genug Aktien im Portfolio."
    use_account_id = str(account_id or "").strip() or get_primary_account_id(entity_id)
    if not use_account_id:
        return False, "Kein Konto fuer Entitaet."
    acc = get_account(use_account_id)
    if not acc or str(acc.get("entity_id")) != str(entity_id):
        return False, "Ungueltiges Konto fuer Entitaet."
    proceeds = round(float(stock["price"]) * qty, 2)

    set_holding(entity_id, sym, owned - qty)
    acc["balance"] = round(float(acc["balance"]) + proceeds, 2)
    stock["price"] = round(max(0.1, float(stock["price"]) * (1.0 - min(0.06, qty / 1200))), 2)
    record_transaction(
        "sell_stock",
        {"entity_id": entity_id, "symbol": sym, "qty": qty, "proceeds": proceeds, "seller_account_id": use_account_id},
    )
    save_economy()
    return True, f"{qty}x {sym} verkauft."


def ensure_npc_economy_entities():
    for npc_name in npc_profiles.keys():
        ensure_entity_and_account(name=f"NPC:{npc_name}", entity_type="npc", initial_balance=5000.0)


def queue_econ_action(user_id: int, user_name: str, action: dict):
    queued = turn_state.get("queued_econ_actions", [])
    queued.append(
        {
            "user_id": user_id,
            "user_name": user_name,
            "turn": turn_state.get("turn_index", 1),
            **action,
        }
    )
    if len(queued) > 300:
        queued[:] = queued[-300:]
    turn_state["queued_econ_actions"] = queued
    save_turn_state()


def apply_queued_econ_actions_for_turn(turn_index: int) -> list[str]:
    queued = list(turn_state.get("queued_econ_actions", []))
    remaining = []
    summary = []
    for action in queued:
        if int(action.get("turn", -1)) != int(turn_index):
            remaining.append(action)
            continue
        act = action.get("action")
        actor_entity = str(action.get("entity_id", ""))
        if act == "transfer":
            ok, msg = transfer_funds(
                str(action.get("from_account_id")),
                str(action.get("to_account_id")),
                float(action.get("amount", 0)),
                note=f"turn_action_by_{action.get('user_name', 'user')}",
            )
            summary.append(f"{action.get('user_name')}: Transfer -> {msg}")
            continue
        if act == "buy":
            selected_account_id = str(action.get("account_id", "")).strip() or None
            ok, msg = buy_stock(
                actor_entity,
                str(action.get("symbol", "")),
                int(action.get("qty", 0)),
                account_id=selected_account_id,
            )
            summary.append(f"{action.get('user_name')}: Kauf -> {msg}")
            continue
        if act == "sell":
            selected_account_id = str(action.get("account_id", "")).strip() or None
            ok, msg = sell_stock(
                actor_entity,
                str(action.get("symbol", "")),
                int(action.get("qty", 0)),
                account_id=selected_account_id,
            )
            summary.append(f"{action.get('user_name')}: Verkauf -> {msg}")
            continue
        summary.append(f"{action.get('user_name')}: Unbekannte Aktion ignoriert.")
    turn_state["queued_econ_actions"] = remaining
    save_turn_state()
    return summary


def npc_market_actions_for_turn() -> list[str]:
    ensure_npc_economy_entities()
    summaries = []
    symbols = list(economy_data.get("stocks", {}).keys())
    if not symbols:
        return summaries
    for npc_name in random.sample(list(npc_profiles.keys()), k=min(3, len(npc_profiles))):
        entity = find_entity_by_name(f"NPC:{npc_name}")
        if not entity:
            continue
        entity_id = str(entity["id"])
        symbol = random.choice(symbols)
        if random.random() < 0.55:
            qty = random.randint(1, 8)
            ok, msg = buy_stock(entity_id, symbol, qty)
            summaries.append(f"{npc_name}: Kauf {symbol} x{qty} -> {msg}")
        else:
            qty = random.randint(1, 6)
            ok, msg = sell_stock(entity_id, symbol, qty)
            summaries.append(f"{npc_name}: Verkauf {symbol} x{qty} -> {msg}")
    return summaries


def get_or_create_player_entity(user_id: int, display_name: str) -> tuple[str, str]:
    entity_name = f"Player:{user_id}"
    entity = find_entity_by_name(entity_name)
    if entity is None:
        entity_id = create_entity(entity_name, "person", owner_user_id=user_id)
    else:
        entity_id = str(entity["id"])
    account_id = get_primary_account_id(entity_id, account_type="private")
    if account_id is None:
        fallback_id = get_primary_account_id(entity_id)
        fallback_acc = get_account(fallback_id) if fallback_id else None
        if fallback_acc and normalize_account_type(fallback_acc.get("account_type"), fallback="general") == "general":
            fallback_acc["account_type"] = "private"
            fallback_acc["name"] = _unique_entity_account_name(
                entity_id,
                build_account_name("private", display_name),
                ignore_account_id=str(fallback_id),
            )
            save_economy()
            account_id = str(fallback_id)
        else:
            account_id = create_account(
                entity_id,
                initial_balance=2500.0,
                account_type="private",
                owner_label=display_name,
            )
    return entity_id, account_id


# Einmalige Migration: Kontotypen + Namensschema `Typ-Inhaber` konsistent halten.
ensure_account_model_structure()


def can_user_manage_entity(member: discord.abc.User, entity_id: str) -> bool:
    entity = get_entity(entity_id)
    if not entity:
        return False
    if user_has_admin_role(member):
        return True
    if isinstance(member, discord.Member) and int(entity.get("owner_user_id") or 0) == member.id:
        return True

    # State-Chief darf State-Entitaeten verwalten.
    if str(entity.get("type", "")).lower() == "state":
        chief_role_id = get_econ_setting_int("state_chief_role_id")
        if user_has_role_id(member, chief_role_id):
            return True
    return False


def build_turn_prompt_text() -> str:
    completed, required = get_turn_progress()
    lines = [
        "**Beende hier deinen Zug**",
        "Reagiere mit ✅, wenn dein Zug abgeschlossen ist.",
        f"Status: {completed}/{required} Spieler fertig",
        f"Aktueller Zug: #{turn_state.get('turn_index', 1)}",
    ]
    if required < MIN_TURN_ROLE_MEMBERS:
        lines.append(
            f"Hinweis: Mindestens {MIN_TURN_ROLE_MEMBERS} Personen muessen die Turn-Rolle haben. "
            f"Aktuell: {required}."
        )
    return "\n".join(lines)


async def create_turn_prompt_message(channel: discord.TextChannel) -> int:
    msg = await channel.send(build_turn_prompt_text())
    try:
        await msg.add_reaction("✅")
    except discord.DiscordException:
        pass
    return msg.id


async def update_turn_prompt_message(guild: discord.Guild):
    channel_id = turn_state.get("channel_id")
    message_id = turn_state.get("message_id")
    if not channel_id or not message_id:
        return

    channel = guild.get_channel(int(channel_id)) if guild else None
    if channel is None:
        return
    try:
        msg = await channel.fetch_message(int(message_id))
        await msg.edit(content=build_turn_prompt_text())
    except discord.DiscordException:
        pass


def append_turn_action(message: discord.Message):
    actions = turn_state.get("player_actions", [])
    actions.append(
        {
            "user_id": message.author.id,
            "user_name": message.author.display_name,
            "channel_id": message.channel.id,
            "content": message.content[:400],
        }
    )
    if len(actions) > 300:
        actions[:] = actions[-300:]
    turn_state["player_actions"] = actions


async def generate_npc_turn_decision(npc_name: str, summary_text: str, channel) -> str:
    decision_prompt = (
        "Turn-System Kontext. Triff genau eine klare, konkrete Entscheidung mit Markt-/Politikfolge.\n"
        f"Spieler-Kontext:\n{summary_text}\n"
        "Formuliere kompakt in 1-2 Saetzen."
    )
    decision = await ask_npc_progressive(
        npc_name=npc_name,
        player_message=decision_prompt,
        username="TurnSystem",
        channel=channel,
    )
    return decision.strip()


def apply_public_market_update(player_action_count: int, npc_action_count: int) -> dict:
    indicators = turn_state.get("indicators", {})
    market_index = float(indicators.get("market_index", 1000.0))
    inflation = float(indicators.get("inflation", 2.0))
    sentiment = float(indicators.get("sentiment", 50.0))

    market_index += random.uniform(-12, 14) + (player_action_count * 0.8) + (npc_action_count * 1.2)
    inflation += random.uniform(-0.25, 0.35) + (npc_action_count * 0.02)
    sentiment += random.uniform(-5, 6) + min(4.0, player_action_count * 0.15)

    indicators["market_index"] = round(clamp(market_index, 600.0, 2400.0), 2)
    indicators["inflation"] = round(clamp(inflation, -2.0, 25.0), 2)
    indicators["sentiment"] = round(clamp(sentiment, 0.0, 100.0), 2)
    turn_state["indicators"] = indicators
    return indicators


def collect_significant_stock_events() -> list[dict]:
    events = []
    for sym, stock in (economy_data.get("stocks", {}) or {}).items():
        rows = (economy_data.get("stock_history", {}) or {}).get(str(sym).upper(), []) or []
        if not rows:
            continue
        prev_price = float(rows[-1].get("price", 0.0) or 0.0)
        cur_price = float(stock.get("price", 0.0) or 0.0)
        if prev_price <= 0:
            continue
        change_pct = ((cur_price - prev_price) / prev_price) * 100.0
        if abs(change_pct) < 10.0:
            continue
        delta_price = cur_price - prev_price
        delta_currency = abs(delta_price) * 100.0
        direction = "Anstieg" if change_pct > 0 else "Einbruch"
        events.append(
            {
                "kind": "stock_move",
                "importance_score": abs(change_pct),
                "text": (
                    f"Aktie {sym}: {direction} {change_pct:+.2f}% "
                    f"({prev_price:.2f} -> {cur_price:.2f}, Delta-Wert ~{delta_currency:.2f})."
                ),
            }
        )
    return events


async def prioritize_high_impact_events(events: list[dict]) -> list[dict]:
    if not events:
        return []
    fallback = sorted(events, key=lambda x: float(x.get("importance_score", 0.0)), reverse=True)
    if len(events) == 1:
        return fallback
    try:
        payload = [{"id": idx + 1, "text": ev.get("text", "")} for idx, ev in enumerate(events)]
        prompt = (
            "Ordne diese Ereignisse nach gesamtgesellschaftlicher/marktbezogener Wichtigkeit.\n"
            "Gib nur eine kommaseparierte Liste von IDs zurueck, z. B. `3,1,2`.\n"
            f"Ereignisse: {json.dumps(payload, ensure_ascii=False)}"
        )
        result = await llm_chat(
            [{"role": "system", "content": "Du priorisierst Ereignisse strikt und knapp."}],
            user_text=prompt,
        )
        ids = [int(x) for x in re.findall(r"\d+", str(result or ""))]
        if not ids:
            return fallback
        rank = {eid: pos for pos, eid in enumerate(ids)}
        return sorted(
            events,
            key=lambda ev: rank.get(events.index(ev) + 1, 10**6 + events.index(ev)),
        )
    except Exception:
        return fallback


def store_turn_events_in_lore(turn_index: int, events: list[dict], reason: str):
    lines = [f"Turn #{turn_index} ({reason})"]
    if events:
        for ev in events[:20]:
            lines.append(f"- {ev.get('text')}")
    else:
        lines.append("- Keine hochrelevanten Ereignisse.")
    lore_data.setdefault("events", []).append(format_lore_event("high", "TURN", "\n".join(lines)))
    keep_lore_events_bounded()
    save_lore()


async def finalize_turn_and_report(guild: discord.Guild, reason: str = "all_ready"):
    async with turn_resolution_lock:
        if not turn_state.get("enabled"):
            return
        if guild is None or guild.id != turn_state.get("guild_id"):
            return

        channel = guild.get_channel(int(turn_state.get("channel_id"))) if turn_state.get("channel_id") else None
        if channel is None:
            return

        turn_index = int(turn_state.get("turn_index", 1))
        actions = list(turn_state.get("player_actions", []))
        player_action_count = len(actions)
        econ_summaries = apply_queued_econ_actions_for_turn(turn_index)
        contract_summaries = execute_active_contracts_for_turn(turn_index)
        salary_summaries = execute_salary_payouts_for_turn()
        loan_summaries = execute_loan_payments_for_turn(turn_index)
        insurance_summaries = process_insurance_premiums_for_turn()
        state_income_summaries = execute_state_incomes_for_turn()
        dividend_summaries = execute_yearly_dividends_for_turn(turn_index)
        npc_market_summaries = npc_market_actions_for_turn()
        action_text = "\n".join(
            f"- {entry.get('user_name', 'User')}: {entry.get('content', '')}" for entry in actions[-25:]
        ) or "- Keine oeffentlich sichtbaren Spieleraktionen."

        npc_names = list(npc_profiles.keys())
        random.shuffle(npc_names)
        selected_npcs = npc_names[: min(3, len(npc_names))]
        npc_decisions = []
        for npc_name in selected_npcs:
            try:
                decision = await generate_npc_turn_decision(npc_name, action_text, channel)
                npc_decisions.append((npc_name, decision))
                await maybe_store_npc_event_in_lore(
                    npc_name=npc_name,
                    npc_output=decision,
                    channel_name=channel.name,
                    source="turn_resolution",
                )
            except Exception as exc:
                npc_decisions.append((npc_name, f"(keine Entscheidung: {exc})"))

        # NPC-Staaten-Strategiekern: Krieg/Handel/Diplomatie/Intrige pro Zug.
        state_strategy_rows = run_npc_state_strategy_for_turn(turn_index)
        indicators = apply_public_market_update(
            player_action_count,
            len(npc_decisions) + len(state_strategy_rows),
        )
        important_events = []
        important_events.extend(collect_significant_stock_events())
        important_events.extend(collect_high_importance_law_events_for_turn(turn_index))
        important_events.extend(get_npc_state_strategy_events_for_turn(turn_index))
        important_events = await prioritize_high_impact_events(important_events)

        press_lines = [f"**PRESSEBERICHT ZUG #{turn_index}**", f"Zugabschlussgrund: `{reason}`", ""]
        press_lines.append("Wichtige Ereignisse (nur HIGH):")
        if important_events:
            for ev in important_events[:20]:
                press_lines.append(f"- {ev.get('text')}")
        else:
            press_lines.append("- Keine hochrelevanten Ereignisse in diesem Zug.")

        press_lines.extend(
            [
                "",
                "Oeffentliche Marktindikatoren:",
                f"- Marktindex: {indicators['market_index']}",
                f"- Inflation: {indicators['inflation']}%",
                f"- Sentiment: {indicators['sentiment']}/100",
            ]
        )
        if state_strategy_rows:
            press_lines.append("")
            press_lines.append("NPC-Staaten Strategie:")
            for row in state_strategy_rows[:20]:
                label = STRATEGY_ACTION_LABELS.get(str(row.get("action", "")), str(row.get("action", "")))
                press_lines.append(f"- [{label}] {row.get('text')}")
        stocks = economy_data.get("stocks", {})
        if stocks:
            press_lines.append("- Aktien-Snapshot:")
            for sym, stock in list(sorted(stocks.items()))[:8]:
                press_lines.append(f"  {sym}: {format_money(float(stock.get('price', 0)))}")
        econ_report_rows = []
        econ_report_rows.extend(econ_summaries[:8])
        econ_report_rows.extend(contract_summaries[:8])
        econ_report_rows.extend(salary_summaries[:8])
        econ_report_rows.extend(loan_summaries[:8])
        econ_report_rows.extend(insurance_summaries[:8])
        econ_report_rows.extend(state_income_summaries[:8])
        econ_report_rows.extend(dividend_summaries[:8])
        econ_report_rows.extend(npc_market_summaries[:8])
        if econ_report_rows:
            press_lines.append("")
            press_lines.append("Wirtschaftliche Vollzuege:")
            for row in econ_report_rows[:18]:
                press_lines.append(f"- {row}")
        missing_states = find_missing_states_in_lore()
        if missing_states:
            press_lines.append("")
            press_lines.append("Lore-Hinweis:")
            press_lines.append(
                "- Folgende definierte Staaten fehlen in der Lore: "
                + ", ".join(missing_states[:20])
            )
        record_stock_snapshot(turn_index)
        store_turn_events_in_lore(turn_index, important_events, reason)
        press_report = "\n".join(press_lines)
        await send_long_message(channel, press_report)

        reports = turn_state.get("turn_reports", [])
        reports.append({"turn": turn_index, "reason": reason, "report": press_report})
        if len(reports) > 40:
            reports = reports[-40:]
        turn_state["turn_reports"] = reports

        turn_state["turn_index"] = turn_index + 1
        turn_state["completed_user_ids"] = []
        turn_state["player_actions"] = []
        refresh_turn_requirements(guild)
        turn_state["message_id"] = await create_turn_prompt_message(channel)
        save_turn_state()

        # Unternehmensforen: Aktienpost pro Zug aktualisieren.
        for entity_id in economy_data.get("company_forums", {}).keys():
            await sync_company_forum_posts(guild, str(entity_id))
        await post_company_support_turn_updates(guild, int(turn_state.get("turn_index", turn_index + 1)))


def ensure_npc_memory_structure(npc_name: str):
    if npc_name not in npc_memory:
        npc_memory[npc_name] = {
            "core_memory": [],
            "long_term": [],
            "short_term": [],
            "last_channel": None,
        }
        save_memory()


COMPANY_SUBTYPE_PRESETS = {
    "industrie": {
        "label": "Industrie",
        "recommended_insurance": ["property", "abbau", "liability", "transport"],
    },
    "logistik": {
        "label": "Logistik",
        "recommended_insurance": ["transport", "liability", "property"],
    },
    "it": {
        "label": "IT / Software",
        "recommended_insurance": ["cyber", "liability", "property"],
    },
    "handel": {
        "label": "Handel",
        "recommended_insurance": ["property", "liability", "transport"],
    },
    "finanzen": {
        "label": "Finanzen / Versicherung",
        "recommended_insurance": ["compliance", "cyber", "liability"],
    },
    "energie": {
        "label": "Energie / Versorgung",
        "recommended_insurance": ["property", "liability", "political", "workers"],
    },
    "dienstleistung": {
        "label": "Dienstleistungssektor",
        "recommended_insurance": ["liability", "compliance", "cyber"],
    },
}

INSURANCE_POLICY_PRESETS = {
    "property": {
        "label": "Sachversicherung",
        "premium_per_turn": 180.0,
        "coverage_limit": 7000.0,
        "deductible": 250.0,
        "events": {"accident", "damage", "fire", "sabotage"},
    },
    "liability": {
        "label": "Haftpflicht",
        "premium_per_turn": 140.0,
        "coverage_limit": 6000.0,
        "deductible": 200.0,
        "events": {"corruption", "strike", "compliance", "damage"},
    },
    "workers": {
        "label": "Arbeitsausfall",
        "premium_per_turn": 150.0,
        "coverage_limit": 5500.0,
        "deductible": 180.0,
        "events": {"accident", "strike", "health"},
    },
    "abbau": {
        "label": "Abbau / Schwerbetrieb",
        "premium_per_turn": 170.0,
        "coverage_limit": 7200.0,
        "deductible": 260.0,
        "events": {"accident", "damage", "transport", "sabotage"},
    },
    "transport": {
        "label": "Transport",
        "premium_per_turn": 120.0,
        "coverage_limit": 5000.0,
        "deductible": 150.0,
        "events": {"transport", "delay", "damage"},
    },
    "cyber": {
        "label": "Cyber",
        "premium_per_turn": 130.0,
        "coverage_limit": 6500.0,
        "deductible": 220.0,
        "events": {"cyber", "data", "sabotage"},
    },
    "political": {
        "label": "Politikrisiko",
        "premium_per_turn": 160.0,
        "coverage_limit": 8000.0,
        "deductible": 300.0,
        "events": {"policy", "sanction", "stability"},
    },
    "compliance": {
        "label": "Compliance",
        "premium_per_turn": 110.0,
        "coverage_limit": 4500.0,
        "deductible": 120.0,
        "events": {"corruption", "compliance", "audit"},
    },
}

COMPANY_POSITIVE_EVENTS = [
    {"key": "efficiency", "title": "Effizienzsprung", "summary": "interne Ablaeufe greifen sauber ineinander", "amount": (250.0, 900.0)},
    {"key": "contract", "title": "Unerwarteter Auftrag", "summary": "ein neuer Auftrag bringt kurzfristig Schwung", "amount": (300.0, 1200.0)},
    {"key": "innovation", "title": "Produktionsidee", "summary": "ein Teamvorschlag verbessert die Fertigung", "amount": (220.0, 850.0)},
    {"key": "morale", "title": "Motivationsschub", "summary": "die Belegschaft zieht sichtbar an einem Strang", "amount": (180.0, 700.0)},
]

COMPANY_NEGATIVE_EVENTS = [
    {"key": "corruption", "title": "Korruptionsverdacht", "summary": "unklare Absprachen werfen Fragen auf", "amount": (300.0, 1500.0), "insurance": "compliance"},
    {"key": "strike", "title": "interner Streit", "summary": "Konflikte zwischen Leitung und Team bremsen Prozesse", "amount": (250.0, 1100.0), "insurance": "workers"},
    {"key": "accident", "title": "Arbeitsunfall", "summary": "ein Unfall stoert den Betriebsablauf", "amount": (350.0, 1800.0), "insurance": "workers"},
    {"key": "transport", "title": "Lieferproblem", "summary": "eine Lieferung bleibt haengen oder kommt beschaedigt an", "amount": (220.0, 1300.0), "insurance": "transport"},
    {"key": "cyber", "title": "IT-Stoerung", "summary": "digitale Systeme fallen kurzfristig aus", "amount": (260.0, 1400.0), "insurance": "cyber"},
    {"key": "damage", "title": "Sachschaden", "summary": "Maschinen oder Lagerflaechen nehmen Schaden", "amount": (320.0, 1600.0), "insurance": "property"},
]

LEADERSHIP_STYLE_TEXTS = {
    "ausgewogen": {"good": "ruhig, geordnet und zielklar", "mid": "geordnet, aber wachsam", "bad": "vorsichtig und verkrampft"},
    "kooperativ": {"good": "offen, kollegial und motiviert", "mid": "gespraechsbereit, aber unsicher", "bad": "zaeh und diskussionslastig"},
    "autokra­tisch": {"good": "diszipliniert und straff", "mid": "still und angespannt", "bad": "unter Druck und misstrauisch"},
    "autokratisch": {"good": "diszipliniert und straff", "mid": "still und angespannt", "bad": "unter Druck und misstrauisch"},
    "innovativ": {"good": "energiegeladen und experimentierfreudig", "mid": "hektisch, aber hoffnungsvoll", "bad": "chaotisch und ueberreizt"},
    "effizient": {"good": "praezise und leistungsorientiert", "mid": "nuechtern und fordernd", "bad": "kalt, ueberlastet und eng getaktet"},
    "fuersorglich": {"good": "loyal und stabil", "mid": "freundlich, aber besorgt", "bad": "mued e und emotional belastet"},
    "risikofreudig": {"good": "mutig und aufbruchsbereit", "mid": "nervoes, aber gespannt", "bad": "nervoes und unruhig"},
}
LEADERSHIP_STYLE_TEXTS.pop("autokra­tisch", None)
LEADERSHIP_STYLE_TEXTS["fuersorglich"] = {
    "good": "loyal und stabil",
    "mid": "freundlich, aber besorgt",
    "bad": "muede und emotional belastet",
}


def _safe_channel_slug(text: str, fallback: str = "company") -> str:
    raw = str(text or "").strip().lower()
    for src, target in {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}.items():
        raw = raw.replace(src, target)
    raw = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return (raw or fallback)[:80]


def _normalize_company_forum_config(entity_id: str) -> dict:
    cfg = economy_data.setdefault("company_forums", {}).setdefault(str(entity_id), {})
    cfg.setdefault("forum_channel_id", None)
    cfg.setdefault("profile_thread_id", None)
    cfg.setdefault("profile_message_id", None)
    cfg.setdefault("stock_thread_id", None)
    cfg.setdefault("stock_message_id", None)
    cfg.setdefault("category_channel_id", None)
    cfg.setdefault("office_channel_id", None)
    cfg.setdefault("department_channel_id", None)
    cfg.setdefault("staff_npc_name", "")
    cfg.setdefault("management_npc_name", "")
    return cfg


def get_company_support_npc_names(entity_id: str) -> tuple[str, str]:
    entity = get_entity(str(entity_id))
    company_name = str(entity.get("name", entity_id)) if entity else str(entity_id)
    return f"Staff ({company_name})", f"Management ({company_name})"


def get_company_channel_binding(channel_id: int) -> tuple[Optional[str], Optional[str]]:
    cid = int(channel_id or 0)
    for entity_id, raw_cfg in (economy_data.get("company_forums", {}) or {}).items():
        cfg = _normalize_company_forum_config(str(entity_id))
        if int(cfg.get("office_channel_id") or 0) == cid:
            return str(entity_id), "office"
        if int(cfg.get("department_channel_id") or 0) == cid:
            return str(entity_id), "department"
    return None, None


def get_active_insurance_policies(entity_id: str) -> list[dict]:
    rows = []
    for policy in (economy_data.get("insurances", {}) or {}).values():
        if str(policy.get("insured_entity_id")) != str(entity_id):
            continue
        if str(policy.get("status", "active")).lower() != "active":
            continue
        rows.append(policy)
    rows.sort(key=lambda x: int(x.get("created_turn", 0) or 0))
    return rows


def ensure_insurance_provider() -> tuple[str, str]:
    entity_id, account_id = ensure_entity_and_account("Versicherungsamt", "bank", initial_balance=900000.0)
    return entity_id, account_id


def build_insurance_overview_text(entity_id: str) -> str:
    policies = get_active_insurance_policies(entity_id)
    entity_name = get_entity_name(entity_id)
    if not policies:
        return f"Keine aktiven Versicherungen fuer {entity_name}."
    lines = [f"**Versicherungen fuer {entity_name}**"]
    for policy in policies[:20]:
        preset = INSURANCE_POLICY_PRESETS.get(str(policy.get("policy_type", "")).lower(), {})
        lines.append(
            f"- #{policy.get('id')} {preset.get('label', policy.get('policy_type'))} | "
            f"Praemie/Zug {format_money(float(policy.get('premium_per_turn', 0.0) or 0.0))} | "
            f"Limit {format_money(float(policy.get('coverage_limit', 0.0) or 0.0))}"
        )
    return "\n".join(lines)


def issue_insurance_policy(entity_id: str, policy_type: str) -> tuple[bool, str]:
    policy_key = str(policy_type or "").strip().lower()
    preset = INSURANCE_POLICY_PRESETS.get(policy_key)
    if not preset:
        return False, "Unbekannter Versicherungstyp."
    entity = get_entity(str(entity_id))
    if not entity:
        return False, "Entitaet nicht gefunden."
    for policy in get_active_insurance_policies(entity_id):
        if str(policy.get("policy_type", "")).lower() == policy_key:
            return False, "Diese Versicherung ist bereits aktiv."
    insurer_entity_id, insurer_account_id = ensure_insurance_provider()
    policy_id = str(_next_id("insurance"))
    economy_data.setdefault("insurances", {})[policy_id] = {
        "id": policy_id,
        "insured_entity_id": str(entity_id),
        "provider_entity_id": insurer_entity_id,
        "provider_account_id": insurer_account_id,
        "policy_type": policy_key,
        "premium_per_turn": float(preset["premium_per_turn"]),
        "coverage_limit": float(preset["coverage_limit"]),
        "deductible": float(preset["deductible"]),
        "status": "active",
        "claim_count": 0,
        "paid_total": 0.0,
        "created_turn": int(turn_state.get("turn_index", 1)),
        "last_paid_turn": None,
        "last_claim_turn": None,
    }
    save_economy()
    return True, f"Versicherung aktiviert: {preset['label']} fuer {get_entity_name(entity_id)}."


def cancel_insurance_policy(policy_id: str) -> tuple[bool, str]:
    policy = (economy_data.get("insurances", {}) or {}).get(str(policy_id))
    if not policy:
        return False, "Versicherung nicht gefunden."
    policy["status"] = "cancelled"
    save_economy()
    return True, f"Versicherung #{policy_id} beendet."


def process_insurance_premiums_for_turn() -> list[str]:
    summaries = []
    for policy in list((economy_data.get("insurances", {}) or {}).values()):
        if str(policy.get("status", "active")).lower() != "active":
            continue
        insured_entity_id = str(policy.get("insured_entity_id"))
        insured_account_id = get_primary_account_id(insured_entity_id, account_type="company") or get_primary_account_id(insured_entity_id)
        provider_account_id = str(policy.get("provider_account_id") or "")
        if not insured_account_id or not provider_account_id:
            continue
        amount = float(policy.get("premium_per_turn", 0.0) or 0.0)
        if amount <= 0:
            continue
        ok, msg = transfer_funds(insured_account_id, provider_account_id, amount, note=f"insurance_premium_{policy.get('id')}")
        preset = INSURANCE_POLICY_PRESETS.get(str(policy.get("policy_type", "")).lower(), {})
        label = preset.get("label", policy.get("policy_type"))
        if ok:
            policy["last_paid_turn"] = int(turn_state.get("turn_index", 1))
            summaries.append(f"{get_entity_name(insured_entity_id)}: Versicherungspraemie {label} gebucht ({format_money(amount)}).")
        else:
            policy["status"] = "suspended"
            summaries.append(f"{get_entity_name(insured_entity_id)}: Versicherung {label} ausgesetzt ({msg}).")
    save_economy()
    return summaries


def _apply_company_event_financials(entity_id: str, event: dict) -> tuple[float, float]:
    company_account_id = get_primary_account_id(entity_id, account_type="company") or get_primary_account_id(entity_id)
    account = get_account(company_account_id) if company_account_id else None
    if not account:
        return 0.0, 0.0
    amount = float(event.get("amount", 0.0) or 0.0)
    payout = 0.0
    if amount >= 0:
        account["balance"] = round(float(account.get("balance", 0.0) or 0.0) + amount, 2)
        record_transaction("company_event_gain", {"entity_id": str(entity_id), "event_key": event.get("key"), "amount": round(amount, 2)})
        save_economy()
        return amount, 0.0

    gross_loss = abs(amount)
    covered_type = str(event.get("insurance", "") or "").lower()
    event_key = str(event.get("key", "") or "").lower()
    candidate_policies = []
    fallback_policies = []
    for policy in get_active_insurance_policies(entity_id):
        policy_type = str(policy.get("policy_type", "")).lower()
        preset = INSURANCE_POLICY_PRESETS.get(policy_type, {})
        covered_events = {str(item).lower() for item in (preset.get("events", set()) or set())}
        if covered_type and policy_type == covered_type:
            candidate_policies.append(policy)
            continue
        if event_key and event_key in covered_events:
            fallback_policies.append(policy)
    for policy in candidate_policies + fallback_policies:
        covered = max(0.0, gross_loss - float(policy.get("deductible", 0.0) or 0.0))
        payout = min(covered, float(policy.get("coverage_limit", 0.0) or 0.0))
        if payout > 0:
            provider_account_id = str(policy.get("provider_account_id") or "")
            if provider_account_id:
                transfer_funds(provider_account_id, company_account_id, payout, note=f"insurance_claim_{policy.get('id')}_{event.get('key')}")
                policy["claim_count"] = int(policy.get("claim_count", 0) or 0) + 1
                policy["paid_total"] = round(float(policy.get("paid_total", 0.0) or 0.0) + payout, 2)
                policy["last_claim_turn"] = int(turn_state.get("turn_index", 1))
        break
    net_loss = max(0.0, gross_loss - payout)
    current = float(account.get("balance", 0.0) or 0.0)
    applied_loss = min(current, net_loss)
    account["balance"] = round(current - applied_loss, 2)
    record_transaction(
        "company_event_loss",
        {
            "entity_id": str(entity_id),
            "event_key": event.get("key"),
            "gross_loss": round(gross_loss, 2),
            "insurance_payout": round(payout, 2),
            "net_loss": round(applied_loss, 2),
        },
    )
    save_economy()
    return -applied_loss, payout


def build_company_management_context(entity_id: str) -> str:
    entity = get_entity(str(entity_id))
    if not entity:
        return "Keine Firmendaten gefunden."
    ensure_entity_profile_structure(entity)
    metrics = compute_entity_success_metrics(entity_id)
    account_id = get_primary_account_id(entity_id, account_type="company") or get_primary_account_id(entity_id)
    account = get_account(account_id) if account_id else None
    balance = float(account.get("balance", 0.0) or 0.0) if account else 0.0
    products = [p for p in (economy_data.get("products", {}) or {}).values() if str(p.get("owner_entity_id")) == str(entity_id)]
    products.sort(key=lambda x: str(x.get("name", "")).lower())
    product_text = ", ".join(f"#{p.get('id')} {p.get('name')}" for p in products[:10]) or "-"
    inv = economy_data.get("inventories", {}).get(str(entity_id), {}) or {}
    inv_rows = []
    for pid, qty in list(inv.items())[:8]:
        prod = get_product(str(pid))
        inv_rows.append(f"{prod.get('name', pid)} x{qty}" if prod else f"{pid} x{qty}")
    insurance_rows = []
    for policy in get_active_insurance_policies(entity_id)[:8]:
        preset = INSURANCE_POLICY_PRESETS.get(str(policy.get("policy_type", "")).lower(), {})
        insurance_rows.append(preset.get("label", policy.get("policy_type", "")))
    return (
        f"Firma: {entity.get('name')}\n"
        f"Fuehrungsstil: {entity.get('profile', {}).get('leadership_style', 'ausgewogen')}\n"
        f"Unterkategorie: {entity.get('profile', {}).get('company_subtype', '-') or '-'}\n"
        f"State: {entity.get('profile', {}).get('state', '-') or '-'}\n"
        f"Erfolgswert: {float(metrics.get('score', 0.0)):.2f}/100 ({metrics.get('label', '-')})\n"
        f"Produktionsfaktor: x{float(metrics.get('production_multiplier', 1.0)):.2f}\n"
        f"Ausfallrisiko: {float(metrics.get('failure_risk_pct', 0.0)):.2f}%\n"
        f"Balance: {format_money(balance)}\n"
        f"Produkte: {product_text}\n"
        f"Inventar: {', '.join(inv_rows) if inv_rows else '-'}\n"
        f"Versicherungen: {', '.join(insurance_rows) if insurance_rows else '-'}\n"
        f"Faktoren: {format_success_factors_text(entity_id)}"
    )


def build_company_atmosphere_text(entity_id: str) -> str:
    entity = get_entity(str(entity_id))
    if not entity:
        return "unbestimmt"
    ensure_entity_profile_structure(entity)
    score = float(compute_entity_success_metrics(entity_id).get("score", 50.0) or 50.0)
    style = str(entity.get("profile", {}).get("leadership_style", "ausgewogen") or "ausgewogen").strip().lower()
    style_data = LEADERSHIP_STYLE_TEXTS.get(style, LEADERSHIP_STYLE_TEXTS["ausgewogen"])
    if score >= 70:
        return style_data["good"]
    if score >= 45:
        return style_data["mid"]
    return style_data["bad"]


def build_company_turn_event(entity_id: str) -> dict:
    metrics = compute_entity_success_metrics(entity_id)
    score = float(metrics.get("score", 50.0) or 50.0)
    negative_bias = clamp(0.65 - (score / 160.0), 0.18, 0.72)
    if random.random() < negative_bias:
        selected = random.choice(COMPANY_NEGATIVE_EVENTS)
        low, high = selected["amount"]
        amount = -round(random.uniform(low, high), 2)
        return {**selected, "tone": "negative", "amount": amount}
    selected = random.choice(COMPANY_POSITIVE_EVENTS)
    low, high = selected["amount"]
    amount = round(random.uniform(low, high), 2)
    return {**selected, "tone": "positive", "amount": amount, "insurance": ""}


def build_company_event_message(entity_id: str) -> dict:
    event = build_company_turn_event(entity_id)
    delta, payout = _apply_company_event_financials(entity_id, event)
    atmosphere = build_company_atmosphere_text(entity_id)
    metrics = compute_entity_success_metrics(entity_id)
    company_name = get_entity_name(entity_id)
    staff_text = (
        f"Atmosphaere im Betrieb: {atmosphere}. "
        f"Heutiges Ereignis: {event['title']} - {event['summary']}. "
    )
    management_text = (
        f"Status Zug #{turn_state.get('turn_index', 1)} fuer {company_name}: "
        f"Erfolg {float(metrics.get('score', 0.0)):.2f}/100, Produktionsfaktor x{float(metrics.get('production_multiplier', 1.0)):.2f}. "
        f"Ereignis: {event['title']}."
    )
    if delta >= 0:
        money_line = f"Finanzeffekt: +{format_money(delta)}."
    else:
        money_line = f"Finanzeffekt: -{format_money(abs(delta))}."
    if payout > 0:
        money_line += f" Versicherungsauszahlung: {format_money(payout)}."
    staff_text += money_line
    management_text += " " + money_line
    return {"staff_text": staff_text, "management_text": management_text, "event": event, "delta": delta, "payout": payout}


def ensure_company_support_npcs(entity_id: str) -> tuple[str, str]:
    staff_name, management_name = get_company_support_npc_names(entity_id)
    company_name = get_entity_name(entity_id)
    staff_prompt = (
        f"Du bist {staff_name}, die Stimme der Belegschaft von {company_name}. "
        "Du berichtest knapp ueber Stimmung, Probleme, Motivation und Ereignisse aus der Abteilung. "
        "Du klingst wie interne Mitarbeitende und bleibst innerhalb des Firmenalltags."
    )
    management_prompt = (
        f"Du bist {management_name}, die Management-Assistenz von {company_name}. "
        "Du kennst Unternehmensprofil, Produkte, Produktion, Kredite, Versicherungen, Erfolgsfaktoren und die juengsten wirtschaftlichen Entwicklungen. "
        "Du antwortest sachlich, hilfreich und firmennah wie ein interner Assistent."
    )
    if staff_name not in npc_profiles:
        npc_profiles[staff_name] = {"type": "group", "prompt": staff_prompt, "icon_url": ""}
    if management_name not in npc_profiles:
        npc_profiles[management_name] = {"type": "character", "prompt": management_prompt, "icon_url": ""}
    ensure_npc_memory_structure(staff_name)
    ensure_npc_memory_structure(management_name)
    save_npc_profiles()
    save_memory()
    return staff_name, management_name


async def ensure_company_discord_structure(guild: Optional[discord.Guild], entity_id: str) -> tuple[bool, str]:
    entity = get_entity(str(entity_id))
    if not entity or str(entity.get("type", "")).lower() != "company":
        return False, "Entitaet ist kein Unternehmen."
    cfg = _normalize_company_forum_config(entity_id)
    staff_name, management_name = ensure_company_support_npcs(entity_id)
    cfg["staff_npc_name"] = staff_name
    cfg["management_npc_name"] = management_name
    if guild is None:
        save_economy()
        return True, "Support-NPCs erstellt. Kein Guild-Kontext fuer Kanaele."

    company_name = str(entity.get("name", entity_id))
    category_name = f"Firma {company_name}"[:95]
    category = guild.get_channel(int(cfg.get("category_channel_id") or 0)) if cfg.get("category_channel_id") else None
    if not isinstance(category, discord.CategoryChannel):
        try:
            category = discord.utils.get(guild.categories, name=category_name)
            if category is None:
                category = await guild.create_category(category_name)
            cfg["category_channel_id"] = int(category.id)
        except Exception:
            category = None

    office_channel = guild.get_channel(int(cfg.get("office_channel_id") or 0)) if cfg.get("office_channel_id") else None
    if office_channel is None and category is not None:
        try:
            office_channel = discord.utils.get(category.channels, name="buero")
            if office_channel is None:
                office_channel = await guild.create_text_channel("buero", category=category, topic=f"Management-Buero von {company_name}")
            cfg["office_channel_id"] = int(office_channel.id)
        except Exception:
            office_channel = None

    department_channel = guild.get_channel(int(cfg.get("department_channel_id") or 0)) if cfg.get("department_channel_id") else None
    if department_channel is None and category is not None:
        try:
            department_channel = discord.utils.get(category.channels, name="abteilung")
            if department_channel is None:
                department_channel = await guild.create_text_channel("abteilung", category=category, topic=f"Team- und Staff-Updates fuer {company_name}")
            cfg["department_channel_id"] = int(department_channel.id)
        except Exception:
            department_channel = None

    forum_channel = guild.get_channel(int(cfg.get("forum_channel_id") or 0)) if cfg.get("forum_channel_id") else None
    if forum_channel is None:
        try:
            forum_name = f"forum-{_safe_channel_slug(company_name, fallback='firma')}"[:90]
            forum_channel = discord.utils.get(guild.forums, name=forum_name)
            if forum_channel is None:
                if category is not None:
                    forum_channel = await guild.create_forum(name=forum_name, topic=f"Unternehmensforum fuer {company_name}", category=category)
                else:
                    forum_channel = await guild.create_forum(name=forum_name, topic=f"Unternehmensforum fuer {company_name}")
            cfg["forum_channel_id"] = int(forum_channel.id)
        except Exception:
            forum_channel = None

    if forum_channel and not cfg.get("profile_thread_id"):
        profile_result = await forum_channel.create_thread(name="Unternehmensprofil (Bot)", content=build_company_profile_text(entity_id))
        stock_result = await forum_channel.create_thread(name="Aktienhistorie (Bot)", content=build_company_stock_text(entity_id))
        profile_thread = getattr(profile_result, "thread", profile_result)
        profile_msg = getattr(profile_result, "message", None)
        stock_thread = getattr(stock_result, "thread", stock_result)
        stock_msg = getattr(stock_result, "message", None)
        cfg["profile_thread_id"] = profile_thread.id if profile_thread else None
        cfg["profile_message_id"] = profile_msg.id if profile_msg else None
        cfg["stock_thread_id"] = stock_thread.id if stock_thread else None
        cfg["stock_message_id"] = stock_msg.id if stock_msg else None

    save_economy()
    if office_channel:
        try:
            await send_npc_reply(office_channel, management_name, f"Management online. Ich halte {company_name} intern im Blick und beantworte hier Firmenfragen.")
        except Exception:
            pass
    if department_channel:
        try:
            await send_npc_reply(department_channel, staff_name, f"Staff online. Wir melden uns hier kuenftig zu Stimmung und Betriebsereignissen fuer {company_name}.")
        except Exception:
            pass
    if guild:
        await sync_company_forum_posts(guild, entity_id)
    return True, f"Firmenstruktur erstellt fuer {company_name}."


async def post_company_support_turn_updates(guild: Optional[discord.Guild], turn_index: int) -> list[str]:
    if guild is None:
        return []
    summaries = []
    for entity_id, raw_cfg in list((economy_data.get("company_forums", {}) or {}).items()):
        entity = get_entity(str(entity_id))
        if not entity or str(entity.get("type", "")).lower() != "company":
            continue
        cfg = _normalize_company_forum_config(str(entity_id))
        ensure_company_support_npcs(str(entity_id))
        payload = build_company_event_message(str(entity_id))
        office_channel = guild.get_channel(int(cfg.get("office_channel_id") or 0)) if cfg.get("office_channel_id") else None
        department_channel = guild.get_channel(int(cfg.get("department_channel_id") or 0)) if cfg.get("department_channel_id") else None
        if department_channel:
            try:
                await send_npc_reply(department_channel, cfg.get("staff_npc_name") or get_company_support_npc_names(str(entity_id))[0], payload["staff_text"])
            except Exception:
                pass
        if office_channel:
            try:
                await send_npc_reply(office_channel, cfg.get("management_npc_name") or get_company_support_npc_names(str(entity_id))[1], payload["management_text"])
            except Exception:
                pass
        summaries.append(f"{entity.get('name')}: Atmosphaere `{build_company_atmosphere_text(str(entity_id))}` | Event `{payload['event']['title']}`")
    return summaries


async def ask_company_management_npc(entity_id: str, user_message: str, username: str, channel):
    _, management_name = ensure_company_support_npcs(entity_id)
    extra_context = [
        "Aktueller Firmenkontext:\n" + build_company_management_context(entity_id),
        "Antworte als interne Managementassistenz. Hilf konkret bei Firmenfragen, statt allgemein den Bot zu erklaeren.",
    ]
    return await ask_npc_progressive(
        npc_name=management_name,
        player_message=user_message,
        username=username,
        channel=channel,
        extra_system_messages=extra_context,
    )


async def update_core_memory(npc_name: str, summary_text: str):
    memory = npc_memory[npc_name]
    core_text = "\n".join(entry["content"] for entry in memory["core_memory"])
    prompt = f"""
Du bist ein persistenter NPC.

Aktuelles Core Memory:
{core_text}

Neue Zusammenfassung:
{summary_text}

Frage:
Soll ein Teil dieser neuen Informationen dauerhaft
Teil deiner Identitaet, Beziehungen oder Weltansicht werden?

Wenn JA:
Schreibe nur die neuen Core-Punkte.
Wenn NEIN:
Schreibe nur: NONE
"""
    result = (await llm_chat([{"role": "user", "content": prompt}])).strip()
    if result != "NONE":
        memory["core_memory"].append({"role": "system", "content": f"Core Update:\n{result}"})
        if len(memory["core_memory"]) > 15:
            memory["core_memory"] = memory["core_memory"][-15:]
        save_memory()


async def compress_short_term_memory(npc_name: str):
    memory = npc_memory[npc_name]
    short_term = memory["short_term"]
    dialogue_pairs = []
    temp = []

    for msg in short_term:
        temp.append(msg)
        if len(temp) == 2 and temp[0]["role"] == "user" and temp[1]["role"] == "assistant":
            dialogue_pairs.append(temp)
            temp = []

    if len(dialogue_pairs) < 20:
        return

    pairs_to_compress = dialogue_pairs[:20]
    conversation_text = ""
    for pair in pairs_to_compress:
        conversation_text += f"USER: {pair[0]['content']}\nASSISTANT: {pair[1]['content']}\n\n"

    summary_prompt = f"""
Fasse folgende langfristige Interaktion kompakt zusammen.
Behalte:
- Entscheidungen
- Beziehungen
- Konflikte
- wirtschaftliche Ereignisse
- Charakterentwicklung

Konversation:
{conversation_text}
"""
    summary = await llm_chat([{"role": "user", "content": summary_prompt}])
    await update_core_memory(npc_name, summary)

    memory["long_term"].append(
        {"role": "system", "content": f"Langzeit-Zusammenfassung:\n{summary}"}
    )
    for pair in pairs_to_compress:
        memory["short_term"].remove(pair[0])
        memory["short_term"].remove(pair[1])
    save_memory()


async def ask_npc_progressive(
    npc_name: str,
    player_message: str,
    username: str,
    channel,
    extra_system_messages: Optional[list[str]] = None,
):
    if npc_name not in npc_profiles:
        return f"Fehler: NPC `{npc_name}` existiert nicht."

    ensure_npc_memory_structure(npc_name)
    memory = npc_memory[npc_name]
    memory["last_channel"] = channel.id

    memory["short_term"].append({"role": "user", "content": f"{username}: {player_message}"})
    save_memory()

    npc_prompt = npc_profiles[npc_name].get("prompt", "")
    messages = [{"role": "system", "content": BASE_PERSONA + npc_prompt}]
    messages.extend(memory["core_memory"][-5:])
    messages.extend(memory["long_term"][-5:])
    messages.extend(memory["short_term"][-10:])

    lore_text = lore_data["description"] or "Keine Lore vorhanden."
    events_text = ", ".join(lore_data["events"][-5:]) if lore_data["events"] else "Keine Ereignisse."
    rules_text = ", ".join(lore_data["rules"][-5:]) if lore_data["rules"] else "Keine Regeln."
    messages.append(
        {
            "role": "system",
            "content": (
                "Allgemeine Weltinformationen:\n"
                f"{lore_text}\nEreignisse: {events_text}\nRegeln: {rules_text}"
            ),
        }
    )
    for extra in extra_system_messages or []:
        extra_text = str(extra or "").strip()
        if extra_text:
            messages.append({"role": "system", "content": extra_text[:4000]})
    messages.append({"role": "system", "content": STORY_PROGRESSION_DIRECTIVE})
    messages.append({"role": "system", "content": NO_STALL_DIRECTIVE})

    async with channel.typing():
        bot_reply = await llm_chat(messages, user_text=player_message)
    memory["short_term"].append({"role": "assistant", "content": bot_reply})
    save_memory()
    await compress_short_term_memory(npc_name)

    return bot_reply


async def send_npc_reply(channel, npc_name: str, content: str):
    chunk_size = 1900

    cache_key = (channel.id, npc_name)
    npc_webhook = webhook_cache.get(cache_key)

    if npc_webhook is None:
        webhooks = await channel.webhooks()
        npc_webhook = discord.utils.get(webhooks, name=f"NPC Webhook - {npc_name}")
        if npc_webhook is None:
            npc_webhook = await channel.create_webhook(name=f"NPC Webhook - {npc_name}")
        webhook_cache[cache_key] = npc_webhook

    icon_url = npc_profiles.get(npc_name, {}).get("icon_url")
    valid_avatar = (
        icon_url
        and isinstance(icon_url, str)
        and icon_url.startswith(("http://", "https://"))
    )

    for i in range(0, len(content), chunk_size):
        payload = {"content": content[i : i + chunk_size], "username": npc_name}
        if valid_avatar:
            payload["avatar_url"] = icon_url
        await npc_webhook.send(**payload)


async def answer_code_question(channel, question: str):
    eco_code_context = _collect_runtime_source_context()

    help_prompt = f"""
Du bist Economicon, ein Discord-KI-Bot.

Hier ist dein vollstaendiger Code:

{eco_code_context}

Beantworte folgende Frage praezise anhand des Codes.
Wenn etwas nicht existiert, sage es klar.
Erfinde nichts. Lasse auch nichts Wichtiges aus.
Halte deine Nachricht klein und unter 1000 Zeichen.

Frage:
{question}
"""
    response_text = await llm_chat(
        [
            {"role": "system", "content": "Du analysierst Code praezise und sachlich."},
            {"role": "user", "content": help_prompt},
        ],
        user_text=question,
    )
    await channel.send(response_text)


COMMAND_CATALOG = {
    "general": {
        "title": "General",
        "commands": [
            "Eco start",
            "Eco home",
            "Eco help",
            "Eco commands [category]",
            "Eco setting status",
            "Eco setting list",
            "Eco setting set <test|star_wars> (Admin)",
            "Eco language auto|de|en|<code>",
            "Eco codehelp [frage]",
        ],
    },
    "state_maps": {
        "title": "States & Maps",
        "commands": [
            "Eco create_state <name> (Admin)",
            "Eco edit_state <id|name> (Admin)",
            "Eco delete_state <id|name> (Admin)",
            "Eco state_limit_set <2-20> (Admin)",
            "Eco show_map <staat|world>",
            "Eco map_tool",
        ],
    },
    "star_wars_web": {
        "title": "Star Wars Website",
        "commands": [
            "Eco sw status",
            "Eco sw planet <planet> | <republic|separatist|neutral> (Admin)",
            "Eco deploy (Admin)",
            "Eco deploy status",
        ],
    },
    "sw_profiles": {
        "title": "Star Wars Steckbriefe",
        "commands": [
            "Eco steckbrief erstellen",
            "Eco steckbrief bearbeiten <id>",
            "Eco steckbrief liste",
            "Eco einheit erstellen",
            "Eco einheit bearbeiten <id>",
            "Eco einheit liste",
            "Eco flotte erstellen",
            "Eco flotte bearbeiten <id>",
            "Eco flotte liste",
            "Slash: /steckbrief, /einheit, /flotte",
        ],
    },
    "turn": {
        "title": "Turn-System",
        "commands": [
            "Eco turn setup #channel @rolle (Admin, Rolle braucht mind. 2 Personen)",
            "Eco turn status",
            "Eco turn history",
            "Eco turn report <zugnummer>",
            "Eco turn force_end (Admin)",
            "Eco turn disable (Admin)",
        ],
    },
    "econ_core": {
        "title": "Economy Core",
        "commands": [
            "Eco econ setup (Admin)",
            "Eco econ market",
            "Eco econ balance [konto]",
            "Eco econ portfolio [konto]",
            "Eco econ transfer <@user> <amount> [konto]",
            "Eco econ currency_view",
            "Eco econ currency_set <code> <name> <symbol> [emoji] [image_url] (Admin)",
        ],
    },
    "econ_stocks": {
        "title": "Stocks",
        "commands": [
            "Eco econ buy <SYMBOL> <QTY> [konto]",
            "Eco econ sell <SYMBOL> <QTY> [konto]",
            "Eco econ stock_chart <SYMBOL>",
            "Eco econ buy_entity <entity> <SYMBOL> <QTY> [konto]",
            "Eco econ sell_entity <entity> <SYMBOL> <QTY> [konto]",
            "Eco econ stock_create <SYMBOL> <price> <outstanding> [company] (Admin)",
            "Eco econ stock_dividend <SYMBOL> <yield_%> (Admin)",
        ],
    },
    "econ_shop": {
        "title": "Products, Shop & Production",
        "commands": [
            "Eco econ category_list",
            "Eco econ category_add <name> (Admin)",
            "Eco econ products [category]",
            "Eco econ shop [seite] [kategorie]",
            "Eco econ shop_menu [kategorie]",
            "Eco econ shop_search <query>",
            "Eco econ product_view <id>",
            "Eco econ product_create <category> <price> <name...>",
            "Eco econ product_create_admin <category> <price> <name...> (Admin)",
            "Eco econ product_profile_set <id> | <beschreibung>",
            "Eco econ recipe_ai <produkt>",
            "Eco econ recipe_set <produkt> | <output_qty> | <zutat>:<qty>, ...",
            "Eco econ recipe_clear <produkt>",
            "Eco econ produce <produkt> [batches]",
        ],
    },
    "econ_inventory": {
        "title": "Inventory",
        "commands": [
            "Eco econ inventory [entity_id|name]",
            "Eco econ inventory_transfer <product_id> <qty> <@user|entity>",
            "Eco econ product_stock_set <product_id> <qty>",
            "Eco econ inventory_set <entity> | <product_id> | <qty> (Admin)",
        ],
    },
    "econ_contracts": {
        "title": "Contracts, Salary & Loans",
        "commands": [
            "Eco econ contract (Wizard)",
            "Eco econ contract_create @buyer <product_id> <qty> <unit_price> [terms...]",
            "Eco econ contract_sign <contract_id>",
            "Eco econ contracts",
            "Eco econ salary_set @employee <amount>",
            "Eco econ loans mine [konto]",
            "Eco econ loans take <amount> [turns] [konto]",
            "Eco econ loans repay <loan_id> <amount> [konto]",
            "Eco econ loans bank",
        ],
    },
    "econ_states": {
        "title": "State Management",
        "commands": [
            "Eco econ roles entrepreneur @rolle (Admin)",
            "Eco econ roles employer @rolle (Admin)",
            "Eco econ roles state_chief @rolle (Admin)",
            "Eco econ roles judiciary @rolle (Admin)",
            "Eco econ states add|remove|list|check_lore (Admin)",
            "Eco econ tax_set <state> <person_%> <company_%> [npc_%]",
            "Eco econ state_profile_set <state> | <territory> | <city> | <beschreibung> (Admin)",
            "Eco econ success view <state|entity>",
            "Eco econ success set <state|entity> | <feld> | <wert>",
        ],
    },
    "econ_profiles": {
        "title": "Profiles & Forums",
        "commands": [
            "Eco econ profile view <entity_id|name>",
            "Eco econ profile set <entity> | <state> | <territory> | <city> | <beschreibung>",
            "Eco econ profile link_state <entity> <state_entity>",
            "Eco econ company_create <name>",
            "Eco econ company_owner_set <entity_id|name> <@user> (Admin)",
            "Eco econ company_forum_create <entity_id|name> (Admin)",
            "Eco econ company_types",
            "Eco econ company_ops_set <entity> | <stil> | [unterkategorie]",
            "Eco econ insurance types [unterkategorie]",
            "Eco econ insurance mine [entity]",
            "Eco econ insurance buy <entity> <typ>",
            "Eco econ insurance cancel <policy_id>",
        ],
    },
    "econ_laws": {
        "title": "Law Builder",
        "commands": [
            "Eco econ laws start [state]",
            "Eco econ laws view <state>",
            "Eco econ laws categories",
            "Eco econ laws schema",
            "Eco econ laws preset_list",
            "Eco econ laws get|set <state> | <path>",
            "Eco econ laws log <state> [limit]",
        ],
    },
    "freeai": {
        "title": "Free AI",
        "commands": [
            "Eco ai_setup (Admin)",
            "Eco change_ai_provider <ollama|gemini|external> (Admin)",
            "Eco freeai on [#channels...] (Admin)",
            "Eco freeai off [all] (Admin)",
            "Eco freeai status",
            "Eco freeai frequency [#channel]",
            "Eco aiquota",
        ],
    },
}

COMMAND_SECTION_CAPABILITIES = {
    "general": None,
    "state_maps": "states",
    "star_wars_web": "website_sync",
    "sw_profiles": "website_sync",
    "turn": "turn_system",
    "econ_core": "economy",
    "econ_stocks": "economy",
    "econ_shop": "economy",
    "econ_inventory": "economy",
    "econ_contracts": "economy",
    "econ_states": "economy",
    "econ_profiles": "economy",
    "econ_laws": "economy",
    "freeai": "free_ai",
}

COMMAND_CATEGORY_ALIASES = {
    "all": list(COMMAND_CATALOG.keys()),
    "general": ["general"],
    "state": ["state_maps"],
    "map": ["state_maps"],
    "sw": ["star_wars_web", "sw_profiles"],
    "starwars": ["star_wars_web", "sw_profiles"],
    "steckbrief": ["sw_profiles"],
    "profile": ["sw_profiles"],
    "profiles": ["sw_profiles"],
    "einheit": ["sw_profiles"],
    "flotte": ["sw_profiles"],
    "website": ["star_wars_web"],
    "deploy": ["star_wars_web"],
    "turn": ["turn"],
    "economy": ["econ_core", "econ_stocks", "econ_shop", "econ_inventory", "econ_contracts", "econ_states", "econ_profiles"],
    "laws": ["econ_laws"],
    "freeai": ["freeai"],
}


def _setting_supports_command_section(setting_id: Optional[str], section_key: str) -> bool:
    capability = COMMAND_SECTION_CAPABILITIES.get(str(section_key or "").strip())
    if not capability:
        return True
    caps = set(get_setting_definition(setting_id).get("capabilities", set()) or set())
    return capability in caps


def get_available_command_sections_for_setting(
    requested_sections: Optional[list[str]] = None,
    setting_id: Optional[str] = None,
) -> list[str]:
    raw_sections = requested_sections or list(COMMAND_CATALOG.keys())
    out = []
    for key in raw_sections:
        section_key = str(key or "").strip()
        if section_key not in COMMAND_CATALOG:
            continue
        if not _setting_supports_command_section(setting_id or get_active_setting_id(), section_key):
            continue
        out.append(section_key)
    return out


def render_command_catalog(section_keys: list[str], title: str = "Commands", setting_id: Optional[str] = None) -> str:
    active_setting_id = setting_id or get_active_setting_id()
    visible_sections = get_available_command_sections_for_setting(section_keys, active_setting_id)
    lines = [f"**{title}**", f"Setting: {get_setting_label(active_setting_id)}"]
    if not visible_sections:
        lines.append("Keine passenden Commands fuer das aktuelle Setting verfuegbar.")
        return "\n".join(lines)
    for section_key in visible_sections:
        section = COMMAND_CATALOG.get(section_key, {})
        lines.append("")
        lines.append(section.get("title", section_key))
        for command in section.get("commands", []) or []:
            lines.append(f"- {command}")
    return "\n".join(lines)


# === Ende des Maps & Economy Moduls ===
