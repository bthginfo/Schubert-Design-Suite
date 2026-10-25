import {getContext, setContext} from 'svelte';
import {lengthUnits, type LengthUnit} from '@schubert/geometry';

const key = Symbol('schubert-planning-units');
export class PlanningUnits {
  unit = $state<LengthUnit>('mm');
  readonly choices = lengthUnits;
}
export function providePlanningUnits() {
  return setContext(key, new PlanningUnits());
}
export function usePlanningUnits(): PlanningUnits {
  return getContext<PlanningUnits>(key) ?? new PlanningUnits();
}
