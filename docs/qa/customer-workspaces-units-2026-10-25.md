# Kundenübersicht, Arbeitsbereiche und größere Studios · 25.10.2026

## Umsetzung

Die Kundenakte beginnt mit einer eigenen Übersicht. Berechtigte Vorgänge erscheinen als Kacheln für Aufträge, Anfragen, Angebote, Planungen, Unterlagen und Rechnungen. Zähler beziehen sich auf sämtliche passenden Datensätze; die Vorschau bleibt begrenzt. Aktuelle Vorgänge, Kontakt und die vollständige Akte sind getrennt erreichbar. Folgeformulare und vollständige Listen behalten den Kundenbezug. Ohne entsprechende Berechtigung erscheint die betreffende Kachel nicht.

Büro sowie Einkauf & Lager beginnen mit wenigen häufigen Aufgaben. Weitere Fachbereiche liegen in einem geschlossenen Zusatzbereich. Eine geöffnete Akte zeigt keine zusätzliche globale Bereichsleiste. Bestehende Aktenaktionen, Kommunikation, Verlauf und direkte URLs bleiben erreichbar.

Beide Studios verwenden den verfügbaren Fensterraum. Mehrere gestapelte Leisten wurden zusammengeführt, die doppelte Hinzufügen-Palette entfernt und die Seitenleisten schließen beim Einstieg. Nach dem Anlegen eines Bauteils öffnet sich am großen Bildschirm gezielt dessen Eigenschaftenbereich. Bezeichnung/Planungsphase und Position/Ausrichtung sind nachgeordnet. Auf kleinen Displays ersetzt eine Werkzeugauswahl mehrere konkurrierende Icons. Herstellerdaten, Hinzufügen und Ansichten bleiben erreichbar. Der Vollbild-Assistent überdeckt keine Zoomsteuerung; nach einer Auswahl in der mobilen Bauteilliste bleibt der Fokus auf dem Plan.

Die Anzeigeeinheit mm/cm/m gilt für neue Maße und die Bearbeitung bestehender Maße, Koordinaten, Konturen, Ausschnitte, Verschiebungen, Raster und Aufmaßtoleranzen. Ein explizites Suffix kann die Anzeigeeinheit für eine einzelne Eingabe überschreiben. Die persönliche Browserpräferenz wird je Benutzer gespeichert. Der Einheitenwechsel ist eine Darstellungseinstellung: Er erzeugt weder Geometrieänderungen noch neue Planrevisionen. Die kanonischen Werte behalten 0,01 mm Speicherpräzision. Pixelkoordinaten, Winkel, Stückzahlen und originale importierte Quellenwerte werden nicht mitkonvertiert. Technische PDF-Exporte weisen weiterhin Maße in mm aus.

Die KI erhält Schritt, aktuellen gespeicherten Stand, Auswahl, Bearbeitungsgrenzen und Anzeigeeinheit; Geometrie-Commands bleiben in mm. In der Kundenübersicht kennt sie den ausgewählten Kundenbereich und dessen berechtigte Vorschau. Auf den Arbeitsbereichs-Startseiten hilft sie bei der Navigation und erhält keine Schreibaktionen. Ungültige Maße werden vor einer KI-Anfrage oder einer expliziten Übernahme gemeldet.

Planungen werden anhand tatsächlich zugeordneter Aufträge, Objekte oder Grabstätten im Kundenbereich gezeigt. Fehlt ein solcher Bezug, erklärt der Einstieg den nächsten Schritt und bietet gegebenenfalls einen Auftragsentwurf an. Ein nur im Browser gesetzter Kundenkontext begründet keine neue Datenbeziehung. Der Server lehnt fehlende oder widersprüchliche Zuordnungen ab.

Die Herstellerfilter besitzen ausreichend Platz, konsistente Innenabstände und passende Flächen-/Textfarben für hell und dunkel. Die [Herstellerrecherche](../research/manufacturer-models-2026-10-25.md) dokumentiert verifizierte deutsche Beschaffungswege, Originalformate, offene Zugänge und das Konzept einer vollständigen, versionierten Übernahme.

## Prüfung

Dies ist eine technische und visuelle Regression mit echten synthetischen Rollenkonten, keine neue verblindete Nutzerstudie und keine menschliche Fachabnahme.

