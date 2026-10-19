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
  paper: "light-dark(#ffffff,#182437)"
  surface-raised: "light-dark(#ffffff,#223149)"
  ink: "light-dark(#192337,#eef3fc)"
  muted: "light-dark(#5d6a7c,#b8c6d9)"
  line: "light-dark(#dfe5ee,#35465e)"
  line-soft: "light-dark(#edf0f5,#2c3b51)"
  wash: "light-dark(#f0f3f8,#1c2b40)"
  navigation-surface: "light-dark(#eef2f7,#101a2b)"
  workspace-surface: "light-dark(#f1f4f9,#0e1726)"
  input-surface: "light-dark(#f8fafc,#111b2b)"
  danger: "light-dark(#993c35,#ffb5af)"
  danger-wash: "light-dark(#fff0ed,#37232d)"
  warning: "light-dark(#7a581e,#f1cc88)"
  warning-wash: "light-dark(#faf0d9,#302c24)"
  success: "light-dark(#315c4c,#a3d8b6)"
  success-wash: "light-dark(#eaf2ec,#18332f)"
  accent-wash: "light-dark(color-mix(in srgb,#315c4c 9%,#fff),color-mix(in srgb,#9fd5ba 12%,#182437))"
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
  searchable-select:
    backgroundColor: "{colors.input-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "11px 42px 11px 13px"
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

Die SCHUBERT Design Suite ist ein modernes, hochwertiges Arbeitsprodukt für einen Handwerksbetrieb. Eine ein- und ausklappbare, leicht getönte Navigationsleiste fasst einen deutlich eingesetzten Arbeitsraum ein. Kühles Porzellan im hellen Modus und gestuftes Navy im dunklen Modus verbinden präzise Konturen, lesbare Inter-Typografie und erkennbare, weiche räumliche Tiefe. Eine breite statische Akzentaufhellung liegt im Hintergrund; deckende Bedienflächen heben sich mit sanften Schatten davon ab.

Die Oberfläche richtet sich an deutschsprachige Menschen mit unterschiedlicher digitaler Erfahrung. Sichtbare Handlungsnamen, vertraute Formulare und klar getrennte Arbeitsbereiche tragen die Bedienung. Sechs persönliche Akzentfamilien und die drei Darstellungsmodi verändern den Rahmen; fachliche Statusfarben, technisches Zeichenpapier, Originalschriftbilder und reale Materialien behalten ihre Bedeutung.

**Key Characteristics:**

- Ausklappbare Navigation, kompakte Symbolleiste und ein klar abgegrenzter Arbeitsraum.
- Kühle neutrale Flächen mit leisen Trennungen, statischer Hintergrundaufhellung und gezielten Kontaktschatten.
- Ausgewählter Akzent für aktuelle Position, primäre Handlung und Auswahl.
- Lesbare deutsche Beschriftungen, durchsuchbare Auswahlen und erkennbare Zustände.
- Eine vorrangige Zeichenfläche mit gezielt geöffneten Werkzeugen und Eigenschaften im Planungsstudio.

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
- **surface-raised:** erhöhte Auswahl- und Hinweisflächen, insbesondere die Trefferliste einer durchsuchbaren Auswahl und kompakte Navigationshinweise.
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

Im Studio haben Seitenkopf, Werkzeugleiste, Elementbaum und Inspektor eigene kompakte Rollen. Der Planungstitel ist regulär (19px), auf kleinen Bildschirmen (16px). Inspektorfelder verwenden (13px), im kompakten Editor (16px); sichtbare Achsen und Einheiten ergänzen die vollständigen zugänglichen Feldnamen.

**The Lesbare Handlung Rule.** Aktionen haben verständliche Namen. Symbole ergänzen Text; längere Namen dürfen zwischen vollständigen Wörtern auf die nächste Zeile wechseln.

## Layout

