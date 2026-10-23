# Korrekturen aus den Rollen-Usability-Tests · 23.10.2026

Die 75 Produktbeobachtungen aus der [ursprünglichen Studie mit 22 simulierten Nutzern](ai-usability-2026-10-23.md) wurden 22 gemeinsamen Ursachen zugeordnet und bearbeitet. Die [vollständige Befundzuordnung](usability-fixes-2026-10-23/finding-map.md) verbindet Originalbeobachtungen, Änderungen und Nachweise. Wiederholte Beobachtungen werden dabei nicht als unabhängige Fehler gezählt.

## Wesentliche Änderungen

- **Planung:** Grabmal-PDF funktioniert auch mit noch nicht zugeordneter Herstellerschrift. Materialname, Katalogstand und Quelle erscheinen im PDF. Raumpläne unterscheiden lichte Innenmaße und Wandachsen; Maßtexte sind in PDF und eingepasster Arbeitsansicht lesbar. Platten verwenden Länge, Tiefe und Stärke. Downloadfehler bleiben verständlich im Studio und erhalten den Plan.
- **Büro und Finanzen:** Eine gemeinsame Suche findet berechtigte Bestandsreferenzen auch außerhalb der ersten geladenen Auswahl. Listen, Kalender und Aufgaben zeigen Bezugsnamen. Kunden-/Lieferantenakten enthalten erlaubte Folgeakten und Verlauf. Kunden können innerhalb der Anfrage angelegt, Rechnungsoriginale innerhalb des offenen Rechnungsformulars hochgeladen werden. Finanzquellen bleiben in Zeitraum und Berechtigungsumfang der Auswertung.
- **Arbeitszeit und Werkstatt:** Laufende Zeit bleibt beim Seitenwechsel sichtbar. Bestätigte Sitzungen und Zuordnungen werden konsistent aktualisiert. Manuelle Korrekturen erhalten tatsächliche Pausen; die Tagesabgabe beginnt mit einer Prüfzusammenfassung. HR erhält lesbare Tätigkeiten, Nachtragsanlässe und Versionsvergleiche. Arbeitsanweisungen stehen vor dem Rückmeldeformular, Reservierungen zeigen Menge und Einheit auch mobil.
- **Verwaltung:** Beschäftigtenprofile lassen sich ohne erfundenes Arbeitsmodell vorbereiten. Rollenänderungen öffnen einen fokussierten Dialog. Herstellerquellen zeigen gespeicherten Teilfortschritt und erlauben Abbruch/Wiederaufnahme. Systemzustand und Jobdiagnose erklären Konfiguration, Fehler und nächste Schritte. Nicht verfügbare Dienste werden nicht als Erfolg dargestellt.

## Gezielte Nachtests

Diese Durchgänge sind auf die gefundenen Fehler ausgerichtete Regressionstests in persönlichen Rollenkonten. Sie sind keine erneute verblindete Erstnutzungsstudie. Die Tester bedienten die Oberfläche, prüften gespeicherte Ergebnisse und sahen ihre Screenshots an. Frühere Beobachtungen bleiben in den Berichten stehen; spätere Abschnitte dokumentieren den jeweiligen Fix.

| Rolle | Bericht |
| --- | --- |
| Planung / Steinmetzmeister | [planner_a](usability-fixes-2026-10-23/reports/planner_a.md) |
| Büro | [office_b](usability-fixes-2026-10-23/reports/office_b.md) |
| Disposition | [dispatcher_a](usability-fixes-2026-10-23/reports/dispatcher_a.md) |
| Montage / Mitarbeiter | [employee_b](usability-fixes-2026-10-23/reports/employee_b.md), [zusätzliche HR-Prüffälle](usability-fixes-2026-10-23/reports/employee_b-release.md) |
| Werkstatt | [workshop_b](usability-fixes-2026-10-23/reports/workshop_b.md) |
| Finanzen | [finance_a](usability-fixes-2026-10-23/reports/finance_a.md) |
| Geschäftsführung | [owner_b](usability-fixes-2026-10-23/reports/owner_b.md) |
| Personal | [hr_a](usability-fixes-2026-10-23/reports/hr_a.md) |
| Superadmin | [superadmin_b](usability-fixes-2026-10-23/reports/superadmin_b.md) |
| Steuerberatung | [taxadvisor_a](usability-fixes-2026-10-23/reports/taxadvisor_a.md) |
| Technische Administration | [techadmin_a](usability-fixes-2026-10-23/reports/techadmin_a.md) |

