export type BoardDir = "horizontal" | "vertical";
export type BoardLen = 2.2 | 2.9;
export type ShapeMode = "rectangle" | "multi-rect" | "croquis";


export interface SubRect {
  id: string;
  largo: number;
  ancho: number;
}

export interface AvzCalcResult {
  m2Netos: number;
  m2Compra: number;
  tablasUn: number;
  vigasMl: number;
  cantVigas: number;
  sepVigas: number;
  clips: number;
  filasTablas: number;
  pilotines: number;
  boardJoints: number[];
  doubleBeamCount: number;
}

/* ─── Engineering constraints ─── */
const MAX_VOLADIZO = 0.06; // 6 cm max board overhang past last beam
const MIN_BEAM_DISTANCE = 0.20; // 20 cm min distance between any two beams (does NOT apply within a double-beam pair)
const MAX_PILOTINE_SPACING = 0.40; // 40 cm max between pilotines along a beam

/* ─── Optimization: 35–40 cm beam spacing, with ≤6cm voladizo, min 15cm between beams ─── */
export function optimizeBeamSpacing(dist: number): { count: number; spacing: number } {
  // Try to use fewest beams possible with spacing between 35-40 cm
  // No two beams closer than 15cm
  const nMax = Math.ceil(dist / 0.35);
  const spacingMax = dist / nMax;
  const nLess = nMax - 1;
  if (nLess >= 1) {
    const spacingLess = dist / nLess;
    if (spacingLess <= 0.40 && spacingLess >= MIN_BEAM_DISTANCE) {
      return { count: nLess + 1, spacing: spacingLess };
    }
  }
  if (spacingMax >= MIN_BEAM_DISTANCE) {
    return { count: nMax + 1, spacing: spacingMax };
  }
  // Fallback: ensure minimum distance
  const n = Math.max(1, Math.floor(dist / MIN_BEAM_DISTANCE));
  return { count: n + 1, spacing: dist / n };
}

/* ─── Calculate pilotines for a beam, max 40cm spacing ─── */
export function pilotinesForBeam(beamLength: number): number {
  if (beamLength <= 0) return 0;
  return Math.max(2, Math.ceil(beamLength / MAX_PILOTINE_SPACING) + 1);
}

/* ─── Rectangle calculation ─── */
export function calculateRect(
  largo: number,
  ancho: number,
  dir: BoardDir,
  boardLen: BoardLen
): AvzCalcResult {
  const BOARD_W = 0.15;
  const m2Netos = largo * ancho;
  const m2Compra = Math.ceil(m2Netos * 1.10 * 100) / 100;

  // Beams: spaced along beamRunDim, each beam spans beamLength
  const beamRunDim = dir === "horizontal" ? largo : ancho;
  const beamLength = dir === "horizontal" ? ancho : largo;
  const { count: cantVigasRaw, spacing: sepVigas } = optimizeBeamSpacing(beamRunDim);

  // Board rows
  const stackDim = dir === "horizontal" ? largo : ancho;
  const filasTablas = Math.ceil(stackDim / BOARD_W);

  // Pieces per row
  const boardDim = dir === "horizontal" ? ancho : largo;
  const piecesPerRow = Math.ceil(boardDim / boardLen);
  const tablasUn = filasTablas * piecesPerRow;

  // Board joints are MANDATORY — double beams go here
  // Regular beams that are too close (<20cm) to a joint get removed instead
  const boardJoints: number[] = [];
  for (let p = boardLen; p < boardDim - 0.05; p += boardLen) {
    boardJoints.push(Math.round(p * 100) / 100);
  }

  // Filter regular beam count: remove beams too close to joints
  const spacingM = sepVigas / 100;
  const regularBeamPositions = Array.from({ length: cantVigasRaw }, (_, i) => Math.round(i * spacingM * 100) / 100);
  const filteredRegularBeams = regularBeamPositions.filter(bp =>
    !boardJoints.some(jp => Math.abs(bp - jp) > 0 && Math.abs(bp - jp) < MIN_BEAM_DISTANCE)
  );
  const cantVigas = filteredRegularBeams.length;

  // Total beams = filtered regular + 2 per joint (double)
  const totalBeams = cantVigas + boardJoints.length * 2;
  const vigasMl = Math.ceil(totalBeams * beamLength * 100) / 100;

  // Clips: 1 per beam×row intersection + 10%
  const rawClips = totalBeams * filasTablas;
  const clips = Math.ceil(rawClips * 1.10);

  // Pilotines: max 40cm spacing along each beam
  const pilotinesPerBeam = pilotinesForBeam(beamLength);
  // Regular beams get pilotines; double beams at joints share pilotines (count once)
  const sharedJointPilotines = boardJoints.length > 0
    ? boardJoints.length * pilotinesForBeam(beamLength)
    : 0;
  const pilotines = cantVigas * pilotinesPerBeam + sharedJointPilotines;

  return {
    m2Netos: Math.round(m2Netos * 100) / 100,
    m2Compra,
    tablasUn,
    vigasMl,
    cantVigas,
    sepVigas: Math.round(sepVigas * 1000) / 10,
    clips,
    filasTablas,
    pilotines,
    boardJoints,
    doubleBeamCount: boardJoints.length,
  };
}


/* ─── Multi-rect: sum of independent rectangles ─── */
export function calculateMultiRect(
  rects: SubRect[],
  dir: BoardDir,
  boardLen: BoardLen
): AvzCalcResult {
  const results = rects.map((r) => calculateRect(r.largo, r.ancho, dir, boardLen));
  return {
    m2Netos: Math.round(results.reduce((s, r) => s + r.m2Netos, 0) * 100) / 100,
    m2Compra: Math.round(results.reduce((s, r) => s + r.m2Compra, 0) * 100) / 100,
    tablasUn: results.reduce((s, r) => s + r.tablasUn, 0),
    vigasMl: Math.round(results.reduce((s, r) => s + r.vigasMl, 0) * 100) / 100,
    cantVigas: results.reduce((s, r) => s + r.cantVigas, 0),
    sepVigas: results[0]?.sepVigas ?? 0,
    clips: results.reduce((s, r) => s + r.clips, 0),
    filasTablas: results.reduce((s, r) => s + r.filasTablas, 0),
    pilotines: results.reduce((s, r) => s + r.pilotines, 0),
    boardJoints: results[0]?.boardJoints ?? [],
    doubleBeamCount: results.reduce((s, r) => s + r.doubleBeamCount, 0),
  };
}
