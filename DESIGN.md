---
name: "SCHUBERT Design Suite"
description: "Modernes Arbeitsprodukt mit kühlem Porzellan, tiefem Navy und persönlichem Akzent."
colors:
  forest: "light-dark(#315c4c,#9fd5ba)"
  forest-dark: "light-dark(#244638,#bce8cf)"
  ocean: "light-dark(#245aa0,#a3c9ff)"
  ocean-hover: "light-dark(#18437c,#c1dcff)"
  violet: "light-dark(#6b45a0,#d0b5f6)"
  violet-hover: "light-dark(#503178,#e1ccff)"
  rose: "light-dark(#984368,#f2b3cd)"
  rose-hover: "light-dark(#75304f,#ffd0e2)"
  clay: "light-dark(#934c31,#edb79d)"
  clay-hover: "light-dark(#723921,#ffd3bd)"
  slate: "light-dark(#4b5868,#bdcbdc)"
  slate-hover: "light-dark(#34404f,#d7e0ec)"
  on-accent: "light-dark(#ffffff,#101827)"
  canvas: "light-dark(#eef2f7,#0d1422)"
  paper: "light-dark(#ffffff,#151f30)"
  ink: "light-dark(#192337,#eef3fc)"
  muted: "light-dark(#5d6a7c,#b8c6d9)"
  line: "light-dark(#dfe5ee,#35465e)"
  line-soft: "light-dark(#edf0f5,#263449)"
  wash: "light-dark(#f0f3f8,#1c2b40)"
  navigation-surface: "light-dark(#eef2f7,#101a2b)"
  workspace-surface: "light-dark(#f8fafc,#111b2b)"
  input-surface: "light-dark(#f8fafc,#111b2b)"
  danger: "light-dark(#993c35,#ffb5af)"
  danger-wash: "light-dark(#fff0ed,#37232d)"
  warning: "light-dark(#7a581e,#f1cc88)"
  warning-wash: "light-dark(#faf0d9,#302c24)"
  success: "light-dark(#315c4c,#a3d8b6)"
  success-wash: "light-dark(#eaf2ec,#18332f)"
  accent-wash: "light-dark(color-mix(in srgb,#315c4c 9%,#fff),color-mix(in srgb,#9fd5ba 12%,#151f30))"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-.025em"
  panel-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-.012em"
  body-copy:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-.012em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "-.012em"
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "-.012em"
  field:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-.012em"
  status:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-.012em"
  mobile-field:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-.012em"
rounded:
  badge: "5px"
  status: "6px"
  segment: "7px"
  compact-control: "8px"
  control: "9px"
  choice: "10px"
  disclosure: "11px"
  compact-panel: "12px"
  panel: "14px"
  workspace: "16px"
spacing:
  segment-inset: "4px"
  compact-gap: "8px"
  control-gap: "9px"
  group-gap: "10px"
  mobile-inline: "17px"
  mobile-panel: "18px"
  section-gap: "22px"
  field-column-gap: "22px"
  field-row-gap: "23px"
  panel-inset: "24px"
  compact-page-inline: "25px"
  editor-section-gap: "28px"
  page-inline: "32px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.forest-dark}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  input-field:
    backgroundColor: "{colors.input-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  navigation-active:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  section-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.forest}"
    rounded: "{rounded.segment}"
    padding: "8px 14px"
  status-success:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
    typography: "{typography.status}"
    rounded: "{rounded.status}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  appearance-choice:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "13px 5px"
  disclosure:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "14px 16px"
---

# Design System: SCHUBERT Design Suite

## Overview

**Creative North Star: "Das präzise Arbeitsprodukt"**

Die SCHUBERT Design Suite ist ein modernes, hochwertiges Arbeitsprodukt für einen Handwerksbetrieb. Eine kompakte, leicht getönte Navigationsleiste fasst einen deutlich eingesetzten Arbeitsraum ein. Kühles Porzellan im hellen Modus und tiefes Navy im dunklen Modus verbinden präzise Konturen, lesbare Inter-Typografie und zurückhaltende räumliche Tiefe.

Die Oberfläche richtet sich an deutschsprachige Menschen mit unterschiedlicher digitaler Erfahrung. Sichtbare Handlungsnamen, vertraute Formulare und klar getrennte Arbeitsbereiche tragen die Bedienung. Sechs persönliche Akzentfamilien und die drei Darstellungsmodi verändern den Rahmen; fachliche Statusfarben, technisches Zeichenpapier, Originalschriftbilder und reale Materialien behalten ihre Bedeutung.

