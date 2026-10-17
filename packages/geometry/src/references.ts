import type{DesignSnapshot,DesignElement}from'@schubert/contracts';
import{D,mm}from'./precision.js';
import{measureValue}from'./model.js';
import{worldMatrix}from'./transforms.js';
export type PlanReference=Extract<DesignElement,{kind:'plan_reference'}>;
export type SourcePoint={xPx:string;yPx:string};
/** Affine scan calibration is a proposal; a perspective room photo has no metric plane. */
export function calibrateReference(snapshot:DesignSnapshot,reference:PlanReference){
  const reasons:string[]=[],warnings:string[]=[],segments=reference.calibration.segments;
  const x=segments.find(s=>s.axis==='x'),y=segments.find(s=>s.axis==='y'),control=segments.find(s=>s.axis==='control');
  const missing={usable:false,reasons,warnings,matrix:null as null|[number,number,number,number,number,number],controlErrorMm:null as string|null,scaleDifferencePercent:null as string|null};
  if(reference.sourceKind==='room_photo')reasons.push('Perspektivisches Raumfoto: ohne eigene belegte Projektion keine maßhaltige Grundrissebene.');
  if(new Set(segments.map(s=>s.axis)).size!==segments.length)reasons.push('Jede Kalibrierachse und Kontrollstrecke nur einmal zuordnen.');
  if(!x||!control)reasons.push('Bekanntes Bezugsmaß und unabhängiges Kontrollmaß fehlen.');
  if(y&&!reference.calibration.orthogonalAxesDeclared)reasons.push('Die beiden Bezugsrichtungen müssen laut Quelle rechtwinklig sein.');
  const length=(s:typeof x)=>s?measureValue(snapshot,s.lengthMeasureId):null;
  const lx=length(x),ly=length(y),lc=length(control);
  if(!x||!control||lx===null||lc===null||!new D(lx).gt(0)||!new D(lc).gt(0)){if(x&&control)reasons.push('Positive bekannte Bezugslängen in mm eingeben.');return missing;}
  if(y&&(ly===null||!new D(ly).gt(0))){reasons.push('Zweite Achse benötigt eine bekannte positive Länge.');return missing;}
  const vx=[Number(x.b.xPx)-Number(x.a.xPx),Number(x.b.yPx)-Number(x.a.yPx)],nx=Math.hypot(...vx);
  const vy=y?[Number(y.b.xPx)-Number(y.a.xPx),Number(y.b.yPx)-Number(y.a.yPx)]:[vx[1],-vx[0]],ny=Math.hypot(...vy),det=vx[0]*vy[1]-vx[1]*vy[0];
  if(nx<1||ny<1||Math.abs(det)<nx*ny*.05){reasons.push('Bezugsrichtungen sind zu kurz oder nahezu parallel.');return missing;}
  const actualY=y?Number(ly):Number(lx),a=Number(lx)*vy[1]/det,c=-Number(lx)*vy[0]/det,b=-actualY*vx[1]/det,d=actualY*vx[0]/det;
  const e=-a*Number(x.a.xPx)-c*Number(x.a.yPx),f=-b*Number(x.a.xPx)-d*Number(x.a.yPx),matrix:[number,number,number,number,number,number]=[a,b,c,d,e,f];
  const delta=[Number(control.b.xPx)-Number(control.a.xPx),Number(control.b.yPx)-Number(control.a.yPx)];
  const measured=Math.hypot(a*delta[0]+c*delta[1],b*delta[0]+d*delta[1]),error=Math.abs(measured-Number(lc));
  const tolerance=Number(reference.calibration.toleranceMm);if(!Number.isFinite(tolerance)||tolerance<0)reasons.push('Nichtnegative Prüftoleranz für die Kontrollstrecke angeben.');else if(error>tolerance)reasons.push(`Kontrollmaß weicht um ${mm(error)} mm ab; erlaubte Prüfabweichung ${mm(tolerance)} mm.`);
  const same=(p:SourcePoint,q:SourcePoint)=>p.xPx===q.xPx&&p.yPx===q.yPx;
  if(same(control.a,x.a)&&same(control.b,x.b)||same(control.a,x.b)&&same(control.b,x.a)||y&&(same(control.a,y.a)&&same(control.b,y.b)||same(control.a,y.b)&&same(control.b,y.a)))reasons.push('Die Kontrollstrecke muss unabhängig von den Kalibrierstrecken sein.');
  const difference=y?Math.abs(Number(lx)/nx-Number(ly)/ny)/(Number(lx)/nx)*100:0;if(difference>1)warnings.push(`Unterschiedliche Achsskalierung: ${mm(difference)} %. Beide Achsen werden getrennt berechnet; Quelle vor Fertigung prüfen.`);
  if(!y)warnings.push('Gleichmäßiger Scanmaßstab angenommen. Bei Verzerrung zusätzlich die zweite Achse kalibrieren.');
  warnings.push('Importvorschlag: Kalibrierung bestätigt kein Aufmaß und keine Ausführungstoleranz.');
  return{usable:reasons.length===0,reasons,warnings,matrix,controlErrorMm:mm(error),scaleDifferencePercent:mm(difference)};
}
export function sourcePointToMm(snapshot:DesignSnapshot,reference:PlanReference,point:SourcePoint){const calibration=calibrateReference(snapshot,reference);if(!calibration.usable||!calibration.matrix)throw new Error(calibration.reasons.join('\n'));const[a,b,c,d,e,f]=calibration.matrix;return{xMm:mm(a*Number(point.xPx)+c*Number(point.yPx)+e),yMm:mm(b*Number(point.xPx)+d*Number(point.yPx)+f),zMm:'0'};}
export function sourceSvgMatrix(snapshot:DesignSnapshot,reference:PlanReference){const calibrated=calibrateReference(snapshot,reference);if(!calibrated.usable||!calibrated.matrix)return null;const[a,b,c,d,e,f]=calibrated.matrix,m=worldMatrix(snapshot,reference.id);return[m[0]*a+m[1]*b,-(m[4]*a+m[5]*b),m[0]*c+m[1]*d,-(m[4]*c+m[5]*d),m[0]*e+m[1]*f+m[3],-(m[4]*e+m[5]*f+m[7])];}