Der Desktoprahmen setzt die Arbeitsfläche mit Außenabstand (12px) neben eine fest positionierte Navigation (232px). Unter (1200px) ist die ausgeklappte Navigation schmaler (214px); die eingeklappte Symbolleiste bleibt auf Desktopansichten (76px) breit. Ein sichtbarer Schalter klappt sie ein und aus. Die Auswahl wird pro angemeldeter Person in diesem Browser gespeichert; bei gesperrtem Browserspeicher bleibt die Bedienung möglich. Die obere Utility-Leiste bleibt kompakt (64px Mindesthöhe); Inhalte sind auf maximal (1640px) begrenzt und seitlich regulär (32px), auf kompakten Desktops (25px) eingerückt. Im Inhaltsbereich bilden (22px) zwischen Gruppen und (24px) in Panels den häufigsten Rhythmus. Die Frontmatter-Abstände sind beobachtete Rollenwerte, keine zusätzlichen Laufzeitvariablen.

Zusammengehörige Filter und die Tabelle liegen in einem gemeinsamen Container. Die Filterzeile bleibt auf ausreichend breiten Ansichten einzeilig und darf bei Platzmangel umbrechen; Suchfeld, Status, Anwenden und Ergebniszahl bleiben zusammen. Formulare verwenden gewöhnlich zwei Spalten mit horizontalem Abstand (22px) und vertikalem Abstand (23px). Einstellungen besitzen eine eigene schmale Bereichsnavigation (188px), unter (1000px) kompakter (165px).

Die Tagesübersicht ordnet tatsächliche Termine beziehungsweise aktuelle Aufträge und den Aufmerksamkeitsbereich vor den Summen an. Eine leere Terminplanung wird als kompakte Hinweiszeile behandelt. Summen erscheinen als zusammenhängender Streifen; der KI-Verbrauch erhält eine kompakte unterstützende Zeile. Der Testbetrieb bleibt als zurückhaltender, wahrheitsgemäßer Kontext über den Inhalten sichtbar.

Bei (760px) und darunter entfällt der eingesetzte Außenrahmen. Die linke Navigation öffnet unabhängig von der Desktopauswahl als modale Schublade mit begrenztem Tastaturfokus; die geschlossene Schublade ist nicht fokussierbar. Escape, Schließknopf und Hintergrund schließen sie, der Fokus kehrt zum Menüknopf zurück. Die beschriftete untere Navigation bleibt erreichbar. Inhaltsabstand (17px), reguläre Buttons und Felder mit Mindesthöhe (48px) sowie Eingabeschrift (16px) unterstützen kleine Bildschirme. Datentabellen werden dort zu lesbaren Datensatzkarten. Bereichs- und Einstellungsnavigation wechseln zu beschrifteten, durchsuchbaren Auswahlen mit vollständiger Bereichsliste. Die sechs Akzentoptionen wechseln unter (650px) von sechs auf drei Spalten; die Modusoptionen stehen dann untereinander.

Das geöffnete Studio bildet eine begrenzte Werkbank mit kompaktem Projektkopf, Variantenzeile, zwei geordneten Werkzeugreihen und einer wachsenden Arbeitsansicht. Seine Höhe folgt dem tatsächlich verbleibenden Fensterraum im Arbeitsrahmen; regulär gilt eine Mindesthöhe (320px). Auf Desktopansichten steht die Zeichenfläche in einem dreispaltigen Raster zwischen Elementbaum (215px) und Inspektor (286px); ab (1600px) erhalten die Seiten (235px) und (312px). Beide Seiten lassen sich unabhängig schließen. Ihre bewusste Sichtbarkeitswahl bleibt beim Auswählen und Ziehen erhalten. Der frei werdende Raum gehört unmittelbar der Zeichenfläche. Elementliste und Eigenschaftsinhalte scrollen in ihren eigenen Bereichen.

Bei (1100px) und darunter wird die Zeichenfläche zur einzigen Rasterspalte. **Elemente** und **Eigenschaften** öffnen die jeweilige Seite ausdrücklich als nativen modalen Dialog am Fensterrand. Die Schubladen sind begrenzt, intern scrollbar und besitzen einen sichtbaren Schließknopf; Escape schließt sie und der Fokus kehrt zur auslösenden Bedienung zurück. Auswählen und Ziehen auf der Zeichenfläche öffnen im kompakten Editor keine Eigenschaftsschublade. Beim Rückwechsel zum Desktop werden die zuvor geöffneten Seiten wiederhergestellt. Projektname und Speicherstatus erhalten im kompakten Kopf eine volle Zeile. Unter (720px) stehen weitere Varianten und Revisionen im Projektmenü; die aktuelle Variante bleibt beim Speicherstatus sichtbar. Die beschrifteten Werkzeuge bleiben erreichbar. Nur im geöffneten Handyeditor sind Seitenabstand und Testkontext verdichtet; sichtbarer Testhinweis und Hilfe bleiben erhalten.