**Key Characteristics:**

- Kompakte Navigation und ein klar abgegrenzter, eingesetzter Arbeitsraum.
- Kühle neutrale Flächen mit feiner Kontur und gezielter, weicher Tiefe.
- Ausgewählter Akzent für aktuelle Position, primäre Handlung und Auswahl.
- Lesbare deutsche Beschriftungen, erkennbare Zustände und erreichbare Aktionen.

Die Regeln beschreiben den authentifizierten Arbeitsrahmen und seine wiederverwendbaren Oberflächen. Authentifizierung und Kundenportal besitzen eigene Bestandslayouts; ihre speziellen Flächen und Schriftausnahmen sind keine zusätzlichen Vorlagen für den Arbeitsrahmen. Produktkontext: [PRODUCT.md](PRODUCT.md).

## Colors

Kühle, klar unterscheidbare Neutralflächen tragen beide Modi. Die normativen Werte stehen im Frontmatter; `light-dark()` enthält die helle und die dunkle Ausprägung.

### Primary

Die sechs Familien sind persönliche Alternativen mit derselben Rolle:

| Schlüssel | Heller Modus | Dunkler Modus | Hover-Token |
| --- | --- | --- | --- |
| forest | Waldgrün | Mintgrün | forest-dark |
| ocean | Ozeanblau | Hellblau | ocean-hover |
| violet | Violett | Flieder | violet-hover |
| rose | Beere | Rosé | rose-hover |
| clay | Terrakotta | Apricot | clay-hover |
| slate | Graphit | Silbergrau | slate-hover |

`forest` und `forest-dark` bezeichnen im laufenden Arbeitsrahmen den gewählten Akzent und seinen Hover-Zustand, auch bei einer anderen Familie. Die weiteren Palettenschlüssel dokumentieren die Alternativen aus [appearance.ts](packages/contracts/src/appearance.ts); sie sind keine zusätzlichen globalen CSS-Variablen. `on-accent` trägt Text auf vollflächigen Primäraktionen. `accent-wash` ist die sanfte Auswahlfläche für Navigation und persönliche Auswahl. Das Frontmatter zeigt die Mischung des Schubert-Standards; die Anwendung berechnet sie mit der gewählten Familie.

### Neutral

- **canvas:** äußerer Rahmen des Arbeitsprodukts.
- **navigation-surface:** kompakte linke Navigation, im dunklen Modus vom äußeren Rahmen abgesetzt.
- **workspace-surface:** eingesetzte Arbeitsfläche hinter den eigentlichen Panels.
- **paper:** Panel-, Kopf-, Dialog- und primäre Bedienfläche; keine Bezeichnung für physisches Zeichenpapier.
- **input-surface:** zurückgesetzte Eingaben, Tabellenköpfe und unterstützende Inhaltsflächen.
- **ink / muted:** primärer und sekundärer Text; Platzhalter verwenden `muted` mit voller Deckkraft.
- **line / line-soft:** äußere Kontur und leisere innere Trennlinie.
- **wash:** Gruppenhintergrund, ruhige Hinweise und inaktive Segmente.

### Semantische Zustände

`danger`, `warning` und `success` mit ihren jeweiligen `-wash`-Flächen behalten feste Bedeutungen. Statuslabels verbinden Farbe mit verständlichem Text und gegebenenfalls einem ergänzenden Punkt.

**The Akzent und Bedeutung Rule.** Die persönliche Akzentfarbe kennzeichnet Bedienung und Auswahl. Fehler, Warnung und Erfolg behalten ihre eigenen semantischen Farben und verständliche Texte.

**The Original bleibt Original Rule.** Technisches Zeichenpapier, Originalschriftbilder, reale Materialien, native 3D-Inhalte und erzeugte PDF-Inhalte behalten ihre fachlichen Farben.

Die zentrale Funktion `appearanceStyle()` setzt `color-scheme` und die Farbwerte inline an der Darstellungsgrenze des Arbeitsrahmens. Komponenten lesen semantische Variablen; die Aliase `text` und `surface` verweisen auf `ink` und `paper`. Waldgrün und Hell bleiben der Standard. „Wie mein Gerät“ folgt dem Browser; eine eigene Vorschaugrenze zeigt noch ungespeicherte Einstellungen.

