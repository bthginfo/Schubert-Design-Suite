import {describe, expect, it} from 'vitest';
import {createDesign, IDENTITY_TRANSFORM, rectangleContour} from '@schubert/geometry';
import type {DesignElement} from '@schubert/contracts';
import {elementTargets, initialElementTarget} from './element-targets.ts';

const design = createDesign('memorial', {planningProjectId:'target-project', variantId:'target-variant'});
const stone = (id: string): DesignElement => ({id, label:id, parentId:design.frames[0].id, phase:'planned', locked:false, sourceEvidenceVersionIds:[], kind:'stone_piece', transform:IDENTITY_TRANSFORM, purpose:'memorial', finishedContour:rectangleContour('800','1200'), thicknessMeasureId:'thickness', materialSpecVersionId:'unassigned:material', stockItemId:null, grainDirectionDeg:null, edgeTreatments:[], machiningFeatureIds:[]});
const wall = (id: string): DesignElement => ({id, label:id, parentId:design.frames[0].id, phase:'planned', locked:false, sourceEvidenceVersionIds:[], kind:'wall', startNodeId:'start', endNodeId:'end', heightMeasureId:'height', coreThicknessMeasureId:'core', layers:[], joinStyle:'miter'});

describe('dependent planning target selection', () => {
  it('requires a deliberate choice between stones instead of placing text on the first one', () => {
    const stones = [stone('stele'), stone('sockel')];
    expect(initialElementTarget(stones, 'inscription', null)).toBe('');
    expect(initialElementTarget(stones, 'inscription', 'sockel')).toBe('sockel');
    expect(initialElementTarget(stones, 'inscription', 'unknown')).toBe('');
  });
  it('uses the only compatible target, including when an unrelated element was selected', () => {
    const elements = [stone('stele'), wall('wand')];
    expect(initialElementTarget(elements, 'inscription', 'wand')).toBe('stele');
    expect(initialElementTarget(elements, 'opening', 'stele')).toBe('wand');
  });
  it('does not offer surfaces for machining or stones for openings', () => {
    const surface: DesignElement = {id:'belag', label:'Belag', parentId:design.frames[0].id, phase:'planned', locked:false, sourceEvidenceVersionIds:[], kind:'surface', transform:IDENTITY_TRANSFORM, surfaceType:'floor', contour:rectangleContour('1000','1000'), layers:[], substrateVersionId:null, layingDirectionDeg:null, jointWidthMeasureId:'joint', movementJointElementIds:[]};
    expect(elementTargets([surface], 'inscription').map(element=>element.id)).toEqual(['belag']);
    expect(elementTargets([surface], 'machining')).toEqual([]);
    expect(initialElementTarget([stone('stele')], 'opening', null)).toBe('');
  });
  it('leaves several walls unselected until the user identifies the affected wall', () => {
    const walls = [wall('nord'), wall('sued')];
    expect(initialElementTarget(walls, 'opening', null)).toBe('');
    expect(initialElementTarget(walls, 'opening', 'sued')).toBe('sued');
  });
});
