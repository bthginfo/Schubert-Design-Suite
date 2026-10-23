# KI-gestützter Usability-Test · 23.10.2026

**22 simulierte Testpersonen, zwei pro interner Rolle, haben 70 konkrete Arbeitsziele über die echte Oberfläche bearbeitet.** Die Tests zeigen einen reproduzierten Funktionsblocker beim Grabmal-PDF und wiederkehrende Hürden bei Suche, Verknüpfungen, Arbeitszeitstatus und Rückmeldungen. Die vier Schritte der Planungsstudios, geschützte Maße/Inschriften und mehrere grundlegende Büroabläufe waren verständlich nutzbar. Eine pauschale Aussage „usabilityseitig fertig“ lässt sich aus diesem Lauf nicht ableiten.

Die App lief lokal auf dem bereits ausgelieferten Main-Stand `fbed506d9fb63cf62f7b148942b8ac7c930f54ce`. Der Produktcode blieb während aller Rollen-Tests unverändert. Alle Geschäftsdaten waren synthetisch; Production wurde nicht verändert. Die Testdaten bleiben erhalten.

## Umfang und Aussagekraft

| Merkmal | Durchführung |
| --- | --- |
| Testpersonen | 22 unabhängige Subagenten mit eigenem Brief und persönlichem Rollenkonto |
| Rollen | Planner, Office, Employee, Workshop, Dispatcher, Finance, Owner, HR, SuperAdmin, TaxAdvisor, TechAdmin |
| Aufgaben | 70 Ziele: 37 erreicht, 29 teilweise erreicht, 4 blockiert |
| Browseraktionen | 1.420 einschließlich Sichtungen, Tastaturversuchen, Infrastrukturwiederholungen und Nachtests |
| Bildbelege | 359 PNG-Belege im Workspace; 20 ausgewählte Screenshots und ein tatsächliches Planungs-PDF im versionierten Belegpaket |
| Ansichten | 1440 × 1000, 1280 × 900; drei Personen mit 390 × 844 für Montage/Werkstatt |
| Sprache und Zeit | Deutsche UI, Browserkontext `de-DE`, Zeitzone Europe/Berlin, deutsche Fachszenarien |
| Zugang | Echte individuelle Anmeldung und tatsächliche Rollenrechte, keine Rollenumschaltung per Testparameter |
| Aufgabengestaltung | Ziele ohne Klickanleitung; erfahrene und neue Mitarbeiter; eigene markierte Vorgänge |

Die Testpersonen durften keine Anwendungssourcen, APIs, Datenbanken oder Berichte anderer Personen lesen. Sie navigierten, füllten Formulare, speicherten eigene Entwürfe, erfassten Zeit, prüften Downloads und sahen Screenshots selbst an. Maximal sechs Rollen-Agenten arbeiteten gleichzeitig in getrennten Browserkontexten. Ein zusätzlicher Infrastruktur-Driver zählt nicht als Testperson.

Die Zielstände sind beschreibend. Beispielsweise wurde der Download einer tatsächlich leeren CSV erreicht, ohne dass damit eine inhaltlich vollständige Finanzprüfung bestanden wäre. „Teilweise“ umfasst auch sinnvoll erklärte Grenzen und fehlende Testvoraussetzungen. Dies sind simulierte Nutzertests, keine Studie mit menschlichen Mitarbeitern, keine gemessenen menschlichen Bearbeitungszeiten und kein SUS-/Statistiknachweis. Mobile Ansichten wurden im Browser geprüft, ohne physisches Smartphone oder Handschuhe.

## Höchste Prioritäten

Die folgende Liste bündelt wiederholte Beobachtungen. Sie ist keine Zählung unabhängiger Fehlerursachen. Die Originalbefunde mit Reproduktion, Erwartung und Evidenz stehen in den Einzelberichten.