## Typography

**Display Font:** Inter, sans-serif  
**Body Font:** Inter, sans-serif  
**Label/Mono Font:** Inter; tabellarische Ziffern für vergleichbare Zahlen, Zeiten und Tabellen.

Lokal eingebundene Schnitte (400, 500, 600 und 700) bilden eine klare, kompakte Produkthierarchie. Die Schrift wirkt durch Gewicht, Zeilenhöhe und leicht negative Laufweite; funktionale Beschriftungen bleiben in gewöhnlicher deutscher Schreibweise.

### Hierarchy

- **Headline:** Seitenüberschrift mit knapper, klarer Zeilenhöhe; mobil kleiner (28px).
- **Title:** allgemeine Abschnittsüberschrift; reguläre Panelköpfe verwenden die eigene Rolle **Panel title**.
- **Body / Body copy:** Grundschrift und erklärender Seitentext; Seitenbeschreibungen reichen bis (72ch).
- **Label / Button:** Feldnamen und Handlungen mit mittlerem Gewicht.
- **Field / Mobile field:** lesbare Eingaben; mobil größere Schrift gegen unbeabsichtigtes Einzoomen.
- **Status:** kompakter Bedeutungsnachweis, ohne Versalsatz oder zusätzliche Laufweite.

Im Studio haben Seitenkopf, Werkzeugleiste, Elementbaum und Inspektor eigene kompakte Rollen. Der Planungstitel ist regulär (28px), unter dem Editor-Breakpoint (24px). Inspektorfelder verwenden (13px), mobil (16px); sichtbare Achsen und Einheiten ergänzen die vollständigen zugänglichen Feldnamen.

**The Lesbare Handlung Rule.** Aktionen haben verständliche Namen. Symbole ergänzen Text; längere Namen dürfen zwischen vollständigen Wörtern auf die nächste Zeile wechseln.

## Layout

Der Desktoprahmen setzt die Arbeitsfläche mit Außenabstand (12px) neben eine feste Navigation (232px). Unter (1200px) wird die Navigation schmaler (214px). Die obere Utility-Leiste bleibt kompakt (64px Mindesthöhe); Inhalte sind auf maximal (1640px) begrenzt und seitlich regulär (32px), auf kompakten Desktops (25px) eingerückt. Im Inhaltsbereich bilden (22px) zwischen Gruppen und (24px) in Panels den häufigsten Rhythmus. Die Frontmatter-Abstände sind beobachtete Rollenwerte, keine zusätzlichen Laufzeitvariablen.

Zusammengehörige Filter und die Tabelle liegen in einem gemeinsamen Container. Die Filterzeile bleibt auf ausreichend breiten Ansichten einzeilig und darf bei Platzmangel umbrechen; Suchfeld, Status, Anwenden und Ergebniszahl bleiben zusammen. Formulare verwenden gewöhnlich zwei Spalten mit horizontalem Abstand (22px) und vertikalem Abstand (23px). Einstellungen besitzen eine eigene schmale Bereichsnavigation (188px), unter (1000px) kompakter (165px).

Die Tagesübersicht ordnet tatsächliche Termine beziehungsweise aktuelle Aufträge und den Aufmerksamkeitsbereich vor den Summen an. Eine leere Terminplanung wird als kompakte Hinweiszeile behandelt. Summen erscheinen als zusammenhängender Streifen; der KI-Verbrauch erhält eine kompakte unterstützende Zeile. Der Testbetrieb bleibt als zurückhaltender, wahrheitsgemäßer Kontext über den Inhalten sichtbar.

Unter (760px) entfällt der eingesetzte Außenrahmen. Die linke Navigation wird zur ausklappbaren Ansicht; die beschriftete untere Navigation bleibt erreichbar. Inhaltsabstand (17px), reguläre Buttons und Felder mit Mindesthöhe (48px) sowie Eingabeschrift (16px) unterstützen kleine Bildschirme. Datentabellen werden dort zu lesbaren Datensatzkarten. Bereichs- und Einstellungsnavigation wechseln zu beschrifteten nativen Auswahlen. Die sechs Akzentoptionen wechseln unter (650px) von sechs auf drei Spalten; die Modusoptionen stehen dann untereinander.

