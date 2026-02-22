export interface CoverPerimetral {
  ancho1: boolean;
  ancho2: boolean;
  largo1: boolean;
  largo2: boolean;
}

export type AlturaDisponible = "5a7" | "mas7";
export type FormaArea = "rectangular" | "L" | "multi-rect" | "poligono";
export type EstiloColocacion = "panos" | "trabado";

export interface LShapeConfig {
  anchoTotal: number;
  largoTotal: number;
  anchoBrazo: number;
  largoBrazo: number;
}

export interface TubePosition {
  position: number;
  isDouble: boolean;
}

export interface SubRectInput {
  ancho: number;
  largo: number;
}

export interface DeckInput {
  forma: FormaArea;
  ancho: number;
  largo: number;
  lShape?: LShapeConfig;
  subRects?: SubRectInput[];
  polygonVertices?: { x: number; y: number }[];
  polygonArea?: number;
  medidaTabla: "2.2" | "2.9";
  sentido: "horizontal" | "vertical";
  altura: AlturaDisponible;
  estiloColocacion: EstiloColocacion;
  coverPerimetral?: CoverPerimetral;
}

export interface DeckResult {
  superficieReal: number;
  superficieConDesperdicio: number;
  metrosLinealesAluminio: number;
  cantidadTubos: number;
  pilotines: number;
  clips: number;
  tornillos: number;
  mlCoverPerimetral: number;
  tubePositions: TubePosition[];
  tubeLength: number;
  pilotinPositions: { x: number; y: number }[];
  tubeDirection: "horizontal" | "vertical";
  separacionTubos: number;
  separacionPilotines: number;
  tipoAluminio: string;
  estiloColocacion: EstiloColocacion;
  boardLength: number;
  forma: FormaArea;
  lShape?: LShapeConfig;
}

/**
 * Calculate tube positions with double structure at board joints.
 * Boards joints occur at multiples of boardLength (paños) or boardLength/2 (trabado).
 * At each joint, two tubes are placed ~3cm apart (double structure).
 * Between joints, tubes are distributed proportionally with max spacing.
 */
const MIN_TUBE_DISTANCE = 0.15; // 15 cm min distance between any two tubes
const MAX_BOARD_OVERHANG = 0.06; // 6 cm max board overhang past last tube

function calculateTubePositionsWithJoints(
  spacingDimension: number,
  boardLength: number,
  estilo: EstiloColocacion,
  maxSpacing: number
): { positions: TubePosition[]; typicalSpacing: number } {
  const step = estilo === "trabado" ? boardLength / 2 : boardLength;

  // Calculate regular tube positions first
  const numSpaces = Math.ceil(spacingDimension / maxSpacing);
  const regularSpacing = spacingDimension / numSpaces;
  const regularPositions: number[] = [];
  for (let i = 0; i <= numSpaces; i++) {
    regularPositions.push(Math.round(i * regularSpacing * 1000) / 1000);
  }

  // Find board joints, filtering those too close (<15cm) to regular tubes
  const joints: number[] = [];
  for (let pos = step; pos < spacingDimension - 0.05; pos += step) {
    const roundedPos = Math.round(pos * 100) / 100;
    const tooClose = regularPositions.some(
      rp => Math.abs(rp - roundedPos) > 0 && Math.abs(rp - roundedPos) < MIN_TUBE_DISTANCE
    );
    if (!tooClose) {
      joints.push(roundedPos);
    }
  }

  const boundaries = [0, ...joints, spacingDimension];
  const positions: TubePosition[] = [];
  const DOUBLE_OFFSET = 0.015; // 1.5cm each side = 3cm apart

  // Add boundary tubes (edges = single, joints = double)
  for (const pos of boundaries) {
    if (joints.includes(pos)) {
      positions.push({ position: pos - DOUBLE_OFFSET, isDouble: true });
      positions.push({ position: pos + DOUBLE_OFFSET, isDouble: true });
    } else {
      positions.push({ position: pos, isDouble: false });
    }
  }

  // Add interior tubes within each segment (max spacing)
  let typicalSpacing = maxSpacing;
  for (let b = 0; b < boundaries.length - 1; b++) {
    const segStart = boundaries[b];
    const segEnd = boundaries[b + 1];
    const segLen = segEnd - segStart;

    if (segLen <= maxSpacing) {
      if (b === 0) typicalSpacing = segLen;
      continue;
    }

    const numSp = Math.ceil(segLen / maxSpacing);
    const spacing = segLen / numSp;
    if (b === 0) typicalSpacing = spacing;

    for (let i = 1; i < numSp; i++) {
      positions.push({ position: segStart + i * spacing, isDouble: false });
    }
  }

  // Fallback: if no joints, compute typical spacing from full dimension
  if (joints.length === 0) {
    const nSp = Math.ceil(spacingDimension / maxSpacing);
    typicalSpacing = spacingDimension / nSp;
  }

  positions.sort((a, b) => a.position - b.position);
  return { positions, typicalSpacing };
}

