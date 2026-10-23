# Black-box-Nachtest · taxadvisor_a · Steuerberatung

23.10.2026, etwa 16:32–16:46 Europe/Berlin. Rolle „UX Ute Berg / Steuerberatung“, Desktop 1440 × 1000, lokale Oberfläche auf Port 5173. Rund 64 Browserbefehle einschließlich Start und Schließen. Kontext geschlossen. Keine Buchung, Freigabe, Originaländerung, Integrationsänderung oder externe Übermittlung; vorhandene Daten behalten. Die einzige heruntergeladene Datei ist ein angebotener Listenexport.

**Ergebnis des abschließenden Durchlaufs:** Kennzahlen- und Monatsquellen sind für den begrenzten Nachweis zugänglich. Die Rechtebegrenzung bleibt sichtbar, die vollständige Rechnungsansicht bleibt gesperrt. Kostensatzhinweise und CSV-Spalten sind verbessert. Die Einführung öffnet sich nach den getesteten Sprüngen nicht mehr selbst. **Offen bleibt ein P2-Kontextverlust beim Quellenlink aus einer Kostentabelle.**

## Welche Änderungen ich tatsächlich nachbenutzt habe

| Prüffall | Abschließendes Ergebnis | Sichtbarer Nachweis |
|---|---|---|
| Beauftragter Nettowert → Quelle | **Bestanden.** Aus „Entwicklung“ öffnet der Kennzahlenklick direkt „Quellennachweis · Aufträge“. Nummern, Status, Nettowerte und EUR sind lesbar. Kein zusätzlicher manueller Tabwechsel mehr erforderlich. | [Auftragsnachweis nach direktem Klick](../evidence/taxadvisor_a/01-kpi-quellennachweis.png) |
| Fakturierter Nettowert → Quelle | **Bestanden für Navigation und Leerzustand.** Aus „Entwicklung“ öffnet der Kennzahlenklick direkt „Quellennachweis · Rechnungen“. Meldung: „Für diese Filter liegen keine Quellen vor. Prüfen Sie Zeitraum und Geschäftsbereich.“ | Derselbe begrenzte Rechnungsnachweis wie beim [Monatsklick](../evidence/taxadvisor_a/02-monatsbalken-rechnung.png) |
| Einzelner Oktoberbalken | **Bestanden.** Sowohl „10.2026: 0,00 €. Belege öffnen.“ bei Rechnungen als auch „10.2026: 2.800,00 €. Belege öffnen.“ beim beauftragten Nettowert erreichen den passenden Quellennachweis innerhalb der Auswertung. | [Rechnungsmonat](../evidence/taxadvisor_a/02-monatsbalken-rechnung.png); Auftragsmonat zusätzlich per sichtbarem Klick und anschließender Inspektion nachbenutzt |
| Kostenarten eines Einzelauftrags → Quelle | **Teilweise.** Auftragskosten → AUF-2026-00008 aufklappen → „Auftrag und Ursprungsbelege“ öffnet genau den ausgewählten Auftrag in begrenzter Lesesicht. Der Berichtzeitraum wird dabei zurückgesetzt; siehe RT1. | [Kostenarten und Quellenlink](../evidence/taxadvisor_a/04-kostentabelle.png), [Einzelquelle mit geändertem Zeitraum](../evidence/taxadvisor_a/05-kostenquelle-zeitraumverlust.png) |
| Kostensatzwarnungen | **Bestanden für die geforderte Zuordnung.** Beispiel: „Kostensatz fehlt · Isolierte Zeitprüfung“, Zeitraum 2026-10-23 bis 2026-10-23, „Betriebliche Arbeit ohne Auftragsbezug.“ Danach folgt ein konkreter nächster Schritt für die Personalverwaltung und die erneute Kostenprüfung. | [Hinweise mit Betroffenem, Zeitraum und Prüfschritt](../evidence/taxadvisor_a/03-kostensatzhinweise.png) |
| Deutsche CSV-Spalten | **Bestanden.** Erneute Anmeldung über den angebotenen Dialog, „Exportdatei vorbereiten“ und echter Download von „CSV herunterladen“. Die heruntergeladene Kopfzeile lautet „Bezeichnung“;„Belege ab“;„Belege bis“;„Status“. | [Downloadzustand](../evidence/taxadvisor_a/06-csv-download.png), [tatsächlich heruntergeladene CSV](../evidence/taxadvisor_a/datev-uebergaben-oktober.csv) |
| Keine ungefragte Einführung / kein Versionskonflikt | **Bestanden im abschließenden Durchlauf.** Keine Einführung bei Kennzahlen-, Monats- und Kostenquellensprüngen oder bei der folgenden DATEV-Navigation. Auch die erneut vollständig aufgerufene frühere Rechnungsroute blieb ohne Einführungsmodal. Ich habe die Einführung nicht freiwillig neu gestartet. | [Gesperrter Fachbereich ohne Einführung](../evidence/taxadvisor_a/07-rechnungsbereich-gesperrt-ohne-einfuehrung.png) |

