> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest employee_b · 23.10.2026

Jan, 35, neuer Montagehelfer; Name in der App: UX Jan Richter. Smartphone-Ansicht **390 × 844**. Ausschließlich sichtbare UI mit eigener Browser-ID benutzt, keine Anwendungssourcen, APIs oder Datenbanken. Etwa 55 Browserkommandos einschließlich Sitzungsabschluss und anfänglichem Infrastrukturfehler. Fachlicher Testbeginn nach erfolgreichem Zugang: 12:47 UTC.

## Zielstatus

| Ziel | Status | Tatsächliches Ergebnis |
| --- | --- | --- |
| G1: Eigener Einsatz und Arbeitsanweisungen | Erreicht | Unter „Meine Einsätze heute“ sofort gefunden. Die Auftragsakte führte zum passenden Arbeitspaket; Anweisung dort unter „Abschlusskriterium“ gelesen. |
| G2: Gestern korrekt nachtragen und prüfen | Erreicht | Eigener Auftrag, 22.10.2026, 08:00–11:30, Pause 09:30–09:45 gespeichert. Zwei Arbeitsblöcke ergeben selbst berechnet **3:15 Stunden / 3,25 h netto**. Nach Seitenwechsel unverändert vorhanden. |
| G3: Kurzer Netzausfall | Erreicht, mit Hürde | Ein Offline-Speicherversuch scheiterte verständlich; alle Angaben blieben erhalten. Wieder online, ein weiterer Speicherversuch erfolgreich. Fehler im langen Mobilformular zunächst außerhalb des sichtbaren Ausschnitts. |
| G4: Eigene Zeiten, Korrektur und Prüfweg finden | Erreicht | Tagesverlauf und eigene Aufzeichnungen gefunden, Korrekturantrag angesehen und abgebrochen. „Tag prüfen & abgeben“ und „Antrag einreichen“ gefunden. Entsprechend Testgrenze nichts eingereicht oder abgegeben. |

## Meine Erwartungen und der Arbeitsweg

Ich suche den Einsatz unter „Heute“, damit ich vor Ort nicht erst eine Verwaltungsakte verstehen muss. Diese Erwartung erfüllt der Einstieg mit Uhrzeit, Auftrag und Adresse. Nach der kurzen Einführung wählte ich „Hier selbst ausprobieren“, öffnete den eigenen Einsatz und anschließend das eigene Arbeitspaket. Die Anweisung war lesbar: Maße vor Ausführung prüfen, Fensterbank 1200 × 250 × 30 mm, Kante poliert, keine Ausführung/Freigabe. In der Auftragsakte lagen davor auch kaufmännische und organisatorische Angaben; das Arbeitspaket war ein weiterer Schritt.

Für gestern erwarte ich Beginn, Ende und tatsächliche Pause. „Zeit“ in der festen unteren Navigation und „Zeit nachtragen“ passen dazu. Ich füllte den Zeitraum und die Pause aus, bestätigte deren Vollständigkeit, wählte den eigenen Auftrag und ergänzte eine als UX employee_b markierte Tätigkeitsnotiz. Die Auftragsauswahl gelang auch mit Pfeiltaste und Enter.

Beim kurzen Netzausfall erwarte ich, dass nichts verloren geht und der Speicherstatus klar wird. Ich klickte offline einmal auf Speichern. Die App behielt alle Werte, speicherte den Nachtrag jedoch erst nach Rückkehr der Verbindung und einem weiteren Versuch. Unter gestern sah ich 08:00–09:30 Arbeit, 09:30–09:45 Pause und 09:45–11:30 Arbeit. Anschließend öffnete ich die Korrektur, schloss sie mit Escape und suchte in der Seitenhilfe nach „Korrektur“. Nach Rückkehr waren die Originalzeiten weiter vorhanden.

