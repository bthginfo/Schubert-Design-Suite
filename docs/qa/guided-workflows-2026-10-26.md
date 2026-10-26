# Geführte Planung, Kundenaktionen und KI-Rückfragen

## Verhalten

Fünf Vorhaben führen in den passenden Anfang: neues Grabmal, Nachbeschriftung, Bad/Raumaufmaß, Waschtisch/Arbeitsplatte und Fensterbank. Die Auswahl bleibt am Projekt gespeichert. Eine Nachbeschriftung beginnt mit einem bestehenden Stein; eine Fensterbank mit einem passenden Bauteil, ohne einen Raum vorauszusetzen. Die Vorlagen erfinden keine Auftragsmaße oder Bestandsunterlagen. Nach dem Grundkörper führt die Hauptaktion zur Gestaltung, nach vorhandener Gestaltung zur Prüfung. Weitere Bauteile bleiben über die Werkzeugleiste erreichbar.

KI-Rückfragen können ein einzelnes Maß mit Einheit, eine begrenzte fachliche Auswahl oder eine echte freigegebene Materialreferenz anfordern. Alte Textantworten bleiben kompatibel. Zunächst erscheinen höchstens drei Rückfragen; weitere werden ausdrücklich eingeblendet. Unbekannte Angaben lassen sich offen halten. Antworten werden vor dem Senden als bearbeitbare Nachricht übernommen. Sie lösen weder einen weiteren Modellaufruf noch eine Planänderung aus. Kontext, Schrittgrenzen, Originalwortlaut, Budgetreservierung, optionale Fachskills und Freigabegrenzen bleiben maßgeblich.

Die Kundenübersicht zeigt bis zu sechs nächste Aktionen aus echten offenen Aufgaben, Arbeitspaketen, veröffentlichten Angeboten und überfälligen Forderungen. Termin und tatsächliche Zuständigkeit werden angezeigt; fehlende Zuständigkeit wird benannt. Auswahl und Links berücksichtigen Rechte, Kunde, Rechtsträger und operative Auftragszuordnung. Die Übersicht versendet keine Rückmeldungen und mahnt nicht automatisch.

Die neue Duravit-DE-Lieferstrecke prüft eine gescannte private CSV, Dateihash, Spaltenzuordnung und Originaleinheit. Eine Vorschau zeigt neue, geänderte und unveränderte Referenzstände. Nur die ausdrückliche Übernahme schreibt neue Versionen; alte Planbindungen bleiben erhalten. Veraltete Vorschauen, Quarantäne, fremde Zuständigkeit, fehlende Planungsnutzungsrechte und Ersatz technisch geprüfter Artikel werden abgefangen. Scan und Rechtefreigabe sind getrennte Voraussetzungen. [Betriebsanleitung und offene Datenbeschaffung](../operations/manufacturer-deliveries.md).

## Prüfung und Grenzen

Die technische Prüfung spielt beide Studios, Kundenarbeit und Administration mit synthetischen Rollenkonten durch. Geprüft werden Desktop und Mobilansicht, Tastatur, Fokus, Kontrast, Überlauf, Theme-Konsistenz und reduzierte Bewegung. Beim neuen kompakten KI-Einheitenfeld wurde eine überdeckte Klickfläche gefunden und korrigiert. Die Browserprüfung von Rückfragen verwendet ausdrücklich kontrollierte Modellantworten und echte Katalogsuchen; daraus wird kein zusätzlicher kostenpflichtiger Modelltest abgeleitet.

Die Importprüfung verwendet klar bezeichnete synthetische CSV-Dateien und vertrauenswürdige Upload-/Scan-Metadaten in der lokalen Testdatenbank. Datenbankbefehle, Vorschau, Übernahme, Rechte, Hashprüfung und Versionskonflikte werden tatsächlich ausgeführt. Ein Live-Herstellerfeed und eine erfolgreiche externe Dateiprüfung werden dadurch nicht behauptet.

