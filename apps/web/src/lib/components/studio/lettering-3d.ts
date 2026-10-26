import {Matrix4,Vector3} from 'three';
import type {DesignSnapshot,InscriptionElement} from '@schubert/contracts';
import {surfaceMatrix,layerSlices} from '@schubert/geometry';

/** Renderer-only placement. The saved surface coordinates remain canonical mm. */
export function inscriptionPlane(snapshot:DesignSnapshot,element:InscriptionElement){
  const host=snapshot.elements.find(item=>item.id===element.surfaceElementId);
  const elevation=host?.kind==='surface'?Math.max(0,...layerSlices(snapshot,host).layers.map(layer=>Number(layer.topMm))):0;
  const m=surfaceMatrix(snapshot,element.surfaceElementId);
  return new Matrix4().set(m[0],m[1],m[2],m[3]/1000,m[4],m[5],m[6],m[7]/1000,m[8],m[9],m[10],m[11]/1000,0,0,0,1)
    .multiply(new Matrix4().makeTranslation(Number(element.originUV.uMm)/1000,Number(element.originUV.vMm)/1000,(elevation+.8)/1000))
    .multiply(new Matrix4().makeRotationZ(Number(element.rotationDeg)*Math.PI/180));
}

/** Start on the actual front of a rotated memorial, with a small sense of depth. */
export function inscriptionViewDirection(snapshot:DesignSnapshot){
  const inscription=snapshot.elements.find(item=>item.kind==='inscription'&&item.phase!=='demolition');
  const host=inscription?.kind==='inscription'?inscription.surfaceElementId:snapshot.elements.find(item=>item.kind==='stone_piece'&&item.phase!=='demolition')?.id;
  if(!host)return new Vector3(.8,.7,1);
  const m=surfaceMatrix(snapshot,host);
  const render=(x:number,y:number,z:number)=>new Vector3(x,z,-y);
  return render(m[2],m[6],m[10]).normalize()
    .addScaledVector(render(m[0],m[4],m[8]).normalize(),.22)
    .addScaledVector(render(m[1],m[5],m[9]).normalize(),.12).normalize();
}
