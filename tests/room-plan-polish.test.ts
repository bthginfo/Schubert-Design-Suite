import { describe, expect, it } from 'vitest';
import { applyOperations, createDesign, innerCornerAllowance, projectDimensions, targetMeasure, withoutRepeatedWallAxes } from '@schubert/geometry';
import { planningDraftOperations } from '../packages/ai/src/planning-draft.js';

function room() {
  const snapshot = createDesign('room_plan');
  return applyOperations(snapshot, planningDraftOperations({ snapshot }, { kind: 'rectangular_room', label: 'Bad', clearWidthMm: '4000', clearDepthMm: '3000', heightMm: '2600', wallThicknessMm: '200' }));
}

describe('room plan polish', () => {
  it('shows each repeated wall-axis measure once, on the bottom and the left side', () => {
    const all = projectDimensions(room(), 'top'), axis = all.filter(d => d.label.endsWith('Wandachse'));
    expect(axis).toHaveLength(4);
    const shown = withoutRepeatedWallAxes(all), kept = shown.filter(d => d.label.endsWith('Wandachse'));
    expect(kept.map(d => d.valueMm).sort()).toEqual(['3200', '4200']);
    const minY = Math.min(...axis.map(d => Math.min(Number(d.a.yMm), Number(d.b.yMm)))), minX = Math.min(...axis.map(d => Math.min(Number(d.a.xMm), Number(d.b.xMm))));
    const horizontal = kept.find(d => d.a.yMm === d.b.yMm)!, vertical = kept.find(d => d.a.xMm === d.b.xMm)!;
    expect(Number(horizontal.a.yMm)).toBe(minY);
    expect(Number(vertical.a.xMm)).toBe(minX);
    // Clear interior measures are not wall axes and stay.
    expect(shown.filter(d => d.label.endsWith('Lichtes Innenmaß'))).toHaveLength(all.filter(d => d.label.endsWith('Lichtes Innenmaß')).length);
  });

  it('converts an opening offset to the inner corner with half the adjoining core thickness', () => {
    const snapshot = room(), wall = snapshot.elements.find(e => e.kind === 'wall')!;
    expect(innerCornerAllowance(snapshot, wall.id)).toBe(100);
    const thicker = applyOperations(snapshot, [{ type: 'set_design_target', measureId: (wall as any).coreThicknessMeasureId, valueMm: '240' }]);
    expect(innerCornerAllowance(thicker, wall.id)).toBe(120);
    // A free wall end has no inner corner.
    const free = applyOperations(createDesign('room_plan'), [
      { type: 'add_element', element: { id: 'a', label: 'A', parentId: 'root', phase: 'planned', locked: false, sourceEvidenceVersionIds: [], kind: 'node', point: { xMm: '0', yMm: '0', zMm: '0' } } },
      { type: 'add_element', element: { id: 'b', label: 'B', parentId: 'root', phase: 'planned', locked: false, sourceEvidenceVersionIds: [], kind: 'node', point: { xMm: '3000', yMm: '0', zMm: '0' } } },
      { type: 'add_element', element: { id: 'w', label: 'Wand', parentId: 'root', phase: 'planned', locked: false, sourceEvidenceVersionIds: [], kind: 'wall', startNodeId: 'a', endNodeId: 'b', heightMeasureId: 'h', coreThicknessMeasureId: 't', layers: [] }, measurements: { h: targetMeasure('2500'), t: targetMeasure('200') } },
    ]);
    expect(innerCornerAllowance(free, 'w')).toBeNull();
  });
});
