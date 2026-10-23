# Blackbox-Nachtest · workshop_b

**Datum/Zeit:** 23.10.2026, 14:51:34–14:56:19 UTC (16:51–16:56 Uhr Deutschland).

**Rolle:** UX Mira Braun, Steinmetzgesellin am Smartphone.

**Ansicht:** 390 × 844 px, lokale App auf `http://127.0.0.1:5173`.

**Umfang:** 34 Browseraktionen, ausschließlich Browser-ID `workshop_b`; Browserkontext am Ende geschlossen. Simulierte Rollenprüfung, keine menschliche Nutzerstudie.

Der Appcode sollte laut Auftrag während des Nachtests unverändert bleiben. Ich habe keinen Code, keine API und keine Datenbank gelesen oder geändert.

## Ergebnis

| Prüfziel | Ergebnis | Beobachtung |
| --- | --- | --- |
| Arbeitsauftrag: Maße und Prüfhinweis schnell finden | Bestätigt | Die Notizen mit zwei Fensterbänken à 1200 × 250 × 30 mm und „keine Fertigungsfreigabe“ stehen jetzt vollständig im ersten mobilen Ausschnitt. |
| Arbeitspaket: Arbeitsanweisung und Status finden | Teilweise | Abschlusskriterium, Kante poliert, 2 Sollstunden und Status Offen sind vorhanden. Arbeitsanweisung und Status liegen unter Rückmeldeformular, letzten Rückmeldungen und weiteren Angaben. |
| Eigene Arbeitsrückmeldung direkt am Paket | Bestätigt | Eigener Auftrag vorausgewählt; neue eigene Testnotiz gespeichert, bestätigt und nach Wechsel der Ansicht sowie erneutem Öffnen weiterhin sichtbar. |
| Verknüpftes Dokument mit tatsächlichem Prüf-/Quarantänestand | Durch sichtbaren Datenbestand begrenzt | Sowohl eigenes Paket als auch eigener Auftrag zeigen 0 verknüpfte Dokumente. Die allgemeine Quarantäneerklärung ist sichtbar; kein konkretes Dokument zur Prüfung vorhanden. Grenze sofort an den Parent gemeldet. |
| Bestehende eigene Materialreservierung | Daten sichtbar; mobiler Erstblick unvollständig | Genau eine aktive Reservierung der eigenen Testplatte mit eigenem Auftrag, Menge 1 und Einheit Stück in der Lagerakte. Die Einheitenspalte liegt rechts außerhalb des ersten sichtbaren Tabellenausschnitts. |
| Mengeneinheit im Reservierungsdialog vor Bestätigung | Bestätigt | Feld heißt ausdrücklich „Reservierte Menge (Stück) *“. Dialog ohne Eingabe/Buchung mit Escape geschlossen. |
| Zeitansichten: Umbrüche und abgeschnittene Spalten | Bestätigt für bestehende eigene Sitzung | Bestätigte Arbeitszuordnung und Originalintervalle als Karten; Auftrag, Tätigkeit und Von/Bis mit Sekunden vollständig lesbar. |
| Assistent über Arbeitsinhalt | Im geprüften mobilen Ausschnitt behoben | Keine schwebende Überdeckung von Text/Feldern in Auftrag, Paket, Reservierungsdialog und Zeitkarten beobachtet. Am Seitenende ist die Assistent-Aktion teilweise unter der festen Fußnavigation. |

## Konkrete Arbeitsfolge und Evidenz

### Auftrag und Arbeitspaket

Über Heute → eigener Einsatz öffnete ich Auftrag AUF-2026-00016 „UX workshop_b · Fensterbänke Testweg“. Im ersten 390-px-Ausschnitt stehen nun die Notizen unmittelbar am Anfang der Übersicht: zwei Fensterbänke, jeweils 1200 × 250 × 30 mm, vor Ort Maße prüfen, keine Fertigungsfreigabe. Das ist gegenüber dem Ersttest ein deutlich kürzerer Weg zur Maßkontrolle.