## RT1 · P2 · Offen: Kostenquellenlink verliert den ausgewählten Zeitraum

**Mein Ziel:** In der Oktoberprüfung eine Kostenübersicht zu ihrem Einzelauftrag verfolgen, ohne den zeitlichen Prüfungskontext zu verlieren.

**Erwartung vor dem Klick:** Der ausgewählte Einzelauftrag erscheint im begrenzten Nachweis und der Bericht bleibt auf 01.10.–31.10.2026 eingestellt.

**Tatsächlicher Weg:**

1. Auswertung mit angewandtem Zeitraum 01.10.2026 bis 31.10.2026 öffnen.
2. „Auftragskosten“ wählen.
3. „AUF-2026-00008 · Synthetischer Angebotsablauf“ aufklappen und Kostenarten lesen.
4. „Auftrag und Ursprungsbelege“ betätigen.
5. Nach Abschluss des Seitenwechsels Quelle und angewandten Zeitraum prüfen.

**Beobachtung:** Der Quellenlink führt zu `/reports?tab=sources&source=orders&source_id=1f05e5ed-80cb-42fd-a3a7-ed5a2c090404`. Die Quelle zeigt korrekt nur AUF-2026-00008 mit 200,00 € und dem sichtbaren Status „Entwurf“. Der Kopf der Auswertung zeigt nun aber **23.10.2025 bis 23.10.2026**, und auch die beiden Datumsfelder enthalten diesen Standardzeitraum. Zuvor war **01.10.2026 bis 31.10.2026** angewandt. Die zugehörigen Kennzahlen-Quellenlinks übernehmen anschließend den zurückgesetzten Zeitraum.

**Auswirkung:** Ich muss einen unbestellten Zeitraumwechsel erkennen. Für eine Monatsprüfung kann der Kopf dadurch nicht mehr ohne Weiteres mit meinem vorherigen Prüfstand verglichen werden. Die eigentliche Quelle bleibt erreichbar; es ist kein Zugriffsblocker.

**Empfehlung aus meiner Rolle:** Den gewählten Zeitraum beim Quellenwechsel erhalten oder eine bewusst abweichende Zeitgrundlage deutlich erklären. Browser-Zurück stellte den Oktoberzeitraum wieder her; das ersetzt den verständlichen Kontext im Nachweis nicht.

Hohe Sicherheit. Belege: [Kostentabelle und Link vor Wechsel](../evidence/taxadvisor_a/04-kostentabelle.png), [Quelle und Standardzeitraum danach](../evidence/taxadvisor_a/05-kostenquelle-zeitraumverlust.png). Der Befund wurde unmittelbar an den Parent gemeldet und ist für die nächste Korrekturrunde vorgesehen.

## Einordnung des begrenzten Zugriffs

