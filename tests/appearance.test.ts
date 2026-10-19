import {describe,it,expect} from 'vitest';
import {accentPalette,appearanceSchema,appearanceStyle,defaultAppearance} from '@schubert/contracts';
const luminance=(hex:string)=>{const rgb=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a:string,b:string)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05);};
describe('Curated personal presentation',()=>{
 it.each(Object.entries(accentPalette))('%s meets normal-text contrast in both modes, including hover',(_,p)=>{
  for(const color of[p.light,p.hover]){expect(contrast(color,'#ffffff')).toBeGreaterThanOrEqual(4.5);expect(contrast(color,'#eef2f7')).toBeGreaterThanOrEqual(4.5);}
  for(const color of[p.dark,p.darkHover])for(const surface of['#101827','#151f30','#1c2b40'])expect(contrast(color,surface)).toBeGreaterThanOrEqual(4.5);
 });
 it('keeps navy foregrounds readable on each depth level',()=>{for(const surface of['#0d1422','#101a2b','#111b2b','#151f30','#1b293d','#1c2b40'])for(const foreground of['#eef3fc','#b8c6d9'])expect(contrast(foreground,surface)).toBeGreaterThanOrEqual(4.5);expect(appearanceStyle({accent:'ocean',mode:'dark'})).toContain('--canvas:light-dark(#eef2f7,#0d1422)');});
 it('rejects arbitrary CSS and safely falls back for corrupt preferences',()=>{const invalid={accent:'red;display:none',mode:'dark'};expect(appearanceSchema.safeParse(invalid).success).toBe(false);expect(appearanceStyle(invalid)).toBe(appearanceStyle(defaultAppearance));expect(appearanceStyle({accent:'ocean',mode:'system'})).toContain('color-scheme:light dark');});
});