Natives Vollbild und das vergrößerte Browserfenster verwenden dieselbe Werkbank über die vollständige Fensterhöhe (100dvh). Die äußere Werkbank hat dabei keinen Innenabstand; Zeichenfläche, Seiten und Überlagerungen teilen den verfügbaren Raum, während die Seite dahinter gesperrt bleibt. Ein Beenden stellt Fokus und vorherige Seitenposition wieder her. Erlaubt der Browser kein Geräte-Vollbild, benennt ein Hinweis den tatsächlichen Browserfenstermodus. Eine funktionale Statuszeile mit Mindesthöhe (64px) hält den Zustand und eine freie Ecke für den einzigen Assistenteneinstieg zusammen. Auf dem Handy übernimmt die bestehende untere Zoom-/Auswahlzeile diese Aufgabe mit einem freien Begleiterplatz; eine zweite Statuszeile entfällt. Der Begleiter folgt in beide Vollbildformen und kehrt danach an seinen ursprünglichen Platz zurück.

**The Zeichenfläche zuerst Rule.** Die Werkbank folgt dem sichtbaren Fensterraum, im Vollbild der vollständigen Fensterhöhe (100dvh). Beschriftete Bearbeitungs- und Ansichtsgruppen bleiben an der Zeichenfläche; Darstellung und Projektaktionen öffnen Ergänzungen gezielt. Desktopseiten sind unabhängig schließbar; bei (1100px) und darunter werden sie als modale Schubladen geöffnet. Innere Bereiche scrollen getrennt, die funktionale Statuszeile hält den Assistentenplatz frei.

**The Erreichbare Aktion Rule.** Scrollbare Inhalte halten Abschluss- und Schließaktionen erreichbar. Im Studio reserviert die funktionale Statuszeile unten rechts den Platz für den Assistenteneinstieg. Feedback steht im Fuß der Seitenleiste über dem Profil; modale Oberflächen und die offene mobile Navigation blenden den Assistenteneinstieg aus.

## Elevation & Depth

Das Produkt verbindet abgestufte neutrale Flächen mit weichen Kontaktschatten und diffuser Tiefe. Der eingesetzte Arbeitsraum liegt sichtbar über dem äußeren Rahmen; deckende Panels erhalten einen kurzen Kontaktschatten und einen breiteren, sanften Umgebungsschatten. Ihre inneren Trennlinien halten Kopf, Inhalt und Aktionen zusammen. Im Hintergrund des Arbeitsraums liegt eine einzelne breite radiale Aufhellung mit Anteil des gewählten Akzents (14%), die zur transparenten Fläche ausläuft. Sie ist statisch und bleibt hinter den Inhalten. Aktive Segmente erhalten eine kleine Erhebung; durchsuchbare Trefferlisten, Dialoge und Begleiter eine klar begrenzte stärkere Überlagerung. Die exakten Schattenwerte stehen in den Sidecar-Erweiterungen.

**The Gezielte Tiefe Rule.** Tonwert, leise Trennlinien und weiche Schatten unterscheiden Hintergrund, Arbeitsraum, Panels und Überlagerungen. Die räumliche Abstufung unterstützt die verständliche Hierarchie und lässt Eingaben sowie Inhalte deckend und lesbar.

**The Ein Hintergrundlicht Rule.** Die statische Akzentaufhellung gehört zum Hintergrund des Arbeitsraums. Einzelne Panels und Bedienelemente erhalten daraus keine eigenen farbigen Lichtkränze.

Kurze Übergänge begleiten Hover, Konturwechsel, Navigation und aktive Zustände. Reguläre Aktionen verschieben sich beim Drücken leicht (1px). Die globale Regel für reduzierte Bewegung begrenzt Animationen und Übergänge; die ergänzende Produktregel entfernt die entsprechenden Zustandsübergänge und die Druckverschiebung. Die persönliche Darstellung benötigt keine zusätzliche Animation.

