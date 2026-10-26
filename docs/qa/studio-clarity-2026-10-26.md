# Einfachere Werkzeuge, Dropdowns und 3D-Inschriften · 26.10.2026

## Ergebnis

Beide Planungsstudios haben eine schwebende, beschriftete Werkzeugleiste. Hinzufügen, Bearbeiten und Bewegen der Ansicht sind getrennt. Die Bauteilauswahl nennt die Aufgabe und erklärt sie kurz; seltene Werkzeuge werden aufgeklappt. Ansichten, Einheiten, Darstellung, Einpassen und Zoom liegen unter der Zeichnung. Eigenschaften beginnen mit den Angaben zum Bauteil; Fachnachweise, Form/Ausschnitte, Bezeichnung, Position und Gruppen sind nachgeordnet. Drei sichtbare Eigenschaftenbereiche ersetzen sechs konkurrierende Tabs; Stände, Bilder, Wortlaut und Stückliste bleiben erreichbar. Eine Bedienhilfe erklärt drei konkrete Schritte und verwendet die aktuellen Beschriftungen/Positionen. Beim Bauteilwechsel startet der Eigenschaftenbereich oben. Die mobile Auswahl öffnet die Details ausdrücklich und hält die Zeichnung im Vordergrund.

Die gemeinsame suchbare Auswahl begrenzt übernommene Innenabstände nach unten. Die zugrunde liegende Ursache war ein ungestyltes verborgenes Original-Select mit 0px Padding, dessen berechneter Wert den sichtbaren ReferencePicker überschrieb. Formularwerte, Tastatur, serverseitige Suche, Pflichtprüfung und gesperrte Fieldsets bleiben maßgeblich.

Die 3D-Schrift wird auf der tatsächlichen Schriftfläche platziert. Bei einer Oberfläche wird der obere Schichtaufbau berücksichtigt; unterseitige Schichten verdrängen die Schrift nicht. Der Steinkörper extrudiert zur Rückseite und erhält keinen falschen zusätzlichen Frontversatz um seine Stärke. Die Grabmal-Kamera folgt der Flächennormalen einschließlich gedrehter Bezugssysteme. Schrift bekommt eine besser lesbare Kontur, einen tatsächlichen Lade-/Fehlerstatus und einen direkten Rückweg zur Schriftseite. Eine Wiederholung lädt nach einem Downloadfehler eine frische FontFace. Geprüfte Originalkonturen behalten ihre Herkunftsprüfung; fehlende Herstelleroriginale erzeugen keinen vorgetäuschten Erfolg.

Ein kurzer Klick im 3D-Modell wählt ein Bauteil; Kameraziehen bleibt eine reine Ansichtsaktion. Der Desktop-Begleiter erhält neben dem Studio einen eigenen Bereich. Die Bauteilpanels passen sich an die tatsächlich verbleibende Breite an; im kompakten Studio werden sie ausdrücklich als Dialog geöffnet. Eine leere, noch nicht verwendete Wandaktion blockiert keine KI-Anfrage zum gespeicherten Plan. Fehlerhafte Maßeingaben bleiben gesperrt; native Pflichtprüfung und Commandvalidierung gelten beim Absenden der jeweiligen Aktion weiter. Die gespeicherte Geometrie, Originaldateien, Freigaben und Geschäftstransaktionen behalten ihre bisherigen Verträge.

## Nachweise und Grenzen

Der reguläre Grabmalfall war bereits vor der Änderung lokal als Schriftpixel sichtbar. Deshalb wird kein pauschaler, am konkreten unbekannten Bestandsplan bewiesener Ausfall behauptet. Die Änderung sichert neu angelegte Texte, Schriftwechsel, Reload, gedrehte Hosts, Schriftladefehler und die im Code gefundene Schichtüberdeckung ab. Die genaue bestehende Planung des Nutzers wurde nicht identifiziert.

`tests/e2e/studio-clarity.spec.ts` legt echte synthetische Pläne über die autorisierte Anwendung an. Die 3D-Prüfung zählt tatsächlich blaue Schriftpixel ausschließlich im WebGL-Canvas eines sonst neutralen Teststeins, vor einem Kamerawechsel sowie nach Schriftwechsel, Reload und einer 180°-Drehung des Steins. Ein kontrolliert abgebrochener echter Font-Download muss einen sichtbaren Fehler erzeugen; nach Entfernen der Netzunterbrechung muss die echte Datei wieder geladen und die Schrift sichtbar werden. Es wird keine erfolgreiche Renderantwort simuliert.