| Priorität | Befund und praktische Folge | Belege | Kriterium für einen Nachtest |
| --- | --- | --- | --- |
| **P1** | **Grabmal-PDF mit gewöhnlicher Inschrift scheitert.** Zweimal rohe `REQUEST_FAILED`-JSON-Seite statt Unterlage. | `planner_a-F1`; technische Nachprüfung unten | Ein normaler Entwurf mit noch nicht verbindlich zugeordneter Schrift liefert ein lesbares PDF; Fehler bleiben verständlich in der App und erhalten den Entwurf. |
| **P2** | **Kennungen ersetzen Namen und Materialien.** Kunden in Auftragslisten, Mitarbeiter im Kalender, Verantwortliche und Auftragsbezüge in Aufgaben sowie Material im PDF sind teilweise UUIDs. | `office_b-F2`, `dispatcher_a-F2`, `dispatcher_b-F2`, `finance_a-F4`, `finance_b-F4`, `owner_a-F2/F3`, `owner_b-F1`, `planner_b-F1` | Auf denselben Datensätzen lesbare Namen/Bezeichnungen in Liste, Akte, Kalender und Ausgabe; verständlicher Zustand bei fehlender Auflösung. |
| **P2** | **Suche meldet falsche Leere.** Vorhandene Mitarbeiter/Aufträge fehlen in der direkten Suche und erscheinen erst nach einer separaten erweiterten Suche. Kundennamen finden ihre Aufträge nicht. | `dispatcher_a-F1`, `dispatcher_b-F1`, `finance_a-F2`, `office_b-F2` | Eine erkennbare Suche über alle berechtigten Einträge; kein „nicht vorhanden“, wenn lediglich der geladene Ausschnitt durchsucht wurde. |
| **P2** | **Verknüpfte Vorgänge und sichtbarer Verlauf fehlen.** Kundenakten zeigen bestehende Anfragen/Angebote/Aufträge nicht; nach Änderungen bleibt der Verlauf leer. Nach Reservierung fehlen zugehöriger Auftrag und Menge in der Bestandsakte. | `office_a-F1`, `office_b-F1/F3`, `finance_b-F2`, `owner_a-F1`, `dispatcher_a-F3`, `workshop_a-F4` | Zusammengehörige Vorgänge rollenabhängig anzeigen; Termin-/Wunschänderungen und Reservierungen aus der Akte nachvollziehen können. Keine Aussage über einen Verlust interner Auditdaten. |
| **P2** | **Zeitstatus widerspricht der tatsächlichen Aktion.** Bestätigte Zuordnung wird zugleich als offen bezeichnet; eine beendete Sitzung steht zunächst weiter auf „läuft“. Laufende Zeit verschwindet beim Wechsel zu Arbeitsunterlagen. | `employee_a-F1/F2`, `workshop_a-F1`, `workshop_b-F1` | Eindeutige Zustände für lokal, ausstehend und bestätigt; beendete Sitzung sofort konsistent; laufende Zeit auch beim Arbeiten in anderen Ansichten erkennbar. |
| **P2** | **Fehler und Teilfortschritt liegen außerhalb des Blicks.** Offline-Speichern und Asset-Upload zeigen Fehler oberhalb des sichtbaren langen Formulars. Beim Asset bleibt unklar, dass bereits ein Entwurf entstand. | `employee_b-F1`, `superadmin_a-F1`; ergänzend `planner_a-F2` | Fehlermeldung beim Auslösen sichtbar und zugänglich; Eingaben erhalten; klar, welcher Teil gespeichert wurde und was der nächste Schritt ist. |
| **P2** | **Berechtigungsabhängige Quellenwege enden in Sperren.** Finanz- und Steuerberaterrollen bekommen Links zu Rechnungs-/Auftragsbereichen angeboten, die sie nicht öffnen dürfen. | `finance_b-F1`, `taxadvisor_a-F1`, `taxadvisor_b-F1` | Die korrekte Zugriffssperre beibehalten; zugänglichen Quellennachweis anbieten oder die Grenze vor dem Link erklären. Keine pauschale Rechteausweitung. |
| **P2** | **Beschäftigtenprofil lässt sich nicht verständlich vervollständigen.** Allgemeine Validierung ohne korrigierbares Feld beim neu angelegten Bürobenutzer. | `superadmin_b-F1` | Mit üblichen Pflichtangaben einen Mitarbeiter zuordnen; andernfalls Feld, Grund und konkreten Korrekturweg zeigen. |
| **P2** | **Technische Diagnose verliert Kontext.** Jobdetails zeigen weniger als die Jobliste; Technikrollen finden keinen belastbaren System-/Integrationsüberblick. | `techadmin_a-F1/F2`, `techadmin_b-F1/F2` | Fehlerursache, betroffener Dienst, Zeitpunkt und sicherer nächster Schritt in der Jobakte; Statusübersicht im erlaubten technischen Zugriffsumfang. |

