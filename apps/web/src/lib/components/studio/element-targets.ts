import type {DesignElement} from '@schubert/contracts';

/** A dependent operation must never guess between several compatible objects. */
export function elementTargets(elements: readonly DesignElement[], kind: string): DesignElement[] {
  if (kind === 'opening') return elements.filter(element => element.kind === 'wall');
  if (kind === 'machining') return elements.filter(element => element.kind === 'stone_piece');
  if (kind === 'inscription' || kind === 'slope') {
    return elements.filter(element => element.kind === 'stone_piece' || element.kind === 'surface');
  }
  return [];
}

export function initialElementTarget(elements: readonly DesignElement[], kind: string, selectedId: string | null): string {
  const targets = elementTargets(elements, kind);
  if (targets.some(element => element.id === selectedId)) return selectedId!;
  return targets.length === 1 ? targets[0].id : '';
}