Evidenz: [Auftrag mit sichtbarem Prüfhinweis](../evidence/workshop_b/0002-1792767105184.png).

Im eigenen Arbeitspaket WOR-2026-00004 „Kanten bearbeiten“ erscheint direkt nach den Reitern das Formular „Was wurde erledigt?“. Ich habe dort folgende eigene Rückmeldung ohne Leistungsmenge gespeichert:

> UX workshop_b · Nachtest am Arbeitspaket: Arbeitsanweisung und Status am Smartphone geprüft. Zwei Fensterbänke 1200 × 250 × 30 mm; Maße vor Ausführung weiterhin vor Ort zu prüfen. Keine Fertigung oder Freigabe, nur synthetische UI-Prüfung vom 23.10.2026.

Die App bestätigte „Ihr Bericht und die angegebene Leistungsmenge wurden gespeichert“. Der Text erschien in „Meine letzten Rückmeldungen“ und der Tabelle „Arbeitsrückmeldungen“, deren Zähler von 1 auf 2 stieg. Nach Dokumentenreiter, weiteren Seiten und erneutem Öffnen des Pakets blieb der Eintrag sichtbar. Er erscheint außerdem in Meine Zeit mit dem eigenen Auftragsnamen. Im Paket tragen die letzten Rückmeldungskarten als Überschrift jeweils nur „—“; der Text selbst ist lesbar.

Evidenz: [erster mobiler Paketausschnitt](../evidence/workshop_b/0003-1792767116060.png), [gespeicherte Rückmeldung und Anweisung darunter](../evidence/workshop_b/0005-1792767164170.png), [Paketstatus nach erneutem Öffnen](../evidence/workshop_b/0017-1792767362915.png).

**Verbleibende Reibung R1 / P2:** Beim Öffnen des Arbeitspakets wollte ich zuerst wissen, was zu tun ist und welchen Stand die Arbeit hat. Stattdessen liegen das gesamte Rückmeldeformular und die bisherigen Rückmeldungen vor dem Abschlusskriterium. Der Status Offen folgt zusätzlich unter der langen Rückmeldungstabelle. Die Anweisung „Maße vor Ausführung prüfen … Kante poliert. Keine Ausführung oder Freigabe“ ist nach Scrollen gut lesbar; die schnelle Erstorientierung am Paket bleibt umständlich. „Beginnen“ oder „Fertig melden“ habe ich nicht ausgelöst.

### Dokumentenstand und Quarantäne

Ich öffnete Dokumente zuerst am Paket, anschließend am zugehörigen eigenen Auftrag. Beide Ansichten zeigen „Verknüpfte Dokumente 0“ und „Noch keine Dokumente verknüpft“. Der Upload erklärt, dass Dateien privat in Quarantäne gespeichert und vor der weiteren Nutzung geprüft werden.

**Abdeckungsgrenze D1:** Es gab in diesen beiden eigenen Akten kein verknüpftes Original, dessen konkreter Scan-/Quarantänestatus, Öffnen oder Download sich prüfen ließ. Daher keine Aussage, dass Dokumente verfügbar oder geprüft seien. Keine Datei hochgeladen und keine Dokumentfreigabe ausgelöst. Die Grenze wurde während des Nachtests an den Parent gemeldet.

Evidenz: [Paket-Dokumentenansicht](../evidence/workshop_b/0006-1792767174659.png), [eigener Auftrag ohne verknüpfte Dokumente](../evidence/workshop_b/0008-1792767232432.png). Die zugehörigen Browser-Snapshots enthalten die allgemeine Quarantäneerklärung und die angezeigten Zähler.

### Bestehende Materialreservierung