## Planungsstudios und Hersteller-Assets

**Grabmal:** Eine Stele 800 × 1200 × 160 mm mit der exakten Inschrift „Anna Linden · 1948–2026 · In Liebe“ wurde angelegt. Schriftänderung und Rücknahme gelangen. Katalogreferenz, Prüfstand und Grenze zur Fertigungsfreigabe waren auffindbar. Der PDF-Blocker bleibt die wichtigste technische Lücke dieses Ablaufs.

**Raum:** Ein Bad mit lichten Innenmaßen 4200 × 3200 mm, 2600 mm Höhe, 200 mm Wandstärke, 900-mm-Türöffnung und einer Platte 1200 × 550 × 30 mm wurde angelegt. Revision 8 war nach neuer Sitzung wieder vorhanden; das [sechsseitige PDF](ai-usability-2026-10-23-evidence/selected/room-planning.pdf) wurde tatsächlich heruntergeladen und geprüft. Zwei wesentliche Ausgabelücken:

- Das PDF nennt statt „Bianco Carrara C“ eine Material-ID und keinen verständlichen Quellenbezug (`planner_b-F1`).
- Lichte Innenmaße sind später nicht direkt ablesbar; Achs- und Außenmaße sind zwar bezeichnet, ersetzen aber die eingegebenen nutzbaren Raummaße nicht (`planner_b-F2`). Es wurde keine falsche Geometrie festgestellt.

Die Begriffe passen noch nicht durchgehend zum Bauteil: Bei einer Waschtischplatte erscheint „Gerade Stele“ mit Grabmalformen; Länge/Breite/Höhe wechseln zwischen Anlegen, Bearbeiten und Prüfen (`planner_b-F3`). Der Rechteckraum verspricht bei der Wandstärke „Unbekannt“ als Möglichkeit, verlangt dann aber einen Wert (`owner_a-F6`). Das sollte fachlich pro Studio und Bauteil konsistent werden.

**Herstellerbibliothek:** Planung und KI-Nutzung werden verständlich getrennt. Der Superadmin fand den Zugriffspfad und konnte am eigens angelegten Office-Benutzer die zusätzliche Bibliotheksfähigkeit speichern und beim erneuten Öffnen bestätigen. Keine Rechte anderer Testpersonen wurden geändert. Die vollständige Dateikette blieb durch den fehlenden lokalen privaten Speicher begrenzt: Ein eigener Quellenentwurf entstand, Originalupload, Scan, Bereitstellung und tatsächliche Verwendung als KI-/Planungsquelle konnten nicht vollständig geprüft werden. Dass die noch nicht bereitgestellte Quelle in beiden Studios nicht auswählbar war, wurde als korrekte Grenze behandelt.

Verbesserungsbedarf: gesicherter Teilfortschritt beim fehlgeschlagenen Upload, sichtbarer Fehler, leichter erreichbare Benutzerbearbeitung und Suche per Enter (`superadmin_a-F1/F2/F3`, `superadmin_b-F2`).

## KI-Interaktion und die Konferenzprinzipien

