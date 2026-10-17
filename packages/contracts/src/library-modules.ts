import type {ModuleDefinition,Field,Action} from './modules.js';

const field=(key:string,label:string,type:Field['type']='text',required=false):Field=>({key,label,type,required});
const ref=(key:string,label:string,reference:string,required=false):Field=>({...field(key,label,'reference',required),reference});
const select=(key:string,label:string,options:Array<[string,string]>,required=false):Field=>({...field(key,label,'select',required),options:options.map(([value,label])=>({value,label}))});
const name=field('name','Bezeichnung','text',true),notes=field('notes','Hinweise','textarea');
const source=ref('source_document_version_id','Versionierte Hersteller-/Aufmaßunterlage','document-versions',true);
const rights=ref('license_document_version_id','Nachweis der erlaubten Nutzung','document-versions');
const permittedUses=[field('allow_internal','Verwendung in interner Beratung ist belegt','checkbox'),field('allow_customer','Verwendung in Kundenvisualisierungen ist belegt','checkbox'),field('allow_supplier','Weitergabe an ausführende Partner ist belegt','checkbox'),field('allow_manufacturing','Verwendung für eigene Fertigung ist belegt','checkbox')];
const outlineReview=[select('source_unit','Bestätigte Originaleinheit (Konturdatei)',[['mm','Millimeter'],['cm','Zentimeter'],['m','Meter'],['in','Zoll']]),field('source_unit_confirmed','Originaleinheit anhand der Quelle ausdrücklich bestätigt','checkbox'),field('curve_tolerance_mm','Gewählte Kurvenfehlergrenze 0,02–5 mm (Konturdatei)','number'),field('accepted_curve_error_mm','Im Prüfprotokoll akzeptierter Konturfehler (mm)','number')];
const approve=(prefix:string,label='Fachlich prüfen und Version einfrieren'):Action=>({name:`${prefix}.approve`,label,permission:'planning.release',statuses:['draft','under_review'],confirmation:true,requiresReason:true,
  fields:[ref('evidence_version_id','Fachlicher Freigabenachweis','document-versions',true),field('review_scope','Geprüfter Anwendungsumfang','textarea',true)]});
function module(slug:string,table:string,label:string,singular:string,prefix:string,permission:string,fields:Field[],actions:Action[]=[],description?:string):ModuleDefinition{
  return{slug,table,label,singular,commandPrefix:prefix,permission,fields,actions,columns:['name','status','updated_at'],states:['draft','under_review','approved','superseded'],description:description??`${label} mit nachvollziehbaren Quellen und freigegebenen Versionen verwalten.`};
}
/**
 * Prerequisite libraries for actual studio work. Approved version rows are immutable:
 * the application must reject .update after approval and create a new version instead.
 * Rights/geometry verification flags, hashes, reviewers and active version pointers
 * are deliberately absent from editable fields; only dedicated authenticated
 * approval/activation commands may set them after inspecting real evidence.
 */