Über Mehr → Einkauf & Lager öffnete ich ausschließlich „UX workshop_b · Naturstein-Testplatte“, MAT-2026-00003. Die Lagerakte zeigt weiterhin Rohplatte, 1300 × 600 × 30 mm, Menge 1, Einheit Stück, Status Reserviert, Version 2.

Unter Reservierungen steht genau ein aktiver Eintrag mit:

- Bestand „UX workshop_b · Naturstein-Testplatte“
- Menge 1
- Auftrag „AUF-2026-00016 · UX workshop_b · Fensterbänke Testweg“
- Einheit Stück

Damit ist die bestehende eigene Reservierung jetzt direkt in der Lagerakte nachvollziehbar. Ich habe keine weitere Reservierung angelegt oder vorhandene Menge verändert.

**Verbleibende Reibung R2 / P3:** Bei 390 px zeigt der erste sichtbare Tabellenausschnitt Name, Status, Menge und Auftrag. Die fünfte Spalte Einheit ist rechts nicht sichtbar. Der Browser-Snapshot enthält „Stück“; eine dauerhafte Unerreichbarkeit ist damit nicht belegt. Seitliches Wischen wurde mit diesem Harness nicht geprüft. Für eine schnelle mobile Prüfung ist die Einheit nicht zusammen mit der Menge im ersten Ausschnitt lesbar.

Evidenz: [Reservierung in mobiler Lagerakte](../evidence/workshop_b/0010-1792767254426.png); Browser-Snapshot dieser Aktion enthält alle fünf Spalten.

Ich öffnete Material reservieren ausschließlich zur Prüfung vor einer Buchung. Das Feld heißt nun **„Reservierte Menge (Stück) *“**. Objektname, Version 2 und Status Reserviert sind im Dialog sichtbar. Ich schloss ihn mit Escape, ohne Auftrag, Menge oder Bestätigung anzufassen.

Evidenz: [Dialog mit konkreter Stückeinheit](../evidence/workshop_b/0011-1792767263197.png). Der frühere Befund zur fehlenden Mengeneinheit im Dialog ist für diese Ansicht behoben.

### Mobile Zeitansichten und Assistent

In Meine Zeit prüfte ich die bereits bestehende eigene 29-Sekunden-Sitzung vom 23.10.2026, 15:00:19–15:00:48. Die bestätigte Arbeitszuordnung zeigt den langen Auftragsnamen mit Umbruch, Tätigkeit Bearbeitung / Werkstatt und Von/Bis einschließlich Sekunden innerhalb einer Karte.

Ich öffnete „Unveränderte Originalaufzeichnungen ansehen“. Beginn, Ende, Arbeitsintervall und tatsächliche Arbeitszuordnung sind als lesbare Felder/Karten dargestellt; in den angesehenen Ausschnitten waren keine Zeitspalten abgeschnitten. Die Sitzung zeigt Beendet, Version 2. Es wurde keine neue Zeit gestartet, korrigiert oder abgegeben. Der frühere kurzfristige Statuswiderspruch unmittelbar nach Feierabend wurde in diesem Nachtest deshalb nicht erneut reproduziert oder ausgeschlossen.

Evidenz: [Tagesverlauf und bestätigte Arbeitszuordnung](../evidence/workshop_b/0013-1792767298613.png), [aufgeklappte Sitzung](../evidence/workshop_b/0015-1792767317841.png), [vollständige Originalintervalle](../evidence/workshop_b/0016-1792767330881.png).

In diesen Ausschnitten überlagert kein schwebender Assistent die Arbeitsinhalte. Das gilt auch für Auftragsnotizen und den Reservierungsdialog. **Kleine Restbeobachtung R3 / P3:** Ganz unten am Paket ist eine breite Assistent-Aktion im Seitenfluss sichtbar; ihre untere Fläche liegt teilweise unter der festen mobilen Fußnavigation. Das verdeckt dort keine Arbeitsanweisung, kann aber die Assistent-Aktion selbst erschweren. Evidenz: [Paketende mit Assistent und Fußnavigation](../evidence/workshop_b/0017-1792767362915.png).