| Prinzipbereich | Beobachtet | Offener Nachweis / Verbesserung |
| --- | --- | --- |
| Absicht klären; Wiedererkennen erleichtern | Schritt- und Auswahlbezug, vorgeschlagene Hilfsfragen sowie Schutz für Maße und wörtlichen Text waren im Studio sichtbar. Backoffice-Formulare erklärten die aktuell übermittelten Felder. | Tatsächliche passende Rückfragen und Behandlung unvollständiger Eingaben mit einem eingerichteten Modell testen. Technische Kennungen erschweren generell das Wiedererkennen. |
| Überblick während der Arbeit | Revisionen, bestätigte Speicherung, vier Planungsschritte und offene Prüfpunkte halfen bei der Orientierung. | Fehler außerhalb des Viewports, widersprüchlicher Zeitstatus, nicht erkennbare Filter und gleichfarbige Erfolgs-/Nichtverfügbarkeitszustände schwächen den Überblick. |
| Kontrolle und Korrektur | Schriftwechsel/Rücknahme, Abbruchschutz für offene Eingaben und Grenzen zur technischen Freigabe waren verständlich. Rollenrechte und Einsatzkonflikte wurden tatsächlich durchgesetzt. | Vorschau/Übernahme/Rücknahme echter KI-Vorschläge, Vertrauen in Aussagen und automatische Wahl der Fachskills konnten ohne verfügbaren Anbieter nicht geprüft werden. |

**Wichtige Grenze:** In dieser lokalen Umgebung waren OpenAI-Projekt/Modell/Budget nicht eingerichtet. Es wurden keine echten KI-Antworten bewertet. Sichtbare Kontexthinweise sind kein Nachweis, dass eine reale Anfrage genau diese Daten übertragen hat. Auch die modellgesteuerte optionale Auswahl der Fachskills ist durch diesen Usability-Lauf nicht erneut verifiziert. Dafür ist ein gesonderter Lauf mit verfügbarer KI und repräsentativen deutschen Fällen erforderlich; keine simulierte Anbieterantwort wurde als Erfolg ausgegeben.

## Weitere konkrete Verbesserungsfelder

| Bereich | Beobachtung | Originalbefunde |
| --- | --- | --- |
| Montage/Werkstatt | Fachlich wichtige Maße, Arbeitsanweisungen und Status liegen mobil hinter Verwaltungsangaben; schwebender Assistent überdeckt Inhalt, Pausentasten umbrechen mitten im Wort. | `employee_a-F3/F4`, `workshop_b-F2/F3` |
| Zeitnachtrag | Eine Endzeitkorrektur verlangt Abgleich mehrerer unabhängiger Intervalle. Nach Speichern für gestern bleibt der Tagesfilter auf heute. | `employee_b-F2/F3` |
| Arbeitskontext | Rückmeldung ist am Auftrag speicherbar, am Arbeitspaket nicht auffindbar; belastbarer Unterlagenstand ist dort nicht ersichtlich. | `workshop_a-F2/F3` |
| Reservierung | Im Reservierungsdialog fehlt die konkrete Mengeneinheit; Status allein erklärt den Bezug später nicht. | `workshop_b-F4`, `workshop_a-F4` |
| Disposition | Auftragfilter erst unter dem Kalender erkennbar; „keine Einsätze“ kann als freie Teamkapazität missverstanden werden. | `dispatcher_a-F4` |
| Disposition | Korrekte Überschneidungssperre nennt weder kollidierenden Einsatz noch Zeitraum. | `dispatcher_b-F3` |
| Rechnungseingang | Pflichtoriginal erfordert Verlassen des Rechnungsformulars und Wechsel in den Dokumentbereich. | `finance_a-F3` |
| Inhaberüberblick | Dringlichkeit, Kostensatzwarnungen und Angebotsmeldungen nennen zu selten den konkret betroffenen Vorgang und einen passenden Prüfweg. | `owner_a-F2/F4/F5`, `owner_b-F2/F3`, `taxadvisor_a-F3`, `taxadvisor_b-F2` |
| Personal | Zeitprüfung liegt unter eigener Erfassung; Tätigkeit und Nachtragsgrund werden im normalen Nachweis nicht vollständig lesbar, Vollnachweis ist JSON. | `hr_a-F1/F2`, `hr_b-F1` |
| Personal | „Tag prüfen & abgeben“ reicht unmittelbar ein; keine zusätzliche Prüfzusammenfassung. Abwesenheitsliste ohne sichtbare Zeitraumspalten, Letzteres nur am Leerzustand beurteilt. | `hr_b-F2/F3` |
| Einführung | Wiederholtes Erscheinen und Änderungskonflikt beim Pausieren nach Quellensprüngen. | `finance_b-F3`, `taxadvisor_a-F5`, `taxadvisor_b-F3` |
| Sprache und Hilfe | Status `validated`, technische CSV-Spalten; Personal-/Verarbeitungshilfe teilweise ohne passenden Rolleninhalt. | `finance_a-F5`, `finance_b-F5`, `taxadvisor_a-F4`, `hr_b-F4`, `techadmin_b-F3` |
| Technischer Zustand | „Nicht verfügbar“ erhält dieselbe grüne Darstellung wie „Abgeschlossen“; gesperrte Dienste nennen unklare Anschlusswege. | `techadmin_a-F3`, `superadmin_b-F3` |
| Kundenerfassung | Neuer Kunde nicht direkt aus der Anfrage anlegbar; Umweg über Kundenakte. | `office_a-F2` |