Der neue Nachweis sagt ausdrücklich: „Begrenzte Lesesicht zu den gesetzten Filtern. Ihre Rolle erhält dadurch keine Bearbeitungsrechte im Fachbereich.“ In der Tabelle waren keine Bearbeitungs- oder Freigabeaktionen sichtbar. Die vorher durch den Monatslink beobachtete vollständige Route `/invoices?from=2026-10-01&to=2026-10-31&metric=invoiced_net&currency=EUR` wurde nach dem Neuladen erneut im Browser aufgerufen. Sie meldete weiterhin „Dieser Bereich ist nicht freigegeben“. Dabei erschien keine Einführung mehr. Das spricht im geprüften sichtbaren Weg für einen begrenzten Nachweis statt einer pauschalen Öffnung des Rechnungsbereichs. Es ist keine Aussage über sämtliche Berechtigungen außerhalb dieses Black-box-Tests.

Die Kostentabelle unterscheidet „Noch nicht bestätigt“ und 0,00 € weiterhin erkennbar. Für AUF-2026-00008 waren Plan und Rest nicht bestätigt, Istkosten 0,00 €. Die zugehörige Restschätzung fehlte sichtbar. Ich habe keine Grundlage ergänzt oder bestätigt.

## Frühe Befunde in dieser Sitzung und erneute Prüfung nach Korrektur

Zu Beginn derselben Nachtestsitzung bestanden noch drei konkrete Hürden: Der Auftrags-Kennzahlenklick änderte die URL, ließ aber „Entwicklung“ offen; der Monatsbalken führte noch in die gesperrte Rechnungsansicht; dort erschien die Einführung erneut und meldete beim Pausieren den bekannten Datensatzkonflikt. Diese Beobachtungen wurden sofort gemeldet.

Nach ausdrücklicher Mitteilung des Parents, dass die Korrekturen vorliegen, habe ich die bereits beobachtete aktuelle Auswertungs-URL mit Browser-`goto` vollständig neu aufgerufen. Dadurch erfolgte ein neuer Dokumentaufbau. Erst der danach durchgeführte Durchlauf ist Grundlage der oben als bestanden markierten Sprung- und Einführungstests. Der vorherige Versuch mit Strg+R allein wurde nicht als ausreichender Nachweis eines neuen Dokumentaufbaus verwendet.

Die frühen Aufnahmen sind zur Trennung der Stände erhalten, **keine offenen Schlussbefunde**: [Kennzahl ohne Tabwechsel](../evidence/taxadvisor_a/vor-korrektur-kpi-kein-tabwechsel.png), [alter Monatsweg mit ungefragter Einführung](../evidence/taxadvisor_a/vor-korrektur-monat-gesperrt-mit-einfuehrung.png), [damaliger Konflikt](../evidence/taxadvisor_a/vor-korrektur-einfuehrung-konflikt.png). Ein beim laufenden Oberflächenwechsel nicht mehr vorhandener Schließen-Knopf führte zu einem Locator-Timeout; danach wurde die sichtbare Oberfläche geprüft. Dieser Werkzeugfehler wird nicht als Produktdefekt gewertet.

## Grenzen

- Für Oktober waren keine Rechnungsquellen und keine DATEV-Übergaben sichtbar. Die neue CSV enthält deshalb nur ihre deutsche Kopfzeile. Ich bestätige Navigation, Umfang und Spalten, keine Datenzeilen oder Originalbelege.
- Der private Controlling-Dateispeicher wird in der vorhandenen Exportliste weiterhin als nicht eingerichtet benannt. Es wurde im Nachtest kein weiterer Controlling-Stand angelegt. Diese bekannte Umgebungsgrenze ist von den geprüften CSV- und Quellenänderungen getrennt.
- Während der lesenden Sitzung wechselten sichtbare Gesamtsummen und Hinweisanzahlen, etwa von 2.400,00 € / 36 Hinweisen zu 3.000,00 € / 45 Hinweisen. Keine Aussage zur Betragsstabilität oder fachlichen Richtigkeit daraus abgeleitet; ich habe diese Daten nicht geändert.
- Mehrere Kostensatzhinweise mit gleichem Betroffenen und Tag bleiben optisch ähnlich. Die geforderte Kontextinformation ist nun vorhanden; eine Zuordnung bis zu einzelnen Zeitzeilen wurde nicht verlangt oder geprüft.
- Keine Quellen, APIs, Datenbank, Zugangsdaten oder fremden Berichte gelesen. Betrachtet wurden die sichtbare Oberfläche, eigene Screenshots und ausschließlich die über die UI heruntergeladene CSV. Keine Codeänderungen, kein Build, keine KI oder echte Anbieterfunktion behauptet. Kein Mobiltest.