## Grenzen und hinterlassene Daten

Einzige neue fachliche Teständerung ist die eigene synthetische Arbeitsrückmeldung direkt auf der Paketakte. Keine zusätzliche Reservierung, keine Bestands-/Verbrauchs-/Zuschnittbuchung, keine Statusänderung, keine Fertigungsfreigabe, keine Tagesabgabe und keine fremden Daten verändert.

Die Anzeige der Rückmeldung am Paket und am Auftrag wurde per UI geprüft. Eine interne ausschließlich paketbezogene Datenzuordnung wurde nicht untersucht. Keine echten Dokumentinhalte oder Quarantäneprüfung beurteilbar, da in den eigenen Akten 0 Dokumente verknüpft waren. Kein realer Touchscreen-/Handschuhtest und keine Aussage zum tatsächlichen Zuschnitt oder zur Materialqualität.

Die Screenshots bleiben unter `work/ai-usability/evidence/workshop_b/`. Nur die oben referenzierten aktuellen Nachtestbilder wurden für die Bewertung verwendet. Alte Berichte und deren ursprüngliche Beobachtungen wurden nicht geändert. Browserkontext nach der Interaktion geschlossen.


## Abschluss nach weiteren Fixes · gezielter UI-Nachtest 23.10.2026

**Zeitraum:** 15:16:26–15:19:58 UTC (17:16–17:19 Uhr Deutschland), erneut **390 × 844 px**, 26 Browseraktionen mit derselben eigenen Browser-ID. Die bisherigen Beobachtungen oben bleiben als zeitlicher Verlauf unverändert. Die neuen Bilder wurden tatsächlich angesehen. Keine Source/API/DB und keine Codeänderungen.

### Arbeitsanweisung vor eingeklappter Rückmeldung: bestätigt

Am eigenen Paket „UX workshop_b · Kanten bearbeiten“ steht die Arbeitsanweisung jetzt am Beginn von Angaben im Überblick und vollständig im ersten mobilen Ausschnitt: Maße vor Ausführung prüfen, Fensterbank 1200 × 250 × 30 mm, Kante poliert, keine Ausführung oder Freigabe. Erst unter den Angaben folgt **„Arbeitsrückmeldung erfassen“**, bei einem neuen Seitenaufruf zunächst eingeklappt. Der Teil von R1, der die durch das Formular verdrängte Arbeitsanweisung betraf, ist in dieser Ansicht damit behoben. Der Status Offen bleibt unter den vorhandenen Rückmeldungen; dessen Position wurde durch diese gezielte Änderung nicht angehoben.

Der Bereich ließ sich mit einem Klick öffnen und wieder einklappen. Der eigene Auftrag war vorausgewählt. Leistungstag, Rückmeldung, optionale Leistungsmenge, passende Einheit und Speichern sind weiterhin klar beschriftet und erreichbar. Ich gab testweise folgenden ausdrücklich ungespeicherten Text ein:

> UX workshop_b · Ungespeicherter Eingabetest: Maße vor Ort noch prüfen; keine Fertigung oder Freigabe.

Der Text war im Feld lesbar und bearbeitbar. Anschließend habe ich ihn vollständig geleert und den Bereich eingeklappt. Keine weitere Rückmeldung gespeichert; der bestehende Zähler blieb bei **2**. Das Speichern selbst war bereits im vorherigen Nachtest erfolgreich geprüft und wurde für diesen gezielten Eingabetest nicht wiederholt.

Evidenz: [Anweisung im ersten mobilen Ausschnitt](../evidence/workshop_b/0003-1792768611914.png), [zunächst eingeklappter Bereich](../evidence/workshop_b/0004-1792768636546.png), [geöffnetes Formular mit eigenem Textentwurf](../evidence/workshop_b/0006-1792768668861.png).