## Was bereits gut funktionierte

- Kunde → Anfrage → Angebotsentwurf wurde mit echten Eingaben gespeichert. Die Beispielkalkulation ergab korrekt **830,00 € netto und 987,70 € brutto**. Beim Rechnungseingangsformular wurden **700,00 € netto + 133,00 € USt. = 833,00 €** korrekt angezeigt; seine Speicherung blieb am fehlenden Originalupload begrenzt.
- Neue Anfragen übernahmen den Kunden aus der Akte. Titelbasierte Suche fand eigene Vorgänge wieder. Offene Eingaben blieben nach „Weiter bearbeiten“ erhalten; bestätigte Speicherung und erneutes Öffnen funktionierten in mehreren Rollen.
- Beide Planungsstudios führten mit vier erkennbaren Schritten. Wunschmaß und Aufmaß waren unterscheidbar; offene Fachprüfungen wurden nicht still als Freigabe behandelt.
- Timer starten, pausieren, fortsetzen und beenden war möglich. Der manuelle Nachtrag 08:00–11:30 mit Pause 09:30–09:45 wurde mit **3,25 h netto** gespeichert und wieder geprüft. Eine Stunde Büroarbeit ließ sich ohne geratenen Auftrag erfassen und selbst einreichen.
- Ein überlappender eigener Einsatz 10:00–12:00 wurde gegen 09:00–11:00 blockiert; Korrektur auf 11:00–13:00 gelang ohne Eingabeverlust.
- Nach Ergänzung eigener synthetischer Lagerdaten fanden beide Werkstattpersonen Platten/Reststücke und reservierten jeweils genau ein eigenes Stück für den eigenen Auftrag. Keine Verbrauchs- oder Zuschnittbuchung erfolgte.
- Individueller Office-Zugang und gezielte zusätzliche Bibliotheksfähigkeit wurden angelegt. Externe Nachrichten, Zahlungen, Rechnungs- und Fertigungsfreigaben wurden nicht ausgelöst.

## Technische Nachprüfung des PDF-Blockers

`planner_a` erzeugte den Fehler zweimal über den sichtbaren Download. Das Serverprotokoll bestätigte HTTP 500 mit `invalid input syntax for type uuid: "unassigned:font"`. Die Font-Abfrage im gemeinsamen `designs/:id/validate|export`-Zweig von `apps/web/src/routes/api/v1/[...endpoint]/+server.ts` übergibt alle Inschriften-Schriftverweise an `uuid[]`, einschließlich des zulässigen noch nicht zugeordneten Schriftplatzhalters. Dieser Befund ist von fehlenden KI-, Speicher- oder Dokumentanbieter-Zugangsdaten unabhängig. Der Raumplan ohne diese Inschrift lieferte tatsächlich ein PDF.

Empfohlene Regression: Entwurf mit unzugeordneter Schrift, Entwurf mit gültiger konkreter Schriftreferenz sowie kontrollierte Exportfehler prüfen. Die noch offene Schriftzuordnung muss fachlich sichtbar bleiben und darf nicht durch eine behauptete identische Fertigungsschrift ersetzt werden.

## Grenzen und Einflüsse der Testumgebung

