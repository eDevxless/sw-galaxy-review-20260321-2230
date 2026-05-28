from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).parent
CALIBRATED_PATH = ROOT / "calibrated_planets.json"
PLANETS_PY_PATH = ROOT / "planets.py"
PLANETS_JS_PATH = ROOT / "planets.js"

PY_LINE_RE = re.compile(
    r'^(?P<prefix>\s*\{"name":\s*"(?P<name>[^"]+)",\s*"grid":\s*")'
    r'(?P<grid>[^"]*)'
    r'(?P<mid1>",\s*"x":\s*)(?P<x>-?\d+(?:\.\d+)?)'
    r'(?P<mid2>,\s*"y":\s*)(?P<y>-?\d+(?:\.\d+)?)'
    r'(?P<mid3>,\s*"region":\s*")(?P<region>[^"]*)'
    r'(?P<suffix>".*)$'
)

JS_LINE_RE = re.compile(
    r'^(?P<prefix>\s*\{\s*name:\s*"(?P<name>[^"]+)",\s*grid:\s*")'
    r'(?P<grid>[^"]*)'
    r'(?P<mid1>",\s*x:\s*)(?P<x>-?\d+(?:\.\d+)?)'
    r'(?P<mid2>,\s*y:\s*)(?P<y>-?\d+(?:\.\d+)?)'
    r'(?P<mid3>,\s*region:\s*")(?P<region>[^"]*)'
    r'(?P<suffix>".*)$'
)


def normalize_name_key(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def format_number(value: float) -> str:
    return f"{float(value):.4f}".rstrip("0").rstrip(".")


def load_calibrated() -> dict[str, dict]:
    payload = json.loads(CALIBRATED_PATH.read_text(encoding="utf-8"))
    return {
        normalize_name_key(name): {"name": name, **data}
        for name, data in payload.items()
    }


def synced_grid(existing: str, data: dict) -> str:
    candidate = str(data.get("grid", "")).strip()
    return candidate if candidate and candidate != "?" else existing


def synced_region(existing: str, data: dict) -> str:
    candidate = str(data.get("region", "")).strip()
    return candidate if candidate and candidate != "?" else existing


def sync_file(
    path: Path,
    line_re: re.Pattern[str],
    calibrated_by_key: dict[str, dict],
    write: bool,
) -> dict:
    original_lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    updated_lines: list[str] = []
    matched_names: list[str] = []
    changed = 0

    for line in original_lines:
        stripped = line.rstrip("\r\n")
        newline = line[len(stripped):]
        match = line_re.match(stripped)
        if not match:
            updated_lines.append(line)
            continue

        name = match.group("name")
        data = calibrated_by_key.get(normalize_name_key(name))
        if not data:
            updated_lines.append(line)
            continue

        matched_names.append(name)
        new_line = (
            f"{match.group('prefix')}{synced_grid(match.group('grid'), data)}"
            f"{match.group('mid1')}{format_number(data['x'])}"
            f"{match.group('mid2')}{format_number(data['y'])}"
            f"{match.group('mid3')}{synced_region(match.group('region'), data)}"
            f"{match.group('suffix')}{newline}"
        )
        if new_line != line:
            changed += 1
        updated_lines.append(new_line)

    if write and changed:
        path.write_text("".join(updated_lines), encoding="utf-8")

    return {
        "path": str(path),
        "matched": len(matched_names),
        "changed": changed,
        "matched_names": matched_names,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Synchronisiert calibrated_planets.json nach planets.py und planets.js."
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Dateien wirklich aktualisieren. Ohne Flag nur Dry-Run.",
    )
    args = parser.parse_args()

    calibrated_by_key = load_calibrated()
    py_result = sync_file(PLANETS_PY_PATH, PY_LINE_RE, calibrated_by_key, args.write)
    js_result = sync_file(PLANETS_JS_PATH, JS_LINE_RE, calibrated_by_key, args.write)

    matched_keys = {
        normalize_name_key(name)
        for name in py_result["matched_names"] + js_result["matched_names"]
    }
    unmatched = sorted(
        data["name"]
        for key, data in calibrated_by_key.items()
        if key not in matched_keys
    )

    print(
        json.dumps(
            {
                "mode": "write" if args.write else "dry-run",
                "python": {
                    "path": py_result["path"],
                    "matched": py_result["matched"],
                    "changed": py_result["changed"],
                },
                "javascript": {
                    "path": js_result["path"],
                    "matched": js_result["matched"],
                    "changed": js_result["changed"],
                },
                "unmatched_calibrated_count": len(unmatched),
                "unmatched_calibrated_preview": unmatched[:20],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
