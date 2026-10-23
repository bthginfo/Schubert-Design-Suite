# KI-Interaktion und Bedienbarkeit – 23.10.2026

Die neun Prinzipien aus dem vom Nutzer bereitgestellten Konferenzfoto wurden auf beide Planungsstudios, den Begleiter und die Entwurfsprüfung im Büro angewendet. Der Schwerpunkt liegt auf verständlichem Auftrag, sichtbaren Auswirkungen und sicherer Korrektur. Die bestehende Herstellerbibliothek und ihre delegierbaren Rechte bleiben Teil des vollständigen Abnahmeumfangs.

## Prinzipien und konkrete Umsetzung

| Prinzip | Umsetzung | Prüfnachweis |
|---|---|---|
| Mixed-initiative clarification | Rückfragen bleiben auch ohne Änderungsvorschlag erhalten. Einzelne Antworten oder „Noch nicht bekannt“ werden als bearbeitbare Nachricht vorbereitet. | Browser: strukturierte Rückfragen im Studio und Büro; Kontext-Integration |
| Recognition over recall | Der Begleiter zeigt Schritt, aktuelle Auswahl und Bearbeitungsgrenzen. Annahmen lassen sich mit ihrem konkreten Wortlaut zur Korrektur übernehmen. | Rollenabläufe, Tastaturfokus, sichtbare Kontextbindung |
| Blast-radius preview | Zwei Modellansichten im gleichen Ausschnitt; Liste der betroffenen Bauteile, alten/neuen Maßwerte, Maßbezüge, Schriftwahl und exakten Inschriftzeichen. | Vorschau-Unit-Tests; echte Vorschlagsübernahme im Browser |
| Situational awareness | Speichern/Prüfen, KI-Anfrage, Übernahme und Rückgängig besitzen getrennte Zustände. Veraltete Antworten werden gekennzeichnet und gesperrt. | Speicherfehler, geänderter Plan während einer Anfrage, Versionskonflikt |
| Semantic chunking | Antwort, Rückfragen, Annahmen, Planbezug und Änderungsliste besitzen eigene verständliche Bereiche. Formatierungsleerraum vergrößert Nachrichten nicht künstlich. | Visuelle Prüfung; gemeinsame Antwortkomponente im Begleiter und Büro |
| Progressive disclosure | Quellen, Modelle, Grenzen und technische Details sind aufklappbar. Bezugsknoten und Bemaßungsobjekte dominieren die Elementliste nicht. | Beide Studios; Suche und Hilfselement-Schalter; Mobilansichten |
| Calibrated trust | Annahmen bleiben ausdrücklich unbestätigt. Planmaße werden nicht als Aufmaß ausgegeben. Ein Abbruch verspricht keine kostenlose Verarbeitung. | Deterministische Geometrieprüfung, Servergrenzen, Budgetzustände |
| Steering at the right altitude | „Nur Auswahl bearbeiten“, „Maßwerte beibehalten“, „Wortlaut beibehalten“. Der Server prüft auch gemeinsame Maße und indirekt betroffene Wandnachbarn. | Unit- und PostgreSQL-Prüfungen; tatsächlicher Requestumfang im Browser |
| Progressive reduction | Persönlich wählbare Kurzhilfe; fachliche Bauteile zuerst. Alle Funktionen bleiben zugänglich. | Gespeicherte Gerätepräferenz, Elementliste, Hell/Dunkel |

## Fachliche und technische Prüfung

Ein Steinmetz kann Namen und Daten zeichengetreu prüfen, den Änderungsvorschlag bewusst übernehmen und ihn entweder direkt oder über die normale Studiohistorie zurücknehmen. Ein Erstentwurf aus mehreren abhängigen Raumobjekten erhält ebenfalls eine sichere Gegenoperation. Rückgängig erzeugt neue Revisionen; bestätigte alte Stände werden nicht ersetzt. Nach späterer Bearbeitung blockiert das direkte Rückgängig und verweist auf Studiohistorie und Stände. Eine wiederholte Vorschlagsübernahme verwendet denselben Befehlsbeleg und erzeugt keine doppelte Änderung.

