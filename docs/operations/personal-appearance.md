# Persönliche Darstellung

Jeder interne Zugang findet unter **Meine Einstellungen → Ihre Darstellung** sechs Akzentfarben sowie **Hell**, **Dunkel** und **Wie mein Gerät**. Die gleiche Auswahl bildet den letzten Schritt der persönlichen Einführung. Eine Vorschau zeigt das Ergebnis; erst **Darstellung speichern** beziehungsweise **Einführung abschließen** übernimmt die Auswahl.

| Farbfamilie | Hell | Dunkel |
| --- | --- | --- |
| Grün | Waldgrün | Mintgrün |
| Blau | Ozeanblau | Hellblau |
| Violett | Violett | Flieder |
| Rosa | Beere | Rosé |
| Orange | Terrakotta | Apricot |
| Grau | Graphit | Silbergrau |

Die Farbfelder und Namen zeigen den tatsächlich ausgewählten Modus, auch wenn die übrige Anwendung bis zum Speichern noch im bisherigen Modus bleibt. Bei der Geräteoption folgen Vorschau, Farbfelder und Namen der Systemeinstellung. Die helleren Dunkelfarben sichern den Kontrast auf dunklen Arbeitsflächen. Warnungen und Fehler behalten ihre eigenen Bedeutungsfarben.

Die Einstellung gehört zum persönlichen Zugang in der jeweiligen juristischen Einheit, gilt geräteübergreifend und verändert keine anderen Nutzer. **Schubert-Standard auswählen** setzt die Auswahl auf Waldgrün und Hell zurück; anschließend speichern. Technische Zeichnungen, Original-Schriftbilder, reale Materialien, das 3D-Modell und erzeugte PDF-Inhalte werden nicht eingefärbt.

## Betrieb und Kosten

Der Dunkelmodus verwendet Navy: dunkler Hintergrund, getrennte Navigation, leicht angehobene Arbeitsflächen und dezente gerichtete Schatten. Alle sechs Akzentfamilien behalten geprüfte Kontraste. Zeichnungspapier und Materialien behalten ihre fachlichen Farben. Die zusätzliche Tiefe benötigt keine Grafikdateien, Datenbankabfragen oder KI-Verarbeitung.

- Ein eigener Datensatz in `user_preferences`, über den bestehenden Seitenabruf mitgeladen. Kein zusätzlicher Datenbank-Roundtrip für die Darstellung, keine Polling-Abfrage.
- Der Gerätemodus wird ausschließlich im Browser aufgelöst und erzeugt weder Schreibvorgänge noch KI-Aufrufe.
- Server gerenderte Farben vermeiden einen nachträglichen hellen Anwendungsrahmen beim Laden einer gespeicherten dunklen Darstellung. Öffentliche Anmeldung und Kundenportal bleiben in ihrer bisherigen Gestaltung.
- `account.appearance.update` verwendet die normalen aktuellen Mitgliedschaftsprüfungen, Versionskontrolle, Idempotenz, Audit und Outbox. FORCE RLS schützt persönliche Datensätze; ein Superadmin überschreibt nicht die Darstellung anderer Zugänge.
- Einführung und Darstellung werden beim Abschluss gemeinsam gespeichert. Bei einem Versionskonflikt erfolgt keine Teilübernahme.
- Migration `0039_personal_appearance.sql` ist additiv. Backup- und Wiederherstellungsdefinitionen enthalten die Präferenzen.
- Die Palette ist eine geprüfte Auswahl; frei eingegebene CSS-Werte werden nicht angenommen. Maßgeblich sind die zentralen Werte in `packages/contracts/src/appearance.ts`.

## Prüfung

`tests/appearance.test.ts` prüft Textkontrast aller Paletten im normalen und Hover-Zustand. `scripts/appearance-integration.ts` prüft Speicherung, Wiederholung, Versionskonflikte, Mandanten-/Nutzertrennung und den atomaren Abschluss der Einführung. `tests/e2e/appearance.spec.ts` prüft reale Bedienung, übereinstimmende Farbfelder/Vorschau, Speicherung auf einem zweiten Browser, Server-HTML, Gerätewechsel ohne Schreibzugriffe, Fehlerversuch/Wiederholung, Einführung, Formulare und Studio. Die Gesamtfreigabe wird in der aktuellen Abnahmedokumentation festgehalten.
