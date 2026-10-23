> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Rollenbericht taxadvisor_a · Steuerberatung

Simulierter Black-box-Test am 23.10.2026 als Ute (58), externe deutsche Steuerberaterin mit internem Lesezugang „UX Ute Berg“. Desktop 1440 × 1000. Rund 52 Browserbefehle einschließlich Start und Schließen; Browser geschlossen. Keine Entwicklerprüfung, keine echte menschliche Nutzerstudie.

## Zielstatus

| Ziel | Ergebnis | Nachweis |
|---|---|---|
| G1: Oktoberübersicht, Zeitraum, Status, Währung, Quellen | **Teilweise.** 01.10.–31.10.2026 angewandt, EUR und Datenstand sichtbar. Definition des fakturierten Nettowerts erklärt. Einzelbelege und deren Status wegen fehlender Quellenfreigabe nicht prüfbar. | Oktoberübersicht (`evidence/taxadvisor_a/0002-1792761615000.png`), Quellensperre (`evidence/taxadvisor_a/0004-1792761662516.png`) |
| G2: Angebotene Datei tatsächlich herunterladen und verstehen | **Erreicht, mit enger Inhaltsgrenze.** Eine CSV der DATEV-Übergabenliste wurde wirklich heruntergeladen und auf ihren Umfang geprüft. Sie enthält nur vier Spaltentitel, keine Datenzeilen. Der vollständige Controlling-Export bleibt wegen fehlendem Dateispeicher blockiert. | Exportdialog (`evidence/taxadvisor_a/0007-1792761807414.png`), heruntergeladene CSV (`evidence/taxadvisor_a/1792761807092-datev.csv`), Speicherstatus (`evidence/taxadvisor_a/0006-1792761752372.png`) |
| G3: Position zum Ursprungsbeleg und zurück verfolgen | **Blockiert.** Rechnungs- und Auftragsquellen nicht freigegeben; lesbare Zahlungs- und Rechnungseingangslisten leer. Kein konkreter Beleg für einen vollständigen Nachvollzug vorhanden. Browser-Zurück erhält den Oktoberzeitraum. | Quellensperre (`evidence/taxadvisor_a/0004-1792761662516.png`) |

## Meine wichtigsten Beobachtungen

### F1 · P2 · Produkt: Quellenlinks versprechen mehr, als der Zugang öffnen darf

Ich wollte den fakturierten Nettowert zur Rechnungsgrundlage zurückverfolgen. Vor dem Klick auf „Quellenvorgänge öffnen“ erwartete ich eine lesbare Belegliste oder einen vorher erkennbaren Hinweis auf beschränkten Quellenzugriff. Stattdessen zeigte `/invoices?from=2026-10-01&to=2026-10-31&metric=invoiced_net&currency=EUR` „Dieser Bereich ist nicht freigegeben“ und „Dieser Bereich ist nicht verfügbar“. Einmal „Erneut laden“ änderte dies nicht. Als zweite fachliche Quelle wählte ich den beauftragten Nettowert von 2.400,00 €: Auch die gefilterte Auftragsliste war nicht freigegeben.

Die Sperre selbst ist kein nachgewiesener Fehler; ich habe sie respektiert. Die Hürde ist der uneingeschränkt angebotene Quellenweg aus einer für mich sichtbaren Kennzahl. Die Fehlerseite verwies zur Tagesübersicht, nicht zur gefilterten Auswertung. Mit Browser-Zurück gelang die Rückkehr und der Oktoberzeitraum blieb erhalten. Eine früh sichtbare Zugriffsangabe und ein direkter Rückweg würden unnötige Navigation vermeiden.

Belege: Kennzahlen mit Quellenlinks (`evidence/taxadvisor_a/0002-1792761615000.png`), Sperrseite nach erneutem Laden (`evidence/taxadvisor_a/0004-1792761662516.png`). Hohe Sicherheit über die Beobachtung; beabsichtigter Freigabeumfang unbekannt.

### F2 · P1 für die Dateiprüfung · Umgebung: Privater Dateispeicher fehlt

Ich öffnete „Gesicherte Stände & Übergabe an die Kanzlei“ und betätigte genau einmal „Auswertungsstand sichern“. Die App meldete einen eingefrorenen Berichtstand und die Verarbeitung des privaten Exportpakets. Später stand beim neuen Stand für 01.10.–31.10.2026 „Export benötigt eine Klärung“ mit der konkreten Erklärung: „Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Auch nach „Exportstatus aktualisieren“ gab es keinen Paketdownload.