## Shapes

Sanfte Rechtecke unterscheiden Rollen: kompakte Segmente, reguläre Bedienelemente, Auswahlgruppen, Panels und der äußere Arbeitsraum besitzen abgestufte Rundungen. Panels bleiben klar rechteckige Arbeitsflächen, keine übergroßen Pillen. Die kleinen Radiusunterschiede im Frontmatter sind belegt und müssen nicht vereinheitlicht werden.

Konturen sind gewöhnlich (1px) stark. Innere Trennlinien verwenden `line-soft`, äußere Begrenzungen `line`. Akzentoptionen zeigen runde Farbfelder (36px) und ein Häkchen; die Auswahlkarte erhält zusätzlich Kontur und Fläche. Im Studio bleiben Zeichenpapier und echte Materialabbildungen innerhalb ihres eigenen fachlichen Darstellungsraums.

## Components

### Buttons

Primäraktionen verwenden den gewählten Akzent und `on-accent`, ihr Hover den familienabhängigen Hover-Wert. Sekundäre Aktionen verwenden `paper`, Ghost-Aktionen Transparenz und Gefahrenaktionen die semantische Fehlerfläche. Reguläre Buttons besitzen eine Mindesthöhe (42px); kleine Varianten (35px) und große Varianten (56px) bleiben eigene Größen. Mobil gelten regulär (48px), klein (44px) und groß (58px).

Beschriftungen dürfen verfügbare Breite nutzen, ergänzende SVG-Symbole schrumpfen nicht. Die Filteraktion und beschriftete Studio-Werkzeuge behalten vollständige Wörter. Im Studio trennen eigene Reihen Bearbeitung und Ansicht; kompakte Gruppen bleiben bei Platzmangel horizontal erreichbar. Deaktivierte Aktionen sind sichtbar gedimmt. Tastaturfokus bleibt eine Akzentkontur mit Abstand; globale und lokale Selektoren verwenden (2–3px).

### Inputs / Fields

Sichtbare Labels stehen über zurückgesetzten, fein konturierten Eingaben. Felder haben regulär eine Mindesthöhe (46px), Such- und Filterfelder (42px). Hover verstärkt die Kontur; Fokus verwendet den Akzent und hebt reguläre Formularfelder auf `paper`. Ungültige Felder erhalten die semantische Fehlerkontur sowie eine verständliche Meldung. Hilfetext ergänzt das Label; ein Platzhalter ersetzt es nicht.

### Durchsuchbare Auswahlen

Ein gemeinsames Auswahlelement verbindet die sichtbare gewählte Bezeichnung mit einer direkt durchsuchbaren Trefferliste. Öffnen zeigt die verfügbaren Einträge; Tippen filtert deren tatsächliche Bezeichnungen lokal, unabhängig von Großschreibung, diakritischen Zeichen und ß. Der gespeicherte Wert bleibt während der Suche erhalten. Nur ein ausdrücklich gewählter Listeneintrag wird übernommen; Freitext erzeugt keine neue Referenz und keinen neuen Auswahlwert. Gesperrte Einträge bleiben erkennbar und sind nicht auswählbar. Trefferzahl und eine verständliche Leermeldung begleiten die Suche.

In der geöffneten Liste bewegen Pfeiltasten sowie Pos1/Ende die aktive Option, Enter übernimmt sie, Escape verwirft die Suche und Tab schließt ohne Übernahme. Anklicken beziehungsweise Antippen übernimmt einen Eintrag. Das Feld besitzt einen zugänglichen Namen, Such- und Listenhinweise, einen erkennbaren Fokus sowie die ursprünglichen Hilfe- und Fehlerbezüge. Mobil sind Eingabe und Treffer mindestens (48px) hoch; die Eingabeschrift beträgt (16px). Die Liste nutzt `surface-raised`, eine dezente Akzentfläche für die aktive Option und ein Häkchen für den gespeicherten Eintrag. Lange Treffer dürfen umbrechen.