| Prüfung | Ergebnis |
| --- | --- |
| TypeScript / Svelte | 0 Fehler, 0 Warnungen |
| Unit-Tests | 401 bestanden in 65 Dateien |
| PostgreSQL | 64 Integrationsprüfungen bestanden |
| Vollständiger abschließender Browserlauf | Alle 60 unterschiedlichen Szenarien bestanden: 59 im Gesamtlauf, danach sämtliche 9 betroffenen Szenarien im gezielten Nachlauf |
| Produktionsbuild | Erfolgreich |
| Requirements | 154 Spezifikationsabschnitte und 69 Akzeptanzszenarien zugeordnet |
| Geheimnisprüfung | Keine Quellcode-Zugangsdaten gefunden |

Neue Regressionen prüfen unter anderem mehr Datensätze als die Vorschaugrenze, fremde Kunden/Betriebe, rollenabhängige Kacheln, Dokumentrechte, gefilterte Referenzauswahl und echte kundenbezogene Projektanlage. Die Browserprüfung deckt neue und bestehende Grabmal-/Raumpläne, cm/m-Eingaben, exakte gespeicherte mm-Werte, Reload ohne neue Revision, ungültige Eingaben und explizite Einheitensuffixe ab. Desktop und mobile Ansichten werden mit Tastatur, Überlaufprüfung und automatisierten WCAG-Prüfungen getestet. Dunkel/Hellblau reproduziert die gemeldete Herstelleransicht.

Die aktuellen PDFs für ein Grabmal mit Kreisbogen und einen Raum mit Öffnung wurden aus gespeicherten Plänen erzeugt, gerastert und visuell angesehen. Sie enthalten Ansichten, Bemaßung, Quellen-/Entwurfsstatus und Stückliste. Die Umrechnung der Eingabeeinheit verändert den Exportmaßstab nicht.

Technische KI-Transportprüfungen verwenden kontrollierte Antworten; die zusätzlichen Kontextprüfungen laufen gegen PostgreSQL. Ein neuer kostenpflichtiger Live-Modelltest wurde hierfür nicht als ausgeführt ausgegeben. Hersteller-Bulkfeeds oder proprietäre CAD-Konvertierungen sind Recherche-/Integrationsarbeit und werden nicht als bereits angeschlossen dargestellt.

## Daten und Auslieferung

Keine bestehende Testdatenbank wurde zurückgesetzt. Vor der Arbeit wurde ein vollständiges lokales PostgreSQL-Backup angelegt. Zusätzliche Testdatensätze tragen synthetische Bezeichnungen. Diese Änderung benötigt keine Schema-Migration, kein Produktions-Seed und keine Bereinigung von Testdaten.

Der [Gesamtlauf](customer-workspaces-units-2026-10-25/checks/browser-complete.txt) bestand 59 von 60 Szenarien. Die zuletzt ergänzte Fokus-/Scroll-Navigation verwendete zunächst entfernte SvelteKit-Optionen und wurde korrigiert. Anschließend bestanden alle [9 betroffenen Browser-Szenarien](customer-workspaces-units-2026-10-25/checks/browser-targeted.txt), einschließlich der vollständigen kundenbezogenen Projektanlage. Die übrigen 51 Szenarien sind von diesen abschließenden Änderungen nicht betroffen. Die anschließend sichtbar beschrifteten Herstellerwerkzeuge wurden nochmals in beiden Studios sowie im kurzen Vollbild geprüft: [3 erfolgreiche Szenarien](customer-workspaces-units-2026-10-25/checks/studio-labels.txt). Eine zusätzliche PostgreSQL-Prüfung bestätigt auch bei delegierten Planungsrechten die bestehende Auftragsbeschränkung operativer Rollen.

Visuelle Nachweise: [Kundenübersicht](customer-workspaces-units-2026-10-25/evidence/customer-1440.png), [Büro](customer-workspaces-units-2026-10-25/evidence/office-desktop.png), [Raumstudio](customer-workspaces-units-2026-10-25/evidence/room_plan-desktop.png), [mobiles Grabmalstudio](customer-workspaces-units-2026-10-25/evidence/memorial-mobile.png) und [dunkle Herstellerbibliothek](customer-workspaces-units-2026-10-25/evidence/manufacturer-dark-1440.png).

Weitere lokale Prüflogs, Zwischenstände und PDFs: `work/experience-2026-10-25/`. Auslieferungsziel ist das bestehende Vercel-Projekt `schubert-design-suite`, Production, über `main`. Der anschließende Abgleich von Commit, Deploymentstatus und Produktionsdomain wird lokal in `work/experience-2026-10-25/production-release.json` aufbewahrt.
