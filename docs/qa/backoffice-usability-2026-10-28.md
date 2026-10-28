# Backoffice-Usability-Test · 28.10.2026

KI-Testnutzer in der Rolle einer Verwaltungskraft eines deutschen Steinmetzbetriebs mit geringer bis mittlerer digitaler Routine. Die Prüfung ersetzt keinen Test mit echten Beschäftigten. Getestet wurde die echte lokale Anwendung mit OFFICE-Anmeldung, PostgreSQL, Chromium, de-DE, Desktop 1440 × 1000 und Mobil 390 × 844. Uploads und Dokumentworker wurden tatsächlich ausgeführt; keine Modell-, Upload- oder Workerantwort wurde simuliert.

## Aufgaben und Nachtest

| Aufgabe | Ergebnis |
| --- | --- |
| Tagesstart, Büro, Kunde finden und anlegen | Erfolgreich. Kundenübersicht, Kontakte und Vorgänge verständlich erreichbar. |
| Kundenanfrage erfassen und wiederfinden | Erfolgreich. Kundenbezug gespeichert; direkter Rückweg zur Kundenübersicht ergänzt. |
| Aus Anfrage einen Angebotsentwurf beginnen | Erfolgreich nach Korrektur. Tatsächlicher Titel, Kunde, Beschreibung und sichtbare Quelle werden übernommen; Texte bleiben editierbar. Preise und Termine werden nicht erfunden. |
| Ein erstes Angebot verstehen | Entlastet. Kunde/Vorhaben und Gültigkeit zuerst; Betriebswährung, Auftragsbezug und weitere Termine unter optionalen weiteren Angaben. Standard-EUR öffnet diesen Bereich nicht automatisch. |
| Mobil einen falschen Positionspreis korrigieren | Erfolgreich. Die reale API liefert 422 mit `lines.0.unit_price`; Inline-Hinweis, Screenreader-Beschreibung und Fokus stehen direkt am fehlerhaften Preis. Eingabe bleibt erhalten, Korrektur wird nach Neuladen bestätigt. |
| Manuellen Auftragsentwurf beim Kunden anlegen | Erfolgreich. Entwurf gespeichert, keine verbindliche Freigabe ausgelöst. OFFICE besitzt erwartungsgemäß keinen direkten Planungszugriff. |
| Eine am Auftrag hinterlegte Skizze in der Kundenakte finden | Erfolgreich nach Korrektur. Indirekte Dokumentverknüpfung wird in Kachel und gefilterter Dokumentliste berücksichtigt. Kundenname und Rückweg sind auch in Dokumentlisten sichtbar. |
| In der gefilterten Kunden-Dokumentliste eine neue Skizze hochladen | Erfolgreich nach Anschlusskorrektur. Das sichtbare Uploadziel stammt aus dem serveraufgelösten Kundenkontext. Tatsächliche DB-Zuordnung und Auffindbarkeit in Liste und Kundenakte bestätigt. |
| Eine im Chat gespeicherte Papierzeichnung prüfen und als lesbares Bild vorbereiten | Erfolgreich mit echtem Worker. Bestehendes Original über „Vorbereitung fortsetzen“ verarbeitet, Status `checking → available`, Bildvorbereitung `running → completed`, tatsächliches Bild 1440 × 1100 geladen. |
| Papierzeichnung durch ein echtes Modell in einen Auftragsentwurf überführen | In diesem Rollenlauf nicht belegt. Die lokale OpenAI-Verbindung war nicht verfügbar; Texteingabe blieb ausdrücklich deaktiviert. Kein Modellaufruf oder KI-Erfolg wird behauptet. |

## Behobene Findings

