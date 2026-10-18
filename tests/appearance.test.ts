import {describe,it,expect} from 'vitest';
import {accentPalette,appearanceSchema,appearanceStyle,defaultAppearance} from '@schubert/contracts';
const luminance=(hex:string)=>{const rgb=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a:string,b:string)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05);};
describe('Curated personal presentation',()=>{
 it.each(Object.entries(accentPalette))('%s meets normal-text contrast in both modes, including hover',(_,p)=>{
  for(const color of[p.light,p.hover]){expect(contrast(color,'#ffffff')).toBeGreaterThanOrEqual(4.5);expect(contrast(color,'#f6f5f2')).toBeGreaterThanOrEqual(4.5);}
  for(const color of[p.dark,p.darkHover]){expect(contrast(color,'#15201c')).toBeGreaterThanOrEqual(4.5);expect(contrast(color,'#29332d')).toBeGreaterThanOrEqual(4.5);}
 });
 it('rejects arbitrary CSS and safely falls back for corrupt preferences',()=>{const invalid={accent:'red;display:none',mode:'dark'};expect(appearanceSchema.safeParse(invalid).success).toBe(false);expect(appearanceStyle(invalid)).toBe(appearanceStyle(defaultAppearance));expect(appearanceStyle({accent:'ocean',mode:'system'})).toContain('color-scheme:light dark');});
});
