# Suite: Navigation, Begleiter und durchgängige Abläufe

Stand: 19.10.2026. Lokale Funktionsabnahme und visuelle Bestätigung abgeschlossen. Die Veröffentlichung wird getrennt am tatsächlichen Vercel-Commit kontrolliert.

## Änderungen

- Ein einzelner Assistentenbutton unten rechts öffnet die seitenbezogene Hilfe und den Chat. Er folgt dem Studio in das native oder vergrößerte Vollbild. Feedback befindet sich im Fuß der linken Navigation und mobil in der unteren Navigation.
- Die linke Navigation lässt sich auf 76 px einklappen. Die Einstellung gilt pro Person und Gerät. Symbole behalten ihre zugänglichen Namen; Hinweise erscheinen bei Zeigerkontakt und Tastaturfokus. Die mobile Navigation bleibt eine eigenständige Schublade mit begrenztem Fokus und Escape-Rückkehr.
- Eine statische, sparsame Akzentaufhellung verleiht dem Arbeitsraum Tiefe. Bestehende sechs Farbfamilien, Hell/Dunkel/System, technische Zeichenfarben und Dokumentfarben bleiben erhalten.
- Auftragsakten führen zu tatsächlich gefilterten Planungen, Einsätzen, Bestellungen und Rechnungen. Neue Formulare übernehmen passende vorhandene Beziehungen, öffnen einmal und speichern erst nach ausdrücklicher Bestätigung. Nicht geladene Unterlagen werden nicht als belegte Leere ausgegeben.
- Das Studio erhält Auftragsbezüge bei Suche, Blättern und Rückkehr. Vor dem Verlassen mit offenen Änderungen stehen Weiterarbeiten, bestätigtes Speichern und bewusstes Verlassen zur Wahl. Fehler und Konflikte halten den Entwurf offen. Lokale Sicherungen werden als Sitzungssicherungen bezeichnet.
- Abhängige Elemente nennen ihr Bezugsbauteil. Eine passende Auswahl oder ein einziges verfügbares Ziel kann vorgeschlagen werden; mehrere Ziele benötigen eine bewusste Entscheidung. Fehlende Voraussetzungen lassen sich direkt anlegen, ohne bereits eingegebenen Inschrifttext zu verlieren.
- Ein Kalendertag führt zu einem bearbeitbaren Einsatzvorschlag 08:00–09:00. Datumsfeld, Tagesliste und Vorschlag verwenden dieselbe Auswahl; Mitarbeiterfilter erhalten sie.

## Nachgewiesene Prüfungen

| Prüfung | Aktueller Nachweis |
|---|---|
| Fachliche und Hilfsfunktionen | 331 Tests in 55 Dateien bestanden; auf dem zeitweise langsamen Windows-Host mit 30 s Einzelzeitlimit, unveränderte fachliche Assertions |
| PostgreSQL | 39 Integrationsprüfungen bestanden, einschließlich RLS, Versionskonflikten, Nummernvergabe, Feedback, persönlicher Darstellung, Auftragsfilterung und älteren Referenzen |
| Typen und Svelte | Vollständiger Durchlauf auch nach allen drei Abnahmekorrekturen bestanden: 0 Fehler, 0 Warnungen |
| Produktionsbuild | Vollständiger Build nach allen drei Abnahmekorrekturen bestanden |
| Quellprüfung | Zugangsdatenprüfung für 604 Repository-Dateien bestanden |
| Breite visuelle Prüfung | Zunächst 42 gültige Zustände über zehn Module sowie zwei ergänzende Zustände; abschließend 33 gültige Zustände einschließlich Tablet 768×1024, Formularen, kompaktem Menü und nativem Studio-Vollbild |
| Browserabläufe | Vollständiger Lauf mit 35 Szenarien: 32 bestanden, drei gezielt behandelt. Anschließend sämtliche acht betroffenen Studio-/Suite-Szenarien bestanden, einschließlich der drei zuvor offenen Fälle |
| Planungs-PDFs | Aktuelle repräsentative Grabmal- und Raumplanung mit je fünf Seiten sowie UAT-Exporte mit sieben bzw. acht Seiten tatsächlich erzeugt; Ansichten gerendert und visuell geprüft |
| Unabhängige UX-Bewertung | Freigabe zur Veröffentlichung: PASS, 8/12 Punkte, alle vier Kriterien 2/3. Keine offenen materiellen UX-Korrekturen; alle drei Funktionsfunde bestätigt behoben |
| Produktionsschema | 42 Migrationen mit Prüfsummen über die schreibgeschützte Backup-Rolle bestätigt |

Die neue PostgreSQL-Abnahme prüft ausdrücklich 31 passende ältere Planungen zwischen 60 neueren fremden Planungen, eine Referenz jenseits der ersten 40 Aufträge, gebundene Zeitstempel beim Weiterblättern sowie fremde Mandanten und Rechtsträger. Die Studioübersicht bleibt bei ihren bestehenden zwei Leseabfragen. Das Einklappen der Navigation verursacht keine API-Anfragen.

## Gefundene und behandelte Abweichungen