Das ursprüngliche native Auswahlfeld bleibt für Formularwert, Datentyp, Pflichtprüfung und bestehende Änderungsaktionen maßgeblich. Die Erweiterung spiegelt auch Sperren übergeordneter Formulargruppen und lenkt ungültige Pflichtauswahlen zum sichtbaren Feld. Dynamische Optionen, zurückgesetzte Formulare und von außen geänderte Werte bleiben synchron. Die Trefferliste liegt als native Popover-Überlagerung innerhalb ihres Dialogs beziehungsweise Vollbildbereichs und richtet sich am verfügbaren Fensterraum aus. Ohne diese Browserunterstützung oder bei einem Initialisierungsfehler bleibt das native Feld bedienbar.

Die lokale Suche erzeugt keine Server- oder KI-Anfrage. Eine breitere Suche im berechtigten Bestand wird weiterhin ausdrücklich über **Suchen** beziehungsweise **Katalog durchsuchen** gestartet; gespeicherte historische Referenzen bleiben dabei erhalten.

### Navigation

Die aktuelle Position erscheint in der linken Leiste als sanfte Akzentfläche mit Akzenttext, gleichfarbigem Symbol und zugänglicher Positionsangabe. Inaktive Einträge bleiben auf dem getönten Navigationsgrund zurückgenommen. In der kompakten Desktopansicht bleiben die vollständigen zugänglichen Namen erhalten; sichtbare Hinweise erscheinen bei Zeigerkontakt und Tastaturfokus neben der Leiste außerhalb ihres scrollbaren Bereichs. Ein- und Ausklappen, Feedback, Profil und Abmelden bleiben erreichbar. Der Navigationsinhalt scrollt getrennt vom Fußbereich.

Die Bereichsnavigation zeigt bis zu vier Kernbereiche und hält den geöffneten Bereich sichtbar; das aktive Segment sitzt auf `paper` mit kleinem Schatten. **Alle Bereiche** öffnet ein durchsuchbares Verzeichnis. Escape schließt es und führt den Fokus zum Auslöser zurück.

Reguläre Tabs folgen derselben Segmentform: ruhiger Gruppenhintergrund, heller beziehungsweise erhöhter aktiver Eintrag. Einstellungen verwenden stattdessen eine vertikale, sanft akzentuierte Liste. Mobile durchsuchbare Auswahlen bieten jeweils die vollständige Bereichsliste und erhalten die native Formular- und Navigationslogik.

### Cards / Containers

Reguläre Panels besitzen `paper`, eine weiche Schattentrennung zum Arbeitsraum, getrennte Kopf- und Inhaltsbereiche sowie bei Bedarf einen Aktionsfuß. Der reguläre Kopf ist vertikal (21px) und horizontal (24px) eingerückt; der Inhalt nutzt (24px). Feine innere Trennlinien ordnen die Inhalte. Fachliche Sondercontainer, Formulare und das Studio behalten ihre jeweils belegten Konturen. Auf kleinen Bildschirmen reduzieren sich Rundung und Einrückung passend zum verfügbaren Raum.

Datensätze verbinden einen stärkeren Titel mit zurückgenommenem Untertitel. Tabellenköpfe liegen auf `input-surface`; Zeilen nutzen feine Trennlinien und eine leichte akzentabhängige Hover-Fläche. Zahlen sind tabellarisch und Beträge rechtsbündig. Die kompakte leere Terminplanung bleibt links ausgerichtet und bietet den nächsten sinnvollen Link.

### Chips / Status

Statuslabels sind kleine, nicht interaktive Rechtecke mit Text, semantischer Fläche und gegebenenfalls einem ergänzenden Punkt. Ihre Farbe folgt dem Zustand; Auswahl und persönlicher Akzent verändern diese Bedeutung nicht.

### Disclosures

Ergänzende Hilfen verwenden native `details`/`summary` mit sichtbarer Richtungsanzeige und verständlichem Titel. Die gemeinsame Zusammenfassung besitzt eine Mindesthöhe (49px), mobil (52px). Formulargruppen nutzen eine stärkere Einfassung und eine höhere Zusammenfassung (56px). Öffnen trennt Titel und Inhalt; der Indikator dreht sich. Lange Titel dürfen umbrechen und der Tastaturfokus bleibt sichtbar.

### Begleiter, Dialoge und Einführung

