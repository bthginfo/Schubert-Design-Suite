type Point = { x: number; y: number };
export type SheetLine = { start: Point; end: Point };
export type SheetBox = { x: number; y: number; width: number; height: number };
export type SheetLabel = Point & { id: string; description: string; text: string; width: number; size: number; anchor?: Point };
export type PlacedSheetLabel = SheetLabel & { box: SheetBox; state: 'clear' | 'adjusted' | 'review'; leader?: SheetLine };

function intersects(a: SheetBox, b: SheetBox) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

function segmentIntersects(box: SheetBox, { start, end }: SheetLine) {
  let first = 0;
  let last = 1;
  for (const axis of ['x', 'y'] as const) {
    const low = box[axis];
    const high = low + (axis === 'x' ? box.width : box.height);
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-7) {
      if (start[axis] < low || start[axis] > high) return false;
      continue;
    }
    const a = (low - start[axis]) / delta;
    const b = (high - start[axis]) / delta;
    first = Math.max(first, Math.min(a, b));
    last = Math.min(last, Math.max(a, b));
    if (first > last) return false;
  }
  return true;
}

const steps = [0, -8, 8, -16, 16, -28, 28, -44, 44, -64, 64];
const offsets = steps.flatMap(x => steps.map(y => ({ x, y })))
  .sort((a, b) => a.x ** 2 + a.y ** 2 - b.x ** 2 - b.y ** 2);

function boxAt(label: SheetLabel, x: number, y: number): SheetBox {
  return { x: x - 2, y: y - 2, width: label.width + 4, height: label.size + 4 };
}

/** Label positions are in printed points, shared by the preview and PDF. */
export function placeSheetLabels(
  labels: SheetLabel[],
  lines: SheetLine[],
  markers: SheetBox[],
  safe: SheetBox,
): PlacedSheetLabel[] {
  const occupied = [...markers];
  const strokes = [...lines];
  return labels.map(label => {
    for (const offset of offsets) {
      const x = label.x + offset.x;
      const y = label.y + offset.y;
      const box = boxAt(label, x, y);
      if (box.x < safe.x || box.x + box.width > safe.x + safe.width ||
        box.y < safe.y || box.y + box.height > safe.y + safe.height ||
        occupied.some(other => intersects(box, other)) ||
        strokes.some(line => segmentIntersects(box, line))) continue;
      const state = offset.x || offset.y ? 'adjusted' : 'clear';
      const original = label.anchor ?? { x: label.x + label.width / 2, y: label.y + label.size / 2 };
      const leader = Math.hypot(offset.x, offset.y) >= 16
        ? { start: original, end: {
          x: Math.max(box.x, Math.min(box.x + box.width, original.x)),
          y: Math.max(box.y, Math.min(box.y + box.height, original.y)),
        } } : undefined;
      if (leader && occupied.some(other => segmentIntersects(other, leader))) continue;
      occupied.push(box);
      if (leader) strokes.push(leader);
      return { ...label, x, y, box, state, leader };
    }
    const box = boxAt(label, label.x, label.y);
    occupied.push(box);
    return { ...label, box, state: 'review' };
  });
}
