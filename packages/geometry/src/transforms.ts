import type { DesignSnapshot, Point3, Transform } from '@schubert/contracts';
import { mm,decimalString } from './precision.js';
import{surfaceSlope}from'./slope.js';

export const IDENTITY_TRANSFORM: Transform = { position: { xMm: '0', yMm: '0', zMm: '0' }, rotationDeg: { x: '0', y: '0', z: '0' } };
export type Matrix4 = number[];
export function toRenderer(point: Point3): [number, number, number] {
  return [Number(point.xMm) / 1000, Number(point.zMm) / 1000, -Number(point.yMm) / 1000];
}
export function fromRenderer(point: readonly number[] | { x: number; y: number; z: number }): Point3 {
  const p = Array.isArray(point) ? point : [(point as { x: number }).x, (point as { y: number }).y, (point as { z: number }).z];
  if (p.length !== 3 || p.some(v => !Number.isFinite(v))) throw new Error('Ungültige Rendererkoordinate.');
  return { xMm: mm(p[0] * 1000), yMm: mm(-p[2] * 1000), zMm: mm(p[1] * 1000) };
}
/** Row-major storage, column vectors; Rz · Ry · Rx. */
export function transformMatrix(transform: Transform): Matrix4 {
  const { x, y, z } = transform.rotationDeg;
  const [rx, ry, rz] = [x, y, z].map(v => Number(v) * Math.PI / 180);
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry), Math.cos(rz), Math.sin(rz)];
  return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, Number(transform.position.xMm),
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, Number(transform.position.yMm),
    -sy, cy * sx, cy * cx, Number(transform.position.zMm), 0, 0, 0, 1];
}
export function multiplyMatrix(a: Matrix4, b: Matrix4): Matrix4 {
  return Array.from({ length: 16 }, (_, i) => Array.from({ length: 4 }, (_, k) => a[Math.floor(i / 4) * 4 + k] * b[k * 4 + i % 4]).reduce((s, v) => s + v, 0));
}
export function applyMatrix(point: Point3, m: Matrix4): Point3 {
  const p = [Number(point.xMm), Number(point.yMm), Number(point.zMm), 1];
  const out = [0, 1, 2].map(r => p.reduce((sum, v, k) => sum + m[r * 4 + k] * v, 0));
  return { xMm: mm(out[0]), yMm: mm(out[1]), zMm: mm(out[2]) };
}
export function inverseRigidMatrix(m:Matrix4):Matrix4{
  return[m[0],m[4],m[8],-(m[0]*m[3]+m[4]*m[7]+m[8]*m[11]),m[1],m[5],m[9],-(m[1]*m[3]+m[5]*m[7]+m[9]*m[11]),m[2],m[6],m[10],-(m[2]*m[3]+m[6]*m[7]+m[10]*m[11]),0,0,0,1];
}
export function matrixToTransform(m:Matrix4):Transform{
  const ry=Math.asin(Math.max(-1,Math.min(1,-m[8]))),cy=Math.cos(ry),rx=Math.abs(cy)>1e-8?Math.atan2(m[9],m[10]):Math.atan2(-m[6],m[5]),rz=Math.abs(cy)>1e-8?Math.atan2(m[4],m[0]):0;
  return{position:{xMm:mm(m[3]),yMm:mm(m[7]),zMm:mm(m[11])},rotationDeg:{x:decimalString(rx*180/Math.PI,8),y:decimalString(ry*180/Math.PI,8),z:decimalString(rz*180/Math.PI,8)}};
}
export function transformPoint(point: Point3, transform: Transform): Point3 { return applyMatrix(point, transformMatrix(transform)); }
/** A documented linear slope changes the host top plane; layer thickness is normal to the plane. */
export function surfaceMatrix(snapshot:DesignSnapshot,id:string|null):Matrix4{
  const matrix=worldMatrix(snapshot,id),slope=surfaceSlope(snapshot,id);if(!slope)return matrix;
  const{sx,sy,normal,originZMm}=slope;
  return multiplyMatrix(matrix,[1,0,normal[0],0,0,1,normal[1],0,sx,sy,normal[2],originZMm,0,0,0,1]);
}
export function worldMatrix(snapshot: DesignSnapshot, id: string | null, trail = new Set<string>()): Matrix4 {
  if (!id) return transformMatrix(IDENTITY_TRANSFORM);
  if (trail.has(id)) throw new Error(`Zyklischer Parent-Bezug: ${id}`);
  trail.add(id);
  const frame = snapshot.frames.find(f => f.id === id);
  const element = snapshot.elements.find(e => e.id === id);
  if (!frame && !element) throw new Error(`Fehlender Parent: ${id}`);
  const transform = frame?.transform ?? (element && 'transform' in element ? element.transform : IDENTITY_TRANSFORM);
  return multiplyMatrix(worldMatrix(snapshot, frame ? frame.parentFrameId : element!.parentId, trail), transformMatrix(transform));
}
export function worldPoint(snapshot: DesignSnapshot, elementId: string, localPoint: Point3 = { xMm: '0', yMm: '0', zMm: '0' }): Point3 {
  const element = snapshot.elements.find(e => e.id === elementId);
  if (!element) throw new Error(`Element ${elementId} existiert nicht.`);
  return element.kind === 'node' ? applyMatrix(element.point, worldMatrix(snapshot, element.parentId)) : applyMatrix(localPoint, worldMatrix(snapshot, elementId));
}