1. **Assistentenfokus – behoben:** Nach dem Schließen blieb der Fokus auf BODY. Zweimal über die sichtbare Oberfläche und anschließend automatisch reproduziert. Die Reparatur berücksichtigt das neu erzeugte Bedienelement, echte frühere Auslöser und andere inzwischen geöffnete Dialoge. Am neuen Build auf Desktop, Mobil und im Studio-Vollbild bestätigt.
2. **Kalendertag – behoben:** Ein explizites Datum konnte den 23. zeigen, während Tagesliste und Anlagevorschlag den heutigen 19. verwendeten. Die Auswahl ist nun an den angezeigten Datumsbezug gebunden. Die erfolgreiche Wiederholung prüft zusätzlich die Auswahl des 24., den Mitarbeiterfilter und die unverändert bearbeitbaren Zeitvorschläge ohne Speicherung.
3. **Direkter Formularstart – behoben:** Ein reaktiver Effekt las und schrieb beim Entfernen von `create=1` dieselbe Zustandsabhängigkeit. Im installierten SvelteKit 3.1 ändert die flache URL-Ersetzung `page.state` und `page.shallow`, während `page.url` die Daten-URL bleibt. Das konnte den Renderer blockieren. Der Formularstart erfolgt jetzt einmal nach abgeschlossener Navigation ohne reaktive Rückkopplung. Bestätigt sind gültiger Bezug, Abbrechen, Neuladen ohne Wiederöffnung, späterer erneuter Aufruf desselben Links, unbekannter Bezug und null Geschäfts-Schreibvorgänge.
4. **Prüfaufbau:** Veraltete Erwartungen an den früher schwebenden Feedbackbutton und mehrdeutige Nummer-/Namenslinks wurden korrigiert. Auswahlfelder werden über ihren tatsächlichen zugänglichen Combobox-Namen angesprochen. Die PDF-Prüfung beobachtet die vom Server bestätigte finale Geometrie, statt mit einem bereits erfolgreich abgeschlossenen Autosave um den Speicherbutton zu konkurrieren. PDF-Antworten haben ein ausdrückliches 60-s-Fenster; der zusammengesetzte Acht-Seiten-WCAG-Test ein Gesamtfenster von 240 s. Keine fachliche oder Accessibility-Assertion wurde entfernt.
5. **Visuelle Vorbereitung:** Bei einer fokussierten kompakten Navigation öffnet der Wechsel zu Mobil die Schublade zur Fokuserhaltung. Die Prüfung berücksichtigt diesen gültigen Ausgangszustand. Eine unmittelbare Kontrastmessung während des Themenwechsels erfasste noch die auslaufende helle Navigationsschrift auf dunklem Hintergrund. Die Fortsetzung wartet endliche CSS-Übergänge ab: gemessen wurden zunächst `rgb(93,106,124)` und anschließend korrekt `rgb(184,198,217)`. Danach bestehen unveränderte Kontrastprüfungen des Studios, Vollbilds und Tablets. Die 27 zuvor gültigen Zustände und sechs abschließenden Zustände bilden zusammen die finale Bestätigung; die Zwischenaufnahme zählt nicht als gültiger Zustand.

Die visuelle Bestätigung änderte keine Geschäftsdaten oder persönlichen Servereinstellungen, startete keine KI-Anfragen und meldete keine JavaScript-Fehler. Die Aufnahme im Studio nutzte nachweislich natives Vollbild. Die Texteingabe bleibt beim Abbruch einer vorgeschalteten Steinanlage erhalten; bei mehreren Steinen wird das ausdrücklich gewählte Ziel auch nach erneutem Laden bestätigt.

## Kosten und Produktionsdaten

Migration 0042 ergänzt zwei Indizes für mandantenbezogenes Weiterblättern und den Auftragsfilter. Die Migration wurde zunächst lokal und dann auf dem bereits bestehenden Produktionszweig angewendet. Anschließend wurden sämtliche 42 Prüfsummen mit einer schreibgeschützten Rolle bestätigt. Neon bleibt auf dem bestehenden Free-Tarif. Eine kurzzeitig benötigte, separat benannte Integrationsverbindung wurde wieder entfernt; die ursprünglichen IDs der Projektumgebungsvariablen blieben erhalten. Die temporäre lokale Zugangsdaten-Datei für diese Migration wurde nach der Verifikation gelöscht.

Die zusätzliche Hintergrundtiefe benötigt keine neuen Dienste, Hintergrundabfragen, Bilderzeugung oder Animation. Die Prüfungen verwenden synthetische lokale Konten und Daten. Modellaufrufe werden in Browserprüfungen abgefangen; für die visuelle Prüfung wurden keine KI-Aufträge gestartet. Die vorhandenen Beispieldaten auf der veröffentlichten Anwendung bleiben erhalten.

## Veröffentlichung und Abnahmegrenze

Für die Veröffentlichung werden der genaue geprüfte Quellstand, der erfolgreiche CI-Lauf und der aktive Vercel-Commit abgeglichen. Erreichbare Live-Seiten werden ohne Geschäftsdatenänderungen kontrolliert.

Die Live-Browserabnahme des Studios ist durch die zuvor nachgewiesene Microsoft-Organisationssperre dieses Rechners begrenzt. Diese Schutzvorgabe wird nicht umgangen. Die vollständigen Studioabläufe wurden am lokal ausgeführten Produktionsbuild geprüft. Automatische und visuelle Abnahme ersetzen keine spätere Erprobung durch die Mitarbeiter mit ihren tatsächlichen Baustellengeräten und Fachfreigaben.
