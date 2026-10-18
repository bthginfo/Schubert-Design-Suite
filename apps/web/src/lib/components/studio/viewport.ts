/** Display spacing only: the construction/snap grid keeps its exact configured size. */
export function displayGridStep(baseMm:number, mmPerPixel:number):number {
  const base=Number.isFinite(baseMm)&&baseMm>0?baseMm:10;
  const needed=Math.max(base,Math.max(0,mmPerPixel)*22);
  const magnitude=10**Math.floor(Math.log10(needed/base));
  return base*magnitude*([1,2,5,10].find(n=>n*magnitude*base>=needed)??10);
}

export function centeredZoom(pan:number, extent:number, previousZoom:number, nextZoom:number):number {
  return pan+extent/previousZoom/2-extent/nextZoom/2;
}
