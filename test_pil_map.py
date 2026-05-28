#!/usr/bin/env python3
"""Quick test for the runtime SVG-to-PNG map conversion path."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
os.environ.setdefault("BOT_TOKEN", "test")

try:
    from PIL import Image  # noqa: F401
    print("PIL available - OK")
except ImportError:
    print("PIL not available - Install pillow!")
    sys.exit(1)

try:
    import Administration.main as runtime
    print("Runtime import - OK")
except Exception as exc:
    print(f"Runtime import failed: {exc}")
    sys.exit(1)

test_svg = """<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>
<rect width='200' height='100' fill='#9dd6ff'/>
<rect x='10' y='10' width='50' height='30' fill='#f87171'/>
<text x='100' y='50' font-size='14'>Test</text>
</svg>"""

print("Testing SVG to PNG conversion...")
result = runtime._svg_to_png_bytes(test_svg, scale=2.0)
if not result:
    print("FAILED: Could not create PNG")
    sys.exit(1)

print(f"SUCCESS: PNG created ({len(result)} bytes)")
with open("test_map.png", "wb") as f:
    f.write(result)
print("Saved as test_map.png")

payload = runtime._build_map_message_payload("Testkarte", test_svg, "test_map.svg")
file_name = payload["file"].filename
print(f"Attachment filename: {file_name}")
if not file_name.lower().endswith(".png"):
    print("FAILED: Discord payload is not using PNG")
    sys.exit(1)

if "embed" not in payload:
    print("FAILED: Discord payload has no image embed")
    sys.exit(1)

print("\nRuntime SVG conversion is working!")
