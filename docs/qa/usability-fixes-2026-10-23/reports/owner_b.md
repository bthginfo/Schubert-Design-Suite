# Blackbox-Nachtest owner_b

**Rolle:** Maren, kaufmännische Mitinhaberin; UX Maren Koch.

**Sitzung:** 23.10.2026, 14:51:53–14:57:31 UTC, localhost:5173, 1280 × 900, 25 Browseraktionen einschließlich Inspect und Close. Browser geschlossen. Aktuellen Appcode ausschließlich über die sichtbare UI geprüft; keine Code-, API-, DB- oder fremden Berichtslesungen. Keine Daten, Termine, Aufgabenstatus oder Freigaben verändert.

## Ergebnis

| Prüfpunkt | Status | Beobachtung |
| --- | --- | --- |
| Morgenübersicht | Bestanden für sichtbare Angaben | Eigene Telefonat-Aufgabe zeigt „Fällig am 26.10.2026 · Normal · UX Maren Koch“ und „AUF-2026-00020 · UX finance_b · Badumbau Testweg“. Andere Hinweise sagen ausdrücklich „Kein Termin festgelegt“ bzw. „Konkreter Vorgangsbezug fehlt“. Keine überfälligen Testdaten erzeugt; Dringlichkeitssortierung deshalb nicht abschließend geprüft. |
| Verantwortlichenname | Bestanden | Eigene gespeicherte Aufgabe nennt „UX Maren Koch“ auch in der Akte lesbar. |
| Aufgabenbezug | Teilweise; ein Original-Link blockiert | Eigene Aufgabe öffnet den richtigen Auftrag. Ein Fall ohne Quelle erklärt den fehlenden Bezug und fordert Klärung vor Erledigung. Die Angebotsmeldung bietet dagegen einen nicht verfügbaren Original-Link an. Details unten. |
| Kundenverknüpfungen | Bestanden | Auftrags-Kundenlink öffnet KD-2026-00050. „Verknüpfte Vorgänge“ zeigt eine konkrete Anfrage, acht Aufträge mit Nummer/Status/Fälligkeit sowie „Angebote 0 – Noch keine verknüpften Einträge vorhanden“. AUF-2026-00020 aus dieser Liste öffnet wieder den richtigen Badumbau-Auftrag. |
| Kostensatzwarnungen | Teilweise | Statt anonymer Hinweise steht „Kostensatz fehlt · Isolierte Zeitprüfung“, mit Zeitraum und beschriebenem Weg über Personalverwaltung. In den betrachteten Warnungen kein direkter Prüf-Link. |

## Blockierter Fall: Original-Link einer Angebotsmeldung

Reproduktion:

1. Heute → „Angebot wurde angenommen“.
2. Aufgabenakte `/tasks/778d61e3-9821-4d8c-b5a3-fe8288748f89` zeigt „Kein Termin festgelegt · Normal · Test Owner“ und „Konkreter Vorgangsbezug fehlt – ursprüngliche Mitteilung prüfen“.
3. „Zugrunde liegenden Vorgang öffnen“ anklicken.
4. Ziel `/quotes/c39c657a-5db6-43dc-a239-0ca8ecc441ed` zeigt **„Datensatz ist nicht verfügbar“** und **„Dieser Bereich ist nicht verfügbar“**.

Damit kann ich den angebotenen Ursprung nicht prüfen. Ob Datensatz oder Berechtigung die Ursache ist, wurde nicht ermittelt. Der Blocker wurde während des Tests sofort an den Parent gemeldet.

Evidenz: [Angebots-Aufgabe mit Link](../evidence/owner_b/0007-1792767264082.png), [nicht verfügbares Ziel](../evidence/owner_b/0008-1792767287894.png).

## Konkrete Gegenprüfungen

