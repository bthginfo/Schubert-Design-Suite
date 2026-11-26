# Betrieb, Konfiguration und Grenzen

Stand:18.10.2026. Die Software unterscheidet technische Verfügbarkeit und fachliche Freigabe.

## Bestehende Dienste

Hauptanwendung: `schubert-design-suite` auf Vercel, Region Frankfurt. Neon Postgres für Geschäftsdaten; private Vercel-Blob-Ablage für Originale und Ableitungen. Separate Vercel-Projekte `schubert-suite-documents`, `schubert-suite-renderer` und `schubert-suite-backup` verarbeiten Dokumente, Blender-Szenen und Sicherungen. Die Backup-Ablage gehört zu einem eigenen privaten Blob-Store. AWS- und Backblaze-Konten sind nicht Bestandteil des Betriebs.

Vercel-Pro-Nutzung und Neon-Free-Kontingente haben nutzungsabhängige Grenzen. Keine monatliche Pauschalgarantie wird aus lokal erfolgreichen Tests abgeleitet. Datenbankverbindungen sind auf sechs pro Prozess begrenzt und werden nach20Sekunden Leerlauf geschlossen; die App vermeidet periodische Listenabfragen, begrenzt Suchtreffer und Chargen und invalidiert kurzlebige Lesecaches nach Schreibvorgängen. Datei- und KI-Budgets besitzen eigene Reservierungen. Die Vercel-Verbrauchsübersicht bleibt für tatsächliche Abrechnung maßgeblich.

## Noch betriebsseitig zu bestätigen

| Grundlage | Wo | Wirkung ohne Freigabe |
|---|---|---|
| Rechtsname, öffentliche Anschrift, USt-ID/Register | Einstellungen/Betriebsdaten; öffentliche Quelle im Datensatz | Daten vorbereitet; keine automatische Rechnungsfreigabe |
| Bankkonto, Steuerverfahren, Rechnungsregeln | Zuständige Finanzperson mit frischer Anmeldung | Ausstellung/Zahlungsgrundlagen bleiben gesperrt |
| Kanzleinummern, Konten je Steuergruppe und Belegart, Testimport | Einstellungen/DATEV | Kein unbestätigter Buchungsstapel |
| Aufbewahrungsregeln, Prüfverantwortliche und Quellen | Datenschutz | Keine geratene Frist oder unzulässige Löschung |
| Vertrags-/Verbraucherinformationen | Regeln und Portalprofil | Betroffene verbindliche Annahme gesperrt |
| SMTP-Server, persönlicher Absender und Zugang | Superadmin/Verbindungen | Kein simulierter Mailversand |
| Herstellermodelle, Rechte, Glyphen-/Bohrdaten | Bibliothek und technische Freigaben | Referenzberatung möglich, unbewiesene Fertigung gesperrt |
| Mitarbeiter, Arbeitsmodelle, Feiertage, Anfangssalden, Qualifikation | Personal und Administration | Unbekannte Kosten/Salden bleiben unbekannt |

Für den ausdrücklich angeforderten Testbetrieb gibt es klar gekennzeichnete, fiktive Beispieldaten einschließlich Preisen und Beschäftigten. Sie sind keine betrieblichen Stammdaten oder Herstellerzusagen; fachliche Freigaben werden nicht vorgetäuscht. Umfang und kontrollierte spätere Entfernung beschreibt [Testbetrieb, Einführung, Nummernkreise und KI-Verbrauch](training-and-usage.md).

## Private Archivierung

Die ausdrücklich gewünschte Vercel-Blob-Lösung sichert Originalbytes privat mit Inhaltsnachweisen, Versionbindung, Auditkette, Ablaufprüfungen und Löschsperren in der Anwendung. Ein unabhängiger Backup-Store ergänzt die Wiederherstellung. **Vercel Blob bietet in diesem Aufbau keinen providerseitigen WORM-/Object-Lock-Nachweis.** Ein entsprechend privilegierter Vercel-Kontoinhaber kann Infrastrukturdateien außerhalb der Anwendung löschen. Verfahrensdokumentation, Kontozugänge und organisatorische Archivkontrollen müssen diese Eigenschaft berücksichtigen; eine automatische GoBD-Zertifizierung wird nicht behauptet.

## Herstellerkatalog

