import {D, mm} from './precision.js';

export const lengthUnits = ['mm', 'cm', 'm'] as const;
export type LengthUnit = typeof lengthUnits[number];
const factors = {mm: '1', cm: '10', m: '1000'} as const;

/** Presentation units never change the canonical millimetre model or its precision. */
export function parseLength(value: string, unit: LengthUnit = 'mm'): string | null {
  const match = value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/i);
  if (!match) return null;
  try {return mm(new D(match[1].replace(',', '.')).mul(factors[(match[2]?.toLowerCase() ?? unit) as LengthUnit]));}
  catch {return null;}
}

export function lengthInput(valueMm: string | null | undefined, unit: LengthUnit = 'mm'): string {
  if (valueMm === null || valueMm === undefined || valueMm === '') return '';
  try {return new D(valueMm).div(factors[unit]).toFixed().replace('.', ',');}
  catch {return '';}
}

export function lengthLabel(valueMm: string | number, unit: LengthUnit = 'mm'): string {
  return new Intl.NumberFormat('de-DE', {maximumFractionDigits: unit === 'm' ? 5 : unit === 'cm' ? 3 : 2})
    .format(new D(valueMm).div(factors[unit]).toNumber());
}
