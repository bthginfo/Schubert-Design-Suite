import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { DesignOperation, DesignSnapshot } from '@schubert/contracts';
import { applyOperations, createDesign, rectangleContour, restingConstraint, restingPosition, targetMeasure } from '@schubert/geometry';
import { createPlanningPdf, reviewPlanningPdf } from '../packages/documents/src/planning.js';
import { loadPreviewFont } from '../packages/documents/src/planning-lettering.js';

const fontFile = new URL('../apps/web/static/planning-fonts/cormorantgaramond.ttf', import.meta.url);
const material = '0b9c2c55-6f1a-4c55-9d1d-0d5c7e0f0a11';

function stone(id: string, label: string, w: string, h: string, t: string, purpose: 'memorial' | 'base'): DesignOperation[] {
  const common = { parentId: 'root', phase: 'planned' as const, locked: false, sourceEvidenceVersionIds: [] };
  return [
    { type: 'add_element', element: { ...common, id, label, kind: 'stone_piece', purpose, transform: { position: { xMm: '0', yMm: '0', zMm: '0' }, rotationDeg: { x: '90', y: '0', z: '0' } },
      finishedContour: rectangleContour(w, h), thicknessMeasureId: id + ':t', materialSpecVersionId: purpose === 'memorial' ? material : 'unassigned:material', stockItemId: null, grainDirectionDeg: null, edgeTreatments: [], machiningFeatureIds: [] },
      measurements: { [id + ':t']: targetMeasure(t), [id + ':w']: targetMeasure(w), [id + ':h']: targetMeasure(h) } },
    ...(['w', 'h'] as const).map(key => ({ type: 'add_element' as const, element: { ...common, id: `${id}:dim:${key}`, label: `${label} · ${key === 'w' ? 'Breite' : 'Höhe'}`, kind: 'dimension' as const,
      refs: [{ elementId: id, feature: key === 'w' ? 'width' : 'height' }], measureId: `${id}:${key}`, mode: 'driving' as const, offsetMm: '30' } })),
  ];
}

/** A 600 stele (160 deep) centred on a 700 Sockel (180 deep): both width measures sit 10 mm apart in the top view. */
function memorial(): DesignSnapshot {
  let s = applyOperations(createDesign('memorial'), [...stone('base', 'Sockel', '700', '200', '180', 'base'), ...stone('stele', 'Stele', '600', '900', '160', 'memorial')]);
  s = applyOperations(s, [{ type: 'set_element_position', elementId: 'stele', position: restingPosition(s, 'stele', 'base')! }, restingConstraint('stele', 'base', 'stack:test')]);
  return applyOperations(s, [{ type: 'add_element', element: { id: 'text', label: 'Inschrift', parentId: 'root', phase: 'planned', locked: false, sourceEvidenceVersionIds: [], kind: 'inscription', surfaceElementId: 'stele',
    previewFontKey: 'cormorantgaramond', previewColor: '#c6a56d', originUV: { uMm: '300', vMm: '600' }, rotationDeg: '0', exactText: 'MARIA MUSTER\n1950 – 2025', fontVariantVersionId: 'unassigned:font',
    referenceAssetVersionIds: [], renderingBasis: 'shop_image_reference', requestedHeightMeasureId: 'text:h', requestedLowercaseHeightMeasureId: null, requestedMaxWidthMeasureId: null, lineGapMeasureId: 'text:gap',
    supplyForm: 'engraved', materialSpecVersionId: null, materialArticleReference: null, finishSpecVersionId: null, alignment: 'center', glyphPlacements: [] },
    measurements: { 'text:h': targetMeasure('40'), 'text:gap': targetMeasure('12') } }]);
}
const meta = { title: 'Grabmal Muster', revision: '3', status: 'draft', materials: { [material]: { name: 'Belgisch Granit' } } };
const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

describe('planning PDF output', () => {
  it('keeps the 600 and 700 width texts of a stele on its Sockel apart in every view', async () => {
    const review = await reviewPlanningPdf(memorial(), meta);
    for (const view of review.views) {
      const labels = view.labels;
      expect(labels.filter(label => label.state === 'review')).toEqual([]);
      for (const [i, a] of labels.entries()) for (const b of labels.slice(i + 1)) expect(overlap(a.box, b.box), `${view.id}: ${a.text} / ${b.text}`).toBe(false);
    }
    const top = review.views.find(view => view.id === 'top')!;
    expect(top.labels.map(label => label.text)).toEqual(expect.arrayContaining(['600', '700']));
  });

  it('adds a customer variant without check list and parts list, and keeps the internal one complete', async () => {
    const internal = await PDFDocument.load(await createPlanningPdf(memorial(), meta));
    const customer = await PDFDocument.load(await createPlanningPdf(memorial(), { ...meta, audience: 'customer' }));
    expect(internal.getTitle()).toBe('Grabmal Muster');
    expect(customer.getTitle()).toBe('Entwurf zur Abstimmung · Grabmal Muster');
    expect(customer.getSubject()).toBe('Planrevision 3 · Entwurf zur Abstimmung');
    // Three views + inscription page for the customer; internal adds parts list and check list.
    expect(customer.getPageCount()).toBe(4);
    expect(internal.getPageCount()).toBe(6);
  });

  it.skipIf(!existsSync(fontFile))('loads only the hash-verified licensed preview font', async () => {
    const font = await loadPreviewFont('cormorantgaramond');
    expect(font?.label).toBe('Cormorant Garamond');
    expect(font?.font.layout('MARIA').advanceWidth).toBeGreaterThan(0);
    expect(await loadPreviewFont('unknown-font')).toBeNull();
  });
});