Der Vercel-Cron ruft die hinterlegten öffentlichen Artikelstammdaten und Herstellerverzeichnisse am 11. jedes Monats um 11:03 Uhr UTC über `/api/v1/internal/manufacturer-catalog` ab. Um 12:08 Uhr UTC folgt ein gezielter Wiederholungsabruf für zuvor ausgefallene Quellen. Er verwendet das bestehende `CRON_SECRET` und legt einen komprimierten Stand im bestehenden privaten Blob-Speicher ab. Ausgefallene oder unvollständige Quellen behalten ihren letzten gültigen Stand. `MANUFACTURER_CATALOG_RECONCILED` enthält Anzahl und Zustand der abgeglichenen Quellen.

Suchanfragen verwenden den zwischengespeicherten Stand im Anwendungsspeicher. Herstellerzugriffe außerhalb des Monatsabgleichs erfolgen bei einer ausdrücklich gestarteten Herstellersuche. Das Verzeichnis benötigt weder KI-Aufrufe noch Neon-Schreibvorgänge. Die gezielte Übernahme eines Artikels in den Betriebskatalog speichert die Artikelreferenz und ihren Herkunftsnachweis als Geschäftsdaten.

## Claude (Anthropic) und Kosten

Assistent, Unterlagenanalyse, Büroentwürfe und beide Planungsstudios arbeiten mit Claude über das offizielle Anthropic-SDK (`@anthropic-ai/sdk`, Messages API). Standardmodell ist Claude Opus 5.5 (`claude-opus-5-5`). Statt eines zweiten, günstigeren Modells steuert der Aufwand (`effort`) die Tiefe: niedrig im Büro und Chat, mittel in den Planungsstudios, hoch bei der ausdrücklich gewählten „Vertieften Prüfung“. Adaptives Nachdenken ist immer aktiv und zählt zu den Ausgabetokens. Im Integrationsformular kann der Superadmin Modell und Aufwand je Bereich ändern; bekannte Modelle erhalten ihre veröffentlichten Preise automatisch, eigene Modellkennungen benötigen ausdrücklich gespeicherte Preise.

Veröffentlichte Preise je 1 Mio. Tokens: Opus 5.5 4 / 20 USD (Cache-Lesen 0,20 USD), Sonnet 5.5 2 / 10 USD, Haiku 5.5 0,10 / 0,50 USD, Fable 5.2 8 / 40 USD. Die stabilen Arbeitsanweisungen werden als Cache-Präfix gesendet; der Folgeaufruf nach einer Fachabfrage liest Werkzeuge und Anweisungen aus dem Cache. Vor jedem Aufruf zählt die kostenlose Token-Zählung der API die tatsächliche Eingabe; nur wenn sie nicht erreichbar ist, gilt die vorsichtige Byte-Obergrenze. Die Reservierung wird nach dem Aufruf auf den gemeldeten Verbrauch abgerechnet.

Antworten sind über Structured Outputs an das Antwortschema gebunden. Fachabfragen sind strikte Werkzeuge; ein erzwungenes Werkzeug gibt es bei Opus 5.5 nicht, daher nennt der Server eine ausdrücklich beauftragte Datenabfrage im Anweisungsteil und prüft das Ergebnis wie bisher. Lehnt ein Sicherheitsfilter eine Anfrage ab, wiederholt die API sie serverseitig auf dem dafür empfohlenen Modell (`fallbacks: "default"`); ein so beantworteter Aufruf bleibt zur Kostenprüfung reserviert. Eine Überlastungsantwort (529) wird einmal kostenfrei wiederholt; andere Fehler starten keinen weiteren bezahlten Versuch.

Standardgrenzen: 1,00 USD Reservierung je Anfrage, 2,00 USD je vertiefter Prüfung, 50 USD Monatsbudget für alle KI-Aufrufe der Suite. Tatsächliche Kosten liegen typischerweise deutlich darunter.

### API-Credits aus dem Claude-Plan

Ein claude.ai-Abonnement wird nicht automatisch auf API-Aufrufe angerechnet. Max-, Ultra- und Team-Pläne enthalten jedoch monatliche API-Credits. Sie werden einmalig auf claude.ai unter Einstellungen → Abrechnung mit einer Organisation der Claude Console verknüpft, in der die Person Admin oder Billing-Mitglied ist. Diese Organisation muss dieselbe sein, in der der API-Schlüssel der Suite erstellt wird; eine spätere Änderung ist nur über den Support möglich. Neue Abonnements können nach sieben Tagen verknüpfen. Die Credits erscheinen monatlich, verfallen am Monatsende und gelten nicht für Claude Code. Quelle: [API-Credits für Abonnenten](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers).