### Reservierung mit Menge und Einheit als mobile Karte: bestätigt

Am eigenen Auftrag zeigt „Materialreservierungen“ die bestehende eigene Naturstein-Testplatte als Karte. Im selben Ausschnitt stehen der eigene Auftragsname, Reservierungszeitpunkt, **1 Stück** und Status Aktiv. Für die Einheit ist kein seitliches Verschieben nötig.

Zusätzlich öffnete ich die eigene Testplatte in der Lagerakte. Auch dort zeigt die vorhandene Reservierung eine mobile Karte mit eigenem Auftrag und **1 Stück**; der Artikel bleibt Reserviert / Version 2. Damit ist der in R2 beschriebene verdeckte Einheitenwert sowohl im geprüften Auftrag als auch in der geprüften Lagerakte behoben.

Im konkreten eigenen Arbeitspaket wurde kein separater Materialreservierungsblock angezeigt. Die vorhandene Reservierung war über den zugehörigen Auftragslink erreichbar. Eine zusätzliche direkt paketbezogene Reservierung wurde nicht erzeugt und ist damit nicht gesondert getestet.

Evidenz: [Reservierungskarte am Auftrag](../evidence/workshop_b/0002-1792768602528.png), [Reservierungskarte in der Lagerakte](../evidence/workshop_b/0007-1792768717065.png).

### R3: Assistent oberhalb der Fußnavigation erreichbar – bestätigt

Auf zusätzlichen Auftrag des Parents habe ich am Paket bis ganz zum Seitenende gescrollt. Die breite Assistent-Schaltfläche ist jetzt vollständig einschließlich ihrer unteren Kante oberhalb der festen mobilen Fußnavigation sichtbar. Ein normaler Klick öffnete den Schubert Begleiter. Anschließend schloss ich den Dialog wieder. Keine Chatnachricht und keine KI-Anfrage abgeschickt.

Der bisherige R3 zur teilweise verdeckten Assistent-Aktion ist für diesen mobilen Paketausschnitt behoben.

Evidenz: [vollständige Assistent-Aktion oberhalb der Fußnavigation](../evidence/workshop_b/0009-1792768749625.png), [nach Klick geöffneter Schubert Begleiter](../evidence/workshop_b/0010-1792768758472.png).

### R4 / P3 bleibt offen: fehlender Name bei letzten Rückmeldungen am Paket

Ebenfalls zusätzlich geprüft: Nach Öffnen von Arbeitsrückmeldung erfassen und Scrollen zu „Meine letzten Rückmeldungen“ zeigen beide eigenen bestehenden Einträge weiterhin **„—“ als Überschrift**. Datum und Text sind sichtbar. Ein Auftrags- oder Paketname wird dort nicht genannt. Die Erwartung, den zugehörigen Vorgang direkt am Eintrag zu erkennen, ist in dieser Paketansicht noch nicht erfüllt. Die Rückmeldungen sind dadurch nicht verloren oder unlesbar; es bleibt eine Zuordnungs-/Beschriftungsfrage.

Evidenz: [beide Rückmeldungen mit Strich als Überschrift](../evidence/workshop_b/0008-1792768731288.png).

**Abschluss:** Anweisung vor Formular, Ein-/Ausklappen, Texteingabe ohne Speichern, Reservierungskarten am Auftrag und Lager sowie R3 bestätigt. R4 bleibt offen. Die frühere Dokumenten-Abdeckungsgrenze D1 wurde in diesem gezielten Durchgang nicht erneut untersucht und bleibt bestehen. Keine neue fachliche Speicherung, Reservierung, Bewegung, Freigabe oder Zeitbuchung. Browserkontext geschlossen.


## Abschluss R4 und tatsächlicher Dokumentupload · 23.10.2026, 17:28–17:31 Uhr

