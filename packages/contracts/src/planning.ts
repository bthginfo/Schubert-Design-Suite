import { z } from 'zod';

/** Canonical revision contract. Millimetres are decimal strings, never binary floats. */
export const idSchema = z.string().trim().min(1).max(200);
export const mmSchema = z.string().regex(/^-?(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, 'Millimeter als Dezimalstring mit höchstens zwei Nachkommastellen');
export const decimalAngleSchema = z.string().regex(/^-?(?:0|[1-9]\d{0,6})(?:\.\d{1,8})?$/);
export const point2Schema = z.strictObject({ xMm: mmSchema, yMm: mmSchema });
export const point3Schema = point2Schema.extend({ zMm: mmSchema });
export const rotationSchema = z.strictObject({ x: decimalAngleSchema, y: decimalAngleSchema, z: decimalAngleSchema });
export const transformSchema = z.strictObject({ position: point3Schema, rotationDeg: rotationSchema });
export const measureSchema = z.strictObject({
  valueMm: mmSchema.nullable(), semantic: z.enum(['design_target', 'as_built', 'catalog_nominal', 'derived']),
  reviewStatus: z.enum(['unreviewed', 'confirmed']), isEstimated: z.boolean(),
  origin: z.enum(['manual', 'survey', 'catalog', 'import', 'ai']), evidenceVersionId: idSchema.nullable(),
  sourceMeasureIds: z.array(idSchema).max(1000), derivedByKernelVersion: z.string().max(100).nullable(),
  measurementMethod: z.string().max(1000).nullable(), measuredBy: idSchema.nullable(), measuredAt: z.iso.datetime({ offset: true }).nullable(),
  tolerancePlusMm: mmSchema.nullable(), toleranceMinusMm: mmSchema.nullable(),
  confirmedBy: idSchema.nullable(), confirmedAt: z.iso.datetime({ offset: true }).nullable()
});
export const pathEdgeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('line'), from: point2Schema, to: point2Schema }),
  z.strictObject({ kind: z.literal('circular_arc'), from: point2Schema, to: point2Schema, center: point2Schema, clockwise: z.boolean() })
]);
const contourPartSchema=z.strictObject({outer:z.array(pathEdgeSchema).min(1).max(10000),holes:z.array(z.array(pathEdgeSchema).min(1).max(10000)).max(1000)});
export const contourImportSchema=z.strictObject({sourceDocumentVersionId:idSchema.optional(),sourceContentHash:z.string().regex(/^[a-f0-9]{64}$/),parserVersion:z.string().max(100),format:z.enum(['svg','dxf']),sourceEncoding:z.string().max(50).optional(),sourcePlaneZMm:mmSchema.optional(),sourceUnit:z.enum(['mm','cm','m','in']),unitConfirmed:z.literal(true),curveErrorBoundMm:mmSchema,coordinateQuantizationMm:z.literal('0.01'),approximated:z.boolean(),topologyRule:z.enum(['evenodd','nonzero']),sourceEntityIds:z.array(z.string().max(300)).max(10000),selectedPartIndex:z.number().int().min(0).max(1000).optional(),review:z.strictObject({evidenceVersionId:idSchema,confirmedBy:idSchema,confirmedAt:z.iso.datetime({offset:true}),acceptedErrorMm:mmSchema,statement:z.string().min(10).max(10000)}).optional()});
export const contourSchema=contourPartSchema.extend({islands:z.array(contourPartSchema).max(1000).optional(),importProvenance:contourImportSchema.optional()});
const base = {
  id: idSchema, label: z.string().min(1).max(500), parentId: idSchema.nullable(),
  phase: z.enum(['existing', 'demolition', 'planned']), locked: z.boolean(), sourceEvidenceVersionIds: z.array(idSchema).max(1000)
};
export const materialLayerSchema = z.strictObject({
  id: idSchema, materialSpecVersionId: idSchema, productVariantVersionId: idSchema.nullable(),
  thicknessMeasureId: idSchema, side: z.enum(['left', 'right', 'top', 'bottom'])
});
export const nodeElementSchema = z.strictObject({ ...base, kind: z.literal('node'), point: point3Schema });
export const wallElementSchema = z.strictObject({ ...base, kind: z.literal('wall'), startNodeId: idSchema, endNodeId: idSchema,
  heightMeasureId: idSchema, coreThicknessMeasureId: idSchema, layers: z.array(materialLayerSchema).max(100),joinStyle:z.enum(['miter','legacy_overlap']).optional() });