1. **Privater Dateispeicher fehlte lokal.** Originalupload, Scan-/Bereitstellungskette und Controlling-Berichtspaket sind deshalb nicht vollständig geprüft. Tatsächliche einfache CSV-Downloads wurden gesondert belegt. Daraus wird keine Aussage über die aktuelle Production-Konfiguration abgeleitet.
2. **Keine verfügbare KI.** Keine Antwortqualität, tatsächliche Kontextübermittlung, Skillwahl oder sichere Übernahme generierter Änderungen in diesem Lauf nachgewiesen.
3. **Personalgrundlagen unvollständig.** Eigener bestätigter Arbeitszeit-/Urlaubsanspruch fehlte; es wurden keine Arbeitstage oder rechtlichen Parameter erfunden, um einen Antrag künstlich abschließen zu können.
4. **Lagerdaten ergänzt.** Zunächst leere Listen waren ein Fixture-Limit. Beide ursprünglichen Personen wiederholten G2 mit eigenen synthetischen Platten/Reststücken auf identischem Produktcode. Anfangsbefund und Nachtest bleiben getrennt dokumentiert.
5. **Infrastrukturunterbrechungen.** Ein früher Broker-Neustart und kurzzeitige gemeinsame Login-Drossel wurden behoben. Ein erfolgreicher PDF-Download schloss seinen temporären Tab; die darauf folgende Broker-Zielverwechslung wurde als Harness-Problem behandelt. Keine dieser Unterbrechungen wurde als Appfehler gezählt.
6. **Native Datumsfelder.** Die englische Anzeige nativer Datum-/Zeitfelder wurde auch in minimalem HTML ohne Appcode trotz deutschem Kontext reproduziert. Deshalb kein bestätigter App-Lokalisierungsfehler. ISO-Eingabe über das Browserwerkzeug belegt keine manuelle deutsche Datumseingabe.
7. **Gemeinsame synthetische Daten.** Persönliche Browserkontexte und eigene markierte Objekte, aber ein gemeinsamer Testbetrieb; neue globale Warnungen/Listenänderungen anderer Testpersonen konnten sichtbar werden. Kein Sicherheits-, Last- oder fachlicher Normennachweis.

Die 90 Einzelmeldungen umfassen **75 produktbezogene Beobachtungen**, **14 Umgebungsgrenzen** und **eine separat erfasste Harness-Meldung**. Produktbezogen: 1 × P1, 50 × P2, 24 × P3; keine P0-Beobachtung. Wiederholungen sind enthalten. Weitere methodische Infrastrukturhinweise stehen in den Berichten und der [Nachprüfung](ai-usability-2026-10-23-evidence/parent-triage.json). Diese Zahlen sind keine Liste von 75 unabhängig bestätigten Bugs.

## Alle Rollen und Einzelberichte

Jeder Brief, Bericht und strukturierte Ziel-/Befundnachweis ist gesichert. Die externe Kundenrolle Portal war nicht Bestandteil der angefragten Mitarbeitertests.

