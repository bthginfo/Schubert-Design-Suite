# HR-Nachtest · hr_a · 23.10.2026

Unabhängiger Black-box-Nachtest als ursprüngliche HR-Testperson **UX Claudia Lang**, etwa 14:51–14:55 UTC. Ausschließlich Browser-ID `hr_a`, sichtbare UI und echte Klicks; keine Sourcen, APIs, Datenbanken oder fremden Berichte gelesen. 22 Browseraktionen. Desktop 1440 × 1000 und kurzer Sichtcheck bei 390 × 844. Keine Daten geändert, gelöscht, freigegeben oder zurückgegeben. Browserkontext geschlossen.

## Ergebnis

| Prüfpunkt | Status | Beobachtung und Evidenz |
| --- | --- | --- |
| Oberer Einstieg „Teamzeiten prüfen“ | Bestätigt | Auf `/time` ohne Scrollen sichtbar, mit Anzahl **1**. Ein Klick öffnet `/time?tab=review`; die Prüfliste steht direkt unter den Tabs. [Einstieg](../evidence/hr_a/0001-1792767085396.png), [Prüfliste](../evidence/hr_a/0002-1792767101490.png). |
| Lesbarer Fremdzeitnachweis und Tätigkeit | Bestätigt | „Abgabe prüfen“ zeigt Version, Zeitraum, Intervall, Arbeitszuordnung und „Tätigkeit: Allgemeines“. Die Daten sind fachlich beschriftet; der frühere JSON-Codeblock wird im angebotenen Nachweis nicht mehr gezeigt. [Desktopnachweis](../evidence/hr_a/0003-1792767108290.png). |
| Nachtragsgrund | Nicht belegbar: Datenlimit | Die einzige angebotene Abgabe ist UX Jonas Frank, 22.10.2026, Version 1, Tätigkeit „Allgemeines“. Darin ist kein Nachtragsgrund sichtbar. Ohne erkennbaren nachgetragenen Fall kann ich nicht unterscheiden, ob der Wert fehlt oder für diesen Datensatz nicht zutrifft. |
| Korrekturvergleich | Nicht belegbar: Datenlimit | Es wird nur diese eine reguläre Abgabe angeboten, kein Korrekturantrag. Im Prüfdialog gibt es keinen Vergleich bisheriger/beantragter Stand. Das belegt keinen Defekt der Korrekturansicht; ein geeigneter sichtbarer Testfall fehlt. |
| Personalhilfe | Bestätigt | „Hilfe zu dieser Seite“ führt zu `/help?from=time`. Die geöffnete Anleitung „Teamzeiten sachlich prüfen“ nennt den oberen Einstieg, tatsächliche Intervalle/Pausen, Tätigkeit/Anlass, Korrekturvergleich und Fremdprüfung. Die FAQ erklärt die Personalrolle und bestätigte Grundlagen. Suche „Korrektur“ findet genau diese Anleitung und FAQ. Der Hilfelink „Teamzeiten prüfen“ führt zur Prüfliste. [Hilfe und Suche](../evidence/hr_a/0009-1792767205288.png). |
| Abwesenheits-Zeitraumspalten | Überschriften bestätigt; Werte ungeprüft | Über „Alle Bereiche“ → „Urlaub & Abwesenheit“ öffnet `/leave`. Sichtbare Spalten: **Mitarbeiter, Art, Von, Bis, Arbeitstage, Status**. Die Übersicht zeigt **0 Einträge**; reale Zeilenwerte und mobile Kartenwerte sind daher nicht prüfbar. [Abwesenheitsübersicht](../evidence/hr_a/0010-1792767238800.png). |
| 390-Pixel-Ansicht | Bestätigt für Prüfliste und normalen Nachweis | Der obere Tab, die Anzahl und „Abgabe prüfen“ sind erreichbar. Der Nachweis verwendet Karten, lesbare Zeitangaben und eine sichtbare Tätigkeit. Keine horizontal abgeschnittenen Inhalte in den angesehenen Bereichen. Escape schließt den unveränderten Dialog. [Mobile Prüfliste](../evidence/hr_a/0006-1792767165520.png), [mobiler Nachweis](../evidence/hr_a/0004-1792767146692.png). |

## Verbleibende Reibung und Grenzen

- **Kleine Begriffsreibung:** Auch im Tab „Teamzeiten prüfen“ bleiben Seitentitel „Meine Arbeitszeit“, die Einleitung zur eigenen Erfassung und die Aktion „Zeit nachtragen“ stehen. Die neue Tab-Beschriftung macht die Aufgabe dennoch deutlich; kein Blocker beobachtet.
- **Kleine Inkonsistenz:** Im Desktopnachweis bezeichnet die Intervalltabelle den fehlenden Auftrag als „Betriebliche Arbeit · ohne Auftrag“, die Arbeitszuordnung darunter zeigt dafür noch „—“. Mobil ist die ausdrückliche Bezeichnung lesbar.
- Die drei Datenlimits (Nachtragsgrund, Korrekturfall, leere Abwesenheitsliste) wurden während des Tests unmittelbar an den Parent gemeldet. Keine Aussage zur nicht angebotenen Ansicht oder zu nicht vorhandenen Zeilen erfunden.
- Die Freigabe blieb ohne Begründung und Prüfbestätigung deaktiviert. Beides blieb unberührt. Genehmigungswirkungen wurden entsprechend dem Auftrag nicht getestet.