/**
 * Get the actual length of a tube at a given position.
 * For rectangular shapes, all tubes are the same length.
 * For L-shapes, tubes beyond the inner corner are shorter.
 */
function getTubeLengthAtPosition(
  position: number,
  forma: FormaArea,
  tubeDirection: "horizontal" | "vertical",
  ancho: number,
  largo: number,
  lShape?: LShapeConfig
): number {
  if (forma === "rectangular" || !lShape) {
    return tubeDirection === "vertical" ? largo : ancho;
  }

  if (tubeDirection === "vertical") {
    return position <= lShape.anchoBrazo + 0.001 ? lShape.largoTotal : lShape.largoBrazo;
  } else {
    return position <= lShape.largoBrazo + 0.001 ? lShape.anchoTotal : lShape.anchoBrazo;
  }
}

export function calculateDeckMultiRect(input: DeckInput): DeckResult {
  const rects = input.subRects || [];
  const results = rects.map((r) =>
    calculateDeck({ ...input, forma: "rectangular", ancho: r.ancho, largo: r.largo, subRects: undefined })
  );
  return {
    superficieReal: results.reduce((s, r) => s + r.superficieReal, 0),
    superficieConDesperdicio: Math.ceil(results.reduce((s, r) => s + r.superficieConDesperdicio, 0) * 100) / 100,
    metrosLinealesAluminio: Math.ceil(results.reduce((s, r) => s + r.metrosLinealesAluminio, 0) * 100) / 100,
    cantidadTubos: results.reduce((s, r) => s + r.cantidadTubos, 0),
    pilotines: results.reduce((s, r) => s + r.pilotines, 0),
    clips: results.reduce((s, r) => s + r.clips, 0),
    tornillos: results.reduce((s, r) => s + r.tornillos, 0),
    mlCoverPerimetral: Math.ceil(results.reduce((s, r) => s + r.mlCoverPerimetral, 0) * 100) / 100,
    tubePositions: results[0]?.tubePositions ?? [],
    tubeLength: results[0]?.tubeLength ?? 0,
    pilotinPositions: results[0]?.pilotinPositions ?? [],
    tubeDirection: results[0]?.tubeDirection ?? "vertical",
    separacionTubos: results[0]?.separacionTubos ?? 0,
    separacionPilotines: results[0]?.separacionPilotines ?? 0,
    tipoAluminio: results[0]?.tipoAluminio ?? "",
    estiloColocacion: input.estiloColocacion,
    boardLength: parseFloat(input.medidaTabla),
    forma: "multi-rect",
  };
}

