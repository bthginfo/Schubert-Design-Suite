import {z} from 'zod';
import {modules} from './modules.js';

export const feedbackCategories={bug:'Fehler',usability:'Bedienung unklar',idea:'Verbesserungsidee',other:'Sonstiges'} as const;
export const feedbackStatuses={new:'Neu',triaged:'Geprüft',planned:'Geplant',in_progress:'In Bearbeitung',resolved:'Behoben',closed:'Abgeschlossen'} as const;
export const feedbackPriorities={normal:'Normal',high:'Hoch',urgent:'Dringend'} as const;
const settingsTabs=['company','finance','numbering','bank','integrations','usage','feedback','approvals','modules','users','privacy','account'];
const pages:Record<string,string>={...Object.fromEntries(modules.map(m=>[m.slug,m.label])),'':'Heute',studio:'Planungsstudio',settings:'Einstellungen',account:'Mein Zugang',help:'Hilfe & Einführung',reports:'Auswertungen',time:'Zeiterfassung'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Retain only known routes, record IDs and enumerated settings tabs. Never search terms or tokens. */
export function feedbackPage(input:string){
 const fallback={path:'/',label:'Arbeitsbereich'};
 if(!input.startsWith('/')||input.startsWith('//')||input.includes('\\'))return fallback;
 try{const url=new URL(input,'https://suite.invalid'),parts=url.pathname.split('/').filter(Boolean);
  if(parts.length>2)return fallback;
  const slug=parts[0]??'';if(!(slug in pages)||parts[1]&&!uuid.test(parts[1]))return fallback;
  const query=new URLSearchParams();const tab=url.searchParams.get('tab');if(slug==='settings'&&tab&&settingsTabs.includes(tab))query.set('tab',tab);
  const variant=url.searchParams.get('variant');if(slug==='studio'&&variant&&uuid.test(variant))query.set('variant',variant);
  return{path:'/'+parts.join('/')+(query.size?'?'+query.toString():''),label:pages[slug]+(parts[1]?' · Detail':'')};
 }catch{return fallback;}
}
export const feedbackControls=[...new Set(['Front','Seite','Drauf','Kontur & Bögen bearbeiten','In den Plan übernehmen','Raum anlegen','Ersten Stein anlegen','Tür / Fenster','Speichern','Änderungen speichern','Abbrechen','Schließen','Bearbeiten','Weiter','Zurück','Vorschau','Neu','Suchen','Filter zurücksetzen','PDF herunterladen','Exportieren','Herunterladen','Hilfe zu dieser Seite','Assistent öffnen','3D','2D','Grundriss','Vorderansicht','Draufsicht','Ansicht einpassen','Vergrößern','Verkleinern','Rückgängig','Wiederholen','Variante speichern','Projekt öffnen','Planstand speichern',...modules.flatMap(m=>[m.label,m.singular+' anlegen','Neue '+m.singular,'Neuer '+m.singular,...m.actions.map(a=>a.label)])])];
export const feedbackStepSchema=z.object({kind:z.enum(['navigation','control','command','request']),action:z.string().min(1).max(100),page:z.string().max(240).transform(v=>feedbackPage(v).path),age_seconds:z.number().int().min(0).max(900),outcome:z.enum(['opened','started','succeeded','failed']),error_code:z.string().regex(/^[A-Z][A-Z0-9_]{0,59}$/).optional(),correlation_id:z.uuid().optional()}).strict();
export const feedbackContextSchema=z.object({steps:z.array(feedbackStepSchema).max(40),browser:z.enum(['Edge','Chrome','Firefox','Safari','Other']),os:z.enum(['Windows','macOS','iOS','Android','Linux','Other']),viewport:z.object({width:z.number().int().min(200).max(10000),height:z.number().int().min(200).max(10000)}).strict(),client_release:z.string().regex(/^(?:[a-f0-9]{7,40}|development|unknown)$/)}).strict();
export const feedbackSubmitSchema=z.object({category:z.enum(['bug','usability','idea','other']),message:z.string().trim().min(5).max(5000),expected:z.string().trim().max(2000).default(''),page:z.string().max(240).transform(feedbackPage),context:feedbackContextSchema.nullable()}).strict();
export type FeedbackContext=z.infer<typeof feedbackContextSchema>;
export type FeedbackStep=z.infer<typeof feedbackStepSchema>;
export function feedbackStepLabel(step:FeedbackStep){
 const outcome={opened:'geöffnet',started:'gestartet',succeeded:'erfolgreich',failed:'fehlgeschlagen'}[step.outcome];let action=step.kind==='navigation'?feedbackPage(step.page).label:step.action;
 if(step.kind==='command'){const module=modules.find(m=>step.action.startsWith(m.commandPrefix+'.')),defined=module?.actions.find(a=>a.name===step.action);action=defined?.label??(module?module.singular+(step.action.endsWith('.create')?' anlegen':' bearbeiten'):step.action.startsWith('planning.')?'Planung bearbeiten':'Vorgang ausführen');}
 return `${action} · ${outcome}`;
}
