import {expect,it} from 'vitest';import {planningPadding} from '../apps/web/src/lib/client/studio-viewport.ts';
it('fits dimension labels as well as geometry when both side panels narrow the canvas',()=>{
 for(const [width,height]of [[640,500],[500,680],[390,350]]){
  const bounds={width:3500,height:2700},padding=planningPadding(bounds,width,height,true),scale=Math.max((bounds.width+2*padding.x)/width,(bounds.height+2*padding.y)/height);
  expect(padding.x/scale).toBeGreaterThanOrEqual(130);expect(padding.y/scale).toBeGreaterThanOrEqual(60);
 }
});
it('keeps useful drawing space on small canvases and works with empty or hidden dimensions',()=>{
 for(const dims of [true,false]){const padding=planningPadding({width:0,height:0},200,160,dims);expect(Number.isFinite(padding.x)&&Number.isFinite(padding.y)).toBe(true);expect(padding.x).toBeGreaterThan(0);}
});
