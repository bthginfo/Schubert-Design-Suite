# Testbetrieb, Einführung, Nummernkreise und KI-Verbrauch

Die Startseite zeigt berechtigten Integrationsadministratoren den KI-Verbrauch des aktuellen UTC-Monats. Unter **Einstellungen → KI-Verbrauch** stehen Monat, Ein-/Ausgabetokens, gemeldete Cache-Tokens, Kosten und Aufschlüsselung nach Aufgabe und Modell. Fehlende Messwerte bleiben gekennzeichnet. Die Suite liest ihre vorhandenen Aufrufprotokolle mit einem Monatsindex; es gibt weder Anbieter-Polling noch kostenpflichtige Anfragen durch das Dashboard. Die vorhandene Seitenablage hält Ergebnisse bis zu 15 Sekunden pro Nutzer, Berechtigung und juristischer Einheit.

Kosten sind Schätzungen anhand des beim Aufruf eingefrorenen Preisprofils in USD. Manuell mit einem Anbieterbeleg abgeglichene Kosten werden separat ausgewiesen. Bereits erfasste historische Kosten werden nicht nachträglich umgerechnet. Cache-Lese- und Schreibanteile sind Teil der Eingabetokens; Reasoning ist Teil der Ausgabetokens. Die aktuelle Berechnung berücksichtigt für die dokumentierte GPT-5.6-/GPT-6-Familie die Cache-Multiplikatoren. Preisprofile bleiben vom Administrator zu pflegen. Die tatsächliche Anbieterabrechnung ist in OpenAI maßgeblich: https://platform.openai.com/usage

Quellen: https://developers.openai.com/api/docs/guides/prompt-caching und https://developers.openai.com/api/docs/pricing

## Einführung und Hilfe

Beim ersten Aufruf der Startseite erscheint eine Einführung passend zur Rolle. Sie lässt sich abschließen oder für später schließen. Der persönliche Status ist im Serverbestand gespeichert, wird durch Mandant, juristische Einheit und Akteur geschützt und kann über **Hilfe & Einführung → Einführung neu starten** zurückgesetzt werden. Die Schritte selbst lösen keine laufenden Schreib- oder KI-Aufrufe aus.

Das Fragezeichen oben öffnet Hilfe zur aktuellen Seite. Für Fachlisten werden die tatsächlich berechtigten Felder und Aktionen erklärt. Der Hilfebereich enthält Suchfunktion, Anleitungen und FAQs; er funktioniert ohne KI-Verbindung. Auf kleinen Bildschirmen ist die Auswahl der Einstellungsbereiche als beschriftetes Auswahlfeld erreichbar.

## Nummernkreise

Unter **Einstellungen → Nummernkreise** stehen unter anderem Rechnungen, Angebote, Aufträge, Kunden, Lieferanten, Bestellungen und Lieferscheine zur Verfügung. Platzhalter: `{NR}`, `{JJJJ}`, `{JJ}`, `{MM}`. Mindeststellen führen nur Nullen voran und kürzen eine größere laufende Nummer niemals.

Die nächste freie Nummer ist die erste Nummer, die nach Speicherung vergeben werden soll. Beispiel: letzte Nummer im Altsystem 347 → Start bei 348. Bereits in der Suite verbrauchte Zählerstände dürfen nicht zurückgesetzt werden. Neue Nummern werden atomar und unter derselben Sperre wie Profiländerungen vergeben. Auch Kollisionen mit bestehenden Datensätzen und der unveränderlichen Vergabehistorie werden abgefangen. Ein Rollback verbraucht keine Nummer. Gesperrte Wiederherstellungszähler bleiben gesperrt.

Jährlicher Neustart benötigt eine Jahresangabe im Format; fortlaufende Zählung nutzt einen gemeinsamen Zähler. Jahr und Monat richten sich nach Europe/Berlin. Rechnungsnummern entstehen weiterhin erst bei der Ausstellung. Die Vorschau ist unverbindlich und verbraucht keine Nummer. Bestehende Belegnummern und ausgestellte Originale bleiben unverändert. Änderungen erfordern aktuelle Version, erneute Authentifizierung, dokumentierten Grund und Auditnachweis.

## Kennzeichnung und Entfernung der Testdaten

Der ausdrücklich angeforderte Datensatz enthält fiktive Familien Lenz und Bergmann, verknüpfte Beratung, Angebote, Aufträge, Material, Team, Planung, Unterlagen und Entwürfe in den weiteren Fachbereichen. Die Szenen für Grabmal und Grundriss basieren auf den zuvor geprüften Geometriebeispielen. Es erfolgen keine automatischen KI-Renderings, E-Mails, Bestellungen oder Rechnungsausstellungen.

Die Einträge tragen **TEST**. Die juristische Einheit zeigt zusätzlich das Banner **Testbetrieb**. Ihre Kennungen, Tabellen und Abdeckung sind in `demo_datasets.records` und `demo_datasets.coverage` gespeichert. Das Installationsskript läuft nur ausdrücklich: `scripts/demo-data.ts --production`. Es wird weder beim Build noch im normalen Betrieb ausgeführt und ist durch Datasetname, Transaktionssperre und Command-Idempotenz vor Doppelanlage geschützt. `--dry-run` prüft die referenzielle Anlage im synthetischen Bestand und rollt die Transaktion zurück.

Originale Beispielunterlagen durchlaufen den normalen privaten Upload und die Dateiprüfung. Fachlich freigegebene Hersteller-, Steuer-, Bank- oder Fertigungsnachweise werden nicht vorgetäuscht. Forderungen, Verbindlichkeiten, Verrechnungen und Mahnungen entstehen weiterhin aus den bestätigten Fachabläufen; für diese Abläufe sind Rechnungsentwürfe und eine Beispielzahlung vorbereitet.

Für `--production` wird die bestätigte Produktionsverbindung aus dem lokalen Provisionierungsnachweis mit der eingeschränkten Rolle `schubert_app` verwendet. Die Entwicklungsverbindung aus `.env` wird dafür nicht verwendet. Die Beispiel-PDF mit dem Namen `TEST - Schubert Beispielunterlagen.pdf` muss vorher über die Live-Anwendung hochgeladen werden; dadurch verwendet sie deren privaten Speicher und echten Prüfauftrag. Die lokalen Zugangsdaten bleiben außerhalb von Git.

**Löschung erfolgt erst auf ausdrückliche Anweisung des Betreibers.** Vorher Manifest und inzwischen hinzugekommene Referenzen ermitteln. Nutzeränderungen und echte betriebliche Einträge nicht pauschal löschen. Geschützte Historien, Belege und Archivobjekte nach den geltenden Regeln behandeln. Nach dem kontrollierten Datenabgleich und der Entfernung des Testbestands `training_mode` deaktivieren. Der aktuelle Release führt keine automatische Löschung durch.
