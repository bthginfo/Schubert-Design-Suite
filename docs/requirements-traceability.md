# Anforderungsverfolgung

Die automatisch auf Vollständigkeit geprüfte [Anforderungs- und Szenariomatrix](requirements.md) ordnet sämtliche Fachunterabschnitte und Abnahmeszenarien der Master-Spezifikation konkreten Implementierungs-/Prüforten zu. Der [ausführliche tatsächliche Abnahmestand](qa/acceptance.md) unterscheidet bestandene Ausführung, fehlende Betriebsangaben und spätere Geräte-/Fachabnahmen.

Aktualisierung: pnpm exec tsx scripts/requirements.ts --write. Prüfung: pnpm requirements. Die Prüfung bestätigt Zuordnung und vorhandene Nachweisquellen; sie ersetzt keinen ausgeführten Fachtest.

Die zusätzlich beauftragten Funktionen sind separat belegt: [Testfeedback](qa/feedback-acceptance-2026-10-18.md) und [persönliche Farben, Hell-/Dunkelmodus und erneute UX-Abnahme](qa/personal-appearance-2026-10-18.md). Der letzte Bericht dokumentiert auch die Nachprüfung von Einführung, Formularen, Hilfe und Planungsstudio.

Die Studioüberarbeitung vom 26.10.2026 ist in [Werkzeuge, Dropdowns und 3D-Inschriften](qa/studio-clarity-2026-10-26.md) belegt. `tests/e2e/studio-clarity.spec.ts` prüft den wörtlichen Text tatsächlich als Pixel im 3D-Canvas, Schriftwechsel, Reload, gedrehte Schriftfläche, einen echten Schriftladefehler samt Wiederholung, beide Werkzeugabläufe, mobile/native Vollbildpanels, Dunkelmodus und Referenzauswahl. `tests/lettering-preview.test.ts` belegt die unveränderten kanonischen Daten, gedrehte Bezugssysteme und Oberflächenaufbauten.