Damit konnte ich diesen Auswertungsstand nicht als vollständige Datei prüfen. Die Meldung ist verständlich. Dies ist eine ausdrücklich benannte Umgebungsgrenze, kein Nachweis eines defekten Exports bei eingerichtetem Speicher. Für einen Wiederholungstest wäre ein bereitstehender privater Dateispeicher erforderlich.

Beleg: Gesicherter Stand mit Speicherhinweis (`evidence/taxadvisor_a/0006-1792761752372.png`). Route: `/reports?from=2026-10-01&to=2026-10-31`. Hohe Sicherheit.

### F3 · P2 · Produkt: Identische Datenlücken ohne betroffenen Vorgang

Unter „Daten & Grundlagen 36“ wollte ich die Prüfbarkeit der Zahlen einordnen. Viele aufeinanderfolgende Zeilen hießen identisch „Berechnungsgrundlage ergänzen“, „Interner Kostensatz fehlt. Auftragsmarge unvollständig.“ und „Prüfung erforderlich“. In diesen generischen Zeilen war kein betroffener Auftrag, keine Person und kein Quellenlink erkennbar. Spätere Restschätzungshinweise nannten dagegen konkrete Auftragsnummern und „Grundlage prüfen“.

Ich verstehe den Fehlertyp, kann daraus aber keine zugeordnete Rückfrage- oder Prüfliste erstellen. Die fehlenden Kostensätze sind ein Datenstatus; die unklare Zuordnung ist die Bedienhürde. Als Steuerberaterin würde ich einen konkreten betroffenen Kontext oder eine nachvollziehbar gebündelte Liste erwarten.

Beleg: Wiederholte Kostensatzhinweise (`evidence/taxadvisor_a/0005-1792761710053.png`). Route: Oktober-Auswertung, „Daten & Grundlagen“. Hohe Sicherheit.

## Weitere konkrete Reibung

**F4 · P3 · Produkt: Technische Spaltentitel in der CSV.** Die als „CSV · für Tabellenprogramme“ angebotene DATEV-Übergabenliste übernahm den Oktoberzeitraum. Nach erneuter eigener Anmeldung, „Exportdatei vorbereiten“ und echtem Klick auf „CSV herunterladen“ erhielt ich `datev.csv`. Der gesamte Inhalt ist die Kopfzeile `"name";"starts_on";"ends_on";"status"` (mit UTF-8-Markierung). Das lässt sich auf die sichtbaren Spalten „Bezeichnung“, „Belege ab“, „Belege bis“ und „Status“ beziehen, erfordert aber die Übersetzung technischer Feldnamen. Eine Inhaltsvorschau oder die Bezeichnung „Übergabenliste als CSV“ wäre vorher hilfreich. Es handelt sich nicht um Rechnungspositionen oder ein gefülltes Buchungspaket. Null Datenzeilen passen zu null sichtbaren Übergaben; auch nach Aufheben aller Filter gab es keine Einträge. Dialog (`evidence/taxadvisor_a/0007-1792761807414.png`), tatsächliche Datei (`evidence/taxadvisor_a/1792761807092-datev.csv`). Hohe Sicherheit.

**F5 · P3 · Sichtbare Produktunterbrechung, Ursache unklar:** Nach „Hier selbst ausprobieren“ auf der Auswertungsstation erschien auf der gesperrten Rechnungsseite erneut die Einführung mit Schritt 1. Beim Betätigen von „Für später schließen“ zeigte sie „Der Datensatz wurde inzwischen geändert. Aktuellen Stand laden und Änderungen prüfen.“ Ich konnte „Ohne Speichern schließen“ verwenden. Der Bezug des Datensatzes war für mich nicht erkennbar, und die Einführung verdeckte den eigentlichen Freigabehinweis. Der Konfliktzustand ist beobachtet; seine Ursache oder ein allgemeiner Speicherfehler wurden nicht untersucht. Screenshot (`evidence/taxadvisor_a/0003-1792761643022.png`). Mittlere Sicherheit der Einordnung.

## Was mir bei der Arbeit geholfen hat

