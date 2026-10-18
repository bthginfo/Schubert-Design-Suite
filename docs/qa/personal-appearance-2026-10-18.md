# Persönliche Darstellung und Feedback — Abnahme 18.10.2026

## Umfang

Persönliche Farben und Hell/Dunkel/Gerätemodus in „Meine Einstellungen“ und als letzter Einführungsschritt. Sechs kuratierte Farbfamilien; im Dunkelmodus zeigen Auswahl und Vorschau die tatsächlichen helleren Farben mit passenden Namen. Die Präferenzen werden pro internem Nutzer gespeichert. Der bestehende Feedback-Button und die Superadmin-Auswertung bleiben integriert.

## Nachweise

- 260 Unit-Tests bestanden, darunter Kontrast aller sechs Paletten für normalen Text, Hover-Zustände und sichere Behandlung ungültiger Theme-Werte.
- 29 echte PostgreSQL-Integrationsprüfungen bestanden. Neue Prüfungen: wiederholbare Speicherung, Versionskonflikt, abgelehnte fremde Nutzer-/Mandantenzugriffe und atomarer Onboarding-Abschluss einschließlich Darstellung.
- 20 Browserabläufe bestanden. Enthalten sind Farbfeld/Vorschau-Abgleich für alle Paletten in beiden Modi; Speicherung und erneutes Laden; zweiter Browser; serverseitige Darstellung; Gerätewechsel ohne POST; Fehler/Wiederholung; Einführung; Feedback; Nummernkreise und echte Angebotsnummer; Rollen; Offline-Zeit; Grabmal und Raum mit gespeicherten Maßen, Kontur, 3D-Kamera, PDF und Stückliste.
- Svelte-/TypeScript-Prüfung ohne Fehler oder Warnungen. Produktions-Build erfolgreich. Quelltextprüfung ohne Zugangsschlüssel.
- Repräsentative Desktop- und Mobilansichten auf Überlauf und schwere/kritische automatisierte WCAG-Befunde geprüft. Der native 3D-Raum und die technische Zeichenfläche behalten ihre fachlichen Farben.
- Produktionsschema 39 mit allen lokalen Prüfsummen über den Nur-Lese-Zugang bestätigt. Die temporäre Datenbankverbindung des vorhandenen Wartungsprojekts anschließend getrennt.

## Designprüfung

Eine frische unabhängige Prüfung sichtete elf gültige Screenshots. Die Richtung und die korrekte Farbdarstellung wurden bestätigt. Drei konkrete P2-Befunde wurden behoben: sichtbare/fokussierte Fehler beim Schließen oder Abschließen der Einführung, kollisionsfreie X/Y/Z-Beschriftungen und kontrastreiche Suchplatzhalter. Die tatsächliche vorherige Platzhalterfarbe der dunklen Suche war `rgb(117,117,117)`; sie ist jetzt `rgb(181,193,185)` bei Deckkraft 1.

Die abschließende fokussierte Nachprüfung der drei Befunde ergab **ship**, alle drei **resolved**, ohne offene Befunde in diesem Korrektursatz. Die elf Ansichten wurden erneut aufgenommen und um zwei Fehlerbilder ergänzt. Sieben betroffene Browserabläufe sind erneut bestätigt: zwei Darstellung, vier Hilfe/Verbrauch/Nummernkreise, ein Grabmal-/Raumablauf. Eine zunächst auf ein Feld ohne Platzhalter gerichtete Testassertion wurde auf die tatsächlich betroffene globale Suche korrigiert; der anschließende Darstellungslauf bestand vollständig. Die Freigabe ist auf diesen geprüften Umfang begrenzt.

Der einmalige Design-Detektor meldete ausschließlich die bestehende Inter-Schrift. Sie wurde gemäß dem bestehenden Gestaltungssystem beibehalten. Eine vollständige Garantie über sämtliche Gerätekombinationen oder alle möglichen Eingabedaten ist aus diesen Prüfungen nicht abzuleiten.

## Betrieb

Keine bezahlten KI-Aufrufe für diese Prüfungen. Keine periodischen Abfragen für die Darstellung; die Daten werden in der bestehenden Seitenabfrage mitgeladen. Keine Löschung des ausdrücklich gewünschten betrieblichen Testdatensatzes. Für den produktiven Geschäftsbetrieb bleiben die konkret offenen Betriebsangaben und Freigaben aus `docs/operations/configuration.md` maßgeblich.
