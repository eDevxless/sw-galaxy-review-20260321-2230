# Steckbrief Discordbot

Dieser Ordner startet jetzt einen schlanken Discordbot fuer Star-Wars-Steckbriefe.

## Start

```powershell
pip install -r requirements.txt
python main.py
```

Der Bot liest `BOT_TOKEN` aus `Administration/.env`.

Optional:

```env
BOT_TOKEN=...
DISCORD_GUILD_ID=...
COMMAND_PREFIX=Eco 
```

## Befehle

- `/steckbrief erstellen`, `/steckbrief bearbeiten`, `/steckbrief liste`
- `/einheit erstellen`, `/einheit bearbeiten`, `/einheit liste`
- `/flotte erstellen`, `/flotte bearbeiten`, `/flotte liste`

Prefix-Varianten funktionieren ebenfalls, zum Beispiel:

- `Eco steckbrief erstellen`
- `Eco einheit erstellen`
- `Eco flotte erstellen`

## Speicherung

Alle Wizard-Schritte werden sofort in `data/steckbrief_bot.sqlite3` gespeichert.
Lange Texte und Uploads werden ueber normale Discord-Nachrichten gesammelt.
