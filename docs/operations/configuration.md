# Betrieb, Konfiguration und Grenzen

Stand:17.10.2026. Die Software unterscheidet technische Verfügbarkeit und fachliche Freigabe.

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

Es sind keine erfundenen Produktpreise, Beschäftigten, Herstellerzusagen oder betriebliche Fachfreigaben im Produktivbestand hinterlegt.

## Private Archivierung

Die ausdrücklich gewünschte Vercel-Blob-Lösung sichert Originalbytes privat mit Inhaltsnachweisen, Versionbindung, Auditkette, Ablaufprüfungen und Löschsperren in der Anwendung. Ein unabhängiger Backup-Store ergänzt die Wiederherstellung. **Vercel Blob bietet in diesem Aufbau keinen providerseitigen WORM-/Object-Lock-Nachweis.** Ein entsprechend privilegierter Vercel-Kontoinhaber kann Infrastrukturdateien außerhalb der Anwendung löschen. Verfahrensdokumentation, Kontozugänge und organisatorische Archivkontrollen müssen diese Eigenschaft berücksichtigen; eine automatische GoBD-Zertifizierung wird nicht behauptet.

## OpenAI und Kosten

Günstige Standardaufgaben verwenden `gpt-6-luna`; vertiefte Planprüfung wählt der Nutzer ausdrücklich mit `gpt-6.1-sol`. Wiederholte identische Anfragen können kurzfristig wiederverwendet werden. Kontext, Bildausschnitte und Ausgabetokens sind begrenzt. Die Schubert-Designanweisungen liegen versioniert in `skills/schubert-design/SKILL.md` und den Modellprofilen. Fachliche Rechen- und Geometrieprüfungen bleiben deterministisch.

Bilder bevorzugen `gpt-image-2.5-flare`, ersatzweise `gpt-image-2`, sofern das konkrete Projekt sie zulässt. Ein Ersatz erfolgt nur nach einer ausdrücklich abgewiesenen Anfrage; unbekannter Ausgang führt nicht zu einem zweiten bezahlten Versuch. Kosten werden vorab reserviert und anhand der Anbieternutzung abgerechnet. Unklare Nutzung bleibt reserviert und ist mit Nachweis abzugleichen.

Das anfängliche App-Monatsbudget beträgt5USD; die vorhandene persönliche OpenAI-Vorauszahlung wurde ohne automatische Aufladung eingerichtet. Die Anwendung löst keine Aufladung aus. Der Superadmin kann später Projekt-Schlüssel und Modelle auf das Schubert-Konto umstellen. Alte Aufträge behalten ihre Verbindungsreferenz. Preise und Modellverfügbarkeit sind im konkreten Projekt vor dem Wechsel erneut zu prüfen.

Ein ChatGPT-Abonnement wird nicht automatisch auf gewöhnliche API-Aufrufe angerechnet. OpenAIs Token-Sharing-Verfahren beschreibt Plan-Nutzung für Open-Source-/lokal betriebene Apps; bezahlte oder entfernt gehostete Anwendungen benötigen den von OpenAI vorgesehenen Zulassungsweg. Die Vercel-Anwendung nutzt deshalb die reguläre projektgebundene API. Quellen: [OpenAI Token Sharing](https://developers.openai.com/siwc/token-sharing-open-source), [Modellübersicht](https://developers.openai.com/api/docs/models).

## Sichere Aktualisierung

Zuerst Entwicklungsmigrationen, automatisierte Tests, private Providerprüfung und Browserabnahme durchführen. Datenbankschema vor dem neuen Hauptserver bereitstellen. Der separate Maintenance-Build erhält die Besitzerverbindung ausschließlich für die Migration; danach die Datenbankintegration von diesem Projekt wieder trennen. Die Hauptanwendung behält ausschließlich `schubert_app`. Einen Vercel-Produktionsbuild vor Promotion mit passender Datenbankversion prüfen. Migrationen sind vorwärtsgerichtet und per SHA an ihren Inhalt gebunden; Rollback des Servers ersetzt keinen Datenbank-Restore.

## Aufwendige Renderings

Auf ausdrücklichen Nutzerwunsch gibt es keine künstlichen monatlichen Stückgrenzen für Renderings. Gleiche Revision, Generatorfassung und Qualitätsstufe verwenden vorhandene Ergebnisse; konkurrierende identische Anfragen werden unter einem gemeinsamen Auftragslock zusammengeführt. Der Nutzer wählt Vorschau oder finale Qualität bewusst. Worker-Parallelität und Threads sind für den vorhandenen Vercel-Tarif begrenzt; weitere Aufträge bleiben in der Warteschlange. Die Produktoberfläche fragt den Status auf ausdrücklichen Wunsch ab. Tatsächlicher Verbrauch ist in der Vercel-Verbrauchsübersicht zu prüfen.


## Übergabestand und laufender Betrieb

Die [Produktivadresse](https://schubert-design-suite.vercel.app) ist eingerichtet. Die separate vertrauliche Datei Schubert-Zugangsdaten.txt liegt außerhalb des Repositorys im Ausgabenordner. Nach der ersten Anmeldung unter „Mein Zugang“ eine eigene erreichbare Adresse und eine neue persönliche Passphrase hinterlegen. SMTP danach unter Betrieb & Integration → Integrationen eintragen und die bewusste Testmail an eine eigene Adresse senden.

Der persönliche OpenAI-Schlüssel wurde zunächst mit30Tagen Laufzeit angelegt; ein späterer Schubert-Schlüssel kann im selben Integrationsformular eingesetzt werden. Das Geheimnisfeld bleibt bei der Anzeige leer. Preis-/Modellprofil prüfen, speichern und eine kleine Modellprüfung starten. Bereits freigegebene Aufträge behalten ihre genaue Verbindungsfassung; sie werden nicht still auf einen anderen Anbieterzugang umgebogen.

Vorgehensweisen bei Unterbrechungen und Schlüsselwechsel stehen in [Störungen und Änderungen](incidents.md). Die lokalen ignorierten Konfigurationsdateien, insbesondere .env.backup.local mit den Wiederherstellungsschlüsseln, sind vertrauliche Betreiberunterlagen und gehören zur eigenen gesicherten Betriebsablage. Der öffentliche Repositoryinhalt enthält diese Geheimnisse nicht.