1. **P2 · Fehlender Kunden-Rückweg:** Kundenbezogene Listen bieten einen direkten Rückweg zur berechtigten Kundenübersicht. Ohne CRM-Leserecht wird kein unbenutzbarer Kundenlink angeboten.
2. **P2 · Anfrageinhalt beim Angebotswechsel verloren:** „Angebot aus Anfrage anlegen“ lädt Startwerte ausschließlich aus der echten berechtigten Anfrage. Widersprechender Kunde, fehlende Rechte sowie fremder Mandant oder fremde juristische Einheit werden abgewiesen. Die Herkunft bleibt in den Notizen erhalten; sehr lange Beschreibungen erhalten einen ausdrücklichen Kürzungshinweis und Quellverweis.
3. **P2 · Zu frühe Abrechnungsfelder:** Das Angebotsformular trennt die ersten Angaben von optionalen späteren Terminen und verwendet passende Angebotshilfen. Rechnungsfelder und Rechnungslogik wurden nicht verändert.
4. **P1/P2 · Unspezifischer Preisfehler auf Mobilgeräten:** Reale Zod-Zeilenpfade werden in konkrete öffentliche Feldfehler übersetzt. Zeilenfelder besitzen Fehlerbezug und Fokusführung; fehlerhafte Daten überschreiben den gespeicherten Stand nicht.
5. **P1 · Verknüpfte Auftragsunterlage fehlt beim Kunden:** Der gemeinsame Kunden-Dokumentscope berücksichtigt sichere indirekte Links über Kundenaufträge. Bestehende Dokumentrechte, Personaldatei-Ausschluss und Zuweisungsgrenzen bleiben wirksam.
6. **P1/P2 · Upload trotz Kundenfilter unzugeordnet:** Der Upload in einer gefilterten Kunden-Dokumentliste erhält den autorisierten Serverkontext und zeigt vor der Dateiauswahl die zugehörige Kundenakte. Die normale serverseitige Dokumentzielprüfung bleibt entscheidend.

## Belege und Regressionen

- `tests/e2e/backoffice-usability.spec.ts`: letzter isolierter echter Browserlauf **1 bestanden, 13,5 s**. Anfrage → editierbarer Angebotsentwurf → Kunden-Rückweg → mobiler Preisfehler → Korrektur → erneut öffnen. Keine Breitenüberschreitung bei 390 px, Axe ohne Verstöße im mobilen Fehlerdialog.
- `packages/application/src/input-errors.test.ts`, `apps/web/src/lib/client/create-context.test.ts`, `tests/create-context.test.ts`: **11 gezielte Unit-Tests bestanden**. Darunter echte Vertragsschemafehler, unveränderte Dezimalwerte, keine Übernahme von URL-Text und weiterhin strenge Datum-/Zeitprüfung.
- `scripts/backoffice-usability-integration.ts`: fünf Prüfungen für die gemeinsame PostgreSQL-Suite: autorisierte Quellübernahme und unveränderliche Anfrage, Rechte-/Kunden-/Mandanten-/Entity-Grenzen, unveränderte Beträge nach fehlerhaftem Update sowie indirekte Dokumentlinks mit Personal- und Zuweisungsgrenzen und die Ausblendung technischer Vorschaudateien bei weiterhin sichtbaren Geschäfts-PDFs. Das Gesamtergebnis wird im gemeinsamen Abschlussbericht dokumentiert.
- Lokale Belege unter `work/usability-2026-10-28/backoffice/`: ursprünglicher Rollenbericht und Screenshots 01–28; Nachtest 30–33 für Angebot und Preisfehler; 34–36 für alte Auftragsskizze in Kundenunterlagen; 37–38 für echten Dateiwiederanlauf und Bildvorschau; 40–42 für den neu zugeordneten Kundenupload. Dokumentlisten-Nachtest ebenfalls ohne Axe-Verstöße oder Seitenüberlauf bei 390 px.

Konkreter neuer Upload: `kundenskizze-b2650b.png`, Dokument `b728586a-d7e1-4885-82ed-5670731c027e`. Die echte Datenbank bestätigte `entity_type=customers` und die gewählte Testkundin. Zum Zeitpunkt dieses Zuordnungsnachweises blieb die Datei korrekt in Quarantäne. Der separat vollständig vorbereitete Chat-Upload war Original `ae927517-ded3-4806-b9c8-6e9b183a327f`, Preview-Job `d8ea7a8c-e4a2-428f-85f4-db2c87331310`.

Alle neu angelegten Geschäftsvorgänge sind als TEST UAT markiert und bleiben Entwürfe. Bestands-Testdaten wurden nicht gelöscht; keine Rollen, Modulflags oder Scanergebnisse wurden verändert. Ein paralleler Playwright-Lauf kollidierte einmal beim Trace-Aufräumen im gemeinsamen Ausgabeverzeichnis; der abschließende Lauf mit eigenem Ausgabeverzeichnis bestand vollständig. Frühere Selektor-/Skriptfehler wurden nicht als Produktfehler gewertet.