Das Studio behält seinen dreiteiligen Editor aus Elementbaum, Arbeitsansicht und Inspektor. Unter (1020px) wandert der Inspektor unter die Arbeitsansicht; unter (720px) stehen die Bereiche untereinander. Die Werkzeugleiste darf in vollständigen Gruppen umbrechen. Kopfaktionen bleiben auf Desktopansichten vollständige Wörter; mobil stehen sie in zwei Spalten. Der Vollbildmodus nutzt denselben Rahmen und dieselben semantischen Flächen.

**The Erreichbare Aktion Rule.** Scrollbare Inhalte halten Abschluss- und Schließaktionen erreichbar. Desktop-Hilfe und Feedback nutzen den reservierten Platz über dem Profil; modale Oberflächen bleiben frei von schwebendem Feedback.

## Elevation & Depth

Das Produkt verbindet Tonwert, feine Konturen und weiche räumliche Tiefe. Der eingesetzte Arbeitsraum hebt sich leicht vom äußeren Rahmen ab; aktive Segmente und die schwebenden Einstiege erhalten eine kleine Erhebung. Dialoge und Begleiter verwenden eine deutlichere, begrenzte Überlagerung. Reguläre Panels benötigen keine zusätzliche Einzelerhebung. Die exakten Schattenwerte stehen in den Sidecar-Erweiterungen.

**The Gezielte Tiefe Rule.** Tonwert und Kontur trennen Arbeitsflächen. Weiche Schatten setzen den Arbeitsraum, aktive Segmente und schwebende Hilfe räumlich ab; sie ersetzen keine verständliche Hierarchie.

Kurze Übergänge begleiten Hover, Konturwechsel, Navigation und aktive Zustände. Reguläre Aktionen verschieben sich beim Drücken leicht (1px). Die globale Regel für reduzierte Bewegung begrenzt Animationen und Übergänge; die ergänzende Produktregel entfernt die entsprechenden Zustandsübergänge und die Druckverschiebung. Die persönliche Darstellung benötigt keine zusätzliche Animation.

## Shapes

Sanfte Rechtecke unterscheiden Rollen: kompakte Segmente, reguläre Bedienelemente, Auswahlgruppen, Panels und der äußere Arbeitsraum besitzen abgestufte Rundungen. Panels bleiben klar rechteckige Arbeitsflächen, keine übergroßen Pillen. Die kleinen Radiusunterschiede im Frontmatter sind belegt und müssen nicht vereinheitlicht werden.

Konturen sind gewöhnlich (1px) stark. Innere Trennlinien verwenden `line-soft`, äußere Begrenzungen `line`. Akzentoptionen zeigen runde Farbfelder (36px) und ein Häkchen; die Auswahlkarte erhält zusätzlich Kontur und Fläche. Im Studio bleiben Zeichenpapier und echte Materialabbildungen innerhalb ihres eigenen fachlichen Darstellungsraums.

## Components

### Buttons

Primäraktionen verwenden den gewählten Akzent und `on-accent`, ihr Hover den familienabhängigen Hover-Wert. Sekundäre Aktionen verwenden `paper`, Ghost-Aktionen Transparenz und Gefahrenaktionen die semantische Fehlerfläche. Reguläre Buttons besitzen eine Mindesthöhe (42px); kleine Varianten (35px) und große Varianten (56px) bleiben eigene Größen. Mobil gelten regulär (48px), klein (44px) und groß (58px).

Beschriftungen dürfen verfügbare Breite nutzen, ergänzende SVG-Symbole schrumpfen nicht. Desktopaktionen im Studio und die Filteraktion behalten vollständige Wörter; die Werkzeuggruppen dürfen als Einheit auf die nächste Zeile wechseln. Deaktivierte Aktionen sind sichtbar gedimmt. Tastaturfokus bleibt eine Akzentkontur mit Abstand; globale und lokale Selektoren verwenden (2–3px).

### Inputs / Fields

Sichtbare Labels stehen über zurückgesetzten, fein konturierten Eingaben. Felder haben regulär eine Mindesthöhe (46px), Such- und Filterfelder (42px). Hover verstärkt die Kontur; Fokus verwendet den Akzent und hebt reguläre Formularfelder auf `paper`. Ungültige Felder erhalten die semantische Fehlerkontur sowie eine verständliche Meldung. Hilfetext ergänzt das Label; ein Platzhalter ersetzt es nicht.