| Rolle | Unabhängige Testpersonen / vollständige Berichte | Zielstände laut Einzelbericht |
| --- | --- | --- |
| Planner | [planner_a](ai-usability-2026-10-23-evidence/reports/planner_a.md) / [planner_b](ai-usability-2026-10-23-evidence/reports/planner_b.md) | A: G1 erreicht, G2 erreicht, G3 blockiert, G4 teilweise<br>B: G1 erreicht, G2 erreicht, G3 teilweise, G4 teilweise |
| Office | [office_a](ai-usability-2026-10-23-evidence/reports/office_a.md) / [office_b](ai-usability-2026-10-23-evidence/reports/office_b.md) | A: G1 erreicht, G2 erreicht, G3 teilweise<br>B: G1 teilweise, G2 erreicht, G3 blockiert, G4 erreicht |
| Employee | [employee_a](ai-usability-2026-10-23-evidence/reports/employee_a.md) / [employee_b](ai-usability-2026-10-23-evidence/reports/employee_b.md) | A: G1 erreicht, G2 erreicht, G3 teilweise<br>B: G1 erreicht, G2 erreicht, G3 erreicht, G4 erreicht |
| Workshop | [workshop_a](ai-usability-2026-10-23-evidence/reports/workshop_a.md) / [workshop_b](ai-usability-2026-10-23-evidence/reports/workshop_b.md) | A: G1 erreicht, G2 erreicht, G3 teilweise<br>B: G1 erreicht, G2 erreicht, G3 erreicht |
| Dispatcher | [dispatcher_a](ai-usability-2026-10-23-evidence/reports/dispatcher_a.md) / [dispatcher_b](ai-usability-2026-10-23-evidence/reports/dispatcher_b.md) | A: G1 erreicht, G2 erreicht, G3 teilweise<br>B: G1 erreicht, G2 erreicht, G3 erreicht |
| Finance | [finance_a](ai-usability-2026-10-23-evidence/reports/finance_a.md) / [finance_b](ai-usability-2026-10-23-evidence/reports/finance_b.md) | A: G1 teilweise, G2 teilweise, G3 teilweise<br>B: G1 teilweise, G2 teilweise, G3 teilweise |
| Owner | [owner_a](ai-usability-2026-10-23-evidence/reports/owner_a.md) / [owner_b](ai-usability-2026-10-23-evidence/reports/owner_b.md) | A: G1 teilweise, G2 erreicht, G3 erreicht<br>B: G1 teilweise, G2 erreicht, G3 teilweise |
| HR | [hr_a](ai-usability-2026-10-23-evidence/reports/hr_a.md) / [hr_b](ai-usability-2026-10-23-evidence/reports/hr_b.md) | A: G1 erreicht, G2 blockiert, G3 erreicht<br>B: G1 erreicht, G2 erreicht, G3 erreicht |
| SuperAdmin | [superadmin_a](ai-usability-2026-10-23-evidence/reports/superadmin_a.md) / [superadmin_b](ai-usability-2026-10-23-evidence/reports/superadmin_b.md) | A: G1 teilweise, G2 teilweise, G3 teilweise<br>B: G1 erreicht, G2 teilweise, G3 erreicht |
| TaxAdvisor | [taxadvisor_a](ai-usability-2026-10-23-evidence/reports/taxadvisor_a.md) / [taxadvisor_b](ai-usability-2026-10-23-evidence/reports/taxadvisor_b.md) | A: G1 teilweise, G2 erreicht, G3 blockiert<br>B: G1 teilweise, G2 teilweise, G3 erreicht |
| TechAdmin | [techadmin_a](ai-usability-2026-10-23-evidence/reports/techadmin_a.md) / [techadmin_b](ai-usability-2026-10-23-evidence/reports/techadmin_b.md) | A: G1 teilweise, G2 teilweise, G3 erreicht<br>B: G1 teilweise, G2 teilweise, G3 teilweise |

## Belegpaket und Umsetzungsempfehlung

- [Strukturierte Ergebnisse](ai-usability-2026-10-23-evidence/results.json), [vollständige Beobachtungsliste als CSV](ai-usability-2026-10-23-evidence/findings.csv), [Testprotokoll](ai-usability-2026-10-23-evidence/protocol.md), [Szenarien](ai-usability-2026-10-23-evidence/briefs/).
- [Ausgewählte Screenshot-Belege](ai-usability-2026-10-23-evidence/selected-evidence.json) und [tatsächliches Raumplanungs-PDF](ai-usability-2026-10-23-evidence/selected/room-planning.pdf).
- Vollständige Rohbilder, Browserereignisse und Original-Einzelberichte: `work/ai-usability/`. Zugangsdaten und Sitzungsdaten sind nicht Teil des versionierten Pakets.

Die nächste Optimierungsrunde sollte mit dem PDF-Blocker beginnen, danach die wiederkehrenden Probleme bei Namen/Suche, verknüpften Akten, sichtbaren Rückmeldungen und Zeitstatus systematisch beheben. Für beide Studios folgen verständliche Fachbegriffe sowie Material- und Innenmaßangaben in der Ausgabe. Anschließend dieselben Aufgaben nachtesten; KI- und vollständige Dokumentabläufe benötigen zusätzlich einen tatsächlich verfügbaren Anbieter bzw. privaten Dateispeicher.
