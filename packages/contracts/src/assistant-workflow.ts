import {z} from 'zod';

export const planningStepSchema=z.enum(['geometry','design','review','output']);
export type PlanningStep=z.infer<typeof planningStepSchema>;
export const planningWorkSchema=z.strictObject({
  step:planningStepSchema,
  revision_id:z.uuid(),
  base_version:z.number().int().nonnegative(),
  view:z.enum(['front','side','top','3d'])
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

export function planningStepLabel(kind:string,step:PlanningStep){
  return ({geometry:kind==='memorial'?'Stein & Maße':'Raum & Aufmaß',design:kind==='memorial'?'Inschrift & Details':'Bauteile & Material',review:'Prüfen',output:'Präsentieren'})[step];
}

export function planningStepInstructions(kind:string,step:PlanningStep){
  const brief=kind==='memorial'
    ?'Nur Steinform, Außenmaße, Materialstärke und belegte Friedhofsvorgaben klären. Keine Inschrift erfinden.'
    :'Nur Raumgeometrie, lichte Innenmaße, Wandstärke, Höhen und Öffnungen klären. Achs-, Außen- und Innenmaße unterscheiden.';
  return ({
    geometry:brief+' Einen ersten Entwurf nur mit vollständig angegebenen Maßen vorbereiten. Neue manuelle Angaben sind Planmaße, kein bestätigtes Aufmaß.',
    design:kind==='memorial'
      ?'Nur die gewünschte Gestaltung oder Inschrift bearbeiten. Text, Namen, Daten und Zeilenumbrüche wörtlich erhalten. Bestehende Inschriften schützen. Fehlende Hersteller-, Material- oder Schriftangaben als offen kennzeichnen.'
      :'Nur die angeforderten Natursteinbauteile, Materialien, Oberflächen, Kanten und Ausschnitte besprechen. Nutzungsart und Maßbezug beachten. Keine Produktmaße, Materialeignung, Gefälle oder Montagewerte erfinden.',
    review:'Nur prüfen und konkrete offene Punkte mit Bauteilbezug nennen. Die übergebene deterministische Prüfliste ist maßgeblich. Keine Änderungen vorschlagen, keine Maße bestätigen und keine Freigabe erteilen.',
    output:'Nur die Kundenpräsentation oder Ausgabe vorbereiten. Technisches PDF und Stückliste stammen aus dem Modell. Generierte Bilder sind Visualisierungen. Keine Planänderung, Bildbestellung, Veröffentlichung oder Freigabe auslösen.'
  })[step];
}

export function planningOperationAllowed(step:PlanningStep,type:string){
  if(step==='review'||step==='output')return false;
  if(step==='geometry')return ['add_element','move_element','set_element_position','rotate_element','set_design_target'].includes(type);
  return ['move_element','set_element_position','rotate_element','set_design_target','set_inscription_text','set_inscription_layout'].includes(type);
}