- Eigene Aufgabe `/tasks/1ab66165-8936-4c27-b5c2-2f601faf152e`: Name und Auftragsnummer lesbar; Original-Link führt tatsächlich zu `/orders/c24233ac-6e8e-4793-9917-4a6f0ecff526`. [Aufgabenakte](../evidence/owner_b/0003-1792767148072.png), [Auftragsziel](../evidence/owner_b/0004-1792767174824.png).
- Aufgabe ohne Quelle `/tasks/8c54a075-708a-4684-8789-0571530a2dd1`: kein Original-Link; ausdrückliche Aufforderung, den Originalvorgang mit der zuständigen Person zu klären, bevor die Aufgabe als erledigt bestätigt wird. [Fallback](../evidence/owner_b/0010-1792767433298.png).
- [Morgenübersicht mit Metadaten](../evidence/owner_b/0002-1792767125870.png).
- [Kundenakte mit konkreten Verknüpfungen und erklärtem Leerstand](../evidence/owner_b/0006-1792767201102.png).

## Kostensatzwarnungen: konkrete Angaben, verbleibender Umweg

Weg: Auswertungen → „Daten & Grundlagen 48“ → „Datenlücken zuerst klären“.

Sichtbar: „Kostensatz fehlt · Isolierte Zeitprüfung“, etwa „Zeitraum 2026-10-23 bis 2026-10-23. Betriebliche Arbeit ohne Auftragsbezug.“ Weitere Zeilen nennen den 22.10.2026. Danach: „Personalverwaltung: den für diesen Zeitraum geltenden internen Kostensatz mit belegter Grundlage bestätigen. Anschließend den Kostenstand erneut prüfen.“

Die betroffene Bezeichnung und Zeiträume machen den Hinweis konkreter. „Isolierte Zeitprüfung“ lässt sich aus der UI allein nicht als Personenname bestätigen. Mehrere gleichlautende Zeilen bleiben bestehen. Der Weg ist textlich erklärt; ein direkt anklickbarer Prüfweg wird in diesen Warnungen nicht angeboten. Ob dies zur Rollenberechtigung gehört, wurde nicht bestimmt. Keine Kostensätze geändert.

Evidenz: [Warnungen mit Zeitraum und Handlungsanweisung](../evidence/owner_b/0009-1792767361614.png). Alle hier ausgewerteten Kernscreenshots selbst visuell betrachtet.


## Ergebnis nach Fix · 23.10.2026, 15:16–15:18 UTC

**Gezielter Nachtest bestanden.** Die ursprüngliche Beobachtung oben bleibt unverändert dokumentiert. Erneut ausschließlich die UI als owner_b geprüft, 1280 × 900, elf Browseraktionen; keine Daten- oder Statusänderung. Browser anschließend geschlossen.

- **Heute:** „Angebot wurde angenommen“ führt zur ursprünglich gemeldeten Aufgabe und beschreibt bereits im Überblick „Konkreter Vorgangsbezug fehlt – ursprüngliche Mitteilung prüfen“. [Aktueller Überblick](../evidence/owner_b/0002-1792768598450.png).
- **Ursprünglich fehlerhafte Aufgabenakte:** `/tasks/778d61e3-9821-4d8c-b5a3-fe8288748f89` bietet **keinen Original-Link** mehr. Stattdessen: „Konkreter Vorgangsbezug fehlt – ursprüngliche Mitteilung prüfen“ und „Klären Sie den Originalvorgang mit der zuständigen Person, bevor Sie die Aufgabe als erledigt bestätigen.“ Kein angebotener Link mehr auf das zuvor nicht verfügbare Angebotsziel. [Aufgabe nach Fix](../evidence/owner_b/0003-1792768621735.png).
- **Verfügbares Original als Gegenprobe:** Meine Telefonat-Aufgabe `/tasks/1ab66165-8936-4c27-b5c2-2f601faf152e` zeigt weiterhin „Zugrunde liegenden Vorgang öffnen“ mit AUF-2026-00020. Tatsächlich angeklickt: Der richtige Auftrag „UX finance_b · Badumbau Testweg“ unter `/orders/c24233ac-6e8e-4793-9917-4a6f0ecff526` lädt vollständig. [Erhaltener Link](../evidence/owner_b/0004-1792768655009.png), [erreichtes Auftragsziel](../evidence/owner_b/0005-1792768670484.png).

Den vorher gemeldeten Original-Link-Blocker konnte ich im geprüften Fall nach dem Fix nicht mehr reproduzieren. Überblick, Aufgabenfallback und erreichtes Auftragsziel selbst visuell anhand der Screenshots geprüft. Keine Aussage über andere, in diesem kurzen Nachtest nicht erneut geprüfte Bereiche.
