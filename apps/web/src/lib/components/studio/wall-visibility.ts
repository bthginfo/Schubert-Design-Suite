import type {DesignElement,DesignSnapshot} from '@schubert/contracts';
/** Presentation only: the saved model, quantities and technical exports stay complete. */
export function isWallSurface(element:DesignElement){
  return element.kind==='wall'||element.kind==='opening'||element.kind==='surface'&&element.surfaceType==='wall'||element.kind==='stone_piece'&&element.purpose==='wall';
}
export function hiddenWallIds(snapshot:DesignSnapshot,showWalls:boolean){return new Set(showWalls?[]:snapshot.elements.filter(isWallSurface).map(element=>element.id));}
