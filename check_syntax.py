import ast
import sys

try:
    with open('Administration/app_modules/02_maps_economy_and_misc.py', encoding='utf-8') as f:
        ast.parse(f.read())
    print("Syntax OK")
except SyntaxError as e:
    print(f"Syntax Error: {e}")
    sys.exit(1)

