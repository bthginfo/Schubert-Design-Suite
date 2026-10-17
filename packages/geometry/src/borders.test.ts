import{describe,it,expect}from'vitest';
import{rectangularBorderParts,contourAreaMm2,D}from'./index.js';
describe('four real rectangular border stones',()=>{
 it('keeps the outer envelope and both declared gaps in each long rail',()=>{const parts=rectangularBorderParts('1000','2000','100','150','5');expect(parts).toHaveLength(4);expect(parts.find(p=>p.key==='left')).toMatchObject({position:{xMm:'0',yMm:'105',zMm:'150'},widthMm:'100',lengthMm:'1790'});expect(parts.find(p=>p.key==='back')?.position.yMm).toBe('1900');const area=parts.reduce((a,p)=>a.plus(contourAreaMm2(p.contour)),new D(0));expect(area.toString()).toBe('558000');expect(area.times(150).div(1e9).toString()).toBe('0.0837');});
 it('accepts an explicitly zero butt gap and rejects impossible rail/joint widths',()=>{expect(rectangularBorderParts('1000','2000','100','150','0')[2].lengthMm).toBe('1800');expect(()=>rectangularBorderParts('200','2000','100','150','5')).toThrow();expect(()=>rectangularBorderParts('1000','200','100','150','5')).toThrow();expect(()=>rectangularBorderParts('1000','2000','100','150','-1')).toThrow();});
});