### Navigation

Die aktuelle Position erscheint in der linken Leiste als sanfte Akzentfläche mit Akzenttext und gleichfarbigem Symbol. Inaktive Einträge bleiben auf dem getönten Navigationsgrund zurückgenommen. Die Bereichsnavigation zeigt bis zu vier Kernbereiche und hält den geöffneten Bereich sichtbar; das aktive Segment sitzt auf `paper` mit kleinem Schatten. **Alle Bereiche** öffnet ein durchsuchbares Verzeichnis. Escape schließt es und führt den Fokus zum Auslöser zurück.

Reguläre Tabs folgen derselben Segmentform: ruhiger Gruppenhintergrund, heller beziehungsweise erhöhter aktiver Eintrag. Einstellungen verwenden stattdessen eine vertikale, sanft akzentuierte Liste. Mobile native Auswahlen bieten jeweils die vollständige Bereichsliste.

### Cards / Containers

Panels besitzen `paper`, feine äußere Kontur, getrennte Kopf- und Inhaltsbereiche sowie bei Bedarf einen Aktionsfuß. Der reguläre Kopf ist vertikal (21px) und horizontal (24px) eingerückt; der Inhalt nutzt (24px). Innere Trennungen bleiben leiser als die Außenkontur. Auf kleinen Bildschirmen reduzieren sich Rundung und Einrückung passend zum verfügbaren Raum.

Datensätze verbinden einen stärkeren Titel mit zurückgenommenem Untertitel. Tabellenköpfe liegen auf `input-surface`; Zeilen nutzen feine Trennlinien und eine leichte akzentabhängige Hover-Fläche. Zahlen sind tabellarisch und Beträge rechtsbündig. Die kompakte leere Terminplanung bleibt links ausgerichtet und bietet den nächsten sinnvollen Link.

### Chips / Status

Statuslabels sind kleine, nicht interaktive Rechtecke mit Text, semantischer Fläche und gegebenenfalls einem ergänzenden Punkt. Ihre Farbe folgt dem Zustand; Auswahl und persönlicher Akzent verändern diese Bedeutung nicht.

### Disclosures

Ergänzende Hilfen verwenden native `details`/`summary` mit sichtbarer Richtungsanzeige und verständlichem Titel. Die gemeinsame Zusammenfassung besitzt eine Mindesthöhe (49px), mobil (52px). Formulargruppen nutzen eine stärkere Einfassung und eine höhere Zusammenfassung (56px). Öffnen trennt Titel und Inhalt; der Indikator dreht sich. Lange Titel dürfen umbrechen und der Tastaturfokus bleibt sichtbar.

### Begleiter, Dialoge und Einführung

Assistent und aktiviertes Testfeedback erhalten auf Desktopansichten einen reservierten schwebenden Bereich innerhalb der linken Leiste über dem Profil. Die Navigation reserviert dafür Platz. Mobil führt die Utility-Leiste zum Assistenten, aktiviertes Feedback erhält seinen eigenen Platz in der unteren Navigation.

Der Begleiter trennt **Hilfe für diese Seite** und **Chat** mit beschrifteten Auswahlflächen. Vorschläge gelangen zuerst in das Eingabefeld; **Senden** startet die Anfrage. Unterlagen und Modelloptionen bleiben aufklappbar. Der Desktopbegleiter ist eine begrenzte rechte Überlagerung; mobil begrenzt er den Fokus und stellt ihn beim Schließen wieder her. Dialoginhalte dürfen scrollen; Aktionsfüße bleiben erreichbar.

Die Einführung hebt reale Seitenbereiche mit Akzentkontur und abgedunkeltem Umfeld hervor. Schrittzahl, Erklärung und Zurück/Weiter bleiben an der Karte zusammen; die Karte richtet sich am sichtbaren Fenster aus. Die persönliche Darstellung bildet den letzten Schritt. Fehlerrückmeldungen erscheinen innerhalb der betroffenen Oberfläche und werden dort sichtbar fokussiert.

### Persönliche Darstellung