**Fazit:** Der obere HR-Einstieg, der normale lesbare Nachweis und die Personalhilfe sind sichtbar verbessert und bedienbar. Nachtragsgrund, Korrekturvergleich und gefüllte Abwesenheitszeilen bleiben bis zu passenden sichtbaren Testdaten offen. Kein Produktblocker in den tatsächlich ausführbaren Prüfschritten beobachtet.

## Vertiefter Durchgang · 15:28–15:31 UTC

Erneut nur sichtbare UI mit `hr_a`, 18 Browseraktionen. Desktop 1440 × 1000 und mobil 390 × 844. Der zuletzt erteilten Anweisung entsprechend nach der ausdrücklich erlaubten Jan-Rückgabe geschlossen; die Abwesenheitsdetailprüfung bleibt für den nächsten Durchgang offen.

**Prüfrolle bestätigt:** `/time?tab=review` trägt jetzt die H1 **„Teamzeiten prüfen“** und die passende Einleitung „Prüfen Sie eingereichte Zeiten, Tätigkeiten und Rückfragen. Eigene Zeiten erfassen Sie im Reiter Meine Arbeitszeit.“ Die eigene Nachtragsaktion steht hier nicht mehr. [Desktopansicht](../evidence/hr_a/0001-1792769312905.png), [mobile Prüfansicht](../evidence/hr_a/0008-1792769434739.png). Der Browsertitel lautet weiterhin „Meine Zeit · SCHUBERT“; die sichtbare H1 passt zur Aufgabe.

**Jans Nachweis tatsächlich gesichtet:** „Abgabe prüfen“ bei **UX Jan Richter, 22.10.2026, Version 1** zeigt drei Sitzungen. Die sichtbaren Intervalle ergeben 4:35 Stunden Arbeit und 0:25 Stunden Pausen. Der letzte Zeitraum ist 14:00–14:30 mit lesbarer Tätigkeit **Montage** und benanntem Auftrag. Tabellen auf Desktop und Karten auf dem Handy sind lesbar. [Nachweis oben](../evidence/hr_a/0002-1792769322768.png), [letzte Sitzung Desktop](../evidence/hr_a/0003-1792769337570.png), [letzte Sitzung mobil](../evidence/hr_a/0004-1792769377191.png).

**P2 Produktbeobachtung – Nachtragsgrund weiterhin unsichtbar:** Für genau diesen angekündigten Nachtrag erscheint weder der Textbeginn „UX Releaseprüfung employee_b · Nachtrag wegen fehlender Netzverbindung“ noch ein anderer Anlass. Nach den Arbeitszuordnungen folgen „Tätigkeit: Montage“, die Intervallzählung und die Entscheidung. Auch die vollständige sichtbare Dialoginspektion enthält keinen Nachtragsgrund. Desktop und mobile Evidenz siehe letzte Sitzung oben. Dies ist jetzt ein beobachteter fehlender Inhalt im bereitgestellten Fall, kein bloßer Leerbestand wie im ersten Nachtest. Unmittelbar an den Parent gemeldet; keine technische Ursache selbst untersucht.

**Erlaubte Tagesrückfrage erfolgreich gespeichert:** Nach Sichtung der drei Sitzungen ausschließlich für Jan am 22.10.2026 „Mit Rückfrage zurückgeben“ gewählt. Exakt eingetragener Grund:

> UX Releaseprüfung · Bitte für den synthetischen Vergleich das Ende des letzten Nachtrags prüfen; keine echte Arbeitsleistung

Die bewusste Prüfbestätigung wurde gesetzt; erst danach war der Rückgabe-Button aktiv. [Vor Absenden](../evidence/hr_a/0006-1792769414175.png). Einmal abgesendet. Die App meldet **„Die geprüfte Zeitentscheidung wurde verbindlich gespeichert.“**, die offene Anzahl sinkt von 2 auf 1 und Jan verschwindet aus der Prüfliste. [Gespeichertes Ergebnis](../evidence/hr_a/0008-1792769434739.png). Sofort an den Parent gemeldet. Keine Genehmigung ausgeführt und keinen anderen Tag verändert.

**Offen:** Korrekturvergleich setzt den anschließend vom Employee zu erstellenden regulären Antrag voraus. Der neue Abwesenheitsfall Jan/26.10. wurde in diesem Durchgang nach der letzten Anweisung noch nicht geöffnet. Browserkontext um **15:30:51 UTC** geschlossen; sämtliche oben verlinkten Screenshots wurden selbst angesehen.