export const additionalModules:ModuleDefinition[]=[
  module('buildings','buildings','Gebäude','Gebäude','projects.building','orders',[
    name,ref('site_id','Objekt / Baustelle','sites',true),field('building_reference','Gebäudekennung'),
    field('origin_x_mm','Ursprung X (mm)','number'),field('origin_y_mm','Ursprung Y (mm)','number'),field('origin_z_mm','Ursprung Z (mm)','number'),
    field('rotation_z_deg','Drehung zum Objekt (Grad)','number'),ref('source_document_version_id','Lage-/Bestandsnachweis','document-versions'),notes
  ],[],'Gebäude am vorhandenen Objekt führen. Koordinaten werden für jede Planrevision ausdrücklich eingefroren.'),
  module('floors','floors','Geschosse & Höhenbezüge','Geschoss','projects.floor','orders',[
    name,ref('building_id','Gebäude','buildings',true),field('level_mm','Bezugsniveau Z (mm)','number'),field('datum_label','Bezeichnung des Höhenbezugs','text',true),
    field('origin_x_mm','Lokaler Ursprung X (mm)','number'),field('origin_y_mm','Lokaler Ursprung Y (mm)','number'),field('rotation_z_deg','Drehung zum Gebäude (Grad)','number'),
    field('north_angle_deg','Nordrichtung (Grad)','number'),ref('source_document_version_id','Bestands-/Höhennachweis','document-versions'),notes
  ],[],'Geschosse, Fertigfußbodenbezug und Orientierung getrennt pflegen; unbekannte Höhen bleiben offen.'),
  module('rooms','rooms','Räume','Raum','projects.room','orders',[
    name,ref('floor_id','Geschoss','floors',true),ref('site_id','Objekt','sites'),field('room_number','Raumkennung'),
    select('usage','Nutzung',[['bath','Bad'],['spa','Spa'],['kitchen','Küche'],['living','Wohnen'],['stairs','Treppe'],['other','Andere']]),
    ref('source_document_version_id','Aufmaß-/Bestandsunterlage','document-versions'),notes
  ],[],'Dauerhafte Raumakte unabhängig vom Auftrag. Planungen referenzieren diesen Raum und seine eingefrorenen Wandbezüge.'),
  module('materials','material_specs','Materialbibliothek','Material','catalog.material','catalog',[
    name,ref('manufacturer_id','Belegte Herkunft / Hersteller','manufacturers'),select('material_kind','Materialart',[['natural_stone','Naturstein'],['engineered_stone','Kunststein'],['ceramic','Keramik'],['metal','Metall'],['mortar','Mörtel / Kleber'],['other','Andere']]),
    field('description','Materialbeschreibung','textarea'),notes
  ],[{name:'catalog.material.activate',label:'Freigegebenen Materialstand verwenden',confirmation:true,permission:'planning.release',fields:[ref('version_id','Freigegebene Materialversion','material-versions',true)]}],
    'Materialbezeichnung und konkrete freigegebene Spezifikation trennen. Eine PBR-Textur garantiert keine identische Naturzeichnung.'),
  module('material-versions','material_spec_versions','Materialstände','Materialversion','catalog.material_version','catalog',[
    name,ref('material_spec_id','Material','materials',true),field('supplier_material_reference','Hersteller-/Materialreferenz'),field('surface_finish','Oberfläche / Bearbeitung'),
    field('density_kg_m3','Belegte Dichte (kg/m³)','number'),field('declared_uses','Bestätigte Eignung / Anwendungsgrenzen','textarea'),
    field('thickness_min_mm','Belegte Mindeststärke (mm)','number'),field('thickness_max_mm','Belegte Höchststärke (mm)','number'),source,rights,
    field('source_url','Herstellerquelle'),field('valid_from','Gültig ab','date'),notes
  ],[approve('catalog.material_version')],'Quellengebundener, nach Freigabe unveränderlicher Materialstand. Fehlende Eigenschaften und Dichten werden nicht ergänzt.'),
  module('product-variants','product_variants','Produktausführungen','Produktausführung','catalog.product_variant','catalog',[
    name,ref('product_id','Produkt','products',true),field('sku','Ausführungs-/Artikelkennung'),notes
  ],[{name:'catalog.product_variant.activate',label:'Geprüfte technische Version aktivieren',confirmation:true,permission:'planning.release',fields:[ref('version_id','Freigegebene technische Version','product-versions',true)]}],
    'Eine reale Hersteller-/Artikelausführung. Maße stammen ausschließlich aus ihrer freigegebenen technischen Version.'),
  module('product-versions','product_variant_versions','Technische Produktstände','Produktversion','catalog.product_version','catalog',[
    name,ref('product_variant_id','Produktausführung','product-variants',true),field('manufacturer_sku','Herstellerartikelnummer','text',true),field('gtin','GTIN, falls belegt'),
    field('width_mm','Nennbreite (mm)','number',true),field('height_mm','Nennhöhe (mm)','number'),field('depth_mm','Nenntiefe (mm)','number',true),
    field('color','Farbe / Tönung'),field('surface_finish','Oberfläche'),field('installation_type','Belegte Einbauart'),
    field('connection_notes','Anschlüsse und Bezugskanten','textarea'),field('clearance_notes','Wartungs- und Einbauräume','textarea'),
    field('allowed_size_notes','Belegte Größen / parametrische Grenzen','textarea'),ref('material_spec_version_id','Freigegebener Materialstand','material-versions'),source,rights,
    field('source_url','Herstellerquelle'),notes
  ],[approve('catalog.product_version')],'Maße, Anschlüsse und Ausführung als eingefrorene Herstellerfassung. Die rechteckige Hülle ist als solche gekennzeichnet; Originalform nur nach Assetprüfung.'),
  module('product-availability','product_availability_versions','Belegte Produktverfügbarkeit','Verfügbarkeitsauskunft','catalog.availability','catalog',[
    name,ref('product_variant_version_id','Konkreter eingefrorener Produktstand','product-versions',true),ref('supplier_id','Auskunftgebender Lieferant','suppliers'),
    select('availability_status','Schriftlich bestätigter Zustand',[['unknown','Unbekannt / auf Anfrage'],['available','Verfügbar laut Auskunft'],['limited','Begrenzt verfügbar'],['unavailable','Nicht verfügbar']],true),
    field('checked_on','Auskunft vom','date',true),field('valid_until','Auskunft gültig bis','date',true),field('available_quantity','Belegte Menge, falls ausdrücklich genannt','number'),field('availability_unit','Einheit der belegten Menge'),
    ref('source_document_version_id','Versionierte schriftliche Verfügbarkeitsauskunft','document-versions',true),notes
  ],[approve('catalog.availability','Auskunft und Gültigkeit fachlich prüfen')],
    'Befristete Lieferantenauskunft für genau diesen technischen Produktstand. Fehlende, abgelaufene oder nicht mehr verfügbare Nachweise bedeuten unbekannt. Die Auskunft ist keine Reservierung oder Liefergarantie.'),
  module('product-assets','product_assets','Herstellerdateien & Nutzungsrechte','Herstellerdatei','catalog.asset','catalog',[
    name,ref('product_variant_version_id','Zugehöriger Produktstand','product-versions'),ref('font_variant_id','Zugehörige Schriftreferenz','fonts'),
    ref('document_version_id','Privat abgelegte Originaldateiversion','document-versions',true),
    select('asset_kind','Dateizweck',[['image_reference','Bildreferenz'],['outline','Originalkontur'],['mesh','3D-Modell'],['texture','Materialtextur'],['technical_document','Technische Unterlage']],true),
    select('source_unit','Dokumentierte Modelleinhheit',[['mm','Millimeter'],['cm','Zentimeter'],['m','Meter'],['in','Zoll']]),
    select('source_up_axis','Ursprüngliche Hochachse',[['X','+X'],['Y','+Y'],['Z','+Z']]),
    select('source_forward_axis','Ursprüngliche Vorderachse',[['X','+X'],['Y','+Y'],['Z','+Z'],['-X','−X'],['-Y','−Y'],['-Z','−Z']]),
    select('source_handedness','Dokumentiertes Ursprungssystem',[['right_handed','Rechtshändig'],['left_handed','Linkshändig']]),
    field('source_url','Tatsächliche Herstellerquelle'),rights,
    select('requested_usage','Angefragter Nutzungsumfang',[['internal_consultation','Interne Beratung'],['customer_visualization','Kundenvisualisierung'],['supplier_package','Lieferantenunterlage'],['manufacturing','Eigene Fertigung']]),notes
  ],[{name:'catalog.asset.verify',label:'Herkunft, Rechte und Geometrie prüfen',permission:'planning.release',statuses:['draft','under_review'],confirmation:true,requiresReason:true,fields:[
    ref('rights_evidence_version_id','Nachweis des erlaubten Nutzungsumfangs','document-versions',true),ref('geometry_evidence_version_id','Geometrie-/Achsen-/Referenzmaß-Prüfprotokoll','document-versions'),
    field('verified_usage','Tatsächlich freigegebener Umfang','textarea',true),...permittedUses,...outlineReview.filter(f=>f.key!=='source_unit'),field('reference_dimension_mm','Kontrolliertes Bezugsmaß (mm)','number'),
    select('verification_level','Nachgewiesene Evidenz',[['image_reference','Nur Bildreferenz'],['verified_envelope','Geprüfte Maßhülle'],['verified_original','Geprüfte Originalgeometrie']],true)
  ]}],'Private Herstellerdateien importieren. Rechte, Originalgeometrie, Einheiten, Achsen, Bounds und Quelle werden fachlich geprüft; kein Selbstbestätigungs-Checkboxfeld.'),
  module('edge-treatments','edge_treatment_versions','Kantenprofile','Kantenprofilversion','catalog.edge_treatment','catalog',[
    name,field('profile_reference','Hersteller-/Profilkennung'),field('description','Bearbeitung und Ausführung','textarea'),
    field('radius_mm','Belegter Radius (mm)','number'),field('minimum_thickness_mm','Belegte Mindeststärke (mm)','number'),
    source,field('source_url','Quelle'),notes
  ],[approve('catalog.edge_treatment')],'Versionierte, quellengebundene Sichtkanten, Radien, Fasen und Gehrungen. Die Planung referenziert konkrete Kantenindizes.'),
  module('finishes','finish_spec_versions','Oberflächen & Tönungen','Oberflächenversion','catalog.finish','catalog',[
    name,ref('manufacturer_id','Hersteller','manufacturers'),field('article_reference','Herstellerreferenz'),field('description','Belegte Ausführung','textarea'),source,rights,notes
  ],[approve('catalog.finish')],'Nachgewiesene Oberflächen und Tönungen; Verfügbarkeit bleibt je Hersteller-/Schriftvariante zu prüfen.'),
  module('glyph-library','glyph_assets','Originalzeichen & Befestigung','Originalzeichen','catalog.glyph','catalog',[
    name,ref('font_variant_id','Herstellerschrift','fonts',true),field('text','Wörtliches Zeichen / Zeichenfolge','text',true),
    ref('asset_document_id','Originaldatei','documents',true),ref('source_document_version_id','Bestätigte Original-/Fertigungsunterlage','document-versions',true),
    ref('supplier_product_variant_version_id','Eingefrorener Beschaffungsartikel','product-versions'),
    field('width_mm','Herstellerbestätigte Breite (mm)','number'),field('height_mm','Definierte Nennhöhe (mm)','number'),
    field('nominal_font_height_mm','Zugehörige Hersteller-Nennschrifthöhe (mm)','number',true),
    ref('fastening_document_version_id','Bestätigte Befestigungsdaten','document-versions'),rights,notes
  ],[{...approve('catalog.glyph','Originalzeichen und Befestigungsdaten fachlich prüfen'),fields:[ref('evidence_version_id','Originalkontur-/Metrik-/Befestigungsprüfprotokoll','document-versions',true),field('review_scope','Geprüfter Zeichen- und Fertigungsumfang','textarea',true),...permittedUses,...outlineReview]}],
    'Keine Ableitung exakter Breiten oder Bohrpunkte aus PNG-Vorschauen. Fehlende Originalglyphen bleiben sichtbar offen.'),
  module('material-boards','material_boards','Materialboards','Materialboard','planning.material_board','planning',[
    name,ref('planning_project_id','Planungsprojekt','planning-projects'),ref('order_id','Auftrag','orders'),field('description','Zusammenstellung / Auswahlziel','textarea'),notes
  ],[],'Materialwirkung, echte Muster und konkrete Natursteinplatten nachvollziehbar einer Planung zuordnen.'),
  module('selected-samples','selected_samples','Physische Muster','Musterwahl','planning.sample','planning',[
    name,ref('material_board_id','Materialboard','material-boards',true),ref('material_spec_version_id','Materialstand','material-versions',true),ref('stock_item_id','Konkrete Platte / Charge','stock'),
    ref('document_version_id','Musterfoto / Nachweis','document-versions'),field('sample_reference','Physische Musterkennung'),field('selection_note','Auswahl und Naturzeichnung','textarea')
  ],[{name:'planning.sample.confirm',label:'Konkrete Musterwahl dokumentieren',confirmation:true,fields:[field('person_name','Bestätigende Person','text',true),field('statement','Wörtliche Auswahlbestätigung','textarea',true),ref('evidence_version_id','Nachweis','document-versions',true)]}],
    'Eine bestätigte Muster-/Plattenwahl belegt die konkrete Auswahl. Sie garantiert keine identische natürliche Aderung anderer Platten.'),
  module('document-versions','document_versions','Dokumentversionen','Dokumentversion','documents.version','documents',[],[],
    'Unveränderliche, geprüfte Quelldateiversionen für Herstellerdaten, Aufmaß, Rechte und Freigaben. Dateien werden über die Dokumentenakte hochgeladen.')
];
const documentVersions=additionalModules.find(m=>m.slug==='document-versions')!;documentVersions.readOnly=true;documentVersions.columns=['name','document_id','revision','status','created_at'];

export const immutableLibraryTables=['material_spec_versions','product_variant_versions','product_availability_versions','product_assets','edge_treatment_versions','finish_spec_versions','glyph_assets'] as const;