**Zeitraum:** 15:28:32–15:31:07 UTC, weiterhin 390 × 844 px. 18 Browseraktionen mit workshop_b. Vorherige Beobachtungen und Nachträge bleiben unverändert als Verlauf stehen. Browser am Ende geschlossen.

### R4: Auftragsnamen bei eigenen Rückmeldungen – bestätigt behoben

Ich öffnete erneut das eigene Arbeitspaket und den Bereich Arbeitsrückmeldung erfassen. Unter **Meine letzten Rückmeldungen** tragen beide sichtbaren Einträge jetzt die vollständige Überschrift **„AUF-2026-00016 · UX workshop_b · Fensterbänke Testweg“**. Die langen Namen brechen auf dem Smartphone lesbar um. Datum und beide bekannten eigenen Testtexte stehen darunter.

Im geprüften sichtbaren Bestand waren ausschließlich meine beiden eigenen Rückmeldungen zu sehen. In der UI-Tabelle sind sie UX Mira Braun zugeordnet; die neuere Rückmeldung nennt außerdem das eigene Arbeitspaket, die ältere ursprüngliche Zeitnotiz hat dort keine Paketzuordnung. Es wurde keine weitere Rückmeldung angelegt. Eine allgemeine Berechtigungs- oder Filterprüfung mit fremden Autoren war nicht Teil dieses kurzen UI-Nachtests.

Evidenz: [eigene Rückmeldungen mit lesbarem Auftragsnamen](../evidence/workshop_b/0001-1792769317141.png).

### D1: echte Verknüpfung und Quarantäneanzeige jetzt getestet

Die tatsächliche UI bot im Dokumentenreiter des eigenen Pakets weiterhin Dateien auswählen und Privat hochladen an. Auf ausdrücklichen Auftrag des Parents erzeugte ich die harmlose UTF-8-Textdatei **workshop_b-releasepruefung.txt**, 76 Byte, unter work/ai-usability/synthetic. Inhalt:

> UX Releaseprüfung workshop_b · Aufmaß nur Test, keine Fertigungsfreigabe

Die Datei wurde über das sichtbare Dateifeld ausgewählt und mit **Privat hochladen** übertragen. Die App zeigte erst Wird übertragen und anschließend:

- Original empfangen · Weitere Verarbeitung nach Sicherheitsprüfung
- **In Quarantäne**
- **Verknüpfte Dokumente 1** am eigenen Arbeitspaket
- Prüfstatus / Dateistatus als Links zur eigenen Dokumentakte

Damit ist die bisherige D1-Abdeckungsgrenze für eine tatsächliche Dokumentverknüpfung und den ehrlichen Quarantänezustand am Paket geschlossen. Die Datei wurde weder gescannt noch bereitgestellt oder freigegeben. Eine spätere erfolgreiche Sicherheitsprüfung wurde nicht behauptet.

Evidenz: [eigener Upload und Verknüpfungszähler](../evidence/workshop_b/0005-1792769396273.png). Die zugehörigen aktuellen Snapshots zeigen Original empfangen, In Quarantäne und genau ein verknüpftes Dokument.

Die neue eigene Dokumentakte ist /documents/b5250d47-5a89-4b7b-a212-7d646d72342c.

### R5 / P2: Dokumentakte bietet trotz Quarantäne einen Download-Link an

Ich folgte dem angebotenen **Prüfstatus** zur Dokumentakte. Dort steht ebenfalls eindeutig **In Quarantäne**. Unter Originaldatei erscheint jedoch gleichzeitig ein aktiver Link **Original herunterladen**. Darüber erklärt die App nur allgemein, dass Quarantäne oder fehlende Sicherheitsprüfung den Zugriff sperren kann.

**Erwartung:** Vor der bestätigten Sicherheitsprüfung sollte die UI die fehlende Verfügbarkeit eindeutig erklären und keine verfügbare Original-Aktion suggerieren.

