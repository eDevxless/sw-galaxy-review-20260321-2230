Original prompt: Hallo. Verbessern wir die Mobilversion der Website dieser star wars Galaxy Map.

Performance auf Mobile ist aktuell vor allem durch das Overlay gebremst: `script.js` baut bei jeder OpenSeadragon-Animation das komplette Overlay neu auf.
Die Kalibrierungsdaten fuer `rim_curves.json` und `grid_guides.json` werden im Viewer derzeit noch gar nicht gerendert.
`calibrated_planets.json` enthaelt ueber 2000 Eintraege; dafuer sind tausende interaktive DOM-Pins auf Mobile zu teuer.

Erledigt:
- Statische SVG-Layer fuer `rim_curves.json`, `grid_guides.json`, `grid_markers.json` und die Planetenpunkte in `script.js` integriert.
- Overlay in statischen Datenlayer + schlanken dynamischen Auswahl/Grid-Layer aufgeteilt.
- Mobile-Zoomlast in OpenSeadragon reduziert (`maxZoomPixelRatio`, sanftere Animation) und Overlay-Rebuilds waehrend Animationen stark reduziert.
- Direkte Punktauswahl ueber Viewer-Tap/Klick eingebaut, damit keine tausenden interaktiven DOM-Pins mehr noetig sind.
- `Republik Fraktion` wurde aus `rim_curves.json` entfernt und wird zusaetzlich im Viewer nicht mehr uebernommen.
- Grid-Marker wie `Ecke B20 ...` werden in der Ansicht nicht mehr gerendert.
- Desktop-Hover auf Planetenpunkten eingebaut: Punkt unter der Maus wird sichtbar vergroessert, Auswahl per Klick bleibt aktiv.
- Mobile rendert Punkte/Vektoren/Grid jetzt ueber einen Screen-Canvas statt ueber den grossen transformierten SVG-Layer; das adressiert das Verschwinden in Nahansicht.
- Viewer- und Mobile-Hintergrund auf Schwarz gesetzt, damit ausserhalb der Kartenflaeche kein heller/farbiger Ursprungshintergrund sichtbar bleibt.
- Grid-Koordinatenlabels (Buchstaben/Zahlen) wie im Kalibrator in die Website uebernommen.
- Planetennamen werden jetzt als Datenlabels neben den gelben Punkten gerendert.
- OpenSeadragon nutzt jetzt eine leere datenbasierte Kartenflaeche statt `image.jpg`; die Website braucht fuer die Ansicht kein PNG/JPG mehr.
- Review-/Kalibrierungs-Buttons und Import-/Export-Oberflaeche wurden aus der Website entfernt; die Ansicht ist jetzt klar als Visualisierung aufgeraumt.
- Planetennamen werden jetzt stufenweise und kollisionsarm eingeblendet: weit draussen nur `Coruscant`, spaeter erst die sichtbaren Planeten.
- Desktop-Hover zeigt jetzt nicht nur die vergroesserte Markierung, sondern auch direkt den Planetennamen am Punkt.
- Grid-Fokus, Grid-Boxen und Grid-Zuordnung orientieren sich jetzt an den kalibrierten `grid_guides.json`-Abstaenden statt an einer simplen Vollbild-Unterteilung.

Verifikation:
- JS-Syntax mit `new Function(fs.readFileSync('script.js'))` geprueft: OK.
- Visueller Browserlauf war in dieser Shell-Umgebung nur eingeschraenkt moeglich:
  - der vorhandene Playwright-Client konnte lokal nicht gegen `playwright` aufgeloest werden,
  - lokale Headless-Edge-Screenshots wurden von der Umgebung blockiert.

Restcheck fuer den naechsten Lauf:
- Mobile-Ansicht im echten Browser oeffnen und pruefen, ob Rims, Grid-Guides und gelbe Planetenpunkte auf Anhieb sichtbar sind.
- Bei Bedarf Feintuning fuer Punktgroessen/Guide-Staerke je Zoomstufe machen.
