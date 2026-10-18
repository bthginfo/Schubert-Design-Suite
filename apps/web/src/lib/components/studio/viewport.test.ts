import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {centeredZoom,displayGridStep} from './viewport.ts';
import {fitPerspectiveBounds} from './camera-fit.ts';

describe('readable, stable planning viewports',()=>{
  it('keeps the display grid sparse without changing the construction spacing',()=>{
    for(const scale of [.01,.5,1,10,100,1000]){
      const step=displayGridStep(10,scale);
      expect(step/scale).toBeGreaterThanOrEqual(22);expect(step%10).toBe(0);
    }
    expect(displayGridStep(10,.01)).toBe(10);
  });
  it('zooms around the visible centre and reverses without drift',()=>{
    const pan=centeredZoom(53,4800,1,1.25);
    expect(pan+4800/1.25/2).toBe(53+4800/2);
    expect(centeredZoom(pan,4800,1.25,1)).toBe(53);
  });
  for(const aspect of [.25,.5,1,2,4])for(const dimensions of [[.8,1.2,.16],[6,2.8,4],[.2,4,.2]]){
    it(`fits all corners at aspect ${aspect}, geometry ${dimensions}`,()=>{
      const camera=new THREE.PerspectiveCamera(38,aspect,.01,1000);
      const box=new THREE.Box3(new THREE.Vector3(-2,0,3),new THREE.Vector3(-2+dimensions[0],dimensions[1],3+dimensions[2]));
      for(const direction of [new THREE.Vector3(.8,.7,1),new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,.0001)]){
        fitPerspectiveBounds(camera,box,direction);
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=new THREE.Vector3(x,y,z).project(camera);
          expect(Math.abs(p.x)).toBeLessThan(.87);expect(Math.abs(p.y)).toBeLessThan(.87);expect(Math.abs(p.z)).toBeLessThan(1);
        }
      }
    });
  }
});