export const openingElementSchema = z.strictObject({ ...base, kind: z.literal('opening'), wallId: idSchema,
  openingType: z.enum(['door','window','recess','passage']), offsetAlongWallMeasureId: idSchema,
  widthMeasureId: idSchema, heightMeasureId: idSchema, sillHeightMeasureId: idSchema,
  hingeSide: z.enum(['left','right']).nullable(), openingDirection: z.enum(['inward','outward','sliding','none']),recessDepthMeasureId:idSchema.nullable().optional(),recessSide:z.enum(['left','right']).optional() });
export const roomElementSchema = z.strictObject({ ...base, kind: z.literal('room'), roomId: idSchema, floorId: idSchema,
  boundary: z.array(z.strictObject({ wallId: idSchema, side: z.enum(['left','right']) })).max(1000),
  floorLayers: z.array(materialLayerSchema).max(100), finishedFloorLevelMeasureId: idSchema });
export const stonePieceElementSchema = z.strictObject({ ...base, kind: z.literal('stone_piece'), transform: transformSchema,
  purpose: z.enum(['floor','wall','sill','step','countertop','memorial','other']), finishedContour: contourSchema,
  thicknessMeasureId: idSchema, materialSpecVersionId: idSchema, stockItemId: idSchema.nullable(), grainDirectionDeg: decimalAngleSchema.nullable(),
  edgeTreatments: z.array(z.strictObject({ edgeIndex: z.number().int().nonnegative(), treatmentVersionId: idSchema })).max(10000),
  machiningFeatureIds: z.array(idSchema).max(1000),finishSpecVersionId:idSchema.nullable().optional(),roughWidthMeasureId:idSchema.nullable().optional(),roughHeightMeasureId:idSchema.nullable().optional(),roughThicknessMeasureId:idSchema.nullable().optional() });
export const catalogElementSchema = z.strictObject({ ...base, kind: z.literal('catalog_object'), transform: transformSchema,
  productVariantVersionId: idSchema, assetVersionId: idSchema.nullable(), accuracy: z.enum(['verified_original','verified_envelope','approximate']),
  footprint: contourSchema, heightMeasureId: idSchema.optional(), connectionElementIds: z.array(idSchema).max(1000), clearanceElementIds: z.array(idSchema).max(1000) });
const previewFontSchema=z.enum(['notoserif','cinzel','lora','cormorantgaramond','greatvibes','montserrat']);
export const inscriptionElementSchema = z.strictObject({ ...base, kind: z.literal('inscription'), surfaceElementId: idSchema,
  previewFontKey:previewFontSchema.optional(),previewColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  originUV: z.strictObject({ uMm: mmSchema, vMm: mmSchema }), rotationDeg: decimalAngleSchema, exactText: z.string().max(30000),
  fontVariantVersionId: idSchema, referenceAssetVersionIds: z.array(idSchema).max(1000),
  renderingBasis: z.enum(['shop_image_reference','verified_contours','verified_3d']), requestedHeightMeasureId: idSchema,
  requestedLowercaseHeightMeasureId: idSchema.nullable(), requestedMaxWidthMeasureId: idSchema.nullable(), lineGapMeasureId: idSchema,
  supplyForm: z.enum(['individual_letters','wording','engraved','other']), materialSpecVersionId: idSchema.nullable(),
  materialArticleReference: z.string().max(500).nullable(), finishSpecVersionId: idSchema.nullable(), alignment: z.enum(['left','center','right']),
  glyphPlacements: z.array(z.strictObject({ glyphAssetVersionId: idSchema, codepointText: z.string().min(1).max(50),
    uMm: mmSchema, vMm: mmSchema, supplierProductVariantVersionId: idSchema.nullable() })).max(30000) });