Der Assistent besitzt genau einen schwebenden, beschrifteten Einstieg unten rechts. Er verwendet den gewählten Akzent, eine kompakte rechteckige Rundung (14px) und einen weichen Schatten. Mobil sitzt er mit sicherem Abstand über der unteren Navigation und berücksichtigt den Gerätesicherheitsabstand. Beim Öffnen ersetzt ihn der Begleiter. Der gesamte Begleiter folgt im Studio in das native oder vergrößerte Vollbild und kehrt danach an seinen ursprünglichen Platz zurück. Modale Dialoge, Einführung und die offene mobile Navigation halten den Einstieg verborgen.

Aktiviertes Testfeedback steht als regulärer Eintrag im Fuß der linken Leiste über dem Profil; in der kompakten Leiste behält es sein Symbol, seinen zugänglichen Namen und den Fokus-/Zeigerhinweis. Mobil ist es zusätzlich in der unteren Navigation erreichbar. Es öffnet einen nativen Dialog; der gemeinsame Rückmeldedialog erzeugt keinen zweiten schwebenden Einstieg.

Der Begleiter trennt **Hilfe für diese Seite** und **Chat** mit beschrifteten Auswahlflächen. Vorschläge gelangen zuerst in das Eingabefeld; **Senden** startet die Anfrage. Unterlagen und Modelloptionen bleiben aufklappbar. Der Desktopbegleiter ist eine begrenzte rechte Überlagerung; mobil begrenzt er den Fokus und stellt ihn beim Schließen wieder her. Dialoginhalte dürfen scrollen; Aktionsfüße bleiben erreichbar.

Die Einführung hebt reale Seitenbereiche mit Akzentkontur und abgedunkeltem Umfeld hervor. Schrittzahl, Erklärung und Zurück/Weiter bleiben an der Karte zusammen; die Karte richtet sich am sichtbaren Fenster aus. Die persönliche Darstellung bildet den letzten Schritt. Fehlerrückmeldungen erscheinen innerhalb der betroffenen Oberfläche und werden dort sichtbar fokussiert.

### Kontext und nächste Schritte

Auftragsakten führen über klar benannte, berechtigungsabhängige Links in die zugehörigen Planungen, Arbeitspakete, Einsätze, Bestellungen und Rechnungen. Fachbereiche öffnen die gefilterte Übersicht und bei erlaubter Anlage ein neues Formular mit passendem Bezug. Nicht geladene Dokumentübersichten werden als nicht geladen benannt; sie gelten nicht als belegte Leere.

Kundenakten bieten passende Einstiege zu Anfrage, Angebot und Auftrag; Lieferantenakten zu Bestellung und Eingangsrechnung. Aus einer Bestellung lässt sich eine Eingangsrechnung mit diesem Bezug vorbereiten. Ein neues Formular zeigt die übernommenen Beziehungen mit Namen. Es übernimmt nur passende, verfügbare Referenzoptionen und zulässige Datumswerte; vorhandene Datensätze werden durch einen Einstiegslink nicht verändert. Der Einstieg öffnet das Formular einmal. Erst ausdrückliches Speichern übernimmt einen neuen Datensatz.

Suche, Zurücksetzen der Suchfelder und Weiterblättern erhalten die übrigen Filterbezüge. **Anwenden** beziehungsweise Enter übermittelt Suchtext und Status gemeinsam; eine Statusauswahl allein startet keine zweite Filterung. Der sichtbare Kontext nennt die aktive Beziehung.

### Einsatzkalender

Tag, Woche und Monat teilen dieselbe beschriftete Zeitraum- und Mitarbeiterauswahl. Ein ausgewählter Tag bestimmt die Tagesliste und die Aktion **Einsatz für diesen Tag anlegen**. Das neue Einsatzformular schlägt für diesen Tag lokale Zeiten (08:00–09:00) sowie einen gewählten verfügbaren Mitarbeiter und den bestehenden Auftragsbezug vor. Die Angaben bleiben bearbeitbar; das Öffnen des Formulars speichert keinen Einsatz.

### Persönliche Darstellung

Das gemeinsame Auswahlelement nutzt native Radiogruppen, sichtbare Farbnamen, Fokusrahmen und ein Häkchen. Die drei Modusoptionen enthalten kleine, ausdrücklich schematische Oberflächenvorschauen. Farbnamen und Farbfelder folgen Hell, Dunkel oder der Geräteeinstellung.

