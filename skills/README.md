# Schubert-Fachskills

Die vier selbst verfassten Fachskills gelten ausschließlich für einen Steinmetzbetrieb in Deutschland:

- [Grabmal & Inschrift](schubert-memorial-de/SKILL.md)
- [Raum & Naturstein](schubert-room-de/SKILL.md)
- [Herstellerdaten & Unterlagen](schubert-source-review-de/SKILL.md)
- [Büro & Entwürfe](schubert-office-drafts-de/SKILL.md)

Sie enthalten Arbeitsabläufe und Rückfrageregeln, keine erfundenen Normwerte. Konkrete Friedhofssatzungen, technische Regeln und Herstellerunterlagen bleiben versionierte, ausdrücklich berechtigte Quellen für den jeweiligen Auftrag. Es wurden keine fremden Experten-Skillpakete übernommen.

## Verwendung in der Anwendung

Der Server begrenzt das Verzeichnis auf den berechtigten Kontext: ein Studioskill für das geöffnete Studio oder Bürohilfe für einen konkreten Vorgang/Formularentwurf; Quellenhilfe zusätzlich nur bei ausgewählten Unterlagen. Die KI sieht zunächst ausschließlich die Kurzbeschreibungen und entscheidet selbst, ob sie direkt antwortet oder über `load_schubert_skills` ein bis zwei passende Fachhilfen anfordert. Der Server wählt keinen Skill automatisch aus. Quellen und Nutzereingaben können keine weiteren Skills freischalten.

Ohne Nachladen gibt es einen Anbieteraufruf. Nach einem gültigen Leseaufruf erhält eine abschließende, eigenständige Anfrage denselben berechtigten Kontext plus die gewählten Arbeitsanweisungen. Es werden keine Modellgedanken oder Teilvorschläge wiederverwendet. Insgesamt sind höchstens zwei Anbieteraufrufe möglich; die abschließende Anfrage hat keine Tools. Das Modell, der Antwortvertrag und die Bearbeitungsgrenzen bleiben dieselben. Budgetreservierung deckt beide Anfragen ab; tatsächliche Nutzungsdaten beider Antworten werden zusammengezählt. Unklare Ergebnisse oder fehlende Abrechnung halten die Reservierung und sperren identische weitere Anfragen.

Antworten nennen nur tatsächlich geladene Fachhilfen unter „Verwendete Fachhilfe“. Der Server speichert IDs, Versionen, Registry-Hash und Anbieteraufrufe. Eine Auswahl ist keine fachliche Freigabe. Rechte, Quellenzugriff, Zahlenberechnung, Geometrieprüfung und bindende Aktionen werden unverändert serverseitig geprüft.

## Pflege und Prüfung

`SKILL.md` ist die einzige manuell gepflegte Quelle für jede optionale Fachhilfe. Die überprüften Manifeste werden mit `node scripts/build-ai-skills.mjs` in `packages/ai/src/skills.generated.json` gebündelt. Dadurch benötigen Produktionsfunktionen keine Dateizugriffe oder allgemeine Shell-Werkzeuge. Der Inhalts-Hash geht in den Anfragecache ein. `pnpm check` und `pnpm build` lehnen ein veraltetes Bundle ab. Bei einer inhaltlichen Änderung die Skillversion erhöhen und das Bundle neu erzeugen.

`pnpm test` prüft optionale Auswahl, Studio-/Quellenbegrenzung, fehlerhafte oder manipulierte Toolaufrufe, Abbruch, maximale Aufrufanzahl und Kostenschätzung. `pnpm test:integration` prüft den echten OpenAI-SDK-Aufruf und echte PostgreSQL-Reservierungen mit einem ausschließlich synthetischen, netzfreien Anbietertransport. Das ist kein Nachweis der Antwortqualität eines Live-Modells. Browserprüfungen decken die Fachhilfeanzeige und die bestehenden Studio-/Büroabläufe ab.