Unter Hilfe ist ein geschlossener Praxistest mit drei Aufgaben pro Arbeitsbereich vorbereitet. Bewertungen und Notizen bleiben während der Sitzung beim jeweiligen Benutzer erhalten; die Rückmeldung wird vor dem Senden geprüft. Dieser UI-Ablauf ist automatisiert getestet. **Ein Test mit tatsächlichen Mitarbeitenden wurde noch nicht durchgeführt.** Die Testleitung muss reale Teilnehmende und die konkreten TEST-Kunden, Maße und Wortlaute bereitstellen; die noch offene Rückfrage dazu gilt nicht als Zustimmung oder Teilnahme.

| Prüfung | Ergebnis |
| --- | --- |
| Svelte / TypeScript | 0 Fehler, 0 Warnungen |
| Unit-Tests | 413 bestanden in 66 Dateien |
| PostgreSQL | 67 Integrationsprüfungen bestanden, einschließlich fehlender Quellenrechte und Kontextwechsel |
| Vollständiger Browserlauf | 73 Szenarien in einem Lauf bestanden |
| Abschlussabgleich | 24 betroffene Szenarien einschließlich des zusätzlichen Nachbeschriftungsfalls bestanden; der korrigierte Herstellerimport danach separat erneut auf Desktop und Mobil geprüft |
| Produktionsbuild | Erfolgreich |
| Anforderungsverfolgung | 154 Abschnitte, 69 Abnahmeszenarien zugeordnet |

Die Prüfungen decken insgesamt 74 verschiedene Browserszenarien ab; daraus wird kein einzelner abschließender 74er-Lauf behauptet. Beim Schlussabgleich wurden außerdem die gespeicherte Vorhabenart und die tatsächlich sichtbaren Kundenaktionen an den serverseitigen KI-Kontext gebunden. In einem geöffneten Kundenunterbereich werden keine ausgeblendeten Übersichtsempfehlungen ergänzt. Bestehende Schrift erfüllt die Aufgabe einer geplanten Nachbeschriftung nicht; neu ergänzte Bauteile werden nicht pauschal zu Bestand erklärt.

Aktuelle echte PDF-Ausgaben aus gespeicherten synthetischen Revisionen wurden gerastert und visuell geprüft: Grabmalansicht, Grundriss und Stückliste zeigen Maßbezüge, Entwurfsstand und Herkunftsgrenzen. [Grabmal-PDF](guided-workflows-2026-10-26/evidence/memorial.pdf), [Raum-PDF](guided-workflows-2026-10-26/evidence/room_plan.pdf).

Ausgewählte visuelle Belege: [Fensterbank](guided-workflows-2026-10-26/evidence/sill-desktop.png), [Nachbeschriftung](guided-workflows-2026-10-26/evidence/inscription-addition-desktop.png), [3D-Inschrift](guided-workflows-2026-10-26/evidence/memorial-next-3d.png), [Kundenaktionen mobil](guided-workflows-2026-10-26/evidence/customer-next-mobile.png), [KI-Rückfragen mobil](guided-workflows-2026-10-26/evidence/typed-ai-mobile.png), [Quellenrechte mobil](guided-workflows-2026-10-26/evidence/manufacturer-rights-mobile.png). Dateigrößen und SHA-256-Nachweise stehen im [Manifest](guided-workflows-2026-10-26/evidence/manifest.json).

Vor der Arbeit wurde ein privates lokales Datenbankbackup erstellt. Bestehende Testdaten bleiben erhalten; zwei additive Migrationen ergänzen Projektmetadaten und die Lieferhistorie. Die Produktionsmigration verwendet den bestehenden getrennten Maintenance-Build, prüft die Vorgänger-Checksummen, Rollen und erzwungene RLS sowie den unveränderten Testdaten-Manifeststand. Die zeitweilige Besitzerverbindung wird danach wieder vom Maintenance-Projekt getrennt. Die Hauptanwendung behält ihre eingeschränkte Datenbankrolle.
