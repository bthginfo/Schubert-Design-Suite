/** Reserve screen space for dimension stems and labels when fitting a drawing.
 * Padding follows the current canvas, including both open side panels. */
export function planningPadding(bounds:{width:number;height:number},canvasWidth:number,canvasHeight:number,dimensions:boolean){
 if(!dimensions){const pad=Math.max(bounds.width,bounds.height)*.14+20;return {x:pad,y:pad};}
 const width=Math.max(1,canvasWidth),height=Math.max(1,canvasHeight),x=Math.max(0,Math.min(136,(width-80)/2)),y=Math.max(0,Math.min(64,(height-80)/2));
 const scale=Math.max((bounds.width+40)/Math.max(1,width-2*x),(bounds.height+40)/Math.max(1,height-2*y));
 return {x:20+x*scale,y:20+y*scale};
}