Zum Verstehen einer einfachen Korrektur änderte ich **nur im ungespeicherten Korrekturformular** probeweise die oberste Endzeit auf 11:35. Der letzte Arbeitsblock blieb bei 11:30. Ich brach den Versuch ab. Der gespeicherte Nachtrag bleibt unverändert bis 11:30, Version 1. Eine tatsächliche Korrektureinreichung oder Tagesabgabe war nicht Teil der erlaubten Testaktionen.

## Die drei wichtigsten Befunde

### employee_b-F1 · P2 · Speicherfehler ist im aktuellen Mobilabschnitt unsichtbar

**Beobachtung:** Nach dem Offline-Speicherversuch kehrte der Knopf unten von „Wird gespeichert …“ zu „Zeitraum speichern“ zurück. Im selben sichtbaren Ausschnitt standen Pause, Auftrag und Notiz; die Fehlermeldung war dort nicht zu sehen. Weiter oben im Dialog stand verständlich: „Der Server ist nicht erreichbar. Ihre Eingaben bleiben erhalten. Bitte prüfen Sie die Verbindung.“ Erst das gezielte Scrollen zum Alert zeigte ihn. Das normale Scrollkommando bewegte den inneren Dialog nicht; dies ist eine zusätzliche Werkzeuggrenze und kein gesicherter Appfehler.

**Erwartung und Auswirkung:** Ich möchte bei Speichern direkt erfahren, ob der Nachtrag angekommen ist. Die Rückmeldung außerhalb des Ausschnitts lässt mich unten zunächst ratlos zurück und kann zusätzliche Versuche nahelegen. Ich habe offline nicht erneut blind gespeichert. Alle Werte blieben erhalten; online gelang ein einzelner weiterer Versuch.

**Empfehlung:** Fehler am sichtbaren Aktionsbereich anzeigen oder den Dialog zum Alert führen. Bei Nachträgen vorab klar sagen, dass eine Verbindung nötig ist.

**Evidenz:** [Formular vor dem Versuch](../selected/employee_b-F1-0011-1792759756382.png), [unsichtbarer Fehler im unteren Ausschnitt](../selected/employee_b-F1-0014-1792759784371.png), sichtbarer Alert nach Scrollen (`evidence/employee_b/0016-1792759817571.png`), Erfolg nach Wiederverbindung (`evidence/employee_b/0017-1792759833546.png`). Route: `/time`. Hohe Sicherheit der Beobachtung.

### employee_b-F2 · P2 · Endzeitkorrektur verlangt technische Zeitaufteilung

**Beobachtung:** Für denselben Auftrag erscheinen im Korrekturformular zusätzlich zur Gesamtzeit und Pause zwei Arbeitsblöcke. Eine probeweise Änderung des obersten „Bis“ auf 11:35 ließ „Arbeit 2 · Bis“ auf 11:30. Der Erklärungstext verlangt Übereinstimmung von „Arbeitsintervallen“ und „Sitzungszeit“. Die Hilfesuche „Korrektur“ fand keine passende Anleitung.

**Erwartung und Auswirkung:** Für eine einfache Endzeitänderung möchte ich wissen, welche Angabe zählt und welche weitere Änderung nötig ist. Stattdessen muss ich mehrere gleich beschriftete Endzeiten und das Verhältnis von Sitzung und Intervallen verstehen. **Nicht beobachtet:** eine Ablehnung beim Einreichen; ich habe keinen Antrag eingereicht. Die Hürde ist die verständliche Vorbereitung, nicht ein nachgewiesener Validierungsdefekt.

**Empfehlung:** Eine einfache Korrektur an einem Auftrag geführt anbieten und zusätzliche nötige Änderungen mit Alltagsbegriffen direkt erklären.

**Evidenz:** Erklärung der Arbeitszuordnungen (`evidence/employee_b/0020-1792759892124.png`), keine Hilfe für Korrektur (`evidence/employee_b/0022-1792759914662.png`), oberstes Ende 11:35 (`evidence/employee_b/0024-1792759987174.png`), letzter Arbeitsblock weiterhin 11:30 (`evidence/employee_b/0025-1792759995180.png`), Original nach Abbruch bis 11:30 (`evidence/employee_b/0026-1792760018113.png`). Route: `/time?date=2026-10-22`. Hohe Sicherheit für die Feldwerte; Einreichung nicht getestet.