export const groupElementSchema = z.strictObject({ ...base, kind: z.literal('group'), transform: transformSchema });
export const surfaceElementSchema = z.strictObject({ ...base, kind: z.literal('surface'), transform: transformSchema,
  surfaceType: z.enum(['floor','wall','ceiling','shower','inscription']), contour: contourSchema, layers: z.array(materialLayerSchema).max(100),
  substrateVersionId: idSchema.nullable(), layingDirectionDeg: decimalAngleSchema.nullable(), jointWidthMeasureId: idSchema.nullable(),
  movementJointElementIds: z.array(idSchema).max(1000),ruleVersionId:idSchema.nullable().optional() });
export const machiningElementSchema = z.strictObject({ ...base, kind: z.literal('machining'), hostElementId: idSchema,
  machiningType: z.enum(['cutout','borehole','groove','drip_edge','miter']), contour: contourSchema,
  depthMeasureId: idSchema.nullable(), minimumWebMeasureId: idSchema.nullable(), confirmedFasteningAssetVersionId: idSchema.nullable(),
  face:z.enum(['front','back']).optional(),miter:z.strictObject({edgeIndex:z.number().int().nonnegative(),angleDeg:decimalAngleSchema}).optional() });
export const connectionElementSchema = z.strictObject({ ...base, kind: z.literal('connection'), transform: transformSchema,
  connectionType: z.enum(['water','waste','electric','fastening','joint','other']), specificationVersionId: idSchema.nullable(),
  diameterMeasureId: idSchema.nullable(), hostElementId: idSchema.nullable() });
export const clearanceElementSchema = z.strictObject({ ...base, kind: z.literal('clearance'), transform: transformSchema,
  contour: contourSchema, heightMeasureId: idSchema.nullable(), hostElementId: idSchema.nullable(), ruleVersionId: idSchema.nullable() });
export const slopeElementSchema = z.strictObject({ ...base, kind: z.literal('slope'), hostElementId: idSchema,
  start: point3Schema, end: point3Schema, riseMeasureId: idSchema, runMeasureId: idSchema, ruleVersionId: idSchema.nullable() });
export const noteElementSchema = z.strictObject({ ...base, kind: z.literal('technical_note'), point: point3Schema,
  text: z.string().max(10000), category: z.enum(['information','approval_required','installation','source']), ruleVersionId: idSchema.nullable() });
export const graveBorderElementSchema = z.strictObject({ ...base, kind: z.literal('grave_border'), transform: transformSchema,
  contour: contourSchema, widthMeasureId: idSchema, heightMeasureId: idSchema, materialSpecVersionId: idSchema });
export const dimensionElementSchema = z.strictObject({ ...base, kind: z.literal('dimension'),
  refs: z.array(z.strictObject({ elementId: idSchema, feature: z.string().max(200) })).min(1).max(20),
  measureId: idSchema, mode: z.enum(['driving','reference']), offsetMm: mmSchema });
export const sourcePointSchema=z.strictObject({xPx:mmSchema,yPx:mmSchema});
export const planCalibrationSchema=z.strictObject({
  segments:z.array(z.strictObject({axis:z.enum(['x','y','control']),a:sourcePointSchema,b:sourcePointSchema,lengthMeasureId:idSchema})).max(3),
  toleranceMm:mmSchema,orthogonalAxesDeclared:z.boolean(),reviewStatus:z.literal('unreviewed')
});
export const planReferenceElementSchema=z.strictObject({...base,kind:z.literal('plan_reference'),transform:transformSchema,
  sourceDocumentId:idSchema,sourceDocumentVersionId:idSchema,sourceHash:z.string().regex(/^[a-f0-9]{64}$/),previewDocumentId:idSchema.nullable(),previewDocumentVersionId:idSchema.nullable(),previewHash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  pageIndex:z.number().int().nonnegative().max(9999),widthPx:z.number().int().positive().max(50000),heightPx:z.number().int().positive().max(50000),
  sourceKind:z.enum(['pdf_plan','scan','sketch','room_photo']),calibration:planCalibrationSchema,opacity:z.number().min(0).max(1)
});
export const designElementSchema = z.discriminatedUnion('kind', [nodeElementSchema, wallElementSchema, openingElementSchema,
  roomElementSchema, stonePieceElementSchema, catalogElementSchema, inscriptionElementSchema, groupElementSchema, surfaceElementSchema,
  machiningElementSchema, connectionElementSchema, clearanceElementSchema, slopeElementSchema, noteElementSchema, graveBorderElementSchema, dimensionElementSchema,planReferenceElementSchema]);
