import { describe, expect, it } from 'vitest';
import { placeSheetLabels, type SheetLabel } from '../packages/documents/src/planning-dimensions.js';

const measure: SheetLabel = {
  id: 'top-1', description: 'Linke Wandachse', text: '3.580 · Achse',
  x: 40, y: 78, width: 39, size: 8, anchor: { x: 90, y: 75 },
};

describe('printed measure label placement', () => {
  it('moves a wall-axis label away from the outside dimension and preserves its value', () => {
    const [placed] = placeSheetLabels([measure],
      [{ start: { x: 65, y: 0 }, end: { x: 65, y: 180 } }], [],
      { x: 0, y: 0, width: 180, height: 180 });

    expect(placed.state).toBe('adjusted');
    expect(placed.text).toBe(measure.text);
    expect(placed.box.x > 65 || placed.box.x + placed.box.width < 65).toBe(true);
    expect(placed.leader?.start).toEqual(measure.anchor);
  });

  it('marks a label for review when the printed area cannot make room for it', () => {
    const [placed] = placeSheetLabels([measure], [], [], { x: 35, y: 76, width: 30, height: 14 });

    expect(placed.state).toBe('review');
    expect(placed.text).toBe(measure.text);
    expect(placed.box.width).toBeGreaterThan(30);
  });
});