Die Vorschau ändert sich sofort; die übrige Anwendung folgt nach **Darstellung speichern** oder **Einführung abschließen**. **Schubert-Standard auswählen** setzt Waldgrün und Hell zur anschließenden Speicherung. Ladezustände verhindern doppelte Bedienung; Erfolg und Fehler werden verständlich zurückgemeldet.

### Planungsstudio und Auswertungen

Der Editor gibt der Zeichenfläche den verbleibenden Arbeitsraum. **Auswahl**, **Verschieben**, **Hand** und **Hinzufügen** bilden die Bearbeitungsreihe; Front, Seite, Drauf beziehungsweise Grundriss und 3D bilden die eigene Ansichtsgruppe. **Einpassen** und die Zoomsteuerung bleiben erreichbar. Die Bedienelemente **Elemente** und **Eigenschaften** stehen mit Rückgängig/Wiederholen direkt an der Zeichenfläche; Auswahlstatus und Maßeinheit erklären den aktuellen Bezug.

**Darstellung** bündelt Objektfang, Rasterfang, sichtbares Raster, Rasterweite, Bemaßungen, gegebenenfalls Wände sowie die kurze Bedienhilfe. Fangraster und sichtbare Rasteranzeige bleiben fachlich getrennt. **Projektaktionen** öffnet Bilder und Exporte, Quellplan beziehungsweise Foto, wörtliche Inschriftenprüfung, Stückliste, Planungs-PDF, Variantenvergleich, Bindungen sowie Prüfung und Freigaben. Wörtliche Textprüfung und Stückliste nutzen den Inspektor. Projektname, Speicherzustand und aktuelle Variante bleiben sichtbar; das Projektmenü ergänzt auf kleinen Bildschirmen vollständige Namen und Variantennavigation. Meldungen und Konflikte behalten ihre eigenen erreichbaren Bereiche. Die geöffnete 3D-Kamerahilfe erhält einen eigenen, begrenzten und scrollbar bedienbaren Bereich neben dem Modell, auf dem Handy unterhalb davon. Sie überdeckt die Modellfläche nicht; deren Größenänderung passt die Modellansicht unter Erhalt der Blickrichtung neu ein.

Kontext, Maßstab und Hinweise um die Zeichenfläche lesen die Theme-Tokens; nur die eigentliche technische SVG-Zeichenfläche behält helles Papier und ihre fachlichen Farben. Reale Schriftreferenzen, Formvorschauen und Materialabbildungen bleiben überprüfbare Inhalte. Die kurze X-/Y-/Z-Beschriftung des Auswahlversatzes steht mit Einheit neben vollständig benannten Eingaben.

Eine auftragsbezogene Planungsübersicht benennt den Auftrag und bietet die Rückkehr zu seiner Akte. Suche, Zurücksetzen und Weiterblättern erhalten diesen Bezug. Ein neues Planungsprojekt schlägt ihn nur aus den verfügbaren Aufträgen vor; bestehende Projekte behalten ihren eigenen Bezug. Der Rückweg aus dem Editor führt zur Planungsübersicht des tatsächlichen Auftrags.

Vor einem Seiten- oder Variantenwechsel mit noch nicht übertragenen Änderungen fragt ein nativer Dialog nach **Weiter bearbeiten**, **Speichern und wechseln** oder **Ohne Speichern wechseln**. Auch ein laufender Speichervorgang zählt dabei als offen. Der gespeicherte Weg setzt erst nach erfolgreicher Übernahme aller offenen Änderungen fort; Fehler und Konflikte bleiben sichtbar. Eine lokale Sitzungssicherung wird ausdrücklich als mögliche Wiederherstellung beschrieben, nicht als bestätigtes Speichern. Beim Schließen oder Neuladen des Browsers erscheint die native Warnung nur, solange Änderungen nicht übertragen sind. Reine Ansichtswechsel benötigen diese Rückfrage nicht.

