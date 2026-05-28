"""Extrahiert Underworld-Faktions-Zuordnungen aus einer farbig markierten Map.

Vorgehensweise:
- Liest die markierte Map (PNG/JPG) ein.
- Geht alle Planeten aus calibrated_planets.json durch.
- Sampled fuer jeden Planeten ein kleines Pixelfenster an seiner Position.
- Klassifiziert die Farbe als 'blacksun' (rot), 'hutt' (gelb), 'pyke' (gruen)
  oder 'ohnaka' (lila/violett). Ungefaerbte Planeten werden uebersprungen.
- Schreibt das Ergebnis in underworld_factions.json (merged mit bestehenden
  manuellen Eintraegen — manuelle Eintraege gewinnen).

Aufruf:
  python scripts/extract-underworld-from-map.py path/to/map_image.png

Standard-Bildname: assets/underworld-source.png
"""

import json
import os
import sys
from collections import Counter

try:
    from PIL import Image
except ImportError:
    print("Bitte 'pip install pillow' ausfuehren.", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MAP_PATH = os.path.join(ROOT, "assets", "underworld-source.png")
CALIBRATED_PATH = os.path.join(ROOT, "calibrated_planets.json")
OUTPUT_PATH = os.path.join(ROOT, "underworld_factions.json")
SAMPLE_RADIUS = 4  # +/- Pixel um den Planeten herum
MIN_VOTES = 3      # Mindestanzahl gefaerbter Pixel in der Sample-Region


def classify(rgb):
    r, g, b = rgb[:3]
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    if max_c < 70:
        return None  # zu dunkel
    sat = (max_c - min_c) / max(1, max_c)
    if sat < 0.35:
        return None  # zu wenig Saettigung (grauer Hintergrund / weisses Label)

    # Yellow: r und g hoch, b niedrig
    if r > 180 and g > 130 and b < 110:
        return "hutt"
    # Pure red: r dominiert, g und b niedrig
    if r > 150 and g < 90 and b < 90:
        return "blacksun"
    # Green: g dominiert deutlich
    if g > r + 30 and g > b + 30 and g > 120:
        return "pyke"
    # Purple/violet: r und b hoch, g mittel oder niedrig
    if r > 110 and b > 130 and g < r * 0.85 and b > g + 30:
        return "ohnaka"
    return None


def main():
    map_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MAP_PATH
    if not os.path.exists(map_path):
        print(f"Map-Bild nicht gefunden: {map_path}", file=sys.stderr)
        print("Speichere die markierte Karte als 'assets/underworld-source.png' oder gib den Pfad als Argument.", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(CALIBRATED_PATH):
        print(f"calibrated_planets.json nicht gefunden: {CALIBRATED_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(CALIBRATED_PATH, "r", encoding="utf-8") as f:
        planets = json.load(f)

    img = Image.open(map_path).convert("RGB")
    W, H = img.size
    print(f"Map geladen: {W} x {H}")

    pixels = img.load()
    detected = {}
    counts = Counter()
    for name, info in planets.items():
        if not isinstance(info, dict):
            continue
        if "x" not in info or "y" not in info:
            continue
        try:
            px = int(round(float(info["x"]) * W))
            py = int(round(float(info["y"]) * H))
        except (TypeError, ValueError):
            continue
        votes = Counter()
        for dy in range(-SAMPLE_RADIUS, SAMPLE_RADIUS + 1):
            for dx in range(-SAMPLE_RADIUS, SAMPLE_RADIUS + 1):
                xx, yy = px + dx, py + dy
                if 0 <= xx < W and 0 <= yy < H:
                    cls = classify(pixels[xx, yy])
                    if cls:
                        votes[cls] += 1
        if votes:
            top, top_votes = votes.most_common(1)[0]
            if top_votes >= MIN_VOTES:
                detected[name] = top
                counts[top] += 1

    # Merge mit bestehender JSON: manuelle Eintraege bleiben erhalten,
    # neu detektierte werden nur fuer Pyke/Hondo zugefuegt (Black Sun + Hutt sind
    # bereits manuell gepflegt).
    existing = {"meta": {}, "factions": {}}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except json.JSONDecodeError:
            print("Warnung: bestehende underworld_factions.json war ungueltig, wird neu geschrieben.", file=sys.stderr)

    merged = dict(existing.get("factions", {}))
    added = Counter()
    for name, faction in detected.items():
        if name in merged:
            continue  # manueller Eintrag bleibt
        merged[name] = faction
        added[faction] += 1

    output = {
        "meta": {
            **existing.get("meta", {}),
            "description": "Underworld-Fraktionen fuer den 'Underworld'-Ansicht-Modus.",
            "factions_supported": ["blacksun", "hutt", "pyke", "ohnaka"],
            "auto_extracted_from": os.path.basename(map_path),
        },
        "factions": dict(sorted(merged.items())),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print()
    print(f"Detektiert (alle Farben): {sum(counts.values())} Planeten")
    for fac, n in counts.most_common():
        print(f"  {fac:10s}: {n}")
    print()
    print(f"Neu hinzugefuegt (nicht-doppelt): {sum(added.values())} Planeten")
    for fac, n in added.most_common():
        print(f"  {fac:10s}: +{n}")
    print()
    print(f"Insgesamt in underworld_factions.json: {len(merged)} Eintraege")
    print(f"Geschrieben: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