Bei älteren Inschriften ohne ausdrücklich gespeicherte Entwurfsschrift oder Farbe stellt Rückgängig die ursprüngliche sichtbare Darstellung wieder her. Renderer und Gegenoperation nutzen dieselben Standardwerte. Änderungsoperationen auf vorhandenen Planungen dürfen keine unbekannten Bauteil-, Maß- oder Schriftmaßreferenzen erfinden; solche Vorschläge werden vor der Übernahme verworfen.

Die Verwaltungskraft ergänzt Rückfragen zur Prüfung ihres tatsächlich sichtbaren Formularentwurfs. Ergänzungen ändern keine Felder automatisch. Eine erneute Prüfung erhält die aktuellen Werte und Positionen; interne Einzelkosten und fremde Akten bleiben ausgeschlossen. Ein Abbruch erhält Formularwerte und Ergänzung. Die mobilen Abschlussaktionen besitzen ausreichend Breite und umbrechen als vollständige Aktionen.

Die Gestaltungsprüfung betrachtet Informationshierarchie, deutsche Begriffe und Einheiten, konsistente Flächen-, Text- und Statusfarben, Tastaturfokus, kleinere Displays und reduzierte Bewegung. Einstellungen liegen im Eingabebereich statt in einem zusätzlich scrollenden Kopfbereich. Senden und Abbrechen bleiben erreichbar. Neue Antworten beginnen bei ihrer Erklärung; beim Lesen früherer Nachrichten wird die Ansicht nicht zwangsweise verschoben. Vergleichszeichnungen behalten ihr fachliches helles Papier und stellen Ausschnitte auch bei dunkler Oberfläche dar.

Die Leseposition bleibt beim Wechsel zwischen Hilfe und Chat erhalten. Escape schließt ausschließlich den Begleiter und hebt die Bauteilauswahl im Studio nicht auf. Die Vorschau vergleicht zusätzlich die tatsächlichen Modellprojektionen: Durch verschobene Knoten veränderte Wandanschlüsse und Raumkonturen sowie mitbewegte Inschriften werden auch dann aufgeführt, wenn ihr eigener Datensatz unverändert bleibt.

Die Serverprüfung verwendet den vollständigen gespeicherten Plan. Die Kürzung des Modellkontexts kann daher keine außerhalb der Auswahl liegende Änderung verbergen. PostgreSQL-JSONB-Schlüsselreihenfolgen werden vor dem Vergleich normalisiert. Die Grenzen werden bei der Vorschlagserstellung und erneut bei der Übernahme geprüft. Für diese Erweiterung sind keine Schemaänderungen erforderlich.

## Grenzen des Nachweises

Die Rollenabläufe verwenden echte persönliche Testanmeldungen, API-Befehle, Versionen und PostgreSQL. Die neuen KI-Antworten werden ausdrücklich am Modelltransport simuliert; die Übernahme und das Rückgängig der Vorschläge sind echte fachliche Befehle. Damit werden weder Qualität noch Verbrauch neuer kostenpflichtiger Anbieterantworten behauptet. Quellenrechte, Quarantäne, Studiozuordnung und delegierte Bibliotheksrechte werden separat gegen die Datenbank geprüft.

Die rollenbasierte und heuristische Prüfung ersetzt keine spätere Beobachtung tatsächlicher Mitarbeiter bei ihrer täglichen Arbeit. Bestehende fachliche Regeln zu Achsflächen, Aufmaß, geschützten Inschriften und Fertigungsfreigabe wurden nicht geändert. Testdaten werden auf ausdrücklichen Nutzerwunsch nicht bereinigt.

## Abschlussnachweis

Alle **358 Unit-Tests** in 58 Dateien und **47 PostgreSQL-Integrationsprüfungen** bestehen. Die Svelte-/TypeScript-Prüfung meldet **0 Fehler und 0 Warnungen**. Der Produktionsbuild ist erfolgreich. Quelltextprüfung auf Zugangsdaten und Anforderungsmatrix sind erfolgreich; die Matrix ordnet weiterhin 154 Fachabschnitte und 69 Szenarien zu und behauptet keine externe Abnahme.