export const constraintSchema = z.strictObject({ id: idSchema,
  kind: z.enum(['coincident','horizontal','vertical','parallel','perpendicular','distance','centered','fixed','minimum_clearance']),
  refs: z.array(z.strictObject({ elementId: idSchema, feature: z.string().min(1).max(200) })).min(1).max(100),
  measureId: idSchema.nullable(), ruleVersionId: idSchema.nullable() });
export const assetManifestEntrySchema = z.strictObject({ assetVersionId: idSchema, contentHash: z.string().min(1).max(200),
  purpose: z.enum(['image_reference','outline','mesh','texture','technical_document']), rightsVerified: z.boolean(), geometryVerified: z.boolean() });
export const frameSchema = z.strictObject({ id: idSchema, parentFrameId: idSchema.nullable(), sourceObjectId: idSchema.nullable(),
  transform: transformSchema, datumLabel: z.string().min(1).max(500) });
export const designSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1), geometryEngineVersion: z.string().min(1).max(100), planningProjectId: idSchema, variantId: idSchema,
  revisionId: idSchema, parentRevisionId: idSchema.nullable(), kind: z.enum(['memorial','room_plan']), unit: z.literal('mm'),
  precisionMm: z.literal('0.01'), coordinateSystem: z.literal('right_handed_z_up'), frames: z.array(frameSchema).min(1).max(1000),
  elements: z.array(designElementSchema).max(30000), measurements: z.record(idSchema, measureSchema),
  constraints: z.array(constraintSchema).max(30000), assetManifest: z.array(assetManifestEntrySchema).max(30000)
});
const addFields = { element: designElementSchema, measurements: z.record(idSchema, measureSchema).optional() };
export const designOperationSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('add_element'), ...addFields }),
  z.strictObject({ type: z.literal('add_opening'), element: openingElementSchema, measurements: z.record(idSchema, measureSchema).optional() }),
  z.strictObject({type:z.literal('set_plan_calibration'),elementId:idSchema,calibration:planCalibrationSchema,opacity:z.number().min(0).max(1),measurements:z.record(idSchema,measureSchema).optional()}),
  z.strictObject({ type: z.literal('remove_element'), elementId: idSchema, cascade: z.boolean().optional() }),
  z.strictObject({ type: z.literal('move_element'), elementId: idSchema, delta: point3Schema }),
  z.strictObject({ type: z.literal('set_element_position'), elementId: idSchema, position: point3Schema }),
  z.strictObject({ type: z.literal('rotate_element'), elementId: idSchema, rotationDeg: rotationSchema }),
  z.strictObject({ type: z.literal('duplicate_element'), elementId: idSchema, newId: idSchema, offset: point3Schema }),
  z.strictObject({ type: z.literal('set_element_lock'), elementId: idSchema, locked: z.boolean() }),
  z.strictObject({ type: z.literal('rename_element'), elementId: idSchema, label: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal('set_element_phase'), elementId: idSchema, phase: z.enum(['existing','demolition','planned']) }),
  z.strictObject({type:z.literal('set_element_sources'),elementId:idSchema,sourceEvidenceVersionIds:z.array(idSchema).max(1000)}),
  z.strictObject({ type: z.literal('reparent_element'), elementId: idSchema, parentId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('set_design_target'), measureId: idSchema, valueMm: mmSchema.nullable(), isEstimated: z.boolean().optional(), confirm: z.boolean().optional() }),
  z.strictObject({ type: z.literal('confirm_design_target'), measureId: idSchema, confirmedBy: idSchema, confirmedAt: z.iso.datetime({ offset: true }) }),
  z.strictObject({ type: z.literal('bind_measurement'), elementId: idSchema, field: z.enum(['measureId','heightMeasureId','widthMeasureId','thicknessMeasureId','coreThicknessMeasureId','offsetAlongWallMeasureId','sillHeightMeasureId','finishedFloorLevelMeasureId','requestedHeightMeasureId','requestedLowercaseHeightMeasureId','requestedMaxWidthMeasureId','lineGapMeasureId','jointWidthMeasureId','depthMeasureId','minimumWebMeasureId','recessDepthMeasureId','diameterMeasureId','riseMeasureId','runMeasureId','roughWidthMeasureId','roughHeightMeasureId','roughThicknessMeasureId']), measureId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('record_survey_measurement'), measureId: idSchema, valueMm: mmSchema, evidenceVersionId: idSchema,
    measurementMethod: z.string().min(1).max(1000), measuredBy: idSchema, measuredAt: z.iso.datetime({ offset: true }), tolerancePlusMm: mmSchema, toleranceMinusMm: mmSchema }),
  z.strictObject({ type: z.literal('confirm_survey_measurement'), measureId: idSchema, confirmedBy: idSchema, confirmedAt: z.iso.datetime({ offset: true }) }),
  z.strictObject({ type: z.literal('replace_product_variant'), elementId: idSchema, productVariantVersionId: idSchema,
    assetVersionId: idSchema.nullable(), accuracy: catalogElementSchema.shape.accuracy, footprint: contourSchema }),
  z.strictObject({ type: z.literal('set_inscription_text'), elementId: idSchema, exactText: z.string().max(30000) }),
  z.strictObject({ type: z.literal('correct_existing_inscription'), elementId: idSchema, exactText: z.string().max(30000), reason: z.string().min(10).max(2000), evidenceVersionId: idSchema }),
  z.strictObject({ type: z.literal('set_inscription_originals'), elementId:idSchema, glyphPlacements:inscriptionElementSchema.shape.glyphPlacements, evidenceVersionId:idSchema }),
  z.strictObject({ type: z.literal('set_inscription_layout'), elementId: idSchema,
    previewFontKey:previewFontSchema.optional(),previewColor:inscriptionElementSchema.shape.previewColor,
    originUV: inscriptionElementSchema.shape.originUV.optional(), rotationDeg: decimalAngleSchema.optional(), alignment: inscriptionElementSchema.shape.alignment.optional(),
    fontVariantVersionId: idSchema.optional(), referenceAssetVersionIds: z.array(idSchema).optional(), renderingBasis: inscriptionElementSchema.shape.renderingBasis.optional(),
    requestedHeightMeasureId: idSchema.optional(), requestedLowercaseHeightMeasureId: idSchema.nullable().optional(), requestedMaxWidthMeasureId: idSchema.nullable().optional(),
    lineGapMeasureId: idSchema.optional(), supplyForm: inscriptionElementSchema.shape.supplyForm.optional(), materialSpecVersionId: idSchema.nullable().optional(),
    materialArticleReference: inscriptionElementSchema.shape.materialArticleReference.optional(), finishSpecVersionId: idSchema.nullable().optional(), glyphPlacements: inscriptionElementSchema.shape.glyphPlacements.optional() }),
  z.strictObject({ type: z.literal('set_stone_spec'), elementId: idSchema, finishedContour: contourSchema.optional(), thicknessMeasureId: idSchema.optional(),
    materialSpecVersionId: idSchema.optional(), stockItemId: idSchema.nullable().optional(), grainDirectionDeg: decimalAngleSchema.nullable().optional(),
    edgeTreatments: stonePieceElementSchema.shape.edgeTreatments.optional(), machiningFeatureIds: z.array(idSchema).optional(),purpose:stonePieceElementSchema.shape.purpose.optional(),finishSpecVersionId:idSchema.nullable().optional(),roughWidthMeasureId:idSchema.nullable().optional(),roughHeightMeasureId:idSchema.nullable().optional(),roughThicknessMeasureId:idSchema.nullable().optional() }),
  z.strictObject({ type: z.literal('set_wall'), elementId: idSchema, startNodeId:idSchema.optional(),endNodeId:idSchema.optional(),heightMeasureId: idSchema.optional(), coreThicknessMeasureId: idSchema.optional(), layers: z.array(materialLayerSchema).optional(),joinStyle:wallElementSchema.shape.joinStyle }),
  z.strictObject({ type: z.literal('set_opening'), elementId: idSchema,wallId:idSchema.optional(), openingType: openingElementSchema.shape.openingType.optional(), hingeSide: openingElementSchema.shape.hingeSide.optional(), openingDirection: openingElementSchema.shape.openingDirection.optional(),recessDepthMeasureId:idSchema.nullable().optional(),recessSide:openingElementSchema.shape.recessSide }),
  z.strictObject({ type: z.literal('set_surface_spec'), elementId: idSchema, layers: z.array(materialLayerSchema).optional(), substrateVersionId: idSchema.nullable().optional(), layingDirectionDeg: decimalAngleSchema.nullable().optional(), jointWidthMeasureId: idSchema.nullable().optional(),surfaceType:surfaceElementSchema.shape.surfaceType.optional(),movementJointElementIds:z.array(idSchema).max(1000).optional(),ruleVersionId:idSchema.nullable().optional() }),
  z.strictObject({type:z.literal('set_machining_spec'),elementId:idSchema,machiningType:machiningElementSchema.shape.machiningType.optional(),depthMeasureId:idSchema.nullable().optional(),minimumWebMeasureId:idSchema.nullable().optional(),confirmedFasteningAssetVersionId:idSchema.nullable().optional(),face:machiningElementSchema.shape.face,miter:machiningElementSchema.shape.miter}),
  z.strictObject({ type: z.literal('set_contour'), elementId: idSchema, contour: contourSchema }),
  z.strictObject({type:z.literal('confirm_contour_import'),elementId:idSchema,evidenceVersionId:idSchema,acceptedErrorMm:mmSchema,statement:z.string().min(10).max(10000),confirmedBy:idSchema.optional(),confirmedAt:z.iso.datetime({offset:true}).optional()}),
  z.strictObject({ type: z.literal('set_technical_note'), elementId: idSchema, text: z.string().max(10000), category: noteElementSchema.shape.category, ruleVersionId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('set_connection_spec'), elementId: idSchema, connectionType: connectionElementSchema.shape.connectionType, specificationVersionId: idSchema.nullable(), hostElementId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('set_room_spec'), elementId: idSchema, roomId: idSchema.optional(), floorId: idSchema.optional(), floorLayers: z.array(materialLayerSchema).optional(),boundary:roomElementSchema.shape.boundary.optional() }),
  z.strictObject({ type: z.literal('set_grave_border_spec'), elementId: idSchema, materialSpecVersionId: idSchema }),
  z.strictObject({ type: z.literal('set_clearance_spec'), elementId: idSchema, hostElementId: idSchema.nullable(), ruleVersionId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('set_slope_spec'), elementId: idSchema, hostElementId:idSchema.optional(), start: point3Schema.optional(), end: point3Schema.optional(), ruleVersionId: idSchema.nullable().optional() }),
  z.strictObject({ type: z.literal('split_wall'), elementId: idSchema, newNodeId: idSchema, newWallId: idSchema, distanceMm: mmSchema }),
  z.strictObject({type:z.literal('move_selection'),elementIds:z.array(idSchema).min(1).max(500),deltaWorld:point3Schema}),
  z.strictObject({ type: z.literal('add_constraint'), constraint: constraintSchema,measurements:z.record(idSchema,measureSchema).optional() }),
  z.strictObject({ type: z.literal('remove_constraint'), constraintId: idSchema }),
  z.strictObject({ type: z.literal('add_asset_reference'), entry: assetManifestEntrySchema }),
  z.strictObject({ type: z.literal('add_frame'), frame: frameSchema })
]);
export type Mm = z.infer<typeof mmSchema>;
export type Point2 = z.infer<typeof point2Schema>;
export type Point3 = z.infer<typeof point3Schema>;
export type Transform = z.infer<typeof transformSchema>;
export type Measure = z.infer<typeof measureSchema>;
export type PathEdge = z.infer<typeof pathEdgeSchema>;
export type Contour = z.infer<typeof contourSchema>;
export type DesignElement = z.infer<typeof designElementSchema>;
export type DesignSnapshot = z.infer<typeof designSnapshotSchema>;
export type DesignOperation = z.infer<typeof designOperationSchema>;
export type InscriptionElement = z.infer<typeof inscriptionElementSchema>;
export type StonePieceElement = z.infer<typeof stonePieceElementSchema>;
export type WallElement = z.infer<typeof wallElementSchema>;
export type OpeningElement = z.infer<typeof openingElementSchema>;