Das gemeinsame Auswahlelement nutzt native Radiogruppen, sichtbare Farbnamen, Fokusrahmen und ein Häkchen. Die drei Modusoptionen enthalten kleine, ausdrücklich schematische Oberflächenvorschauen. Farbnamen und Farbfelder folgen Hell, Dunkel oder der Geräteeinstellung.

Die Vorschau ändert sich sofort; die übrige Anwendung folgt nach **Darstellung speichern** oder **Einführung abschließen**. **Schubert-Standard auswählen** setzt Waldgrün und Hell zur anschließenden Speicherung. Ladezustände verhindern doppelte Bedienung; Erfolg und Fehler werden verständlich zurückgemeldet.

### Planungsstudio und Auswertungen

Der Editor gruppiert Werkzeuge durch feine Trennungen und verbindet Elementliste, Zeichenfläche und Inspektor zu einem Arbeitsbereich. Kontext, Maßstab und Hinweise um die Zeichenfläche lesen die Theme-Tokens; nur die eigentliche technische SVG-Zeichenfläche behält helles Papier und ihre fachlichen Farben. Reale Schriftreferenzen, Formvorschauen und Materialabbildungen bleiben überprüfbare Inhalte. Die kurze X-/Y-/Z-Beschriftung des Auswahlversatzes steht mit Einheit neben vollständig benannten Eingaben.

Monatsbalken beziehen sich auf eine sichtbare Nullachse und führen zu ihren Belegen. Ein fehlender bestätigter Wert erhält einen offenen Kreis und verständlichen Text. Mobil erscheint derselbe Zeitraum als Folge von Monatszeilen mit ausgeschriebenem Wert und Balken. Negative Werte nutzen die semantische Warnfarbe.

Die Quellengrundlage bilden [app.css](apps/web/src/app.css), [appearance.ts](packages/contracts/src/appearance.ts), der [Seitenrahmen](apps/web/src/routes/[...path]/+page.svelte) sowie Dashboard, SectionNavigation, Settings, AppearancePicker, RecordList, WorkflowGuide, Studio und AiUsageSummary. Die ergänzenden Begleiter-, Einführungs- und Diagrammmuster sind in ihren bestehenden Komponenten belegt.

## Do's and Don'ts

### Do:

- **Do** semantische Flächentokens für Navigation, Arbeitsraum, Eingaben, Text und Konturen verwenden.
- **Do** die aktuelle Position mit weicher Akzentfläche in der Navigation und einem erhabenen aktiven Bereichssegment zeigen.
- **Do** zusammengehörige Filter und Datentabelle in einem gemeinsamen Container ausrichten.
- **Do** sichtbare Feldbeschriftungen, verständliche deutsche Aktionen und einen klaren Tastaturfokus erhalten.
- **Do** Farbfeld und sichtbaren Farbnamen auf den gewählten Vorschau-Modus abstimmen.
- **Do** Aktionsgruppen als ganze Einheiten umbrechen lassen und lange deutsche Aktionsnamen an Wortgrenzen halten.
- **Do** Originalschriftbilder, Zeichenpapier, Materialien, 3D-Inhalte und PDF-Farben fachlich unverändert darstellen.
- **Do** fehlende bestätigte Werte ausdrücklich benennen und mobile Auswertungen als lesbare Monatszeilen anbieten.
- **Do** Speichern, Ladezustand, Erfolg und Fehler nachvollziehbar anzeigen und Fehlermeldungen in der betroffenen Oberfläche sichtbar machen.

### Don't:

- **Don't** persönliche Akzentfarben als Ersatz für Fehler-, Warn- oder Erfolgsfarben einsetzen.
- **Don't** den Arbeitsrahmen wieder zu einer gleichförmig flachen Fläche ohne erkennbare Navigation, Arbeitsraum und Eingabeflächen machen.
- **Don't** dekorative Verläufe, übergroße Pillenflächen, zusätzliche Vorspänne oder ornamentale Symbolkacheln als neue Anwendungsmuster einführen.
- **Don't** alle Fachflächen auf denselben Radius, dieselbe Schriftgröße oder dieselbe Informationsdichte vereinheitlichen.
- **Don't** physisches Zeichenpapier dunkel einfärben oder technische Vorlagen durch eine UI-Farbwahl verändern.
- **Don't** aus Vorschaubeispielen neue Laufzeitfarben, zusätzliche Theme-Abfragen, Polling oder KI-Aufrufe ableiten.
