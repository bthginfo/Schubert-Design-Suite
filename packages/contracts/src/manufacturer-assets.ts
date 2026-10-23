import {z} from 'zod';

export const manufacturerAssetKinds={plan:'Grundriss / Kontur',reference:'KI-Referenzbild',datasheet:'Datenblatt',model:'3D-Originaldatei'};
export const manufacturerAssetScopes={both:'Beide Planungsstudios',memorial:'Grabmalstudio',room_plan:'Raum & Naturstein'};
export const manufacturerAssetSchema=z.strictObject({
  name:z.string().trim().min(2).max(160),manufacturer_name:z.string().trim().min(2).max(120),
  article_reference:z.string().trim().max(120).default(''),
  kind:z.enum(['plan','reference','datasheet','model']),studio_scope:z.enum(['both','memorial','room_plan']),
  source_url:z.union([z.literal(''),z.url().refine(value=>value.startsWith('https://'),'Eine HTTPS-Quelle angeben.')]).default(''),
  source_unit:z.enum(['mm','cm','m','in']).nullable().default(null),
  notes:z.string().max(2000).default('')
});
export type ManufacturerAssetInput=z.infer<typeof manufacturerAssetSchema>;
