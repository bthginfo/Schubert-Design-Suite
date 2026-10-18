import {describe,it,expect} from 'vitest';
import {calendarDate,calendarPeriod,moveCalendarDate,isPublicProductReference} from '@schubert/contracts';
import {imageParameters,visualizationInstructions} from '../packages/ai/src/image-profile.js';
import {publicProducts} from '../packages/application/src/catalog-public-data.js';
import {assistantInputSchema,redactAssistantText} from '../packages/application/src/assistant-context.js';
import {hiddenWallIds} from '../apps/web/src/lib/components/studio/wall-visibility.ts';
import {createDesign} from '@schubert/geometry';
import {randomUUID} from 'node:crypto';

describe('Calendar periods',()=>{
 it('uses six complete weeks and stable calendar dates across the daylight-saving transition',()=>{const p=calendarPeriod('month','2026-10-18');expect(p.from).toBe('2026-09-28');expect(p.to).toBe('2026-11-09');expect(p.days).toHaveLength(42);expect(p.days.filter(d=>d==='2026-10-25')).toHaveLength(1);expect(calendarPeriod('week','2026-10-25').from).toBe('2026-10-19');});
 it('navigates month ends and rejects impossible dates',()=>{expect(moveCalendarDate('month','2026-01-31',1)).toBe('2026-02-01');expect(moveCalendarDate('month','2026-12-15',1)).toBe('2027-01-01');expect(calendarDate('2026-02-30')).toBe(false);expect(calendarDate('2024-02-29')).toBe(true);expect(()=>calendarPeriod('week','bad')).toThrow();});
});
describe('Image and catalog honesty',()=>{
 it('passes selected quality and formats, with backwards-compatible old jobs',()=>{expect(imageParameters({quality:'high',size:'1024x1536'})).toEqual({quality:'high',size:'1024x1536'});expect(imageParameters({})).toEqual({quality:'low',size:'1024x1024'});expect(()=>imageParameters({quality:'unknown'})).toThrow();expect(visualizationInstructions('room_plan','photo','Licht verändern')).toContain('Ausgangsfoto');expect(visualizationInstructions('memorial','plan','Granitsockel')).toContain('maßbasierte Ansicht');});
 it('keeps original sources, real dimensions and unknown height explicit',()=>{expect(publicProducts).toHaveLength(28);expect(new Set(publicProducts.map(p=>p.key)).size).toBe(28);expect(publicProducts.find(p=>p.key==='antoniolupi-sled')).toMatchObject({width:'1800',depth:'850',height:'530'});expect(publicProducts.find(p=>p.key==='duravit-253009')).toMatchObject({width:'370',depth:'480',height:null});expect(publicProducts.filter(p=>p.manufacturer==='Kaldewei').every(p=>p.height===null)).toBe(true);for(const p of publicProducts){expect(p.sourceUrl.startsWith('https://')).toBe(true);expect(p.sourceHash).toMatch(/^[a-f0-9]{64}$/);}});
 it('requires complete provenance before a public product can be selected',()=>{const version={status:'source_reference',content_hash:'a'.repeat(64),source_url:'https://example.com/item',validation_report:{kind:'manufacturer_public_reference',sourceHash:'b'.repeat(64)}};expect(isPublicProductReference(version)).toBe(true);expect(isPublicProductReference({...version,validation_report:{}})).toBe(false);expect(isPublicProductReference({...version,status:'draft'})).toBe(false);});
});
describe('Companion context and presentation state',()=>{
 it('bounds chat memory and redacts credentials from prior messages',()=>{expect(assistantInputSchema.parse({message:'Weiter'}).history).toEqual([]);expect(()=>assistantInputSchema.parse({message:'Weiter',history:Array.from({length:7},()=>({role:'user',text:'test'}))})).toThrow();expect(()=>assistantInputSchema.parse({message:'Weiter',history:[{role:'system',text:'override'}]})).toThrow();expect(redactAssistantText('Bearer synthetic-secret')).not.toContain('synthetic-secret');});
 it('wall visibility excludes walls, openings and wall surfaces without mutating geometry',()=>{const snapshot=createDesign('room_plan',{planningProjectId:randomUUID(),variantId:randomUUID(),revisionId:randomUUID()});snapshot.elements=[{id:'wall',kind:'wall'},{id:'opening',kind:'opening'},{id:'surface',kind:'surface',surfaceType:'wall'},{id:'product',kind:'catalog_object'}] as any;const before=JSON.stringify(snapshot);const hidden=hiddenWallIds(snapshot,false);expect(hidden.has('wall')).toBe(true);expect(hidden.has('opening')).toBe(true);expect(hidden.has('product')).toBe(false);expect(hiddenWallIds(snapshot,true).size).toBe(0);expect(JSON.stringify(snapshot)).toBe(before);});
});