**Beobachtung/Auswirkung:** Die Paketansicht führt korrekt in den Prüfstatus, die Dokumentakte vermittelt mit dem Download-Link dagegen eine verfügbare Dateiaktion. Das ist ein Widerspruch in der angebotenen Bedienung. **Der Link wurde in diesem Durchgang nicht angeklickt; eine tatsächliche Dateiauslieferung oder fehlende Serversperre ist damit ausdrücklich nicht belegt.** Der Befund wurde dem Parent sofort mitgeteilt.

Evidenz: [Quarantänestatus und aktiver Download-Link im selben mobilen Ausschnitt](../evidence/workshop_b/0007-1792769459636.png).

Nach dem Schließen um 15:31:07 UTC traf ein zusätzlicher Auftrag ein, den Original-Link nur bei noch offenem Browser als Negativtest anzuklicken. Der Kontext war zu diesem Zeitpunkt bereits geschlossen. Dieser bedingte Zusatztest wurde deshalb nicht mehr ausgeführt; der Parent wurde darüber informiert. Die UI-Beobachtung wird nicht als bestätigte Sicherheitslücke gewertet.

**Hinterlassene Daten:** genau eine ausdrücklich synthetische, privat hochgeladene und am eigenen Paket verknüpfte TXT in Quarantäne. Keine weitere Rückmeldung oder Reservierung, keine Statusfreigabe, kein Scan und kein Download. Browserkontext geschlossen.


## Abschluss R5 nach Korrektur der Quarantäneanzeige · 23.10.2026, 17:36–17:37 Uhr

**Zeitraum:** 15:36:10–15:37:57 UTC, 390 × 844 px, 11 Browseraktionen mit workshop_b. Vorherige Befunde bleiben als Verlauf erhalten. Ausschließlich bestehende eigene Daten angesehen; keine weiteren Uploads oder Geschäftsdaten angelegt. Browser danach geschlossen.

Ich öffnete das eigene Arbeitspaket, dessen Dokumentenreiter weiterhin **Verknüpfte Dokumente 1** und **workshop_b-releasepruefung.txt · In Quarantäne** zeigt. Über den angebotenen Link **Prüfstatus** gelangte ich erneut in dieselbe Dokumentakte.

### R5: widersprüchlicher Download-Link – in der geprüften UI behoben

Unter **Originaldatei** steht jetzt gut lesbar:

> Die Sicherheitsprüfung ist noch offen. Das Original bleibt bis zur bestätigten Prüfung gesperrt.

Darunter wird **Prüfstatus aktualisieren** angeboten. Ein Link **Original herunterladen** ist in der Dokumentakte nicht mehr vorhanden. Status **In Quarantäne**, Erklärung und die Aktualisieren-Aktion sind im mobilen Ausschnitt vollständig sichtbar. Beide unten verlinkten Screenshots habe ich selbst angesehen.

Ich klickte einmal **Prüfstatus aktualisieren**. Anschließend blieb die Anzeige bei In Quarantäne und offener Sicherheitsprüfung; es wurde weiterhin kein Download angeboten. Es erschien keine Fehlermeldung. Die Oberfläche behauptet damit im geprüften Zustand weder einen abgeschlossenen Scan noch eine verfügbare Originaldatei.

**Evidenz:** [Quarantäne, offene Prüfung und Aktualisieren ohne Download-Link](../evidence/workshop_b/0002-1792769864849.png), [Anzeige nach Klick auf Prüfstatus aktualisieren](../evidence/workshop_b/0003-1792769873021.png).

**Prüfgrenze:** Dieser Abschluss bestätigt die korrigierte Bedienoberfläche. Die technische Serversperre prüft der Parent separat; ich habe keine direkte API verwendet und keine Dateiauslieferung getestet. Keine Freigabe, kein Scan, kein Download und keine Änderung an Rückmeldungen, Reservierungen oder Dokumentdaten. Browserkontext geschlossen.