## Abschließender Durchgang nach Anlass-Fix · 15:37–15:41 UTC

20 ausschließlich lesende Browseraktionen mit `hr_a`, 1440 × 1000 und 390 × 844. Keine neue fachliche Änderung oder Genehmigung. Alte Fehlerbeobachtung oben bleibt als **Stand vor dem Fix** erhalten; die alte Tagesabgabe vom 22.10. wurde hier nicht erneut geöffnet.

**Neuer gespeicherter Nachweis: bestanden.** Bei UX Jan Richter, **21.10.2026, 14:00–14:10, Montage** ist unter „Anlass / Hinweis“ exakt lesbar:

> UX Releaseprüfung · neuer Nachweis mit gebundenem Nachtragsanlass; keine echte Arbeitsleistung

Dies steht im geöffneten gespeicherten Prüfnachweis, nicht nur in einer Eingabemaske. Auf Desktop und bei 390 Pixeln vollständig sichtbar und lesbar. [Desktop](../evidence/hr_a/0003-1792769896268.png), [mobil](../evidence/hr_a/0004-1792769909450.png). Der zuvor fehlende Anlass ist für den neu eingereichten Fall damit belegt behoben.

**Korrekturvergleich: Stände und Zuordnung bestätigt, Antragsbegründung im Dialog offen.** „Korrektur prüfen“ öffnet Jans beantragte Änderung vom **22.10.**: „Bisheriger Stand“ 14:00–14:30 und „Beantragter Stand“ 14:00–14:35 stehen auf Desktop nebeneinander. Beide zeigen Auftrag **AUF-2026-00014 · UX employee_b · Montage Testweg**, Tätigkeit **Montage** und den ursprünglichen Nachtragsanlass. Der betroffene Nachtrag zeigt einen Arbeitsblock ohne Pausenintervall; ein Korrekturvergleich mit vorhandenen Pausen ist dadurch nicht abgedeckt. [Vergleich](../evidence/hr_a/0006-1792769948055.png).

**Verbleibende Abweichung:** Die eigentliche Antragsbegründung „UX Releaseprüfung · synthetischer Korrekturvergleich, Ende plus5Minuten“ ist in der Prüfliste lesbar, wird im geöffneten Vergleich jedoch nicht wiederholt. Dort stehen der Anlass der Sitzung und das leere Feld für die spätere HR-Begründung. Für die erneute Lektüre der Antragsbegründung müsste ich den Dialog schließen. [Prüfliste mit Begründung](../evidence/hr_a/0001-1792769875919.png), [unterer Dialogbereich](../evidence/hr_a/0007-1792769983878.png). Sofort an den Parent gemeldet; der danach angekündigte Dialogfix ist durch diesen Durchgang nicht geprüft. Begründungsfeld, Prüfcheckbox und Freigabe blieben unberührt.

**Abwesenheit: bestanden.** Liste zeigt **UX Jan Richter**, **Sonstiges**, **26.10.2026–26.10.2026**, **1**, **Beantragt**. Detail-H1 lautet **„UX Jan Richter · Sonstiges“**; Mitarbeiter ist lesbar verlinkt, Art/Von/Bis und Arbeitstage **1** sind ausdrücklich beschriftet. Keine UUID als fachlicher Inhalt und keine Anzeige `1.000000`. [Liste](../evidence/hr_a/0008-1792770014484.png), [Detail](../evidence/hr_a/0009-1792770031477.png). Genehmigen, Ablehnen und Bearbeiten wurden nicht ausgelöst.

Alle oben verlinkten neuen Screenshots wurden selbst angesehen. Browserkontext um **15:40:44 UTC** geschlossen und Abschluss an den Parent gemeldet. Keine Produktblockade beim lesenden Ablauf; der fehlende Antragsgrund im Vergleich bleibt die konkret belegte Restabweichung dieses Standes.

## Nachprüfung des letzten Dialogfixes · 15:44 UTC

**Bestätigt behoben:** Bei „Korrektur prüfen“ für UX Jan Richter am 22.10.2026 steht jetzt im geöffneten Dialog direkt vor „Bisheriger Stand“ und „Beantragter Stand“ vollständig **„Begründung des Korrekturantrags: UX Releaseprüfung · synthetischer Korrekturvergleich, Ende plus5Minuten“**. Die Begründung und der Vergleich 14:30 → 14:35 sind damit gemeinsam lesbar. [Screenshot tatsächlich angesehen](../evidence/hr_a/0001-1792770259222.png). Ausschließlich geöffnet und gelesen, keine fachliche Aktion; Browser anschließend geschlossen. Die vorherige Restabweichung bleibt oben als Beobachtung vor diesem Fix dokumentiert.