export function calculateDeck(input: DeckInput): DeckResult {
  if (input.forma === "multi-rect" && input.subRects) {
    return calculateDeckMultiRect(input);
  }

  const isL = input.forma === "L" && input.lShape;
  const isPoly = input.forma === "poligono" && input.polygonArea;

  const ancho = isL ? input.lShape!.anchoTotal : input.ancho;
  const largo = isL ? input.lShape!.largoTotal : input.largo;

  // Surface
  let superficieReal: number;
  if (isL) {
    const ls = input.lShape!;
    superficieReal = ls.anchoTotal * ls.largoBrazo + ls.anchoBrazo * (ls.largoTotal - ls.largoBrazo);
  } else if (isPoly) {
    superficieReal = input.polygonArea!;
  } else {
    superficieReal = ancho * largo;
  }
  const superficieConDesperdicio = superficieReal * 1.10;

  // Tube direction perpendicular to boards
  const tubeDirection = input.sentido === "horizontal" ? "vertical" : "horizontal";
  const spacingDimension = tubeDirection === "vertical" ? ancho : largo;
  const boardLength = parseFloat(input.medidaTabla);

  // Tube positions with double structure at joints
  const maxTubeSpacing = 0.37;
  const { positions: tubePositions, typicalSpacing } = calculateTubePositionsWithJoints(
    spacingDimension, boardLength, input.estiloColocacion, maxTubeSpacing
  );

  const cantidadTubos = tubePositions.length;

  // ML: sum of individual tube lengths + perimeter frame
  let mlTubos = 0;
  for (const tube of tubePositions) {
    mlTubos += getTubeLengthAtPosition(tube.position, input.forma, tubeDirection, ancho, largo, input.lShape);
  }
  const metrosLinealesAluminio = Math.ceil(mlTubos * 100) / 100;

  // Pilotines: distributed along each tube's actual length
  const maxPilotinSpacing = input.altura === "mas7" ? 0.75 : 0.50;
  const pilotinPositions: { x: number; y: number }[] = [];
  let totalPilotines = 0;

  const processedDoubleGroups = new Set<number>();
  for (const tube of tubePositions) {
    // For double tubes, only process pilotines once per pair
    if (tube.isDouble) {
      // Group doubles within 5cm of each other (they're ~3cm apart)
      const groupKey = Math.round(tube.position * 20); // rounds to nearest 5cm
      if (processedDoubleGroups.has(groupKey)) continue;
      processedDoubleGroups.add(groupKey);
    }

    const tubeLen = getTubeLengthAtPosition(tube.position, input.forma, tubeDirection, ancho, largo, input.lShape);
    const numPilSpaces = Math.ceil(tubeLen / maxPilotinSpacing);
    const pilSpacing = tubeLen / numPilSpaces;

    for (let j = 0; j <= numPilSpaces; j++) {
      if (tubeDirection === "vertical") {
        pilotinPositions.push({ x: tube.position, y: j * pilSpacing });
      } else {
        pilotinPositions.push({ x: j * pilSpacing, y: tube.position });
      }
    }
    totalPilotines += numPilSpaces + 1;
  }

  // Clips & screws
  const clips = Math.ceil(superficieReal * 18);
  const tornillos = clips;

  // Cover perimetral
  const cover = input.coverPerimetral;
  let mlCoverPerimetral = 0;
  if (cover) {
    if (isL) {
      const ls = input.lShape!;
      mlCoverPerimetral =
        (cover.ancho1 ? ls.anchoTotal : 0) +
        (cover.ancho2 ? ls.anchoBrazo : 0) +
        (cover.largo1 ? ls.largoTotal : 0) +
        (cover.largo2 ? ls.largoBrazo : 0);
    } else {
      mlCoverPerimetral =
        (cover.ancho1 ? ancho : 0) +
        (cover.ancho2 ? ancho : 0) +
        (cover.largo1 ? largo : 0) +
        (cover.largo2 ? largo : 0);
    }
  }

  const tipoAluminio = input.altura === "mas7" ? "Aluminio 40×40" : "Aluminio 20×40";

  // Typical pilotin spacing for display
  const refTubeLen = tubeDirection === "vertical" ? largo : ancho;
  const numPilRef = Math.ceil(refTubeLen / maxPilotinSpacing);
  const typicalPilSpacing = refTubeLen / numPilRef;

  return {
    superficieReal,
    superficieConDesperdicio: Math.ceil(superficieConDesperdicio * 100) / 100,
    metrosLinealesAluminio,
    cantidadTubos,
    pilotines: totalPilotines,
    clips,
    tornillos,
    mlCoverPerimetral: Math.ceil(mlCoverPerimetral * 100) / 100,
    tubePositions,
    tubeLength: tubeDirection === "vertical" ? largo : ancho,
    pilotinPositions,
    tubeDirection,
    separacionTubos: Math.round(typicalSpacing * 100 * 100) / 100,
    separacionPilotines: Math.round(typicalPilSpacing * 100 * 100) / 100,
    tipoAluminio,
    estiloColocacion: input.estiloColocacion,
    boardLength,
    forma: input.forma,
    lShape: input.lShape,
  };
}
