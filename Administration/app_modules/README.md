# Runtime Module Layout

`Administration/main.py` loads all `*.py` files in this folder with a numeric prefix:

- `00_*.py`
- `01_*.py`
- `02_*.py`
- ...

Rules:

1. Keep load order explicit via the numeric prefix.
2. Put shared constants/state setup in early modules (`00_*`).
3. Put UI/events/commands in later modules, after all helper functions exist.
4. If you split further, create a new numbered file instead of growing an existing file indefinitely.

This preserves existing runtime behavior while keeping the codebase hostable and maintainable.

Storage layout (lokal):

- `Administration/data/global`: globaler Scope + Legacy-Fallback
- `Administration/data/guilds/<guild_id>`: serverbezogene Runtime-Daten
- `.../economy/transactions/*.jsonl`: append-only Transaktionslogs (Monatsdateien)

Current split:

- `00_bootstrap_and_core.py`: bootstrap, constants, JSON/state setup, base helpers
- `01_law_and_contracts.py`: law logic, contract engine, evaluations
- `02_maps_economy_and_misc.py`: maps, economy helpers, command catalogs, routing helpers
- `03_ui_views.py`: Discord UI views/modals/selects and interaction menu handling
- `04_events_and_turn.py`: bot events and turn-system commands
- `05_econ_laws_and_state.py`: econ core groups, state/law wizard, law commands
- `06_econ_market_and_profiles.py`: company/profile/shop/market/contract/stock/currency commands
- `07_freeai_npc_lore_and_errors.py`: freeai, npc/lore commands, global command error handler
- `08_state_strategy_core.py`: NPC-Staaten Strategiekern (Krieg/Handel/Diplomatie/Intrige), Strategie-Status/Control Commands
- `09_storage_admin.py`: Storage-Status/Migration, Datenlayout fuer lokale Multi-Server-Struktur
- `10_star_wars_website_bridge.py`: Legacy-Sync fuer Star-Wars-Website-Fraktionszuordnungen
- `11_sw_steckbrief_wizard.py`: Star-Wars-Steckbrief-Wizards fuer Charaktere, Einheiten und Flotten