Die Einführung lässt mich die Station „Auswertungen nachvollziehen“ direkt wählen. Der passende Arbeitsbereich ist schnell auffindbar. Der Einstieg, die Hauptansicht und die Ergebniszustände wurden visuell angesehen. Die Seite hat eine klare Hierarchie; Kennzahlen, Zeitraum und Währung sind gut auffindbar. Einige erklärende Texte sind klein, aber am geprüften Desktop lesbar. Einstieg (`evidence/taxadvisor_a/0001-1792761578843.png`).

Der angewandte Zeitraum wird zusätzlich unter den Eingabefeldern deutsch ausgewiesen. Das ist hilfreich, weil die nativen Datumsfelder in meinem Browserbild `10/01/2026` bzw. `10/31/2026` zeigten. Die Browserlokalisierung habe ich nicht untersucht und leite daraus keinen gesicherten Appfehler ab. Enter löste „Auswerten“ aus; Escape schloss den fertigen CSV-Exportdialog.

Die Definition des fakturierten Nettowerts nennt wirksam ausgestellte Rechnungen mit Berichtigungen sowie die Vermeidung einer Doppelzählung von Anzahlungen und Schlussrechnungen. Die Finanzübersicht erklärte außerdem die unterschiedliche Zeitgrundlage der Kennzahlen. Die Anzeige von 0,00 € wurde von mir nicht als betriebliche Wahrheit übernommen, da Belegbezug und Status nicht prüfbar waren.

Unter „Fälligkeit & Liquidität“ bleiben fehlender Anfangsbestand und erwarteter Bestand ausdrücklich „Noch nicht bestätigt“. Die App erklärt, dass Fälligkeitsszenarien keinen aktuellen Kontoauszug ersetzen. Das hilft bei der fachlichen Einordnung und vermeidet eine scheinbar sichere Summe. Liquidität mit offener Grundlage (`evidence/taxadvisor_a/0008-1792761925298.png`).

Die Hilfe zur Auswertung erklärt Zeitraum, Datenstand und Berechtigungen. Die geöffnete Frage „Warum sehe ich einen Bereich nicht?“ verweist für zusätzliche Rechte an den Superadmin und erklärt die persönliche Rollenbindung. Ich habe keine Geschäftsänderungsaktion verwendet. In den geprüften leeren Zahlungs- und Rechnungseingangslisten war kein Erstellen-Knopf sichtbar; ihre einleitenden Texte forderten dennoch allgemein zum Erfassen bzw. Hochladen auf. Eine ausdrücklich sichtbare Kennzeichnung meines Lesezugangs wäre eindeutiger als nur die Rollenbezeichnung „Steuerberatung“.

## Grenzen und Eingriffe

Dies war ein synthetischer Testbetrieb. Zahlungen, Rechnungseingang und DATEV-Übergaben enthielten für meinen Zugang keine Einträge. Rechnungsausgang und Aufträge waren nicht freigegeben. Diese Daten- und Freigabezustände begrenzen die vollständige Zielerreichung und sind nicht automatisch Produktdefekte. Die Liquidität hatte keinen bestätigten Bankanfangsbestand. Die fachliche Richtigkeit eines einzelnen Belegs oder eines gefüllten Exports konnte ich nicht prüfen.

Es wurde ausschließlich der angebotene interne Auswertungsstand gesichert. Die Anwendung vergab den Namen „Controlling 2026-10-01 bis 2026-10-31“ automatisch; es gab kein Namensfeld für einen eigenen UX-Präfix. Keine Buchung, Belegänderung, Freigabe, Abgabe, Integrationsänderung oder externer Versand. Kein Mobiltest. KI wurde nicht gestartet; keine KI-Antwortqualität behauptet. Sichtbare Prüfhinweise bezeichneten sich als regelbasiert und „keine KI-Schätzung“.

Neben den drei Testanweisungen wurden nur die sichtbare Anwendung, eigene Screenshots und die tatsächlich aus der UI heruntergeladene CSV betrachtet. Keine Sourcen, APIs, Datenbanken, Zugangsdaten oder fremden Berichte. Sämtliche acht aufgeführten Screenshots wurden selbst visuell angesehen. Die Zeitangabe des Beginns orientiert sich an der ersten gesicherten Aufnahme. Die maschinenlesbare Auswertung steht in [taxadvisor_a.json](taxadvisor_a.json).