Den Schlüssel unter [Claude Console → API Keys](https://platform.claude.com/settings/keys) erstellen und unter Administration → Integrationen → „Claude verbinden“ eintragen. Er wird mandantenbezogen verschlüsselt gespeichert. `ANTHROPIC_API_KEY` in Vercel ist nur ein Server-Fallback. Ein organisationsweiter Schlüssel benötigt zusätzlich die Workspace-ID (`wrkspc_…`, Feld im Formular oder `ANTHROPIC_WORKSPACE_ID`); ein in einem Workspace erstellter Schlüssel kommt ohne aus. Danach unter „KI-Verbrauch“ die kleine Verbindungsprüfung starten. Fehlt Guthaben, meldet die Suite dies ausdrücklich und berechnet nichts.

### Konzeptbilder und Spracheingabe

Claude erzeugt weder Bilder noch Transkripte. Fotorealistische Konzeptbilder (`gpt-image-2.5-flare`, ersatzweise `gpt-image-2`) und die Spracheingabe bleiben deshalb ein optionaler, getrennt gespeicherter OpenAI-Zugang unter „Konzeptbilder & Spracheingabe“. Ohne diesen Zugang bleiben beide Funktionen sichtbar deaktiviert; alle anderen KI-Funktionen laufen über Claude. Kosten werden vorab reserviert und gegen dasselbe Monatsbudget abgerechnet. Ein Bildmodell-Ersatz erfolgt nur nach einer ausdrücklich abgewiesenen Anfrage; unbekannter Ausgang führt nicht zu einem zweiten bezahlten Versuch.

## Sichere Aktualisierung

Zuerst Entwicklungsmigrationen, automatisierte Tests, private Providerprüfung und Browserabnahme durchführen. Datenbankschema vor dem neuen Hauptserver bereitstellen. Der separate Maintenance-Build erhält die Besitzerverbindung ausschließlich für die Migration; danach die Datenbankintegration von diesem Projekt wieder trennen. Die Hauptanwendung behält ausschließlich `schubert_app`. Einen Vercel-Produktionsbuild vor Promotion mit passender Datenbankversion prüfen. Migrationen sind vorwärtsgerichtet und per SHA an ihren Inhalt gebunden; Rollback des Servers ersetzt keinen Datenbank-Restore.

## Aufwendige Renderings

Auf ausdrücklichen Nutzerwunsch gibt es keine künstlichen monatlichen Stückgrenzen für Renderings. Gleiche Revision, Generatorfassung und Qualitätsstufe verwenden vorhandene Ergebnisse; konkurrierende identische Anfragen werden unter einem gemeinsamen Auftragslock zusammengeführt. Der Nutzer wählt Vorschau oder finale Qualität bewusst. Worker-Parallelität und Threads sind für den vorhandenen Vercel-Tarif begrenzt; weitere Aufträge bleiben in der Warteschlange. Die Produktoberfläche fragt den Status auf ausdrücklichen Wunsch ab. Tatsächlicher Verbrauch ist in der Vercel-Verbrauchsübersicht zu prüfen.


## Übergabestand und laufender Betrieb

Die [Produktivadresse](https://schubert-design-suite.vercel.app) ist eingerichtet. Die separate vertrauliche Datei Schubert-Zugangsdaten.txt liegt außerhalb des Repositorys im Ausgabenordner. Nach der ersten Anmeldung unter „Mein Zugang“ eine eigene erreichbare Adresse und eine neue persönliche Passphrase hinterlegen. SMTP danach unter Betrieb & Integration → Integrationen eintragen und die bewusste Testmail an eine eigene Adresse senden.

Der Claude-Schlüssel wird unter „Claude verbinden“ eingesetzt; ein späterer Schlüsselwechsel erfolgt im selben Formular. Der bisherige persönliche OpenAI-Schlüssel dient nur noch Konzeptbildern und Spracheingabe. Das Geheimnisfeld bleibt bei der Anzeige leer. Modell- und Kostenprofil prüfen, speichern und eine kleine Modellprüfung starten. Bereits freigegebene Aufträge behalten ihre genaue Verbindungsfassung; sie werden nicht still auf einen anderen Anbieterzugang umgebogen.

Vorgehensweisen bei Unterbrechungen und Schlüsselwechsel stehen in [Störungen und Änderungen](incidents.md). Die lokalen ignorierten Konfigurationsdateien, insbesondere .env.backup.local mit den Wiederherstellungsschlüsseln, sind vertrauliche Betreiberunterlagen und gehören zur eigenen gesicherten Betriebsablage. Der öffentliche Repositoryinhalt enthält diese Geheimnisse nicht.
