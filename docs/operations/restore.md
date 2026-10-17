# Sicherung und Wiederanlauf

## Aufbau

Der getrennte Backup-Dienst besitzt eine nur lesende PostgreSQL-Rolle sowie eine eigene private Blob-Ablage. Die Hauptanwendung kennt ausschließlich den Auslöser und öffentlichen Prüfschlüssel. Entschlüsselungsschlüssel, private Signatur und Schreibzugang zur Backup-Ablage gehören nicht in den Hauptserver. Snapshots sind per AES-256-GCM mit Zusatzdaten verschlüsselt, signiert und nach dem Schreiben privat zurückgelesen. Dateiübernahmen vergleichen SHA256 und vermeiden erneuten Transfer unveränderter Inhalte. Die aktuelle Konfiguration hält sieben Tage Sicherungen und begrenzt Ablage-/Transferbudgets.

Fachliche Änderungen markieren den Sicherungsstand als offen; gebündelte Jobs vermeiden eine Vollsicherung bei jedem Tastendruck. Der tägliche Abgleich ergänzt diese Auslösung. Die Systemanzeige unterscheidet letzten geprüften Snapshot und neuere ungesicherte Änderungen. Ein noch offener Sicherungsstand ist kein erfolgreicher Restorepunkt.

Zulässige Löschungen werden zusätzlich als separat verschlüsseltes Journal gesichert. Bei einem Restore ist immer der **aktuellste** Journalstand anzuwenden, auch wenn der gewählte Snapshot älter ist. Identitäten werden über konkrete Dokument-/Personenbezüge entfernt; gleiche Bytes einer anderen zulässigen Akte dürfen dadurch nicht versehentlich gelöscht werden.

## Isolierter Probelauf

`scripts/restore-exercise.ts` darf nur mit eigens bereitgestellter Restore-Konfiguration laufen. Die Datei enthält einen Schutz gegen einen produktiven App-Modus. Sie erstellt ein isoliertes Schema und temporäre private Dateikopien. Sie prüft Snapshot-Signatur, Entschlüsselung, Tabellen, Referenzen und alle konkreten Datei-Hashes; anschließend werden aktuelles Löschjournal sowie Zugangs- und Ausgabesperren angewendet. Probelaufpfade und sichere Prüfergebnisse werden lokal protokolliert. Personenbezogene Klartextdaten und Schlüssel sind keine öffentlichen Testartefakte.

Ausgeführter Probelauf am17.10.2026:197Tabellen,2676Zeilen,375Fremdschlüssel und36physische Dateien; alle kopierten Dateien privat zurückgelesen. Das nach dem Snapshot entstandene Journal wurde erfolgreich eingespielt, einschließlich gelöschter OCR und unverändert erhaltener unabhängiger Dokumentidentität mit gleichen Bytes. Gemessenes RPO62Sekunden, RTO97Sekunden in dieser Entwicklungsprobe. Diese Werte sind ein tatsächlicher Einzeltest und keine garantierte Produktions-SLA.

## Tatsächliche Wiederaufnahme

1. Schreibzugriffe der betroffenen Gesellschaft und ausgehende Jobs sperren; beschädigten Bestand und Ereigniszeitpunkt dokumentieren.
2. Passenden signierten Snapshot in eine isolierte Ersatzdatenbank und getrennte private Zielablage wiederherstellen. Quell- und Zielidentität ausdrücklich prüfen.
3. Die neuesten separat gesicherten Lösch-/Sperrnachweise vor einer Benutzerfreigabe einspielen. Datei-Hashes und Dokumentversionen erneut prüfen.
4. Interne Sitzungen und Portalzugänge widerrufen. Externe Jobs/Outbox, E-Mail und Rechnungsausstellung bleiben gesperrt, bis deren tatsächlicher Ausgang geklärt ist.
5. Rechnungs- und andere Nummernkreise mit den neuesten unabhängigen Ausgabenachweisen und dem noch erreichbaren Bestand abgleichen. Bei Unsicherheit bleibt der Kreis gesperrt; historische Nummern nicht wiederverwenden.
6. Offene Forderungen, Zahlungen, Lieferantenverbindlichkeiten, Bestände und letzte Archivbelege abgleichen. Erst nach dokumentierter Freigabe neue Schreibstrecke und danach gezielt externe Zustellungen aktivieren.
7. Neue Basissicherung auslösen, Restoreprotokoll und tatsächliches RPO/RTO sichern. Temporäre Probeziele erst nach Abschluss kontrolliert entfernen.

Die Hauptanwendung kann den unabhängigen Sicherungsstore nicht selbst überschreiben. Ein Ausfall des gemeinsamen Vercel-Kontos ist dennoch ein Kontorisiko: Der Benutzer hat ausdrücklich ausschließlich Vercel-Dienste zugelassen. Organisatorische Kontowiederherstellung und eine etwaige spätere zusätzliche externe Sicherung bleiben eine separate Betriebsentscheidung.