Der vertiefte HR-Durchgang deckte zusätzlich auf, dass der Nachtragsgrund zwar in der Sitzung gespeichert, aber nicht in den eingereichten Stand übernommen wurde. Neue Abgabestände und Korrekturvorschläge binden diesen Hinweis jetzt mit. Eine PostgreSQL-Regression prüft den vollständigen Weg über Nachtrag, Abgabe, Rückfrage, Fremdprüfung einer synthetischen Korrektur und erneute Abgabe. Der ursprüngliche Abgabestand bleibt unverändert. Im Browser wurden ein neuer Nachweis mit Anlass, ein Korrekturantrag und eine Abwesenheit mit konkretem Zeitraum und Tagesmenge geprüft; die Rollen-Tester genehmigten keine Zeiten oder Urlaubsanträge.

Eine echte kleine Testdatei wurde aus der Werkstatt am eigenen Paket hochgeladen und als **In Quarantäne** verknüpft. Die Dokumentakte bietet vor bestätigter Prüfung keinen Download mehr an. Der separate [authentifizierte HTTP-Negativtest](usability-fixes-2026-10-23/quarantine-negative.json) bestätigt für genau dieses Original HTTP 409 `DOCUMENT_QUARANTINE`, ohne Dateiauslieferung.

## Technische Abschlussprüfung

| Prüfung | Ergebnis |
| --- | --- |
| TypeScript und Svelte | 0 Fehler und 0 Warnungen |
| Unit-Tests | 395 bestanden in 64 Dateien |
| PostgreSQL-Integration | 59 Prüfungen bestanden |
| Playwright | Alle 53 unterschiedlichen Prüfungen bestanden: 51 im Gesamtlauf, 2 nach Anpassung überholter Testannahmen gezielt wiederholt |
| Produktionsbuild | Erfolgreich |
| Requirements-Zuordnung | 154 Spezifikationsabschnitte und 69 Akzeptanzszenarien geprüft; externe Abnahme nicht daraus abgeleitet |
| Berechtigungs-/Datenleseprüfung | 70 autorisierte Listen-/Detailaufrufe ohne unerwarteten Fehler |

Der [vollständige Browserlauf](usability-fixes-2026-10-23/checks/browser-complete.txt) meldete zwei überholte Erwartungen: vier statt jetzt sechs Raummaße und einen weiterhin schwebenden mobilen Assistenten. Die Tests prüfen jetzt ausdrücklich die vier Wandachsen plus zwei Innenmaße sowie den am Seitenende erreichbaren Assistenten. Beide vollständigen Szenarien bestanden im [gezielten Nachlauf](usability-fixes-2026-10-23/checks/browser-targeted.txt). Der Anwendungscode blieb zwischen diesen Läufen unverändert. Ein zusätzlicher TypeScript-Lauf für die Testanpassungen war erfolgreich.

Die zusätzliche visuelle Konsistenzprüfung umfasste unter anderem die [dunkle Berichtansicht am Desktop](usability-fixes-2026-10-23/evidence/consistency/final-reports-dark-desktop.png), die [helle mobile Produktansicht](usability-fixes-2026-10-23/evidence/consistency/final-catalog-light-mobile.png), den eingepassten Raumplan und den HR-Versionsvergleich.

Die technischen KI-Tests verwenden ausdrücklich kontrollierte Modellantworten. Sie prüfen unter anderem Kontextbindung an Schritt und Revision, Rückfragen, Abbruch, Differenzvorschau, Rücknahme, veraltete Vorschläge sowie die optionale Auswahl bzw. das Überspringen der vier geprüften DE-Skills. Daraus folgt kein Nachweis realer Antwortqualität eines KI-Anbieters.

## Aussagegrenzen und Daten

Privater Blob-Upload wurde tatsächlich ausgeführt. Ein lokaler Virenprüfer und ein realer KI-Anbieter standen für diese Rollenprüfung nicht zur Verfügung. Dateien bleiben daher bis zur echten Sicherheitsprüfung gesperrt. Eine fehlende Konfiguration wurde nicht durch simulierten Erfolg ersetzt.

Historisch nicht gespeicherte Alt-/Neu-Feldwerte lassen sich nicht nachträglich als Auditbeleg erzeugen. Der Aktenverlauf zeigt belegte Aktion, Akteur, Zeitpunkt und Version. Bestehende eingereichte Nachweise werden nicht umgeschrieben. Fachliche Freigaben, Materialeignung, Fertigungsqualität und menschliche Bedienbarkeit am echten Touchscreen sind durch diese simulierten Browserprüfungen nicht abgenommen.

Bestehende Testdaten bleiben erhalten. Neu angelegte Datensätze sind synthetisch gekennzeichnet. Keine Rechnung wurde durch die Rollen-Tester ausgestellt, keine Zahlung ausgelöst, kein Fertigungspaket freigegeben und keine Nachricht extern versandt.