Beide Studios werden auf 1440 × 1000, 1180 × 650, 390 × 844 und 375 × 812 sowie im nativen mobilen Vollbild geprüft. Die Tests prüfen Hilfe, Werkzeugwahl, Eigenschaften, Mehr-Menü, Fokus, Überlauf und WCAG 2 A/AA, 2.1 A/AA und 2.2 AA. Dunkel/Hellblau reproduziert den Screenshot-Stil und prüft auch das Büro-Referenzfeld. Die Regression prüft außerdem einen gesperrten Stein per Mausklick, den parallel geöffneten Begleiter bis zum nativen Vollbild und die Wiederherstellung des verfügbaren Platzes nach dem Schließen. `tests/e2e/companion-flows.spec.ts` prüft bei 1920px Breite die leere optionale Wandaktion und die weiterhin aktive Sperre einer ungültigen Wandhöhe mit kontrolliertem KI-Transport. Drei ergänzende Geometrieprüfungen sichern unveränderte kanonische Daten, gedrehte Parent-Frames und obere/untere Oberflächenlagen.

Die abschließende Code-/UX-Prüfung verfolgt drei Perspektiven: Ein Steinmetz legt Körper und Inschrift an und bearbeitet den sichtbaren Entwurf; die Bürokraft sucht und wählt Referenzen ohne Feldverluste; die Designprüfung beurteilt Hierarchie, Beschriftung, Zustände, Tastatur und Theme-Konsistenz. Dies ist eine technische, KI-gestützte Regression mit synthetischen Rollenkonten, keine menschliche Fachabnahme oder neue verblindete Nutzerstudie.

| Prüfung | Ergebnis |
| --- | --- |
| Svelte / TypeScript | 0 Fehler, 0 Warnungen |
| Unit-Tests | 404 bestanden in 65 Dateien |
| PostgreSQL | 64 Integrationsprüfungen bestanden |
| Vollständiger Browserlauf | Alle 67 Szenarien in einem Lauf bestanden; nach abschließendem Hilfe-/Auswahlabgleich alle 11 betroffenen Szenarien erneut bestanden |
| Produktionsbuild | Erfolgreich |
| Anforderungsverfolgung | 154 Abschnitte, 69 Abnahmeszenarien zugeordnet |

Aktuelle Grabmal- und Raum-PDFs wurden aus tatsächlich gespeicherten Revisionen heruntergeladen, gerastert und visuell geprüft: Außenmaße, Wandachsen/Innenmaße, Kreisbogen, Türöffnung, Quellen-/Entwurfskennzeichnung und Stückliste. Die technische Ausgabe bleibt in mm und erhält keine vorgetäuschten Originalschriftkonturen.

Die umfassende Regression umfasst weiterhin KI-Kontext, Grenzen, Klärungen, Abbruch, veraltete Antworten und Undo sowie Kundenübersicht, Angebot, Rechte, Belege und Personal. Kontrollierte KI-Transportantworten sind als solche benannt; hier wurde kein zusätzlicher kostenpflichtiger Modelltest als ausgeführt ausgegeben.

Ausgewählte Belege: [Grabmal Desktop](studio-clarity-2026-10-26/evidence/memorial-1440.png), [Grabmal mobil](studio-clarity-2026-10-26/evidence/memorial-375.png), [Raumstudio](studio-clarity-2026-10-26/evidence/room_plan-1440.png), [3D-Inschrift](studio-clarity-2026-10-26/evidence/lettering-first-view.png), [Schriftladefehler](studio-clarity-2026-10-26/evidence/lettering-font-failure.png), [Begleiter neben dem Studio](studio-clarity-2026-10-26/evidence/studio-ai-1440.png), [Dropdown](studio-clarity-2026-10-26/evidence/dropdown-padding.png). Die PDFs und tatsächlichen Dateihashes liegen im selben Nachweisverzeichnis.

## Daten und Auslieferung

Vor der Arbeit wurde ein vollständiges lokales PostgreSQL-Backup angelegt. Die bestehende Testdatenbank wurde nicht zurückgesetzt; vorhandene Testdaten und zusätzliche synthetische Testpläne bleiben erhalten. Die Änderung benötigt keine Datenbankmigration.
