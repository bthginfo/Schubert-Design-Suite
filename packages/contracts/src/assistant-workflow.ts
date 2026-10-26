import {z} from 'zod';
import {planningPresets} from './planning-workflow.js';
import {designOperationSchema} from './planning.js';

export const planningStepSchema=z.enum(['geometry','design','review','output']);
export type PlanningStep=z.infer<typeof planningStepSchema>;
export type AssistantSkillUsage={id:string;label:string;version:string;jurisdiction:'DE'};
export const planningGuardrailsSchema=z.strictObject({
  preserveMeasurements:z.boolean().default(false),
  preserveWording:z.boolean().default(false),
  selectionOnly:z.boolean().default(false)
});
export type PlanningGuardrails=z.infer<typeof planningGuardrailsSchema>;
export const planningWorkSchema=z.strictObject({
  step:planningStepSchema,
  revision_id:z.uuid(),
  base_version:z.number().int().nonnegative(),
  view:z.enum(['front','side','top','3d']),
  display_unit:z.enum(['mm','cm','m']).optional(),
  guardrails:planningGuardrailsSchema.optional()
});

// Working copies are deliberately bounded, untrusted input. They never supply
// tenant identity, permissions, record versions, or binding command parameters.
const draftValue=z.union([z.string().max(4000),z.number().finite(),z.boolean(),z.null()]);
export const assistantEditorSchema=z.strictObject({
  module:z.string().regex(/^[a-z][a-z-]{0,60}$/),
  record_id:z.uuid().optional(),
  values:z.record(z.string().max(80),draftValue).refine(value=>Object.keys(value).length<=40),
  lines:z.array(z.strictObject({
    description:z.string().max(1500),quantity:z.string().max(40),unit:z.string().max(20),
    unit_price:z.string().max(40),tax_rate:z.string().max(40),
    line_type:z.enum(['item','heading','text','subtotal']),optional:z.boolean(),selected:z.boolean()
  })).max(20).default([]),
  total_line_count:z.number().int().min(0).max(2000).default(0)
});
export type AssistantEditor=z.infer<typeof assistantEditorSchema>;
export const assistantDraftFieldKeys=['name','title','party_type','description','notes','terms','valid_until','due_date','service_date','requested_date','currency','email','phone','street','postal_code','city','country','business_unit'];
export const assistantDraftModules=['customers','suppliers','inquiries','quotes','orders','invoices','purchase-orders','supplier-invoices','change-orders','tasks'];

export function planningStepLabel(kind:string,step:PlanningStep,presetId?:unknown){
  const preset=planningPresets.find(p=>p.id===presetId&&p.kind===kind);
  if(step==='geometry'&&preset?.id==='memorial_existing')return 'Bestand & Maße';
  if(step==='geometry'&&kind==='room_plan'&&preset?.firstElement==='stone_piece')return 'Bauteil & Maße';
  return ({geometry:kind==='memorial'?'Stein & Maße':'Raum & Aufmaß',design:kind==='memorial'?'Inschrift & Details':'Bauteile & Material',review:'Prüfen',output:'Präsentieren'})[step];
}

export function planningStepInstructions(kind:string,step:PlanningStep,presetId?:unknown){
  const preset=planningPresets.find(p=>p.id===presetId&&p.kind===kind);
  const brief=preset?.id==='memorial_existing'
    ?'Schwerpunkt: belegte Bestandsmaße, Steinform und Bestandsunterlagen klären. Eine beauftragte Bestandsänderung als neue geplante Fassung vorbereiten; der Originalstand bleibt im Verlauf erhalten.'
    :kind==='room_plan'&&preset?.firstElement==='stone_piece'
    ?'Schwerpunkt: Länge, Tiefe, Materialstärke und Einbaubezüge für '+preset.label+' klären. Keinen vollständigen Raum oder ein Raumaufmaß voraussetzen. Fehlende Kanten-, Anschluss- oder Ausschnittangaben gezielt erfragen; keine Maße erfinden.'
    :kind==='memorial'
    ?'Schwerpunkt: Steinform, Außenmaße, Materialstärke und belegte Friedhofsvorgaben klären. Keine Inschrift erfinden.'
    :'Schwerpunkt: Raumgeometrie, lichte Innenmaße, Wandstärke, Höhen und Öffnungen klären. Achs-, Außen- und Innenmaße unterscheiden.';
  return 'Der Arbeitsschritt gibt den Schwerpunkt vor; ausdrückliche Bearbeitungswünsche sind in jedem Schritt möglich. '+({
    geometry:brief+' Einen ersten Entwurf nur mit vollständig angegebenen Maßen vorbereiten. Neue manuelle Angaben sind Planmaße, kein bestätigtes Aufmaß.',
    design:kind==='memorial'
      ?'Die gewünschte Gestaltung oder Inschrift bearbeiten. Text, Namen, Daten und Zeilenumbrüche ohne Änderungswunsch wörtlich erhalten. Ausdrücklich gewünschte Textänderungen und zusätzliche Inschriften vorbereiten. Fehlende Hersteller-, Material- oder Schriftangaben als offen kennzeichnen.'
      :'Die angeforderten Natursteinbauteile, Materialien, Oberflächen, Kanten und Ausschnitte besprechen. Nutzungsart und Maßbezug beachten. Keine Produktmaße, Materialeignung, Gefälle oder Montagewerte erfinden.',
    review:'Bei einer reinen Prüffrage: Nur prüfen und konkrete offene Punkte mit Bauteilbezug nennen. Die deterministische Prüfliste ist maßgeblich. Auf ausdrücklichen Änderungswunsch auch hier Entwurfsänderungen vorbereiten; der Schritt sperrt keine Bearbeitung. Maße und Freigaben nicht bestätigen.',
    output:'Kundenpräsentation und Ausgabe stehen im Vordergrund. Auf ausdrücklichen Wunsch Entwurfsänderungen vorbereiten oder die angebundene Bildfunktion mit passendem Prompt anbieten. Technisches PDF und Stückliste stammen aus dem Modell. Bilder sind Visualisierungen; Kosten und Nutzungsrechte zeigt der Bilddialog. Keine Veröffentlichung oder fachliche Freigabe selbst bestätigen.'
  })[step];
}

export function planningOperationAllowed(step:PlanningStep,type:string){
  return designOperationSchema.options.some(schema=>schema.shape.type.value===type)&&!['confirm_design_target','record_survey_measurement','confirm_survey_measurement','correct_existing_inscription','set_inscription_originals','confirm_contour_import','add_asset_reference'].includes(type);
}