Im gemeinsamen Browserlauf bestehen **alle 53 Fälle**. Enthalten sind die sechs neuen KI-/Gestaltungsabläufe und die bisherigen Studio-, Büro-, Hersteller-, Rechte-, Such-, Einführungs-, Offline-, Kalender-, Darstellungs- und PDF-Abläufe. Die neuen Fälle prüfen ausdrücklich auch ungeordnete Folgeantworten nach Abbruch, echte Vorschlagsübernahme, direktes und normales Rückgängig, spätere Bearbeitung, 320/375-Pixel-Ansichten, gespeicherte dunkle Darstellung, reduzierte Bewegung, Leseposition und Escape. Unbehandelte Browserfehler werden in diesen Fällen zusätzlich geprüft.

Die helle Vergleichsvorschau wurde zusätzlich mit echter persönlicher Darstellungswahl und einem gespeicherten synthetischen Vorschlag geprüft: keine unbehandelten Browserfehler und keine automatisierten WCAG-A/AA-Funde. Die vorherige Darstellungswahl wurde anschließend wiederhergestellt. [Zusammengefasste Prüfergebnisse](agentic-interaction-evidence/verification.json).

Zwei ältere Browserfälle bekamen explizite eigene Voraussetzungen: Modellverfügbarkeit nur für klar simulierte Transporte und den Testbetrieb-Hinweis im isolierten lokalen Testmandanten. Dadurch hängen diese Prüfungen nicht mehr von einer liegengebliebenen Konfiguration ab. Temporär gesetzte Werte werden zurückgestellt; bestehende Beispieldatensätze werden nicht gelöscht.

Veröffentlichungsziel ist [schubert-design-suite.vercel.app](https://schubert-design-suite.vercel.app) über die bestehende `main`-Integration des Projekts `schubert-design-suite`. Die Änderung benötigt keine Datenbankmigration und führt weder eine Testdatenbereinigung noch eine neue Befüllung der Produktion aus. Commit, fertiges Vercel-Deployment und Live-Prüfung werden beim Abschluss gegen denselben Quellstand abgeglichen.

## Sichtbare Nachweise

- [Konkrete Rückfragen im Studio](agentic-interaction-evidence/clarification-desktop.png), [dunkle Darstellung](agentic-interaction-evidence/ai-dark-desktop.png) und [kleines Mobilgerät mit 320 Pixeln](agentic-interaction-evidence/ai-dark-mobile-320.png).
- [Vergleich und Änderungsliste](agentic-interaction-evidence/proposal-before-after.png), [veralteter Vorschlag](agentic-interaction-evidence/stale-proposal.png) und [Schutz späterer Bearbeitung beim Rückgängig](agentic-interaction-evidence/undo-later-work-protected.png).
- Vollständige helle Vorschau: [Planungsumgebung](agentic-interaction-evidence/proposal-light-desktop.png) und [Vergleich im Detail](agentic-interaction-evidence/proposal-light-detail.png).
- [Raumstudio mit fachlicher Elementliste](agentic-interaction-evidence/room-reduced-elements.png).
- Büro auf dem Mobilgerät: [Abschlussaktionen](agentic-interaction-evidence/office-mobile-footer.png) und [konkrete Rückfragen](agentic-interaction-evidence/office-mobile-clarification.png).
- Neu erzeugte echte Unterlagen: [Grabmal-PDF](agentic-interaction-evidence/memorial.pdf), [Raum-PDF](agentic-interaction-evidence/room_plan.pdf), [Revisions- und Hashnachweis](agentic-interaction-evidence/pdf-evidence.json). Beide PDFs besitzen fünf Seiten. Grundriss beziehungsweise Vorderansicht, Maßbezüge, Stückliste und offene Prüfpunkte wurden gerendert und geprüft. [Grabmalansicht](agentic-interaction-evidence/pdf-memorial.png) · [Raumansicht](agentic-interaction-evidence/pdf-room.png).