Die verlinkten Screenshots wurden selbst visuell angesehen. Der Browserkontext wurde nach der Interaktion geschlossen. Zeitpunkt der Berichtsfertigstellung (UTC): 2026-10-23T14:47:46+00:00.

## Gezielter Abschlussnachtest · 23.10.2026, 15:18–15:22 UTC

Erneut ausschließlich als `taxadvisor_a` über die sichtbare Oberfläche. Keine fachlichen Daten geändert, keine Datei neu heruntergeladen und keine KI-Anfrage ausgelöst. Der Browserkontext wurde anschließend geschlossen. Die früheren Beobachtungen oben bleiben als Verlauf erhalten; die folgenden Ergebnisse aktualisieren ihren Schlussstand.

**RT1 ist im geprüften Weg behoben.** Ich stellte den Berichtszeitraum über die Datumsfelder auf **01.10.–31.10.2026**, wertete aus und öffnete unter **Auftragskosten** denselben Auftrag **AUF-2026-00008 · Synthetischer Angebotsablauf**. Der Link **Auftrag und Ursprungsbelege** führte zu:

`/reports?from=2026-10-01&to=2026-10-31&tab=sources&source=orders&source_id=1f05e5ed-80cb-42fd-a3a7-ed5a2c090404`

Nach dem Wechsel blieben beide Datumsfelder und der angewandte Zeitraum im Kopf auf Oktober. Die begrenzte Quelle zeigte weiterhin genau diesen Auftrag, Status **Entwurf**, **200,00 €**, **EUR**, ohne Bearbeitungsaktionen. Die Quelle war unmittelbar sichtbar; keine Einführung öffnete sich. [Tatsächlich visuell geprüfter Einzelquellennachweis mit erhaltenem Zeitraum](../evidence/taxadvisor_a/0001-1792768810300.png).

**Geschäftsbereich bei Kennzahl und Monatsbalken erhalten.** Ich wählte **Naturstein & Fliese** und wertete den Oktober erneut aus. Ein Klick auf **Beauftragter Nettowert** führte zum Auftragsnachweis mit `from=2026-10-01`, `to=2026-10-31` und `business_unit=stone`; Auswahl und angewandter Kopf behielten **Naturstein & Fliese**. [Geprüfter Kennzahlensprung](../evidence/taxadvisor_a/0002-1792768855292.png). Anschließend öffnete ich **Entwicklung** und den Rechnungsbalken **10.2026: 0,00 €. Belege öffnen.**. Er führte zum begrenzten Rechnungsnachweis mit denselben Zeit- und Geschäftsbereichsparametern, zusätzlich `metric=invoiced_net`, `currency=EUR`, `source=invoices`. [Geprüfter Monatssprung](../evidence/taxadvisor_a/0003-1792768876224.png).

**Datenbedingte Grenze:** Die beiden geprüften einzelnen Geschäftsbereiche **Naturstein & Fliese** und **Grabdenkmale** boten keinen Auftragskostenstand. Deshalb ist die Kombination „konkreter Kostenauftrag plus einzelner Geschäftsbereich“ nicht anhand einer gefüllten UI-Quelle belegt. Der konkrete Kostenauftrag wurde mit **Alle berechtigten Bereiche** geprüft. Kennzahl und Monatsbalken mit `business_unit=stone` erreichten einen ausdrücklich erklärten Leerzustand; das belegt deren Navigation und Kontexterhalt, keine vorhandenen Belege oder fachliche Vollständigkeit. Kein neuer Produktfehler beobachtet.