### employee_b-F3 · P3 · Nachtrag führt nicht zum erfassten Tag

**Beobachtung:** Nach dem Speichern für gestern gab es die Erfolgsmeldung, aber der Tagesfilter stand weiterhin auf heute, 23.10.2026, mit „Für diesen Tag noch keine Zeit“. Erst mein eigener Wechsel zum 22.10.2026 zeigte den Nachtrag.

**Erwartung und Auswirkung:** Ich möchte das gerade Gespeicherte direkt prüfen. Der zusätzliche Datumswechsel unterbricht das Prüfen; die leere Ansicht passt zunächst nicht zur Erfolgsmeldung. Kein Datenverlust beobachtet.

**Empfehlung:** Zum erfassten Tag wechseln oder in der Erfolgsmeldung einen Prüf-Link anbieten.

**Evidenz:** Erfolg mit zunächst unverändertem Tagesfilter im zugehörigen Snapshot (`evidence/employee_b/0017-1792759833546.png`), gestern nach Filterwechsel (`evidence/employee_b/0018-1792759841444.png`), Tagesverlauf mit Pause und Abgabeschaltfläche (`evidence/employee_b/0023-1792759954420.png`). Route: `/time`. Hohe Sicherheit.

## Was gut funktioniert

- Eigener Einsatz unter „Heute“ mit Uhrzeit und Adresse ist unmittelbar auffindbar.
- Große, lesbare mobile Hauptaktionen; „Zeit nachtragen“ und tatsächliche Pausen sind verständlich beschriftet.
- Kein Eingabeverlust beim kurzen Offlineversuch. Die deutsche Meldung erklärt Erhalt und nächsten Schritt.
- Korrekte Zeitaufteilung bleibt nach Seitenwechsel bestehen. Eigene Aufzeichnungen erklären die Prüfung von Korrekturen durch eine andere Person.
- Pfeiltaste/Enter in der Auftragsauswahl und Escape zum Schließen funktionierten.

## Grenzen und getrennte Umgebungsbeobachtungen

Der erste Start scheiterte am nicht erreichbaren Broker. Nach dessen Wiederherstellung zeigte die Anmeldung „Too many requests. Please try again later.“. Der Parent bestätigte die gemeinsame lokale Login-Drossel; später gelang ein sichtbarer Anmeldeversuch. Diese Zugangsstörung ist ein **Umgebungslimit**. Die englische Meldung ohne konkrete Wartezeit war sichtbar, erklärt aber keinen Fehler in den später erledigten Fachaufgaben. Login-Evidenz (`evidence/employee_b/0001-1792759591402.png`).

Native Datum-/Zeitfelder zeigten im Testbrowser `10/22/2026` und `AM`, der Tagesverlauf dagegen `22.10.2026`. Eine Ursache in Browserlokalisierung oder App wurde nicht isoliert. Keine gesicherte Produktursache behauptet. Native Felder wurden vom Treiber technisch mit ISO-Werten gefüllt; fachlich ging es um deutsche Datums- und Zeitangaben. [Formular-Evidenz](../selected/employee_b-F1-0011-1792759756382.png).

Der Test ist simuliert, mit einem mobilen Viewport statt echtem Telefon und ohne Bildschirmtastatur. Keine KI-Anfrage, keine Langzeit-Offlinenutzung, kein Browserneustart, keine Timerübertragung und keine abgeschlossene Freigabe/Abgabe geprüft. Mehrere relevante Screenshots wurden selbst visuell betrachtet: Einstieg, Auftrag, Arbeitsanweisung, Nachtrag, Offlinefehler, Korrektur und Ergebnis. Nur eigene synthetische Zeit wurde gespeichert. Die Sitzung wurde vor Abschluss wieder online gestellt und wird nach Sicherung dieses Berichts geschlossen.
