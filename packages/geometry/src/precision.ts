import Decimal from 'decimal.js';
import type { Point2, Point3, Measure } from '@schubert/contracts';

export const GEOMETRY_ENGINE_VERSION = 'schubert-geometry/1.0.0';
export const PRECISION_MM = '0.01';
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const MAX_MM = new D('1000000000');
export function mm(value: Decimal.Value): string {
  const result = new D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (!result.isFinite() || result.abs().gt(MAX_MM)) throw new Error('Maß außerhalb des sicheren Bereichs (±1.000.000.000 mm).');
  return result.isZero() ? '0' : result.toFixed().replace(/\.?0+$/, m => m.startsWith('.') ? '' : m);
}
export function decimalString(value: Decimal.Value, precision = 8): string {
  const result = new D(value).toDecimalPlaces(precision);
  if (!result.isFinite()) throw new Error('Nicht endlicher Dezimalwert.');
  return result.isZero() ? '0' : result.toFixed();
}
export function parseMillimetres(value: string): string | null {
  const clean = value.trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(clean)) return null;
  try { return mm(clean); } catch { return null; }
}
export function distance(a: Point2, b: Point2): string {
  return decimalString(new D(a.xMm).minus(b.xMm).pow(2).plus(new D(a.yMm).minus(b.yMm).pow(2)).sqrt());
}
export function addPoint(a: Point3, b: Point3): Point3 {
  return { xMm: mm(new D(a.xMm).plus(b.xMm)), yMm: mm(new D(a.yMm).plus(b.yMm)), zMm: mm(new D(a.zMm).plus(b.zMm)) };
}
export function targetMeasure(valueMm: string | null = null, isEstimated = false): Measure {
  return { valueMm: valueMm === null ? null : mm(valueMm), semantic: 'design_target', reviewStatus: 'unreviewed', isEstimated,
    origin: 'manual', evidenceVersionId: null, sourceMeasureIds: [], derivedByKernelVersion: null,
    measurementMethod: null, measuredBy: null, measuredAt: null, tolerancePlusMm: null, toleranceMinusMm: null,
    confirmedBy: null, confirmedAt: null };
}