Abhängige Elemente nennen ihr Bezugsbauteil beziehungsweise ihre Bezugswand im Dialog. Eine passende Auswahl wird bevorzugt; ohne passende Auswahl wird nur ein einziges geeignetes Ziel automatisch übernommen. Bei mehreren Zielen ist eine bewusste Wahl nötig. Fehlt die Voraussetzung, führt **Zuerst Stein anlegen** beziehungsweise **Zuerst Wand anlegen** zum passenden ersten Schritt und erhält die Eingaben des abhängigen Elements. Kurze Hinweise erklären Ziehen, Pfeiltasten (1mm), Umschalt (10mm) und Alt beim Ziehen zum vorübergehenden Ausschalten des Einrastens.

Monatsbalken beziehen sich auf eine sichtbare Nullachse und führen zu ihren Belegen. Ein fehlender bestätigter Wert erhält einen offenen Kreis und verständlichen Text. Mobil erscheint derselbe Zeitraum als Folge von Monatszeilen mit ausgeschriebenem Wert und Balken. Negative Werte nutzen die semantische Warnfarbe.

Die Quellengrundlage bilden [app.css](apps/web/src/app.css), [appearance.ts](packages/contracts/src/appearance.ts), der [Seitenrahmen](apps/web/src/routes/[...path]/+page.svelte) sowie Dashboard, SectionNavigation, Settings, AppearancePicker, RecordDetail, RecordList, RecordEditor, DispatchCalendar, WorkflowGuide, Studio und AddElementDialog. Die [gemeinsame Suchauswahl](apps/web/src/lib/client/searchable-select.ts) mit [lokaler Trefferlogik](apps/web/src/lib/client/select-options.ts) belegt Auswahl, Validierung und Fallback. [WorkbenchPanel](apps/web/src/lib/components/studio/WorkbenchPanel.svelte) und die [Werkbank-Hilfen](apps/web/src/lib/components/studio/workbench.ts) belegen Schubladen, Fensterhöhe und Popover-Platzierung. Assistant, FeedbackWidget und der Vollbildbegleiter belegen die Einstiegs- und Überlagerungsregeln; die Einführungs- und Diagrammmuster sind in ihren bestehenden Komponenten belegt.

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
- **Do** kompakte Navigationssymbole mit vollständigen zugänglichen Namen und sichtbaren Hinweisen bei Zeigerkontakt und Tastaturfokus versehen.
- **Do** Auftrags-, Kunden- und Lieferantenbezüge in nächste Formulare mitnehmen und übernommene Beziehungen verständlich benennen.
- **Do** offene Studioänderungen vor dem Verlassen klären und bei mehreren passenden Bezugsbauteilen eine bewusste Auswahl verlangen.
- **Do** Auswahlen lokal durchsuchen lassen und native Formularwerte, Pflichtprüfung, Sperren und vorhandene Änderungsaktionen erhalten.
- **Do** im kompakten Studio Seiten ausdrücklich öffnen und die Zeichenfläche beim Auswählen sowie Verschieben im Vordergrund halten.

### Don't:

- **Don't** persönliche Akzentfarben als Ersatz für Fehler-, Warn- oder Erfolgsfarben einsetzen.
- **Don't** den Arbeitsrahmen wieder zu einer gleichförmig flachen Fläche ohne erkennbare Navigation, Arbeitsraum und Eingabeflächen machen.
- **Don't** zusätzliche farbige Lichtkränze, animierte oder dekorative Verläufe auf Panels und Bedienelementen, übergroße Pillenflächen, zusätzliche Vorspänne oder ornamentale Symbolkacheln als neue Anwendungsmuster einführen.
- **Don't** alle Fachflächen auf denselben Radius, dieselbe Schriftgröße oder dieselbe Informationsdichte vereinheitlichen.
- **Don't** physisches Zeichenpapier dunkel einfärben oder technische Vorlagen durch eine UI-Farbwahl verändern.
- **Don't** aus Vorschaubeispielen neue Laufzeitfarben, zusätzliche Theme-Abfragen, Polling oder KI-Aufrufe ableiten.
- **Don't** fehlende geladene Daten als belegte Leere, lokale Sitzungssicherung als bestätigtes Speichern oder vorgeschlagene Formularwerte als bereits ausgeführte Handlung darstellen.
- **Don't** Suchtext automatisch als Auswahl übernehmen oder durch lokale Auswahlsuche zusätzliche Server- oder KI-Anfragen auslösen.
